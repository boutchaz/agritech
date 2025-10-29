# Accounting Module Specification

## Overview

A comprehensive double-entry accounting system integrated into the AgriTech platform, inspired by ERPNext and Odoo, implemented with Supabase PostgreSQL, React, and TypeScript.

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Database** | PostgreSQL (Supabase) | Core ledger, RLS policies, stored procedures |
| **Backend** | Supabase Edge Functions + FastAPI | Secure financial operations, batch processing |
| **Frontend** | React 19 + TypeScript | UI components, forms, reports |
| **State Management** | TanStack Query | Data fetching, caching, optimistic updates |
| **Authorization** | CASL + RLS | Fine-grained permissions per organization |
| **Validation** | Zod | Schema validation for all accounting entities |

### Multi-Tenancy

- All accounting data scoped to `organization_id`
- RLS policies enforce data isolation
- Cost centers map to farms/parcels for analytics
- Support for multi-currency per organization

---

## Phase 1: Core Accounting (General Ledger + Invoices + Payments)

### Database Schema

#### 1. Chart of Accounts

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
    'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
  )),
  account_subtype VARCHAR(100), -- Current Asset, Fixed Asset, Operating Expense, etc.
  is_group BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  currency_code VARCHAR(3) REFERENCES currencies(code),
  allow_cost_center BOOLEAN DEFAULT TRUE,
  description TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id, code),

  -- Constraints
  CHECK (
    (is_group = TRUE AND parent_id IS NULL) OR
    (is_group = FALSE AND parent_id IS NOT NULL)
  )
);

CREATE INDEX idx_accounts_org ON accounts(organization_id);
CREATE INDEX idx_accounts_parent ON accounts(parent_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);
```

**Default Chart of Accounts** (to be seeded):
```
1000 - Assets
  1100 - Current Assets
    1110 - Cash and Bank
    1120 - Accounts Receivable
    1130 - Inventory
  1200 - Fixed Assets
    1210 - Equipment
    1220 - Vehicles
2000 - Liabilities
  2100 - Current Liabilities
    2110 - Accounts Payable
    2120 - Accrued Expenses
  2200 - Long-term Liabilities
    2210 - Loans Payable
3000 - Equity
  3100 - Owner's Equity
  3200 - Retained Earnings
4000 - Revenue
  4100 - Harvest Sales
  4200 - Service Revenue
5000 - Expenses
  5100 - Cost of Goods Sold
  5200 - Operating Expenses
    5210 - Labor Costs
    5220 - Materials
    5230 - Utilities
```

#### 2. Journal Entries (Ledger Core)

```sql
CREATE TYPE journal_entry_status AS ENUM ('draft', 'submitted', 'posted', 'cancelled');

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  posting_date DATE NOT NULL,
  reference_number VARCHAR(100),
  reference_type VARCHAR(50), -- 'Invoice', 'Payment', 'Manual', 'Adjustment'
  reference_id UUID, -- Link to invoice_id, payment_id, etc.

  status journal_entry_status DEFAULT 'draft',
  remarks TEXT,

  -- Total validation (must match sum of debits and credits)
  total_debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Workflow
  created_by UUID REFERENCES auth.users(id),
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (status != 'posted' OR (total_debit = total_credit AND total_debit > 0)),
  CHECK (status != 'posted' OR posted_by IS NOT NULL)
);

CREATE INDEX idx_je_org_date ON journal_entries(organization_id, entry_date DESC);
CREATE INDEX idx_je_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX idx_je_status ON journal_entries(status);
```

#### 3. Journal Items (Ledger Lines)

```sql
CREATE TABLE journal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,

  debit DECIMAL(15, 2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15, 2) DEFAULT 0 CHECK (credit >= 0),

  -- Dimensions for analytics
  cost_center_id UUID REFERENCES cost_centers(id),
  farm_id UUID REFERENCES farms(id),
  parcel_id UUID REFERENCES parcels(id),

  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

