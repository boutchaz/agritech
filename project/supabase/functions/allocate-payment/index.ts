// Edge Function: allocate-payment
// Allocates payment to invoices and creates journal entries

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

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

    // 1. Fetch payment
    const { data: payment, error: paymentError } = await supabaseClient
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

    // 2. Validate allocations
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);

    if (totalAllocated > payment.amount) {
      throw new Error('Total allocated amount exceeds payment amount');
    }

    // 3. Fetch invoices to validate and get details
    const invoiceIds = allocations.map((a) => a.invoice_id);
    const { data: invoices, error: invoicesError } = await supabaseClient
      .from('invoices')
      .select('*')
      .in('id', invoiceIds)
      .eq('organization_id', organizationId);

    if (invoicesError || !invoices || invoices.length !== invoiceIds.length) {
      throw new Error('One or more invoices not found');
    }

    // Validate invoice types match payment type
    const expectedInvoiceType = payment.payment_type === 'receive' ? 'sales' : 'purchase';
    const invalidInvoices = invoices.filter((inv) => inv.invoice_type !== expectedInvoiceType);

    if (invalidInvoices.length > 0) {
      throw new Error('Invoice types do not match payment type');
    }

    // 4. Create payment allocations
    const paymentAllocations = allocations.map((alloc) => ({
      payment_id,
      invoice_id: alloc.invoice_id,
      allocated_amount: alloc.allocated_amount,
    }));

    const { error: allocError } = await supabaseClient
      .from('payment_allocations')
      .insert(paymentAllocations);

    if (allocError) {
      throw new Error(`Failed to create allocations: ${allocError.message}`);
    }

    // 5. Update invoice outstanding amounts
    for (const alloc of allocations) {
      const invoice = invoices.find((inv) => inv.id === alloc.invoice_id);
      if (!invoice) continue;

      const newOutstanding = invoice.outstanding_amount - alloc.allocated_amount;
      const newStatus = newOutstanding <= 0.01 ? 'paid' : 'partially_paid';

      const { error: updateError } = await supabaseClient
        .from('invoices')
        .update({
          outstanding_amount: newOutstanding,
          status: newStatus,
        })
        .eq('id', alloc.invoice_id);

      if (updateError) {
        throw new Error(`Failed to update invoice ${alloc.invoice_id}: ${updateError.message}`);
      }
    }

    // 6. Create journal entry for the payment
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .in('code', ['1110', '1120', '2110']); // Cash, AR, AP

    if (accountsError || !accounts) {
      throw new Error('Failed to fetch accounts');
    }

    const accountsMap = new Map(accounts.map((acc) => [acc.code, acc]));

    const { data: journalEntry, error: jeError } = await supabaseClient
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_date: payment.payment_date,
        posting_date: payment.payment_date,
        reference_type: 'Payment',
        reference_number: payment.payment_number,
        remarks: `Payment ${payment.payment_type} from/to ${payment.party_name}`,
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single();

    if (jeError || !journalEntry) {
      throw new Error(`Failed to create journal entry: ${jeError?.message}`);
    }

    // 7. Create journal lines based on payment type
    const journalLines = [];

    if (payment.payment_type === 'receive') {
      // Payment Received
      // Debit: Cash/Bank Account
      const cashAccount = payment.bank_account_id
        ? accounts.find((a) => a.id === payment.bank_account_id)
        : accountsMap.get('1110'); // Default cash account

      if (!cashAccount) {
        throw new Error('Cash/Bank account not found');
      }

      journalLines.push({
        journal_entry_id: journalEntry.id,
        account_id: cashAccount.id,
        debit: payment.amount,
        credit: 0,
        remarks: `Payment received via ${payment.payment_method}`,
      });

      // Credit: Accounts Receivable
      const arAccount = accountsMap.get('1120');
      if (!arAccount) {
        throw new Error('Accounts Receivable account not found');
      }

      journalLines.push({
        journal_entry_id: journalEntry.id,
        account_id: arAccount.id,
        debit: 0,
        credit: payment.amount,
        remarks: `Payment from ${payment.party_name}`,
      });
    } else {
      // Payment Made
      // Debit: Accounts Payable
      const apAccount = accountsMap.get('2110');
      if (!apAccount) {
        throw new Error('Accounts Payable account not found');
      }

      journalLines.push({
        journal_entry_id: journalEntry.id,
        account_id: apAccount.id,
        debit: payment.amount,
        credit: 0,
        remarks: `Payment to ${payment.party_name}`,
      });

      // Credit: Cash/Bank Account
      const cashAccount = payment.bank_account_id
        ? accounts.find((a) => a.id === payment.bank_account_id)
        : accountsMap.get('1110'); // Default cash account

      if (!cashAccount) {
        throw new Error('Cash/Bank account not found');
      }

      journalLines.push({
        journal_entry_id: journalEntry.id,
        account_id: cashAccount.id,
        debit: 0,
        credit: payment.amount,
        remarks: `Payment made via ${payment.payment_method}`,
      });
    }

    // Insert journal lines
    const { error: linesError } = await supabaseClient
      .from('journal_items')
      .insert(journalLines);

    if (linesError) {
      throw new Error(`Failed to create journal lines: ${linesError.message}`);
    }

    // 8. Update payment status and link journal entry
    const { error: paymentUpdateError } = await supabaseClient
      .from('accounting_payments')
      .update({
        status: 'submitted',
        journal_entry_id: journalEntry.id,
      })
      .eq('id', payment_id);

    if (paymentUpdateError) {
      throw new Error(`Failed to update payment: ${paymentUpdateError.message}`);
    }

    // 9. Post the journal entry
    const { error: postError } = await supabaseClient
      .from('journal_entries')
      .update({ status: 'posted' })
      .eq('id', journalEntry.id);

    if (postError) {
      throw new Error(`Failed to post journal entry: ${postError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment allocated successfully',
        data: {
          payment_id,
          journal_entry_id: journalEntry.id,
          allocated_amount: totalAllocated,
          unallocated_amount: payment.amount - totalAllocated,
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
