export interface InvoiceItem {
  id: string;
  item_name: string;
  description?: string | null;
  amount: number;
  tax_amount?: number | null;
  income_account_id?: string | null;
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

export function buildInvoiceLedgerLines(
  invoice: InvoiceRecord,
  entryId: string,
  accounts: InvoiceLedgerAccounts
): LedgerLine[] {
  const lines: LedgerLine[] = [];
  const taxTotal = roundCurrency(toNumber(invoice.tax_total));
  const grandTotal = roundCurrency(toNumber(invoice.grand_total));

  if (invoice.invoice_type === 'sales') {
    if (!accounts.receivableAccountId) {
      throw new Error('Missing accounts receivable account');
    }

    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.receivableAccountId,
      debit: grandTotal,
      credit: 0,
      description: `Invoice ${invoice.invoice_number} receivable`,
    });

    let lineCredits = 0;
    invoice.items.forEach((item) => {
      if (!item.income_account_id) {
        throw new Error(`Invoice item ${item.id} missing income account`);
      }

      const amount = roundCurrency(toNumber(item.amount));
      if (amount === 0) return;

      lines.push({
        journal_entry_id: entryId,
        account_id: item.income_account_id,
        debit: 0,
        credit: amount,
        cost_center_id: item.cost_center_id ?? undefined,
        description: item.item_name,
      });
      lineCredits += amount;
    });

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

    if (roundCurrency(lineCredits) !== grandTotal) {
      throw new Error('Sales invoice debits and credits do not balance');
    }
  } else {
    if (!accounts.payableAccountId) {
      throw new Error('Missing accounts payable account');
    }

    let lineDebits = 0;
    invoice.items.forEach((item) => {
      if (!item.expense_account_id) {
        throw new Error(`Invoice item ${item.id} missing expense account`);
      }

      const amount = roundCurrency(toNumber(item.amount));
      if (amount === 0) return;

      lines.push({
        journal_entry_id: entryId,
        account_id: item.expense_account_id,
        debit: amount,
        credit: 0,
        cost_center_id: item.cost_center_id ?? undefined,
        description: item.item_name,
      });
      lineDebits += amount;
    });

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

    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.payableAccountId,
      debit: 0,
      credit: grandTotal,
      description: `Invoice ${invoice.invoice_number} payable`,
    });

    if (roundCurrency(lineDebits) !== grandTotal) {
      throw new Error('Purchase invoice debits and credits do not balance');
    }
  }

  return lines;
}

export function buildPaymentLedgerLines(
  payment: PaymentRecord,
  entryId: string,
  accounts: PaymentLedgerAccounts
): LedgerLine[] {
  if (!accounts.cashAccountId) {
    throw new Error('Missing cash/bank ledger account');
  }
  const amount = roundCurrency(toNumber(payment.amount));
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }
  const lines: LedgerLine[] = [];

  if (payment.payment_type === 'receive') {
    if (!accounts.accountsReceivableId) {
      throw new Error('Missing accounts receivable account');
    }

    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.cashAccountId,
      debit: amount,
      credit: 0,
      description: `Payment received via ${payment.payment_method}`,
    });

    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.accountsReceivableId,
      debit: 0,
      credit: amount,
      description: `Payment from ${payment.party_name}`,
    });
  } else {
    if (!accounts.accountsPayableId) {
      throw new Error('Missing accounts payable account');
    }

    lines.push({
      journal_entry_id: entryId,
      account_id: accounts.accountsPayableId,
      debit: amount,
      credit: 0,
      description: `Payment to ${payment.party_name}`,
    });

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