CREATE INDEX idx_ji_journal ON journal_items(journal_entry_id);
CREATE INDEX idx_ji_account ON journal_items(account_id);
CREATE INDEX idx_ji_cost_center ON journal_items(cost_center_id);
```

#### 4. Invoices (Receivables & Payables)

```sql
CREATE TYPE invoice_type AS ENUM ('sales', 'purchase');
CREATE TYPE invoice_status AS ENUM ('draft', 'submitted', 'paid', 'partially_paid', 'overdue', 'cancelled');

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_type invoice_type NOT NULL,

  -- Party (customer or supplier)
  party_type VARCHAR(50) CHECK (party_type IN ('Customer', 'Supplier')),
  party_id UUID, -- Reference to suppliers or future customers table
  party_name VARCHAR(255) NOT NULL,

  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Amounts
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,

  currency_code VARCHAR(3) NOT NULL DEFAULT 'MAD',
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,

  -- Status
  status invoice_status DEFAULT 'draft',

  -- Context
  farm_id UUID REFERENCES farms(id),
  parcel_id UUID REFERENCES parcels(id),

  -- Attachments
  attachment_url TEXT,

  -- Workflow
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,

  -- Auto-posting
  journal_entry_id UUID REFERENCES journal_entries(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (grand_total >= 0),
  CHECK (outstanding_amount >= 0 AND outstanding_amount <= grand_total)
);

CREATE INDEX idx_invoices_org_type ON invoices(organization_id, invoice_type);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status IN ('submitted', 'partially_paid', 'overdue');
CREATE INDEX idx_invoices_party ON invoices(party_type, party_id);
```

#### 5. Invoice Items

```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  item_code VARCHAR(100),
  item_name VARCHAR(255) NOT NULL,
  description TEXT,

  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15, 2) NOT NULL CHECK (unit_price >= 0),

  -- Tax
  tax_id UUID REFERENCES taxes(id),
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,

  amount DECIMAL(15, 2) NOT NULL,

  -- Accounting
  income_account_id UUID REFERENCES accounts(id), -- For sales invoices
  expense_account_id UUID REFERENCES accounts(id), -- For purchase invoices

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
```

#### 6. Payments

```sql
CREATE TYPE payment_type AS ENUM ('receive', 'pay');
CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'check', 'card', 'mobile_money');
CREATE TYPE payment_status AS ENUM ('draft', 'submitted', 'reconciled', 'cancelled');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_number VARCHAR(100) UNIQUE NOT NULL,
  payment_type payment_type NOT NULL,

  -- Party
  party_type VARCHAR(50) CHECK (party_type IN ('Customer', 'Supplier')),
  party_id UUID,
  party_name VARCHAR(255) NOT NULL,

  -- Payment details
  payment_date DATE NOT NULL,
  payment_method payment_method NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),

  currency_code VARCHAR(3) NOT NULL DEFAULT 'MAD',
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,

  -- Bank details
  bank_account_id UUID REFERENCES bank_accounts(id),
  reference_number VARCHAR(100), -- Check number, transaction ID, etc.

  status payment_status DEFAULT 'draft',
  remarks TEXT,

  -- Auto-posting
  journal_entry_id UUID REFERENCES journal_entries(id),

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_org_type ON payments(organization_id, payment_type);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);
CREATE INDEX idx_payments_status ON payments(status);
```

#### 7. Payment Allocations (Link Payments to Invoices)

```sql
CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,

  allocated_amount DECIMAL(15, 2) NOT NULL CHECK (allocated_amount > 0),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(payment_id, invoice_id)
);

CREATE INDEX idx_payment_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_alloc_invoice ON payment_allocations(invoice_id);
```

#### 8. Cost Centers

```sql
CREATE TABLE cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES cost_centers(id),

  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Link to farm/parcel (optional, for auto-mapping)
  farm_id UUID REFERENCES farms(id),
  parcel_id UUID REFERENCES parcels(id),

  is_group BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, code)
);

CREATE INDEX idx_cost_centers_org ON cost_centers(organization_id);
```

#### 9. Taxes

```sql
CREATE TYPE tax_type AS ENUM ('sales', 'purchase', 'both');

