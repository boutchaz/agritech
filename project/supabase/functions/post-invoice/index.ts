// Edge Function: post-invoice
// Posts invoice and creates corresponding journal entry with double-entry bookkeeping

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildInvoiceLedgerLines } from '../_shared/ledger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostInvoiceRequest {
  invoice_id: string;
  posting_date: string;
}

const SALES_ACCOUNT_CODES = ['1200', '2150']; // AR, Taxes Payable
const PURCHASE_ACCOUNT_CODES = ['2110', '1400']; // AP, Prepaid taxes

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

    const { invoice_id, posting_date }: PostInvoiceRequest = await req.json();
    const organizationId = req.headers.get('x-organization-id');

    if (!organizationId) {
      throw new Error('Missing organization ID');
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: { 'x-organization-id': organizationId },
      },
    });

    const { data: invoice, error: invoiceError } = await serviceClient
      .from('invoices')
      .select(
        `
        *,
        items:invoice_items(
          id,
          item_name,
          description,
          amount,
          tax_amount,
          income_account_id,
          expense_account_id,
          cost_center_id
        )
      `
      )
      .eq('id', invoice_id)
      .eq('organization_id', organizationId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new Error('Only draft invoices can be posted');
    }

    const requiredCodes =
      invoice.invoice_type === 'sales' ? SALES_ACCOUNT_CODES : PURCHASE_ACCOUNT_CODES;

    const { data: accountRows, error: accountsError } = await serviceClient
      .from('accounts')
      .select('id, code')
      .eq('organization_id', organizationId)
      .in('code', requiredCodes);

    if (accountsError) {
      throw new Error(`Failed to load ledger accounts: ${accountsError.message}`);
    }

    const codeToAccountId = new Map<string, string>(
      (accountRows ?? []).map((row) => [row.code, row.id])
    );

    const { data: journalEntry, error: journalError } = await serviceClient
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_date: posting_date,
        posting_date,
        reference_type: invoice.invoice_type === 'sales' ? 'Sales Invoice' : 'Purchase Invoice',
        reference_number: invoice.invoice_number,
        remarks: `Journal entry for ${invoice.invoice_type} invoice ${invoice.invoice_number}`,
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single();

    if (journalError || !journalEntry) {
      throw new Error(`Failed to create journal entry: ${journalError?.message}`);
    }

    const lines = buildInvoiceLedgerLines(
      {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_type: invoice.invoice_type,
        grand_total: Number(invoice.grand_total),
        tax_total: Number(invoice.tax_total ?? 0),
        party_name: invoice.party_name,
        items: invoice.items.map((item: any) => ({
          id: item.id,
          item_name: item.item_name,
          description: item.description,
          amount: Number(item.amount),
          tax_amount: Number(item.tax_amount ?? 0),
          income_account_id: item.income_account_id,
          expense_account_id: item.expense_account_id,
          cost_center_id: item.cost_center_id,
        })),
      },
      journalEntry.id,
      {
        receivableAccountId: codeToAccountId.get('1200') ?? '',
        payableAccountId: codeToAccountId.get('2110') ?? '',
        taxPayableAccountId: codeToAccountId.get('2150'),
        taxReceivableAccountId: codeToAccountId.get('1400'),
      }
    );

    const { error: insertLinesError } = await serviceClient
      .from('journal_items')
      .insert(lines);

    if (insertLinesError) {
      await serviceClient.from('journal_entries').delete().eq('id', journalEntry.id);
      throw new Error(`Failed to create journal lines: ${insertLinesError.message}`);
    }

    const now = new Date().toISOString();

    const { error: invoiceUpdateError } = await serviceClient
      .from('invoices')
      .update({
        status: 'submitted',
        journal_entry_id: journalEntry.id,
        updated_at: now,
      })
      .eq('id', invoice_id)
      .eq('organization_id', organizationId);

    if (invoiceUpdateError) {
      throw new Error(`Failed to update invoice status: ${invoiceUpdateError.message}`);
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
      throw new Error(`Failed to post journal entry: ${postJournalError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invoice posted successfully',
        data: {
          invoice_id,
          journal_entry_id: journalEntry.id,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error posting invoice:', error);
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
