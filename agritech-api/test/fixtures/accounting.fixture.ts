/**
 * Test fixtures for accounting-related entities
 * Includes invoices, payments, journal entries, and accounts
 */

import { TEST_IDS, TEST_DATES } from '../helpers/test-utils';

/**
 * Mock accounts (Chart of Accounts)
 */
export const mockAccounts = {
  cash: {
    id: 'acc-cash-001',
    code: '1110',
    name: 'Cash',
    account_type: 'asset',
    organization_id: TEST_IDS.organization,
  },
  accountsReceivable: {
    id: 'acc-ar-001',
    code: '1200',
    name: 'Accounts Receivable',
    account_type: 'asset',
    organization_id: TEST_IDS.organization,
  },
  prepaidTax: {
    id: 'acc-prepaid-tax-001',
    code: '1400',
    name: 'Prepaid Taxes',
    account_type: 'asset',
    organization_id: TEST_IDS.organization,
  },
  accountsPayable: {
    id: 'acc-ap-001',
    code: '2110',
    name: 'Accounts Payable',
    account_type: 'liability',
    organization_id: TEST_IDS.organization,
  },
  taxPayable: {
    id: 'acc-tax-001',
    code: '2150',
    name: 'Taxes Payable',
    account_type: 'liability',
    organization_id: TEST_IDS.organization,
  },
  salesRevenue: {
    id: 'acc-sales-001',
    code: '4100',
    name: 'Sales Revenue',
    account_type: 'revenue',
    organization_id: TEST_IDS.organization,
  },
  costOfGoodsSold: {
    id: 'acc-cogs-001',
    code: '5100',
    name: 'Cost of Goods Sold',
    account_type: 'expense',
    organization_id: TEST_IDS.organization,
  },
};

/**
 * All accounts as array for bulk operations
 */
export const mockAccountsList = Object.values(mockAccounts);

/**
 * Mock invoices
 */
export const mockInvoices = {
  salesDraft: {
    id: 'inv-sales-draft-001',
    organization_id: TEST_IDS.organization,
    invoice_number: 'INV-2024-00001',
    invoice_type: 'sales',
    party_type: 'customer',
    party_id: 'customer-001',
    party_name: 'Test Customer',
    invoice_date: TEST_DATES.today,
    due_date: TEST_DATES.nextWeek,
    subtotal: 1000,
    tax_total: 200,
    grand_total: 1200,
    outstanding_amount: 1200,
    paid_amount: 0,
    currency_code: 'MAD',
    exchange_rate: 1.0,
    status: 'draft',
    created_by: TEST_IDS.user,
  },
  salesSubmitted: {
    id: 'inv-sales-submitted-001',
    organization_id: TEST_IDS.organization,
    invoice_number: 'INV-2024-00002',
    invoice_type: 'sales',
    party_type: 'customer',
    party_id: 'customer-002',
    party_name: 'Another Customer',
    invoice_date: TEST_DATES.yesterday,
    due_date: TEST_DATES.nextWeek,
    subtotal: 2000,
    tax_total: 400,
    grand_total: 2400,
    outstanding_amount: 2400,
    paid_amount: 0,
    currency_code: 'MAD',
    exchange_rate: 1.0,
    status: 'submitted',
    journal_entry_id: 'je-inv-001',
    created_by: TEST_IDS.user,
  },
  purchaseDraft: {
    id: 'inv-purchase-draft-001',
    organization_id: TEST_IDS.organization,
    invoice_number: 'INV-2024-00003',
    invoice_type: 'purchase',
    party_type: 'supplier',
    party_id: 'supplier-001',
    party_name: 'Test Supplier',
    invoice_date: TEST_DATES.today,
    due_date: TEST_DATES.nextWeek,
    subtotal: 500,
    tax_total: 100,
    grand_total: 600,
    outstanding_amount: 600,
    paid_amount: 0,
    currency_code: 'MAD',
    exchange_rate: 1.0,
    status: 'draft',
    created_by: TEST_IDS.user,
  },
  paidInvoice: {
    id: 'inv-paid-001',
    organization_id: TEST_IDS.organization,
    invoice_number: 'INV-2024-00004',
    invoice_type: 'sales',
    party_type: 'customer',
    party_id: 'customer-003',
    party_name: 'Paid Customer',
    invoice_date: TEST_DATES.lastWeek,
    due_date: TEST_DATES.yesterday,
    subtotal: 1500,
    tax_total: 300,
    grand_total: 1800,
    outstanding_amount: 0,
    paid_amount: 1800,
    currency_code: 'MAD',
    exchange_rate: 1.0,
    status: 'paid',
    journal_entry_id: 'je-inv-002',
    created_by: TEST_IDS.user,
  },
};

