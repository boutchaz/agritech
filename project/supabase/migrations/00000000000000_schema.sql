-- =====================================================
-- COMPREHENSIVE SCHEMA - All Tables Required by Frontend
-- =====================================================
-- This file contains the complete database schema including:
-- - All ENUM types
-- - All tables (organizations, farms, parcels, quotes, sales_orders, etc.)
-- - All indexes
-- - All functions
-- - All triggers
-- - All RLS policies
-- - All views
-- =====================================================
-- NOTE: All CREATE statements are idempotent (use IF NOT EXISTS, OR REPLACE, etc.)
-- =====================================================

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- 2. HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. ENUM TYPES
-- =====================================================

-- Quote Status
DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM (
    'draft',        -- Being prepared
    'sent',         -- Sent to customer
    'accepted',     -- Customer accepted
    'rejected',     -- Customer rejected
    'expired',      -- Validity period expired
    'converted',    -- Converted to sales order
    'cancelled'     -- Cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Sales Order Status
DO $$ BEGIN
  CREATE TYPE sales_order_status AS ENUM (
    'draft',          -- Being prepared
    'confirmed',      -- Order confirmed
    'processing',     -- Being processed/fulfilled
    'partially_delivered', -- Some items delivered
    'delivered',      -- All items delivered
    'partially_invoiced',  -- Some items invoiced
    'invoiced',       -- Fully invoiced
    'cancelled'       -- Cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Purchase Order Status
DO $$ BEGIN
  CREATE TYPE purchase_order_status AS ENUM (
    'draft',          -- Being prepared
    'submitted',      -- Submitted to supplier
    'confirmed',      -- Supplier confirmed
    'partially_received', -- Some items received
    'received',       -- All items received
    'partially_billed',   -- Some items billed
    'billed',         -- Fully billed
    'cancelled'       -- Cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Accounting Payment Method
DO $$ BEGIN
  CREATE TYPE accounting_payment_method AS ENUM (
    'cash',
    'bank_transfer',
    'check',
    'card',
    'mobile_money'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Accounting Payment Status
DO $$ BEGIN
  CREATE TYPE accounting_payment_status AS ENUM (
    'draft',
    'submitted',
    'reconciled',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Accounting Payment Type
DO $$ BEGIN
  CREATE TYPE accounting_payment_type AS ENUM (
    'receive',
    'pay'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Invoice Status
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'draft',
    'submitted',
    'paid',
    'partially_paid',
    'overdue',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Invoice Type
DO $$ BEGIN
  CREATE TYPE invoice_type AS ENUM (
    'sales',
    'purchase'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Journal Entry Status
DO $$ BEGIN
  CREATE TYPE journal_entry_status AS ENUM (
    'draft',
    'posted',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Analysis Type
DO $$ BEGIN
  CREATE TYPE analysis_type AS ENUM (
    'soil',
    'plant',
    'water'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Worker Type
DO $$ BEGIN
  CREATE TYPE worker_type AS ENUM (
    'fixed_salary',
    'daily_worker',
    'metayage'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payment Frequency
DO $$ BEGIN
  CREATE TYPE payment_frequency AS ENUM (
    'monthly',
    'daily',
    'per_task',
    'harvest_share'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Metayage Type
DO $$ BEGIN
  CREATE TYPE metayage_type AS ENUM (
    'khammass',
    'rebaa',
    'tholth',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Calculation Basis for metayage settlements and worker contracts
DO $$ BEGIN
  CREATE TYPE calculation_basis AS ENUM (
    'net_revenue',
    'gross_revenue'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tax Type
DO $$ BEGIN
  CREATE TYPE tax_type AS ENUM (
    'sales',
    'purchase',
    'both'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 4. CORE TABLES - Organizations & Users
-- =====================================================

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  tax_id VARCHAR(100),
  currency_code VARCHAR(3) DEFAULT 'MAD',
  timezone VARCHAR(50) DEFAULT 'Africa/Casablanca',
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Organization Users
CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_users_org ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user ON organization_users(user_id);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  language VARCHAR(10) DEFAULT 'fr',
  timezone VARCHAR(50) DEFAULT 'Africa/Casablanca',
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  password_set BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  plan_id VARCHAR(100),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);

-- =====================================================
-- 5. FARM MANAGEMENT TABLES
-- =====================================================

-- Farms
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  size DECIMAL(10, 2),
  size_unit VARCHAR(20) DEFAULT 'hectare',
  soil_type VARCHAR(100),
  climate_zone VARCHAR(100),
  irrigation_type VARCHAR(100),
  manager_name VARCHAR(255),
  manager_email VARCHAR(255),
  manager_phone VARCHAR(50),
  established_date DATE,
  certification_status VARCHAR(100),
  description TEXT,
  coordinates JSONB,
  status VARCHAR(50) DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farms_org ON farms(organization_id);

-- Parcels
CREATE TABLE IF NOT EXISTS parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  boundary JSONB,
  area NUMERIC,
  area_unit TEXT,
  calculated_area NUMERIC,
  irrigation_type TEXT,
  planting_density NUMERIC,
  perimeter NUMERIC,
  soil_type TEXT,
  variety TEXT,
  planting_date DATE,
  planting_type TEXT,
  crop_category TEXT,
  crop_type TEXT,
  planting_system TEXT,
  spacing TEXT,
  density_per_hectare NUMERIC,
  planting_year INTEGER,
  plant_count INTEGER,
  rootstock TEXT,
  tree_type TEXT,
  tree_count INTEGER,
  expected_harvest_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcels_farm ON parcels(farm_id);
CREATE INDEX IF NOT EXISTS idx_parcels_crop_type ON parcels(crop_type) WHERE crop_type IS NOT NULL;

-- =====================================================
-- 6. BILLING CYCLE TABLES - Quotes, Sales Orders, Purchase Orders
-- =====================================================

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  customer_code TEXT,
  contact_person TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile TEXT,
  address TEXT,
  city VARCHAR(100),
  state_province TEXT,
  postal_code VARCHAR(20),
  country VARCHAR(100),
  website TEXT,
  tax_id VARCHAR(100),
  payment_terms TEXT,
  credit_limit NUMERIC(15, 2),
  currency_code TEXT DEFAULT 'MAD',
  customer_type TEXT CHECK (customer_type IN ('individual', 'business', 'government', 'other') OR customer_type IS NULL),
  price_list TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code_org ON customers(organization_id, customer_code) WHERE customer_code IS NOT NULL;

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  tax_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);

-- Currencies
CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default currencies
INSERT INTO currencies (code, name, symbol) VALUES
  ('MAD', 'Moroccan Dirham', 'د.م.'),
  ('USD', 'US Dollar', '$'),
  ('EUR', 'Euro', '€')
ON CONFLICT (code) DO NOTHING;

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_number VARCHAR(100) NOT NULL,
  quote_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency_code VARCHAR(3) DEFAULT 'MAD' REFERENCES currencies(code),
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,
  status quote_status DEFAULT 'draft',
  payment_terms TEXT,
  delivery_terms TEXT,
  terms_and_conditions TEXT,
  notes TEXT,
  reference_number VARCHAR(100),
  sales_order_id UUID,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  converted_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, quote_number),
  CHECK (valid_until >= quote_date),
  CHECK (grand_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quotes_org ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_sales_order ON quotes(sales_order_id) WHERE sales_order_id IS NOT NULL;

-- Quote Items
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_of_measure VARCHAR(50) DEFAULT 'unit',
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_id UUID,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  line_total DECIMAL(15, 2) NOT NULL,
  account_id UUID,
  item_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quote_id, line_number),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_item ON quote_items(item_id) WHERE item_id IS NOT NULL;

-- Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  customer_address TEXT,
  shipping_address TEXT,
  tracking_number TEXT,
  status TEXT,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total_amount NUMERIC,
  notes TEXT,
  terms_and_conditions TEXT,
  stock_entry_id UUID,
  stock_issued BOOLEAN,
  stock_issued_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_org ON sales_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date DESC);

-- Sales Order Items
CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_of_measure VARCHAR(50) DEFAULT 'unit',
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_id UUID,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  line_total DECIMAL(15, 2) NOT NULL,
  delivered_quantity DECIMAL(10, 3) DEFAULT 0,
  invoiced_quantity DECIMAL(10, 3) DEFAULT 0,
  account_id UUID,
  quote_item_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sales_order_id, line_number),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (delivered_quantity >= 0 AND delivered_quantity <= quantity),
  CHECK (invoiced_quantity >= 0 AND invoiced_quantity <= quantity)
);

CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(sales_order_id);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name TEXT,
  supplier_contact TEXT,
  status TEXT,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  total_amount NUMERIC,
  notes TEXT,
  terms_and_conditions TEXT,
  stock_entry_id UUID,
  stock_received BOOLEAN,
  stock_received_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date DESC);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_of_measure VARCHAR(50) DEFAULT 'unit',
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_id UUID,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  line_total DECIMAL(15, 2) NOT NULL,
  received_quantity DECIMAL(10, 3) DEFAULT 0,
  billed_quantity DECIMAL(10, 3) DEFAULT 0,
  account_id UUID,
  inventory_item_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(purchase_order_id, line_number),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (received_quantity >= 0 AND received_quantity <= quantity),
  CHECK (billed_quantity >= 0 AND billed_quantity <= quantity)
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);

-- =====================================================
-- 7. ACCOUNTING TABLES
-- =====================================================

-- Cost Centers
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON cost_centers(organization_id);

-- Accounts (Chart of Accounts)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  account_subtype VARCHAR(50),
  parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT,
  currency_code VARCHAR(3) REFERENCES currencies(code),
  is_group BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  allow_cost_center BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);

-- Taxes
CREATE TABLE IF NOT EXISTS taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  rate DECIMAL(5, 2) NOT NULL,
  tax_type tax_type DEFAULT 'both',
  account_id UUID REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taxes_org ON taxes(organization_id);

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100),
  bank_name VARCHAR(255),
  bank_code VARCHAR(50),
  branch_code VARCHAR(50),
  account_type VARCHAR(50),
  currency_code VARCHAR(3) DEFAULT 'MAD' REFERENCES currencies(code),
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_org ON bank_accounts(organization_id);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number VARCHAR(100) NOT NULL,
  entry_date DATE NOT NULL,
  reference_number VARCHAR(100),
  description TEXT,
  status journal_entry_status DEFAULT 'draft',
  total_debit DECIMAL(15, 2) DEFAULT 0,
  total_credit DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_org ON journal_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);

-- Journal Items
CREATE TABLE IF NOT EXISTS journal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  description TEXT,
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  cost_center_id UUID REFERENCES cost_centers(id),
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_items_entry ON journal_items(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_account ON journal_items(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_cost_center ON journal_items(cost_center_id);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_type invoice_type NOT NULL,
  party_id UUID,
  party_name VARCHAR(255) NOT NULL,
  party_type VARCHAR(50),
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  outstanding_amount DECIMAL(15, 2) DEFAULT 0,
  currency_code VARCHAR(3) DEFAULT 'MAD' REFERENCES currencies(code),
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,
  status invoice_status DEFAULT 'draft',
  due_date DATE,
  payment_terms TEXT,
  notes TEXT,
  sales_order_id UUID REFERENCES sales_orders(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  UNIQUE(organization_id, invoice_number),
  CHECK (grand_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_of_measure VARCHAR(50) DEFAULT 'unit',
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_id UUID REFERENCES taxes(id),
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  line_total DECIMAL(15, 2) NOT NULL,
  account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invoice_id, line_number),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Accounting Payments
CREATE TABLE IF NOT EXISTS accounting_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_number VARCHAR(100) NOT NULL,
  payment_date DATE NOT NULL,
  payment_type accounting_payment_type NOT NULL,
  payment_method accounting_payment_method NOT NULL,
  party_id UUID,
  party_name VARCHAR(255) NOT NULL,
  party_type VARCHAR(50),
  amount DECIMAL(15, 2) NOT NULL,
  currency_code VARCHAR(3) DEFAULT 'MAD' REFERENCES currencies(code),
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,
  bank_account_id UUID REFERENCES bank_accounts(id),
  reference_number VARCHAR(100),
  remarks TEXT,
  status accounting_payment_status DEFAULT 'draft',
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, payment_number),
  CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_accounting_payments_org ON accounting_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounting_payments_type ON accounting_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_accounting_payments_status ON accounting_payments(status);
CREATE INDEX IF NOT EXISTS idx_accounting_payments_date ON accounting_payments(payment_date DESC);

-- Payment Allocations
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES accounting_payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (allocated_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON payment_allocations(invoice_id);

-- =====================================================
-- 8. HELPER FUNCTIONS FOR NUMBER GENERATION
-- =====================================================

-- Generate Quote Number
CREATE OR REPLACE FUNCTION generate_quote_number(p_organization_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) INTO v_count
  FROM quotes
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM quote_date) = EXTRACT(YEAR FROM NOW());
  v_number := 'QT-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Generate Sales Order Number
CREATE OR REPLACE FUNCTION generate_sales_order_number(p_organization_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) INTO v_count
  FROM sales_orders
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM NOW());
  v_number := 'SO-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Generate Purchase Order Number
CREATE OR REPLACE FUNCTION generate_purchase_order_number(p_organization_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) INTO v_count
  FROM purchase_orders
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM NOW());
  v_number := 'PO-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Generate Invoice Number
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_organization_id UUID,
  p_invoice_type invoice_type
)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_prefix VARCHAR(10);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_prefix := CASE p_invoice_type
    WHEN 'sales' THEN 'INV'
    WHEN 'purchase' THEN 'BILL'
    ELSE 'INV'
  END;
  SELECT COUNT(*) INTO v_count
  FROM invoices
  WHERE organization_id = p_organization_id
    AND invoice_type = p_invoice_type
    AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM NOW());
  v_number := v_prefix || '-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Generate Journal Entry Number
CREATE OR REPLACE FUNCTION generate_journal_entry_number(p_organization_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) INTO v_count
  FROM journal_entries
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM NOW());
  v_number := 'JE-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Get farm hierarchy tree for an organization