CREATE TABLE taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  tax_type tax_type NOT NULL,
  rate DECIMAL(5, 2) NOT NULL CHECK (rate >= 0 AND rate <= 100),

  -- Accounts for posting
  sales_account_id UUID REFERENCES accounts(id),
  purchase_account_id UUID REFERENCES accounts(id),

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, code)
);

CREATE INDEX idx_taxes_org ON taxes(organization_id);
```

#### 10. Bank Accounts

```sql
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  account_number VARCHAR(100),
  iban VARCHAR(50),
  swift_code VARCHAR(20),

  currency_code VARCHAR(3) NOT NULL DEFAULT 'MAD',

  -- Link to GL account
  gl_account_id UUID NOT NULL REFERENCES accounts(id),

  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_org ON bank_accounts(organization_id);
```

#### 11. Currencies (if not exists)

```sql
CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  decimal_places INT DEFAULT 2,
  is_active BOOLEAN DEFAULT TRUE
);

-- Seed common currencies
INSERT INTO currencies (code, name, symbol) VALUES
('MAD', 'Moroccan Dirham', 'MAD'),
('USD', 'US Dollar', '$'),
('EUR', 'Euro', '€'),
('GBP', 'British Pound', '£')
ON CONFLICT DO NOTHING;
```

---

## Stored Procedures & Functions

### 1. Validate Journal Entry Balance

```sql
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate totals from journal_items
  UPDATE journal_entries
  SET
    total_debit = (SELECT COALESCE(SUM(debit), 0) FROM journal_items WHERE journal_entry_id = NEW.journal_entry_id),
    total_credit = (SELECT COALESCE(SUM(credit), 0) FROM journal_items WHERE journal_entry_id = NEW.journal_entry_id),
    updated_at = NOW()
  WHERE id = NEW.journal_entry_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_journal_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_items
FOR EACH ROW EXECUTE FUNCTION validate_journal_balance();
```

### 2. Auto-post Invoice to Journal

```sql
CREATE OR REPLACE FUNCTION auto_post_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_journal_entry_id UUID;
  v_receivable_account UUID;
  v_revenue_account UUID;
BEGIN
  -- Only post when status changes to 'submitted'
  IF NEW.status = 'submitted' AND OLD.status = 'draft' AND NEW.journal_entry_id IS NULL THEN

    -- Get default accounts based on invoice type
    IF NEW.invoice_type = 'sales' THEN
      SELECT id INTO v_receivable_account FROM accounts
      WHERE organization_id = NEW.organization_id AND code = '1120' LIMIT 1;

      SELECT id INTO v_revenue_account FROM accounts
      WHERE organization_id = NEW.organization_id AND code = '4100' LIMIT 1;
    ELSE
      -- Purchase invoice logic
      SELECT id INTO v_receivable_account FROM accounts
      WHERE organization_id = NEW.organization_id AND code = '2110' LIMIT 1;

      SELECT id INTO v_revenue_account FROM accounts
      WHERE organization_id = NEW.organization_id AND code = '5100' LIMIT 1;
    END IF;

    -- Create journal entry
    INSERT INTO journal_entries (
      organization_id, entry_date, posting_date, reference_type, reference_id,
      remarks, status, created_by
    ) VALUES (
      NEW.organization_id, NEW.invoice_date, NEW.invoice_date, 'Invoice', NEW.id,
      'Auto-posted from invoice ' || NEW.invoice_number, 'posted', NEW.submitted_by
    ) RETURNING id INTO v_journal_entry_id;

    -- Create journal items
    IF NEW.invoice_type = 'sales' THEN
      -- Debit: Accounts Receivable
      INSERT INTO journal_items (journal_entry_id, account_id, debit, description, farm_id, parcel_id)
      VALUES (v_journal_entry_id, v_receivable_account, NEW.grand_total, NEW.party_name, NEW.farm_id, NEW.parcel_id);

      -- Credit: Revenue
      INSERT INTO journal_items (journal_entry_id, account_id, credit, description, farm_id, parcel_id)
      VALUES (v_journal_entry_id, v_revenue_account, NEW.grand_total, NEW.party_name, NEW.farm_id, NEW.parcel_id);
    ELSE
      -- Purchase invoice logic (opposite)
      INSERT INTO journal_items (journal_entry_id, account_id, debit, description, farm_id, parcel_id)
      VALUES (v_journal_entry_id, v_revenue_account, NEW.grand_total, NEW.party_name, NEW.farm_id, NEW.parcel_id);

      INSERT INTO journal_items (journal_entry_id, account_id, credit, description, farm_id, parcel_id)
      VALUES (v_journal_entry_id, v_receivable_account, NEW.grand_total, NEW.party_name, NEW.farm_id, NEW.parcel_id);
    END IF;

    -- Link journal entry to invoice
    UPDATE invoices SET journal_entry_id = v_journal_entry_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_post_invoice
