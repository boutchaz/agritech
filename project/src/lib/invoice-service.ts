/**
 * Shared Invoice Service
 * 
 * Centralized logic for creating invoices from various sources:
 * - Manual creation (from invoice form)
 * - From sales orders
 * - From purchase orders
 * 
 * This eliminates duplicate invoice creation logic across the codebase.
 */

import { supabase } from './supabase';
import { calculateInvoiceTotals } from './taxCalculations';

export interface InvoiceItemInput {
  item_id?: string; // Reference to items table (preferred)
  item_name: string; // Kept for backward compatibility
  description?: string;
  quantity: number;
  rate: number;
  account_id: string;
  tax_id?: string;
  cost_center_id?: string;
}

export interface InvoiceBaseInput {
  invoice_type: 'sales' | 'purchase';
  party_id: string | null;
  party_name: string;
  invoice_date: string;
  due_date: string;
  currency_code?: string;
  exchange_rate?: number;
  status?: 'draft' | 'submitted';
  remarks?: string;
  farm_id?: string | null;
  parcel_id?: string | null;
  sales_order_id?: string | null;
  purchase_order_id?: string | null;
}

export interface InvoiceFromItemsInput extends InvoiceBaseInput {
  items: InvoiceItemInput[];
  organization_id: string;
  user_id: string;
}

export interface InvoiceFromOrderInput extends InvoiceBaseInput {
  subtotal: number;
  tax_total: number;
  grand_total: number;
  items: Array<{
    item_name: string;
    description?: string | null;
    quantity: number;
    unit_price: number;
    amount: number;
    tax_id?: string | null;
    tax_rate: number;
    account_id: string | null;
  }>;
  organization_id: string;
  user_id: string;
}

export interface CreatedInvoice {
  id: string;
  invoice_number: string;
  grand_total: number;
  [key: string]: unknown;
}

/**
 * Generate invoice number using database RPC function
 */
async function generateInvoiceNumber(
  organizationId: string,
  invoiceType: 'sales' | 'purchase'
): Promise<string> {
  const { data: invoiceNumber, error } = await supabase.rpc('generate_invoice_number', {
    p_organization_id: organizationId,
    p_invoice_type: invoiceType,
  });

  if (error) throw error;
  if (!invoiceNumber) throw new Error('Failed to generate invoice number');
  return invoiceNumber as string;
}

/**
 * Create invoice items from calculated totals
 */
async function createInvoiceItems(
  invoiceId: string,
  items: Array<{
    item_name: string;
    description?: string | null;
    quantity: number;
    unit_price: number;
    amount: number;
    tax_id?: string | null;
    tax_amount: number;
    account_id: string | null;
  }>,
  invoiceType: 'sales' | 'purchase'
): Promise<void> {
  // Validate and prepare items
  const itemsToInsert = items
    .filter(item => {
      // Ensure quantity is greater than 0 (database constraint)
      if (!item.quantity || item.quantity <= 0) {
        console.error(`Invalid quantity for item "${item.item_name}": ${item.quantity}`);
        return false;
      }
      return true;
    })
    .map(item => ({
      invoice_id: invoiceId,
      item_id: item.item_id || null, // Reference to items table
      item_name: item.item_name,
      description: item.description || null,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      amount: Number(item.amount),
      tax_amount: Number(item.tax_amount) || 0,
      income_account_id: invoiceType === 'sales' ? item.account_id : null,
      expense_account_id: invoiceType === 'purchase' ? item.account_id : null,
      tax_id: item.tax_id || null,
      cost_center_id: null, // Can be added if needed from order items
    }));

  if (itemsToInsert.length === 0) {
    throw new Error('At least one item with quantity > 0 is required');
  }

  // Validate all items have quantity > 0
  const invalidItems = itemsToInsert.filter(item => item.quantity <= 0);
  if (invalidItems.length > 0) {
    throw new Error(
      `Invalid quantities found. All items must have quantity > 0. Invalid items: ${invalidItems.map(i => i.item_name).join(', ')}`
    );
  }

  const { error } = await supabase.from('invoice_items').insert(itemsToInsert);
  if (error) throw error;
}

