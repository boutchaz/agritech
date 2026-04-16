/**
 * Ledger Helper
 *
 * Builds journal entry lines for common business transactions following
 * double-entry bookkeeping principles.
 *
 * Migrated from: project/supabase/functions/_shared/ledger.ts
 */

export interface InvoiceItem {
  id: string;
  item_name: string;
  description?: string | null;
  amount: number;
  tax_amount?: number | null;
  /** Per-item account override (from invoice_items.account_id). Takes priority over defaults. */
  account_id?: string | null;
  /** @deprecated Use account_id instead */
  income_account_id?: string | null;
  /** @deprecated Use account_id instead */
  expense_account_id?: string | null;
  cost_center_id?: string | null;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  invoice_type: 'sales' | 'purchase';
  grand_total: number;
  tax_total?: number | null;
  party_name: string;
  items: InvoiceItem[];
}

export interface PaymentRecord {
  id: string;
  payment_number: string;
  payment_type: 'receive' | 'paid';
  payment_method: string;
  payment_date: string;
  amount: number;
  party_name: string;
  bank_account_id?: string | null;
}

export interface LedgerLine {
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  cost_center_id?: string | null;
  description?: string | null;
}

export interface InvoiceLedgerAccounts {
  receivableAccountId: string;
  payableAccountId: string;
  taxPayableAccountId?: string;
  taxReceivableAccountId?: string;
  /** Default revenue account for sales invoice items without per-item account_id */
  defaultRevenueAccountId?: string;
  /** Default expense account for purchase invoice items without per-item account_id */
  defaultExpenseAccountId?: string;
}

export interface PaymentLedgerAccounts {
  cashAccountId: string;
  accountsReceivableId: string;
  accountsPayableId: string;
}

const toNumber = (value: unknown): number => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeExchangeRate = (rate: unknown): number => {
  const n = toNumber(rate);
  return n > 0 ? n : 1;
};

/**
 * Build journal lines for an invoice
 *
 * Sales Invoice:
 *   Dr. Accounts Receivable
 *   Cr. Sales Revenue (per item)
 *   Cr. Tax Payable
 *
 * Purchase Invoice:
 *   Dr. Expense/Inventory (per item)
 *   Dr. Tax Receivable
 *   Cr. Accounts Payable
 */