export const mockInvoiceItems = [
  {
    id: 'inv-item-001',
    invoice_id: mockInvoices.salesDraft.id,
    line_number: 1,
    item_name: 'Product A',
    description: 'Test product A',
    quantity: 10,
    unit_price: 100,
    amount: 1000,
    tax_rate: 20,
    tax_amount: 200,
    line_total: 1200,
    income_account_id: mockAccounts.salesRevenue.id,
    tax_account_id: mockAccounts.taxPayable.id,
  },
  {
    id: 'inv-item-002',
    invoice_id: mockInvoices.salesSubmitted.id,
    line_number: 1,
    item_name: 'Product B',
    description: 'Test product B',
    quantity: 20,
    unit_price: 100,
    amount: 2000,
    tax_rate: 20,
    tax_amount: 400,
    line_total: 2400,
    income_account_id: mockAccounts.salesRevenue.id,
    tax_account_id: mockAccounts.taxPayable.id,
  },
];

/**
 * Mock payments
 */
export const mockPayments = {
  draftReceive: {
    id: 'pay-draft-001',
    organization_id: TEST_IDS.organization,
    payment_number: 'PAY-2024-00001',
    payment_type: 'receive',
    payment_method: 'bank_transfer',
    payment_date: TEST_DATES.today,
    amount: 1200,
    party_name: 'Test Customer',
    party_id: 'customer-001',
    party_type: 'customer',
    bank_account_id: 'bank-001',
    currency_code: 'MAD',
    exchange_rate: 1.0,
    status: 'draft',
    created_by: TEST_IDS.user,
  },
  submittedReceive: {
    id: 'pay-submitted-001',
    organization_id: TEST_IDS.organization,
    payment_number: 'PAY-2024-00002',
    payment_type: 'receive',
    payment_method: 'check',
    payment_date: TEST_DATES.yesterday,
    amount: 2400,
    party_name: 'Another Customer',
    party_id: 'customer-002',
    party_type: 'customer',
    bank_account_id: 'bank-001',
    currency_code: 'MAD',
    exchange_rate: 1.0,
    status: 'submitted',
    journal_entry_id: 'je-pay-001',
    created_by: TEST_IDS.user,
  },
  draftMake: {
    id: 'pay-draft-002',
    organization_id: TEST_IDS.organization,
    payment_number: 'PAY-2024-00003',
    payment_type: 'make',
    payment_method: 'cash',
    payment_date: TEST_DATES.today,
    amount: 600,
    party_name: 'Test Supplier',
    party_id: 'supplier-001',
    party_type: 'supplier',
    currency_code: 'MAD',
    exchange_rate: 1.0,
    status: 'draft',
    created_by: TEST_IDS.user,
  },
};

/**
 * Mock journal entries
 */
export const mockJournalEntries = {
  draft: {
    id: 'je-draft-001',
    organization_id: TEST_IDS.organization,
    entry_number: 'JE-2024-00001',
    entry_date: TEST_DATES.today,
    total_debit: 1000,
    total_credit: 1000,
    remarks: 'Test journal entry',
    status: 'draft',
    created_by: TEST_IDS.user,
  },
  posted: {
    id: 'je-posted-001',
    organization_id: TEST_IDS.organization,
    entry_number: 'JE-2024-00002',
    entry_date: TEST_DATES.yesterday,
    total_debit: 2000,
    total_credit: 2000,
    remarks: 'Posted journal entry',
    status: 'posted',
    posted_by: TEST_IDS.user,
    posted_at: TEST_DATES.yesterday,
    created_by: TEST_IDS.user,
  },
  cancelled: {
    id: 'je-cancelled-001',
    organization_id: TEST_IDS.organization,
    entry_number: 'JE-2024-00003',
    entry_date: TEST_DATES.lastWeek,
    total_debit: 500,
    total_credit: 500,
    remarks: 'Cancelled journal entry',
    status: 'cancelled',
    created_by: TEST_IDS.user,
  },
};

