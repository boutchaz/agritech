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
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
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
  account_type VARCHAR(20) DEFAULT 'business' CHECK (account_type IN ('individual', 'business', 'farm')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Add account_type column for existing databases (safe migration)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'business' CHECK (account_type IN ('individual', 'business', 'farm'));



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
  plan_type VARCHAR(50), -- essential, professional, or enterprise
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);

-- Modules (Application modules that can be enabled/disabled per organization)
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  category VARCHAR(50),
  description TEXT,
  required_plan VARCHAR(50), -- null = free, 'essential', 'professional', 'enterprise'
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Modules (which modules are active for each organization)
CREATE TABLE IF NOT EXISTS organization_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_modules_org ON organization_modules(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_modules_module ON organization_modules(module_id);

-- Insert default modules
INSERT INTO modules (name, icon, category, description, required_plan, is_available) VALUES
  ('dashboard', 'LayoutDashboard', 'core', 'Main dashboard with overview metrics', NULL, true),
  ('farms', 'Map', 'production', 'Farm and parcel management', NULL, true),
  ('harvests', 'Wheat', 'production', 'Harvest tracking and management', NULL, true),
  ('tasks', 'CheckSquare', 'operations', 'Task management and scheduling', NULL, true),
  ('workers', 'Users', 'hr', 'Worker management', NULL, true),
  ('stock', 'Package', 'inventory', 'Inventory and stock management', NULL, true),
  ('customers', 'UserCheck', 'sales', 'Customer relationship management', NULL, true),
  ('suppliers', 'Truck', 'purchasing', 'Supplier management', NULL, true),
  ('quotes', 'FileText', 'sales', 'Quote management', 'essential', true),
  ('sales_orders', 'ShoppingCart', 'sales', 'Sales order processing', 'essential', true),
  ('purchase_orders', 'ClipboardList', 'purchasing', 'Purchase order management', 'essential', true),
  ('invoices', 'Receipt', 'accounting', 'Invoice management', 'essential', true),
  ('accounting', 'Calculator', 'accounting', 'Full accounting features', 'professional', true),
  ('reports', 'BarChart3', 'analytics', 'Reports and analytics', 'professional', true),
  ('satellite', 'Satellite', 'analytics', 'Satellite imagery analysis', 'enterprise', true)
ON CONFLICT (name) DO NOTHING;

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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_parcels_organization ON parcels(organization_id);
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
  supplier_code TEXT,
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
  currency_code TEXT DEFAULT 'MAD',
  supplier_type TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_assigned_to ON suppliers(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_code_org ON suppliers(organization_id, supplier_code) WHERE supplier_code IS NOT NULL;

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
  entry_type VARCHAR(50), -- Type of entry: 'invoice', 'payment', 'adjustment', 'cost', 'revenue', etc.
  description TEXT, -- Description of the journal entry
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
  line_number INTEGER NOT NULL DEFAULT 1,
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

-- Generate Stock Entry Number
CREATE OR REPLACE FUNCTION generate_stock_entry_number(p_organization_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) INTO v_count
  FROM stock_entries
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM entry_date) = EXTRACT(YEAR FROM NOW());
  v_number := 'SE-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Seed Default Work Units for an Organization
CREATE OR REPLACE FUNCTION seed_default_work_units(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_inserted_count INTEGER := 0;
BEGIN
  -- Insert default work units for the organization
  INSERT INTO work_units (
    organization_id,
    code,
    name,
    name_fr,
    name_ar,
    unit_category,
    base_unit,
    conversion_factor,
    allow_decimal,
    is_active
  )
  SELECT
    p_organization_id,
    v.code,
    v.name,
    v.name_fr,
    v.name_ar,
    v.unit_category::TEXT,
    v.base_unit,
    v.conversion_factor,
    v.allow_decimal,
    true
  FROM (
    VALUES
      -- Count-based units
      ('TREE'::TEXT, 'Tree'::TEXT, 'Arbre'::TEXT, 'شجرة'::TEXT, 'count'::TEXT, NULL::TEXT, NULL::NUMERIC, false::BOOLEAN),
      ('PLANT'::TEXT, 'Plant'::TEXT, 'Plante'::TEXT, 'نبتة'::TEXT, 'count'::TEXT, NULL::TEXT, NULL::NUMERIC, false::BOOLEAN),
      ('UNIT'::TEXT, 'Unit'::TEXT, 'Unité'::TEXT, 'وحدة'::TEXT, 'count'::TEXT, NULL::TEXT, NULL::NUMERIC, false::BOOLEAN),
      ('BOX'::TEXT, 'Box'::TEXT, 'Caisse'::TEXT, 'صندوق'::TEXT, 'count'::TEXT, NULL::TEXT, NULL::NUMERIC, false::BOOLEAN),
      ('CRATE'::TEXT, 'Crate'::TEXT, 'Caisse'::TEXT, 'قفص'::TEXT, 'count'::TEXT, NULL::TEXT, NULL::NUMERIC, false::BOOLEAN),
      ('BAG'::TEXT, 'Bag'::TEXT, 'Sac'::TEXT, 'كيس'::TEXT, 'count'::TEXT, NULL::TEXT, NULL::NUMERIC, false::BOOLEAN),
      -- Weight units
      ('KG'::TEXT, 'Kilogram'::TEXT, 'Kilogramme'::TEXT, 'كيلوغرام'::TEXT, 'weight'::TEXT, NULL::TEXT, NULL::NUMERIC, true::BOOLEAN),
      ('TON'::TEXT, 'Ton'::TEXT, 'Tonne'::TEXT, 'طن'::TEXT, 'weight'::TEXT, NULL::TEXT, NULL::NUMERIC, true::BOOLEAN),
      ('QUINTAL'::TEXT, 'Quintal'::TEXT, 'Quintal'::TEXT, 'قنطار'::TEXT, 'weight'::TEXT, NULL::TEXT, NULL::NUMERIC, true::BOOLEAN),
      -- Volume units
      ('LITER'::TEXT, 'Liter'::TEXT, 'Litre'::TEXT, 'لتر'::TEXT, 'volume'::TEXT, NULL::TEXT, NULL::NUMERIC, true::BOOLEAN),
      ('M3'::TEXT, 'Cubic meter'::TEXT, 'Mètre cube'::TEXT, 'متر مكعب'::TEXT, 'volume'::TEXT, NULL::TEXT, NULL::NUMERIC, true::BOOLEAN),
      -- Area units
      ('HA'::TEXT, 'Hectare'::TEXT, 'Hectare'::TEXT, 'هكتار'::TEXT, 'area'::TEXT, NULL::TEXT, NULL::NUMERIC, true::BOOLEAN),
      ('M2'::TEXT, 'Square meter'::TEXT, 'Mètre carré'::TEXT, 'متر مربع'::TEXT, 'area'::TEXT, NULL::TEXT, NULL::NUMERIC, true::BOOLEAN),
      -- Length units
      ('M'::TEXT, 'Meter'::TEXT, 'Mètre'::TEXT, 'متر'::TEXT, 'length'::TEXT, NULL::TEXT, NULL::NUMERIC, true::BOOLEAN),
      ('KM'::TEXT, 'Kilometer'::TEXT, 'Kilomètre'::TEXT, 'كيلومتر'::TEXT, 'length'::TEXT, NULL::TEXT, NULL::NUMERIC, true::BOOLEAN)
  ) AS v(
    code,
    name,
    name_fr,
    name_ar,
    unit_category,
    base_unit,
    conversion_factor,
    allow_decimal
  )
  ON CONFLICT (organization_id, code) DO NOTHING;
  
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION seed_default_work_units(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_default_work_units(UUID) TO service_role;

COMMENT ON FUNCTION seed_default_work_units IS 'Seeds default work units for an organization. Returns the number of units inserted.';

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

-- Subscriptions Policies (moved to after roles table creation - see line ~4077)

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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_day_laborers_organization ON day_laborers(organization_id);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_employees_organization ON employees(organization_id);
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
  -- Work Unit Payment fields (for piece-work tracking)
  payment_type TEXT DEFAULT NULL,
  work_unit_id UUID REFERENCES work_units(id) ON DELETE SET NULL,
  units_required NUMERIC,
  units_completed NUMERIC DEFAULT 0,
  rate_per_unit NUMERIC,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CHECK (status IN ('pending', 'assigned', 'in_progress', 'paused', 'completed', 'cancelled', 'overdue')),
  CHECK (task_type IN ('planting', 'harvesting', 'irrigation', 'fertilization', 'maintenance', 'general', 'pest_control', 'pruning', 'soil_preparation')),
  CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
  CHECK (payment_type IS NULL OR payment_type IN ('daily', 'per_unit', 'monthly', 'metayage'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_farm ON tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parcel ON tasks(parcel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_work_unit ON tasks(work_unit_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);

-- Task Assignments (for multiple worker assignment)
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'worker', -- worker, supervisor, lead
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'assigned', -- assigned, working, completed, removed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  hours_worked NUMERIC(10, 2),
  units_completed NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, worker_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_worker ON task_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_org ON task_assignments(organization_id);

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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_work_records_organization ON work_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_records_worker ON work_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_records_date ON work_records(work_date);

-- Metayage Settlements
CREATE TABLE IF NOT EXISTS metayage_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_metayage_settlements_organization ON metayage_settlements(organization_id);
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
-- 11b. WAREHOUSES (Moved here to resolve forward references)
-- =====================================================

-- Warehouses (defined before harvest_records which references it)
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
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
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
  lot_number TEXT, -- Unique lot number for traceability (e.g., P1FM1-0012025)
  is_partial BOOLEAN DEFAULT false, -- Whether this is a partial harvest record
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
CREATE INDEX IF NOT EXISTS idx_harvest_records_warehouse ON harvest_records(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_harvest_records_date ON harvest_records(harvest_date DESC);
CREATE INDEX IF NOT EXISTS idx_harvest_records_lot ON harvest_records(lot_number) WHERE lot_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_harvest_records_task ON harvest_records(harvest_task_id) WHERE harvest_task_id IS NOT NULL;

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

-- Note: Warehouses table is defined earlier in section 11b to resolve forward references

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
  minimum_stock_level NUMERIC DEFAULT 0,
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
  marketplace_category_slug TEXT, -- Strapi marketplace category slug for website display
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
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
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
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
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
  marketplace_listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL, -- For marketplace traceability
  marketplace_order_item_id UUID REFERENCES marketplace_order_items(id) ON DELETE SET NULL, -- For order traceability
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CHECK (movement_type IN ('IN', 'OUT', 'TRANSFER'))
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_marketplace_listing ON stock_movements(marketplace_listing_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_marketplace_order_item ON stock_movements(marketplace_order_item_id);

-- Stock Valuation
CREATE TABLE IF NOT EXISTS stock_valuation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
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
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
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
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
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
  producer_name TEXT,
  supplier_id UUID REFERENCES suppliers(id),
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

-- Unique constraint to prevent duplicate entries for same parcel/date/index
CREATE UNIQUE INDEX IF NOT EXISTS idx_satellite_indices_data_unique
  ON satellite_indices_data(parcel_id, date, index_name);

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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_type analysis_type NOT NULL,
  analysis_date DATE NOT NULL,
  laboratory TEXT,
  data JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_parcel ON analyses(parcel_id);
CREATE INDEX IF NOT EXISTS idx_analyses_organization ON analyses(organization_id);
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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_soil_analyses_organization ON soil_analyses(organization_id);

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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_parcel_reports_organization ON parcel_reports(organization_id);

-- =====================================================
-- 16. CROP MANAGEMENT TABLES
-- =====================================================

-- Crop Types
CREATE TABLE IF NOT EXISTS crop_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  description TEXT,
  description_ar TEXT,
  description_fr TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_crop_types_org ON crop_types(organization_id);

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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_crops_organization ON crops(organization_id);
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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  category_ar TEXT,
  category_fr TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tree_categories_org ON tree_categories(organization_id);

-- Trees
CREATE TABLE IF NOT EXISTS trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES tree_categories(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trees_category ON trees(category_id);
CREATE INDEX IF NOT EXISTS idx_trees_organization ON trees(organization_id);

-- Plantation Types
CREATE TABLE IF NOT EXISTS plantation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  spacing TEXT NOT NULL,
  trees_per_ha INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plantation_types_org ON plantation_types(organization_id);

-- Soil Types
CREATE TABLE IF NOT EXISTS soil_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  description TEXT,
  description_ar TEXT,
  description_fr TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_soil_types_org ON soil_types(organization_id);

-- Irrigation Types
CREATE TABLE IF NOT EXISTS irrigation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  description TEXT,
  description_ar TEXT,
  description_fr TEXT,
  efficiency NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_irrigation_types_org ON irrigation_types(organization_id);

-- Rootstocks
CREATE TABLE IF NOT EXISTS rootstocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  description TEXT,
  description_ar TEXT,
  description_fr TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_rootstocks_org ON rootstocks(organization_id);

-- Plantation Systems
CREATE TABLE IF NOT EXISTS plantation_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  description TEXT,
  description_ar TEXT,
  description_fr TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_plantation_systems_org ON plantation_systems(organization_id);

-- =====================================================
-- 17. PRODUCT & INVENTORY CATEGORIES TABLES
-- =====================================================

-- Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_fr TEXT,
  description TEXT,
  description_ar TEXT,
  description_fr TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_org ON product_categories(organization_id);

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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_utilities_organization ON utilities(organization_id);
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
  CHECK (name IN ('internal_admin', 'system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'day_laborer', 'viewer'))
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
-- SUBSCRIPTIONS RLS POLICIES
-- =====================================================
-- Note: These policies are placed here (after roles table creation and role_id addition)
-- because they reference the roles table in their JOIN clauses

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
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_financial_transactions_organization ON financial_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date DESC);

-- Livestock
CREATE TABLE IF NOT EXISTS livestock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_livestock_organization ON livestock(organization_id);

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

DROP POLICY IF EXISTS "org_update_stock_entries" ON stock_entries;
CREATE POLICY "org_update_stock_entries" ON stock_entries
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_stock_entries" ON stock_entries;
CREATE POLICY "org_delete_stock_entries" ON stock_entries
  FOR DELETE USING (
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
-- 24. AUTO-POPULATE ORGANIZATION_ID TRIGGERS
-- =====================================================
-- These triggers automatically populate organization_id from parent tables
-- to ensure data segregation for multi-tenant architecture

-- Function to auto-populate organization_id from farm_id
CREATE OR REPLACE FUNCTION populate_organization_id_from_farm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If organization_id is not set but farm_id is, populate it
  IF NEW.organization_id IS NULL AND NEW.farm_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM farms
    WHERE id = NEW.farm_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to auto-populate organization_id from parcel_id
CREATE OR REPLACE FUNCTION populate_organization_id_from_parcel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If organization_id is not set but parcel_id is, populate it
  IF NEW.organization_id IS NULL AND NEW.parcel_id IS NOT NULL THEN
    SELECT f.organization_id INTO NEW.organization_id
    FROM parcels p
    JOIN farms f ON f.id = p.farm_id
    WHERE p.id = NEW.parcel_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to auto-populate organization_id from category_id (for trees)
CREATE OR REPLACE FUNCTION populate_organization_id_from_tree_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If organization_id is not set but category_id is, populate it
  IF NEW.organization_id IS NULL AND NEW.category_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM tree_categories
    WHERE id = NEW.category_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply triggers for tables with farm_id
DROP TRIGGER IF EXISTS trg_parcels_populate_org_id ON parcels;
CREATE TRIGGER trg_parcels_populate_org_id
  BEFORE INSERT OR UPDATE ON parcels
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_farm();

DROP TRIGGER IF EXISTS trg_crops_populate_org_id ON crops;
CREATE TRIGGER trg_crops_populate_org_id
  BEFORE INSERT OR UPDATE ON crops
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_farm();

DROP TRIGGER IF EXISTS trg_day_laborers_populate_org_id ON day_laborers;
CREATE TRIGGER trg_day_laborers_populate_org_id
  BEFORE INSERT OR UPDATE ON day_laborers
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_farm();

DROP TRIGGER IF EXISTS trg_employees_populate_org_id ON employees;
CREATE TRIGGER trg_employees_populate_org_id
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_farm();

DROP TRIGGER IF EXISTS trg_work_records_populate_org_id ON work_records;
CREATE TRIGGER trg_work_records_populate_org_id
  BEFORE INSERT OR UPDATE ON work_records
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_farm();

DROP TRIGGER IF EXISTS trg_metayage_settlements_populate_org_id ON metayage_settlements;
CREATE TRIGGER trg_metayage_settlements_populate_org_id
  BEFORE INSERT OR UPDATE ON metayage_settlements
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_farm();

DROP TRIGGER IF EXISTS trg_utilities_populate_org_id ON utilities;
CREATE TRIGGER trg_utilities_populate_org_id
  BEFORE INSERT OR UPDATE ON utilities
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_farm();

DROP TRIGGER IF EXISTS trg_financial_transactions_populate_org_id ON financial_transactions;
CREATE TRIGGER trg_financial_transactions_populate_org_id
  BEFORE INSERT OR UPDATE ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_farm();

DROP TRIGGER IF EXISTS trg_livestock_populate_org_id ON livestock;
CREATE TRIGGER trg_livestock_populate_org_id
  BEFORE INSERT OR UPDATE ON livestock
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_farm();

-- Apply triggers for tables with parcel_id
DROP TRIGGER IF EXISTS trg_analyses_populate_org_id ON analyses;
CREATE TRIGGER trg_analyses_populate_org_id
  BEFORE INSERT OR UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_parcel();

DROP TRIGGER IF EXISTS trg_soil_analyses_populate_org_id ON soil_analyses;
CREATE TRIGGER trg_soil_analyses_populate_org_id
  BEFORE INSERT OR UPDATE ON soil_analyses
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_parcel();

DROP TRIGGER IF EXISTS trg_parcel_reports_populate_org_id ON parcel_reports;
CREATE TRIGGER trg_parcel_reports_populate_org_id
  BEFORE INSERT OR UPDATE ON parcel_reports
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_parcel();

-- Apply trigger for trees (uses category_id)
DROP TRIGGER IF EXISTS trg_trees_populate_org_id ON trees;
CREATE TRIGGER trg_trees_populate_org_id
  BEFORE INSERT OR UPDATE ON trees
  FOR EACH ROW
  EXECUTE FUNCTION populate_organization_id_from_tree_category();

-- =====================================================
-- 25. DOCUMENT TEMPLATES TABLE
-- =====================================================
-- Stores customizable PDF document templates per organization

DROP TABLE IF EXISTS document_templates CASCADE;

CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('invoice', 'quote', 'sales_order', 'purchase_order', 'report', 'general')),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    -- Header configuration
    header_enabled BOOLEAN DEFAULT true,
    header_height NUMERIC(10,2) DEFAULT 80,
    header_logo_url TEXT,
    header_logo_position VARCHAR(20) DEFAULT 'left' CHECK (header_logo_position IN ('left', 'center', 'right')),
    header_logo_width NUMERIC(10,2) DEFAULT 50,
    header_logo_height NUMERIC(10,2) DEFAULT 30,
    header_company_name BOOLEAN DEFAULT true,
    header_company_info BOOLEAN DEFAULT true,
    header_custom_text TEXT,
    header_background_color VARCHAR(20) DEFAULT '#ffffff',
    header_text_color VARCHAR(20) DEFAULT '#000000',
    header_border_bottom BOOLEAN DEFAULT true,
    header_border_color VARCHAR(20) DEFAULT '#e5e7eb',
    -- Footer configuration
    footer_enabled BOOLEAN DEFAULT true,
    footer_height NUMERIC(10,2) DEFAULT 60,
    footer_text TEXT DEFAULT 'Thank you for your business!',
    footer_position VARCHAR(20) DEFAULT 'center' CHECK (footer_position IN ('left', 'center', 'right')),
    footer_include_company_info BOOLEAN DEFAULT true,
    footer_custom_text TEXT,
    footer_background_color VARCHAR(20) DEFAULT '#f9fafb',
    footer_text_color VARCHAR(20) DEFAULT '#6b7280',
    footer_border_top BOOLEAN DEFAULT true,
    footer_border_color VARCHAR(20) DEFAULT '#e5e7eb',
    footer_font_size NUMERIC(10,2) DEFAULT 9,
    -- Page margins (in mm)
    page_margin_top NUMERIC(10,2) DEFAULT 20,
    page_margin_bottom NUMERIC(10,2) DEFAULT 20,
    page_margin_left NUMERIC(10,2) DEFAULT 15,
    page_margin_right NUMERIC(10,2) DEFAULT 15,
    -- Document styling
    accent_color VARCHAR(20) DEFAULT '#10B981',
    secondary_color VARCHAR(20) DEFAULT '#6B7280',
    font_family VARCHAR(100) DEFAULT 'Helvetica',
    title_font_size NUMERIC(10,2) DEFAULT 24,
    heading_font_size NUMERIC(10,2) DEFAULT 14,
    body_font_size NUMERIC(10,2) DEFAULT 10,
    -- Table styling
    table_header_bg_color VARCHAR(20) DEFAULT '#10B981',
    table_header_text_color VARCHAR(20) DEFAULT '#ffffff',
    table_row_alt_color VARCHAR(20) DEFAULT '#f9fafb',
    table_border_color VARCHAR(20) DEFAULT '#e5e7eb',
    -- Content display options
    show_tax_id BOOLEAN DEFAULT true,
    show_terms BOOLEAN DEFAULT true,
    show_notes BOOLEAN DEFAULT true,
    show_payment_info BOOLEAN DEFAULT true,
    show_bank_details BOOLEAN DEFAULT false,
    show_qr_code BOOLEAN DEFAULT false,
    -- Custom sections
    terms_content TEXT,
    payment_terms_content TEXT,
    bank_details_content TEXT,
    -- Watermark
    watermark_enabled BOOLEAN DEFAULT false,
    watermark_text VARCHAR(100),
    watermark_opacity NUMERIC(3,2) DEFAULT 0.1,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_document_templates_organization ON document_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(document_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_default ON document_templates(organization_id, document_type, is_default) WHERE is_default = true;

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view templates in their organization" ON document_templates;
CREATE POLICY "Users can view templates in their organization"
    ON document_templates FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create templates in their organization" ON document_templates;
CREATE POLICY "Users can create templates in their organization"
    ON document_templates FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update templates in their organization" ON document_templates;
CREATE POLICY "Users can update templates in their organization"
    ON document_templates FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete templates in their organization" ON document_templates;
CREATE POLICY "Users can delete templates in their organization"
    ON document_templates FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE document_templates
        SET is_default = false, updated_at = NOW()
        WHERE organization_id = NEW.organization_id
          AND document_type = NEW.document_type
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_single_default_template ON document_templates;
CREATE TRIGGER trg_ensure_single_default_template
    BEFORE INSERT OR UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_template();

CREATE OR REPLACE FUNCTION update_document_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_templates_updated_at ON document_templates;
CREATE TRIGGER trg_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_document_templates_timestamp();

GRANT SELECT, INSERT, UPDATE, DELETE ON document_templates TO authenticated;
GRANT SELECT ON document_templates TO anon;

-- =====================================================
-- 26. ONBOARDING HELPER FUNCTIONS
-- =====================================================

-- Function to handle new user signup - creates user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to create organization with farm atomically during onboarding
CREATE OR REPLACE FUNCTION public.create_organization_with_farm(
  p_user_id UUID,
  p_user_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_organization_name TEXT,
  p_organization_slug TEXT,
  p_organization_phone TEXT DEFAULT NULL,
  p_organization_email TEXT DEFAULT NULL,
  p_farm_name TEXT DEFAULT NULL,
  p_farm_location TEXT DEFAULT NULL,
  p_farm_size NUMERIC DEFAULT NULL,
  p_farm_size_unit TEXT DEFAULT 'hectares',
  p_farm_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id UUID;
  v_farm_id UUID;
  v_role_id UUID;
BEGIN
  -- 1. Upsert user profile
  INSERT INTO user_profiles (id, email, first_name, last_name, full_name, updated_at)
  VALUES (
    p_user_id,
    p_user_email,
    p_first_name,
    p_last_name,
    p_first_name || ' ' || p_last_name,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  -- 2. Create organization
  INSERT INTO organizations (name, slug, phone, email, is_active, created_at, updated_at)
  VALUES (
    p_organization_name,
    p_organization_slug,
    p_organization_phone,
    COALESCE(p_organization_email, p_user_email),
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_organization_id;

  -- 3. Get organization_admin role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'organization_admin' LIMIT 1;

  -- Fallback: if role doesn't exist, try to find any admin role
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM roles WHERE name LIKE '%admin%' ORDER BY level LIMIT 1;
  END IF;

  -- Last fallback: use any role
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM roles ORDER BY level LIMIT 1;
  END IF;

  -- 4. Add user to organization as admin
  INSERT INTO organization_users (organization_id, user_id, role_id, is_active, created_at)
  VALUES (v_organization_id, p_user_id, v_role_id, true, NOW());

  -- 5. Create farm if details provided
  IF p_farm_name IS NOT NULL AND p_farm_name != '' THEN
    INSERT INTO farms (
      organization_id,
      name,
      location,
      size,
      size_unit,
      description,
      manager_name,
      manager_email,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      v_organization_id,
      p_farm_name,
      p_farm_location,
      p_farm_size,
      p_farm_size_unit,
      p_farm_description,
      p_first_name || ' ' || p_last_name,
      p_user_email,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_farm_id;

    -- 6. Add user as farm manager
    INSERT INTO farm_management_roles (farm_id, user_id, role, assigned_by, created_at)
    VALUES (v_farm_id, p_user_id, 'main_manager', p_user_id, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  -- Return success with IDs
  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_organization_id,
    'farm_id', v_farm_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_organization_with_farm TO authenticated;

-- =====================================================
-- 27. BACKFILL ORGANIZATION_ID FOR EXISTING DATA
-- =====================================================
-- These UPDATE statements populate organization_id for records
-- that existed before the multi-tenant columns were added

-- Backfill parcels
UPDATE parcels p
SET organization_id = f.organization_id
FROM farms f
WHERE p.farm_id = f.id
  AND p.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill crops
UPDATE crops c
SET organization_id = f.organization_id
FROM farms f
WHERE c.farm_id = f.id
  AND c.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill day_laborers
UPDATE day_laborers d
SET organization_id = f.organization_id
FROM farms f
WHERE d.farm_id = f.id
  AND d.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill employees
UPDATE employees e
SET organization_id = f.organization_id
FROM farms f
WHERE e.farm_id = f.id
  AND e.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill work_records
UPDATE work_records w
SET organization_id = f.organization_id
FROM farms f
WHERE w.farm_id = f.id
  AND w.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill metayage_settlements
UPDATE metayage_settlements m
SET organization_id = f.organization_id
FROM farms f
WHERE m.farm_id = f.id
  AND m.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill utilities
UPDATE utilities u
SET organization_id = f.organization_id
FROM farms f
WHERE u.farm_id = f.id
  AND u.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill financial_transactions
UPDATE financial_transactions ft
SET organization_id = f.organization_id
FROM farms f
WHERE ft.farm_id = f.id
  AND ft.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill livestock
UPDATE livestock l
SET organization_id = f.organization_id
FROM farms f
WHERE l.farm_id = f.id
  AND l.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill analyses (via parcel -> farm)
UPDATE analyses a
SET organization_id = f.organization_id
FROM parcels p
JOIN farms f ON f.id = p.farm_id
WHERE a.parcel_id = p.id
  AND a.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill soil_analyses (via parcel -> farm)
UPDATE soil_analyses sa
SET organization_id = f.organization_id
FROM parcels p
JOIN farms f ON f.id = p.farm_id
WHERE sa.parcel_id = p.id
  AND sa.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill parcel_reports (via parcel -> farm)
UPDATE parcel_reports pr
SET organization_id = f.organization_id
FROM parcels p
JOIN farms f ON f.id = p.farm_id
WHERE pr.parcel_id = p.id
  AND pr.organization_id IS NULL
  AND f.organization_id IS NOT NULL;

-- Backfill trees (via tree_categories)
UPDATE trees t
SET organization_id = tc.organization_id
FROM tree_categories tc
WHERE t.category_id = tc.id
  AND t.organization_id IS NULL
  AND tc.organization_id IS NOT NULL;

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

-- DISABLED: The trigger was causing duplicate stock movements because the backend
-- (stock-entries.service.ts) already handles stock movement creation via processStockMovementsPg().
-- Having both the trigger AND the backend code creates duplicate movements.
--
-- The trigger is now disabled - stock movements are created by the backend service only.
DROP TRIGGER IF EXISTS stock_entry_posting_trigger ON stock_entries;

-- DO NOT recreate the trigger - it's handled by backend
-- CREATE TRIGGER stock_entry_posting_trigger
--   BEFORE UPDATE ON stock_entries
--   FOR EACH ROW
--   EXECUTE FUNCTION process_stock_entry_posting();

-- Add comment explaining why the trigger is disabled
COMMENT ON FUNCTION process_stock_entry_posting() IS
  'DISABLED: Stock movement creation is now handled by the backend service (stock-entries.service.ts). This trigger was causing duplicate movements when both trigger and backend code created stock_movements.';

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
    v_org_admin_role_id UUID;
    v_linked_count integer := 0;
BEGIN
    -- Get the organization_admin role_id
    SELECT id INTO v_org_admin_role_id FROM roles WHERE name = 'organization_admin';
    
    IF v_org_admin_role_id IS NULL THEN
        RAISE EXCEPTION 'organization_admin role not found';
    END IF;
    
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
            role_id,
            is_active
        )
        VALUES (
            v_user.id,
            v_org_id,
            v_org_admin_role_id,
            true
        )
        ON CONFLICT (user_id, organization_id) 
        DO UPDATE SET 
            is_active = true,
            role_id = v_org_admin_role_id,
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
-- Fix for RLS violation errors when creating user profiles during signup
-- Problem: Service role operations through PostgREST were being blocked by RLS
-- Solution: Added SECURITY DEFINER function (create_or_update_user_profile) that bypasses RLS
--           This function should be used by backend services for creating/updating profiles
-- =====================================================
DROP POLICY IF EXISTS "user_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_write_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_all_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "service_role_all_user_profiles" ON user_profiles;

-- Allow service role (admin client) to manage all user profiles
-- Note: Service role key should bypass RLS automatically in PostgREST,
-- but this policy provides an additional fallback
CREATE POLICY "service_role_all_user_profiles" ON user_profiles
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
    OR auth.jwt() ->> 'role' = 'service_role'
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
    OR auth.jwt() ->> 'role' = 'service_role'
  );

-- Single policy for all operations (supports upsert in onboarding)
CREATE POLICY "user_all_own_profile" ON user_profiles
  FOR ALL USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

-- =====================================================
-- USER_PROFILES HELPER FUNCTION (Bypasses RLS)
-- =====================================================
-- SECURITY DEFINER function to create/update user profiles
-- This function bypasses RLS and is intended for service role/admin operations
-- Use this when the service role key doesn't properly bypass RLS through PostgREST
CREATE OR REPLACE FUNCTION create_or_update_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_language TEXT DEFAULT 'fr',
  p_timezone TEXT DEFAULT 'Africa/Casablanca',
  p_onboarding_completed BOOLEAN DEFAULT false,
  p_password_set BOOLEAN DEFAULT true,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile user_profiles;
  v_full_name TEXT;
BEGIN
  -- Calculate full_name if not provided
  v_full_name := COALESCE(
    p_full_name,
    CASE 
      WHEN p_first_name IS NOT NULL AND p_last_name IS NOT NULL 
      THEN p_first_name || ' ' || p_last_name
      WHEN p_first_name IS NOT NULL THEN p_first_name
      WHEN p_last_name IS NOT NULL THEN p_last_name
      ELSE split_part(p_email, '@', 1)
    END
  );

  -- Insert or update user profile (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    phone,
    language,
    timezone,
    onboarding_completed,
    password_set,
    avatar_url,
    updated_at
  )
  VALUES (
    p_user_id,
    p_email,
    v_full_name,
    p_first_name,
    p_last_name,
    p_phone,
    p_language,
    p_timezone,
    p_onboarding_completed,
    p_password_set,
    p_avatar_url,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    language = EXCLUDED.language,
    timezone = EXCLUDED.timezone,
    onboarding_completed = EXCLUDED.onboarding_completed,
    password_set = EXCLUDED.password_set,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

-- Add comment
COMMENT ON FUNCTION create_or_update_user_profile IS 
  'Creates or updates a user profile. Uses SECURITY DEFINER to bypass RLS policies. Intended for service role/admin operations.';

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
-- Updated to use organization_id directly for better performance
-- =====================================================
DROP POLICY IF EXISTS "org_read_parcels" ON parcels;
DROP POLICY IF EXISTS "org_write_parcels" ON parcels;
DROP POLICY IF EXISTS "org_update_parcels" ON parcels;
DROP POLICY IF EXISTS "org_delete_parcels" ON parcels;

CREATE POLICY "org_read_parcels" ON parcels
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

CREATE POLICY "org_write_parcels" ON parcels
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

CREATE POLICY "org_update_parcels" ON parcels
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

CREATE POLICY "org_delete_parcels" ON parcels
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- =====================================================
-- ADDITIONAL RLS POLICIES FOR ALL TABLES WITH RLS ENABLED
-- =====================================================
-- This section ensures all tables with RLS enabled have proper policies
-- =====================================================

-- =====================================================
-- WORKER & TASK MANAGEMENT TABLES
-- =====================================================

-- Day Laborers Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_day_laborers" ON day_laborers;
CREATE POLICY "org_read_day_laborers" ON day_laborers
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_day_laborers" ON day_laborers;
CREATE POLICY "org_write_day_laborers" ON day_laborers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_day_laborers" ON day_laborers;
CREATE POLICY "org_update_day_laborers" ON day_laborers
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_day_laborers" ON day_laborers;
CREATE POLICY "org_delete_day_laborers" ON day_laborers
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- Employees Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_employees" ON employees;
CREATE POLICY "org_read_employees" ON employees
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_employees" ON employees;
CREATE POLICY "org_write_employees" ON employees
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_employees" ON employees;
CREATE POLICY "org_update_employees" ON employees
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_employees" ON employees;
CREATE POLICY "org_delete_employees" ON employees
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
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

-- Work Records Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_work_records" ON work_records;
CREATE POLICY "org_read_work_records" ON work_records
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_work_records" ON work_records;
CREATE POLICY "org_write_work_records" ON work_records
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_work_records" ON work_records;
CREATE POLICY "org_update_work_records" ON work_records
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_work_records" ON work_records;
CREATE POLICY "org_delete_work_records" ON work_records
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- Metayage Settlements Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_read_metayage_settlements" ON metayage_settlements
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_write_metayage_settlements" ON metayage_settlements
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_update_metayage_settlements" ON metayage_settlements
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_delete_metayage_settlements" ON metayage_settlements
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
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

-- Analyses Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_analyses" ON analyses;
CREATE POLICY "org_read_analyses" ON analyses
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_analyses" ON analyses;
CREATE POLICY "org_write_analyses" ON analyses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_analyses" ON analyses;
CREATE POLICY "org_update_analyses" ON analyses
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_analyses" ON analyses;
CREATE POLICY "org_delete_analyses" ON analyses
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- Analysis Recommendations Policies (check through analysis relationship - no org_id on this table)
DROP POLICY IF EXISTS "org_access_analysis_recommendations" ON analysis_recommendations;
CREATE POLICY "org_access_analysis_recommendations" ON analysis_recommendations
  FOR ALL USING (
    analysis_id IN (
      SELECT a.id FROM analyses a
      WHERE a.organization_id IS NULL OR is_organization_member(a.organization_id)
    )
  );

-- Soil Analyses Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_soil_analyses" ON soil_analyses;
CREATE POLICY "org_read_soil_analyses" ON soil_analyses
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_soil_analyses" ON soil_analyses;
CREATE POLICY "org_write_soil_analyses" ON soil_analyses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_soil_analyses" ON soil_analyses;
CREATE POLICY "org_update_soil_analyses" ON soil_analyses
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_soil_analyses" ON soil_analyses;
CREATE POLICY "org_delete_soil_analyses" ON soil_analyses
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
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

-- Parcel Reports Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_parcel_reports" ON parcel_reports;
CREATE POLICY "org_read_parcel_reports" ON parcel_reports
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_parcel_reports" ON parcel_reports;
CREATE POLICY "org_write_parcel_reports" ON parcel_reports
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_parcel_reports" ON parcel_reports;
CREATE POLICY "org_update_parcel_reports" ON parcel_reports
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_parcel_reports" ON parcel_reports;
CREATE POLICY "org_delete_parcel_reports" ON parcel_reports
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
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

-- Crops Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_crops" ON crops;
CREATE POLICY "org_read_crops" ON crops
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_crops" ON crops;
CREATE POLICY "org_write_crops" ON crops
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_crops" ON crops;
CREATE POLICY "org_update_crops" ON crops
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_crops" ON crops;
CREATE POLICY "org_delete_crops" ON crops
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
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

-- Trees Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_trees" ON trees;
CREATE POLICY "org_read_trees" ON trees
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_trees" ON trees;
CREATE POLICY "org_write_trees" ON trees
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_trees" ON trees;
CREATE POLICY "org_update_trees" ON trees
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_trees" ON trees;
CREATE POLICY "org_delete_trees" ON trees
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
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

-- Utilities Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_utilities" ON utilities;
CREATE POLICY "org_read_utilities" ON utilities
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_utilities" ON utilities;
CREATE POLICY "org_write_utilities" ON utilities
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_utilities" ON utilities;
CREATE POLICY "org_update_utilities" ON utilities
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_utilities" ON utilities;
CREATE POLICY "org_delete_utilities" ON utilities
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
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

-- Financial Transactions Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_financial_transactions" ON financial_transactions;
CREATE POLICY "org_read_financial_transactions" ON financial_transactions
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_financial_transactions" ON financial_transactions;
CREATE POLICY "org_write_financial_transactions" ON financial_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_financial_transactions" ON financial_transactions;
CREATE POLICY "org_update_financial_transactions" ON financial_transactions
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_financial_transactions" ON financial_transactions;
CREATE POLICY "org_delete_financial_transactions" ON financial_transactions
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- Livestock Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_livestock" ON livestock;
CREATE POLICY "org_read_livestock" ON livestock
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_livestock" ON livestock;
CREATE POLICY "org_write_livestock" ON livestock
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_update_livestock" ON livestock;
CREATE POLICY "org_update_livestock" ON livestock
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_livestock" ON livestock;
CREATE POLICY "org_delete_livestock" ON livestock
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
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
  v_parent_2300 UUID;
  v_parent_2800 UUID;
BEGIN
  -- Verify organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN QUERY SELECT 0, false, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- Check if already seeded (has accounts)
  IF EXISTS (SELECT 1 FROM accounts WHERE organization_id = p_org_id LIMIT 1) THEN
    SELECT COUNT(*)::INTEGER INTO v_count FROM accounts WHERE organization_id = p_org_id;
    RETURN QUERY SELECT v_count, true, 'Chart of accounts already exists'::TEXT;
    RETURN;
  END IF;

  -- =====================================================
  -- CLASS 1: FIXED ASSETS (IMMOBILISATIONS)
  -- =====================================================

  -- Main Groups (descriptions in French stored in description column)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code, description)
  VALUES
    (p_org_id, '2100', 'Immobilisations en non-valeurs', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Frais préliminaires et charges à répartir'),
    (p_org_id, '2200', 'Immobilisations incorporelles', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Brevets, marques, fonds commercial'),
    (p_org_id, '2300', 'Immobilisations corporelles', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Terrains, constructions, matériel'),
    (p_org_id, '2400', 'Immobilisations financières', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Titres de participation, prêts')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Get parent IDs for child accounts
  SELECT id INTO v_parent_2300 FROM accounts WHERE organization_id = p_org_id AND code = '2300';

  -- Fixed Assets Detail (using parent_id instead of parent_code)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, parent_id, currency_code)
  VALUES
    -- Land and Buildings
    (p_org_id, '2310', 'Terrains agricoles', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),
    (p_org_id, '2311', 'Terrains bâtis', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),
    (p_org_id, '2321', 'Bâtiments agricoles', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),
    (p_org_id, '2323', 'Installations agricoles', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),

    -- Equipment and Machinery
    (p_org_id, '2330', 'Matériel et outillage', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),
    (p_org_id, '2331', 'Tracteurs et machines agricoles', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),
    (p_org_id, '2332', 'Système d''irrigation', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),
    (p_org_id, '2340', 'Matériel de transport', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),
    (p_org_id, '2350', 'Mobilier, matériel de bureau', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),
    (p_org_id, '2355', 'Matériel informatique', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),

    -- Biological Assets
    (p_org_id, '2361', 'Cheptel (animaux d''élevage)', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD'),
    (p_org_id, '2362', 'Plantations permanentes', 'Asset', 'Fixed Asset', false, true, v_parent_2300, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Depreciation Parent Account
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES (p_org_id, '2800', 'Amortissements', 'Asset', 'Accumulated Depreciation', true, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  SELECT id INTO v_parent_2800 FROM accounts WHERE organization_id = p_org_id AND code = '2800';

  -- Depreciation Detail Accounts
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, parent_id, currency_code)
  VALUES
    (p_org_id, '2832', 'Amortissements bâtiments', 'Asset', 'Accumulated Depreciation', false, true, v_parent_2800, 'MAD'),
    (p_org_id, '2833', 'Amortissements installations', 'Asset', 'Accumulated Depreciation', false, true, v_parent_2800, 'MAD'),
    (p_org_id, '2834', 'Amortissements matériel', 'Asset', 'Accumulated Depreciation', false, true, v_parent_2800, 'MAD'),
    (p_org_id, '2835', 'Amortissements transport', 'Asset', 'Accumulated Depreciation', false, true, v_parent_2800, 'MAD')
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
    -- Suppliers (unique codes - fixed duplicates)
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

    -- Advances (fixed duplicate code 4410 -> 3491)
    (p_org_id, '3490', 'Avances aux employés', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3491', 'Avances aux fournisseurs', 'Asset', 'Receivable', false, true, 'MAD'),

    -- Social Security and Taxes (fixed duplicate codes)
    (p_org_id, '4430', 'Sécurité sociale (CNSS)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4431', 'Retraite (RCAR/CMR)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4433', 'Assurance maladie (AMO)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4441', 'État - Impôt sur les sociétés (IS)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4443', 'Retenue à la source', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4455', 'TVA due', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4456', 'TVA déductible', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '4457', 'TVA collectée', 'Liability', 'Payable', false, true, 'MAD'),

    -- Personnel (fixed duplicate codes 4430, 4432 -> 4434, 4435)
    (p_org_id, '4434', 'Rémunérations dues au personnel', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4435', 'Saisies et oppositions', 'Liability', 'Payable', false, true, 'MAD')
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

  -- Check if accounts already exist for this organization (avoid data loss)
  IF EXISTS (SELECT 1 FROM accounts WHERE organization_id = p_org_id LIMIT 1) THEN
    SELECT COUNT(*)::INTEGER INTO v_accounts_created FROM accounts WHERE organization_id = p_org_id;
    RETURN QUERY SELECT v_accounts_created, true, 'Chart of accounts already exists - skipping to prevent data loss'::TEXT;
    RETURN;
  END IF;

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

-- =====================================================
-- FIX FOREIGN KEY CONSTRAINTS: Update inventory_items references to items
-- =====================================================
-- These ALTER TABLE statements update existing foreign key constraints
-- to reference items(id) instead of inventory_items(id)
-- =====================================================

-- Update stock_valuation foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'stock_valuation_item_id_fkey'
    AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'inventory_items')
  ) THEN
    ALTER TABLE stock_valuation DROP CONSTRAINT stock_valuation_item_id_fkey;
    ALTER TABLE stock_valuation 
    ADD CONSTRAINT stock_valuation_item_id_fkey 
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update inventory_batches foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'inventory_batches_item_id_fkey'
    AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'inventory_items')
  ) THEN
    ALTER TABLE inventory_batches DROP CONSTRAINT inventory_batches_item_id_fkey;
    ALTER TABLE inventory_batches 
    ADD CONSTRAINT inventory_batches_item_id_fkey 
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update inventory_serial_numbers foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'inventory_serial_numbers_item_id_fkey'
    AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'inventory_items')
  ) THEN
    ALTER TABLE inventory_serial_numbers DROP CONSTRAINT inventory_serial_numbers_item_id_fkey;
    ALTER TABLE inventory_serial_numbers 
    ADD CONSTRAINT inventory_serial_numbers_item_id_fkey 
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update opening_stock_balances foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'opening_stock_balances_item_id_fkey'
    AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'inventory_items')
  ) THEN
    ALTER TABLE opening_stock_balances DROP CONSTRAINT opening_stock_balances_item_id_fkey;
    ALTER TABLE opening_stock_balances 
    ADD CONSTRAINT opening_stock_balances_item_id_fkey 
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update stock_closing_items foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'stock_closing_items_item_id_fkey'
    AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'inventory_items')
  ) THEN
    ALTER TABLE stock_closing_items DROP CONSTRAINT stock_closing_items_item_id_fkey;
    ALTER TABLE stock_closing_items 
    ADD CONSTRAINT stock_closing_items_item_id_fkey 
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- VIEWS
-- =====================================================

-- Assignable Users View
-- Combines users, profiles, roles, and workers for task assignment
DROP VIEW IF EXISTS assignable_users;
CREATE OR REPLACE VIEW assignable_users AS
SELECT
  ou.user_id,
  ou.organization_id,
  up.first_name,
  up.last_name,
  up.full_name,
  r.name as role,
  r.display_name as role_display_name,
  w.id as worker_id,
  w.position as worker_position,
  CASE
    WHEN w.id IS NOT NULL THEN 'worker'::text
    ELSE 'user'::text
  END as user_type
FROM organization_users ou
JOIN user_profiles up ON up.id = ou.user_id
JOIN roles r ON r.id = ou.role_id
LEFT JOIN workers w ON w.user_id = ou.user_id AND w.organization_id = ou.organization_id AND w.is_active = true
WHERE ou.is_active = true;

GRANT SELECT ON assignable_users TO authenticated;
GRANT SELECT ON assignable_users TO service_role;
COMMENT ON VIEW assignable_users IS 'View combining users, profiles, roles, and worker information for task assignment';
-- =====================================================
-- FINANCIAL REPORTING FUNCTIONS
-- Account balance calculation and financial reports
-- =====================================================

-- Function to calculate account balance up to a specific date
-- Only considers POSTED journal entries
CREATE OR REPLACE FUNCTION get_account_balance(
  p_organization_id UUID,
  p_account_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code VARCHAR(50),
  account_name VARCHAR(255),
  account_type VARCHAR(50),
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  balance DECIMAL(15,2),
  normal_balance VARCHAR(10)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.account_type,
    COALESCE(SUM(ji.debit), 0)::DECIMAL(15,2) AS total_debit,
    COALESCE(SUM(ji.credit), 0)::DECIMAL(15,2) AS total_credit,
    (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2) AS balance,
    CASE
      WHEN a.account_type IN ('Asset', 'Expense') THEN 'debit'::VARCHAR(10)
      ELSE 'credit'::VARCHAR(10)
    END AS normal_balance
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
  WHERE a.id = p_account_id
    AND a.organization_id = p_organization_id
    AND a.is_active = true
  GROUP BY a.id, a.code, a.name, a.account_type;
END;
$$;

GRANT EXECUTE ON FUNCTION get_account_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_balance TO service_role;

COMMENT ON FUNCTION get_account_balance IS
'Calculates the balance for a single account as of a specific date, considering only posted journal entries';

-- Function to get trial balance for all accounts
CREATE OR REPLACE FUNCTION get_trial_balance(
  p_organization_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code VARCHAR(50),
  account_name VARCHAR(255),
  account_type VARCHAR(50),
  account_subtype VARCHAR(100),
  parent_id UUID,
  is_group BOOLEAN,
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  balance DECIMAL(15,2),
  debit_balance DECIMAL(15,2),
  credit_balance DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.account_type,
    a.account_subtype,
    a.parent_id,
    a.is_group,
    COALESCE(SUM(ji.debit), 0)::DECIMAL(15,2) AS total_debit,
    COALESCE(SUM(ji.credit), 0)::DECIMAL(15,2) AS total_credit,
    (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2) AS balance,
    -- Debit balance: positive for debit accounts (Asset, Expense)
    CASE
      WHEN (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0)) > 0
      THEN (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2)
      ELSE 0::DECIMAL(15,2)
    END AS debit_balance,
    -- Credit balance: positive for credit accounts (Liability, Equity, Revenue)
    CASE
      WHEN (COALESCE(SUM(ji.credit), 0) - COALESCE(SUM(ji.debit), 0)) > 0
      THEN (COALESCE(SUM(ji.credit), 0) - COALESCE(SUM(ji.debit), 0))::DECIMAL(15,2)
      ELSE 0::DECIMAL(15,2)
    END AS credit_balance
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
  WHERE a.organization_id = p_organization_id
    AND a.is_active = true
    AND a.is_group = false  -- Only non-group accounts have balances
  GROUP BY a.id, a.code, a.name, a.account_type, a.account_subtype, a.parent_id, a.is_group
  HAVING COALESCE(SUM(ji.debit), 0) > 0 OR COALESCE(SUM(ji.credit), 0) > 0
  ORDER BY a.code;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trial_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_balance TO service_role;

COMMENT ON FUNCTION get_trial_balance IS
'Returns trial balance for all accounts with transactions as of a specific date';

-- Function to get balance sheet data
CREATE OR REPLACE FUNCTION get_balance_sheet(
  p_organization_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  section VARCHAR(50),
  account_id UUID,
  account_code VARCHAR(50),
  account_name VARCHAR(255),
  account_type VARCHAR(50),
  account_subtype VARCHAR(100),
  balance DECIMAL(15,2),
  display_balance DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN a.account_type = 'Asset' THEN 'assets'::VARCHAR(50)
      WHEN a.account_type = 'Liability' THEN 'liabilities'::VARCHAR(50)
      WHEN a.account_type = 'Equity' THEN 'equity'::VARCHAR(50)
    END AS section,
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.account_type,
    a.account_subtype,
    (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2) AS balance,
    -- Display balance: Assets show debit balance positive, Liabilities/Equity show credit balance positive
    CASE
      WHEN a.account_type = 'Asset'
        THEN (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2)
      ELSE (COALESCE(SUM(ji.credit), 0) - COALESCE(SUM(ji.debit), 0))::DECIMAL(15,2)
    END AS display_balance
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
  WHERE a.organization_id = p_organization_id
    AND a.is_active = true
    AND a.is_group = false
    AND a.account_type IN ('Asset', 'Liability', 'Equity')
  GROUP BY a.id, a.code, a.name, a.account_type, a.account_subtype
  HAVING COALESCE(SUM(ji.debit), 0) > 0 OR COALESCE(SUM(ji.credit), 0) > 0
  ORDER BY
    CASE a.account_type
      WHEN 'Asset' THEN 1
      WHEN 'Liability' THEN 2
      WHEN 'Equity' THEN 3
    END,
    a.code;
END;
$$;

GRANT EXECUTE ON FUNCTION get_balance_sheet TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_sheet TO service_role;

COMMENT ON FUNCTION get_balance_sheet IS
'Returns balance sheet data grouped by Assets, Liabilities, and Equity as of a specific date';

-- Function to get profit and loss statement
CREATE OR REPLACE FUNCTION get_profit_loss(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  section VARCHAR(50),
  account_id UUID,
  account_code VARCHAR(50),
  account_name VARCHAR(255),
  account_type VARCHAR(50),
  account_subtype VARCHAR(100),
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  balance DECIMAL(15,2),
  display_amount DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN a.account_type = 'Revenue' THEN 'revenue'::VARCHAR(50)
      WHEN a.account_type = 'Expense' THEN 'expenses'::VARCHAR(50)
    END AS section,
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.account_type,
    a.account_subtype,
    COALESCE(SUM(ji.debit), 0)::DECIMAL(15,2) AS total_debit,
    COALESCE(SUM(ji.credit), 0)::DECIMAL(15,2) AS total_credit,
    (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2) AS balance,
    -- Display amount: Revenue shows credit balance positive, Expenses show debit balance positive
    CASE
      WHEN a.account_type = 'Revenue'
        THEN (COALESCE(SUM(ji.credit), 0) - COALESCE(SUM(ji.debit), 0))::DECIMAL(15,2)
      ELSE (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2)
    END AS display_amount
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date >= p_start_date
    AND je.entry_date <= p_end_date
  WHERE a.organization_id = p_organization_id
    AND a.is_active = true
    AND a.is_group = false
    AND a.account_type IN ('Revenue', 'Expense')
  GROUP BY a.id, a.code, a.name, a.account_type, a.account_subtype
  HAVING COALESCE(SUM(ji.debit), 0) > 0 OR COALESCE(SUM(ji.credit), 0) > 0
  ORDER BY
    CASE a.account_type
      WHEN 'Revenue' THEN 1
      WHEN 'Expense' THEN 2
    END,
    a.code;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profit_loss TO authenticated;
GRANT EXECUTE ON FUNCTION get_profit_loss TO service_role;

COMMENT ON FUNCTION get_profit_loss IS
'Returns profit and loss statement data for a date range';

-- Function to get general ledger for a specific account
CREATE OR REPLACE FUNCTION get_general_ledger(
  p_organization_id UUID,
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  entry_date DATE,
  entry_number VARCHAR(50),
  journal_entry_id UUID,
  description TEXT,
  reference_type VARCHAR(50),
  reference_number VARCHAR(100),
  debit DECIMAL(15,2),
  credit DECIMAL(15,2),
  running_balance DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opening_balance DECIMAL(15,2);
BEGIN
  -- Calculate opening balance (all posted entries before start date)
  SELECT COALESCE(SUM(ji.debit) - SUM(ji.credit), 0)
  INTO v_opening_balance
  FROM journal_items ji
  JOIN journal_entries je ON je.id = ji.journal_entry_id
  WHERE ji.account_id = p_account_id
    AND je.organization_id = p_organization_id
    AND je.status = 'posted'
    AND je.entry_date < p_start_date;

  RETURN QUERY
  WITH ledger_entries AS (
    SELECT
      je.entry_date,
      je.entry_number,
      je.id AS journal_entry_id,
      COALESCE(ji.description, je.remarks, '') AS description,
      je.reference_type,
      je.reference_number,
      ji.debit,
      ji.credit,
      ROW_NUMBER() OVER (ORDER BY je.entry_date, je.entry_number) AS rn
    FROM journal_items ji
    JOIN journal_entries je ON je.id = ji.journal_entry_id
    WHERE ji.account_id = p_account_id
      AND je.organization_id = p_organization_id
      AND je.status = 'posted'
      AND je.entry_date >= p_start_date
      AND je.entry_date <= p_end_date
    ORDER BY je.entry_date, je.entry_number
  )
  SELECT
    le.entry_date,
    le.entry_number,
    le.journal_entry_id,
    le.description,
    le.reference_type,
    le.reference_number,
    le.debit,
    le.credit,
    (v_opening_balance + SUM(le.debit - le.credit) OVER (ORDER BY le.rn))::DECIMAL(15,2) AS running_balance
  FROM ledger_entries le;
END;
$$;

GRANT EXECUTE ON FUNCTION get_general_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION get_general_ledger TO service_role;

COMMENT ON FUNCTION get_general_ledger IS
'Returns general ledger entries for a specific account with running balance';

-- Function to get account balance summary by type
CREATE OR REPLACE FUNCTION get_account_summary(
  p_organization_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_type VARCHAR(50),
  total_accounts BIGINT,
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  net_balance DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.account_type,
    COUNT(DISTINCT a.id) AS total_accounts,
    COALESCE(SUM(ji.debit), 0)::DECIMAL(15,2) AS total_debit,
    COALESCE(SUM(ji.credit), 0)::DECIMAL(15,2) AS total_credit,
    (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2) AS net_balance
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
  WHERE a.organization_id = p_organization_id
    AND a.is_active = true
    AND a.is_group = false
  GROUP BY a.account_type
  ORDER BY
    CASE a.account_type
      WHEN 'Asset' THEN 1
      WHEN 'Liability' THEN 2
      WHEN 'Equity' THEN 3
      WHEN 'Revenue' THEN 4
      WHEN 'Expense' THEN 5
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_account_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_summary TO service_role;

COMMENT ON FUNCTION get_account_summary IS
'Returns summary of account balances grouped by account type';

-- ============================================================================
-- ADMIN APP: PROVENANCE COLUMNS
-- ============================================================================
-- Purpose: Track version, source, publication status, and authorship for admin management

-- Add provenance columns to account_templates
ALTER TABLE account_templates ADD COLUMN IF NOT EXISTS template_version VARCHAR(20) DEFAULT '1.0.0';
ALTER TABLE account_templates ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'system';
ALTER TABLE account_templates ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE account_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE account_templates ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add provenance columns to account_mappings
ALTER TABLE account_mappings ADD COLUMN IF NOT EXISTS template_version VARCHAR(20) DEFAULT '1.0.0';
ALTER TABLE account_mappings ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'system';
ALTER TABLE account_mappings ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE account_mappings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE account_mappings ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add provenance columns to modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS template_version VARCHAR(20) DEFAULT '1.0.0';
ALTER TABLE modules ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'system';
ALTER TABLE modules ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add provenance columns to currencies
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS template_version VARCHAR(20) DEFAULT '1.0.0';
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'system';
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE currencies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add provenance columns to roles (role_templates equivalent)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS template_version VARCHAR(20) DEFAULT '1.0.0';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'system';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add provenance columns to work_units (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_units') THEN
    ALTER TABLE work_units ADD COLUMN IF NOT EXISTS template_version VARCHAR(20) DEFAULT '1.0.0';
    ALTER TABLE work_units ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'system';
    ALTER TABLE work_units ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
    ALTER TABLE work_units ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
    ALTER TABLE work_units ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_account_templates_source ON account_templates(source);
CREATE INDEX IF NOT EXISTS idx_account_templates_published ON account_templates(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_mappings_source ON account_mappings(source);
CREATE INDEX IF NOT EXISTS idx_currencies_source ON currencies(source);
CREATE INDEX IF NOT EXISTS idx_roles_source ON roles(source);
CREATE INDEX IF NOT EXISTS idx_modules_source ON modules(source);

COMMENT ON COLUMN account_templates.template_version IS 'Semantic version of the template (e.g., 1.0.0)';
COMMENT ON COLUMN account_templates.source IS 'Origin: system, import, manual';
COMMENT ON COLUMN account_templates.published_at IS 'When template was published for use';
COMMENT ON COLUMN account_templates.created_by IS 'User who created this template';
COMMENT ON COLUMN account_templates.updated_by IS 'User who last updated this template';

-- ============================================================================
-- ADMIN APP: ANALYTICS TABLES
-- ============================================================================
-- Purpose: Track organization usage, events, and admin job logs

-- Daily usage aggregates per organization
CREATE TABLE IF NOT EXISTS organization_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  active_users_7d INTEGER DEFAULT 0,
  active_users_30d INTEGER DEFAULT 0,
  farms_count INTEGER DEFAULT 0,
  parcels_count INTEGER DEFAULT 0,
  invoices_created INTEGER DEFAULT 0,
  quotes_created INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  harvests_recorded INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, date)
);

CREATE INDEX IF NOT EXISTS idx_org_usage_daily_org ON organization_usage_daily(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_usage_daily_date ON organization_usage_daily(date);

COMMENT ON TABLE organization_usage_daily IS 'Daily aggregated usage metrics per organization for analytics';

-- Event tracking for funnels/retention
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  source VARCHAR(50) DEFAULT 'app',
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_org_date ON events(organization_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_occurred ON events(occurred_at);

COMMENT ON TABLE events IS 'Event tracking for user actions, funnels, and retention analysis';

-- Extend subscription_usage with additional metrics
ALTER TABLE subscription_usage ADD COLUMN IF NOT EXISTS mrr NUMERIC(12,2);
ALTER TABLE subscription_usage ADD COLUMN IF NOT EXISTS arr NUMERIC(12,2);
ALTER TABLE subscription_usage ADD COLUMN IF NOT EXISTS modules_enabled TEXT[];
ALTER TABLE subscription_usage ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMPTZ;
ALTER TABLE subscription_usage ADD COLUMN IF NOT EXISTS churn_risk_score INTEGER;
ALTER TABLE subscription_usage ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
ALTER TABLE subscription_usage ADD COLUMN IF NOT EXISTS storage_used_mb NUMERIC(12,2) DEFAULT 0;

-- Job log for imports/seeds/admin operations
CREATE TABLE IF NOT EXISTS admin_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  input_data JSONB,
  result_data JSONB,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_job_logs_type ON admin_job_logs(job_type);
CREATE INDEX IF NOT EXISTS idx_admin_job_logs_status ON admin_job_logs(status);
CREATE INDEX IF NOT EXISTS idx_admin_job_logs_created ON admin_job_logs(created_at);

COMMENT ON TABLE admin_job_logs IS 'Audit log for admin operations like imports, seeds, and bulk updates';

-- SaaS metrics snapshot table (for historical tracking)
CREATE TABLE IF NOT EXISTS saas_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_organizations INTEGER DEFAULT 0,
  active_organizations_7d INTEGER DEFAULT 0,
  active_organizations_30d INTEGER DEFAULT 0,
  new_organizations INTEGER DEFAULT 0,
  churned_organizations INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  dau INTEGER DEFAULT 0,
  wau INTEGER DEFAULT 0,
  mau INTEGER DEFAULT 0,
  total_mrr NUMERIC(12,2) DEFAULT 0,
  total_arr NUMERIC(12,2) DEFAULT 0,
  arpu NUMERIC(12,2) DEFAULT 0,
  churn_rate NUMERIC(5,4) DEFAULT 0,
  activation_rate NUMERIC(5,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_metrics_date ON saas_metrics_daily(date);

COMMENT ON TABLE saas_metrics_daily IS 'Daily snapshot of key SaaS metrics for trend analysis';

-- Enable RLS on new tables
ALTER TABLE organization_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_metrics_daily ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ADMIN APP: INTERNAL ADMIN ROLE & RLS POLICIES
-- ============================================================================
-- Purpose: Enable platform-wide admin access for reference data management and analytics

-- Internal admins table (platform-level, not organization-bound)
CREATE TABLE IF NOT EXISTS internal_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_internal_admins_user ON internal_admins(user_id);

COMMENT ON TABLE internal_admins IS 'Platform-level administrators with access to admin app and reference data management';

-- Enable RLS on internal_admins
ALTER TABLE internal_admins ENABLE ROW LEVEL SECURITY;

-- Only service_role can manage internal_admins
CREATE POLICY "service_manage_internal_admins" ON internal_admins
  FOR ALL USING (
    current_setting('role', true) = 'service_role'
  );

-- Allow users to check if they are internal admins (for auth check)
CREATE POLICY "users_read_own_internal_admin" ON internal_admins
  FOR SELECT USING (user_id = auth.uid());

-- Function to check if current user is internal_admin
CREATE OR REPLACE FUNCTION is_internal_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM internal_admins
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_internal_admin() IS 'Check if the current authenticated user is an internal platform admin';

-- RLS Policies for reference data tables

-- Account Templates: internal_admin can manage, others can read published
DROP POLICY IF EXISTS "admin_manage_account_templates" ON account_templates;
CREATE POLICY "admin_manage_account_templates" ON account_templates
  FOR ALL USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

DROP POLICY IF EXISTS "read_published_account_templates" ON account_templates;
CREATE POLICY "read_published_account_templates" ON account_templates
  FOR SELECT USING (
    published_at IS NOT NULL
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Account Mappings: internal_admin can manage
DROP POLICY IF EXISTS "admin_manage_account_mappings" ON account_mappings;
CREATE POLICY "admin_manage_account_mappings" ON account_mappings
  FOR ALL USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

-- Modules: internal_admin can manage, others can read active
DROP POLICY IF EXISTS "admin_manage_modules" ON modules;
CREATE POLICY "admin_manage_modules" ON modules
  FOR ALL USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

DROP POLICY IF EXISTS "read_active_modules" ON modules;
CREATE POLICY "read_active_modules" ON modules
  FOR SELECT USING (
    is_active = true
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Currencies: internal_admin can manage, others can read active
DROP POLICY IF EXISTS "admin_manage_currencies" ON currencies;
CREATE POLICY "admin_manage_currencies" ON currencies
  FOR ALL USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

DROP POLICY IF EXISTS "read_active_currencies" ON currencies;
CREATE POLICY "read_active_currencies" ON currencies
  FOR SELECT USING (
    is_active = true
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Roles: internal_admin can manage, others can read active
DROP POLICY IF EXISTS "admin_manage_roles" ON roles;
CREATE POLICY "admin_manage_roles" ON roles
  FOR ALL USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

DROP POLICY IF EXISTS "read_active_roles" ON roles;
CREATE POLICY "read_active_roles" ON roles
  FOR SELECT USING (
    is_active = true
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Events: internal_admin sees all, others see own org only
DROP POLICY IF EXISTS "events_read_policy" ON events;
CREATE POLICY "events_read_policy" ON events
  FOR SELECT USING (
    is_internal_admin()
    OR (organization_id IS NOT NULL AND is_organization_member(organization_id))
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "events_insert_policy" ON events;
CREATE POLICY "events_insert_policy" ON events
  FOR INSERT WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

-- Organization Usage Daily: internal_admin sees all, org members see own
DROP POLICY IF EXISTS "org_usage_daily_read_policy" ON organization_usage_daily;
CREATE POLICY "org_usage_daily_read_policy" ON organization_usage_daily
  FOR SELECT USING (
    is_internal_admin()
    OR is_organization_member(organization_id)
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "org_usage_daily_write_policy" ON organization_usage_daily;
CREATE POLICY "org_usage_daily_write_policy" ON organization_usage_daily
  FOR ALL USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

-- Admin Job Logs: internal_admin only
DROP POLICY IF EXISTS "admin_job_logs_policy" ON admin_job_logs;
CREATE POLICY "admin_job_logs_policy" ON admin_job_logs
  FOR ALL USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

-- SaaS Metrics Daily: internal_admin only
DROP POLICY IF EXISTS "saas_metrics_daily_policy" ON saas_metrics_daily;
CREATE POLICY "saas_metrics_daily_policy" ON saas_metrics_daily
  FOR ALL USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

-- Grant internal_admin read access to all organizations for analytics
DROP POLICY IF EXISTS "admin_read_all_organizations" ON organizations;
CREATE POLICY "admin_read_all_organizations" ON organizations
  FOR SELECT USING (
    is_internal_admin()
    OR is_organization_member(id)
    OR current_setting('role', true) = 'service_role'
  );

-- Grant internal_admin read access to subscription data for analytics
DROP POLICY IF EXISTS "admin_read_subscriptions" ON subscriptions;
CREATE POLICY "admin_read_subscriptions" ON subscriptions
  FOR SELECT USING (
    is_internal_admin()
    OR is_organization_member(organization_id)
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "admin_read_subscription_usage" ON subscription_usage;
CREATE POLICY "admin_read_subscription_usage" ON subscription_usage
  FOR SELECT USING (
    is_internal_admin()
    OR is_organization_member(organization_id)
    OR current_setting('role', true) = 'service_role'
  );

-- ============================================================================
-- ADMIN APP: ANALYTICS VIEWS
-- ============================================================================
-- Purpose: Pre-computed views for efficient admin dashboard queries

-- Materialized view for organization summary (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_org_summary AS
SELECT
  o.id,
  o.name,
  o.country_code,
  o.created_at,
  o.is_active,
  s.plan_type,
  s.status as subscription_status,
  s.current_period_start,
  s.current_period_end,
  su.mrr,
  su.arr,
  su.farms_count,
  su.parcels_count,
  su.users_count,
  su.storage_used_mb,
  su.last_activity_at,
  (SELECT COUNT(*) FROM events WHERE organization_id = o.id AND occurred_at > NOW() - INTERVAL '7 days') as events_7d,
  (SELECT COUNT(*) FROM events WHERE organization_id = o.id AND occurred_at > NOW() - INTERVAL '30 days') as events_30d,
  (SELECT MAX(occurred_at) FROM events WHERE organization_id = o.id) as last_event_at
FROM organizations o
LEFT JOIN subscriptions s ON s.organization_id = o.id
LEFT JOIN subscription_usage su ON su.organization_id = o.id;

-- Create unique index for refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_org_summary_id ON admin_org_summary(id);
CREATE INDEX IF NOT EXISTS idx_admin_org_summary_created ON admin_org_summary(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_org_summary_plan ON admin_org_summary(plan_type);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_admin_org_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_org_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for daily organization growth
CREATE OR REPLACE VIEW admin_org_growth AS
SELECT
  date_trunc('day', created_at)::date as date,
  COUNT(*) as new_orgs,
  SUM(COUNT(*)) OVER (ORDER BY date_trunc('day', created_at)) as cumulative_orgs
FROM organizations
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- View for subscription breakdown
CREATE OR REPLACE VIEW admin_subscription_breakdown AS
SELECT
  plan_type,
  status,
  COUNT(*) as count,
  SUM(COALESCE(su.mrr, 0)) as total_mrr
FROM subscriptions s
LEFT JOIN subscription_usage su ON su.organization_id = s.organization_id
GROUP BY plan_type, status
ORDER BY plan_type, status;

-- View for event type distribution
CREATE OR REPLACE VIEW admin_event_distribution AS
SELECT
  event_type,
  DATE(occurred_at) as date,
  COUNT(*) as count
FROM events
WHERE occurred_at > NOW() - INTERVAL '30 days'
GROUP BY event_type, DATE(occurred_at)
ORDER BY date DESC, count DESC;

-- View for top organizations by activity
CREATE OR REPLACE VIEW admin_top_orgs_by_activity AS
SELECT
  o.id,
  o.name,
  COUNT(e.id) as event_count,
  MAX(e.occurred_at) as last_activity
FROM organizations o
LEFT JOIN events e ON e.organization_id = o.id AND e.occurred_at > NOW() - INTERVAL '30 days'
GROUP BY o.id, o.name
ORDER BY event_count DESC
LIMIT 100;

-- View for churn risk organizations
CREATE OR REPLACE VIEW admin_churn_risk AS
SELECT
  o.id,
  o.name,
  o.created_at,
  su.last_activity_at,
  su.churn_risk_score,
  s.plan_type,
  s.current_period_end,
  EXTRACT(days FROM s.current_period_end - NOW()) as days_until_renewal
FROM organizations o
LEFT JOIN subscriptions s ON s.organization_id = o.id
LEFT JOIN subscription_usage su ON su.organization_id = o.id
WHERE
  su.last_activity_at < NOW() - INTERVAL '14 days'
  OR su.churn_risk_score >= 70
  OR (s.current_period_end IS NOT NULL AND s.current_period_end < NOW() + INTERVAL '7 days')
ORDER BY su.churn_risk_score DESC NULLS LAST;

-- Aggregated reference data stats view
CREATE OR REPLACE VIEW admin_reference_data_stats AS
SELECT
  'account_templates' as table_name,
  COUNT(*) as total_count,
  COUNT(*) as active_count,
  1 as version_count,
  MAX(created_at) as last_updated
FROM account_templates
UNION ALL
SELECT
  'account_mappings',
  COUNT(*),
  COUNT(*),
  1,
  MAX(created_at)
FROM account_mappings
UNION ALL
SELECT
  'modules',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = true),
  1,
  MAX(updated_at)
FROM modules
UNION ALL
SELECT
  'currencies',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = true),
  1,
  MAX(created_at)
FROM currencies
UNION ALL
SELECT
  'roles',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = true),
  1,
  MAX(updated_at)
FROM roles;

-- View for recent admin job logs
CREATE OR REPLACE VIEW admin_recent_jobs AS
SELECT
  id,
  job_type,
  status,
  records_processed,
  records_created,
  records_updated,
  records_skipped,
  duration_ms,
  created_by,
  created_at,
  completed_at
FROM admin_job_logs
ORDER BY created_at DESC
LIMIT 100;

COMMENT ON MATERIALIZED VIEW admin_org_summary IS 'Summary of all organizations with subscription and usage data';
COMMENT ON VIEW admin_org_growth IS 'Daily new organization signups with cumulative totals';
COMMENT ON VIEW admin_subscription_breakdown IS 'Breakdown of subscriptions by plan type and status';
COMMENT ON VIEW admin_event_distribution IS 'Distribution of events by type over the last 30 days';
COMMENT ON VIEW admin_top_orgs_by_activity IS 'Top 100 organizations by recent activity';
COMMENT ON VIEW admin_churn_risk IS 'Organizations at risk of churning';
COMMENT ON VIEW admin_reference_data_stats IS 'Statistics for all reference data tables';
COMMENT ON VIEW admin_recent_jobs IS 'Recent admin job logs';
-- Seed default Soil Types
INSERT INTO soil_types (name, description, organization_id)
SELECT name, description, NULL
FROM (VALUES 
  ('Clay', 'Heavy soil with high nutrient retention but poor drainage.'),
  ('Sandy', 'Light, warm, dry and tends to be acidic and low in nutrients.'),
  ('Silty', 'Slippery when wet, retains water effectively.'),
  ('Peaty', 'High in organic matter and retains a large amount of moisture.'),
  ('Chalky', 'Can be either light or heavy but is highly alkaline due to calcium carbonate.'),
  ('Loamy', 'Mixture of sand, silt, and clay that are combined to avoid the negative effects of each type.')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM soil_types WHERE name = v.name AND organization_id IS NULL
);

-- Seed default Irrigation Types
INSERT INTO irrigation_types (name, description, efficiency, organization_id)
SELECT name, description, efficiency, NULL
FROM (VALUES 
  ('Drip', 'Water is delivered directly to the root zone of plants.', 95),
  ('Sprinkler', 'Water is sprayed into the air and falls on the ground surface somewhat like rainfall.', 75),
  ('Flood', 'Water is delivered to the field by ditch, pipe, or some other means and simply flows over the ground.', 50),
  ('Micro-sprinkler', 'Low pressure and low volume irrigation.', 85),
  ('Pivot', 'Center pivot irrigation.', 80)
) AS v(name, description, efficiency)
WHERE NOT EXISTS (
  SELECT 1 FROM irrigation_types WHERE name = v.name AND organization_id IS NULL
);

-- Seed default Rootstocks
INSERT INTO rootstocks (name, description, organization_id)
SELECT name, description, NULL
FROM (VALUES 
  ('GF677', 'Peach x Almond hybrid. Vigorous, adapted to calcareous soils.'),
  ('Nemaguard', 'Resistant to root-knot nematodes. Good for sandy soils.'),
  ('Lovell', 'Standard peach rootstock. Good anchorage.'),
  ('Marianna 2624', 'Plum rootstock. Tolerant to wet soils.'),
  ('M9', 'Dwarfing apple rootstock.'),
  ('MM106', 'Semi-dwarfing apple rootstock.'),
  ('Citruelo', 'Citrus rootstock. Cold hardy and disease resistant.'),
  ('Sour Orange', 'Traditional citrus rootstock. Adapted to many soil types.')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM rootstocks WHERE name = v.name AND organization_id IS NULL
);

-- Seed default Plantation Systems
INSERT INTO plantation_systems (name, description, organization_id)
SELECT name, description, NULL
FROM (VALUES 
  ('Traditional', 'Standard spacing with larger trees.'),
  ('Intensive', 'Higher density planting.'),
  ('Super High Density', 'Very high density, often for mechanical harvesting.'),
  ('Semi-Intensive', 'Intermediate spacing.')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM plantation_systems WHERE name = v.name AND organization_id IS NULL
);

-- Seed default Tree Categories
INSERT INTO tree_categories (category, organization_id)
SELECT category, NULL
FROM (VALUES 
  ('Olive'),
  ('Citrus'),
  ('Stone Fruit'),
  ('Pome Fruit'),
  ('Nut Trees'),
  ('Vines')
) AS v(category)
WHERE NOT EXISTS (
  SELECT 1 FROM tree_categories WHERE category = v.category AND organization_id IS NULL
);

-- Seed default Crop Types
INSERT INTO crop_types (name, description, organization_id)
SELECT name, description, NULL
FROM (VALUES 
  ('Wheat', 'Cereal grain.'),
  ('Barley', 'Cereal grain.'),
  ('Corn', 'Maize.'),
  ('Tomato', 'Vegetable crop.'),
  ('Potato', 'Tuber crop.'),
  ('Onion', 'Bulb vegetable.'),
  ('Carrot', 'Root vegetable.')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM crop_types WHERE name = v.name AND organization_id IS NULL
);

-- Seed default Work Units
INSERT INTO work_units (code, name, unit_category, base_unit, conversion_factor, organization_id)
SELECT code, name, unit_category, base_unit, conversion_factor, NULL
FROM (VALUES 
  ('HR', 'Hour', 'count', NULL, 1.0, 0), -- unit_category must be one of the enum values: 'count', 'weight', 'volume', 'area', 'length'
  ('DAY', 'Day', 'count', 'HR', 8.0, 0),
  ('KG', 'Kilogram', 'weight', NULL, 1.0, 0),
  ('TON', 'Ton', 'weight', 'KG', 1000.0, 0),
  ('HA', 'Hectare', 'area', NULL, 1.0, 0),
  ('L', 'Liter', 'volume', NULL, 1.0, 0),
  ('PCS', 'Piece', 'count', NULL, 1.0, 0)
) AS v(code, name, unit_category, base_unit, conversion_factor, is_dummy)
WHERE NOT EXISTS (
  SELECT 1 FROM work_units WHERE code = v.code AND organization_id IS NULL
);

-- Seed default Product Categories
INSERT INTO product_categories (name, description, organization_id)
SELECT name, description, NULL
FROM (VALUES 
  ('Fertilizers', 'Nutrients for plants.'),
  ('Pesticides', 'Chemicals for pest control.'),
  ('Seeds', 'Planting material.'),
  ('Fuel', 'Diesel, gasoline, etc.'),
  ('Spare Parts', 'Parts for machinery.'),
  ('Tools', 'Hand tools and equipment.'),
  ('Packaging', 'Boxes, crates, bags.')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM product_categories WHERE name = v.name AND organization_id IS NULL
);
-- Soil Types
ALTER TABLE soil_types ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE soil_types ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE soil_types ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE soil_types ADD COLUMN IF NOT EXISTS description_fr TEXT;

-- Irrigation Types
ALTER TABLE irrigation_types ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE irrigation_types ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE irrigation_types ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE irrigation_types ADD COLUMN IF NOT EXISTS description_fr TEXT;

-- Rootstocks
ALTER TABLE rootstocks ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE rootstocks ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE rootstocks ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE rootstocks ADD COLUMN IF NOT EXISTS description_fr TEXT;

-- Plantation Systems
ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS description_fr TEXT;

-- Tree Categories
ALTER TABLE tree_categories ADD COLUMN IF NOT EXISTS category_ar TEXT;
ALTER TABLE tree_categories ADD COLUMN IF NOT EXISTS category_fr TEXT;
-- Note: trees doesn't have description, just adding category translations

-- Crop Types
ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS description_fr TEXT;

-- Product Categories
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS description_fr TEXT;
-- Add organization_id to crop_types
ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE crop_types DROP CONSTRAINT IF EXISTS crop_types_name_key;
ALTER TABLE crop_types ADD CONSTRAINT crop_types_org_name_key UNIQUE (organization_id, name);
CREATE INDEX IF NOT EXISTS idx_crop_types_org ON crop_types(organization_id);

-- Add organization_id to product_categories
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE product_categories DROP CONSTRAINT IF EXISTS product_categories_name_key;
ALTER TABLE product_categories ADD CONSTRAINT product_categories_org_name_key UNIQUE (organization_id, name);
CREATE INDEX IF NOT EXISTS idx_product_categories_org ON product_categories(organization_id);

-- Seed default Crop Types (Retry)
INSERT INTO crop_types (name, description, organization_id)
SELECT name, description, NULL
FROM (VALUES 
  ('Wheat', 'Cereal grain.'),
  ('Barley', 'Cereal grain.'),
  ('Corn', 'Maize.'),
  ('Tomato', 'Vegetable crop.'),
  ('Potato', 'Tuber crop.'),
  ('Onion', 'Bulb vegetable.'),
  ('Carrot', 'Root vegetable.')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM crop_types WHERE name = v.name AND organization_id IS NULL
);

-- Seed default Product Categories (Retry)
INSERT INTO product_categories (name, description, organization_id)
SELECT name, description, NULL
FROM (VALUES 
  ('Fertilizers', 'Nutrients for plants.'),
  ('Pesticides', 'Chemicals for pest control.'),
  ('Seeds', 'Planting material.'),
  ('Fuel', 'Diesel, gasoline, etc.'),
  ('Spare Parts', 'Parts for machinery.'),
  ('Tools', 'Hand tools and equipment.'),
  ('Packaging', 'Boxes, crates, bags.')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM product_categories WHERE name = v.name AND organization_id IS NULL
);
-- =====================================================
-- MARKETPLACE TABLES
-- =====================================================

-- Marketplace Listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT, -- Plain text description
  rich_description TEXT, -- HTML/Markdown content
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  price NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'MAD',
  quantity_available NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit TEXT, -- e.g., 'kg', 'ton', 'unit'
  product_category_id UUID REFERENCES product_categories(id),
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'sold_out', 'archived'
  is_public BOOLEAN DEFAULT false,
  images JSONB DEFAULT '[]',
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CHECK (status IN ('draft', 'active', 'sold_out', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_org ON marketplace_listings(organization_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(product_category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_public ON marketplace_listings(is_public) WHERE is_public = true;

-- Marketplace Orders
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_organization_id UUID NOT NULL REFERENCES organizations(id),
  seller_organization_id UUID NOT NULL REFERENCES organizations(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'disputed'
  total_amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'MAD',
  notes TEXT,
  shipping_address TEXT,
  shipping_details JSONB DEFAULT '{}', -- { name, phone, email, address, city, postal_code }
  payment_method TEXT DEFAULT 'cod', -- 'cod', 'cmi', 'paypal', etc.
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'disputed')),
  CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer ON marketplace_orders(buyer_organization_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_seller ON marketplace_orders(seller_organization_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_payment_status ON marketplace_orders(payment_status);

-- Marketplace Order Items
CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL, -- Reference to inventory items
  product_type TEXT DEFAULT 'listing', -- 'listing' or 'item'
  title TEXT NOT NULL, -- Snapshot of listing title
  quantity NUMERIC(12, 2) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  unit TEXT, -- Snapshot of unit
  image_url TEXT, -- Snapshot of main image
  total_price NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  stock_deducted BOOLEAN DEFAULT false, -- Track if stock was deducted
  stock_movement_id UUID REFERENCES stock_movements(id) ON DELETE SET NULL, -- Link to stock movement
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (product_type IN ('listing', 'item'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_order ON marketplace_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_listing ON marketplace_order_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_item ON marketplace_order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_product_type ON marketplace_order_items(product_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_order_items_stock_deducted ON marketplace_order_items(stock_deducted);

-- Marketplace Reviews
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  reviewer_organization_id UUID NOT NULL REFERENCES organizations(id),
  reviewee_organization_id UUID NOT NULL REFERENCES organizations(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, reviewer_organization_id) -- One review per order side
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_reviewee ON marketplace_reviews(reviewee_organization_id);

-- Create auth_users_view for RLS policies
-- This view provides the organization_id for the current authenticated user
CREATE OR REPLACE VIEW auth_users_view AS
SELECT
  ou.user_id as id,
  ou.organization_id
FROM organization_users ou
WHERE ou.is_active = true;

-- RLS POLICIES

-- Enable RLS
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;

-- Listings Policies
CREATE POLICY "Public can view active published listings" ON marketplace_listings
  FOR SELECT USING (is_public = true AND status = 'active');

CREATE POLICY "Organizations can manage own listings" ON marketplace_listings
  FOR ALL USING (organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid()));

-- Orders Policies
CREATE POLICY "Participants can view orders" ON marketplace_orders
  FOR SELECT USING (
    buyer_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid()) OR
    seller_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

CREATE POLICY "Buyers can create orders" ON marketplace_orders
  FOR INSERT WITH CHECK (
    buyer_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

-- Order Items Policies
CREATE POLICY "Participants can view order items" ON marketplace_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_orders o
      WHERE o.id = marketplace_order_items.order_id
      AND (
        o.buyer_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid()) OR
        o.seller_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
      )
    )
  );

-- =====================================================
-- MARKETPLACE CART SYSTEM
-- Shopping cart for marketplace buyers
-- =====================================================

-- Shopping cart table (one cart per user)
CREATE TABLE IF NOT EXISTS marketplace_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  session_id TEXT, -- For guest carts (future use)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One active cart per user
);

-- Cart items table
CREATE TABLE IF NOT EXISTS marketplace_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES marketplace_carts(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE, -- For inventory items sold on marketplace
  seller_organization_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL, -- Snapshot of product title
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  unit TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure only one entry per product per cart
  UNIQUE(cart_id, listing_id),
  UNIQUE(cart_id, item_id),
  -- Must have either listing_id or item_id
  CHECK (listing_id IS NOT NULL OR item_id IS NOT NULL)
);

-- Cart Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_carts_user ON marketplace_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_cart_items_cart ON marketplace_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_cart_items_listing ON marketplace_cart_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_cart_items_item ON marketplace_cart_items(item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_cart_items_seller ON marketplace_cart_items(seller_organization_id);

-- Enable RLS on cart tables
ALTER TABLE marketplace_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing cart policies if any
DROP POLICY IF EXISTS "Users can view own cart" ON marketplace_carts;
DROP POLICY IF EXISTS "Users can create own cart" ON marketplace_carts;
DROP POLICY IF EXISTS "Users can update own cart" ON marketplace_carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON marketplace_carts;
DROP POLICY IF EXISTS "Users can view own cart items" ON marketplace_cart_items;
DROP POLICY IF EXISTS "Users can manage own cart items" ON marketplace_cart_items;

-- Cart policies
CREATE POLICY "Users can view own cart" ON marketplace_carts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own cart" ON marketplace_carts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cart" ON marketplace_carts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cart" ON marketplace_carts
  FOR DELETE USING (user_id = auth.uid());

-- Cart items policies
CREATE POLICY "Users can view own cart items" ON marketplace_cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_carts c
      WHERE c.id = marketplace_cart_items.cart_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own cart items" ON marketplace_cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM marketplace_carts c
      WHERE c.id = marketplace_cart_items.cart_id
      AND c.user_id = auth.uid()
    )
  );

-- Additional columns for marketplace_orders (if not exists)
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS
  shipping_details JSONB DEFAULT '{}';
-- Structure: { name, phone, address, city, postal_code, notes }

ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS
  payment_method TEXT DEFAULT 'cod'; -- cod = Cash on Delivery

ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS
  buyer_name TEXT;

ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS
  buyer_phone TEXT;

ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS
  buyer_email TEXT;

-- Trigger to update updated_at on cart
DROP TRIGGER IF EXISTS trg_marketplace_carts_updated_at ON marketplace_carts;
CREATE TRIGGER trg_marketplace_carts_updated_at
  BEFORE UPDATE ON marketplace_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on cart items
DROP TRIGGER IF EXISTS trg_marketplace_cart_items_updated_at ON marketplace_cart_items;
CREATE TRIGGER trg_marketplace_cart_items_updated_at
  BEFORE UPDATE ON marketplace_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions for cart tables
GRANT ALL ON marketplace_carts TO authenticated;
GRANT ALL ON marketplace_cart_items TO authenticated;
GRANT SELECT ON marketplace_carts TO anon;
GRANT SELECT ON marketplace_cart_items TO anon;

COMMENT ON TABLE marketplace_carts IS 'Shopping carts for marketplace buyers';
COMMENT ON TABLE marketplace_cart_items IS 'Items in marketplace shopping carts';

-- =====================================================
-- MARKETPLACE REVIEWS RLS POLICIES
-- The marketplace_reviews table has RLS enabled but needs policies
-- =====================================================

-- Drop existing review policies if any
DROP POLICY IF EXISTS "Anyone can read reviews" ON marketplace_reviews;
DROP POLICY IF EXISTS "Order participants can create reviews" ON marketplace_reviews;
DROP POLICY IF EXISTS "Reviewers can update own reviews" ON marketplace_reviews;
DROP POLICY IF EXISTS "Reviewers can delete own reviews" ON marketplace_reviews;

-- Anyone can read reviews (public)
CREATE POLICY "Anyone can read reviews" ON marketplace_reviews
  FOR SELECT USING (true);

-- Only order participants can create reviews (after order is delivered)
CREATE POLICY "Order participants can create reviews" ON marketplace_reviews
  FOR INSERT WITH CHECK (
    -- Reviewer must be from the user's organization
    reviewer_organization_id = (
      SELECT organization_id FROM auth_users_view WHERE id = auth.uid()
    )
    -- And the order must exist and be delivered
    AND EXISTS (
      SELECT 1 FROM marketplace_orders o
      WHERE o.id = order_id
      AND o.status = 'delivered'
      AND (
        o.buyer_organization_id = reviewer_organization_id
        OR o.seller_organization_id = reviewer_organization_id
      )
    )
    -- And reviewee must be the other party in the order
    AND EXISTS (
      SELECT 1 FROM marketplace_orders o
      WHERE o.id = order_id
      AND (
        (o.buyer_organization_id = reviewer_organization_id AND o.seller_organization_id = reviewee_organization_id)
        OR (o.seller_organization_id = reviewer_organization_id AND o.buyer_organization_id = reviewee_organization_id)
      )
    )
  );

-- Reviewers can update their own reviews (within 7 days)
CREATE POLICY "Reviewers can update own reviews" ON marketplace_reviews
  FOR UPDATE USING (
    reviewer_organization_id = (
      SELECT organization_id FROM auth_users_view WHERE id = auth.uid()
    )
    AND created_at > NOW() - INTERVAL '7 days'
  );

-- Reviewers can delete their own reviews
CREATE POLICY "Reviewers can delete own reviews" ON marketplace_reviews
  FOR DELETE USING (
    reviewer_organization_id = (
      SELECT organization_id FROM auth_users_view WHERE id = auth.uid()
    )
  );

-- Grant permissions for reviews
GRANT SELECT ON marketplace_reviews TO anon;
GRANT ALL ON marketplace_reviews TO authenticated;

COMMENT ON TABLE marketplace_reviews IS 'Reviews between buyers and sellers after order completion';

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create products storage bucket for marketplace images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing policies if they exist (cleanup for idempotency)
DROP POLICY IF EXISTS "Public read access for products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload for products" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;

-- Policy: Public read access for products bucket
CREATE POLICY "Public read access for products"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Policy: Authenticated users can upload to products bucket
CREATE POLICY "Authenticated upload for products"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- Policy: Users can update their own product images
CREATE POLICY "Users can update own product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- Policy: Users can delete their own product images
CREATE POLICY "Users can delete own product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- Grant necessary permissions for storage
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- =====================================================
-- FILE TRACKING SYSTEM
-- Track all uploaded files across different buckets
-- Detect orphaned files that are not linked to any entity
-- =====================================================

-- File Registry - Track all uploaded files
CREATE TABLE IF NOT EXISTS file_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Storage Details
  bucket_name TEXT NOT NULL, -- 'products', 'invoices', 'documents', etc.
  file_path TEXT NOT NULL, -- Full path in bucket
  file_name TEXT NOT NULL, -- Original filename
  file_size BIGINT, -- Size in bytes
  mime_type TEXT, -- 'image/jpeg', 'application/pdf', etc.

  -- Relationship Tracking
  entity_type TEXT, -- 'item', 'invoice', 'document', 'utility', 'seller', etc.
  entity_id UUID, -- ID of the related entity
  field_name TEXT, -- Which field stores this file ('images', 'logo_url', 'attachment', etc.)

  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,

  -- Status
  is_orphan BOOLEAN DEFAULT false,
  marked_for_deletion BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,

  -- Indexes for fast lookup
  UNIQUE(bucket_name, file_path)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_registry_org ON file_registry(organization_id);
CREATE INDEX IF NOT EXISTS idx_file_registry_bucket ON file_registry(bucket_name);
CREATE INDEX IF NOT EXISTS idx_file_registry_entity ON file_registry(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_registry_orphan ON file_registry(is_orphan) WHERE is_orphan = true;
CREATE INDEX IF NOT EXISTS idx_file_registry_marked_deletion ON file_registry(marked_for_deletion) WHERE marked_for_deletion = true;

-- RLS Policies
ALTER TABLE file_registry ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotency)
DROP POLICY IF EXISTS "Organizations can view own files" ON file_registry;
DROP POLICY IF EXISTS "Organizations can insert own files" ON file_registry;
DROP POLICY IF EXISTS "Organizations can update own files" ON file_registry;
DROP POLICY IF EXISTS "Organizations can delete own files" ON file_registry;

-- Organizations can view their own files
CREATE POLICY "Organizations can view own files" ON file_registry
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

-- Organizations can insert their own files
CREATE POLICY "Organizations can insert own files" ON file_registry
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

-- Organizations can update their own files
CREATE POLICY "Organizations can update own files" ON file_registry
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

-- Organizations can delete their own files
CREATE POLICY "Organizations can delete own files" ON file_registry
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

-- Grant permissions
GRANT ALL ON file_registry TO authenticated;

COMMENT ON TABLE file_registry IS 'Tracks all uploaded files across storage buckets with orphan detection';

-- =====================================================
-- File Usage Statistics View
-- Aggregate file storage usage by bucket and organization
-- =====================================================

CREATE OR REPLACE VIEW file_storage_stats AS
SELECT
  organization_id,
  bucket_name,
  COUNT(*) as file_count,
  SUM(file_size) as total_size_bytes,
  ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as total_size_mb,
  COUNT(*) FILTER (WHERE is_orphan = true) as orphan_count,
  SUM(file_size) FILTER (WHERE is_orphan = true) as orphan_size_bytes,
  ROUND(SUM(file_size) FILTER (WHERE is_orphan = true) / 1024.0 / 1024.0, 2) as orphan_size_mb
FROM file_registry
WHERE deleted_at IS NULL
GROUP BY organization_id, bucket_name;

GRANT SELECT ON file_storage_stats TO authenticated;

COMMENT ON VIEW file_storage_stats IS 'Storage usage statistics by organization and bucket';

-- =====================================================
-- Function: Detect Orphaned Files
-- Compare file_registry with actual entity references
-- =====================================================

CREATE OR REPLACE FUNCTION detect_orphaned_files(p_organization_id UUID)
RETURNS TABLE (
  file_id UUID,
  bucket_name TEXT,
  file_path TEXT,
  entity_type TEXT,
  entity_id UUID,
  reason TEXT
) AS $$
BEGIN
  -- Files linked to items that no longer exist
  RETURN QUERY
  SELECT
    fr.id,
    fr.bucket_name,
    fr.file_path,
    fr.entity_type,
    fr.entity_id,
    'Item no longer exists'::TEXT as reason
  FROM file_registry fr
  WHERE fr.organization_id = p_organization_id
    AND fr.entity_type = 'item'
    AND fr.entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM items i WHERE i.id = fr.entity_id
    );

  -- Files linked to invoices that no longer exist
  RETURN QUERY
  SELECT
    fr.id,
    fr.bucket_name,
    fr.file_path,
    fr.entity_type,
    fr.entity_id,
    'Invoice no longer exists'::TEXT as reason
  FROM file_registry fr
  WHERE fr.organization_id = p_organization_id
    AND fr.entity_type = 'invoice'
    AND fr.entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM invoices inv WHERE inv.id = fr.entity_id
    );

  -- Files linked to sellers that no longer exist
  RETURN QUERY
  SELECT
    fr.id,
    fr.bucket_name,
    fr.file_path,
    fr.entity_type,
    fr.entity_id,
    'Seller organization no longer exists'::TEXT as reason
  FROM file_registry fr
  WHERE fr.organization_id = p_organization_id
    AND fr.entity_type = 'seller'
    AND fr.entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM organizations o WHERE o.id = fr.entity_id
    );

  -- Files with no entity reference at all
  RETURN QUERY
  SELECT
    fr.id,
    fr.bucket_name,
    fr.file_path,
    fr.entity_type,
    fr.entity_id,
    'No entity reference'::TEXT as reason
  FROM file_registry fr
  WHERE fr.organization_id = p_organization_id
    AND (fr.entity_type IS NULL OR fr.entity_id IS NULL);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION detect_orphaned_files(UUID) TO authenticated;

COMMENT ON FUNCTION detect_orphaned_files IS 'Detects files in registry that are no longer linked to any entity';

-- =====================================================
-- Function: Mark Orphaned Files for Deletion
-- Mark files as orphaned based on detection
-- =====================================================

CREATE OR REPLACE FUNCTION mark_orphaned_files(p_organization_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE file_registry
  SET
    is_orphan = true,
    marked_for_deletion = true
  WHERE id IN (
    SELECT file_id FROM detect_orphaned_files(p_organization_id)
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION mark_orphaned_files(UUID) TO authenticated;

COMMENT ON FUNCTION mark_orphaned_files IS 'Marks orphaned files for deletion and returns count of marked files';

-- =====================================================
-- Trigger: Update last_accessed_at on item image access
-- Track when files are accessed
-- =====================================================

CREATE OR REPLACE FUNCTION update_file_access_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be called from application code when files are accessed
  -- For now, it's a placeholder for future implementation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_file_access_timestamp IS 'Placeholder trigger function for tracking file access';

-- =====================================================
-- MARKETPLACE INVENTORY TRACKING FUNCTIONS
-- Added: 2025-12-23
-- Purpose: Stock deduction and restoration for marketplace orders
-- =====================================================

-- Function: Check marketplace stock availability
CREATE OR REPLACE FUNCTION check_marketplace_stock_availability(
  p_listing_id UUID DEFAULT NULL,
  p_item_id UUID DEFAULT NULL,
  p_quantity NUMERIC DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  v_available NUMERIC;
BEGIN
  -- Check marketplace listing availability
  IF p_listing_id IS NOT NULL THEN
    SELECT quantity_available INTO v_available
    FROM marketplace_listings
    WHERE id = p_listing_id AND is_public = true;

    RETURN v_available >= p_quantity;
  END IF;

  -- Check inventory item availability (sum of all stock valuation batches)
  IF p_item_id IS NOT NULL THEN
    SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_available
    FROM stock_valuation
    WHERE item_id = p_item_id;

    RETURN v_available >= p_quantity;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION check_marketplace_stock_availability TO authenticated;
COMMENT ON FUNCTION check_marketplace_stock_availability IS 'Check if sufficient stock is available for a listing or item';

-- Function: Deduct marketplace listing stock
CREATE OR REPLACE FUNCTION deduct_marketplace_listing_stock(
  p_listing_id UUID,
  p_quantity NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_qty NUMERIC;
BEGIN
  -- Get current quantity with row lock
  SELECT quantity_available INTO v_current_qty
  FROM marketplace_listings
  WHERE id = p_listing_id
  FOR UPDATE; -- Lock row for update to prevent race conditions

  -- Check if sufficient stock
  IF v_current_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for listing %. Available: %, Requested: %',
      p_listing_id, v_current_qty, p_quantity;
  END IF;

  -- Deduct quantity
  UPDATE marketplace_listings
  SET quantity_available = quantity_available - p_quantity,
      updated_at = NOW()
  WHERE id = p_listing_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION deduct_marketplace_listing_stock TO authenticated;
COMMENT ON FUNCTION deduct_marketplace_listing_stock IS 'Deduct quantity from marketplace_listings.quantity_available with row locking';

-- Function: Restore marketplace listing stock
CREATE OR REPLACE FUNCTION restore_marketplace_listing_stock(
  p_listing_id UUID,
  p_quantity NUMERIC
) RETURNS BOOLEAN AS $$
BEGIN
  -- Restore quantity (e.g., when order is cancelled)
  UPDATE marketplace_listings
  SET quantity_available = quantity_available + p_quantity,
      updated_at = NOW()
  WHERE id = p_listing_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION restore_marketplace_listing_stock TO authenticated;
COMMENT ON FUNCTION restore_marketplace_listing_stock IS 'Restore quantity to marketplace_listings (e.g., when order is cancelled)';

-- =====================================================
-- MERGED MIGRATIONS
-- =====================================================
-- The following sections were merged from individual migration files:
-- - 20251223_marketplace_quote_requests.sql
-- - 20251230_agricultural_accounting.sql
-- - 20251231_add_completed_tours.sql
-- - 20251231_organization_account_mappings.sql
-- - 20251231_organization_ai_settings.sql
-- =====================================================

-- =====================================================
-- MARKETPLACE QUOTE REQUESTS (from 20251223_marketplace_quote_requests.sql)
-- =====================================================

-- Marketplace Quote Requests Table
-- Tracks buyer quote requests to sellers for products

CREATE TABLE IF NOT EXISTS marketplace_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request details
  requester_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  seller_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,

  -- Product info (snapshot at request time)
  product_title TEXT NOT NULL,
  product_description TEXT,
  requested_quantity NUMERIC(12, 2),
  unit_of_measure TEXT,

  -- Buyer message
  message TEXT,
  buyer_contact_name TEXT,
  buyer_contact_email TEXT,
  buyer_contact_phone TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'responded', 'quoted', 'accepted', 'declined', 'cancelled')),

  -- Seller response
  seller_response TEXT,
  quoted_price NUMERIC(12, 2),
  quoted_currency TEXT DEFAULT 'MAD',
  quote_valid_until TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT has_product CHECK (item_id IS NOT NULL OR listing_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_requests_requester ON marketplace_quote_requests(requester_organization_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_seller ON marketplace_quote_requests(seller_organization_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON marketplace_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_item ON marketplace_quote_requests(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_requests_listing ON marketplace_quote_requests(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON marketplace_quote_requests(created_at DESC);

-- RLS Policies
ALTER TABLE marketplace_quote_requests ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own requests
DO $$ BEGIN
CREATE POLICY "Users can view their own quote requests"
  ON marketplace_quote_requests
  FOR SELECT
  USING (
    requester_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sellers can view requests sent to them
DO $$ BEGIN
CREATE POLICY "Sellers can view requests sent to them"
  ON marketplace_quote_requests
  FOR SELECT
  USING (
    seller_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Buyers can create quote requests
DO $$ BEGIN
CREATE POLICY "Authenticated users can create quote requests"
  ON marketplace_quote_requests
  FOR INSERT
  WITH CHECK (
    requester_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sellers can update requests sent to them (to respond/quote)
DO $$ BEGIN
CREATE POLICY "Sellers can update their received requests"
  ON marketplace_quote_requests
  FOR UPDATE
  USING (
    seller_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Buyers can update their own requests (to cancel)
DO $$ BEGIN
CREATE POLICY "Buyers can update their own requests"
  ON marketplace_quote_requests
  FOR UPDATE
  USING (
    requester_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quote_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_marketplace_quote_requests_updated_at ON marketplace_quote_requests;
CREATE TRIGGER update_marketplace_quote_requests_updated_at
  BEFORE UPDATE ON marketplace_quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_request_updated_at();

-- Function to get quote request statistics for a seller
CREATE OR REPLACE FUNCTION get_seller_quote_stats(seller_org_id UUID)
RETURNS TABLE (
  total_requests BIGINT,
  pending_requests BIGINT,
  responded_requests BIGINT,
  accepted_requests BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_requests,
    COUNT(*) FILTER (WHERE status IN ('responded', 'quoted'))::BIGINT as responded_requests,
    COUNT(*) FILTER (WHERE status = 'accepted')::BIGINT as accepted_requests
  FROM marketplace_quote_requests
  WHERE seller_organization_id = seller_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE marketplace_quote_requests IS 'Stores quote requests from buyers to sellers for marketplace products';

-- =====================================================
-- AGRICULTURAL FINANCIAL YEAR ACCOUNTING MODEL
-- (from 20251230_agricultural_accounting.sql)
-- =====================================================

-- 1. FISCAL YEARS TABLE
CREATE TABLE IF NOT EXISTS fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  status VARCHAR(20) DEFAULT 'open',
  is_current BOOLEAN DEFAULT false,
  period_type VARCHAR(20) DEFAULT 'monthly',

  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  closing_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, code),
  UNIQUE(organization_id, start_date),
  CHECK (status IN ('open', 'closing', 'closed')),
  CHECK (period_type IN ('monthly', 'quarterly')),
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_years_org ON fiscal_years(organization_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_dates ON fiscal_years(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_current ON fiscal_years(organization_id, is_current) WHERE is_current = true;

-- Ensure only one current fiscal year per organization
CREATE OR REPLACE FUNCTION ensure_single_current_fiscal_year()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE fiscal_years
    SET is_current = false
    WHERE organization_id = NEW.organization_id
    AND id != NEW.id
    AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_single_current_fiscal_year ON fiscal_years;
CREATE TRIGGER trg_ensure_single_current_fiscal_year
  BEFORE INSERT OR UPDATE ON fiscal_years
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_current_fiscal_year();

-- 2. FISCAL PERIODS TABLE
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  period_number INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  status VARCHAR(20) DEFAULT 'open',

  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(fiscal_year_id, period_number),
  CHECK (status IN ('open', 'closing', 'closed')),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_year ON fiscal_periods(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_dates ON fiscal_periods(start_date, end_date);

-- 3. AGRICULTURAL CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS agricultural_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description TEXT,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  campaign_type VARCHAR(50) DEFAULT 'general',

  status VARCHAR(20) DEFAULT 'planned',
  is_current BOOLEAN DEFAULT false,

  primary_fiscal_year_id UUID REFERENCES fiscal_years(id),
  secondary_fiscal_year_id UUID REFERENCES fiscal_years(id),

  total_area_ha NUMERIC DEFAULT 0,
  total_planned_production NUMERIC DEFAULT 0,
  total_actual_production NUMERIC DEFAULT 0,
  total_costs NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, code),
  CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  CHECK (campaign_type IN ('general', 'rainfed', 'irrigated', 'greenhouse')),
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org ON agricultural_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON agricultural_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_current ON agricultural_campaigns(organization_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON agricultural_campaigns(organization_id, status);

-- 4. CROP CYCLES TABLE
CREATE TABLE IF NOT EXISTS crop_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
  variety_id UUID REFERENCES crop_varieties(id),
  crop_type TEXT NOT NULL,
  variety_name TEXT,

  cycle_code VARCHAR(50) NOT NULL,
  cycle_name VARCHAR(255),

  campaign_id UUID REFERENCES agricultural_campaigns(id),
  fiscal_year_id UUID REFERENCES fiscal_years(id),
  season TEXT,

  land_prep_date DATE,
  planting_date DATE,
  expected_harvest_start DATE,
  expected_harvest_end DATE,
  actual_harvest_start DATE,
  actual_harvest_end DATE,
  cycle_closed_date DATE,

  status VARCHAR(20) DEFAULT 'planned',

  planted_area_ha NUMERIC,
  harvested_area_ha NUMERIC,
  expected_yield_per_ha NUMERIC,
  expected_total_yield NUMERIC,
  actual_yield_per_ha NUMERIC,
  actual_total_yield NUMERIC,
  yield_unit TEXT DEFAULT 'kg',

  average_quality_grade TEXT,
  quality_notes TEXT,

  total_costs NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  cost_per_ha NUMERIC,
  cost_per_unit NUMERIC,
  revenue_per_ha NUMERIC,
  profit_margin NUMERIC,

  wip_valuation NUMERIC DEFAULT 0,
  inventory_valuation NUMERIC DEFAULT 0,
  valuation_method TEXT DEFAULT 'cost',
  last_valuation_date DATE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id, cycle_code),
  CHECK (status IN ('planned', 'land_prep', 'growing', 'harvesting', 'completed', 'cancelled')),
  CHECK (valuation_method IN ('cost', 'fair_value', 'nrv'))
);

CREATE INDEX IF NOT EXISTS idx_crop_cycles_org ON crop_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_farm ON crop_cycles(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_parcel ON crop_cycles(parcel_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_campaign ON crop_cycles(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_fiscal ON crop_cycles(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_status ON crop_cycles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_dates ON crop_cycles(planting_date, expected_harvest_end);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_crop_type ON crop_cycles(organization_id, crop_type);

-- 5. BIOLOGICAL ASSETS TABLE (IAS 41 Compliance)
CREATE TABLE IF NOT EXISTS biological_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  asset_type VARCHAR(50) NOT NULL,
  asset_category VARCHAR(100) NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  asset_code VARCHAR(50) NOT NULL,

  quantity INTEGER,
  area_ha NUMERIC,

  acquisition_date DATE NOT NULL,
  maturity_date DATE,
  expected_useful_life_years INTEGER,
  current_age_years INTEGER,

  status VARCHAR(30) DEFAULT 'immature',
  is_productive BOOLEAN DEFAULT false,

  initial_cost NUMERIC NOT NULL DEFAULT 0,
  accumulated_depreciation NUMERIC DEFAULT 0,
  carrying_amount NUMERIC,

  fair_value NUMERIC,
  fair_value_date DATE,
  fair_value_method TEXT,
  fair_value_level INTEGER,

  expected_annual_yield NUMERIC,
  expected_yield_unit TEXT DEFAULT 'kg',
  actual_ytd_yield NUMERIC DEFAULT 0,

  depreciation_method TEXT DEFAULT 'straight_line',
  annual_depreciation NUMERIC,
  residual_value NUMERIC DEFAULT 0,

  variety_info TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, asset_code),
  CHECK (asset_type IN ('bearer_plant', 'consumable_plant', 'livestock_bearer', 'livestock_consumable')),
  CHECK (status IN ('immature', 'productive', 'declining', 'disposed')),
  CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'units_of_production')),
  CHECK (fair_value_level IS NULL OR fair_value_level IN (1, 2, 3))
);

CREATE INDEX IF NOT EXISTS idx_biological_assets_org ON biological_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_biological_assets_farm ON biological_assets(farm_id);
CREATE INDEX IF NOT EXISTS idx_biological_assets_parcel ON biological_assets(parcel_id);
CREATE INDEX IF NOT EXISTS idx_biological_assets_type ON biological_assets(organization_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_biological_assets_status ON biological_assets(organization_id, status);

-- 6. BIOLOGICAL ASSET VALUATIONS TABLE
CREATE TABLE IF NOT EXISTS biological_asset_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biological_asset_id UUID NOT NULL REFERENCES biological_assets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  valuation_date DATE NOT NULL,
  fiscal_year_id UUID REFERENCES fiscal_years(id),
  fiscal_period_id UUID REFERENCES fiscal_periods(id),

  previous_fair_value NUMERIC,
  current_fair_value NUMERIC NOT NULL,
  fair_value_change NUMERIC,

  valuation_method TEXT NOT NULL,
  fair_value_level INTEGER,
  market_price_reference NUMERIC,
  discount_rate NUMERIC,

  quantity_change INTEGER DEFAULT 0,
  natural_increase NUMERIC DEFAULT 0,

  harvest_quantity NUMERIC DEFAULT 0,
  harvest_value NUMERIC DEFAULT 0,

  journal_entry_id UUID REFERENCES journal_entries(id),

  valuation_report_url TEXT,
  appraiser_name TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CHECK (valuation_method IN ('market_price', 'dcf', 'cost_approach')),
  CHECK (fair_value_level IN (1, 2, 3))
);

CREATE INDEX IF NOT EXISTS idx_bio_valuations_asset ON biological_asset_valuations(biological_asset_id);
CREATE INDEX IF NOT EXISTS idx_bio_valuations_date ON biological_asset_valuations(valuation_date DESC);
CREATE INDEX IF NOT EXISTS idx_bio_valuations_fiscal ON biological_asset_valuations(fiscal_year_id);

-- 7. CROP CYCLE COST ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS crop_cycle_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  source_type VARCHAR(50) NOT NULL,
  source_id UUID NOT NULL,

  crop_cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,

  allocation_percentage NUMERIC NOT NULL,
  allocated_amount NUMERIC NOT NULL,

  allocation_method TEXT DEFAULT 'manual',
  allocation_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(source_type, source_id, crop_cycle_id),
  CHECK (source_type IN ('cost', 'revenue', 'journal_item')),
  CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  CHECK (allocation_method IN ('manual', 'area', 'production', 'time', 'equal'))
);

CREATE INDEX IF NOT EXISTS idx_cycle_alloc_source ON crop_cycle_allocations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_cycle_alloc_cycle ON crop_cycle_allocations(crop_cycle_id);

-- 8. ALTER EXISTING TABLES - Add Time Dimension FKs
ALTER TABLE costs
  ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES agricultural_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES fiscal_periods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_costs_crop_cycle ON costs(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_costs_campaign ON costs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_costs_fiscal_year ON costs(fiscal_year_id);

ALTER TABLE revenues
  ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES agricultural_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES fiscal_periods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS harvest_record_id UUID REFERENCES harvest_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_revenues_crop_cycle ON revenues(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_revenues_campaign ON revenues(campaign_id);
CREATE INDEX IF NOT EXISTS idx_revenues_fiscal_year ON revenues(fiscal_year_id);

ALTER TABLE journal_items
  ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES agricultural_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES fiscal_periods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS biological_asset_id UUID REFERENCES biological_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_journal_items_crop_cycle ON journal_items(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_campaign ON journal_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_fiscal_year ON journal_items(fiscal_year_id);

ALTER TABLE harvest_records
  ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES agricultural_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_harvest_records_crop_cycle ON harvest_records(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_harvest_records_campaign ON harvest_records(campaign_id);

ALTER TABLE cost_centers
  ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cost_centers_crop_cycle ON cost_centers(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent ON cost_centers(parent_id);

-- 9. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION get_fiscal_year_for_date(
  p_organization_id UUID,
  p_date DATE
) RETURNS UUID AS $$
DECLARE
  v_fiscal_year_id UUID;
BEGIN
  SELECT id INTO v_fiscal_year_id
  FROM fiscal_years
  WHERE organization_id = p_organization_id
    AND p_date >= start_date
    AND p_date <= end_date
  LIMIT 1;

  RETURN v_fiscal_year_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_campaign_for_date(
  p_organization_id UUID,
  p_date DATE
) RETURNS UUID AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  SELECT id INTO v_campaign_id
  FROM agricultural_campaigns
  WHERE organization_id = p_organization_id
    AND p_date >= start_date
    AND p_date <= end_date
    AND status != 'cancelled'
  LIMIT 1;

  RETURN v_campaign_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_populate_cost_time_dimensions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fiscal_year_id IS NULL AND NEW.date IS NOT NULL THEN
    NEW.fiscal_year_id := get_fiscal_year_for_date(NEW.organization_id, NEW.date);
  END IF;

  IF NEW.campaign_id IS NULL AND NEW.date IS NOT NULL THEN
    NEW.campaign_id := get_campaign_for_date(NEW.organization_id, NEW.date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_cost_time_dimensions ON costs;
CREATE TRIGGER trg_auto_cost_time_dimensions
  BEFORE INSERT OR UPDATE ON costs
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_cost_time_dimensions();

DROP TRIGGER IF EXISTS trg_auto_revenue_time_dimensions ON revenues;
CREATE TRIGGER trg_auto_revenue_time_dimensions
  BEFORE INSERT OR UPDATE ON revenues
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_cost_time_dimensions();

CREATE OR REPLACE FUNCTION update_crop_cycle_financials()
RETURNS TRIGGER AS $$
DECLARE
  v_crop_cycle_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_crop_cycle_id := OLD.crop_cycle_id;
  ELSE
    v_crop_cycle_id := NEW.crop_cycle_id;
  END IF;

  IF v_crop_cycle_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE crop_cycles cc SET
    total_costs = COALESCE((
      SELECT SUM(amount) FROM costs WHERE crop_cycle_id = cc.id
    ), 0),
    total_revenue = COALESCE((
      SELECT SUM(amount) FROM revenues WHERE crop_cycle_id = cc.id
    ), 0),
    updated_at = NOW()
  WHERE id = v_crop_cycle_id;

  UPDATE crop_cycles SET
    net_profit = total_revenue - total_costs,
    cost_per_ha = CASE WHEN planted_area_ha > 0 THEN total_costs / planted_area_ha END,
    revenue_per_ha = CASE WHEN harvested_area_ha > 0 THEN total_revenue / harvested_area_ha END,
    profit_margin = CASE WHEN total_revenue > 0 THEN (total_revenue - total_costs) / total_revenue * 100 END
  WHERE id = v_crop_cycle_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_cycle_costs ON costs;
CREATE TRIGGER trg_update_cycle_costs
  AFTER INSERT OR UPDATE OR DELETE ON costs
  FOR EACH ROW
  EXECUTE FUNCTION update_crop_cycle_financials();

DROP TRIGGER IF EXISTS trg_update_cycle_revenues ON revenues;
CREATE TRIGGER trg_update_cycle_revenues
  AFTER INSERT OR UPDATE OR DELETE ON revenues
  FOR EACH ROW
  EXECUTE FUNCTION update_crop_cycle_financials();

-- 10. REPORTING VIEWS
CREATE OR REPLACE VIEW crop_cycle_pnl AS
SELECT
  cc.id,
  cc.organization_id,
  cc.cycle_code,
  cc.cycle_name,
  cc.crop_type,
  cc.variety_name,
  cc.status,
  cc.campaign_id,
  ac.name AS campaign_name,
  cc.fiscal_year_id,
  fy.name AS fiscal_year_name,
  cc.farm_id,
  f.name AS farm_name,
  cc.parcel_id,
  p.name AS parcel_name,
  cc.planted_area_ha,
  cc.harvested_area_ha,
  cc.actual_total_yield,
  cc.yield_unit,
  cc.total_costs,
  cc.total_revenue,
  cc.net_profit,
  cc.cost_per_ha,
  cc.revenue_per_ha,
  cc.profit_margin,
  cc.planting_date,
  cc.actual_harvest_end,
  cc.wip_valuation,
  cc.inventory_valuation
FROM crop_cycles cc
LEFT JOIN agricultural_campaigns ac ON cc.campaign_id = ac.id
LEFT JOIN fiscal_years fy ON cc.fiscal_year_id = fy.id
LEFT JOIN farms f ON cc.farm_id = f.id
LEFT JOIN parcels p ON cc.parcel_id = p.id;

CREATE OR REPLACE VIEW campaign_summary AS
SELECT
  ac.id,
  ac.organization_id,
  ac.name,
  ac.code,
  ac.status,
  ac.start_date,
  ac.end_date,
  COUNT(DISTINCT cc.id) AS total_cycles,
  SUM(cc.planted_area_ha) AS total_planted_area,
  SUM(cc.total_costs) AS total_costs,
  SUM(cc.total_revenue) AS total_revenue,
  SUM(cc.net_profit) AS net_profit,
  CASE
    WHEN SUM(cc.total_revenue) > 0
    THEN (SUM(cc.total_revenue) - SUM(cc.total_costs)) / SUM(cc.total_revenue) * 100
  END AS profit_margin
FROM agricultural_campaigns ac
LEFT JOIN crop_cycles cc ON cc.campaign_id = ac.id
GROUP BY ac.id, ac.organization_id, ac.name, ac.code, ac.status, ac.start_date, ac.end_date;

CREATE OR REPLACE VIEW fiscal_campaign_reconciliation AS
SELECT
  fy.id AS fiscal_year_id,
  fy.name AS fiscal_year_name,
  fy.organization_id,
  ac.id AS campaign_id,
  ac.name AS campaign_name,
  COALESCE(SUM(c.amount) FILTER (WHERE c.fiscal_year_id = fy.id), 0) AS costs_in_fiscal_year,
  COALESCE(SUM(r.amount) FILTER (WHERE r.fiscal_year_id = fy.id), 0) AS revenue_in_fiscal_year,
  COALESCE(SUM(c.amount) FILTER (WHERE c.campaign_id = ac.id), 0) AS costs_in_campaign,
  COALESCE(SUM(r.amount) FILTER (WHERE r.campaign_id = ac.id), 0) AS revenue_in_campaign
FROM fiscal_years fy
CROSS JOIN agricultural_campaigns ac
LEFT JOIN costs c ON c.organization_id = fy.organization_id
LEFT JOIN revenues r ON r.organization_id = fy.organization_id
WHERE fy.organization_id = ac.organization_id
GROUP BY fy.id, fy.name, fy.organization_id, ac.id, ac.name;

-- 11. ROW LEVEL SECURITY POLICIES FOR AGRICULTURAL ACCOUNTING TABLES

-- Fiscal Years RLS
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_fiscal_years" ON fiscal_years;
CREATE POLICY "org_read_fiscal_years" ON fiscal_years
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_write_fiscal_years" ON fiscal_years;
CREATE POLICY "org_write_fiscal_years" ON fiscal_years
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = fiscal_years.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

DROP POLICY IF EXISTS "org_update_fiscal_years" ON fiscal_years;
CREATE POLICY "org_update_fiscal_years" ON fiscal_years
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = fiscal_years.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

DROP POLICY IF EXISTS "org_delete_fiscal_years" ON fiscal_years;
CREATE POLICY "org_delete_fiscal_years" ON fiscal_years
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = fiscal_years.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

-- Fiscal Periods RLS
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_fiscal_periods" ON fiscal_periods;
CREATE POLICY "org_read_fiscal_periods" ON fiscal_periods
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_manage_fiscal_periods" ON fiscal_periods;
CREATE POLICY "org_manage_fiscal_periods" ON fiscal_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = fiscal_periods.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

-- Agricultural Campaigns RLS
ALTER TABLE agricultural_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_campaigns" ON agricultural_campaigns;
CREATE POLICY "org_read_campaigns" ON agricultural_campaigns
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_write_campaigns" ON agricultural_campaigns;
CREATE POLICY "org_write_campaigns" ON agricultural_campaigns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = agricultural_campaigns.organization_id
        AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
        AND ou.is_active = true
    )
  );

DROP POLICY IF EXISTS "org_update_campaigns" ON agricultural_campaigns;
CREATE POLICY "org_update_campaigns" ON agricultural_campaigns
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = agricultural_campaigns.organization_id
        AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
        AND ou.is_active = true
    )
  );

DROP POLICY IF EXISTS "org_delete_campaigns" ON agricultural_campaigns;
CREATE POLICY "org_delete_campaigns" ON agricultural_campaigns
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = agricultural_campaigns.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

-- Crop Cycles RLS
ALTER TABLE crop_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_crop_cycles" ON crop_cycles;
CREATE POLICY "org_read_crop_cycles" ON crop_cycles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_write_crop_cycles" ON crop_cycles;
CREATE POLICY "org_write_crop_cycles" ON crop_cycles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = crop_cycles.organization_id
        AND r.name IN ('organization_admin', 'farm_manager', 'farm_worker', 'system_admin')
        AND ou.is_active = true
    )
  );

DROP POLICY IF EXISTS "org_update_crop_cycles" ON crop_cycles;
CREATE POLICY "org_update_crop_cycles" ON crop_cycles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = crop_cycles.organization_id
        AND r.name IN ('organization_admin', 'farm_manager', 'farm_worker', 'system_admin')
        AND ou.is_active = true
    )
  );

DROP POLICY IF EXISTS "org_delete_crop_cycles" ON crop_cycles;
CREATE POLICY "org_delete_crop_cycles" ON crop_cycles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = crop_cycles.organization_id
        AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
        AND ou.is_active = true
    )
  );

-- Biological Assets RLS
ALTER TABLE biological_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_biological_assets" ON biological_assets;
CREATE POLICY "org_read_biological_assets" ON biological_assets
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_manage_biological_assets" ON biological_assets;
CREATE POLICY "org_manage_biological_assets" ON biological_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = biological_assets.organization_id
        AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
        AND ou.is_active = true
    )
  );

-- Biological Asset Valuations RLS
ALTER TABLE biological_asset_valuations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_bio_valuations" ON biological_asset_valuations;
CREATE POLICY "org_read_bio_valuations" ON biological_asset_valuations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_manage_bio_valuations" ON biological_asset_valuations;
CREATE POLICY "org_manage_bio_valuations" ON biological_asset_valuations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = biological_asset_valuations.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

-- Crop Cycle Allocations RLS
ALTER TABLE crop_cycle_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_cycle_allocations" ON crop_cycle_allocations;
CREATE POLICY "org_read_cycle_allocations" ON crop_cycle_allocations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_manage_cycle_allocations" ON crop_cycle_allocations;
CREATE POLICY "org_manage_cycle_allocations" ON crop_cycle_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = crop_cycle_allocations.organization_id
        AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
        AND ou.is_active = true
    )
  );

-- 12. SEED DATA: MOROCCO CAMPAIGN TEMPLATES
CREATE OR REPLACE FUNCTION create_default_fiscal_year(
  p_organization_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_fiscal_year_id UUID;
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  INSERT INTO fiscal_years (
    organization_id,
    name,
    code,
    start_date,
    end_date,
    status,
    is_current,
    created_by
  ) VALUES (
    p_organization_id,
    'Exercice ' || v_current_year,
    'EX' || v_current_year,
    (v_current_year || '-01-01')::DATE,
    (v_current_year || '-12-31')::DATE,
    'open',
    true,
    p_user_id
  )
  ON CONFLICT (organization_id, code) DO NOTHING
  RETURNING id INTO v_fiscal_year_id;

  RETURN v_fiscal_year_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_morocco_campaign(
  p_organization_id UUID,
  p_user_id UUID,
  p_start_year INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_campaign_id UUID;
  v_start_year INTEGER := COALESCE(p_start_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  v_end_year INTEGER := v_start_year + 1;
BEGIN
  INSERT INTO agricultural_campaigns (
    organization_id,
    name,
    code,
    description,
    start_date,
    end_date,
    campaign_type,
    status,
    is_current,
    created_by
  ) VALUES (
    p_organization_id,
    'Campagne Agricole ' || v_start_year || '/' || v_end_year,
    'CA' || v_start_year || '-' || RIGHT(v_end_year::TEXT, 2),
    'Campagne agricole marocaine du ' || v_start_year || ' au ' || v_end_year,
    (v_start_year || '-09-01')::DATE,
    (v_end_year || '-08-31')::DATE,
    'general',
    CASE
      WHEN CURRENT_DATE BETWEEN (v_start_year || '-09-01')::DATE AND (v_end_year || '-08-31')::DATE
      THEN 'active'
      ELSE 'planned'
    END,
    CURRENT_DATE BETWEEN (v_start_year || '-09-01')::DATE AND (v_end_year || '-08-31')::DATE,
    p_user_id
  )
  ON CONFLICT (organization_id, code) DO NOTHING
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- 13. UPDATE TRIGGERS FOR UPDATED_AT
DROP TRIGGER IF EXISTS trg_fiscal_years_updated_at ON fiscal_years;
CREATE TRIGGER trg_fiscal_years_updated_at
  BEFORE UPDATE ON fiscal_years
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_fiscal_periods_updated_at ON fiscal_periods;
CREATE TRIGGER trg_fiscal_periods_updated_at
  BEFORE UPDATE ON fiscal_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON agricultural_campaigns;
CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON agricultural_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crop_cycles_updated_at ON crop_cycles;
CREATE TRIGGER trg_crop_cycles_updated_at
  BEFORE UPDATE ON crop_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_biological_assets_updated_at ON biological_assets;
CREATE TRIGGER trg_biological_assets_updated_at
  BEFORE UPDATE ON biological_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE fiscal_years IS 'Legal/tax fiscal years with organization-specific configuration';
COMMENT ON TABLE fiscal_periods IS 'Sub-periods within fiscal years (monthly or quarterly)';
COMMENT ON TABLE agricultural_campaigns IS 'Agricultural production campaigns (Campagne Agricole) that may span calendar years';
COMMENT ON TABLE crop_cycles IS 'Production cycles from land preparation to sale, with full cost/revenue attribution';
COMMENT ON TABLE biological_assets IS 'Perennial biological assets (orchards, livestock) per IAS 41';
COMMENT ON TABLE biological_asset_valuations IS 'Fair value tracking for biological assets per IAS 41';
COMMENT ON TABLE crop_cycle_allocations IS 'Partial cost/revenue allocation to crop cycles for shared resources';

-- =====================================================
-- USER PROFILES COMPLETED TOURS (from 20251231_add_completed_tours.sql)
-- =====================================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS completed_tours text[] DEFAULT '{}';

COMMENT ON COLUMN user_profiles.completed_tours IS 'Array of completed tour IDs (welcome, dashboard, farm-management, parcels, tasks, workers, inventory, accounting, satellite, reports)';

-- =====================================================
-- ORGANIZATION ACCOUNT MAPPINGS (from 20251231_organization_account_mappings.sql)
-- =====================================================

-- Add new columns to account_mappings
ALTER TABLE account_mappings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE account_mappings
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

ALTER TABLE account_mappings
  ADD COLUMN IF NOT EXISTS source_key VARCHAR(100);

ALTER TABLE account_mappings
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE account_mappings
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE account_mappings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for organization queries
CREATE INDEX IF NOT EXISTS idx_account_mappings_org
  ON account_mappings(organization_id);

CREATE INDEX IF NOT EXISTS idx_account_mappings_org_type
  ON account_mappings(organization_id, mapping_type);

CREATE INDEX IF NOT EXISTS idx_account_mappings_org_lookup
  ON account_mappings(organization_id, mapping_type, mapping_key)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_mappings_account
  ON account_mappings(account_id)
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_mappings_active
  ON account_mappings(organization_id, is_active)
  WHERE organization_id IS NOT NULL;

-- Create a unique index for organization-level mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_mappings_org_unique
  ON account_mappings(organization_id, mapping_type, mapping_key)
  WHERE organization_id IS NOT NULL;

-- Enable RLS and create policies
ALTER TABLE account_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_account_mappings" ON account_mappings;
CREATE POLICY "read_account_mappings" ON account_mappings
  FOR SELECT USING (
    organization_id IS NULL
    OR
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "insert_account_mappings" ON account_mappings;
CREATE POLICY "insert_account_mappings" ON account_mappings
  FOR INSERT WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = account_mappings.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

DROP POLICY IF EXISTS "update_account_mappings" ON account_mappings;
CREATE POLICY "update_account_mappings" ON account_mappings
  FOR UPDATE USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = account_mappings.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

DROP POLICY IF EXISTS "delete_account_mappings" ON account_mappings;
CREATE POLICY "delete_account_mappings" ON account_mappings
  FOR DELETE USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = account_mappings.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

-- Helper functions for account mappings
CREATE OR REPLACE FUNCTION get_account_mapping(
  p_organization_id UUID,
  p_mapping_type VARCHAR,
  p_mapping_key VARCHAR
) RETURNS TABLE (
  id UUID,
  account_id UUID,
  account_code VARCHAR,
  description TEXT,
  is_org_specific BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id,
    am.account_id,
    COALESCE(am.account_code, a.code) AS account_code,
    am.description,
    TRUE AS is_org_specific
  FROM account_mappings am
  LEFT JOIN accounts a ON a.id = am.account_id
  WHERE am.organization_id = p_organization_id
    AND am.mapping_type = p_mapping_type
    AND (am.mapping_key = p_mapping_key OR am.source_key = p_mapping_key)
    AND am.is_active = TRUE
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    am.id,
    NULL::UUID AS account_id,
    am.account_code,
    am.description,
    FALSE AS is_org_specific
  FROM account_mappings am
  JOIN organizations o ON o.id = p_organization_id
  WHERE am.organization_id IS NULL
    AND am.country_code = o.country_code
    AND am.mapping_type = p_mapping_type
    AND am.mapping_key = p_mapping_key
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION initialize_org_account_mappings(
  p_organization_id UUID,
  p_country_code VARCHAR DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_country_code VARCHAR;
  v_count INTEGER := 0;
  v_mapping RECORD;
  v_account_id UUID;
BEGIN
  IF p_country_code IS NULL THEN
    SELECT country_code INTO v_country_code
    FROM organizations
    WHERE id = p_organization_id;
  ELSE
    v_country_code := p_country_code;
  END IF;

  IF EXISTS (
    SELECT 1 FROM account_mappings
    WHERE organization_id = p_organization_id
    LIMIT 1
  ) THEN
    RETURN 0;
  END IF;

  FOR v_mapping IN
    SELECT am.*, at.account_code AS template_account_code
    FROM account_mappings am
    LEFT JOIN account_templates at ON at.country_code = am.country_code
      AND at.accounting_standard = am.accounting_standard
      AND at.account_code = am.account_code
    WHERE am.organization_id IS NULL
      AND am.country_code = v_country_code
  LOOP
    SELECT id INTO v_account_id
    FROM accounts
    WHERE organization_id = p_organization_id
      AND code = v_mapping.account_code
    LIMIT 1;

    INSERT INTO account_mappings (
      organization_id,
      mapping_type,
      mapping_key,
      source_key,
      account_id,
      account_code,
      description,
      is_active,
      metadata
    ) VALUES (
      p_organization_id,
      v_mapping.mapping_type,
      v_mapping.mapping_key,
      v_mapping.mapping_key,
      v_account_id,
      v_mapping.account_code,
      v_mapping.description,
      TRUE,
      '{}'::JSONB
    )
    ON CONFLICT (organization_id, mapping_type, mapping_key)
    WHERE organization_id IS NOT NULL
    DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_task_cost_mappings(
  p_organization_id UUID,
  p_country_code VARCHAR DEFAULT 'MA'
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_expense_account_id UUID;
BEGIN
  SELECT id INTO v_expense_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND (code LIKE '6%' OR code LIKE '60%' OR code LIKE '61%')
    AND is_active = TRUE
  ORDER BY code
  LIMIT 1;

  IF v_expense_account_id IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO account_mappings (
    organization_id, mapping_type, mapping_key, source_key, account_id, description, is_active
  ) VALUES
    (p_organization_id, 'cost_type', 'planting', 'planting', v_expense_account_id, 'Planting costs', TRUE),
    (p_organization_id, 'cost_type', 'harvesting', 'harvesting', v_expense_account_id, 'Harvesting costs', TRUE),
    (p_organization_id, 'cost_type', 'irrigation', 'irrigation', v_expense_account_id, 'Irrigation costs', TRUE),
    (p_organization_id, 'cost_type', 'fertilization', 'fertilization', v_expense_account_id, 'Fertilization costs', TRUE),
    (p_organization_id, 'cost_type', 'pesticide', 'pesticide', v_expense_account_id, 'Pesticide application costs', TRUE),
    (p_organization_id, 'cost_type', 'pruning', 'pruning', v_expense_account_id, 'Pruning costs', TRUE),
    (p_organization_id, 'cost_type', 'maintenance', 'maintenance', v_expense_account_id, 'Maintenance costs', TRUE),
    (p_organization_id, 'cost_type', 'transport', 'transport', v_expense_account_id, 'Transport costs', TRUE),
    (p_organization_id, 'cost_type', 'labor', 'labor', v_expense_account_id, 'Labor costs', TRUE),
    (p_organization_id, 'cost_type', 'materials', 'materials', v_expense_account_id, 'Materials costs', TRUE),
    (p_organization_id, 'cost_type', 'other', 'other', v_expense_account_id, 'Other costs', TRUE)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_harvest_sales_mappings(
  p_organization_id UUID,
  p_country_code VARCHAR DEFAULT 'MA'
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_revenue_account_id UUID;
  v_cash_account_id UUID;
BEGIN
  SELECT id INTO v_revenue_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND (code LIKE '7%' OR code LIKE '70%' OR code LIKE '71%')
    AND is_active = TRUE
  ORDER BY code
  LIMIT 1;

  SELECT id INTO v_cash_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND (code LIKE '5%' OR code LIKE '51%' OR code LIKE '52%')
    AND is_active = TRUE
  ORDER BY code
  LIMIT 1;

  IF v_revenue_account_id IS NOT NULL THEN
    INSERT INTO account_mappings (
      organization_id, mapping_type, mapping_key, source_key, account_id, description, is_active
    ) VALUES
      (p_organization_id, 'revenue_type', 'product_sales', 'product_sales', v_revenue_account_id, 'Product sales revenue', TRUE),
      (p_organization_id, 'revenue_type', 'service_income', 'service_income', v_revenue_account_id, 'Service income', TRUE),
      (p_organization_id, 'revenue_type', 'other_income', 'other_income', v_revenue_account_id, 'Other income', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_revenue_account_id IS NOT NULL THEN
    INSERT INTO account_mappings (
      organization_id, mapping_type, mapping_key, source_key, account_id, description, is_active
    ) VALUES
      (p_organization_id, 'harvest_sale', 'market', 'market', v_revenue_account_id, 'Market sales', TRUE),
      (p_organization_id, 'harvest_sale', 'export', 'export', v_revenue_account_id, 'Export sales', TRUE),
      (p_organization_id, 'harvest_sale', 'wholesale', 'wholesale', v_revenue_account_id, 'Wholesale sales', TRUE),
      (p_organization_id, 'harvest_sale', 'direct', 'direct', v_revenue_account_id, 'Direct sales', TRUE),
      (p_organization_id, 'harvest_sale', 'processing', 'processing', v_revenue_account_id, 'Processing sales', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_cash_account_id IS NOT NULL THEN
    INSERT INTO account_mappings (
      organization_id, mapping_type, mapping_key, source_key, account_id, description, is_active
    ) VALUES
      (p_organization_id, 'cash', 'bank', 'bank', v_cash_account_id, 'Bank account', TRUE),
      (p_organization_id, 'cash', 'cash', 'cash', v_cash_account_id, 'Cash account', TRUE),
      (p_organization_id, 'cash', 'petty_cash', 'petty_cash', v_cash_account_id, 'Petty cash', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_account_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_account_mappings_updated_at ON account_mappings;
CREATE TRIGGER trg_account_mappings_updated_at
  BEFORE UPDATE ON account_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_account_mappings_updated_at();

COMMENT ON COLUMN account_mappings.organization_id IS 'NULL for global templates, set for org-specific mappings';
COMMENT ON COLUMN account_mappings.account_id IS 'FK to accounts table for validated org-level mappings';
COMMENT ON COLUMN account_mappings.source_key IS 'Alias for mapping_key, used by frontend';
COMMENT ON COLUMN account_mappings.is_active IS 'Toggle to enable/disable mapping without deleting';
COMMENT ON COLUMN account_mappings.metadata IS 'Flexible JSON storage for additional mapping attributes';

COMMENT ON FUNCTION get_account_mapping IS 'Get account mapping for org, falling back to global template';
COMMENT ON FUNCTION initialize_org_account_mappings IS 'Copy global template mappings to organization';
COMMENT ON FUNCTION create_task_cost_mappings IS 'Create default task cost type mappings for organization';
COMMENT ON FUNCTION create_harvest_sales_mappings IS 'Create default revenue and cash mappings for organization';

-- =====================================================
-- ORGANIZATION AI SETTINGS (from 20251231_organization_ai_settings.sql)
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_org_ai_settings_org_id ON organization_ai_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_ai_settings_provider ON organization_ai_settings(provider);

ALTER TABLE organization_ai_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "org_ai_settings_select" ON organization_ai_settings
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "org_ai_settings_insert" ON organization_ai_settings
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "org_ai_settings_update" ON organization_ai_settings
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "org_ai_settings_delete" ON organization_ai_settings
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON organization_ai_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_ai_settings TO service_role;

COMMENT ON TABLE organization_ai_settings IS 'Stores encrypted API keys for AI providers (OpenAI, Gemini) per organization';
COMMENT ON COLUMN organization_ai_settings.encrypted_api_key IS 'API key encrypted with AES-256-GCM. Never expose this directly to clients.';

-- =====================================================
-- END OF MERGED MIGRATIONS
-- =====================================================
