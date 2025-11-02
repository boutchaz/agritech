-- =====================================================
-- Accounting Module - Phase 1: General Ledger, Invoices, Payments
-- =====================================================
-- This migration creates the foundational accounting tables
-- with proper naming to avoid conflicts with existing tables
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CURRENCIES
-- =====================================================

CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  decimal_places INT DEFAULT 2 CHECK (decimal_places >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed common currencies
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
('MAD', 'Moroccan Dirham', 'MAD', 2),
('USD', 'US Dollar', '$', 2),
('EUR', 'Euro', '€', 2),
('GBP', 'British Pound', '£', 2),
('JPY', 'Japanese Yen', '¥', 0),
('CHF', 'Swiss Franc', 'CHF', 2),
('CAD', 'Canadian Dollar', 'CA$', 2),
('AUD', 'Australian Dollar', 'A$', 2)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. COST CENTERS
-- =====================================================

CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES cost_centers(id) ON DELETE RESTRICT,

  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Optional links to farm/parcel for auto-mapping
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  is_group BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id, code),
  CHECK (
    (is_group = TRUE AND parent_id IS NULL) OR
    (is_group = FALSE)
  )
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON cost_centers(organization_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent ON cost_centers(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_farm ON cost_centers(farm_id) WHERE farm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_centers_parcel ON cost_centers(parcel_id) WHERE parcel_id IS NOT NULL;

-- =====================================================
-- 3. CHART OF ACCOUNTS
-- =====================================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,

  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,

  account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
    'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
  )),
  account_subtype VARCHAR(100),

  is_group BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  currency_code VARCHAR(3) REFERENCES currencies(code) DEFAULT 'MAD',
  allow_cost_center BOOLEAN DEFAULT TRUE,

  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active) WHERE is_active = TRUE;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. TAXES
-- =====================================================

DO $$ BEGIN
  CREATE TYPE tax_type AS ENUM ('sales', 'purchase', 'both');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  tax_type tax_type NOT NULL,
  rate DECIMAL(5, 2) NOT NULL CHECK (rate >= 0 AND rate <= 100),

  -- Accounts for posting
  sales_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  purchase_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,

  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_taxes_org ON taxes(organization_id);