/**
 * Create invoice from items with tax calculation
 * Used by manual invoice creation from InvoiceForm
 */
export async function createInvoiceFromItems(
  input: InvoiceFromItemsInput
): Promise<CreatedInvoice> {
  const {
    organization_id,
    user_id,
    invoice_type,
    party_id,
    party_name,
    invoice_date,
    due_date,
    items,
    currency_code = 'MAD',
    exchange_rate = 1.0,
    status = 'draft',
    remarks,
    farm_id,
    parcel_id,
    sales_order_id,
    purchase_order_id,
  } = input;

  // Calculate totals from items with proper tax calculation
  const totals = await calculateInvoiceTotals(items, invoice_type);
  const { subtotal, tax_total, grand_total, items_with_tax } = totals;

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(organization_id, invoice_type);

  // Create invoice record
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      organization_id,
      invoice_number: invoiceNumber,
      invoice_type,
      party_type: invoice_type === 'sales' ? 'Customer' : 'Supplier',
      party_id,
      party_name,
      invoice_date,
      due_date,
      subtotal,
      tax_total,
      grand_total,
      outstanding_amount: grand_total,
      currency_code,
      exchange_rate,
      status,
      remarks: remarks || null,
      farm_id: farm_id || null,
      parcel_id: parcel_id || null,
      sales_order_id: sales_order_id || null,
      purchase_order_id: purchase_order_id || null,
      created_by: user_id,
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Create invoice items from calculated totals (includes accurate tax per line)
  await createInvoiceItems(invoice.id, items_with_tax, invoice_type);

  return invoice as CreatedInvoice;
}

/**
 * Create invoice from order (sales order or purchase order)
 * Used by billing module to convert orders to invoices
 */
export async function createInvoiceFromOrder(
  input: InvoiceFromOrderInput
): Promise<CreatedInvoice> {
  const {
    organization_id,
    user_id,
    invoice_type,
    party_id,
    party_name,
    invoice_date,
    due_date,
    subtotal,
    tax_total,
    grand_total,
    items,
    currency_code = 'MAD',
    exchange_rate = 1.0,
    status = 'draft',
    remarks,
    farm_id,
    parcel_id,
    sales_order_id,
    purchase_order_id,
  } = input;

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(organization_id, invoice_type);

  // Create invoice record with totals from order
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      organization_id,
      invoice_number: invoiceNumber,
      invoice_type,
      party_type: invoice_type === 'sales' ? 'Customer' : 'Supplier',
      party_id,
      party_name,
      invoice_date,
      due_date,
      subtotal,
      tax_total,
      grand_total,
      outstanding_amount: grand_total,
      currency_code,
      exchange_rate,
      status,
      remarks: remarks || null,
      farm_id: farm_id || null,
      parcel_id: parcel_id || null,
      sales_order_id: sales_order_id || null,
      purchase_order_id: purchase_order_id || null,
      created_by: user_id,
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Prepare invoice items from order items
  // Calculate tax_amount from quantity, unit_price, and tax_rate
  const invoiceItems = items.map(item => ({
    item_name: item.item_name,
    description: item.description || null,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    amount: Number(item.amount),
    tax_id: item.tax_id || null,
    tax_amount: (Number(item.quantity) * Number(item.unit_price) * Number(item.tax_rate || 0)) / 100,
    account_id: item.account_id,
  }));

  await createInvoiceItems(invoice.id, invoiceItems, invoice_type);

  return invoice as CreatedInvoice;
}

/**
 * Helper: Fetch party name from database
 */
export async function fetchPartyName(
  partyId: string,
  invoiceType: 'sales' | 'purchase'
): Promise<string> {
  if (!partyId) return '';

  if (invoiceType === 'purchase') {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', partyId)
      .single();
    return supplier?.name || '';
  } else {
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', partyId)
      .single();
    return customer?.name || '';
  }
}

