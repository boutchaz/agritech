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
  first_name VARCHAR(255),
  last_name VARCHAR(255),
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
  ('EUR', 'Euro', '€'),
  ('GBP', 'British Pound', '£'),
  ('TND', 'Tunisian Dinar', 'د.ت')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- MULTI-COUNTRY ACCOUNTING SYSTEM
-- =====================================================

-- Update organizations table with country-specific accounting fields
DO $$
BEGIN
  -- Add country_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'country_code'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN country_code VARCHAR(2);  -- ISO 3166-1 alpha-2
  END IF;

  -- Add accounting_standard column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organizations'
    AND column_name = 'accounting_standard'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN accounting_standard VARCHAR(50);
  END IF;

  -- Set default values for existing organizations (France)
  UPDATE organizations
  SET country_code = 'FR',
      accounting_standard = 'PCG'
  WHERE country_code IS NULL;
END $$;

-- Account Templates: Pre-configured chart of accounts for each country/standard
CREATE TABLE IF NOT EXISTS account_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL,  -- ISO country code (MA, FR, TN, US, GB)
  accounting_standard VARCHAR(50) NOT NULL,  -- PCG, PCEC, PCN, GAAP, FRS102
  template_name VARCHAR(255) NOT NULL,
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,  -- asset, liability, equity, revenue, expense
  account_subtype VARCHAR(50),
  parent_code VARCHAR(50),  -- References another account_code in same template
  description TEXT,
  is_group BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  metadata JSONB,  -- Flexible field for country-specific attributes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_code, accounting_standard, account_code)
);

CREATE INDEX IF NOT EXISTS idx_account_templates_country ON account_templates(country_code);
CREATE INDEX IF NOT EXISTS idx_account_templates_standard ON account_templates(accounting_standard);
CREATE INDEX IF NOT EXISTS idx_account_templates_code ON account_templates(country_code, accounting_standard, account_code);

COMMENT ON TABLE account_templates IS 'Pre-configured chart of accounts templates for different countries and accounting standards';

-- Account Mappings: Maps business operations to country-specific account codes
CREATE TABLE IF NOT EXISTS account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL,
  accounting_standard VARCHAR(50) NOT NULL,
  mapping_type VARCHAR(50) NOT NULL,  -- 'cost_type', 'revenue_type', 'cash', etc.
  mapping_key VARCHAR(100) NOT NULL,  -- 'labor', 'harvest', 'bank', etc.
  account_code VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_code, accounting_standard, mapping_type, mapping_key)
);

CREATE INDEX IF NOT EXISTS idx_account_mappings_lookup ON account_mappings(country_code, accounting_standard, mapping_type, mapping_key);

COMMENT ON TABLE account_mappings IS 'Maps generic business operations to country-specific account codes for automatic journal entry creation';

-- =====================================================
-- SEED ACCOUNT TEMPLATES FOR ALL COUNTRIES
-- =====================================================

-- Morocco (PCEC - Plan Comptable des Établissements de Crédit adapted for agriculture)
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order, description) VALUES
  -- Class 1: Financement permanent
  ('MA', 'PCEC', 'Financement permanent', '1', 'Financement permanent', 'equity', true, 10, 'Permanent financing'),
  ('MA', 'PCEC', 'Capital social', '111', 'Capital social', 'equity', false, 11, 'Share capital'),
  ('MA', 'PCEC', 'Réserves', '112', 'Réserves', 'equity', false, 12, 'Reserves'),
  ('MA', 'PCEC', 'Report à nouveau', '116', 'Report à nouveau', 'equity', false, 13, 'Retained earnings'),

  -- Class 2: Actif immobilisé
  ('MA', 'PCEC', 'Actif immobilisé', '2', 'Actif immobilisé', 'asset', true, 20, 'Fixed assets'),
  ('MA', 'PCEC', 'Terrains', '231', 'Terrains', 'asset', false, 21, 'Land'),
  ('MA', 'PCEC', 'Constructions', '232', 'Constructions', 'asset', false, 22, 'Buildings'),
  ('MA', 'PCEC', 'Matériel et outillage agricole', '233', 'Matériel et outillage agricole', 'asset', false, 23, 'Agricultural equipment and tools'),
  ('MA', 'PCEC', 'Autres immobilisations corporelles', '238', 'Autres immobilisations corporelles', 'asset', false, 24, 'Other tangible fixed assets'),

  -- Class 3: Actif circulant
  ('MA', 'PCEC', 'Actif circulant', '3', 'Actif circulant', 'asset', true, 30, 'Current assets'),
  ('MA', 'PCEC', 'Stocks de matières premières', '311', 'Stocks de matières premières', 'asset', false, 31, 'Raw materials inventory'),
  ('MA', 'PCEC', 'Stocks de produits en cours', '313', 'Stocks de produits en cours', 'asset', false, 32, 'Work in progress inventory'),
  ('MA', 'PCEC', 'Stocks de produits finis', '315', 'Stocks de produits finis', 'asset', false, 33, 'Finished goods inventory'),
  ('MA', 'PCEC', 'Clients et comptes rattachés', '342', 'Clients et comptes rattachés', 'asset', false, 34, 'Accounts receivable'),

  -- Class 4: Passif circulant
  ('MA', 'PCEC', 'Passif circulant', '4', 'Passif circulant', 'liability', true, 40, 'Current liabilities'),
  ('MA', 'PCEC', 'Fournisseurs et comptes rattachés', '441', 'Fournisseurs et comptes rattachés', 'liability', false, 41, 'Accounts payable'),
  ('MA', 'PCEC', 'Organismes sociaux', '443', 'Organismes sociaux', 'liability', false, 42, 'Social security'),
  ('MA', 'PCEC', 'État - Impôts et taxes', '445', 'État - Impôts et taxes', 'liability', false, 43, 'State - Taxes'),

  -- Class 5: Trésorerie
  ('MA', 'PCEC', 'Trésorerie', '5', 'Trésorerie', 'asset', true, 50, 'Cash and cash equivalents'),
  ('MA', 'PCEC', 'Caisse', '511', 'Caisse', 'asset', false, 51, 'Cash'),
  ('MA', 'PCEC', 'Banques', '514', 'Banques', 'asset', false, 52, 'Banks'),

  -- Class 6: Charges
  ('MA', 'PCEC', 'Charges', '6', 'Charges', 'expense', true, 60, 'Expenses'),
  ('MA', 'PCEC', 'Achats de matières premières', '611', 'Achats de matières premières', 'expense', false, 61, 'Purchases of raw materials'),
  ('MA', 'PCEC', 'Achats de fournitures', '612', 'Achats de fournitures', 'expense', false, 62, 'Purchases of supplies'),
  ('MA', 'PCEC', 'Achats de produits agricoles', '613', 'Achats de produits agricoles', 'expense', false, 63, 'Purchases of agricultural products'),
  ('MA', 'PCEC', 'Achats de matériel et outillage', '617', 'Achats de matériel et outillage', 'expense', false, 64, 'Purchases of equipment and tools'),
  ('MA', 'PCEC', 'Autres achats', '618', 'Autres achats', 'expense', false, 65, 'Other purchases'),
  ('MA', 'PCEC', 'Charges de personnel', '621', 'Charges de personnel', 'expense', false, 66, 'Staff costs'),
  ('MA', 'PCEC', 'Cotisations sociales', '622', 'Cotisations sociales', 'expense', false, 67, 'Social security contributions'),
  ('MA', 'PCEC', 'Impôts et taxes', '631', 'Impôts et taxes', 'expense', false, 68, 'Taxes'),
  ('MA', 'PCEC', 'Charges d''intérêts', '641', 'Charges d''intérêts', 'expense', false, 69, 'Interest charges'),

  -- Class 7: Produits
  ('MA', 'PCEC', 'Produits', '7', 'Produits', 'revenue', true, 70, 'Revenue'),
  ('MA', 'PCEC', 'Ventes de produits agricoles', '711', 'Ventes de produits agricoles', 'revenue', false, 71, 'Sales of agricultural products'),
  ('MA', 'PCEC', 'Ventes de produits transformés', '712', 'Ventes de produits transformés', 'revenue', false, 72, 'Sales of processed products'),
  ('MA', 'PCEC', 'Prestations de services', '713', 'Prestations de services', 'revenue', false, 73, 'Services'),
  ('MA', 'PCEC', 'Autres produits d''exploitation', '718', 'Autres produits d''exploitation', 'revenue', false, 74, 'Other operating income'),
  ('MA', 'PCEC', 'Subventions d''exploitation', '751', 'Subventions d''exploitation', 'revenue', false, 75, 'Operating subsidies')
ON CONFLICT (country_code, accounting_standard, account_code) DO NOTHING;

-- Tunisia (PCN - Plan Comptable National)
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order, description) VALUES
  -- Class 1: Capitaux propres
  ('TN', 'PCN', 'Capitaux propres', '1', 'Capitaux propres', 'equity', true, 10, 'Equity'),
  ('TN', 'PCN', 'Capital social', '101', 'Capital social', 'equity', false, 11, 'Share capital'),
  ('TN', 'PCN', 'Réserves', '106', 'Réserves', 'equity', false, 12, 'Reserves'),
  ('TN', 'PCN', 'Report à nouveau', '110', 'Report à nouveau', 'equity', false, 13, 'Retained earnings'),

  -- Class 2: Immobilisations
  ('TN', 'PCN', 'Immobilisations', '2', 'Immobilisations', 'asset', true, 20, 'Fixed assets'),
  ('TN', 'PCN', 'Terrains', '221', 'Terrains', 'asset', false, 21, 'Land'),
  ('TN', 'PCN', 'Constructions', '223', 'Constructions', 'asset', false, 22, 'Buildings'),
  ('TN', 'PCN', 'Autres immobilisations corporelles', '228', 'Autres immobilisations corporelles', 'asset', false, 23, 'Other tangible assets'),
  ('TN', 'PCN', 'Matériel agricole', '231', 'Matériel agricole', 'asset', false, 24, 'Agricultural equipment'),

  -- Class 3: Stocks
  ('TN', 'PCN', 'Stocks', '3', 'Stocks', 'asset', true, 30, 'Inventory'),
  ('TN', 'PCN', 'Matières premières', '31', 'Matières premières', 'asset', false, 31, 'Raw materials'),
  ('TN', 'PCN', 'Autres approvisionnements', '32', 'Autres approvisionnements', 'asset', false, 32, 'Other supplies'),
  ('TN', 'PCN', 'Stocks de produits finis', '35', 'Stocks de produits finis', 'asset', false, 33, 'Finished goods'),

  -- Class 4: Tiers
  ('TN', 'PCN', 'Tiers', '4', 'Tiers', 'asset', true, 40, 'Third parties'),
  ('TN', 'PCN', 'Fournisseurs', '401', 'Fournisseurs', 'liability', false, 41, 'Suppliers'),
  ('TN', 'PCN', 'Clients', '411', 'Clients', 'asset', false, 42, 'Customers'),
  ('TN', 'PCN', 'Personnel', '421', 'Personnel', 'liability', false, 43, 'Personnel'),
  ('TN', 'PCN', 'Sécurité sociale', '431', 'Sécurité sociale', 'liability', false, 44, 'Social security'),
  ('TN', 'PCN', 'État', '441', 'État', 'liability', false, 45, 'State'),

  -- Class 5: Financiers
  ('TN', 'PCN', 'Financiers', '5', 'Financiers', 'asset', true, 50, 'Financial accounts'),
  ('TN', 'PCN', 'Banques', '53', 'Banques', 'asset', false, 51, 'Banks'),

  -- Class 6: Charges
  ('TN', 'PCN', 'Charges', '6', 'Charges', 'expense', true, 60, 'Expenses'),
  ('TN', 'PCN', 'Achats de marchandises', '601', 'Achats de marchandises', 'expense', false, 61, 'Purchases of goods'),
  ('TN', 'PCN', 'Achats de fournitures', '604', 'Achats de fournitures', 'expense', false, 62, 'Purchases of supplies'),
  ('TN', 'PCN', 'Autres achats', '608', 'Autres achats', 'expense', false, 63, 'Other purchases'),
  ('TN', 'PCN', 'Frais de personnel', '621', 'Frais de personnel', 'expense', false, 64, 'Personnel costs'),
  ('TN', 'PCN', 'Impôts et taxes', '635', 'Impôts et taxes', 'expense', false, 65, 'Taxes'),

  -- Class 7: Produits
  ('TN', 'PCN', 'Produits', '7', 'Produits', 'revenue', true, 70, 'Revenue'),
  ('TN', 'PCN', 'Ventes de produits finis', '701', 'Ventes de produits finis', 'revenue', false, 71, 'Sales of finished products'),
  ('TN', 'PCN', 'Autres produits', '708', 'Autres produits', 'revenue', false, 72, 'Other revenue'),
  ('TN', 'PCN', 'Subventions d''exploitation', '74', 'Subventions d''exploitation', 'revenue', false, 73, 'Operating subsidies')
ON CONFLICT (country_code, accounting_standard, account_code) DO NOTHING;

-- USA (GAAP - Generally Accepted Accounting Principles)
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order, description) VALUES
  -- Assets
  ('US', 'GAAP', 'Cash', '1000', 'Cash and Cash Equivalents', 'asset', false, 10, 'Cash and cash equivalents'),
  ('US', 'GAAP', 'Receivables', '1100', 'Accounts Receivable', 'asset', false, 11, 'Accounts receivable'),
  ('US', 'GAAP', 'Inventory - Raw', '1200', 'Inventory - Raw Materials', 'asset', false, 12, 'Raw materials inventory'),
  ('US', 'GAAP', 'Inventory - WIP', '1210', 'Inventory - Work in Progress', 'asset', false, 13, 'Work in progress inventory'),
  ('US', 'GAAP', 'Inventory - Finished', '1220', 'Inventory - Finished Goods', 'asset', false, 14, 'Finished goods inventory'),
  ('US', 'GAAP', 'Land', '1500', 'Land', 'asset', false, 15, 'Land'),
  ('US', 'GAAP', 'Buildings', '1510', 'Buildings', 'asset', false, 16, 'Buildings'),
  ('US', 'GAAP', 'Equipment', '1520', 'Equipment', 'asset', false, 17, 'Equipment'),
  ('US', 'GAAP', 'Accumulated Depreciation', '1600', 'Accumulated Depreciation', 'asset', false, 18, 'Accumulated depreciation'),

  -- Liabilities
  ('US', 'GAAP', 'Accounts Payable', '2000', 'Accounts Payable', 'liability', false, 20, 'Accounts payable'),
  ('US', 'GAAP', 'Accrued Expenses', '2100', 'Accrued Expenses', 'liability', false, 21, 'Accrued expenses'),
  ('US', 'GAAP', 'Payroll Liabilities', '2200', 'Payroll Liabilities', 'liability', false, 22, 'Payroll liabilities'),
  ('US', 'GAAP', 'Long-term Debt', '2500', 'Long-term Debt', 'liability', false, 23, 'Long-term debt'),

  -- Equity
  ('US', 'GAAP', 'Owner Capital', '3000', 'Owner''s Capital', 'equity', false, 30, 'Owner''s capital'),
  ('US', 'GAAP', 'Retained Earnings', '3100', 'Retained Earnings', 'equity', false, 31, 'Retained earnings'),

  -- Revenue
  ('US', 'GAAP', 'Sales - Agricultural', '4000', 'Sales Revenue - Agricultural Products', 'revenue', false, 40, 'Sales of agricultural products'),
  ('US', 'GAAP', 'Sales - Processed', '4100', 'Sales Revenue - Processed Products', 'revenue', false, 41, 'Sales of processed products'),
  ('US', 'GAAP', 'Service Revenue', '4200', 'Service Revenue', 'revenue', false, 42, 'Service revenue'),
  ('US', 'GAAP', 'Other Revenue', '4900', 'Other Revenue', 'revenue', false, 43, 'Other revenue'),
  ('US', 'GAAP', 'Government Subsidies', '4950', 'Government Subsidies', 'revenue', false, 44, 'Government subsidies'),

  -- COGS
  ('US', 'GAAP', 'COGS', '5000', 'Cost of Goods Sold', 'expense', false, 50, 'Cost of goods sold'),

  -- Expenses
  ('US', 'GAAP', 'Wages', '6000', 'Wages and Salaries', 'expense', false, 60, 'Wages and salaries'),
  ('US', 'GAAP', 'Payroll Taxes', '6100', 'Payroll Taxes', 'expense', false, 61, 'Payroll taxes'),
  ('US', 'GAAP', 'Materials', '6200', 'Materials and Supplies', 'expense', false, 62, 'Materials and supplies'),
  ('US', 'GAAP', 'Utilities', '6300', 'Utilities', 'expense', false, 63, 'Utilities'),
  ('US', 'GAAP', 'Equipment Rental', '6400', 'Equipment Rental', 'expense', false, 64, 'Equipment rental'),
  ('US', 'GAAP', 'Repairs', '6500', 'Repairs and Maintenance', 'expense', false, 65, 'Repairs and maintenance'),
  ('US', 'GAAP', 'Other Expenses', '6900', 'Other Operating Expenses', 'expense', false, 66, 'Other operating expenses')