export function buildInvoiceLedgerLines(
  invoice: InvoiceRecord,
  entryId: string,
  accounts: InvoiceLedgerAccounts,
  exchangeRate: number = 1,
): LedgerLine[] {
  const lines: LedgerLine[] = [];
  const fx = normalizeExchangeRate(exchangeRate);
  const taxTotal = roundCurrency(toNumber(invoice.tax_total) * fx);
  const grandTotal = roundCurrency(toNumber(invoice.grand_total) * fx);

  if (invoice.invoice_type === 'sales') {
    // Validate required accounts
    if (!accounts.receivableAccountId) {
      throw new Error('Missing accounts receivable account');
    }

    // Dr. Accounts Receivable
    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.receivableAccountId,
      debit: grandTotal,
      credit: 0,
      description: `Invoice ${invoice.invoice_number} receivable`,
    });

    // Cr. Revenue accounts (per item)
    let lineCredits = 0;
    invoice.items.forEach((item) => {
      const itemAccountId = item.account_id || item.income_account_id || accounts.defaultRevenueAccountId;
      if (!itemAccountId) {
        throw new Error(`Invoice item ${item.id} missing revenue account. Set account_id on the item or configure a default revenue account mapping.`);
      }

      const amount = roundCurrency(toNumber(item.amount) * fx);
      if (amount === 0) return;

      lines.push({
        journal_entry_id: entryId,
        account_id: itemAccountId,
        debit: 0,
        credit: amount,
        cost_center_id: item.cost_center_id ?? undefined,
        description: item.item_name,
      });
      lineCredits += amount;
    });

    // Cr. Tax Payable
    if (taxTotal > 0) {
      if (!accounts.taxPayableAccountId) {
        throw new Error('Missing tax payable account for sales invoice');
      }

      lines.push({
        journal_entry_id: entryId,
        account_id: accounts.taxPayableAccountId,
        debit: 0,
        credit: taxTotal,
        description: `Sales tax for ${invoice.invoice_number}`,
      });
      lineCredits += taxTotal;
    }

    // Validate balance
    if (roundCurrency(lineCredits) !== grandTotal) {
      throw new Error(
        `Sales invoice debits and credits do not balance: ${grandTotal} != ${lineCredits}`,
      );
    }
  } else {
    // Purchase Invoice
    if (!accounts.payableAccountId) {
      throw new Error('Missing accounts payable account');
    }

    // Dr. Expense accounts (per item)
    let lineDebits = 0;
    invoice.items.forEach((item) => {
      const itemAccountId = item.account_id || item.expense_account_id || accounts.defaultExpenseAccountId;
      if (!itemAccountId) {
        throw new Error(`Invoice item ${item.id} missing expense account. Set account_id on the item or configure a default expense account mapping.`);
      }

      const amount = roundCurrency(toNumber(item.amount) * fx);
      if (amount === 0) return;

      lines.push({
        journal_entry_id: entryId,
        account_id: itemAccountId,
        debit: amount,
        credit: 0,
        cost_center_id: item.cost_center_id ?? undefined,
        description: item.item_name,
      });
      lineDebits += amount;
    });

    // Dr. Tax Receivable
    if (taxTotal > 0) {
      if (!accounts.taxReceivableAccountId) {
        throw new Error('Missing tax receivable account for purchase invoice');
      }

      lines.push({
        journal_entry_id: entryId,
        account_id: accounts.taxReceivableAccountId,
        debit: taxTotal,
        credit: 0,
        description: `Purchase tax for ${invoice.invoice_number}`,
      });
      lineDebits += taxTotal;
    }

    // Cr. Accounts Payable
    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.payableAccountId,
      debit: 0,
      credit: grandTotal,
      description: `Invoice ${invoice.invoice_number} payable`,
    });

    // Validate balance
    if (roundCurrency(lineDebits) !== grandTotal) {
      throw new Error(
        `Purchase invoice debits and credits do not balance: ${lineDebits} != ${grandTotal}`,
      );
    }
  }

  return lines;
}

/**
 * Build journal lines for a payment
 *
 * Receive Payment:
 *   Dr. Cash/Bank
 *   Cr. Accounts Receivable
 *
 * Make Payment:
 *   Dr. Accounts Payable
 *   Cr. Cash/Bank
 */
export function buildPaymentLedgerLines(
  payment: PaymentRecord,
  entryId: string,
  accounts: PaymentLedgerAccounts,
  exchangeRate: number = 1,
): LedgerLine[] {
  if (!accounts.cashAccountId) {
    throw new Error('Missing cash/bank ledger account');
  }

  const fx = normalizeExchangeRate(exchangeRate);
  const amount = roundCurrency(toNumber(payment.amount) * fx);
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const lines: LedgerLine[] = [];

  if (payment.payment_type === 'receive') {
    if (!accounts.accountsReceivableId) {
      throw new Error('Missing accounts receivable account');
    }

    // Dr. Cash/Bank
    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.cashAccountId,
      debit: amount,
      credit: 0,
      description: `Payment received via ${payment.payment_method}`,
    });

    // Cr. Accounts Receivable
    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.accountsReceivableId,
      debit: 0,
      credit: amount,
      description: `Payment from ${payment.party_name}`,
    });
  } else {
    // payment_type === 'paid'
    if (!accounts.accountsPayableId) {
      throw new Error('Missing accounts payable account');
    }

    // Dr. Accounts Payable
    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.accountsPayableId,
      debit: amount,
      credit: 0,
      description: `Payment to ${payment.party_name}`,
    });

    // Cr. Cash/Bank
    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.cashAccountId,
      debit: 0,
      credit: amount,
      description: `Payment made via ${payment.payment_method}`,
    });
  }

  return lines;
}
