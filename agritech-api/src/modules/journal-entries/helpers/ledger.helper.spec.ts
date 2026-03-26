import {
  buildInvoiceLedgerLines,
  buildPaymentLedgerLines,
  InvoiceRecord,
  InvoiceLedgerAccounts,
  PaymentRecord,
  PaymentLedgerAccounts,
} from './ledger.helper';

describe('buildInvoiceLedgerLines', () => {
  const entryId = 'journal-entry-001';

  const makeAccounts = (overrides?: Partial<InvoiceLedgerAccounts>): InvoiceLedgerAccounts => ({
    receivableAccountId: 'acc-receivable',
    payableAccountId: 'acc-payable',
    taxPayableAccountId: 'acc-tax-collected',
    taxReceivableAccountId: 'acc-tax-deductible',
    defaultRevenueAccountId: 'acc-revenue-default',
    defaultExpenseAccountId: 'acc-expense-default',
    ...overrides,
  });

  const makeSalesInvoice = (overrides?: Partial<InvoiceRecord>): InvoiceRecord => ({
    id: 'inv-001',
    invoice_number: 'INV-2026-00001',
    invoice_type: 'sales',
    grand_total: 18000,
    tax_total: 3000,
    party_name: 'Supermarché Atlas',
    items: [
      {
        id: 'item-001',
        item_name: 'Clémentines',
        amount: 15000,
        tax_amount: 3000,
      },
    ],
    ...overrides,
  });

  const makePurchaseInvoice = (overrides?: Partial<InvoiceRecord>): InvoiceRecord => ({
    id: 'inv-002',
    invoice_number: 'INV-2026-00002',
    invoice_type: 'purchase',
    grand_total: 12000,
    tax_total: 2000,
    party_name: 'Agrofertil SA',
    items: [
      {
        id: 'item-002',
        item_name: 'Engrais NPK',
        amount: 10000,
        tax_amount: 2000,
      },
    ],
    ...overrides,
  });

  describe('Sales Invoice', () => {
    it('creates balanced journal lines with correct accounts', () => {
      const lines = buildInvoiceLedgerLines(
        makeSalesInvoice(),
        entryId,
        makeAccounts(),
      );

      expect(lines).toHaveLength(3);

      // Dr. Receivable
      const debitLine = lines.find(l => l.debit > 0);
      expect(debitLine).toBeDefined();
      expect(debitLine!.account_id).toBe('acc-receivable');
      expect(debitLine!.debit).toBe(18000);

      // Cr. Revenue
      const revenueLine = lines.find(l => l.credit === 15000);
      expect(revenueLine).toBeDefined();
      expect(revenueLine!.account_id).toBe('acc-revenue-default');

      // Cr. Tax
      const taxLine = lines.find(l => l.credit === 3000);
      expect(taxLine).toBeDefined();
      expect(taxLine!.account_id).toBe('acc-tax-collected');

      // Double-entry balanced
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      expect(totalDebit).toBe(totalCredit);
    });

    it('uses per-item account_id when set (overrides default)', () => {
      const invoice = makeSalesInvoice({
        items: [
          {
            id: 'item-001',
            item_name: 'Clémentines',
            amount: 15000,
            tax_amount: 3000,
            account_id: 'acc-specific-revenue',
          },
        ],
      });

      const lines = buildInvoiceLedgerLines(invoice, entryId, makeAccounts());
      const revenueLine = lines.find(l => l.credit === 15000);
      expect(revenueLine!.account_id).toBe('acc-specific-revenue');
    });

    it('falls back to legacy income_account_id when account_id not set', () => {
      const invoice = makeSalesInvoice({
        items: [
          {
            id: 'item-001',
            item_name: 'Clémentines',
            amount: 15000,
            tax_amount: 3000,
            income_account_id: 'acc-legacy-revenue',
          },
        ],
      });

      const lines = buildInvoiceLedgerLines(invoice, entryId, makeAccounts());
      const revenueLine = lines.find(l => l.credit === 15000);
      expect(revenueLine!.account_id).toBe('acc-legacy-revenue');
    });

    it('uses defaultRevenueAccountId when item has no account', () => {
      const invoice = makeSalesInvoice({
        items: [
          {
            id: 'item-001',
            item_name: 'Clémentines',
            amount: 15000,
            tax_amount: 3000,
            // no account_id, no income_account_id
          },
        ],
      });

      const lines = buildInvoiceLedgerLines(invoice, entryId, makeAccounts());
      const revenueLine = lines.find(l => l.credit === 15000);
      expect(revenueLine!.account_id).toBe('acc-revenue-default');
    });

    it('throws when item has no account and no default revenue mapping', () => {
      const invoice = makeSalesInvoice();
      const accounts = makeAccounts({ defaultRevenueAccountId: undefined });

      expect(() => buildInvoiceLedgerLines(invoice, entryId, accounts)).toThrow(
        /missing revenue account/i,
      );
    });

    it('throws when receivable account is missing', () => {
      const accounts = makeAccounts({ receivableAccountId: '' });

      expect(() =>
        buildInvoiceLedgerLines(makeSalesInvoice(), entryId, accounts),
      ).toThrow(/missing accounts receivable/i);
    });

    it('skips tax line when tax_total is zero', () => {
      const invoice = makeSalesInvoice({
        grand_total: 15000,
        tax_total: 0,
        items: [{ id: 'item-001', item_name: 'Clémentines', amount: 15000, tax_amount: 0 }],
      });

      const lines = buildInvoiceLedgerLines(invoice, entryId, makeAccounts());
      expect(lines).toHaveLength(2); // Dr. Receivable, Cr. Revenue only
    });

    it('handles multiple items with mixed accounts', () => {
      const invoice = makeSalesInvoice({
        grand_total: 30000,
        tax_total: 5000,
        items: [
          { id: 'item-001', item_name: 'Clémentines', amount: 15000, tax_amount: 2500, account_id: 'acc-citrus' },
          { id: 'item-002', item_name: 'Tomates', amount: 10000, tax_amount: 2500 }, // uses default
        ],
      });

      const lines = buildInvoiceLedgerLines(invoice, entryId, makeAccounts());

      const citrusLine = lines.find(l => l.description === 'Clémentines');
      expect(citrusLine!.account_id).toBe('acc-citrus');

      const tomatoLine = lines.find(l => l.description === 'Tomates');
      expect(tomatoLine!.account_id).toBe('acc-revenue-default');

      // Still balanced
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      expect(totalDebit).toBe(totalCredit);
    });
  });

  describe('Purchase Invoice', () => {
    it('creates balanced journal lines with correct accounts', () => {
      const lines = buildInvoiceLedgerLines(
        makePurchaseInvoice(),
        entryId,
        makeAccounts(),
      );

      expect(lines).toHaveLength(3);

      // Dr. Expense
      const expenseLine = lines.find(l => l.debit === 10000);
      expect(expenseLine).toBeDefined();
      expect(expenseLine!.account_id).toBe('acc-expense-default');

      // Dr. Tax deductible
      const taxLine = lines.find(l => l.debit === 2000);
      expect(taxLine).toBeDefined();
      expect(taxLine!.account_id).toBe('acc-tax-deductible');

      // Cr. Payable
      const payableLine = lines.find(l => l.credit > 0);
      expect(payableLine).toBeDefined();
      expect(payableLine!.account_id).toBe('acc-payable');
      expect(payableLine!.credit).toBe(12000);

      // Double-entry balanced
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      expect(totalDebit).toBe(totalCredit);
    });

    it('uses per-item account_id for expense lines', () => {
      const invoice = makePurchaseInvoice({
        items: [
          {
            id: 'item-002',
            item_name: 'Engrais NPK',
            amount: 10000,
            tax_amount: 2000,
            account_id: 'acc-specific-expense',
          },
        ],
      });

      const lines = buildInvoiceLedgerLines(invoice, entryId, makeAccounts());
      const expenseLine = lines.find(l => l.debit === 10000);
      expect(expenseLine!.account_id).toBe('acc-specific-expense');
    });

    it('throws when item has no account and no default expense mapping', () => {
      const invoice = makePurchaseInvoice();
      const accounts = makeAccounts({ defaultExpenseAccountId: undefined });

      expect(() => buildInvoiceLedgerLines(invoice, entryId, accounts)).toThrow(
        /missing expense account/i,
      );
    });

    it('throws when payable account is missing', () => {
      const accounts = makeAccounts({ payableAccountId: '' });

      expect(() =>
        buildInvoiceLedgerLines(makePurchaseInvoice(), entryId, accounts),
      ).toThrow(/missing accounts payable/i);
    });
  });
});