ON CONFLICT (country_code, accounting_standard, account_code) DO NOTHING;

-- UK (FRS 102 - UK Generally Accepted Accounting Practice)
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order, description) VALUES
  -- Non-current Assets
  ('GB', 'FRS102', 'Land and Buildings', '0010', 'Land and Buildings', 'asset', false, 10, 'Land and buildings'),
  ('GB', 'FRS102', 'Plant and Machinery', '0020', 'Plant and Machinery', 'asset', false, 11, 'Plant and machinery'),
  ('GB', 'FRS102', 'Motor Vehicles', '0030', 'Motor Vehicles', 'asset', false, 12, 'Motor vehicles'),
  ('GB', 'FRS102', 'Office Equipment', '0040', 'Office Equipment', 'asset', false, 13, 'Office equipment'),

  -- Current Assets
  ('GB', 'FRS102', 'Stock - Raw', '1000', 'Stock - Raw Materials', 'asset', false, 20, 'Stock of raw materials'),
  ('GB', 'FRS102', 'Stock - WIP', '1010', 'Stock - Work in Progress', 'asset', false, 21, 'Stock work in progress'),
  ('GB', 'FRS102', 'Stock - Finished', '1020', 'Stock - Finished Goods', 'asset', false, 22, 'Stock of finished goods'),
  ('GB', 'FRS102', 'Trade Debtors', '1100', 'Trade Debtors', 'asset', false, 23, 'Trade debtors'),
  ('GB', 'FRS102', 'Bank Current', '1200', 'Bank Current Account', 'asset', false, 24, 'Bank current account'),
  ('GB', 'FRS102', 'Bank Deposit', '1210', 'Bank Deposit Account', 'asset', false, 25, 'Bank deposit account'),
  ('GB', 'FRS102', 'Cash', '1220', 'Cash in Hand', 'asset', false, 26, 'Cash in hand'),

  -- Current Liabilities
  ('GB', 'FRS102', 'Trade Creditors', '2100', 'Trade Creditors', 'liability', false, 30, 'Trade creditors'),
  ('GB', 'FRS102', 'PAYE and NI', '2200', 'PAYE and NI', 'liability', false, 31, 'PAYE and National Insurance'),
  ('GB', 'FRS102', 'VAT', '2210', 'VAT', 'liability', false, 32, 'VAT'),
  ('GB', 'FRS102', 'Corporation Tax', '2300', 'Corporation Tax', 'liability', false, 33, 'Corporation tax'),

  -- Long-term Liabilities
  ('GB', 'FRS102', 'Bank Loans', '3000', 'Bank Loans', 'liability', false, 40, 'Bank loans'),

  -- Capital and Reserves
  ('GB', 'FRS102', 'Share Capital', '4000', 'Share Capital', 'equity', false, 50, 'Share capital'),
  ('GB', 'FRS102', 'Retained Earnings', '4100', 'Retained Earnings', 'equity', false, 51, 'Retained earnings'),

  -- Sales
  ('GB', 'FRS102', 'Sales - Agricultural', '5000', 'Sales - Agricultural Products', 'revenue', false, 60, 'Sales of agricultural products'),
  ('GB', 'FRS102', 'Sales - Processed', '5100', 'Sales - Processed Goods', 'revenue', false, 61, 'Sales of processed goods'),
  ('GB', 'FRS102', 'Other Income', '5200', 'Other Income', 'revenue', false, 62, 'Other income'),
  ('GB', 'FRS102', 'Government Grants', '5900', 'Government Grants', 'revenue', false, 63, 'Government grants'),

  -- Direct Costs
  ('GB', 'FRS102', 'Purchases - Raw', '6000', 'Purchases - Raw Materials', 'expense', false, 70, 'Purchases of raw materials'),
  ('GB', 'FRS102', 'Purchases - Consumables', '6100', 'Purchases - Consumables', 'expense', false, 71, 'Purchases of consumables'),

  -- Overheads
  ('GB', 'FRS102', 'Wages', '7000', 'Wages and Salaries', 'expense', false, 80, 'Wages and salaries'),
  ('GB', 'FRS102', 'Employer NI', '7100', 'Employer''s NI', 'expense', false, 81, 'Employer''s National Insurance'),
  ('GB', 'FRS102', 'Rent and Rates', '7200', 'Rent and Rates', 'expense', false, 82, 'Rent and rates'),
  ('GB', 'FRS102', 'Light and Heat', '7300', 'Light and Heat', 'expense', false, 83, 'Light and heat'),
  ('GB', 'FRS102', 'Motor Expenses', '7400', 'Motor Expenses', 'expense', false, 84, 'Motor expenses'),
  ('GB', 'FRS102', 'Repairs', '7500', 'Repairs and Renewals', 'expense', false, 85, 'Repairs and renewals'),
  ('GB', 'FRS102', 'Sundry Expenses', '7900', 'Sundry Expenses', 'expense', false, 86, 'Sundry expenses')
ON CONFLICT (country_code, accounting_standard, account_code) DO NOTHING;

-- =====================================================
-- SEED ACCOUNT MAPPINGS FOR ALL COUNTRIES
-- =====================================================

-- Morocco (PCEC) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('MA', 'PCEC', 'cost_type', 'labor', '621', 'Labor costs mapped to Personnel costs'),
  ('MA', 'PCEC', 'cost_type', 'materials', '611', 'Materials mapped to Raw materials purchases'),
  ('MA', 'PCEC', 'cost_type', 'utilities', '612', 'Utilities mapped to Supplies purchases'),
  ('MA', 'PCEC', 'cost_type', 'equipment', '617', 'Equipment mapped to Equipment purchases'),
  ('MA', 'PCEC', 'cost_type', 'product_application', '612', 'Product application mapped to Supplies'),
  ('MA', 'PCEC', 'cost_type', 'other', '618', 'Other costs mapped to Other purchases'),
  ('MA', 'PCEC', 'revenue_type', 'harvest', '711', 'Harvest revenue mapped to Agricultural product sales'),
  ('MA', 'PCEC', 'revenue_type', 'subsidy', '751', 'Subsidy mapped to Operating subsidies'),
  ('MA', 'PCEC', 'revenue_type', 'other', '718', 'Other revenue mapped to Other operating income'),
  ('MA', 'PCEC', 'cash', 'bank', '514', 'Bank account'),
  ('MA', 'PCEC', 'cash', 'cash', '511', 'Cash account')
ON CONFLICT (country_code, accounting_standard, mapping_type, mapping_key) DO NOTHING;

-- Tunisia (PCN) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('TN', 'PCN', 'cost_type', 'labor', '621', 'Labor costs mapped to Personnel costs'),
  ('TN', 'PCN', 'cost_type', 'materials', '601', 'Materials mapped to Goods purchases'),
  ('TN', 'PCN', 'cost_type', 'utilities', '604', 'Utilities mapped to Supplies purchases'),
  ('TN', 'PCN', 'cost_type', 'equipment', '604', 'Equipment mapped to Supplies purchases'),
  ('TN', 'PCN', 'cost_type', 'product_application', '604', 'Product application mapped to Supplies'),
  ('TN', 'PCN', 'cost_type', 'other', '608', 'Other costs mapped to Other purchases'),
  ('TN', 'PCN', 'revenue_type', 'harvest', '701', 'Harvest revenue mapped to Finished product sales'),
  ('TN', 'PCN', 'revenue_type', 'subsidy', '74', 'Subsidy mapped to Operating subsidies'),
  ('TN', 'PCN', 'revenue_type', 'other', '708', 'Other revenue mapped to Other revenue'),
  ('TN', 'PCN', 'cash', 'bank', '53', 'Bank account'),
  ('TN', 'PCN', 'cash', 'cash', '53', 'Cash account')
ON CONFLICT (country_code, accounting_standard, mapping_type, mapping_key) DO NOTHING;

-- USA (GAAP) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('US', 'GAAP', 'cost_type', 'labor', '6000', 'Labor costs mapped to Wages and Salaries'),
  ('US', 'GAAP', 'cost_type', 'materials', '6200', 'Materials mapped to Materials and Supplies'),
  ('US', 'GAAP', 'cost_type', 'utilities', '6300', 'Utilities mapped to Utilities'),
  ('US', 'GAAP', 'cost_type', 'equipment', '6500', 'Equipment mapped to Repairs and Maintenance'),
  ('US', 'GAAP', 'cost_type', 'product_application', '6200', 'Product application mapped to Materials and Supplies'),
  ('US', 'GAAP', 'cost_type', 'other', '6900', 'Other costs mapped to Other Operating Expenses'),
  ('US', 'GAAP', 'revenue_type', 'harvest', '4000', 'Harvest revenue mapped to Agricultural product sales'),
  ('US', 'GAAP', 'revenue_type', 'subsidy', '4950', 'Subsidy mapped to Government Subsidies'),
  ('US', 'GAAP', 'revenue_type', 'other', '4900', 'Other revenue mapped to Other Revenue'),
  ('US', 'GAAP', 'cash', 'bank', '1000', 'Cash and Cash Equivalents'),
  ('US', 'GAAP', 'cash', 'cash', '1000', 'Cash and Cash Equivalents')
ON CONFLICT (country_code, accounting_standard, mapping_type, mapping_key) DO NOTHING;

-- UK (FRS 102) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('GB', 'FRS102', 'cost_type', 'labor', '7000', 'Labor costs mapped to Wages and Salaries'),
  ('GB', 'FRS102', 'cost_type', 'materials', '6000', 'Materials mapped to Raw Materials purchases'),
  ('GB', 'FRS102', 'cost_type', 'utilities', '7300', 'Utilities mapped to Light and Heat'),
  ('GB', 'FRS102', 'cost_type', 'equipment', '7500', 'Equipment mapped to Repairs and Renewals'),
  ('GB', 'FRS102', 'cost_type', 'product_application', '6100', 'Product application mapped to Consumables'),
  ('GB', 'FRS102', 'cost_type', 'other', '7900', 'Other costs mapped to Sundry Expenses'),
  ('GB', 'FRS102', 'revenue_type', 'harvest', '5000', 'Harvest revenue mapped to Agricultural product sales'),
  ('GB', 'FRS102', 'revenue_type', 'subsidy', '5900', 'Subsidy mapped to Government Grants'),
  ('GB', 'FRS102', 'revenue_type', 'other', '5200', 'Other revenue mapped to Other Income'),
  ('GB', 'FRS102', 'cash', 'bank', '1200', 'Bank Current Account'),
  ('GB', 'FRS102', 'cash', 'cash', '1220', 'Cash in Hand')
ON CONFLICT (country_code, accounting_standard, mapping_type, mapping_key) DO NOTHING;

-- France (PCG) Mappings - Migrate existing hard-coded mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('FR', 'PCG', 'cost_type', 'labor', '641', 'Labor costs mapped to Staff remuneration'),
  ('FR', 'PCG', 'cost_type', 'materials', '601', 'Materials mapped to Raw materials purchases'),
  ('FR', 'PCG', 'cost_type', 'utilities', '606', 'Utilities mapped to Non-stored materials and supplies'),
  ('FR', 'PCG', 'cost_type', 'equipment', '615', 'Equipment mapped to Maintenance and repairs'),
  ('FR', 'PCG', 'cost_type', 'product_application', '604', 'Product application mapped to Studies and services purchases'),
  ('FR', 'PCG', 'cost_type', 'other', '628', 'Other costs mapped to Other external charges'),
  ('FR', 'PCG', 'revenue_type', 'harvest', '701', 'Harvest revenue mapped to Finished product sales'),
  ('FR', 'PCG', 'revenue_type', 'subsidy', '74', 'Subsidy mapped to Operating subsidies'),
  ('FR', 'PCG', 'revenue_type', 'other', '708', 'Other revenue mapped to Ancillary activities products'),
  ('FR', 'PCG', 'cash', 'bank', '512', 'Banks'),
  ('FR', 'PCG', 'cash', 'cash', '531', 'Cash')
ON CONFLICT (country_code, accounting_standard, mapping_type, mapping_key) DO NOTHING;

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

-- Drop legacy columns from accounts table if they exist
DO $$
BEGIN
  -- Drop description_fr column if it exists (legacy from old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'description_fr'
  ) THEN
    ALTER TABLE accounts DROP COLUMN description_fr;
  END IF;

  -- Drop description_ar column if it exists (legacy from old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'description_ar'
  ) THEN
    ALTER TABLE accounts DROP COLUMN description_ar;
  END IF;

  -- Drop description_en column if it exists (legacy from old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'description_en'
  ) THEN
    ALTER TABLE accounts DROP COLUMN description_en;
  END IF;

  -- Drop name_fr column if it exists (legacy from old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'name_fr'
  ) THEN
    ALTER TABLE accounts DROP COLUMN name_fr;
  END IF;

  -- Drop name_ar column if it exists (legacy from old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'name_ar'
  ) THEN
    ALTER TABLE accounts DROP COLUMN name_ar;
  END IF;

  -- Drop name_en column if it exists (legacy from old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'name_en'
  ) THEN
    ALTER TABLE accounts DROP COLUMN name_en;
  END IF;