CREATE OR REPLACE FUNCTION get_farm_hierarchy_tree(
  org_uuid UUID,
  root_farm_id UUID DEFAULT NULL
)
RETURNS TABLE (
  farm_id UUID,
  farm_name TEXT,
  parent_farm_id UUID,
  farm_type TEXT,
  farm_size NUMERIC,
  manager_name TEXT,
  is_active BOOLEAN,
  hierarchy_level INTEGER,
  parcel_count BIGINT,
  subparcel_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE farm_tree AS (
    -- Base case: root farms or specific farm
    SELECT
      f.id,
      f.name,
      NULL::UUID as parent_farm_id,
      'main'::TEXT as farm_type,
      f.size,
      COALESCE(f.manager_name, 'N/A') as manager,
      f.is_active,
      1 as level
    FROM farms f
    WHERE f.organization_id = org_uuid
      AND (root_farm_id IS NULL OR f.id = root_farm_id)
  )
  SELECT
    ft.id,
    ft.name,
    ft.parent_farm_id,
    ft.farm_type,
    ft.size,
    ft.manager,
    ft.is_active,
    ft.level,
    COUNT(DISTINCT p.id) as parcel_count,
    0::BIGINT as subparcel_count
  FROM farm_tree ft
  LEFT JOIN parcels p ON p.farm_id = ft.id
  GROUP BY ft.id, ft.name, ft.parent_farm_id, ft.farm_type, ft.size, ft.manager, ft.is_active, ft.level
  ORDER BY ft.level, ft.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_farm_hierarchy_tree(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_hierarchy_tree(UUID, UUID) TO service_role;

COMMENT ON FUNCTION get_farm_hierarchy_tree IS 'Returns hierarchical farm tree for an organization with parcel counts';

-- Analytics: Parcel Performance Summary
CREATE OR REPLACE FUNCTION get_parcel_performance_summary(
  p_organization_id UUID,
  p_farm_id UUID DEFAULT NULL,
  p_parcel_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
  parcel_id UUID,
  parcel_name TEXT,
  farm_name TEXT,
  crop_type TEXT,
  total_harvests BIGINT,
  avg_yield_per_hectare NUMERIC,
  avg_target_yield NUMERIC,
  avg_variance_percent NUMERIC,
  performance_rating TEXT,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  total_profit NUMERIC,
  avg_profit_margin NUMERIC,
  last_harvest_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH harvest_stats AS (
    SELECT
      hr.parcel_id,
      p.parcel_name,
      f.farm_name,
      hr.crop_type,
      COUNT(*) as total_harvests,
      AVG(CASE
        WHEN p.area_hectares > 0 THEN hr.actual_yield / p.area_hectares
        ELSE NULL
      END) as avg_yield_per_hectare,
      AVG(hr.estimated_yield) as avg_target_yield,
      AVG(CASE
        WHEN hr.estimated_yield > 0
        THEN ((hr.actual_yield - hr.estimated_yield) / hr.estimated_yield * 100)
        ELSE NULL
      END) as avg_variance_percent,
      SUM(COALESCE(hr.revenue_amount, 0)) as total_revenue,
      SUM(COALESCE(hr.cost_amount, 0)) as total_cost,
      SUM(COALESCE(hr.profit_amount, 0)) as total_profit,
      MAX(hr.harvest_date) as last_harvest_date
    FROM harvest_records hr
    JOIN parcels p ON hr.parcel_id = p.id
    JOIN farms f ON p.farm_id = f.id
    WHERE hr.organization_id = p_organization_id
      AND (p_farm_id IS NULL OR p.farm_id = p_farm_id)
      AND (p_parcel_id IS NULL OR hr.parcel_id = p_parcel_id)
      AND (p_from_date IS NULL OR hr.harvest_date >= p_from_date)
      AND (p_to_date IS NULL OR hr.harvest_date <= p_to_date)
    GROUP BY hr.parcel_id, p.parcel_name, f.farm_name, hr.crop_type
  )
  SELECT
    hs.parcel_id,
    hs.parcel_name,
    hs.farm_name,
    hs.crop_type,
    hs.total_harvests,
    ROUND(hs.avg_yield_per_hectare, 2) as avg_yield_per_hectare,
    ROUND(hs.avg_target_yield, 2) as avg_target_yield,
    ROUND(hs.avg_variance_percent, 2) as avg_variance_percent,
    CASE
      WHEN hs.avg_variance_percent >= 10 THEN 'excellent'
      WHEN hs.avg_variance_percent >= 0 THEN 'good'
      WHEN hs.avg_variance_percent >= -10 THEN 'acceptable'
      ELSE 'poor'
    END as performance_rating,
    ROUND(hs.total_revenue, 2) as total_revenue,
    ROUND(hs.total_cost, 2) as total_cost,
    ROUND(hs.total_profit, 2) as total_profit,
    ROUND(
      CASE
        WHEN hs.total_revenue > 0
        THEN (hs.total_profit / hs.total_revenue * 100)
        ELSE 0
      END,
      2
    ) as avg_profit_margin,
    hs.last_harvest_date
  FROM harvest_stats hs
  ORDER BY hs.avg_variance_percent DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_parcel_performance_summary(UUID, UUID, UUID, DATE, DATE) TO authenticated;
COMMENT ON FUNCTION get_parcel_performance_summary IS 'Aggregates harvest performance data by parcel for analytics and reporting. Returns yield, financial metrics, and performance ratings.';

-- =====================================================
-- 9. TRIGGERS FOR UPDATED_AT
-- =====================================================

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sales_orders_updated_at ON sales_orders;
CREATE TRIGGER trg_sales_orders_updated_at
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. RLS POLICIES
-- =====================================================

-- Helper function to check organization membership (bypasses RLS to avoid recursion)
-- This function uses SECURITY DEFINER to run with elevated privileges and bypass RLS
CREATE OR REPLACE FUNCTION is_organization_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Direct query without RLS check (SECURITY DEFINER bypasses RLS)
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_users 
    WHERE user_id = auth.uid() 
      AND organization_id = p_organization_id
      AND is_active = true
  );
$$;

-- Enable RLS on all tables
ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounting_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS item_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS work_units ENABLE ROW LEVEL SECURITY;

-- Organization Users Policies
-- Note: Users can only see/modify their own rows to avoid infinite recursion
-- IMPORTANT: Drop ALL existing policies first to remove any recursive ones
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'organization_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON organization_users', r.policyname);
  END LOOP;
END $$;

-- Create new non-recursive policies
CREATE POLICY "org_read_organization_users" ON organization_users
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "org_write_organization_users" ON organization_users
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "org_update_organization_users" ON organization_users
  FOR UPDATE USING (
    user_id = auth.uid()
  );

CREATE POLICY "org_delete_organization_users" ON organization_users
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- Customers Policies
DROP POLICY IF EXISTS "org_read_customers" ON customers;
CREATE POLICY "org_read_customers" ON customers
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_customers" ON customers;
CREATE POLICY "org_write_customers" ON customers
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_customers" ON customers;
CREATE POLICY "org_update_customers" ON customers
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_customers" ON customers;
CREATE POLICY "org_delete_customers" ON customers
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Suppliers Policies
DROP POLICY IF EXISTS "org_read_suppliers" ON suppliers;
CREATE POLICY "org_read_suppliers" ON suppliers
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_suppliers" ON suppliers;
CREATE POLICY "org_write_suppliers" ON suppliers
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_suppliers" ON suppliers;
CREATE POLICY "org_update_suppliers" ON suppliers
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_suppliers" ON suppliers;
CREATE POLICY "org_delete_suppliers" ON suppliers
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Subscriptions Policies
DROP POLICY IF EXISTS "users_view_org_subscription" ON subscriptions;
DROP POLICY IF EXISTS "admins_manage_subscription" ON subscriptions;
DROP POLICY IF EXISTS "org_read_subscriptions" ON subscriptions;

-- Allow users to view subscriptions for organizations they belong to
CREATE POLICY "org_read_subscriptions" ON subscriptions
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

-- Allow organization admins to insert subscriptions
CREATE POLICY "org_insert_subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id) AND
    EXISTS (
      SELECT 1
      FROM public.organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = subscriptions.organization_id
        AND ou.role IN ('system_admin', 'organization_admin')
        AND ou.is_active = true
    )
  );

