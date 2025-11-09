// Accounting Module Zod Schemas
// Validation schemas for accounting entities

import { z } from 'zod';

// =====================================================
// ENUMS
// =====================================================

export const accountTypeEnum = z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']);
export const journalEntryStatusEnum = z.enum(['draft', 'submitted', 'posted', 'cancelled']);
export const invoiceTypeEnum = z.enum(['sales', 'purchase']);
export const invoiceStatusEnum = z.enum(['draft', 'submitted', 'paid', 'partially_paid', 'overdue', 'cancelled']);
export const paymentTypeEnum = z.enum(['receive', 'pay']);
export const paymentMethodEnum = z.enum(['cash', 'bank_transfer', 'check', 'card', 'mobile_money']);
export const paymentStatusEnum = z.enum(['draft', 'submitted', 'reconciled', 'cancelled']);
export const taxTypeEnum = z.enum(['sales', 'purchase', 'both']);

// =====================================================
// ACCOUNT SCHEMAS
// =====================================================

export const accountSchema = z.object({
  code: z.string().min(1, 'Account code is required').max(50),
  name: z.string().min(1, 'Account name is required').max(255),
  account_type: accountTypeEnum,
  account_subtype: z.string().max(100).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_group: z.boolean().default(false),
  is_active: z.boolean().default(true),
  currency_code: z.string().length(3).default('MAD'),
  allow_cost_center: z.boolean().default(true),
  description: z.string().optional(),
});

export const createAccountSchema = accountSchema;

export const updateAccountSchema = accountSchema.partial().extend({
  id: z.string().uuid(),
});

// =====================================================
// COST CENTER SCHEMAS
// =====================================================

export const costCenterSchema = z.object({
  code: z.string().min(1, 'Cost center code is required').max(50),
  name: z.string().min(1, 'Cost center name is required').max(255),
  parent_id: z.string().uuid().nullable().optional(),
  farm_id: z.string().uuid().nullable().optional(),
  parcel_id: z.string().uuid().nullable().optional(),
  is_group: z.boolean().default(false),
  is_active: z.boolean().default(true),
  description: z.string().optional(),
});

export const createCostCenterSchema = costCenterSchema;

export const updateCostCenterSchema = costCenterSchema.partial().extend({
  id: z.string().uuid(),
});

// =====================================================
// TAX SCHEMAS
// =====================================================

export const taxSchema = z.object({
  code: z.string().min(1, 'Tax code is required').max(50),
  name: z.string().min(1, 'Tax name is required').max(255),
  tax_type: taxTypeEnum,
  rate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  sales_account_id: z.string().uuid().nullable().optional(),
  purchase_account_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
  description: z.string().optional(),
});

export const createTaxSchema = taxSchema;

export const updateTaxSchema = taxSchema.partial().extend({
  id: z.string().uuid(),
});

// =====================================================
// BANK ACCOUNT SCHEMAS
// =====================================================

export const bankAccountSchema = z.object({
  account_name: z.string().min(1, 'Account name is required').max(255),
  bank_name: z.string().max(255).optional(),
  account_number: z.string().max(100).optional(),
  iban: z.string().max(50).optional(),
  swift_code: z.string().max(20).optional(),
  currency_code: z.string().length(3).default('MAD'),
  gl_account_id: z.string().uuid('GL account is required'),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  opening_balance: z.number().default(0),
});

export const createBankAccountSchema = bankAccountSchema;

export const updateBankAccountSchema = bankAccountSchema.partial().extend({
  id: z.string().uuid(),
});

// =====================================================
// JOURNAL ENTRY SCHEMAS
// =====================================================

export const journalItemSchema = z.object({
  account_id: z.string().uuid('Account is required'),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
  cost_center_id: z.string().uuid().nullable().optional(),
  farm_id: z.string().uuid().nullable().optional(),
  parcel_id: z.string().uuid().nullable().optional(),
  description: z.string().optional(),
}).refine(
  (data) => (data.debit > 0 && data.credit === 0) || (data.credit > 0 && data.debit === 0),
  {
    message: 'Each line must have either debit or credit (not both)',
    path: ['debit'],
  }
);