CREATE INDEX IF NOT EXISTS idx_taxes_type ON taxes(tax_type);
CREATE INDEX IF NOT EXISTS idx_taxes_active ON taxes(is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trg_taxes_updated_at ON taxes;
CREATE TRIGGER trg_taxes_updated_at
BEFORE UPDATE ON taxes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. BANK ACCOUNTS
-- =====================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  account_number VARCHAR(100),
  iban VARCHAR(50),
  swift_code VARCHAR(20),

  currency_code VARCHAR(3) NOT NULL REFERENCES currencies(code) DEFAULT 'MAD',

  -- Link to GL account
  gl_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,

  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,

  opening_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_org ON bank_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated_at
BEFORE UPDATE ON bank_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. JOURNAL ENTRIES
-- =====================================================

DO $$ BEGIN
  CREATE TYPE journal_entry_status AS ENUM ('draft', 'submitted', 'posted', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  entry_date DATE NOT NULL,
  posting_date DATE NOT NULL,

  reference_number VARCHAR(100),
  reference_type VARCHAR(50),
  reference_id UUID,

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

CREATE INDEX IF NOT EXISTS idx_je_org_date ON journal_entries(organization_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_reference ON journal_entries(reference_type, reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_je_posting_date ON journal_entries(posting_date DESC);

DROP TRIGGER IF EXISTS trg_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER trg_journal_entries_updated_at
BEFORE UPDATE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. JOURNAL ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS journal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,

  debit DECIMAL(15, 2) DEFAULT 0 CHECK (debit >= 0),
  credit DECIMAL(15, 2) DEFAULT 0 CHECK (credit >= 0),

  -- Dimensions for analytics
  cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

CREATE INDEX IF NOT EXISTS idx_ji_journal ON journal_items(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_ji_account ON journal_items(account_id);
CREATE INDEX IF NOT EXISTS idx_ji_cost_center ON journal_items(cost_center_id) WHERE cost_center_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ji_farm ON journal_items(farm_id) WHERE farm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ji_parcel ON journal_items(parcel_id) WHERE parcel_id IS NOT NULL;

-- Trigger to auto-update journal entry totals
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE journal_entries
  SET
    total_debit = (SELECT COALESCE(SUM(debit), 0) FROM journal_items WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)),
    total_credit = (SELECT COALESCE(SUM(credit), 0) FROM journal_items WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_journal_balance ON journal_items;
CREATE TRIGGER trg_validate_journal_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_items
FOR EACH ROW
EXECUTE FUNCTION validate_journal_balance();

-- =====================================================
-- 8. INVOICES
-- =====================================================

DO $$ BEGIN
  CREATE TYPE invoice_type AS ENUM ('sales', 'purchase');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'submitted', 'paid', 'partially_paid', 'overdue', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  invoice_number VARCHAR(100) NOT NULL,
  invoice_type invoice_type NOT NULL,

  -- Party (customer or supplier)
  party_type VARCHAR(50) CHECK (party_type IN ('Customer', 'Supplier')),
  party_id UUID,
  party_name VARCHAR(255) NOT NULL,

  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Amounts
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  outstanding_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,

  currency_code VARCHAR(3) NOT NULL REFERENCES currencies(code) DEFAULT 'MAD',
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,

  -- Status
  status invoice_status DEFAULT 'draft',

  -- Context (link to farm/parcel for cost allocation)
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  -- Attachments
  attachment_url TEXT,

  -- Workflow
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,

  -- Auto-posting
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, invoice_number),
  CHECK (grand_total >= 0),
  CHECK (outstanding_amount >= 0 AND outstanding_amount <= grand_total),
  CHECK (due_date >= invoice_date)
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_type ON invoices(organization_id, invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE status IN ('submitted', 'partially_paid', 'overdue');
CREATE INDEX IF NOT EXISTS idx_invoices_party ON invoices(party_type, party_id) WHERE party_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_farm ON invoices(farm_id) WHERE farm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_parcel ON invoices(parcel_id) WHERE parcel_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. INVOICE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  item_code VARCHAR(100),
  item_name VARCHAR(255) NOT NULL,
  description TEXT,

  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15, 2) NOT NULL CHECK (unit_price >= 0),

  -- Tax
  tax_id UUID REFERENCES taxes(id) ON DELETE SET NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0 CHECK (tax_rate >= 0),
  tax_amount DECIMAL(15, 2) DEFAULT 0 CHECK (tax_amount >= 0),

  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),

  -- Accounting
  income_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  expense_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tax ON invoice_items(tax_id) WHERE tax_id IS NOT NULL;

-- Trigger to update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET
    subtotal = (SELECT COALESCE(SUM(amount - tax_amount), 0) FROM invoice_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    tax_total = (SELECT COALESCE(SUM(tax_amount), 0) FROM invoice_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    grand_total = (SELECT COALESCE(SUM(amount), 0) FROM invoice_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Also update outstanding_amount if not yet paid
  UPDATE invoices
  SET outstanding_amount = grand_total
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id) AND status = 'draft';

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_invoice_totals ON invoice_items;
CREATE TRIGGER trg_update_invoice_totals
AFTER INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION update_invoice_totals();

-- =====================================================
-- 10. ACCOUNTING PAYMENTS (Renamed to avoid conflict)
-- =====================================================

DO $$ BEGIN
  CREATE TYPE accounting_payment_type AS ENUM ('receive', 'pay');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE accounting_payment_method AS ENUM ('cash', 'bank_transfer', 'check', 'card', 'mobile_money');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE accounting_payment_status AS ENUM ('draft', 'submitted', 'reconciled', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS accounting_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  payment_number VARCHAR(100) NOT NULL,
  payment_type accounting_payment_type NOT NULL,

  -- Party
  party_type VARCHAR(50) CHECK (party_type IN ('Customer', 'Supplier')),
  party_id UUID,
  party_name VARCHAR(255) NOT NULL,

  -- Payment details
  payment_date DATE NOT NULL,
  payment_method accounting_payment_method NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),

  currency_code VARCHAR(3) NOT NULL REFERENCES currencies(code) DEFAULT 'MAD',
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,

  -- Bank details
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  reference_number VARCHAR(100),

  status accounting_payment_status DEFAULT 'draft',
  remarks TEXT,

  -- Auto-posting
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, payment_number)
);

CREATE INDEX IF NOT EXISTS idx_accounting_payments_org_type ON accounting_payments(organization_id, payment_type);
CREATE INDEX IF NOT EXISTS idx_accounting_payments_date ON accounting_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_payments_status ON accounting_payments(status);
CREATE INDEX IF NOT EXISTS idx_accounting_payments_party ON accounting_payments(party_type, party_id) WHERE party_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounting_payments_bank ON accounting_payments(bank_account_id) WHERE bank_account_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_accounting_payments_updated_at ON accounting_payments;
CREATE TRIGGER trg_accounting_payments_updated_at
BEFORE UPDATE ON accounting_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. PAYMENT ALLOCATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES accounting_payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,

  allocated_amount DECIMAL(15, 2) NOT NULL CHECK (allocated_amount > 0),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(payment_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_alloc_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_alloc_invoice ON payment_allocations(invoice_id);

-- Trigger to update invoice outstanding amount and status
CREATE OR REPLACE FUNCTION update_invoice_outstanding()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_allocated DECIMAL(15, 2);
  v_grand_total DECIMAL(15, 2);
  v_outstanding DECIMAL(15, 2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Calculate total allocated
  SELECT COALESCE(SUM(allocated_amount), 0), i.grand_total
  INTO v_total_allocated, v_grand_total
  FROM payment_allocations pa
  JOIN invoices i ON i.id = v_invoice_id
  WHERE pa.invoice_id = v_invoice_id
  GROUP BY i.grand_total;

  v_outstanding := v_grand_total - COALESCE(v_total_allocated, 0);

  UPDATE invoices
  SET
    outstanding_amount = v_outstanding,
    status = CASE
      WHEN v_outstanding = 0 THEN 'paid'::invoice_status
      WHEN v_outstanding < v_grand_total THEN 'partially_paid'::invoice_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_invoice_outstanding ON payment_allocations;
CREATE TRIGGER trg_update_invoice_outstanding
AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
FOR EACH ROW
EXECUTE FUNCTION update_invoice_outstanding();

-- =====================================================
-- 12. RLS POLICIES
-- =====================================================

-- Enable RLS on all accounting tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "org_access_accounts" ON accounts;
DROP POLICY IF EXISTS "org_access_cost_centers" ON cost_centers;
DROP POLICY IF EXISTS "org_access_taxes" ON taxes;
DROP POLICY IF EXISTS "org_access_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "org_read_journal_entries" ON journal_entries;
DROP POLICY IF EXISTS "org_write_journal_entries" ON journal_entries;
DROP POLICY IF EXISTS "org_update_journal_entries" ON journal_entries;
DROP POLICY IF EXISTS "org_access_journal_items" ON journal_items;
DROP POLICY IF EXISTS "org_read_invoices" ON invoices;
DROP POLICY IF EXISTS "org_write_invoices" ON invoices;
DROP POLICY IF EXISTS "org_update_invoices" ON invoices;
DROP POLICY IF EXISTS "org_access_invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "org_read_accounting_payments" ON accounting_payments;
DROP POLICY IF EXISTS "org_write_accounting_payments" ON accounting_payments;
DROP POLICY IF EXISTS "org_update_accounting_payments" ON accounting_payments;
DROP POLICY IF EXISTS "org_access_payment_allocations" ON payment_allocations;

-- Accounts policies
CREATE POLICY "org_access_accounts" ON accounts
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

-- Cost centers policies
CREATE POLICY "org_access_cost_centers" ON cost_centers
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

-- Taxes policies
CREATE POLICY "org_access_taxes" ON taxes
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

-- Bank accounts policies
CREATE POLICY "org_access_bank_accounts" ON bank_accounts
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

-- Journal entries policies (read for all, write for managers+)
CREATE POLICY "org_read_journal_entries" ON journal_entries
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "org_write_journal_entries" ON journal_entries
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('organization_admin', 'farm_manager')
  )
);

CREATE POLICY "org_update_journal_entries" ON journal_entries
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('organization_admin', 'farm_manager')
  )
);

-- Journal items policies (inherit from journal_entries)
CREATE POLICY "org_access_journal_items" ON journal_items
FOR ALL USING (
  journal_entry_id IN (
    SELECT je.id FROM journal_entries je
    WHERE je.organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  )
);

-- Invoices policies
CREATE POLICY "org_read_invoices" ON invoices
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "org_write_invoices" ON invoices
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('organization_admin', 'farm_manager', 'farm_worker')
  )
);