-- Allow organization admins to update subscriptions
CREATE POLICY "org_update_subscriptions" ON subscriptions
  FOR UPDATE USING (
    is_organization_member(organization_id) AND
    EXISTS (
      SELECT 1
      FROM public.organization_users
      WHERE user_id = auth.uid()
        AND organization_id = subscriptions.organization_id
        AND role IN ('system_admin', 'organization_admin')
        AND is_active = true
    )
  );

-- Allow organization admins to delete subscriptions
CREATE POLICY "org_delete_subscriptions" ON subscriptions
  FOR DELETE USING (
    is_organization_member(organization_id) AND
    EXISTS (
      SELECT 1
      FROM public.organization_users
      WHERE user_id = auth.uid()
        AND organization_id = subscriptions.organization_id
        AND role IN ('system_admin', 'organization_admin')
        AND is_active = true
    )
  );

-- Quotes Policies
DROP POLICY IF EXISTS "org_read_quotes" ON quotes;
CREATE POLICY "org_read_quotes" ON quotes
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_quotes" ON quotes;
CREATE POLICY "org_write_quotes" ON quotes
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_quotes" ON quotes;
CREATE POLICY "org_update_quotes" ON quotes
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

-- Quote Items Policies
DROP POLICY IF EXISTS "org_access_quote_items" ON quote_items;
CREATE POLICY "org_access_quote_items" ON quote_items
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM quotes WHERE is_organization_member(organization_id)
    )
  );

-- Sales Orders Policies
DROP POLICY IF EXISTS "org_read_sales_orders" ON sales_orders;
CREATE POLICY "org_read_sales_orders" ON sales_orders
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_sales_orders" ON sales_orders;
CREATE POLICY "org_write_sales_orders" ON sales_orders
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_sales_orders" ON sales_orders;
CREATE POLICY "org_update_sales_orders" ON sales_orders
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

-- Sales Order Items Policies
DROP POLICY IF EXISTS "org_access_sales_order_items" ON sales_order_items;
CREATE POLICY "org_access_sales_order_items" ON sales_order_items
  FOR ALL USING (
    sales_order_id IN (
      SELECT id FROM sales_orders WHERE is_organization_member(organization_id)
    )
  );

-- Purchase Orders Policies
DROP POLICY IF EXISTS "org_read_purchase_orders" ON purchase_orders;
CREATE POLICY "org_read_purchase_orders" ON purchase_orders
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_purchase_orders" ON purchase_orders;
CREATE POLICY "org_write_purchase_orders" ON purchase_orders
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_purchase_orders" ON purchase_orders;
CREATE POLICY "org_update_purchase_orders" ON purchase_orders
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

-- Purchase Order Items Policies
DROP POLICY IF EXISTS "org_access_purchase_order_items" ON purchase_order_items;
CREATE POLICY "org_access_purchase_order_items" ON purchase_order_items
  FOR ALL USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders WHERE is_organization_member(organization_id)
    )
  );

-- Accounting Policies (similar pattern for all accounting tables)
DROP POLICY IF EXISTS "org_read_accounts" ON accounts;
CREATE POLICY "org_read_accounts" ON accounts
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_accounts" ON accounts;
CREATE POLICY "org_write_accounts" ON accounts
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_accounts" ON accounts;
CREATE POLICY "org_update_accounts" ON accounts
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

-- Similar policies for other accounting tables (journal_entries, invoices, etc.)
-- (Following the same pattern as above)

-- =====================================================
-- 11. WORKERS & TASK MANAGEMENT TABLES
-- =====================================================

-- Workers
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  cin TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  date_of_birth DATE,
  worker_type worker_type NOT NULL DEFAULT 'daily_worker',
  position TEXT,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  is_cnss_declared BOOLEAN DEFAULT false,
  cnss_number TEXT,
  monthly_salary NUMERIC(10, 2),
  daily_rate NUMERIC(10, 2),
  metayage_type metayage_type,
  metayage_percentage NUMERIC(5, 2),
  calculation_basis calculation_basis DEFAULT 'net_revenue',
  metayage_contract_details JSONB,
  specialties TEXT[],
  certifications TEXT[],
  payment_frequency payment_frequency,
  bank_account TEXT,
  payment_method TEXT,
  total_days_worked INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  notes TEXT,
  documents JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  user_id UUID REFERENCES auth.users(id),
  CHECK (metayage_percentage IS NULL OR (metayage_percentage > 0 AND metayage_percentage <= 50))
);

CREATE INDEX IF NOT EXISTS idx_workers_org ON workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_workers_farm ON workers(farm_id);
CREATE INDEX IF NOT EXISTS idx_workers_type ON workers(worker_type);
CREATE INDEX IF NOT EXISTS idx_workers_user ON workers(user_id) WHERE user_id IS NOT NULL;

-- Work Units (for piece-work tracking)
CREATE TABLE IF NOT EXISTS work_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  unit_category TEXT NOT NULL CHECK (unit_category IN ('count', 'weight', 'volume', 'area', 'length')),
  base_unit TEXT,
  conversion_factor NUMERIC(10, 4),
  allow_decimal BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_work_units_org ON work_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_units_category ON work_units(unit_category);
CREATE INDEX IF NOT EXISTS idx_work_units_code ON work_units(code);

-- Day Laborers
CREATE TABLE IF NOT EXISTS day_laborers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  daily_rate NUMERIC(10, 2),
  specialties TEXT[],
  availability TEXT,
  rating INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_day_laborers_farm ON day_laborers(farm_id);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  department TEXT,
  hire_date DATE,
  salary NUMERIC(10, 2),
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_farm ON employees(farm_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  crop_id UUID,
  category_id UUID,
  template_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  task_type TEXT DEFAULT 'general',
  assigned_to UUID REFERENCES workers(id),
  worker_id UUID REFERENCES workers(id),
  due_date DATE,
  completed_date DATE,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  location_lat NUMERIC,
  location_lng NUMERIC,
  required_skills TEXT[],
  equipment_required TEXT[],
  completion_percentage INTEGER DEFAULT 0,
  quality_rating INTEGER,
  cost_estimate NUMERIC,
  actual_cost NUMERIC,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  weather_dependency BOOLEAN DEFAULT false,
  repeat_pattern JSONB,
  parent_task_id UUID REFERENCES tasks(id),
  attachments JSONB,
  checklist JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CHECK (status IN ('pending', 'assigned', 'in_progress', 'paused', 'completed', 'cancelled', 'overdue')),
  CHECK (task_type IN ('planting', 'harvesting', 'irrigation', 'fertilization', 'maintenance', 'general', 'pest_control', 'pruning', 'soil_preparation')),
  CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5))
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_farm ON tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parcel ON tasks(parcel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);

-- Task Categories
CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  default_duration INTEGER,
  default_skills TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_categories_org ON task_categories(organization_id);

-- Task Templates
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  estimated_duration INTEGER,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_templates_category ON task_templates(category_id);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  worker_id UUID REFERENCES workers(id),
  comment TEXT NOT NULL,
  type TEXT DEFAULT 'comment',
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (type IN ('comment', 'status_update', 'completion_note', 'issue'))
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments(user_id);

-- Task Time Logs
CREATE TABLE IF NOT EXISTS task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  break_duration INTEGER DEFAULT 0,
  total_hours NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN end_time IS NOT NULL THEN GREATEST(0, (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) - (break_duration::NUMERIC / 60.0))
      ELSE 0
    END
  ) STORED,
  notes TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_time_logs_task ON task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_worker ON task_time_logs(worker_id);

-- Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'finish_to_start',
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish'))
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(depends_on_task_id);

-- Task Equipment
CREATE TABLE IF NOT EXISTS task_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  condition_before TEXT,
  condition_after TEXT,
  fuel_used NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (condition_before IN ('excellent', 'good', 'fair', 'poor')),
  CHECK (condition_after IN ('excellent', 'good', 'fair', 'poor'))
);