export const journalEntrySchema = z.object({
  entry_date: z.date({ required_error: 'Entry date is required' }),
  reference_number: z.string().max(100).optional(),
  reference_type: z.string().max(50).optional(),
  reference_id: z.string().uuid().nullable().optional(),
  remarks: z.string().optional(),
  items: z.array(journalItemSchema).min(2, 'At least two journal items are required'),
}).refine(
  (data) => {
    const totalDebit = data.items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = data.items.reduce((sum, item) => sum + item.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01; // Allow for rounding errors
  },
  {
    message: 'Total debits must equal total credits',
    path: ['items'],
  }
);

export const createJournalEntrySchema = journalEntrySchema;

export const updateJournalEntrySchema = journalEntrySchema.partial().extend({
  id: z.string().uuid(),
  status: journalEntryStatusEnum.optional(),
});

// =====================================================
// INVOICE SCHEMAS
// =====================================================

export const invoiceItemSchema = z.object({
  item_code: z.string().max(100).optional(),
  item_name: z.string().min(1, 'Item name is required').max(255),
  description: z.string().optional(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit_price: z.number().nonnegative('Unit price must be non-negative'),
  tax_id: z.string().uuid().nullable().optional(),
  tax_rate: z.number().nonnegative().default(0),
  tax_amount: z.number().nonnegative().default(0),
  amount: z.number().nonnegative(),
  income_account_id: z.string().uuid().nullable().optional(),
  expense_account_id: z.string().uuid().nullable().optional(),
});

export const invoiceSchema = z.object({
  invoice_type: invoiceTypeEnum,
  party_type: z.enum(['Customer', 'Supplier']),
  party_id: z.string().uuid().nullable().optional(),
  party_name: z.string().min(1, 'Party name is required').max(255),
  invoice_date: z.date({ required_error: 'Invoice date is required' }),
  due_date: z.date({ required_error: 'Due date is required' }),
  currency_code: z.string().length(3).default('MAD'),
  exchange_rate: z.number().positive().default(1.0),
  farm_id: z.string().uuid().nullable().optional(),
  parcel_id: z.string().uuid().nullable().optional(),
  attachment_url: z.string().url().optional(),
  remarks: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one invoice item is required'),
}).refine(
  (data) => data.due_date >= data.invoice_date,
  {
    message: 'Due date must be on or after invoice date',
    path: ['due_date'],
  }
);

export const createInvoiceSchema = invoiceSchema;

export const updateInvoiceSchema = invoiceSchema.partial().extend({
  id: z.string().uuid(),
  invoice_number: z.string().optional(),
  status: invoiceStatusEnum.optional(),
});

// =====================================================
// PAYMENT SCHEMAS
// =====================================================

export const paymentAllocationSchema = z.object({
  invoice_id: z.string().uuid('Invoice is required'),
  allocated_amount: z.number().positive('Allocated amount must be greater than 0'),
});

export const paymentSchema = z.object({
  payment_type: paymentTypeEnum,
  party_type: z.enum(['Customer', 'Supplier']),
  party_id: z.string().uuid().nullable().optional(),
  party_name: z.string().min(1, 'Party name is required').max(255),
  payment_date: z.date({ required_error: 'Payment date is required' }),
  payment_method: paymentMethodEnum,
  amount: z.number().positive('Amount must be greater than 0'),
  currency_code: z.string().length(3).default('MAD'),
  exchange_rate: z.number().positive().default(1.0),
  bank_account_id: z.string().uuid().nullable().optional(),
  reference_number: z.string().max(100).optional(),
  remarks: z.string().optional(),
  allocations: z.array(paymentAllocationSchema).optional(),
}).refine(
  (data) => {
    if (!data.allocations || data.allocations.length === 0) return true;
    const totalAllocated = data.allocations.reduce((sum, alloc) => sum + alloc.allocated_amount, 0);
    return Math.abs(totalAllocated - data.amount) < 0.01; // Allow for rounding
  },
  {
    message: 'Total allocated amount must equal payment amount',
    path: ['allocations'],
  }
);

export const createPaymentSchema = paymentSchema;

export const updatePaymentSchema = paymentSchema.partial().extend({
  id: z.string().uuid(),
  payment_number: z.string().optional(),
  status: paymentStatusEnum.optional(),
});

// =====================================================
// FILTER SCHEMAS
// =====================================================

export const ledgerFilterSchema = z.object({
  account_id: z.string().uuid().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  cost_center_id: z.string().uuid().optional(),
  farm_id: z.string().uuid().optional(),
  parcel_id: z.string().uuid().optional(),
  status: journalEntryStatusEnum.optional(),
});

export const invoiceFilterSchema = z.object({
  invoice_type: invoiceTypeEnum.optional(),
  status: invoiceStatusEnum.optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  party_name: z.string().optional(),
  farm_id: z.string().uuid().optional(),
  parcel_id: z.string().uuid().optional(),
});

export const paymentFilterSchema = z.object({
  payment_type: paymentTypeEnum.optional(),
  status: paymentStatusEnum.optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  party_name: z.string().optional(),
  payment_method: paymentMethodEnum.optional(),
});

// =====================================================
// REPORT SCHEMAS
// =====================================================

export const balanceSheetParamsSchema = z.object({
  as_of_date: z.date({ required_error: 'Date is required' }),
  cost_center_id: z.string().uuid().optional(),
  farm_id: z.string().uuid().optional(),
});

export const profitLossParamsSchema = z.object({
  start_date: z.date({ required_error: 'Start date is required' }),
  end_date: z.date({ required_error: 'End date is required' }),
  cost_center_id: z.string().uuid().optional(),
  farm_id: z.string().uuid().optional(),
  parcel_id: z.string().uuid().optional(),
}).refine(
  (data) => data.end_date >= data.start_date,
  {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  }
);

export const trialBalanceParamsSchema = z.object({
  as_of_date: z.date({ required_error: 'Date is required' }),
  include_zero_balance: z.boolean().default(false),
});

export const agedReceivablesParamsSchema = z.object({
  as_of_date: z.date().default(new Date()),
  party_name: z.string().optional(),
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type AccountType = z.infer<typeof accountTypeEnum>;
export type JournalEntryStatus = z.infer<typeof journalEntryStatusEnum>;
export type InvoiceType = z.infer<typeof invoiceTypeEnum>;
export type InvoiceStatus = z.infer<typeof invoiceStatusEnum>;
export type PaymentType = z.infer<typeof paymentTypeEnum>;
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;
export type TaxType = z.infer<typeof taxTypeEnum>;

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export type CreateCostCenterInput = z.infer<typeof createCostCenterSchema>;
export type UpdateCostCenterInput = z.infer<typeof updateCostCenterSchema>;

export type CreateTaxInput = z.infer<typeof createTaxSchema>;
export type UpdateTaxInput = z.infer<typeof updateTaxSchema>;

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

export type JournalItem = z.infer<typeof journalItemSchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export type LedgerFilter = z.infer<typeof ledgerFilterSchema>;
export type InvoiceFilter = z.infer<typeof invoiceFilterSchema>;
export type PaymentFilter = z.infer<typeof paymentFilterSchema>;

export type BalanceSheetParams = z.infer<typeof balanceSheetParamsSchema>;
export type ProfitLossParams = z.infer<typeof profitLossParamsSchema>;
export type TrialBalanceParams = z.infer<typeof trialBalanceParamsSchema>;
export type AgedReceivablesParams = z.infer<typeof agedReceivablesParamsSchema>;