AFTER UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION auto_post_invoice();
```

### 3. Update Invoice Outstanding Amount

```sql
CREATE OR REPLACE FUNCTION update_invoice_outstanding()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET
    outstanding_amount = grand_total - COALESCE((
      SELECT SUM(allocated_amount)
      FROM payment_allocations
      WHERE invoice_id = NEW.invoice_id
    ), 0),
    status = CASE
      WHEN grand_total - COALESCE((
        SELECT SUM(allocated_amount)
        FROM payment_allocations
        WHERE invoice_id = NEW.invoice_id
      ), 0) = 0 THEN 'paid'::invoice_status
      WHEN grand_total - COALESCE((
        SELECT SUM(allocated_amount)
        FROM payment_allocations
        WHERE invoice_id = NEW.invoice_id
      ), 0) < grand_total THEN 'partially_paid'::invoice_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invoice_outstanding
AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
FOR EACH ROW EXECUTE FUNCTION update_invoice_outstanding();
```

---

## RLS Policies

```sql
-- Enable RLS on all accounting tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Example policy for accounts (repeat pattern for other tables)
CREATE POLICY "org_access_accounts" ON accounts
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

-- Journal entries: read for all members, write for accountants/admins
CREATE POLICY "org_read_journals" ON journal_entries
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "org_write_journals" ON journal_entries
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('organization_admin', 'farm_manager')
  )
);
```

---

## CASL Permissions

Add to `src/lib/casl/defineAbilityFor.ts`:

```typescript
// Accounting permissions
if (isAtLeastRole('farm_manager')) {
  can('read', 'Invoice');
  can('read', 'Payment');
  can('read', 'JournalEntry');
  can('create', 'Invoice');
  can('create', 'Payment');
}

if (isAtLeastRole('organization_admin')) {
  can('manage', 'Invoice');
  can('manage', 'Payment');
  can('manage', 'JournalEntry');
  can('manage', 'Account');
  can('approve', 'JournalEntry'); // Post journals
  can('close', 'Period'); // Period closing
}
```

---

## TypeScript Types (Generated from DB)

After creating migrations, generate types:

```bash
npm run db:generate-types-remote
```

---

## Zod Schemas

Create `src/schemas/accounting.ts`:

```typescript
import { z } from 'zod';

export const accountSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  account_type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
  parent_id: z.string().uuid().optional(),
  is_group: z.boolean().default(false),
  description: z.string().optional(),
});

export const invoiceSchema = z.object({
  invoice_type: z.enum(['sales', 'purchase']),
  party_name: z.string().min(1),
  invoice_date: z.date(),
  due_date: z.date(),
  items: z.array(z.object({
    item_name: z.string().min(1),
    quantity: z.number().positive(),
    unit_price: z.number().nonnegative(),
  })).min(1),
}).refine(data => data.due_date >= data.invoice_date, {
  message: "Due date must be after invoice date",
  path: ["due_date"],
});