/**
 * Mock journal items (balanced entries)
 */
export const mockJournalItems = {
  draftItems: [
    {
      id: 'ji-001',
      journal_entry_id: mockJournalEntries.draft.id,
      account_id: mockAccounts.cash.id,
      debit: 1000,
      credit: 0,
      description: 'Cash received',
    },
    {
      id: 'ji-002',
      journal_entry_id: mockJournalEntries.draft.id,
      account_id: mockAccounts.salesRevenue.id,
      debit: 0,
      credit: 1000,
      description: 'Sales revenue',
    },
  ],
  postedItems: [
    {
      id: 'ji-003',
      journal_entry_id: mockJournalEntries.posted.id,
      account_id: mockAccounts.accountsReceivable.id,
      debit: 2000,
      credit: 0,
      description: 'AR increase',
    },
    {
      id: 'ji-004',
      journal_entry_id: mockJournalEntries.posted.id,
      account_id: mockAccounts.salesRevenue.id,
      debit: 0,
      credit: 2000,
      description: 'Sales revenue',
    },
  ],
};

/**
 * Mock bank accounts
 */
export const mockBankAccounts = {
  primary: {
    id: 'bank-001',
    organization_id: TEST_IDS.organization,
    name: 'Primary Bank Account',
    account_number: '1234567890',
    bank_name: 'Test Bank',
    gl_account_id: mockAccounts.cash.id,
    is_active: true,
  },
};

/**
 * Helper to create a valid CreateInvoiceDto
 */
export const createInvoiceDto = (overrides: Partial<any> = {}) => ({
  invoice_type: 'sales',
  party_type: 'customer',
  party_name: 'Test Customer',
  invoice_date: TEST_DATES.today,
  due_date: TEST_DATES.nextWeek,
  currency_code: 'MAD',
  items: [
    {
      item_name: 'Test Item',
      description: 'Test description',
      quantity: 10,
      unit_price: 100,
      amount: 1000,
      tax_rate: 20,
      tax_amount: 200,
      line_total: 1200,
    },
  ],
  ...overrides,
});

/**
 * Helper to create a valid CreatePaymentDto
 */
export const createPaymentDto = (overrides: Partial<any> = {}) => ({
  payment_type: 'receive',
  payment_method: 'bank_transfer',
  payment_date: TEST_DATES.today,
  amount: 1200,
  party_name: 'Test Customer',
  party_type: 'customer',
  currency_code: 'MAD',
  ...overrides,
});

/**
 * Helper to create a valid CreateJournalEntryDto
 */
export const createJournalEntryDto = (overrides: Partial<any> = {}) => ({
  entry_date: TEST_DATES.today,
  remarks: 'Test journal entry',
  items: [
    {
      account_id: mockAccounts.cash.id,
      debit: 1000,
      credit: 0,
      description: 'Debit entry',
    },
    {
      account_id: mockAccounts.salesRevenue.id,
      debit: 0,
      credit: 1000,
      description: 'Credit entry',
    },
  ],
  ...overrides,
});

/**
 * Helper to create an unbalanced journal entry (for testing validation)
 */
export const createUnbalancedJournalEntryDto = () => ({
  entry_date: TEST_DATES.today,
  remarks: 'Unbalanced entry',
  items: [
    {
      account_id: mockAccounts.cash.id,
      debit: 1000,
      credit: 0,
    },
    {
      account_id: mockAccounts.salesRevenue.id,
      debit: 0,
      credit: 500, // Unbalanced!
    },
  ],
});