CREATE POLICY "org_update_invoices" ON invoices
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('organization_admin', 'farm_manager', 'farm_worker')
  )
);

-- Invoice items policies
CREATE POLICY "org_access_invoice_items" ON invoice_items
FOR ALL USING (
  invoice_id IN (
    SELECT i.id FROM invoices i
    WHERE i.organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  )
);

-- Accounting Payments policies
CREATE POLICY "org_read_accounting_payments" ON accounting_payments
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "org_write_accounting_payments" ON accounting_payments
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('organization_admin', 'farm_manager')
  )
);

CREATE POLICY "org_update_accounting_payments" ON accounting_payments
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('organization_admin', 'farm_manager')
  )
);

-- Payment allocations policies
CREATE POLICY "org_access_payment_allocations" ON payment_allocations
FOR ALL USING (
  payment_id IN (
    SELECT p.id FROM accounting_payments p
    WHERE p.organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  )
);

-- =====================================================
-- 13. HELPER FUNCTIONS
-- =====================================================

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_organization_id UUID,
  p_invoice_type invoice_type
)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_sequence INT;
  v_year VARCHAR(4);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  IF p_invoice_type = 'sales' THEN
    v_prefix := 'INV';
  ELSE
    v_prefix := 'BILL';
  END IF;

  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_prefix || '-' || v_year || '-') + 1) AS INT)), 0) + 1
  INTO v_sequence
  FROM invoices
  WHERE organization_id = p_organization_id
    AND invoice_type = p_invoice_type
    AND invoice_number LIKE v_prefix || '-' || v_year || '-%';

  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_sequence::VARCHAR, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate next payment number