END $$;

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
  reference_type VARCHAR(50),
  reference_id UUID,
  remarks TEXT,
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
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);

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
-- Updated to handle NULL org_uuid and ensure proper column aliases match RETURNS TABLE
-- Uses SECURITY DEFINER to bypass RLS when querying farms and parcels
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
  -- Return empty result if org_uuid is NULL
  IF org_uuid IS NULL THEN
    RETURN;
  END IF;

  -- SECURITY DEFINER bypasses RLS, so we can directly query farms and parcels
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
    FROM public.farms f
    WHERE f.organization_id = org_uuid
      AND (root_farm_id IS NULL OR f.id = root_farm_id)
  )
  SELECT
    ft.id::UUID as farm_id,
    ft.name::TEXT as farm_name,
    ft.parent_farm_id::UUID,
    ft.farm_type::TEXT,
    ft.size::NUMERIC as farm_size,
    ft.manager::TEXT as manager_name,
    ft.is_active::BOOLEAN,
    ft.level::INTEGER as hierarchy_level,
    COUNT(DISTINCT p.id)::BIGINT as parcel_count,
    0::BIGINT as subparcel_count
  FROM farm_tree ft
  LEFT JOIN public.parcels p ON p.farm_id = ft.id
  GROUP BY ft.id, ft.name, ft.parent_farm_id, ft.farm_type, ft.size, ft.manager, ft.is_active, ft.level
  ORDER BY ft.level, ft.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_farm_hierarchy_tree(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farm_hierarchy_tree(UUID, UUID) TO service_role;

COMMENT ON FUNCTION get_farm_hierarchy_tree IS 'Returns hierarchical farm tree for an organization with parcel counts';

-- =====================================================
-- SUBSCRIPTION VALIDATION FUNCTION
-- =====================================================
-- This function checks if an organization has a valid subscription
-- Required by delete-farm and delete-parcel edge functions
-- Returns true if subscription status is 'active' or 'trialing' and not expired
-- =====================================================

-- Check if organization has a valid subscription
CREATE OR REPLACE FUNCTION has_valid_subscription(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
BEGIN
  -- Check if subscription exists
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- If no subscription found, return false
  IF sub_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if subscription is active or trialing and not expired
  RETURN sub_record.status IN ('active', 'trialing')
    AND (
      sub_record.current_period_end IS NULL
      OR sub_record.current_period_end >= CURRENT_DATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_valid_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_valid_subscription(UUID) TO service_role;

COMMENT ON FUNCTION has_valid_subscription IS 'Checks if an organization has a valid subscription (active or trialing and not expired)';

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
-- NOTE: All RLS policies have been updated to handle NULL organization_id cases
-- and to properly check organization membership through related tables (farms, etc.)
-- This fixes "new row violates row-level security policy" errors for:
-- - farms table
-- - farm_management_roles table  
-- - parcels table (checks organization through farm relationship)
-- =====================================================

-- Helper function to check organization membership (bypasses RLS to avoid recursion)
-- This function uses SECURITY DEFINER to run with elevated privileges and bypass RLS
-- Updated to handle NULL organization_id by returning false
CREATE OR REPLACE FUNCTION is_organization_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Return false if organization_id is NULL
  -- Direct query without RLS check (SECURITY DEFINER bypasses RLS)
  SELECT CASE 
    WHEN p_organization_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 
      FROM public.organization_users 
      WHERE user_id = auth.uid() 
        AND organization_id = p_organization_id
        AND is_active = true
    )
  END;
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
-- Use DO block to ensure policies are dropped before creating them
DO $$
BEGIN
  -- Drop all existing subscription policies
  DROP POLICY IF EXISTS "users_view_org_subscription" ON subscriptions;
  DROP POLICY IF EXISTS "admins_manage_subscription" ON subscriptions;
  DROP POLICY IF EXISTS "org_read_subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "org_insert_subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "org_update_subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "org_delete_subscriptions" ON subscriptions;
END $$;

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
      JOIN public.roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = subscriptions.organization_id
        AND r.name IN ('system_admin', 'organization_admin')
        AND ou.is_active = true
    )
  );

-- Allow organization admins to update subscriptions
CREATE POLICY "org_update_subscriptions" ON subscriptions
  FOR UPDATE USING (
    is_organization_member(organization_id) AND
    EXISTS (
      SELECT 1
      FROM public.organization_users ou
      JOIN public.roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = subscriptions.organization_id
        AND r.name IN ('system_admin', 'organization_admin')
        AND ou.is_active = true
    )
  );

-- Allow organization admins to delete subscriptions
CREATE POLICY "org_delete_subscriptions" ON subscriptions
  FOR DELETE USING (
    is_organization_member(organization_id) AND
    EXISTS (
      SELECT 1
      FROM public.organization_users ou
      JOIN public.roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = subscriptions.organization_id
        AND r.name IN ('system_admin', 'organization_admin')
        AND ou.is_active = true
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

DROP POLICY IF EXISTS "org_delete_accounts" ON accounts;
CREATE POLICY "org_delete_accounts" ON accounts
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Cost Centers Policies
DROP POLICY IF EXISTS "org_read_cost_centers" ON cost_centers;
CREATE POLICY "org_read_cost_centers" ON cost_centers
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_cost_centers" ON cost_centers;
CREATE POLICY "org_write_cost_centers" ON cost_centers
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_cost_centers" ON cost_centers;
CREATE POLICY "org_update_cost_centers" ON cost_centers
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_cost_centers" ON cost_centers;
CREATE POLICY "org_delete_cost_centers" ON cost_centers
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Taxes Policies
DROP POLICY IF EXISTS "org_read_taxes" ON taxes;
CREATE POLICY "org_read_taxes" ON taxes
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_taxes" ON taxes;
CREATE POLICY "org_write_taxes" ON taxes
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_taxes" ON taxes;
CREATE POLICY "org_update_taxes" ON taxes
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_taxes" ON taxes;
CREATE POLICY "org_delete_taxes" ON taxes
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Bank Accounts Policies
DROP POLICY IF EXISTS "org_read_bank_accounts" ON bank_accounts;
CREATE POLICY "org_read_bank_accounts" ON bank_accounts
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_bank_accounts" ON bank_accounts;
CREATE POLICY "org_write_bank_accounts" ON bank_accounts
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_bank_accounts" ON bank_accounts;
CREATE POLICY "org_update_bank_accounts" ON bank_accounts
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_bank_accounts" ON bank_accounts;
CREATE POLICY "org_delete_bank_accounts" ON bank_accounts
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Journal Entries Policies
DROP POLICY IF EXISTS "org_read_journal_entries" ON journal_entries;
CREATE POLICY "org_read_journal_entries" ON journal_entries
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_journal_entries" ON journal_entries;
CREATE POLICY "org_write_journal_entries" ON journal_entries
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_journal_entries" ON journal_entries;
CREATE POLICY "org_update_journal_entries" ON journal_entries
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_journal_entries" ON journal_entries;
CREATE POLICY "org_delete_journal_entries" ON journal_entries
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Journal Items Policies
DROP POLICY IF EXISTS "org_access_journal_items" ON journal_items;
CREATE POLICY "org_access_journal_items" ON journal_items
  FOR ALL USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries WHERE is_organization_member(organization_id)
    )
  );

-- Invoices Policies
DROP POLICY IF EXISTS "org_read_invoices" ON invoices;
CREATE POLICY "org_read_invoices" ON invoices
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_invoices" ON invoices;
CREATE POLICY "org_write_invoices" ON invoices
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_invoices" ON invoices;
CREATE POLICY "org_update_invoices" ON invoices
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_invoices" ON invoices;
CREATE POLICY "org_delete_invoices" ON invoices
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Invoice Items Policies
DROP POLICY IF EXISTS "org_access_invoice_items" ON invoice_items;
CREATE POLICY "org_access_invoice_items" ON invoice_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE is_organization_member(organization_id)
    )
  );

-- Accounting Payments Policies
DROP POLICY IF EXISTS "org_read_accounting_payments" ON accounting_payments;
CREATE POLICY "org_read_accounting_payments" ON accounting_payments
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_accounting_payments" ON accounting_payments;
CREATE POLICY "org_write_accounting_payments" ON accounting_payments
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_accounting_payments" ON accounting_payments;
CREATE POLICY "org_update_accounting_payments" ON accounting_payments
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_accounting_payments" ON accounting_payments;
CREATE POLICY "org_delete_accounting_payments" ON accounting_payments
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Payment Allocations Policies
DROP POLICY IF EXISTS "org_access_payment_allocations" ON payment_allocations;
CREATE POLICY "org_access_payment_allocations" ON payment_allocations
  FOR ALL USING (
    payment_id IN (
      SELECT id FROM accounting_payments WHERE is_organization_member(organization_id)
    )
  );

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
-- Use DO block to ensure constraint is dropped before creating it
DO $$
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'fk_stock_entries_reception_batch' 
    AND t.relname = 'stock_entries'
    AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER TABLE IF EXISTS stock_entries
      DROP CONSTRAINT fk_stock_entries_reception_batch;
  END IF;
END $$;

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
-- Use DO block to ensure constraint is dropped before creating it
DO $$
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'fk_reception_batches_crop' 
    AND t.relname = 'reception_batches'
    AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER TABLE IF EXISTS reception_batches
      DROP CONSTRAINT fk_reception_batches_crop;
  END IF;
END $$;

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

-- Add role_id column and foreign key constraint from organization_users to roles
-- This is added here after roles table is created to avoid dependency issues
DO $$
BEGIN
  -- Add the role_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_users'
    AND column_name = 'role_id'
  ) THEN
    ALTER TABLE organization_users ADD COLUMN role_id UUID;
  END IF;

  -- Add the foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_users_role_id_fkey'
  ) THEN
    ALTER TABLE organization_users
    ADD CONSTRAINT organization_users_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for the role_id column
CREATE INDEX IF NOT EXISTS idx_organization_users_role ON organization_users(role_id);

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

DROP POLICY IF EXISTS "org_delete_workers" ON workers;
CREATE POLICY "org_delete_workers" ON workers
  FOR DELETE USING (
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

DROP POLICY IF EXISTS "org_delete_tasks" ON tasks;
CREATE POLICY "org_delete_tasks" ON tasks
  FOR DELETE USING (
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

DROP POLICY IF EXISTS "org_update_harvest_records" ON harvest_records;
CREATE POLICY "org_update_harvest_records" ON harvest_records
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_harvest_records" ON harvest_records;
CREATE POLICY "org_delete_harvest_records" ON harvest_records
  FOR DELETE USING (
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

DROP POLICY IF EXISTS "org_update_deliveries" ON deliveries;
CREATE POLICY "org_update_deliveries" ON deliveries
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_deliveries" ON deliveries;
CREATE POLICY "org_delete_deliveries" ON deliveries
  FOR DELETE USING (
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

-- Seed permissions
INSERT INTO permissions (name, display_name, resource, action, description) VALUES
  -- User management permissions
  ('users.read', 'View Users', 'users', 'read', 'View users in the organization'),
  ('users.create', 'Create Users', 'users', 'create', 'Invite new users to the organization'),
  ('users.update', 'Update Users', 'users', 'update', 'Update user roles and information'),
  ('users.delete', 'Delete Users', 'users', 'delete', 'Remove users from the organization'),
  ('users.manage', 'Manage Users', 'users', 'manage', 'Full user management access'),

  -- Farm management permissions
  ('farms.read', 'View Farms', 'farms', 'read', 'View farm information'),
  ('farms.create', 'Create Farms', 'farms', 'create', 'Create new farms'),
  ('farms.update', 'Update Farms', 'farms', 'update', 'Update farm information'),
  ('farms.delete', 'Delete Farms', 'farms', 'delete', 'Delete farms'),
  ('farms.manage', 'Manage Farms', 'farms', 'manage', 'Full farm management access'),

  -- Parcel management permissions
  ('parcels.read', 'View Parcels', 'parcels', 'read', 'View parcel information'),
  ('parcels.create', 'Create Parcels', 'parcels', 'create', 'Create new parcels'),
  ('parcels.update', 'Update Parcels', 'parcels', 'update', 'Update parcel information'),
  ('parcels.delete', 'Delete Parcels', 'parcels', 'delete', 'Delete parcels'),
  ('parcels.manage', 'Manage Parcels', 'parcels', 'manage', 'Full parcel management access'),

  -- Stock management permissions
  ('stock.read', 'View Stock', 'stock', 'read', 'View inventory and stock'),
  ('stock.create', 'Create Stock Entries', 'stock', 'create', 'Create new stock entries'),
  ('stock.update', 'Update Stock', 'stock', 'update', 'Update stock information'),
  ('stock.delete', 'Delete Stock', 'stock', 'delete', 'Delete stock entries'),
  ('stock.manage', 'Manage Stock', 'stock', 'manage', 'Full stock management access'),

  -- Organization permissions
  ('organizations.read', 'View Organization', 'organizations', 'read', 'View organization information'),
  ('organizations.update', 'Update Organization', 'organizations', 'update', 'Update organization settings'),
  ('organizations.manage', 'Manage Organization', 'organizations', 'manage', 'Full organization management'),

  -- Report permissions
  ('reports.read', 'View Reports', 'reports', 'read', 'View and generate reports')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  description = EXCLUDED.description;

-- Seed role_permissions mapping
-- This maps each role to their permissions
DO $$
DECLARE
  v_system_admin_id UUID;
  v_org_admin_id UUID;
  v_farm_manager_id UUID;
  v_farm_worker_id UUID;
  v_day_laborer_id UUID;
  v_viewer_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO v_system_admin_id FROM roles WHERE name = 'system_admin';
  SELECT id INTO v_org_admin_id FROM roles WHERE name = 'organization_admin';
  SELECT id INTO v_farm_manager_id FROM roles WHERE name = 'farm_manager';
  SELECT id INTO v_farm_worker_id FROM roles WHERE name = 'farm_worker';
  SELECT id INTO v_day_laborer_id FROM roles WHERE name = 'day_laborer';
  SELECT id INTO v_viewer_id FROM roles WHERE name = 'viewer';

  -- Clear existing role_permissions to avoid duplicates
  DELETE FROM role_permissions;

  -- System Admin: manage all resources
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_system_admin_id, id FROM permissions WHERE action = 'manage';

  -- Organization Admin: manage users, farms, parcels, stock, organization
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_org_admin_id, id FROM permissions
  WHERE resource IN ('users', 'farms', 'parcels', 'stock', 'organizations', 'reports');

  -- Farm Manager: read users, manage farms, parcels, stock
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_farm_manager_id, id FROM permissions
  WHERE (resource = 'users' AND action = 'read')
     OR (resource IN ('farms', 'parcels', 'stock') AND action IN ('read', 'create', 'update', 'manage'))
     OR (resource = 'reports' AND action = 'read');

  -- Farm Worker: read most resources, create/update parcels
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_farm_worker_id, id FROM permissions
  WHERE (resource IN ('farms', 'parcels', 'stock', 'users') AND action = 'read')
     OR (resource = 'parcels' AND action IN ('create', 'update'));

  -- Day Laborer: very limited, read-only on tasks
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_day_laborer_id, id FROM permissions
  WHERE resource = 'reports' AND action = 'read';

  -- Viewer: read-only access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_viewer_id, id FROM permissions
  WHERE action = 'read';

END $$;

-- Populate role_id for existing users based on their role text
-- This maps the text role to the actual roles table
DO $$
BEGIN
  -- Only run if the role column still exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_users'
    AND column_name = 'role'
  ) THEN
    -- Update organization_users with role_id based on role text
    UPDATE organization_users ou
    SET role_id = r.id
    FROM roles r
    WHERE ou.role = r.name
    AND ou.role_id IS NULL;
  END IF;
END $$;

-- Add first_name and last_name columns to user_profiles if they don't exist
DO $$
BEGIN
  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN first_name VARCHAR(255);
  END IF;

  -- Add last_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_name VARCHAR(255);
  END IF;

  -- Populate first_name and last_name from full_name if they are empty
  UPDATE user_profiles
  SET
    first_name = COALESCE(first_name, SPLIT_PART(full_name, ' ', 1)),
    last_name = COALESCE(last_name, NULLIF(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1), ''))
  WHERE full_name IS NOT NULL
  AND (first_name IS NULL OR last_name IS NULL);
END $$;

-- Migrate from role VARCHAR to role_id UUID (remove redundant role column)
DO $$
DECLARE
  default_viewer_role_id UUID;
BEGIN
  -- Get the viewer role ID as a fallback
  SELECT id INTO default_viewer_role_id FROM roles WHERE name = 'viewer';

  -- Set default viewer role for any users with NULL role_id
  IF default_viewer_role_id IS NOT NULL THEN
    UPDATE organization_users
    SET role_id = default_viewer_role_id
    WHERE role_id IS NULL;
  END IF;

  -- First, ensure role_id is NOT NULL (it should be populated by now)
  -- If any row still has NULL role_id, this will fail and alert us
  IF EXISTS (SELECT 1 FROM organization_users WHERE role_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot drop role column: some users still have NULL role_id even after applying default viewer role.';
  END IF;

  -- Drop the foreign key constraint on role VARCHAR if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_users_role_fkey'
  ) THEN
    ALTER TABLE organization_users DROP CONSTRAINT organization_users_role_fkey;
  END IF;

  -- Drop the CHECK constraint on role if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_users_role_check'
  ) THEN
    ALTER TABLE organization_users DROP CONSTRAINT organization_users_role_check;
  END IF;

  -- Make role_id NOT NULL now that we've confirmed it's populated
  ALTER TABLE organization_users ALTER COLUMN role_id SET NOT NULL;

  -- Drop the role VARCHAR column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_users'
    AND column_name = 'role'
  ) THEN
    ALTER TABLE organization_users DROP COLUMN role;
  END IF;
