/**
 * Shared Invoice Service
 *
 * Centralized logic for creating invoices from various sources:
 * - Manual creation (from invoice form)
 * - From sales orders
 * - From purchase orders
 *
 * This service uses NestJS API endpoints for proper ACID transactions
 * and business logic validation.
 *
 * IMPORTANT: All invoice creation automatically creates journal entries
 * for double-entry bookkeeping via the NestJS invoice service.
 */

import { invoicesApi } from './api/invoices';
import { customersApi } from './api/customers';
import { suppliersApi } from './api/suppliers';
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
 * Create invoice from items with tax calculation
 * Used by manual invoice creation from InvoiceForm
 */
export async function createInvoiceFromItems(
  input: InvoiceFromItemsInput
): Promise<CreatedInvoice> {
  const {
    organization_id,
    invoice_type,
    party_id,
    party_name,
    invoice_date,
    due_date,
    items,
    currency_code = 'MAD',
    exchange_rate = 1.0,
    remarks,
    sales_order_id,
    purchase_order_id,
  } = input;

  // Calculate totals from items with proper tax calculation
  const totals = await calculateInvoiceTotals(items, invoice_type);
  const { subtotal, tax_total, grand_total, items_with_tax } = totals;

  // Prepare items for API
  const apiItems = items_with_tax.map(item => ({
    item_name: item.item_name,
    description: item.description || undefined,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    amount: Number(item.amount),
    tax_id: item.tax_id || undefined,
    tax_rate: item.tax_rate || 0,
    tax_amount: Number(item.tax_amount) || 0,
    line_total: Number(item.amount) + (Number(item.tax_amount) || 0),
    income_account_id: invoice_type === 'sales' ? item.account_id : undefined,
    expense_account_id: invoice_type === 'purchase' ? item.account_id : undefined,
    item_id: item.item_id || undefined,
  }));

  // Create invoice via NestJS API (handles invoice number generation and ledger sync)
  const invoice = await invoicesApi.create({
    invoice_type,
    party_type: invoice_type === 'sales' ? 'Customer' : 'Supplier',
    party_id: party_id || undefined,
    party_name,
    invoice_date,
    due_date,
    subtotal,
    tax_total,
    grand_total,
    outstanding_amount: grand_total,
    currency_code,
    exchange_rate,
    notes: remarks || undefined,
    sales_order_id: sales_order_id || undefined,
    purchase_order_id: purchase_order_id || undefined,
    items: apiItems,
  }, organization_id);

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
    remarks,
    sales_order_id,
    purchase_order_id,
  } = input;

  // Prepare items for API - calculate tax_amount from tax_rate
  const apiItems = items.map(item => ({
    item_name: item.item_name,
    description: item.description || undefined,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    amount: Number(item.amount),
    tax_id: item.tax_id || undefined,
    tax_rate: item.tax_rate || 0,
    tax_amount: (Number(item.quantity) * Number(item.unit_price) * Number(item.tax_rate || 0)) / 100,
    line_total: Number(item.amount) + ((Number(item.quantity) * Number(item.unit_price) * Number(item.tax_rate || 0)) / 100),
    income_account_id: invoice_type === 'sales' ? item.account_id : undefined,
    expense_account_id: invoice_type === 'purchase' ? item.account_id : undefined,
  }));

  // Create invoice via NestJS API (handles invoice number generation and ledger sync)
  const invoice = await invoicesApi.create({
    invoice_type,
    party_type: invoice_type === 'sales' ? 'Customer' : 'Supplier',
    party_id: party_id || undefined,
    party_name,
    invoice_date,
    due_date,
    subtotal,
    tax_total,
    grand_total,
    outstanding_amount: grand_total,
    currency_code,
    exchange_rate,
    notes: remarks || undefined,
    sales_order_id: sales_order_id || undefined,
    purchase_order_id: purchase_order_id || undefined,
    items: apiItems,
  }, organization_id);

  return invoice as CreatedInvoice;
}

/**
 * Helper: Fetch party name from database via API
 */
export async function fetchPartyName(
  partyId: string,
  invoiceType: 'sales' | 'purchase'
): Promise<string> {
  if (!partyId) return '';

  try {
    if (invoiceType === 'purchase') {
      const supplier = await suppliersApi.getOne(partyId) as { name?: string };
      return supplier?.name || '';
    } else {
      const customer = await customersApi.getOne(partyId) as { name?: string };
      return customer?.name || '';
    }
  } catch (error) {
    console.error('Error fetching party name:', error);
    return '';
  }
}