CREATE OR REPLACE FUNCTION generate_payment_number(
  p_organization_id UUID,
  p_payment_type accounting_payment_type
)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_sequence INT;
  v_year VARCHAR(4);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  IF p_payment_type = 'receive' THEN
    v_prefix := 'PAY-IN';
  ELSE
    v_prefix := 'PAY-OUT';
  END IF;

  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM LENGTH(v_prefix || '-' || v_year || '-') + 1) AS INT)), 0) + 1
  INTO v_sequence
  FROM accounting_payments
  WHERE organization_id = p_organization_id
    AND payment_type = p_payment_type
    AND payment_number LIKE v_prefix || '-' || v_year || '-%';

  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_sequence::VARCHAR, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. VIEWS FOR REPORTING
-- =====================================================

-- Ledger view (General Ledger report)
CREATE OR REPLACE VIEW vw_ledger AS
SELECT
  ji.id,
  je.organization_id,
  je.entry_date,
  je.posting_date,
  je.reference_number,
  je.reference_type,
  je.status,
  a.code AS account_code,
  a.name AS account_name,
  a.account_type,
  ji.debit,
  ji.credit,
  ji.description,
  cc.name AS cost_center_name,
  f.name AS farm_name,
  p.name AS parcel_name,
  je.created_by,
  ji.created_at
FROM journal_items ji
JOIN journal_entries je ON ji.journal_entry_id = je.id
JOIN accounts a ON ji.account_id = a.id
LEFT JOIN cost_centers cc ON ji.cost_center_id = cc.id
LEFT JOIN farms f ON ji.farm_id = f.id
LEFT JOIN parcels p ON ji.parcel_id = p.id
WHERE je.status = 'posted';

-- Account balance view
CREATE OR REPLACE VIEW vw_account_balances AS
SELECT
  a.organization_id,
  a.id AS account_id,
  a.code AS account_code,
  a.name AS account_name,
  a.account_type,
  COALESCE(SUM(ji.debit), 0) AS total_debit,
  COALESCE(SUM(ji.credit), 0) AS total_credit,
  CASE
    WHEN a.account_type IN ('Asset', 'Expense') THEN COALESCE(SUM(ji.debit - ji.credit), 0)
    ELSE COALESCE(SUM(ji.credit - ji.debit), 0)
  END AS balance
FROM accounts a
LEFT JOIN journal_items ji ON a.id = ji.account_id
LEFT JOIN journal_entries je ON ji.journal_entry_id = je.id AND je.status = 'posted'
WHERE a.is_group = FALSE
GROUP BY a.id, a.organization_id, a.code, a.name, a.account_type;

-- Invoice aging view
CREATE OR REPLACE VIEW vw_invoice_aging AS
SELECT
  i.organization_id,
  i.id AS invoice_id,
  i.invoice_number,
  i.invoice_type,
  i.party_name,
  i.invoice_date,
  i.due_date,
  i.grand_total,
  i.outstanding_amount,
  i.status,
  CURRENT_DATE - i.due_date AS days_overdue,
  CASE
    WHEN i.status = 'paid' THEN 'Paid'
    WHEN CURRENT_DATE <= i.due_date THEN 'Current'
    WHEN CURRENT_DATE - i.due_date <= 30 THEN '1-30 days'
    WHEN CURRENT_DATE - i.due_date <= 60 THEN '31-60 days'
    WHEN CURRENT_DATE - i.due_date <= 90 THEN '61-90 days'
    ELSE 'Over 90 days'
  END AS aging_bucket
FROM invoices i
WHERE i.status IN ('submitted', 'partially_paid', 'overdue');

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE accounts IS 'Chart of Accounts - Hierarchical account structure for double-entry bookkeeping';
COMMENT ON TABLE journal_entries IS 'Journal Entries - Main ledger transactions';
COMMENT ON TABLE journal_items IS 'Journal Items - Individual debit/credit lines within journal entries';
COMMENT ON TABLE invoices IS 'Invoices - Sales and purchase invoices';
COMMENT ON TABLE invoice_items IS 'Invoice Items - Line items within invoices';
COMMENT ON TABLE accounting_payments IS 'Accounting Payments - Payment records for invoices (separate from worker payments)';
COMMENT ON TABLE payment_allocations IS 'Payment Allocations - Links payments to invoices';
COMMENT ON TABLE cost_centers IS 'Cost Centers - Analytical dimensions for tracking costs by farm/parcel';
COMMENT ON TABLE taxes IS 'Taxes - Tax rates and configurations';
COMMENT ON TABLE bank_accounts IS 'Bank Accounts - Organization bank account details';