END $$;

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

-- =====================================================
-- DATA SEEDING & FIXES
-- =====================================================
-- This section ensures user profiles and organizations exist for existing auth users

-- Create user profiles for all auth users that don't have one
DO $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        INSERT INTO user_profiles (
            id,
            email,
            full_name,
            language,
            timezone,
            onboarding_completed,
            password_set
        )
        VALUES (
            v_user.id,
            v_user.email,
            COALESCE(
                NULLIF(TRIM(COALESCE(v_user.raw_user_meta_data->>'full_name', '')), ''),
                COALESCE(v_user.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(v_user.raw_user_meta_data->>'last_name', ''),
                split_part(v_user.email, '@', 1)
            ),
            'fr',
            'Africa/Casablanca',
            true,
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            onboarding_completed = true,
            password_set = true,
            updated_at = NOW();
    END LOOP;
    
    RAISE NOTICE '✅ User profiles synced for all auth users';
END $$;

-- Ensure organization exists for organization ID 9a735597-c0a7-495c-b9f7-70842e34e3df
DO $$
DECLARE
    v_org_id uuid := '9a735597-c0a7-495c-b9f7-70842e34e3df';
    v_org_exists boolean;
BEGIN
    SELECT EXISTS(SELECT 1 FROM organizations WHERE id = v_org_id) INTO v_org_exists;
    
    IF NOT v_org_exists THEN
        INSERT INTO organizations (
            id,
            name,
            slug,
            email,
            currency_code,
            timezone,
            is_active
        )
        VALUES (
            v_org_id,
            'AgriTech Organization',
            'agritech-org',
            (SELECT email FROM auth.users ORDER BY created_at DESC LIMIT 1),
            'MAD',
            'Africa/Casablanca',
            true
        );
        RAISE NOTICE '✅ Created organization: AgriTech Organization';
    ELSE
        RAISE NOTICE 'ℹ️  Organization already exists';
    END IF;
END $$;

-- Link all auth users to the default organization as admins if they don't have an organization
DO $$
DECLARE
    v_user RECORD;
    v_org_id uuid := '9a735597-c0a7-495c-b9f7-70842e34e3df';
    v_linked_count integer := 0;
BEGIN
    FOR v_user IN 
        SELECT u.id 
        FROM auth.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM organization_users ou 
            WHERE ou.user_id = u.id AND ou.is_active = true
        )
    LOOP
        INSERT INTO organization_users (
            user_id,
            organization_id,
            role,
            is_active
        )
        VALUES (
            v_user.id,
            v_org_id,
            'organization_admin',
            true
        )
        ON CONFLICT (user_id, organization_id) 
        DO UPDATE SET 
            is_active = true,
            role = 'organization_admin',
            updated_at = NOW();
        
        v_linked_count := v_linked_count + 1;
    END LOOP;
    
    IF v_linked_count > 0 THEN
        RAISE NOTICE '✅ Linked % user(s) to organization', v_linked_count;
    ELSE
        RAISE NOTICE 'ℹ️  All users already linked to organizations';
    END IF;
END $$;

-- Create a trial subscription for the organization if it doesn't have one
DO $$
DECLARE
    v_org_id uuid := '9a735597-c0a7-495c-b9f7-70842e34e3df';
    v_sub_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM subscriptions 
        WHERE organization_id = v_org_id 
        AND status IN ('trialing', 'active')
    ) INTO v_sub_exists;
    
    IF NOT v_sub_exists THEN
        INSERT INTO subscriptions (
            organization_id,
            status,
            plan_id,
            current_period_start,
            current_period_end,
            cancel_at_period_end
        )
        VALUES (
            v_org_id,
            'trialing',
            'basic',
            NOW(),
            NOW() + INTERVAL '30 days',
            false
        )
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Created trial subscription for organization';
    ELSE
        RAISE NOTICE 'ℹ️  Organization already has an active subscription';
    END IF;
END $$;

-- Final verification and summary
DO $$
DECLARE
    v_user_count integer;
    v_profile_count integer;
    v_org_count integer;
    v_org_user_count integer;
    v_sub_count integer;
BEGIN
    SELECT COUNT(*) INTO v_user_count FROM auth.users;
    SELECT COUNT(*) INTO v_profile_count FROM user_profiles;
    SELECT COUNT(*) INTO v_org_count FROM organizations;
    SELECT COUNT(*) INTO v_org_user_count FROM organization_users WHERE is_active = true;
    SELECT COUNT(*) INTO v_sub_count FROM subscriptions WHERE status IN ('trialing', 'active');
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'DATABASE INITIALIZATION SUMMARY';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Auth users: %', v_user_count;
    RAISE NOTICE 'User profiles: %', v_profile_count;
    RAISE NOTICE 'Organizations: %', v_org_count;
    RAISE NOTICE 'Active organization memberships: %', v_org_user_count;
    RAISE NOTICE 'Active subscriptions: %', v_sub_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ Schema initialization complete!';
    RAISE NOTICE '================================================';
END $$;

-- =====================================================
-- COMPREHENSIVE RLS POLICIES FIX
-- Added: 2025-11-06
-- Fix for onboarding issue where these tables had RLS enabled but no policies
-- Tables fixed: user_profiles, organizations, dashboard_settings
-- =====================================================

-- =====================================================
-- USER_PROFILES RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "user_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_write_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_all_own_profile" ON user_profiles;

-- Single policy for all operations (supports upsert in onboarding)
CREATE POLICY "user_all_own_profile" ON user_profiles
  FOR ALL USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

-- =====================================================
-- ORGANIZATIONS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "org_read_organizations" ON organizations;
DROP POLICY IF EXISTS "org_write_organizations" ON organizations;
DROP POLICY IF EXISTS "org_update_organizations" ON organizations;
DROP POLICY IF EXISTS "org_delete_organizations" ON organizations;

-- Read: Users can see organizations they're members of
CREATE POLICY "org_read_organizations" ON organizations
  FOR SELECT USING (
    is_organization_member(id)
  );

-- Insert: Any authenticated user can create an organization
CREATE POLICY "org_write_organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Update: Organization members can update
CREATE POLICY "org_update_organizations" ON organizations
  FOR UPDATE USING (
    is_organization_member(id)
  );

-- Delete: Organization members can delete
CREATE POLICY "org_delete_organizations" ON organizations
  FOR DELETE USING (
    is_organization_member(id)
  );

-- =====================================================
-- DASHBOARD_SETTINGS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "user_read_own_dashboard_settings" ON dashboard_settings;
DROP POLICY IF EXISTS "user_write_own_dashboard_settings" ON dashboard_settings;
DROP POLICY IF EXISTS "user_update_own_dashboard_settings" ON dashboard_settings;
DROP POLICY IF EXISTS "user_delete_own_dashboard_settings" ON dashboard_settings;

CREATE POLICY "user_read_own_dashboard_settings" ON dashboard_settings
  FOR SELECT USING (
    user_id = auth.uid() AND
    is_organization_member(organization_id)
  );

CREATE POLICY "user_write_own_dashboard_settings" ON dashboard_settings
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    is_organization_member(organization_id)
  );

CREATE POLICY "user_update_own_dashboard_settings" ON dashboard_settings
  FOR UPDATE USING (
    user_id = auth.uid() AND
    is_organization_member(organization_id)
  );

CREATE POLICY "user_delete_own_dashboard_settings" ON dashboard_settings
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- =====================================================
-- FARMS RLS POLICIES
-- =====================================================
-- Updated to handle NULL organization_id and require authentication for INSERT
-- Users can access farms with NULL organization_id or farms from organizations they're members of
-- =====================================================
DROP POLICY IF EXISTS "org_read_farms" ON farms;
DROP POLICY IF EXISTS "org_write_farms" ON farms;
DROP POLICY IF EXISTS "org_update_farms" ON farms;
DROP POLICY IF EXISTS "org_delete_farms" ON farms;

-- Read: Users can see farms from organizations they're members of, or farms with NULL organization_id
CREATE POLICY "org_read_farms" ON farms
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- Insert: Authenticated users can create farms for organizations they're members of, or farms with NULL organization_id
CREATE POLICY "org_write_farms" ON farms
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

-- Update: Users can update farms from organizations they're members of, or farms with NULL organization_id
CREATE POLICY "org_update_farms" ON farms
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- Delete: Users can delete farms from organizations they're members of, or farms with NULL organization_id
CREATE POLICY "org_delete_farms" ON farms
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- =====================================================
-- FARM_MANAGEMENT_ROLES RLS POLICIES
-- =====================================================
-- Updated to check organization through farm relationship
-- Users can access their own roles or roles for farms they have access to
-- =====================================================
DROP POLICY IF EXISTS "org_read_farm_roles" ON farm_management_roles;
DROP POLICY IF EXISTS "org_write_farm_roles" ON farm_management_roles;
DROP POLICY IF EXISTS "org_update_farm_roles" ON farm_management_roles;
DROP POLICY IF EXISTS "org_delete_farm_roles" ON farm_management_roles;

-- Read: Users can see farm roles for farms they have access to
CREATE POLICY "org_read_farm_roles" ON farm_management_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Insert: Authenticated users can create farm roles for farms they have access to, or for themselves
CREATE POLICY "org_write_farm_roles" ON farm_management_roles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM farms
        WHERE farms.id = farm_management_roles.farm_id
          AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
      )
    )
  );

-- Update: Users can update farm roles for farms they have access to, or their own roles
CREATE POLICY "org_update_farm_roles" ON farm_management_roles
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Delete: Users can delete farm roles for farms they have access to, or their own roles
CREATE POLICY "org_delete_farm_roles" ON farm_management_roles
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- =====================================================
-- PARCELS RLS POLICIES
-- =====================================================
-- Updated to check organization through farm relationship (parcels don't have organization_id)
-- Users can access parcels from farms they have access to
-- =====================================================
DROP POLICY IF EXISTS "org_read_parcels" ON parcels;
DROP POLICY IF EXISTS "org_write_parcels" ON parcels;
DROP POLICY IF EXISTS "org_update_parcels" ON parcels;
DROP POLICY IF EXISTS "org_delete_parcels" ON parcels;

-- Read: Users can see parcels from farms they have access to
CREATE POLICY "org_read_parcels" ON parcels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = parcels.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Insert: Authenticated users can create parcels for farms they have access to
CREATE POLICY "org_write_parcels" ON parcels
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = parcels.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Update: Users can update parcels from farms they have access to
CREATE POLICY "org_update_parcels" ON parcels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = parcels.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Delete: Users can delete parcels from farms they have access to
CREATE POLICY "org_delete_parcels" ON parcels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = parcels.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- =====================================================
-- ADDITIONAL RLS POLICIES FOR ALL TABLES WITH RLS ENABLED
-- =====================================================
-- This section ensures all tables with RLS enabled have proper policies
-- =====================================================

-- =====================================================
-- WORKER & TASK MANAGEMENT TABLES
-- =====================================================

-- Day Laborers Policies (check through farm relationship)
DROP POLICY IF EXISTS "org_read_day_laborers" ON day_laborers;
CREATE POLICY "org_read_day_laborers" ON day_laborers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = day_laborers.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_day_laborers" ON day_laborers;
CREATE POLICY "org_write_day_laborers" ON day_laborers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = day_laborers.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_day_laborers" ON day_laborers;
CREATE POLICY "org_update_day_laborers" ON day_laborers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = day_laborers.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_day_laborers" ON day_laborers;
CREATE POLICY "org_delete_day_laborers" ON day_laborers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = day_laborers.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Employees Policies (check through farm relationship)
DROP POLICY IF EXISTS "org_read_employees" ON employees;
CREATE POLICY "org_read_employees" ON employees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = employees.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_employees" ON employees;
CREATE POLICY "org_write_employees" ON employees
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = employees.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_employees" ON employees;
CREATE POLICY "org_update_employees" ON employees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = employees.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_employees" ON employees;
CREATE POLICY "org_delete_employees" ON employees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = employees.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Task Categories Policies
DROP POLICY IF EXISTS "org_read_task_categories" ON task_categories;
CREATE POLICY "org_read_task_categories" ON task_categories
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_task_categories" ON task_categories;
CREATE POLICY "org_write_task_categories" ON task_categories
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_task_categories" ON task_categories;
CREATE POLICY "org_update_task_categories" ON task_categories
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_task_categories" ON task_categories;
CREATE POLICY "org_delete_task_categories" ON task_categories
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Task Templates Policies (check through category relationship)
DROP POLICY IF EXISTS "org_read_task_templates" ON task_templates;
CREATE POLICY "org_read_task_templates" ON task_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM task_categories
      WHERE task_categories.id = task_templates.category_id
        AND is_organization_member(task_categories.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_write_task_templates" ON task_templates;
CREATE POLICY "org_write_task_templates" ON task_templates
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM task_categories
      WHERE task_categories.id = task_templates.category_id
        AND is_organization_member(task_categories.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_update_task_templates" ON task_templates;
CREATE POLICY "org_update_task_templates" ON task_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM task_categories
      WHERE task_categories.id = task_templates.category_id
        AND is_organization_member(task_categories.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_delete_task_templates" ON task_templates;
CREATE POLICY "org_delete_task_templates" ON task_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM task_categories
      WHERE task_categories.id = task_templates.category_id
        AND is_organization_member(task_categories.organization_id)
    )
  );

-- Task Comments Policies (check through task relationship)
DROP POLICY IF EXISTS "org_read_task_comments" ON task_comments;
CREATE POLICY "org_read_task_comments" ON task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_task_comments" ON task_comments;
CREATE POLICY "org_write_task_comments" ON task_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_task_comments" ON task_comments;
CREATE POLICY "org_update_task_comments" ON task_comments
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_task_comments" ON task_comments;
CREATE POLICY "org_delete_task_comments" ON task_comments
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

-- Task Time Logs Policies (check through task relationship)
DROP POLICY IF EXISTS "org_read_task_time_logs" ON task_time_logs;
CREATE POLICY "org_read_task_time_logs" ON task_time_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_time_logs.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_task_time_logs" ON task_time_logs;
CREATE POLICY "org_write_task_time_logs" ON task_time_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_time_logs.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_task_time_logs" ON task_time_logs;
CREATE POLICY "org_update_task_time_logs" ON task_time_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_time_logs.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_task_time_logs" ON task_time_logs;
CREATE POLICY "org_delete_task_time_logs" ON task_time_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_time_logs.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

-- Task Dependencies Policies (check through task relationship)
DROP POLICY IF EXISTS "org_read_task_dependencies" ON task_dependencies;
CREATE POLICY "org_read_task_dependencies" ON task_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_task_dependencies" ON task_dependencies;
CREATE POLICY "org_write_task_dependencies" ON task_dependencies
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_task_dependencies" ON task_dependencies;
CREATE POLICY "org_update_task_dependencies" ON task_dependencies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_task_dependencies" ON task_dependencies;
CREATE POLICY "org_delete_task_dependencies" ON task_dependencies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

-- Task Equipment Policies (check through task relationship)
DROP POLICY IF EXISTS "org_read_task_equipment" ON task_equipment;
CREATE POLICY "org_read_task_equipment" ON task_equipment
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_equipment.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_task_equipment" ON task_equipment;
CREATE POLICY "org_write_task_equipment" ON task_equipment
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_equipment.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_task_equipment" ON task_equipment;
CREATE POLICY "org_update_task_equipment" ON task_equipment
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_equipment.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_task_equipment" ON task_equipment;
CREATE POLICY "org_delete_task_equipment" ON task_equipment
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_equipment.task_id
        AND (tasks.organization_id IS NULL OR is_organization_member(tasks.organization_id))
    )
  );

