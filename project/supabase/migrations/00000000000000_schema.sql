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
    'submitted',    -- Legacy value (kept for compatibility)
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
-- Add 'sent' value to existing enum if not present (idempotent)
DO $$ BEGIN
  ALTER TYPE quote_status ADD VALUE IF NOT EXISTS 'sent';
EXCEPTION WHEN others THEN null;
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
    'per_unit',
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
  country_code VARCHAR(2), -- ISO 3166-1 alpha-2 country code (MA, FR, US, GB, DE, etc.)
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  tax_id VARCHAR(100),
  currency_code VARCHAR(3) DEFAULT 'MAD',
  timezone VARCHAR(50) DEFAULT 'Africa/Casablanca',
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  account_type VARCHAR(20) DEFAULT 'business' CHECK (account_type IN ('individual', 'business', 'farm')),
  accounting_standard VARCHAR(50), -- Primary accounting standard (CGNC=Morocco, PCG=France, US_GAAP=USA, FRS102=UK, HGB=Germany)
  accounting_settings JSONB DEFAULT '{}'::jsonb, -- Country-specific accounting configurations stored as JSONB
  fiscal_year_start_month INTEGER DEFAULT 1, -- Month when fiscal year starts (1=January, 4=April for UK, etc.)
  map_provider TEXT DEFAULT NULL, -- Map provider preference (e.g., 'google', 'mapbox', 'openstreetmap')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_country_code ON organizations(country_code);
CREATE INDEX IF NOT EXISTS idx_organizations_accounting_standard ON organizations(accounting_standard);

-- Organization Users
CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID, -- FK to roles table added later (roles table defined after this)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_users_org ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user ON organization_users(user_id);
-- Composite index for OrganizationGuard: called on every authenticated request
CREATE INDEX IF NOT EXISTS idx_organization_users_membership ON organization_users(user_id, organization_id) WHERE is_active = true;

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
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_current_step VARCHAR(50) DEFAULT 'welcome',
  onboarding_state JSONB,
  completed_tours TEXT[] DEFAULT '{}',
  dismissed_tours TEXT[] DEFAULT '{}',
  password_set BOOLEAN DEFAULT false,
  dark_mode BOOLEAN DEFAULT false,
  experience_level VARCHAR(20) DEFAULT 'basic',
  dismissed_hints TEXT[] DEFAULT '{}',
  feature_usage JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "alerts": true, "reports": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN user_profiles.completed_tours IS 'Array of completed tour IDs (welcome, dashboard, farm-management, parcels, tasks, workers, inventory, accounting, satellite, reports)';
COMMENT ON COLUMN user_profiles.dismissed_tours IS 'Array of permanently dismissed tour IDs. Tours in this array will never auto-start even if not completed.';

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
  -- Subscription limits
  max_farms INT DEFAULT 2,
  max_parcels INT DEFAULT 25,
  max_users INT DEFAULT 5,
  max_satellite_reports INT DEFAULT 100,
  -- Billing
  billing_interval VARCHAR(20) DEFAULT 'monthly',
  billing_cycle VARCHAR(20),
  formula VARCHAR(30),
  contracted_hectares NUMERIC(12,2),
  included_users INTEGER,
  -- Pricing
  price_ht_per_ha_year NUMERIC(12,2),
  vat_rate NUMERIC(5,4) DEFAULT 0.20,
  amount_ht NUMERIC(14,2),
  amount_tva NUMERIC(14,2),
  amount_ttc NUMERIC(14,2),
  currency VARCHAR(10) DEFAULT 'MAD',
  -- Contract dates
  contract_start_at TIMESTAMPTZ,
  contract_end_at TIMESTAMPTZ,
  renewal_notice_days INTEGER DEFAULT 60,
  payment_terms_days INTEGER DEFAULT 30,
  next_billing_at TIMESTAMPTZ,
  grace_period_ends_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  -- Pending plan changes
  pending_formula VARCHAR(30),
  pending_billing_cycle VARCHAR(20),
  pending_pricing_snapshot JSONB,
  migration_effective_at TIMESTAMPTZ,
  -- Payment enforcement
  last_payment_notice_at TIMESTAMPTZ,
  overdue_grace_days INTEGER DEFAULT 30,
  suspension_notice_days INTEGER DEFAULT 7,
  export_window_days INTEGER DEFAULT 30,
  late_penalty_rate NUMERIC(8,6) DEFAULT 0.10,
  fixed_recovery_fee NUMERIC(12,2) DEFAULT 40.00,
  -- Modular pricing (advisor model)
  selected_modules JSONB DEFAULT '[]',
  ha_pricing_mode VARCHAR(20) DEFAULT 'progressive',
  discount_pct NUMERIC(5,2) DEFAULT 10,
  size_multiplier NUMERIC(5,2) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT subscriptions_formula_check
    CHECK (formula IS NULL OR formula IN ('starter', 'standard', 'premium', 'enterprise')),
  CONSTRAINT subscriptions_billing_cycle_check
    CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'semiannual', 'annual')),
  CONSTRAINT subscriptions_pending_formula_check
    CHECK (pending_formula IS NULL OR pending_formula IN ('starter', 'standard', 'premium', 'enterprise')),
  CONSTRAINT subscriptions_pending_billing_cycle_check
    CHECK (pending_billing_cycle IS NULL OR pending_billing_cycle IN ('monthly', 'semiannual', 'annual'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_formula ON subscriptions(formula);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_cycle ON subscriptions(billing_cycle);
CREATE INDEX IF NOT EXISTS idx_subscriptions_contract_end ON subscriptions(contract_end_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);

-- Notifications (In-app real-time notifications for users)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_org ON notifications(user_id, organization_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access" ON notifications;
CREATE POLICY "Service role has full access"
  ON notifications
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE notifications IS 'In-app real-time notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification type: task_assigned, order_status_changed, quote_received, etc.';
COMMENT ON COLUMN notifications.data IS 'Additional context data (task_id, order_id, etc.) as JSONB';

-- Modules (Application modules that can be enabled/disabled per organization)
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  category VARCHAR(50),
  description TEXT,
  required_plan VARCHAR(50), -- null = free, 'essential', 'professional', 'enterprise'
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  template_version VARCHAR(20) DEFAULT '1.0.0',
  source VARCHAR(50) DEFAULT 'system',
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Modules (which modules are active for each organization)
CREATE TABLE IF NOT EXISTS organization_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
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
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  location_point GEOMETRY(Point, 4326),
  boundary_polygon GEOMETRY(Polygon, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farms_org ON farms(organization_id);
CREATE INDEX IF NOT EXISTS idx_farms_location ON farms USING GIST(location_point) WHERE location_point IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_farms_boundary ON farms USING GIST(boundary_polygon) WHERE boundary_polygon IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_farms_org ON farms(organization_id);

-- Parcels
CREATE TABLE IF NOT EXISTS parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  centroid GEOMETRY(Point, 4326),
  boundary_geom GEOMETRY(Polygon, 4326),
  -- AI calibration columns
  ai_enabled BOOLEAN DEFAULT false,
  ai_phase TEXT DEFAULT 'awaiting_data' CHECK (ai_phase IN ('awaiting_data', 'ready_calibration', 'calibrating', 'calibrated', 'awaiting_nutrition_option', 'active', 'archived')),
  ai_calibration_id UUID,
  ai_nutrition_option TEXT DEFAULT 'A',
  ai_production_target TEXT,
  -- Water and language
  water_source TEXT,
  langue TEXT DEFAULT 'fr',
  -- Observation-only mode (confidence < 25%)
  ai_observation_only BOOLEAN NOT NULL DEFAULT false,
  -- Annual recalibration trigger settings
  annual_trigger_config JSONB DEFAULT '{}'::jsonb,
  -- Monitoring operational columns
  last_satellite_check TIMESTAMPTZ,
  last_weather_check TIMESTAMPTZ,
  current_bbch TEXT,
  current_gdd_cumulative REAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcels_farm ON parcels(farm_id);
CREATE INDEX IF NOT EXISTS idx_parcels_organization ON parcels(organization_id);
CREATE INDEX IF NOT EXISTS idx_parcels_centroid ON parcels USING GIST(centroid) WHERE centroid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcels_boundary_geom ON parcels USING GIST(boundary_geom) WHERE boundary_geom IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcels_crop_type ON parcels(crop_type) WHERE crop_type IS NOT NULL;

-- Composite unique constraint for AI table foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parcels_id_organization_id_key'
      AND conrelid = 'public.parcels'::regclass
  ) THEN
    ALTER TABLE public.parcels
      ADD CONSTRAINT parcels_id_organization_id_key UNIQUE (id, organization_id);
  END IF;
END $$;

COMMENT ON COLUMN parcels.water_source IS 'Water source key: well, dam, canal, municipal, mixed, other';
COMMENT ON COLUMN parcels.langue IS 'Report language key: fr, ar, ber';
COMMENT ON COLUMN parcels.ai_observation_only IS 'When true, parcel is in observation-only mode (confidence < 25%). Diagnostics are computed as hypotheses but no alerts or recommendations are generated.';
COMMENT ON COLUMN parcels.annual_trigger_config IS 'Per-parcel annual recalibration trigger settings (month/day threshold, snooze settings, custom rules)';

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
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  template_version VARCHAR(20) DEFAULT '1.0.0',
  source VARCHAR(50) DEFAULT 'system'
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
  accounting_standard VARCHAR(50) NOT NULL,  -- PCG, CGNC, PCN, GAAP, FRS102
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
  template_version VARCHAR(20) DEFAULT '1.0.0',
  source VARCHAR(50) DEFAULT 'system',
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
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
  account_id UUID,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Organization-specific mappings override defaults
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  hierarchy_level INTEGER DEFAULT 2,
  effective_date DATE,
  expiry_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  source_key VARCHAR(100),
  template_version VARCHAR(20) DEFAULT '1.0.0',
  source VARCHAR(50) DEFAULT 'system',
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_mappings_lookup ON account_mappings(country_code, accounting_standard, mapping_type, mapping_key);
CREATE INDEX IF NOT EXISTS idx_account_mappings_org ON account_mappings(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_mappings_org_type ON account_mappings(organization_id, mapping_type);
CREATE INDEX IF NOT EXISTS idx_account_mappings_account ON account_mappings(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_mappings_active ON account_mappings(organization_id, is_active) WHERE organization_id IS NOT NULL;

-- Create a unique index for organization-level mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_mappings_org_unique
  ON account_mappings(organization_id, mapping_type, mapping_key)
  WHERE organization_id IS NOT NULL;

COMMENT ON TABLE account_mappings IS 'Maps generic business operations to country-specific account codes for automatic journal entry creation';

-- =====================================================
-- SEED ACCOUNT TEMPLATES FOR ALL COUNTRIES
-- =====================================================

-- Morocco (CGNC - Plan Comptable des Établissements de Crédit adapted for agriculture)
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order, description) VALUES
  -- Class 1: Financement permanent
  ('MA', 'CGNC', 'Financement permanent', '1', 'Financement permanent', 'equity', true, 10, 'Permanent financing'),
  ('MA', 'CGNC', 'Capital social', '111', 'Capital social', 'equity', false, 11, 'Share capital'),
  ('MA', 'CGNC', 'Réserves', '112', 'Réserves', 'equity', false, 12, 'Reserves'),
  ('MA', 'CGNC', 'Report à nouveau', '116', 'Report à nouveau', 'equity', false, 13, 'Retained earnings'),

  -- Class 2: Actif immobilisé
  ('MA', 'CGNC', 'Actif immobilisé', '2', 'Actif immobilisé', 'asset', true, 20, 'Fixed assets'),
  ('MA', 'CGNC', 'Terrains', '231', 'Terrains', 'asset', false, 21, 'Land'),
  ('MA', 'CGNC', 'Constructions', '232', 'Constructions', 'asset', false, 22, 'Buildings'),
  ('MA', 'CGNC', 'Matériel et outillage agricole', '233', 'Matériel et outillage agricole', 'asset', false, 23, 'Agricultural equipment and tools'),
  ('MA', 'CGNC', 'Autres immobilisations corporelles', '238', 'Autres immobilisations corporelles', 'asset', false, 24, 'Other tangible fixed assets'),

  -- Class 3: Actif circulant
  ('MA', 'CGNC', 'Actif circulant', '3', 'Actif circulant', 'asset', true, 30, 'Current assets'),
  ('MA', 'CGNC', 'Stocks de matières premières', '311', 'Stocks de matières premières', 'asset', false, 31, 'Raw materials inventory'),
  ('MA', 'CGNC', 'Stocks de produits en cours', '313', 'Stocks de produits en cours', 'asset', false, 32, 'Work in progress inventory'),
  ('MA', 'CGNC', 'Stocks de produits finis', '315', 'Stocks de produits finis', 'asset', false, 33, 'Finished goods inventory'),
  ('MA', 'CGNC', 'Clients et comptes rattachés', '342', 'Clients et comptes rattachés', 'asset', false, 34, 'Accounts receivable'),

  -- Class 4: Passif circulant
  ('MA', 'CGNC', 'Passif circulant', '4', 'Passif circulant', 'liability', true, 40, 'Current liabilities'),
  ('MA', 'CGNC', 'Fournisseurs et comptes rattachés', '441', 'Fournisseurs et comptes rattachés', 'liability', false, 41, 'Accounts payable'),
  ('MA', 'CGNC', 'Organismes sociaux', '443', 'Organismes sociaux', 'liability', false, 42, 'Social security'),
  ('MA', 'CGNC', 'État - Impôts et taxes', '445', 'État - Impôts et taxes', 'liability', false, 43, 'State - Taxes'),

  -- Class 5: Trésorerie
  ('MA', 'CGNC', 'Trésorerie', '5', 'Trésorerie', 'asset', true, 50, 'Cash and cash equivalents'),
  ('MA', 'CGNC', 'Caisse', '511', 'Caisse', 'asset', false, 51, 'Cash'),
  ('MA', 'CGNC', 'Banques', '514', 'Banques', 'asset', false, 52, 'Banks'),

  -- Class 6: Charges
  ('MA', 'CGNC', 'Charges', '6', 'Charges', 'expense', true, 60, 'Expenses'),
  ('MA', 'CGNC', 'Achats de matières premières', '611', 'Achats de matières premières', 'expense', false, 61, 'Purchases of raw materials'),
  ('MA', 'CGNC', 'Achats de fournitures', '612', 'Achats de fournitures', 'expense', false, 62, 'Purchases of supplies'),
  ('MA', 'CGNC', 'Achats de produits agricoles', '613', 'Achats de produits agricoles', 'expense', false, 63, 'Purchases of agricultural products'),
  ('MA', 'CGNC', 'Achats de matériel et outillage', '617', 'Achats de matériel et outillage', 'expense', false, 64, 'Purchases of equipment and tools'),
  ('MA', 'CGNC', 'Autres achats', '618', 'Autres achats', 'expense', false, 65, 'Other purchases'),
  ('MA', 'CGNC', 'Charges de personnel', '621', 'Charges de personnel', 'expense', false, 66, 'Staff costs'),
  ('MA', 'CGNC', 'Cotisations sociales', '622', 'Cotisations sociales', 'expense', false, 67, 'Social security contributions'),
  ('MA', 'CGNC', 'Impôts et taxes', '631', 'Impôts et taxes', 'expense', false, 68, 'Taxes'),
  ('MA', 'CGNC', 'Charges d''intérêts', '641', 'Charges d''intérêts', 'expense', false, 69, 'Interest charges'),

  -- Class 7: Produits
  ('MA', 'CGNC', 'Produits', '7', 'Produits', 'revenue', true, 70, 'Revenue'),
  ('MA', 'CGNC', 'Ventes de produits agricoles', '711', 'Ventes de produits agricoles', 'revenue', false, 71, 'Sales of agricultural products'),
  ('MA', 'CGNC', 'Ventes de produits transformés', '712', 'Ventes de produits transformés', 'revenue', false, 72, 'Sales of processed products'),
  ('MA', 'CGNC', 'Prestations de services', '713', 'Prestations de services', 'revenue', false, 73, 'Services'),
  ('MA', 'CGNC', 'Autres produits d''exploitation', '718', 'Autres produits d''exploitation', 'revenue', false, 74, 'Other operating income'),
  ('MA', 'CGNC', 'Subventions d''exploitation', '751', 'Subventions d''exploitation', 'revenue', false, 75, 'Operating subsidies')
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

-- Morocco (CGNC) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('MA', 'CGNC', 'cost_type', 'labor', '621', 'Labor costs mapped to Personnel costs'),
  ('MA', 'CGNC', 'cost_type', 'materials', '611', 'Materials mapped to Raw materials purchases'),
  ('MA', 'CGNC', 'cost_type', 'utilities', '612', 'Utilities mapped to Supplies purchases'),
  ('MA', 'CGNC', 'cost_type', 'equipment', '617', 'Equipment mapped to Equipment purchases'),
  ('MA', 'CGNC', 'cost_type', 'product_application', '612', 'Product application mapped to Supplies'),
  ('MA', 'CGNC', 'cost_type', 'other', '618', 'Other costs mapped to Other purchases'),
  ('MA', 'CGNC', 'revenue_type', 'harvest', '711', 'Harvest revenue mapped to Agricultural product sales'),
  ('MA', 'CGNC', 'revenue_type', 'subsidy', '751', 'Subsidy mapped to Operating subsidies'),
  ('MA', 'CGNC', 'revenue_type', 'metayage', '711', 'Metayage (sharecropping) revenue mapped to Agricultural product sales'),
  ('MA', 'CGNC', 'revenue_type', 'other', '718', 'Other revenue mapped to Other operating income'),
  ('MA', 'CGNC', 'cash', 'bank', '5141', 'Bank account (Banque - Compte courant)'),
  ('MA', 'CGNC', 'cash', 'cash', '5161', 'Cash account (Caisse principale)'),
  ('MA', 'CGNC', 'receivable', 'trade', '3420', 'Trade receivables (Clients)'),
  ('MA', 'CGNC', 'payable', 'trade', '4410', 'Trade payables (Fournisseurs)'),
  ('MA', 'CGNC', 'tax', 'collected', '4457', 'TVA collectée'),
  ('MA', 'CGNC', 'tax', 'deductible', '4456', 'TVA déductible'),
  ('MA', 'CGNC', 'revenue', 'default', '7111', 'Default revenue account (Ventes fruits et légumes)'),
  ('MA', 'CGNC', 'expense', 'default', '6111', 'Default expense account (Achats engrais)')
ON CONFLICT DO NOTHING;

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
  ('TN', 'PCN', 'revenue_type', 'metayage', '701', 'Metayage (sharecropping) revenue mapped to Finished product sales'),
  ('TN', 'PCN', 'revenue_type', 'other', '708', 'Other revenue mapped to Other revenue'),
  ('TN', 'PCN', 'cash', 'bank', '52', 'Bank account (Banques)'),
  ('TN', 'PCN', 'cash', 'cash', '511', 'Cash account (Caisse)'),
  ('TN', 'PCN', 'receivable', 'trade', '411', 'Trade receivables (Clients)'),
  ('TN', 'PCN', 'payable', 'trade', '401', 'Trade payables (Fournisseurs)'),
  ('TN', 'PCN', 'tax', 'collected', '431', 'TVA à payer'),
  ('TN', 'PCN', 'tax', 'deductible', '431', 'TVA déductible (à configurer manuellement)'),
  ('TN', 'PCN', 'revenue', 'default', '701', 'Default revenue account (Ventes de céréales)'),
  ('TN', 'PCN', 'expense', 'default', '601', 'Default expense account (Achats de matières premières)')
ON CONFLICT DO NOTHING;

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
  ('US', 'GAAP', 'revenue_type', 'metayage', '4000', 'Metayage (sharecropping) revenue mapped to Agricultural product sales'),
  ('US', 'GAAP', 'revenue_type', 'other', '4900', 'Other revenue mapped to Other Revenue'),
  ('US', 'GAAP', 'cash', 'bank', '1000', 'Cash and Cash Equivalents'),
  ('US', 'GAAP', 'cash', 'cash', '1000', 'Cash and Cash Equivalents'),
  ('US', 'GAAP', 'receivable', 'trade', '1200', 'Accounts Receivable'),
  ('US', 'GAAP', 'payable', 'trade', '2110', 'Trade Payables'),
  ('US', 'GAAP', 'tax', 'collected', '2250', 'Sales Tax Payable'),
  ('US', 'GAAP', 'tax', 'deductible', '2200', 'Taxes Payable (input tax)'),
  ('US', 'GAAP', 'revenue', 'default', '4100', 'Default revenue account (Crop Sales)'),
  ('US', 'GAAP', 'expense', 'default', '5100', 'Default expense account (Cost of Goods Sold)')
ON CONFLICT DO NOTHING;

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
  ('GB', 'FRS102', 'revenue_type', 'metayage', '5000', 'Metayage (sharecropping) revenue mapped to Agricultural product sales'),
  ('GB', 'FRS102', 'revenue_type', 'other', '5200', 'Other revenue mapped to Other Income'),
  ('GB', 'FRS102', 'cash', 'bank', '232', 'Cash at Bank'),
  ('GB', 'FRS102', 'cash', 'cash', '231', 'Cash in Hand'),
  ('GB', 'FRS102', 'receivable', 'trade', '220', 'Trade Receivables'),
  ('GB', 'FRS102', 'payable', 'trade', '360', 'Trade and Other Payables'),
  ('GB', 'FRS102', 'tax', 'collected', '363', 'VAT Payable'),
  ('GB', 'FRS102', 'tax', 'deductible', '224', 'Other Receivables (input VAT)'),
  ('GB', 'FRS102', 'revenue', 'default', '511', 'Default revenue account (Agricultural Sales)'),
  ('GB', 'FRS102', 'expense', 'default', '610', 'Default expense account (Raw Materials and Consumables)')
ON CONFLICT DO NOTHING;

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
  ('FR', 'PCG', 'revenue_type', 'metayage', '701', 'Metayage (sharecropping) revenue mapped to Finished product sales'),
  ('FR', 'PCG', 'revenue_type', 'other', '708', 'Other revenue mapped to Ancillary activities products'),
  ('FR', 'PCG', 'cash', 'bank', '512', 'Banks'),
  ('FR', 'PCG', 'cash', 'cash', '531', 'Cash'),
  ('FR', 'PCG', 'receivable', 'trade', '411', 'Trade receivables (Clients)'),
  ('FR', 'PCG', 'payable', 'trade', '401', 'Trade payables (Fournisseurs)'),
  ('FR', 'PCG', 'tax', 'collected', '4437', 'TVA collectée'),
  ('FR', 'PCG', 'tax', 'deductible', '4456', 'TVA déductible'),
  ('FR', 'PCG', 'revenue', 'default', '701', 'Default revenue account (Ventes de produits agricoles)'),
  ('FR', 'PCG', 'expense', 'default', '601', 'Default expense account (Achats de semences et plants)')
ON CONFLICT DO NOTHING;

-- Germany (HGB) Mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('DE', 'HGB', 'cost_type', 'labor', '6400', 'Labor costs mapped to Personnel costs'),
  ('DE', 'HGB', 'cost_type', 'materials', '6100', 'Materials mapped to Cost of Materials'),
  ('DE', 'HGB', 'cost_type', 'utilities', '6300', 'Utilities mapped to Energy costs'),
  ('DE', 'HGB', 'cost_type', 'equipment', '6500', 'Equipment mapped to Maintenance costs'),
  ('DE', 'HGB', 'cost_type', 'product_application', '6100', 'Product application mapped to Cost of Materials'),
  ('DE', 'HGB', 'cost_type', 'other', '6900', 'Other costs mapped to Other operating expenses'),
  ('DE', 'HGB', 'revenue_type', 'harvest', '5100', 'Harvest revenue mapped to Agricultural Sales'),
  ('DE', 'HGB', 'revenue_type', 'subsidy', '5600', 'Subsidy mapped to Government subsidies'),
  ('DE', 'HGB', 'revenue_type', 'metayage', '5100', 'Metayage (sharecropping) revenue mapped to Agricultural Sales'),
  ('DE', 'HGB', 'revenue_type', 'other', '5900', 'Other revenue mapped to Other income'),
  ('DE', 'HGB', 'cash', 'bank', '1200', 'Bank accounts'),
  ('DE', 'HGB', 'cash', 'cash', '1000', 'Cash account (Kasse)'),
  ('DE', 'HGB', 'receivable', 'trade', '1400', 'Trade receivables (Forderungen aus Lieferungen und Leistungen)'),
  ('DE', 'HGB', 'payable', 'trade', '3100', 'Trade payables (Verbindlichkeiten aus Lieferungen und Leistungen)'),
  ('DE', 'HGB', 'tax', 'collected', '3301', 'Umsatzsteuer (VAT Payable)'),
  ('DE', 'HGB', 'tax', 'deductible', '3300', 'Vorsteuer (Input VAT) - to be configured'),
  ('DE', 'HGB', 'revenue', 'default', '5100', 'Default revenue account (Agricultural Sales)'),
  ('DE', 'HGB', 'expense', 'default', '6100', 'Default expense account (Cost of Materials)')
ON CONFLICT DO NOTHING;

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
  status sales_order_status DEFAULT 'draft',
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
  status purchase_order_status DEFAULT 'draft',
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
  parent_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL, -- For hierarchical cost centers
  crop_cycle_id UUID,
  annual_budget DECIMAL(15,2) DEFAULT 0,
  budget_currency VARCHAR(3) DEFAULT 'MAD',
  budget_fiscal_year INTEGER,
  fiscal_year_id UUID,
  default_expense_account_id UUID,
  default_revenue_account_id UUID,
  budget_variance_threshold DECIMAL(5,2) DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_org ON cost_centers(organization_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent ON cost_centers(parent_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_crop_cycle ON cost_centers(crop_cycle_id);

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
  is_default_chart BOOLEAN DEFAULT false, -- Indicates if account is part of the default chart template for the country
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

-- Add foreign key constraints for tables that reference accounts table
DO $$
BEGIN
  -- account_mappings foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_account_mappings_account_id'
    AND conrelid = 'account_mappings'::regclass
  ) THEN
    ALTER TABLE account_mappings
    ADD CONSTRAINT fk_account_mappings_account_id
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;

  -- cost_centers foreign keys to accounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_cost_centers_default_expense_account_id'
    AND conrelid = 'cost_centers'::regclass
  ) THEN
    ALTER TABLE cost_centers
    ADD CONSTRAINT fk_cost_centers_default_expense_account_id
    FOREIGN KEY (default_expense_account_id) REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_cost_centers_default_revenue_account_id'
    AND conrelid = 'cost_centers'::regclass
  ) THEN
    ALTER TABLE cost_centers
    ADD CONSTRAINT fk_cost_centers_default_revenue_account_id
    FOREIGN KEY (default_revenue_account_id) REFERENCES accounts(id) ON DELETE SET NULL;
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
  crop_cycle_id UUID,
  campaign_id UUID,
  fiscal_year_id UUID,
  fiscal_period_id UUID,
  biological_asset_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_items_entry ON journal_items(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_account ON journal_items(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_cost_center ON journal_items(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_crop_cycle ON journal_items(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_campaign ON journal_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_fiscal_year ON journal_items(fiscal_year_id);

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
  item_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invoice_id, line_number),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON invoice_items(item_id);

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
  per_unit_rate NUMERIC(10, 2),
  metayage_type metayage_type,
  metayage_percentage NUMERIC(5, 2),
  calculation_basis calculation_basis DEFAULT 'net_revenue',
  metayage_contract_details JSONB,
  specialties TEXT[],
  certifications TEXT[],
  payment_frequency payment_frequency,
  payment_frequencies TEXT[],
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
  deleted_at TIMESTAMPTZ,
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
  template_version VARCHAR(20) DEFAULT '1.0.0',
  source VARCHAR(50) DEFAULT 'system',
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_work_units_org ON work_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_units_category ON work_units(unit_category);
CREATE INDEX IF NOT EXISTS idx_work_units_code ON work_units(code);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  planned_items JSONB DEFAULT NULL,
  notes TEXT,
  -- Work Unit Payment fields (for piece-work tracking)
  payment_type TEXT DEFAULT NULL,
  work_unit_id UUID REFERENCES work_units(id) ON DELETE SET NULL,
  units_required NUMERIC,
  units_completed NUMERIC DEFAULT 0,
  rate_per_unit NUMERIC,
  forfait_amount NUMERIC,
  crop_cycle_id UUID,
  campaign_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
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
CREATE INDEX IF NOT EXISTS idx_tasks_crop_cycle ON tasks(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_tasks_campaign ON tasks(campaign_id);

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
  payment_included_in_salary BOOLEAN DEFAULT false,
  bonus_amount NUMERIC(10, 2),
  is_active BOOLEAN DEFAULT true,
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
  is_active BOOLEAN DEFAULT true,
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

-- Explicit FK to user_profiles so PostgREST can resolve the join
ALTER TABLE task_comments
  ADD CONSTRAINT task_comments_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Task Time Logs
CREATE TABLE IF NOT EXISTS task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  break_duration INTEGER DEFAULT 0,
  total_hours NUMERIC DEFAULT 0, -- computed in service layer
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
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  -- Piece work / per-unit fields
  units_completed NUMERIC,
  unit_type TEXT,
  rate_per_unit NUMERIC,
  work_unit_id UUID REFERENCES work_units(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  payment_included_in_salary BOOLEAN DEFAULT false,
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
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  harvest_date DATE,
  gross_revenue NUMERIC NOT NULL,
  total_charges NUMERIC DEFAULT 0,
  net_revenue NUMERIC DEFAULT 0, -- computed in service layer; CHECK allows negative (legitimate loss)
  CHECK (net_revenue IS NOT NULL),
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
  net_amount NUMERIC DEFAULT 0,
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

-- Payment Summary View
CREATE OR REPLACE VIEW payment_summary WITH (security_invoker = true) AS
SELECT
  pr.id,
  pr.organization_id,
  pr.farm_id,
  pr.worker_id,
  w.first_name,
  w.last_name,
  w.cin,
  w.phone,
  w.email,
  w.worker_type,
  w.position,
  w.daily_rate,
  w.monthly_salary,
  w.metayage_type,
  w.metayage_percentage AS worker_metayage_percentage,
  pr.payment_type,
  pr.period_start,
  pr.period_end,
  pr.base_amount,
  pr.bonuses,
  pr.deductions,
  pr.overtime_amount,
  pr.advance_deduction,
  pr.net_amount,
  pr.days_worked,
  pr.hours_worked,
  pr.tasks_completed,
  pr.harvest_amount,
  pr.gross_revenue,
  pr.total_charges,
  pr.metayage_percentage,
  pr.status,
  pr.payment_method,
  pr.payment_date,
  pr.payment_reference,
  pr.calculated_by,
  pr.calculated_at,
  pr.approved_by,
  pr.approved_at,
  pr.paid_by,
  pr.paid_at,
  pr.notes,
  pr.attachments,
  pr.created_at,
  pr.updated_at
FROM payment_records pr
INNER JOIN workers w ON w.id = pr.worker_id;

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
  workers JSONB DEFAULT '[]'::jsonb,
  supervisor_id UUID REFERENCES workers(id),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  storage_location TEXT,
  temperature NUMERIC,
  humidity NUMERIC,
  intended_for TEXT,
  expected_price_per_unit NUMERIC,
  estimated_revenue NUMERIC DEFAULT 0,
  photos JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'stored',
  notes TEXT,
  lot_number TEXT, -- Unique lot number for traceability (e.g., P1FM1-0012025)
  is_partial BOOLEAN DEFAULT false, -- Whether this is a partial harvest record
  crop_cycle_id UUID,
  campaign_id UUID,
  created_by UUID REFERENCES auth.users(id),
  reception_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
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
CREATE INDEX IF NOT EXISTS idx_harvest_records_crop_cycle ON harvest_records(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_harvest_records_campaign ON harvest_records(campaign_id);

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
  alert_type TEXT NOT NULL CHECK (alert_type IN ('yield_underperformance', 'forecast_variance', 'quality_issue', 'cost_overrun', 'revenue_shortfall', 'benchmark_deviation', 'ai_drought_stress', 'ai_frost_risk', 'ai_heat_stress', 'ai_pest_risk', 'ai_nutrient_deficiency', 'ai_yield_warning', 'ai_phenology_alert', 'ai_salinity_alert')),
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
  -- AI alert columns
  alert_code TEXT,
  category TEXT,
  priority INTEGER DEFAULT 3,
  entry_threshold NUMERIC,
  exit_threshold NUMERIC,
  trigger_data JSONB,
  satellite_reading_id UUID,
  is_ai_generated BOOLEAN DEFAULT false,
  action_delay INTEGER DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_performance_alerts_is_ai_generated ON public.performance_alerts(is_ai_generated);

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
  photos JSONB DEFAULT '[]'::jsonb,
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
  total_amount NUMERIC DEFAULT 0, -- computed in service layer
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

-- ====================================================================
-- PRODUCT VARIANTS SUPPORT
-- ====================================================================
-- Product variants for multi-dimension products (same product, different sizes)

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL, -- e.g., "1L", "5L", "10kg", "25kg"
  variant_sku TEXT, -- Unique SKU for the variant
  quantity NUMERIC DEFAULT 0, -- Current stock quantity for this variant
  unit_id UUID REFERENCES work_units(id) ON DELETE SET NULL, -- Reference to work_units table
  base_quantity NUMERIC DEFAULT 1 CHECK (base_quantity > 0 AND base_quantity < 10000), -- Quantity in item default unit
  min_stock_level NUMERIC DEFAULT 0,
  standard_rate NUMERIC, -- Sales price per unit
  last_purchase_rate NUMERIC,
  barcode TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure variant_name is unique per item
  CONSTRAINT product_variants_unique_name UNIQUE (organization_id, item_id, variant_name)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_org ON product_variants(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_item ON product_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(variant_sku) WHERE variant_sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_unit_id ON product_variants(unit_id);

COMMENT ON TABLE product_variants IS 'Product variants for items with multiple sizes/dimensions (e.g., 1L bottle vs 5L bottle of same product)';
COMMENT ON COLUMN product_variants.variant_name IS 'Variant designation (e.g., "1L", "5L", "10kg", "25kg")';
COMMENT ON COLUMN product_variants.unit_id IS 'Reference to work_units table for unit of measure';
COMMENT ON COLUMN product_variants.variant_sku IS 'Unique SKU code for this specific variant';
COMMENT ON COLUMN product_variants.quantity IS 'Current stock quantity for this variant';
COMMENT ON COLUMN product_variants.min_stock_level IS 'Minimum stock level before low stock alert';

CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_variants_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW
EXECUTE FUNCTION update_product_variants_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON product_variants TO authenticated;

-- Add foreign key constraint to invoice_items (deferred because items table is created after invoice_items)
ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_item_id FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL;

-- =====================================================
-- PRODUCT APPLICATIONS (Historical tracking)
-- Migration: 20260204004522_create_product_applications.sql
-- Moved here because it references items(id)
-- =====================================================

CREATE TABLE IF NOT EXISTS product_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  application_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantity_used NUMERIC NOT NULL CHECK (quantity_used > 0),
  area_treated NUMERIC NOT NULL CHECK (area_treated > 0),
  cost NUMERIC CHECK (cost >= 0),
  currency TEXT DEFAULT 'MAD',
  notes TEXT,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  images TEXT[] DEFAULT NULL,
  ai_recommendation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT product_applications_area_positive CHECK (area_treated > 0)
);

CREATE INDEX IF NOT EXISTS idx_product_applications_org ON product_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_applications_farm ON product_applications(farm_id);
CREATE INDEX IF NOT EXISTS idx_product_applications_parcel ON product_applications(parcel_id);
CREATE INDEX IF NOT EXISTS idx_product_applications_product ON product_applications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_applications_date ON product_applications(application_date DESC);
CREATE INDEX IF NOT EXISTS idx_product_applications_task ON product_applications(task_id);
CREATE INDEX IF NOT EXISTS idx_product_applications_org_parcel_date
  ON product_applications(organization_id, parcel_id, application_date DESC);

CREATE TRIGGER update_product_applications_updated_at
  BEFORE UPDATE ON product_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE product_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_applications_select_org
  ON product_applications FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY product_applications_insert_org
  ON product_applications FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY product_applications_update_org
  ON product_applications FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY product_applications_delete_org
  ON product_applications FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

COMMENT ON TABLE product_applications IS 'Historical record of product applications on parcels (fertilizers, pesticides, etc.)';
COMMENT ON COLUMN product_applications.parcel_id IS 'Optional: links to specific parcel. NULL if application was for entire farm';
COMMENT ON COLUMN product_applications.task_id IS 'Optional: links to task if application was planned. Enables "planned vs actual" reporting';
COMMENT ON COLUMN product_applications.area_treated IS 'Area in hectares that was treated with this product';
COMMENT ON COLUMN product_applications.quantity_used IS 'Quantity of product applied (in item unit)';
COMMENT ON COLUMN product_applications.cost IS 'Optional: cost of application. Can be entered manually or calculated from item cost';

CREATE OR REPLACE VIEW v_parcel_applications WITH (security_invoker = true) AS
SELECT
  pa.id,
  pa.organization_id,
  pa.farm_id,
  pa.parcel_id,
  pa.product_id,
  pa.application_date,
  pa.quantity_used,
  pa.area_treated,
  pa.cost,
  pa.currency,
  pa.notes,
  pa.task_id,
  pa.created_at,
  pa.updated_at,
  i.item_name AS product_name,
  i.default_unit AS product_unit,
  f.name AS farm_name,
  p.name AS parcel_name
FROM product_applications pa
JOIN items i ON i.id = pa.product_id
JOIN farms f ON f.id = pa.farm_id
LEFT JOIN parcels p ON p.id = pa.parcel_id;

COMMENT ON VIEW v_parcel_applications IS 'Denormalized view of product applications with related names for easy querying';

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
  crop_cycle_id UUID,
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
CREATE INDEX IF NOT EXISTS idx_stock_entries_crop_cycle ON stock_entries(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_org_crop_cycle ON stock_entries(organization_id, crop_cycle_id);

COMMENT ON COLUMN stock_entries.crop_cycle_id IS 'Links the stock entry to a specific crop cycle for cost tracking and allocation';

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
  total_cost NUMERIC DEFAULT 0, -- computed in service layer
  system_quantity NUMERIC,
  physical_quantity NUMERIC,
  variance NUMERIC DEFAULT 0, -- computed in service layer
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
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
  marketplace_listing_id UUID,
  marketplace_order_item_id UUID,
  base_quantity_at_movement NUMERIC,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  crop_cycle_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CHECK (movement_type IN ('IN', 'OUT', 'TRANSFER'))
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_marketplace_listing ON stock_movements(marketplace_listing_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_marketplace_order_item ON stock_movements(marketplace_order_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_crop_cycle ON stock_movements(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_crop_cycle ON stock_movements(organization_id, crop_cycle_id);

COMMENT ON COLUMN stock_movements.crop_cycle_id IS 'Links the stock movement to a specific crop cycle for cost tracking and allocation';

-- =====================================================
-- STOCK MOVEMENT TRIGGERS AND FUNCTIONS
-- Migration: 20260204005536_add_base_quantity_tracking_to_stock_movements.sql
-- Migration: 20260204005635_add_stock_movement_unit_validation.sql
-- =====================================================

-- Create trigger function to capture base_quantity_at_movement on insert
-- This captures the base_quantity value at the time of movement creation
-- ensuring historical reports don't change when base_quantity is updated
CREATE OR REPLACE FUNCTION capture_base_quantity_at_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Capture the current base_quantity from the variant
  SELECT base_quantity INTO NEW.base_quantity_at_movement
  FROM product_variants
  WHERE id = NEW.variant_id;

  -- If no variant found or base_quantity is null, default to 1
  IF NEW.base_quantity_at_movement IS NULL THEN
    NEW.base_quantity_at_movement := 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate base_quantity_at_movement on INSERT
DROP TRIGGER IF EXISTS trg_capture_base_quantity_at_movement ON stock_movements;
CREATE TRIGGER trg_capture_base_quantity_at_movement
  BEFORE INSERT ON stock_movements
  FOR EACH ROW
  WHEN (NEW.variant_id IS NOT NULL)
  EXECUTE FUNCTION capture_base_quantity_at_movement();

COMMENT ON FUNCTION capture_base_quantity_at_movement() IS 'Automatically captures the base_quantity from product_variants at movement creation time for historical accuracy.';

-- Create trigger function for unit validation
-- This prevents users from manually entering incorrect units that would corrupt consumption data
CREATE OR REPLACE FUNCTION validate_stock_movement_unit()
RETURNS TRIGGER AS $$
DECLARE
  expected_unit TEXT;
BEGIN
  -- Only validate if variant_id is provided
  IF NEW.variant_id IS NOT NULL THEN
    -- Get the expected unit from the variant
    SELECT wu.code INTO expected_unit
    FROM product_variants pv
    JOIN work_units wu ON pv.unit_id = wu.id
    WHERE pv.id = NEW.variant_id;

    -- Validate that the unit matches
    IF expected_unit IS NOT NULL AND NEW.unit != expected_unit THEN
      RAISE EXCEPTION 'Unit "%" does not match variant unit "%". Variant ID: %',
        NEW.unit, expected_unit, NEW.variant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for unit validation
DROP TRIGGER IF EXISTS trg_validate_stock_movement_unit ON stock_movements;
CREATE TRIGGER trg_validate_stock_movement_unit
  BEFORE INSERT OR UPDATE OF unit, variant_id ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION validate_stock_movement_unit();

COMMENT ON FUNCTION validate_stock_movement_unit() IS 'Validates that stock_movements.unit matches the variant''s unit from work_units with detailed error messaging';

-- Stock Valuation
CREATE TABLE IF NOT EXISTS stock_valuation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  cost_per_unit NUMERIC NOT NULL,
  total_cost NUMERIC DEFAULT 0, -- computed in service layer
  valuation_date TIMESTAMPTZ DEFAULT NOW(),
  stock_entry_id UUID REFERENCES stock_entries(id),
  batch_number TEXT,
  serial_number TEXT,
  remaining_quantity NUMERIC DEFAULT 0,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (quantity > 0),
  CHECK (remaining_quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_valuation_org ON stock_valuation(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_valuation_item ON stock_valuation(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_valuation_warehouse ON stock_valuation(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_valuation_variant ON stock_valuation(variant_id) WHERE variant_id IS NOT NULL;

-- Opening Stock Balances
CREATE TABLE IF NOT EXISTS opening_stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  opening_date DATE NOT NULL,
  quantity NUMERIC NOT NULL,
  valuation_rate NUMERIC NOT NULL,
  total_value NUMERIC DEFAULT 0, -- computed in service layer
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
  closing_value NUMERIC DEFAULT 0, -- computed in service layer
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
  photos JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
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
  metadata JSONB DEFAULT '{}'::jsonb,
  -- AI baseline tracking columns
  baseline_position TEXT,
  is_significant_deviation BOOLEAN DEFAULT false,
  trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'declining')),
  trend_duration_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (index_name IN ('NDVI', 'NDRE', 'NDMI', 'MNDWI', 'GCI', 'SAVI', 'OSAVI', 'MSAVI2', 'NIRv', 'EVI', 'MSI', 'MCARI', 'TCARI'))
);

CREATE INDEX IF NOT EXISTS idx_satellite_indices_data_org ON satellite_indices_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_satellite_indices_data_parcel ON satellite_indices_data(parcel_id);
CREATE INDEX IF NOT EXISTS idx_satellite_indices_data_date ON satellite_indices_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_satellite_indices_data_index ON satellite_indices_data(index_name);

-- Unique constraint to prevent duplicate entries for same parcel/date/index
CREATE UNIQUE INDEX IF NOT EXISTS idx_satellite_indices_data_unique
  ON satellite_indices_data(parcel_id, date, index_name);

-- Daily PAR cache (for NIRvP index computation)
CREATE TABLE IF NOT EXISTS satellite_par_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude NUMERIC(9, 4) NOT NULL,
  longitude NUMERIC(9, 4) NOT NULL,
  date DATE NOT NULL,
  par_value NUMERIC(12, 4) NOT NULL,
  source TEXT DEFAULT 'open-meteo-archive',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (latitude, longitude, date)
);

CREATE INDEX IF NOT EXISTS idx_satellite_par_data_date ON satellite_par_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_satellite_par_data_location ON satellite_par_data(latitude, longitude);

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
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  analysis_type analysis_type NOT NULL,
  analysis_date DATE NOT NULL,
  laboratory TEXT,
  data JSONB DEFAULT '{}'::jsonb,
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
  action_items JSONB DEFAULT '[]'::jsonb,
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
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parcel Reports
CREATE TABLE IF NOT EXISTS parcel_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  module_slug VARCHAR(100), -- Associated module slug for this crop type
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_crop_types_org ON crop_types(organization_id);

-- Enrich crop_types with agronomic data
DO $$ BEGIN
  ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS scientific_name TEXT;
  ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS family TEXT;
  ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS tbase NUMERIC(4, 1);
  ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS frost_threshold NUMERIC(4, 1);
  ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS heat_threshold NUMERIC(4, 1);
  ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS chill_hours_min INTEGER;
  ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS chill_hours_max INTEGER;
  ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
END $$;

-- Crop Categories
CREATE TABLE IF NOT EXISTS crop_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES crop_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
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
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crop_varieties_category ON crop_varieties(category_id);

-- Enrich crop_varieties with agronomic data
DO $$ BEGIN
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS yield_potential_low NUMERIC(8, 2);
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS yield_potential_high NUMERIC(8, 2);
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS alternance_tendency TEXT;
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS frost_tolerance TEXT;
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS chill_hours_requirement INTEGER;
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS gdd_to_harvest INTEGER;
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS flower_type TEXT;
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS pollination_requirements TEXT;
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS oil_content_percent NUMERIC(4, 1);
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS use_type TEXT;
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS origin_country TEXT;
  ALTER TABLE crop_varieties ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
END $$;

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
  is_active BOOLEAN DEFAULT true,
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
  is_active BOOLEAN DEFAULT true,
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
  is_active BOOLEAN DEFAULT true,
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
  is_active BOOLEAN DEFAULT true,
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
  is_active BOOLEAN DEFAULT true,
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
  is_active BOOLEAN DEFAULT true,
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
  is_active BOOLEAN DEFAULT true,
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
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_plantation_systems_org ON plantation_systems(organization_id);

-- Enrich plantation_systems with agronomic data
DO $$ BEGIN
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS system_type TEXT;
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS trees_per_hectare_min INTEGER;
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS trees_per_hectare_max INTEGER;
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS row_spacing_m NUMERIC(4, 1);
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS tree_spacing_m NUMERIC(4, 1);
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS canopy_coverage_percent NUMERIC(4, 1);
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS expected_ndvi_min NUMERIC(4, 3);
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS expected_ndvi_max NUMERIC(4, 3);
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS expected_nirv_min NUMERIC(4, 3);
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS expected_nirv_max NUMERIC(4, 3);
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS crop_type_name TEXT;
  ALTER TABLE plantation_systems ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
END $$;

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
  is_active BOOLEAN DEFAULT true,
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
  crop_cycle_id UUID,
  campaign_id UUID,
  fiscal_year_id UUID,
  fiscal_period_id UUID,
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
CREATE INDEX IF NOT EXISTS idx_costs_crop_cycle ON costs(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_costs_campaign ON costs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_costs_fiscal_year ON costs(fiscal_year_id);

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
  crop_cycle_id UUID,
  campaign_id UUID,
  fiscal_year_id UUID,
  fiscal_period_id UUID,
  harvest_record_id UUID REFERENCES harvest_records(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_revenues_crop_cycle ON revenues(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_revenues_campaign ON revenues(campaign_id);
CREATE INDEX IF NOT EXISTS idx_revenues_fiscal_year ON revenues(fiscal_year_id);

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
  location JSONB DEFAULT '{"lat": 0, "lng": 0}'::jsonb,
  geom GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint((location->>'lng')::NUMERIC, (location->>'lat')::NUMERIC), 4326)) STORED,
  installation_date DATE NOT NULL,
  condition TEXT DEFAULT 'good',
  usage TEXT,
  structure_details JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (type IN ('stable', 'technical_room', 'basin', 'well')),
  CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),
  CHECK (location ? 'lat' AND location ? 'lng')
);

CREATE INDEX IF NOT EXISTS idx_structures_org ON structures(organization_id);
CREATE INDEX IF NOT EXISTS idx_structures_farm ON structures(farm_id);
CREATE INDEX IF NOT EXISTS idx_structures_geom ON structures USING GIST(geom) WHERE geom IS NOT NULL;

-- Utilities
CREATE TABLE IF NOT EXISTS utilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  template_version VARCHAR(20) DEFAULT '1.0.0',
  source VARCHAR(50) DEFAULT 'system',
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
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
  permissions JSONB DEFAULT '{}'::jsonb,
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

-- Add foreign key constraint from organization_users.role_id to roles
-- (role_id column is defined in the table, FK added here after roles table is created)
ALTER TABLE organization_users
  ADD CONSTRAINT organization_users_role_id_fkey
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;

-- Add index for the role_id column
CREATE INDEX IF NOT EXISTS idx_organization_users_role ON organization_users(role_id);

-- Add FK from organization_users.user_id to user_profiles.id
-- (both reference auth.users(id); this explicit FK lets Supabase PostgREST resolve the join)
ALTER TABLE organization_users
  ADD CONSTRAINT organization_users_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

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
-- NOTE: audit_logs table is defined later in the improvements section (line 13270)

-- Financial Transactions (legacy)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
  layout JSONB DEFAULT '{"topRow": ["soil", "climate", "irrigation", "maintenance"], "bottomRow": ["alerts", "tasks"], "middleRow": ["production", "financial"]}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (layout ? 'topRow' AND layout ? 'bottomRow' AND layout ? 'middleRow')
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
  mrr NUMERIC(12,2),
  arr NUMERIC(12,2),
  modules_enabled TEXT[],
  last_calculated_at TIMESTAMPTZ,
  churn_risk_score INTEGER,
  last_activity_at TIMESTAMPTZ,
  storage_used_mb NUMERIC(12,2) DEFAULT 0,
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
ALTER TABLE work_units ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE item_groups ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE IF EXISTS satellite_par_data ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE product_applications ENABLE ROW LEVEL SECURITY;
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
-- audit_logs RLS is enabled after table creation (line 13270+)
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

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
-- XX. METEOROLOGICAL DATA TABLES
-- =====================================================

-- Weather daily data: location-based weather cache (NOT org-scoped, shared geographically like satellite_par_data)
CREATE TABLE IF NOT EXISTS weather_daily_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude NUMERIC(7, 2) NOT NULL,    -- ~1km grid (same as PAR cache)
  longitude NUMERIC(7, 2) NOT NULL,
  date DATE NOT NULL,
  -- Raw weather variables from Open-Meteo
  temperature_min NUMERIC(5, 1),       -- °C
  temperature_max NUMERIC(5, 1),       -- °C
  temperature_mean NUMERIC(5, 1),      -- °C
  relative_humidity_mean NUMERIC(5, 1), -- %
  relative_humidity_max NUMERIC(5, 1),
  relative_humidity_min NUMERIC(5, 1),
  precipitation_sum NUMERIC(7, 2),     -- mm
  wind_speed_max NUMERIC(5, 1),        -- km/h
  wind_gusts_max NUMERIC(5, 1),        -- km/h
  shortwave_radiation_sum NUMERIC(8, 2), -- MJ/m²
  et0_fao_evapotranspiration NUMERIC(6, 2), -- mm (pre-calculated ET₀ from Open-Meteo)
  soil_temperature_0_7cm NUMERIC(5, 1),  -- °C
  soil_temperature_7_28cm NUMERIC(5, 1), -- °C
  soil_moisture_0_7cm NUMERIC(6, 4),     -- m³/m³
  soil_moisture_7_28cm NUMERIC(6, 4),    -- m³/m³
  source TEXT DEFAULT 'open-meteo-archive',
  -- GDD columns per crop type
  gdd_olivier NUMERIC,
  gdd_agrumes NUMERIC,
  gdd_avocatier NUMERIC,
  gdd_palmier_dattier NUMERIC,
  chill_hours NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (latitude, longitude, date)
);
CREATE INDEX IF NOT EXISTS idx_weather_daily_data_lat_lon_date
  ON public.weather_daily_data(latitude, longitude, date);
CREATE INDEX IF NOT EXISTS idx_weather_daily_data_date ON weather_daily_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_weather_daily_data_location ON weather_daily_data(latitude, longitude);

-- Weather derived data: per-parcel derived meteorological variables (ORG-scoped via parcel -> farm -> org)
CREATE TABLE IF NOT EXISTS weather_derived_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  gdd_daily NUMERIC(6, 2),
  gdd_cumulative NUMERIC(8, 2),
  gdd_base_temp NUMERIC(4, 1),
  chill_hours_daily NUMERIC(5, 1),
  chill_hours_cumulative NUMERIC(7, 1),
  frost_risk BOOLEAN DEFAULT false,
  heat_stress BOOLEAN DEFAULT false,
  water_balance NUMERIC(7, 2),
  kc_used NUMERIC(4, 2),
  phenological_stage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parcel_id, date)
);
CREATE INDEX IF NOT EXISTS idx_weather_derived_data_org ON weather_derived_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_weather_derived_data_parcel ON weather_derived_data(parcel_id);
CREATE INDEX IF NOT EXISTS idx_weather_derived_data_date ON weather_derived_data(date DESC);

-- Weather forecasts: location-based forecast cache (NOT org-scoped)
CREATE TABLE IF NOT EXISTS weather_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude NUMERIC(7, 2) NOT NULL,
  longitude NUMERIC(7, 2) NOT NULL,
  forecast_date DATE NOT NULL,
  target_date DATE NOT NULL,
  temperature_min NUMERIC(5, 1),
  temperature_max NUMERIC(5, 1),
  temperature_mean NUMERIC(5, 1),
  relative_humidity_mean NUMERIC(5, 1),
  precipitation_sum NUMERIC(7, 2),
  wind_speed_max NUMERIC(5, 1),
  et0_fao_evapotranspiration NUMERIC(6, 2),
  source TEXT DEFAULT 'open-meteo-forecast',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (latitude, longitude, forecast_date, target_date)
);
CREATE INDEX IF NOT EXISTS idx_weather_forecasts_location ON weather_forecasts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_forecasts_target ON weather_forecasts(target_date);

-- RLS: weather_daily_data and weather_forecasts are location caches (NO RLS, like satellite_par_data)
-- RLS: weather_derived_data is org-scoped
ALTER TABLE IF EXISTS weather_derived_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_weather_derived_data" ON weather_derived_data;
CREATE POLICY "org_read_weather_derived_data" ON weather_derived_data
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_weather_derived_data" ON weather_derived_data;
CREATE POLICY "org_write_weather_derived_data" ON weather_derived_data
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_weather_derived_data" ON weather_derived_data;
CREATE POLICY "org_update_weather_derived_data" ON weather_derived_data
  FOR UPDATE USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_weather_derived_data" ON weather_derived_data;
CREATE POLICY "org_delete_weather_derived_data" ON weather_derived_data
  FOR DELETE USING (is_organization_member(organization_id));

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_weather_daily_data_updated_at ON weather_daily_data;
CREATE TRIGGER trg_weather_daily_data_updated_at
  BEFORE UPDATE ON weather_daily_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_weather_derived_data_updated_at ON weather_derived_data;
CREATE TRIGGER trg_weather_derived_data_updated_at
  BEFORE UPDATE ON weather_derived_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_weather_forecasts_updated_at ON weather_forecasts;
CREATE TRIGGER trg_weather_forecasts_updated_at
  BEFORE UPDATE ON weather_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- XX. CROP AGRONOMIC REFERENTIAL TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS phenological_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_name TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  stage_name_fr TEXT,
  stage_name_ar TEXT,
  bbch_code TEXT,
  stage_order INTEGER NOT NULL,
  gdd_threshold_min NUMERIC(7, 1),
  gdd_threshold_max NUMERIC(7, 1),
  typical_month_start INTEGER,
  typical_month_end INTEGER,
  satellite_signal_description TEXT,
  ndvi_expected_min NUMERIC(4, 3),
  ndvi_expected_max NUMERIC(4, 3),
  description TEXT,
  description_fr TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crop_type_name, stage_order)
);
CREATE INDEX IF NOT EXISTS idx_phenological_stages_crop ON phenological_stages(crop_type_name);
CREATE INDEX IF NOT EXISTS idx_phenological_stages_bbch ON phenological_stages(bbch_code);

CREATE TABLE IF NOT EXISTS crop_kc_coefficients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_name TEXT NOT NULL,
  phenological_stage_name TEXT NOT NULL,
  kc_value NUMERIC(4, 2) NOT NULL,
  kc_min NUMERIC(4, 2),
  kc_max NUMERIC(4, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crop_type_name, phenological_stage_name)
);
CREATE INDEX IF NOT EXISTS idx_crop_kc_crop ON crop_kc_coefficients(crop_type_name);

CREATE TABLE IF NOT EXISTS crop_mineral_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_name TEXT NOT NULL,
  product_type TEXT DEFAULT 'fruit',
  n_kg_per_ton NUMERIC(6, 2),
  p2o5_kg_per_ton NUMERIC(6, 2),
  k2o_kg_per_ton NUMERIC(6, 2),
  cao_kg_per_ton NUMERIC(6, 2),
  mgo_kg_per_ton NUMERIC(6, 2),
  fe_g_per_ton NUMERIC(6, 2),
  zn_g_per_ton NUMERIC(6, 2),
  b_g_per_ton NUMERIC(6, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crop_type_name, product_type)
);
CREATE INDEX IF NOT EXISTS idx_crop_mineral_exports_crop ON crop_mineral_exports(crop_type_name);

CREATE TABLE IF NOT EXISTS crop_diseases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_name TEXT NOT NULL,
  disease_name TEXT NOT NULL,
  disease_name_fr TEXT,
  disease_name_ar TEXT,
  pathogen_name TEXT,
  disease_type TEXT,
  temperature_min NUMERIC(4, 1),
  temperature_max NUMERIC(4, 1),
  humidity_threshold NUMERIC(4, 1),
  moisture_condition TEXT,
  season TEXT,
  treatment_product TEXT,
  treatment_dose TEXT,
  treatment_method TEXT,
  treatment_timing TEXT,
  days_after_treatment INTEGER,
  satellite_signal TEXT,
  severity TEXT,
  description TEXT,
  description_fr TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crop_type_name, disease_name)
);
CREATE INDEX IF NOT EXISTS idx_crop_diseases_crop ON crop_diseases(crop_type_name);
CREATE INDEX IF NOT EXISTS idx_crop_diseases_type ON crop_diseases(disease_type);

CREATE TABLE IF NOT EXISTS crop_index_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type_name TEXT NOT NULL,
  plantation_system_type TEXT,
  index_name TEXT NOT NULL,
  healthy_min NUMERIC(5, 3),
  healthy_max NUMERIC(5, 3),
  stress_low NUMERIC(5, 3),
  stress_high NUMERIC(5, 3),
  critical_low NUMERIC(5, 3),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crop_index_thresholds_unique
  ON crop_index_thresholds(crop_type_name, COALESCE(plantation_system_type, ''), index_name);
CREATE INDEX IF NOT EXISTS idx_crop_index_thresholds_crop ON crop_index_thresholds(crop_type_name);
CREATE INDEX IF NOT EXISTS idx_crop_index_thresholds_index ON crop_index_thresholds(index_name);

DROP TRIGGER IF EXISTS trg_phenological_stages_updated_at ON phenological_stages;
CREATE TRIGGER trg_phenological_stages_updated_at BEFORE UPDATE ON phenological_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crop_kc_coefficients_updated_at ON crop_kc_coefficients;
CREATE TRIGGER trg_crop_kc_coefficients_updated_at BEFORE UPDATE ON crop_kc_coefficients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crop_mineral_exports_updated_at ON crop_mineral_exports;
CREATE TRIGGER trg_crop_mineral_exports_updated_at BEFORE UPDATE ON crop_mineral_exports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crop_diseases_updated_at ON crop_diseases;
CREATE TRIGGER trg_crop_diseases_updated_at BEFORE UPDATE ON crop_diseases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crop_index_thresholds_updated_at ON crop_index_thresholds;
CREATE TRIGGER trg_crop_index_thresholds_updated_at BEFORE UPDATE ON crop_index_thresholds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed system crop types with agronomic data
DO $$
BEGIN
  INSERT INTO crop_types (name, name_fr, name_ar, scientific_name, family, tbase, frost_threshold, heat_threshold, chill_hours_min, chill_hours_max, is_system)
  SELECT * FROM (VALUES
    ('olive', 'Olivier', 'الزيتون', 'Olea europaea', 'Oleaceae', 7.5::numeric, -5.0::numeric, 40.0::numeric, 200, 1000, true),
    ('avocado', 'Avocatier', 'الأفوكادو', 'Persea americana', 'Lauraceae', 10.0, -1.0, 35.0, 100, 400, true),
    ('citrus', 'Agrumes', 'الحوامض', 'Citrus spp.', 'Rutaceae', 13.0, -3.0, 38.0, 100, 500, true),
    ('almond', 'Amandier', 'اللوز', 'Prunus dulcis', 'Rosaceae', 4.5, -2.0, 38.0, 400, 800, true),
    ('vine', 'Vigne', 'الكرمة', 'Vitis vinifera', 'Vitaceae', 10.0, -2.0, 40.0, 300, 700, true),
    ('pomegranate', 'Grenadier', 'الرمان', 'Punica granatum', 'Lythraceae', 10.0, -10.0, 42.0, 200, 500, true),
    ('fig', 'Figuier', 'التين', 'Ficus carica', 'Moraceae', 10.0, -8.0, 42.0, 100, 300, true),
    ('apple_pear', 'Pommier/Poirier', 'التفاح/الإجاص', 'Malus/Pyrus spp.', 'Rosaceae', 7.0, -2.0, 35.0, 500, 1200, true),
    ('stone_fruit', 'Fruits à noyau', 'الفواكه ذات النواة', 'Prunus spp.', 'Rosaceae', 7.0, -2.0, 38.0, 400, 1000, true),
    ('date_palm', 'Palmier dattier', 'النخيل', 'Phoenix dactylifera', 'Arecaceae', 18.0, -5.0, 50.0, 0, 0, true),
    ('walnut', 'Noyer', 'الجوز', 'Juglans regia', 'Juglandaceae', 7.0, -2.0, 38.0, 400, 1000, true)
  ) AS v(name, name_fr, name_ar, scientific_name, family, tbase, frost_threshold, heat_threshold, chill_hours_min, chill_hours_max, is_system)
  WHERE NOT EXISTS (
    SELECT 1 FROM crop_types WHERE crop_types.name = v.name AND crop_types.organization_id IS NULL
  );

  UPDATE crop_types SET scientific_name = 'Olea europaea', family = 'Oleaceae', tbase = 7.5, frost_threshold = -5.0, heat_threshold = 40.0, chill_hours_min = 200, chill_hours_max = 1000, is_system = true, name_fr = 'Olivier', name_ar = 'الزيتون' WHERE name = 'olive' AND organization_id IS NULL;
  UPDATE crop_types SET scientific_name = 'Persea americana', family = 'Lauraceae', tbase = 10.0, frost_threshold = -1.0, heat_threshold = 35.0, chill_hours_min = 100, chill_hours_max = 400, is_system = true, name_fr = 'Avocatier', name_ar = 'الأفوكادو' WHERE name = 'avocado' AND organization_id IS NULL;
  UPDATE crop_types SET scientific_name = 'Citrus spp.', family = 'Rutaceae', tbase = 13.0, frost_threshold = -3.0, heat_threshold = 38.0, chill_hours_min = 100, chill_hours_max = 500, is_system = true, name_fr = 'Agrumes', name_ar = 'الحوامض' WHERE name = 'citrus' AND organization_id IS NULL;
  UPDATE crop_types SET scientific_name = 'Prunus dulcis', family = 'Rosaceae', tbase = 4.5, frost_threshold = -2.0, heat_threshold = 38.0, chill_hours_min = 400, chill_hours_max = 800, is_system = true, name_fr = 'Amandier', name_ar = 'اللوز' WHERE name = 'almond' AND organization_id IS NULL;
  UPDATE crop_types SET scientific_name = 'Vitis vinifera', family = 'Vitaceae', tbase = 10.0, frost_threshold = -2.0, heat_threshold = 40.0, chill_hours_min = 300, chill_hours_max = 700, is_system = true, name_fr = 'Vigne', name_ar = 'الكرمة' WHERE name = 'vine' AND organization_id IS NULL;
  UPDATE crop_types SET scientific_name = 'Punica granatum', family = 'Lythraceae', tbase = 10.0, frost_threshold = -10.0, heat_threshold = 42.0, chill_hours_min = 200, chill_hours_max = 500, is_system = true, name_fr = 'Grenadier', name_ar = 'الرمان' WHERE name = 'pomegranate' AND organization_id IS NULL;
  UPDATE crop_types SET scientific_name = 'Ficus carica', family = 'Moraceae', tbase = 10.0, frost_threshold = -8.0, heat_threshold = 42.0, chill_hours_min = 100, chill_hours_max = 300, is_system = true, name_fr = 'Figuier', name_ar = 'التين' WHERE name = 'fig' AND organization_id IS NULL;
  UPDATE crop_types SET scientific_name = 'Malus/Pyrus spp.', family = 'Rosaceae', tbase = 7.0, frost_threshold = -2.0, heat_threshold = 35.0, chill_hours_min = 500, chill_hours_max = 1200, is_system = true, name_fr = 'Pommier/Poirier', name_ar = 'التفاح/الإجاص' WHERE name = 'apple_pear' AND organization_id IS NULL;
  UPDATE crop_types SET scientific_name = 'Prunus spp.', family = 'Rosaceae', tbase = 7.0, frost_threshold = -2.0, heat_threshold = 38.0, chill_hours_min = 400, chill_hours_max = 1000, is_system = true, name_fr = 'Fruits à noyau', name_ar = 'الفواكه ذات النواة' WHERE name = 'stone_fruit' AND organization_id IS NULL;
  UPDATE crop_types SET scientific_name = 'Phoenix dactylifera', family = 'Arecaceae', tbase = 18.0, frost_threshold = -5.0, heat_threshold = 50.0, chill_hours_min = 0, chill_hours_max = 0, is_system = true, name_fr = 'Palmier dattier', name_ar = 'النخيل' WHERE name = 'date_palm' AND organization_id IS NULL;
  UPDATE crop_types SET scientific_name = 'Juglans regia', family = 'Juglandaceae', tbase = 7.0, frost_threshold = -2.0, heat_threshold = 38.0, chill_hours_min = 400, chill_hours_max = 1000, is_system = true, name_fr = 'Noyer', name_ar = 'الجوز' WHERE name = 'walnut' AND organization_id IS NULL;
END $$;

-- Seed phenological stages
INSERT INTO phenological_stages (crop_type_name, stage_name, stage_name_fr, bbch_code, stage_order, gdd_threshold_min, gdd_threshold_max, typical_month_start, typical_month_end, description_fr)
VALUES
  ('olive', 'Dormancy', 'Repos végétatif', '00', 1, 0, 100, 1, 2, 'Période de dormance hivernale'),
  ('olive', 'Bud break', 'Débourrement', '08', 2, 100, 200, 2, 3, 'Éclatement des bourgeons'),
  ('olive', 'Shoot growth', 'Croissance végétative', '10', 3, 200, 400, 3, 4, 'Allongement des pousses'),
  ('olive', 'Inflorescence emergence', 'Apparition des inflorescences', '51', 4, 400, 600, 4, 5, 'Formation des grappes florales'),
  ('olive', 'Flowering', 'Floraison', '60', 5, 600, 800, 5, 6, 'Pleine floraison'),
  ('olive', 'Fruit set', 'Nouaison', '71', 6, 800, 1000, 6, 6, 'Formation des fruits'),
  ('olive', 'Fruit growth', 'Grossissement du fruit', '72', 7, 1000, 2000, 6, 9, 'Phase de croissance du fruit'),
  ('olive', 'Veraison/Lipogenesis', 'Véraison/Lipogenèse', '81', 8, 2000, 2500, 9, 10, 'Changement de couleur et accumulation huile'),
  ('olive', 'Maturation', 'Maturation', '86', 9, 2500, 3000, 10, 12, 'Maturation complète du fruit'),
  ('olive', 'Harvest', 'Récolte', '89', 10, 3000, NULL, 11, 1, 'Période de récolte'),
  ('avocado', 'Vegetative rest', 'Repos végétatif', '00', 1, 0, 100, 12, 1, 'Période de repos'),
  ('avocado', 'Bud break', 'Débourrement', '08', 2, 100, 300, 1, 2, 'Éclatement des bourgeons'),
  ('avocado', 'Flowering', 'Floraison', '60', 3, 300, 600, 2, 4, 'Pleine floraison (Type A ou B)'),
  ('avocado', 'Fruit set', 'Nouaison', '71', 4, 600, 900, 4, 5, 'Formation des fruits'),
  ('avocado', 'Fruit growth phase 1', 'Croissance fruit phase 1', '72', 5, 900, 1500, 5, 7, 'Division cellulaire rapide'),
  ('avocado', 'Fruit growth phase 2', 'Croissance fruit phase 2', '75', 6, 1500, 2200, 7, 9, 'Accumulation lipidique'),
  ('avocado', 'Maturation', 'Maturation', '86', 7, 2200, 2800, 9, 11, 'Maturation physiologique'),
  ('avocado', 'Harvest', 'Récolte', '89', 8, 2800, NULL, 11, 3, 'Période de récolte')
ON CONFLICT (crop_type_name, stage_order) DO UPDATE SET
  stage_name = EXCLUDED.stage_name,
  stage_name_fr = EXCLUDED.stage_name_fr,
  bbch_code = EXCLUDED.bbch_code,
  gdd_threshold_min = EXCLUDED.gdd_threshold_min,
  gdd_threshold_max = EXCLUDED.gdd_threshold_max,
  typical_month_start = EXCLUDED.typical_month_start,
  typical_month_end = EXCLUDED.typical_month_end,
  description_fr = EXCLUDED.description_fr;

-- Seed Kc coefficients
INSERT INTO crop_kc_coefficients (crop_type_name, phenological_stage_name, kc_value, kc_min, kc_max)
VALUES
  ('olive', 'Dormancy', 0.45, 0.40, 0.50),
  ('olive', 'Bud break', 0.50, 0.45, 0.55),
  ('olive', 'Shoot growth', 0.55, 0.50, 0.60),
  ('olive', 'Inflorescence emergence', 0.60, 0.55, 0.65),
  ('olive', 'Flowering', 0.65, 0.60, 0.70),
  ('olive', 'Fruit set', 0.65, 0.60, 0.70),
  ('olive', 'Fruit growth', 0.70, 0.65, 0.75),
  ('olive', 'Veraison/Lipogenesis', 0.65, 0.60, 0.70),
  ('olive', 'Maturation', 0.55, 0.50, 0.60),
  ('olive', 'Harvest', 0.50, 0.45, 0.55),
  ('avocado', 'Vegetative rest', 0.60, 0.55, 0.65),
  ('avocado', 'Bud break', 0.65, 0.60, 0.70),
  ('avocado', 'Flowering', 0.75, 0.70, 0.80),
  ('avocado', 'Fruit set', 0.80, 0.75, 0.85),
  ('avocado', 'Fruit growth phase 1', 0.85, 0.80, 0.90),
  ('avocado', 'Fruit growth phase 2', 0.85, 0.80, 0.90),
  ('avocado', 'Maturation', 0.70, 0.65, 0.75),
  ('avocado', 'Harvest', 0.65, 0.60, 0.70),
  ('citrus', 'Dormancy', 0.50, 0.45, 0.55),
  ('citrus', 'Flowering', 0.65, 0.60, 0.70),
  ('citrus', 'Fruit growth', 0.70, 0.65, 0.75),
  ('citrus', 'Maturation', 0.65, 0.60, 0.70),
  ('vine', 'Dormancy', 0.30, 0.25, 0.35),
  ('vine', 'Bud break', 0.40, 0.35, 0.45),
  ('vine', 'Flowering', 0.60, 0.55, 0.65),
  ('vine', 'Fruit growth', 0.70, 0.65, 0.80),
  ('vine', 'Veraison', 0.65, 0.60, 0.70),
  ('vine', 'Maturation', 0.55, 0.50, 0.60),
  ('almond', 'Dormancy', 0.40, 0.35, 0.45),
  ('almond', 'Flowering', 0.55, 0.50, 0.60),
  ('almond', 'Fruit growth', 0.80, 0.75, 0.90),
  ('almond', 'Maturation', 0.65, 0.60, 0.70)
ON CONFLICT (crop_type_name, phenological_stage_name) DO UPDATE SET
  kc_value = EXCLUDED.kc_value,
  kc_min = EXCLUDED.kc_min,
  kc_max = EXCLUDED.kc_max;

-- Seed mineral exports for all 11 crops
INSERT INTO crop_mineral_exports (crop_type_name, product_type, n_kg_per_ton, p2o5_kg_per_ton, k2o_kg_per_ton, cao_kg_per_ton, mgo_kg_per_ton)
VALUES
  ('olive', 'fruit', 15.0, 4.0, 20.0, 5.0, 2.0),
  ('olive', 'oil', 0.0, 0.0, 0.5, 0.0, 0.0),
  ('avocado', 'fruit', 8.5, 2.5, 25.0, 3.0, 2.0),
  ('citrus', 'fruit', 2.5, 0.8, 3.5, 2.0, 0.5),
  ('almond', 'fruit', 50.0, 10.0, 12.0, 3.0, 4.0),
  ('vine', 'fruit', 5.0, 2.0, 7.0, 3.0, 1.0),
  ('pomegranate', 'fruit', 3.0, 1.0, 4.0, 2.0, 0.5),
  ('fig', 'fruit', 4.0, 1.5, 5.0, 3.0, 1.0),
  ('apple_pear', 'fruit', 3.5, 1.2, 4.5, 1.5, 0.5),
  ('stone_fruit', 'fruit', 4.5, 1.5, 6.0, 2.0, 0.8),
  ('date_palm', 'fruit', 6.0, 2.0, 12.0, 3.0, 2.0),
  ('walnut', 'fruit', 30.0, 8.0, 10.0, 5.0, 3.0)
ON CONFLICT (crop_type_name, product_type) DO UPDATE SET
  n_kg_per_ton = EXCLUDED.n_kg_per_ton,
  p2o5_kg_per_ton = EXCLUDED.p2o5_kg_per_ton,
  k2o_kg_per_ton = EXCLUDED.k2o_kg_per_ton,
  cao_kg_per_ton = EXCLUDED.cao_kg_per_ton,
  mgo_kg_per_ton = EXCLUDED.mgo_kg_per_ton;

-- Seed crop diseases (olive and avocado priority)
INSERT INTO crop_diseases (crop_type_name, disease_name, disease_name_fr, pathogen_name, disease_type, temperature_min, temperature_max, humidity_threshold, season, treatment_product, treatment_dose, treatment_timing, days_after_treatment, satellite_signal, severity)
VALUES
  ('olive', 'Peacock spot', 'Oeil de paon', 'Spilocaea oleagina', 'fungal', 15.0, 20.0, 80.0, 'spring', 'Copper hydroxide', '3-5 L/ha', 'Preventive autumn + spring', 21, 'NDVI drop, leaf spots visible in NDRE', 'high'),
  ('olive', 'Verticillium wilt', 'Verticilliose', 'Verticillium dahliae', 'fungal', 20.0, 25.0, NULL, 'spring', 'No chemical cure', NULL, 'Resistant rootstocks, solarization', NULL, 'Asymmetric NDVI decline in canopy', 'critical'),
  ('olive', 'Olive knot', 'Tuberculose', 'Pseudomonas savastanoi', 'bacterial', 15.0, 25.0, 90.0, 'year_round', 'Copper compounds', '5 L/ha', 'After pruning wounds', 14, 'Branch dieback in NIRv', 'medium'),
  ('olive', 'Olive fruit fly', 'Mouche de l''olive', 'Bactrocera oleae', 'insect', 20.0, 30.0, NULL, 'autumn', 'Dimethoate or traps', '0.5-1 L/ha', 'When fruit starts coloring', 28, 'Not directly visible', 'high'),
  ('olive', 'Black scale', 'Cochenille noire', 'Saissetia oleae', 'insect', 20.0, 30.0, 70.0, 'summer', 'Mineral oil', '10-15 L/ha', 'Crawler stage (May-Jun)', 7, 'Sooty mold reduces NDVI', 'medium'),
  ('olive', 'Anthracnose', 'Dalmatica', 'Colletotrichum spp.', 'fungal', 15.0, 25.0, 85.0, 'autumn', 'Copper + mancozeb', '3-4 L/ha', 'Before rainy season', 21, 'Fruit damage, late NDVI drop', 'high'),
  ('avocado', 'Phytophthora root rot', 'Pourriture des racines', 'Phytophthora cinnamomi', 'fungal', 20.0, 30.0, 90.0, 'year_round', 'Phosphonic acid (Fosetyl-Al)', '2-3 g/L trunk injection', 'Preventive in spring/autumn', 30, 'NDVI and NIRv progressive decline, canopy thinning', 'critical'),
  ('avocado', 'Anthracnose', 'Anthracnose', 'Colletotrichum gloeosporioides', 'fungal', 25.0, 30.0, 85.0, 'summer', 'Copper hydroxide', '3-5 L/ha', 'Pre-harvest preventive', 14, 'Fruit spots, late NDVI impact', 'high'),
  ('avocado', 'Scab', 'Gale', 'Sphaceloma perseae', 'fungal', 20.0, 28.0, 80.0, 'spring', 'Copper oxychloride', '4 L/ha', 'Spring flush protection', 21, 'Leaf lesions visible in NDRE', 'medium'),
  ('avocado', 'Cercospora spot', 'Cercosporiose', 'Cercospora purpurea', 'fungal', 20.0, 28.0, 80.0, 'summer', 'Mancozeb', '2-3 kg/ha', 'Before symptoms appear', 14, 'Leaf spotting, NDVI decrease', 'medium')
ON CONFLICT (crop_type_name, disease_name) DO UPDATE SET
  disease_name_fr = EXCLUDED.disease_name_fr,
  pathogen_name = EXCLUDED.pathogen_name,
  disease_type = EXCLUDED.disease_type,
  temperature_min = EXCLUDED.temperature_min,
  temperature_max = EXCLUDED.temperature_max,
  humidity_threshold = EXCLUDED.humidity_threshold,
  season = EXCLUDED.season,
  treatment_product = EXCLUDED.treatment_product,
  treatment_dose = EXCLUDED.treatment_dose,
  treatment_timing = EXCLUDED.treatment_timing,
  days_after_treatment = EXCLUDED.days_after_treatment,
  satellite_signal = EXCLUDED.satellite_signal,
  severity = EXCLUDED.severity;

-- Seed index thresholds by crop and plantation system
INSERT INTO crop_index_thresholds (crop_type_name, plantation_system_type, index_name, healthy_min, healthy_max, stress_low, critical_low, notes)
VALUES
  ('olive', 'traditional', 'NDVI', 0.300, 0.550, 0.250, 0.150, 'Traditional olive 100-200 trees/ha'),
  ('olive', 'intensive', 'NDVI', 0.450, 0.700, 0.350, 0.250, 'Intensive olive 200-500 trees/ha'),
  ('olive', 'super_intensive', 'NDVI', 0.550, 0.800, 0.400, 0.300, 'Super-intensive >1000 trees/ha'),
  ('olive', 'traditional', 'NIRv', 0.100, 0.250, 0.080, 0.050, NULL),
  ('olive', 'intensive', 'NIRv', 0.150, 0.350, 0.120, 0.080, NULL),
  ('olive', 'super_intensive', 'NIRv', 0.200, 0.450, 0.150, 0.100, NULL),
  ('olive', 'traditional', 'EVI', 0.200, 0.450, 0.150, 0.100, NULL),
  ('olive', 'intensive', 'EVI', 0.300, 0.550, 0.250, 0.150, NULL),
  ('olive', 'super_intensive', 'EVI', 0.400, 0.650, 0.300, 0.200, NULL),
  ('olive', NULL, 'NDMI', 0.050, 0.300, 0.000, -0.100, 'Water stress indicator'),
  ('olive', NULL, 'NDRE', 0.200, 0.500, 0.150, 0.100, 'Nitrogen status indicator'),
  ('avocado', 'traditional', 'NDVI', 0.500, 0.800, 0.400, 0.300, 'Traditional avocado 100-200 trees/ha'),
  ('avocado', 'intensive', 'NDVI', 0.600, 0.850, 0.500, 0.400, 'Intensive avocado 400-600 trees/ha'),
  ('avocado', NULL, 'NDMI', 0.100, 0.400, 0.050, -0.050, 'Avocado is moisture-sensitive'),
  ('avocado', NULL, 'NIRv', 0.200, 0.500, 0.150, 0.100, NULL),
  ('avocado', NULL, 'EVI', 0.350, 0.700, 0.300, 0.200, NULL),
  ('citrus', NULL, 'NDVI', 0.450, 0.750, 0.350, 0.250, 'Citrus orchards'),
  ('citrus', NULL, 'NDMI', 0.100, 0.350, 0.050, -0.050, NULL),
  ('vine', NULL, 'NDVI', 0.250, 0.600, 0.200, 0.120, 'Vineyard canopy varies by training system'),
  ('vine', NULL, 'NDMI', 0.000, 0.250, -0.050, -0.150, 'Water stress common in viticulture'),
  ('almond', NULL, 'NDVI', 0.350, 0.650, 0.280, 0.180, NULL),
  ('date_palm', NULL, 'NDVI', 0.300, 0.600, 0.200, 0.120, 'Palm canopy structure differs')
ON CONFLICT (crop_type_name, COALESCE(plantation_system_type, ''), index_name) DO UPDATE SET
  healthy_min = EXCLUDED.healthy_min,
  healthy_max = EXCLUDED.healthy_max,
  stress_low = EXCLUDED.stress_low,
  critical_low = EXCLUDED.critical_low,
  notes = EXCLUDED.notes;

-- =====================================================
-- AI & OPERATIONAL ENGINE TABLES
-- =====================================================

-- Calibrations (AI parcel calibration records)
CREATE TABLE IF NOT EXISTS public.calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Trigger type: what initiated the calibration
  type TEXT NOT NULL DEFAULT 'initial' CHECK (type IN ('initial', 'F2_partial', 'F3_complete')),

  -- Engine run status
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'awaiting_validation', 'validated', 'insufficient', 'failed', 'archived')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- V2 engine mode: how the engine behaved based on parcel maturity
  mode_calibrage TEXT CHECK (mode_calibrage IN ('lecture_pure', 'calibrage_progressif', 'calibrage_complet', 'calibrage_avec_signalement', 'collecte_donnees', 'age_manquant')),

  -- Phase age: parcel maturity at calibration time
  phase_age TEXT CHECK (phase_age IN ('juvenile', 'entree_production', 'pleine_production', 'senescence')),

  -- Extracted percentiles for fast DB access (avoid JSONB parsing)
  p50_ndvi DECIMAL(6,4),
  p50_nirv DECIMAL(6,4),
  p50_ndmi DECIMAL(6,4),
  p50_ndre DECIMAL(6,4),
  p10_ndvi DECIMAL(6,4),
  p10_ndmi DECIMAL(6,4),

  -- Scores
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),

  -- Yield potential
  yield_potential_min DECIMAL(6,2),
  yield_potential_max DECIMAL(6,2),
  coefficient_etat_parcelle DECIMAL(4,2),

  -- Anomaly count
  anomaly_count INTEGER DEFAULT 0,

  -- Structured JSONB data (split from monolithic calibration_data)
  baseline_data JSONB,          -- percentiles, phenology, intra-parcel zones
  diagnostic_data JSONB,        -- ecarts, causes, resume_pourquoi
  anomalies_data JSONB,         -- detected anomalies with triple confirmation
  scores_detail JSONB,          -- health + confidence score component breakdown
  profile_snapshot JSONB,       -- parcel profile at calibration time

  -- Recalibration support
  recalibration_motif TEXT,
  previous_baseline JSONB,
  campaign_bilan JSONB,

  -- Localized reports
  rapport_fr TEXT,
  rapport_ar TEXT,

  -- User validation
  validated_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  validated_at TIMESTAMPTZ,

  -- Versioning
  calibration_version TEXT DEFAULT 'v3',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id, organization_id),
  CONSTRAINT fk_calibrations_parcel_org
    FOREIGN KEY (parcel_id, organization_id)
    REFERENCES public.parcels(id, organization_id) ON DELETE CASCADE
);

COMMENT ON COLUMN calibrations.type IS 'Trigger type: initial (first calibration), F2_partial (event-driven recalibration), F3_complete (post-campaign annual recalibration)';
COMMENT ON COLUMN calibrations.mode_calibrage IS 'V2 engine mode: how the calibration engine behaved based on parcel maturity and data availability';
COMMENT ON COLUMN calibrations.phase_age IS 'Parcel maturity phase at calibration time, derived from referentiel age thresholds';
COMMENT ON COLUMN calibrations.baseline_data IS 'Calibrated baseline: percentiles, phenology historique, zones intra-parcellaires';
COMMENT ON COLUMN calibrations.diagnostic_data IS 'Diagnostic explicatif: ecarts, causes probables, resume_pourquoi';
COMMENT ON COLUMN calibrations.anomalies_data IS 'Detected anomalies with triple confirmation (meteo + satellite + user)';
COMMENT ON COLUMN calibrations.scores_detail IS 'Score breakdown: sante components (vigueur, homogeneite, stabilite, hydrique, nutritionnel) + confiance Bloc A/B';
COMMENT ON COLUMN calibrations.profile_snapshot IS 'Snapshot of parcel agronomic profile at calibration time';
COMMENT ON COLUMN calibrations.recalibration_motif IS 'Recalibration motif for F2_partial recalibrations';
COMMENT ON COLUMN calibrations.previous_baseline IS 'Snapshot of validated baseline prior to recalibration';
COMMENT ON COLUMN calibrations.campaign_bilan IS 'Computed post-campaign comparison payload used by F3_complete recalibration flow';

CREATE INDEX IF NOT EXISTS idx_calibrations_parcel_id ON public.calibrations(parcel_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_organization_id ON public.calibrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_status ON public.calibrations(status);

-- AI Diagnostic Sessions (one row per operational AI analysis run)
CREATE TABLE IF NOT EXISTS public.ai_diagnostic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calibration_id UUID REFERENCES public.calibrations(id) ON DELETE SET NULL,
  chemin TEXT NOT NULL CHECK (chemin IN ('A_plan_standard', 'B_recommendations', 'C_observation')),
  phase_age TEXT,
  engine_output JSONB,
  date_analyse DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_diagnostic_sessions_parcel_org
    FOREIGN KEY (parcel_id, organization_id)
    REFERENCES public.parcels(id, organization_id) ON DELETE CASCADE
);

COMMENT ON TABLE ai_diagnostic_sessions IS 'One row per operational AI analysis run — stores full engine output and routing chemin';
COMMENT ON COLUMN ai_diagnostic_sessions.chemin IS 'Routing path: A_plan_standard (juvenile), B_recommendations (operational), C_observation (low confidence)';
COMMENT ON COLUMN ai_diagnostic_sessions.engine_output IS 'Full JSON response from the operational AI engine';

CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_parcel ON public.ai_diagnostic_sessions(parcel_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_org ON public.ai_diagnostic_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_date ON public.ai_diagnostic_sessions(parcel_id, date_analyse DESC);

ALTER TABLE ai_diagnostic_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_diagnostic_sessions" ON ai_diagnostic_sessions
  FOR ALL USING (is_organization_member(organization_id));

-- AI Recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calibration_id UUID REFERENCES public.calibrations(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.ai_diagnostic_sessions(id) ON DELETE SET NULL,

  -- Alert and classification
  alert_code TEXT,                   -- e.g. OLI-01, OLI-16, AGR-03
  crop_type TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('irrigation', 'fertilisation', 'phytosanitary', 'pruning', 'harvest', 'information', 'other')),
  recommendation_type TEXT NOT NULL DEFAULT 'reactive' CHECK (recommendation_type IN ('reactive', 'planned')),
  theme TEXT,                        -- for frequency limit tracking: irrigation, fertigation_n, phytosanitary, soil_amendment, biostimulants, pruning

  -- Priority and status (V2 governance)
  priority TEXT NOT NULL DEFAULT 'info' CHECK (priority IN ('urgent', 'priority', 'vigilance', 'info')),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'validated', 'waiting', 'executed', 'evaluated', 'closed', 'rejected', 'expired')),

  -- 6-bloc structure (V2 governance — mandatory for every recommendation)
  bloc_1_constat JSONB,              -- spectral values, baseline position, trend, inter-index coherence
  bloc_2_diagnostic JSONB,           -- hypotheses, alternatives, confidence level, missing data
  bloc_3_action JSONB,               -- description, product, dose, method, blocking condition
  bloc_4_fenetre JSONB,              -- urgency level, optimal period, deadline, expiration rules
  bloc_5_conditions JSONB,           -- meteo requirements, J+7 compatibility
  bloc_6_suivi JSONB,                -- evaluation delay, indicator, expected response

  -- Co-occurrence
  co_occurrence_code TEXT,           -- linked alert code if co-occurrence detected

  -- Lifecycle dates
  expires_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  evaluated_at TIMESTAMPTZ,
  execution_notes TEXT,

  -- Evaluation result
  evaluation_result TEXT CHECK (evaluation_result IN ('effective', 'partially_effective', 'not_effective')),
  evaluation_notes TEXT,

  -- Rejection
  rejection_motif TEXT,

  -- Responsibility disclaimer
  mention_responsabilite TEXT DEFAULT 'Cette recommandation est basée sur l''analyse des données disponibles. La décision et la responsabilité de l''application reviennent à l''exploitant.',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id, organization_id),
  CONSTRAINT fk_ai_recommendations_parcel_org
    FOREIGN KEY (parcel_id, organization_id)
    REFERENCES public.parcels(id, organization_id) ON DELETE CASCADE
);

COMMENT ON TABLE ai_recommendations IS 'Individual actionable recommendations with V2 6-bloc governance structure';
COMMENT ON COLUMN ai_recommendations.session_id IS 'FK to ai_diagnostic_sessions — links recommendation to the AI analysis run that generated it';
COMMENT ON COLUMN ai_recommendations.theme IS 'Theme for frequency limit tracking per gouvernance rules';
COMMENT ON COLUMN ai_recommendations.recommendation_type IS 'reactive (triggered by alert) or planned (from annual plan)';

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_parcel_id ON public.ai_recommendations(parcel_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_organization_id ON public.ai_recommendations(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON public.ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_session ON public.ai_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_expiry ON public.ai_recommendations(status, expires_at) WHERE status IN ('proposed', 'validated', 'waiting');

-- Recommendation Events (lifecycle journal — every state transition logged)
CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.ai_recommendations(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  decider TEXT NOT NULL CHECK (decider IN ('ia', 'user')),
  motif TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE recommendation_events IS 'Lifecycle journal: every recommendation status transition with timestamp, decider, and motif';

CREATE INDEX IF NOT EXISTS idx_recommendation_events_reco ON public.recommendation_events(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_parcel ON public.recommendation_events(parcel_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_org ON public.recommendation_events(organization_id);

ALTER TABLE recommendation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access_recommendation_events" ON recommendation_events
  FOR ALL USING (is_organization_member(organization_id));

-- Annual Plans
CREATE TABLE IF NOT EXISTS public.annual_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calibration_id UUID REFERENCES public.calibrations(id) ON DELETE SET NULL,
  season TEXT NOT NULL,              -- e.g. "2026", "2025-2026"
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'active', 'archived')),
  crop_type TEXT NOT NULL,
  variety TEXT,

  -- V2 extracted parameters
  nutrition_option TEXT CHECK (nutrition_option IN ('A', 'B', 'C')),
  nutrition_option_reason TEXT,
  yield_target_t_ha DECIMAL(6,2),
  alternance_status TEXT,            -- ON / OFF / indefini / NA
  production_target TEXT,            -- huile_qualite / olive_table / mixte

  -- V2 extracted annual doses (kg/ha)
  dose_n_kg_ha DECIMAL(7,2),
  dose_p_kg_ha DECIMAL(7,2),
  dose_k_kg_ha DECIMAL(7,2),
  dose_mg_kg_ha DECIMAL(7,2),

  -- Full plan data
  monthly_calendar JSONB,            -- structured monthly interventions
  irrigation_plan JSONB,             -- monthly Kc, ETo, volume reference
  harvest_forecast JSONB,            -- window, IM target, yield forecast
  budget_estimate_dh DECIMAL(10,2),
  verifications JSONB,               -- fractionnement_ok, doses_plausibles, etc.
  plan_summary TEXT,

  -- Validation
  validated_by_user BOOLEAN NOT NULL DEFAULT FALSE,
  validated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parcel_id, season),
  UNIQUE (id, organization_id),
  CONSTRAINT fk_annual_plans_parcel_org
    FOREIGN KEY (parcel_id, organization_id)
    REFERENCES public.parcels(id, organization_id) ON DELETE CASCADE
);

COMMENT ON TABLE annual_plans IS 'V2 annual plan: deterministic 10-step assembly from calibration + referentiel';
COMMENT ON COLUMN annual_plans.monthly_calendar IS 'Structured monthly breakdown: NPK, formes_engrais, microelements, biostimulants, phyto, irrigation, travaux';
COMMENT ON COLUMN annual_plans.nutrition_option IS 'Auto-determined nutrition option: A (full data), B (incomplete data), C (salinity)';

CREATE INDEX IF NOT EXISTS idx_annual_plans_parcel_id ON public.annual_plans(parcel_id);
CREATE INDEX IF NOT EXISTS idx_annual_plans_organization_id ON public.annual_plans(organization_id);

-- Plan Interventions (calendar tasks derived from annual plan)
CREATE TABLE IF NOT EXISTS public.plan_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_plan_id UUID NOT NULL,
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  week INTEGER CHECK (week >= 1 AND week <= 5),
  intervention_type TEXT NOT NULL CHECK (intervention_type IN ('fertilisation', 'irrigation', 'phytosanitary', 'biostimulant', 'pruning', 'harvest', 'other')),
  description TEXT NOT NULL,
  product TEXT,
  dose_data JSONB,                   -- structured: {valeur, unite}
  stage_bbch TEXT,                   -- target BBCH stage
  application_method TEXT,           -- fertigation, foliaire, epandage_sol, injection
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'reminded', 'executed', 'skipped', 'delayed', 'cancelled')),
  scheduled_date DATE,
  executed_at TIMESTAMPTZ,
  assigned_to UUID,                  -- FK to users/workers handled at app level
  crop_cycle_id UUID,                -- Optional link to crop cycle for traceability
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_plan_interventions_plan_org
    FOREIGN KEY (annual_plan_id, organization_id)
    REFERENCES public.annual_plans(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_interventions_parcel_org
    FOREIGN KEY (parcel_id, organization_id)
    REFERENCES public.parcels(id, organization_id) ON DELETE CASCADE
);

COMMENT ON TABLE plan_interventions IS 'Calendar tasks derived from annual plan — each becomes a planned recommendation with 5-state lifecycle';
COMMENT ON COLUMN plan_interventions.dose_data IS 'Structured dose: {valeur: number|[min,max], unite: string}';
COMMENT ON COLUMN plan_interventions.status IS 'Lifecycle: planned → reminded → executed | skipped | delayed | cancelled';

CREATE INDEX IF NOT EXISTS idx_plan_interventions_annual_plan_id ON public.plan_interventions(annual_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_interventions_parcel_id ON public.plan_interventions(parcel_id);
CREATE INDEX IF NOT EXISTS idx_plan_interventions_organization_id ON public.plan_interventions(organization_id);
CREATE INDEX IF NOT EXISTS idx_plan_interventions_status_date ON public.plan_interventions(parcel_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_plan_interventions_crop_cycle ON public.plan_interventions(crop_cycle_id);

-- Crop AI References
CREATE TABLE IF NOT EXISTS public.crop_ai_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL UNIQUE CHECK (crop_type IN ('olivier', 'agrumes', 'avocatier', 'palmier_dattier')),
  version TEXT NOT NULL,
  reference_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evenements Parcelle (parcel events that may trigger partial recalibration)
CREATE TABLE IF NOT EXISTS evenements_parcelle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date_evenement DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  donnees JSONB DEFAULT '{}'::jsonb,
  recalibrage_requis BOOLEAN DEFAULT FALSE,
  recalibrage_id UUID REFERENCES calibrations(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE evenements_parcelle IS 'Parcel events that may trigger partial recalibration';
COMMENT ON COLUMN evenements_parcelle.type IS 'Event type key: new_water_source, soil_analysis, water_analysis, severe_pruning, removal, disease, frost, drought, other';

CREATE INDEX IF NOT EXISTS idx_evenements_parcelle_parcel ON evenements_parcelle(parcel_id);
CREATE INDEX IF NOT EXISTS idx_evenements_parcelle_org ON evenements_parcelle(organization_id);

-- Suivis Saison (season tracking for annual recalibration and future ML)
CREATE TABLE IF NOT EXISTS suivis_saison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  saison TEXT NOT NULL,
  rendement_reel_t_ha DECIMAL,
  rendement_reel_kg_arbre DECIMAL,
  qualite_recolte TEXT,
  regularite_percue TEXT,
  applications JSONB DEFAULT '[]'::jsonb,
  evenements JSONB DEFAULT '[]'::jsonb,
  bilan_campagne TEXT,
  recalibrage_annual_id UUID REFERENCES calibrations(id) ON DELETE SET NULL,
  cloture_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE suivis_saison IS 'Season tracking for annual recalibration and future ML training data';
COMMENT ON COLUMN suivis_saison.saison IS 'Season identifier, e.g. 2025-2026';
COMMENT ON COLUMN suivis_saison.regularite_percue IS 'Perceived regularity key: stable, marked_alternance, very_irregular';

CREATE INDEX IF NOT EXISTS idx_suivis_saison_parcel ON suivis_saison(parcel_id);
CREATE INDEX IF NOT EXISTS idx_suivis_saison_org ON suivis_saison(organization_id);

-- Monitoring Analyses
CREATE TABLE IF NOT EXISTS public.monitoring_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  spectral_result JSONB,
  phenology_result JSONB,
  diagnostic_scenario TEXT,
  coherence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parcel_id, analysis_date),
  CONSTRAINT fk_monitoring_analyses_parcel_org
    FOREIGN KEY (parcel_id, organization_id)
    REFERENCES public.parcels(id, organization_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monitoring_analyses_parcel_date
  ON public.monitoring_analyses(parcel_id, analysis_date DESC);

-- Weather Daily (per-parcel weather data for monitoring)
CREATE TABLE IF NOT EXISTS public.weather_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tmin REAL,
  tmax REAL,
  tmoy REAL,
  precipitation_mm REAL,
  etp_mm REAL,
  humidity_pct REAL,
  wind_kmh REAL,
  radiation_wm2 REAL,
  gdd REAL,
  gdd_cumulative REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parcel_id, date),
  CONSTRAINT fk_weather_daily_parcel_org
    FOREIGN KEY (parcel_id, organization_id)
    REFERENCES public.parcels(id, organization_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_weather_daily_parcel_date
  ON public.weather_daily(parcel_id, date DESC);

-- Weather Forecast (per-parcel forecasts for monitoring)
CREATE TABLE IF NOT EXISTS public.weather_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tmin REAL,
  tmax REAL,
  precipitation_mm REAL,
  wind_kmh REAL,
  humidity_pct REAL,
  UNIQUE (parcel_id, forecast_date),
  CONSTRAINT fk_weather_forecast_parcel_org
    FOREIGN KEY (parcel_id, organization_id)
    REFERENCES public.parcels(id, organization_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_weather_forecast_parcel_date
  ON public.weather_forecast(parcel_id, forecast_date);

-- Yield Forecasts
CREATE TABLE IF NOT EXISTS public.yield_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  moment TEXT NOT NULL,
  yield_min REAL,
  yield_max REAL,
  yield_central REAL,
  confidence_pct REAL,
  alternance_status TEXT,
  factors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_yield_forecasts_parcel_org
    FOREIGN KEY (parcel_id, organization_id)
    REFERENCES public.parcels(id, organization_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_yield_forecasts_parcel_season
  ON public.yield_forecasts(parcel_id, season_year DESC, created_at DESC);

-- =====================================================
-- AI TABLE FK CONSTRAINTS (deferred for circular dependencies)
-- =====================================================

-- parcels.ai_calibration_id -> calibrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_parcels_ai_calibration'
      AND conrelid = 'public.parcels'::regclass
  ) THEN
    ALTER TABLE public.parcels
      ADD CONSTRAINT fk_parcels_ai_calibration
      FOREIGN KEY (ai_calibration_id) REFERENCES public.calibrations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_parcels_ai_calibration_org'
      AND conrelid = 'public.parcels'::regclass
  ) THEN
    ALTER TABLE public.parcels
      ADD CONSTRAINT fk_parcels_ai_calibration_org
      FOREIGN KEY (ai_calibration_id, organization_id)
      REFERENCES public.calibrations(id, organization_id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_ai_recommendations_calibration_org'
      AND conrelid = 'public.ai_recommendations'::regclass
  ) THEN
    ALTER TABLE public.ai_recommendations
      ADD CONSTRAINT fk_ai_recommendations_calibration_org
      FOREIGN KEY (calibration_id, organization_id)
      REFERENCES public.calibrations(id, organization_id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_annual_plans_calibration_org'
      AND conrelid = 'public.annual_plans'::regclass
  ) THEN
    ALTER TABLE public.annual_plans
      ADD CONSTRAINT fk_annual_plans_calibration_org
      FOREIGN KEY (calibration_id, organization_id)
      REFERENCES public.calibrations(id, organization_id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_product_applications_ai_recommendation'
      AND conrelid = 'public.product_applications'::regclass
  ) THEN
    ALTER TABLE public.product_applications
      ADD CONSTRAINT fk_product_applications_ai_recommendation
      FOREIGN KEY (ai_recommendation_id) REFERENCES public.ai_recommendations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_applications'
      AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_product_applications_ai_recommendation_org'
      AND conrelid = 'public.product_applications'::regclass
  ) THEN
    ALTER TABLE public.product_applications
      ADD CONSTRAINT fk_product_applications_ai_recommendation_org
      FOREIGN KEY (ai_recommendation_id, organization_id)
      REFERENCES public.ai_recommendations(id, organization_id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- =====================================================
-- AI TABLE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trg_calibrations_updated_at ON public.calibrations;
CREATE TRIGGER trg_calibrations_updated_at
  BEFORE UPDATE ON public.calibrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_recommendations_updated_at ON public.ai_recommendations;
CREATE TRIGGER trg_ai_recommendations_updated_at
  BEFORE UPDATE ON public.ai_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_annual_plans_updated_at ON public.annual_plans;
CREATE TRIGGER trg_annual_plans_updated_at
  BEFORE UPDATE ON public.annual_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_plan_interventions_updated_at ON public.plan_interventions;
CREATE TRIGGER trg_plan_interventions_updated_at
  BEFORE UPDATE ON public.plan_interventions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crop_ai_references_updated_at ON public.crop_ai_references;
CREATE TRIGGER trg_crop_ai_references_updated_at
  BEFORE UPDATE ON public.crop_ai_references
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- AI TABLE RLS POLICIES
-- =====================================================

ALTER TABLE IF EXISTS public.calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.annual_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crop_ai_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.monitoring_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weather_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weather_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.yield_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE evenements_parcelle ENABLE ROW LEVEL SECURITY;
ALTER TABLE suivis_saison ENABLE ROW LEVEL SECURITY;

-- Calibrations RLS
DROP POLICY IF EXISTS "org_read_calibrations" ON public.calibrations;
CREATE POLICY "org_read_calibrations" ON public.calibrations
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_calibrations" ON public.calibrations;
CREATE POLICY "org_write_calibrations" ON public.calibrations
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_calibrations" ON public.calibrations;
CREATE POLICY "org_update_calibrations" ON public.calibrations
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_calibrations" ON public.calibrations;
CREATE POLICY "org_delete_calibrations" ON public.calibrations
  FOR DELETE USING (public.is_organization_member(organization_id));

-- AI Recommendations RLS
DROP POLICY IF EXISTS "org_read_ai_recommendations" ON public.ai_recommendations;
CREATE POLICY "org_read_ai_recommendations" ON public.ai_recommendations
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_ai_recommendations" ON public.ai_recommendations;
CREATE POLICY "org_write_ai_recommendations" ON public.ai_recommendations
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_ai_recommendations" ON public.ai_recommendations;
CREATE POLICY "org_update_ai_recommendations" ON public.ai_recommendations
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_ai_recommendations" ON public.ai_recommendations;
CREATE POLICY "org_delete_ai_recommendations" ON public.ai_recommendations
  FOR DELETE USING (public.is_organization_member(organization_id));

-- Annual Plans RLS
DROP POLICY IF EXISTS "org_read_annual_plans" ON public.annual_plans;
CREATE POLICY "org_read_annual_plans" ON public.annual_plans
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_annual_plans" ON public.annual_plans;
CREATE POLICY "org_write_annual_plans" ON public.annual_plans
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_annual_plans" ON public.annual_plans;
CREATE POLICY "org_update_annual_plans" ON public.annual_plans
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_annual_plans" ON public.annual_plans;
CREATE POLICY "org_delete_annual_plans" ON public.annual_plans
  FOR DELETE USING (public.is_organization_member(organization_id));

-- Plan Interventions RLS
DROP POLICY IF EXISTS "org_read_plan_interventions" ON public.plan_interventions;
CREATE POLICY "org_read_plan_interventions" ON public.plan_interventions
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_plan_interventions" ON public.plan_interventions;
CREATE POLICY "org_write_plan_interventions" ON public.plan_interventions
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_plan_interventions" ON public.plan_interventions;
CREATE POLICY "org_update_plan_interventions" ON public.plan_interventions
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_plan_interventions" ON public.plan_interventions;
CREATE POLICY "org_delete_plan_interventions" ON public.plan_interventions
  FOR DELETE USING (public.is_organization_member(organization_id));

-- Crop AI References RLS
DROP POLICY IF EXISTS "read_crop_ai_references" ON public.crop_ai_references;
CREATE POLICY "read_crop_ai_references" ON public.crop_ai_references
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "write_crop_ai_references" ON public.crop_ai_references;
CREATE POLICY "write_crop_ai_references" ON public.crop_ai_references
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "update_crop_ai_references" ON public.crop_ai_references;
CREATE POLICY "update_crop_ai_references" ON public.crop_ai_references
  FOR UPDATE USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "delete_crop_ai_references" ON public.crop_ai_references;
CREATE POLICY "delete_crop_ai_references" ON public.crop_ai_references
  FOR DELETE USING (auth.role() = 'service_role');


-- Seed crop_ai_references from repo referentials (DATA_*.json). Idempotent: upserts on crop_type.
-- Regenerate: node project/scripts/generate-crop-ai-references-sql.mjs

INSERT INTO public.crop_ai_references (crop_type, version, reference_data)
VALUES (
  'agrumes',
  '1.0',
  $crop_ai_ref_agrumes${
  "metadata": {
    "version": "1.0",
    "date": "2026-02",
    "culture": "agrumes",
    "famille": "Rutaceae",
    "genre": "Citrus",
    "pays": "Maroc"
  },
  "especes": {
    "orange": {
      "nom_scientifique": "Citrus sinensis",
      "part_production_maroc": "60%",
      "types": [
        "Navel",
        "Blonde",
        "Sanguine"
      ]
    },
    "petits_agrumes": {
      "nom_scientifique": "Citrus reticulata",
      "part_production_maroc": "25%",
      "types": [
        "Clémentine",
        "Mandarine",
        "Tangor"
      ]
    },
    "citron": {
      "nom_scientifique": "Citrus limon",
      "part_production_maroc": "8%",
      "types": [
        "Eureka",
        "Lisbon",
        "Verna"
      ]
    },
    "pomelo": {
      "nom_scientifique": "Citrus paradisi",
      "part_production_maroc": "3%",
      "types": [
        "Star Ruby",
        "Marsh"
      ]
    }
  },
  "varietes": {
    "oranges": [
      {
        "code": "NAVELINE",
        "nom": "Naveline",
        "type": "Navel",
        "maturite": [
          "Nov",
          "Dec",
          "Jan"
        ],
        "calibre": "gros",
        "qualite": "excellente",
        "export": true
      },
      {
        "code": "WASH_NAVEL",
        "nom": "Washington Navel",
        "type": "Navel",
        "maturite": [
          "Dec",
          "Jan",
          "Fev"
        ],
        "calibre": "tres_gros",
        "qualite": "excellente"
      },
      {
        "code": "NAVELATE",
        "nom": "Navelate",
        "type": "Navel",
        "maturite": [
          "Jan",
          "Fev",
          "Mar"
        ],
        "calibre": "gros",
        "qualite": "tres_bonne",
        "tardive": true
      },
      {
        "code": "SALUSTIANA",
        "nom": "Salustiana",
        "type": "Blonde",
        "maturite": [
          "Dec",
          "Jan",
          "Fev",
          "Mar"
        ],
        "usage": "jus",
        "qualite": "tres_bonne"
      },
      {
        "code": "VALENCIA",
        "nom": "Valencia Late",
        "type": "Blonde",
        "maturite": [
          "Avr",
          "Mai",
          "Juin"
        ],
        "qualite": "excellente",
        "tres_tardive": true
      },
      {
        "code": "MAROC_LATE",
        "nom": "Maroc Late",
        "type": "Blonde",
        "maturite": [
          "Mar",
          "Avr",
          "Mai",
          "Juin"
        ],
        "qualite": "excellente",
        "specialite_maroc": true
      },
      {
        "code": "SANGUINELLI",
        "nom": "Sanguinelli",
        "type": "Sanguine",
        "maturite": [
          "Jan",
          "Fev",
          "Mar"
        ],
        "niche": true
      }
    ],
    "petits_agrumes": [
      {
        "code": "CLEM_COMMUNE",
        "nom": "Clémentine Commune",
        "type": "Clementine",
        "maturite": [
          "Oct",
          "Nov",
          "Dec"
        ],
        "pepins": [
          0,
          2
        ],
        "conservation": "moyenne"
      },
      {
        "code": "NULES",
        "nom": "Nules",
        "type": "Clementine",
        "maturite": [
          "Nov",
          "Dec"
        ],
        "pepins": [
          0,
          1
        ],
        "conservation": "bonne",
        "export": true
      },
      {
        "code": "MARISOL",
        "nom": "Marisol",
        "type": "Clementine",
        "maturite": [
          "Sept",
          "Oct"
        ],
        "tres_precoce": true,
        "conservation": "faible"
      },
      {
        "code": "NOUR",
        "nom": "Nour",
        "type": "Clementine",
        "maturite": [
          "Jan",
          "Fev",
          "Mar"
        ],
        "tardive": true,
        "origine": "Maroc"
      },
      {
        "code": "NADORCOTT",
        "nom": "Nadorcott/Afourer",
        "type": "Mandarine",
        "maturite": [
          "Jan",
          "Fev",
          "Mar",
          "Avr"
        ],
        "premium": true,
        "conservation": "excellente"
      },
      {
        "code": "ORTANIQUE",
        "nom": "Ortanique",
        "type": "Tangor",
        "maturite": [
          "Fev",
          "Mar",
          "Avr"
        ],
        "pepins": [
          5,
          15
        ],
        "hybride": "Orange x Tangerine"
      },
      {
        "code": "NOVA",
        "nom": "Nova",
        "type": "Mandarine",
        "maturite": [
          "Nov",
          "Dec",
          "Jan"
        ],
        "arome": "intense"
      }
    ],
    "citrons": [
      {
        "code": "EUREKA",
        "nom": "Eureka",
        "maturite": "toute_annee",
        "acidite": "elevee",
        "standard": true
      },
      {
        "code": "LISBON",
        "nom": "Lisbon",
        "maturite": [
          "Nov",
          "Dec",
          "Jan",
          "Fev",
          "Mar",
          "Avr",
          "Mai"
        ],
        "acidite": "elevee",
        "rustique": true
      },
      {
        "code": "VERNA",
        "nom": "Verna",
        "maturite": [
          "Fev",
          "Mar",
          "Avr",
          "Mai",
          "Juin",
          "Juil"
        ],
        "acidite": "moyenne",
        "peu_pepins": true
      },
      {
        "code": "MEYER",
        "nom": "Meyer",
        "maturite": [
          "Nov",
          "Dec",
          "Jan",
          "Fev",
          "Mar"
        ],
        "acidite": "faible",
        "hybride": true
      }
    ],
    "pomelos": [
      {
        "code": "STAR_RUBY",
        "nom": "Star Ruby",
        "chair": "rouge",
        "maturite": [
          "Nov",
          "Dec",
          "Jan",
          "Fev",
          "Mar"
        ],
        "gout": "peu_amer",
        "principal": true
      },
      {
        "code": "RIO_RED",
        "nom": "Rio Red",
        "chair": "rouge",
        "maturite": [
          "Nov",
          "Dec",
          "Jan",
          "Fev",
          "Mar",
          "Avr"
        ],
        "gout": "peu_amer"
      },
      {
        "code": "MARSH",
        "nom": "Marsh",
        "chair": "blonde",
        "maturite": [
          "Nov",
          "Dec",
          "Jan",
          "Fev",
          "Mar",
          "Avr"
        ],
        "gout": "legerement_amer"
      }
    ]
  },
  "porte_greffes": [
    {
      "code": "BIGARADIER",
      "nom": "Bigaradier",
      "vigueur": "forte",
      "calcaire": "excellente",
      "salinite": "bonne",
      "phytophthora": "sensible",
      "tristeza": "TRES_SENSIBLE",
      "qualite_fruit": "excellente",
      "exclusion_Cl": "bonne",
      "note": "RISQUE Tristeza - éviter nouvelles plantations"
    },
    {
      "code": "CARRIZO",
      "nom": "Citrange Carrizo",
      "vigueur": "moyenne_forte",
      "calcaire": "moyenne",
      "salinite": "faible",
      "phytophthora": "tolerante",
      "tristeza": "tolerante",
      "qualite_fruit": "bonne",
      "exclusion_Cl": "faible",
      "recommande_si_tristeza": true
    },
    {
      "code": "VOLKAMERIANA",
      "nom": "Volkameriana",
      "vigueur": "tres_forte",
      "calcaire": "bonne",
      "salinite": "bonne",
      "phytophthora": "moyenne",
      "tristeza": "tolerante",
      "qualite_fruit": "moyenne",
      "exclusion_Cl": "bonne",
      "recommande_si_salin": true
    },
    {
      "code": "MACROPHYLLA",
      "nom": "Macrophylla",
      "vigueur": "tres_forte",
      "calcaire": "bonne",
      "salinite": "bonne",
      "phytophthora": "moyenne",
      "tristeza": "tolerante",
      "qualite_fruit": "faible",
      "exclusion_Cl": "bonne"
    },
    {
      "code": "CLEOPATRE",
      "nom": "Mandarinier Cléopâtre",
      "vigueur": "moyenne",
      "calcaire": "excellente",
      "salinite": "bonne",
      "phytophthora": "sensible",
      "tristeza": "tolerante",
      "qualite_fruit": "excellente",
      "exclusion_Cl": "bonne"
    },
    {
      "code": "PONCIRUS",
      "nom": "Poncirus trifoliata",
      "vigueur": "nanisante",
      "calcaire": "tres_faible",
      "salinite": "faible",
      "phytophthora": "tres_tolerante",
      "tristeza": "tolerante",
      "qualite_fruit": "excellente",
      "note": "Éviter sol calcaire"
    }
  ],
  "guide_choix_pg": {
    "sol_calcaire_pH>7.5": {
      "recommande": [
        "Bigaradier",
        "Mandarinier Cléopâtre"
      ],
      "eviter": [
        "Poncirus",
        "Citrange"
      ]
    },
    "sol_salin_CE>2": {
      "recommande": [
        "Volkameriana",
        "Macrophylla",
        "Bigaradier"
      ],
      "eviter": [
        "Citrange Carrizo"
      ]
    },
    "sol_lourd_mal_draine": {
      "recommande": [
        "Citrange Carrizo",
        "Poncirus"
      ],
      "eviter": [
        "Bigaradier",
        "Volkameriana"
      ]
    },
    "presence_tristeza": {
      "recommande": [
        "Citrange",
        "Volkameriana",
        "Citrumelo"
      ],
      "interdit": [
        "Bigaradier"
      ]
    }
  },
  "exigences_climatiques": {
    "orange": {
      "T_optimale": [
        22,
        28
      ],
      "T_min_croissance": 13,
      "gel_feuilles": [
        -3,
        -5
      ],
      "gel_fruits": [
        -2,
        -3
      ],
      "gel_mortel": [
        -8,
        -10
      ],
      "heures_froid": [
        200,
        400
      ]
    },
    "clementine": {
      "T_optimale": [
        20,
        26
      ],
      "T_min_croissance": 13,
      "gel_feuilles": [
        -3,
        -5
      ],
      "gel_fruits": -2,
      "gel_mortel": -8,
      "heures_froid": [
        100,
        200
      ]
    },
    "citron": {
      "T_optimale": [
        20,
        30
      ],
      "T_min_croissance": 15,
      "gel_feuilles": [
        -2,
        -3
      ],
      "gel_fruits": [
        -1,
        -2
      ],
      "gel_mortel": [
        -5,
        -6
      ],
      "heures_froid": 0
    },
    "pomelo": {
      "T_optimale": [
        23,
        30
      ],
      "T_min_croissance": 15,
      "gel_feuilles": -2,
      "gel_fruits": -1,
      "gel_mortel": -4,
      "heures_froid": 0
    }
  },
  "exigences_sol": {
    "pH_optimal": [
      6.0,
      7.0
    ],
    "pH_tolerance": [
      5.5,
      8.0
    ],
    "calcaire_actif_max_pct": 8,
    "CE_sol_optimal_dS_m": 1.5,
    "CE_sol_max_dS_m": 3.0,
    "texture": "sablo_limoneux",
    "drainage": "bon_a_excellent",
    "profondeur_utile_min_cm": 60,
    "nappe_phreatique_min_cm": 100
  },
  "systemes": {
    "traditionnel": {
      "densite_arbres_ha": [
        200,
        300
      ],
      "ecartement_m": "7×5 à 8×6",
      "irrigation": "gravitaire",
      "entree_production_annee": [
        5,
        6
      ],
      "pleine_production_annee": [
        10,
        12
      ],
      "duree_vie_ans": [
        40,
        50
      ],
      "rendement_pleine_prod_t_ha": [
        20,
        35
      ]
    },
    "intensif": {
      "densite_arbres_ha": [
        400,
        600
      ],
      "ecartement_m": "5×3 à 6×4",
      "irrigation": "goutte_a_goutte",
      "entree_production_annee": [
        3,
        4
      ],
      "pleine_production_annee": [
        6,
        8
      ],
      "duree_vie_ans": [
        25,
        35
      ],
      "rendement_pleine_prod_t_ha": [
        40,
        60
      ]
    },
    "super_intensif": {
      "densite_arbres_ha": [
        800,
        1200
      ],
      "ecartement_m": "4×2 à 5×2.5",
      "irrigation": "gag_haute_frequence",
      "entree_production_annee": [
        2,
        3
      ],
      "pleine_production_annee": [
        5,
        6
      ],
      "duree_vie_ans": [
        15,
        20
      ],
      "rendement_pleine_prod_t_ha": [
        50,
        80
      ]
    }
  },
  "seuils_satellite": {
    "traditionnel": {
      "NDVI": {
        "optimal": [
          0.5,
          0.7
        ],
        "vigilance": 0.45,
        "alerte": 0.4
      },
      "NIRv": {
        "optimal": [
          0.12,
          0.28
        ],
        "vigilance": 0.1,
        "alerte": 0.08
      },
      "NDMI": {
        "optimal": [
          0.18,
          0.38
        ],
        "vigilance": 0.14,
        "alerte": 0.1
      }
    },
    "intensif": {
      "NDVI": {
        "optimal": [
          0.6,
          0.78
        ],
        "vigilance": 0.55,
        "alerte": 0.5
      },
      "NIRv": {
        "optimal": [
          0.18,
          0.35
        ],
        "vigilance": 0.15,
        "alerte": 0.12
      },
      "NDMI": {
        "optimal": [
          0.22,
          0.42
        ],
        "vigilance": 0.18,
        "alerte": 0.14
      }
    },
    "super_intensif": {
      "NDVI": {
        "optimal": [
          0.68,
          0.85
        ],
        "vigilance": 0.63,
        "alerte": 0.58
      },
      "NIRv": {
        "optimal": [
          0.22,
          0.42
        ],
        "vigilance": 0.2,
        "alerte": 0.17
      },
      "NDMI": {
        "optimal": [
          0.28,
          0.48
        ],
        "vigilance": 0.24,
        "alerte": 0.2
      }
    }
  },
  "rendement_t_ha": {
    "orange_navel": {
      "3-4_ans": [
        5,
        15
      ],
      "5-7_ans": [
        20,
        35
      ],
      "8-12_ans": [
        35,
        50
      ],
      "13-20_ans": [
        45,
        60
      ],
      "plus_20_ans": [
        40,
        55
      ]
    },
    "orange_valencia": {
      "3-4_ans": [
        5,
        15
      ],
      "5-7_ans": [
        25,
        40
      ],
      "8-12_ans": [
        40,
        60
      ],
      "13-20_ans": [
        55,
        80
      ],
      "plus_20_ans": [
        50,
        70
      ]
    },
    "clementine": {
      "3-4_ans": [
        5,
        12
      ],
      "5-7_ans": [
        18,
        30
      ],
      "8-12_ans": [
        30,
        45
      ],
      "13-20_ans": [
        40,
        55
      ],
      "plus_20_ans": [
        35,
        50
      ]
    },
    "citron": {
      "3-4_ans": [
        5,
        10
      ],
      "5-7_ans": [
        15,
        30
      ],
      "8-12_ans": [
        30,
        50
      ],
      "13-20_ans": [
        45,
        70
      ],
      "plus_20_ans": [
        40,
        60
      ]
    },
    "pomelo": {
      "3-4_ans": [
        5,
        12
      ],
      "5-7_ans": [
        20,
        35
      ],
      "8-12_ans": [
        40,
        60
      ],
      "13-20_ans": [
        55,
        80
      ],
      "plus_20_ans": [
        50,
        70
      ]
    }
  },
  "stades_phenologiques": [
    {
      "nom": "Repos hivernal",
      "mois": [
        "Dec",
        "Jan"
      ],
      "coef_nirvp": 0.7
    },
    {
      "nom": "Flush printemps",
      "mois": [
        "Fev",
        "Mar"
      ],
      "coef_nirvp": 1.0
    },
    {
      "nom": "Floraison",
      "mois": [
        "Mar",
        "Avr"
      ],
      "coef_nirvp": 0.95
    },
    {
      "nom": "Nouaison",
      "mois": [
        "Avr",
        "Mai"
      ],
      "coef_nirvp": 0.9
    },
    {
      "nom": "Chute juin",
      "mois": [
        "Mai",
        "Juin"
      ],
      "coef_nirvp": 0.85
    },
    {
      "nom": "Grossissement I",
      "mois": [
        "Juin",
        "Juil"
      ],
      "coef_nirvp": 0.95
    },
    {
      "nom": "Flush été",
      "mois": [
        "Juil",
        "Aout"
      ],
      "coef_nirvp": 1.0
    },
    {
      "nom": "Grossissement II",
      "mois": [
        "Aout",
        "Sept"
      ],
      "coef_nirvp": 0.95
    },
    {
      "nom": "Véraison",
      "mois": [
        "Sept",
        "Oct"
      ],
      "coef_nirvp": 0.9
    },
    {
      "nom": "Maturation",
      "mois": [
        "Oct",
        "Nov",
        "Dec"
      ],
      "coef_nirvp": 0.85
    },
    {
      "nom": "Flush automne",
      "mois": [
        "Oct",
        "Nov"
      ],
      "coef_nirvp": 0.9
    }
  ],
  "options_nutrition": {
    "A": {
      "nom": "Nutrition équilibrée",
      "condition": "analyse_sol < 2 ans ET analyse_eau"
    },
    "B": {
      "nom": "Nutrition foliaire prioritaire",
      "condition": "PAS analyse_sol OU > 3 ans"
    },
    "C": {
      "nom": "Gestion salinité",
      "condition": "CE_eau > 1.5 dS/m OU CE_sol > 2 dS/m"
    }
  },
  "export_kg_tonne": {
    "orange": {
      "N": [
        1.8,
        2.2
      ],
      "P2O5": [
        0.4,
        0.6
      ],
      "K2O": [
        2.5,
        3.5
      ],
      "CaO": [
        0.8,
        1.2
      ],
      "MgO": [
        0.3,
        0.5
      ]
    },
    "clementine": {
      "N": [
        1.5,
        2.0
      ],
      "P2O5": [
        0.3,
        0.5
      ],
      "K2O": [
        2.0,
        3.0
      ],
      "CaO": [
        0.6,
        1.0
      ],
      "MgO": [
        0.2,
        0.4
      ]
    },
    "citron": {
      "N": [
        2.0,
        2.5
      ],
      "P2O5": [
        0.4,
        0.6
      ],
      "K2O": [
        3.0,
        4.0
      ],
      "CaO": [
        0.8,
        1.2
      ],
      "MgO": [
        0.3,
        0.5
      ]
    },
    "pomelo": {
      "N": [
        1.5,
        2.0
      ],
      "P2O5": [
        0.3,
        0.5
      ],
      "K2O": [
        2.5,
        3.5
      ],
      "CaO": [
        0.6,
        1.0
      ],
      "MgO": [
        0.2,
        0.4
      ]
    }
  },
  "entretien_kg_ha": {
    "jeune_1-3_ans": {
      "N": [
        40,
        80
      ],
      "P2O5": [
        20,
        40
      ],
      "K2O": [
        30,
        60
      ]
    },
    "entree_prod_4-6_ans": {
      "N": [
        100,
        150
      ],
      "P2O5": [
        40,
        60
      ],
      "K2O": [
        80,
        120
      ]
    },
    "intensif_pleine_prod": {
      "N": [
        180,
        280
      ],
      "P2O5": [
        60,
        100
      ],
      "K2O": [
        150,
        250
      ]
    },
    "super_intensif": {
      "N": [
        250,
        400
      ],
      "P2O5": [
        80,
        120
      ],
      "K2O": [
        200,
        350
      ]
    }
  },
  "fractionnement_pct": {
    "fev": {
      "N": 15,
      "P2O5": 40,
      "K2O": 10,
      "objectif": "Pré-floraison"
    },
    "mar_avr": {
      "N": 25,
      "P2O5": 30,
      "K2O": 15,
      "objectif": "Floraison-nouaison"
    },
    "mai_juin": {
      "N": 20,
      "P2O5": 15,
      "K2O": 20,
      "objectif": "Grossissement I"
    },
    "juil_aout": {
      "N": 20,
      "P2O5": 10,
      "K2O": 25,
      "objectif": "Grossissement II"
    },
    "sept_oct": {
      "N": 10,
      "P2O5": 5,
      "K2O": 20,
      "objectif": "Maturation"
    },
    "nov": {
      "N": 10,
      "P2O5": 0,
      "K2O": 10,
      "objectif": "Post-récolte"
    }
  },
  "ajustement_espece": {
    "orange_navel": {
      "N": 1.0,
      "K": 1.0,
      "note": "Éviter excès N (éclatement)"
    },
    "orange_valencia": {
      "N": 1.1,
      "K": 1.0,
      "note": "Production élevée"
    },
    "clementine": {
      "N": 0.9,
      "K": 1.0,
      "note": "Éviter calibre excessif"
    },
    "citron": {
      "N": 1.15,
      "K": 1.1,
      "note": "Remontant, besoins continus"
    },
    "pomelo": {
      "N": 1.0,
      "K": 1.1,
      "note": "Gros fruits"
    }
  },
  "formes_engrais": {
    "N_recommande": [
      "nitrate_calcium",
      "nitrate_ammonium",
      "uree_si_pH<7"
    ],
    "P_recommande": [
      "MAP",
      "acide_phosphorique"
    ],
    "K_recommande": [
      "sulfate_potasse",
      "nitrate_potasse"
    ],
    "K_conditionnel": "KCl acceptable si CE_eau < 1.0 ET Cl_eau < 100 mg/L",
    "note": "Agrumes sensibles Cl mais moins que avocatier"
  },
  "seuils_foliaires": {
    "periode_prelevement": "Août-Septembre, feuilles 4-6 mois",
    "N": {
      "unite": "%",
      "carence": 2.2,
      "suffisant": [
        2.2,
        2.4
      ],
      "optimal": [
        2.4,
        2.7
      ],
      "exces": 3.0
    },
    "P": {
      "unite": "%",
      "carence": 0.09,
      "suffisant": [
        0.09,
        0.11
      ],
      "optimal": [
        0.12,
        0.17
      ],
      "exces": 0.2
    },
    "K": {
      "unite": "%",
      "carence": 0.7,
      "suffisant": [
        0.7,
        1.0
      ],
      "optimal": [
        1.0,
        1.5
      ],
      "exces": 2.0
    },
    "Ca": {
      "unite": "%",
      "carence": 2.0,
      "suffisant": [
        2.0,
        3.0
      ],
      "optimal": [
        3.0,
        5.0
      ],
      "exces": 6.0
    },
    "Mg": {
      "unite": "%",
      "carence": 0.2,
      "suffisant": [
        0.2,
        0.3
      ],
      "optimal": [
        0.3,
        0.5
      ],
      "exces": 0.7
    },
    "Fe": {
      "unite": "ppm",
      "carence": 35,
      "suffisant": [
        35,
        60
      ],
      "optimal": [
        60,
        120
      ],
      "exces": 200
    },
    "Zn": {
      "unite": "ppm",
      "carence": 18,
      "suffisant": [
        18,
        25
      ],
      "optimal": [
        25,
        100
      ],
      "exces": 200
    },
    "Mn": {
      "unite": "ppm",
      "carence": 18,
      "suffisant": [
        18,
        25
      ],
      "optimal": [
        25,
        100
      ],
      "exces": 500
    },
    "B": {
      "unite": "ppm",
      "carence": 20,
      "suffisant": [
        20,
        35
      ],
      "optimal": [
        35,
        100
      ],
      "exces": 150
    },
    "Cu": {
      "unite": "ppm",
      "carence": 3,
      "suffisant": [
        3,
        5
      ],
      "optimal": [
        5,
        15
      ],
      "exces": 20
    },
    "Cl": {
      "unite": "%",
      "toxique": 0.7
    },
    "Na": {
      "unite": "%",
      "toxique": 0.25
    }
  },
  "salinite": {
    "orange_mandarine": {
      "CE_eau_optimal": 1.0,
      "CE_eau_limite": 2.0,
      "CE_sol_limite": 2.5,
      "Cl_eau_limite_mg_L": 150,
      "Cl_foliaire_toxique_pct": 0.7
    },
    "citron": {
      "CE_eau_optimal": 0.8,
      "CE_eau_limite": 1.5,
      "CE_sol_limite": 2.0,
      "Cl_eau_limite_mg_L": 100,
      "Cl_foliaire_toxique_pct": 0.5
    },
    "pomelo": {
      "CE_eau_optimal": 1.2,
      "CE_eau_limite": 2.5,
      "CE_sol_limite": 3.0,
      "Cl_eau_limite_mg_L": 200,
      "Cl_foliaire_toxique_pct": 0.8
    }
  },
  "kc": {
    "jeune": {
      "jan_fev": 0.45,
      "mar_avr": 0.55,
      "mai_juin": 0.65,
      "juil_aout": 0.7,
      "sept_oct": 0.6,
      "nov_dec": 0.5
    },
    "adulte": {
      "jan_fev": 0.65,
      "mar_avr": 0.75,
      "mai_juin": 0.85,
      "juil_aout": 0.9,
      "sept_oct": 0.8,
      "nov_dec": 0.7
    }
  },
  "rdi": {
    "floraison": {
      "sensibilite": "tres_haute",
      "rdi_possible": false,
      "reduction": 0
    },
    "nouaison": {
      "sensibilite": "haute",
      "rdi_possible": false,
      "reduction": 0
    },
    "grossissement_I": {
      "sensibilite": "haute",
      "rdi_possible": "prudence",
      "reduction": [
        0,
        10
      ]
    },
    "grossissement_II": {
      "sensibilite": "moderee",
      "rdi_possible": true,
      "reduction": [
        15,
        25
      ]
    },
    "maturation": {
      "sensibilite": "faible",
      "rdi_possible": true,
      "reduction": [
        25,
        35
      ]
    },
    "note": "RDI pré-récolte augmente °Brix +0.5-1.0 mais réduit calibre"
  },
  "phytosanitaire": {
    "maladies": [
      {
        "nom": "Gommose",
        "agent": "Phytophthora citrophthora, P. nicotianae",
        "conditions": "sol_mal_draine_exces_eau",
        "prevention": [
          "drainage",
          "PG_tolerant",
          "point_greffe_haut"
        ],
        "traitement": [
          "Phosphonate",
          "Métalaxyl"
        ]
      },
      {
        "nom": "Tristeza",
        "agent": "Citrus Tristeza Virus (CTV)",
        "vecteur": "pucerons",
        "prevention": "PG_tolerant_obligatoire",
        "traitement": null,
        "note": "AUCUN curatif - arrachage si sévère"
      },
      {
        "nom": "Alternariose",
        "agent": "Alternaria alternata",
        "conditions": "HR > 80%, pluie",
        "varietes_sensibles": [
          "Minneola",
          "Nova",
          "Fortune"
        ],
        "traitement": [
          "Cuivre",
          "Mancozèbe",
          "Difénoconazole"
        ]
      }
    ],
    "ravageurs": [
      {
        "nom": "Cératite",
        "degats": "piqures_fruits",
        "periode": "veraison_recolte",
        "seuil": "2% fruits piqués",
        "traitement": "Spinosad + piégeage"
      },
      {
        "nom": "Cochenilles",
        "degats": "fumagine",
        "periode": "toute_annee",
        "traitement": "Huile blanche, Spirotetramat"
      },
      {
        "nom": "Pucerons",
        "degats": "deformation_pousses_virus",
        "periode": "printemps",
        "traitement": "Imidaclopride, Spirotetramat"
      },
      {
        "nom": "Mineuse",
        "degats": "galeries_feuilles",
        "periode": "flush",
        "traitement": "Abamectine, Imidaclopride"
      },
      {
        "nom": "Acariens",
        "degats": "feuilles_bronze",
        "periode": "ete_sec",
        "traitement": "Abamectine, soufre"
      },
      {
        "nom": "Thrips",
        "degats": "cicatrices_fruits",
        "periode": "floraison",
        "traitement": "Spinosad"
      }
    ]
  },
  "calendrier_phyto_preventif": {
    "jan": {
      "cible": "Cochenilles",
      "produit": "Huile blanche",
      "dose": "15-20 L/ha"
    },
    "fev_mar": {
      "cible": "Gommose",
      "produit": "Phosphonate",
      "dose": "5 mL/L foliaire",
      "condition": "sol_humide"
    },
    "avr": {
      "cible": "Pucerons",
      "produit": "Imidaclopride",
      "condition": "si_colonies"
    },
    "mai": {
      "cible": "Mineuse",
      "produit": "Abamectine",
      "dose": "0.5 L/ha",
      "condition": "si_presence"
    },
    "aout_oct": {
      "cible": "Cératite",
      "produit": "Spinosad + attractif",
      "dose": "0.2 L/ha",
      "condition": "piegeage + seuil"
    },
    "nov": {
      "cible": "Cuivre hivernal",
      "produit": "Cuivre",
      "dose": "3 kg/ha"
    }
  },
  "maturite_recolte": {
    "orange_navel": {
      "indice": "ratio_Brix_Acidite",
      "min": 8,
      "optimal": [
        10,
        14
      ],
      "autre": "couleur_80%"
    },
    "orange_valencia": {
      "indice": "ratio_Brix_Acidite",
      "min": 8,
      "optimal": [
        10,
        16
      ],
      "autre": "Brix >= 10"
    },
    "clementine": {
      "indice": "ratio_Brix_Acidite",
      "min": 7,
      "optimal": [
        10,
        14
      ],
      "autre": "couleur_100%"
    },
    "citron": {
      "indice": "acidite_titrable",
      "min_pct": 5,
      "optimal_pct": [
        5,
        7
      ],
      "autre": "jus >= 25%"
    },
    "pomelo": {
      "indice": "ratio_Brix_Acidite",
      "min": 5.5,
      "optimal": [
        6,
        8
      ],
      "autre": "Brix >= 9"
    }
  },
  "defauts_qualite": {
    "granulation": {
      "cause": "recolte_tardive_K_faible",
      "prevention": "recolter_a_temps_K_suffisant"
    },
    "eclatement": {
      "cause": "exces_N_stress_hydrique",
      "prevention": "equilibre_N_K_irrigation_reguliere"
    },
    "petit_calibre": {
      "cause": "charge_excessive_stress_eau",
      "prevention": "eclaircissage_irrigation"
    },
    "peau_epaisse": {
      "cause": "exces_N",
      "prevention": "reduire_N"
    },
    "reverdissement": {
      "cause": "recolte_tardive_Valencia",
      "prevention": "ethylene_si_necessaire"
    },
    "oleocellose": {
      "cause": "recolte_humide_blessures",
      "prevention": "recolter_sec_manipulation_douce"
    }
  },
  "alertes": [
    {
      "code": "AGR-01",
      "nom": "Stress hydrique",
      "seuil": "NDMI < P15 (2 passages) + T > 30",
      "priorite": "urgente"
    },
    {
      "code": "AGR-02",
      "nom": "Excès eau / Gommose",
      "seuil": "NDMI > P95 + pluie > 40mm/sem",
      "priorite": "urgente"
    },
    {
      "code": "AGR-03",
      "nom": "Risque gel",
      "seuil": "Tmin prévue < 0°C",
      "priorite": "urgente"
    },
    {
      "code": "AGR-04",
      "nom": "Gel avéré",
      "seuil": "Tmin < -2°C (orange) ou < 0°C (citron)",
      "priorite": "urgente"
    },
    {
      "code": "AGR-05",
      "nom": "Canicule",
      "seuil": "Tmax > 40°C (3j) + HR < 30%",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-06",
      "nom": "Vent chaud",
      "seuil": "T > 38 + HR < 25% + vent > 30 km/h",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-07",
      "nom": "Conditions Gommose",
      "seuil": "Sol saturé > 48h + T 18-28",
      "priorite": "urgente"
    },
    {
      "code": "AGR-08",
      "nom": "Risque Cératite",
      "seuil": "Véraison + T 20-30 + piège positif",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-09",
      "nom": "Pression pucerons",
      "seuil": "Flush + T 18-28 + colonies",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-10",
      "nom": "Risque Alternaria",
      "seuil": "HR > 85% + pluie + variété sensible",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-11",
      "nom": "Chlorose ferrique",
      "seuil": "NDRE < P10 + GCI ↘ + pH sol > 7.5",
      "priorite": "vigilance"
    },
    {
      "code": "AGR-12",
      "nom": "Carence Zn",
      "seuil": "Feuilles petites mouchetées + flush",
      "priorite": "vigilance"
    },
    {
      "code": "AGR-13",
      "nom": "Toxicité Cl",
      "seuil": "Brûlures foliaires + CE eau > 2.5",
      "priorite": "urgente"
    },
    {
      "code": "AGR-14",
      "nom": "Floraison faible",
      "seuil": "Floraison < 50% attendue",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-15",
      "nom": "Chute excessive",
      "seuil": "Charge < 40% post-nouaison",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-16",
      "nom": "Maturité récolte",
      "seuil": "Ratio Brix/Acidité atteint + couleur",
      "priorite": "info"
    },
    {
      "code": "AGR-17",
      "nom": "Année OFF probable",
      "seuil": "N-1 très productif + flush faible",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-18",
      "nom": "Risque granulation",
      "seuil": "Récolte tardive + K foliaire bas",
      "priorite": "prioritaire"
    },
    {
      "code": "AGR-19",
      "nom": "Dépérissement",
      "seuil": "NIRv ↘ > 20% (4 passages)",
      "priorite": "urgente"
    },
    {
      "code": "AGR-20",
      "nom": "Tristeza suspectée",
      "seuil": "NDVI ↘ + PG bigaradier + déclin rapide",
      "priorite": "urgente"
    }
  ],
  "modele_predictif": {
    "variables": [
      {
        "nom": "floraison",
        "source": "satellite_terrain",
        "poids": [
          0.2,
          0.3
        ]
      },
      {
        "nom": "alternance_N-1_N-2",
        "source": "historique",
        "poids": [
          0.2,
          0.3
        ]
      },
      {
        "nom": "conditions_floraison",
        "source": "meteo",
        "poids": [
          0.15,
          0.25
        ]
      },
      {
        "nom": "NIRv_cumule",
        "source": "satellite",
        "poids": [
          0.15,
          0.25
        ]
      },
      {
        "nom": "stress_hydrique",
        "source": "bilan_hydrique",
        "poids": [
          0.1,
          0.2
        ]
      },
      {
        "nom": "gel",
        "source": "meteo",
        "poids": "fort_si_1"
      },
      {
        "nom": "age_verger",
        "source": "profil",
        "type": "ajustement"
      }
    ],
    "precision_attendue": {
      "traditionnel": {
        "R2": [
          0.4,
          0.55
        ],
        "MAE_pct": [
          30,
          45
        ]
      },
      "intensif": {
        "R2": [
          0.5,
          0.65
        ],
        "MAE_pct": [
          20,
          35
        ]
      },
      "super_intensif": {
        "R2": [
          0.55,
          0.7
        ],
        "MAE_pct": [
          15,
          30
        ]
      }
    },
    "previsibilite_espece": {
      "orange_navel": "moyenne",
      "orange_valencia": "bonne",
      "clementine": "moyenne",
      "citron": "difficile_remontant",
      "pomelo": "bonne"
    }
  },
  "plan_annuel_type_orange_intensif_50T": {
    "jan": {
      "NPK": "N15+P20+K10",
      "micro": "Fe-EDDHA",
      "biostim": null,
      "phyto": "Huile blanche",
      "irrigation_L_sem": 50
    },
    "fev": {
      "NPK": "N25+P15+K15",
      "micro": null,
      "biostim": "Humiques+Algues",
      "phyto": "Phosphonate",
      "irrigation_L_sem": 60
    },
    "mar": {
      "NPK": "N30+K20",
      "micro": "Zn+Mn foliaire",
      "biostim": "Algues",
      "phyto": null,
      "irrigation_L_sem": 80
    },
    "avr": {
      "NPK": "N25+P10+K15",
      "micro": "B floraison",
      "biostim": "Aminés",
      "phyto": "Pucerons si présence",
      "irrigation_L_sem": 100
    },
    "mai": {
      "NPK": "N20+K25",
      "micro": "Zn foliaire",
      "biostim": "Humiques+Aminés",
      "phyto": "Mineuse si présence",
      "irrigation_L_sem": 130
    },
    "juin": {
      "NPK": "N20+K30",
      "micro": "Fe-EDDHA",
      "biostim": null,
      "phyto": null,
      "irrigation_L_sem": 160
    },
    "juil": {
      "NPK": "N15+K30",
      "micro": "Zn+Mn foliaire",
      "biostim": "Algues",
      "phyto": null,
      "irrigation_L_sem": 180
    },
    "aout": {
      "NPK": "N15+K25",
      "micro": null,
      "biostim": null,
      "phyto": "Cératite début",
      "irrigation_L_sem": 180
    },
    "sept": {
      "NPK": "N10+K20",
      "micro": null,
      "biostim": "Humiques",
      "phyto": "Cératite",
      "irrigation_L_sem": 140
    },
    "oct": {
      "NPK": "N10+K15",
      "micro": null,
      "biostim": null,
      "phyto": "Cératite",
      "irrigation_L_sem": 100
    },
    "nov": {
      "NPK": "N15",
      "micro": null,
      "biostim": "Humiques granulé",
      "phyto": "Cuivre",
      "irrigation_L_sem": 70
    },
    "dec": {
      "NPK": null,
      "micro": null,
      "biostim": "Aminés",
      "phyto": null,
      "irrigation_L_sem": 50
    }
  }
}$crop_ai_ref_agrumes$::jsonb
)
ON CONFLICT (crop_type) DO UPDATE SET
  version = EXCLUDED.version,
  reference_data = EXCLUDED.reference_data,
  updated_at = NOW();

INSERT INTO public.crop_ai_references (crop_type, version, reference_data)
VALUES (
  'avocatier',
  '1.0',
  $crop_ai_ref_avocatier${
  "metadata": {
    "version": "1.0",
    "date": "2026-02",
    "culture": "avocatier",
    "nom_scientifique": "Persea americana Mill.",
    "pays": "Maroc"
  },
  "varietes": [
    {
      "code": "HASS",
      "nom": "Hass",
      "race": "guatemalteque",
      "type_floral": "A",
      "peau": "rugueuse_noire",
      "poids_g": [
        170,
        300
      ],
      "huile_pct": [
        18,
        25
      ],
      "maturite_mois": [
        "Fev",
        "Mar",
        "Avr",
        "Mai",
        "Juin",
        "Juil",
        "Aout",
        "Sept"
      ],
      "alternance": "moderee",
      "vigueur": "moyenne",
      "port": "etale",
      "froid_min_C": -3,
      "salinite": "sensible",
      "rendement_kg_arbre": {
        "3-4_ans": [
          5,
          15
        ],
        "5-7_ans": [
          30,
          60
        ],
        "8-12_ans": [
          80,
          150
        ],
        "13-20_ans": [
          120,
          200
        ],
        "plus_20_ans": [
          100,
          180
        ]
      }
    },
    {
      "code": "FUERTE",
      "nom": "Fuerte",
      "race": "hybride_GM",
      "type_floral": "B",
      "peau": "lisse_verte",
      "poids_g": [
        200,
        400
      ],
      "huile_pct": [
        15,
        20
      ],
      "maturite_mois": [
        "Nov",
        "Dec",
        "Jan",
        "Fev",
        "Mar"
      ],
      "alternance": "forte",
      "vigueur": "forte",
      "port": "etale_large",
      "froid_min_C": -4,
      "salinite": "sensible",
      "rendement_kg_arbre": {
        "3-4_ans": [
          5,
          10
        ],
        "5-7_ans": [
          25,
          50
        ],
        "8-12_ans": [
          60,
          120
        ],
        "13-20_ans": [
          100,
          180
        ],
        "plus_20_ans": [
          80,
          150
        ]
      }
    },
    {
      "code": "BACON",
      "nom": "Bacon",
      "race": "mexicaine",
      "type_floral": "B",
      "peau": "lisse_verte",
      "poids_g": [
        200,
        350
      ],
      "huile_pct": [
        12,
        15
      ],
      "maturite_mois": [
        "Nov",
        "Dec",
        "Jan"
      ],
      "alternance": "moderee",
      "vigueur": "forte",
      "port": "dresse",
      "froid_min_C": -5,
      "salinite": "moyenne",
      "rendement_kg_arbre": {
        "3-4_ans": [
          3,
          8
        ],
        "5-7_ans": [
          20,
          40
        ],
        "8-12_ans": [
          50,
          100
        ],
        "13-20_ans": [
          80,
          140
        ],
        "plus_20_ans": [
          70,
          120
        ]
      }
    },
    {
      "code": "ZUTANO",
      "nom": "Zutano",
      "race": "mexicaine",
      "type_floral": "B",
      "peau": "lisse_vert_clair",
      "poids_g": [
        200,
        400
      ],
      "huile_pct": [
        10,
        15
      ],
      "maturite_mois": [
        "Oct",
        "Nov",
        "Dec"
      ],
      "alternance": "faible",
      "vigueur": "tres_forte",
      "port": "dresse",
      "froid_min_C": -6,
      "salinite": "moyenne",
      "pollinisateur": true
    },
    {
      "code": "PINKERTON",
      "nom": "Pinkerton",
      "race": "guatemalteque",
      "type_floral": "A",
      "peau": "rugueuse_verte",
      "poids_g": [
        250,
        450
      ],
      "huile_pct": [
        18,
        22
      ],
      "maturite_mois": [
        "Jan",
        "Fev",
        "Mar",
        "Avr"
      ],
      "alternance": "faible",
      "vigueur": "faible",
      "port": "compact",
      "froid_min_C": -2,
      "salinite": "sensible",
      "rendement_kg_arbre": {
        "3-4_ans": [
          8,
          20
        ],
        "5-7_ans": [
          40,
          80
        ],
        "8-12_ans": [
          100,
          180
        ],
        "13-20_ans": [
          150,
          250
        ],
        "plus_20_ans": [
          130,
          220
        ]
      }
    },
    {
      "code": "REED",
      "nom": "Reed",
      "race": "guatemalteque",
      "type_floral": "A",
      "peau": "epaisse_verte",
      "poids_g": [
        300,
        500
      ],
      "huile_pct": [
        18,
        22
      ],
      "maturite_mois": [
        "Juil",
        "Aout",
        "Sept",
        "Oct"
      ],
      "alternance": "moderee",
      "vigueur": "moyenne",
      "port": "dresse",
      "froid_min_C": -2,
      "salinite": "sensible"
    },
    {
      "code": "ETTINGER",
      "nom": "Ettinger",
      "race": "hybride_GM",
      "type_floral": "B",
      "peau": "lisse_vert_brillant",
      "poids_g": [
        250,
        400
      ],
      "huile_pct": [
        15,
        18
      ],
      "maturite_mois": [
        "Oct",
        "Nov",
        "Dec"
      ],
      "alternance": "moderee",
      "vigueur": "forte",
      "port": "etale",
      "froid_min_C": -4,
      "salinite": "moyenne",
      "pollinisateur": true
    },
    {
      "code": "LAMB_HASS",
      "nom": "Lamb Hass",
      "race": "guatemalteque",
      "type_floral": "A",
      "peau": "rugueuse_noire",
      "poids_g": [
        250,
        400
      ],
      "huile_pct": [
        18,
        22
      ],
      "maturite_mois": [
        "Avr",
        "Mai",
        "Juin",
        "Juil",
        "Aout"
      ],
      "alternance": "faible",
      "vigueur": "moyenne",
      "port": "compact",
      "froid_min_C": -3,
      "salinite": "sensible",
      "rendement_kg_arbre": {
        "3-4_ans": [
          8,
          18
        ],
        "5-7_ans": [
          40,
          75
        ],
        "8-12_ans": [
          90,
          170
        ],
        "13-20_ans": [
          140,
          230
        ],
        "plus_20_ans": [
          120,
          200
        ]
      }
    }
  ],
  "types_floraux": {
    "description": "Dichogamie protogyne synchrone",
    "type_A": {
      "jour_1_matin": "femelle_receptif",
      "jour_1_apres_midi": "ferme",
      "jour_2_matin": "ferme",
      "jour_2_apres_midi": "male_pollen",
      "varietes": [
        "Hass",
        "Pinkerton",
        "Reed",
        "Gwen",
        "Lamb Hass"
      ]
    },
    "type_B": {
      "jour_1_matin": "ferme",
      "jour_1_apres_midi": "femelle_receptif",
      "jour_2_matin": "male_pollen",
      "jour_2_apres_midi": "ferme",
      "varietes": [
        "Fuerte",
        "Bacon",
        "Zutano",
        "Ettinger",
        "Edranol"
      ]
    },
    "ratio_pollinisateur": "1 type B pour 8-10 type A",
    "ruches_ha": [
      4,
      6
    ]
  },
  "systemes": {
    "traditionnel": {
      "densite_arbres_ha": [
        100,
        150
      ],
      "ecartement_m": "10×8 à 12×10",
      "irrigation": "gravitaire_ou_gag",
      "entree_production_annee": [
        5,
        6
      ],
      "pleine_production_annee": [
        10,
        12
      ],
      "duree_vie_ans": [
        40,
        50
      ],
      "rendement_pleine_prod_t_ha": [
        8,
        12
      ]
    },
    "intensif": {
      "densite_arbres_ha": [
        200,
        400
      ],
      "ecartement_m": "6×4 à 8×5",
      "irrigation": "goutte_a_goutte",
      "entree_production_annee": [
        3,
        4
      ],
      "pleine_production_annee": [
        6,
        8
      ],
      "duree_vie_ans": [
        25,
        35
      ],
      "rendement_pleine_prod_t_ha": [
        12,
        20
      ]
    },
    "super_intensif": {
      "densite_arbres_ha": [
        800,
        1200
      ],
      "ecartement_m": "4×2 à 5×2.5",
      "irrigation": "gag_haute_frequence",
      "entree_production_annee": [
        2,
        3
      ],
      "pleine_production_annee": [
        4,
        5
      ],
      "duree_vie_ans": [
        15,
        20
      ],
      "rendement_pleine_prod_t_ha": [
        18,
        30
      ]
    }
  },
  "seuils_satellite": {
    "traditionnel": {
      "NDVI": {
        "optimal": [
          0.55,
          0.75
        ],
        "vigilance": 0.5,
        "alerte": 0.45
      },
      "NIRv": {
        "optimal": [
          0.15,
          0.3
        ],
        "vigilance": 0.12,
        "alerte": 0.1
      },
      "NDMI": {
        "optimal": [
          0.2,
          0.4
        ],
        "vigilance": 0.15,
        "alerte": 0.12
      },
      "NDRE": {
        "optimal": [
          0.2,
          0.35
        ],
        "vigilance": 0.17,
        "alerte": 0.15
      }
    },
    "intensif": {
      "NDVI": {
        "optimal": [
          0.65,
          0.82
        ],
        "vigilance": 0.6,
        "alerte": 0.55
      },
      "NIRv": {
        "optimal": [
          0.2,
          0.38
        ],
        "vigilance": 0.17,
        "alerte": 0.15
      },
      "NDMI": {
        "optimal": [
          0.25,
          0.45
        ],
        "vigilance": 0.2,
        "alerte": 0.17
      },
      "NDRE": {
        "optimal": [
          0.25,
          0.4
        ],
        "vigilance": 0.22,
        "alerte": 0.2
      }
    },
    "super_intensif": {
      "NDVI": {
        "optimal": [
          0.7,
          0.88
        ],
        "vigilance": 0.65,
        "alerte": 0.6
      },
      "NIRv": {
        "optimal": [
          0.25,
          0.45
        ],
        "vigilance": 0.22,
        "alerte": 0.2
      },
      "NDMI": {
        "optimal": [
          0.3,
          0.5
        ],
        "vigilance": 0.25,
        "alerte": 0.22
      },
      "NDRE": {
        "optimal": [
          0.28,
          0.45
        ],
        "vigilance": 0.25,
        "alerte": 0.23
      }
    }
  },
  "stades_phenologiques": [
    {
      "nom": "Repos relatif",
      "mois": [
        "Dec",
        "Jan"
      ],
      "duree_sem": [
        6,
        8
      ],
      "coef_nirvp": 0.7
    },
    {
      "nom": "Flush végétatif 1",
      "mois": [
        "Fev",
        "Mar"
      ],
      "duree_sem": [
        4,
        6
      ],
      "coef_nirvp": 1.0
    },
    {
      "nom": "Induction florale",
      "mois": [
        "Jan",
        "Fev"
      ],
      "duree_sem": [
        4,
        6
      ],
      "coef_nirvp": 0.8
    },
    {
      "nom": "Boutons floraux",
      "mois": [
        "Fev",
        "Mar"
      ],
      "duree_sem": [
        2,
        4
      ],
      "coef_nirvp": 0.85
    },
    {
      "nom": "Floraison",
      "mois": [
        "Mar",
        "Avr",
        "Mai"
      ],
      "duree_sem": [
        4,
        8
      ],
      "coef_nirvp": 0.9
    },
    {
      "nom": "Nouaison",
      "mois": [
        "Avr",
        "Mai"
      ],
      "duree_sem": [
        4,
        6
      ],
      "coef_nirvp": 0.9
    },
    {
      "nom": "Chute physiologique",
      "mois": [
        "Mai",
        "Juin",
        "Juil"
      ],
      "duree_sem": [
        8,
        12
      ],
      "coef_nirvp": 0.85
    },
    {
      "nom": "Grossissement",
      "mois": [
        "Juin",
        "Dec"
      ],
      "duree_mois": [
        5,
        8
      ],
      "coef_nirvp": 1.0
    },
    {
      "nom": "Flush végétatif 2",
      "mois": [
        "Juil",
        "Aout"
      ],
      "duree_sem": [
        4,
        6
      ],
      "coef_nirvp": 1.0
    },
    {
      "nom": "Maturation",
      "mois": "variable_variete",
      "coef_nirvp": 0.85
    }
  ],
  "exigences_climatiques": {
    "temperature_optimale_C": [
      20,
      25
    ],
    "temperature_croissance_C": [
      15,
      30
    ],
    "temperature_stress_chaleur_C": 35,
    "temperature_stress_froid_C": 10,
    "gel_feuilles_hass_C": [
      -2,
      -3
    ],
    "gel_mortel_hass_C": [
      -4,
      -6
    ],
    "gel_race_mexicaine_C": [
      -6,
      -8
    ],
    "gel_race_antillaise_C": [
      0,
      -2
    ],
    "humidite_relative_optimale_pct": [
      60,
      80
    ],
    "humidite_relative_min_pct": 40,
    "pluviometrie_optimale_mm": [
      1200,
      1800
    ]
  },
  "exigences_sol": {
    "pH_optimal": [
      5.5,
      6.5
    ],
    "pH_tolerance": [
      5.0,
      7.5
    ],
    "calcaire_actif_max_pct": 5,
    "CE_sol_optimal_dS_m": 1.5,
    "CE_sol_max_dS_m": 2.5,
    "texture": "sablo_limoneux",
    "drainage": "excellent_obligatoire",
    "profondeur_utile_min_cm": 60,
    "matiere_organique_min_pct": 2,
    "nappe_phreatique_min_cm": 100,
    "note": "TRÈS sensible asphyxie - Phytophthora si mal drainé"
  },
  "options_nutrition": {
    "A": {
      "nom": "Nutrition équilibrée",
      "condition": "analyse_sol < 2 ans ET analyse_eau",
      "description": "Programme complet sol + plante"
    },
    "B": {
      "nom": "Nutrition foliaire prioritaire",
      "condition": "PAS analyse_sol OU > 3 ans",
      "description": "Foliaire renforcé"
    },
    "C": {
      "nom": "Gestion salinité",
      "condition": "CE_eau > 1.5 dS/m OU CE_sol > 2 dS/m",
      "seuil_plus_bas_que_olivier": true,
      "description": "Lessivage + engrais faible index salin"
    }
  },
  "export_kg_tonne": {
    "N": [
      2.5,
      3.5
    ],
    "P2O5": [
      0.5,
      0.8
    ],
    "K2O": [
      4.0,
      5.5
    ],
    "CaO": [
      0.3,
      0.5
    ],
    "MgO": [
      0.4,
      0.6
    ],
    "S": [
      0.2,
      0.3
    ]
  },
  "entretien_kg_ha": {
    "jeune_1-3_ans": {
      "N": [
        30,
        60
      ],
      "P2O5": [
        15,
        30
      ],
      "K2O": [
        20,
        40
      ]
    },
    "entree_prod_4-6_ans": {
      "N": [
        80,
        120
      ],
      "P2O5": [
        30,
        50
      ],
      "K2O": [
        60,
        100
      ]
    },
    "intensif_pleine_prod": {
      "N": [
        150,
        250
      ],
      "P2O5": [
        50,
        80
      ],
      "K2O": [
        150,
        250
      ]
    },
    "super_intensif": {
      "N": [
        200,
        350
      ],
      "P2O5": [
        60,
        100
      ],
      "K2O": [
        200,
        350
      ]
    }
  },
  "fractionnement_pct": {
    "jan_fev": {
      "N": 15,
      "P2O5": 30,
      "K2O": 10,
      "objectif": "Préparer floraison"
    },
    "mar_avr": {
      "N": 20,
      "P2O5": 30,
      "K2O": 15,
      "objectif": "Floraison-nouaison"
    },
    "mai_juin": {
      "N": 20,
      "P2O5": 20,
      "K2O": 20,
      "objectif": "Post-chute"
    },
    "juil_aout": {
      "N": 20,
      "P2O5": 10,
      "K2O": 25,
      "objectif": "Grossissement, flush 2"
    },
    "sept_oct": {
      "N": 15,
      "P2O5": 10,
      "K2O": 20,
      "objectif": "Maturation"
    },
    "nov_dec": {
      "N": 10,
      "P2O5": 0,
      "K2O": 10,
      "objectif": "Reconstitution"
    }
  },
  "formes_engrais": {
    "N_recommande": [
      "nitrate_calcium",
      "nitrate_ammonium",
      "uree_si_pH<7"
    ],
    "N_eviter": [
      "uree_si_pH>7"
    ],
    "P_recommande": [
      "MAP",
      "acide_phosphorique"
    ],
    "P_eviter": [
      "DAP_haute_dose"
    ],
    "K_recommande": [
      "sulfate_potasse"
    ],
    "K_interdit": [
      "chlorure_potasse"
    ],
    "note_KCl": "STRICTEMENT INTERDIT - très sensible au chlore"
  },
  "seuils_foliaires": {
    "periode_prelevement": "Août-Septembre, feuilles 5-7 mois",
    "N": {
      "unite": "%",
      "carence": 1.6,
      "suffisant": [
        1.6,
        1.8
      ],
      "optimal": [
        1.8,
        2.2
      ],
      "exces": 2.5
    },
    "P": {
      "unite": "%",
      "carence": 0.08,
      "suffisant": [
        0.08,
        0.1
      ],
      "optimal": [
        0.1,
        0.25
      ],
      "exces": 0.3
    },
    "K": {
      "unite": "%",
      "carence": 0.75,
      "suffisant": [
        0.75,
        1.0
      ],
      "optimal": [
        1.0,
        2.0
      ],
      "exces": 3.0
    },
    "Ca": {
      "unite": "%",
      "carence": 1.0,
      "suffisant": [
        1.0,
        1.5
      ],
      "optimal": [
        1.5,
        3.0
      ],
      "exces": 4.0
    },
    "Mg": {
      "unite": "%",
      "carence": 0.25,
      "suffisant": [
        0.25,
        0.4
      ],
      "optimal": [
        0.4,
        0.8
      ],
      "exces": 1.0
    },
    "Fe": {
      "unite": "ppm",
      "carence": 50,
      "suffisant": [
        50,
        80
      ],
      "optimal": [
        80,
        200
      ],
      "exces": 300
    },
    "Zn": {
      "unite": "ppm",
      "carence": 30,
      "suffisant": [
        30,
        50
      ],
      "optimal": [
        50,
        100
      ],
      "exces": 200
    },
    "Mn": {
      "unite": "ppm",
      "carence": 25,
      "suffisant": [
        25,
        50
      ],
      "optimal": [
        50,
        200
      ],
      "exces": 500
    },
    "B": {
      "unite": "ppm",
      "carence": 30,
      "suffisant": [
        30,
        50
      ],
      "optimal": [
        50,
        100
      ],
      "exces": 150
    },
    "Cu": {
      "unite": "ppm",
      "carence": 5,
      "suffisant": [
        5,
        10
      ],
      "optimal": [
        10,
        25
      ],
      "exces": 40
    },
    "Cl": {
      "unite": "%",
      "toxique": 0.25
    },
    "Na": {
      "unite": "%",
      "toxique": 0.25
    }
  },
  "seuils_eau_salinite": {
    "CE_tolerance_dS_m": 1.0,
    "CE_problematique_dS_m": 1.5,
    "CE_deconseille_dS_m": 2.0,
    "Cl_tolerance_mg_L": 50,
    "Cl_toxique_mg_L": 100,
    "Na_tolerance_mg_L": 50,
    "Na_toxique_mg_L": 100,
    "B_tolerance_mg_L": 0.5,
    "B_toxique_mg_L": 1.0,
    "SAR_max": 5,
    "note": "2-3× plus sensible que olivier"
  },
  "kc": {
    "jeune_1-3_ans": {
      "jan_fev": 0.5,
      "mar_avr": 0.55,
      "mai_juin": 0.6,
      "juil_aout": 0.65,
      "sept_oct": 0.6,
      "nov_dec": 0.55
    },
    "adulte_plus_6_ans": {
      "jan_fev": 0.7,
      "mar_avr": 0.75,
      "mai_juin": 0.8,
      "juil_aout": 0.85,
      "sept_oct": 0.8,
      "nov_dec": 0.75
    }
  },
  "irrigation": {
    "sensibilite": "elevee_stress_et_exces",
    "note": "Ne tolère ni stress hydrique ni excès eau (Phytophthora)",
    "frequence": "frequente_petites_doses",
    "tensiometre_seuil_sol_leger_cbar": [
      25,
      30
    ],
    "tensiometre_seuil_sol_limoneux_cbar": [
      35,
      40
    ]
  },
  "phytosanitaire": {
    "maladies": [
      {
        "nom": "Phytophthora",
        "agent": "Phytophthora cinnamomi",
        "gravite": "maladie_n1_devastatrice",
        "conditions": "sol_mal_draine_exces_eau_T_20-30",
        "prevention": [
          "drainage_excellent",
          "porte_greffe_tolerant",
          "jamais_saturer_sol"
        ],
        "traitement": {
          "phosphonate_injection": {
            "dose": "20-30 mL/L",
            "frequence": "2-3x/an"
          },
          "phosphonate_foliaire": {
            "dose": "5 mL/L",
            "frequence": "4-6x/an"
          },
          "metalaxyl_sol": {
            "dose": "2-3 g/m²",
            "condition": "infection_active"
          }
        }
      },
      {
        "nom": "Anthracnose",
        "agent": "Colletotrichum gloeosporioides",
        "conditions": "HR_elevee_pluie_T_20-25",
        "traitement": {
          "cuivre": {
            "dose_kg_ha": 2,
            "DAR_jours": 14
          }
        }
      },
      {
        "nom": "Cercospora",
        "agent": "Cercospora purpurea",
        "traitement": {
          "cuivre": {
            "dose_kg_ha": [
              2,
              3
            ],
            "applications": [
              2,
              3
            ]
          }
        }
      }
    ],
    "ravageurs": [
      {
        "nom": "Thrips",
        "periode": "floraison",
        "traitement": "Spinosad 0.2 L/ha"
      },
      {
        "nom": "Acariens",
        "periode": "ete_sec",
        "traitement": "Abamectine 0.5 L/ha"
      },
      {
        "nom": "Cochenilles",
        "periode": "toute_annee",
        "traitement": "Huile blanche 15 L/ha"
      },
      {
        "nom": "Scolytes",
        "condition": "arbres_stresses",
        "traitement": "eliminer_branches"
      }
    ]
  },
  "calendrier_phyto_preventif": {
    "jan_fev": {
      "cible": "Phosphonate préventif",
      "produit": "Phosphonate K",
      "dose": "5 mL/L foliaire"
    },
    "mars": {
      "cible": "Anthracnose floraison",
      "produit": "Cuivre",
      "dose": "2 kg/ha",
      "condition": "si_HR_elevee"
    },
    "avr_mai": {
      "cible": "Thrips",
      "produit": "Spinosad",
      "dose": "0.2 L/ha",
      "condition": "si_presence"
    },
    "juin": {
      "cible": "Phosphonate",
      "produit": "Phosphonate K",
      "mode": "injection_tronc"
    },
    "aout_sept": {
      "cible": "Anthracnose pré-récolte",
      "produit": "Cuivre",
      "dose": "2 kg/ha",
      "DAR": "21j"
    },
    "nov": {
      "cible": "Phosphonate",
      "produit": "Phosphonate K",
      "dose": "5 mL/L foliaire"
    }
  },
  "maturite_recolte": {
    "critere_principal": "matiere_seche_ou_huile",
    "note": "Avocat ne mûrit PAS sur arbre - maturité physiologique",
    "seuils_hass": {
      "matiere_seche_min_pct": 21,
      "huile_min_pct": 8
    },
    "seuils_fuerte": {
      "matiere_seche_min_pct": 19,
      "huile_min_pct": 8
    },
    "methodes": [
      "sechage_etuve",
      "extraction_soxhlet",
      "flottaison",
      "jours_floraison"
    ],
    "conservation_hass": {
      "temperature_C": [
        5,
        7
      ],
      "duree_semaines": [
        2,
        4
      ]
    }
  },
  "alertes": [
    {
      "code": "AVO-01",
      "nom": "Stress hydrique",
      "seuil": "NDMI < P15 (2 passages) + T > 30",
      "priorite": "urgente"
    },
    {
      "code": "AVO-02",
      "nom": "Excès eau / Phytophthora",
      "seuil": "NDMI > P95 + pluie > 50mm/sem",
      "priorite": "urgente"
    },
    {
      "code": "AVO-03",
      "nom": "Risque gel",
      "seuil": "Tmin prévue < 2°C",
      "priorite": "urgente"
    },
    {
      "code": "AVO-04",
      "nom": "Gel avéré",
      "seuil": "Tmin mesurée < 0°C",
      "priorite": "urgente"
    },
    {
      "code": "AVO-05",
      "nom": "Canicule",
      "seuil": "Tmax > 38°C (3j) + HR < 30%",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-06",
      "nom": "Vent chaud sec",
      "seuil": "T > 35 + HR < 25% + vent > 25 km/h",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-07",
      "nom": "Conditions Phytophthora",
      "seuil": "Sol saturé > 48h + T 20-28",
      "priorite": "urgente"
    },
    {
      "code": "AVO-08",
      "nom": "Symptômes Phytophthora",
      "seuil": "NIRv ↘ progressif + feuilles pâles",
      "priorite": "urgente"
    },
    {
      "code": "AVO-09",
      "nom": "Risque anthracnose",
      "seuil": "HR > 85% + pluie + T 20-25 (floraison)",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-10",
      "nom": "Pression thrips",
      "seuil": "Floraison + T 20-28 + captures",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-11",
      "nom": "Carence Zn probable",
      "seuil": "NDRE < P10 + feuilles petites rondes",
      "priorite": "vigilance"
    },
    {
      "code": "AVO-12",
      "nom": "Carence Fe",
      "seuil": "NDRE < P10 + GCI ↘ + pH sol > 7.5",
      "priorite": "vigilance"
    },
    {
      "code": "AVO-13",
      "nom": "Toxicité Cl/Na",
      "seuil": "Brûlures foliaires + CE sol > 2.5",
      "priorite": "urgente"
    },
    {
      "code": "AVO-14",
      "nom": "Floraison faible",
      "seuil": "Floraison < 50% attendue",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-15",
      "nom": "Chute excessive",
      "seuil": "Charge < 30% post-nouaison",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-16",
      "nom": "Maturité récolte",
      "seuil": "MS ≥ 21% (Hass)",
      "priorite": "info"
    },
    {
      "code": "AVO-17",
      "nom": "Année OFF probable",
      "seuil": "N-1 très productif + flush faible",
      "priorite": "prioritaire"
    },
    {
      "code": "AVO-18",
      "nom": "Dépérissement",
      "seuil": "NIRv ↘ > 20% (4 passages)",
      "priorite": "urgente"
    },
    {
      "code": "AVO-19",
      "nom": "Arbre mort",
      "seuil": "NDVI < 0.30 persistant 3 mois",
      "priorite": "urgente"
    },
    {
      "code": "AVO-20",
      "nom": "Croissance excessive",
      "seuil": "NDVI ↗ > 15% + pas de fruits",
      "priorite": "vigilance"
    }
  ],
  "modele_predictif": {
    "difficulte": "plus_difficile_que_olivier",
    "raisons": [
      "Floraison difficile à détecter par satellite",
      "Chute physiologique très variable (80-99%)",
      "Fruit reste longtemps sur arbre"
    ],
    "precision_attendue": {
      "traditionnel": {
        "R2": [
          0.3,
          0.5
        ],
        "MAE_pct": [
          35,
          50
        ]
      },
      "intensif": {
        "R2": [
          0.4,
          0.6
        ],
        "MAE_pct": [
          25,
          40
        ]
      },
      "super_intensif": {
        "R2": [
          0.5,
          0.7
        ],
        "MAE_pct": [
          20,
          35
        ]
      }
    },
    "recommandation": "Comptage fruits sur échantillon reste méthode la plus fiable"
  },
  "biostimulants": {
    "calendrier": {
      "jan": {
        "algues": "3 L/ha",
        "objectif": "Préparer floraison"
      },
      "fev_mar": {
        "algues": "3 L/ha",
        "amines": "4 L/ha foliaire",
        "objectif": "Nouaison critique"
      },
      "avr_mai": {
        "humiques": "4 L/ha",
        "amines": "4 L/ha",
        "objectif": "Limiter chute"
      },
      "juin_juil": {
        "algues": "3 L/ha",
        "objectif": "Stress chaleur"
      },
      "aout_sept": {
        "humiques": "4 L/ha",
        "amines": "4 L/ha",
        "objectif": "Flush 2"
      },
      "nov_dec": {
        "humiques_granule": "20 kg/ha",
        "amines_fertig": "5 L/ha",
        "objectif": "Reconstitution"
      }
    },
    "focus_nouaison": "Période Mars-Mai critique - concentrer biostimulants"
  },
  "plan_annuel_type_intensif_hass_15T": {
    "jan": {
      "NPK": "N25+P15+K15",
      "micro": "Zn foliaire",
      "biostim": "Algues",
      "phyto": "Phosphonate",
      "irrigation_L_sem": 80
    },
    "fev": {
      "NPK": "N25+K15",
      "micro": null,
      "biostim": null,
      "phyto": null,
      "irrigation_L_sem": 100
    },
    "mar": {
      "NPK": "N30+P15+K20",
      "micro": "B floraison",
      "biostim": "Algues+Aminés",
      "phyto": "Cuivre si pluie",
      "irrigation_L_sem": 120
    },
    "avr": {
      "NPK": "N25+K20",
      "micro": "Zn foliaire",
      "biostim": "Aminés",
      "phyto": null,
      "irrigation_L_sem": 150
    },
    "mai": {
      "NPK": "N25+P10+K25",
      "micro": null,
      "biostim": null,
      "phyto": "Spinosad si thrips",
      "irrigation_L_sem": 170
    },
    "juin": {
      "NPK": "N25+K30",
      "micro": "Fe-EDDHA",
      "biostim": "Humiques",
      "phyto": "Phosphonate injection",
      "irrigation_L_sem": 200
    },
    "juil": {
      "NPK": "N20+K30",
      "micro": "Zn foliaire",
      "biostim": null,
      "phyto": null,
      "irrigation_L_sem": 200
    },
    "aout": {
      "NPK": "N20+P10+K25",
      "micro": null,
      "biostim": "Algues",
      "phyto": null,
      "irrigation_L_sem": 180
    },
    "sept": {
      "NPK": "N15+K20",
      "micro": "Zn+Mn",
      "biostim": "Aminés",
      "phyto": "Cuivre pré-récolte",
      "irrigation_L_sem": 150
    },
    "oct": {
      "NPK": "N15+K15",
      "micro": null,
      "biostim": null,
      "phyto": null,
      "irrigation_L_sem": 120
    },
    "nov": {
      "NPK": "N10+K10",
      "micro": null,
      "biostim": "Humiques",
      "phyto": "Phosphonate foliaire",
      "irrigation_L_sem": 80
    },
    "dec": {
      "NPK": "N10",
      "micro": null,
      "biostim": "Aminés",
      "phyto": null,
      "irrigation_L_sem": 60
    }
  }
}$crop_ai_ref_avocatier$::jsonb
)
ON CONFLICT (crop_type) DO UPDATE SET
  version = EXCLUDED.version,
  reference_data = EXCLUDED.reference_data,
  updated_at = NOW();

INSERT INTO public.crop_ai_references (crop_type, version, reference_data)
VALUES (
  'olivier',
  '5.0',
  $crop_ai_ref_olivier${
  "metadata": {
    "version": "5.0",
    "date": "2026-03",
    "culture": "olivier",
    "pays": "Maroc",
    "usage": "LLM_direct_read — no parser needed",
    "conventions": {
      "mois": "English 3-letter: Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec",
      "ranges": "Always [min, max] arrays — never single number when a range exists",
      "doses": "Always {value: number, unit: string} — never freetext",
      "conditions": "Always list of {field, operator, value} objects",
      "nulls": "null = not applicable. Use 0 only for a real zero value."
    }
  },
  "varietes": [
    {
      "code": "PM",
      "nom": "Picholine Marocaine",
      "origine": "Maroc",
      "usage": "double_fin",
      "fruit_g": [
        3.5,
        5.0
      ],
      "huile_pct": [
        16,
        20
      ],
      "alternance_index": 0.35,
      "systemes_compatibles": [
        "traditionnel",
        "intensif"
      ],
      "sensibilites": {
        "oeil_paon": "sensible",
        "verticilliose": "sensible",
        "froid_min_c": -10,
        "salinite": "moderee",
        "secheresse": "bonne"
      },
      "heures_froid_requises": [
        100,
        200
      ],
      "duree_vie_economique_ans": null,
      "rendement_kg_arbre": {
        "ans_3_5": [
          2,
          5
        ],
        "ans_6_10": [
          10,
          25
        ],
        "ans_11_20": [
          30,
          50
        ],
        "ans_21_40": [
          40,
          70
        ],
        "ans_40_plus": [
          30,
          50
        ]
      }
    },
    {
      "code": "HAO",
      "nom": "Haouzia",
      "origine": "INRA Maroc",
      "usage": "double_fin",
      "fruit_g": [
        3.5,
        4.5
      ],
      "huile_pct": [
        22,
        24
      ],
      "alternance_index": 0.22,
      "systemes_compatibles": [
        "traditionnel",
        "intensif"
      ],
      "sensibilites": {
        "oeil_paon": "resistante",
        "verticilliose": "sensible",
        "froid_min_c": -8,
        "salinite": "bonne",
        "secheresse": "tres_bonne"
      },
      "heures_froid_requises": [
        100,
        150
      ],
      "duree_vie_economique_ans": null,
      "rendement_kg_arbre": {
        "ans_3_5": [
          3,
          8
        ],
        "ans_6_10": [
          15,
          35
        ],
        "ans_11_20": [
          40,
          60
        ],
        "ans_21_40": [
          50,
          80
        ],
        "ans_40_plus": [
          40,
          60
        ]
      }
    },
    {
      "code": "MEN",
      "nom": "Menara",
      "origine": "INRA Maroc",
      "usage": "double_fin",
      "fruit_g": [
        2.5,
        4.0
      ],
      "huile_pct": [
        23,
        24
      ],
      "alternance_index": 0.28,
      "systemes_compatibles": [
        "traditionnel",
        "intensif"
      ],
      "sensibilites": {
        "oeil_paon": "resistante",
        "verticilliose": "sensible",
        "froid_min_c": -8,
        "salinite": "bonne",
        "secheresse": "tres_bonne"
      },
      "heures_froid_requises": [
        100,
        150
      ],
      "duree_vie_economique_ans": null,
      "rendement_kg_arbre": {
        "ans_3_5": [
          5,
          12
        ],
        "ans_6_10": [
          25,
          45
        ],
        "ans_11_20": [
          45,
          65
        ],
        "ans_21_40": [
          50,
          70
        ],
        "ans_40_plus": [
          40,
          55
        ]
      }
    },
    {
      "code": "ARB",
      "nom": "Arbequina",
      "origine": "Espagne",
      "usage": "huile",
      "fruit_g": [
        1.2,
        1.8
      ],
      "huile_pct": [
        16,
        20
      ],
      "alternance_index": 0.35,
      "systemes_compatibles": [
        "super_intensif"
      ],
      "sensibilites": {
        "oeil_paon": "moyenne",
        "verticilliose": "moyenne",
        "froid_min_c": -5,
        "salinite": "moyenne",
        "secheresse": "moyenne"
      },
      "heures_froid_requises": [
        200,
        400
      ],
      "duree_vie_economique_ans": 15,
      "rendement_kg_arbre": {
        "ans_3_5": [
          3,
          6
        ],
        "ans_6_10": [
          6,
          10
        ],
        "ans_11_20": [
          8,
          12
        ],
        "ans_21_40": null,
        "ans_40_plus": null
      },
      "note_rendement": "Declin economique apres 15 ans — arrachage recommande"
    },
    {
      "code": "ARS",
      "nom": "Arbosana",
      "origine": "Espagne",
      "usage": "huile",
      "fruit_g": [
        1.5,
        2.5
      ],
      "huile_pct": [
        19,
        21
      ],
      "alternance_index": 0.18,
      "systemes_compatibles": [
        "super_intensif"
      ],
      "sensibilites": {
        "oeil_paon": "tres_resistante",
        "verticilliose": "bonne",
        "froid_min_c": -5,
        "salinite": "moyenne",
        "secheresse": "moyenne"
      },
      "heures_froid_requises": [
        200,
        350
      ],
      "duree_vie_economique_ans": 18,
      "rendement_kg_arbre": {
        "ans_3_5": [
          4,
          7
        ],
        "ans_6_10": [
          7,
          12
        ],
        "ans_11_20": [
          10,
          15
        ],
        "ans_21_40": null,
        "ans_40_plus": null
      },
      "note_rendement": "Declin economique apres 18 ans — arrachage recommande"
    },
    {
      "code": "KOR",
      "nom": "Koroneiki",
      "origine": "Grece",
      "usage": "huile",
      "fruit_g": [
        0.8,
        1.5
      ],
      "huile_pct": [
        20,
        25
      ],
      "alternance_index": 0.15,
      "systemes_compatibles": [
        "super_intensif"
      ],
      "sensibilites": {
        "oeil_paon": "moyenne",
        "verticilliose": "moyenne",
        "froid_min_c": -5,
        "salinite": "bonne",
        "secheresse": "bonne"
      },
      "heures_froid_requises": [
        150,
        300
      ],
      "duree_vie_economique_ans": 18,
      "rendement_kg_arbre": {
        "ans_3_5": [
          3,
          5
        ],
        "ans_6_10": [
          5,
          9
        ],
        "ans_11_20": [
          7,
          11
        ],
        "ans_21_40": null,
        "ans_40_plus": null
      },
      "note_rendement": "Declin economique apres 18 ans — arrachage recommande"
    },
    {
      "code": "PIC",
      "nom": "Picual",
      "origine": "Espagne",
      "usage": "huile",
      "fruit_g": [
        3.0,
        4.5
      ],
      "huile_pct": [
        22,
        27
      ],
      "alternance_index": 0.3,
      "systemes_compatibles": [
        "intensif"
      ],
      "sensibilites": {
        "oeil_paon": "sensible",
        "verticilliose": "tres_sensible",
        "froid_min_c": -10,
        "salinite": "moyenne",
        "secheresse": "bonne"
      },
      "heures_froid_requises": [
        400,
        600
      ],
      "duree_vie_economique_ans": null,
      "rendement_kg_arbre": {
        "ans_3_5": [
          5,
          12
        ],
        "ans_6_10": [
          25,
          45
        ],
        "ans_11_20": [
          40,
          60
        ],
        "ans_21_40": [
          45,
          65
        ],
        "ans_40_plus": [
          35,
          50
        ]
      }
    }
  ],
  "systemes": {
    "traditionnel": {
      "nom": "Traditionnel (Pluvial)",
      "densite_arbres_ha": [
        80,
        200
      ],
      "surface_arbre_m2": [
        50,
        125
      ],
      "ecartement": {
        "min": {
          "rang_m": 8.0,
          "arbre_m": 8.0
        },
        "max": {
          "rang_m": 12.0,
          "arbre_m": 12.0
        }
      },
      "irrigation": "aucune",
      "recolte": "manuelle_gaulage",
      "entree_production_annee": [
        5,
        7
      ],
      "pleine_production_annee": [
        12,
        20
      ],
      "duree_vie_economique_ans": [
        80,
        100
      ],
      "rendement_pleine_prod_t_ha": [
        1,
        4
      ],
      "sol_visible_pct": [
        60,
        80
      ],
      "indice_satellite_cle": "MSAVI"
    },
    "intensif": {
      "nom": "Intensif (Irrigue)",
      "densite_arbres_ha": [
        200,
        600
      ],
      "surface_arbre_m2": [
        17,
        50
      ],
      "ecartement": {
        "min": {
          "rang_m": 6.0,
          "arbre_m": 5.0
        },
        "max": {
          "rang_m": 7.0,
          "arbre_m": 7.0
        }
      },
      "irrigation": "goutte_a_goutte",
      "recolte": "vibreur_tronc",
      "entree_production_annee": [
        4,
        5
      ],
      "pleine_production_annee": [
        7,
        10
      ],
      "duree_vie_economique_ans": [
        50,
        80
      ],
      "rendement_pleine_prod_t_ha": [
        6,
        12
      ],
      "sol_visible_pct": [
        40,
        60
      ],
      "indice_satellite_cle": "NIRv"
    },
    "super_intensif": {
      "nom": "Super-intensif (Haie)",
      "densite_arbres_ha": [
        1200,
        2000
      ],
      "surface_arbre_m2": [
        2,
        5
      ],
      "ecartement": {
        "min": {
          "rang_m": 3.75,
          "arbre_m": 1.35
        },
        "max": {
          "rang_m": 4.0,
          "arbre_m": 1.5
        }
      },
      "irrigation": "goutte_a_goutte_obligatoire",
      "recolte": "enjambeur_mecanique",
      "entree_production_annee": [
        2,
        3
      ],
      "pleine_production_annee": [
        4,
        6
      ],
      "duree_vie_economique_ans": [
        15,
        20
      ],
      "rendement_pleine_prod_t_ha": [
        10,
        20
      ],
      "sol_visible_pct": [
        20,
        40
      ],
      "indice_satellite_cle": "NDVI"
    }
  },
  "seuils_satellite": {
    "traditionnel": {
      "NDVI": {
        "optimal": [
          0.3,
          0.5
        ],
        "vigilance": 0.25,
        "alerte": 0.2
      },
      "NIRv": {
        "optimal": [
          0.05,
          0.15
        ],
        "vigilance": 0.04,
        "alerte": 0.03
      },
      "NDMI": {
        "optimal": [
          0.05,
          0.2
        ],
        "vigilance": 0.04,
        "alerte": 0.03
      },
      "NDRE": {
        "optimal": [
          0.1,
          0.25
        ],
        "vigilance": 0.08,
        "alerte": 0.07
      },
      "MSI": {
        "optimal": [
          0.8,
          1.5
        ],
        "vigilance": 1.8,
        "alerte": 2.0
      }
    },
    "intensif": {
      "NDVI": {
        "optimal": [
          0.4,
          0.6
        ],
        "vigilance": 0.35,
        "alerte": 0.3
      },
      "NIRv": {
        "optimal": [
          0.08,
          0.22
        ],
        "vigilance": 0.07,
        "alerte": 0.06
      },
      "NDMI": {
        "optimal": [
          0.1,
          0.3
        ],
        "vigilance": 0.08,
        "alerte": 0.06
      },
      "NDRE": {
        "optimal": [
          0.15,
          0.3
        ],
        "vigilance": 0.12,
        "alerte": 0.1
      },
      "MSI": {
        "optimal": [
          0.6,
          1.2
        ],
        "vigilance": 1.4,
        "alerte": 1.6
      }
    },
    "super_intensif": {
      "NDVI": {
        "optimal": [
          0.55,
          0.75
        ],
        "vigilance": 0.5,
        "alerte": 0.45
      },
      "NIRv": {
        "optimal": [
          0.15,
          0.35
        ],
        "vigilance": 0.12,
        "alerte": 0.1
      },
      "NDMI": {
        "optimal": [
          0.2,
          0.4
        ],
        "vigilance": 0.15,
        "alerte": 0.12
      },
      "NDRE": {
        "optimal": [
          0.2,
          0.38
        ],
        "vigilance": 0.17,
        "alerte": 0.15
      },
      "MSI": {
        "optimal": [
          0.4,
          0.9
        ],
        "vigilance": 1.1,
        "alerte": 1.3
      }
    }
  },
  "stades_bbch": [
    {
      "code": "00",
      "nom": "Dormance",
      "mois": [
        "Dec",
        "Jan"
      ],
      "gdd_cumul": [
        0,
        30
      ],
      "coef_nirvp": 0.3,
      "phase_kc": "repos"
    },
    {
      "code": "01",
      "nom": "Debut gonflement",
      "mois": [
        "Feb"
      ],
      "gdd_cumul": [
        30,
        80
      ],
      "coef_nirvp": 0.3,
      "phase_kc": "debourrement"
    },
    {
      "code": "09",
      "nom": "Feuilles emergentes",
      "mois": [
        "Feb",
        "Mar"
      ],
      "gdd_cumul": [
        80,
        200
      ],
      "coef_nirvp": 0.4,
      "phase_kc": "debourrement"
    },
    {
      "code": "15",
      "nom": "5 paires feuilles",
      "mois": [
        "Mar",
        "Apr"
      ],
      "gdd_cumul": [
        200,
        400
      ],
      "coef_nirvp": 0.6,
      "phase_kc": "croissance"
    },
    {
      "code": "37",
      "nom": "Allongement avance",
      "mois": [
        "Apr"
      ],
      "gdd_cumul": [
        400,
        500
      ],
      "coef_nirvp": 0.6,
      "phase_kc": "croissance"
    },
    {
      "code": "51",
      "nom": "Boutons floraux",
      "mois": [
        "Apr",
        "May"
      ],
      "gdd_cumul": [
        500,
        600
      ],
      "coef_nirvp": 0.8,
      "phase_kc": "floraison"
    },
    {
      "code": "55",
      "nom": "Boutons separes",
      "mois": [
        "May"
      ],
      "gdd_cumul": [
        600,
        700
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "floraison"
    },
    {
      "code": "60",
      "nom": "Debut floraison",
      "mois": [
        "May"
      ],
      "gdd_cumul": [
        800,
        900
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "floraison"
    },
    {
      "code": "65",
      "nom": "Pleine floraison",
      "mois": [
        "May"
      ],
      "gdd_cumul": [
        900,
        1000
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "floraison"
    },
    {
      "code": "69",
      "nom": "Nouaison",
      "mois": [
        "Jun"
      ],
      "gdd_cumul": [
        1100,
        1200
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "nouaison"
    },
    {
      "code": "75",
      "nom": "Fruit 50pct taille",
      "mois": [
        "Jul"
      ],
      "gdd_cumul": [
        1400,
        1800
      ],
      "coef_nirvp": 1.0,
      "phase_kc": "grossissement"
    },
    {
      "code": "79",
      "nom": "Fruit taille finale",
      "mois": [
        "Aug",
        "Sep"
      ],
      "gdd_cumul": [
        1800,
        2200
      ],
      "coef_nirvp": 0.9,
      "phase_kc": "grossissement"
    },
    {
      "code": "85",
      "nom": "Veraison avancee",
      "mois": [
        "Oct"
      ],
      "gdd_cumul": [
        2400,
        2600
      ],
      "coef_nirvp": 0.8,
      "phase_kc": "maturation"
    },
    {
      "code": "89",
      "nom": "Maturite recolte",
      "mois": [
        "Oct",
        "Nov"
      ],
      "gdd_cumul": [
        2600,
        2800
      ],
      "coef_nirvp": 0.7,
      "phase_kc": "maturation"
    },
    {
      "code": "92",
      "nom": "Post-recolte",
      "mois": [
        "Nov",
        "Dec"
      ],
      "gdd_cumul": [
        2800,
        3000
      ],
      "coef_nirvp": 0.4,
      "phase_kc": "post_recolte"
    }
  ],
  "kc": {
    "traditionnel": {
      "repos": 0.4,
      "debourrement": 0.45,
      "croissance": 0.5,
      "floraison": 0.55,
      "nouaison": 0.6,
      "grossissement": 0.65,
      "maturation": 0.55,
      "post_recolte": 0.45
    },
    "intensif": {
      "repos": 0.5,
      "debourrement": 0.55,
      "croissance": 0.6,
      "floraison": 0.65,
      "nouaison": 0.75,
      "grossissement": 0.8,
      "maturation": 0.65,
      "post_recolte": 0.55
    },
    "super_intensif": {
      "repos": 0.55,
      "debourrement": 0.6,
      "croissance": 0.65,
      "floraison": 0.7,
      "nouaison": 0.8,
      "grossissement": 0.9,
      "maturation": 0.7,
      "post_recolte": 0.6
    }
  },
  "options_nutrition": {
    "A": {
      "nom": "Nutrition equilibree",
      "conditions_requises": [
        {
          "champ": "analyse_sol_age_ans",
          "operateur": "<=",
          "valeur": 2
        },
        {
          "champ": "analyse_eau_disponible",
          "operateur": "==",
          "valeur": true
        }
      ],
      "fertigation_pct": 100,
      "foliaire": "si_carence_detectee",
      "biostimulants_pct": {
        "humiques": 100,
        "fulviques": 100,
        "amines": 100,
        "algues": 100
      },
      "description": "Programme complet sol + plante"
    },
    "B": {
      "nom": "Nutrition foliaire prioritaire",
      "conditions_requises": [
        {
          "champ": "analyse_sol_disponible",
          "operateur": "==",
          "valeur": false
        },
        {
          "OU": {
            "champ": "analyse_sol_age_ans",
            "operateur": ">",
            "valeur": 3
          }
        }
      ],
      "fertigation_pct": 70,
      "foliaire": "programme_renforce",
      "biostimulants_pct": {
        "humiques": 60,
        "fulviques": 60,
        "amines": 150,
        "algues": 100
      },
      "description": "Focus foliaire, fertigation reduite"
    },
    "C": {
      "nom": "Gestion salinite",
      "conditions_requises": [
        {
          "champ": "CE_eau_dS_m",
          "operateur": ">",
          "valeur": 2.5
        },
        {
          "OU": {
            "champ": "CE_sol_dS_m",
            "operateur": ">",
            "valeur": 3.0
          }
        }
      ],
      "fertigation": "engrais_faible_index_salin",
      "foliaire": "standard",
      "biostimulants_pct": {
        "humiques": 100,
        "fulviques": 100,
        "amines": 120,
        "algues": 150
      },
      "lessivage": true,
      "acidification_si": {
        "champ": "pH",
        "operateur": ">",
        "valeur": 7.5,
        "ET": {
          "champ": "HCO3_mg_L",
          "operateur": ">",
          "valeur": 500
        }
      },
      "gypse_si": {
        "champ": "SAR",
        "operateur": ">",
        "valeur": 6
      },
      "description": "Programme adapte eau/sol salin"
    }
  },
  "export_npk_kg_par_tonne_fruit": {
    "N": {
      "valeur": 3.5,
      "unite": "kg/t_fruit"
    },
    "P2O5": {
      "valeur": 1.2,
      "unite": "kg/t_fruit"
    },
    "K2O": {
      "valeur": 6.0,
      "unite": "kg/t_fruit"
    },
    "CaO": {
      "valeur": 1.5,
      "unite": "kg/t_fruit"
    },
    "MgO": {
      "valeur": 2.5,
      "unite": "kg/t_fruit"
    },
    "S": {
      "valeur": 0.4,
      "unite": "kg/t_fruit"
    }
  },
  "entretien_kg_ha": {
    "traditionnel": {
      "N": [
        15,
        25
      ],
      "K2O": [
        15,
        25
      ],
      "P2O5": [
        10,
        15
      ]
    },
    "intensif": {
      "N": [
        35,
        50
      ],
      "K2O": [
        35,
        50
      ],
      "P2O5": [
        15,
        25
      ]
    },
    "super_intensif": {
      "N": [
        50,
        70
      ],
      "K2O": [
        50,
        70
      ],
      "P2O5": [
        20,
        30
      ]
    }
  },
  "fractionnement_pct": [
    {
      "mois": [
        "Feb",
        "Mar"
      ],
      "stade_bbch": [
        "01",
        "15"
      ],
      "N_pct": 25,
      "P2O5_pct": 100,
      "K2O_pct": 15
    },
    {
      "mois": [
        "Apr"
      ],
      "stade_bbch": [
        "31",
        "51"
      ],
      "N_pct": 25,
      "P2O5_pct": 0,
      "K2O_pct": 15
    },
    {
      "mois": [
        "May"
      ],
      "stade_bbch": [
        "55",
        "65"
      ],
      "N_pct": 15,
      "P2O5_pct": 0,
      "K2O_pct": 20
    },
    {
      "mois": [
        "Jun"
      ],
      "stade_bbch": [
        "67",
        "71"
      ],
      "N_pct": 15,
      "P2O5_pct": 0,
      "K2O_pct": 25
    },
    {
      "mois": [
        "Jul",
        "Aug"
      ],
      "stade_bbch": [
        "75",
        "79"
      ],
      "N_pct": 10,
      "P2O5_pct": 0,
      "K2O_pct": 20
    },
    {
      "mois": [
        "Sep"
      ],
      "stade_bbch": [
        "81",
        "85"
      ],
      "N_pct": 5,
      "P2O5_pct": 0,
      "K2O_pct": 5
    },
    {
      "mois": [
        "Oct",
        "Nov"
      ],
      "stade_bbch": [
        "89",
        "92"
      ],
      "N_pct": 5,
      "P2O5_pct": 0,
      "K2O_pct": 0
    }
  ],
  "ajustement_alternance": {
    "annee_ON": {
      "N": 1.15,
      "P": 1.0,
      "K": 1.2,
      "Mg": 1.0
    },
    "annee_OFF_sain": {
      "N": 0.75,
      "P": 1.2,
      "K": 0.8,
      "Mg": 1.25
    },
    "epuisement": {
      "N": 0.85,
      "P": 1.3,
      "K": 0.7,
      "Mg": 1.4
    }
  },
  "ajustement_cible": {
    "huile_qualite": {
      "N": 1.0,
      "K": 1.0,
      "IM_cible": [
        2.0,
        3.5
      ]
    },
    "olive_table": {
      "N": 1.1,
      "K": 1.2,
      "IM_cible": [
        1.0,
        2.0
      ]
    },
    "mixte": {
      "N": 1.0,
      "K": 1.1,
      "IM_cible": [
        2.5,
        3.5
      ]
    }
  },
  "seuils_foliaires": {
    "N": {
      "unite": "%",
      "carence": 1.4,
      "suffisant": [
        1.4,
        1.6
      ],
      "optimal": [
        1.6,
        2.0
      ],
      "exces": 2.5
    },
    "P": {
      "unite": "%",
      "carence": 0.08,
      "suffisant": [
        0.08,
        0.1
      ],
      "optimal": [
        0.1,
        0.3
      ],
      "exces": 0.35
    },
    "K": {
      "unite": "%",
      "carence": 0.4,
      "suffisant": [
        0.4,
        0.8
      ],
      "optimal": [
        0.8,
        1.2
      ],
      "exces": 1.5
    },
    "Ca": {
      "unite": "%",
      "carence": 0.5,
      "suffisant": [
        0.5,
        1.0
      ],
      "optimal": [
        1.0,
        2.0
      ],
      "exces": 3.0
    },
    "Mg": {
      "unite": "%",
      "carence": 0.08,
      "suffisant": [
        0.08,
        0.1
      ],
      "optimal": [
        0.1,
        0.3
      ],
      "exces": 0.5
    },
    "Fe": {
      "unite": "ppm",
      "carence": 40,
      "suffisant": [
        40,
        60
      ],
      "optimal": [
        60,
        150
      ],
      "exces": 300
    },
    "Zn": {
      "unite": "ppm",
      "carence": 10,
      "suffisant": [
        10,
        15
      ],
      "optimal": [
        15,
        50
      ],
      "exces": 100
    },
    "Mn": {
      "unite": "ppm",
      "carence": 15,
      "suffisant": [
        15,
        20
      ],
      "optimal": [
        20,
        80
      ],
      "exces": 200
    },
    "B": {
      "unite": "ppm",
      "carence": 14,
      "suffisant": [
        14,
        19
      ],
      "optimal": [
        19,
        150
      ],
      "exces": 200
    },
    "Cu": {
      "unite": "ppm",
      "carence": 4,
      "suffisant": [
        4,
        6
      ],
      "optimal": [
        6,
        15
      ],
      "exces": 25
    },
    "Na": {
      "unite": "%",
      "toxique": 0.5
    },
    "Cl": {
      "unite": "%",
      "toxique": 0.5
    }
  },
  "seuils_eau": {
    "CE": {
      "unite": "dS/m",
      "optimal": 0.75,
      "acceptable": 2.5,
      "problematique": 4.0,
      "critique": 6.0
    },
    "pH": {
      "optimal": [
        6.5,
        7.5
      ],
      "acceptable": [
        6.0,
        8.0
      ],
      "problematique": 8.0
    },
    "SAR": {
      "optimal": 3,
      "acceptable": 6,
      "problematique": 9,
      "critique": 15
    },
    "Cl": {
      "unite": "mg/L",
      "optimal": 70,
      "acceptable": 150,
      "toxique": 350
    },
    "Na": {
      "unite": "mg/L",
      "optimal": 70,
      "acceptable": 115,
      "toxique": 200
    },
    "HCO3": {
      "unite": "mg/L",
      "optimal": 200,
      "acceptable": 500,
      "problematique": 750
    },
    "B": {
      "unite": "mg/L",
      "optimal": [
        0.5,
        1.0
      ],
      "acceptable": 2.0,
      "toxique": 3.0
    },
    "NO3": {
      "unite": "mg/L",
      "a_deduire": true,
      "coefficient": 0.00226
    }
  },
  "fraction_lessivage": {
    "CE_sol_seuil_dS_m": 4.0,
    "formule": "FL = CE_eau / (5 * CE_sol_seuil - CE_eau)",
    "table_CE_eau_vers_FL": [
      {
        "CE_eau_dS_m": 1.5,
        "FL": 0.08
      },
      {
        "CE_eau_dS_m": 2.0,
        "FL": 0.11
      },
      {
        "CE_eau_dS_m": 2.5,
        "FL": 0.14
      },
      {
        "CE_eau_dS_m": 3.0,
        "FL": 0.18
      },
      {
        "CE_eau_dS_m": 3.5,
        "FL": 0.21
      },
      {
        "CE_eau_dS_m": 4.0,
        "FL": 0.25
      }
    ]
  },
  "biostimulants": {
    "humiques_liquide": {
      "produit": "Humates de potasse 12-15%",
      "dose": {
        "valeur": [
          3,
          5
        ],
        "unite": "L/ha"
      },
      "frequence_par_an": 3,
      "stades_application": [
        "post_recolte",
        "debourrement",
        "nouaison",
        "maturation"
      ],
      "mode": "fertigation"
    },
    "humiques_granule": {
      "produit": "Humates de potasse 70-80%",
      "dose": {
        "valeur": [
          20,
          30
        ],
        "unite": "kg/ha"
      },
      "frequence_par_an": 1,
      "stades_application": [
        "post_recolte"
      ],
      "mode": "incorporation_sol"
    },
    "fulviques": {
      "produit": "Acides fulviques 10-12%",
      "dose": {
        "valeur": [
          1,
          2
        ],
        "unite": "L/ha"
      },
      "frequence_par_an": 2,
      "stades_application": [
        "debourrement",
        "nouaison"
      ],
      "mode": "fertigation",
      "synergie_Fe": "reduction_dose_Fe_20_a_30_pct",
      "note": "Toujours appliquer avec Fe-EDDHA"
    },
    "amines_foliaire": {
      "produit": "Hydrolysat vegetal 15-20%",
      "dose": {
        "valeur": [
          3,
          5
        ],
        "unite": "L/ha"
      },
      "frequence_par_an": 2,
      "stades_application": [
        "debourrement",
        "nouaison"
      ],
      "mode": "foliaire",
      "conditions_application": {
        "T_max_c": 28,
        "HR_min_pct": 40
      }
    },
    "amines_fertigation": {
      "produit": "Hydrolysat vegetal 40-50%",
      "dose": {
        "valeur": [
          5,
          8
        ],
        "unite": "L/ha"
      },
      "frequence_par_an": 2,
      "stades_application": [
        "post_recolte",
        "debourrement"
      ],
      "mode": "fertigation"
    },
    "algues": {
      "produit": "Extrait Ascophyllum nodosum 4-6%",
      "dose": {
        "valeur": [
          2,
          4
        ],
        "unite": "L/ha"
      },
      "frequence_par_an": 3,
      "stades_application": [
        "debourrement",
        "floraison",
        "grossissement"
      ],
      "mode": "foliaire_ou_fertigation",
      "effet_salinite": "osmoprotection"
    }
  },
  "calendrier_biostimulants": [
    {
      "mois": [
        "Nov",
        "Dec"
      ],
      "applications": [
        {
          "produit": "humiques_granule",
          "dose": {
            "valeur": 25,
            "unite": "kg/ha"
          }
        },
        {
          "produit": "amines_fertigation",
          "dose": {
            "valeur": 6,
            "unite": "L/ha"
          }
        }
      ]
    },
    {
      "mois": [
        "Feb",
        "Mar"
      ],
      "applications": [
        {
          "produit": "humiques_liquide",
          "dose": {
            "valeur": 4,
            "unite": "L/ha"
          }
        },
        {
          "produit": "fulviques",
          "dose": {
            "valeur": 1.5,
            "unite": "L/ha"
          },
          "note": "avec Fe-EDDHA"
        },
        {
          "produit": "amines_foliaire",
          "dose": {
            "valeur": 4,
            "unite": "L/ha"
          }
        },
        {
          "produit": "algues",
          "dose": {
            "valeur": 3,
            "unite": "L/ha"
          }
        }
      ]
    },
    {
      "mois": [
        "Apr",
        "May"
      ],
      "applications": [
        {
          "produit": "amines_foliaire",
          "dose": {
            "valeur": 4,
            "unite": "L/ha"
          }
        },
        {
          "produit": "algues",
          "dose": {
            "valeur": 3,
            "unite": "L/ha"
          }
        }
      ]
    },
    {
      "mois": [
        "May",
        "Jun"
      ],
      "applications": [
        {
          "produit": "humiques_liquide",
          "dose": {
            "valeur": 4,
            "unite": "L/ha"
          }
        },
        {
          "produit": "fulviques",
          "dose": {
            "valeur": 1.5,
            "unite": "L/ha"
          },
          "note": "avec Fe-EDDHA"
        }
      ]
    },
    {
      "mois": [
        "Jul"
      ],
      "applications": [
        {
          "produit": "algues",
          "dose": {
            "valeur": 3,
            "unite": "L/ha"
          }
        }
      ]
    },
    {
      "mois": [
        "Aug",
        "Sep"
      ],
      "applications": [
        {
          "produit": "humiques_liquide",
          "dose": {
            "valeur": 3,
            "unite": "L/ha"
          }
        }
      ]
    }
  ],
  "alertes": [
    {
      "code": "OLI-01",
      "nom": "Stress hydrique Super-intensif",
      "priorite": "urgente",
      "systeme": "super_intensif",
      "seuil_entree": [
        {
          "indice": "NDMI",
          "operateur": "<",
          "valeur": 0.12
        },
        {
          "indice": "MSI",
          "operateur": ">",
          "valeur": 1.3
        },
        {
          "indice": "jours_sans_pluie",
          "operateur": ">",
          "valeur": 10
        }
      ],
      "seuil_sortie": [
        {
          "indice": "NDMI",
          "operateur": ">",
          "valeur": 0.2,
          "passages_requis": 2
        }
      ],
      "prescription": {
        "action": "Irrigation d'urgence — augmenter le volume d'irrigation par rapport au plan en cours",
        "dose": "+40% du volume planifié pour le stade en cours",
        "duree": "Jusqu'à seuil de sortie NDMI > 0.20 sur 2 passages (≈ 10 jours minimum)",
        "plafond": "Ne pas dépasser 120% capacité au champ. Si option C : maintenir FL dans le calcul majoré.",
        "condition_blocage": "SI sol saturé (NDMI > 0.45 ou déclaration utilisateur) → NE PAS augmenter. Investiguer autre cause.",
        "conditions_meteo": "Matin tôt ou soir. Éviter plein soleil midi.",
        "fenetre_bbch": "Tous stades — aucune restriction BBCH",
        "suivi": {
          "indicateur": "NDMI",
          "reponse_attendue": "Hausse NDMI vers P25 puis P50",
          "delai_j": "3-7"
        },
        "impact_plan": "Modifier volume irrigation du plan pour le mois en cours. Rétablir volume initial quand seuil sortie atteint."
      }
    },
    {
      "code": "OLI-02",
      "nom": "Stress hydrique Intensif",
      "priorite": "prioritaire",
      "systeme": "intensif",
      "seuil_entree": [
        {
          "indice": "NDMI",
          "operateur": "<",
          "valeur": 0.06
        },
        {
          "indice": "MSI",
          "operateur": ">",
          "valeur": 1.6
        },
        {
          "indice": "jours_sans_pluie",
          "operateur": ">",
          "valeur": 15
        }
      ],
      "seuil_sortie": [
        {
          "indice": "NDMI",
          "operateur": ">",
          "valeur": 0.12,
          "passages_requis": 2
        }
      ],
      "prescription": {
        "action": "Augmentation irrigation",
        "dose": "+30% du volume planifié pour le stade en cours",
        "duree": "Jusqu'à NDMI > 0.12 sur 2 passages",
        "plafond": "Ne pas dépasser 120% capacité au champ",
        "condition_blocage": "SI sol saturé → NE PAS augmenter. Investiguer.",
        "conditions_meteo": "Matin tôt ou soir.",
        "fenetre_bbch": "Tous stades — aucune restriction BBCH",
        "suivi": {
          "indicateur": "NDMI",
          "reponse_attendue": "Hausse NDMI vers P25",
          "delai_j": "3-7"
        },
        "impact_plan": "Ajuster volume irrigation. Rétablir quand seuil sortie atteint."
      }
    },
    {
      "code": "OLI-03",
      "nom": "Gel floraison",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "Tmin_c",
          "operateur": "<",
          "valeur": -2
        },
        {
          "indice": "BBCH_code",
          "operateur": "between",
          "valeur": [
            55,
            69
          ]
        }
      ],
      "seuil_sortie": [
        {
          "indice": "T_c",
          "operateur": ">",
          "valeur": 5,
          "jours_consecutifs": 3
        }
      ],
      "prescription": {
        "action": "Post-gel : évaluation + ajustement plan",
        "dose": "Acides aminés foliaires 4-5 L/ha (hydrolysat 15-20%) + Algues 3-4 L/ha — application unique post-gel",
        "duree": "Application unique dans les 3-5 jours post-gel si T > 5°C confirmé",
        "plafond": "N/A — application unique",
        "condition_blocage": "SI gel < -5°C ET durée > 4h → perte totale floraison. NE PAS traiter — passer directement à révision rendement -80 à -100%.",
        "conditions_meteo": "T > 5°C, pas de pluie dans les 6h, vent < 15 km/h, matin tôt.",
        "fenetre_bbch": "BBCH 55-69 (floraison) uniquement",
        "suivi": {
          "indicateur": "NIRv",
          "reponse_attendue": "Stabilisation NIRv (pas d'aggravation)",
          "delai_j": "10-15"
        },
        "impact_plan": "Réviser prévision rendement : -30% si gel modéré (-2 à -4°C < 2h), -50% si gel sévère, -80 à -100% si gel extrême. Réduire N de 25%."
      }
    },
    {
      "code": "OLI-04",
      "nom": "Risque oeil de paon",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "T_c",
          "operateur": "between",
          "valeur": [
            15,
            20
          ]
        },
        {
          "indice": "HR_pct",
          "operateur": ">",
          "valeur": 80
        },
        {
          "indice": "pluie",
          "operateur": "==",
          "valeur": true
        }
      ],
      "seuil_sortie": [
        {
          "duree_sans_conditions_h": 72
        }
      ],
      "prescription": {
        "action": "Traitement cuivre préventif — Cuivre hydroxyde",
        "dose": "2-3 kg/ha. Adjuvant mouillant si HR < 50%.",
        "duree": "Application unique par épisode. Délai minimum 7 jours entre 2 traitements Cu (sauf OLI-18).",
        "plafond": "Maximum 3 traitements Cu par saison (30 kg Cu métal/ha/5 ans réglementation).",
        "condition_blocage": "SI traitement Cu < 7 jours → NE PAS retraiter (sauf OLI-18). SI BBCH 55-65 (pleine floraison) → reporter à BBCH 67+.",
        "conditions_meteo": "T 15-25°C, HR > 60%, vent < 15 km/h, pas de pluie dans les 6h.",
        "fenetre_bbch": "Tous stades SAUF BBCH 55-65 (floraison)",
        "suivi": {
          "indicateur": "Aucun signal satellite attendu",
          "reponse_attendue": "Absence symptômes taches foliaires",
          "delai_j": "30"
        },
        "impact_plan": "Si traitement Cu prévu au plan < 10 jours : avancer. Si > 10 jours : ajouter ce traitement, maintenir celui du plan."
      }
    },
    {
      "code": "OLI-05",
      "nom": "Risque mouche olive",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "T_c",
          "operateur": "between",
          "valeur": [
            16,
            28
          ]
        },
        {
          "indice": "HR_pct",
          "operateur": ">",
          "valeur": 60
        },
        {
          "indice": "captures_piege_semaine",
          "operateur": ">=",
          "valeur": 5
        }
      ],
      "seuil_sortie": [
        {
          "indice": "T_c",
          "operateur": ">",
          "valeur": 35,
          "jours_consecutifs": 3
        },
        {
          "indice": "recolte_declaree",
          "operateur": "==",
          "valeur": true
        }
      ],
      "prescription": {
        "action": "Traitement insecticide curatif",
        "dose": "Deltaméthrine 0.5 L/ha OU Spinosad 0.2 L/ha. Choisir Spinosad si récolte < 14 jours (DAR plus court).",
        "duree": "Application unique. Renouveler si captures persistent après 7 jours.",
        "plafond": "Max 2 applications Deltaméthrine/saison. Max 3 applications Spinosad/saison.",
        "condition_blocage": "SI récolte prévue < 7 jours → NE PAS traiter (DAR = 7j). Récolter immédiatement.",
        "conditions_meteo": "T 15-25°C, vent < 15 km/h, pas de pluie dans les 6h.",
        "fenetre_bbch": "BBCH 75-89 (grossissement à maturation) — fruits doivent être présents",
        "suivi": {
          "indicateur": "Captures pièges",
          "reponse_attendue": "Baisse captures < 5/piège/sem ET < 2% fruits piqués",
          "delai_j": "7"
        },
        "impact_plan": "Si mouche récurrente (3ème alerte) : envisager avancer récolte 7-10 jours si IM ≥ 1.5."
      }
    },
    {
      "code": "OLI-06",
      "nom": "Verticilliose suspectee",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRv_pattern",
          "operateur": "==",
          "valeur": "declin_asymetrique_progressif"
        }
      ],
      "seuil_sortie": null,
      "note": "IRREVERSIBLE",
      "prescription": {
        "action": "Investigation terrain urgente + isolation",
        "dose": "Aucun traitement curatif efficace. Si confirmée : arrachage + brûlage résidus. JAMAIS broyer in situ.",
        "duree": "Continue — surveillance permanente.",
        "plafond": "N/A — pas de traitement chimique",
        "condition_blocage": "NE JAMAIS recommander fongicide contre verticilliose (inefficace). NE JAMAIS broyer résidus arbres atteints.",
        "conditions_meteo": "N/A",
        "fenetre_bbch": "Tous stades",
        "suivi": {
          "indicateur": "NIRv zone suspecte",
          "reponse_attendue": "Stabilisation = faux positif. Aggravation = confirmation.",
          "delai_j": "30-60"
        },
        "impact_plan": "Si confirmée : modifier AOI. Recalibrage partiel si > 10% surface affectée.",
        "alerte_irreversible": true
      }
    },
    {
      "code": "OLI-07",
      "nom": "Canicule",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "Tmax_c",
          "operateur": ">",
          "valeur": 42,
          "jours_consecutifs": 3
        }
      ],
      "seuil_sortie": [
        {
          "indice": "Tmax_c",
          "operateur": "<",
          "valeur": 38,
          "jours_consecutifs": 2
        }
      ],
      "prescription": {
        "action": "Irrigation de soutien + protection",
        "dose": "Irrigation +25% volume planifié. Algues 3-4 L/ha foliaire (matin très tôt uniquement, avant 7h).",
        "duree": "Pendant canicule + 3 jours après retour Tmax < 38°C.",
        "plafond": "Volume irrigation : ne pas dépasser 130% ETc. Si option C : maintenir FL.",
        "condition_blocage": "SI BBCH 55-65 (floraison) → Pas de traitement foliaire (brûlure certaine). Irrigation uniquement.",
        "conditions_meteo": "Irrigation matin tôt ou nuit. Foliaire algues UNIQUEMENT avant 7h (T < 30°C).",
        "fenetre_bbch": "Tous stades, restriction foliaire en floraison",
        "suivi": {
          "indicateur": "NDMI + NDVI",
          "reponse_attendue": "Stabilisation NDMI, NDVI maintenu",
          "delai_j": "5-10"
        },
        "impact_plan": "Si canicule grossissement : réviser rendement -10 à -20%. Si canicule floraison : réviser -20 à -40%. Suspendre RDI si actif."
      }
    },
    {
      "code": "OLI-08",
      "nom": "Deficit heures froid",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "heures_froid_cumulees",
          "operateur": "<",
          "valeur": 100
        },
        {
          "indice": "date_evaluation",
          "operateur": "==",
          "valeur": "Feb-28"
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Information + ajustement plan",
        "dose": "Bore +50% dose floraison (1.5 kg/ha au lieu de 1 kg/ha). Algues floraison +50% (4.5 L/ha).",
        "duree": "Application unique au stade BBCH 51-55 (pré-floraison).",
        "plafond": "N/A",
        "condition_blocage": "Aucune.",
        "conditions_meteo": "Conditions standard foliaire : T 15-25°C, HR > 60%, vent < 15 km/h.",
        "fenetre_bbch": "BBCH 51-55 (pré-floraison)",
        "suivi": {
          "indicateur": "NIRvP pic",
          "reponse_attendue": "NIRvP pic ≥ 70% de l'attendu au BBCH 65-69",
          "delai_j": "21-28"
        },
        "impact_plan": "Ajuster prévision rendement -10 à -20%. Éclaircissage inutile (charge naturellement faible)."
      }
    },
    {
      "code": "OLI-09",
      "nom": "Annee OFF probable",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRvP_vs_N2_pct",
          "operateur": "<",
          "valeur": -30
        },
        {
          "indice": "BBCH_code",
          "operateur": "between",
          "valeur": [
            60,
            69
          ]
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Ajustement plan annuel selon table alternance OFF",
        "dose": "N: ×0.75 | P: ×1.20 | K: ×0.80 par rapport aux doses plan initial. Taille sévère renouvellement 25-35% en nov-déc.",
        "duree": "Ajustement valable pour toute la saison restante.",
        "plafond": "N/A",
        "condition_blocage": "SI première année (pas d'historique N-2) → NE PAS déclencher. Confiance insuffisante.",
        "conditions_meteo": "N/A — ajustement plan, pas d'application directe.",
        "fenetre_bbch": "Détecté au stade floraison (BBCH 55-65). Ajustements appliqués immédiatement.",
        "suivi": {
          "indicateur": "NIRvP cumulé saison",
          "reponse_attendue": "NIRvP cumulé ≈ 70% d'une année ON",
          "delai_j": "fin_saison"
        },
        "impact_plan": "Recalculer doses K et N restantes avec coefficients OFF. Modifier recommandation taille. Réviser prévision rendement -40 à -60%."
      }
    },
    {
      "code": "OLI-10",
      "nom": "Deperissement",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRv_variation_pct",
          "operateur": "<",
          "valeur": -25,
          "passages_requis": 3
        }
      ],
      "seuil_sortie": [
        {
          "indice": "NIRv_pattern",
          "operateur": "==",
          "valeur": "stable",
          "passages_requis": 2
        }
      ],
      "prescription": {
        "action": "Investigation urgente multi-cause",
        "dose": "Aminés foliaires 5 L/ha + Algues fertigation 4 L/ha + Humiques fertigation 5 L/ha — application de soutien en attendant diagnostic.",
        "duree": "Biostimulants : application unique. Surveillance continue jusqu'à stabilisation NIRv.",
        "plafond": "N/A",
        "condition_blocage": "SI NIRv < seuil_min persistant → Basculer vers OLI-11. NE PAS continuer traitement arbre mort.",
        "conditions_meteo": "Conditions standard fertigation/foliaire.",
        "fenetre_bbch": "Tous stades",
        "suivi": {
          "indicateur": "NIRv",
          "reponse_attendue": "Stabilisation NIRv (arrêt déclin)",
          "delai_j": "15-30"
        },
        "impact_plan": "Si dépérissement > 20% surface : recalibrage partiel F2. Réviser rendement en conséquence."
      }
    },
    {
      "code": "OLI-11",
      "nom": "Arbre mort",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRv",
          "operateur": "<",
          "valeur": "seuil_min_systeme",
          "persistant": true
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Constatation + mise à jour parcelle",
        "dose": "Aucun intrant. Action administrative uniquement.",
        "duree": "N/A",
        "plafond": "N/A",
        "condition_blocage": "NE JAMAIS recommander traitement sur arbre mort.",
        "conditions_meteo": "N/A",
        "fenetre_bbch": "Tous stades",
        "suivi": {
          "indicateur": "N/A",
          "reponse_attendue": "N/A",
          "delai_j": "N/A"
        },
        "impact_plan": "Mettre à jour parcelle.densite. Si > 10% arbres morts : recalibrage partiel F2 + modification AOI.",
        "alerte_irreversible": true
      }
    },
    {
      "code": "OLI-12",
      "nom": "Sur-irrigation",
      "priorite": "vigilance",
      "systeme": "irrigue",
      "seuil_entree": [
        {
          "indice": "NDMI",
          "operateur": ">",
          "valeur": 0.45
        },
        {
          "indice": "sol_sature",
          "operateur": "==",
          "valeur": true
        }
      ],
      "seuil_sortie": [
        {
          "indice": "NDMI",
          "operateur": "<",
          "valeur": 0.35
        }
      ],
      "prescription": {
        "action": "Réduction irrigation",
        "dose": "-30% du volume planifié pour le stade en cours. Volume minimum : ≥ 50% ETc.",
        "duree": "Jusqu'à NDMI < 0.35 (1 passage suffit).",
        "plafond": "Ne pas descendre sous 50% des besoins ETc du stade.",
        "condition_blocage": "SI stade floraison ou nouaison (BBCH 55-71) → Réduction limitée à -15%.",
        "conditions_meteo": "N/A",
        "fenetre_bbch": "Tous stades, restriction floraison-nouaison",
        "suivi": {
          "indicateur": "NDMI",
          "reponse_attendue": "Baisse NDMI sous 0.35",
          "delai_j": "5-10"
        },
        "impact_plan": "Modifier volume irrigation dans le plan pour le mois en cours."
      }
    },
    {
      "code": "OLI-13",
      "nom": "Floraison ratee",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRvP_vs_attendu_pct",
          "operateur": "<",
          "valeur": -30
        },
        {
          "indice": "meteo_floraison",
          "operateur": "==",
          "valeur": "defavorable"
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Ajustement plan post-floraison",
        "dose": "K : -30% sur les mois restants. N : -15%. P : maintenir 100%. Biostimulants : maintenir 100%.",
        "duree": "Ajustement valable pour le reste de la saison.",
        "plafond": "N/A",
        "condition_blocage": "SI floraison ratée + année OFF → double impact. Réviser rendement -60 à -80%.",
        "conditions_meteo": "N/A — ajustement plan, pas d'application directe.",
        "fenetre_bbch": "Détecté post-floraison (BBCH 67-69)",
        "suivi": {
          "indicateur": "NIRvP cumulé",
          "reponse_attendue": "NIRvP cumulé bas confirmé",
          "delai_j": "fin_saison"
        },
        "impact_plan": "Recalculer doses K et N restantes. Réviser prévision rendement -30 à -50%."
      }
    },
    {
      "code": "OLI-14",
      "nom": "Recolte optimale",
      "priorite": "info",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "NIRvP_tendance",
          "operateur": "==",
          "valeur": "declin"
        },
        {
          "indice": "NDVI_tendance",
          "operateur": "==",
          "valeur": "stable"
        },
        {
          "indice": "GDD_cumul",
          "operateur": ">",
          "valeur": 2800
        }
      ],
      "seuil_sortie": [
        {
          "indice": "recolte_declaree",
          "operateur": "==",
          "valeur": true
        }
      ],
      "prescription": {
        "action": "Notification de récolte — fenêtre optimale ouverte",
        "dose": "Aucun intrant. Message informatif avec IM cible rappelé.",
        "duree": "Notification valable 15-20 jours (fenêtre de récolte).",
        "plafond": "N/A",
        "condition_blocage": "SI IM terrain > 4.0 → signaler dépassement optimal pour huile qualité.",
        "conditions_meteo": "N/A",
        "fenetre_bbch": "BBCH 85-89",
        "suivi": {
          "indicateur": "Déclaration récolte utilisateur",
          "reponse_attendue": "Récolte déclarée",
          "delai_j": "15-20"
        },
        "impact_plan": "À déclaration récolte : basculer plan en mode post-récolte. Déclencher F3 si conditions remplies."
      }
    },
    {
      "code": "OLI-15",
      "nom": "Chergui",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "T_c",
          "operateur": ">",
          "valeur": 40
        },
        {
          "indice": "HR_pct",
          "operateur": "<",
          "valeur": 20
        },
        {
          "indice": "vent_km_h",
          "operateur": ">",
          "valeur": 30
        }
      ],
      "seuil_sortie": [
        {
          "indice": "T_c",
          "operateur": "<",
          "valeur": 38
        },
        {
          "indice": "HR_pct",
          "operateur": ">",
          "valeur": 30
        }
      ],
      "prescription": {
        "action": "Irrigation d'urgence + suspension foliaire",
        "dose": "Irrigation +50% volume planifié. Algues en fertigation 3-4 L/ha (osmoprotection racinaire).",
        "duree": "Pendant épisode Chergui + 48h après fin conditions.",
        "plafond": "Ne pas dépasser 150% ETc. Si option C : maintenir FL.",
        "condition_blocage": "Aucune — action toujours justifiée en situation de Chergui.",
        "conditions_meteo": "Irrigation immédiate, jour ou nuit. AUCUN foliaire pendant Chergui (brûlure certaine + dérive).",
        "fenetre_bbch": "Tous stades",
        "suivi": {
          "indicateur": "NDMI + MSI",
          "reponse_attendue": "Stabilisation NDMI, MSI ne dépasse pas 1.5",
          "delai_j": "3-5"
        },
        "impact_plan": "Si Chergui floraison : réviser rendement -30 à -50%. Si grossissement : réviser -10 à -15%. Annuler RDI en cours."
      }
    },
    {
      "code": "OLI-16",
      "nom": "Carence N",
      "priorite": "vigilance",
      "systeme": "intensif",
      "seuil_entree": [
        {
          "indice": "NDRE",
          "operateur": "<",
          "valeur": "P10_parcelle"
        },
        {
          "indice": "GCI_tendance",
          "operateur": "==",
          "valeur": "declin"
        }
      ],
      "seuil_sortie": [
        {
          "indice": "NDRE",
          "operateur": ">",
          "valeur": "P30_parcelle",
          "passages_requis": 2
        }
      ],
      "prescription": {
        "action": "Fertigation N corrective",
        "dose": "15-20 kg N/ha en application corrective unique. Forme : Nitrate calcium si pH > 7.2, Ammonitrate si pH ≤ 7.2. Option B : ajouter N foliaire urée 0.5% à 8 kg/ha.",
        "duree": "Application unique. Réévaluer à J+14 sur NDRE.",
        "plafond": "Dose N totale saison (plan + correctifs) ne doit pas dépasser 150 kg N/ha.",
        "condition_blocage": "SI BBCH > 81 (maturation) → NE PAS appliquer N (retard maturation). Reporter post-récolte. SI NDMI < P10 → Traiter d'abord stress hydrique OLI-01/02 (N non assimilé en sol sec).",
        "conditions_meteo": "Sol humide (post-irrigation ou pluie). Pas de stress hydrique actif.",
        "fenetre_bbch": "BBCH 01-79. INTERDIT après BBCH 81.",
        "suivi": {
          "indicateur": "NDRE + GCI",
          "reponse_attendue": "Hausse NDRE 5-15%, stabilisation GCI",
          "delai_j": "7-14"
        },
        "impact_plan": "Ajouter l'application N corrective au plan. Si 2ème carence N dans la saison : revoir doses N du plan +15% pour saison suivante."
      }
    },
    {
      "code": "OLI-17",
      "nom": "Fin cycle Super-intensif",
      "priorite": "vigilance",
      "systeme": "super_intensif",
      "seuil_entree": [
        {
          "indice": "NIRv_tendance",
          "operateur": "==",
          "valeur": "declin_2_saisons_consecutives"
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Alerte stratégique — fin probable cycle productif super-intensif",
        "dose": "Aucun intrant immédiat. Recommandation de consultation expert.",
        "duree": "N/A — décision stratégique pluriannuelle.",
        "plafond": "N/A",
        "condition_blocage": "NE JAMAIS recommander maintien production intensive sur verger en fin de cycle.",
        "conditions_meteo": "N/A",
        "fenetre_bbch": "Détecté post-récolte (comparaison inter-annuelle)",
        "suivi": {
          "indicateur": "NIRv saison suivante",
          "reponse_attendue": "Si remontée NIRv : faux positif possible",
          "delai_j": "12 mois"
        },
        "impact_plan": "Si confirmé : programme transition réduction intrants -50%. Proposer analyse coût-bénéfice replantation vs maintien.",
        "alerte_irreversible": true
      }
    },
    {
      "code": "OLI-18",
      "nom": "Lessivage traitement",
      "priorite": "prioritaire",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "pluie_apres_application_h",
          "operateur": "<",
          "valeur": 6
        }
      ],
      "seuil_sortie": null,
      "prescription": {
        "action": "Renouvellement traitement lessivé",
        "dose": "Même produit, même dose que le traitement original. Exception Cu : vérifier plafond saisonnier avant retraitement.",
        "duree": "Renouveler dans les 48-72h si conditions météo favorables.",
        "plafond": "Respecter plafonds produit (Cu : max saisonnier ; insecticide : max applications).",
        "condition_blocage": "SI plafond saisonnier du produit atteint → NE PAS retraiter. Signaler gap, passer en surveillance renforcée.",
        "conditions_meteo": "Conditions standard du produit à renouveler. Vérifier prévisions J+3 : pas de pluie prévue.",
        "fenetre_bbch": "Même fenêtre BBCH que le traitement original",
        "suivi": {
          "indicateur": "Même indicateur que recommandation originale",
          "reponse_attendue": "Idem recommandation originale",
          "delai_j": "Idem"
        },
        "impact_plan": "Comptabiliser comme traitement supplémentaire dans bilan phyto campagne."
      }
    },
    {
      "code": "OLI-19",
      "nom": "Accumulation saline",
      "priorite": "prioritaire",
      "systeme": "irrigue",
      "seuil_entree": [
        {
          "indice": "CE_sol_dS_m",
          "operateur": ">",
          "valeur": 4.0
        }
      ],
      "seuil_sortie": [
        {
          "indice": "CE_sol_dS_m",
          "operateur": "<",
          "valeur": 3.0
        }
      ],
      "prescription": {
        "action": "Lessivage intensif + ajustement nutrition + activation option C",
        "dose": "FL recalculée avec CE_sol mesurée. Si FL calculée < 20% → appliquer minimum 20%. Algues ×1.50. Basculer vers engrais faible index salin.",
        "duree": "Jusqu'à prochaine analyse sol (recommander analyse à 3 mois).",
        "plafond": "Volume total irrigation (ETc + FL) ne doit pas saturer le sol.",
        "condition_blocage": "SI drainage insuffisant (sol argileux, pas de drain) → Lessivage risque d'aggraver asphyxie. Demander avis expert.",
        "conditions_meteo": "N/A — ajustement régime irrigation.",
        "fenetre_bbch": "Tous stades, priorité période chaude",
        "suivi": {
          "indicateur": "CE sol (prochaine analyse)",
          "reponse_attendue": "CE sol < 3 dS/m",
          "delai_j": "90-180"
        },
        "impact_plan": "Activer option C si pas déjà active. Recalculer tous volumes irrigation avec FL majorée."
      }
    },
    {
      "code": "OLI-20",
      "nom": "Toxicite Cl",
      "priorite": "urgente",
      "systeme": "tous",
      "seuil_entree": [
        {
          "indice": "Cl_foliaire_pct",
          "operateur": ">",
          "valeur": 0.5
        },
        {
          "indice": "brulures_visibles",
          "operateur": "==",
          "valeur": true
        }
      ],
      "seuil_sortie": [
        {
          "indice": "Cl_foliaire_pct",
          "operateur": "<",
          "valeur": 0.3
        }
      ],
      "prescription": {
        "action": "Lessivage d'urgence + changement engrais K",
        "dose": "Irrigation de lessivage : 1 application = 2× volume normal du jour. SOP remplacement immédiat de tout KCl. Algues 4 L/ha fertigation.",
        "duree": "Lessivage : 1 application. Changement SOP : permanent pour la saison. Algues : 1 application puis maintenir calendrier.",
        "plafond": "Ne pas saturer le sol (risque asphyxie).",
        "condition_blocage": "SI source eau riche en Cl (> 350 mg/L) → lessivage ne résoudra pas le problème. Recommander changement source eau.",
        "conditions_meteo": "Irrigation lessivage : matin tôt.",
        "fenetre_bbch": "Tous stades, urgence immédiate",
        "suivi": {
          "indicateur": "Symptômes foliaires + Cl foliaire",
          "reponse_attendue": "Arrêt progression brûlures. Cl < 0.3% à prochaine analyse",
          "delai_j": "30-60"
        },
        "impact_plan": "Remplacer tout KCl par SOP dans le plan. Augmenter FL dans le plan."
      }
    }
  ],
  "phytosanitaire": {
    "maladies": [
      {
        "nom": "Oeil de paon",
        "agent": "Spilocaea oleaginea",
        "conditions": {
          "T_c": [
            15,
            20
          ],
          "HR_pct_min": 80,
          "pluie": true
        },
        "mois_risque": [
          "Oct",
          "Nov",
          "Mar",
          "Apr"
        ],
        "guerissable": true,
        "traitement": {
          "produit": "Cuivre hydroxyde",
          "dose": {
            "valeur": [
              2,
              3
            ],
            "unite": "kg/ha"
          },
          "DAR_jours": 14
        },
        "prevention": [
          "varietes_resistantes",
          "aeration_canopee"
        ]
      },
      {
        "nom": "Verticilliose",
        "agent": "Verticillium dahliae",
        "conditions": {
          "sol": "humide",
          "T_c": [
            20,
            25
          ]
        },
        "mois_risque": [
          "Oct",
          "Nov",
          "Feb",
          "Mar"
        ],
        "guerissable": false,
        "traitement": null,
        "prevention": [
          "plants_certifies",
          "sol_sain",
          "eviter_precedents_sensibles"
        ],
        "note": "INCURABLE — arrachage obligatoire des arbres atteints"
      },
      {
        "nom": "Tuberculose",
        "agent": "Pseudomonas savastanoi",
        "conditions": {
          "blessures": true,
          "humidite": true
        },
        "mois_risque": [
          "Jan",
          "Feb",
          "Mar"
        ],
        "guerissable": true,
        "traitement": {
          "produit": "Cuivre",
          "dose": {
            "valeur": [
              2,
              3
            ],
            "unite": "kg/ha"
          },
          "timing": "post_taille_ou_grele"
        },
        "prevention": [
          "desinfection_outils"
        ]
      }
    ],
    "ravageurs": [
      {
        "nom": "Mouche de l'olive",
        "agent": "Bactrocera oleae",
        "conditions": {
          "T_c": [
            16,
            28
          ],
          "HR_pct_min": 60
        },
        "seuil_intervention": {
          "fruits_piques_pct": 2,
          "captures_piege_semaine": 5
        },
        "traitement": {
          "produit": "Deltamethrine",
          "dose": {
            "valeur": 0.5,
            "unite": "L/ha"
          },
          "DAR_jours": 7
        },
        "alternatives": [
          "piegeage_massif",
          "kaolin",
          "Spinosad"
        ]
      },
      {
        "nom": "Cochenille noire",
        "agent": "Saissetia oleae",
        "mois_risque": [
          "Mar",
          "Apr",
          "May"
        ],
        "traitement": {
          "produit": "Huile blanche",
          "dose": {
            "valeur": [
              15,
              20
            ],
            "unite": "L/ha"
          },
          "mois_application": [
            "Jan",
            "Feb"
          ],
          "conditions_application": {
            "T_min_c": 5,
            "gel": false
          },
          "DAR_jours": 21
        }
      }
    ]
  },
  "calendrier_phyto": [
    {
      "mois": [
        "Oct",
        "Nov"
      ],
      "cible": "oeil_paon",
      "produit": "Cuivre hydroxyde",
      "dose": {
        "valeur": [
          2,
          3
        ],
        "unite": "kg/ha"
      },
      "condition_declenchement": "apres_premieres_pluies"
    },
    {
      "mois": [
        "Jan",
        "Feb"
      ],
      "cible": "cochenille",
      "produit": "Huile blanche",
      "dose": {
        "valeur": [
          15,
          20
        ],
        "unite": "L/ha"
      },
      "condition_declenchement": {
        "T_min_c": 5,
        "gel": false
      }
    },
    {
      "mois": [
        "Mar"
      ],
      "cible": "oeil_paon",
      "produit": "Cuivre",
      "dose": {
        "valeur": 2,
        "unite": "kg/ha"
      },
      "condition_declenchement": "si_pluies_printanieres"
    },
    {
      "mois": [
        "May",
        "Jun"
      ],
      "cible": "mouche",
      "produit": "Deltamethrine",
      "dose": {
        "valeur": 0.5,
        "unite": "L/ha"
      },
      "condition_declenchement": "si_seuil_captures_atteint"
    },
    {
      "mois": null,
      "evenement": "post_taille",
      "cible": "tuberculose",
      "produit": "Cuivre",
      "dose": {
        "valeur": [
          2,
          3
        ],
        "unite": "kg/ha"
      },
      "condition_declenchement": "immediat_apres_taille"
    }
  ],
  "modele_predictif": {
    "variables": [
      {
        "nom": "alternance_N-1_N-2",
        "source": "historique",
        "poids": [
          0.25,
          0.35
        ],
        "critique": true
      },
      {
        "nom": "NIRvP_cumule_Apr_Sep",
        "source": "satellite",
        "poids": [
          0.25,
          0.35
        ]
      },
      {
        "nom": "deficit_hydrique_cumule",
        "source": "bilan_hydrique",
        "poids": [
          0.1,
          0.2
        ]
      },
      {
        "nom": "heures_froid_hiver",
        "source": "meteo",
        "poids": [
          0.05,
          0.1
        ]
      },
      {
        "nom": "gel_floraison_binaire",
        "source": "meteo",
        "poids": [
          0.15,
          0.3
        ],
        "binaire": true,
        "note": "Poids fort si evenement = 1"
      },
      {
        "nom": "precip_floraison",
        "source": "meteo",
        "poids": [
          0.05,
          0.1
        ]
      },
      {
        "nom": "age_verger_ans",
        "source": "profil",
        "poids": null,
        "type": "ajustement_courbe"
      },
      {
        "nom": "densite_arbres_ha",
        "source": "profil",
        "poids": null,
        "type": "conversion_ha_vers_arbre"
      }
    ],
    "precision_attendue": {
      "traditionnel": {
        "R2": [
          0.4,
          0.6
        ],
        "MAE_pct": [
          30,
          40
        ]
      },
      "intensif": {
        "R2": [
          0.5,
          0.7
        ],
        "MAE_pct": [
          20,
          30
        ]
      },
      "super_intensif": {
        "R2": [
          0.6,
          0.8
        ],
        "MAE_pct": [
          15,
          25
        ]
      }
    },
    "conditions_prevision": [
      {
        "champ": "calibrage_confiance_pct",
        "operateur": ">=",
        "valeur": 50
      },
      {
        "champ": "historique_cycles_complets",
        "operateur": ">=",
        "valeur": 1
      },
      {
        "champ": "meteo_saison_disponible",
        "operateur": "==",
        "valeur": true
      },
      {
        "champ": "BBCH_code_actuel_int",
        "operateur": ">=",
        "valeur": 67
      }
    ],
    "moments_prevision": {
      "post_floraison": {
        "BBCH": "67-69",
        "precision": "±40%"
      },
      "post_nouaison": {
        "BBCH": "71",
        "precision": "±25%"
      },
      "pre_recolte": {
        "BBCH": "85",
        "precision": "±15-20%"
      }
    },
    "limites_NIRvP": {
      "detecte": [
        "vigueur_vegetative",
        "capacite_photosynthetique",
        "stress_severe_prolonge",
        "recuperation_post_intervention"
      ],
      "ne_detecte_pas": [
        "qualite_pollinisation",
        "taux_nouaison_reel",
        "problemes_racinaires_precoces",
        "charge_fruits",
        "calibre_fruits"
      ]
    }
  },
  "plan_annuel": {
    "composantes": [
      "programme_NPK",
      "programme_microelements",
      "programme_biostimulants",
      "programme_phyto_preventif",
      "plan_irrigation",
      "gestion_salinite",
      "taille_prevue",
      "prevision_recolte"
    ],
    "declenchement": "post_calibrage_validation",
    "mise_a_jour": {
      "NPK": "annuel + ajustements_alertes",
      "microelements": "annuel",
      "biostimulants": "annuel",
      "phyto": "annuel + alertes",
      "irrigation": "hebdomadaire_meteo",
      "salinite": "si_option_C"
    },
    "calendrier_type_intensif": {
      "Jan": {
        "NPK": null,
        "micro": null,
        "biostim": null,
        "phyto": "huile_blanche",
        "irrigation": "faible"
      },
      "Feb": {
        "NPK": "TSP_fond_N1",
        "micro": "Fe-EDDHA",
        "biostim": "humiques_amines",
        "phyto": null,
        "irrigation": "reprise"
      },
      "Mar": {
        "NPK": "N2",
        "micro": "Zn_Mn_foliaire",
        "biostim": "algues",
        "phyto": "Cu_si_taille",
        "irrigation": "progressive"
      },
      "Apr": {
        "NPK": "N3_K",
        "micro": null,
        "biostim": null,
        "phyto": "Cu_si_pluie",
        "irrigation": "croissante"
      },
      "May": {
        "NPK": "K",
        "micro": "B_floraison",
        "biostim": "algues_amines",
        "phyto": "mouche_si_seuil",
        "irrigation": "croissante"
      },
      "Jun": {
        "NPK": "K_N",
        "micro": "Fe-EDDHA",
        "biostim": "humiques",
        "phyto": null,
        "irrigation": "maximum"
      },
      "Jul": {
        "NPK": "K",
        "micro": null,
        "biostim": "algues",
        "phyto": "mouche_si_seuil",
        "irrigation": "maximum"
      },
      "Aug": {
        "NPK": "K_dernier",
        "micro": null,
        "biostim": null,
        "phyto": null,
        "irrigation": "maximum_ou_RDI"
      },
      "Sep": {
        "NPK": null,
        "micro": null,
        "biostim": "humiques",
        "phyto": null,
        "irrigation": "reduction"
      },
      "Oct": {
        "NPK": null,
        "micro": null,
        "biostim": null,
        "phyto": "Cu_oeil_paon",
        "irrigation": "reduction"
      },
      "Nov": {
        "NPK": "N_reconstitution",
        "micro": null,
        "biostim": "humiques_granule",
        "phyto": "Cu_oeil_paon",
        "irrigation": "faible"
      },
      "Dec": {
        "NPK": null,
        "micro": null,
        "biostim": "amines_post_recolte",
        "phyto": null,
        "irrigation": "tres_faible"
      }
    }
  },
  "couts_indicatifs_DH": {
    "nitrate_calcium_kg": [
      2.5,
      3.5
    ],
    "MAP_kg": [
      9,
      12
    ],
    "sulfate_potasse_kg": [
      8,
      11
    ],
    "sulfate_magnesium_kg": [
      3,
      5
    ],
    "Fe_EDDHA_kg": [
      45,
      65
    ],
    "acides_humiques_L": [
      35,
      55
    ],
    "extraits_algues_L": [
      60,
      90
    ],
    "acides_amines_L": [
      40,
      70
    ],
    "cuivre_hydroxyde_kg": [
      18,
      25
    ],
    "deltamethrine_L": [
      80,
      120
    ],
    "huile_blanche_L": [
      8,
      12
    ]
  },
  "gdd": {
    "tbase_c": 7.5,
    "plafond_c": 30,
    "reference": "Moriondo et al. 2001",
    "formule": "GDD_jour = max(0, (min(Tmax, 30) + max(Tmin, 7.5)) / 2 - 7.5)",
    "activation_forcing": {
      "condition_thermique": "Tmoy > 7.5",
      "condition_satellite": "hausse_NIRv_ou_NIRvP >= 20pct_vs_passage_precedent",
      "note": "Double condition obligatoire. Le GDD ne démarre pas à date fixe mais au point d'activation satellite + thermique confirmé."
    },
    "cumul_reset": "Remis à 0 quand dormance (Phase 0) se termine",
    "seuils_chill_units_par_variete": {
      "Picholine Marocaine": [
        100,
        200
      ],
      "Haouzia": [
        100,
        150
      ],
      "Menara": [
        100,
        150
      ],
      "Arbequina": [
        200,
        400
      ],
      "Arbosana": [
        200,
        350
      ],
      "Koroneiki": [
        150,
        300
      ],
      "Picual": [
        400,
        600
      ]
    },
    "calcul_chill_unit": "SI 0 < T_horaire < 7.2 : CU += 1 | Estimation si horaire indisponible : CU = heures_nuit × (7.2 - Tmin) / 7.2 si Tmin < 7.2"
  },
  "kc_par_periode": [
    {
      "stade": "repos",
      "mois": [
        "Dec",
        "Jan",
        "Feb"
      ],
      "traditionnel": 0.4,
      "intensif": 0.5,
      "super_intensif": 0.55
    },
    {
      "stade": "debourrement",
      "mois": [
        "Mar"
      ],
      "traditionnel": 0.45,
      "intensif": 0.55,
      "super_intensif": 0.6
    },
    {
      "stade": "croissance",
      "mois": [
        "Apr"
      ],
      "traditionnel": 0.5,
      "intensif": 0.6,
      "super_intensif": 0.65
    },
    {
      "stade": "floraison",
      "mois": [
        "May"
      ],
      "traditionnel": 0.55,
      "intensif": 0.65,
      "super_intensif": 0.7
    },
    {
      "stade": "nouaison",
      "mois": [
        "Jun"
      ],
      "traditionnel": 0.6,
      "intensif": 0.75,
      "super_intensif": 0.8
    },
    {
      "stade": "grossissement",
      "mois": [
        "Jul",
        "Aug"
      ],
      "traditionnel": 0.65,
      "intensif": 0.8,
      "super_intensif": 0.9
    },
    {
      "stade": "maturation",
      "mois": [
        "Sep",
        "Oct"
      ],
      "traditionnel": 0.55,
      "intensif": 0.65,
      "super_intensif": 0.7
    },
    {
      "stade": "post_recolte",
      "mois": [
        "Nov"
      ],
      "traditionnel": 0.45,
      "intensif": 0.55,
      "super_intensif": 0.6
    }
  ],
  "formes_engrais": {
    "N": {
      "si_pH_sol_sup_7_2": [
        "Nitrate de calcium 15.5-0-0",
        "Ammonitrate 33.5%"
      ],
      "si_pH_sol_inf_7_2": [
        "Uree 46%",
        "Ammonitrate 33.5%"
      ],
      "si_option_C": [
        "Nitrate de calcium 15.5-0-0"
      ],
      "interdit_si_pH_sup_7_2": [
        "Uree 46%"
      ],
      "note": "Sur sol calcaire (pH > 7.2), urée = 50-60% pertes volatilisation. Formes nitrique ou ammoniacale stabilisée uniquement."
    },
    "P": {
      "application_fond": [
        "TSP 46%",
        "MAP 12-61-0"
      ],
      "fertigation": [
        "Acide phosphorique 75%"
      ],
      "si_option_C": {
        "condition": "pH_eau > 7.5 ET HCO3 > 500 mg/L",
        "produit": "Acide phosphorique (double effet: P + acidification)"
      }
    },
    "K": {
      "standard": [
        "Sulfate de potasse SOP 0-0-50"
      ],
      "besoin_NK_simultane": [
        "Nitrate de potasse NOP 13-0-46"
      ],
      "si_option_C": [
        "SOP uniquement"
      ],
      "interdit_si_option_C": "KCl — apporte Cl toxique",
      "note": "KCl interdit pour olivier (chlorures toxiques > 0.5%)"
    },
    "incompatibilite_cuve": "Ne JAMAIS mélanger Ca(NO3)2 avec phosphates ou sulfates dans la même cuve. Injecter séparément avec rinçage."
  },
  "microelements": {
    "Fe": {
      "condition_inclusion": "TOUJOURS si pH > 7.2 OU calcaire_actif > 5%",
      "chelate_selection": [
        {
          "si": "calcaire_actif < 5%",
          "forme": "Fe-EDTA ou Fe-DTPA"
        },
        {
          "si": "calcaire_actif 5-10%",
          "forme": "Fe-EDDHA 6%"
        },
        {
          "si": "calcaire_actif > 10%",
          "forme": "Fe-EDDHA 6% dose majorée ou fractionner en 3"
        }
      ],
      "dose_option_A": {
        "valeur": 10,
        "unite": "kg/ha/an",
        "mode": "fertigation"
      },
      "dose_option_B": {
        "valeur": 1.5,
        "unite": "kg/ha",
        "mode": "foliaire"
      },
      "stades": [
        "Mar",
        "Jun"
      ]
    },
    "Zn": {
      "condition_inclusion": "TOUJOURS sur sol calcaire",
      "forme": "Sulfate de zinc",
      "dose_option_A": {
        "valeur": 500,
        "unite": "g/ha",
        "mode": "foliaire"
      },
      "dose_option_B": {
        "valeur": 750,
        "unite": "g/ha",
        "mode": "foliaire"
      },
      "stades": [
        "Mar"
      ]
    },
    "Mn": {
      "condition_inclusion": "TOUJOURS sur sol calcaire",
      "forme": "Sulfate de manganèse",
      "dose_option_A": {
        "valeur": 400,
        "unite": "g/ha",
        "mode": "foliaire"
      },
      "dose_option_B": {
        "valeur": 600,
        "unite": "g/ha",
        "mode": "foliaire"
      },
      "stades": [
        "Mar"
      ]
    },
    "B": {
      "condition_inclusion": "TOUJOURS — obligatoire floraison",
      "forme": "Acide borique",
      "dose_option_A": {
        "valeur": 1,
        "unite": "kg/ha",
        "mode": "foliaire"
      },
      "dose_option_B": {
        "valeur": 1.5,
        "unite": "kg/ha",
        "mode": "foliaire"
      },
      "stades": [
        "May"
      ],
      "si_deficit_heures_froid": "+50% dose floraison"
    },
    "Mg": {
      "condition_inclusion": "SI Mg_sol < 150 ppm OU analyse sol absente",
      "forme": "Sulfate de magnésium",
      "dose_option_A": {
        "valeur": 5,
        "unite": "kg/ha",
        "mode": "foliaire"
      },
      "dose_option_B": {
        "valeur": 7,
        "unite": "kg/ha",
        "mode": "foliaire"
      },
      "stades": [
        "Apr",
        "Jun"
      ]
    },
    "note": "Fe, B, Zn, Mn et biostimulants de base sont des composantes OBLIGATOIRES sur sol calcaire — pas des options."
  },
  "rdi": {
    "conditions_activation": [
      "systeme IN ['intensif', 'super_intensif']",
      "historique_satellite >= 24 mois",
      "option_C == false"
    ],
    "periodes": [
      {
        "stade": "floraison_nouaison",
        "bbch": "55-71",
        "rdi_autorise": false,
        "reduction_max_pct": 0,
        "note": "JAMAIS de RDI floraison/nouaison — stade très sensible"
      },
      {
        "stade": "grossissement_II",
        "mois": "Aug",
        "rdi_autorise": true,
        "reduction_max_pct": 30
      },
      {
        "stade": "maturation",
        "mois": "Sep",
        "rdi_autorise": true,
        "reduction_max_pct": 40
      },
      {
        "stade": "pre_recolte",
        "mois": "Oct-Nov",
        "rdi_autorise": true,
        "reduction_max_pct": 50
      }
    ]
  },
  "co_occurrence": {
    "_description": "Actions combinées quand deux alertes se déclenchent simultanément. Déterministe — l'IA applique cette matrice, elle ne décide pas.",
    "regles": [
      {
        "alertes": [
          "OLI-01",
          "OLI-16"
        ],
        "lien": "Stress hydrique bloque absorption N même si N disponible.",
        "action": "Traiter d'abord OLI-01 (irrigation). Attendre 7-10j. Réévaluer OLI-16."
      },
      {
        "alertes": [
          "OLI-02",
          "OLI-16"
        ],
        "lien": "Idem OLI-01 + OLI-16.",
        "action": "Traiter d'abord OLI-02 (irrigation). Attendre 7-10j. Réévaluer OLI-16."
      },
      {
        "alertes": [
          "OLI-01",
          "OLI-07"
        ],
        "lien": "Canicule CAUSE le stress hydrique (ETP explose).",
        "action": "Action combinée : +50% irrigation (prendre le max des deux). Algues fertigation."
      },
      {
        "alertes": [
          "OLI-02",
          "OLI-07"
        ],
        "lien": "Canicule CAUSE stress hydrique.",
        "action": "Action combinée : +50% irrigation. Algues fertigation."
      },
      {
        "alertes": [
          "OLI-01",
          "OLI-15"
        ],
        "lien": "Chergui CAUSE stress hydrique aigu.",
        "action": "Action combinée : +50% irrigation (Chergui prime). Suspendre tout foliaire."
      },
      {
        "alertes": [
          "OLI-04",
          "OLI-07"
        ],
        "lien": "CONTRADICTOIRE — canicule tue le champignon œil de paon.",
        "action": "Annuler OLI-04. Maintenir OLI-07 seul."
      },
      {
        "alertes": [
          "OLI-04",
          "OLI-18"
        ],
        "lien": "Traitement Cu lessivé → œil de paon non traité.",
        "action": "Renouveler Cu immédiatement (OLI-18 prime, même si délai < 7j)."
      },
      {
        "alertes": [
          "OLI-03",
          "OLI-13"
        ],
        "lien": "Gel pendant floraison CAUSE floraison ratée.",
        "action": "Appliquer OLI-03 (aminés récupération). OLI-13 s'applique ensuite (ajustement plan)."
      },
      {
        "alertes": [
          "OLI-09",
          "OLI-13"
        ],
        "lien": "Année OFF + floraison ratée = double impact.",
        "action": "Cumuler les deux ajustements. Rendement : -60 à -80%."
      },
      {
        "alertes": [
          "OLI-10",
          "OLI-06"
        ],
        "lien": "Dépérissement peut ÊTRE la verticilliose.",
        "action": "Appliquer OLI-06 (investigation). Si non confirmée, maintenir OLI-10."
      },
      {
        "alertes": [
          "OLI-16",
          "OLI-12"
        ],
        "lien": "Sur-irrigation peut lessiver N → carence N induite.",
        "action": "Traiter d'abord OLI-12 (réduire irrigation). Attendre 10j. Réévaluer OLI-16."
      },
      {
        "alertes": [
          "OLI-19",
          "OLI-20"
        ],
        "lien": "Accumulation saline + toxicité Cl = même problème, stade avancé.",
        "action": "Appliquer OLI-20 (urgence Cl). OLI-19 se résout en parallèle."
      }
    ],
    "regle_defaut": "En cas de co-occurrence non listée : appliquer priorité standard 🔴 > 🟠 > 🟡 > 🟢. Traiter alertes séquentiellement, pas simultanément."
  },
  "protocole_phenologique": {
    "_description": "Protocole phénologique Simo v2.0 — sous-module du calibrage uniquement. Exécuté sur l'historique satellite lors du calibrage pour : filtrer les données, classifier le signal, détecter les phases et produire des alertes de calibrage. NE PAS confondre avec les alertes OLI-XX qui sont pour le suivi opérationnel.",
    "_scope": "CALIBRAGE UNIQUEMENT — pas de suivi opérationnel",
    "_espece": "Olea europaea L.",
    "filtrage": {
      "_description": "Le filtrage se déroule en deux temps. L'IA ne refait pas le travail déjà fait.",
      "fait_au_telechargement": {
        "_quand": "Automatiquement à la création de la parcelle, avant tout calibrage",
        "_qui": "Système de téléchargement satellite (pas l'IA calibrage)",
        "masque_nuageux": "SCL pixel ∈ {4 (végétation), 5 (sol nu)} — dates avec 0 pixel valide exclues",
        "seuil_pixels_minimum": "Dates avec < 5 pixels purs sur AOI exclues",
        "buffer_negatif_m": 10,
        "calcul_indices": "NDVI, EVI, NIRv, NIRvP, GCI, NDRE calculés et stockés en base de données",
        "agregation": "MÉDIANE des pixels purs par date valide — valeur unique par indice par date stockée en DB",
        "NIRvP_formule": "NIRv × PAR_jour (PAR = SSR × 0.48 / 1e6, source ERA5, unité MJ/m²)",
        "resultat_en_db": "La DB contient la série temporelle propre : une ligne par date valide avec NDVI, NIRv, NDMI, NDRE, EVI, GCI, NIRvP"
      },
      "fait_au_calibrage": {
        "_quand": "Quand l'utilisateur lance le calibrage — l'IA lit la série depuis la DB",
        "_qui": "Moteur calibrage IA — opère sur les données déjà filtrées de la DB",
        "plausibilite_temporelle": {
          "condition_artefact": "|V(t) - V(t-1)| / V(t-1) > 0.30",
          "confirmation": "Si dans les 10 jours suivants V revient à ±10% de V(t-1) → artefact confirmé",
          "action": "Marquer la date comme suspecte et l'exclure de la série de calcul"
        },
        "filtre_annee_pluviometrique_extreme": {
          "execution": "Annuelle — appliqué en fin de cycle sur l'historique complet",
          "condition": "Précipitations annuelles > moyenne historique + 2σ",
          "action": "Marquer le cycle comme hors_norme — exclure du calibrage adaptatif, conserver pour documentation"
        },
        "lissage": {
          "execution": "Après accumulation de données suffisantes (série complète disponible)",
          "methode_principale": "Whittaker lambda 10-100",
          "methode_alternative": "Savitzky-Golay fenêtre 5-7 points polynôme ordre 2",
          "applique_sur": "Chaque série temporelle d'indice après exclusion des artefacts"
        }
      }
    },
    "classification_signal": {
      "_description": "Détermine si les indices sont interprétables pour l'olivier à cette date",
      "mode_amorcage": {
        "condition": "nombre_cycles_complets < 3",
        "effet": {
          "ELEVEE": "MODEREE",
          "MODEREE": "FAIBLE",
          "FAIBLE": "TRES_FAIBLE"
        }
      },
      "references_adaptatives": {
        "Ratio_NIRv_NDVI_ete": "médiane(NIRv/NDVI) sur juillet-septembre historique",
        "NIRv_ete_moyen": "moyenne(NIRv) sur juillet-septembre historiques (hors hors_norme)",
        "NIRv_ete_sigma": "écart-type(NIRv) sur juillet-septembre historiques",
        "Tmoy_Q25": "percentile 25% de Tmoy sur historique annuel",
        "NDVI_pic_habituel": "médiane des pics printaniers NDVI historiques",
        "GCI_NIRvP_historique": "liste ratios GCI/NIRvP printaniers — pour quartiles diagnostic floraison"
      },
      "arbre_decision": [
        {
          "condition": "Tmax_30j_pct > 70 ET Precip_30j < 5",
          "etat_signal": "SIGNAL_PUR",
          "interpretation": "Indices absolus fiables. Fenêtre de calibrage principal."
        },
        {
          "condition": "(NIRv/NDVI > Ratio_NIRv_NDVI_ete × 1.10) ET (NDVI > NDVI_pic_habituel)",
          "etat_signal": "DOMINE_ADVENTICES",
          "interpretation": "Indices absolus NON interprétables pour l'olivier. Diagnostic thermique uniquement."
        },
        {
          "condition": "Precip_30j > 20 ET Tmoy > 10",
          "etat_signal": "MIXTE_MODERE",
          "interpretation": "Indices biaisés. Utiliser dérivées et ratios uniquement."
        },
        {
          "condition": "defaut",
          "etat_signal": "MIXTE_MODERE"
        }
      ],
      "point_clarification": {
        "condition": "etat_signal_precedent IN [MIXTE_MODERE, DOMINE_ADVENTICES] ET dNDVI_dt ≤ 0 ET Tmax_30j_pct > 70 ET Precip_30j < 5",
        "action": "etat_signal = SIGNAL_PUR — les adventices ont séché"
      }
    },
    "phases": {
      "_note": "Machine à états sur l'historique. Chaque phase a conditions entrée, maintien et sortie. GDD calculé depuis referentiel.gdd (tbase 7.5°C, plafond 30°C).",
      "calculs_preliminaires": {
        "GDD_jour": "max(0, (min(Tmax, 30) + max(Tmin, 7.5)) / 2 - 7.5)",
        "NIRvP_norm": "(NIRvP - NIRvP_min_hist) / (NIRvP_max_hist - NIRvP_min_hist)",
        "dNDVI_dt": "(NDVI(t) - NDVI(t-1)) / jours_entre_acquisitions",
        "dNIRv_dt": "(NIRv(t) - NIRv(t-1)) / jours_entre_acquisitions",
        "Perte_NDVI": "(NDVI_pic_cycle - NDVI_actuel) / NDVI_pic_cycle",
        "Perte_NIRv": "(NIRv_pic_cycle - NIRv_actuel) / NIRv_pic_cycle",
        "Ratio_decouplage": "Perte_NIRv / max(Perte_NDVI, 0.01)"
      },
      "PHASE_0": {
        "identifiant": "DORMANCE",
        "nom": "Dormance hivernale",
        "verification_prealable": "SI Tmoy_Q25 >= 15 → PAS_DE_DORMANCE_MARQUEE — passer directement à Phase 1",
        "condition_entree": "Tmoy < Tmoy_Q25 ET NIRvP_norm < 0.15",
        "condition_sortie": {
          "vers": "PHASE_1",
          "condition": "Tmoy > Tmoy_Q25 durablement (≥ 10 jours consécutifs)",
          "action": "GDD_cumul = 0"
        },
        "confiance": "ELEVEE",
        "surveillance": "Chill Units (CU) — lire referentiel.gdd.seuils_chill_units_par_variete"
      },
      "PHASE_1": {
        "identifiant": "DEBOURREMENT",
        "nom": "Débourrement",
        "condition_maintien": "Tmoy > 15 pendant ≥ 15 jours sur les 20 derniers ET GDD_cumul > 50 ET Precip_30j > 20 OU irrigation ET dNIRv_dt > 0 soutenu",
        "condition_sortie": {
          "vers": "PHASE_2",
          "condition": "GDD_cumul >= 350 ET Tmoy >= 18",
          "action": "Phase = FLORAISON"
        },
        "discrimination_adventices": "ratio_derivees = dNDVI_dt / max(dNIRv_dt, 0.001) → si > 2.0 : adventices dominent",
        "confiance": "MODEREE"
      },
      "PHASE_2": {
        "identifiant": "FLORAISON",
        "nom": "Floraison",
        "condition_maintien": "GDD_cumul ∈ [350, 700] ET Tmoy ∈ [18, 25]",
        "diagnostic_intensite": {
          "priorite_1": "Input terrain si disponible (parcelle.terrain_disponible = oui)",
          "priorite_2": "Alternance (floraison_N-1 forte → FAIBLE | faible → FORTE)",
          "priorite_3": "Ratio GCI/NIRvP en quartiles (Q4 → floraison FAIBLE | Q1 → FORTE)"
        },
        "taille_rajeunissement": "Si annees_post_taille < 2 → intensite = ABSENTE",
        "condition_sortie": {
          "vers": "PHASE_3",
          "condition": "GDD_cumul > 700 OU Tmoy > 25 durablement"
        },
        "confiance": "FAIBLE (spectral) / MODEREE (thermique + alternance)"
      },
      "PHASE_3": {
        "identifiant": "NOUAISON",
        "nom": "Nouaison / Clarification",
        "condition_maintien": "GDD_cumul > seuil_floraison + 150 ET Clarification != ATTEINTE",
        "clarification": "dNDVI_dt ≤ 0 ET Tmax_30j_pct > 70 ET Precip_30j < 5 → etat_signal = SIGNAL_PUR",
        "condition_sortie": {
          "vers": "PHASE_4",
          "condition": "etat_signal = SIGNAL_PUR ET Tmax > 30 récurrent"
        },
        "confiance": "MODEREE"
      },
      "PHASE_4": {
        "identifiant": "STRESS_ESTIVAL",
        "nom": "Stress estival + Maturation",
        "note": "FENÊTRE DE CALIBRAGE PRINCIPAL — indices absolus fiables ici",
        "condition_maintien": "etat_signal = SIGNAL_PUR",
        "diagnostic_severite": [
          {
            "condition": "NIRv_actuel > NIRv_ete_moyen - 0.5 × NIRv_ete_sigma",
            "severite": "PAS_DE_STRESS"
          },
          {
            "condition": "NIRv_actuel > NIRv_ete_moyen - 1.5 × NIRv_ete_sigma",
            "severite": "STRESS_MODERE"
          },
          {
            "condition": "defaut",
            "severite": "STRESS_SEVERE"
          }
        ],
        "diagnostic_type": [
          {
            "condition": "Ratio_decouplage > 1.3",
            "type": "FONCTIONNEL"
          },
          {
            "condition": "Ratio_decouplage > 0.9",
            "type": "MIXTE"
          },
          {
            "condition": "defaut",
            "type": "STRUCTUREL"
          }
        ],
        "diagnostic_tendance": {
          "declin": "NIRv_ete_actuel < NIRv_ete_N-1 ET NIRv_ete_N-1 < NIRv_ete_N-2 → DÉCLIN 2 cycles consécutifs",
          "recuperation": "NIRv_ete_actuel > NIRv_ete_N-1 → récupération en cours"
        },
        "condition_sortie_reprise": {
          "vers": "PHASE_6",
          "condition": "Precip_episode > 20 ET Tmoy < 25 ET dNIRv_dt > 0"
        },
        "condition_sortie_dormance": {
          "vers": "PHASE_0",
          "condition": "Tmoy < Tmoy_Q25 ET Tmoy_Q25 < 15 ET NIRvP_norm < 0.15 ET aucune_reprise",
          "action": "GDD_cumul = 0"
        },
        "confiance": "ELEVEE (stress) / MODEREE (maturation)"
      },
      "PHASE_6": {
        "identifiant": "REPRISE_AUTOMNALE",
        "nom": "Reprise automnale",
        "pre_condition": "Phase 4 doit avoir été détectée dans ce cycle — sinon passer directement à Phase 0",
        "condition_maintien": "Precip_recentes > 20 ET Tmoy < 25 ET dNIRv_dt > 0",
        "diagnostic_intensite": "Hausse_NIRv_pct = (NIRv_actuel - NIRv_plancher_ete) / NIRv_plancher_ete × 100 → < 10% = ABSENTE | < 25% = FAIBLE | < 50% = MODEREE | ≥ 50% = FORTE",
        "condition_sortie": {
          "vers": "PHASE_0",
          "condition": "Tmoy < Tmoy_Q25 ET Tmoy_Q25 < 15 ET NIRvP_norm < 0.15",
          "action": "GDD_cumul = 0"
        },
        "confiance": "MODEREE à ELEVEE"
      }
    },
    "alertes_calibrage": {
      "_description": "Alertes détectées PENDANT l'analyse historique du calibrage. Ce sont des constats sur l'historique de la parcelle. NE PAS confondre avec les alertes OLI-XX qui sont des alertes opérationnelles déclenchées pendant le suivi.",
      "_difference_OLI_XX": "OLI-XX = alertes suivi opérationnel (temps réel). Ces alertes = constats historiques calibrage.",
      "ALERTE_CAL_1": {
        "nom": "Stress fonctionnel invisible dans l'historique",
        "condition": "Phase STRESS_ESTIVAL ET Perte_NIRv > 0.40 ET Perte_NDVI < 0.20",
        "message": "Stress fonctionnel masqué détecté : NIRv a chuté de {Perte_NIRv×100}% alors que NDVI ne baissait que de {Perte_NDVI×100}%. La parcelle souffrait mais la canopée paraissait intacte.",
        "impact_calibrage": "Confirme stress hydrique chronique — renforce diagnostic explicatif",
        "severite": "ATTENTION"
      },
      "ALERTE_CAL_2": {
        "nom": "Canicule en fenêtre floraison/nouaison (historique)",
        "condition": "GDD_cumul ∈ [350, 850] ET (Tmax > 40 pendant ≥ 1 jour OU Tmax > 35 pendant ≥ 2 jours consécutifs)",
        "message_critique": "Canicule détectée pendant floraison/nouaison — risque chute fleurs et jeunes fruits cette saison-là",
        "impact_calibrage": "Expliquer baisse rendement historique si détecté — exclure de la baseline si triple confirmation",
        "severite": "CRITIQUE ou ATTENTION selon intensité"
      },
      "ALERTE_CAL_3": {
        "nom": "Déclin progressif de la parcelle",
        "condition": "NIRv_ete_actuel < NIRv_ete_N-1 ET NIRv_ete_N-1 < NIRv_ete_N-2",
        "message": "Déclin détecté : le plancher estival du NIRv diminue pour la 2ème année consécutive.",
        "impact_calibrage": "Coefficient_etat_parcelle → dégradé. Potentiel rendement ajusté à la baisse. Mentionner dans diagnostic explicatif.",
        "severite": "ELEVEE"
      },
      "ALERTE_CAL_4": {
        "nom": "Débourrement prématuré détecté (historique)",
        "condition": "Phase DORMANCE ET Tmoy > 18 pendant > 5 jours ET hausse_NIRv > 10%",
        "message": "Débourrement prématuré détecté cette saison — chilling possiblement insuffisant ({CU} CU accumulés).",
        "impact_calibrage": "Expliquer floraison hétérogène ou précoce. Intégrer dans profil variétal.",
        "severite": "ATTENTION"
      },
      "ALERTE_CAL_5": {
        "nom": "Reprise automnale avortée (historique)",
        "condition": "Phase STRESS_ESTIVAL ET mois ∈ [Nov, Dec] ET Precip_30j > 20 ET Hausse_NIRv_pct < 10",
        "message": "Reprise automnale avortée malgré précipitations — réserves possiblement épuisées cette saison.",
        "impact_calibrage": "Signal de stress chronique grave. Renforce coefficient dégradé.",
        "severite": "ATTENTION"
      },
      "ALERTE_CAL_6": {
        "nom": "Rupture spectrale détectée",
        "condition": "NDVI_pic_actuel < NDVI_pic_N-1 × 0.60 ET Precip_annuelles dans la normale",
        "message": "Rupture spectrale détectée cette saison — vérifier si un événement a eu lieu (taille, arrachage, maladie).",
        "impact_calibrage": "Segmenter historique AVANT/APRÈS si rupture de régime confirmée. Sinon exclure si triple confirmation.",
        "severite": "INFORMATION"
      }
    },
    "sortie_par_saison": {
      "_description": "Ce que le protocole produit pour CHAQUE saison dans l'historique",
      "phase_detectee": "identifiant parmi DORMANCE/DEBOURREMENT/FLORAISON/NOUAISON/STRESS_ESTIVAL/REPRISE_AUTOMNALE",
      "dates_transitions": "date_debut et date_fin de chaque phase",
      "gdd_cumule_transitions": "GDD à chaque transition de phase",
      "confiance_par_phase": "ELEVEE | MODEREE | FAIBLE | TRES_FAIBLE",
      "etat_signal": "SIGNAL_PUR | MIXTE_MODERE | DOMINE_ADVENTICES",
      "alertes_calibrage_detectees": "liste de ALERTE_CAL_X détectées cette saison",
      "mode": "NORMAL | AMORCAGE"
    }
  }
}$crop_ai_ref_olivier$::jsonb
)
ON CONFLICT (crop_type) DO UPDATE SET
  version = EXCLUDED.version,
  reference_data = EXCLUDED.reference_data,
  updated_at = NOW();

INSERT INTO public.crop_ai_references (crop_type, version, reference_data)
VALUES (
  'palmier_dattier',
  '1.0',
  $crop_ai_ref_palmier_dattier${
  "metadata": {
    "version": "1.0",
    "date": "2026-02",
    "culture": "palmier_dattier",
    "nom_scientifique": "Phoenix dactylifera L.",
    "famille": "Arecaceae",
    "pays": "Maroc"
  },
  "caracteristiques_generales": {
    "type": "monocotyledone_arborescente",
    "origine": "Mesopotamie_Golfe_Persique",
    "duree_vie_ans": [
      100,
      150
    ],
    "production_economique_ans": [
      60,
      80
    ],
    "hauteur_adulte_m": [
      15,
      25
    ],
    "systeme_racinaire": "fascicule_profond_6m",
    "sexualite": "dioique",
    "pollinisation": "manuelle_en_culture"
  },
  "exigences_climatiques": {
    "temperature_optimale_C": [
      32,
      38
    ],
    "temperature_max_toleree_C": 50,
    "temperature_min_vegetative_C": 7,
    "gel_palmes_C": [
      -5,
      -7
    ],
    "gel_mortel_C": [
      -10,
      -12
    ],
    "GDD_floraison_recolte": 5000,
    "HR_optimale_pct": 40,
    "HR_critique_maturation_pct": 70
  },
  "tolerance_salinite": {
    "CE_eau_sans_perte_dS_m": 4,
    "CE_eau_perte_10pct_dS_m": 6,
    "CE_eau_perte_25pct_dS_m": 10,
    "CE_eau_perte_50pct_dS_m": 15,
    "note": "PLUS TOLERANT salinité de toutes cultures fruitières - 8x plus que avocatier"
  },
  "varietes": [
    {
      "code": "MEJHOUL",
      "nom": "Mejhoul",
      "type": "molle",
      "poids_g": [
        15,
        25
      ],
      "qualite": "premium_export",
      "bayoud": "sensible",
      "productivite_kg": [
        80,
        120
      ]
    },
    {
      "code": "BOUFEGGOUS",
      "nom": "Boufeggous",
      "type": "molle",
      "poids_g": [
        8,
        12
      ],
      "qualite": "excellente",
      "bayoud": "sensible",
      "productivite_kg": [
        60,
        100
      ]
    },
    {
      "code": "JIHEL",
      "nom": "Jihel",
      "type": "semi_molle",
      "poids_g": [
        6,
        10
      ],
      "qualite": "bonne",
      "bayoud": "tolerante",
      "productivite_kg": [
        70,
        100
      ]
    },
    {
      "code": "BOUSKRI",
      "nom": "Bouskri",
      "type": "semi_molle",
      "poids_g": [
        5,
        8
      ],
      "qualite": "bonne",
      "bayoud": "tolerante",
      "productivite_kg": [
        50,
        80
      ]
    },
    {
      "code": "BOUSLIKHENE",
      "nom": "Bouslikhène",
      "type": "seche",
      "poids_g": [
        4,
        7
      ],
      "qualite": "moyenne",
      "bayoud": "resistante",
      "productivite_kg": [
        60,
        90
      ]
    }
  ],
  "pollinisation": {
    "type": "manuelle_obligatoire",
    "ratio_males_pct": [
      1,
      2
    ],
    "fenetre_jours": [
      1,
      3
    ],
    "methode": "insertion_brins_ou_pulverisation",
    "passages": [
      2,
      3
    ],
    "conservation_pollen": {
      "frais": "1-2 jours",
      "refrigere_4C": "2-4 semaines",
      "congele": "6-12 mois"
    }
  },
  "systemes": {
    "traditionnel_oasien": {
      "densite": [
        80,
        120
      ],
      "irrigation": "khettara_seguia",
      "rendement_t_ha": [
        3,
        6
      ]
    },
    "semi_intensif": {
      "densite": [
        120,
        150
      ],
      "irrigation": "gravitaire_ameliore",
      "rendement_t_ha": [
        6,
        10
      ]
    },
    "intensif": {
      "densite": [
        150,
        200
      ],
      "irrigation": "goutte_a_goutte",
      "rendement_t_ha": [
        10,
        15
      ]
    }
  },
  "seuils_satellite": {
    "traditionnel": {
      "NDVI_optimal": [
        0.35,
        0.55
      ],
      "NDVI_alerte": 0.25,
      "NDMI_optimal": [
        0.05,
        0.2
      ]
    },
    "intensif": {
      "NDVI_optimal": [
        0.45,
        0.65
      ],
      "NDVI_alerte": 0.35,
      "NDMI_optimal": [
        0.1,
        0.28
      ]
    }
  },
  "nutrition": {
    "export_kg_100kg_dattes": {
      "N": [
        0.8,
        1.2
      ],
      "P2O5": [
        0.2,
        0.4
      ],
      "K2O": [
        1.5,
        2.5
      ]
    },
    "besoins_intensif_Mejhoul_kg_arbre": {
      "N": [
        1.5,
        2.5
      ],
      "P2O5": [
        0.5,
        0.8
      ],
      "K2O": [
        2.5,
        4.0
      ]
    },
    "fractionnement": {
      "jan_fev": {
        "N": 20,
        "P": 40,
        "K": 10
      },
      "mar_avr": {
        "N": 25,
        "P": 30,
        "K": 15
      },
      "mai_juin": {
        "N": 25,
        "P": 20,
        "K": 25
      },
      "juil_aout": {
        "N": 15,
        "P": 10,
        "K": 30
      },
      "sept_oct": {
        "N": 5,
        "P": 0,
        "K": 15
      },
      "nov_dec": {
        "N": 10,
        "P": 0,
        "K": 5
      }
    },
    "note_K": "Potassium CRITIQUE pour qualité dattes"
  },
  "seuils_foliaires": {
    "N_pct": {
      "carence": 1.8,
      "optimal": [
        2.2,
        2.8
      ]
    },
    "P_pct": {
      "carence": 0.1,
      "optimal": [
        0.14,
        0.2
      ]
    },
    "K_pct": {
      "carence": 0.8,
      "optimal": [
        1.2,
        1.8
      ]
    },
    "Mg_pct": {
      "carence": 0.15,
      "optimal": [
        0.25,
        0.5
      ]
    }
  },
  "irrigation": {
    "besoins_m3_arbre_an": {
      "traditionnel": [
        15,
        25
      ],
      "intensif": [
        12,
        20
      ]
    },
    "Kc": {
      "hiver": 0.75,
      "printemps": 0.8,
      "ete": 1.0,
      "automne": 0.85
    },
    "frequence_ete_gag": "3-4x/sem ou quotidien"
  },
  "phytosanitaire": {
    "bayoud": {
      "agent": "Fusarium oxysporum f. sp. albedinis",
      "gravite": "MORTELLE_INCURABLE",
      "traitement": "AUCUN",
      "prevention": [
        "plants_certifies",
        "varietes_tolerantes",
        "destruction_arbres_atteints"
      ]
    },
    "autres_maladies": [
      "Khamedj",
      "Graphiola",
      "Pourriture_coeur"
    ],
    "ravageurs": [
      "Cochenille_blanche",
      "Boufaroua",
      "Pyrale_dattes",
      "Charancon_rouge_MENACE"
    ]
  },
  "stades_maturite": {
    "Hababouk": "Fruit noué",
    "Kimri": "Vert croissance",
    "Khalal": "Jaune/rouge dur",
    "Rutab": "Ramollissement partiel",
    "Tamr": "Maturité complète"
  },
  "alertes": [
    {
      "code": "PAL-01",
      "nom": "Stress hydrique",
      "priorite": "urgente"
    },
    {
      "code": "PAL-05",
      "nom": "Pluie maturation",
      "priorite": "urgente"
    },
    {
      "code": "PAL-08",
      "nom": "Suspicion Bayoud",
      "priorite": "critique"
    },
    {
      "code": "PAL-09",
      "nom": "Bayoud confirmé",
      "priorite": "critique"
    },
    {
      "code": "PAL-13",
      "nom": "Pollinisation requise",
      "priorite": "urgente"
    },
    {
      "code": "PAL-16",
      "nom": "Maturité récolte",
      "priorite": "info"
    }
  ],
  "modele_predictif": {
    "precision_intensif": {
      "R2": [
        0.5,
        0.65
      ],
      "MAE_pct": [
        25,
        35
      ]
    },
    "limite_majeure": "Pluie maturation imprévisible - peut détruire 30-80% récolte"
  },
  "plan_annuel_Mejhoul": {
    "jan": {
      "NPK": "N0.3+P0.3+K0.3",
      "travaux": "Taille"
    },
    "fev": {
      "NPK": "N0.4+P0.2+K0.2",
      "phyto": "Cuivre spathes"
    },
    "mar": {
      "NPK": "N0.4+K0.4",
      "travaux": "POLLINISATION"
    },
    "avr": {
      "NPK": "N0.3+P0.1+K0.5",
      "travaux": "Attachage"
    },
    "mai": {
      "NPK": "N0.3+K0.6",
      "travaux": "Éclaircissage"
    },
    "juin": {
      "NPK": "K0.8",
      "phyto": "Soufre Boufaroua"
    },
    "juil": {
      "NPK": "K0.8",
      "travaux": "Protection régimes"
    },
    "aout": {
      "NPK": "K0.5",
      "travaux": "Surveillance"
    },
    "sept": {
      "NPK": "K0.3",
      "travaux": "Début récolte"
    },
    "oct": {
      "travaux": "Récolte principale"
    },
    "nov": {
      "NPK": "N0.2",
      "phyto": "Huile cochenilles"
    },
    "dec": {
      "amendement": "Fumier 40kg",
      "travaux": "Entretien"
    }
  }
}$crop_ai_ref_palmier_dattier$::jsonb
)
ON CONFLICT (crop_type) DO UPDATE SET
  version = EXCLUDED.version,
  reference_data = EXCLUDED.reference_data,
  updated_at = NOW();

-- Evenements Parcelle RLS
CREATE POLICY "Users can view events in their organization" ON evenements_parcelle
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Users can insert events in their organization" ON evenements_parcelle
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Suivis Saison RLS
CREATE POLICY "Users can view seasons in their organization" ON suivis_saison
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );
CREATE POLICY "Users can manage seasons in their organization" ON suivis_saison
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Monitoring Analyses RLS
DROP POLICY IF EXISTS "org_read_monitoring_analyses" ON public.monitoring_analyses;
CREATE POLICY "org_read_monitoring_analyses" ON public.monitoring_analyses
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_monitoring_analyses" ON public.monitoring_analyses;
CREATE POLICY "org_write_monitoring_analyses" ON public.monitoring_analyses
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_monitoring_analyses" ON public.monitoring_analyses;
CREATE POLICY "org_update_monitoring_analyses" ON public.monitoring_analyses
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_monitoring_analyses" ON public.monitoring_analyses;
CREATE POLICY "org_delete_monitoring_analyses" ON public.monitoring_analyses
  FOR DELETE USING (public.is_organization_member(organization_id));

-- Weather Daily RLS
DROP POLICY IF EXISTS "org_read_weather_daily" ON public.weather_daily;
CREATE POLICY "org_read_weather_daily" ON public.weather_daily
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_weather_daily" ON public.weather_daily;
CREATE POLICY "org_write_weather_daily" ON public.weather_daily
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_weather_daily" ON public.weather_daily;
CREATE POLICY "org_update_weather_daily" ON public.weather_daily
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_weather_daily" ON public.weather_daily;
CREATE POLICY "org_delete_weather_daily" ON public.weather_daily
  FOR DELETE USING (public.is_organization_member(organization_id));

-- Weather Forecast RLS
DROP POLICY IF EXISTS "org_read_weather_forecast" ON public.weather_forecast;
CREATE POLICY "org_read_weather_forecast" ON public.weather_forecast
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_weather_forecast" ON public.weather_forecast;
CREATE POLICY "org_write_weather_forecast" ON public.weather_forecast
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_weather_forecast" ON public.weather_forecast;
CREATE POLICY "org_update_weather_forecast" ON public.weather_forecast
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_weather_forecast" ON public.weather_forecast;
CREATE POLICY "org_delete_weather_forecast" ON public.weather_forecast
  FOR DELETE USING (public.is_organization_member(organization_id));

-- Yield Forecasts RLS
DROP POLICY IF EXISTS "org_read_yield_forecasts" ON public.yield_forecasts;
CREATE POLICY "org_read_yield_forecasts" ON public.yield_forecasts
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_yield_forecasts" ON public.yield_forecasts;
CREATE POLICY "org_write_yield_forecasts" ON public.yield_forecasts
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_yield_forecasts" ON public.yield_forecasts;
CREATE POLICY "org_update_yield_forecasts" ON public.yield_forecasts
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_yield_forecasts" ON public.yield_forecasts;
CREATE POLICY "org_delete_yield_forecasts" ON public.yield_forecasts
  FOR DELETE USING (public.is_organization_member(organization_id));

-- =====================================================
-- AI TABLE REALTIME PUBLICATION
-- =====================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calibrations;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_alerts;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_recommendations;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_interventions;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoring_analyses;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.weather_daily;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.weather_forecast;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.yield_forecasts;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

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

-- Read: Users can see farms from organizations they're members of
CREATE POLICY "org_read_farms" ON farms
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

-- Insert: Authenticated users can create farms for organizations they're members of
CREATE POLICY "org_write_farms" ON farms
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

-- Update: Users can update farms from organizations they're members of
CREATE POLICY "org_update_farms" ON farms
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

-- Delete: Users can delete farms from organizations they're members of
CREATE POLICY "org_delete_farms" ON farms
  FOR DELETE USING (
    is_organization_member(organization_id)
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
        AND is_organization_member(farms.organization_id)
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
          AND is_organization_member(farms.organization_id)
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
        AND is_organization_member(farms.organization_id)
    )
  );

-- Delete: Users can delete farm roles for farms they have access to, or their own roles
CREATE POLICY "org_delete_farm_roles" ON farm_management_roles
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND is_organization_member(farms.organization_id)
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
    is_organization_member(organization_id)
  );

CREATE POLICY "org_write_parcels" ON parcels
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

CREATE POLICY "org_update_parcels" ON parcels
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

CREATE POLICY "org_delete_parcels" ON parcels
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- =====================================================
-- ADDITIONAL RLS POLICIES FOR ALL TABLES WITH RLS ENABLED
-- =====================================================
-- This section ensures all tables with RLS enabled have proper policies
-- =====================================================

-- =====================================================
-- WORKER & TASK MANAGEMENT TABLES
-- =====================================================

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
        AND is_organization_member(tasks.organization_id)
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
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_update_task_comments" ON task_comments;
CREATE POLICY "org_update_task_comments" ON task_comments
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_delete_task_comments" ON task_comments;
CREATE POLICY "org_delete_task_comments" ON task_comments
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_comments.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

-- Task Time Logs Policies (check through task relationship)
DROP POLICY IF EXISTS "org_read_task_time_logs" ON task_time_logs;
CREATE POLICY "org_read_task_time_logs" ON task_time_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_time_logs.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_write_task_time_logs" ON task_time_logs;
CREATE POLICY "org_write_task_time_logs" ON task_time_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_time_logs.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_update_task_time_logs" ON task_time_logs;
CREATE POLICY "org_update_task_time_logs" ON task_time_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_time_logs.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_delete_task_time_logs" ON task_time_logs;
CREATE POLICY "org_delete_task_time_logs" ON task_time_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_time_logs.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

-- Task Dependencies Policies (check through task relationship)
DROP POLICY IF EXISTS "org_read_task_dependencies" ON task_dependencies;
CREATE POLICY "org_read_task_dependencies" ON task_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_write_task_dependencies" ON task_dependencies;
CREATE POLICY "org_write_task_dependencies" ON task_dependencies
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_update_task_dependencies" ON task_dependencies;
CREATE POLICY "org_update_task_dependencies" ON task_dependencies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_delete_task_dependencies" ON task_dependencies;
CREATE POLICY "org_delete_task_dependencies" ON task_dependencies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_dependencies.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

-- Task Equipment Policies (check through task relationship)
DROP POLICY IF EXISTS "org_read_task_equipment" ON task_equipment;
CREATE POLICY "org_read_task_equipment" ON task_equipment
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_equipment.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_write_task_equipment" ON task_equipment;
CREATE POLICY "org_write_task_equipment" ON task_equipment
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_equipment.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_update_task_equipment" ON task_equipment;
CREATE POLICY "org_update_task_equipment" ON task_equipment
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_equipment.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_delete_task_equipment" ON task_equipment;
CREATE POLICY "org_delete_task_equipment" ON task_equipment
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_equipment.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

-- Work Records Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_work_records" ON work_records;
CREATE POLICY "org_read_work_records" ON work_records
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_work_records" ON work_records;
CREATE POLICY "org_write_work_records" ON work_records
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_work_records" ON work_records;
CREATE POLICY "org_update_work_records" ON work_records
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_work_records" ON work_records;
CREATE POLICY "org_delete_work_records" ON work_records
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Metayage Settlements Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_read_metayage_settlements" ON metayage_settlements
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_write_metayage_settlements" ON metayage_settlements
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_update_metayage_settlements" ON metayage_settlements
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_delete_metayage_settlements" ON metayage_settlements
  FOR DELETE USING (
    is_organization_member(organization_id)
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

-- Product Applications Policies
DROP POLICY IF EXISTS "product_applications_select_org" ON product_applications;
CREATE POLICY "product_applications_select_org" ON product_applications
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "product_applications_insert_org" ON product_applications;
CREATE POLICY "product_applications_insert_org" ON product_applications
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "product_applications_update_org" ON product_applications;
CREATE POLICY "product_applications_update_org" ON product_applications
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "product_applications_delete_org" ON product_applications;
CREATE POLICY "product_applications_delete_org" ON product_applications
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
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
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_analyses" ON analyses;
CREATE POLICY "org_write_analyses" ON analyses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_analyses" ON analyses;
CREATE POLICY "org_update_analyses" ON analyses
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_analyses" ON analyses;
CREATE POLICY "org_delete_analyses" ON analyses
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Analysis Recommendations Policies (check through analysis relationship - no org_id on this table)
DROP POLICY IF EXISTS "org_access_analysis_recommendations" ON analysis_recommendations;
CREATE POLICY "org_access_analysis_recommendations" ON analysis_recommendations
  FOR ALL USING (
    analysis_id IN (
      SELECT a.id FROM analyses a
      WHERE is_organization_member(a.organization_id)
    )
  );

-- Soil Analyses Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_soil_analyses" ON soil_analyses;
CREATE POLICY "org_read_soil_analyses" ON soil_analyses
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_soil_analyses" ON soil_analyses;
CREATE POLICY "org_write_soil_analyses" ON soil_analyses
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_soil_analyses" ON soil_analyses;
CREATE POLICY "org_update_soil_analyses" ON soil_analyses
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_soil_analyses" ON soil_analyses;
CREATE POLICY "org_delete_soil_analyses" ON soil_analyses
  FOR DELETE USING (
    is_organization_member(organization_id)
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
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_parcel_reports" ON parcel_reports;
CREATE POLICY "org_write_parcel_reports" ON parcel_reports
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_parcel_reports" ON parcel_reports;
CREATE POLICY "org_update_parcel_reports" ON parcel_reports
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_parcel_reports" ON parcel_reports;
CREATE POLICY "org_delete_parcel_reports" ON parcel_reports
  FOR DELETE USING (
    is_organization_member(organization_id)
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
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_crops" ON crops;
CREATE POLICY "org_write_crops" ON crops
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_crops" ON crops;
CREATE POLICY "org_update_crops" ON crops
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_crops" ON crops;
CREATE POLICY "org_delete_crops" ON crops
  FOR DELETE USING (
    is_organization_member(organization_id)
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
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_trees" ON trees;
CREATE POLICY "org_write_trees" ON trees
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_trees" ON trees;
CREATE POLICY "org_update_trees" ON trees
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_trees" ON trees;
CREATE POLICY "org_delete_trees" ON trees
  FOR DELETE USING (
    is_organization_member(organization_id)
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
        AND is_organization_member(farms.organization_id)
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
          AND is_organization_member(farms.organization_id)
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
        AND is_organization_member(farms.organization_id)
    ) OR
    (organization_id IS NOT NULL AND is_organization_member(organization_id))
  );

DROP POLICY IF EXISTS "org_delete_inventory" ON inventory;
CREATE POLICY "org_delete_inventory" ON inventory
  FOR DELETE USING (
    farm_id IS NULL OR EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = inventory.farm_id
        AND is_organization_member(farms.organization_id)
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
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_utilities" ON utilities;
CREATE POLICY "org_write_utilities" ON utilities
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_utilities" ON utilities;
CREATE POLICY "org_update_utilities" ON utilities
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_utilities" ON utilities;
CREATE POLICY "org_delete_utilities" ON utilities
  FOR DELETE USING (
    is_organization_member(organization_id)
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
    is_organization_member(organization_id) OR is_system_template = true
  );

DROP POLICY IF EXISTS "org_write_role_templates" ON role_templates;
CREATE POLICY "org_write_role_templates" ON role_templates
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_role_templates" ON role_templates;
CREATE POLICY "org_update_role_templates" ON role_templates
  FOR UPDATE USING (
    is_organization_member(organization_id) OR is_system_template = true
  );

DROP POLICY IF EXISTS "org_delete_role_templates" ON role_templates;
CREATE POLICY "org_delete_role_templates" ON role_templates
  FOR DELETE USING (
    is_organization_member(organization_id) AND is_system_template = false
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

-- Audit Logs Policies are set after table creation (line 13270+)

-- Financial Transactions Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_financial_transactions" ON financial_transactions;
CREATE POLICY "org_read_financial_transactions" ON financial_transactions
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_financial_transactions" ON financial_transactions;
CREATE POLICY "org_write_financial_transactions" ON financial_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_financial_transactions" ON financial_transactions;
CREATE POLICY "org_update_financial_transactions" ON financial_transactions
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_financial_transactions" ON financial_transactions;
CREATE POLICY "org_delete_financial_transactions" ON financial_transactions
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Livestock Policies (using organization_id directly)
DROP POLICY IF EXISTS "org_read_livestock" ON livestock;
CREATE POLICY "org_read_livestock" ON livestock
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_livestock" ON livestock;
CREATE POLICY "org_write_livestock" ON livestock
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_livestock" ON livestock;
CREATE POLICY "org_update_livestock" ON livestock
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_livestock" ON livestock;
CREATE POLICY "org_delete_livestock" ON livestock
  FOR DELETE USING (
    is_organization_member(organization_id)
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

-- Satellite PAR Cache Policies
DROP POLICY IF EXISTS "read_satellite_par_data" ON satellite_par_data;
CREATE POLICY "read_satellite_par_data" ON satellite_par_data
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "write_satellite_par_data" ON satellite_par_data;
CREATE POLICY "write_satellite_par_data" ON satellite_par_data
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "update_satellite_par_data" ON satellite_par_data;
CREATE POLICY "update_satellite_par_data" ON satellite_par_data
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "delete_satellite_par_data" ON satellite_par_data;
CREATE POLICY "delete_satellite_par_data" ON satellite_par_data
  FOR DELETE USING (
    auth.uid() IS NOT NULL
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
CREATE OR REPLACE VIEW assignable_users WITH (security_invoker = true) AS
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
  event_data JSONB DEFAULT '{}'::jsonb,
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
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM internal_admins
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;

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

-- IMPORTANT: This materialized view requires periodic refresh.
-- Schedule via pg_cron or Supabase Edge Function:
--   SELECT cron.schedule('refresh-admin-org-summary', '0 */6 * * *',
--     $$REFRESH MATERIALIZED VIEW CONCURRENTLY admin_org_summary$$);

-- View for daily organization growth
CREATE OR REPLACE VIEW admin_org_growth WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at)::date as date,
  COUNT(*) as new_orgs,
  SUM(COUNT(*)) OVER (ORDER BY date_trunc('day', created_at)) as cumulative_orgs
FROM organizations
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- View for subscription breakdown
CREATE OR REPLACE VIEW admin_subscription_breakdown WITH (security_invoker = true) AS
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
CREATE OR REPLACE VIEW admin_event_distribution WITH (security_invoker = true) AS
SELECT
  event_type,
  DATE(occurred_at) as date,
  COUNT(*) as count
FROM events
WHERE occurred_at > NOW() - INTERVAL '30 days'
GROUP BY event_type, DATE(occurred_at)
ORDER BY date DESC, count DESC;

-- View for top organizations by activity
CREATE OR REPLACE VIEW admin_top_orgs_by_activity WITH (security_invoker = true) AS
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
CREATE OR REPLACE VIEW admin_churn_risk WITH (security_invoker = true) AS
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
CREATE OR REPLACE VIEW admin_reference_data_stats WITH (security_invoker = true) AS
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
  MAX(updated_at)
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
CREATE OR REPLACE VIEW admin_recent_jobs WITH (security_invoker = true) AS
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
  images JSONB DEFAULT '[]'::jsonb,
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
  shipping_details JSONB DEFAULT '{}'::jsonb, -- { name, phone, email, address, city, postal_code }
  payment_method TEXT DEFAULT 'cod', -- 'cod', 'cmi', 'paypal', etc.
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'refunded'
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'disputed')),
  CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  CHECK (shipping_details ? 'name')
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
  total_price NUMERIC(12, 2) DEFAULT 0, -- computed in service layer
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
CREATE OR REPLACE VIEW auth_users_view WITH (security_invoker = true) AS
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
  FOR ALL
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

-- Orders Policies
CREATE POLICY "Participants can view orders" ON marketplace_orders
  FOR SELECT USING (
    public.is_organization_member(buyer_organization_id) OR
    public.is_organization_member(seller_organization_id)
  );

CREATE POLICY "Buyers can create orders" ON marketplace_orders
  FOR INSERT WITH CHECK (
    public.is_organization_member(buyer_organization_id)
  );

-- Order Items Policies
CREATE POLICY "Participants can view order items" ON marketplace_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_orders o
      WHERE o.id = marketplace_order_items.order_id
      AND (
        public.is_organization_member(o.buyer_organization_id) OR
        public.is_organization_member(o.seller_organization_id)
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
  organization_id UUID NOT NULL REFERENCES organizations(id),
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

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS FOR MARKETPLACE REFERENCES
-- =====================================================
-- These FK constraints were deferred because stock_movements is created
-- before marketplace_listings and marketplace_order_items

-- Add foreign key constraint for marketplace_listing_id in stock_movements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stock_movements_marketplace_listing_id_fkey'
    ) THEN
        ALTER TABLE stock_movements
        ADD CONSTRAINT stock_movements_marketplace_listing_id_fkey
        FOREIGN KEY (marketplace_listing_id) 
        REFERENCES marketplace_listings(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint for marketplace_order_item_id in stock_movements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'stock_movements_marketplace_order_item_id_fkey'
    ) THEN
        ALTER TABLE stock_movements
        ADD CONSTRAINT stock_movements_marketplace_order_item_id_fkey
        FOREIGN KEY (marketplace_order_item_id) 
        REFERENCES marketplace_order_items(id) ON DELETE SET NULL;
    END IF;
END $$;
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
    -- Reviewer must belong to one of the caller's organizations
    public.is_organization_member(reviewer_organization_id)
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
    public.is_organization_member(reviewer_organization_id)
    AND created_at > NOW() - INTERVAL '7 days'
  )
  WITH CHECK (
    public.is_organization_member(reviewer_organization_id)
  );

-- Reviewers can delete their own reviews
CREATE POLICY "Reviewers can delete own reviews" ON marketplace_reviews
  FOR DELETE USING (
    public.is_organization_member(reviewer_organization_id)
  );

-- Grant permissions for reviews
GRANT SELECT ON marketplace_reviews TO anon;
GRANT ALL ON marketplace_reviews TO authenticated;

COMMENT ON TABLE marketplace_reviews IS 'Reviews between buyers and sellers after order completion';

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Ensure storage.buckets has the "public" column (required for older Supabase setups)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'public'
  ) THEN
    ALTER TABLE storage.buckets ADD COLUMN "public" boolean DEFAULT false;
  END IF;
END $$;

-- Create products storage bucket for marketplace images
INSERT INTO storage.buckets (id, name, "public")
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET "public" = true;

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
USING (
  bucket_id = 'products'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'products'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own product images
CREATE POLICY "Users can delete own product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'products'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- AVATARS STORAGE BUCKET
-- =====================================================

-- Create avatars storage bucket for user profile images
INSERT INTO storage.buckets (id, name, "public")
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET "public" = true;

-- Drop existing policies if they exist (cleanup for idempotency)
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Policy: Public read access for avatars bucket
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy: Authenticated users can upload to avatars bucket
CREATE POLICY "Authenticated upload for avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

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
    public.is_organization_member(organization_id)
  );

-- Organizations can insert their own files
CREATE POLICY "Organizations can insert own files" ON file_registry
  FOR INSERT WITH CHECK (
    public.is_organization_member(organization_id)
  );

-- Organizations can update their own files
CREATE POLICY "Organizations can update own files" ON file_registry
  FOR UPDATE USING (
    public.is_organization_member(organization_id)
  )
  WITH CHECK (
    public.is_organization_member(organization_id)
  );

-- Organizations can delete their own files
CREATE POLICY "Organizations can delete own files" ON file_registry
  FOR DELETE USING (
    public.is_organization_member(organization_id)
  );

-- Grant permissions
GRANT ALL ON file_registry TO authenticated;

COMMENT ON TABLE file_registry IS 'Tracks all uploaded files across storage buckets with orphan detection';

-- Note: Existing files in storage.objects should be registered in file_registry
-- by application code when files are accessed or through a migration script
-- that can properly map files to organizations. This cannot be done here because:
-- 1. Migrations don't have auth context
-- 2. We cannot determine organization_id from storage.objects alone

-- =====================================================
-- File Usage Statistics View
-- Aggregate file storage usage by bucket and organization
-- =====================================================

CREATE OR REPLACE VIEW file_storage_stats WITH (security_invoker = true) AS
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
    public.is_organization_member(requester_organization_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sellers can view requests sent to them
DO $$ BEGIN
CREATE POLICY "Sellers can view requests sent to them"
  ON marketplace_quote_requests
  FOR SELECT
  USING (
    public.is_organization_member(seller_organization_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Buyers can create quote requests
DO $$ BEGIN
CREATE POLICY "Authenticated users can create quote requests"
  ON marketplace_quote_requests
  FOR INSERT
  WITH CHECK (
    public.is_organization_member(requester_organization_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sellers can update requests sent to them (to respond/quote)
DO $$ BEGIN
CREATE POLICY "Sellers can update their received requests"
  ON marketplace_quote_requests
  FOR UPDATE
  USING (
    public.is_organization_member(seller_organization_id)
  )
  WITH CHECK (
    public.is_organization_member(seller_organization_id)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Buyers can update their own requests (to cancel)
DO $$ BEGIN
CREATE POLICY "Buyers can update their own requests"
  ON marketplace_quote_requests
  FOR UPDATE
  USING (
    public.is_organization_member(requester_organization_id)
  )
  WITH CHECK (
    public.is_organization_member(requester_organization_id)
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

  cycle_type VARCHAR(20) DEFAULT 'annual',
  cycle_category VARCHAR(50),
  is_perennial BOOLEAN DEFAULT false,
  cycle_start_year INTEGER,
  cycle_end_year INTEGER,
  biological_asset_id UUID,
  template_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,

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
CREATE INDEX IF NOT EXISTS idx_crop_cycles_biological_asset ON crop_cycles(biological_asset_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_dates ON crop_cycles(planting_date, expected_harvest_end);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_crop_type ON crop_cycles(organization_id, crop_type);

-- Add foreign key constraint to stock_entries (deferred because crop_cycles table is created after stock_entries)
ALTER TABLE stock_entries ADD CONSTRAINT fk_stock_entries_crop_cycle_id FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE SET NULL;

-- Add foreign key constraint to stock_movements (deferred because crop_cycles table is created after stock_movements)
ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_movements_crop_cycle_id FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE SET NULL;

-- Add foreign key constraints to tasks (deferred because crop_cycles and agricultural_campaigns are created after tasks)
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_crop_cycle_id FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_campaign_id FOREIGN KEY (campaign_id) REFERENCES agricultural_campaigns(id) ON DELETE SET NULL;

-- Add foreign key constraint to plan_interventions (deferred because crop_cycles is created after plan_interventions)
ALTER TABLE plan_interventions ADD CONSTRAINT fk_plan_interventions_crop_cycle_id FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE SET NULL;

-- Crop Templates (global and per-organization crop configuration)
CREATE TABLE IF NOT EXISTS crop_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  crop_type VARCHAR(100) NOT NULL,
  crop_name VARCHAR(255) NOT NULL,
  cycle_type VARCHAR(20) NOT NULL DEFAULT 'annual',
  cycle_category VARCHAR(50),
  is_perennial BOOLEAN DEFAULT false,
  typical_duration_days INTEGER,
  typical_duration_months INTEGER,
  typical_planting_months INTEGER[],
  typical_harvest_months INTEGER[],
  yield_unit VARCHAR(20) DEFAULT 'kg',
  average_yield_per_ha NUMERIC,
  code_prefix VARCHAR(10),
  stages JSONB,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crop_templates_org ON crop_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_crop_templates_global ON crop_templates(is_global) WHERE is_global = true;

ALTER TABLE crop_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crop_templates_select_global" ON crop_templates;
CREATE POLICY "crop_templates_select_global" ON crop_templates
  FOR SELECT USING (is_global = true);

DROP POLICY IF EXISTS "crop_templates_select_org" ON crop_templates;
CREATE POLICY "crop_templates_select_org" ON crop_templates
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "crop_templates_manage_org" ON crop_templates;
CREATE POLICY "crop_templates_manage_org" ON crop_templates
  FOR ALL USING (organization_id IN (
    SELECT ou.organization_id FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid() AND r.name IN ('system_admin', 'organization_admin')
  ));

-- FK from crop_cycles.template_id to crop_templates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_crop_cycles_template') THEN
    ALTER TABLE crop_cycles
      ADD CONSTRAINT fk_crop_cycles_template
      FOREIGN KEY (template_id) REFERENCES crop_templates(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Crop Cycle Stages (tracking stages within a crop cycle)
CREATE TABLE IF NOT EXISTS crop_cycle_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
  stage_name VARCHAR(50) NOT NULL,
  stage_order INTEGER NOT NULL,
  expected_start_date DATE,
  actual_start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crop_cycle_id, stage_order)
);

CREATE INDEX IF NOT EXISTS idx_crop_cycle_stages_cycle ON crop_cycle_stages(crop_cycle_id);

ALTER TABLE crop_cycle_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crop_cycle_stages_select" ON crop_cycle_stages;
CREATE POLICY "crop_cycle_stages_select" ON crop_cycle_stages
  FOR SELECT USING (crop_cycle_id IN (
    SELECT id FROM crop_cycles WHERE organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "crop_cycle_stages_manage" ON crop_cycle_stages;
CREATE POLICY "crop_cycle_stages_manage" ON crop_cycle_stages
  FOR ALL USING (crop_cycle_id IN (
    SELECT id FROM crop_cycles WHERE organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid() AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  ));

-- Harvest Events (multiple harvests per crop cycle)
CREATE TABLE IF NOT EXISTS harvest_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
  harvest_date DATE NOT NULL,
  harvest_number INTEGER NOT NULL,
  quantity NUMERIC,
  quantity_unit VARCHAR(20) DEFAULT 'kg',
  quality_grade VARCHAR(20),
  quality_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harvest_events_cycle ON harvest_events(crop_cycle_id);

ALTER TABLE harvest_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "harvest_events_select" ON harvest_events;
CREATE POLICY "harvest_events_select" ON harvest_events
  FOR SELECT USING (crop_cycle_id IN (
    SELECT id FROM crop_cycles WHERE organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "harvest_events_manage" ON harvest_events;
CREATE POLICY "harvest_events_manage" ON harvest_events
  FOR ALL USING (crop_cycle_id IN (
    SELECT id FROM crop_cycles WHERE organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid() AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  ));

-- Seed global Morocco crop templates
INSERT INTO crop_templates (crop_type, crop_name, cycle_type, cycle_category, is_perennial, typical_duration_months, typical_planting_months, typical_harvest_months, yield_unit, average_yield_per_ha, code_prefix, is_global)
VALUES
  ('wheat', 'Blé tendre', 'annual', 'medium', false, 7, ARRAY[11], ARRAY[6], 'quintaux', 20, 'BLE', true),
  ('barley', 'Orge', 'annual', 'medium', false, 6, ARRAY[11], ARRAY[5], 'quintaux', 18, 'ORG', true),
  ('olive', 'Olivier', 'perennial', 'perennial', true, 12, ARRAY[0], ARRAY[12], 'kg', 2500, 'OLV', true),
  ('citrus', 'Agrumes', 'perennial', 'perennial', true, 12, ARRAY[0], ARRAY[1], 'tonnes', 25, 'AGR', true),
  ('tomato', 'Tomate', 'annual', 'medium', false, 4, ARRAY[3], ARRAY[7], 'tonnes', 80, 'TOM', true),
  ('potato', 'Pomme de terre', 'annual', 'medium', false, 4, ARRAY[2], ARRAY[6], 'tonnes', 30, 'PDT', true),
  ('sugar_beet', 'Betterave sucrière', 'annual', 'long', false, 9, ARRAY[9], ARRAY[6], 'tonnes', 60, 'BET', true),
  ('date_palm', 'Palmier dattier', 'perennial', 'perennial', true, 12, ARRAY[0], ARRAY[10], 'kg', 6000, 'DAT', true)
ON CONFLICT DO NOTHING;

-- Add foreign key constraints for tables that reference time dimension tables
-- These are added here because the referenced tables (fiscal_years, fiscal_periods, agricultural_campaigns, crop_cycles, biological_assets)
-- are created after the tables that reference them

DO $$
BEGIN
  -- cost_centers foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_cost_centers_crop_cycle_id'
    AND conrelid = 'cost_centers'::regclass
  ) THEN
    ALTER TABLE cost_centers
    ADD CONSTRAINT fk_cost_centers_crop_cycle_id
    FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_cost_centers_fiscal_year_id'
    AND conrelid = 'cost_centers'::regclass
  ) THEN
    ALTER TABLE cost_centers
    ADD CONSTRAINT fk_cost_centers_fiscal_year_id
    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id) ON DELETE SET NULL;
  END IF;

  -- journal_items foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_journal_items_crop_cycle_id'
    AND conrelid = 'journal_items'::regclass
  ) THEN
    ALTER TABLE journal_items
    ADD CONSTRAINT fk_journal_items_crop_cycle_id
    FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_journal_items_campaign_id'
    AND conrelid = 'journal_items'::regclass
  ) THEN
    ALTER TABLE journal_items
    ADD CONSTRAINT fk_journal_items_campaign_id
    FOREIGN KEY (campaign_id) REFERENCES agricultural_campaigns(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_journal_items_fiscal_year_id'
    AND conrelid = 'journal_items'::regclass
  ) THEN
    ALTER TABLE journal_items
    ADD CONSTRAINT fk_journal_items_fiscal_year_id
    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_journal_items_fiscal_period_id'
    AND conrelid = 'journal_items'::regclass
  ) THEN
    ALTER TABLE journal_items
    ADD CONSTRAINT fk_journal_items_fiscal_period_id
    FOREIGN KEY (fiscal_period_id) REFERENCES fiscal_periods(id) ON DELETE SET NULL;
  END IF;

  -- harvest_records foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_harvest_records_crop_cycle_id'
    AND conrelid = 'harvest_records'::regclass
  ) THEN
    ALTER TABLE harvest_records
    ADD CONSTRAINT fk_harvest_records_crop_cycle_id
    FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_harvest_records_campaign_id'
    AND conrelid = 'harvest_records'::regclass
  ) THEN
    ALTER TABLE harvest_records
    ADD CONSTRAINT fk_harvest_records_campaign_id
    FOREIGN KEY (campaign_id) REFERENCES agricultural_campaigns(id) ON DELETE SET NULL;
  END IF;

  -- costs foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_costs_crop_cycle_id'
    AND conrelid = 'costs'::regclass
  ) THEN
    ALTER TABLE costs
    ADD CONSTRAINT fk_costs_crop_cycle_id
    FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_costs_campaign_id'
    AND conrelid = 'costs'::regclass
  ) THEN
    ALTER TABLE costs
    ADD CONSTRAINT fk_costs_campaign_id
    FOREIGN KEY (campaign_id) REFERENCES agricultural_campaigns(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_costs_fiscal_year_id'
    AND conrelid = 'costs'::regclass
  ) THEN
    ALTER TABLE costs
    ADD CONSTRAINT fk_costs_fiscal_year_id
    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_costs_fiscal_period_id'
    AND conrelid = 'costs'::regclass
  ) THEN
    ALTER TABLE costs
    ADD CONSTRAINT fk_costs_fiscal_period_id
    FOREIGN KEY (fiscal_period_id) REFERENCES fiscal_periods(id) ON DELETE SET NULL;
  END IF;

  -- revenues foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_revenues_crop_cycle_id'
    AND conrelid = 'revenues'::regclass
  ) THEN
    ALTER TABLE revenues
    ADD CONSTRAINT fk_revenues_crop_cycle_id
    FOREIGN KEY (crop_cycle_id) REFERENCES crop_cycles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_revenues_campaign_id'
    AND conrelid = 'revenues'::regclass
  ) THEN
    ALTER TABLE revenues
    ADD CONSTRAINT fk_revenues_campaign_id
    FOREIGN KEY (campaign_id) REFERENCES agricultural_campaigns(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_revenues_fiscal_year_id'
    AND conrelid = 'revenues'::regclass
  ) THEN
    ALTER TABLE revenues
    ADD CONSTRAINT fk_revenues_fiscal_year_id
    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_revenues_fiscal_period_id'
    AND conrelid = 'revenues'::regclass
  ) THEN
    ALTER TABLE revenues
    ADD CONSTRAINT fk_revenues_fiscal_period_id
    FOREIGN KEY (fiscal_period_id) REFERENCES fiscal_periods(id) ON DELETE SET NULL;
  END IF;
END $$;

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

-- Add foreign key constraint for crop_cycles -> biological_assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_crop_cycles_biological_asset_id'
    AND conrelid = 'crop_cycles'::regclass
  ) THEN
    ALTER TABLE crop_cycles
    ADD CONSTRAINT fk_crop_cycles_biological_asset_id
    FOREIGN KEY (biological_asset_id) REFERENCES biological_assets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key constraint for journal_items -> biological_assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_journal_items_biological_asset_id'
    AND conrelid = 'journal_items'::regclass
  ) THEN
    ALTER TABLE journal_items
    ADD CONSTRAINT fk_journal_items_biological_asset_id
    FOREIGN KEY (biological_asset_id) REFERENCES biological_assets(id) ON DELETE SET NULL;
  END IF;
END $$;

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

-- 8.1. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('planting', 'harvest', 'maintenance', 'fertilization', 'irrigation', 'pest_control', 'marketing', 'other')),
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  budget DECIMAL(12, 2) CHECK (budget >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  farm_ids UUID[] DEFAULT '{}',
  parcel_ids UUID[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'completed', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_start_date ON campaigns(start_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_end_date ON campaigns(end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_priority ON campaigns(priority);
CREATE INDEX IF NOT EXISTS idx_campaigns_farm_ids ON campaigns USING GIN(farm_ids);
CREATE INDEX IF NOT EXISTS idx_campaigns_parcel_ids ON campaigns USING GIN(parcel_ids);

-- Add RLS (Row Level Security)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Organization members can view campaigns
DROP POLICY IF EXISTS "Organization members can view campaigns" ON campaigns;
CREATE POLICY "Organization members can view campaigns"
  ON campaigns FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Organization admins and farm managers can insert campaigns
DROP POLICY IF EXISTS "Organization admins and farm managers can insert campaigns" ON campaigns;
CREATE POLICY "Organization admins and farm managers can insert campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
      AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
      AND ou.is_active = true
    )
  );

-- Organization admins and farm managers can update campaigns
DROP POLICY IF EXISTS "Organization admins and farm managers can update campaigns" ON campaigns;
CREATE POLICY "Organization admins and farm managers can update campaigns"
  ON campaigns FOR UPDATE
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
      AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
      AND ou.is_active = true
    )
  );

-- Organization admins and farm managers can delete campaigns
DROP POLICY IF EXISTS "Organization admins and farm managers can delete campaigns" ON campaigns;
CREATE POLICY "Organization admins and farm managers can delete campaigns"
  ON campaigns FOR DELETE
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
      AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
      AND ou.is_active = true
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campaigns_updated_at ON campaigns;
CREATE TRIGGER trigger_update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Add comment
COMMENT ON TABLE campaigns IS 'Stores agricultural campaigns and projects';
COMMENT ON COLUMN campaigns.type IS 'Type of campaign';
COMMENT ON COLUMN campaigns.status IS 'Current status of campaign';
COMMENT ON COLUMN campaigns.priority IS 'Priority level of campaign';
COMMENT ON COLUMN campaigns.farm_ids IS 'Array of farm IDs associated with campaign';
COMMENT ON COLUMN campaigns.parcel_ids IS 'Array of parcel IDs associated with campaign';

-- 8.2. QUALITY INSPECTIONS TABLE
CREATE TABLE IF NOT EXISTS quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('pre_harvest', 'post_harvest', 'storage', 'transport', 'processing')),
  inspection_date DATE NOT NULL,
  inspector_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed', 'cancelled')),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quality_inspections_organization_id ON quality_inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_farm_id ON quality_inspections(farm_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_parcel_id ON quality_inspections(parcel_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_crop_cycle_id ON quality_inspections(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_type ON quality_inspections(type);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_status ON quality_inspections(status);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_inspection_date ON quality_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_overall_score ON quality_inspections(overall_score);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_results ON quality_inspections USING GIN(results);

-- Add RLS (Row Level Security)
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Organization members can view quality inspections
DROP POLICY IF EXISTS "Organization members can view quality inspections" ON quality_inspections;
CREATE POLICY "Organization members can view quality inspections"
  ON quality_inspections FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Organization admins and farm managers can insert quality inspections
DROP POLICY IF EXISTS "Organization admins and farm managers can insert quality inspections" ON quality_inspections;
CREATE POLICY "Organization admins and farm managers can insert quality inspections"
  ON quality_inspections FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
      AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
      AND ou.is_active = true
    )
  );

-- Organization admins and farm managers can update quality inspections
DROP POLICY IF EXISTS "Organization admins and farm managers can update quality inspections" ON quality_inspections;
CREATE POLICY "Organization admins and farm managers can update quality inspections"
  ON quality_inspections FOR UPDATE
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
      AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
      AND ou.is_active = true
    )
  );

-- Organization admins and farm managers can delete quality inspections
DROP POLICY IF EXISTS "Organization admins and farm managers can delete quality inspections" ON quality_inspections;
CREATE POLICY "Organization admins and farm managers can delete quality inspections"
  ON quality_inspections FOR DELETE
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
      AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
      AND ou.is_active = true
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quality_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quality_inspections_updated_at ON quality_inspections;
CREATE TRIGGER trigger_update_quality_inspections_updated_at
  BEFORE UPDATE ON quality_inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_quality_inspections_updated_at();

-- Add comment
COMMENT ON TABLE quality_inspections IS 'Stores quality inspection records for crops, harvests, and products';
COMMENT ON COLUMN quality_inspections.type IS 'Type of quality inspection';
COMMENT ON COLUMN quality_inspections.results IS 'JSONB object containing inspection results and measurements';
COMMENT ON COLUMN quality_inspections.overall_score IS 'Overall quality score from 0 to 100';
COMMENT ON COLUMN quality_inspections.attachments IS 'Array of attachment URLs (photos, documents, etc.)';



-- 10. REPORTING VIEWS
CREATE OR REPLACE VIEW crop_cycle_pnl WITH (security_invoker = true) AS
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

CREATE OR REPLACE VIEW campaign_summary WITH (security_invoker = true) AS
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

CREATE OR REPLACE VIEW fiscal_campaign_reconciliation WITH (security_invoker = true) AS
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

-- Enable RLS and create policies for account_mappings
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

-- Trigger for account mappings updated_at
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
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "org_ai_settings_insert" ON organization_ai_settings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_users ou
            JOIN roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = organization_ai_settings.organization_id
                AND r.name IN ('organization_admin', 'system_admin')
                AND ou.is_active = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "org_ai_settings_update" ON organization_ai_settings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_users ou
            JOIN roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = organization_ai_settings.organization_id
                AND r.name IN ('organization_admin', 'system_admin')
                AND ou.is_active = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "org_ai_settings_delete" ON organization_ai_settings
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM organization_users ou
            JOIN roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = organization_ai_settings.organization_id
                AND r.name IN ('organization_admin', 'system_admin')
                AND ou.is_active = true
        )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON organization_ai_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_ai_settings TO service_role;

COMMENT ON TABLE organization_ai_settings IS 'Stores encrypted API keys for AI providers (OpenAI, Gemini) per organization';
COMMENT ON COLUMN organization_ai_settings.encrypted_api_key IS 'API key encrypted with AES-256-GCM. Never expose this directly to clients.';

-- =====================================================
-- Chat conversations table (2025-01-12)
-- =====================================================
-- Chat conversations table for storing AI chat history
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'fr', 'ar')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_org_user_created
  ON public.chat_conversations(organization_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_org_created
  ON public.chat_conversations(organization_id, created_at DESC);

-- Add comments
COMMENT ON TABLE public.chat_conversations IS 'Stores chat conversation history between users and AI assistant';
COMMENT ON COLUMN public.chat_conversations.metadata IS 'Additional metadata like tokens used, model info, etc.';
COMMENT ON COLUMN public.chat_conversations.role IS 'Message role: either "user" or "assistant"';
COMMENT ON COLUMN public.chat_conversations.content IS 'Message content text';

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own conversations in their organization
DO $$ BEGIN
CREATE POLICY "Users can view their own chat history"
  ON public.chat_conversations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can insert their own messages"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Users can delete their own messages"
  ON public.chat_conversations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, DELETE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.chat_conversations TO service_role;

-- =====================================================
-- Chat Pending Actions (two-phase tool execution)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  CONSTRAINT uq_chat_pending_actions_user_org UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_pending_actions_user_org
  ON public.chat_pending_actions(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_chat_pending_actions_expires
  ON public.chat_pending_actions(expires_at);

COMMENT ON TABLE public.chat_pending_actions IS 'Stores pending chat tool actions awaiting user confirmation (one per user per org)';

-- Enable RLS
ALTER TABLE public.chat_pending_actions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
CREATE POLICY "Users can manage their own pending actions"
  ON public.chat_pending_actions FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND user_id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_pending_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_pending_actions TO service_role;

-- =====================================================
-- 2025-01-10: Organizations Multi-Country Accounting Support
-- =====================================================

-- Create accounting standards enum type
DO $$ BEGIN
  CREATE TYPE accounting_standard_enum AS ENUM (
    'CGNC',      -- Morocco
    'PCG',       -- France
    'PCN',       -- Tunisia
    'US_GAAP',   -- USA
    'FRS102',    -- UK
    'HGB',       -- Germany
    'IFRS',      -- International
    'OHADA'      -- Africa
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2025-01-10: Cost Centers Enhancements
-- =====================================================

-- Create cost_center_budgets table
CREATE TABLE IF NOT EXISTS cost_center_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  budget_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  variance DECIMAL(15,2) DEFAULT 0, -- computed in service layer
  variance_percentage DECIMAL(5,2) DEFAULT 0, -- computed in service layer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_parent ON cost_centers(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_centers_default_expense_account ON cost_centers(default_expense_account_id) WHERE default_expense_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_centers_default_revenue_account ON cost_centers(default_revenue_account_id) WHERE default_revenue_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_centers_budget_fiscal_year ON cost_centers(budget_fiscal_year) WHERE budget_fiscal_year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cost_center_budgets_cc ON cost_center_budgets(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_cost_center_budgets_year ON cost_center_budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_cost_center_budgets_account ON cost_center_budgets(account_id) WHERE account_id IS NOT NULL;

-- Unique index for cost_center_id + fiscal_year + account_id (with NULL handling)
CREATE UNIQUE INDEX idx_cost_center_budgets_unique
  ON cost_center_budgets(cost_center_id, fiscal_year, COALESCE(account_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE TRIGGER update_cost_center_budgets_updated_at
  BEFORE UPDATE ON cost_center_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE cost_center_budgets IS 'Budget vs actual tracking for cost centers by fiscal year and account';
COMMENT ON COLUMN cost_centers.budget_currency IS 'Currency code for the budget (e.g., MAD, EUR, USD)';
COMMENT ON COLUMN cost_centers.default_expense_account_id IS 'Default expense account for this cost center';

-- Drop and recreate indexes
DROP INDEX IF EXISTS idx_account_mappings_lookup;
DROP INDEX IF EXISTS idx_account_mappings_template_lookup;
DROP INDEX IF EXISTS idx_account_mappings_org_override;

CREATE UNIQUE INDEX idx_account_mappings_template_lookup
  ON account_mappings(country_code, accounting_standard, mapping_type, mapping_key)
  WHERE organization_id IS NULL AND is_default = true;

CREATE UNIQUE INDEX idx_account_mappings_org_override
  ON account_mappings(organization_id, mapping_type, mapping_key)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_mappings_country ON account_mappings(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_mappings_standard ON account_mappings(accounting_standard) WHERE accounting_standard IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_mappings_org ON account_mappings(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_mappings_hierarchy ON account_mappings(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_account_mappings_is_default ON account_mappings(is_default) WHERE is_default = true;

ALTER TABLE account_mappings
  ADD CONSTRAINT chk_account_mappings_hierarchy_level
  CHECK (hierarchy_level IN (0, 1, 2));

-- Comments
COMMENT ON COLUMN account_mappings.country_code IS 'ISO 3166-1 alpha-2 country code for country-specific templates';
COMMENT ON COLUMN account_mappings.is_default IS 'TRUE = part of default country template, FALSE = custom organization mapping';
COMMENT ON COLUMN account_mappings.hierarchy_level IS 'Mapping inheritance level: 0=global, 1=country template, 2=organization override';

-- =====================================================
-- 2025-01-10: Account Translations
-- =====================================================

CREATE TABLE IF NOT EXISTS account_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_account_translations_account ON account_translations(account_id);
CREATE INDEX IF NOT EXISTS idx_account_translations_language ON account_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_account_translations_account_language ON account_translations(account_id, language_code);

DROP TRIGGER IF EXISTS update_account_translations_updated_at ON account_translations;
CREATE TRIGGER update_account_translations_updated_at
  BEFORE UPDATE ON account_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE account_translations IS 'Account name and description translations for multi-language support';
COMMENT ON COLUMN account_translations.language_code IS 'ISO 639-1 language code (en, fr, es, ar, de, it, pt, etc.)';

-- =====================================================
-- 2025-01-10: Tax Configurations
-- =====================================================

CREATE TABLE IF NOT EXISTS tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2),
  -- NULL = system default rates per country; set for org-specific overrides
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tax_name VARCHAR(255) NOT NULL,
  tax_code VARCHAR(50),
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_type VARCHAR(50) NOT NULL,
  applies_to VARCHAR(50)[] NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_compound BOOLEAN DEFAULT false,
  is_reverse_charge BOOLEAN DEFAULT false,
  effective_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  account_id UUID REFERENCES accounts(id),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (organization_id IS NULL OR country_code IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_tax_configurations_country ON tax_configurations(country_code) WHERE organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_tax_configurations_org ON tax_configurations(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tax_configurations_type ON tax_configurations(tax_type);
CREATE INDEX IF NOT EXISTS idx_tax_configurations_is_default ON tax_configurations(is_default) WHERE is_default = true;

CREATE UNIQUE INDEX idx_tax_configurations_country_unique
  ON tax_configurations(country_code, tax_type, tax_code)
  WHERE organization_id IS NULL AND is_default = true;

CREATE UNIQUE INDEX idx_tax_configurations_org_unique
  ON tax_configurations(organization_id, tax_type, tax_code)
  WHERE organization_id IS NOT NULL;

DO $$ BEGIN
  CREATE TYPE tax_type_enum AS ENUM (
    'vat', 'sales_tax', 'gst', 'income_tax', 'excise', 'withholding', 'customs', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TRIGGER update_tax_configurations_updated_at
  BEFORE UPDATE ON tax_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Default tax configurations for countries
INSERT INTO tax_configurations (country_code, tax_name, tax_code, tax_rate, tax_type, applies_to, is_default, description) VALUES
  ('MA', 'TVA Normal 20%', 'TVA20', 20.00, 'vat', ARRAY['sales', 'purchases', 'services'], true, 'Standard VAT rate for most goods and services in Morocco'),
  ('MA', 'TVA Intermédiaire 14%', 'TVA14', 14.00, 'vat', ARRAY['sales', 'services'], false, 'Intermediate VAT rate for certain services'),
  ('MA', 'TVA Réduite 10%', 'TVA10', 10.00, 'vat', ARRAY['sales', 'purchases', 'services'], false, 'Reduced VAT rate for essential goods'),
  ('FR', 'TVA Normal 20%', 'TVA20', 20.00, 'vat', ARRAY['sales', 'purchases', 'services'], true, 'Standard VAT rate in France'),
  ('FR', 'TVA Intermédiaire 10%', 'TVA10', 10.00, 'vat', ARRAY['sales', 'services'], false, 'Intermediate VAT rate for accommodation, transport, restaurants'),
  ('GB', 'Standard VAT', 'VAT_STD', 20.00, 'vat', ARRAY['sales', 'purchases', 'services'], true, 'Standard VAT rate in the UK'),
  ('DE', 'Mehrwertsteuer Normal', 'MwSt19', 19.00, 'vat', ARRAY['sales', 'purchases', 'services'], true, 'Standard VAT rate in Germany'),
  ('TN', 'TVA Normal 19%', 'TVA19', 19.00, 'vat', ARRAY['sales', 'purchases', 'services'], true, 'Standard VAT rate in Tunisia'),
  ('US', 'State Sales Tax (Average)', 'SALES_TAX', 6.00, 'sales_tax', ARRAY['sales', 'services'], true, 'Average state sales tax rate (varies by state)')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE tax_configurations IS 'Tax rate configurations by country and organization for VAT, sales tax, and other taxes';
COMMENT ON COLUMN tax_configurations.tax_rate IS 'Tax rate as percentage (e.g., 20.00 = 20%)';
COMMENT ON COLUMN tax_configurations.is_compound IS 'TRUE = compound tax (calculated on amount including other taxes)';

-- =====================================================
-- PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- GIN indexes for JSONB columns (improves JSON query performance)
CREATE INDEX IF NOT EXISTS idx_parcels_boundary ON parcels USING GIN (boundary);
CREATE INDEX IF NOT EXISTS idx_organizations_settings ON organizations USING GIN (accounting_settings);
CREATE INDEX IF NOT EXISTS idx_account_mappings_metadata ON account_mappings USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_tax_configurations_metadata ON tax_configurations USING GIN (metadata);

-- Composite indexes for common query patterns (organization + status/filter + date)
CREATE INDEX IF NOT EXISTS idx_invoices_org_status_date ON invoices(organization_id, status, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounting_payments_org_status_date ON accounting_payments(organization_id, status, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status_priority ON tasks(organization_id, status, priority, due_date);
CREATE INDEX IF NOT EXISTS idx_harvest_records_org_date ON harvest_records(organization_id, harvest_date DESC);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_org_status ON crop_cycles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_workers_org_active ON workers(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reception_batches_org_status ON reception_batches(organization_id, status, reception_date DESC);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_org_date ON quality_inspections(organization_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_org_status ON sales_orders(organization_id, status, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_status ON purchase_orders(organization_id, status, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org_date ON journal_entries(organization_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_entries_org_date ON stock_entries(organization_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_org_date ON deliveries(organization_id, delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_records_org_date ON work_records(organization_id, work_date DESC);

-- Full-text search indexes for important text fields
CREATE INDEX IF NOT EXISTS idx_organizations_name_fts ON organizations USING GIN (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_organizations_name_fts_fr ON organizations USING GIN (to_tsvector('french', name));
CREATE INDEX IF NOT EXISTS idx_parcels_name_fts ON parcels USING GIN (to_tsvector('english', COALESCE(name, '')));
CREATE INDEX IF NOT EXISTS idx_items_name_fts ON items USING GIN (to_tsvector('english', COALESCE(item_name, '')));
CREATE INDEX IF NOT EXISTS idx_workers_name_fts ON workers USING GIN (to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')));
CREATE INDEX IF NOT EXISTS idx_suppliers_name_fts ON suppliers USING GIN (to_tsvector('english', COALESCE(name, '')));
CREATE INDEX IF NOT EXISTS idx_customers_name_fts ON customers USING GIN (to_tsvector('english', COALESCE(name, '')));
CREATE INDEX IF NOT EXISTS idx_warehouses_name_fts ON warehouses USING GIN (to_tsvector('english', COALESCE(name, '')));

-- =====================================================
-- DATA INTEGRITY CONSTRAINTS
-- =====================================================

-- =====================================================
-- NOTE: Email and phone format validations have been moved to NestJS API
-- using class-validator decorators (@IsEmail(), @Matches())
-- The following constraints are dropped to avoid regex errors in PostgreSQL
-- =====================================================

-- Drop email format constraints (validation moved to NestJS)
DO $$
BEGIN
  -- Organizations email
  ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_organizations_email_format;

  -- User profiles email
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS chk_user_profiles_email_format;

  -- Suppliers email
  ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS chk_suppliers_email_format;

  -- Customers email
  ALTER TABLE customers DROP CONSTRAINT IF EXISTS chk_customers_email_format;

  -- Workers email
  ALTER TABLE workers DROP CONSTRAINT IF EXISTS chk_workers_email_format;
END $$;

-- Drop phone format constraints (validation moved to NestJS)
DO $$
BEGIN
  -- Organizations phone
  ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_organizations_phone_format;
END $$;

-- Business rule constraints: date ranges
DO $$
BEGIN
  -- Crop cycles: harvest dates should be after planting date
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_crop_cycles_date_range'
  ) THEN
    ALTER TABLE crop_cycles ADD CONSTRAINT chk_crop_cycles_date_range
      CHECK (
        (expected_harvest_end IS NULL OR planting_date IS NULL OR expected_harvest_end >= planting_date)
        AND (actual_harvest_end IS NULL OR planting_date IS NULL OR actual_harvest_end >= planting_date)
      );
  END IF;

  -- Tasks: due_date >= created_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_date_range'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT chk_tasks_date_range
      CHECK (due_date IS NULL OR created_at IS NULL OR due_date >= created_at);
  END IF;

  -- Fiscal years: end_date >= start_date
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fiscal_years_date_range'
  ) THEN
    ALTER TABLE fiscal_years ADD CONSTRAINT chk_fiscal_years_date_range
      CHECK (end_date >= start_date);
  END IF;
END $$;

-- Numeric value constraints
DO $$
BEGIN
  -- Overall score must be between 0 and 100 for quality_inspections
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_quality_inspections_overall_score_range'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quality_inspections' AND column_name = 'overall_score'
  ) THEN
    ALTER TABLE quality_inspections ADD CONSTRAINT chk_quality_inspections_overall_score_range
      CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100));
  END IF;

  -- Workers daily wage should be positive
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_workers_daily_rate_positive'
  ) THEN
    ALTER TABLE workers ADD CONSTRAINT chk_workers_daily_rate_positive
      CHECK (daily_rate IS NULL OR daily_rate >= 0);
  END IF;

  -- Areas should be positive
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_parcels_area_positive'
  ) THEN
    ALTER TABLE parcels ADD CONSTRAINT chk_parcels_area_positive
      CHECK (area IS NULL OR area > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_farms_size_positive'
  ) THEN
    ALTER TABLE farms ADD CONSTRAINT chk_farms_size_positive
      CHECK (size IS NULL OR size > 0);
  END IF;
END $$;

-- =====================================================
-- AUDIT LOGGING
-- =====================================================

-- Audit logs table to track all data changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
-- Users can see their own audit logs or org members can see org logs
DROP POLICY IF EXISTS "org_read_audit_logs" ON audit_logs;
CREATE POLICY "org_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE user_id = auth.uid()
        AND organization_id = audit_logs.organization_id
        AND is_active = true
    )
  );

-- Only authenticated users can insert audit logs (done via triggers)
DROP POLICY IF EXISTS "org_write_audit_logs" ON audit_logs;
CREATE POLICY "org_write_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND user_id = auth.uid()
      AND (
        organization_id IS NULL
        OR public.is_organization_member(organization_id)
      )
    )
  );

GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;

COMMENT ON TABLE audit_logs IS 'Audit trail for all data changes across the system';
COMMENT ON COLUMN audit_logs.table_name IS 'Name of the table where the change occurred';
COMMENT ON COLUMN audit_logs.record_id IS 'ID of the affected record';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN audit_logs.old_data IS 'Previous state of the record (for UPDATE and DELETE)';
COMMENT ON COLUMN audit_logs.new_data IS 'New state of the record (for INSERT and UPDATE)';
COMMENT ON COLUMN audit_logs.changed_fields IS 'List of fields that were modified (for UPDATE)';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the user making the change';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/user agent string';

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_changed_fields TEXT[];
  v_organization_id UUID;
BEGIN
  -- Determine organization_id based on table type
  -- For organizations table, use its own id; for others, use organization_id column
  IF TG_TABLE_NAME = 'organizations' THEN
    IF TG_OP = 'DELETE' THEN
      v_organization_id := OLD.id;
    ELSE
      v_organization_id := NEW.id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_organization_id := OLD.organization_id;
  ELSE
    v_organization_id := NEW.organization_id;
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    v_old_data := to_jsonb(OLD) - 'encrypted_api_key' - 'password' - 'password_hash' - 'secret' - 'token' - 'api_key';
    INSERT INTO audit_logs (
      table_name, record_id, action, old_data, user_id, organization_id
    )
    VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      v_old_data,
      auth.uid(),
      v_organization_id
    );
    RETURN OLD;

  -- Handle INSERT
  ELSIF (TG_OP = 'INSERT') THEN
    v_new_data := to_jsonb(NEW) - 'encrypted_api_key' - 'password' - 'password_hash' - 'secret' - 'token' - 'api_key';
    INSERT INTO audit_logs (
      table_name, record_id, action, new_data, user_id, organization_id
    )
    VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      v_new_data,
      auth.uid(),
      v_organization_id
    );
    RETURN NEW;

  -- Handle UPDATE
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_data := to_jsonb(OLD) - 'encrypted_api_key' - 'password' - 'password_hash' - 'secret' - 'token' - 'api_key';
    v_new_data := to_jsonb(NEW) - 'encrypted_api_key' - 'password' - 'password_hash' - 'secret' - 'token' - 'api_key';

    -- Detect changed fields by comparing JSONB objects
    -- Get keys where values are different
    SELECT ARRAY_AGG(KEY) INTO v_changed_fields
    FROM (
      SELECT KEY
      FROM jsonb_each_text(v_old_data)
      WHERE v_old_data->>KEY IS DISTINCT FROM v_new_data->>KEY
    ) changed;

    IF v_changed_fields IS NOT NULL AND array_length(v_changed_fields, 1) > 0 THEN
      INSERT INTO audit_logs (
        table_name, record_id, action, old_data, new_data, changed_fields, user_id, organization_id
      )
      VALUES (
        TG_TABLE_NAME,
        NEW.id,
        'UPDATE',
        v_old_data,
        v_new_data,
        v_changed_fields,
        auth.uid(),
        v_organization_id
      );
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
DO $$
BEGIN
  -- Organizations
  DROP TRIGGER IF EXISTS audit_organizations ON organizations;
  CREATE TRIGGER audit_organizations AFTER INSERT OR UPDATE OR DELETE ON organizations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

  -- Users (workers)
  DROP TRIGGER IF EXISTS audit_workers ON workers;
  CREATE TRIGGER audit_workers AFTER INSERT OR UPDATE OR DELETE ON workers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

  -- Financial tables
  DROP TRIGGER IF EXISTS audit_invoices ON invoices;
  CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

  DROP TRIGGER IF EXISTS audit_accounting_payments ON accounting_payments;
  CREATE TRIGGER audit_accounting_payments AFTER INSERT OR UPDATE OR DELETE ON accounting_payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

  DROP TRIGGER IF EXISTS audit_journal_entries ON journal_entries;
  CREATE TRIGGER audit_journal_entries AFTER INSERT OR UPDATE OR DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

  -- Production tables
  DROP TRIGGER IF EXISTS audit_crop_cycles ON crop_cycles;
  CREATE TRIGGER audit_crop_cycles AFTER INSERT OR UPDATE OR DELETE ON crop_cycles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

  DROP TRIGGER IF EXISTS audit_harvest_records ON harvest_records;
  CREATE TRIGGER audit_harvest_records AFTER INSERT OR UPDATE OR DELETE ON harvest_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

  DROP TRIGGER IF EXISTS audit_reception_batches ON reception_batches;
  CREATE TRIGGER audit_reception_batches AFTER INSERT OR UPDATE OR DELETE ON reception_batches
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

  -- Cost centers
  DROP TRIGGER IF EXISTS audit_cost_centers ON cost_centers;
  CREATE TRIGGER audit_cost_centers AFTER INSERT OR UPDATE OR DELETE ON cost_centers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

  -- Tasks
  DROP TRIGGER IF EXISTS audit_tasks ON tasks;
  CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
END $$;

-- =====================================================
-- SOFT DELETE INDEXES (soft delete logic handled in NestJS service layer)
-- =====================================================

-- Indexes for soft delete queries (deleted_at columns are defined in table definitions)
CREATE INDEX IF NOT EXISTS idx_workers_deleted ON workers(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crop_cycles_deleted ON crop_cycles(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_harvest_records_deleted ON harvest_records(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================
-- TABLE AND COLUMN COMMENTS FOR CORE TABLES
-- =====================================================

-- Organizations
COMMENT ON TABLE organizations IS 'Organizations/farms using the AgriTech platform';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly identifier for the organization';
COMMENT ON COLUMN organizations.logo_url IS 'URL to the organization logo image';
COMMENT ON COLUMN organizations.is_active IS 'Whether the organization is currently active';

-- Organization Users
COMMENT ON TABLE organization_users IS 'Junction table linking users to organizations with role information';
COMMENT ON COLUMN organization_users.is_active IS 'Whether the user is active in this organization';

-- Users (Workers)
COMMENT ON TABLE workers IS 'Workers, employees, and laborers in the organization';
COMMENT ON COLUMN workers.worker_type IS 'Type of worker: employee, day_laborer, or metayage';
COMMENT ON COLUMN workers.daily_rate IS 'Daily wage rate for the worker';
COMMENT ON COLUMN workers.is_active IS 'Employment status of the worker';

-- Parcels
COMMENT ON TABLE parcels IS 'Land parcels/fields within farms for crop cultivation';
COMMENT ON COLUMN parcels.area IS 'Size of the parcel in the specified unit';
COMMENT ON COLUMN parcels.area_unit IS 'Unit of measurement for area (hectare, acre, etc.)';
COMMENT ON COLUMN parcels.boundary IS 'GeoJSON boundary for mapping and geospatial queries';
COMMENT ON COLUMN parcels.is_active IS 'Whether the parcel is currently in use';

-- Farms
COMMENT ON TABLE farms IS 'Farms or agricultural operations within an organization';
COMMENT ON COLUMN farms.size IS 'Size of the farm in the specified unit';
COMMENT ON COLUMN farms.location IS 'Geographic location or address of the farm';

-- Crop Cycles
COMMENT ON TABLE crop_cycles IS 'Growing cycles for crops on specific parcels';
COMMENT ON COLUMN crop_cycles.planting_date IS 'Planting or start date of the cycle';
COMMENT ON COLUMN crop_cycles.expected_harvest_end IS 'Expected harvest end date';
COMMENT ON COLUMN crop_cycles.actual_harvest_end IS 'Actual harvest end date';
COMMENT ON COLUMN crop_cycles.status IS 'Current status: planned, active, completed, or cancelled';

-- Harvest Records
COMMENT ON TABLE harvest_records IS 'Harvest records tracking crop yields';
COMMENT ON COLUMN harvest_records.harvest_date IS 'Date when harvest was collected';
COMMENT ON COLUMN harvest_records.quantity IS 'Amount harvested in the specified unit';
COMMENT ON COLUMN harvest_records.quality_grade IS 'Quality assessment of the harvest';

-- Tasks
COMMENT ON TABLE tasks IS 'Work tasks and assignments for workers';
COMMENT ON COLUMN tasks.status IS 'Current task status: pending, in_progress, completed, or cancelled';
COMMENT ON COLUMN tasks.priority IS 'Task priority level: low, medium, high, or urgent';
COMMENT ON COLUMN tasks.due_date IS 'Deadline or target date for task completion';

-- Cost Centers
COMMENT ON TABLE cost_centers IS 'Organizational units for tracking costs and budgets';
COMMENT ON COLUMN cost_centers.annual_budget IS 'Annual budget allocation for this cost center';

-- Invoices
COMMENT ON TABLE invoices IS 'Sales and purchase invoices for billing';
COMMENT ON COLUMN invoices.invoice_type IS 'Type: sales (outgoing) or purchase (incoming)';
COMMENT ON COLUMN invoices.status IS 'Invoice status: draft, sent, paid, partially_paid, or cancelled';
COMMENT ON COLUMN invoices.grand_total IS 'Final total including taxes and discounts';

-- Accounting Payments
COMMENT ON TABLE accounting_payments IS 'Payment records for invoices';
COMMENT ON COLUMN accounting_payments.status IS 'Payment status: pending, completed, or cancelled';
COMMENT ON COLUMN accounting_payments.payment_method IS 'Method of payment: cash, transfer, card, check, etc.';

-- Journal Entries
COMMENT ON TABLE journal_entries IS 'Accounting journal entries for double-entry bookkeeping';
COMMENT ON COLUMN journal_entries.entry_date IS 'Date of the financial transaction';
COMMENT ON COLUMN journal_entries.status IS 'Entry status: draft, posted, or cancelled';

-- Fiscal Years
COMMENT ON TABLE fiscal_years IS 'Fiscal/financial year periods for accounting';
COMMENT ON COLUMN fiscal_years.is_current IS 'Whether this is the currently active fiscal year';

-- Quality Inspections
COMMENT ON TABLE quality_inspections IS 'Quality inspection and testing records';
COMMENT ON COLUMN quality_inspections.overall_score IS 'Overall quality score from 0 to 100';

-- Reception Batches
COMMENT ON TABLE reception_batches IS 'Records of harvested crop batches received at warehouses';
COMMENT ON COLUMN reception_batches.status IS 'Status: pending, received, rejected, or in_quality_control';

-- Warehouses
COMMENT ON TABLE warehouses IS 'Storage facilities for inventory and harvests';
COMMENT ON COLUMN warehouses.location IS 'Physical location or address of the warehouse';

-- Items (Inventory)
COMMENT ON TABLE items IS 'Inventory items and products';
COMMENT ON COLUMN items.default_unit IS 'Default unit of measurement for the item';
COMMENT ON COLUMN items.minimum_stock_level IS 'Minimum stock level for reordering';

-- Stock Entries
COMMENT ON TABLE stock_entries IS 'Stock movement records (in/out transfers)';
COMMENT ON COLUMN stock_entries.entry_type IS 'Type: in (receipt), out (issuance), transfer, or adjustment';

-- Suppliers
COMMENT ON TABLE suppliers IS 'Vendor and supplier records for purchases';
COMMENT ON COLUMN suppliers.is_active IS 'Whether the supplier is currently active';

-- Customers
COMMENT ON TABLE customers IS 'Customer records for sales';
COMMENT ON COLUMN customers.customer_type IS 'Type: individual, business, or government';

-- Sales Orders
COMMENT ON TABLE sales_orders IS 'Customer sales orders';
COMMENT ON COLUMN sales_orders.status IS 'Order status: draft, confirmed, partial, delivered, or cancelled';

-- Purchase Orders
COMMENT ON TABLE purchase_orders IS 'Vendor purchase orders';
COMMENT ON COLUMN purchase_orders.status IS 'Order status: draft, confirmed, partial, received, or cancelled';

-- Deliveries
COMMENT ON TABLE deliveries IS 'Delivery records for orders';
COMMENT ON COLUMN deliveries.delivery_date IS 'Actual date of delivery';
COMMENT ON COLUMN deliveries.status IS 'Delivery status: pending, in_transit, delivered, or cancelled';

-- Work Records
COMMENT ON TABLE work_records IS 'Daily work records for laborers';
COMMENT ON COLUMN work_records.work_date IS 'Date when work was performed';
COMMENT ON COLUMN work_records.payment_status IS 'Payment status: pending, paid, or cancelled';

-- =====================================================
-- SECURITY HELPER FUNCTIONS
-- =====================================================

-- Function to check if user has permission to access organization data
CREATE OR REPLACE FUNCTION check_organization_access(p_user_id UUID, p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_users
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND is_active = true
  );
END;
$$;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_org_role(p_user_id UUID, p_organization_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  SELECT role_id INTO v_role_id
  FROM organization_users
  WHERE user_id = p_user_id
  AND organization_id = p_organization_id
  AND is_active = true;

  RETURN v_role_id;
END;
$$;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Active workers view (excludes deleted/inactive)
CREATE OR REPLACE VIEW v_active_workers WITH (security_invoker = true) AS
SELECT
  w.id,
  w.organization_id,
  w.first_name,
  w.last_name,
  w.first_name || ' ' || w.last_name AS full_name,
  w.worker_type,
  w.daily_rate,
  w.phone,
  w.email,
  f.name AS farm_name,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('pending', 'in_progress')) AS active_tasks_count
FROM workers w
LEFT JOIN farms f ON f.id = w.farm_id
LEFT JOIN tasks t ON t.assigned_to = w.id
WHERE w.is_active = true
  AND w.deleted_at IS NULL
GROUP BY w.id, w.organization_id, w.first_name, w.last_name, w.worker_type, w.daily_rate, w.phone, w.email, f.name;

COMMENT ON VIEW v_active_workers IS 'Active workers with their assigned tasks count';

-- Active crop cycles view
CREATE OR REPLACE VIEW v_active_crop_cycles WITH (security_invoker = true) AS
SELECT
  cc.id,
  cc.organization_id,
  cc.farm_id,
  f.name AS farm_name,
  cc.parcel_id,
  p.name AS parcel_name,
  cc.crop_type,
  cc.planting_date,
  cc.expected_harvest_end,
  cc.status,
  cc.expected_total_yield,
  cc.actual_total_yield,
  DATE_PART('day', AGE(COALESCE(cc.expected_harvest_end, CURRENT_DATE), cc.planting_date)) AS days_active,
  CASE
    WHEN cc.status = 'active' THEN ROUND(((CURRENT_DATE - cc.planting_date) /
      NULLIF((COALESCE(cc.expected_harvest_end, CURRENT_DATE) - cc.planting_date), 0)) * 100, 1)
    ELSE NULL
  END AS progress_percentage
FROM crop_cycles cc
LEFT JOIN farms f ON f.id = cc.farm_id
LEFT JOIN parcels p ON p.id = cc.parcel_id
WHERE cc.status IN ('planned', 'active')
  AND cc.deleted_at IS NULL
ORDER BY cc.planting_date DESC;

COMMENT ON VIEW v_active_crop_cycles IS 'Active and planned crop cycles with progress tracking';

-- Financial summary by organization
CREATE OR REPLACE VIEW v_organization_financial_summary WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.currency_code,
  COUNT(DISTINCT i.id) FILTER (WHERE i.invoice_type = 'sales') AS sales_invoices_count,
  COALESCE(SUM(i.grand_total) FILTER (WHERE i.invoice_type = 'sales' AND i.status IN ('submitted', 'paid', 'partially_paid')), 0) AS total_sales,
  COALESCE(SUM(i.grand_total) FILTER (WHERE i.invoice_type = 'purchase' AND i.status IN ('submitted', 'paid', 'partially_paid')), 0) AS total_purchases,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'reconciled'), 0) AS total_payments,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'submitted') AS pending_invoices_count,
  COALESCE(SUM(i.grand_total) FILTER (WHERE i.status = 'submitted'), 0) AS pending_amount,
  COUNT(DISTINCT je.id) AS journal_entries_count
FROM organizations o
LEFT JOIN invoices i ON i.organization_id = o.id
LEFT JOIN accounting_payments p ON p.organization_id = o.id
LEFT JOIN journal_entries je ON je.organization_id = o.id
GROUP BY o.id, o.name, o.currency_code;

COMMENT ON VIEW v_organization_financial_summary IS 'Financial summary metrics per organization';

-- Production summary view
CREATE OR REPLACE VIEW v_production_summary WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  EXTRACT(YEAR FROM h.harvest_date) AS harvest_year,
  COUNT(DISTINCT h.id) AS harvests_count,
  SUM(h.quantity) AS total_quantity,
  COUNT(DISTINCT cc.id) AS crop_cycles_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = true) AS active_parcels_count,
  COUNT(DISTINCT w.id) FILTER (WHERE w.is_active = true AND w.deleted_at IS NULL) AS active_workers_count
FROM organizations o
LEFT JOIN harvest_records h ON h.organization_id = o.id
LEFT JOIN crop_cycles cc ON cc.organization_id = o.id
LEFT JOIN parcels p ON p.organization_id = o.id
LEFT JOIN workers w ON w.organization_id = o.id
GROUP BY o.id, o.name, EXTRACT(YEAR FROM h.harvest_date)
ORDER BY harvest_year DESC;

COMMENT ON VIEW v_production_summary IS 'Production metrics summary by organization and year';

-- =====================================================
-- AI REPORT JOBS (Async Report Generation)
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  language VARCHAR(10) DEFAULT 'fr',
  data_start_date DATE,
  data_end_date DATE,
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  
  report_id UUID REFERENCES parcel_reports(id) ON DELETE SET NULL,
  result JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT ai_report_jobs_org_idx UNIQUE (id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_report_jobs_user_status ON ai_report_jobs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_report_jobs_org_status ON ai_report_jobs(organization_id, status, created_at DESC);

ALTER TABLE ai_report_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own organization ai report jobs" ON ai_report_jobs;
CREATE POLICY "Users can view own organization ai report jobs"
  ON ai_report_jobs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create ai report jobs" ON ai_report_jobs;
CREATE POLICY "Users can create ai report jobs"
  ON ai_report_jobs FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role can update ai report jobs" ON ai_report_jobs;
CREATE POLICY "Service role can update ai report jobs"
  ON ai_report_jobs FOR UPDATE
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE ai_report_jobs;

-- =====================================================
-- END OF MERGED MIGRATIONS
-- =====================================================

-- =====================================================
-- Migration: 20260127000000_add_module_addons.sql
-- =====================================================
-- Add Module Addons System
-- Migration Date: 2026-01-27
-- Description: Adds support for organization addons with module purchase/management

-- Add addon columns to modules table
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS is_addon_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS addon_price_monthly NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS addon_product_id VARCHAR(100);

COMMENT ON COLUMN modules.is_addon_eligible IS 'Whether this module can be purchased as an addon';
COMMENT ON COLUMN modules.addon_price_monthly IS 'Monthly price for this module when purchased as an addon';
COMMENT ON COLUMN modules.addon_product_id IS 'Polar product ID for addon subscription';

-- Create organization_addons table
CREATE TABLE IF NOT EXISTS organization_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  polar_subscription_id VARCHAR(100),
  polar_customer_id VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, trialing, canceled, past_due
  price_monthly NUMERIC(10, 2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, module_id)
);

COMMENT ON TABLE organization_addons IS 'Organization addon subscriptions for individual modules';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_addons_org ON organization_addons(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_addons_module ON organization_addons(module_id);
CREATE INDEX IF NOT EXISTS idx_organization_addons_status ON organization_addons(status);
CREATE INDEX IF NOT EXISTS idx_organization_addons_polar_subscription ON organization_addons(polar_subscription_id);

-- Add addon slot columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS included_addon_slots INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_addon_slots INTEGER DEFAULT 0;

COMMENT ON COLUMN subscriptions.included_addon_slots IS 'Number of addon slots included in the base subscription plan';
COMMENT ON COLUMN subscriptions.additional_addon_slots IS 'Number of additional addon slots purchased separately';

-- Enable Row Level Security
ALTER TABLE organization_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_addons
-- Users can read addons for their organizations
CREATE POLICY "org_read_organization_addons"
ON organization_addons FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Admins can insert addons for their organizations
CREATE POLICY "org_insert_organization_addons"
ON organization_addons FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
      AND role_id IN (SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin'))
  )
);

-- Admins can update addons for their organizations
CREATE POLICY "org_update_organization_addons"
ON organization_addons FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
      AND role_id IN (SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin'))
  )
);

-- Admins can delete addons for their organizations
CREATE POLICY "org_delete_organization_addons"
ON organization_addons FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
      AND role_id IN (SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin'))
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_organization_addons_updated_at
BEFORE UPDATE ON organization_addons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- Migration: 20260127100000_module_based_subscriptions.sql
-- =====================================================
-- Module-Based Subscriptions with Pricing
-- Migration Date: 2026-01-27
-- Description: Adds module pricing and subscription pricing configuration

-- Create module_prices table for individual module pricing
CREATE TABLE IF NOT EXISTS module_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  plan_type VARCHAR(50), -- null = all plans, 'essential', 'professional', 'enterprise'
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE module_prices IS 'Pricing for modules per plan type';

-- Create unique constraint for active pricing (only for entries without end date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_module_prices_active
ON module_prices(module_id, plan_type)
WHERE is_active = true AND valid_until IS NULL;

-- Create subscription_pricing table for global pricing configuration
CREATE TABLE IF NOT EXISTS subscription_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  value NUMERIC(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE subscription_pricing IS 'Global subscription pricing configuration';

-- Insert default pricing values
INSERT INTO subscription_pricing (config_key, value, description) VALUES
  ('base_price_monthly', 15, 'Base monthly price for subscription'),
  ('trial_days', 0, 'Number of trial days (stored as numeric)'),
  ('addon_slot_price', 5, 'Price per additional addon slot')
ON CONFLICT (config_key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE module_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies - public read for pricing data
CREATE POLICY "public_read_module_prices" ON module_prices FOR SELECT USING (true);
CREATE POLICY "public_read_subscription_pricing" ON subscription_pricing FOR SELECT USING (true);

-- Only admins can modify pricing
CREATE POLICY "admin_write_module_prices" ON module_prices FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_write_subscription_pricing" ON subscription_pricing FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);





-- Add updated_at triggers
CREATE TRIGGER update_module_prices_updated_at
BEFORE UPDATE ON module_prices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_pricing_updated_at
BEFORE UPDATE ON subscription_pricing
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- Migration: 20260127200000_generic_module_config.sql
-- =====================================================
-- Generic Module Configuration System
-- Migration Date: 2026-01-27
-- Description: Adds generic module configuration with caching and translation support

-- Add slug column to modules (for frontend routing)
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Update slugs for existing modules (if any)
UPDATE modules SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;

-- Add module configuration columns
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS color VARCHAR(20),
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dashboard_widgets JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS navigation_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN modules.slug IS 'URL-friendly identifier for the module';
COMMENT ON COLUMN modules.color IS 'Color theme for the module (hex code)';
COMMENT ON COLUMN modules.display_order IS 'Display order in UI';
COMMENT ON COLUMN modules.price_monthly IS 'Monthly price when purchased as part of subscription';
COMMENT ON COLUMN modules.is_required IS 'Whether this module is required for all organizations';
COMMENT ON COLUMN modules.is_recommended IS 'Whether this module is recommended for new organizations';
COMMENT ON COLUMN modules.dashboard_widgets IS 'Array of dashboard widgets provided by this module';
COMMENT ON COLUMN modules.navigation_items IS 'Array of navigation items for this module';
COMMENT ON COLUMN modules.features IS 'Array of feature descriptions for marketing';

-- Add translations table
CREATE TABLE IF NOT EXISTS module_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL, -- en, fr, ar, etc.
  name VARCHAR(100),
  description TEXT,
  features JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, locale)
);

COMMENT ON TABLE module_translations IS 'Translations for module names, descriptions, and features';

-- Enable Row Level Security
ALTER TABLE module_translations ENABLE ROW LEVEL SECURITY;

-- Public read for translations
CREATE POLICY "public_read_module_translations" ON module_translations FOR SELECT USING (true);

-- Admin write policies
CREATE POLICY "admin_write_module_translations" ON module_translations FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_module_translations_updated_at
BEFORE UPDATE ON module_translations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- Migration: 20260129000000_add_polar_aligned_modules.sql
-- =====================================================
-- Polar Payment Integration for Modules
-- Migration Date: 2026-01-29
-- Description: Aligns modules with Polar product IDs for subscription management

-- Add Polar product columns to modules
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS product_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS product_price_id VARCHAR(100);

COMMENT ON COLUMN modules.product_id IS 'Polar product ID for this module subscription';
COMMENT ON COLUMN modules.product_price_id IS 'Polar price ID for this module';

-- Create polar_subscriptions table for tracking Polar subscriptions
CREATE TABLE IF NOT EXISTS polar_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  polar_subscription_id VARCHAR(100) NOT NULL UNIQUE,
  polar_customer_id VARCHAR(100),
  polar_product_id VARCHAR(100),
  status VARCHAR(50) NOT NULL, -- active, trialing, canceled, past_due, incomplete
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  billing_interval VARCHAR(20) DEFAULT 'monthly',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE polar_subscriptions IS 'Polar subscription tracking for organizations';

-- Create polar_webhooks table for webhook event logging
CREATE TABLE IF NOT EXISTS polar_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(100) UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

COMMENT ON TABLE polar_webhooks IS 'Polar webhook event log for idempotency and debugging';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_polar_subscriptions_org ON polar_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_polar_subscriptions_status ON polar_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_polar_subscriptions_polar_id ON polar_subscriptions(polar_subscription_id);
CREATE INDEX IF NOT EXISTS idx_polar_webhooks_event_id ON polar_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_polar_webhooks_event_type ON polar_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_polar_webhooks_processed ON polar_webhooks(processed);

-- Enable Row Level Security
ALTER TABLE polar_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE polar_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polar_subscriptions
CREATE POLICY "org_read_polar_subscriptions"
ON polar_subscriptions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "admin_write_polar_subscriptions"
ON polar_subscriptions FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

-- RLS Policies for polar_webhooks (admin only)
CREATE POLICY "admin_read_polar_webhooks"
ON polar_webhooks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_write_polar_webhooks"
ON polar_webhooks FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);





-- Add updated_at triggers
CREATE TRIGGER update_polar_subscriptions_updated_at
BEFORE UPDATE ON polar_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


COMMENT ON COLUMN subscriptions.billing_interval IS 'Billing interval for the subscription: monthly or yearly';
COMMENT ON COLUMN polar_subscriptions.billing_interval IS 'Billing interval from Polar subscription: monthly or yearly';
-- =====================================================
-- Migration: 20260129000001_fix_rls_issues.sql
-- =====================================================
-- Fix RLS Issues
-- Migration Date: 2026-01-29
-- Description: Fixes Row Level Security policies for proper organization access

-- Fix module_prices RLS - should be publicly readable for pricing display
DROP POLICY IF EXISTS "admin_write_module_prices" ON module_prices;
CREATE POLICY "public_read_all_module_prices"
ON module_prices FOR SELECT
USING (true);

-- Fix subscription_pricing RLS - should be publicly readable
DROP POLICY IF EXISTS "admin_write_subscription_pricing" ON subscription_pricing;
CREATE POLICY "public_read_all_subscription_pricing"
ON subscription_pricing FOR SELECT
USING (true);

-- Add proper admin policies for pricing updates
CREATE POLICY "admin_update_module_prices"
ON module_prices FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_insert_module_prices"
ON module_prices FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_update_subscription_pricing"
ON subscription_pricing FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_insert_subscription_pricing"
ON subscription_pricing FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

-- Ensure modules table has proper RLS for read access
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_modules"
ON modules FOR SELECT
USING (is_available = true OR
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin', 'organization_admin')
  )
);

CREATE POLICY "admin_write_modules"
ON modules FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

-- Fix organization_modules RLS to allow users to see their org's modules
DROP POLICY IF EXISTS "org_read_organization_modules" ON organization_modules;
DROP POLICY IF EXISTS "org_write_organization_modules" ON organization_modules;

CREATE POLICY "org_read_own_organization_modules"
ON organization_modules FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "org_update_own_organization_modules"
ON organization_modules FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
      AND role_id IN (SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin'))
  )
);

CREATE POLICY "org_insert_own_organization_modules"
ON organization_modules FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
      AND role_id IN (SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin'))
  )
);

-- Ensure organization_addons RLS is properly set
DROP POLICY IF EXISTS "org_read_organization_addons" ON organization_addons;

CREATE POLICY "org_read_own_organization_addons"
ON organization_addons FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);


-- =====================================================
-- Migration: 20260129100000_make_products_bucket_private.sql
-- =====================================================
-- Make Products Storage Bucket Private
-- Migration Date: 2026-01-29
-- Description: Configures the products storage bucket to be private with controlled access

-- Note: This migration assumes the storage.products table exists
-- If using Supabase storage, the bucket configuration should be done via dashboard or API

-- Create storage bucket if it doesn't exist (for local development)
-- In production, this should be configured via Supabase dashboard
INSERT INTO storage.buckets (id, name, "public")
VALUES ('products', 'products', false)
ON CONFLICT (id) DO UPDATE SET "public" = false;

-- Policy: Allow anyone to view products (images) but not list the bucket
DROP POLICY IF EXISTS "Public read access for products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload for products" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_view_products" ON storage.objects;
CREATE POLICY "allow_public_view_products"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Policy: Only authenticated users can upload products
DROP POLICY IF EXISTS "allow_auth_upload_products" ON storage.objects;
CREATE POLICY "allow_auth_upload_products"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'products'
  AND auth.role() = 'authenticated'
);

-- Policy: Only the uploader or admin can update product files
DROP POLICY IF EXISTS "allow_owner_update_products" ON storage.objects;
CREATE POLICY "allow_owner_update_products"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'products'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin')
    )
  )
);

-- Policy: Only the uploader or admin can delete product files
DROP POLICY IF EXISTS "allow_owner_delete_products" ON storage.objects;
CREATE POLICY "allow_owner_delete_products"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'products'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin')
    )
  )
);

-- =====================================================
-- Migration: 20260129110000_add_crop_types_for_modules.sql
-- =====================================================
-- Add Crop Types for Module System
-- Migration Date: 2026-01-29
-- Description: Adds crop type data for module filtering and classification
-- (module_slug column is defined in the crop_types table)

-- Insert default crop types with module associations
INSERT INTO crop_types (name, name_fr, name_ar, description, description_fr, description_ar, organization_id, module_slug)
VALUES
  -- Fruit Trees (orchards module)
  ('Fruit Trees', 'Arbres fruitiers', 'أشجار الفاكهة',
   'Trees cultivated for their edible fruit', 'Arbres cultivés pour leurs fruits comestibles', 'أشجار تزرع من أجل ثمارها الصالحة للأكل',
   NULL, 'orchards'),
  ('Citrus', 'Agrumes', 'حمضيات',
   'Citrus fruit trees including oranges, lemons, and grapefruits', 'Agrumes comprenant les oranges, les citrons et les pamplemousses', 'أشجار الحمضيات بما في ذلك البرتقال والليمون والجريب فروت',
   NULL, 'orchards'),
  ('Stone Fruits', 'Fruits à noyau', 'فواكه ذات النواة',
   'Fruits with a large stone/pit (peaches, plums, apricots)', 'Fruits à noyau (pêches, prunes, abricots)', 'فواكه ذات نواة كبيرة (خوخ، برقوق، مشمش)',
   NULL, 'orchards'),
  ('Pome Fruits', 'Fruits à pépins', 'فواكه من الفصيلة الوردية',
   'Apples, pears, and quince', 'Pommes, poires et coings', 'التفاح والكمثرى والسفرجل',
   NULL, 'orchards'),
  ('Tropical Fruits', 'Fruits tropicaux', 'فواكه استوائية',
   'Bananas, mangoes, papaya, and other tropical fruits', 'Bananes, mangues, papayes et autres fruits tropicaux', 'موز، مانجو، بابايا وفواكه استوائية أخرى',
   NULL, 'orchards'),

  -- Cereals (general crops module)
  ('Cereals', 'Céréales', 'الحبوب',
   'Grain crops including wheat, barley, and corn', 'Cultures céréalières dont blé, orge et maïs', 'محاصيل الحبوب بما في ذلك القمح والشعير والذرة',
   NULL, 'crops'),
  ('Wheat', 'Blé', 'قمح',
   'Common wheat for flour production', 'Blé commun pour la production de farine', 'القمح الشائع لإنتاج الدقيق',
   NULL, 'crops'),
  ('Barley', 'Orge', 'شعير',
   'Barley for food, feed, and malt production', 'Orge pour l alimentation, l alimentation animale et la production de malt', 'الشعير للغذاء والأعلاف وإنتاج المالت',
   NULL, 'crops'),
  ('Corn', 'Maïs', 'ذرة',
   'Corn/Maize for grain and silage', 'Maïs pour grain et ensilage', 'الذرة للحبوب والعلف',
   NULL, 'crops'),
  ('Rice', 'Riz', 'أرز',
   'Rice cultivation in paddies', 'Riziculture dans les rizières', 'زراعة الأرز في المزارع',
   NULL, 'crops'),

  -- Vegetables (general crops module)
  ('Vegetables', 'Légumes', 'خضروات',
   'Vegetable crops for fresh market and processing', 'Cultures maraîchères pour le marché frais et la transformation', 'محاصيل الخضروات للسوق الطازجة والتصنيع',
   NULL, 'crops'),
  ('Leafy Greens', 'Feuilles vertes', 'الخضروات الورقية',
   'Lettuce, spinach, kale, and other leaf vegetables', 'Laitue, épinards, chou kale et autres légumes feuilles', 'الخس والسبانخ والكرنب والخضروات الورقية الأخرى',
   NULL, 'crops'),
  ('Solanaceous', 'Solanacées', 'الباذنجانية',
   'Tomatoes, peppers, eggplant, and potatoes', 'Tomates, poivrons, aubergines et pommes de terre', 'الطماطم والفلفل والباذنجان والبطاطس',
   NULL, 'crops'),
  ('Root Vegetables', 'Légumes-racines', 'الخضروات الجذرية',
   'Carrots, radishes, turnips, and beets', 'Carottes, radis, navets et betteraves', 'الجزر والفجل واللفت والبنجر',
   NULL, 'crops'),
  ('Legumes', 'Légumineuses', 'البقوليات',
   'Beans, peas, lentils, and other pulse crops', 'Haricots, pois, lentilles et autres légumineuses', 'الفاصوليا والبازلاء والعدس والمحاصيل البقولية الأخرى',
   NULL, 'crops'),

  -- Industrial Crops
  ('Industrial Crops', 'Cultures industrielles', 'المحاصيل الصناعية',
   'Crops for industrial processing (sugar, oil, fiber)', 'Cultures pour transformation industrielle (sucre, huile, fibre)', 'محاصيل للمعالجة الصناعية (السكر والزيت والألياف)',
   NULL, 'crops'),
  ('Sugar Crops', 'Cultures sucrières', 'المحاصيل السكرية',
   'Sugarcane and sugar beet', 'Canne à sucre et betterave sucrière', 'قصب السكر والبنجر السكري',
   NULL, 'crops'),
  ('Oil Crops', 'Cultures oléagineuses', 'المحاصيل الزيتية',
   'Sunflower, rapeseed, soybean, and olive', 'Tournesol, colza, soja et olive', 'عباد الشمس واللفت وفول الصويا والزيتون',
   NULL, 'crops'),
  ('Fiber Crops', 'Cultures fibreuses', 'المحاصيل الليفية',
   'Cotton, flax, and hemp', 'Coton, lin et chanvre', 'القطن والكتان والقنب',
   NULL, 'crops'),

  -- Forage Crops
  ('Forage Crops', 'Cultures fourragères', 'محاصيل الأعلاف',
   'Crops for animal feed and pasture', 'Cultures pour l alimentation animale et les pâturages', 'محاصيل لأعلاف الحيوانات والمراعي',
   NULL, 'crops'),
  ('Pasture Grass', 'Herbe de pâturage', 'عشب المراعي',
   'Grasses for grazing and hay production', 'Herbes pour le pâturage et la production de foin', 'أعشاب للرعي وإنتاج القش',
   NULL, 'crops'),
  ('Alfalfa', 'Luzerne', 'برسيم',
   'Alfalfa for high-quality hay and silage', 'Luzerne pour le foin et l ensilage de haute qualité', 'البرسيم للقش والعلف عالي الجودة',
   NULL, 'crops')
ON CONFLICT (organization_id, name) DO NOTHING;

-- Create index for module-based filtering
CREATE INDEX IF NOT EXISTS idx_crop_types_module_slug ON crop_types(module_slug) WHERE module_slug IS NOT NULL;

-- =====================================================
-- Migration: 20260129120000_refactor_modules_generic.sql
-- =====================================================
-- Refactor Modules to Use Generic Routes with Filters
-- Migration Date: 2026-01-29
-- Description: Refactors the module system to use generic routes with filter-based data access

-- This migration ensures the modules table has proper configuration
-- for the generic route system with filters

-- Add route configuration columns to modules
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS route_base VARCHAR(100),
ADD COLUMN IF NOT EXISTS filter_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS default_filters JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN modules.route_base IS 'Base route path for this module (e.g., /crops, /orchards)';
COMMENT ON COLUMN modules.filter_config IS 'Configuration of available filters for this module';
COMMENT ON COLUMN modules.default_filters IS 'Default filter values for this module';

-- Update modules with route configurations
UPDATE modules SET
  route_base = '/crops',
  filter_config = '{
    "crop_type": {"type": "select", "field": "crop_type_id"},
    "farm": {"type": "select", "field": "farm_id"},
    "parcel": {"type": "select", "field": "parcel_id"},
    "status": {"type": "select", "field": "status", "options": ["active", "archived"]},
    "date_range": {"type": "date", "field": "created_at"}
  }'::jsonb,
  default_filters = '{
    "status": "active"
  }'::jsonb
WHERE slug = 'crops';

UPDATE modules SET
  route_base = '/orchards',
  filter_config = '{
    "farm": {"type": "select", "field": "farm_id"},
    "tree_category": {"type": "select", "field": "tree_category_id"},
    "variety": {"type": "select", "field": "variety_id"},
    "status": {"type": "select", "field": "status", "options": ["active", "removed", "dead"]},
    "age_range": {"type": "range", "field": "planting_year"}
  }'::jsonb,
  default_filters = '{
    "status": "active"
  }'::jsonb
WHERE slug = 'orchards';

UPDATE modules SET
  route_base = '/pruning',
  filter_config = '{
    "orchard": {"type": "select", "field": "orchard_id"},
    "farm": {"type": "select", "field": "farm_id"},
    "task_type": {"type": "select", "field": "task_type"},
    "status": {"type": "select", "field": "status", "options": ["pending", "in_progress", "completed"]},
    "season": {"type": "select", "field": "season", "options": ["winter", "spring", "summer", "fall"]},
    "date_range": {"type": "date", "field": "scheduled_date"}
  }'::jsonb,
  default_filters = '{
    "status": "pending"
  }'::jsonb
WHERE slug = 'pruning';

-- Update navigation_items to use generic route pattern
UPDATE modules SET
  navigation_items = '[
    {
      "to": "/crops",
      "label": "All Crops",
      "icon": "🌱"
    },
    {
      "to": "/crops?status=active",
      "label": "Active Crops",
      "icon": "✅"
    }
  ]'::jsonb
WHERE slug = 'crops';

UPDATE modules SET
  navigation_items = '[
    {
      "to": "/orchards",
      "label": "All Orchards",
      "icon": "🌳"
    },
    {
      "to": "/orchards?status=active",
      "label": "Active Trees",
      "icon": "✅"
    }
  ]'::jsonb
WHERE slug = 'orchards';


-- =====================================================
-- Migration: 20260129130000_abstract_module_system.sql
-- =====================================================
-- Abstract Module System Implementation
-- Migration Date: 2026-01-29
-- Description: Creates an abstract module system for handling diverse entity types

-- Create abstract_entities table for unified entity management
CREATE TABLE IF NOT EXISTS abstract_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- crop, tree, animal, equipment, etc.
  entity_id UUID NOT NULL, -- References the actual entity in its specific table
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

COMMENT ON TABLE abstract_entities IS 'Abstract entity table for unified access to all module entities';

-- Create entity_types configuration table
CREATE TABLE IF NOT EXISTS entity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  module_slug VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  display_name_plural VARCHAR(100),
  icon VARCHAR(50),
  color VARCHAR(20),
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE entity_types IS 'Configuration for different entity types in the abstract system';

-- Insert default entity types
INSERT INTO entity_types (name, slug, module_slug, table_name, display_name, display_name_plural, icon, color, config) VALUES
  ('Crop', 'crop', 'crops', 'crops', 'Crop', 'Crops', '🌱', '#22c55e',
   '{"has_farm": true, "has_parcel": true, "has_crop_type": true}'::jsonb),
  ('Tree', 'tree', 'orchards', 'trees', 'Tree', 'Trees', '🌳', '#84cc16',
   '{"has_farm": true, "has_orchard": true, "has_tree_category": true}'::jsonb),
  ('Pruning Record', 'pruning_record', 'pruning', 'pruning_records', 'Pruning Task', 'Pruning Tasks', '✂️', '#f59e0b',
   '{"has_farm": true, "has_orchard": true, "has_tree": true}'::jsonb),
  ('Farm', 'farm', 'farms', 'farms', 'Farm', 'Farms', '🏡', '#8b5cf6',
   '{"location": true, "area": true}'::jsonb),
  ('Parcel', 'parcel', 'parcels', 'parcels', 'Parcel', 'Parcels', '🗺️', '#3b82f6',
   '{"location": true, "area": true, "has_farm": true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Create entity_relationships table for related entities
CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entity_type VARCHAR(50) NOT NULL,
  parent_entity_id UUID NOT NULL,
  child_entity_type VARCHAR(50) NOT NULL,
  child_entity_id UUID NOT NULL,
  relationship_type VARCHAR(50) NOT NULL, -- contains, located_in, belongs_to, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_entity_type, parent_entity_id, child_entity_type, child_entity_id, relationship_type)
);

COMMENT ON TABLE entity_relationships IS 'Relationships between different entity types';

-- Create entity_events table for tracking entity events
CREATE TABLE IF NOT EXISTS entity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- created, updated, deleted, status_changed, etc.
  event_data JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE entity_events IS 'Audit log for entity events';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_abstract_entities_type ON abstract_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_abstract_entities_org ON abstract_entities(organization_id);
CREATE INDEX IF NOT EXISTS idx_abstract_entities_tags ON abstract_entities USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_abstract_entities_metadata ON abstract_entities USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_entity_types_slug ON entity_types(slug);
CREATE INDEX IF NOT EXISTS idx_entity_types_module ON entity_types(module_slug);
CREATE INDEX IF NOT EXISTS idx_entity_types_config ON entity_types USING GIN(config);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_parent ON entity_relationships(parent_entity_type, parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_child ON entity_relationships(child_entity_type, child_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_events_entity ON entity_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_events_org ON entity_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_entity_events_created ON entity_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE abstract_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_read_abstract_entities"
ON abstract_entities FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "org_write_abstract_entities"
ON abstract_entities FOR ALL
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "public_read_entity_types" ON entity_types FOR SELECT USING (is_active = true);

CREATE POLICY "org_read_entity_relationships"
ON entity_relationships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM abstract_entities ae
    WHERE ae.entity_type = entity_relationships.parent_entity_type
      AND ae.entity_id = entity_relationships.parent_entity_id
      AND ae.organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
  )
);

CREATE POLICY "org_write_entity_relationships"
ON entity_relationships FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM abstract_entities ae
    WHERE ae.entity_type = entity_relationships.parent_entity_type
      AND ae.entity_id = entity_relationships.parent_entity_id
      AND ae.organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
  )
);

CREATE POLICY "org_read_entity_events"
ON entity_events FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Functions for abstract entity system









-- Add updated_at triggers
CREATE TRIGGER update_abstract_entities_updated_at
BEFORE UPDATE ON abstract_entities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entity_types_updated_at
BEFORE UPDATE ON entity_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- Migration: 20260129140000_fix_security_definer_views.sql
-- =====================================================
-- Fix Security Definer Views
-- Migration Date: 2026-01-29
-- Description: Changes views from SECURITY DEFINER to SECURITY INVOKER for better security

-- Drop and recreate views with SECURITY INVOKER instead of SECURITY DEFINER

-- accounting_summary view
DROP VIEW IF EXISTS accounting_summary;
CREATE VIEW accounting_summary WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM sales_orders WHERE organization_id = o.id) AS sales_orders_count,
  (SELECT COUNT(*) FROM purchase_orders WHERE organization_id = o.id) AS purchase_orders_count,
  (SELECT COUNT(*) FROM invoices WHERE organization_id = o.id) AS invoices_count,
  (SELECT COALESCE(SUM(grand_total), 0) FROM invoices WHERE organization_id = o.id AND status != 'paid') AS outstanding_invoices,
  (SELECT COALESCE(SUM(amount), 0) FROM accounting_payments WHERE organization_id = o.id) AS total_payments
FROM organizations o;

-- dashboard_summary view
DROP VIEW IF EXISTS dashboard_summary;
CREATE VIEW dashboard_summary WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM farms WHERE organization_id = o.id AND is_active = true) AS active_farms,
  (SELECT COUNT(*) FROM parcels WHERE organization_id = o.id AND is_active = true) AS active_parcels,
  (SELECT COUNT(*) FROM crops WHERE organization_id = o.id AND status = 'active') AS active_crops,
  (SELECT COUNT(*) FROM workers WHERE organization_id = o.id AND is_active = true) AS active_workers,
  (SELECT COUNT(DISTINCT customer_id) FROM sales_orders WHERE organization_id = o.id) AS customer_count,
  (SELECT COUNT(DISTINCT supplier_id) FROM purchase_orders WHERE organization_id = o.id) AS supplier_count
FROM organizations o;

-- financial_metrics view
DROP VIEW IF EXISTS financial_metrics;
CREATE VIEW financial_metrics WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COALESCE(SUM(j.quantity * j.unit_price), 0)
   FROM sales_order_items j
   JOIN sales_orders so ON j.sales_order_id = so.id
   WHERE so.organization_id = o.id) AS total_revenue,
  (SELECT COALESCE(SUM(j.quantity * j.unit_price), 0)
   FROM purchase_order_items j
   JOIN purchase_orders po ON j.purchase_order_id = po.id
   WHERE po.organization_id = o.id) AS total_purchases,
  (SELECT COALESCE(SUM(amount), 0)
   FROM costs
   WHERE organization_id = o.id) AS total_costs,
  (SELECT COALESCE(SUM(amount), 0)
   FROM revenues
   WHERE organization_id = o.id) AS total_revenues_recorded
FROM organizations o;

-- inventory_status view
DROP VIEW IF EXISTS inventory_status;
CREATE VIEW inventory_status WITH (security_invoker = true) AS
SELECT
  i.id AS inventory_item_id,
  i.name AS item_name,
  i.warehouse_id,
  w.name AS warehouse_name,
  i.quantity,
  i.minimum_quantity AS reorder_level,
  i.quantity <= i.minimum_quantity AS needs_reorder,
  i.status,
  i.organization_id
FROM inventory i
LEFT JOIN warehouses w ON i.warehouse_id = w.id;

-- pending_tasks view
DROP VIEW IF EXISTS pending_tasks;
CREATE VIEW pending_tasks WITH (security_invoker = true) AS
SELECT
  t.id,
  t.organization_id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.due_date,
  t.assigned_to,
  w.first_name || ' ' || w.last_name AS assigned_to_name,
  t.farm_id,
  f.name AS farm_name,
  t.created_at
FROM tasks t
LEFT JOIN workers w ON t.assigned_to = w.id
LEFT JOIN farms f ON t.farm_id = f.id
WHERE t.status IN ('pending', 'in_progress')
ORDER BY t.due_date ASC NULLS LAST, t.priority DESC;

-- production_metrics view
DROP VIEW IF EXISTS production_metrics;
CREATE VIEW production_metrics WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM crops WHERE organization_id = o.id AND status = 'active') AS active_crops_count,
  (SELECT COUNT(*) FROM trees WHERE organization_id = o.id) AS trees_count,
  (SELECT COALESCE(SUM(hr.quantity), 0)
   FROM harvest_records hr
   WHERE hr.organization_id = o.id
   AND hr.harvest_date >= CURRENT_DATE - INTERVAL '30 days') AS harvest_last_30_days,
  (SELECT COALESCE(AVG(hr.quantity), 0)
   FROM harvest_records hr
   WHERE hr.organization_id = o.id
   AND hr.harvest_date >= CURRENT_DATE - INTERVAL '30 days') AS avg_harvest_last_30_days
FROM organizations o;

-- sales_analytics view
DROP VIEW IF EXISTS sales_analytics;
CREATE VIEW sales_analytics WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM sales_orders WHERE organization_id = o.id) AS total_orders,
  (SELECT COALESCE(SUM(total_amount), 0) FROM sales_orders WHERE organization_id = o.id) AS total_sales_amount,
  (SELECT COALESCE(AVG(total_amount), 0) FROM sales_orders WHERE organization_id = o.id) AS average_order_value,
  (SELECT COUNT(DISTINCT customer_id) FROM sales_orders WHERE organization_id = o.id) AS unique_customers
FROM organizations o;

-- task_completion view
DROP VIEW IF EXISTS task_completion;
CREATE VIEW task_completion WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id AND status = 'completed') AS completed_tasks,
  (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id AND status IN ('pending', 'in_progress')) AS pending_tasks,
  (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id AND status = 'overdue') AS overdue_tasks,
  CASE
    WHEN (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id) > 0 THEN
      ROUND((SELECT COUNT(*)::NUMERIC FROM tasks WHERE organization_id = o.id AND status = 'completed') /
            (SELECT COUNT(*)::NUMERIC FROM tasks WHERE organization_id = o.id) * 100, 2)
    ELSE 0
  END AS completion_percentage
FROM organizations o;

-- worker_assignments view
DROP VIEW IF EXISTS worker_assignments;
CREATE VIEW worker_assignments WITH (security_invoker = true) AS
SELECT
  w.id AS worker_id,
  w.user_id,
  w.first_name || ' ' || w.last_name AS worker_name,
  w.organization_id,
  w.worker_type,
  COUNT(DISTINCT t.id) AS assigned_tasks_count,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) AS completed_tasks_count
FROM workers w
LEFT JOIN tasks t ON t.assigned_to = w.id
WHERE w.is_active = true
GROUP BY w.id, w.user_id, w.first_name, w.last_name, w.organization_id, w.worker_type;

-- workforce_summary view
DROP VIEW IF EXISTS workforce_summary;
CREATE VIEW workforce_summary WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM workers WHERE organization_id = o.id AND worker_type = 'fixed_salary' AND is_active = true) AS active_fixed_salary,
  (SELECT COUNT(*) FROM workers WHERE organization_id = o.id AND worker_type = 'daily_worker' AND is_active = true) AS active_daily_workers,
  (SELECT COUNT(*) FROM workers WHERE organization_id = o.id AND worker_type = 'metayage' AND is_active = true) AS active_metayage,
  (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id AND status = 'in_progress') AS tasks_in_progress
FROM organizations o;

-- subscription_details view
DROP VIEW IF EXISTS subscription_details;
CREATE VIEW subscription_details WITH (security_invoker = true) AS
SELECT
  s.id AS subscription_id,
  s.organization_id,
  o.name AS organization_name,
  s.plan_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.included_addon_slots,
  s.additional_addon_slots,
  (SELECT COUNT(*) FROM organization_addons WHERE organization_id = s.id AND status IN ('active', 'trialing')) AS active_addons_count
FROM subscriptions s
JOIN organizations o ON s.organization_id = o.id;

-- Add comments for documentation
COMMENT ON VIEW accounting_summary IS 'Accounting summary per organization (SECURITY INVOKER)';
COMMENT ON VIEW dashboard_summary IS 'Dashboard summary metrics (SECURITY INVOKER)';
COMMENT ON VIEW financial_metrics IS 'Financial metrics per organization (SECURITY INVOKER)';
COMMENT ON VIEW inventory_status IS 'Current inventory status with reorder indicators (SECURITY INVOKER)';
COMMENT ON VIEW pending_tasks IS 'Pending and in-progress tasks with assignment info (SECURITY INVOKER)';
COMMENT ON VIEW production_metrics IS 'Production metrics per organization (SECURITY INVOKER)';
COMMENT ON VIEW sales_analytics IS 'Sales analytics per organization (SECURITY INVOKER)';
COMMENT ON VIEW task_completion IS 'Task completion statistics per organization (SECURITY INVOKER)';
COMMENT ON VIEW worker_assignments IS 'Worker assignments with task counts (SECURITY INVOKER)';
COMMENT ON VIEW workforce_summary IS 'Workforce summary statistics (SECURITY INVOKER)';
COMMENT ON VIEW subscription_details IS 'Subscription details with addon counts (SECURITY INVOKER)';


-- =====================================================
-- Migration: 20260129150000_fix_search_path_and_security.sql
-- =====================================================
-- Fix Search Path and Security for Functions
-- Migration Date: 2026-01-29
-- Description: Adds SET search_path = public to all SECURITY DEFINER functions

-- Drop and recreate functions with proper search_path setting

-- Helper function first (used by triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;






-- Security function for checking organization access
CREATE OR REPLACE FUNCTION check_organization_access(p_organization_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_users
    WHERE user_id = auth.uid()
      AND organization_id = p_organization_id
      AND is_active = true
  );
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION check_organization_access(UUID) IS 'Check if current user has access to organization';

-- =====================================================
-- SCHEMA IMPROVEMENTS - Addressing Review Issues
-- =====================================================

-- -----------------------------------------------------
-- 1. POSTGIS NATIVE GEOMETRY COLUMNS
-- -----------------------------------------------------
-- Note: Geometry columns are now directly in CREATE TABLE statements

-- Function to sync JSONB coordinates to geometry columns
CREATE OR REPLACE FUNCTION sync_farm_geometry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.coordinates IS NOT NULL AND NEW.coordinates ? 'lat' AND NEW.coordinates ? 'lng' THEN
    NEW.location_point := ST_SetSRID(
      ST_MakePoint(
        (NEW.coordinates->>'lng')::FLOAT,
        (NEW.coordinates->>'lat')::FLOAT
      ),
      4326
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_farm_geometry ON farms;
CREATE TRIGGER trg_sync_farm_geometry
  BEFORE INSERT OR UPDATE ON farms
  FOR EACH ROW
  EXECUTE FUNCTION sync_farm_geometry();

-- Function to sync parcel boundary JSONB to geometry
CREATE OR REPLACE FUNCTION sync_parcel_geometry()
RETURNS TRIGGER AS $$
DECLARE
  coords JSONB;
  ring TEXT;
BEGIN
  IF NEW.boundary IS NOT NULL AND jsonb_array_length(NEW.boundary) > 2 THEN
    -- Build WKT polygon from JSONB array of {lat, lng} points
    SELECT string_agg(
      (coord->>'lng')::TEXT || ' ' || (coord->>'lat')::TEXT,
      ','
    ) INTO ring
    FROM jsonb_array_elements(NEW.boundary) AS coord;
    
    -- Close the ring if needed
    IF ring IS NOT NULL THEN
      NEW.boundary_geom := ST_SetSRID(
        ST_GeomFromText('POLYGON((' || ring || ',' || 
          (NEW.boundary->0->>'lng')::TEXT || ' ' || (NEW.boundary->0->>'lat')::TEXT || '))'),
        4326
      );
      NEW.centroid := ST_Centroid(NEW.boundary_geom);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Silently ignore geometry conversion errors to not break inserts
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_parcel_geometry ON parcels;
CREATE TRIGGER trg_sync_parcel_geometry
  BEFORE INSERT OR UPDATE ON parcels
  FOR EACH ROW
  EXECUTE FUNCTION sync_parcel_geometry();

-- -----------------------------------------------------
-- 2. MISSING BUSINESS KEY UNIQUE CONSTRAINTS
-- -----------------------------------------------------
-- Add unique constraints for business keys

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_categories_name_org 
  ON task_categories(organization_id, name);
  
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_name_org 
  ON warehouses(organization_id, name);
  
CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_categories_name_org 
  ON cost_categories(organization_id, name, type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_number_org 
  ON bank_accounts(organization_id, account_number) 
  WHERE account_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_cin_org 
  ON workers(organization_id, cin) 
  WHERE cin IS NOT NULL;

-- -----------------------------------------------------
-- 4. FIFO/LIFO STOCK VALUATION CONSUMPTION FUNCTIONS
-- -----------------------------------------------------


-- -----------------------------------------------------
-- 5. MISSING RLS POLICIES FOR TABLES WITH RLS ENABLED
-- -----------------------------------------------------
-- Add comprehensive RLS policies for tables that have RLS enabled but may be missing policies

-- RLS Policies for task_assignments
DROP POLICY IF EXISTS "org_read_task_assignments" ON task_assignments;
CREATE POLICY "org_read_task_assignments" ON task_assignments
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_task_assignments" ON task_assignments;
CREATE POLICY "org_write_task_assignments" ON task_assignments
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_task_assignments" ON task_assignments;
CREATE POLICY "org_update_task_assignments" ON task_assignments
  FOR UPDATE USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_task_assignments" ON task_assignments;
CREATE POLICY "org_delete_task_assignments" ON task_assignments
  FOR DELETE USING (is_organization_member(organization_id));

-- RLS Policies for warehouses
DROP POLICY IF EXISTS "org_read_warehouses" ON warehouses;
CREATE POLICY "org_read_warehouses" ON warehouses
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_warehouses" ON warehouses;
CREATE POLICY "org_write_warehouses" ON warehouses
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_warehouses" ON warehouses;
CREATE POLICY "org_update_warehouses" ON warehouses
  FOR UPDATE USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_warehouses" ON warehouses;
CREATE POLICY "org_delete_warehouses" ON warehouses
  FOR DELETE USING (is_organization_member(organization_id));

-- RLS for stock_movements
DROP POLICY IF EXISTS "org_read_stock_movements" ON stock_movements;
CREATE POLICY "org_read_stock_movements" ON stock_movements
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_stock_movements" ON stock_movements;
CREATE POLICY "org_write_stock_movements" ON stock_movements
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

-- RLS for stock_valuation
DROP POLICY IF EXISTS "org_read_stock_valuation" ON stock_valuation;
CREATE POLICY "org_read_stock_valuation" ON stock_valuation
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_stock_valuation" ON stock_valuation;
CREATE POLICY "org_write_stock_valuation" ON stock_valuation
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

-- RLS for inventory_batches
DROP POLICY IF EXISTS "org_read_inventory_batches" ON inventory_batches;
CREATE POLICY "org_read_inventory_batches" ON inventory_batches
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_inventory_batches" ON inventory_batches;
CREATE POLICY "org_write_inventory_batches" ON inventory_batches
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

-- RLS for inventory_serial_numbers
DROP POLICY IF EXISTS "org_read_inventory_serial_numbers" ON inventory_serial_numbers;
CREATE POLICY "org_read_inventory_serial_numbers" ON inventory_serial_numbers
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_inventory_serial_numbers" ON inventory_serial_numbers;
CREATE POLICY "org_write_inventory_serial_numbers" ON inventory_serial_numbers
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

-- RLS for opening_stock_balances
DROP POLICY IF EXISTS "org_read_opening_stock_balances" ON opening_stock_balances;
CREATE POLICY "org_read_opening_stock_balances" ON opening_stock_balances
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_opening_stock_balances" ON opening_stock_balances;
CREATE POLICY "org_write_opening_stock_balances" ON opening_stock_balances
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

-- RLS for stock_closing_entries
DROP POLICY IF EXISTS "org_read_stock_closing_entries" ON stock_closing_entries;
CREATE POLICY "org_read_stock_closing_entries" ON stock_closing_entries
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_stock_closing_entries" ON stock_closing_entries;
CREATE POLICY "org_write_stock_closing_entries" ON stock_closing_entries
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

-- RLS for stock_account_mappings
DROP POLICY IF EXISTS "org_read_stock_account_mappings" ON stock_account_mappings;
CREATE POLICY "org_read_stock_account_mappings" ON stock_account_mappings
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_stock_account_mappings" ON stock_account_mappings;
CREATE POLICY "org_write_stock_account_mappings" ON stock_account_mappings
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

-- RLS for costs
DROP POLICY IF EXISTS "org_read_costs" ON costs;
CREATE POLICY "org_read_costs" ON costs
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_costs" ON costs;
CREATE POLICY "org_write_costs" ON costs
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_costs" ON costs;
CREATE POLICY "org_update_costs" ON costs
  FOR UPDATE USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_costs" ON costs;
CREATE POLICY "org_delete_costs" ON costs
  FOR DELETE USING (is_organization_member(organization_id));

-- RLS for revenues
DROP POLICY IF EXISTS "org_read_revenues" ON revenues;
CREATE POLICY "org_read_revenues" ON revenues
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_revenues" ON revenues;
CREATE POLICY "org_write_revenues" ON revenues
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_revenues" ON revenues;
CREATE POLICY "org_update_revenues" ON revenues
  FOR UPDATE USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_revenues" ON revenues;
CREATE POLICY "org_delete_revenues" ON revenues
  FOR DELETE USING (is_organization_member(organization_id));

-- RLS for profitability_snapshots
DROP POLICY IF EXISTS "org_read_profitability_snapshots" ON profitability_snapshots;
CREATE POLICY "org_read_profitability_snapshots" ON profitability_snapshots
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_profitability_snapshots" ON profitability_snapshots;
CREATE POLICY "org_write_profitability_snapshots" ON profitability_snapshots
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

-- RLS for structures
DROP POLICY IF EXISTS "org_read_structures" ON structures;
CREATE POLICY "org_read_structures" ON structures
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_structures" ON structures;
CREATE POLICY "org_write_structures" ON structures
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_structures" ON structures;
CREATE POLICY "org_update_structures" ON structures
  FOR UPDATE USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_structures" ON structures;
CREATE POLICY "org_delete_structures" ON structures
  FOR DELETE USING (is_organization_member(organization_id));

-- RLS for payment_records
DROP POLICY IF EXISTS "org_read_payment_records" ON payment_records;
CREATE POLICY "org_read_payment_records" ON payment_records
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_payment_records" ON payment_records;
CREATE POLICY "org_write_payment_records" ON payment_records
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_payment_records" ON payment_records;
CREATE POLICY "org_update_payment_records" ON payment_records
  FOR UPDATE USING (is_organization_member(organization_id));

-- RLS for payment_advances
DROP POLICY IF EXISTS "org_read_payment_advances" ON payment_advances;
CREATE POLICY "org_read_payment_advances" ON payment_advances
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_payment_advances" ON payment_advances;
CREATE POLICY "org_write_payment_advances" ON payment_advances
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_payment_advances" ON payment_advances;
CREATE POLICY "org_update_payment_advances" ON payment_advances
  FOR UPDATE USING (is_organization_member(organization_id));

-- RLS for metayage_settlements
DROP POLICY IF EXISTS "org_read_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_read_metayage_settlements" ON metayage_settlements
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_metayage_settlements" ON metayage_settlements;
CREATE POLICY "org_write_metayage_settlements" ON metayage_settlements
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

-- RLS for work_records
DROP POLICY IF EXISTS "org_read_work_records" ON work_records;
CREATE POLICY "org_read_work_records" ON work_records
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_work_records" ON work_records;
CREATE POLICY "org_write_work_records" ON work_records
  FOR INSERT WITH CHECK (is_organization_member(organization_id));

-- -----------------------------------------------------
-- 6. BUSINESS KEY UNIQUE CONSTRAINTS
-- -----------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_parcels_name_org_farm 
  ON parcels(organization_id, farm_id, name);

-- -----------------------------------------------------
-- 7. MISSING updated_at AUTO-UPDATE TRIGGERS
-- -----------------------------------------------------
-- Add triggers for all tables with updated_at columns to auto-update on modification
-- Uses the existing update_updated_at_column() function defined at line 29

-- Core Organization & User tables
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_organization_users_updated_at ON organization_users;
CREATE TRIGGER trg_organization_users_updated_at BEFORE UPDATE ON organization_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_modules_updated_at ON modules;
CREATE TRIGGER trg_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_organization_modules_updated_at ON organization_modules;
CREATE TRIGGER trg_organization_modules_updated_at BEFORE UPDATE ON organization_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Farm & Parcel tables
DROP TRIGGER IF EXISTS trg_farms_updated_at ON farms;
CREATE TRIGGER trg_farms_updated_at BEFORE UPDATE ON farms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_parcels_updated_at ON parcels;
CREATE TRIGGER trg_parcels_updated_at BEFORE UPDATE ON parcels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Customer & Supplier tables
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Accounting tables
DROP TRIGGER IF EXISTS trg_currencies_updated_at ON currencies;
CREATE TRIGGER trg_currencies_updated_at BEFORE UPDATE ON currencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_account_templates_updated_at ON account_templates;
CREATE TRIGGER trg_account_templates_updated_at BEFORE UPDATE ON account_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sales_orders_updated_at ON sales_orders;
CREATE TRIGGER trg_sales_orders_updated_at BEFORE UPDATE ON sales_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cost_centers_updated_at ON cost_centers;
CREATE TRIGGER trg_cost_centers_updated_at BEFORE UPDATE ON cost_centers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_taxes_updated_at ON taxes;
CREATE TRIGGER trg_taxes_updated_at BEFORE UPDATE ON taxes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER trg_journal_entries_updated_at BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_accounting_payments_updated_at ON accounting_payments;
CREATE TRIGGER trg_accounting_payments_updated_at BEFORE UPDATE ON accounting_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Workforce & Task tables
DROP TRIGGER IF EXISTS trg_workers_updated_at ON workers;
CREATE TRIGGER trg_workers_updated_at BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_work_units_updated_at ON work_units;
CREATE TRIGGER trg_work_units_updated_at BEFORE UPDATE ON work_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_task_assignments_updated_at ON task_assignments;
CREATE TRIGGER trg_task_assignments_updated_at BEFORE UPDATE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_task_categories_updated_at ON task_categories;
CREATE TRIGGER trg_task_categories_updated_at BEFORE UPDATE ON task_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_task_templates_updated_at ON task_templates;
CREATE TRIGGER trg_task_templates_updated_at BEFORE UPDATE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_task_comments_updated_at ON task_comments;
CREATE TRIGGER trg_task_comments_updated_at BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_task_time_logs_updated_at ON task_time_logs;
CREATE TRIGGER trg_task_time_logs_updated_at BEFORE UPDATE ON task_time_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_work_records_updated_at ON work_records;
CREATE TRIGGER trg_work_records_updated_at BEFORE UPDATE ON work_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_metayage_settlements_updated_at ON metayage_settlements;
CREATE TRIGGER trg_metayage_settlements_updated_at BEFORE UPDATE ON metayage_settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_payment_records_updated_at ON payment_records;
CREATE TRIGGER trg_payment_records_updated_at BEFORE UPDATE ON payment_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_payment_advances_updated_at ON payment_advances;
CREATE TRIGGER trg_payment_advances_updated_at BEFORE UPDATE ON payment_advances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Warehouse & Inventory tables
DROP TRIGGER IF EXISTS trg_warehouses_updated_at ON warehouses;
CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_harvest_records_updated_at ON harvest_records;
CREATE TRIGGER trg_harvest_records_updated_at BEFORE UPDATE ON harvest_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_harvest_forecasts_updated_at ON harvest_forecasts;
CREATE TRIGGER trg_harvest_forecasts_updated_at BEFORE UPDATE ON harvest_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_performance_alerts_updated_at ON performance_alerts;
CREATE TRIGGER trg_performance_alerts_updated_at BEFORE UPDATE ON performance_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_deliveries_updated_at ON deliveries;
CREATE TRIGGER trg_deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_item_groups_updated_at ON item_groups;
CREATE TRIGGER trg_item_groups_updated_at BEFORE UPDATE ON item_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_items_updated_at ON items;
CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER trg_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_inventory_batches_updated_at ON inventory_batches;
CREATE TRIGGER trg_inventory_batches_updated_at BEFORE UPDATE ON inventory_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_inventory_serial_numbers_updated_at ON inventory_serial_numbers;
CREATE TRIGGER trg_inventory_serial_numbers_updated_at BEFORE UPDATE ON inventory_serial_numbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_stock_entries_updated_at ON stock_entries;
CREATE TRIGGER trg_stock_entries_updated_at BEFORE UPDATE ON stock_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_stock_movements_updated_at ON stock_movements;
CREATE TRIGGER trg_stock_movements_updated_at BEFORE UPDATE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_stock_valuation_updated_at ON stock_valuation;
CREATE TRIGGER trg_stock_valuation_updated_at BEFORE UPDATE ON stock_valuation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_product_applications_updated_at ON product_applications;
CREATE TRIGGER trg_product_applications_updated_at BEFORE UPDATE ON product_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_opening_stock_balances_updated_at ON opening_stock_balances;
CREATE TRIGGER trg_opening_stock_balances_updated_at BEFORE UPDATE ON opening_stock_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_stock_closing_entries_updated_at ON stock_closing_entries;
CREATE TRIGGER trg_stock_closing_entries_updated_at BEFORE UPDATE ON stock_closing_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reception_batches_updated_at ON reception_batches;
CREATE TRIGGER trg_reception_batches_updated_at BEFORE UPDATE ON reception_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Satellite & Analysis tables
DROP TRIGGER IF EXISTS trg_satellite_aois_updated_at ON satellite_aois;
CREATE TRIGGER trg_satellite_aois_updated_at BEFORE UPDATE ON satellite_aois
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_satellite_files_updated_at ON satellite_files;
CREATE TRIGGER trg_satellite_files_updated_at BEFORE UPDATE ON satellite_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_satellite_indices_data_updated_at ON satellite_indices_data;
CREATE TRIGGER trg_satellite_indices_data_updated_at BEFORE UPDATE ON satellite_indices_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_satellite_par_data_updated_at ON satellite_par_data;
CREATE TRIGGER trg_satellite_par_data_updated_at BEFORE UPDATE ON satellite_par_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_satellite_processing_jobs_updated_at ON satellite_processing_jobs;
CREATE TRIGGER trg_satellite_processing_jobs_updated_at BEFORE UPDATE ON satellite_processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_satellite_processing_tasks_updated_at ON satellite_processing_tasks;
CREATE TRIGGER trg_satellite_processing_tasks_updated_at BEFORE UPDATE ON satellite_processing_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cloud_coverage_checks_updated_at ON cloud_coverage_checks;
CREATE TRIGGER trg_cloud_coverage_checks_updated_at BEFORE UPDATE ON cloud_coverage_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_analyses_updated_at ON analyses;
CREATE TRIGGER trg_analyses_updated_at BEFORE UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_analysis_recommendations_updated_at ON analysis_recommendations;
CREATE TRIGGER trg_analysis_recommendations_updated_at BEFORE UPDATE ON analysis_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_soil_analyses_updated_at ON soil_analyses;
CREATE TRIGGER trg_soil_analyses_updated_at BEFORE UPDATE ON soil_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_parcel_reports_updated_at ON parcel_reports;
CREATE TRIGGER trg_parcel_reports_updated_at BEFORE UPDATE ON parcel_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Crop & Plant tables
DROP TRIGGER IF EXISTS trg_crop_types_updated_at ON crop_types;
CREATE TRIGGER trg_crop_types_updated_at BEFORE UPDATE ON crop_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crop_categories_updated_at ON crop_categories;
CREATE TRIGGER trg_crop_categories_updated_at BEFORE UPDATE ON crop_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crop_varieties_updated_at ON crop_varieties;
CREATE TRIGGER trg_crop_varieties_updated_at BEFORE UPDATE ON crop_varieties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crops_updated_at ON crops;
CREATE TRIGGER trg_crops_updated_at BEFORE UPDATE ON crops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tree_categories_updated_at ON tree_categories;
CREATE TRIGGER trg_tree_categories_updated_at BEFORE UPDATE ON tree_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_trees_updated_at ON trees;
CREATE TRIGGER trg_trees_updated_at BEFORE UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_plantation_types_updated_at ON plantation_types;
CREATE TRIGGER trg_plantation_types_updated_at BEFORE UPDATE ON plantation_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_soil_types_updated_at ON soil_types;
CREATE TRIGGER trg_soil_types_updated_at BEFORE UPDATE ON soil_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_irrigation_types_updated_at ON irrigation_types;
CREATE TRIGGER trg_irrigation_types_updated_at BEFORE UPDATE ON irrigation_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_rootstocks_updated_at ON rootstocks;
CREATE TRIGGER trg_rootstocks_updated_at BEFORE UPDATE ON rootstocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_plantation_systems_updated_at ON plantation_systems;
CREATE TRIGGER trg_plantation_systems_updated_at BEFORE UPDATE ON plantation_systems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cost & Revenue tables
DROP TRIGGER IF EXISTS trg_product_categories_updated_at ON product_categories;
CREATE TRIGGER trg_product_categories_updated_at BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_product_subcategories_updated_at ON product_subcategories;
CREATE TRIGGER trg_product_subcategories_updated_at BEFORE UPDATE ON product_subcategories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON inventory;
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cost_categories_updated_at ON cost_categories;
CREATE TRIGGER trg_cost_categories_updated_at BEFORE UPDATE ON cost_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_costs_updated_at ON costs;
CREATE TRIGGER trg_costs_updated_at BEFORE UPDATE ON costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_revenues_updated_at ON revenues;
CREATE TRIGGER trg_revenues_updated_at BEFORE UPDATE ON revenues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_profitability_snapshots_updated_at ON profitability_snapshots;
CREATE TRIGGER trg_profitability_snapshots_updated_at BEFORE UPDATE ON profitability_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_structures_updated_at ON structures;
CREATE TRIGGER trg_structures_updated_at BEFORE UPDATE ON structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_utilities_updated_at ON utilities;
CREATE TRIGGER trg_utilities_updated_at BEFORE UPDATE ON utilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Campaign & Biological Asset tables
DROP TRIGGER IF EXISTS trg_fiscal_years_updated_at ON fiscal_years;
CREATE TRIGGER trg_fiscal_years_updated_at BEFORE UPDATE ON fiscal_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_fiscal_periods_updated_at ON fiscal_periods;
CREATE TRIGGER trg_fiscal_periods_updated_at BEFORE UPDATE ON fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_agricultural_campaigns_updated_at ON agricultural_campaigns;
CREATE TRIGGER trg_agricultural_campaigns_updated_at BEFORE UPDATE ON agricultural_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crop_cycles_updated_at ON crop_cycles;
CREATE TRIGGER trg_crop_cycles_updated_at BEFORE UPDATE ON crop_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_biological_assets_updated_at ON biological_assets;
CREATE TRIGGER trg_biological_assets_updated_at BEFORE UPDATE ON biological_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_biological_asset_valuations_updated_at ON biological_asset_valuations;
CREATE TRIGGER trg_biological_asset_valuations_updated_at BEFORE UPDATE ON biological_asset_valuations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON campaigns;
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_quality_inspections_updated_at ON quality_inspections;
CREATE TRIGGER trg_quality_inspections_updated_at BEFORE UPDATE ON quality_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AI & Chat tables
DROP TRIGGER IF EXISTS trg_organization_ai_settings_updated_at ON organization_ai_settings;
CREATE TRIGGER trg_organization_ai_settings_updated_at BEFORE UPDATE ON organization_ai_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER trg_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Budget & Tax tables
DROP TRIGGER IF EXISTS trg_cost_center_budgets_updated_at ON cost_center_budgets;
CREATE TRIGGER trg_cost_center_budgets_updated_at BEFORE UPDATE ON cost_center_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tax_configurations_updated_at ON tax_configurations;
CREATE TRIGGER trg_tax_configurations_updated_at BEFORE UPDATE ON tax_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Marketplace tables
DROP TRIGGER IF EXISTS trg_marketplace_quote_requests_updated_at ON marketplace_quote_requests;
CREATE TRIGGER trg_marketplace_quote_requests_updated_at BEFORE UPDATE ON marketplace_quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Subscription & Module tables
DROP TRIGGER IF EXISTS trg_organization_addons_updated_at ON organization_addons;
CREATE TRIGGER trg_organization_addons_updated_at BEFORE UPDATE ON organization_addons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_polar_subscriptions_updated_at ON polar_subscriptions;
CREATE TRIGGER trg_polar_subscriptions_updated_at BEFORE UPDATE ON polar_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- -----------------------------------------------------
-- 9. COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- -----------------------------------------------------

-- Dashboard: Tasks by org + status + due date (task list filtering)
CREATE INDEX IF NOT EXISTS idx_tasks_org_status_due 
  ON tasks(organization_id, status, due_date) 
  WHERE status NOT IN ('completed', 'cancelled');

-- Dashboard: Tasks assigned to user with date range
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_date 
  ON tasks(assigned_to, due_date DESC) 
  WHERE assigned_to IS NOT NULL;

-- Dashboard: Harvest records by org + date range (reports)
CREATE INDEX IF NOT EXISTS idx_harvest_records_org_date 
  ON harvest_records(organization_id, harvest_date DESC);

-- Dashboard: Costs by org + date range + category (P&L reports)
CREATE INDEX IF NOT EXISTS idx_costs_org_date_category 
  ON costs(organization_id, date DESC, category_id);

-- Dashboard: Revenues by org + date range (P&L reports)
CREATE INDEX IF NOT EXISTS idx_revenues_org_date 
  ON revenues(organization_id, date DESC);

-- Inventory: Stock levels by org + warehouse + item
CREATE INDEX IF NOT EXISTS idx_stock_valuation_org_warehouse_item 
  ON stock_valuation(organization_id, warehouse_id, item_id) 
  WHERE remaining_quantity > 0;

-- Workforce: Worker schedules by org + date
CREATE INDEX IF NOT EXISTS idx_work_records_org_date 
  ON work_records(organization_id, work_date DESC);

-- Workforce: Payment records by org + period
CREATE INDEX IF NOT EXISTS idx_payment_records_org_period 
  ON payment_records(organization_id, period_start, period_end);

-- Accounting: Journal entries by org + status + date
CREATE INDEX IF NOT EXISTS idx_journal_entries_org_status_date 
  ON journal_entries(organization_id, status, entry_date DESC);

-- Accounting: Invoices by org + party + status (AR/AP aging)
CREATE INDEX IF NOT EXISTS idx_invoices_org_party_status 
  ON invoices(organization_id, party_id, status);

-- Accounting: Invoices by org + type + status
CREATE INDEX IF NOT EXISTS idx_invoices_org_type_status 
  ON invoices(organization_id, invoice_type, status);

-- Sales: Orders by org + customer + date (customer history)
CREATE INDEX IF NOT EXISTS idx_sales_orders_org_customer_date 
  ON sales_orders(organization_id, customer_id, order_date DESC);

-- Purchase: Orders by org + supplier + date (supplier history)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_supplier_date 
  ON purchase_orders(organization_id, supplier_id, order_date DESC);

-- Satellite: AOIs by parcel for quick lookup
CREATE INDEX IF NOT EXISTS idx_satellite_aois_parcel 
  ON satellite_aois(parcel_id) 
  WHERE parcel_id IS NOT NULL;

-- Satellite: Processing jobs by org + status (job queue)
CREATE INDEX IF NOT EXISTS idx_satellite_jobs_org_status 
  ON satellite_processing_jobs(organization_id, status, created_at DESC);

-- Campaign: Crop cycles by org + campaign + parcel
CREATE INDEX IF NOT EXISTS idx_crop_cycles_org_campaign_parcel 
  ON crop_cycles(organization_id, campaign_id, parcel_id);

-- Campaign: Biological assets by org + asset type
CREATE INDEX IF NOT EXISTS idx_biological_assets_org_type 
  ON biological_assets(organization_id, asset_type);

-- Quality: Inspections by org + date (quality dashboard)
CREATE INDEX IF NOT EXISTS idx_quality_inspections_org_date 
  ON quality_inspections(organization_id, inspection_date DESC);

-- Chat: Conversations by org + user (chat history) - uses existing index
-- Index idx_chat_conversations_org_user_created already exists

-- Subscriptions: Active subscriptions lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_active 
  ON subscriptions(organization_id) 
  WHERE status = 'active';

-- Workers: Active workers by farm
CREATE INDEX IF NOT EXISTS idx_workers_farm_active 
  ON workers(farm_id, worker_type) 
  WHERE is_active = true;



-- (product_variants moved before stock_movements to resolve forward reference)








-- Index for work records with task reference (for querying work records by task)
CREATE INDEX IF NOT EXISTS idx_work_records_task_ref ON work_records USING GIN ((notes::jsonb) jsonb_path_ops) WHERE notes IS NOT NULL AND notes::jsonb ? 'task_id';

-- ============================================================================
-- COMPLIANCE TRACKING SYSTEM
-- ============================================================================

-- Certifications (organization certifications: GlobalGAP, HACCP, ISO9001, etc.)
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL CHECK (certification_type IN (
    'GlobalGAP',
    'HACCP',
    'ISO9001',
    'ISO14001',
    'ISO22000',
    'Organic',
    'FairTrade',
    'Rainforest',
    'USDA_Organic',
    'Maroc_Label',
    'BRC_Food_Safety',
    'IFS_Food'
  )),
  certification_number TEXT NOT NULL,
  issued_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'expired',
    'pending_renewal',
    'suspended',
    'pending'
  )),
  issuing_body TEXT NOT NULL,
  scope TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  audit_schedule JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, certification_type, certification_number)
);

CREATE INDEX IF NOT EXISTS idx_certifications_org ON certifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_certifications_type ON certifications(certification_type);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
CREATE INDEX IF NOT EXISTS idx_certifications_expiry ON certifications(expiry_date);

COMMENT ON TABLE certifications IS 'Organization certifications and compliance credentials';
COMMENT ON COLUMN certifications.organization_id IS 'Organization that holds the certification';
COMMENT ON COLUMN certifications.certification_type IS 'Type of certification (GlobalGAP, HACCP, ISO9001, ISO14001, ISO22000, Organic, FairTrade, Rainforest, USDA_Organic, Maroc_Label, BRC_Food_Safety, IFS_Food)';
COMMENT ON COLUMN certifications.certification_number IS 'Unique certification number/code';
COMMENT ON COLUMN certifications.issued_date IS 'Date certification was issued';
COMMENT ON COLUMN certifications.expiry_date IS 'Date certification expires';
COMMENT ON COLUMN certifications.status IS 'Current status: active, expired, pending_renewal, suspended';
COMMENT ON COLUMN certifications.issuing_body IS 'Organization that issued the certification';
COMMENT ON COLUMN certifications.scope IS 'Scope of certification (e.g., specific farms, products, processes)';
COMMENT ON COLUMN certifications.documents IS 'JSONB array of document references {url, type, uploaded_at}';
COMMENT ON COLUMN certifications.audit_schedule IS 'JSONB object with next_audit_date, audit_frequency, auditor_name';

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certifications_read_policy" ON certifications;
CREATE POLICY "certifications_read_policy" ON certifications
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "certifications_create_policy" ON certifications;
CREATE POLICY "certifications_create_policy" ON certifications
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "certifications_update_policy" ON certifications;
CREATE POLICY "certifications_update_policy" ON certifications
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "certifications_delete_policy" ON certifications;
CREATE POLICY "certifications_delete_policy" ON certifications
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Compliance Checks (audit records and compliance verification)
CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN (
    'pesticide_usage',
    'traceability',
    'worker_safety',
    'record_keeping',
    'environmental',
    'quality_control'
  )),
  check_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (
    'compliant',
    'non_compliant',
    'needs_review',
    'in_progress'
  )),
  findings JSONB DEFAULT '[]'::jsonb,
  corrective_actions JSONB DEFAULT '[]'::jsonb,
  next_check_date DATE,
  auditor_name TEXT,
  score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_org ON compliance_checks(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_cert ON compliance_checks(certification_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_type ON compliance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_date ON compliance_checks(check_date);

COMMENT ON TABLE compliance_checks IS 'Audit records and compliance verification checks';
COMMENT ON COLUMN compliance_checks.organization_id IS 'Organization being audited';
COMMENT ON COLUMN compliance_checks.certification_id IS 'Certification being audited against';
COMMENT ON COLUMN compliance_checks.check_type IS 'Type of compliance check performed';
COMMENT ON COLUMN compliance_checks.check_date IS 'Date the compliance check was conducted';
COMMENT ON COLUMN compliance_checks.status IS 'Result: compliant, non_compliant, needs_review, in_progress';
COMMENT ON COLUMN compliance_checks.findings IS 'JSONB array of findings {requirement_code, finding_description, severity}';
COMMENT ON COLUMN compliance_checks.corrective_actions IS 'JSONB array of actions {action_description, due_date, responsible_person, status}';
COMMENT ON COLUMN compliance_checks.next_check_date IS 'Scheduled date for next compliance check';
COMMENT ON COLUMN compliance_checks.auditor_name IS 'Name of auditor who conducted the check';
COMMENT ON COLUMN compliance_checks.score IS 'Compliance score (0-100)';

ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_checks_read_policy" ON compliance_checks;
CREATE POLICY "compliance_checks_read_policy" ON compliance_checks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "compliance_checks_create_policy" ON compliance_checks;
CREATE POLICY "compliance_checks_create_policy" ON compliance_checks
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "compliance_checks_update_policy" ON compliance_checks;
CREATE POLICY "compliance_checks_update_policy" ON compliance_checks
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "compliance_checks_delete_policy" ON compliance_checks;
CREATE POLICY "compliance_checks_delete_policy" ON compliance_checks
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Compliance Requirements (reference table for requirements by certification type)
CREATE TABLE IF NOT EXISTS compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_type TEXT NOT NULL CHECK (certification_type IN (
    'GlobalGAP',
    'HACCP',
    'ISO9001',
    'ISO14001',
    'ISO22000',
    'Organic',
    'FairTrade',
    'Rainforest',
    'USDA_Organic',
    'Maroc_Label',
    'BRC_Food_Safety',
    'IFS_Food'
  )),
  requirement_code TEXT NOT NULL,
  requirement_description TEXT NOT NULL,
  category TEXT NOT NULL,
  verification_method TEXT,
  frequency TEXT,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(certification_type, requirement_code)
);

CREATE INDEX IF NOT EXISTS idx_compliance_requirements_type ON compliance_requirements(certification_type);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_code ON compliance_requirements(requirement_code);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_category ON compliance_requirements(category);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_critical ON compliance_requirements(is_critical);

COMMENT ON TABLE compliance_requirements IS 'Reference library of compliance requirements by certification type';
COMMENT ON COLUMN compliance_requirements.certification_type IS 'Certification standard this requirement applies to';
COMMENT ON COLUMN compliance_requirements.requirement_code IS 'Unique code for the requirement (e.g., AF.1.1)';
COMMENT ON COLUMN compliance_requirements.requirement_description IS 'Detailed description of the requirement';
COMMENT ON COLUMN compliance_requirements.category IS 'Category of requirement (e.g., Traceability, IPM, Worker Safety)';
COMMENT ON COLUMN compliance_requirements.verification_method IS 'How to verify compliance (e.g., Document Review, Field Inspection)';
COMMENT ON COLUMN compliance_requirements.frequency IS 'How often requirement must be verified (e.g., Annual, Per Harvest)';
COMMENT ON COLUMN compliance_requirements.is_critical IS 'Whether this is a critical requirement (failure = non-compliance)';

ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_requirements_read_policy" ON compliance_requirements;
CREATE POLICY "compliance_requirements_read_policy" ON compliance_requirements
  FOR SELECT USING (
    true
  );

DROP POLICY IF EXISTS "compliance_requirements_write_policy" ON compliance_requirements;
CREATE POLICY "compliance_requirements_write_policy" ON compliance_requirements
  FOR ALL USING (
    is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Compliance Evidence (supporting documents for compliance checks)
CREATE TABLE IF NOT EXISTS compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_check_id UUID NOT NULL REFERENCES compliance_checks(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'document',
    'photo',
    'video',
    'inspection_report',
    'test_result',
    'record',
    'certificate',
    'other'
  )),
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_evidence_check ON compliance_evidence(compliance_check_id);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_type ON compliance_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_uploaded_by ON compliance_evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_uploaded_at ON compliance_evidence(uploaded_at);

COMMENT ON TABLE compliance_evidence IS 'Supporting documents and evidence for compliance checks';
COMMENT ON COLUMN compliance_evidence.compliance_check_id IS 'Compliance check this evidence supports';
COMMENT ON COLUMN compliance_evidence.evidence_type IS 'Type of evidence (document, photo, video, etc.)';
COMMENT ON COLUMN compliance_evidence.file_url IS 'URL to the evidence file in cloud storage';
COMMENT ON COLUMN compliance_evidence.description IS 'Description of what the evidence shows';
COMMENT ON COLUMN compliance_evidence.uploaded_by IS 'User who uploaded the evidence';
COMMENT ON COLUMN compliance_evidence.uploaded_at IS 'Timestamp when evidence was uploaded';

ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_evidence_read_policy" ON compliance_evidence;
CREATE POLICY "compliance_evidence_read_policy" ON compliance_evidence
  FOR SELECT USING (
    compliance_check_id IN (
      SELECT id FROM compliance_checks
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "compliance_evidence_create_policy" ON compliance_evidence;
CREATE POLICY "compliance_evidence_create_policy" ON compliance_evidence
  FOR INSERT WITH CHECK (
    compliance_check_id IN (
      SELECT id FROM compliance_checks
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "compliance_evidence_delete_policy" ON compliance_evidence;
CREATE POLICY "compliance_evidence_delete_policy" ON compliance_evidence
  FOR DELETE USING (
    compliance_check_id IN (
      SELECT id FROM compliance_checks
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Audit Reminders (scheduled reminders for certification audits)
CREATE TABLE IF NOT EXISTS audit_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('30_days', '14_days', '7_days', '1_day', 'overdue')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  notification_id UUID REFERENCES notifications(id),
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(certification_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_audit_reminders_scheduled ON audit_reminders(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_reminders_certification ON audit_reminders(certification_id);
CREATE INDEX IF NOT EXISTS idx_audit_reminders_org ON audit_reminders(organization_id);

ALTER TABLE audit_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org audit reminders" ON audit_reminders;
CREATE POLICY "Users can view their org audit reminders"
ON audit_reminders FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role can manage audit reminders" ON audit_reminders;
CREATE POLICY "Service role can manage audit reminders"
ON audit_reminders FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Corrective Action Plans (standalone action plans linked to certifications)
CREATE TABLE IF NOT EXISTS corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  compliance_check_id UUID REFERENCES compliance_checks(id) ON DELETE SET NULL,
  finding_description TEXT NOT NULL,
  requirement_code TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  action_description TEXT NOT NULL,
  responsible_person TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'verified', 'overdue')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  verified_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrective_actions_org ON corrective_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_certification ON corrective_actions(certification_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_check ON corrective_actions(compliance_check_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status ON corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_due_date ON corrective_actions(due_date);

CREATE OR REPLACE TRIGGER update_corrective_actions_updated_at
  BEFORE UPDATE ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can manage corrective actions" ON corrective_actions;
CREATE POLICY "Org members can manage corrective actions"
ON corrective_actions FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR is_internal_admin()
  OR current_setting('role', true) = 'service_role'
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR is_internal_admin()
  OR current_setting('role', true) = 'service_role'
);

COMMENT ON TABLE corrective_actions IS 'Corrective action plans linked to certifications and compliance checks';

-- ============================================================================
-- COMPLIANCE DOCUMENTS STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, "public")
VALUES ('compliance-documents', 'compliance-documents', false)
ON CONFLICT (id) DO UPDATE SET "public" = false;

DROP POLICY IF EXISTS "Org members can read compliance documents" ON storage.objects;
CREATE POLICY "Org members can read compliance documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_users
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org members can upload compliance documents" ON storage.objects;
CREATE POLICY "Org members can upload compliance documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_users
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org members can update compliance documents" ON storage.objects;
CREATE POLICY "Org members can update compliance documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_users
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM organization_users
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org admins can delete compliance documents" ON storage.objects;
CREATE POLICY "Org admins can delete compliance documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT ou.organization_id::text
    FROM organization_users ou
    JOIN roles r ON r.id = ou.role_id
    WHERE ou.user_id = auth.uid()
    AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
  )
);

-- ============================================================================
-- COMPLIANCE REALTIME PUBLICATION
-- ============================================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE certifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE compliance_checks;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE compliance_evidence;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- SEED COMPLIANCE REQUIREMENTS DATA
-- ============================================================================

-- GlobalGAP Requirements (10 requirements)
INSERT INTO compliance_requirements (certification_type, requirement_code, requirement_description, category, verification_method, frequency, is_critical)
VALUES
  (
    'GlobalGAP',
    'AF.1.1',
    'Traceability system for all products from production to sale',
    'Traceability',
    'Document Review, System Inspection',
    'Continuous',
    true
  ),
  (
    'GlobalGAP',
    'AF.2.1',
    'Record keeping for all farm activities including inputs, outputs, and labor',
    'Record Keeping',
    'Document Review',
    'Per Activity',
    true
  ),
  (
    'GlobalGAP',
    'CB.4.1',
    'Fertilizer application records with dates, products, rates, and fields',
    'Input Management',
    'Document Review, Field Inspection',
    'Per Application',
    true
  ),
  (
    'GlobalGAP',
    'CB.5.1',
    'Irrigation water quality testing and records',
    'Water Management',
    'Test Results, Document Review',
    'Annual',
    false
  ),
  (
    'GlobalGAP',
    'CB.7.1',
    'Integrated pest management plan with pesticide records',
    'Pest Management',
    'Document Review, Field Inspection',
    'Annual',
    true
  ),
  (
    'GlobalGAP',
    'FV.5.1',
    'Harvest hygiene procedures and worker training documentation',
    'Harvest Management',
    'Document Review, Worker Interview',
    'Per Harvest',
    true
  ),
  (
    'GlobalGAP',
    'FV.6.1',
    'Post-harvest handling and storage procedures',
    'Post-Harvest',
    'Document Review, Facility Inspection',
    'Annual',
    false
  ),
  (
    'GlobalGAP',
    'SA.1.1',
    'Worker safety training and incident records',
    'Worker Safety',
    'Document Review, Worker Interview',
    'Annual',
    true
  ),
  (
    'GlobalGAP',
    'SA.2.1',
    'Personal protective equipment (PPE) provision and usage',
    'Worker Safety',
    'Facility Inspection, Worker Interview',
    'Quarterly',
    true
  ),
  (
    'GlobalGAP',
    'SA.3.1',
    'Child labor and forced labor prevention policies',
    'Labor Practices',
    'Document Review, Worker Interview',
    'Annual',
    true
  )
ON CONFLICT (certification_type, requirement_code) DO NOTHING;

-- HACCP Requirements (5 requirements)
INSERT INTO compliance_requirements (certification_type, requirement_code, requirement_description, category, verification_method, frequency, is_critical)
VALUES
  (
    'HACCP',
    'CCP1',
    'Receiving raw materials inspection and acceptance criteria',
    'Receiving',
    'Inspection Records, Supplier Verification',
    'Per Delivery',
    true
  ),
  (
    'HACCP',
    'CCP2',
    'Storage temperature monitoring and records for perishables',
    'Storage',
    'Temperature Records, Equipment Calibration',
    'Continuous',
    true
  ),
  (
    'HACCP',
    'CCP3',
    'Processing temperature control and time records',
    'Processing',
    'Temperature Records, Process Logs',
    'Per Batch',
    true
  ),
  (
    'HACCP',
    'CCP4',
    'Metal detection and foreign material prevention',
    'Quality Control',
    'Equipment Logs, Test Records',
    'Per Batch',
    true
  ),
  (
    'HACCP',
    'CCP5',
    'Final product testing and microbiological analysis',
    'Testing',
    'Lab Test Results, Certificate of Analysis',
    'Per Batch',
    true
  )
ON CONFLICT (certification_type, requirement_code) DO NOTHING;

-- ISO 9001 Requirements (5 requirements)
INSERT INTO compliance_requirements (certification_type, requirement_code, requirement_description, category, verification_method, frequency, is_critical)
VALUES
  (
    'ISO9001',
    'QMS.1',
    'Quality management system documentation and procedures',
    'Quality Management',
    'Document Review, System Audit',
    'Annual',
    true
  ),
  (
    'ISO9001',
    'QMS.2',
    'Management review and effectiveness evaluation',
    'Management Review',
    'Meeting Minutes, Performance Data',
    'Annual',
    false
  ),
  (
    'ISO9001',
    'QMS.3',
    'Customer satisfaction monitoring and feedback management',
    'Customer Focus',
    'Survey Results, Complaint Records',
    'Quarterly',
    false
  ),
  (
    'ISO9001',
    'QMS.4',
    'Internal audit program and corrective actions',
    'Internal Audit',
    'Audit Reports, Corrective Action Records',
    'Annual',
    true
  ),
  (
    'ISO9001',
    'QMS.5',
    'Competence and training of personnel',
    'Personnel',
    'Training Records, Competency Assessment',
    'Annual',
    false
  )
ON CONFLICT (certification_type, requirement_code) DO NOTHING;

-- ============================================================================
-- ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================
ALTER TABLE IF EXISTS account_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organization_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_stock_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cost_center_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS account_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS soil_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS irrigation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rootstocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plantation_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS compliance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crop_cycle_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS harvest_events ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- CONSOLIDATED MIGRATIONS APPENDED FOR PRE-PRODUCTION BASELINE
-- Date: 2026-03-10


-- ============================================================================
-- Migration: 20260220230000_satellite_heatmap_cache.sql
-- ============================================================================

-- Persistent cache for satellite heatmap responses.
-- Stores the full JSON response (pixel_data, statistics, bounds, etc.)
-- keyed by parcel + index + date + grid_size.

CREATE TABLE IF NOT EXISTS satellite_heatmap_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  index_name TEXT NOT NULL,
  date DATE NOT NULL,
  grid_size INTEGER NOT NULL DEFAULT 1000,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Fast lookups by the cache key
CREATE UNIQUE INDEX IF NOT EXISTS idx_heatmap_cache_unique
  ON satellite_heatmap_cache(parcel_id, index_name, date, grid_size);

CREATE INDEX IF NOT EXISTS idx_heatmap_cache_org
  ON satellite_heatmap_cache(organization_id);

CREATE INDEX IF NOT EXISTS idx_heatmap_cache_expires
  ON satellite_heatmap_cache(expires_at);

-- RLS
ALTER TABLE satellite_heatmap_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_satellite_heatmap_cache" ON satellite_heatmap_cache
  FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "org_write_satellite_heatmap_cache" ON satellite_heatmap_cache
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND is_organization_member(organization_id)
  );

CREATE POLICY "org_update_satellite_heatmap_cache" ON satellite_heatmap_cache
  FOR UPDATE USING (is_organization_member(organization_id));

CREATE POLICY "org_delete_satellite_heatmap_cache" ON satellite_heatmap_cache
  FOR DELETE USING (is_organization_member(organization_id));


-- ============================================================================
-- Migration: 20260224000000_add_updated_at_to_stock_tables.sql
-- ============================================================================

-- Add missing updated_at columns to stock_movements and stock_valuation tables
-- These tables had BEFORE UPDATE triggers (trg_stock_movements_updated_at, trg_stock_valuation_updated_at)
-- that call update_updated_at_column() which sets NEW.updated_at = NOW(),
-- but the tables were missing the updated_at column, causing:
--   'record "new" has no field "updated_at"'
-- on any UPDATE (e.g., stock transfers, material issues, reconciliation).

-- Add updated_at to stock_movements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stock_movements'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add updated_at to stock_valuation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stock_valuation'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE stock_valuation ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Backfill existing rows: set updated_at = created_at for rows that had NULL
UPDATE stock_movements SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE stock_valuation SET updated_at = created_at WHERE updated_at IS NULL;

-- ============================================================================
-- Migration: 20260224100000_add_agriculture_elevage_modules.sql
-- ============================================================================

-- Add Agriculture and Élevage activity-type modules
-- These represent the types of farming activities available to organizations

INSERT INTO modules (name, icon, category, description, required_plan, is_available) VALUES
  -- Agriculture modules
  ('arbres_fruitiers', 'TreeDeciduous', 'agriculture', 'Gestion des arbres fruitiers (pommiers, agrumes, grenadiers, avocatiers...)', NULL, true),
  ('aeroponie', 'Droplets', 'agriculture', 'Culture aéroponique', NULL, true),
  ('hydroponie', 'Waves', 'agriculture', 'Culture hydroponique', NULL, true),
  ('maraichage', 'Sprout', 'agriculture', 'Maraîchage et cultures légumières', NULL, true),
  ('myciculture', 'Flower2', 'agriculture', 'Myciculture - culture de champignons', NULL, true),
  ('pisciculture', 'Fish', 'agriculture', 'Pisciculture - élevage de poissons', NULL, true),
  -- Élevage modules
  ('bovin', 'Beef', 'elevage', 'Élevage bovin', NULL, true),
  ('ovin', 'CircleDot', 'elevage', 'Élevage ovin', NULL, true),
  ('camelin', 'CircleDot', 'elevage', 'Élevage camelin', NULL, true),
  ('caprin', 'CircleDot', 'elevage', 'Élevage caprin', NULL, true),
  ('aviculture', 'Bird', 'elevage', 'Aviculture - élevage de volailles', NULL, true),
  ('couveuses', 'Egg', 'elevage', 'Gestion des couveuses (poussins, poulet de chair, poules pondeuses)', NULL, true)
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- Migration: 20260224200000_add_parcel_irrigation_fields.sql
-- ============================================================================

-- Add irrigation frequency and water quantity fields to parcels
ALTER TABLE IF EXISTS parcels ADD COLUMN IF NOT EXISTS irrigation_frequency TEXT;
ALTER TABLE IF EXISTS parcels ADD COLUMN IF NOT EXISTS water_quantity_per_session NUMERIC;
ALTER TABLE IF EXISTS parcels ADD COLUMN IF NOT EXISTS water_quantity_unit TEXT DEFAULT 'm3';

COMMENT ON COLUMN parcels.irrigation_frequency IS 'Irrigation frequency, e.g. 1x/week, 2x/week, 1x/month';
COMMENT ON COLUMN parcels.water_quantity_per_session IS 'Water quantity per irrigation session';
COMMENT ON COLUMN parcels.water_quantity_unit IS 'Unit for water quantity: m3, liters, etc.';


-- ============================================================================
-- Migration: 20260310100000_subscription_contract_alignment.sql
-- ============================================================================
-- Backfill canonical values for existing rows (idempotent)

-- Canonical formula backfill from legacy plan_type values
UPDATE subscriptions
SET formula = CASE
  WHEN COALESCE(formula, '') <> '' THEN formula
  WHEN plan_type IN ('core', 'essential', 'starter') THEN 'starter'
  WHEN plan_type IN ('professional', 'standard') THEN 'standard'
  WHEN plan_type = 'premium' THEN 'premium'
  WHEN plan_type = 'enterprise' THEN 'enterprise'
  ELSE 'standard'
END;

-- Canonical billing cycle backfill from legacy billing_interval values
UPDATE subscriptions
SET billing_cycle = CASE
  WHEN COALESCE(billing_cycle, '') <> '' THEN billing_cycle
  WHEN billing_interval IN ('month', 'monthly') THEN 'monthly'
  WHEN billing_interval IN ('year', 'yearly', 'annual') THEN 'annual'
  WHEN billing_interval IN ('semiannual', 'semestrial') THEN 'semiannual'
  ELSE 'monthly'
END;

-- Normalize legacy billing_interval textual values for compatibility reads
UPDATE subscriptions
SET billing_interval = CASE
  WHEN billing_interval IN ('month', 'monthly') THEN 'monthly'
  WHEN billing_interval IN ('year', 'yearly', 'annual') THEN 'annual'
  WHEN billing_interval IN ('semiannual', 'semestrial') THEN 'semiannual'
  ELSE COALESCE(billing_interval, 'monthly')
END;

UPDATE polar_subscriptions
SET billing_interval = CASE
  WHEN billing_interval IN ('month', 'monthly') THEN 'monthly'
  WHEN billing_interval IN ('year', 'yearly', 'annual') THEN 'annual'
  WHEN billing_interval IN ('semiannual', 'semestrial') THEN 'semiannual'
  ELSE COALESCE(billing_interval, 'monthly')
END
WHERE billing_interval IS DISTINCT FROM CASE
  WHEN billing_interval IN ('month', 'monthly') THEN 'monthly'
  WHEN billing_interval IN ('year', 'yearly', 'annual') THEN 'annual'
  WHEN billing_interval IN ('semiannual', 'semestrial') THEN 'semiannual'
  ELSE COALESCE(billing_interval, 'monthly')
END;

-- Included users default by formula when missing
UPDATE subscriptions
SET included_users = CASE
  WHEN formula = 'starter' THEN 3
  WHEN formula = 'standard' THEN 10
  WHEN formula = 'premium' THEN 25
  WHEN formula = 'enterprise' THEN NULL
  ELSE 10
END
WHERE included_users IS NULL;

-- Default contracted hectares by formula when missing
UPDATE subscriptions
SET contracted_hectares = CASE
  WHEN formula = 'starter' THEN 50
  WHEN formula = 'standard' THEN 200
  WHEN formula = 'premium' THEN 500
  WHEN formula = 'enterprise' THEN 501
  ELSE 200
END
WHERE contracted_hectares IS NULL;

-- Keep legacy plan_type synchronized during transition
UPDATE subscriptions
SET plan_type = CASE
  WHEN formula = 'starter' THEN 'essential'
  WHEN formula = 'standard' THEN 'professional'
  WHEN formula = 'premium' THEN 'enterprise'
  WHEN formula = 'enterprise' THEN 'enterprise'
  ELSE plan_type
END
WHERE formula IS NOT NULL;

-- Queue migration switch at renewal date for currently active subscribers.
UPDATE subscriptions
SET pending_formula = COALESCE(pending_formula, formula),
    pending_billing_cycle = COALESCE(pending_billing_cycle, billing_cycle),
    migration_effective_at = COALESCE(migration_effective_at, current_period_end)
WHERE status = 'active'
  AND current_period_end IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_migration_effective ON subscriptions(migration_effective_at);

-- Subscription contracts
CREATE TABLE IF NOT EXISTS subscription_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  contract_reference VARCHAR(120),
  signed_at TIMESTAMPTZ,
  effective_at TIMESTAMPTZ,
  term_months INTEGER DEFAULT 12,
  notice_period_days INTEGER DEFAULT 60,
  auto_renew BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_contracts_org ON subscription_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_contracts_subscription ON subscription_contracts(subscription_id);

-- Subscription lifecycle events
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  actor_type VARCHAR(50),
  actor_id VARCHAR(120),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_org ON subscription_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);

-- Billing documents (invoice/credit-note like records)
CREATE TABLE IF NOT EXISTS billing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_number VARCHAR(80),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  amount_ht NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_tva NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_ttc NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'MAD',
  status VARCHAR(30) NOT NULL DEFAULT 'issued',
  paid_at TIMESTAMPTZ,
  late_fee_amount NUMERIC(14,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_documents_org ON billing_documents(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_documents_due ON billing_documents(due_at);
CREATE INDEX IF NOT EXISTS idx_billing_documents_status ON billing_documents(status);

-- Enable RLS
ALTER TABLE subscription_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_documents ENABLE ROW LEVEL SECURITY;

-- Organization read policies
DROP POLICY IF EXISTS "org_read_subscription_contracts" ON subscription_contracts;
CREATE POLICY "org_read_subscription_contracts" ON subscription_contracts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_read_subscription_events" ON subscription_events;
CREATE POLICY "org_read_subscription_events" ON subscription_events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_read_billing_documents" ON billing_documents;
CREATE POLICY "org_read_billing_documents" ON billing_documents
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Admin write policies
DROP POLICY IF EXISTS "admin_write_subscription_contracts" ON subscription_contracts;
CREATE POLICY "admin_write_subscription_contracts" ON subscription_contracts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = subscription_contracts.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = subscription_contracts.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  );

DROP POLICY IF EXISTS "admin_write_subscription_events" ON subscription_events;
CREATE POLICY "admin_write_subscription_events" ON subscription_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = subscription_events.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = subscription_events.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  );

DROP POLICY IF EXISTS "admin_write_billing_documents" ON billing_documents;
CREATE POLICY "admin_write_billing_documents" ON billing_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = billing_documents.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = billing_documents.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  );

-- Compatibility view exposing canonical + legacy pointers
CREATE OR REPLACE VIEW subscription_legacy_compat AS
SELECT
  s.id,
  s.organization_id,
  s.formula,
  CASE
    WHEN s.formula = 'starter' THEN 'essential'
    WHEN s.formula = 'standard' THEN 'professional'
    WHEN s.formula = 'premium' THEN 'enterprise'
    WHEN s.formula = 'enterprise' THEN 'enterprise'
    ELSE s.plan_type
  END AS legacy_plan_type,
  s.billing_cycle,
  s.billing_interval,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.migration_effective_at,
  s.pending_formula,
  s.pending_billing_cycle
FROM subscriptions s;


-- ============================================================================
-- Migration: 20260310113000_fix_missing_updated_at_columns.sql
-- ============================================================================

-- Fix trigger failures ("record NEW has no field updated_at") on tables
-- that already use update_updated_at_column() triggers.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.journal_entries
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.metayage_settlements
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.metayage_settlements
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.biological_asset_valuations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.biological_asset_valuations
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;


-- ============================================================================
-- Migration: 20260323000000_add_missing_storage_buckets.sql
-- ============================================================================
-- Creates missing storage buckets: files, invoices, agritech-documents
-- These buckets are used in code but were never created in migrations.
-- ============================================================================

-- =====================================================
-- FILES STORAGE BUCKET
-- Used by: backend files.service.ts (general file uploads),
--          web TaskAttachments.tsx (task file attachments)
-- =====================================================

INSERT INTO storage.buckets (id, name, "public")
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated read access for files" ON storage.objects;
CREATE POLICY "Authenticated read access for files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'files');

DROP POLICY IF EXISTS "Authenticated upload for files" ON storage.objects;
CREATE POLICY "Authenticated upload for files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

DROP POLICY IF EXISTS "Authenticated update for files" ON storage.objects;
CREATE POLICY "Authenticated update for files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'files')
WITH CHECK (bucket_id = 'files');

DROP POLICY IF EXISTS "Authenticated delete for files" ON storage.objects;
CREATE POLICY "Authenticated delete for files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'files');

-- =====================================================
-- INVOICES STORAGE BUCKET
-- Used by: web UtilitiesManagement.tsx (utility invoice uploads)
-- Private bucket, org-scoped via farm_id folder prefix
-- =====================================================

INSERT INTO storage.buckets (id, name, "public")
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated read access for invoices" ON storage.objects;
CREATE POLICY "Authenticated read access for invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Authenticated upload for invoices" ON storage.objects;
CREATE POLICY "Authenticated upload for invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Authenticated update for invoices" ON storage.objects;
CREATE POLICY "Authenticated update for invoices"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'invoices')
WITH CHECK (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Authenticated delete for invoices" ON storage.objects;
CREATE POLICY "Authenticated delete for invoices"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'invoices');

-- =====================================================
-- AGRITECH-DOCUMENTS STORAGE BUCKET
-- Used by: web useTifUpload.ts (TIF/satellite imagery for parcels)
-- Private bucket for geospatial documents
-- =====================================================
-- AI METERING & QUOTAS
-- =====================================================

-- Append-only audit trail of all AI requests
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  feature VARCHAR(50) NOT NULL,        -- 'chat', 'report', 'alert', 'job', 'annual_plan', 'calibration', 'compliance'
  provider VARCHAR(50) NOT NULL,       -- 'zai', 'openai', 'gemini', 'groq'
  model VARCHAR(100),
  tokens_used INTEGER,                 -- nullable, for future analytics
  is_byok BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org ON ai_usage_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON ai_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_org_created ON ai_usage_log(organization_id, created_at);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_log_org_access" ON ai_usage_log
  FOR ALL USING (is_organization_member(organization_id));

-- Current period usage per org (one row per org, lazy-reset monthly)
CREATE TABLE IF NOT EXISTS ai_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  monthly_limit INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_quotas_org_access" ON ai_quotas
  FOR ALL USING (is_organization_member(organization_id));

-- =====================================================

INSERT INTO storage.buckets (id, name, "public")
VALUES ('agritech-documents', 'agritech-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated read access for agritech-documents" ON storage.objects;
CREATE POLICY "Authenticated read access for agritech-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'agritech-documents');

DROP POLICY IF EXISTS "Authenticated upload for agritech-documents" ON storage.objects;
CREATE POLICY "Authenticated upload for agritech-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agritech-documents');

DROP POLICY IF EXISTS "Authenticated update for agritech-documents" ON storage.objects;
CREATE POLICY "Authenticated update for agritech-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'agritech-documents')
WITH CHECK (bucket_id = 'agritech-documents');

DROP POLICY IF EXISTS "Authenticated delete for agritech-documents" ON storage.objects;
CREATE POLICY "Authenticated delete for agritech-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agritech-documents');

-- ==========================================
-- Newsletter subscribers (public, no org scope)
-- ==========================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL UNIQUE,
  locale VARCHAR(5) DEFAULT 'fr',
  source_slug VARCHAR(255),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);

-- ==========================================
-- SIAM RDV leads (public, no org scope)
-- ==========================================
CREATE TABLE IF NOT EXISTS siam_rdv_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(120) NOT NULL,
  entreprise VARCHAR(160),
  tel VARCHAR(30) NOT NULL,
  email VARCHAR(320),
  surface VARCHAR(60),
  region VARCHAR(80),
  cultures TEXT[],
  creneau VARCHAR(40) NOT NULL,
  source VARCHAR(80),
  source_ip VARCHAR(45),
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_siam_rdv_leads_created_at ON siam_rdv_leads(created_at DESC);

-- RLS: only service_role can access (public table, no org scope)
ALTER TABLE siam_rdv_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON siam_rdv_leads
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- Calibration Wizard Drafts
-- =====================================================
-- Stores in-progress calibration wizard form data per parcel/user
-- so users can resume across sessions.

CREATE TABLE IF NOT EXISTS public.calibration_wizard_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 8),
  form_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_calibration_draft_parcel_org_user UNIQUE(parcel_id, organization_id, user_id)
);

COMMENT ON TABLE public.calibration_wizard_drafts IS 'Stores in-progress calibration wizard form state per parcel/user so they can resume across sessions.';

CREATE INDEX IF NOT EXISTS idx_calibration_drafts_parcel_org ON public.calibration_wizard_drafts(parcel_id, organization_id, user_id);

-- RLS: only organization members can access their own drafts
ALTER TABLE public.calibration_wizard_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON public.calibration_wizard_drafts
  FOR ALL USING (public.is_organization_member(organization_id));

-- updated_at trigger
CREATE TRIGGER set_calibration_wizard_drafts_updated_at
  BEFORE UPDATE ON public.calibration_wizard_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- updated_at trigger
CREATE TRIGGER set_siam_rdv_leads_updated_at
  BEFORE UPDATE ON siam_rdv_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PEST & DISEASE LIBRARY
-- ============================================================================

CREATE TABLE IF NOT EXISTS pest_disease_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  crop_types TEXT[] DEFAULT '{}',
  symptoms TEXT NOT NULL DEFAULT '',
  treatment TEXT NOT NULL DEFAULT '',
  prevention TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pest_disease_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read" ON pest_disease_library
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_all" ON pest_disease_library
  FOR ALL TO postgres USING (true);

-- Index for active library entries
CREATE INDEX IF NOT EXISTS idx_pest_disease_library_active ON pest_disease_library (is_active, name);

-- ============================================================================
-- PEST & DISEASE REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS pest_disease_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES user_profiles(id),
  pest_disease_id UUID REFERENCES pest_disease_library(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  affected_area_percentage NUMERIC,
  detection_method TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  location JSONB,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  treatment_applied TEXT,
  treatment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pest_disease_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON pest_disease_reports
  FOR ALL USING (public.is_organization_member(organization_id));

-- Index for organization queries
CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_org ON pest_disease_reports (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_status ON pest_disease_reports (status);

-- updated_at triggers
CREATE TRIGGER set_pest_disease_library_updated_at
  BEFORE UPDATE ON pest_disease_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_pest_disease_reports_updated_at
  BEFORE UPDATE ON pest_disease_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EMAIL TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'general' CHECK (category IN ('marketplace', 'invoice', 'quote', 'order', 'task', 'reminder', 'general')),
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Org-scoped templates: members can access their org's templates
CREATE POLICY "org_access" ON email_templates
  FOR ALL USING (
    organization_id IS NULL
    OR public.is_organization_member(organization_id)
  );

CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates (organization_id, category);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates (type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_global_type_unique ON email_templates (type) WHERE organization_id IS NULL;

CREATE TRIGGER set_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- BANNERS
-- =====================================================
-- Admin-configurable in-app banners for temporary operational messaging:
-- maintenance windows, degraded service warnings, feature rollout notices, etc.

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'critical')),
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'admins', 'managers', 'growers')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  dismissible BOOLEAN NOT NULL DEFAULT true,
  cta_label TEXT,
  cta_url TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  impressions INTEGER NOT NULL DEFAULT 0,
  dismissals INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON banners
  FOR ALL USING (organization_id IS NULL OR public.is_organization_member(organization_id));

CREATE INDEX IF NOT EXISTS idx_banners_org ON banners (organization_id);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners (organization_id, enabled, start_at, end_at);

CREATE TRIGGER set_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- BANNER DISMISSALS
-- =====================================================
-- Tracks which users have dismissed which banners, preventing re-show.

CREATE TABLE IF NOT EXISTS banner_dismissals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banner_id UUID NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(banner_id, user_id)
);

ALTER TABLE banner_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON banner_dismissals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM banners b
      WHERE b.id = banner_dismissals.banner_id
      AND public.is_organization_member(b.organization_id)
    )
  );


-- =====================================================
-- CHANGELOGS
-- =====================================================
-- Durable, browsable history of user-facing product changes.

CREATE TABLE IF NOT EXISTS changelogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT,
  category TEXT NOT NULL DEFAULT 'feature' CHECK (category IN ('feature', 'improvement', 'fix', 'breaking', 'infra')),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE changelogs ENABLE ROW LEVEL SECURITY;

-- Global changelogs are visible to everyone; org-specific ones only to org members
CREATE POLICY "changelog_read" ON changelogs
  FOR SELECT USING (
    is_global = true
    OR (organization_id IS NOT NULL AND public.is_organization_member(organization_id))
  );

CREATE POLICY "changelog_manage" ON changelogs
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organization_users ou
      JOIN public.roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND r.name = 'system_admin'
        AND ou.is_active = true
    )
  );


CREATE INDEX IF NOT EXISTS idx_changelogs_published ON changelogs (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_changelogs_org ON changelogs (organization_id);
CREATE INDEX IF NOT EXISTS idx_changelogs_global ON changelogs (is_global) WHERE is_global = true;

CREATE TRIGGER set_changelogs_updated_at
  BEFORE UPDATE ON changelogs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();




-- =====================================================
-- SUPPORTED COUNTRIES
-- =====================================================
-- Platform-level table tracking which countries the platform supports.
-- Managed by internal admins. No organization_id — this is global data.

CREATE TABLE IF NOT EXISTS supported_countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  region TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE supported_countries IS 'Platform-level list of countries where the platform is available for agricultural land';

ALTER TABLE supported_countries ENABLE ROW LEVEL SECURITY;

-- Everyone can read supported countries (public info)
CREATE POLICY "supported_countries_read" ON supported_countries
  FOR SELECT USING (true);

-- Only service_role can manage (admin API uses service_role client)
CREATE POLICY "supported_countries_manage" ON supported_countries
  FOR ALL USING (
    auth.role() = 'service_role'
  );

CREATE INDEX IF NOT EXISTS idx_supported_countries_region ON supported_countries (region);
CREATE INDEX IF NOT EXISTS idx_supported_countries_enabled ON supported_countries (enabled) WHERE enabled = true;

CREATE TRIGGER set_supported_countries_updated_at
  BEFORE UPDATE ON supported_countries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed initial supported countries (more can be added via admin API)
INSERT INTO supported_countries (country_code, country_name, region, enabled, display_order) VALUES
  ('MA', 'Morocco', 'Africa', true, 1)
ON CONFLICT (country_code) DO NOTHING;