CREATE INDEX IF NOT EXISTS idx_task_equipment_task ON task_equipment(task_id);

-- Work Records
CREATE TABLE IF NOT EXISTS work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  worker_type TEXT NOT NULL,
  work_date DATE NOT NULL,
  hours_worked NUMERIC,
  task_description TEXT NOT NULL,
  hourly_rate NUMERIC,
  total_payment NUMERIC,
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  amount_paid NUMERIC,
  payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_records_farm ON work_records(farm_id);
CREATE INDEX IF NOT EXISTS idx_work_records_worker ON work_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_records_date ON work_records(work_date);

-- Metayage Settlements
CREATE TABLE IF NOT EXISTS metayage_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  harvest_date DATE,
  gross_revenue NUMERIC NOT NULL,
  total_charges NUMERIC DEFAULT 0,
  net_revenue NUMERIC GENERATED ALWAYS AS (gross_revenue - total_charges) STORED,
  worker_percentage NUMERIC NOT NULL,
  worker_share_amount NUMERIC NOT NULL,
  calculation_basis calculation_basis NOT NULL,
  charges_breakdown JSONB,
  payment_status TEXT DEFAULT 'pending',
  payment_date DATE,
  payment_method TEXT,
  notes TEXT,
  documents JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_metayage_settlements_worker ON metayage_settlements(worker_id);
CREATE INDEX IF NOT EXISTS idx_metayage_settlements_farm ON metayage_settlements(farm_id);
CREATE INDEX IF NOT EXISTS idx_metayage_settlements_parcel ON metayage_settlements(parcel_id);

-- Payment Records
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_amount NUMERIC DEFAULT 0,
  bonuses NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  overtime_amount NUMERIC DEFAULT 0,
  advance_deduction NUMERIC DEFAULT 0,
  net_amount NUMERIC GENERATED ALWAYS AS ((((base_amount + bonuses) - deductions) + overtime_amount) - advance_deduction) STORED,
  days_worked INTEGER DEFAULT 0,
  hours_worked NUMERIC DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_completed_ids UUID[],
  harvest_amount NUMERIC,
  gross_revenue NUMERIC,
  total_charges NUMERIC,
  metayage_percentage NUMERIC,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_date DATE,
  payment_reference TEXT,
  calculated_by UUID REFERENCES auth.users(id),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (payment_type IN ('daily_wage', 'monthly_salary', 'metayage_share', 'bonus', 'overtime', 'advance')),
  CHECK (status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),
  CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'mobile_money'))
);

CREATE INDEX IF NOT EXISTS idx_payment_records_org ON payment_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_farm ON payment_records(farm_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_worker ON payment_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);