-- Work Records Policies (check through farm relationship)
DROP POLICY IF EXISTS "org_read_work_records" ON work_records;
CREATE POLICY "org_read_work_records" ON work_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = work_records.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_work_records" ON work_records;
CREATE POLICY "org_write_work_records" ON work_records
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = work_records.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_work_records" ON work_records;
CREATE POLICY "org_update_work_records" ON work_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = work_records.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_work_records" ON work_records;
CREATE POLICY "org_delete_work_records" ON work_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = work_records.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Metayage Settlements Policies (check through farm relationship)
DROP POLICY IF EXISTS "org_read_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_read_metayage_settlements" ON metayage_settlements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = metayage_settlements.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_write_metayage_settlements" ON metayage_settlements
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = metayage_settlements.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_update_metayage_settlements" ON metayage_settlements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = metayage_settlements.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_delete_metayage_settlements" ON metayage_settlements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = metayage_settlements.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Payment Records Policies
DROP POLICY IF EXISTS "org_read_payment_records" ON payment_records;
CREATE POLICY "org_read_payment_records" ON payment_records
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_payment_records" ON payment_records;
CREATE POLICY "org_write_payment_records" ON payment_records
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_payment_records" ON payment_records;
CREATE POLICY "org_update_payment_records" ON payment_records
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_payment_records" ON payment_records;
CREATE POLICY "org_delete_payment_records" ON payment_records
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Payment Advances Policies
DROP POLICY IF EXISTS "org_read_payment_advances" ON payment_advances;
CREATE POLICY "org_read_payment_advances" ON payment_advances
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_payment_advances" ON payment_advances;
CREATE POLICY "org_write_payment_advances" ON payment_advances
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_payment_advances" ON payment_advances;
CREATE POLICY "org_update_payment_advances" ON payment_advances
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_payment_advances" ON payment_advances;
CREATE POLICY "org_delete_payment_advances" ON payment_advances
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Payment Bonuses Policies (check through payment_records relationship)
DROP POLICY IF EXISTS "org_access_payment_bonuses" ON payment_bonuses;
CREATE POLICY "org_access_payment_bonuses" ON payment_bonuses
  FOR ALL USING (
    payment_record_id IN (
      SELECT id FROM payment_records WHERE is_organization_member(organization_id)
    )
  );

-- Payment Deductions Policies (check through payment_records relationship)
DROP POLICY IF EXISTS "org_access_payment_deductions" ON payment_deductions;
CREATE POLICY "org_access_payment_deductions" ON payment_deductions
  FOR ALL USING (
    payment_record_id IN (
      SELECT id FROM payment_records WHERE is_organization_member(organization_id)
    )
  );

-- =====================================================
-- DELIVERY MANAGEMENT TABLES
-- =====================================================

-- Delivery Items Policies (check through delivery relationship)
DROP POLICY IF EXISTS "org_access_delivery_items" ON delivery_items;
CREATE POLICY "org_access_delivery_items" ON delivery_items
  FOR ALL USING (
    delivery_id IN (
      SELECT id FROM deliveries WHERE is_organization_member(organization_id)
    )
  );

-- Delivery Tracking Policies (check through delivery relationship)
DROP POLICY IF EXISTS "org_read_delivery_tracking" ON delivery_tracking;
CREATE POLICY "org_read_delivery_tracking" ON delivery_tracking
  FOR SELECT USING (
    delivery_id IN (
      SELECT id FROM deliveries WHERE is_organization_member(organization_id)
    )
  );

DROP POLICY IF EXISTS "org_write_delivery_tracking" ON delivery_tracking;
CREATE POLICY "org_write_delivery_tracking" ON delivery_tracking
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    delivery_id IN (
      SELECT id FROM deliveries WHERE is_organization_member(organization_id)
    )
  );

DROP POLICY IF EXISTS "org_update_delivery_tracking" ON delivery_tracking;
CREATE POLICY "org_update_delivery_tracking" ON delivery_tracking
  FOR UPDATE USING (
    delivery_id IN (
      SELECT id FROM deliveries WHERE is_organization_member(organization_id)
    )
  );

DROP POLICY IF EXISTS "org_delete_delivery_tracking" ON delivery_tracking;
CREATE POLICY "org_delete_delivery_tracking" ON delivery_tracking
  FOR DELETE USING (
    delivery_id IN (
      SELECT id FROM deliveries WHERE is_organization_member(organization_id)
    )
  );

-- =====================================================
-- INVENTORY & STOCK MANAGEMENT TABLES
-- =====================================================

-- Warehouses Policies
DROP POLICY IF EXISTS "org_read_warehouses" ON warehouses;
CREATE POLICY "org_read_warehouses" ON warehouses
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_warehouses" ON warehouses;
CREATE POLICY "org_write_warehouses" ON warehouses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_warehouses" ON warehouses;
CREATE POLICY "org_update_warehouses" ON warehouses
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_warehouses" ON warehouses;
CREATE POLICY "org_delete_warehouses" ON warehouses
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Inventory Batches Policies
DROP POLICY IF EXISTS "org_read_inventory_batches" ON inventory_batches;
CREATE POLICY "org_read_inventory_batches" ON inventory_batches
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_inventory_batches" ON inventory_batches;
CREATE POLICY "org_write_inventory_batches" ON inventory_batches
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_inventory_batches" ON inventory_batches;
CREATE POLICY "org_update_inventory_batches" ON inventory_batches
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_inventory_batches" ON inventory_batches;
CREATE POLICY "org_delete_inventory_batches" ON inventory_batches
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Inventory Serial Numbers Policies
DROP POLICY IF EXISTS "org_read_inventory_serial_numbers" ON inventory_serial_numbers;
CREATE POLICY "org_read_inventory_serial_numbers" ON inventory_serial_numbers
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_inventory_serial_numbers" ON inventory_serial_numbers;
CREATE POLICY "org_write_inventory_serial_numbers" ON inventory_serial_numbers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_inventory_serial_numbers" ON inventory_serial_numbers;
CREATE POLICY "org_update_inventory_serial_numbers" ON inventory_serial_numbers
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_inventory_serial_numbers" ON inventory_serial_numbers;
CREATE POLICY "org_delete_inventory_serial_numbers" ON inventory_serial_numbers
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Stock Entry Items Policies (check through stock_entry relationship)
DROP POLICY IF EXISTS "org_access_stock_entry_items" ON stock_entry_items;
CREATE POLICY "org_access_stock_entry_items" ON stock_entry_items
  FOR ALL USING (
    stock_entry_id IN (
      SELECT id FROM stock_entries WHERE is_organization_member(organization_id)
    )
  );

-- Stock Movements Policies
DROP POLICY IF EXISTS "org_read_stock_movements" ON stock_movements;
CREATE POLICY "org_read_stock_movements" ON stock_movements
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_stock_movements" ON stock_movements;
CREATE POLICY "org_write_stock_movements" ON stock_movements
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_stock_movements" ON stock_movements;
CREATE POLICY "org_update_stock_movements" ON stock_movements
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_stock_movements" ON stock_movements;
CREATE POLICY "org_delete_stock_movements" ON stock_movements
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Stock Valuation Policies
DROP POLICY IF EXISTS "org_read_stock_valuation" ON stock_valuation;
CREATE POLICY "org_read_stock_valuation" ON stock_valuation
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_stock_valuation" ON stock_valuation;
CREATE POLICY "org_write_stock_valuation" ON stock_valuation
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_stock_valuation" ON stock_valuation;
CREATE POLICY "org_update_stock_valuation" ON stock_valuation
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_stock_valuation" ON stock_valuation;
CREATE POLICY "org_delete_stock_valuation" ON stock_valuation
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Opening Stock Balances Policies
DROP POLICY IF EXISTS "org_read_opening_stock_balances" ON opening_stock_balances;
CREATE POLICY "org_read_opening_stock_balances" ON opening_stock_balances
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_opening_stock_balances" ON opening_stock_balances;
CREATE POLICY "org_write_opening_stock_balances" ON opening_stock_balances
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_opening_stock_balances" ON opening_stock_balances;
CREATE POLICY "org_update_opening_stock_balances" ON opening_stock_balances
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_opening_stock_balances" ON opening_stock_balances;
CREATE POLICY "org_delete_opening_stock_balances" ON opening_stock_balances
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Stock Closing Entries Policies
DROP POLICY IF EXISTS "org_read_stock_closing_entries" ON stock_closing_entries;
CREATE POLICY "org_read_stock_closing_entries" ON stock_closing_entries
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_stock_closing_entries" ON stock_closing_entries;
CREATE POLICY "org_write_stock_closing_entries" ON stock_closing_entries
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_stock_closing_entries" ON stock_closing_entries;
CREATE POLICY "org_update_stock_closing_entries" ON stock_closing_entries
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_stock_closing_entries" ON stock_closing_entries;
CREATE POLICY "org_delete_stock_closing_entries" ON stock_closing_entries
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Stock Closing Items Policies (check through stock_closing_entries relationship)
DROP POLICY IF EXISTS "org_access_stock_closing_items" ON stock_closing_items;
CREATE POLICY "org_access_stock_closing_items" ON stock_closing_items
  FOR ALL USING (
    closing_id IN (
      SELECT id FROM stock_closing_entries WHERE is_organization_member(organization_id)
    )
  );

-- Stock Account Mappings Policies
DROP POLICY IF EXISTS "org_read_stock_account_mappings" ON stock_account_mappings;
CREATE POLICY "org_read_stock_account_mappings" ON stock_account_mappings
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_stock_account_mappings" ON stock_account_mappings;
CREATE POLICY "org_write_stock_account_mappings" ON stock_account_mappings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_stock_account_mappings" ON stock_account_mappings;
CREATE POLICY "org_update_stock_account_mappings" ON stock_account_mappings
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_stock_account_mappings" ON stock_account_mappings;
CREATE POLICY "org_delete_stock_account_mappings" ON stock_account_mappings
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- =====================================================
-- ANALYSES & REPORTS TABLES
-- =====================================================

-- Analyses Policies (check through parcel relationship)
DROP POLICY IF EXISTS "org_read_analyses" ON analyses;
CREATE POLICY "org_read_analyses" ON analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = analyses.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_analyses" ON analyses;
CREATE POLICY "org_write_analyses" ON analyses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = analyses.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_analyses" ON analyses;
CREATE POLICY "org_update_analyses" ON analyses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = analyses.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_analyses" ON analyses;
CREATE POLICY "org_delete_analyses" ON analyses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = analyses.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

