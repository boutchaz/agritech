// Edge Function: allocate-payment
// Allocates payment to invoices and creates journal entries

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildPaymentLedgerLines } from '../_shared/ledger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AllocationItem {
  invoice_id: string;
  allocated_amount: number;
}

interface AllocatePaymentRequest {
  payment_id: string;
  allocations: AllocationItem[];
}

const LEDGER_CODES = ['1110', '1200', '2110'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { payment_id, allocations }: AllocatePaymentRequest = await req.json();
    const organizationId = req.headers.get('x-organization-id');

    if (!organizationId) {
      throw new Error('Missing organization ID');
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: { 'x-organization-id': organizationId },
      },
    });

    const { data: payment, error: paymentError } = await serviceClient
      .from('accounting_payments')
      .select('*')
      .eq('id', payment_id)
      .eq('organization_id', organizationId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'draft') {
      throw new Error('Only draft payments can be allocated');
    }

    const totalAllocated = allocations.reduce((sum, alloc) => sum + Number(alloc.allocated_amount), 0);
    const paymentAmount = Number(payment.amount);
    if (totalAllocated <= 0) {
      throw new Error('Allocated amount must be greater than zero');
    }
    if (Math.abs(totalAllocated - paymentAmount) > 0.01) {
      throw new Error('Allocations must equal the payment amount');
    }

    const invoiceIds = allocations.map((alloc) => alloc.invoice_id);
    const { data: invoices, error: invoicesError } = await serviceClient
      .from('invoices')
      .select('*')
      .in('id', invoiceIds)
      .eq('organization_id', organizationId);

    if (invoicesError || !invoices || invoices.length !== invoiceIds.length) {
      throw new Error('One or more invoices not found');
    }

    const expectedInvoiceType = payment.payment_type === 'receive' ? 'sales' : 'purchase';
    for (const invoice of invoices) {
      if (invoice.invoice_type !== expectedInvoiceType) {
        throw new Error('Invoice types do not match payment type');
      }
    }

    const allocationRows = allocations.map((alloc) => ({
      payment_id,
      invoice_id: alloc.invoice_id,
      allocated_amount: Number(alloc.allocated_amount),
    }));

    const { error: allocationError } = await serviceClient
      .from('payment_allocations')
      .insert(allocationRows);

    if (allocationError) {
      throw new Error(`Failed to create allocations: ${allocationError.message}`);
    }

    for (const alloc of allocations) {
      const invoice = invoices.find((inv) => inv.id === alloc.invoice_id);
      if (!invoice) continue;

      const remaining = Number(invoice.outstanding_amount) - Number(alloc.allocated_amount);
      const newStatus = remaining <= 0.01 ? 'paid' : 'partially_paid';

      const { error: invoiceUpdateError } = await serviceClient
        .from('invoices')
        .update({
          outstanding_amount: remaining,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alloc.invoice_id);

      if (invoiceUpdateError) {
        throw new Error(`Failed to update invoice ${alloc.invoice_id}: ${invoiceUpdateError.message}`);
      }
    }

    const { data: ledgerAccounts, error: ledgerError } = await serviceClient
      .from('accounts')
      .select('id, code')
      .eq('organization_id', organizationId)
      .in('code', LEDGER_CODES);

    if (ledgerError) {
      throw new Error(`Failed to load ledger accounts: ${ledgerError.message}`);
    }

    const ledgerMap = new Map<string, string>(
      (ledgerAccounts ?? []).map((acc) => [acc.code, acc.id])
    );

    let cashLedgerAccountId = ledgerMap.get('1110') ?? '';
    if (payment.bank_account_id) {
      const { data: bankAccount, error: bankError } = await serviceClient
        .from('bank_accounts')
        .select('gl_account_id')
        .eq('id', payment.bank_account_id)
        .eq('organization_id', organizationId)
        .single();

      if (bankError || !bankAccount?.gl_account_id) {
        throw new Error('Selected bank account is missing a linked ledger account');
      }

      cashLedgerAccountId = bankAccount.gl_account_id;
    }

    const { data: journalEntry, error: journalError } = await serviceClient
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_date: payment.payment_date,
        posting_date: payment.payment_date,
        reference_type: 'Payment',
        reference_number: payment.payment_number,
        remarks: `Payment ${payment.payment_type === 'receive' ? 'received from' : 'made to'} ${payment.party_name}`,
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single();

    if (journalError || !journalEntry) {
      throw new Error(`Failed to create journal entry: ${journalError?.message}`);
    }

    const journalLines = buildPaymentLedgerLines(
      {
        id: payment.id,
        payment_number: payment.payment_number,
        payment_type: payment.payment_type,
        payment_method: payment.payment_method,
        payment_date: payment.payment_date,
        amount: totalAllocated,
        party_name: payment.party_name,
        bank_account_id: payment.bank_account_id,
      },
      journalEntry.id,
      {
        cashAccountId: cashLedgerAccountId,
        accountsReceivableId: ledgerMap.get('1200') ?? '',
        accountsPayableId: ledgerMap.get('2110') ?? '',
      }
    );

    const { error: insertLinesError } = await serviceClient
      .from('journal_items')
      .insert(journalLines);

    if (insertLinesError) {
      throw new Error(`Failed to create payment journal lines: ${insertLinesError.message}`);
    }

    const now = new Date().toISOString();

    const { error: paymentUpdateError } = await serviceClient
      .from('accounting_payments')
      .update({
        status: 'submitted',
        journal_entry_id: journalEntry.id,
        updated_at: now,
      })
      .eq('id', payment_id);

    if (paymentUpdateError) {
      throw new Error(`Failed to update payment: ${paymentUpdateError.message}`);
    }

    const { error: postJournalError } = await serviceClient
      .from('journal_entries')
      .update({
        status: 'posted',
        posted_by: user.id,
        posted_at: now,
      })
      .eq('id', journalEntry.id);

    if (postJournalError) {
      throw new Error(`Failed to post payment journal entry: ${postJournalError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment allocated successfully',
        data: {
          payment_id,
          journal_entry_id: journalEntry.id,
          allocated_amount: totalAllocated,
          unallocated_amount: Number(payment.amount) - totalAllocated,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error allocating payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
