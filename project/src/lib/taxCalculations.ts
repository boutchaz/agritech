/**
 * Tax Calculation Utilities
 * Handles tax computations for invoices and invoice items with proper rounding
 *
 * Tax Calculation Rules:
 * 1. Line item amount = quantity × rate (rounded to 2 decimals)
 * 2. Tax amount per line = line amount × (tax rate / 100) (rounded to 2 decimals)
 * 3. Subtotal = sum of all line amounts (no rounding, already rounded per line)
 * 4. Tax total = sum of all line tax amounts (no rounding, already rounded per line)
 * 5. Grand total = subtotal + tax total (rounded to 2 decimals)
 */

import { supabase } from './supabase';

/**
 * Round to specified decimal places (default 2 for currency)
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Tax record from database
 */
export interface Tax {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  tax_type: 'sales' | 'purchase' | 'both';
  rate: number; // Percentage (e.g., 20 for 20%)
  sales_account_id: string | null;
  purchase_account_id: string | null;
  is_active: boolean;
  description: string | null;
}

/**
 * Invoice item input (before tax calculation)
 */
export interface InvoiceItemInput {
  item_name: string;
  description?: string;
  quantity: number;
  rate: number; // Unit price
  account_id: string;
  tax_id?: string | null;
  cost_center_id?: string | null;
}

/**
 * Invoice item with calculated tax
 */
export interface InvoiceItemWithTax extends InvoiceItemInput {
  amount: number; // quantity × rate (rounded)
  tax_amount: number; // amount × (tax_rate / 100) (rounded)
  total_amount: number; // amount + tax_amount
  tax_rate?: number; // Tax percentage for reference
  tax_name?: string; // Tax name for reference
}

/**
 * Tax breakdown by tax ID
 */
export interface TaxBreakdownItem {
  tax_id: string;
  tax_code: string;
  tax_name: string;
  tax_rate: number;
  taxable_amount: number; // Sum of all line amounts with this tax
  tax_amount: number; // Sum of all line tax amounts for this tax
}

/**
 * Invoice totals with tax breakdown
 */
export interface InvoiceTotals {
  subtotal: number; // Sum of all line amounts (before tax)
  tax_total: number; // Sum of all line tax amounts
  grand_total: number; // subtotal + tax_total (rounded)
  tax_breakdown: TaxBreakdownItem[]; // Grouped by tax_id
  items_with_tax: InvoiceItemWithTax[]; // Items with calculated tax amounts
}

/**
 * Fetch tax details from database
 */
export async function getTaxDetails(taxId: string): Promise<Tax | null> {
  const { data, error } = await supabase
    .from('taxes')
    .select('*')
    .eq('id', taxId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.error('Failed to fetch tax details:', error);
    return null;
  }

  return data as Tax;
}

/**
 * Fetch multiple taxes by IDs
 */
