import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const accountTypeEnum = z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']);

const accountSchema = z.object({
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

const costCenterSchema = z.object({
  code: z.string().min(1, 'Cost center code is required').max(50),
  name: z.string().min(1, 'Cost center name is required').max(255),
  parent_id: z.string().uuid().nullable().optional(),
  farm_id: z.string().uuid().nullable().optional(),
  parcel_id: z.string().uuid().nullable().optional(),
  is_group: z.boolean().default(false),
  is_active: z.boolean().default(true),
  description: z.string().optional(),
});

const taxTypeEnum = z.enum(['sales', 'purchase', 'both']);
const taxSchema = z.object({
  code: z.string().min(1, 'Tax code is required').max(50),
  name: z.string().min(1, 'Tax name is required').max(255),
  tax_type: taxTypeEnum,
  rate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  is_active: z.boolean().default(true),
  description: z.string().optional(),
});

const bankAccountSchema = z.object({
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

const journalItemSchema = z.object({
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

const journalEntrySchema = z.object({
  entry_date: z.date(),
  reference_number: z.string().max(100).optional(),
  remarks: z.string().optional(),
  items: z.array(journalItemSchema).min(2, 'At least two journal items are required'),
}).refine(
  (data) => {
    const totalDebit = data.items.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = data.items.reduce((sum, item) => sum + item.credit, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  },
  {
    message: 'Total debits must equal total credits',
    path: ['items'],
  }
);

const invoiceTypeEnum = z.enum(['sales', 'purchase']);
const invoiceItemSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(255),
  description: z.string().optional(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit_price: z.number().nonnegative('Unit price must be non-negative'),
  tax_rate: z.number().nonnegative().default(0),
  tax_amount: z.number().nonnegative().default(0),
  amount: z.number().nonnegative(),
});

const invoiceSchema = z.object({
  invoice_type: invoiceTypeEnum,
  party_type: z.enum(['Customer', 'Supplier']),
  party_id: z.string().uuid().nullable().optional(),
  party_name: z.string().min(1, 'Party name is required').max(255),
  invoice_date: z.date(),
  due_date: z.date(),
  currency_code: z.string().length(3).default('MAD'),
  exchange_rate: z.number().positive().default(1.0),
  remarks: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one invoice item is required'),
}).refine(
  (data) => data.due_date >= data.invoice_date,
  {
    message: 'Due date must be on or after invoice date',
    path: ['due_date'],
  }
);

const paymentTypeEnum = z.enum(['receive', 'pay']);
const paymentMethodEnum = z.enum(['cash', 'bank_transfer', 'check', 'card', 'mobile_money']);
const paymentAllocationSchema = z.object({
  invoice_id: z.string().uuid('Invoice is required'),
  allocated_amount: z.number().positive('Allocated amount must be greater than 0'),
});

const paymentSchema = z.object({
  payment_type: paymentTypeEnum,
  party_type: z.enum(['Customer', 'Supplier']),
  party_id: z.string().uuid().nullable().optional(),
  party_name: z.string().min(1, 'Party name is required').max(255),
  payment_date: z.date(),
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
    return Math.abs(totalAllocated - data.amount) < 0.01;
  },
  {
    message: 'Total allocated amount must equal payment amount',
    path: ['allocations'],
  }
);

const profitLossParamsSchema = z.object({
  start_date: z.date(),
  end_date: z.date(),
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

describe('accounting schemas', () => {
  describe('accountSchema', () => {
    it('should validate a valid account', () => {
      const result = accountSchema.safeParse({
        code: '1000',
        name: 'Cash',
        account_type: 'Asset',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty code', () => {
      const result = accountSchema.safeParse({
        code: '',
        name: 'Cash',
        account_type: 'Asset',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = accountSchema.safeParse({
        code: '1000',
        name: '',
        account_type: 'Asset',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid account type', () => {
      const result = accountSchema.safeParse({
        code: '1000',
        name: 'Cash',
        account_type: 'InvalidType',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid account types', () => {
      for (const type of ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']) {
        const result = accountSchema.safeParse({
          code: '1000',
          name: 'Test',
          account_type: type,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should default is_group to false and is_active to true', () => {
      const result = accountSchema.safeParse({
        code: '1000',
        name: 'Cash',
        account_type: 'Asset',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_group).toBe(false);
        expect(result.data.is_active).toBe(true);
      }
    });

    it('should default currency_code to MAD', () => {
      const result = accountSchema.safeParse({
        code: '1000',
        name: 'Cash',
        account_type: 'Asset',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency_code).toBe('MAD');
      }
    });
  });

  describe('costCenterSchema', () => {
    it('should validate a valid cost center', () => {
      const result = costCenterSchema.safeParse({
        code: 'CC001',
        name: 'Main Farm',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty code', () => {
      const result = costCenterSchema.safeParse({
        code: '',
        name: 'Main Farm',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('taxSchema', () => {
    it('should validate a valid tax', () => {
      const result = taxSchema.safeParse({
        code: 'VAT20',
        name: 'VAT 20%',
        tax_type: 'sales',
        rate: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should reject rate above 100', () => {
      const result = taxSchema.safeParse({
        code: 'TAX',
        name: 'Tax',
        tax_type: 'sales',
        rate: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative rate', () => {
      const result = taxSchema.safeParse({
        code: 'TAX',
        name: 'Tax',
        tax_type: 'sales',
        rate: -5,
      });
      expect(result.success).toBe(false);
    });

    it('should accept rate of 0', () => {
      const result = taxSchema.safeParse({
        code: 'EXEMPT',
        name: 'Exempt',
        tax_type: 'both',
        rate: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('bankAccountSchema', () => {
    it('should validate a valid bank account', () => {
      const result = bankAccountSchema.safeParse({
        account_name: 'Main Account',
        gl_account_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing gl_account_id', () => {
      const result = bankAccountSchema.safeParse({
        account_name: 'Main Account',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid gl_account_id (non-UUID)', () => {
      const result = bankAccountSchema.safeParse({
        account_name: 'Main Account',
        gl_account_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should default opening_balance to 0', () => {
      const result = bankAccountSchema.safeParse({
        account_name: 'Main Account',
        gl_account_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.opening_balance).toBe(0);
      }
    });
  });

  describe('journalItemSchema', () => {
    it('should validate a debit item', () => {
      const result = journalItemSchema.safeParse({
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        debit: 100,
        credit: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should validate a credit item', () => {
      const result = journalItemSchema.safeParse({
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        debit: 0,
        credit: 100,
      });
      expect(result.success).toBe(true);
    });

    it('should reject having both debit and credit positive', () => {
      const result = journalItemSchema.safeParse({
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        debit: 100,
        credit: 100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject both zero (no movement)', () => {
      const result = journalItemSchema.safeParse({
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        debit: 0,
        credit: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative debit', () => {
      const result = journalItemSchema.safeParse({
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        debit: -50,
        credit: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('journalEntrySchema', () => {
    const validEntry = {
      entry_date: new Date('2025-06-15'),
      items: [
        { account_id: '550e8400-e29b-41d4-a716-446655440000', debit: 100, credit: 0 },
        { account_id: '550e8400-e29b-41d4-a716-446655440001', debit: 0, credit: 100 },
      ],
    };

    it('should validate a balanced journal entry', () => {
      const result = journalEntrySchema.safeParse(validEntry);
      expect(result.success).toBe(true);
    });

    it('should reject unbalanced journal entry', () => {
      const unbalanced = {
        ...validEntry,
        items: [
          { account_id: '550e8400-e29b-41d4-a716-446655440000', debit: 100, credit: 0 },
          { account_id: '550e8400-e29b-41d4-a716-446655440001', debit: 0, credit: 50 },
        ],
      };
      const result = journalEntrySchema.safeParse(unbalanced);
      expect(result.success).toBe(false);
    });

    it('should reject entry with fewer than 2 items', () => {
      const singleItem = {
        entry_date: new Date('2025-06-15'),
        items: [
          { account_id: '550e8400-e29b-41d4-a716-446655440000', debit: 100, credit: 0 },
        ],
      };
      const result = journalEntrySchema.safeParse(singleItem);
      expect(result.success).toBe(false);
    });

    it('should accept balanced entry with small rounding difference', () => {
      const rounding = {
        ...validEntry,
        items: [
          { account_id: '550e8400-e29b-41d4-a716-446655440000', debit: 100.005, credit: 0 },
          { account_id: '550e8400-e29b-41d4-a716-446655440001', debit: 0, credit: 100 },
        ],
      };
      const result = journalEntrySchema.safeParse(rounding);
      expect(result.success).toBe(true);
    });
  });

  describe('invoiceSchema', () => {
    const validInvoice = {
      invoice_type: 'sales',
      party_type: 'Customer',
      party_name: 'Farm Co',
      invoice_date: new Date('2025-06-15'),
      due_date: new Date('2025-07-15'),
      items: [
        { item_name: 'Item A', quantity: 10, unit_price: 50, amount: 500 },
      ],
    };

    it('should validate a valid invoice', () => {
      const result = invoiceSchema.safeParse(validInvoice);
      expect(result.success).toBe(true);
    });

    it('should reject due_date before invoice_date', () => {
      const invalid = {
        ...validInvoice,
        invoice_date: new Date('2025-07-15'),
        due_date: new Date('2025-06-15'),
      };
      const result = invoiceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty items array', () => {
      const noItems = { ...validInvoice, items: [] };
      const result = invoiceSchema.safeParse(noItems);
      expect(result.success).toBe(false);
    });

    it('should reject zero quantity', () => {
      const zeroQty = {
        ...validInvoice,
        items: [{ item_name: 'Item A', quantity: 0, unit_price: 50, amount: 0 }],
      };
      const result = invoiceSchema.safeParse(zeroQty);
      expect(result.success).toBe(false);
    });
  });

  describe('paymentSchema', () => {
    const validPayment = {
      payment_type: 'receive',
      party_type: 'Customer',
      party_name: 'Farm Co',
      payment_date: new Date('2025-06-15'),
      payment_method: 'bank_transfer',
      amount: 500,
    };

    it('should validate a valid payment', () => {
      const result = paymentSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
    });

    it('should reject zero amount', () => {
      const zeroAmount = { ...validPayment, amount: 0 };
      const result = paymentSchema.safeParse(zeroAmount);
      expect(result.success).toBe(false);
    });

    it('should reject allocations exceeding amount', () => {
      const overAllocated = {
        ...validPayment,
        amount: 500,
        allocations: [
          { invoice_id: '550e8400-e29b-41d4-a716-446655440000', allocated_amount: 300 },
          { invoice_id: '550e8400-e29b-41d4-a716-446655440001', allocated_amount: 300 },
        ],
      };
      const result = paymentSchema.safeParse(overAllocated);
      expect(result.success).toBe(false);
    });

    it('should accept matching allocations', () => {
      const matching = {
        ...validPayment,
        amount: 500,
        allocations: [
          { invoice_id: '550e8400-e29b-41d4-a716-446655440000', allocated_amount: 300 },
          { invoice_id: '550e8400-e29b-41d4-a716-446655440001', allocated_amount: 200 },
        ],
      };
      const result = paymentSchema.safeParse(matching);
      expect(result.success).toBe(true);
    });
  });

  describe('profitLossParamsSchema', () => {
    it('should validate with valid dates', () => {
      const result = profitLossParamsSchema.safeParse({
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-12-31'),
      });
      expect(result.success).toBe(true);
    });

    it('should reject end_date before start_date', () => {
      const result = profitLossParamsSchema.safeParse({
        start_date: new Date('2025-12-31'),
        end_date: new Date('2025-01-01'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing start_date', () => {
      const result = profitLossParamsSchema.safeParse({
        end_date: new Date('2025-12-31'),
      });
      expect(result.success).toBe(false);
    });
  });
});
