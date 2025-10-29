// Edge Function: post-invoice
// Posts invoice and creates corresponding journal entry with double-entry bookkeeping

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PostInvoiceRequest {
  invoice_id: string;
  posting_date: string;
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

    const { invoice_id, posting_date }: PostInvoiceRequest = await req.json();
    const organizationId = req.headers.get('x-organization-id');

    if (!organizationId) {
      throw new Error('Missing organization ID');
    }

    // 1. Fetch invoice with items
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(
        `
        *,
        items:invoice_items(*)
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

    // 2. Fetch account codes for posting
    // For sales invoice: Debit Accounts Receivable, Credit Revenue
    // For purchase invoice: Debit Expense, Credit Accounts Payable
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .in('code', [
        '1120', // Accounts Receivable
        '2110', // Accounts Payable
        '4000', // Revenue (will map to specific revenue accounts)
        '5000', // Expenses (will map to specific expense accounts)
      ]);

    if (accountsError || !accounts) {
      throw new Error('Failed to fetch accounts');
    }

    const accountsMap = new Map(accounts.map((acc) => [acc.code, acc]));

    // 3. Create journal entry
    const { data: journalEntry, error: jeError } = await supabaseClient
      .from('journal_entries')
      .insert({
        organization_id: organizationId,
        entry_date: posting_date,
        posting_date: posting_date,
        reference_type: invoice.invoice_type === 'sales' ? 'Sales Invoice' : 'Purchase Invoice',
        reference_number: invoice.invoice_number,
        remarks: `Journal entry for ${invoice.invoice_type} invoice ${invoice.invoice_number}`,
        created_by: user.id,
        status: 'draft', // Will be auto-posted after lines are created
      })
      .select()
      .single();

    if (jeError || !journalEntry) {
      throw new Error(`Failed to create journal entry: ${jeError?.message}`);
    }

    // 4. Create journal entry lines based on invoice type
    const journalLines = [];

    if (invoice.invoice_type === 'sales') {
      // Debit: Accounts Receivable (Asset increases)
      const arAccount = accountsMap.get('1120');
      if (!arAccount) {
        throw new Error('Accounts Receivable account not found');
      }

      journalLines.push({
        journal_entry_id: journalEntry.id,
        account_id: arAccount.id,
        debit: invoice.grand_total,
        credit: 0,
        remarks: `Sales to ${invoice.party_name}`,
      });

      // Credit: Revenue accounts (for each item)
      for (const item of invoice.items) {
        journalLines.push({
          journal_entry_id: journalEntry.id,
          account_id: item.account_id,
          debit: 0,
          credit: item.amount,
          cost_center_id: item.cost_center_id,
          remarks: item.item_name,
        });
      }

      // Credit: Tax Liability (if taxes exist)
      if (invoice.total_tax > 0) {
        // Simplified: using a default tax liability account
        // In production, you'd fetch the specific tax account
        journalLines.push({
          journal_entry_id: journalEntry.id,
          account_id: accountsMap.get('2120')?.id, // Tax Payable
          debit: 0,
          credit: invoice.total_tax,
          remarks: 'Sales Tax',
        });
      }
    } else {
      // Purchase Invoice
      // Debit: Expense accounts (for each item)
      for (const item of invoice.items) {
        journalLines.push({
          journal_entry_id: journalEntry.id,
          account_id: item.account_id,
          debit: item.amount,
          credit: 0,
          cost_center_id: item.cost_center_id,
          remarks: item.item_name,
        });
      }

      // Debit: Tax Receivable (if taxes exist)
      if (invoice.total_tax > 0) {
        journalLines.push({
          journal_entry_id: journalEntry.id,
          account_id: accountsMap.get('1130')?.id, // Tax Receivable
          debit: invoice.total_tax,
          credit: 0,
          remarks: 'Purchase Tax',
        });
      }

      // Credit: Accounts Payable (Liability increases)
      const apAccount = accountsMap.get('2110');
      if (!apAccount) {
        throw new Error('Accounts Payable account not found');
      }

      journalLines.push({
        journal_entry_id: journalEntry.id,
        account_id: apAccount.id,
        debit: 0,
        credit: invoice.grand_total,
        remarks: `Purchase from ${invoice.party_name}`,
      });
    }

    // Insert journal lines
    const { error: linesError } = await supabaseClient
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) {
      // Rollback journal entry
      await supabaseClient.from('journal_entries').delete().eq('id', journalEntry.id);
      throw new Error(`Failed to create journal lines: ${linesError.message}`);
    }

    // 5. The database trigger will automatically:
    //    - Calculate total_debit and total_credit
    //    - Validate that debits = credits
    //    - Post the journal entry

    // 6. Update invoice status to submitted
    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update({
        status: 'submitted',
        journal_entry_id: journalEntry.id,
      })
      .eq('id', invoice_id);

    if (updateError) {
      throw new Error(`Failed to update invoice status: ${updateError.message}`);
    }

    // 7. Post the journal entry
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