export async function getTaxesByIds(taxIds: string[]): Promise<Tax[]> {
  if (taxIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('taxes')
    .select('*')
    .in('id', taxIds)
    .eq('is_active', true);

  if (error || !data) {
    console.error('Failed to fetch taxes:', error);
    return [];
  }

  return data as Tax[];
}

/**
 * Calculate line item amount with proper rounding
 */
export function calculateLineAmount(quantity: number, rate: number): number {
  return roundToDecimals(quantity * rate);
}

/**
 * Calculate tax amount for a line item with proper rounding
 */
export function calculateLineTaxAmount(lineAmount: number, taxRate: number): number {
  const taxAmount = (lineAmount * taxRate) / 100;
  return roundToDecimals(taxAmount);
}

/**
 * Main function: Calculate invoice totals with proper tax computation and rounding
 *
 * This is the primary function to use for invoice calculations.
 * It handles:
 * - Line-by-line amount calculation with rounding
 * - Tax validation (matching invoice type)
 * - Tax computation per line with rounding
 * - Tax aggregation by tax ID
 * - Final totals with proper rounding
 *
 * @param items Array of invoice items
 * @param invoiceType Type of invoice (sales or purchase)
 * @returns Complete invoice totals with tax breakdown and calculated items
 */
export async function calculateInvoiceTotals(
  items: InvoiceItemInput[],
  invoiceType: 'sales' | 'purchase'
): Promise<InvoiceTotals> {
  // Fetch all unique tax IDs
  const taxIds = [...new Set(items.map(item => item.tax_id).filter(Boolean))] as string[];
  const taxesData = await getTaxesByIds(taxIds);

  // Create a map for quick tax lookup
  const taxMap = new Map<string, Tax>();
  taxesData.forEach(tax => taxMap.set(tax.id, tax));

  // Calculate each line item with tax
  const items_with_tax: InvoiceItemWithTax[] = [];
  let subtotal = 0;

  // Tax aggregation: { tax_id: { taxable_amount, tax_amount, ... } }
  const taxAggregation = new Map<
    string,
    {
      tax_code: string;
      tax_name: string;
      tax_rate: number;
      taxable_amount: number;
      tax_amount: number;
    }
  >();

  for (const item of items) {
    // 1. Calculate line amount (quantity × rate) with rounding
    const lineAmount = calculateLineAmount(item.quantity, item.rate);
    subtotal += lineAmount;

    let lineTaxAmount = 0;
    let taxRate: number | undefined;
    let taxName: string | undefined;

    // 2. Calculate tax if tax_id is provided
    if (item.tax_id && taxMap.has(item.tax_id)) {
      const tax = taxMap.get(item.tax_id)!;

      // Validate tax type matches invoice type
      if (tax.tax_type === 'both' || tax.tax_type === invoiceType) {
        // Calculate tax for this line
        lineTaxAmount = calculateLineTaxAmount(lineAmount, tax.rate);
        taxRate = tax.rate;
        taxName = tax.name;

        // Aggregate tax amounts
        if (taxAggregation.has(item.tax_id)) {
          const existing = taxAggregation.get(item.tax_id)!;
          existing.taxable_amount += lineAmount;
          existing.tax_amount += lineTaxAmount;
        } else {
          taxAggregation.set(item.tax_id, {
            tax_code: tax.code,
            tax_name: tax.name,
            tax_rate: tax.rate,
            taxable_amount: lineAmount,
            tax_amount: lineTaxAmount,
          });
        }
      } else {
        console.warn(
          `Tax "${tax.name}" (${tax.tax_type}) doesn't match invoice type (${invoiceType}). Skipping tax for line "${item.item_name}".`
        );
      }
    }

    // 3. Build line item with tax
    items_with_tax.push({
      ...item,
      amount: lineAmount,
      tax_amount: lineTaxAmount,
      total_amount: lineAmount + lineTaxAmount,
      tax_rate: taxRate,
      tax_name: taxName,
    });
  }

  // 4. Build tax breakdown
  const tax_breakdown: TaxBreakdownItem[] = Array.from(taxAggregation.entries()).map(
    ([tax_id, data]) => ({
      tax_id,
      ...data,
    })
  );

  // 5. Calculate final totals
  const tax_total = tax_breakdown.reduce((sum, tax) => sum + tax.tax_amount, 0);
  const grand_total = roundToDecimals(subtotal + tax_total);

  return {
    subtotal: roundToDecimals(subtotal),
    tax_total: roundToDecimals(tax_total),
    grand_total,
    tax_breakdown,
    items_with_tax,
  };
}

/**
 * Validate tax applicability for invoice type
 *
 * @param taxId Tax ID to validate
 * @param invoiceType Type of invoice (sales or purchase)
 * @returns Validation result with error message if invalid
 */
export async function validateTaxForInvoiceType(
  taxId: string,
  invoiceType: 'sales' | 'purchase'
): Promise<{ valid: boolean; message?: string }> {
  const tax = await getTaxDetails(taxId);

  if (!tax) {
    return { valid: false, message: 'Tax not found or inactive' };
  }

  if (tax.tax_type !== 'both' && tax.tax_type !== invoiceType) {
    return {
      valid: false,
      message: `Tax "${tax.name}" is for ${tax.tax_type} invoices only`,
    };
  }

  return { valid: true };
}

/**
 * Format tax breakdown for display (human-readable)
 *
 * @param tax_breakdown Array of tax breakdown items
 * @param currency Currency code (default: MAD)
 * @returns Formatted string for display
 */
export function formatTaxBreakdown(
  tax_breakdown: TaxBreakdownItem[],
  currency: string = 'MAD'
): string {
  if (tax_breakdown.length === 0) {
    return 'No taxes applied';
  }

  return tax_breakdown
    .map(
      tax =>
        `${tax.tax_name} (${tax.tax_rate}%): ${currency} ${tax.tax_amount.toFixed(2)} on ${currency} ${tax.taxable_amount.toFixed(2)}`
    )
    .join('\n');
}

/**
 * Format currency value with proper decimal places
 *
 * @param value Numeric value to format
 * @param currency Currency code (default: MAD)
 * @param locale Locale for formatting (default: fr-FR)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  currency: string = 'MAD',
  locale: string = 'fr-FR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency === 'MAD' ? 'MAD' : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Calculate percentage (e.g., tax as percentage of subtotal)
 *
 * @param part Part value (e.g., tax amount)
 * @param total Total value (e.g., subtotal)
 * @returns Percentage rounded to 2 decimals
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return roundToDecimals((part / total) * 100);
}

/**
 * Summarize invoice totals for display
 *
 * @param totals Calculated invoice totals
 * @param currency Currency code
 * @returns Human-readable summary object
 */
export function summarizeInvoiceTotals(
  totals: InvoiceTotals,
  currency: string = 'MAD'
): {
  subtotal_formatted: string;
  tax_total_formatted: string;
  grand_total_formatted: string;
  tax_percentage: number;
  line_count: number;
  tax_breakdown_formatted: string;
} {
  return {
    subtotal_formatted: formatCurrency(totals.subtotal, currency),
    tax_total_formatted: formatCurrency(totals.tax_total, currency),
    grand_total_formatted: formatCurrency(totals.grand_total, currency),
    tax_percentage: calculatePercentage(totals.tax_total, totals.subtotal),
    line_count: totals.items_with_tax.length,
    tax_breakdown_formatted: formatTaxBreakdown(totals.tax_breakdown, currency),
  };
}