-- Payment Advances
CREATE TABLE IF NOT EXISTS payment_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_date DATE,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  deduction_plan JSONB,
  remaining_balance NUMERIC,
  paid_by UUID REFERENCES auth.users(id),
  paid_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_payment_advances_org ON payment_advances(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_advances_worker ON payment_advances(worker_id);

-- Payment Bonuses
CREATE TABLE IF NOT EXISTS payment_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id UUID NOT NULL REFERENCES payment_records(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (bonus_type IN ('performance', 'attendance', 'quality', 'productivity', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_payment_bonuses_payment ON payment_bonuses(payment_record_id);

-- Payment Deductions
CREATE TABLE IF NOT EXISTS payment_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id UUID NOT NULL REFERENCES payment_records(id) ON DELETE CASCADE,
  deduction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (deduction_type IN ('cnss', 'tax', 'advance_repayment', 'equipment_damage', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_payment_deductions_payment ON payment_deductions(payment_record_id);

-- =====================================================
-- 12. HARVEST & DELIVERY MANAGEMENT TABLES
-- =====================================================

-- Harvest Records
CREATE TABLE IF NOT EXISTS harvest_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  crop_id UUID,
  harvest_date DATE NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  quality_grade TEXT,
  quality_notes TEXT,
  quality_score INTEGER,
  harvest_task_id UUID REFERENCES tasks(id),
  workers JSONB DEFAULT '[]',
  supervisor_id UUID REFERENCES workers(id),
  storage_location TEXT,
  temperature NUMERIC,
  humidity NUMERIC,
  intended_for TEXT,
  expected_price_per_unit NUMERIC,
  estimated_revenue NUMERIC GENERATED ALWAYS AS (quantity * expected_price_per_unit) STORED,
  photos JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  status TEXT DEFAULT 'stored',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  reception_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (unit IN ('kg', 'tons', 'units', 'boxes', 'crates', 'liters')),
  CHECK (quality_grade IN ('A', 'B', 'C', 'Extra', 'First', 'Second', 'Third')),
  CHECK (quality_score >= 1 AND quality_score <= 10),
  CHECK (intended_for IN ('market', 'storage', 'processing', 'export', 'direct_client')),
  CHECK (status IN ('stored', 'in_delivery', 'delivered', 'sold', 'spoiled'))
);

CREATE INDEX IF NOT EXISTS idx_harvest_records_org ON harvest_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_harvest_records_farm ON harvest_records(farm_id);
CREATE INDEX IF NOT EXISTS idx_harvest_records_parcel ON harvest_records(parcel_id);
CREATE INDEX IF NOT EXISTS idx_harvest_records_date ON harvest_records(harvest_date DESC);

-- Harvest Forecasts (Production Intelligence)
CREATE TABLE IF NOT EXISTS harvest_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  crop_type TEXT NOT NULL,
  variety TEXT,
  planting_date DATE,
  forecast_harvest_date_start DATE NOT NULL,
  forecast_harvest_date_end DATE NOT NULL,
  forecast_season TEXT,
  confidence_level TEXT CHECK (confidence_level IN ('high', 'medium', 'low')),
  predicted_yield_quantity NUMERIC NOT NULL,
  predicted_yield_per_hectare NUMERIC,
  unit_of_measure TEXT NOT NULL DEFAULT 'kg',
  predicted_quality_grade TEXT,
  predicted_price_per_unit NUMERIC,
  predicted_revenue NUMERIC,
  cost_estimate NUMERIC,
  profit_estimate NUMERIC,
  weather_factors JSONB,
  soil_factors JSONB,
  historical_basis JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (forecast_harvest_date_end >= forecast_harvest_date_start)
);

CREATE INDEX IF NOT EXISTS idx_harvest_forecasts_org ON harvest_forecasts(organization_id);
CREATE INDEX IF NOT EXISTS idx_harvest_forecasts_farm ON harvest_forecasts(farm_id);
CREATE INDEX IF NOT EXISTS idx_harvest_forecasts_parcel ON harvest_forecasts(parcel_id);
CREATE INDEX IF NOT EXISTS idx_harvest_forecasts_status ON harvest_forecasts(status);
CREATE INDEX IF NOT EXISTS idx_harvest_forecasts_dates ON harvest_forecasts(forecast_harvest_date_start, forecast_harvest_date_end);

-- Performance Alerts (Production Intelligence)
CREATE TABLE IF NOT EXISTS performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('yield_underperformance', 'forecast_variance', 'quality_issue', 'cost_overrun', 'revenue_shortfall', 'benchmark_deviation')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  yield_history_id UUID,
  forecast_id UUID REFERENCES harvest_forecasts(id) ON DELETE SET NULL,
  harvest_id UUID REFERENCES harvest_records(id) ON DELETE SET NULL,
  metric_name TEXT,
  actual_value NUMERIC,
  target_value NUMERIC,
  variance_percent NUMERIC,
  recommended_actions TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_org ON performance_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_farm ON performance_alerts(farm_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_parcel ON performance_alerts(parcel_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_type ON performance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity ON performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_status ON performance_alerts(status);

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  delivery_type TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_contact TEXT,
  customer_email TEXT,
  delivery_address TEXT,
  destination_lat NUMERIC,
  destination_lng NUMERIC,
  total_quantity NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'MAD',
  driver_id UUID REFERENCES workers(id),
  vehicle_info TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  distance_km NUMERIC,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_terms TEXT,
  payment_received NUMERIC DEFAULT 0,
  payment_date DATE,
  delivery_note_number TEXT UNIQUE,
  invoice_number TEXT,
  signature_image TEXT,
  signature_name TEXT,
  signature_date TIMESTAMPTZ,
  photos JSONB DEFAULT '[]',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (delivery_type IN ('market_sale', 'export', 'processor', 'direct_client', 'wholesale')),
  CHECK (status IN ('pending', 'prepared', 'in_transit', 'delivered', 'cancelled', 'returned')),
  CHECK (payment_status IN ('pending', 'partial', 'paid')),
  CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'credit', 'mobile_money'))
);

CREATE INDEX IF NOT EXISTS idx_deliveries_org ON deliveries(organization_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_farm ON deliveries(farm_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);

-- Delivery Items
CREATE TABLE IF NOT EXISTS delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  harvest_record_id UUID NOT NULL REFERENCES harvest_records(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  total_amount NUMERIC GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  quality_grade TEXT,
  quality_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_harvest ON delivery_items(harvest_record_id);

-- Delivery Tracking
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_name TEXT,
  notes TEXT,
  photo_url TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_delivery ON delivery_tracking(delivery_id);

-- =====================================================
-- 13. INVENTORY & STOCK MANAGEMENT TABLES
-- =====================================================

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  capacity NUMERIC,
  capacity_unit TEXT DEFAULT 'm3',
  temperature_controlled BOOLEAN DEFAULT false,
  humidity_controlled BOOLEAN DEFAULT false,
  security_level TEXT DEFAULT 'standard',
  manager_name TEXT,
  manager_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  is_reception_center BOOLEAN DEFAULT false,
  reception_type TEXT,
  has_weighing_station BOOLEAN DEFAULT false,
  has_quality_lab BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (reception_type IN ('general', 'olivier', 'viticole', 'laitier', 'fruiter', 'legumier'))
);

CREATE INDEX IF NOT EXISTS idx_warehouses_org ON warehouses(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_farm ON warehouses(farm_id);

-- Item Groups (Hierarchical categorization for items)
CREATE TABLE IF NOT EXISTS item_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  parent_group_id UUID REFERENCES item_groups(id) ON DELETE SET NULL,
  path TEXT,
  default_sales_account_id UUID REFERENCES accounts(id),
  default_expense_account_id UUID REFERENCES accounts(id),
  default_cost_center_id UUID REFERENCES cost_centers(id),
  default_tax_id UUID REFERENCES taxes(id),
  default_warehouse_id UUID REFERENCES warehouses(id),
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_item_groups_org ON item_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_item_groups_parent ON item_groups(parent_group_id);
CREATE INDEX IF NOT EXISTS idx_item_groups_code ON item_groups(code) WHERE code IS NOT NULL;

-- Items (Item Master - comprehensive item management)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  item_group_id UUID NOT NULL REFERENCES item_groups(id) ON DELETE RESTRICT,
  brand TEXT,
  is_active BOOLEAN DEFAULT true,
  is_sales_item BOOLEAN DEFAULT false,
  is_purchase_item BOOLEAN DEFAULT false,
  is_stock_item BOOLEAN DEFAULT false,
  default_unit TEXT NOT NULL,
  stock_uom TEXT NOT NULL,
  maintain_stock BOOLEAN DEFAULT false,
  has_batch_no BOOLEAN DEFAULT false,
  has_serial_no BOOLEAN DEFAULT false,
  has_expiry_date BOOLEAN DEFAULT false,
  valuation_method TEXT DEFAULT 'Moving Average',
  default_sales_account_id UUID REFERENCES accounts(id),
  default_expense_account_id UUID REFERENCES accounts(id),
  default_cost_center_id UUID REFERENCES cost_centers(id),
  default_warehouse_id UUID REFERENCES warehouses(id),
  standard_rate NUMERIC,
  last_purchase_rate NUMERIC,
  last_sales_rate NUMERIC,
  weight_per_unit NUMERIC,
  weight_uom TEXT,
  length NUMERIC,
  width NUMERIC,
  height NUMERIC,
  volume NUMERIC,
  barcode TEXT,
  manufacturer_code TEXT,
  supplier_part_number TEXT,
  item_tax_template_id UUID,
  inspection_required_before_purchase BOOLEAN DEFAULT false,
  inspection_required_before_delivery BOOLEAN DEFAULT false,
  crop_type TEXT,
  variety TEXT,
  seasonality TEXT,
  shelf_life_days INTEGER,
  show_in_website BOOLEAN DEFAULT false,
  website_image_url TEXT,
  website_description TEXT,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CHECK (valuation_method IN ('FIFO', 'LIFO', 'Moving Average')),
  CHECK (seasonality IN ('spring', 'summer', 'autumn', 'winter', 'year-round'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_code_org ON items(organization_id, item_code);
CREATE INDEX IF NOT EXISTS idx_items_org ON items(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_group ON items(item_group_id);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode) WHERE barcode IS NOT NULL;

-- Generate Item Code per organization, item group, and year
CREATE OR REPLACE FUNCTION public.generate_item_code(
  p_item_group_id UUID,
  p_organization_id UUID,
  p_prefix TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq INT;
  v_code TEXT;
  v_year TEXT;
  v_prefix TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  v_prefix := COALESCE(p_prefix, 'ITM');

  -- Compute next sequence within organization + item group for current year
  SELECT COALESCE(MAX(SPLIT_PART(item_code, '-', 3)::INT), 0) + 1
    INTO v_seq
  FROM public.items
  WHERE organization_id = p_organization_id
    AND item_group_id = p_item_group_id
    AND SPLIT_PART(item_code, '-', 2) = v_year;

  v_code := v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_item_code(UUID, UUID, TEXT) TO anon, authenticated, service_role;

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT NOT NULL,
  minimum_stock NUMERIC,
  cost_per_unit NUMERIC,
  supplier TEXT,
  location TEXT,
  notes TEXT,
  valuation_method TEXT DEFAULT 'Average',
  enable_batch_tracking BOOLEAN DEFAULT false,
  enable_serial_tracking BOOLEAN DEFAULT false,
  has_expiry_date BOOLEAN DEFAULT false,
  shelf_life_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (category IN ('seeds', 'fertilizers', 'pesticides', 'equipment', 'tools', 'other')),
  CHECK (valuation_method IN ('FIFO', 'LIFO', 'Average'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_org ON inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_farm ON inventory_items(farm_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);

-- Inventory Batches
CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  received_date DATE NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  initial_quantity NUMERIC NOT NULL,
  current_quantity NUMERIC DEFAULT 0,
  cost_per_unit NUMERIC,
  status TEXT DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('Active', 'Expired', 'Recalled', 'Exhausted'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_org ON inventory_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_item ON inventory_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_batch ON inventory_batches(batch_number);

-- Inventory Serial Numbers
CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id),
  status TEXT DEFAULT 'Available',
  received_date DATE,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  issued_date DATE,
  issued_to TEXT,
  warranty_expiry_date DATE,
  cost_per_unit NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('Available', 'Issued', 'Defective', 'Returned', 'In Transit'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_serial_numbers_org ON inventory_serial_numbers(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_serial_numbers_item ON inventory_serial_numbers(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_serial_numbers_serial ON inventory_serial_numbers(serial_number);

-- Stock Entries
CREATE TABLE IF NOT EXISTS stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  entry_date DATE DEFAULT CURRENT_DATE,
  from_warehouse_id UUID REFERENCES warehouses(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  reference_type TEXT,
  reference_id UUID,
  reference_number TEXT,
  status TEXT DEFAULT 'Draft',
  purpose TEXT,
  notes TEXT,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  reception_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CHECK (entry_type IN ('Material Receipt', 'Material Issue', 'Stock Transfer', 'Stock Reconciliation')),
  CHECK (status IN ('Draft', 'Submitted', 'Posted', 'Cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_stock_entries_org ON stock_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_type ON stock_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_stock_entries_status ON stock_entries(status);
CREATE INDEX IF NOT EXISTS idx_stock_entries_date ON stock_entries(entry_date DESC);

-- Stock Entry Items
CREATE TABLE IF NOT EXISTS stock_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_entry_id UUID NOT NULL REFERENCES stock_entries(id) ON DELETE CASCADE,
  line_number INTEGER DEFAULT 1,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  source_warehouse_id UUID REFERENCES warehouses(id),
  target_warehouse_id UUID REFERENCES warehouses(id),
  batch_number TEXT,
  serial_number TEXT,
  expiry_date DATE,
  cost_per_unit NUMERIC,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,
  system_quantity NUMERIC,
  physical_quantity NUMERIC,
  variance NUMERIC GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_entry_items_entry ON stock_entry_items(stock_entry_id);
CREATE INDEX IF NOT EXISTS idx_stock_entry_items_item ON stock_entry_items(item_id);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  movement_date TIMESTAMPTZ DEFAULT NOW(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  balance_quantity NUMERIC NOT NULL,
  cost_per_unit NUMERIC,
  total_cost NUMERIC,
  stock_entry_id UUID REFERENCES stock_entries(id),
  stock_entry_item_id UUID REFERENCES stock_entry_items(id),
  batch_number TEXT,
  serial_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CHECK (movement_type IN ('IN', 'OUT', 'TRANSFER'))
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date DESC);

-- Stock Valuation
CREATE TABLE IF NOT EXISTS stock_valuation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  cost_per_unit NUMERIC NOT NULL,
  total_cost NUMERIC GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,
  valuation_date TIMESTAMPTZ DEFAULT NOW(),
  stock_entry_id UUID REFERENCES stock_entries(id),
  batch_number TEXT,
  serial_number TEXT,
  remaining_quantity NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (quantity > 0),
  CHECK (remaining_quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_valuation_org ON stock_valuation(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_valuation_item ON stock_valuation(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_valuation_warehouse ON stock_valuation(warehouse_id);

-- Opening Stock Balances
CREATE TABLE IF NOT EXISTS opening_stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  opening_date DATE NOT NULL,
  quantity NUMERIC NOT NULL,
  valuation_rate NUMERIC NOT NULL,
  total_value NUMERIC GENERATED ALWAYS AS (quantity * valuation_rate) STORED,
  batch_number TEXT,
  serial_numbers TEXT[],
  journal_entry_id UUID REFERENCES journal_entries(id),
  status TEXT DEFAULT 'Draft',
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (quantity >= 0),
  CHECK (valuation_rate >= 0),
  CHECK (status IN ('Draft', 'Posted', 'Cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_opening_stock_balances_org ON opening_stock_balances(organization_id);
CREATE INDEX IF NOT EXISTS idx_opening_stock_balances_item ON opening_stock_balances(item_id);
CREATE INDEX IF NOT EXISTS idx_opening_stock_balances_warehouse ON opening_stock_balances(warehouse_id);

-- Stock Closing Entries
CREATE TABLE IF NOT EXISTS stock_closing_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  closing_date DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_period TEXT,
  status TEXT DEFAULT 'Draft',
  total_quantity NUMERIC,
  total_valuation NUMERIC,
  notes TEXT,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('Draft', 'Posted', 'Cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_stock_closing_entries_org ON stock_closing_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_closing_entries_date ON stock_closing_entries(closing_date DESC);

-- Stock Closing Items
CREATE TABLE IF NOT EXISTS stock_closing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id UUID NOT NULL REFERENCES stock_closing_entries(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  closing_quantity NUMERIC NOT NULL,
  closing_rate NUMERIC NOT NULL,
  closing_value NUMERIC GENERATED ALWAYS AS (closing_quantity * closing_rate) STORED,
  batch_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_closing_items_closing ON stock_closing_items(closing_id);
CREATE INDEX IF NOT EXISTS idx_stock_closing_items_item ON stock_closing_items(item_id);

-- Stock Account Mappings
CREATE TABLE IF NOT EXISTS stock_account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  debit_account_id UUID NOT NULL REFERENCES accounts(id),
  credit_account_id UUID NOT NULL REFERENCES accounts(id),
  item_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (entry_type IN ('Material Receipt', 'Material Issue', 'Stock Transfer', 'Stock Reconciliation', 'Opening Stock'))
);

CREATE INDEX IF NOT EXISTS idx_stock_account_mappings_org ON stock_account_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_account_mappings_entry_type ON stock_account_mappings(entry_type);

-- Reception Batches
CREATE TABLE IF NOT EXISTS reception_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  harvest_id UUID REFERENCES harvest_records(id),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  crop_id UUID,
  culture_type TEXT,
  batch_code TEXT NOT NULL,
  reception_date DATE NOT NULL,
  reception_time TIME DEFAULT CURRENT_TIME,
  weight NUMERIC NOT NULL,
  weight_unit TEXT DEFAULT 'kg',
  quantity NUMERIC,
  quantity_unit TEXT,
  quality_grade TEXT,
  quality_score INTEGER,
  quality_notes TEXT,
  humidity_percentage NUMERIC,
  maturity_level TEXT,
  temperature NUMERIC,
  moisture_content NUMERIC,
  received_by UUID REFERENCES workers(id),
  quality_checked_by UUID REFERENCES workers(id),
  decision TEXT DEFAULT 'pending',
  destination_warehouse_id UUID REFERENCES warehouses(id),
  transformation_order_id UUID,
  sales_order_id UUID REFERENCES sales_orders(id),
  stock_entry_id UUID REFERENCES stock_entries(id),
  status TEXT DEFAULT 'received',
  photos JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  notes TEXT,
  lot_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CHECK (quality_grade IN ('A', 'B', 'C', 'Extra', 'First', 'Second', 'Third')),
  CHECK (quality_score >= 1 AND quality_score <= 10),
  CHECK (decision IN ('pending', 'direct_sale', 'storage', 'transformation', 'rejected')),
  CHECK (status IN ('received', 'quality_checked', 'decision_made', 'processed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_reception_batches_org ON reception_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_reception_batches_warehouse ON reception_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_reception_batches_parcel ON reception_batches(parcel_id);
CREATE INDEX IF NOT EXISTS idx_reception_batches_date ON reception_batches(reception_date DESC);

-- Add FK now that both tables exist
ALTER TABLE IF EXISTS stock_entries
  ADD CONSTRAINT fk_stock_entries_reception_batch
  FOREIGN KEY (reception_batch_id)
  REFERENCES reception_batches(id);

-- =====================================================
-- 14. SATELLITE DATA TABLES
-- =====================================================

-- Satellite AOIs
CREATE TABLE IF NOT EXISTS satellite_aois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  geometry_json JSONB,
  area_hectares NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_satellite_aois_org ON satellite_aois(organization_id);
CREATE INDEX IF NOT EXISTS idx_satellite_aois_farm ON satellite_aois(farm_id);
CREATE INDEX IF NOT EXISTS idx_satellite_aois_parcel ON satellite_aois(parcel_id);

-- Satellite Files
CREATE TABLE IF NOT EXISTS satellite_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  index VARCHAR NOT NULL,
  date DATE NOT NULL,
  filename VARCHAR NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_satellite_files_org ON satellite_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_satellite_files_parcel ON satellite_files(parcel_id);
CREATE INDEX IF NOT EXISTS idx_satellite_files_date ON satellite_files(date DESC);

-- Satellite Indices Data
CREATE TABLE IF NOT EXISTS satellite_indices_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  processing_job_id UUID,
  date DATE NOT NULL,
  index_name TEXT NOT NULL,
  mean_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  std_value NUMERIC,
  median_value NUMERIC,
  percentile_25 NUMERIC,
  percentile_75 NUMERIC,
  percentile_90 NUMERIC,
  pixel_count INTEGER,
  cloud_coverage_percentage NUMERIC,
  image_source TEXT DEFAULT 'Sentinel-2',
  geotiff_url TEXT,
  geotiff_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (index_name IN ('NDVI', 'NDRE', 'NDMI', 'MNDWI', 'GCI', 'SAVI', 'OSAVI', 'MSAVI2', 'PRI', 'MSI', 'MCARI', 'TCARI'))
);

CREATE INDEX IF NOT EXISTS idx_satellite_indices_data_org ON satellite_indices_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_satellite_indices_data_parcel ON satellite_indices_data(parcel_id);
CREATE INDEX IF NOT EXISTS idx_satellite_indices_data_date ON satellite_indices_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_satellite_indices_data_index ON satellite_indices_data(index_name);

-- Satellite Processing Jobs
CREATE TABLE IF NOT EXISTS satellite_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  job_type TEXT DEFAULT 'batch_processing',
  indices TEXT[] NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  cloud_coverage_threshold NUMERIC DEFAULT 10.0,
  scale INTEGER DEFAULT 10,
  status TEXT DEFAULT 'pending',
  progress_percentage NUMERIC DEFAULT 0,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  failed_tasks INTEGER DEFAULT 0,
  error_message TEXT,
  results_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (job_type IN ('batch_processing', 'single_parcel', 'cloud_check')),
  CHECK (cloud_coverage_threshold >= 0 AND cloud_coverage_threshold <= 100),
  CHECK (scale >= 10 AND scale <= 1000),
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_satellite_processing_jobs_org ON satellite_processing_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_satellite_processing_jobs_farm ON satellite_processing_jobs(farm_id);
CREATE INDEX IF NOT EXISTS idx_satellite_processing_jobs_parcel ON satellite_processing_jobs(parcel_id);
CREATE INDEX IF NOT EXISTS idx_satellite_processing_jobs_status ON satellite_processing_jobs(status);

-- Satellite Processing Tasks
CREATE TABLE IF NOT EXISTS satellite_processing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_job_id UUID NOT NULL REFERENCES satellite_processing_jobs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  aoi_id UUID REFERENCES satellite_aois(id),
  task_type TEXT DEFAULT 'calculate_indices',
  indices TEXT[] NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  cloud_coverage_threshold NUMERIC DEFAULT 10.0,
  scale INTEGER DEFAULT 10,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  result_data JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (task_type IN ('calculate_indices', 'export_geotiff', 'cloud_check')),
  CHECK (priority >= 1 AND priority <= 10),
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying'))
);

CREATE INDEX IF NOT EXISTS idx_satellite_processing_tasks_job ON satellite_processing_tasks(processing_job_id);
CREATE INDEX IF NOT EXISTS idx_satellite_processing_tasks_org ON satellite_processing_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_satellite_processing_tasks_parcel ON satellite_processing_tasks(parcel_id);
CREATE INDEX IF NOT EXISTS idx_satellite_processing_tasks_status ON satellite_processing_tasks(status);

-- Cloud Coverage Checks
CREATE TABLE IF NOT EXISTS cloud_coverage_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  aoi_id UUID REFERENCES satellite_aois(id),
  check_date DATE NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  max_cloud_threshold NUMERIC NOT NULL,
  has_suitable_images BOOLEAN NOT NULL,
  available_images_count INTEGER DEFAULT 0,
  suitable_images_count INTEGER DEFAULT 0,
  min_cloud_coverage NUMERIC,
  max_cloud_coverage NUMERIC,
  avg_cloud_coverage NUMERIC,
  recommended_date DATE,
  all_cloud_percentages NUMERIC[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cloud_coverage_checks_org ON cloud_coverage_checks(organization_id);
CREATE INDEX IF NOT EXISTS idx_cloud_coverage_checks_parcel ON cloud_coverage_checks(parcel_id);
CREATE INDEX IF NOT EXISTS idx_cloud_coverage_checks_date ON cloud_coverage_checks(check_date DESC);

-- =====================================================
-- 15. ANALYSES & REPORTS TABLES
-- =====================================================

-- Analyses
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  analysis_type analysis_type NOT NULL,
  analysis_date DATE NOT NULL,
  laboratory TEXT,
  data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_parcel ON analyses(parcel_id);
CREATE INDEX IF NOT EXISTS idx_analyses_type ON analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analyses_date ON analyses(analysis_date DESC);

-- Analysis Recommendations
CREATE TABLE IF NOT EXISTS analysis_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  recommendation_type TEXT,
  priority TEXT,
  title TEXT NOT NULL,
  description TEXT,
  action_items JSONB DEFAULT '[]',
  estimated_cost NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (recommendation_type IN ('fertilizer', 'amendment', 'irrigation', 'pest_management', 'general')),
  CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_analysis_recommendations_analysis ON analysis_recommendations(analysis_id);

-- Soil Analyses
CREATE TABLE IF NOT EXISTS soil_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  test_type_id UUID,
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  physical JSONB,
  chemical JSONB,
  biological JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soil_analyses_parcel ON soil_analyses(parcel_id);

-- Test Types
CREATE TABLE IF NOT EXISTS test_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parameters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parcel Reports
CREATE TABLE IF NOT EXISTS parcel_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  title TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  file_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('pending', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_parcel_reports_parcel ON parcel_reports(parcel_id);

-- =====================================================
-- 16. CROP MANAGEMENT TABLES
-- =====================================================

-- Crop Types
CREATE TABLE IF NOT EXISTS crop_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crop Categories
CREATE TABLE IF NOT EXISTS crop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES crop_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crop_categories_type ON crop_categories(type_id);

-- Crop Varieties
CREATE TABLE IF NOT EXISTS crop_varieties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES crop_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  days_to_maturity INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crop_varieties_category ON crop_varieties(category_id);

-- Crops
CREATE TABLE IF NOT EXISTS crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  variety_id UUID NOT NULL REFERENCES crop_varieties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  planting_date DATE,
  expected_harvest_date DATE,
  actual_harvest_date DATE,
  planted_area NUMERIC,
  expected_yield NUMERIC,
  actual_yield NUMERIC,
  yield_unit TEXT DEFAULT 'kg',
  status TEXT DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crops_farm ON crops(farm_id);
CREATE INDEX IF NOT EXISTS idx_crops_parcel ON crops(parcel_id);
CREATE INDEX IF NOT EXISTS idx_crops_variety ON crops(variety_id);

-- Backfill FK constraints that depend on tables created later
ALTER TABLE IF EXISTS reception_batches
  ADD CONSTRAINT fk_reception_batches_crop
  FOREIGN KEY (crop_id)
  REFERENCES crops(id);

-- Tree Categories
CREATE TABLE IF NOT EXISTS tree_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tree_categories_org ON tree_categories(organization_id);

-- Trees
CREATE TABLE IF NOT EXISTS trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES tree_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trees_category ON trees(category_id);

-- Plantation Types
CREATE TABLE IF NOT EXISTS plantation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  spacing TEXT NOT NULL,
  trees_per_ha INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plantation_types_org ON plantation_types(organization_id);

-- =====================================================
-- 17. PRODUCT & INVENTORY CATEGORIES TABLES
-- =====================================================

-- Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Subcategories
CREATE TABLE IF NOT EXISTS product_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_subcategories_category ON product_subcategories(category_id);

-- Inventory (legacy table)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  subcategory_id UUID REFERENCES product_subcategories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  unit TEXT DEFAULT 'units',
  quantity NUMERIC DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 0,
  max_stock_level NUMERIC,
  unit_cost NUMERIC,
  supplier TEXT,
  expiry_date DATE,
  location TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id),
  item_name TEXT,
  item_type TEXT,
  category TEXT,
  brand TEXT,
  cost_per_unit NUMERIC,
  batch_number TEXT,
  storage_location TEXT,
  minimum_quantity NUMERIC DEFAULT 10,
  last_purchase_date DATE,
  status TEXT DEFAULT 'available',
  supplier_id UUID REFERENCES suppliers(id),
  warehouse_id UUID REFERENCES warehouses(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_farm ON inventory(farm_id);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_org ON inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);

-- =====================================================
-- 18. COSTS & REVENUES TABLES
-- =====================================================

-- Cost Categories
CREATE TABLE IF NOT EXISTS cost_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (type IN ('labor', 'materials', 'utilities', 'equipment', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_cost_categories_org ON cost_categories(organization_id);

-- Costs
CREATE TABLE IF NOT EXISTS costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  category_id UUID REFERENCES cost_categories(id) ON DELETE SET NULL,
  cost_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  date DATE NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (cost_type IN ('labor', 'materials', 'utilities', 'equipment', 'product_application', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_costs_org ON costs(organization_id);
CREATE INDEX IF NOT EXISTS idx_costs_farm ON costs(farm_id);
CREATE INDEX IF NOT EXISTS idx_costs_parcel ON costs(parcel_id);
CREATE INDEX IF NOT EXISTS idx_costs_category ON costs(category_id);
CREATE INDEX IF NOT EXISTS idx_costs_date ON costs(date DESC);

-- Revenues
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  revenue_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  date DATE NOT NULL,
  crop_type TEXT,
  quantity NUMERIC,
  unit TEXT,
  price_per_unit NUMERIC,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (revenue_type IN ('harvest', 'subsidy', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_revenues_org ON revenues(organization_id);
CREATE INDEX IF NOT EXISTS idx_revenues_farm ON revenues(farm_id);
CREATE INDEX IF NOT EXISTS idx_revenues_parcel ON revenues(parcel_id);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(date DESC);

-- Profitability Snapshots
CREATE TABLE IF NOT EXISTS profitability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_costs NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  profit_margin NUMERIC,
  currency TEXT DEFAULT 'EUR',
  cost_breakdown JSONB,
  revenue_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profitability_snapshots_org ON profitability_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_profitability_snapshots_farm ON profitability_snapshots(farm_id);
CREATE INDEX IF NOT EXISTS idx_profitability_snapshots_parcel ON profitability_snapshots(parcel_id);

-- =====================================================
-- 19. INFRASTRUCTURE & STRUCTURES TABLES
-- =====================================================

-- Structures
CREATE TABLE IF NOT EXISTS structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  location JSONB DEFAULT '{"lat": 0, "lng": 0}',
  installation_date DATE NOT NULL,
  condition TEXT DEFAULT 'good',
  usage TEXT,
  structure_details JSONB DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (type IN ('stable', 'technical_room', 'basin', 'well')),
  CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair'))
);

CREATE INDEX IF NOT EXISTS idx_structures_org ON structures(organization_id);
CREATE INDEX IF NOT EXISTS idx_structures_farm ON structures(farm_id);

-- Utilities
CREATE TABLE IF NOT EXISTS utilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  provider TEXT,
  account_number TEXT,
  amount NUMERIC NOT NULL,
  billing_date DATE NOT NULL,
  due_date DATE,
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT,
  consumption_value NUMERIC,
  consumption_unit TEXT,
  invoice_url TEXT,
  cost_per_parcel NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly'))
);

CREATE INDEX IF NOT EXISTS idx_utilities_farm ON utilities(farm_id);
CREATE INDEX IF NOT EXISTS idx_utilities_parcel ON utilities(parcel_id);

-- =====================================================
-- 20. ROLES & PERMISSIONS TABLES
-- =====================================================

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  level INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (name IN ('system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'day_laborer', 'viewer'))
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (action IN ('create', 'read', 'update', 'delete', 'manage'))
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Role Templates
CREATE TABLE IF NOT EXISTS role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_system_template BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_templates_org ON role_templates(organization_id);

-- Role Assignments Audit
CREATE TABLE IF NOT EXISTS role_assignments_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  old_role_id UUID REFERENCES roles(id),
  new_role_id UUID NOT NULL REFERENCES roles(id),
  assigned_by UUID REFERENCES auth.users(id),
  reason TEXT,
  effective_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_assignments_audit_user ON role_assignments_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_audit_org ON role_assignments_audit(organization_id);

-- Permission Groups
CREATE TABLE IF NOT EXISTS permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Farm Management Roles
CREATE TABLE IF NOT EXISTS farm_management_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id),
  role TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farm_management_roles_farm ON farm_management_roles(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_management_roles_user ON farm_management_roles(user_id);

-- =====================================================
-- 21. AUDIT & LOGGING TABLES
-- =====================================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at DESC);

-- Financial Transactions (legacy)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  transaction_date DATE NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_farm ON financial_transactions(farm_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date DESC);

-- Livestock
CREATE TABLE IF NOT EXISTS livestock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  breed TEXT,
  count INTEGER DEFAULT 1,
  age_months INTEGER,
  health_status TEXT DEFAULT 'healthy',
  notes TEXT,
  acquired_date DATE,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livestock_farm ON livestock(farm_id);

-- Dashboard Settings
CREATE TABLE IF NOT EXISTS dashboard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  show_soil_data BOOLEAN DEFAULT true,
  show_climate_data BOOLEAN DEFAULT true,
  show_irrigation_data BOOLEAN DEFAULT true,
  show_maintenance_data BOOLEAN DEFAULT true,
  show_production_data BOOLEAN DEFAULT true,
  show_financial_data BOOLEAN DEFAULT true,
  show_stock_alerts BOOLEAN DEFAULT true,
  show_task_alerts BOOLEAN DEFAULT true,
  layout JSONB DEFAULT '{"topRow": ["soil", "climate", "irrigation", "maintenance"], "bottomRow": ["alerts", "tasks"], "middleRow": ["production", "financial"]}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_settings_user ON dashboard_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_org ON dashboard_settings(organization_id);

-- Subscription Usage
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farms_count INTEGER DEFAULT 0,
  parcels_count INTEGER DEFAULT 0,
  users_count INTEGER DEFAULT 0,
  satellite_reports_count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription ON subscription_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_org ON subscription_usage(organization_id);

-- =====================================================
-- 22. ADDITIONAL RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Work Units Policies
DROP POLICY IF EXISTS "org_read_work_units" ON work_units;
CREATE POLICY "org_read_work_units" ON work_units
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_work_units" ON work_units;
CREATE POLICY "org_write_work_units" ON work_units
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_work_units" ON work_units;
CREATE POLICY "org_update_work_units" ON work_units
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_work_units" ON work_units;
CREATE POLICY "org_delete_work_units" ON work_units
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Harvest Forecasts Policies
DROP POLICY IF EXISTS "org_read_harvest_forecasts" ON harvest_forecasts;
CREATE POLICY "org_read_harvest_forecasts" ON harvest_forecasts
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_harvest_forecasts" ON harvest_forecasts;
CREATE POLICY "org_write_harvest_forecasts" ON harvest_forecasts
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_harvest_forecasts" ON harvest_forecasts;
CREATE POLICY "org_update_harvest_forecasts" ON harvest_forecasts
  FOR UPDATE USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_harvest_forecasts" ON harvest_forecasts;
CREATE POLICY "org_delete_harvest_forecasts" ON harvest_forecasts
  FOR DELETE USING (is_organization_member(organization_id));

-- Performance Alerts Policies
DROP POLICY IF EXISTS "org_read_performance_alerts" ON performance_alerts;
CREATE POLICY "org_read_performance_alerts" ON performance_alerts
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_performance_alerts" ON performance_alerts;
CREATE POLICY "org_write_performance_alerts" ON performance_alerts
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_performance_alerts" ON performance_alerts;
CREATE POLICY "org_update_performance_alerts" ON performance_alerts
  FOR UPDATE USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_performance_alerts" ON performance_alerts;
CREATE POLICY "org_delete_performance_alerts" ON performance_alerts
  FOR DELETE USING (is_organization_member(organization_id));

-- Workers Policies
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_workers" ON workers;
CREATE POLICY "org_read_workers" ON workers
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_workers" ON workers;
CREATE POLICY "org_write_workers" ON workers
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_workers" ON workers;
CREATE POLICY "org_update_workers" ON workers
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

-- Tasks Policies
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_tasks" ON tasks;
CREATE POLICY "org_read_tasks" ON tasks
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_tasks" ON tasks;
CREATE POLICY "org_write_tasks" ON tasks
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_tasks" ON tasks;
CREATE POLICY "org_update_tasks" ON tasks
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

-- Harvest Records Policies
ALTER TABLE IF EXISTS harvest_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_harvest_records" ON harvest_records;
CREATE POLICY "org_read_harvest_records" ON harvest_records
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_harvest_records" ON harvest_records;
CREATE POLICY "org_write_harvest_records" ON harvest_records
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

-- Deliveries Policies
ALTER TABLE IF EXISTS deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_deliveries" ON deliveries;
CREATE POLICY "org_read_deliveries" ON deliveries
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_deliveries" ON deliveries;
CREATE POLICY "org_write_deliveries" ON deliveries
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

-- Item Groups Policies
DROP POLICY IF EXISTS "org_read_item_groups" ON item_groups;
CREATE POLICY "org_read_item_groups" ON item_groups
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_item_groups" ON item_groups;
CREATE POLICY "org_write_item_groups" ON item_groups
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_item_groups" ON item_groups;
CREATE POLICY "org_update_item_groups" ON item_groups
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_item_groups" ON item_groups;
CREATE POLICY "org_delete_item_groups" ON item_groups
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Items Policies
DROP POLICY IF EXISTS "org_read_items" ON items;
CREATE POLICY "org_read_items" ON items
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_items" ON items;
CREATE POLICY "org_write_items" ON items
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_items" ON items;
CREATE POLICY "org_update_items" ON items
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_items" ON items;
CREATE POLICY "org_delete_items" ON items
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Inventory Items Policies
ALTER TABLE IF EXISTS inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_inventory_items" ON inventory_items;
CREATE POLICY "org_read_inventory_items" ON inventory_items
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_inventory_items" ON inventory_items;
CREATE POLICY "org_write_inventory_items" ON inventory_items
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

-- Stock Entries Policies
ALTER TABLE IF EXISTS stock_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_stock_entries" ON stock_entries;
CREATE POLICY "org_read_stock_entries" ON stock_entries
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_stock_entries" ON stock_entries;
CREATE POLICY "org_write_stock_entries" ON stock_entries
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

-- Reception Batches Policies
ALTER TABLE IF EXISTS reception_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_reception_batches" ON reception_batches;
CREATE POLICY "org_read_reception_batches" ON reception_batches
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_reception_batches" ON reception_batches;
CREATE POLICY "org_write_reception_batches" ON reception_batches
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

-- Satellite Tables Policies
ALTER TABLE IF EXISTS satellite_aois ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS satellite_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS satellite_indices_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS satellite_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS satellite_processing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cloud_coverage_checks ENABLE ROW LEVEL SECURITY;

-- Add similar RLS policies for all satellite tables (following same pattern as above)
DROP POLICY IF EXISTS "org_read_satellite_aois" ON satellite_aois;
CREATE POLICY "org_read_satellite_aois" ON satellite_aois
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

-- Enable RLS on all remaining tables
ALTER TABLE IF EXISTS harvest_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS day_laborers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS metayage_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_entry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_valuation ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_closing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_closing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE soil_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcel_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE profitability_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_management_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 23. ADDITIONAL TRIGGERS FOR UPDATED_AT
-- =====================================================

DROP TRIGGER IF EXISTS trg_workers_updated_at ON workers;
CREATE TRIGGER trg_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_harvest_records_updated_at ON harvest_records;
CREATE TRIGGER trg_harvest_records_updated_at
  BEFORE UPDATE ON harvest_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_deliveries_updated_at ON deliveries;
CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_stock_entries_updated_at ON stock_entries;
CREATE TRIGGER trg_stock_entries_updated_at
  BEFORE UPDATE ON stock_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF SCHEMA
-- =====================================================
-- NOTE: This schema includes all tables from the remote database
-- All CREATE statements are idempotent (use IF NOT EXISTS, OR REPLACE, etc.)
-- =====================================================

-- Seed default roles
-- This migration creates the standard role hierarchy for the application

-- Insert roles (using ON CONFLICT to make it idempotent)
INSERT INTO roles (name, display_name, description, level, is_active) VALUES
  ('system_admin', 'System Administrator', 'Full system access across all organizations', 1, true),
  ('organization_admin', 'Organization Admin', 'Full access within their organization', 2, true),
  ('farm_manager', 'Farm Manager', 'Manage specific farms and their operations', 3, true),
  ('farm_worker', 'Farm Worker', 'Access to assigned tasks and farm operations', 4, true),
  ('day_laborer', 'Day Laborer', 'Limited access for temporary workers', 5, true),
  ('viewer', 'Viewer', 'Read-only access to information', 6, true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
-- Fix the stock entry posting trigger to use SECURITY DEFINER to bypass RLS
DROP FUNCTION IF EXISTS process_stock_entry_posting() CASCADE;

CREATE OR REPLACE FUNCTION process_stock_entry_posting()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  entry_item RECORD;
  movement_type TEXT;
BEGIN
  -- Only process when status changes to 'Posted'
  IF NEW.status = 'Posted' AND (OLD.status IS NULL OR OLD.status != 'Posted') THEN

    -- Set posted timestamp
    NEW.posted_at = NOW();

    -- Determine movement type based on entry type
    CASE NEW.entry_type
      WHEN 'Material Receipt' THEN
        movement_type := 'IN';
      WHEN 'Material Issue' THEN
        movement_type := 'OUT';
      WHEN 'Stock Transfer' THEN
        movement_type := 'TRANSFER';
      WHEN 'Stock Reconciliation' THEN
        movement_type := 'RECONCILIATION';
      ELSE
        movement_type := 'OTHER';
    END CASE;

    -- Create stock movements for each item
    FOR entry_item IN
      SELECT * FROM stock_entry_items WHERE stock_entry_id = NEW.id
    LOOP
      -- For Material Receipt: add to target warehouse
      IF NEW.entry_type = 'Material Receipt' AND NEW.to_warehouse_id IS NOT NULL THEN
        INSERT INTO stock_movements (
          organization_id,
          item_id,
          warehouse_id,
          movement_type,
          movement_date,
          quantity,
          unit,
          balance_quantity,
          cost_per_unit,
          total_cost,
          stock_entry_id,
          stock_entry_item_id,
          batch_number,
          serial_number
        ) VALUES (
          NEW.organization_id,
          entry_item.item_id,
          NEW.to_warehouse_id,
          'IN',
          NEW.entry_date,
          entry_item.quantity,
          entry_item.unit,
          entry_item.quantity,
          entry_item.cost_per_unit,
          entry_item.quantity * COALESCE(entry_item.cost_per_unit, 0),
          NEW.id,
          entry_item.id,
          entry_item.batch_number,
          entry_item.serial_number
        );

        -- Add to stock valuation
        INSERT INTO stock_valuation (
          organization_id,
          item_id,
          warehouse_id,
          quantity,
          cost_per_unit,
          stock_entry_id,
          batch_number,
          serial_number,
          remaining_quantity
        ) VALUES (
          NEW.organization_id,
          entry_item.item_id,
          NEW.to_warehouse_id,
          entry_item.quantity,
          COALESCE(entry_item.cost_per_unit, 0),
          NEW.id,
          entry_item.batch_number,
          entry_item.serial_number,
          entry_item.quantity
        );
      END IF;

      -- For Material Issue: remove from source warehouse
      IF NEW.entry_type = 'Material Issue' AND NEW.from_warehouse_id IS NOT NULL THEN
        INSERT INTO stock_movements (
          organization_id,
          item_id,
          warehouse_id,
          movement_type,
          movement_date,
          quantity,
          unit,
          balance_quantity,
          cost_per_unit,
          total_cost,
          stock_entry_id,
          stock_entry_item_id,
          batch_number,
          serial_number
        ) VALUES (
          NEW.organization_id,
          entry_item.item_id,
          NEW.from_warehouse_id,
          'OUT',
          NEW.entry_date,
          -entry_item.quantity,
          entry_item.unit,
          -entry_item.quantity,
          entry_item.cost_per_unit,
          -entry_item.quantity * COALESCE(entry_item.cost_per_unit, 0),
          NEW.id,
          entry_item.id,
          entry_item.batch_number,
          entry_item.serial_number
        );

        -- TODO: Consume from stock valuation (FIFO/LIFO logic)
      END IF;

      -- For Stock Transfer: OUT from source, IN to target
      IF NEW.entry_type = 'Stock Transfer' AND NEW.from_warehouse_id IS NOT NULL AND NEW.to_warehouse_id IS NOT NULL THEN
        -- OUT from source
        INSERT INTO stock_movements (
          organization_id,
          item_id,
          warehouse_id,
          movement_type,
          movement_date,
          quantity,
          unit,
          balance_quantity,
          cost_per_unit,
          total_cost,
          stock_entry_id,
          stock_entry_item_id,
          batch_number,
          serial_number
        ) VALUES (
          NEW.organization_id,
          entry_item.item_id,
          NEW.from_warehouse_id,
          'TRANSFER',
          NEW.entry_date,
          -entry_item.quantity,
          entry_item.unit,
          -entry_item.quantity,
          entry_item.cost_per_unit,
          -entry_item.quantity * COALESCE(entry_item.cost_per_unit, 0),
          NEW.id,
          entry_item.id,
          entry_item.batch_number,
          entry_item.serial_number
        );

        -- IN to target
        INSERT INTO stock_movements (
          organization_id,
          item_id,
          warehouse_id,
          movement_type,
          movement_date,
          quantity,
          unit,
          balance_quantity,
          cost_per_unit,
          total_cost,
          stock_entry_id,
          stock_entry_item_id,
          batch_number,
          serial_number
        ) VALUES (
          NEW.organization_id,
          entry_item.item_id,
          NEW.to_warehouse_id,
          'TRANSFER',
          NEW.entry_date,
          entry_item.quantity,
          entry_item.unit,
          entry_item.quantity,
          entry_item.cost_per_unit,
          entry_item.quantity * COALESCE(entry_item.cost_per_unit, 0),
          NEW.id,
          entry_item.id,
          entry_item.batch_number,
          entry_item.serial_number
        );
      END IF;

    END LOOP;

  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS stock_entry_posting_trigger ON stock_entries;

CREATE TRIGGER stock_entry_posting_trigger
  BEFORE UPDATE ON stock_entries
  FOR EACH ROW
  EXECUTE FUNCTION process_stock_entry_posting();

-- Add comment
COMMENT ON FUNCTION process_stock_entry_posting() IS
  'Automatically creates stock movements and updates inventory when a stock entry is posted. Uses SECURITY DEFINER to bypass RLS.';