-- Analysis Recommendations Policies (check through analysis relationship)
DROP POLICY IF EXISTS "org_access_analysis_recommendations" ON analysis_recommendations;
CREATE POLICY "org_access_analysis_recommendations" ON analysis_recommendations
  FOR ALL USING (
    analysis_id IN (
      SELECT a.id FROM analyses a
      JOIN parcels p ON p.id = a.parcel_id
      JOIN farms f ON f.id = p.farm_id
      WHERE (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

-- Soil Analyses Policies (check through parcel relationship)
DROP POLICY IF EXISTS "org_read_soil_analyses" ON soil_analyses;
CREATE POLICY "org_read_soil_analyses" ON soil_analyses
  FOR SELECT USING (
    parcel_id IS NULL OR EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = soil_analyses.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_soil_analyses" ON soil_analyses;
CREATE POLICY "org_write_soil_analyses" ON soil_analyses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (parcel_id IS NULL OR EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = soil_analyses.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    ))
  );

DROP POLICY IF EXISTS "org_update_soil_analyses" ON soil_analyses;
CREATE POLICY "org_update_soil_analyses" ON soil_analyses
  FOR UPDATE USING (
    parcel_id IS NULL OR EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = soil_analyses.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_soil_analyses" ON soil_analyses;
CREATE POLICY "org_delete_soil_analyses" ON soil_analyses
  FOR DELETE USING (
    parcel_id IS NULL OR EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = soil_analyses.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

-- Test Types Policies (no organization_id - allow all authenticated users to read)
DROP POLICY IF EXISTS "org_read_test_types" ON test_types;
CREATE POLICY "org_read_test_types" ON test_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_test_types" ON test_types;
CREATE POLICY "org_write_test_types" ON test_types
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update_test_types" ON test_types;
CREATE POLICY "org_update_test_types" ON test_types
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_delete_test_types" ON test_types;
CREATE POLICY "org_delete_test_types" ON test_types
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Parcel Reports Policies (check through parcel relationship)
DROP POLICY IF EXISTS "org_read_parcel_reports" ON parcel_reports;
CREATE POLICY "org_read_parcel_reports" ON parcel_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = parcel_reports.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_parcel_reports" ON parcel_reports;
CREATE POLICY "org_write_parcel_reports" ON parcel_reports
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = parcel_reports.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_parcel_reports" ON parcel_reports;
CREATE POLICY "org_update_parcel_reports" ON parcel_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = parcel_reports.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_parcel_reports" ON parcel_reports;
CREATE POLICY "org_delete_parcel_reports" ON parcel_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM parcels p
      JOIN farms f ON f.id = p.farm_id
      WHERE p.id = parcel_reports.parcel_id
        AND (f.organization_id IS NULL OR is_organization_member(f.organization_id))
    )
  );

-- =====================================================
-- CROP MANAGEMENT TABLES
-- =====================================================

-- Crop Types Policies (no organization_id - allow all authenticated users to read)
DROP POLICY IF EXISTS "org_read_crop_types" ON crop_types;
CREATE POLICY "org_read_crop_types" ON crop_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_crop_types" ON crop_types;
CREATE POLICY "org_write_crop_types" ON crop_types
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update_crop_types" ON crop_types;
CREATE POLICY "org_update_crop_types" ON crop_types
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_delete_crop_types" ON crop_types;
CREATE POLICY "org_delete_crop_types" ON crop_types
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Crop Categories Policies (check through crop_types relationship)
DROP POLICY IF EXISTS "org_read_crop_categories" ON crop_categories;
CREATE POLICY "org_read_crop_categories" ON crop_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_crop_categories" ON crop_categories;
CREATE POLICY "org_write_crop_categories" ON crop_categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update_crop_categories" ON crop_categories;
CREATE POLICY "org_update_crop_categories" ON crop_categories
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_delete_crop_categories" ON crop_categories;
CREATE POLICY "org_delete_crop_categories" ON crop_categories
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Crop Varieties Policies (check through crop_categories relationship)
DROP POLICY IF EXISTS "org_read_crop_varieties" ON crop_varieties;
CREATE POLICY "org_read_crop_varieties" ON crop_varieties
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_crop_varieties" ON crop_varieties;
CREATE POLICY "org_write_crop_varieties" ON crop_varieties
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update_crop_varieties" ON crop_varieties;
CREATE POLICY "org_update_crop_varieties" ON crop_varieties
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_delete_crop_varieties" ON crop_varieties;
CREATE POLICY "org_delete_crop_varieties" ON crop_varieties
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Crops Policies (check through farm relationship)
DROP POLICY IF EXISTS "org_read_crops" ON crops;
CREATE POLICY "org_read_crops" ON crops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = crops.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_crops" ON crops;
CREATE POLICY "org_write_crops" ON crops
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = crops.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_crops" ON crops;
CREATE POLICY "org_update_crops" ON crops
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = crops.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_crops" ON crops;
CREATE POLICY "org_delete_crops" ON crops
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = crops.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Tree Categories Policies
DROP POLICY IF EXISTS "org_read_tree_categories" ON tree_categories;
CREATE POLICY "org_read_tree_categories" ON tree_categories
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_tree_categories" ON tree_categories;
CREATE POLICY "org_write_tree_categories" ON tree_categories
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_tree_categories" ON tree_categories;
CREATE POLICY "org_update_tree_categories" ON tree_categories
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_tree_categories" ON tree_categories;
CREATE POLICY "org_delete_tree_categories" ON tree_categories
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Trees Policies (check through tree_categories relationship)
DROP POLICY IF EXISTS "org_read_trees" ON trees;
CREATE POLICY "org_read_trees" ON trees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tree_categories
      WHERE tree_categories.id = trees.category_id
        AND is_organization_member(tree_categories.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_write_trees" ON trees;
CREATE POLICY "org_write_trees" ON trees
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM tree_categories
      WHERE tree_categories.id = trees.category_id
        AND is_organization_member(tree_categories.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_update_trees" ON trees;
CREATE POLICY "org_update_trees" ON trees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tree_categories
      WHERE tree_categories.id = trees.category_id
        AND is_organization_member(tree_categories.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_delete_trees" ON trees;
CREATE POLICY "org_delete_trees" ON trees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tree_categories
      WHERE tree_categories.id = trees.category_id
        AND is_organization_member(tree_categories.organization_id)
    )
  );

-- Plantation Types Policies
DROP POLICY IF EXISTS "org_read_plantation_types" ON plantation_types;
CREATE POLICY "org_read_plantation_types" ON plantation_types
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_plantation_types" ON plantation_types;
CREATE POLICY "org_write_plantation_types" ON plantation_types
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_plantation_types" ON plantation_types;
CREATE POLICY "org_update_plantation_types" ON plantation_types
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_plantation_types" ON plantation_types;
CREATE POLICY "org_delete_plantation_types" ON plantation_types
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- =====================================================
-- PRODUCT & INVENTORY CATEGORIES TABLES
-- =====================================================

-- Product Categories Policies (no organization_id - allow all authenticated users to read)
DROP POLICY IF EXISTS "org_read_product_categories" ON product_categories;
CREATE POLICY "org_read_product_categories" ON product_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_product_categories" ON product_categories;
CREATE POLICY "org_write_product_categories" ON product_categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update_product_categories" ON product_categories;
CREATE POLICY "org_update_product_categories" ON product_categories
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_delete_product_categories" ON product_categories;
CREATE POLICY "org_delete_product_categories" ON product_categories
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Product Subcategories Policies (check through product_categories relationship)
DROP POLICY IF EXISTS "org_read_product_subcategories" ON product_subcategories;
CREATE POLICY "org_read_product_subcategories" ON product_subcategories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_product_subcategories" ON product_subcategories;
CREATE POLICY "org_write_product_subcategories" ON product_subcategories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update_product_subcategories" ON product_subcategories;
CREATE POLICY "org_update_product_subcategories" ON product_subcategories
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_delete_product_subcategories" ON product_subcategories;
CREATE POLICY "org_delete_product_subcategories" ON product_subcategories
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Inventory (legacy table) Policies (check through farm relationship)
DROP POLICY IF EXISTS "org_read_inventory" ON inventory;
CREATE POLICY "org_read_inventory" ON inventory
  FOR SELECT USING (
    farm_id IS NULL OR EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = inventory.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    ) OR
    (organization_id IS NOT NULL AND is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_write_inventory" ON inventory;
CREATE POLICY "org_write_inventory" ON inventory
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (
      (farm_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM farms
        WHERE farms.id = inventory.farm_id
          AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
      )) OR
      (organization_id IS NOT NULL AND is_organization_member(organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_inventory" ON inventory;
CREATE POLICY "org_update_inventory" ON inventory
  FOR UPDATE USING (
    farm_id IS NULL OR EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = inventory.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    ) OR
    (organization_id IS NOT NULL AND is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_delete_inventory" ON inventory;
CREATE POLICY "org_delete_inventory" ON inventory
  FOR DELETE USING (
    farm_id IS NULL OR EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = inventory.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    ) OR
    (organization_id IS NOT NULL AND is_organization_member(organization_id))
  );

-- =====================================================
-- COSTS & REVENUES TABLES
-- =====================================================

-- Cost Categories Policies
DROP POLICY IF EXISTS "org_read_cost_categories" ON cost_categories;
CREATE POLICY "org_read_cost_categories" ON cost_categories
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_cost_categories" ON cost_categories;
CREATE POLICY "org_write_cost_categories" ON cost_categories
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_cost_categories" ON cost_categories;
CREATE POLICY "org_update_cost_categories" ON cost_categories
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_cost_categories" ON cost_categories;
CREATE POLICY "org_delete_cost_categories" ON cost_categories
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Costs Policies
DROP POLICY IF EXISTS "org_read_costs" ON costs;
CREATE POLICY "org_read_costs" ON costs
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_costs" ON costs;
CREATE POLICY "org_write_costs" ON costs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_costs" ON costs;
CREATE POLICY "org_update_costs" ON costs
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_costs" ON costs;
CREATE POLICY "org_delete_costs" ON costs
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Revenues Policies
DROP POLICY IF EXISTS "org_read_revenues" ON revenues;
CREATE POLICY "org_read_revenues" ON revenues
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_revenues" ON revenues;
CREATE POLICY "org_write_revenues" ON revenues
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_revenues" ON revenues;
CREATE POLICY "org_update_revenues" ON revenues
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_revenues" ON revenues;
CREATE POLICY "org_delete_revenues" ON revenues
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Profitability Snapshots Policies
DROP POLICY IF EXISTS "org_read_profitability_snapshots" ON profitability_snapshots;
CREATE POLICY "org_read_profitability_snapshots" ON profitability_snapshots
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_profitability_snapshots" ON profitability_snapshots;
CREATE POLICY "org_write_profitability_snapshots" ON profitability_snapshots
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_profitability_snapshots" ON profitability_snapshots;
CREATE POLICY "org_update_profitability_snapshots" ON profitability_snapshots
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_profitability_snapshots" ON profitability_snapshots;
CREATE POLICY "org_delete_profitability_snapshots" ON profitability_snapshots
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- =====================================================
-- INFRASTRUCTURE & STRUCTURES TABLES
-- =====================================================

-- Structures Policies
DROP POLICY IF EXISTS "org_read_structures" ON structures;
CREATE POLICY "org_read_structures" ON structures
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_structures" ON structures;
CREATE POLICY "org_write_structures" ON structures
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_structures" ON structures;
CREATE POLICY "org_update_structures" ON structures
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_structures" ON structures;
CREATE POLICY "org_delete_structures" ON structures
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Utilities Policies (check through farm relationship)
DROP POLICY IF EXISTS "org_read_utilities" ON utilities;
CREATE POLICY "org_read_utilities" ON utilities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = utilities.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_utilities" ON utilities;
CREATE POLICY "org_write_utilities" ON utilities
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = utilities.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_utilities" ON utilities;
CREATE POLICY "org_update_utilities" ON utilities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = utilities.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_utilities" ON utilities;
CREATE POLICY "org_delete_utilities" ON utilities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = utilities.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- =====================================================
-- ROLES & PERMISSIONS TABLES
-- =====================================================

-- Roles Policies (no organization_id - allow all authenticated users to read)
DROP POLICY IF EXISTS "org_read_roles" ON roles;
CREATE POLICY "org_read_roles" ON roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_roles" ON roles;
CREATE POLICY "org_write_roles" ON roles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update_roles" ON roles;
CREATE POLICY "org_update_roles" ON roles
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_delete_roles" ON roles;
CREATE POLICY "org_delete_roles" ON roles
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Permissions Policies (no organization_id - allow all authenticated users to read)
DROP POLICY IF EXISTS "org_read_permissions" ON permissions;
CREATE POLICY "org_read_permissions" ON permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_permissions" ON permissions;
CREATE POLICY "org_write_permissions" ON permissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update_permissions" ON permissions;
CREATE POLICY "org_update_permissions" ON permissions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_delete_permissions" ON permissions;
CREATE POLICY "org_delete_permissions" ON permissions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Role Permissions Policies (check through roles relationship)
DROP POLICY IF EXISTS "org_read_role_permissions" ON role_permissions;
CREATE POLICY "org_read_role_permissions" ON role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_role_permissions" ON role_permissions;
CREATE POLICY "org_write_role_permissions" ON role_permissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update_role_permissions" ON role_permissions;
CREATE POLICY "org_update_role_permissions" ON role_permissions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_delete_role_permissions" ON role_permissions;
CREATE POLICY "org_delete_role_permissions" ON role_permissions
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Role Templates Policies
DROP POLICY IF EXISTS "org_read_role_templates" ON role_templates;
CREATE POLICY "org_read_role_templates" ON role_templates
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id) OR is_system_template = true
  );

DROP POLICY IF EXISTS "org_write_role_templates" ON role_templates;
CREATE POLICY "org_write_role_templates" ON role_templates
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_role_templates" ON role_templates;
CREATE POLICY "org_update_role_templates" ON role_templates
  FOR UPDATE USING (
    (organization_id IS NULL OR is_organization_member(organization_id)) OR is_system_template = true
  );

DROP POLICY IF EXISTS "org_delete_role_templates" ON role_templates;
CREATE POLICY "org_delete_role_templates" ON role_templates
  FOR DELETE USING (
    (organization_id IS NULL OR is_organization_member(organization_id)) AND is_system_template = false
  );

-- Role Assignments Audit Policies
DROP POLICY IF EXISTS "org_read_role_assignments_audit" ON role_assignments_audit;
CREATE POLICY "org_read_role_assignments_audit" ON role_assignments_audit
  FOR SELECT USING (
    is_organization_member(organization_id) OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "org_write_role_assignments_audit" ON role_assignments_audit;
CREATE POLICY "org_write_role_assignments_audit" ON role_assignments_audit
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

-- Permission Groups Policies (no organization_id - allow all authenticated users to read)
DROP POLICY IF EXISTS "org_read_permission_groups" ON permission_groups;
CREATE POLICY "org_read_permission_groups" ON permission_groups
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_permission_groups" ON permission_groups;
CREATE POLICY "org_write_permission_groups" ON permission_groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_update_permission_groups" ON permission_groups;
CREATE POLICY "org_update_permission_groups" ON permission_groups
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_delete_permission_groups" ON permission_groups;
CREATE POLICY "org_delete_permission_groups" ON permission_groups
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- AUDIT & LOGGING TABLES
-- =====================================================

-- Audit Logs Policies (allow users to see their own audit logs or org members to see org logs)
DROP POLICY IF EXISTS "org_read_audit_logs" ON audit_logs;
CREATE POLICY "org_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_write_audit_logs" ON audit_logs;
CREATE POLICY "org_write_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Financial Transactions Policies (check through farm relationship)
DROP POLICY IF EXISTS "org_read_financial_transactions" ON financial_transactions;
CREATE POLICY "org_read_financial_transactions" ON financial_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = financial_transactions.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_financial_transactions" ON financial_transactions;
CREATE POLICY "org_write_financial_transactions" ON financial_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = financial_transactions.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_financial_transactions" ON financial_transactions;
CREATE POLICY "org_update_financial_transactions" ON financial_transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = financial_transactions.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_financial_transactions" ON financial_transactions;
CREATE POLICY "org_delete_financial_transactions" ON financial_transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = financial_transactions.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Livestock Policies (check through farm relationship)
DROP POLICY IF EXISTS "org_read_livestock" ON livestock;
CREATE POLICY "org_read_livestock" ON livestock
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = livestock.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_write_livestock" ON livestock;
CREATE POLICY "org_write_livestock" ON livestock
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = livestock.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_update_livestock" ON livestock;
CREATE POLICY "org_update_livestock" ON livestock
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = livestock.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

DROP POLICY IF EXISTS "org_delete_livestock" ON livestock;
CREATE POLICY "org_delete_livestock" ON livestock
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = livestock.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Subscription Usage Policies
DROP POLICY IF EXISTS "org_read_subscription_usage" ON subscription_usage;
CREATE POLICY "org_read_subscription_usage" ON subscription_usage
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_subscription_usage" ON subscription_usage;
CREATE POLICY "org_write_subscription_usage" ON subscription_usage
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_subscription_usage" ON subscription_usage;
CREATE POLICY "org_update_subscription_usage" ON subscription_usage
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_subscription_usage" ON subscription_usage;
CREATE POLICY "org_delete_subscription_usage" ON subscription_usage
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- =====================================================
-- SATELLITE DATA TABLES
-- =====================================================

-- Satellite AOIs Policies
DROP POLICY IF EXISTS "org_read_satellite_aois" ON satellite_aois;
CREATE POLICY "org_read_satellite_aois" ON satellite_aois
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_satellite_aois" ON satellite_aois;
CREATE POLICY "org_write_satellite_aois" ON satellite_aois
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_satellite_aois" ON satellite_aois;
CREATE POLICY "org_update_satellite_aois" ON satellite_aois
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_satellite_aois" ON satellite_aois;
CREATE POLICY "org_delete_satellite_aois" ON satellite_aois
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Satellite Files Policies
DROP POLICY IF EXISTS "org_read_satellite_files" ON satellite_files;
CREATE POLICY "org_read_satellite_files" ON satellite_files
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_satellite_files" ON satellite_files;
CREATE POLICY "org_write_satellite_files" ON satellite_files
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_satellite_files" ON satellite_files;
CREATE POLICY "org_update_satellite_files" ON satellite_files
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_satellite_files" ON satellite_files;
CREATE POLICY "org_delete_satellite_files" ON satellite_files
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Satellite Indices Data Policies
DROP POLICY IF EXISTS "org_read_satellite_indices_data" ON satellite_indices_data;
CREATE POLICY "org_read_satellite_indices_data" ON satellite_indices_data
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_satellite_indices_data" ON satellite_indices_data;
CREATE POLICY "org_write_satellite_indices_data" ON satellite_indices_data
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_satellite_indices_data" ON satellite_indices_data;
CREATE POLICY "org_update_satellite_indices_data" ON satellite_indices_data
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_satellite_indices_data" ON satellite_indices_data;
CREATE POLICY "org_delete_satellite_indices_data" ON satellite_indices_data
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Satellite Processing Jobs Policies
DROP POLICY IF EXISTS "org_read_satellite_processing_jobs" ON satellite_processing_jobs;
CREATE POLICY "org_read_satellite_processing_jobs" ON satellite_processing_jobs
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_satellite_processing_jobs" ON satellite_processing_jobs;
CREATE POLICY "org_write_satellite_processing_jobs" ON satellite_processing_jobs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_satellite_processing_jobs" ON satellite_processing_jobs;
CREATE POLICY "org_update_satellite_processing_jobs" ON satellite_processing_jobs
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_satellite_processing_jobs" ON satellite_processing_jobs;
CREATE POLICY "org_delete_satellite_processing_jobs" ON satellite_processing_jobs
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Satellite Processing Tasks Policies
DROP POLICY IF EXISTS "org_read_satellite_processing_tasks" ON satellite_processing_tasks;
CREATE POLICY "org_read_satellite_processing_tasks" ON satellite_processing_tasks
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_satellite_processing_tasks" ON satellite_processing_tasks;
CREATE POLICY "org_write_satellite_processing_tasks" ON satellite_processing_tasks
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_satellite_processing_tasks" ON satellite_processing_tasks;
CREATE POLICY "org_update_satellite_processing_tasks" ON satellite_processing_tasks
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_satellite_processing_tasks" ON satellite_processing_tasks;
CREATE POLICY "org_delete_satellite_processing_tasks" ON satellite_processing_tasks
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Cloud Coverage Checks Policies
DROP POLICY IF EXISTS "org_read_cloud_coverage_checks" ON cloud_coverage_checks;
CREATE POLICY "org_read_cloud_coverage_checks" ON cloud_coverage_checks
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_cloud_coverage_checks" ON cloud_coverage_checks;
CREATE POLICY "org_write_cloud_coverage_checks" ON cloud_coverage_checks
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_cloud_coverage_checks" ON cloud_coverage_checks;
CREATE POLICY "org_update_cloud_coverage_checks" ON cloud_coverage_checks
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_cloud_coverage_checks" ON cloud_coverage_checks;
CREATE POLICY "org_delete_cloud_coverage_checks" ON cloud_coverage_checks
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- =====================================================
-- INTERNATIONAL CHART OF ACCOUNTS SEEDING FUNCTIONS
-- =====================================================

-- =====================================================
-- MOROCCAN CHART OF ACCOUNTS (Plan Comptable Marocain - CGNC)
-- =====================================================
-- Currency: MAD (Moroccan Dirham)
-- Standard: Code Général de Normalisation Comptable (CGNC)
-- Suitable for: Agricultural businesses in Morocco
-- =====================================================

-- This function creates the complete Moroccan chart of accounts for an organization
CREATE OR REPLACE FUNCTION seed_moroccan_chart_of_accounts(p_org_id UUID)
RETURNS TABLE(
  accounts_created INTEGER,
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Verify organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN QUERY SELECT 0, false, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- =====================================================
  -- CLASS 1: FIXED ASSETS (IMMOBILISATIONS)
  -- =====================================================

  -- Main Groups
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code, description_fr, description_ar)
  VALUES
    (p_org_id, '2100', 'Immobilisations en non-valeurs', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Frais préliminaires et charges à répartir', 'أصول غير ملموسة'),
    (p_org_id, '2200', 'Immobilisations incorporelles', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Brevets, marques, fonds commercial', 'أصول غير ملموسة'),
    (p_org_id, '2300', 'Immobilisations corporelles', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Terrains, constructions, matériel', 'أصول ملموسة'),
    (p_org_id, '2400', 'Immobilisations financières', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Titres de participation, prêts', 'استثمارات مالية')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Fixed Assets Detail
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, parent_code, currency_code)
  VALUES
    -- Land and Buildings
    (p_org_id, '2310', 'Terrains agricoles', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2311', 'Terrains bâtis', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2321', 'Bâtiments agricoles', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2323', 'Installations agricoles', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),

    -- Equipment and Machinery
    (p_org_id, '2330', 'Matériel et outillage', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2331', 'Tracteurs et machines agricoles', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2332', 'Système d''irrigation', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2340', 'Matériel de transport', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2350', 'Mobilier, matériel de bureau', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2355', 'Matériel informatique', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),

    -- Biological Assets
    (p_org_id, '2361', 'Cheptel (animaux d''élevage)', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2362', 'Plantations permanentes', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Depreciation Accounts
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, parent_code, currency_code)
  VALUES
    (p_org_id, '2800', 'Amortissements', 'Asset', 'Accumulated Depreciation', true, true, NULL, 'MAD'),
    (p_org_id, '2832', 'Amortissements bâtiments', 'Asset', 'Accumulated Depreciation', false, true, '2800', 'MAD'),
    (p_org_id, '2833', 'Amortissements installations', 'Asset', 'Accumulated Depreciation', false, true, '2800', 'MAD'),
    (p_org_id, '2834', 'Amortissements matériel', 'Asset', 'Accumulated Depreciation', false, true, '2800', 'MAD'),
    (p_org_id, '2835', 'Amortissements transport', 'Asset', 'Accumulated Depreciation', false, true, '2800', 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- CLASS 3: CURRENT ASSETS (STOCKS)
  -- =====================================================

  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    -- Inventory Groups
    (p_org_id, '3100', 'Stocks matières premières', 'Asset', 'Inventory', true, true, 'MAD'),
    (p_org_id, '3110', 'Semences et plants', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3111', 'Engrais et amendements', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3112', 'Produits phytosanitaires', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3113', 'Aliments pour bétail', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3114', 'Carburants et lubrifiants', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3115', 'Emballages', 'Asset', 'Inventory', false, true, 'MAD'),

    -- Work in Progress
    (p_org_id, '3130', 'Produits en cours', 'Asset', 'Inventory', true, true, 'MAD'),
    (p_org_id, '3131', 'Cultures en cours', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3132', 'Élevage en cours', 'Asset', 'Inventory', false, true, 'MAD'),

    -- Finished Goods
    (p_org_id, '3500', 'Produits finis', 'Asset', 'Inventory', true, true, 'MAD'),
    (p_org_id, '3510', 'Récoltes', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3511', 'Fruits et légumes', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3512', 'Céréales', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3513', 'Produits d''origine animale', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3514', 'Produits transformés', 'Asset', 'Inventory', false, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- CLASS 4: THIRD-PARTY ACCOUNTS (CRÉANCES ET DETTES)
  -- =====================================================

  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    -- Suppliers
    (p_org_id, '4410', 'Fournisseurs', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4411', 'Fournisseurs - intrants agricoles', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4412', 'Fournisseurs - équipements', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4415', 'Fournisseurs - effets à payer', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4417', 'Fournisseurs - retenues de garantie', 'Liability', 'Payable', false, true, 'MAD'),

    -- Customers
    (p_org_id, '3420', 'Clients', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3421', 'Clients - ventes agricoles', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3422', 'Clients - exportations', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3425', 'Clients - effets à recevoir', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3427', 'Clients - retenues de garantie', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3428', 'Clients douteux', 'Asset', 'Receivable', false, true, 'MAD'),

    -- Advances
    (p_org_id, '3490', 'Avances aux employés', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '4410', 'Avances aux fournisseurs', 'Asset', 'Receivable', false, true, 'MAD'),

    -- Social Security and Taxes
    (p_org_id, '4430', 'Sécurité sociale (CNSS)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4432', 'Retraite (RCAR/CMR)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4433', 'Assurance maladie (AMO)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4441', 'État - Impôt sur les sociétés (IS)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4443', 'Retenue à la source', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4455', 'TVA due', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4456', 'TVA déductible', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '4457', 'TVA collectée', 'Liability', 'Payable', false, true, 'MAD'),

    -- Personnel
    (p_org_id, '4430', 'Rémunérations dues au personnel', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4432', 'Saisies et oppositions', 'Liability', 'Payable', false, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- CLASS 5: FINANCIAL ACCOUNTS (TRÉSORERIE)
  -- =====================================================

  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '5141', 'Banque - Compte courant', 'Asset', 'Cash', false, true, 'MAD'),
    (p_org_id, '5142', 'Banque - Compte USD', 'Asset', 'Cash', false, true, 'USD'),
    (p_org_id, '5143', 'Banque - Compte EUR', 'Asset', 'Cash', false, true, 'EUR'),
    (p_org_id, '5146', 'Chèques postaux', 'Asset', 'Cash', false, true, 'MAD'),
    (p_org_id, '5161', 'Caisse principale', 'Asset', 'Cash', false, true, 'MAD'),
    (p_org_id, '5162', 'Caisse ferme', 'Asset', 'Cash', false, true, 'MAD'),
    (p_org_id, '5165', 'Régies d''avances', 'Asset', 'Cash', false, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- CLASS 6: EXPENSES (CHARGES)
  -- =====================================================

  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    -- Operating Expenses
    (p_org_id, '6000', 'Charges d''exploitation', 'Expense', 'Operating Expense', true, true, 'MAD'),

    -- Agricultural Supplies
    (p_org_id, '6110', 'Achats de semences et plants', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6111', 'Achats d''engrais', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6112', 'Achats de produits phytosanitaires', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6113', 'Achats d''aliments pour bétail', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6114', 'Achats d''animaux', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6115', 'Achats d''emballages', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Consumables
    (p_org_id, '6121', 'Eau d''irrigation', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6124', 'Carburants et lubrifiants', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6125', 'Entretien et réparations', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6126', 'Pièces de rechange', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Services
    (p_org_id, '6131', 'Locations machines agricoles', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6132', 'Redevances de crédit-bail', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6133', 'Entretien et réparations', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6134', 'Primes d''assurances', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6141', 'Services agricoles externes', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6142', 'Services vétérinaires', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6143', 'Analyses de laboratoire', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6144', 'Transport sur achats', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6145', 'Transport sur ventes', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Utilities (Services publics)
    (p_org_id, '6167', 'Électricité', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6061', 'Eau', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6065', 'Gaz', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6227', 'Téléphone', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6228', 'Internet', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Personnel Costs
    (p_org_id, '6171', 'Salaires permanents', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6172', 'Salaires journaliers', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6173', 'Salaires saisonniers', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6174', 'Primes et gratifications', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6175', 'Indemnités', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6176', 'Charges sociales - CNSS', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6177', 'Charges sociales - AMO', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6178', 'Formation du personnel', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Taxes and Fees
    (p_org_id, '6161', 'Impôts et taxes agricoles', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6165', 'Taxes locales', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Financial Expenses
    (p_org_id, '6311', 'Intérêts des emprunts', 'Expense', 'Financial Expense', false, true, 'MAD'),
    (p_org_id, '6313', 'Frais bancaires', 'Expense', 'Financial Expense', false, true, 'MAD'),

    -- Depreciation
    (p_org_id, '6193', 'Dotations aux amortissements', 'Expense', 'Depreciation', false, true, 'MAD'),
    (p_org_id, '6196', 'Dotations aux provisions', 'Expense', 'Operating Expense', false, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- CLASS 7: REVENUES (PRODUITS)
  -- =====================================================

  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '7000', 'Produits d''exploitation', 'Revenue', 'Operating Revenue', true, true, 'MAD'),

    -- Sales of Agricultural Products
    (p_org_id, '7111', 'Ventes fruits et légumes', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7112', 'Ventes céréales', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7113', 'Ventes plantes aromatiques', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7114', 'Ventes produits d''élevage', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7115', 'Ventes lait et produits laitiers', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7116', 'Ventes œufs', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7117', 'Ventes animaux', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7118', 'Ventes produits transformés', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7119', 'Ventes exportations', 'Revenue', 'Operating Revenue', false, true, 'MAD'),

    -- Services
    (p_org_id, '7121', 'Prestations de services agricoles', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7122', 'Location de matériel', 'Revenue', 'Operating Revenue', false, true, 'MAD'),

    -- Subsidies and Grants
    (p_org_id, '7130', 'Subventions d''exploitation', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7131', 'Subventions agricoles', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7132', 'Aides de l''État', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7133', 'Fonds de développement agricole', 'Revenue', 'Operating Revenue', false, true, 'MAD'),

    -- Other Operating Revenue
    (p_org_id, '7180', 'Autres produits d''exploitation', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7181', 'Indemnités d''assurances', 'Revenue', 'Operating Revenue', false, true, 'MAD'),

    -- Financial Revenue
    (p_org_id, '7381', 'Intérêts et produits assimilés', 'Revenue', 'Financial Revenue', false, true, 'MAD'),
    (p_org_id, '7385', 'Gains de change', 'Revenue', 'Financial Revenue', false, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Get count of created accounts
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM accounts
  WHERE organization_id = p_org_id;

  RETURN QUERY SELECT v_count, true, 'Chart of accounts created successfully'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0, false, SQLERRM::TEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION seed_moroccan_chart_of_accounts TO authenticated;

COMMENT ON FUNCTION seed_moroccan_chart_of_accounts IS
'Seeds complete Moroccan chart of accounts (CGNC) for an organization. Returns count of accounts created.';

-- =====================================================
-- GENERIC MULTI-COUNTRY CHART OF ACCOUNTS SEEDING
-- =====================================================

-- Generic function to seed chart of accounts from templates
CREATE OR REPLACE FUNCTION seed_chart_of_accounts(
  p_org_id UUID,
  p_country_code VARCHAR(2) DEFAULT NULL,
  p_accounting_standard VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE(
  accounts_created INTEGER,
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  v_country_code VARCHAR(2);
  v_accounting_standard VARCHAR(50);
  v_accounts_created INTEGER := 0;
  v_template_rec RECORD;
  v_parent_id UUID;
BEGIN
  -- Validate organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN QUERY SELECT 0, false, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- Get organization's country and standard if not provided
  IF p_country_code IS NULL OR p_accounting_standard IS NULL THEN
    SELECT country_code, accounting_standard
    INTO v_country_code, v_accounting_standard
    FROM organizations
    WHERE id = p_org_id;

    -- Use provided values if available
    v_country_code := COALESCE(p_country_code, v_country_code);
    v_accounting_standard := COALESCE(p_accounting_standard, v_accounting_standard);

    IF v_country_code IS NULL THEN
      RETURN QUERY SELECT 0, false, 'Organization country_code not set and not provided'::TEXT;
      RETURN;
    END IF;

    IF v_accounting_standard IS NULL THEN
      RETURN QUERY SELECT 0, false, 'Organization accounting_standard not set and not provided'::TEXT;
      RETURN;
    END IF;
  ELSE
    v_country_code := p_country_code;
    v_accounting_standard := p_accounting_standard;
  END IF;

  -- Check if template exists
  IF NOT EXISTS (
    SELECT 1 FROM account_templates
    WHERE country_code = v_country_code
    AND accounting_standard = v_accounting_standard
  ) THEN
    RETURN QUERY SELECT 0, false,
      ('No account template found for country: ' || v_country_code ||
       ' standard: ' || v_accounting_standard)::TEXT;
    RETURN;
  END IF;

  -- Clear existing accounts for this org
  DELETE FROM accounts WHERE organization_id = p_org_id;

  -- Insert accounts from template in correct order (parents first)
  FOR v_template_rec IN
    SELECT * FROM account_templates
    WHERE country_code = v_country_code
    AND accounting_standard = v_accounting_standard
    ORDER BY
      CASE WHEN parent_code IS NULL THEN 0 ELSE 1 END,  -- Parents first
      display_order NULLS LAST,
      account_code
  LOOP
    -- Find parent_id if parent_code exists
    v_parent_id := NULL;
    IF v_template_rec.parent_code IS NOT NULL THEN
      SELECT id INTO v_parent_id
      FROM accounts
      WHERE organization_id = p_org_id
      AND code = v_template_rec.parent_code;
    END IF;

    -- Insert account
    INSERT INTO accounts (
      organization_id,
      code,
      name,
      account_type,
      account_subtype,
      parent_id,
      description,
      is_group,
      is_active
    ) VALUES (
      p_org_id,
      v_template_rec.account_code,
      v_template_rec.account_name,
      v_template_rec.account_type,
      v_template_rec.account_subtype,
      v_parent_id,
      v_template_rec.description,
      v_template_rec.is_group,
      v_template_rec.is_active
    );

    v_accounts_created := v_accounts_created + 1;
  END LOOP;

  RETURN QUERY SELECT v_accounts_created, true,
    ('Successfully created ' || v_accounts_created || ' accounts for ' ||
     v_country_code || ' - ' || v_accounting_standard)::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0, false, SQLERRM::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION seed_chart_of_accounts TO authenticated;

COMMENT ON FUNCTION seed_chart_of_accounts IS
'Generic function to seed chart of accounts from templates based on organization country and accounting standard. Supports MA/PCEC, TN/PCN, FR/PCG, US/GAAP, GB/FRS102.';

-- =====================================================
-- FRANCE CHART OF ACCOUNTS
-- =====================================================

-- =====================================================
-- FRENCH CHART OF ACCOUNTS (Plan Comptable Général - PCG)
-- =====================================================
-- Currency: EUR (Euro)
-- Standard: Plan Comptable Général (PCG 2014)
-- Suitable for: Agricultural businesses in France
-- DEPRECATED: Use seed_chart_of_accounts() instead
-- =====================================================

CREATE OR REPLACE FUNCTION seed_french_chart_of_accounts(p_org_id UUID)
RETURNS TABLE(
  accounts_created INTEGER,
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN QUERY SELECT 0, false, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- CLASS 1: CAPITAL (CAPITAUX PROPRES)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '101', 'Capital social', 'Equity', 'Capital', false, true, 'EUR'),
    (p_org_id, '106', 'Réserves', 'Equity', 'Retained Earnings', false, true, 'EUR'),
    (p_org_id, '120', 'Résultat de l''exercice', 'Equity', 'Current Year Earnings', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 2: FIXED ASSETS (IMMOBILISATIONS)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '211', 'Terrains agricoles', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '213', 'Constructions agricoles', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '215', 'Installations techniques', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '2154', 'Matériel agricole', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '2155', 'Tracteurs et véhicules', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '218', 'Autres immobilisations corporelles', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '2181', 'Cheptel reproducteur', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '2182', 'Plantations pérennes', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '2813', 'Amortissements constructions', 'Asset', 'Accumulated Depreciation', false, true, 'EUR'),
    (p_org_id, '2815', 'Amortissements matériel', 'Asset', 'Accumulated Depreciation', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 3: INVENTORY (STOCKS)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '311', 'Semences et plants', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '312', 'Engrais et amendements', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '313', 'Produits phytosanitaires', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '314', 'Aliments pour le bétail', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '315', 'Combustibles et carburants', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '321', 'Cultures en cours', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '322', 'Élevage en cours', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '355', 'Produits agricoles finis', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '3551', 'Céréales', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '3552', 'Fruits et légumes', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '3553', 'Vin et produits viticoles', 'Asset', 'Inventory', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 4: THIRD PARTIES (TIERS)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '401', 'Fournisseurs', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '4011', 'Fournisseurs - intrants', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '4081', 'Fournisseurs - factures non parvenues', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '411', 'Clients', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '4111', 'Clients - ventes agricoles', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '416', 'Clients douteux', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '4181', 'Clients - factures à établir', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '421', 'Personnel - rémunérations dues', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '431', 'Sécurité sociale', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '437', 'Autres organismes sociaux', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '4424', 'Impôt sur les sociétés', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '443', 'Opérations avec l''État', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '4431', 'Subventions à recevoir', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '44551', 'TVA à décaisser', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '44562', 'TVA déductible sur immobilisations', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '44566', 'TVA déductible sur autres biens', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '44571', 'TVA collectée', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '467', 'Autres comptes débiteurs ou créditeurs', 'Asset', 'Receivable', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 5: FINANCIAL ACCOUNTS (COMPTES FINANCIERS)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '512', 'Banque', 'Asset', 'Cash', false, true, 'EUR'),
    (p_org_id, '5121', 'Banque - Compte principal', 'Asset', 'Cash', false, true, 'EUR'),
    (p_org_id, '5124', 'Banque - Compte agricole', 'Asset', 'Cash', false, true, 'EUR'),
    (p_org_id, '531', 'Caisse', 'Asset', 'Cash', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 6: EXPENSES (CHARGES)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '601', 'Achats stockés - Matières premières', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6011', 'Achats semences et plants', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6012', 'Achats engrais', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6013', 'Achats produits phytosanitaires', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6014', 'Achats aliments pour bétail', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6015', 'Achats animaux', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '602', 'Achats stockés - Autres approvisionnements', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6021', 'Achats combustibles', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6022', 'Achats produits d''entretien', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '606', 'Achats non stockés', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6061', 'Fournitures non stockables (eau)', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '611', 'Sous-traitance générale', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6111', 'Travaux agricoles', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '613', 'Locations', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6132', 'Locations matériel agricole', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '615', 'Entretien et réparations', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6151', 'Entretien bâtiments', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6155', 'Entretien matériel', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '616', 'Primes d''assurances', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6161', 'Assurances multirisque', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '622', 'Rémunérations d''intermédiaires', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6226', 'Honoraires', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6227', 'Frais vétérinaires', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '624', 'Transports de biens', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6241', 'Transports sur achats', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6242', 'Transports sur ventes', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '625', 'Déplacements, missions', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '626', 'Frais postaux et télécommunications', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6261', 'Téléphone', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6262', 'Internet', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '606', 'Eau et électricité', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6061', 'Eau', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6063', 'Électricité', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '641', 'Rémunérations du personnel', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6411', 'Salaires permanents', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6412', 'Salaires saisonniers', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6413', 'Primes et gratifications', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '645', 'Charges de sécurité sociale', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6451', 'Cotisations URSSAF', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6452', 'Cotisations MSA', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '661', 'Charges d''intérêts', 'Expense', 'Financial Expense', false, true, 'EUR'),
    (p_org_id, '6611', 'Intérêts emprunts bancaires', 'Expense', 'Financial Expense', false, true, 'EUR'),
    (p_org_id, '666', 'Pertes de change', 'Expense', 'Financial Expense', false, true, 'EUR'),
    (p_org_id, '6811', 'Dotations aux amortissements', 'Expense', 'Depreciation', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 7: REVENUES (PRODUITS)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '701', 'Ventes de produits finis', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7011', 'Ventes céréales', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7012', 'Ventes fruits et légumes', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7013', 'Ventes vin', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7014', 'Ventes lait', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7015', 'Ventes viande', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7016', 'Ventes animaux vivants', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7017', 'Ventes œufs', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '706', 'Prestations de services', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7061', 'Travaux agricoles', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '74', 'Subventions d''exploitation', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '741', 'Aides PAC', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7411', 'Aides aux surfaces', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7412', 'Aides animales', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7413', 'Aides découplées', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '748', 'Autres subventions', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '758', 'Produits divers de gestion courante', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7581', 'Indemnités d''assurance', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '763', 'Revenus des créances', 'Revenue', 'Financial Revenue', false, true, 'EUR'),
    (p_org_id, '766', 'Gains de change', 'Revenue', 'Financial Revenue', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  SELECT COUNT(*)::INTEGER INTO v_count FROM accounts WHERE organization_id = p_org_id;
  RETURN QUERY SELECT v_count, true, 'French chart of accounts created successfully'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0, false, SQLERRM::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION seed_french_chart_of_accounts TO authenticated;

COMMENT ON FUNCTION seed_french_chart_of_accounts IS
'Seeds complete French chart of accounts (PCG) for an organization';

-- =====================================================
-- COST AND REVENUE LEDGER INTEGRATION
-- =====================================================

-- Helper function to get account ID by code (backward compatibility)
CREATE OR REPLACE FUNCTION get_account_id_by_code(
  p_org_id UUID,
  p_code TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  SELECT id INTO v_account_id
  FROM accounts
  WHERE organization_id = p_org_id
    AND code = p_code
    AND is_active = true
  LIMIT 1;

  RETURN v_account_id;
END;
$$;

-- New helper function to get account ID using mapping system
CREATE OR REPLACE FUNCTION get_account_id_by_mapping(
  p_org_id UUID,
  p_mapping_type VARCHAR(50),  -- 'cost_type', 'revenue_type', 'cash'
  p_mapping_key VARCHAR(100)   -- 'labor', 'harvest', 'bank', etc.
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
  v_account_code VARCHAR(50);
  v_country_code VARCHAR(2);
  v_accounting_standard VARCHAR(50);
BEGIN
  -- Get organization's country and standard
  SELECT country_code, accounting_standard
  INTO v_country_code, v_accounting_standard
  FROM organizations
  WHERE id = p_org_id;

  -- If no country/standard, return NULL
  IF v_country_code IS NULL OR v_accounting_standard IS NULL THEN
    RAISE NOTICE 'Organization % has no country_code or accounting_standard set', p_org_id;
    RETURN NULL;
  END IF;

  -- Get mapped account code
  SELECT account_code INTO v_account_code
  FROM account_mappings
  WHERE country_code = v_country_code
    AND accounting_standard = v_accounting_standard
    AND mapping_type = p_mapping_type
    AND mapping_key = p_mapping_key;

  -- If no mapping found, return NULL
  IF v_account_code IS NULL THEN
    RAISE NOTICE 'No account mapping found for org % type % key % (country: %, standard: %)',
      p_org_id, p_mapping_type, p_mapping_key, v_country_code, v_accounting_standard;
    RETURN NULL;
  END IF;

  -- Get account ID
  SELECT id INTO v_account_id
  FROM accounts
  WHERE organization_id = p_org_id
    AND code = v_account_code
    AND is_active = true;

  -- If account not found, log warning
  IF v_account_id IS NULL THEN
    RAISE NOTICE 'Account code % not found for organization %', v_account_code, p_org_id;
  END IF;

  RETURN v_account_id;
END;
$$;

-- Trigger function to create journal entry when cost is inserted
-- Now uses multi-country account mapping system
CREATE OR REPLACE FUNCTION create_cost_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journal_entry_id UUID;
  v_expense_account_id UUID;
  v_cash_account_id UUID;
  v_entry_number TEXT;
BEGIN
  -- Generate journal entry number
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0')
  INTO v_entry_number;

  -- Get expense account using mapping system (works for all countries)
  v_expense_account_id := get_account_id_by_mapping(
    NEW.organization_id,
    'cost_type',
    NEW.cost_type
  );

  -- Get cash account using mapping system
  v_cash_account_id := get_account_id_by_mapping(
    NEW.organization_id,
    'cash',
    'bank'
  );

  -- Only create journal entry if both accounts exist
  IF v_expense_account_id IS NOT NULL AND v_cash_account_id IS NOT NULL THEN
    -- Create journal entry
    INSERT INTO journal_entries (
      organization_id,
      entry_number,
      entry_date,
      entry_type,
      description,
      reference_id,
      reference_type,
      total_debit,
      total_credit,
      status,
      created_by
    ) VALUES (
      NEW.organization_id,
      v_entry_number,
      NEW.date,
      'expense',
      COALESCE(NEW.description, 'Cost entry: ' || NEW.cost_type),
      NEW.id,
      'cost',
      NEW.amount,
      NEW.amount,
      'posted',
      NEW.created_by
    ) RETURNING id INTO v_journal_entry_id;

    -- Create journal items (debit expense, credit cash)
    INSERT INTO journal_items (journal_entry_id, account_id, debit, credit, description)
    VALUES
      (v_journal_entry_id, v_expense_account_id, NEW.amount, 0, NEW.description),
      (v_journal_entry_id, v_cash_account_id, 0, NEW.amount, 'Payment for ' || NEW.cost_type);
  ELSE
    RAISE NOTICE 'Skipping journal entry for cost % - missing account mappings (expense: %, cash: %)',
      NEW.id, v_expense_account_id, v_cash_account_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function to create journal entry when revenue is inserted
-- Now uses multi-country account mapping system
CREATE OR REPLACE FUNCTION create_revenue_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journal_entry_id UUID;
  v_revenue_account_id UUID;
  v_cash_account_id UUID;
  v_entry_number TEXT;
BEGIN
  -- Generate journal entry number
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0')
  INTO v_entry_number;

  -- Get revenue account using mapping system (works for all countries)
  v_revenue_account_id := get_account_id_by_mapping(
    NEW.organization_id,
    'revenue_type',
    NEW.revenue_type
  );

  -- Get cash account using mapping system
  v_cash_account_id := get_account_id_by_mapping(
    NEW.organization_id,
    'cash',
    'bank'
  );

  -- Only create journal entry if both accounts exist
  IF v_revenue_account_id IS NOT NULL AND v_cash_account_id IS NOT NULL THEN
    -- Create journal entry
    INSERT INTO journal_entries (
      organization_id,
      entry_number,
      entry_date,
      entry_type,
      description,
      reference_id,
      reference_type,
      total_debit,
      total_credit,
      status,
      created_by
    ) VALUES (
      NEW.organization_id,
      v_entry_number,
      NEW.date,
      'revenue',
      COALESCE(NEW.description, 'Revenue entry: ' || NEW.revenue_type),
      NEW.id,
      'revenue',
      NEW.amount,
      NEW.amount,
      'posted',
      NEW.created_by
    ) RETURNING id INTO v_journal_entry_id;

    -- Create journal items (debit cash, credit revenue)
    INSERT INTO journal_items (journal_entry_id, account_id, debit, credit, description)
    VALUES
      (v_journal_entry_id, v_cash_account_id, NEW.amount, 0, 'Receipt for ' || NEW.revenue_type),
      (v_journal_entry_id, v_revenue_account_id, 0, NEW.amount, NEW.description);
  ELSE
    RAISE NOTICE 'Skipping journal entry for revenue % - missing account mappings (revenue: %, cash: %)',
      NEW.id, v_revenue_account_id, v_cash_account_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_cost_create_journal_entry ON costs;
CREATE TRIGGER trg_cost_create_journal_entry
  AFTER INSERT ON costs
  FOR EACH ROW
  EXECUTE FUNCTION create_cost_journal_entry();

DROP TRIGGER IF EXISTS trg_revenue_create_journal_entry ON revenues;
CREATE TRIGGER trg_revenue_create_journal_entry
  AFTER INSERT ON revenues
  FOR EACH ROW
  EXECUTE FUNCTION create_revenue_journal_entry();

-- Create sequence for journal entry numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS journal_entry_seq START 1;
