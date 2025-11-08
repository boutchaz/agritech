/**
 * Ledger Integration Module
 *
 * Provides functions to automatically create journal entries for various
 * business transactions (invoices, payments, stock movements, etc.)
 */

import { supabase } from './supabase';
import { accountingApi } from './accounting-api';

// =====================================================
// TYPES
// =====================================================

export interface LedgerSyncResult {
  journalEntryId: string | null;
  success: boolean;
  error?: string;
}

export interface InvoiceData {
  id: string;
  invoice_type: 'sales' | 'purchase';
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  customer_id?: string;
  supplier_id?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  organization_id: string;
  currency_code?: string;
  journal_entry_id?: string | null;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  account_id?: string;
}

export interface PaymentData {
  id: string;
  payment_type: 'receive' | 'pay';
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  bank_account_id?: string;
  customer_id?: string;
  supplier_id?: string;
  organization_id: string;
  currency_code?: string;
  journal_entry_id?: string | null;
}

// =====================================================
// ACCOUNT LOOKUP UTILITIES
// =====================================================

const accountCache = new Map<string, string>();

/**
 * Get account ID by type and subtype with caching
 */
async function getAccountByType(
  organizationId: string,
  accountType: string,
  accountSubtype?: string
): Promise<string> {
  const cacheKey = `${organizationId}:${accountType}:${accountSubtype || 'none'}`;

  // Check cache first
  if (accountCache.has(cacheKey)) {
    return accountCache.get(cacheKey)!;
  }

  let query = supabase
    .from('accounts')
    .select('id, code, name')
    .eq('organization_id', organizationId)
    .eq('account_type', accountType)
    .eq('is_active', true)
    .eq('is_group', false);

  if (accountSubtype) {
    query = query.eq('account_subtype', accountSubtype);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Error fetching account: ${error.message}`);
  }

  if (!data?.id) {
    const subtypeMsg = accountSubtype ? ` (${accountSubtype})` : '';
    throw new Error(
      `Account of type "${accountType}"${subtypeMsg} not found. ` +
        `Please configure your chart of accounts first.`
    );
  }

  // Cache the result
  accountCache.set(cacheKey, data.id);
  return data.id;
}

/**
 * Get account by name pattern
 */
async function getAccountByName(
  organizationId: string,
  namePattern: string,
  accountType?: string
): Promise<string | null> {
  let query = supabase
    .from('accounts')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .eq('is_group', false)
    .ilike('name', `%${namePattern}%`);

  if (accountType) {
    query = query.eq('account_type', accountType);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id;
}

// =====================================================
// INVOICE LEDGER INTEGRATION
// =====================================================

/**
 * Sync sales invoice to ledger
 *
 * Journal Entry:
 * Dr. Accounts Receivable        XXX.XX
 *    Cr. Sales Revenue                   XXX.XX
 *    Cr. Sales Tax Payable                XX.XX
 */
export async function syncSalesInvoiceToLedger(
  invoice: InvoiceData,
  userId: string
): Promise<LedgerSyncResult> {
  try {
    if (!invoice.organization_id) {
      throw new Error('Organization ID is required');
    }

    // Get required accounts
    const receivableAccountId = await getAccountByType(
      invoice.organization_id,
      'Asset',
      'Receivable'
    );

    // Try to get a specific sales revenue account, fallback to general revenue
    let revenueAccountId = await getAccountByName(
      invoice.organization_id,
      'ventes',
      'Revenue'
    );
    if (!revenueAccountId) {
      revenueAccountId = await getAccountByType(
        invoice.organization_id,
        'Revenue',
        'Operating Revenue'
      );
    }

    // Get tax payable account (TVA collectée / Sales Tax Payable)
    const taxPayableAccountId = await getAccountByName(
      invoice.organization_id,
      'TVA collectée',
      'Liability'
    );

    if (!taxPayableAccountId && invoice.tax_amount > 0) {
      console.warn('Tax payable account not found, will post without tax breakdown');
    }

    // Build journal entry items
    const items: any[] = [
      {
        account_id: receivableAccountId,
        debit: invoice.total_amount,
        credit: 0,
        description: `Sales invoice ${invoice.invoice_number}`,
      },
      {
        account_id: revenueAccountId,
        debit: 0,
        credit: invoice.subtotal,
        description: `Sales revenue - ${invoice.invoice_number}`,
      },
    ];

    // Add tax item if applicable
    if (invoice.tax_amount > 0 && taxPayableAccountId) {
      items.push({
        account_id: taxPayableAccountId,
        debit: 0,
        credit: invoice.tax_amount,
        description: `Sales tax on invoice ${invoice.invoice_number}`,
      });
    }

    // Create journal entry
    const entry = await accountingApi.createJournalEntry(
      {
        entry_date: new Date(invoice.invoice_date),
        posting_date: new Date(invoice.invoice_date),
        reference_type: 'sales_invoice',
        reference_id: invoice.id,
        remarks: `Sales Invoice ${invoice.invoice_number}${
          invoice.customer_id ? ` - Customer ID: ${invoice.customer_id}` : ''
        }`,
        items,
      },
      invoice.organization_id,
      userId
    );

    // Auto-post the entry
    try {
      await accountingApi.postJournalEntry(entry.id, userId);
    } catch (postError) {
      console.error('Error auto-posting journal entry:', postError);
    }

    return {
      journalEntryId: entry.id,
      success: true,
    };
  } catch (error) {
    console.error('Error syncing sales invoice to ledger:', error);
    return {
      journalEntryId: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync purchase invoice to ledger
 *
 * Journal Entry:
 * Dr. Purchase Expense / Inventory   XXX.XX
 * Dr. Purchase Tax Receivable         XX.XX
 *    Cr. Accounts Payable                    XXX.XX
 */
export async function syncPurchaseInvoiceToLedger(
  invoice: InvoiceData,
  userId: string
): Promise<LedgerSyncResult> {
  try {
    if (!invoice.organization_id) {
      throw new Error('Organization ID is required');
    }

    // Get required accounts
    const payableAccountId = await getAccountByType(
      invoice.organization_id,
      'Liability',
      'Payable'
    );

    // For agricultural supplies, try to get specific expense accounts
    let expenseAccountId = await getAccountByName(
      invoice.organization_id,
      'achats',
      'Expense'
    );
    if (!expenseAccountId) {
      expenseAccountId = await getAccountByType(
        invoice.organization_id,
        'Expense',
        'Operating Expense'
      );
    }

    // Get tax receivable account (TVA déductible / Purchase Tax Receivable)
    const taxReceivableAccountId = await getAccountByName(
      invoice.organization_id,
      'TVA déductible',
      'Asset'
    );

    if (!taxReceivableAccountId && invoice.tax_amount > 0) {
      console.warn('Tax receivable account not found, will post without tax breakdown');
    }

    // Build journal entry items
    const items: any[] = [
      {
        account_id: expenseAccountId,
        debit: invoice.subtotal,
        credit: 0,
        description: `Purchase invoice ${invoice.invoice_number}`,
      },
      {
        account_id: payableAccountId,
        debit: 0,
        credit: invoice.total_amount,
        description: `Supplier payable - ${invoice.invoice_number}`,
      },
    ];

    // Add tax item if applicable
    if (invoice.tax_amount > 0 && taxReceivableAccountId) {
      items.push({
        account_id: taxReceivableAccountId,
        debit: invoice.tax_amount,
        credit: 0,
        description: `Purchase tax on invoice ${invoice.invoice_number}`,
      });
    }

    // Create journal entry
    const entry = await accountingApi.createJournalEntry(
      {
        entry_date: new Date(invoice.invoice_date),
        posting_date: new Date(invoice.invoice_date),
        reference_type: 'purchase_invoice',
        reference_id: invoice.id,
        remarks: `Purchase Invoice ${invoice.invoice_number}${
          invoice.supplier_id ? ` - Supplier ID: ${invoice.supplier_id}` : ''
        }`,
        items,
      },
      invoice.organization_id,
      userId
    );

    // Auto-post the entry
    try {
      await accountingApi.postJournalEntry(entry.id, userId);
    } catch (postError) {
      console.error('Error auto-posting journal entry:', postError);
    }

    return {
      journalEntryId: entry.id,
      success: true,
    };
  } catch (error) {
    console.error('Error syncing purchase invoice to ledger:', error);
    return {
      journalEntryId: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main invoice sync function that routes to appropriate handler
 */
export async function syncInvoiceToLedger(
  invoice: InvoiceData,
  userId: string
): Promise<LedgerSyncResult> {
  if (invoice.invoice_type === 'sales') {
    return await syncSalesInvoiceToLedger(invoice, userId);
  } else if (invoice.invoice_type === 'purchase') {
    return await syncPurchaseInvoiceToLedger(invoice, userId);
  } else {
    return {
      journalEntryId: null,
      success: false,
      error: `Unknown invoice type: ${invoice.invoice_type}`,
    };
  }
}

// =====================================================
// PAYMENT LEDGER INTEGRATION
// =====================================================

/**
 * Sync customer payment (receipt) to ledger
 *
 * Journal Entry:
 * Dr. Cash / Bank Account           XXX.XX
 *    Cr. Accounts Receivable               XXX.XX
 */
export async function syncCustomerPaymentToLedger(
  payment: PaymentData,
  userId: string
): Promise<LedgerSyncResult> {
  try {
    if (!payment.organization_id) {
      throw new Error('Organization ID is required');
    }

    // Get cash/bank account
    const cashAccountId = payment.bank_account_id
      ? payment.bank_account_id
      : await getAccountByType(payment.organization_id, 'Asset', 'Cash');

    // Get accounts receivable
    const receivableAccountId = await getAccountByType(
      payment.organization_id,
      'Asset',
      'Receivable'
    );

    // Create journal entry
    const entry = await accountingApi.createJournalEntry(
      {
        entry_date: new Date(payment.payment_date),
        posting_date: new Date(payment.payment_date),
        reference_type: 'customer_payment',
        reference_id: payment.id,
        remarks: `Customer Payment ${payment.payment_number} - ${payment.payment_method}`,
        items: [
          {
            account_id: cashAccountId,
            debit: payment.amount,
            credit: 0,
            description: `Payment received - ${payment.payment_number}`,
          },
          {
            account_id: receivableAccountId,
            debit: 0,
            credit: payment.amount,
            description: `Customer payment - ${payment.payment_number}`,
          },
        ],
      },
      payment.organization_id,
      userId
    );

    // Auto-post
    try {
      await accountingApi.postJournalEntry(entry.id, userId);
    } catch (postError) {
      console.error('Error auto-posting journal entry:', postError);
    }

    return {
      journalEntryId: entry.id,
      success: true,
    };
  } catch (error) {
    console.error('Error syncing customer payment to ledger:', error);
    return {
      journalEntryId: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync supplier payment to ledger
 *
 * Journal Entry:
 * Dr. Accounts Payable             XXX.XX
 *    Cr. Cash / Bank Account              XXX.XX
 */
export async function syncSupplierPaymentToLedger(
  payment: PaymentData,
  userId: string
): Promise<LedgerSyncResult> {
  try {
    if (!payment.organization_id) {
      throw new Error('Organization ID is required');
    }

    // Get cash/bank account
    const cashAccountId = payment.bank_account_id
      ? payment.bank_account_id
      : await getAccountByType(payment.organization_id, 'Asset', 'Cash');

    // Get accounts payable
    const payableAccountId = await getAccountByType(
      payment.organization_id,
      'Liability',
      'Payable'
    );

    // Create journal entry
    const entry = await accountingApi.createJournalEntry(
      {
        entry_date: new Date(payment.payment_date),
        posting_date: new Date(payment.payment_date),
        reference_type: 'supplier_payment',
        reference_id: payment.id,
        remarks: `Supplier Payment ${payment.payment_number} - ${payment.payment_method}`,
        items: [
          {
            account_id: payableAccountId,
            debit: payment.amount,
            credit: 0,
            description: `Supplier payment - ${payment.payment_number}`,
          },
          {
            account_id: cashAccountId,
            debit: 0,
            credit: payment.amount,
            description: `Payment made - ${payment.payment_number}`,
          },
        ],
      },
      payment.organization_id,
      userId
    );

    // Auto-post
    try {
      await accountingApi.postJournalEntry(entry.id, userId);
    } catch (postError) {
      console.error('Error auto-posting journal entry:', postError);
    }

    return {
      journalEntryId: entry.id,
      success: true,
    };
  } catch (error) {
    console.error('Error syncing supplier payment to ledger:', error);
    return {
      journalEntryId: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main payment sync function that routes to appropriate handler
 */
export async function syncPaymentToLedger(
  payment: PaymentData,
  userId: string
): Promise<LedgerSyncResult> {
  if (payment.payment_type === 'receive') {
    return await syncCustomerPaymentToLedger(payment, userId);
  } else if (payment.payment_type === 'pay') {
    return await syncSupplierPaymentToLedger(payment, userId);
  } else {
    return {
      journalEntryId: null,
      success: false,
      error: `Unknown payment type: ${payment.payment_type}`,
    };
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Clear account cache (call this when accounts are modified)
 */
export function clearAccountCache(): void {
  accountCache.clear();
}

/**
 * Link a journal entry to a source record
 */
export async function linkJournalEntry(
  tableName: string,
  recordId: string,
  journalEntryId: string
): Promise<void> {
  const { error } = await supabase
    .from(tableName)
    .update({ journal_entry_id: journalEntryId })
    .eq('id', recordId);

  if (error) {
    console.error(`Error linking journal entry to ${tableName}:`, error);
    throw error;
  }
}

/**
 * Delete journal entry when source record is deleted
 */
export async function deleteLinkedJournalEntry(
  journalEntryId: string
): Promise<void> {
  try {
    await accountingApi.deleteJournalEntry(journalEntryId);
  } catch (error) {
    console.error('Error deleting linked journal entry:', error);
    throw error;
  }
}