export const journalEntrySchema = z.object({
  entry_date: z.date(),
  remarks: z.string().optional(),
  items: z.array(z.object({
    account_id: z.string().uuid(),
    debit: z.number().nonnegative().default(0),
    credit: z.number().nonnegative().default(0),
    description: z.string().optional(),
  })).min(2),
}).refine(data => {
  const totalDebit = data.items.reduce((sum, item) => sum + item.debit, 0);
  const totalCredit = data.items.reduce((sum, item) => sum + item.credit, 0);
  return Math.abs(totalDebit - totalCredit) < 0.01; // Allow for rounding
}, {
  message: "Debits must equal credits",
  path: ["items"],
});
```

---

## Integration Points

### 1. From Purchases Module

When a purchase is recorded in the inventory system:

```typescript
// Create purchase invoice automatically
const invoice = await createPurchaseInvoice({
  supplier_id: purchase.supplier_id,
  purchase_id: purchase.id,
  items: purchase.items.map(item => ({
    item_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
  })),
});
```

### 2. From Harvests Module

When harvest is sold:

```typescript
// Create sales invoice
const invoice = await createSalesInvoice({
  customer_name: sale.customer_name,
  harvest_id: harvest.id,
  parcel_id: harvest.parcel_id,
  items: [{
    item_name: harvest.crop_name,
    quantity: harvest.quantity_sold,
    unit_price: harvest.sale_price,
  }],
});
```

### 3. From Tasks Module

Monthly labor cost journal:

```typescript
// Auto-generate journal for labor costs
await createLaborCostJournal({
  farm_id: farm.id,
  month: currentMonth,
  entries: tasks.map(task => ({
    parcel_id: task.parcel_id,
    expense_amount: task.labor_cost,
  })),
});
```

---

## UI Components Structure

```
src/components/Accounting/
├── Accounts/
│   ├── ChartOfAccounts.tsx
│   ├── AccountForm.tsx
│   └── AccountTree.tsx
├── Invoices/
│   ├── InvoiceList.tsx
│   ├── InvoiceForm.tsx
│   ├── InvoiceView.tsx
│   └── InvoicePDF.tsx
├── Payments/
│   ├── PaymentList.tsx
│   ├── PaymentForm.tsx
│   └── PaymentReconciliation.tsx
├── Journal/
│   ├── JournalList.tsx
│   ├── JournalForm.tsx
│   └── LedgerViewer.tsx
├── Reports/
│   ├── BalanceSheet.tsx
│   ├── ProfitAndLoss.tsx
│   ├── TrialBalance.tsx
│   ├── AgedReceivables.tsx
│   └── CashFlow.tsx
└── Dashboard/
    └── AccountingDashboard.tsx
```

---

## Routes

Add to `src/routes/`:

```
_authenticated.accounting.tsx          # Layout with accounting sidebar
_authenticated.accounting.index.tsx    # Dashboard
_authenticated.accounting.accounts.tsx # Chart of Accounts
_authenticated.accounting.invoices.tsx # Invoice list
_authenticated.accounting.invoices.$id.tsx # Invoice detail
_authenticated.accounting.payments.tsx # Payment list
_authenticated.accounting.journal.tsx  # Journal entries
_authenticated.accounting.reports.tsx  # Reports menu
_authenticated.accounting.reports.balance-sheet.tsx
_authenticated.accounting.reports.profit-loss.tsx
```

---

## Next Steps

1. **Create Migration Files**: Convert SQL schemas to Supabase migrations
2. **Seed Default Chart of Accounts**: Create standard account structure
3. **Build Core API Hooks**: Custom hooks for CRUD operations
4. **Implement Forms**: Invoice, Payment, Journal Entry forms with validation
5. **Build Reports**: Financial statements using SQL views + ECharts
6. **Integration Testing**: Connect with existing modules

---

## Success Metrics

- **Double-entry integrity**: 100% balanced journal entries
- **Real-time updates**: Invoice status updates within 1 second of payment
- **Reporting speed**: Balance sheet generated in < 2 seconds
- **Data accuracy**: Zero discrepancies between subledgers and GL
- **User adoption**: Accountants can perform daily tasks without training

---

## Future Enhancements (Phase 2+)

- Fixed assets with depreciation schedules
- Budget management and variance analysis
- Multi-currency with automatic FX gain/loss
- Bank reconciliation with CSV import
- Recurring invoices and subscriptions
- Period closing and year-end procedures
- Advanced reporting with drill-down
- Integration with external accounting software (export to QuickBooks, Sage, etc.)
