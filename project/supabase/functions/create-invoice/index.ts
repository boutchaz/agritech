// Edge Function: create-invoice
// Complex logic for creating invoices with automatic journal entry posting

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceItem {
  item_name: string;
  description?: string;
  quantity: number;
  rate: number;
  account_id: string;
  tax_id?: string;
  cost_center_id?: string;
}

interface CreateInvoiceRequest {
  invoice_type: 'sales' | 'purchase';
  party_name: string;
  invoice_date: string;
  due_date: string;
  items: InvoiceItem[];
  remarks?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const invoiceData: CreateInvoiceRequest = await req.json();

    // Get organization from header
    const organizationId = req.headers.get('x-organization-id');
    if (!organizationId) {
      throw new Error('Missing organization ID');
    }

    // Validate invoice data
    if (!invoiceData.items || invoiceData.items.length === 0) {
      throw new Error('Invoice must have at least one item');
    }

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;

    const itemsWithTotals = invoiceData.items.map((item) => {
      const amount = item.quantity * item.rate;
      subtotal += amount;

      // Calculate tax if applicable (simplified - should fetch tax rate from database)
      let taxAmount = 0;
      if (item.tax_id) {
        // TODO: Fetch actual tax rate from taxes table
        taxAmount = amount * 0.2; // Example: 20% tax
        totalTax += taxAmount;
      }

      return {
        ...item,
        amount,
        tax_amount: taxAmount,
      };
    });

    const grandTotal = subtotal + totalTax;

    // Generate invoice number
    const { data: invoiceNumber, error: numberError } = await supabaseClient.rpc(
      'generate_invoice_number',
      {
        p_organization_id: organizationId,
        p_invoice_type: invoiceData.invoice_type,
      }
    );

    if (numberError) {
      throw new Error(`Failed to generate invoice number: ${numberError.message}`);
    }

    // Start a transaction-like operation (Supabase doesn't support transactions in Edge Functions,
    // but we can use RLS and error handling)

    // 1. Create invoice
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .insert({
        organization_id: organizationId,
        invoice_number: invoiceNumber,
        invoice_type: invoiceData.invoice_type,
        party_name: invoiceData.party_name,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        subtotal,
        total_tax: totalTax,
        grand_total: grandTotal,
        outstanding_amount: grandTotal,
        status: 'draft',
        remarks: invoiceData.remarks,
        created_by: user.id,
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create invoice: ${invoiceError.message}`);
    }

    // 2. Create invoice items
    const invoiceItems = itemsWithTotals.map((item) => ({
      invoice_id: invoice.id,
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      account_id: item.account_id,
      tax_id: item.tax_id,
      tax_amount: item.tax_amount,
      cost_center_id: item.cost_center_id,
    }));

    const { error: itemsError } = await supabaseClient
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      // Rollback invoice creation
      await supabaseClient.from('invoices').delete().eq('id', invoice.id);
      throw new Error(`Failed to create invoice items: ${itemsError.message}`);
    }

    // 3. Create journal entry (if invoice is immediately posted)
    // This would be called separately when the invoice is submitted/posted
    // For now, we'll leave it in draft status

    // 4. Return the created invoice with items
    const { data: fullInvoice, error: fetchError } = await supabaseClient
      .from('invoices')
      .select(
        `
        *,
        items:invoice_items(*)
      `
      )
      .eq('id', invoice.id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch created invoice: ${fetchError.message}`);
    }

    return new Response(JSON.stringify({ success: true, data: fullInvoice }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
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