describe('buildPaymentLedgerLines', () => {
  const entryId = 'journal-entry-002';

  const makeAccounts = (): PaymentLedgerAccounts => ({
    cashAccountId: 'acc-cash',
    accountsReceivableId: 'acc-receivable',
    accountsPayableId: 'acc-payable',
  });

  const makeReceivedPayment = (): PaymentRecord => ({
    id: 'pay-001',
    payment_number: 'PAY-2026-00001',
    payment_type: 'receive',
    payment_method: 'Bank Transfer',
    payment_date: '2026-03-26',
    amount: 18000,
    party_name: 'Supermarché Atlas',
  });

  const makePaidPayment = (): PaymentRecord => ({
    id: 'pay-002',
    payment_number: 'PAY-2026-00002',
    payment_type: 'paid',
    payment_method: 'Bank Transfer',
    payment_date: '2026-03-26',
    amount: 12000,
    party_name: 'Agrofertil SA',
  });

  it('creates correct lines for received payment (Dr Cash, Cr AR)', () => {
    const lines = buildPaymentLedgerLines(makeReceivedPayment(), entryId, makeAccounts());

    expect(lines).toHaveLength(2);

    const cashLine = lines.find(l => l.debit > 0);
    expect(cashLine!.account_id).toBe('acc-cash');
    expect(cashLine!.debit).toBe(18000);

    const arLine = lines.find(l => l.credit > 0);
    expect(arLine!.account_id).toBe('acc-receivable');
    expect(arLine!.credit).toBe(18000);
  });

  it('creates correct lines for made payment (Dr AP, Cr Cash)', () => {
    const lines = buildPaymentLedgerLines(makePaidPayment(), entryId, makeAccounts());

    expect(lines).toHaveLength(2);

    const apLine = lines.find(l => l.debit > 0);
    expect(apLine!.account_id).toBe('acc-payable');
    expect(apLine!.debit).toBe(12000);

    const cashLine = lines.find(l => l.credit > 0);
    expect(cashLine!.account_id).toBe('acc-cash');
    expect(cashLine!.credit).toBe(12000);
  });

  it('throws when cash account is missing', () => {
    const accounts = { ...makeAccounts(), cashAccountId: '' };
    expect(() => buildPaymentLedgerLines(makeReceivedPayment(), entryId, accounts)).toThrow(
      /missing cash/i,
    );
  });

  it('throws when amount is zero', () => {
    const payment = { ...makeReceivedPayment(), amount: 0 };
    expect(() => buildPaymentLedgerLines(payment, entryId, makeAccounts())).toThrow(
      /greater than zero/i,
    );
  });

  it('all lines are double-entry balanced', () => {
    const lines = buildPaymentLedgerLines(makeReceivedPayment(), entryId, makeAccounts());
    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    expect(totalDebit).toBe(totalCredit);
  });
});
