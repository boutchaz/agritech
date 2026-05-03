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
    'pay',
    'bank_fee'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Idempotently add bank_fee for clusters that already have the type
DO $$ BEGIN
  ALTER TYPE accounting_payment_type ADD VALUE IF NOT EXISTS 'bank_fee';
EXCEPTION
  WHEN others THEN null;
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

-- Invoice Type — direction (sales = outgoing, purchase = incoming)
DO $$ BEGIN
  CREATE TYPE invoice_type AS ENUM (
    'sales',
    'purchase'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Invoice Document Type — orthogonal to direction.
-- credit_note reverses an invoice (refund), debit_note adjusts an invoice upward.
DO $$ BEGIN
  CREATE TYPE invoice_document_type AS ENUM (
    'invoice',
    'credit_note',
    'debit_note'
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
  contact_person VARCHAR(255),
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
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent add for existing installations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'organizations' AND constraint_name = 'organizations_approval_status_check'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;


CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_country_code ON organizations(country_code);
CREATE INDEX IF NOT EXISTS idx_organizations_accounting_standard ON organizations(accounting_standard);
CREATE INDEX IF NOT EXISTS idx_organizations_approval_status ON organizations(approval_status);

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

-- Define is_organization_member() as early as possible so any RLS policy
-- declared further down in this file can reference it. The canonical
-- definition (with same body) is repeated near the RLS section to keep
-- it visible to readers; CREATE OR REPLACE makes that idempotent.
CREATE OR REPLACE FUNCTION is_organization_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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





-- =====================================================
-- SEED ACCOUNT MAPPINGS FOR ALL COUNTRIES
-- =====================================================







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

-- Withholding tax support — Moroccan IGR (10% pro services) and supplier
-- VAT withholding (1.75% on certain payments). When is_withholding=true,
-- the GL helper splits the supplier credit: the supplier gets net-of-WHT,
-- the state-WHT-payable account gets the WHT amount.
ALTER TABLE taxes ADD COLUMN IF NOT EXISTS is_withholding BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE taxes ADD COLUMN IF NOT EXISTS withholding_account_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_taxes_withholding_account') THEN
    ALTER TABLE taxes
      ADD CONSTRAINT fk_taxes_withholding_account
      FOREIGN KEY (withholding_account_id) REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_taxes_org ON taxes(organization_id);
CREATE INDEX IF NOT EXISTS idx_taxes_withholding ON taxes(organization_id) WHERE is_withholding = true;

COMMENT ON COLUMN taxes.is_withholding IS 'True when this tax is withheld at source rather than added to the invoice total. Reduces what the supplier receives; the WHT amount goes to a state-payable account instead.';
COMMENT ON COLUMN taxes.withholding_account_id IS 'GL account where the withheld amount accrues (state-WHT-payable). Falls back to the default tax payable mapping if NULL.';

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

-- Bank Transactions (statement lines, for reconciliation against accounting_payments)
-- Minimal cut: manual + future CSV/OFX import. Auto-matching engine to follow.
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  value_date DATE,
  amount DECIMAL(15, 2) NOT NULL, -- Positive = inflow / Negative = outflow
  currency_code VARCHAR(3) DEFAULT 'MAD' REFERENCES currencies(code),
  description TEXT,
  reference TEXT, -- Bank reference / cheque number / wire ref
  balance_after DECIMAL(15, 2), -- Statement-reported running balance after this line
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'ofx', 'mt940', 'api')),
  source_batch_id UUID, -- FK to bank_statement_imports when added
  matched_payment_id UUID, -- FK to accounting_payments added after that table is created
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_org ON bank_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_unreconciled
  ON bank_transactions(bank_account_id, transaction_date DESC)
  WHERE reconciled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bank_transactions_match
  ON bank_transactions(matched_payment_id)
  WHERE matched_payment_id IS NOT NULL;

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_bank_transactions" ON bank_transactions;
CREATE POLICY "org_access_bank_transactions" ON bank_transactions
  FOR ALL USING (is_organization_member(organization_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON bank_transactions TO authenticated;

COMMENT ON TABLE bank_transactions IS 'Raw statement lines from a bank account, manually entered or CSV/OFX imported. Reconciled by linking matched_payment_id.';
COMMENT ON COLUMN bank_transactions.amount IS 'Positive = inflow / Negative = outflow';
COMMENT ON COLUMN bank_transactions.source IS 'manual / csv / ofx / mt940 / api — provenance of the line';

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
  -- Multi-currency FX (4d): currency the source transaction was in,
  -- exchange_rate to org base currency, fc_* hold foreign currency amounts.
  -- debit/credit are always in org base currency.
  currency CHAR(3),
  exchange_rate DECIMAL(18, 8),
  fc_debit DECIMAL(15, 2),
  fc_credit DECIMAL(15, 2),
  -- Phase 4c: Cash basis P&L. Set on items whose JE moved cash (or that touch a
  -- cash/bank account); NULL means "not yet cash-settled" (excluded from cash-basis P&L).
  cash_settlement_date DATE NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE journal_items ADD COLUMN IF NOT EXISTS cash_settlement_date DATE NULL;

-- Multi-currency FX rates (4d)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  rate_date DATE NOT NULL,
  from_currency CHAR(3) NOT NULL,
  to_currency CHAR(3) NOT NULL,
  rate DECIMAL(18, 8) NOT NULL CHECK (rate > 0),
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, rate_date, from_currency, to_currency)
);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
  ON exchange_rates (organization_id, from_currency, to_currency, rate_date DESC);

-- =====================================================================
-- P&L Phase 4f: Inter-organization (group) consolidation
-- =====================================================================
CREATE TABLE IF NOT EXISTS organization_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  base_currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_organization_id, name)
);
CREATE INDEX IF NOT EXISTS idx_org_groups_parent ON organization_groups(parent_organization_id);

CREATE TABLE IF NOT EXISTS organization_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES organization_groups(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_org_group_members_group ON organization_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_org_group_members_org ON organization_group_members(organization_id);

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS intercompany_pair_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_intercompany
  ON journal_entries(intercompany_pair_id)
  WHERE intercompany_pair_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_items_entry ON journal_items(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_account ON journal_items(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_cost_center ON journal_items(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_crop_cycle ON journal_items(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_campaign ON journal_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_fiscal_year ON journal_items(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_cash_settled
  ON journal_items(cash_settlement_date)
  WHERE cash_settlement_date IS NOT NULL;

-- Phase 4c: cash_settlement_date is now set by the application layer
-- (AccountingAutomationService.applyCashSettlementDate) after every JE post.
DROP TRIGGER IF EXISTS trg_set_cash_settlement ON journal_entries;
DROP FUNCTION IF EXISTS set_cash_settlement_on_payment_post();

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

-- Credit / Debit note support — added after initial invoices schema.
-- document_type defaults to 'invoice'; credit_note rows reference the original
-- invoice via original_invoice_id. credited_amount tracks how much has been
-- credited against this invoice (sum of grand_total of related credit notes).
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS document_type invoice_document_type NOT NULL DEFAULT 'invoice';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credit_reason TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credited_amount DECIMAL(15, 2) DEFAULT 0;
-- Hybrid tax model: header default applies when a line has no tax_rate
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5, 2);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5, 2);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5, 2);

-- Petty / unjustified expenses (charges non justifiées)
-- Standalone ledger of small expenses without a formal supplier invoice. Each row
-- posts a journal entry DR expense / CR cash on submit, similar to invoice posting.
CREATE TABLE IF NOT EXISTS petty_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  expense_number TEXT NOT NULL,
  expense_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(3) DEFAULT 'MAD' REFERENCES currencies(code),
  expense_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  cash_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  attachment_url TEXT,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'cancelled')),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  UNIQUE(organization_id, expense_number)
);

CREATE INDEX IF NOT EXISTS idx_petty_expenses_org ON petty_expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_petty_expenses_date ON petty_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_petty_expenses_status ON petty_expenses(status);
CREATE INDEX IF NOT EXISTS idx_petty_expenses_farm ON petty_expenses(farm_id) WHERE farm_id IS NOT NULL;

ALTER TABLE petty_expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "petty_expenses_org_access" ON petty_expenses
    FOR ALL USING (is_organization_member(organization_id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_original_invoice') THEN
    ALTER TABLE invoices
      ADD CONSTRAINT fk_invoices_original_invoice
      FOREIGN KEY (original_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON invoices(document_type);
CREATE INDEX IF NOT EXISTS idx_invoices_original ON invoices(original_invoice_id) WHERE original_invoice_id IS NOT NULL;

COMMENT ON COLUMN invoices.document_type IS 'Document kind: invoice (default), credit_note (reverses an invoice), debit_note (adjusts upward).';
COMMENT ON COLUMN invoices.original_invoice_id IS 'For credit/debit notes: the invoice being adjusted.';
COMMENT ON COLUMN invoices.credit_reason IS 'Free-text reason on credit/debit notes (return, damage, weight dispute, price adjustment, other).';
COMMENT ON COLUMN invoices.credited_amount IS 'Sum of grand_total of credit notes that reference this invoice. Updated by trigger.';

-- invoices.credited_amount is now recomputed in the application layer
-- (InvoicesService.createCreditNote) within the credit-note transaction.
DROP TRIGGER IF EXISTS trg_sync_invoice_credited_amount ON invoices;
DROP TRIGGER IF EXISTS trg_sync_invoice_credited_amount_iu ON invoices;
DROP TRIGGER IF EXISTS trg_sync_invoice_credited_amount_d ON invoices;
DROP FUNCTION IF EXISTS sync_invoice_credited_amount();

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

-- Deferred FK: bank_transactions.matched_payment_id -> accounting_payments(id)
-- Declared inline above as a plain UUID because accounting_payments is created
-- later in this file. Wire the FK now that both tables exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'bank_transactions'
      AND constraint_name = 'bank_transactions_matched_payment_id_fkey'
  ) THEN
    ALTER TABLE bank_transactions
      ADD CONSTRAINT bank_transactions_matched_payment_id_fkey
      FOREIGN KEY (matched_payment_id) REFERENCES accounting_payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Advance payment support — added after initial accounting_payments schema.
-- An advance is a payment received/paid before the matching invoice exists.
-- Posts to a dedicated CGNC advance account (4421 customer advances /
-- 3421 supplier advances) instead of receivable/payable. When later applied
-- to an invoice via payment_allocations, an internal-transfer JE moves the
-- amount from the advance account to AR/AP (handled in AdvancesService).
ALTER TABLE accounting_payments ADD COLUMN IF NOT EXISTS is_advance BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE accounting_payments ADD COLUMN IF NOT EXISTS advance_account_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_accounting_payments_advance_account') THEN
    ALTER TABLE accounting_payments
      ADD CONSTRAINT fk_accounting_payments_advance_account
      FOREIGN KEY (advance_account_id) REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_accounting_payments_advance
  ON accounting_payments(party_id, party_type, is_advance)
  WHERE is_advance = true;
COMMENT ON COLUMN accounting_payments.is_advance IS 'True when this payment is an advance (prepayment) not yet applied to any invoice. Allocations later transfer it to AR/AP.';
COMMENT ON COLUMN accounting_payments.advance_account_id IS 'Liability (customer advance) or asset (supplier advance) account this payment hits at posting time.';

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
ALTER TABLE IF EXISTS exchange_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access" ON exchange_rates;
CREATE POLICY "org_access" ON exchange_rates
  FOR ALL USING (organization_id IS NULL OR is_organization_member(organization_id));
ALTER TABLE IF EXISTS organization_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_group_parent_access" ON organization_groups;
CREATE POLICY "org_group_parent_access" ON organization_groups FOR ALL
  USING (is_organization_member(parent_organization_id));
ALTER TABLE IF EXISTS organization_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_group_member_access" ON organization_group_members;
CREATE POLICY "org_group_member_access" ON organization_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_groups og
      WHERE og.id = organization_group_members.group_id
        AND is_organization_member(og.parent_organization_id)
    )
  );
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
  -- Payment amount per task (auto-fill = daily_rate × duration; nullable for non-paid tasks)
  payment_amount NUMERIC,
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
  edited_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (type IN ('comment', 'status_update', 'completion_note', 'issue'))
);

-- Idempotent ALTERs so pre-existing databases pick up new columns without a reset
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_unresolved ON task_comments(task_id) WHERE type = 'issue' AND resolved_at IS NULL;

-- Explicit FK to user_profiles so PostgREST can resolve the join
ALTER TABLE task_comments
  ADD CONSTRAINT task_comments_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Task Watchers — users who want update notifications for a task they're not assigned to
CREATE TABLE IF NOT EXISTS task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_watchers_task ON task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_user ON task_watchers(user_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_org ON task_watchers(organization_id);

ALTER TABLE task_watchers
  ADD CONSTRAINT task_watchers_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

-- Task Mentions — persistent record of @mentions in comments for notifications and analytics
CREATE TABLE IF NOT EXISTS task_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (mentioned_user_id IS NOT NULL OR mentioned_worker_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_task_mentions_comment ON task_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_task_mentions_task ON task_mentions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_mentions_mentioned_user ON task_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_task_mentions_mentioned_worker ON task_mentions(mentioned_worker_id);

-- Task Time Logs
CREATE TABLE IF NOT EXISTS task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  break_duration INTEGER DEFAULT 0,
  total_hours NUMERIC DEFAULT 0, -- computed in service layer
  units_completed NUMERIC, -- per-worker piece-work count at this clock-out
  notes TEXT,
  photo_url TEXT, -- evidence photo uploaded on clock-out
  location_lat NUMERIC,
  location_lng NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent ALTERs for existing databases
ALTER TABLE task_time_logs ADD COLUMN IF NOT EXISTS units_completed NUMERIC;
ALTER TABLE task_time_logs ADD COLUMN IF NOT EXISTS photo_url TEXT;

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
  CHECK (payment_type IN ('daily_wage', 'monthly_salary', 'metayage_share', 'bonus', 'overtime', 'advance', 'piece_work')),
  CHECK (status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),
  CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'mobile_money'))
);

CREATE INDEX IF NOT EXISTS idx_payment_records_org ON payment_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_farm ON payment_records(farm_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_worker ON payment_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);

CREATE TABLE IF NOT EXISTS piece_work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  work_unit_id UUID NOT NULL REFERENCES work_units(id) ON DELETE RESTRICT,
  units_completed NUMERIC NOT NULL,
  rate_per_unit NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  quality_rating INTEGER CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
  start_time TEXT,
  end_time TEXT,
  break_duration INTEGER DEFAULT 0,
  notes TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid')),
  created_by UUID REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_piece_work_records_org ON piece_work_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_farm ON piece_work_records(farm_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_worker ON piece_work_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_date ON piece_work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_status ON piece_work_records(payment_status);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_parcel ON piece_work_records(parcel_id);

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
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (reception_type IN ('general', 'olivier', 'viticole', 'laitier', 'fruiter', 'legumier'))
);

CREATE INDEX IF NOT EXISTS idx_warehouses_org ON warehouses(organization_id) WHERE deleted_at IS NULL;
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
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_item_groups_org ON item_groups(organization_id) WHERE deleted_at IS NULL;
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
  reorder_point NUMERIC DEFAULT 0,
  reorder_quantity NUMERIC DEFAULT 0,
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
  deleted_at TIMESTAMPTZ, -- Soft delete: NULL = active, set to timestamp when deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CHECK (valuation_method IN ('FIFO', 'LIFO', 'Moving Average')),
  CHECK (seasonality IN ('spring', 'summer', 'autumn', 'winter', 'year-round'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_items_code_org ON items(organization_id, item_code) WHERE deleted_at IS NULL;
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
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_unique_name ON product_variants (organization_id, item_id, variant_name) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_variants_org ON product_variants(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_item ON product_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(variant_sku) WHERE variant_sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_unit_id ON product_variants(unit_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(organization_id, item_id) WHERE deleted_at IS NULL;

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

-- ====================================================================
-- ITEM BARCODES (Multi-barcode per item — ERPNext parity)
-- ====================================================================
-- One item can have N barcodes, each with its own type and UOM.
-- Primary barcode is synced to items.barcode via trigger.

CREATE TABLE IF NOT EXISTS item_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  barcode_type TEXT DEFAULT '' CHECK (barcode_type IN (
    'EAN', 'EAN-8', 'EAN-13', 'UPC', 'UPC-A', 'CODE-39', 'CODE-128',
    'GS1', 'GTIN', 'GTIN-14', 'ISBN', 'ISBN-10', 'ISBN-13',
    'ISSN', 'JAN', 'PZN', 'QR', ''
  )),
  unit_id UUID REFERENCES work_units(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CHECK (barcode != '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_barcodes_unique
  ON item_barcodes(organization_id, barcode)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_item_barcodes_barcode
  ON item_barcodes(barcode)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_item_barcodes_item
  ON item_barcodes(item_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_item_barcodes_org
  ON item_barcodes(organization_id)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE item_barcodes IS 'Multiple barcodes per item (ERPNext-style). Primary barcode synced to items.barcode via trigger.';
COMMENT ON COLUMN item_barcodes.barcode_type IS 'Barcode format: EAN, UPC-A, CODE-39, CODE-128, QR, etc.';
COMMENT ON COLUMN item_barcodes.unit_id IS 'UOM associated with this barcode (e.g., 5L bottle has different barcode than 1L)';
COMMENT ON COLUMN item_barcodes.is_primary IS 'If true, this barcode is synced to items.barcode for fast lookups';

-- Trigger: auto-sync primary barcode to items.barcode (denormalized cache)
CREATE OR REPLACE FUNCTION sync_primary_barcode_to_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary AND NEW.is_active AND (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE items SET barcode = NEW.barcode, updated_at = NOW()
    WHERE id = NEW.item_id AND organization_id = NEW.organization_id;
    -- Unset primary on other barcodes for same item
    UPDATE item_barcodes SET is_primary = false, updated_at = NOW()
    WHERE item_id = NEW.item_id AND organization_id = NEW.organization_id
      AND id != NEW.id AND deleted_at IS NULL;
  END IF;
  IF (NOT NEW.is_active OR NEW.deleted_at IS NOT NULL) THEN
    -- If this was the primary, find another barcode to promote
    UPDATE items SET barcode = COALESCE(
      (SELECT barcode FROM item_barcodes
       WHERE item_id = NEW.item_id AND organization_id = NEW.organization_id
         AND is_active = true AND deleted_at IS NULL AND id != NEW.id
       ORDER BY created_at LIMIT 1),
      NULL
    ), updated_at = NOW()
    WHERE id = NEW.item_id AND organization_id = NEW.organization_id
      AND barcode = OLD.barcode;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_primary_barcode
  AFTER INSERT OR UPDATE OR DELETE ON item_barcodes
  FOR EACH ROW EXECUTE FUNCTION sync_primary_barcode_to_item();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_item_barcodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER item_barcodes_updated_at
BEFORE UPDATE ON item_barcodes
FOR EACH ROW EXECUTE FUNCTION update_item_barcodes_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON item_barcodes TO authenticated;

-- =====================================================
-- VARIANT BARCODES (multi-barcode per product variant)
-- Mirrors item_barcodes structure, linked to product_variants
-- =====================================================

CREATE TABLE IF NOT EXISTS variant_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  barcode_type TEXT DEFAULT '' CHECK (barcode_type IN (
    'EAN', 'EAN-8', 'EAN-13', 'UPC', 'UPC-A', 'CODE-39', 'CODE-128',
    'GS1', 'GTIN', 'GTIN-14', 'ISBN', 'ISBN-10', 'ISBN-13',
    'ISSN', 'JAN', 'PZN', 'QR', ''
  )),
  unit_id UUID REFERENCES work_units(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CHECK (barcode != '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_variant_barcodes_unique
  ON variant_barcodes(organization_id, barcode)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_variant_barcodes_barcode
  ON variant_barcodes(barcode)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_variant_barcodes_variant
  ON variant_barcodes(variant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_variant_barcodes_org
  ON variant_barcodes(organization_id)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE variant_barcodes IS 'Multiple barcodes per product variant (e.g., 1L bottle vs 5L bottle each get a unique barcode). Primary barcode synced to product_variants.barcode via trigger.';
COMMENT ON COLUMN variant_barcodes.barcode_type IS 'Barcode format: EAN, UPC-A, CODE-39, CODE-128, QR, etc.';
COMMENT ON COLUMN variant_barcodes.unit_id IS 'UOM associated with this barcode';
COMMENT ON COLUMN variant_barcodes.is_primary IS 'If true, this barcode is synced to product_variants.barcode for fast lookups';

-- Trigger: auto-sync primary barcode to product_variants.barcode (denormalized cache)
CREATE OR REPLACE FUNCTION sync_primary_barcode_to_variant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary AND NEW.is_active AND (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE product_variants SET barcode = NEW.barcode, updated_at = NOW()
    WHERE id = NEW.variant_id AND organization_id = NEW.organization_id;
    UPDATE variant_barcodes SET is_primary = false, updated_at = NOW()
    WHERE variant_id = NEW.variant_id AND organization_id = NEW.organization_id
      AND id != NEW.id AND deleted_at IS NULL;
  END IF;
  IF (NOT NEW.is_active OR NEW.deleted_at IS NOT NULL) THEN
    UPDATE product_variants SET barcode = COALESCE(
      (SELECT barcode FROM variant_barcodes
       WHERE variant_id = NEW.variant_id AND organization_id = NEW.organization_id
         AND is_active = true AND deleted_at IS NULL AND id != NEW.id
       ORDER BY created_at LIMIT 1),
      NULL
    ), updated_at = NOW()
    WHERE id = NEW.variant_id AND organization_id = NEW.organization_id
      AND barcode = OLD.barcode;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_primary_barcode_variant
  AFTER INSERT OR UPDATE OR DELETE ON variant_barcodes
  FOR EACH ROW EXECUTE FUNCTION sync_primary_barcode_to_variant();

CREATE OR REPLACE FUNCTION update_variant_barcodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER variant_barcodes_updated_at
  BEFORE UPDATE ON variant_barcodes
  FOR EACH ROW EXECUTE FUNCTION update_variant_barcodes_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON variant_barcodes TO authenticated;

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
  parcel_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  CHECK (entry_type IN ('Material Receipt', 'Material Issue', 'Stock Transfer', 'Stock Reconciliation')),
  CHECK (status IN ('Draft', 'Submitted', 'Posted', 'Cancelled', 'Reversed'))
);

ALTER TABLE stock_entries ADD COLUMN IF NOT EXISTS parcel_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_entries_parcel_id') THEN
    ALTER TABLE stock_entries
      ADD CONSTRAINT fk_stock_entries_parcel_id
      FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_entries_org ON stock_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_type ON stock_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_stock_entries_status ON stock_entries(status);
CREATE INDEX IF NOT EXISTS idx_stock_entries_date ON stock_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_entries_crop_cycle ON stock_entries(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_org_crop_cycle ON stock_entries(organization_id, crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_parcel ON stock_entries(parcel_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_org_parcel ON stock_entries(organization_id, parcel_id);

COMMENT ON COLUMN stock_entries.crop_cycle_id IS 'Links the stock entry to a specific crop cycle for cost tracking and allocation';
COMMENT ON COLUMN stock_entries.parcel_id IS 'Links the stock entry to a specific parcel for per-parcel cost allocation (fertilizer/pesticide use, harvest reception)';

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
  scanned_barcode TEXT,
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
  parcel_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CHECK (movement_type IN ('IN', 'OUT', 'TRANSFER'))
);

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS parcel_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_stock_movements_parcel_id') THEN
    ALTER TABLE stock_movements
      ADD CONSTRAINT fk_stock_movements_parcel_id
      FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON stock_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_marketplace_listing ON stock_movements(marketplace_listing_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_marketplace_order_item ON stock_movements(marketplace_order_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_crop_cycle ON stock_movements(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_crop_cycle ON stock_movements(organization_id, crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_parcel ON stock_movements(parcel_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_parcel ON stock_movements(organization_id, parcel_id);

COMMENT ON COLUMN stock_movements.crop_cycle_id IS 'Links the stock movement to a specific crop cycle for cost tracking and allocation';
COMMENT ON COLUMN stock_movements.parcel_id IS 'Links the stock movement to a specific parcel for per-parcel cost allocation';

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

-- Auto-propagate parcel_id / crop_cycle_id from parent stock_entry to movement
-- Avoids touching every INSERT site in service layer
CREATE OR REPLACE FUNCTION propagate_stock_entry_context_to_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_entry_id IS NOT NULL AND (NEW.parcel_id IS NULL OR NEW.crop_cycle_id IS NULL) THEN
    SELECT
      COALESCE(NEW.parcel_id, se.parcel_id),
      COALESCE(NEW.crop_cycle_id, se.crop_cycle_id)
    INTO NEW.parcel_id, NEW.crop_cycle_id
    FROM stock_entries se
    WHERE se.id = NEW.stock_entry_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propagate_stock_entry_context ON stock_movements;
CREATE TRIGGER trg_propagate_stock_entry_context
  BEFORE INSERT ON stock_movements
  FOR EACH ROW
  WHEN (NEW.stock_entry_id IS NOT NULL)
  EXECUTE FUNCTION propagate_stock_entry_context_to_movement();

CREATE OR REPLACE FUNCTION sync_variant_quantity_from_movements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET quantity = (
      SELECT COALESCE(SUM(sm.quantity), 0)
      FROM stock_movements sm
      WHERE sm.item_id = NEW.item_id
        AND sm.variant_id = NEW.variant_id
        AND sm.organization_id = NEW.organization_id
    )
    WHERE id = NEW.variant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_variant_quantity ON stock_movements;
CREATE TRIGGER trg_sync_variant_quantity
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  WHEN (NEW.variant_id IS NOT NULL)
  EXECUTE FUNCTION sync_variant_quantity_from_movements();

-- Stock Reservations
CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  reserved_by UUID NOT NULL REFERENCES auth.users(id),
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'released', 'fulfilled', 'expired')),
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_org ON stock_reservations(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_item ON stock_reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_variant ON stock_reservations(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON stock_reservations(expires_at) WHERE status = 'active';

-- Warehouse Stock Levels (denormalized for O(1) balance queries)
CREATE TABLE IF NOT EXISTS warehouse_stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC NOT NULL DEFAULT 0,
  available_quantity NUMERIC GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  last_movement_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_stock_levels_org ON warehouse_stock_levels(organization_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_levels_item ON warehouse_stock_levels(item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_levels_warehouse ON warehouse_stock_levels(warehouse_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_stock_levels_unique
  ON warehouse_stock_levels (organization_id, item_id, warehouse_id)
  WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_stock_levels_unique_var
  ON warehouse_stock_levels (organization_id, item_id, variant_id, warehouse_id)
  WHERE variant_id IS NOT NULL;

CREATE OR REPLACE FUNCTION update_warehouse_stock_levels()
RETURNS TRIGGER AS $$
DECLARE
  v_variant_id UUID;
  v_warehouse_id UUID;
  v_item_id UUID;
  v_org_id UUID;
  v_existing_id UUID;
  v_qty NUMERIC;
BEGIN
  v_variant_id := COALESCE(NEW.variant_id, OLD.variant_id);
  v_warehouse_id := COALESCE(NEW.warehouse_id, OLD.warehouse_id);
  v_item_id := COALESCE(NEW.item_id, OLD.item_id);
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);

  SELECT COALESCE(SUM(quantity), 0) INTO v_qty
  FROM stock_movements
  WHERE organization_id = v_org_id
    AND item_id = v_item_id
    AND warehouse_id = v_warehouse_id
    AND (variant_id = v_variant_id OR (v_variant_id IS NULL AND variant_id IS NULL));

  SELECT id INTO v_existing_id
  FROM warehouse_stock_levels
  WHERE organization_id = v_org_id
    AND item_id = v_item_id
    AND warehouse_id = v_warehouse_id
    AND (variant_id = v_variant_id OR (v_variant_id IS NULL AND variant_id IS NULL))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE warehouse_stock_levels
    SET quantity = v_qty,
        last_movement_at = NOW(),
        updated_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO warehouse_stock_levels (
      organization_id,
      item_id,
      variant_id,
      warehouse_id,
      quantity,
      last_movement_at
    )
    VALUES (v_org_id, v_item_id, v_variant_id, v_warehouse_id, v_qty, NOW());
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_warehouse_stock_levels ON stock_movements;
CREATE TRIGGER trg_update_warehouse_stock_levels
  AFTER INSERT OR DELETE ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_stock_levels();

CREATE OR REPLACE FUNCTION update_warehouse_stock_reserved()
RETURNS TRIGGER AS $$
DECLARE
  v_item_id UUID;
  v_variant_id UUID;
  v_warehouse_id UUID;
  v_org_id UUID;
  v_existing_id UUID;
  v_reserved NUMERIC;
BEGIN
  v_item_id := COALESCE(NEW.item_id, OLD.item_id);
  v_variant_id := COALESCE(NEW.variant_id, OLD.variant_id);
  v_warehouse_id := COALESCE(NEW.warehouse_id, OLD.warehouse_id);
  v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);

  SELECT COALESCE(SUM(quantity), 0) INTO v_reserved
  FROM stock_reservations
  WHERE organization_id = v_org_id
    AND item_id = v_item_id
    AND warehouse_id = v_warehouse_id
    AND status = 'active'
    AND expires_at > NOW()
    AND (variant_id = v_variant_id OR (v_variant_id IS NULL AND variant_id IS NULL));

  SELECT id INTO v_existing_id
  FROM warehouse_stock_levels
  WHERE organization_id = v_org_id
    AND item_id = v_item_id
    AND warehouse_id = v_warehouse_id
    AND (variant_id = v_variant_id OR (v_variant_id IS NULL AND variant_id IS NULL))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE warehouse_stock_levels
    SET reserved_quantity = v_reserved,
        updated_at = NOW()
    WHERE id = v_existing_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_warehouse_stock_reserved ON stock_reservations;
CREATE TRIGGER trg_update_warehouse_stock_reserved
  AFTER INSERT OR UPDATE OF status OR DELETE ON stock_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_stock_reserved();


-- Stock Entry Approvals
CREATE TABLE IF NOT EXISTS stock_entry_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_entry_id UUID NOT NULL REFERENCES stock_entries(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_entry_approvals_entry ON stock_entry_approvals(stock_entry_id);
CREATE INDEX IF NOT EXISTS idx_stock_entry_approvals_status ON stock_entry_approvals(status) WHERE status = 'pending';

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
  percentile_10 NUMERIC,
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
  CONSTRAINT satellite_indices_data_index_name_check CHECK (index_name IN (
    'NDVI', 'NDRE', 'NDMI', 'MNDWI', 'GCI', 'SAVI', 'OSAVI', 'MSAVI2',
    'NIRv', 'EVI', 'MSI', 'MCARI', 'TCARI', 'TCARI_OSAVI', 'EBI'
  ))
);

-- Fixup for DBs created before EBI / TCARI_OSAVI were added (CREATE TABLE
-- IF NOT EXISTS does not update existing tables). Drops any pre-existing
-- CHECK constraint on index_name (whatever its auto-generated name) and
-- recreates the widened version with a stable name.
DO $satidx_check$
DECLARE
  v_conname text;
BEGIN
  FOR v_conname IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.satellite_indices_data'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%index_name%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.satellite_indices_data DROP CONSTRAINT %I',
      v_conname
    );
  END LOOP;

  ALTER TABLE public.satellite_indices_data
    ADD CONSTRAINT satellite_indices_data_index_name_check
    CHECK (index_name IN (
      'NDVI', 'NDRE', 'NDMI', 'MNDWI', 'GCI', 'SAVI', 'OSAVI', 'MSAVI2',
      'NIRv', 'EVI', 'MSI', 'MCARI', 'TCARI', 'TCARI_OSAVI', 'EBI'
    ));
END
$satidx_check$;

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

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_stock_levels AS
SELECT
  sm.organization_id,
  sm.item_id,
  sm.warehouse_id,
  sm.variant_id,
  COALESCE(SUM(sm.quantity), 0) AS balance_quantity,
  COALESCE(SUM(sm.quantity * sm.cost_per_unit), 0) AS balance_value,
  MAX(sm.movement_date) AS last_movement_date,
  COUNT(sm.id) AS movement_count
FROM stock_movements sm
GROUP BY sm.organization_id, sm.item_id, sm.warehouse_id, sm.variant_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_stock_levels_pk ON mv_stock_levels(organization_id, item_id, warehouse_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_mv_stock_levels_org ON mv_stock_levels(organization_id);
CREATE INDEX IF NOT EXISTS idx_mv_stock_levels_item ON mv_stock_levels(item_id);

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
  -- Stable global code (e.g. 'olivier', 'amandier'). Nullable for org-specific custom crops.
  -- Used as FK target by crop_ai_references.crop_type — single source of truth across registries.
  ALTER TABLE crop_types ADD COLUMN IF NOT EXISTS code TEXT;
END $$;

-- Global UNIQUE on code (multiple NULLs allowed for org-specific rows without a code).
DO $$ BEGIN
  ALTER TABLE crop_types ADD CONSTRAINT crop_types_code_unique UNIQUE (code);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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

-- Equipment & Fleet Management
CREATE TABLE IF NOT EXISTS equipment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  license_plate TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(12,2),
  current_value NUMERIC(12,2),
  hour_meter_reading NUMERIC,
  hour_meter_date DATE,
  fuel_type TEXT,
  status TEXT DEFAULT 'available',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  insurance_expiry DATE,
  registration_expiry DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (category IN ('tractor', 'harvester', 'sprayer', 'utility_vehicle', 'pump', 'small_tool', 'other')),
  CHECK (fuel_type IS NULL OR fuel_type IN ('diesel', 'petrol', 'electric', 'other')),
  CHECK (status IN ('available', 'in_use', 'maintenance', 'out_of_service'))
);

CREATE INDEX IF NOT EXISTS idx_equipment_assets_org ON equipment_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assets_farm ON equipment_assets(farm_id);
CREATE INDEX IF NOT EXISTS idx_equipment_assets_category ON equipment_assets(category);
CREATE INDEX IF NOT EXISTS idx_equipment_assets_status ON equipment_assets(status);

CREATE TRIGGER update_equipment_assets_updated_at
  BEFORE UPDATE ON equipment_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  cost NUMERIC(12,2),
  maintenance_date DATE NOT NULL,
  hour_meter_reading NUMERIC,
  next_service_date DATE,
  next_service_hours NUMERIC,
  vendor TEXT,
  vendor_invoice_number TEXT,
  cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  performed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (type IN ('oil_change', 'repair', 'inspection', 'tire_replacement', 'battery', 'filter', 'fuel_fill', 'registration', 'insurance', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_org ON equipment_maintenance(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_date ON equipment_maintenance(maintenance_date);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_type ON equipment_maintenance(type);

CREATE TRIGGER update_equipment_maintenance_updated_at
  BEFORE UPDATE ON equipment_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE equipment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;

-- Photos for structures, equipment, workers (additive, idempotent)
ALTER TABLE structures       ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE equipment_assets ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE workers          ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Public storage bucket for infrastructure & equipment photos
DO $$
BEGIN
  EXECUTE $q$ INSERT INTO storage.buckets (id, name, "public") VALUES ('entity-photos', 'entity-photos', true) ON CONFLICT (id) DO UPDATE SET "public" = true $q$;
  EXECUTE $q$ DROP POLICY IF EXISTS "Public read entity-photos" ON storage.objects $q$;
  EXECUTE $q$ CREATE POLICY "Public read entity-photos" ON storage.objects FOR SELECT USING (bucket_id = 'entity-photos') $q$;
  EXECUTE $q$ DROP POLICY IF EXISTS "Authenticated upload entity-photos" ON storage.objects $q$;
  EXECUTE $q$ CREATE POLICY "Authenticated upload entity-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'entity-photos' AND auth.role() = 'authenticated') $q$;
  EXECUTE $q$ DROP POLICY IF EXISTS "Authenticated update entity-photos" ON storage.objects $q$;
  EXECUTE $q$ CREATE POLICY "Authenticated update entity-photos" ON storage.objects FOR UPDATE USING (bucket_id = 'entity-photos' AND auth.role() = 'authenticated') WITH CHECK (bucket_id = 'entity-photos' AND auth.role() = 'authenticated') $q$;
  EXECUTE $q$ DROP POLICY IF EXISTS "Authenticated delete entity-photos" ON storage.objects $q$;
  EXECUTE $q$ CREATE POLICY "Authenticated delete entity-photos" ON storage.objects FOR DELETE USING (bucket_id = 'entity-photos' AND auth.role() = 'authenticated') $q$;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'entity-photos bucket setup skipped: %', SQLERRM;
END$$;

-- Demo data tags: marks rows seeded by demo-data service so the selective
-- "clear demo only" cleanup can delete them without touching client data.
-- Internal table — admin client only (no RLS policies).
CREATE TABLE IF NOT EXISTS demo_data_tags (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  row_id UUID NOT NULL,
  seeded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, table_name, row_id)
);

CREATE INDEX IF NOT EXISTS idx_demo_data_tags_org_table
  ON demo_data_tags(organization_id, table_name);

ALTER TABLE demo_data_tags ENABLE ROW LEVEL SECURITY;

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
  updated_at TIMESTAMPTZ DEFAULT NOW()
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

ALTER TABLE variant_barcodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_variant_barcodes" ON variant_barcodes;
CREATE POLICY "org_read_variant_barcodes" ON variant_barcodes
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_variant_barcodes" ON variant_barcodes;
CREATE POLICY "org_write_variant_barcodes" ON variant_barcodes
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_variant_barcodes" ON variant_barcodes;
CREATE POLICY "org_update_variant_barcodes" ON variant_barcodes
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_variant_barcodes" ON variant_barcodes;
CREATE POLICY "org_delete_variant_barcodes" ON variant_barcodes
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

-- Item Barcodes Policies
ALTER TABLE item_barcodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_item_barcodes" ON item_barcodes;
CREATE POLICY "org_read_item_barcodes" ON item_barcodes
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_item_barcodes" ON item_barcodes;
CREATE POLICY "org_write_item_barcodes" ON item_barcodes
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_item_barcodes" ON item_barcodes;
CREATE POLICY "org_update_item_barcodes" ON item_barcodes
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_item_barcodes" ON item_barcodes;
CREATE POLICY "org_delete_item_barcodes" ON item_barcodes
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
ALTER TABLE IF EXISTS task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS metayage_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS piece_work_records ENABLE ROW LEVEL SECURITY;
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

-- Single-default-template invariant is enforced in the application layer
-- (DocumentTemplatesService.clearDefaultForType).
DROP TRIGGER IF EXISTS trg_ensure_single_default_template ON document_templates;
DROP FUNCTION IF EXISTS ensure_single_default_template();

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

-- user_profiles row creation is now handled by AuthService.signup ->
-- UsersService.createProfile. The auth.users trigger is no longer needed.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();



-- =====================================================
-- 27. BACKFILL ORGANIZATION_ID FOR EXISTING DATA
-- =====================================================
-- These UPDATE statements populate organization_id for records
-- that existed before the multi-tenant columns were added

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
  chill_hours NUMERIC,  -- daily chill-hour contribution (generic, not crop-specific)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (latitude, longitude, date)
);
CREATE INDEX IF NOT EXISTS idx_weather_daily_data_lat_lon_date
  ON public.weather_daily_data(latitude, longitude, date);
CREATE INDEX IF NOT EXISTS idx_weather_daily_data_date ON weather_daily_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_weather_daily_data_location ON weather_daily_data(latitude, longitude);

-- Generic per-crop daily GDD cache — replaces the per-column approach (gdd_olivier, gdd_agrumes, …)
-- in weather_daily_data. Scaling to new crops requires no schema change: add a row with a new crop_type.
-- No RLS — shared location cache like weather_daily_data (not org-scoped).
CREATE TABLE IF NOT EXISTS public.weather_gdd_daily (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude      NUMERIC(7,2) NOT NULL,
  longitude     NUMERIC(7,2) NOT NULL,
  date          DATE NOT NULL,
  crop_type     TEXT NOT NULL,          -- e.g. 'olivier', 'agrumes', 'avocatier', 'palmier_dattier'
  gdd_daily     NUMERIC(7,4) NOT NULL DEFAULT 0,
  chill_hours   NUMERIC(6,4),           -- daily chill-hour contribution (relevant for chill-tracking crops)
  model_version TEXT NOT NULL DEFAULT 'v1',  -- bump when formula changes to allow targeted cache invalidation
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (latitude, longitude, date, crop_type)
);
CREATE INDEX IF NOT EXISTS idx_weather_gdd_daily_location_crop
  ON public.weather_gdd_daily(latitude, longitude, crop_type, date);
CREATE INDEX IF NOT EXISTS idx_weather_gdd_daily_date
  ON public.weather_gdd_daily(date DESC);

-- sum_gdd_between has been replaced by an inline supabase select+sum
-- in CalibrationDataService — see usage of weather_gdd_daily there.
DROP FUNCTION IF EXISTS sum_gdd_between(numeric, numeric, text, date, date);

-- Weather hourly data: location-based hourly temperature cache (NOT org-scoped, shared geographically).
-- Used as the source of truth for chill_hours and other phenological hour-counters.
-- Quantization matches weather_daily_data convention (NUMERIC(7,2) ~ 1km grid).
CREATE TABLE IF NOT EXISTS public.weather_hourly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude NUMERIC(7, 2) NOT NULL,
  longitude NUMERIC(7, 2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,             -- 1h-resolution UTC datetime
  temperature_2m NUMERIC(5, 2),                 -- °C
  source TEXT NOT NULL DEFAULT 'open-meteo-archive',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (latitude, longitude, recorded_at, source)
);
CREATE INDEX IF NOT EXISTS idx_whd_geo_time
  ON public.weather_hourly_data (latitude, longitude, recorded_at);
CREATE INDEX IF NOT EXISTS idx_whd_recorded_at
  ON public.weather_hourly_data (recorded_at DESC);

-- Weather threshold cache: precomputed hour-counters per (location, year, crop, stage, threshold).
-- Hot-path layer on top of weather_hourly_data — avoids repeated counting of the same series.
-- Cache invalidation: app-level — purge rows when underlying weather_hourly_data is updated.
CREATE TABLE IF NOT EXISTS public.weather_threshold_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude NUMERIC(7, 2) NOT NULL,
  longitude NUMERIC(7, 2) NOT NULL,
  year INTEGER NOT NULL,
  crop_type TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  threshold_key TEXT NOT NULL,
  count INTEGER NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (latitude, longitude, year, crop_type, stage_key, threshold_key)
);
CREATE INDEX IF NOT EXISTS idx_wtc_lookup
  ON public.weather_threshold_cache (latitude, longitude, year, crop_type);

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

-- NOTE: per-crop GDD columns (gdd_olivier, gdd_agrumes, …) have been removed from weather_daily_data.
-- All GDD is now stored in weather_gdd_daily (generic, crop_type row per day).
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

  -- Backfill global code for AgromindIA-supported cultures (FR codes used by crop_ai_references).
  -- Idempotent: only sets code where it's still NULL.
  UPDATE crop_types SET code = 'olivier'
    WHERE name = 'olive' AND organization_id IS NULL AND code IS NULL;
  UPDATE crop_types SET code = 'avocatier'
    WHERE name = 'avocado' AND organization_id IS NULL AND code IS NULL;
  UPDATE crop_types SET code = 'agrumes'
    WHERE name = 'citrus' AND organization_id IS NULL AND code IS NULL;
  UPDATE crop_types SET code = 'amandier'
    WHERE name = 'almond' AND organization_id IS NULL AND code IS NULL;
  UPDATE crop_types SET code = 'palmier_dattier'
    WHERE name = 'date_palm' AND organization_id IS NULL AND code IS NULL;
END $$;






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

  -- User-confirmed target yield (farmer override of LLM-computed rendement_cible)
  target_yield_t_ha DECIMAL(6,2),
  target_yield_source TEXT CHECK (target_yield_source IN ('suggested', 'user_override')),
  target_yield_confirmed_at TIMESTAMPTZ,
  target_yield_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

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

-- Idempotent add for existing installations
ALTER TABLE public.calibrations
  ADD COLUMN IF NOT EXISTS target_yield_t_ha DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS target_yield_source TEXT,
  ADD COLUMN IF NOT EXISTS target_yield_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS target_yield_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'calibrations' AND constraint_name = 'calibrations_target_yield_source_check'
  ) THEN
    ALTER TABLE public.calibrations ADD CONSTRAINT calibrations_target_yield_source_check
      CHECK (target_yield_source IS NULL OR target_yield_source IN ('suggested', 'user_override'));
  END IF;
END $$;

COMMENT ON COLUMN calibrations.target_yield_t_ha IS 'Farmer-confirmed target yield (t/ha). Overrides LLM-computed rendement_cible when set; NULL means LLM falls back to its ÉTAPE 2 computation.';
COMMENT ON COLUMN calibrations.target_yield_source IS 'suggested = farmer accepted deterministic suggestion; user_override = farmer entered a custom value';

CREATE INDEX IF NOT EXISTS idx_calibrations_parcel_id ON public.calibrations(parcel_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_organization_id ON public.calibrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_status ON public.calibrations(status);

-- Progress tracking: persisted so reload shows current step + % without
-- relying on the ephemeral socket stream. Also enables the stale guard
-- that marks zombie runs failed if no update for >5 minutes.
ALTER TABLE public.calibrations ADD COLUMN IF NOT EXISTS progress_step INTEGER;
ALTER TABLE public.calibrations ADD COLUMN IF NOT EXISTS progress_total_steps INTEGER;
ALTER TABLE public.calibrations ADD COLUMN IF NOT EXISTS progress_step_key TEXT;
ALTER TABLE public.calibrations ADD COLUMN IF NOT EXISTS progress_message TEXT;
ALTER TABLE public.calibrations ADD COLUMN IF NOT EXISTS progress_percent INTEGER CHECK (progress_percent IS NULL OR (progress_percent BETWEEN 0 AND 100));
ALTER TABLE public.calibrations ADD COLUMN IF NOT EXISTS progress_updated_at TIMESTAMPTZ;

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
  plan_data JSONB,                   -- raw reference payload + AI aggregate enrichment

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
COMMENT ON COLUMN annual_plans.plan_data IS 'Raw reference payload (plan_data.source) + AI-aggregate enrichment overlayed by enrichPlanFromAI';

-- Idempotent ALTERs so pre-existing databases pick up new column without a reset.
-- Required: annual-plan.service writes plan_data on create and again after AI
-- enrichment; without this column PostgREST returns PGRST204 / schema cache error.
ALTER TABLE public.annual_plans ADD COLUMN IF NOT EXISTS plan_data JSONB;

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
-- crop_type is the FR code (e.g. 'olivier', 'amandier'). Validation chain:
--   1. FK to crop_types.code (this file, below) — DB-level referential integrity
--   2. agritech-api/src/libs/agromind-ia/types.ts → Culture union — compile-time
--   3. crop-reference-loader.ts → metadata.culture === filename — runtime load
--   4. Trigger validate_crop_ai_reference (this file, below) — JSONB shape on write
-- New crops require: a row in crop_types with the matching code (no DDL).
CREATE TABLE IF NOT EXISTS public.crop_ai_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  reference_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Drop legacy CHECK constraint on existing DBs (idempotent for fresh DBs).
ALTER TABLE public.crop_ai_references
  DROP CONSTRAINT IF EXISTS crop_ai_references_crop_type_check;

-- FK to crop_types.code. NOT VALID first to avoid blocking deploy if existing
-- prod data is inconsistent; VALIDATE runs the check.
DO $$ BEGIN
  ALTER TABLE public.crop_ai_references
    ADD CONSTRAINT fk_crop_ai_references_crop_type
    FOREIGN KEY (crop_type) REFERENCES public.crop_types(code) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.crop_ai_references
    VALIDATE CONSTRAINT fk_crop_ai_references_crop_type;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'FK fk_crop_ai_references_crop_type left NOT VALID: %. Reconcile crop_types.code then run: ALTER TABLE public.crop_ai_references VALIDATE CONSTRAINT fk_crop_ai_references_crop_type;', SQLERRM;
END $$;

-- crop_ai_references shape validation is enforced in the application layer
-- (admin/ReferentialService.assertValidCropAiReference).
DROP TRIGGER IF EXISTS trg_validate_crop_ai_reference ON public.crop_ai_references;
DROP FUNCTION IF EXISTS public.validate_crop_ai_reference();

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

-- Seed permissions: one row per (resource × action). Resources mirror the
-- RESOURCE_SUBJECT_MAP keys in agritech-api/src/modules/casl/casl-ability.factory.ts
-- so every CASL Subject is reachable from a custom role.
DO $perms$
DECLARE
-- BEGIN GENERATED PERMISSION RESOURCES (do not edit by hand)
  -- 98 resources × 5 actions = 490 permission rows
  v_resources TEXT[] := ARRAY[
    'users','organizations','roles','subscriptions',
    'farms','parcels','warehouses','infrastructure',
    'structures','trees','farm_hierarchy','invoices',
    'payments','journal_entries','accounts','customers',
    'suppliers','financial_reports','cost_centers','taxes',
    'bank_accounts','periods','accounting_reports','account_mappings',
    'workers','employees','day_laborers','tasks',
    'piece_works','work_units','harvests','crop_cycles',
    'campaigns','fiscal_years','product_applications','analyses',
    'soil_analyses','plant_analyses','water_analyses','products',
    'stock','stock_entries','stock_items','biological_assets',
    'sales_orders','purchase_orders','quotes','deliveries',
    'reception_batches','quality_controls','lab_services','certifications',
    'compliance_checks','reports','satellite_analyses','satellite_reports',
    'production_intelligence','dashboard','analytics','sensors',
    'costs','revenues','inventory','utilities',
    'equipment','agronomy_sources','chat','settings',
    'api','hr_compliance','leave_types','leave_allocations',
    'leave_applications','holidays','salary_structures','salary_slips',
    'payroll_runs','worker_documents','shifts','shift_assignments',
    'shift_requests','onboarding','separations','expense_claims',
    'expense_categories','job_openings','job_applicants','interviews',
    'appraisal_cycles','appraisals','performance_feedback','seasonal_campaigns',
    'worker_qualifications','safety_incidents','worker_transport','grievances',
    'training_programs','training_enrollments'
  ];
-- END GENERATED PERMISSION RESOURCES
  v_actions TEXT[] := ARRAY['read','create','update','delete','manage'];
  v_action_labels JSONB := '{"read":"View","create":"Create","update":"Update","delete":"Delete","manage":"Manage"}'::jsonb;
  v_resource TEXT;
  v_action TEXT;
  v_display_resource TEXT;
BEGIN
  FOREACH v_resource IN ARRAY v_resources LOOP
    -- "stock_entries" → "Stock Entries"
    v_display_resource := initcap(replace(v_resource, '_', ' '));

    FOREACH v_action IN ARRAY v_actions LOOP
      INSERT INTO permissions (name, display_name, resource, action, description)
      VALUES (
        v_resource || '.' || v_action,
        (v_action_labels->>v_action) || ' ' || v_display_resource,
        v_resource,
        v_action,
        (v_action_labels->>v_action) || ' access for ' || v_display_resource
      )
      ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action,
        description = EXCLUDED.description;
    END LOOP;
  END LOOP;
END
$perms$;

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

-- Task Watchers policies (any org member can watch/unwatch, must be themselves)
DROP POLICY IF EXISTS "org_read_task_watchers" ON task_watchers;
CREATE POLICY "org_read_task_watchers" ON task_watchers
  FOR SELECT USING (is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_task_watchers" ON task_watchers;
CREATE POLICY "org_write_task_watchers" ON task_watchers
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_task_watchers" ON task_watchers;
CREATE POLICY "org_delete_task_watchers" ON task_watchers
  FOR DELETE USING (
    user_id = auth.uid() AND is_organization_member(organization_id)
  );

-- Task Mentions policies (readable by org members; inserted by the comment author)
DROP POLICY IF EXISTS "org_read_task_mentions" ON task_mentions;
CREATE POLICY "org_read_task_mentions" ON task_mentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_mentions.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_write_task_mentions" ON task_mentions;
CREATE POLICY "org_write_task_mentions" ON task_mentions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_mentions.task_id
        AND is_organization_member(tasks.organization_id)
    )
  );

DROP POLICY IF EXISTS "org_delete_task_mentions" ON task_mentions;
CREATE POLICY "org_delete_task_mentions" ON task_mentions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_mentions.task_id
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

DROP POLICY IF EXISTS "org_read_piece_work_records" ON piece_work_records;
CREATE POLICY "org_read_piece_work_records" ON piece_work_records
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_piece_work_records" ON piece_work_records;
CREATE POLICY "org_write_piece_work_records" ON piece_work_records
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_piece_work_records" ON piece_work_records;
CREATE POLICY "org_update_piece_work_records" ON piece_work_records
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_piece_work_records" ON piece_work_records;
CREATE POLICY "org_delete_piece_work_records" ON piece_work_records
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

-- Stock Reservations Policies
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_stock_reservations" ON stock_reservations;
CREATE POLICY "org_read_stock_reservations" ON stock_reservations
  FOR SELECT USING (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_write_stock_reservations" ON stock_reservations;
CREATE POLICY "org_write_stock_reservations" ON stock_reservations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_update_stock_reservations" ON stock_reservations;
CREATE POLICY "org_update_stock_reservations" ON stock_reservations
  FOR UPDATE USING (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_delete_stock_reservations" ON stock_reservations;
CREATE POLICY "org_delete_stock_reservations" ON stock_reservations
  FOR DELETE USING (is_organization_member(organization_id));

-- Stock Entry Approvals Policies
ALTER TABLE stock_entry_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_stock_entry_approvals" ON stock_entry_approvals;
CREATE POLICY "org_read_stock_entry_approvals" ON stock_entry_approvals
  FOR SELECT USING (
    stock_entry_id IN (
      SELECT id FROM stock_entries WHERE is_organization_member(organization_id)
    )
  );
DROP POLICY IF EXISTS "org_write_stock_entry_approvals" ON stock_entry_approvals;
CREATE POLICY "org_write_stock_entry_approvals" ON stock_entry_approvals
  FOR INSERT WITH CHECK (
    stock_entry_id IN (
      SELECT id FROM stock_entries WHERE is_organization_member(organization_id)
    )
  );
DROP POLICY IF EXISTS "org_update_stock_entry_approvals" ON stock_entry_approvals;
CREATE POLICY "org_update_stock_entry_approvals" ON stock_entry_approvals
  FOR UPDATE USING (
    stock_entry_id IN (
      SELECT id FROM stock_entries WHERE is_organization_member(organization_id)
    )
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

-- Equipment Assets Policies
DROP POLICY IF EXISTS "org_read_equipment_assets" ON equipment_assets;
CREATE POLICY "org_read_equipment_assets" ON equipment_assets FOR SELECT USING (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_write_equipment_assets" ON equipment_assets;
CREATE POLICY "org_write_equipment_assets" ON equipment_assets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_update_equipment_assets" ON equipment_assets;
CREATE POLICY "org_update_equipment_assets" ON equipment_assets FOR UPDATE USING (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_delete_equipment_assets" ON equipment_assets;
CREATE POLICY "org_delete_equipment_assets" ON equipment_assets FOR DELETE USING (is_organization_member(organization_id));

-- Equipment Maintenance Policies
DROP POLICY IF EXISTS "org_read_equipment_maintenance" ON equipment_maintenance;
CREATE POLICY "org_read_equipment_maintenance" ON equipment_maintenance FOR SELECT USING (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_write_equipment_maintenance" ON equipment_maintenance;
CREATE POLICY "org_write_equipment_maintenance" ON equipment_maintenance FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_update_equipment_maintenance" ON equipment_maintenance;
CREATE POLICY "org_update_equipment_maintenance" ON equipment_maintenance FOR UPDATE USING (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_delete_equipment_maintenance" ON equipment_maintenance;
CREATE POLICY "org_delete_equipment_maintenance" ON equipment_maintenance FOR DELETE USING (is_organization_member(organization_id));

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

-- ============================================================================
-- INTERNAL ADMIN TABLE & FUNCTION
-- (declared early so role/permission RLS policies below can reference is_internal_admin())
-- ============================================================================

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

ALTER TABLE internal_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_internal_admins" ON internal_admins;
CREATE POLICY "service_manage_internal_admins" ON internal_admins
  FOR ALL USING (
    current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "users_read_own_internal_admin" ON internal_admins;
CREATE POLICY "users_read_own_internal_admin" ON internal_admins
  FOR SELECT USING (user_id = auth.uid());

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

-- Roles Policies (no organization_id - allow all authenticated users to read)
DROP POLICY IF EXISTS "org_read_roles" ON roles;
CREATE POLICY "org_read_roles" ON roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_roles" ON roles;
CREATE POLICY "org_write_roles" ON roles
  FOR INSERT WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

DROP POLICY IF EXISTS "org_update_roles" ON roles;
CREATE POLICY "org_update_roles" ON roles
  FOR UPDATE USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

DROP POLICY IF EXISTS "org_delete_roles" ON roles;
CREATE POLICY "org_delete_roles" ON roles
  FOR DELETE USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

-- Permissions Policies (no organization_id - allow all authenticated users to read)
DROP POLICY IF EXISTS "org_read_permissions" ON permissions;
CREATE POLICY "org_read_permissions" ON permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_permissions" ON permissions;
CREATE POLICY "org_write_permissions" ON permissions
  FOR INSERT WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

DROP POLICY IF EXISTS "org_update_permissions" ON permissions;
CREATE POLICY "org_update_permissions" ON permissions
  FOR UPDATE USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

DROP POLICY IF EXISTS "org_delete_permissions" ON permissions;
CREATE POLICY "org_delete_permissions" ON permissions
  FOR DELETE USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

-- Role Permissions Policies (check through roles relationship)
DROP POLICY IF EXISTS "org_read_role_permissions" ON role_permissions;
CREATE POLICY "org_read_role_permissions" ON role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "org_write_role_permissions" ON role_permissions;
CREATE POLICY "org_write_role_permissions" ON role_permissions
  FOR INSERT WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

DROP POLICY IF EXISTS "org_update_role_permissions" ON role_permissions;
CREATE POLICY "org_update_role_permissions" ON role_permissions
  FOR UPDATE USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

DROP POLICY IF EXISTS "org_delete_role_permissions" ON role_permissions;
CREATE POLICY "org_delete_role_permissions" ON role_permissions
  FOR DELETE USING (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

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
-- ADMIN APP: INTERNAL ADMIN REFERENCE DATA RLS POLICIES
-- ============================================================================
-- (internal_admins table + is_internal_admin() function are declared earlier,
--  alongside the roles/permissions RLS that depends on them.)

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

-- Guarded: skip entire storage setup if storage schema is absent (non-Supabase Postgres)
DO $storage_setup$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Skipping storage setup — storage schema not found';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'public'
  ) THEN
    EXECUTE 'ALTER TABLE storage.buckets ADD COLUMN "public" boolean DEFAULT false';
  END IF;

  EXECUTE $q$ INSERT INTO storage.buckets (id, name, "public") VALUES ('products', 'products', true) ON CONFLICT (id) DO UPDATE SET "public" = true $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Public read access for products" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated upload for products" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects';

  EXECUTE $q$ CREATE POLICY "Public read access for products" ON storage.objects FOR SELECT USING (bucket_id = 'products') $q$;
  EXECUTE $q$ CREATE POLICY "Authenticated upload for products" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated') $q$;
  EXECUTE $q$ CREATE POLICY "Users can update own product images" ON storage.objects FOR UPDATE USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]) $q$;
  EXECUTE $q$ CREATE POLICY "Users can delete own product images" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]) $q$;

  EXECUTE $q$ INSERT INTO storage.buckets (id, name, "public") VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET "public" = true $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated upload for avatars" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects';

  EXECUTE $q$ CREATE POLICY "Public read access for avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars') $q$;
  EXECUTE $q$ CREATE POLICY "Authenticated upload for avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]) $q$;
  EXECUTE $q$ CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]) $q$;
  EXECUTE $q$ CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]) $q$;

  EXECUTE 'GRANT ALL ON storage.objects TO authenticated';
  EXECUTE 'GRANT SELECT ON storage.objects TO anon';
END
$storage_setup$;

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

-- Single-current-fiscal-year invariant is enforced in the application layer
-- (FiscalYearsService.clearCurrentForOrg).
DROP TRIGGER IF EXISTS trg_ensure_single_current_fiscal_year ON fiscal_years;
DROP FUNCTION IF EXISTS ensure_single_current_fiscal_year();

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
-- Idempotent column add for clusters that pre-date payment_amount
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_amount NUMERIC;

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

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_warehouse_stock_levels_qty_non_negative'
  ) THEN
    ALTER TABLE warehouse_stock_levels ADD CONSTRAINT chk_warehouse_stock_levels_qty_non_negative
      CHECK (quantity >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_warehouse_stock_levels_reserved_non_negative'
  ) THEN
    ALTER TABLE warehouse_stock_levels ADD CONSTRAINT chk_warehouse_stock_levels_reserved_non_negative
      CHECK (reserved_quantity >= 0);
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

-- Guarded: skip if storage schema absent
DO $storage_products$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Skipping products bucket setup — storage schema not found';
    RETURN;
  END IF;

  EXECUTE $q$ INSERT INTO storage.buckets (id, name, "public") VALUES ('products', 'products', false) ON CONFLICT (id) DO UPDATE SET "public" = false $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Public read access for products" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Authenticated upload for products" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "allow_public_view_products" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "allow_public_view_products" ON storage.objects FOR SELECT USING (bucket_id = 'products') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "allow_auth_upload_products" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "allow_auth_upload_products" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "allow_owner_update_products" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "allow_owner_update_products" ON storage.objects FOR UPDATE USING (bucket_id = 'products' AND (auth.uid()::text = (storage.foldername(name))[1] OR EXISTS (SELECT 1 FROM organization_users ou JOIN roles r ON ou.role_id = r.id WHERE ou.user_id = auth.uid() AND ou.is_active = true AND r.name IN ('system_admin')))) $q$;

  EXECUTE 'DROP POLICY IF EXISTS "allow_owner_delete_products" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "allow_owner_delete_products" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND (auth.uid()::text = (storage.foldername(name))[1] OR EXISTS (SELECT 1 FROM organization_users ou JOIN roles r ON ou.role_id = r.id WHERE ou.user_id = auth.uid() AND ou.is_active = true AND r.name IN ('system_admin')))) $q$;
END
$storage_products$;

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

-- Geometry columns (farms.location_point, parcels.boundary_geom, parcels.centroid)
-- are now populated in the application layer:
--   FarmsService.syncFarmLocationPoint
--   ParcelsService.syncParcelBoundaryGeom
DROP TRIGGER IF EXISTS trg_sync_farm_geometry ON farms;
DROP FUNCTION IF EXISTS sync_farm_geometry();

DROP TRIGGER IF EXISTS trg_sync_parcel_geometry ON parcels;
DROP FUNCTION IF EXISTS sync_parcel_geometry();

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

-- RLS for equipment_assets
DROP POLICY IF EXISTS "org_read_equipment_assets" ON equipment_assets;
CREATE POLICY "org_read_equipment_assets" ON equipment_assets FOR SELECT USING (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_write_equipment_assets" ON equipment_assets;
CREATE POLICY "org_write_equipment_assets" ON equipment_assets FOR INSERT WITH CHECK (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_update_equipment_assets" ON equipment_assets;
CREATE POLICY "org_update_equipment_assets" ON equipment_assets FOR UPDATE USING (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_delete_equipment_assets" ON equipment_assets;
CREATE POLICY "org_delete_equipment_assets" ON equipment_assets FOR DELETE USING (is_organization_member(organization_id));

-- RLS for equipment_maintenance
DROP POLICY IF EXISTS "org_read_equipment_maintenance" ON equipment_maintenance;
CREATE POLICY "org_read_equipment_maintenance" ON equipment_maintenance FOR SELECT USING (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_write_equipment_maintenance" ON equipment_maintenance;
CREATE POLICY "org_write_equipment_maintenance" ON equipment_maintenance FOR INSERT WITH CHECK (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_update_equipment_maintenance" ON equipment_maintenance;
CREATE POLICY "org_update_equipment_maintenance" ON equipment_maintenance FOR UPDATE USING (is_organization_member(organization_id));
DROP POLICY IF EXISTS "org_delete_equipment_maintenance" ON equipment_maintenance;
CREATE POLICY "org_delete_equipment_maintenance" ON equipment_maintenance FOR DELETE USING (is_organization_member(organization_id));

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

DROP TRIGGER IF EXISTS set_piece_work_records_updated_at ON piece_work_records;
CREATE TRIGGER set_piece_work_records_updated_at
  BEFORE UPDATE ON piece_work_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

DO $storage_compliance$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Skipping compliance bucket setup — storage schema not found';
    RETURN;
  END IF;

  EXECUTE $q$ INSERT INTO storage.buckets (id, name, "public") VALUES ('compliance-documents', 'compliance-documents', false) ON CONFLICT (id) DO UPDATE SET "public" = false $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Org members can read compliance documents" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Org members can read compliance documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'compliance-documents' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM organization_users WHERE user_id = auth.uid())) $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Org members can upload compliance documents" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Org members can upload compliance documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'compliance-documents' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM organization_users WHERE user_id = auth.uid())) $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Org members can update compliance documents" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Org members can update compliance documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'compliance-documents' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM organization_users WHERE user_id = auth.uid())) WITH CHECK (bucket_id = 'compliance-documents' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM organization_users WHERE user_id = auth.uid())) $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Org admins can delete compliance documents" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Org admins can delete compliance documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'compliance-documents' AND (storage.foldername(name))[1] IN (SELECT ou.organization_id::text FROM organization_users ou JOIN roles r ON r.id = ou.role_id WHERE ou.user_id = auth.uid() AND r.name IN ('organization_admin', 'farm_manager', 'system_admin'))) $q$;
END
$storage_compliance$;

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

DO $storage_files_invoices$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Skipping files/invoices bucket setup — storage schema not found';
    RETURN;
  END IF;

  EXECUTE $q$ INSERT INTO storage.buckets (id, name, "public") VALUES ('files', 'files', false) ON CONFLICT (id) DO NOTHING $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated read access for files" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated read access for files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'files') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated upload for files" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated upload for files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'files') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated update for files" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated update for files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'files') WITH CHECK (bucket_id = 'files') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated delete for files" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated delete for files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'files') $q$;

  EXECUTE $q$ INSERT INTO storage.buckets (id, name, "public") VALUES ('invoices', 'invoices', false) ON CONFLICT (id) DO NOTHING $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated read access for invoices" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated read access for invoices" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'invoices') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated upload for invoices" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated upload for invoices" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoices') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated update for invoices" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated update for invoices" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'invoices') WITH CHECK (bucket_id = 'invoices') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated delete for invoices" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated delete for invoices" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'invoices') $q$;
END
$storage_files_invoices$;

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

DO $storage_agritech_docs$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Skipping agritech-documents bucket setup — storage schema not found';
    RETURN;
  END IF;

  EXECUTE $q$ INSERT INTO storage.buckets (id, name, "public") VALUES ('agritech-documents', 'agritech-documents', false) ON CONFLICT (id) DO NOTHING $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated read access for agritech-documents" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated read access for agritech-documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'agritech-documents') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated upload for agritech-documents" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated upload for agritech-documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agritech-documents') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated update for agritech-documents" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated update for agritech-documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'agritech-documents') WITH CHECK (bucket_id = 'agritech-documents') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated delete for agritech-documents" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated delete for agritech-documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'agritech-documents') $q$;
END
$storage_agritech_docs$;

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
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_at TIMESTAMPTZ,
  confirmed_slot VARCHAR(40),
  rejection_reason TEXT,
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

-- Single-row config table for subscription pricing model (admin-managed)
CREATE TABLE IF NOT EXISTS subscription_pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modules JSONB NOT NULL DEFAULT '[]',
  ha_tiers JSONB NOT NULL DEFAULT '[]',
  size_multipliers JSONB NOT NULL DEFAULT '[]',
  default_discount_percent NUMERIC NOT NULL DEFAULT 10,
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin-only access via service_role key
ALTER TABLE subscription_pricing_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON subscription_pricing_config;
CREATE POLICY "service_role_only" ON subscription_pricing_config
  FOR ALL USING (auth.role() = 'service_role');

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

DROP POLICY IF EXISTS "org_access" ON banners;
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
  -- Africa (MENA)
  ('MA', 'Morocco',  'Africa', true, 1),
  ('TN', 'Tunisia',  'Africa', true, 2),
  ('DZ', 'Algeria',  'Africa', true, 3),
  ('EG', 'Egypt',    'Africa', true, 4),
  ('SN', 'Senegal',  'Africa', true, 5),
  -- Middle East
  ('AE', 'United Arab Emirates', 'Middle East', true, 1),
  ('SA', 'Saudi Arabia',         'Middle East', true, 2),
  ('JO', 'Jordan',               'Middle East', true, 3),
  ('LB', 'Lebanon',              'Middle East', true, 4),
  -- Europe
  ('FR', 'France',  'Europe', true, 1),
  ('ES', 'Spain',   'Europe', true, 2),
  ('IT', 'Italy',   'Europe', true, 3),
  ('PT', 'Portugal','Europe', true, 4),
  ('DE', 'Germany', 'Europe', true, 5),
  ('NL', 'Netherlands', 'Europe', true, 6)
ON CONFLICT (country_code) DO NOTHING;


-- =====================================================
-- AGRONOMY RAG — Sources, Chunks, Citations
-- =====================================================
-- RAG-grounded agronomy assistant for AgromindIA.
-- Every AI recommendation ships with verifiable citations
-- from a Moroccan agronomy corpus (FAO, IOC, ORMVA, INRA, etc.).

-- pgvector for dense embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------
-- Agronomy Sources (PDFs, fiches techniques, bulletins)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS agronomy_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = public corpus
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  doc_type TEXT CHECK (doc_type IN ('fiche_technique','publication','bulletin','db_calibration','playbook')),
  language TEXT CHECK (language IN ('fr','ar','en')),
  region TEXT[],
  crop_type TEXT[],
  season TEXT[],
  published_at DATE,
  source_url TEXT,
  storage_path TEXT,      -- path in Supabase Storage bucket "agronomy-corpus"
  ingested_at TIMESTAMPTZ DEFAULT now(),
  ingestion_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ingestion_status IN ('pending','running','ready','failed')),
  ingestion_error TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  ingested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE agronomy_sources IS 'RAG corpus: agronomic documents (PDFs, fiches techniques, bulletins) indexed for retrieval-augmented generation';
COMMENT ON COLUMN agronomy_sources.organization_id IS 'NULL = public corpus readable by all; non-null = per-organization playbook';
COMMENT ON COLUMN agronomy_sources.storage_path IS 'Path in Supabase Storage bucket "agronomy-corpus"';

-- -----------------------------------------------------
-- Agronomy Chunks (embedded text segments)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS agronomy_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES agronomy_sources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  page INTEGER,
  text TEXT NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('french', text)) STORED,
  embedding vector(1024),   -- multilingual-e5-large dimension
  UNIQUE (source_id, chunk_index)
);

COMMENT ON TABLE agronomy_chunks IS 'Chunked text segments from agronomy sources with dense embeddings and full-text search';
COMMENT ON COLUMN agronomy_chunks.embedding IS 'Dense embedding from intfloat/multilingual-e5-large (1024 dimensions)';

-- IVFFlat index for cosine similarity (created after initial data load; lists tuned to sqrt(rows))
CREATE INDEX IF NOT EXISTS idx_agronomy_chunks_embedding
  ON agronomy_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_agronomy_chunks_tsv ON agronomy_chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS idx_agronomy_chunks_source ON agronomy_chunks (source_id);
CREATE INDEX IF NOT EXISTS idx_agronomy_sources_org ON agronomy_sources (organization_id);

-- -----------------------------------------------------
-- AI Recommendation Citations (link recommendations → source chunks)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_recommendation_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES ai_recommendations(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES agronomy_chunks(id) ON DELETE CASCADE,
  excerpt TEXT NOT NULL,
  source_ordinal INTEGER NOT NULL,
  UNIQUE (recommendation_id, chunk_id)
);

COMMENT ON TABLE ai_recommendation_citations IS 'Citations linking AI recommendations to specific agronomy source chunks for traceability';
COMMENT ON COLUMN ai_recommendation_citations.source_ordinal IS 'Which source number [S#] this citation refers to (1-based, matching the [S1]..[S8] markers in the LLM output)';

CREATE INDEX IF NOT EXISTS idx_ai_rec_citations_recommendation ON ai_recommendation_citations (recommendation_id);
CREATE INDEX IF NOT EXISTS idx_ai_rec_citations_chunk ON ai_recommendation_citations (chunk_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_rec_citations_unique ON ai_recommendation_citations (recommendation_id, chunk_id);

-- -----------------------------------------------------
-- RLS Policies
-- -----------------------------------------------------
ALTER TABLE agronomy_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE agronomy_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendation_citations ENABLE ROW LEVEL SECURITY;

-- Public corpus: readable by any authenticated user
-- Per-org playbooks: readable only by org members
CREATE POLICY "agronomy_sources_read" ON agronomy_sources
  FOR SELECT USING (
    organization_id IS NULL
    OR public.is_organization_member(organization_id)
  );

CREATE POLICY "agronomy_sources_manage" ON agronomy_sources
  FOR ALL USING (
    -- system_admin can manage all; org members can manage their own playbooks
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      JOIN public.roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND (
          r.name = 'system_admin'
          OR (r.name IN ('organization_admin', 'farm_manager') AND ou.organization_id = agronomy_sources.organization_id)
        )
    )
  );

CREATE POLICY "agronomy_chunks_read" ON agronomy_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agronomy_sources s
      WHERE s.id = agronomy_chunks.source_id
        AND (s.organization_id IS NULL OR public.is_organization_member(s.organization_id))
    )
  );

CREATE POLICY "agronomy_chunks_manage" ON agronomy_chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agronomy_sources s
      WHERE s.id = agronomy_chunks.source_id
        AND (
          EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid()
              AND ou.is_active = true
              AND (
                r.name = 'system_admin'
                OR (r.name IN ('organization_admin', 'farm_manager') AND ou.organization_id = s.organization_id)
              )
          )
        )
    )
  );

-- Citations follow the recommendation's org scoping
CREATE POLICY "agronomy_citations_read" ON ai_recommendation_citations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_recommendations r
      WHERE r.id = ai_recommendation_citations.recommendation_id
        AND public.is_organization_member(r.organization_id)
    )
  );

CREATE POLICY "agronomy_citations_manage" ON ai_recommendation_citations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_recommendations r
      WHERE r.id = ai_recommendation_citations.recommendation_id
        AND public.is_organization_member(r.organization_id)
    )
  );

-- -----------------------------------------------------
-- Storage Bucket: agronomy-corpus
-- -----------------------------------------------------
-- Private bucket for agronomic PDFs and documents used by the RAG pipeline.
-- Read access: any authenticated user (RLS on agronomy_sources handles org scoping).
-- Upload/manage: system_admin and organization_admin/farm_manager only.
-- The FastAPI ML sidecar writes here via the service_role key.
-- -----------------------------------------------------

DO $storage_agronomy_corpus$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Skipping agronomy-corpus bucket setup — storage schema not found';
    RETURN;
  END IF;

  EXECUTE $q$ INSERT INTO storage.buckets (id, name, "public") VALUES ('agronomy-corpus', 'agronomy-corpus', false) ON CONFLICT (id) DO NOTHING $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Authenticated read access for agronomy-corpus" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Authenticated read access for agronomy-corpus" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'agronomy-corpus') $q$;

  EXECUTE 'DROP POLICY IF EXISTS "System admin upload for agronomy-corpus" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "System admin upload for agronomy-corpus" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agronomy-corpus' AND (EXISTS (SELECT 1 FROM public.organization_users ou JOIN public.roles r ON r.id = ou.role_id WHERE ou.user_id = auth.uid() AND ou.is_active = true AND r.name = 'system_admin') OR EXISTS (SELECT 1 FROM public.internal_admins ia WHERE ia.user_id = auth.uid() AND ia.is_active = true))) $q$;

  EXECUTE 'DROP POLICY IF EXISTS "System admin update for agronomy-corpus" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "System admin update for agronomy-corpus" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'agronomy-corpus' AND (EXISTS (SELECT 1 FROM public.organization_users ou JOIN public.roles r ON r.id = ou.role_id WHERE ou.user_id = auth.uid() AND ou.is_active = true AND r.name = 'system_admin') OR EXISTS (SELECT 1 FROM public.internal_admins ia WHERE ia.user_id = auth.uid() AND ia.is_active = true))) WITH CHECK (bucket_id = 'agronomy-corpus' AND (EXISTS (SELECT 1 FROM public.organization_users ou JOIN public.roles r ON r.id = ou.role_id WHERE ou.user_id = auth.uid() AND ou.is_active = true AND r.name = 'system_admin') OR EXISTS (SELECT 1 FROM public.internal_admins ia WHERE ia.user_id = auth.uid() AND ia.is_active = true))) $q$;

  EXECUTE 'DROP POLICY IF EXISTS "System admin delete for agronomy-corpus" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "System admin delete for agronomy-corpus" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'agronomy-corpus' AND (EXISTS (SELECT 1 FROM public.organization_users ou JOIN public.roles r ON r.id = ou.role_id WHERE ou.user_id = auth.uid() AND ou.is_active = true AND r.name = 'system_admin') OR EXISTS (SELECT 1 FROM public.internal_admins ia WHERE ia.user_id = auth.uid() AND ia.is_active = true))) $q$;

  EXECUTE 'DROP POLICY IF EXISTS "Service role full access for agronomy-corpus" ON storage.objects';
  EXECUTE $q$ CREATE POLICY "Service role full access for agronomy-corpus" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'agronomy-corpus') WITH CHECK (bucket_id = 'agronomy-corpus') $q$;
END
$storage_agronomy_corpus$;

-- ============================================================================
-- Migration: 20260419000000_fix_db_linter_errors.sql
-- ============================================================================
-- Addresses Supabase db-linter ERROR-level findings:
--   - 0010_security_definer_view: subscription_legacy_compat
--   - 0013_rls_disabled_in_public: 12 public tables
-- ============================================================================

-- Fix SECURITY DEFINER view -> SECURITY INVOKER
DROP VIEW IF EXISTS public.subscription_legacy_compat;
CREATE VIEW public.subscription_legacy_compat WITH (security_invoker = true) AS
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
FROM public.subscriptions s;

-- ---------------------------------------------------------------------------
-- Org-scoped table: warehouse_stock_levels
-- ---------------------------------------------------------------------------
ALTER TABLE public.warehouse_stock_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON public.warehouse_stock_levels;
CREATE POLICY "org_access" ON public.warehouse_stock_levels
  FOR ALL USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

-- ---------------------------------------------------------------------------
-- Shared location caches (weather): RLS on, read for authenticated,
-- writes restricted to service_role (FastAPI sidecar uses service_role).
-- ---------------------------------------------------------------------------
ALTER TABLE public.weather_daily_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read" ON public.weather_daily_data;
CREATE POLICY "authenticated_read" ON public.weather_daily_data
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_write" ON public.weather_daily_data;
CREATE POLICY "service_role_write" ON public.weather_daily_data
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.weather_gdd_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read" ON public.weather_gdd_daily;
CREATE POLICY "authenticated_read" ON public.weather_gdd_daily
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_write" ON public.weather_gdd_daily;
CREATE POLICY "service_role_write" ON public.weather_gdd_daily
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.weather_forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read" ON public.weather_forecasts;
CREATE POLICY "authenticated_read" ON public.weather_forecasts
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_write" ON public.weather_forecasts;
CREATE POLICY "service_role_write" ON public.weather_forecasts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Global agronomic reference tables: read-only for authenticated,
-- writes restricted to service_role.
-- ---------------------------------------------------------------------------
ALTER TABLE public.phenological_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read" ON public.phenological_stages;
CREATE POLICY "authenticated_read" ON public.phenological_stages
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_write" ON public.phenological_stages;
CREATE POLICY "service_role_write" ON public.phenological_stages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.crop_kc_coefficients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read" ON public.crop_kc_coefficients;
CREATE POLICY "authenticated_read" ON public.crop_kc_coefficients
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_write" ON public.crop_kc_coefficients;
CREATE POLICY "service_role_write" ON public.crop_kc_coefficients
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.crop_mineral_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read" ON public.crop_mineral_exports;
CREATE POLICY "authenticated_read" ON public.crop_mineral_exports
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_write" ON public.crop_mineral_exports;
CREATE POLICY "service_role_write" ON public.crop_mineral_exports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.crop_diseases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read" ON public.crop_diseases;
CREATE POLICY "authenticated_read" ON public.crop_diseases
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_write" ON public.crop_diseases;
CREATE POLICY "service_role_write" ON public.crop_diseases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.crop_index_thresholds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read" ON public.crop_index_thresholds;
CREATE POLICY "authenticated_read" ON public.crop_index_thresholds
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_write" ON public.crop_index_thresholds;
CREATE POLICY "service_role_write" ON public.crop_index_thresholds
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- newsletter_subscribers: service_role-only (NestJS newsletter.service.ts
-- uses the admin client; anon/authenticated clients never touch this table).
-- Matches siam_rdv_leads policy pattern.
-- ---------------------------------------------------------------------------
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON public.newsletter_subscribers;
CREATE POLICY "service_role_only" ON public.newsletter_subscribers
  FOR ALL USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- PostGIS system table: read-only for everyone. Owned by supabase_admin on
-- hosted Supabase; wrap in DO block so missing privileges do not abort.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS "public_read" ON public.spatial_ref_sys';
  EXECUTE 'CREATE POLICY "public_read" ON public.spatial_ref_sys FOR SELECT USING (true)';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipped RLS on spatial_ref_sys (insufficient privilege - expected on hosted Supabase)';
END $$;

-- ============================================================================
-- Migration: 20260419010000_fix_db_linter_warnings.sql
-- ============================================================================
-- Addresses Supabase db-linter WARN-level findings:
--   - 0011_function_search_path_mutable: 18 functions missing search_path
--   - 0016_materialized_view_in_api: 2 MVs exposed via PostgREST
--   - 0024_permissive_rls_policy: 8 RLS policies with USING/WITH CHECK true
-- NOT addressed here (deferred — too risky pre-/during-SIAM):
--   - 0014_extension_in_public: postgis + vector live in public schema.
--     Moving them via ALTER EXTENSION ... SET SCHEMA requires auditing every
--     geometry / vector column reference and touching generated types.
--     Schedule post-SIAM (after 2026-04-26).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Pin search_path on all flagged functions (prevents search_path injection).
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.update_updated_at_column()                  SET search_path = public, pg_catalog;
ALTER FUNCTION public.capture_base_quantity_at_movement()         SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_document_templates_timestamp()       SET search_path = public, pg_catalog;
ALTER FUNCTION public.audit_trigger_func()                        SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_product_variants_updated_at()        SET search_path = public, pg_catalog;
ALTER FUNCTION public.validate_stock_movement_unit()              SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_warehouse_stock_reserved()           SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_variant_quantity_from_movements()      SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_quote_request_updated_at()           SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_quality_inspections_updated_at()     SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_warehouse_stock_levels()             SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_campaigns_updated_at()               SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_account_mappings_updated_at()        SET search_path = public, pg_catalog;

-- ---------------------------------------------------------------------------
-- Remove materialized views from the PostgREST API surface.
-- Refresh + admin reads still work via service_role (which bypasses grants).
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.admin_org_summary FROM anon, authenticated;
REVOKE SELECT ON public.mv_stock_levels   FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tighten permissive RLS policies (USING (true) / WITH CHECK (true))
-- on UPDATE / DELETE / INSERT / ALL commands.
-- ---------------------------------------------------------------------------

-- notifications: INSERT is a server-side operation (NestJS admin client).
-- Restrict to service_role to remove WITH CHECK (true).
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ai_report_jobs: backend updates job status. Restrict to service_role.
DROP POLICY IF EXISTS "Service role can update ai report jobs" ON public.ai_report_jobs;
CREATE POLICY "Service role can update ai report jobs"
  ON public.ai_report_jobs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- abstract_entities: FOR ALL needs matching USING clause.
DROP POLICY IF EXISTS "org_write_abstract_entities" ON public.abstract_entities;
CREATE POLICY "org_write_abstract_entities"
  ON public.abstract_entities
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- entity_relationships: FOR ALL needs matching USING clause.
DROP POLICY IF EXISTS "org_write_entity_relationships" ON public.entity_relationships;
CREATE POLICY "org_write_entity_relationships"
  ON public.entity_relationships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.abstract_entities ae
      WHERE ae.entity_type = entity_relationships.parent_entity_type
        AND ae.entity_id = entity_relationships.parent_entity_id
        AND ae.organization_id IN (
          SELECT organization_id FROM public.organization_users
          WHERE user_id = auth.uid() AND is_active = true
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.abstract_entities ae
      WHERE ae.entity_type = entity_relationships.parent_entity_type
        AND ae.entity_id = entity_relationships.parent_entity_id
        AND ae.organization_id IN (
          SELECT organization_id FROM public.organization_users
          WHERE user_id = auth.uid() AND is_active = true
        )
    )
  );

-- module_translations / modules / polar_subscriptions / polar_webhooks:
-- FOR ALL system_admin write. USING must also enforce the admin check.
DROP POLICY IF EXISTS "admin_write_module_translations" ON public.module_translations;
CREATE POLICY "admin_write_module_translations"
  ON public.module_translations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      JOIN public.roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      JOIN public.roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );

DROP POLICY IF EXISTS "admin_write_modules" ON public.modules;
CREATE POLICY "admin_write_modules"
  ON public.modules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      JOIN public.roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      JOIN public.roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );

DROP POLICY IF EXISTS "admin_write_polar_subscriptions" ON public.polar_subscriptions;
CREATE POLICY "admin_write_polar_subscriptions"
  ON public.polar_subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      JOIN public.roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      JOIN public.roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );

DROP POLICY IF EXISTS "admin_write_polar_webhooks" ON public.polar_webhooks;
CREATE POLICY "admin_write_polar_webhooks"
  ON public.polar_webhooks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      JOIN public.roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      JOIN public.roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );

-- ============================================================================
-- Migration: 20260419020000_fix_weather_cache_rls.sql
-- ============================================================================
-- Follow-up to 20260419000000: two additional weather location caches
-- flagged by db-linter (0013_rls_disabled_in_public). Same pattern as
-- weather_daily_data / weather_gdd_daily / weather_forecasts:
-- shared geographic cache, authenticated read, service_role write.
-- ============================================================================

ALTER TABLE public.weather_hourly_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read" ON public.weather_hourly_data;
CREATE POLICY "authenticated_read" ON public.weather_hourly_data
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_write" ON public.weather_hourly_data;
CREATE POLICY "service_role_write" ON public.weather_hourly_data
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.weather_threshold_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read" ON public.weather_threshold_cache;
CREATE POLICY "authenticated_read" ON public.weather_threshold_cache
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_write" ON public.weather_threshold_cache;
CREATE POLICY "service_role_write" ON public.weather_threshold_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- Migration: 20260419030000_fix_rls_enabled_no_policy.sql
-- ============================================================================
-- Addresses db-linter 0008_rls_enabled_no_policy: 8 tables had RLS enabled
-- but no policies, making them unreadable via PostgREST for all users except
-- service_role. Adds appropriate org-scoped policies per table shape.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- product_variants: org-scoped (organization_id NOT NULL).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_access" ON public.product_variants;
CREATE POLICY "org_access" ON public.product_variants
  FOR ALL
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

-- ---------------------------------------------------------------------------
-- Reference tables with org-overridable rows (organization_id NULLable):
-- read = own org OR global (NULL), write = own org only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "read_org_or_global" ON public.soil_types;
CREATE POLICY "read_org_or_global" ON public.soil_types
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "write_org" ON public.soil_types;
CREATE POLICY "write_org" ON public.soil_types
  FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "update_org" ON public.soil_types;
CREATE POLICY "update_org" ON public.soil_types
  FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "delete_org" ON public.soil_types;
CREATE POLICY "delete_org" ON public.soil_types
  FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "read_org_or_global" ON public.irrigation_types;
CREATE POLICY "read_org_or_global" ON public.irrigation_types
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "write_org" ON public.irrigation_types;
CREATE POLICY "write_org" ON public.irrigation_types
  FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "update_org" ON public.irrigation_types;
CREATE POLICY "update_org" ON public.irrigation_types
  FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "delete_org" ON public.irrigation_types;
CREATE POLICY "delete_org" ON public.irrigation_types
  FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "read_org_or_global" ON public.rootstocks;
CREATE POLICY "read_org_or_global" ON public.rootstocks
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "write_org" ON public.rootstocks;
CREATE POLICY "write_org" ON public.rootstocks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "update_org" ON public.rootstocks;
CREATE POLICY "update_org" ON public.rootstocks
  FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "delete_org" ON public.rootstocks;
CREATE POLICY "delete_org" ON public.rootstocks
  FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "read_org_or_global" ON public.plantation_systems;
CREATE POLICY "read_org_or_global" ON public.plantation_systems
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "write_org" ON public.plantation_systems;
CREATE POLICY "write_org" ON public.plantation_systems
  FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "update_org" ON public.plantation_systems;
CREATE POLICY "update_org" ON public.plantation_systems
  FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "delete_org" ON public.plantation_systems;
CREATE POLICY "delete_org" ON public.plantation_systems
  FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id));

-- ---------------------------------------------------------------------------
-- tax_configurations: country-default (org_id NULL, country_code set) OR
-- org-override. Readable by anyone authenticated, writable only by org owner.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "read_global_or_org" ON public.tax_configurations;
CREATE POLICY "read_global_or_org" ON public.tax_configurations
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "write_org" ON public.tax_configurations;
CREATE POLICY "write_org" ON public.tax_configurations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "update_org" ON public.tax_configurations;
CREATE POLICY "update_org" ON public.tax_configurations
  FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));
DROP POLICY IF EXISTS "delete_org" ON public.tax_configurations;
CREATE POLICY "delete_org" ON public.tax_configurations
  FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id));

-- ---------------------------------------------------------------------------
-- cost_center_budgets: no direct organization_id; scope via cost_centers.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_access" ON public.cost_center_budgets;
CREATE POLICY "org_access" ON public.cost_center_budgets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cost_centers cc
      WHERE cc.id = cost_center_budgets.cost_center_id
        AND public.is_organization_member(cc.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cost_centers cc
      WHERE cc.id = cost_center_budgets.cost_center_id
        AND public.is_organization_member(cc.organization_id)
    )
  );

-- ---------------------------------------------------------------------------
-- account_translations: no direct organization_id; scope via accounts.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "org_access" ON public.account_translations;
CREATE POLICY "org_access" ON public.account_translations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_translations.account_id
        AND public.is_organization_member(a.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_translations.account_id
        AND public.is_organization_member(a.organization_id)
    )
  );



-- =====================================================================
-- Migration: 20260424000000_align_modules_catalog.sql
-- =====================================================================
-- Reconciles the modules catalog to the 12-SKU coarse licensing model
-- agreed on 2026-04-24 (see reespec/decisions.md). This migration is
-- idempotent and safe to re-run.
--
-- What it does:
--   1. Upserts 12 canonical modules by slug (core + 11 sellable SKUs).
--   2. Seeds module_translations for fr / en / ar per module.
--   3. Marks all non-canonical modules is_available = false.
--   4. Remaps organization_modules rows from legacy slugs to canonical
--      slugs (OR-ing is_active when multiple legacy rows collapse to
--      one canonical row).
--   5. Guarantees every organization has `core` is_active = true.
--   6. Cleans up organization_modules rows pointing to unavailable
--      (legacy) modules.

BEGIN;

-- 1. Upsert 12 canonical modules ------------------------------------
INSERT INTO modules (
  slug, name, icon, color, category, description,
  display_order, price_monthly, is_required, is_recommended,
  is_available, navigation_items, dashboard_widgets
) VALUES
  ('core',             'core',             'Home',          '#10b981', 'core',       'Core features available to every organization', 1,  0,   true,  true,  true,
    '["/dashboard","/settings","/farm-hierarchy","/parcels","/notifications","/analytics","/live-dashboard","/referentiels"]'::jsonb, '[]'::jsonb),
  ('chat_advisor',     'chat_advisor',     'Bot',           '#10b981', 'analytics',  'Conversational AgromindIA assistant',             2,  0,   true,  true,  true,
    '["/chat"]'::jsonb, '[]'::jsonb),
  ('agromind_advisor', 'agromind_advisor', 'Sparkles',      '#7c3aed', 'analytics',  'AI advisor per parcel: calibration, diagnostics, recommendations, annual plan', 3, 0, false, false, true,
    '["/parcels/$parcelId/ai"]'::jsonb, '[]'::jsonb),
  ('satellite',        'satellite',        'Satellite',     '#06b6d4', 'analytics',  'Satellite imagery, vegetation indices, weather',  4,  0,   false, false, true,
    '["/satellite-analysis","/production/satellite-analysis","/parcels/$parcelId/satellite","/parcels/$parcelId/weather","/parcels/$parcelId/analyse","/farms/$farmId/satellite/heatmap","/production/soil-analysis"]'::jsonb, '[]'::jsonb),
  ('personnel',        'personnel',        'Users',         '#3b82f6', 'hr',         'Workers and tasks',                               5,  0,   false, false, true,
    '["/workers","/tasks","/workforce"]'::jsonb, '[]'::jsonb),
  ('stock',            'stock',            'Package',       '#10b981', 'inventory',  'Inventory and infrastructure',                    6,  0,   false, false, true,
    '["/stock","/infrastructure","/equipment","/inventory"]'::jsonb, '[]'::jsonb),
  ('production',       'production',       'Wheat',         '#f59e0b', 'production', 'Campaigns, crop cycles, harvests, quality',       7,  0,   false, false, true,
    '["/campaigns","/crop-cycles","/harvests","/reception-batches","/quality-control","/biological-assets","/product-applications","/production","/parcels/$parcelId/production","/parcels/$parcelId/profitability","/pest-alerts"]'::jsonb, '[]'::jsonb),
  ('fruit_trees',      'fruit_trees',      'TreeDeciduous', '#10b981', 'agriculture','Trees, orchards, pruning',                        8,  0,   false, false, true,
    '["/trees","/orchards","/pruning"]'::jsonb, '[]'::jsonb),
  ('compliance',       'compliance',       'ShieldCheck',   '#a855f7', 'operations', 'Compliance and certifications',                   9, 0,   false, false, true,
    '["/compliance"]'::jsonb, '[]'::jsonb),
  ('sales_purchasing', 'sales_purchasing', 'ShoppingCart',  '#f43f5e', 'sales',      'Quotes, sales orders, purchase orders',           10, 0,   false, false, true,
    '["/accounting/quotes","/accounting/sales-orders","/accounting/purchase-orders","/accounting/customers","/stock/suppliers"]'::jsonb, '[]'::jsonb),
  ('accounting',       'accounting',       'BookOpen',      '#6366f1', 'accounting', 'Invoices, payments, journal, reports',            11, 0,   false, false, true,
    '["/accounting","/utilities","/reports","/parcels/$parcelId/reports"]'::jsonb, '[]'::jsonb),
  ('marketplace',      'marketplace',      'ShoppingBag',   '#f97316', 'sales',      'B2B quote marketplace',                           12, 0,   false, false, true,
    '["/marketplace"]'::jsonb, '[]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  icon              = EXCLUDED.icon,
  color             = EXCLUDED.color,
  category          = EXCLUDED.category,
  description       = EXCLUDED.description,
  display_order     = EXCLUDED.display_order,
  price_monthly     = EXCLUDED.price_monthly,
  is_required       = EXCLUDED.is_required,
  is_recommended    = EXCLUDED.is_recommended,
  is_available      = EXCLUDED.is_available,
  navigation_items  = EXCLUDED.navigation_items,
  dashboard_widgets = EXCLUDED.dashboard_widgets,
  updated_at        = NOW();

-- 2. Seed module_translations (fr / en / ar) ------------------------
INSERT INTO module_translations (module_id, locale, name, description)
SELECT m.id, v.locale, v.name, v.description
FROM modules m
JOIN (VALUES
  ('core',             'fr', 'Cœur',                'Fonctionnalités de base pour toute organisation'),
  ('core',             'en', 'Core',                'Core features available to every organization'),
  ('core',             'ar', 'الأساس',              'الميزات الأساسية المتاحة لكل مؤسسة'),
  ('chat_advisor',     'fr', 'Conseiller Chat',     'Assistant conversationnel AgromindIA'),
  ('chat_advisor',     'en', 'Chat Advisor',        'Conversational AgromindIA assistant'),
  ('chat_advisor',     'ar', 'المستشار الحواري',   'مساعد AgromindIA التفاعلي'),
  ('agromind_advisor', 'fr', 'Conseiller AgroMind', 'Conseiller IA par parcelle: calibrage, diagnostics, recommandations, plan annuel'),
  ('agromind_advisor', 'en', 'AgroMind Advisor',    'AI advisor per parcel: calibration, diagnostics, recommendations, annual plan'),
  ('agromind_advisor', 'ar', 'مستشار أغرومايند',    'مستشار ذكاء اصطناعي لكل قطعة: المعايرة، التشخيص، التوصيات، الخطة السنوية'),
  ('satellite',        'fr', 'Satellite',           'Imagerie satellite, indices de végétation, météo'),
  ('satellite',        'en', 'Satellite',           'Satellite imagery, vegetation indices, weather'),
  ('satellite',        'ar', 'الأقمار الصناعية',   'صور الأقمار الصناعية ومؤشرات الغطاء النباتي والطقس'),
  ('personnel',        'fr', 'Personnel',           'Ouvriers et tâches'),
  ('personnel',        'en', 'Personnel',           'Workers and tasks'),
  ('personnel',        'ar', 'الموظفون',            'العمال والمهام'),
  ('stock',            'fr', 'Stock',               'Inventaire et infrastructure'),
  ('stock',            'en', 'Stock',               'Inventory and infrastructure'),
  ('stock',            'ar', 'المخزون',            'المخزون والبنية التحتية'),
  ('production',       'fr', 'Production',          'Campagnes, cycles culturaux, récoltes, qualité'),
  ('production',       'en', 'Production',          'Campaigns, crop cycles, harvests, quality'),
  ('production',       'ar', 'الإنتاج',             'الحملات ودورات المحاصيل والحصاد والجودة'),
  ('fruit_trees',      'fr', 'Arbres Fruitiers',    'Arbres, vergers, taille'),
  ('fruit_trees',      'en', 'Fruit Trees',         'Trees, orchards, pruning'),
  ('fruit_trees',      'ar', 'الأشجار المثمرة',    'الأشجار والبساتين والتقليم'),
  ('compliance',       'fr', 'Conformité',          'Conformité et certifications'),
  ('compliance',       'en', 'Compliance',          'Compliance and certifications'),
  ('compliance',       'ar', 'الامتثال',            'الامتثال والشهادات'),
  ('sales_purchasing', 'fr', 'Ventes & Achats',     'Devis, commandes clients, commandes fournisseurs'),
  ('sales_purchasing', 'en', 'Sales & Purchasing',  'Quotes, sales orders, purchase orders'),
  ('sales_purchasing', 'ar', 'المبيعات والمشتريات', 'العروض وطلبات البيع وطلبات الشراء'),
  ('accounting',       'fr', 'Comptabilité',        'Factures, paiements, journal, rapports'),
  ('accounting',       'en', 'Accounting',          'Invoices, payments, journal, reports'),
  ('accounting',       'ar', 'المحاسبة',            'الفواتير والمدفوعات والدفتر والتقارير'),
  ('marketplace',      'fr', 'Place de Marché',     'Marketplace B2B de demandes de devis'),
  ('marketplace',      'en', 'Marketplace',         'B2B quote marketplace'),
  ('marketplace',      'ar', 'السوق',               'سوق عروض B2B')
) AS v(slug, locale, name, description) ON v.slug = m.slug
ON CONFLICT (module_id, locale) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at  = NOW();

-- 3. Mark all non-canonical modules as unavailable -------------------
UPDATE modules
SET is_available = false,
    updated_at   = NOW()
WHERE slug NOT IN (
  'core','chat_advisor','agromind_advisor','satellite','personnel','stock',
  'production','fruit_trees','compliance','sales_purchasing','accounting','marketplace'
);

-- 4. Remap organization_modules rows from legacy slugs to canonical --
WITH legacy_map(legacy_slug, canonical_slug) AS (
  VALUES
    ('dashboard',       'core'),
    ('farms',           'core'),
    ('farm_management', 'core'),
    ('harvests',        'production'),
    ('tasks',           'personnel'),
    ('workers',         'personnel'),
    ('hr',              'personnel'),
    ('stock',           'stock'),
    ('inventory',       'stock'),
    ('customers',       'sales_purchasing'),
    ('suppliers',       'sales_purchasing'),
    ('quotes',          'sales_purchasing'),
    ('sales_orders',    'sales_purchasing'),
    ('sales',           'sales_purchasing'),
    ('purchase_orders', 'sales_purchasing'),
    ('procurement',     'sales_purchasing'),
    ('invoices',        'accounting'),
    ('reports',         'accounting'),
    ('analytics',       'satellite'),
    ('chat',            'chat_advisor'),
    ('certifications',  'compliance'),
    ('arbres_fruitiers','fruit_trees')
),
id_map AS (
  SELECT
    old_m.id  AS old_module_id,
    new_m.id  AS new_module_id
  FROM legacy_map
  JOIN modules old_m ON old_m.slug = legacy_map.legacy_slug
  JOIN modules new_m ON new_m.slug = legacy_map.canonical_slug
  WHERE old_m.id <> new_m.id
),
collapsed AS (
  SELECT
    om.organization_id,
    id_map.new_module_id,
    bool_or(om.is_active) AS is_active
  FROM organization_modules om
  JOIN id_map ON om.module_id = id_map.old_module_id
  GROUP BY om.organization_id, id_map.new_module_id
)
INSERT INTO organization_modules (organization_id, module_id, is_active)
SELECT organization_id, new_module_id, is_active
FROM collapsed
ON CONFLICT (organization_id, module_id) DO UPDATE SET
  is_active  = organization_modules.is_active OR EXCLUDED.is_active,
  updated_at = NOW();

-- 5. Delete organization_modules rows pointing to unavailable modules -
DELETE FROM organization_modules om
USING modules m
WHERE om.module_id = m.id
  AND m.is_available = false;

-- 6. Guarantee every organization has core active --------------------
INSERT INTO organization_modules (organization_id, module_id, is_active)
SELECT o.id, m.id, true
FROM organizations o
CROSS JOIN modules m
WHERE m.slug = 'core'
ON CONFLICT (organization_id, module_id) DO UPDATE SET
  is_active  = true,
  updated_at = NOW();

COMMIT;

-- Audit helper (commented; run manually for verification) ------------
-- SELECT m.slug, COUNT(om.*) FILTER (WHERE om.is_active) AS active_orgs
-- FROM modules m LEFT JOIN organization_modules om ON om.module_id = m.id
-- WHERE m.is_available = true
-- GROUP BY m.slug ORDER BY m.slug;


-- =====================================================================
-- Migration: 20260424000001_seed_required_modules_trigger.sql
-- =====================================================================
-- When a new organization is created, automatically activate all
-- modules marked is_required = true. Companion to the preceding
-- catalog alignment migration.

-- Required modules are now seeded in the application layer
-- (OrganizationsService.create -> seedRequiredModules).
DROP TRIGGER IF EXISTS trg_seed_required_modules ON organizations;
DROP FUNCTION IF EXISTS seed_required_modules_for_new_org();

-- ============================================================================
-- OFFLINE-FIRST SUPPORT: client_id (idempotency) + version (optimistic lock) +
-- client_created_at (skew-tolerant ordering). Phase 2 of offline-first plan.
-- All columns are nullable and additive — safe to apply without backfill.
-- ============================================================================

-- Helper: bump version on UPDATE so optimistic lock works.
CREATE OR REPLACE FUNCTION offline_bump_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version IS NULL THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  ELSIF NEW.version = OLD.version THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'tasks', 'task_comments', 'work_records',
    'stock_entries', 'stock_entry_items',
    'harvest_records', 'pest_disease_reports'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Skip tables that don't exist in this branch
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS client_id UUID', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS client_created_at TIMESTAMPTZ', t);
    -- Idempotency unique index, scoped per organization, partial on non-null client_id.
    -- Only create if the table has organization_id (all listed do).
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id'
    ) THEN
      EXECUTE format(
        'CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (organization_id, client_id) WHERE client_id IS NOT NULL',
        t || '_org_client_id_uidx', t
      );
    END IF;
    -- Version bump trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_offline_bump_version ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_offline_bump_version BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION offline_bump_version()',
      t
    );
  END LOOP;
END $$;

-- Files SHA-256 dedupe (per organization).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_registry') THEN
    EXECUTE 'ALTER TABLE file_registry ADD COLUMN IF NOT EXISTS content_sha256 TEXT';
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS file_registry_org_sha256_uidx ON file_registry (organization_id, content_sha256) WHERE content_sha256 IS NOT NULL';
  END IF;
END $$;

-- =====================================================================
-- HR Module — Phase 0: Attendance Foundation
-- =====================================================================
-- Per-ping attendance model: each check-in/check-out is one row.
-- Geofences are point + radius (matches attendance.service.ts in agritech-api).

CREATE TABLE IF NOT EXISTS farm_geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat NUMERIC NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng NUMERIC NOT NULL CHECK (lng BETWEEN -180 AND 180),
  radius_m INTEGER NOT NULL DEFAULT 250 CHECK (radius_m BETWEEN 10 AND 50000),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, farm_id, name)
);

CREATE INDEX IF NOT EXISTS idx_farm_geofences_org ON farm_geofences(organization_id);
CREATE INDEX IF NOT EXISTS idx_farm_geofences_farm ON farm_geofences(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_geofences_active ON farm_geofences(organization_id, is_active);

ALTER TABLE farm_geofences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_farm_geofences" ON farm_geofences;
CREATE POLICY "org_access_farm_geofences" ON farm_geofences
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS set_farm_geofences_updated_at ON farm_geofences;
CREATE TRIGGER set_farm_geofences_updated_at
  BEFORE UPDATE ON farm_geofences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  geofence_id UUID REFERENCES farm_geofences(id) ON DELETE SET NULL,

  type TEXT NOT NULL CHECK (type IN ('check_in', 'check_out')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  lat NUMERIC CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  lng NUMERIC CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
  accuracy_m NUMERIC,
  distance_m NUMERIC,
  within_geofence BOOLEAN,

  source TEXT NOT NULL DEFAULT 'mobile'
    CHECK (source IN ('mobile', 'manual', 'admin', 'biometric')),
  notes TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_org ON attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_worker ON attendance_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_farm ON attendance_records(farm_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_occurred_at ON attendance_records(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_worker_occurred ON attendance_records(worker_id, occurred_at DESC);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_attendance_records" ON attendance_records;
CREATE POLICY "org_access_attendance_records" ON attendance_records
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS set_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER set_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- HR Module — Phase 1.0: Compliance Settings (Configuration Layer)
-- =====================================================================
-- One row per organization. Every payroll/leave module reads this first.
-- When a flag is OFF, the corresponding calculation is skipped entirely.

CREATE TABLE IF NOT EXISTS hr_compliance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

  -- Country / preset
  compliance_country TEXT NOT NULL DEFAULT 'MA',
  compliance_preset TEXT NOT NULL DEFAULT 'morocco_none'
    CHECK (compliance_preset IN ('morocco_standard', 'morocco_basic', 'morocco_none', 'custom')),

  -- CNSS
  cnss_enabled BOOLEAN NOT NULL DEFAULT false,
  cnss_employee_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  cnss_employer_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  cnss_salary_cap NUMERIC,
  cnss_auto_declare BOOLEAN NOT NULL DEFAULT false,
  cnss_declaration_frequency TEXT
    CHECK (cnss_declaration_frequency IS NULL OR cnss_declaration_frequency IN ('monthly', 'quarterly')),

  -- AMO
  amo_enabled BOOLEAN NOT NULL DEFAULT false,
  amo_employee_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  amo_employer_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  amo_salary_cap NUMERIC,

  -- CIS / RCAR
  cis_enabled BOOLEAN NOT NULL DEFAULT false,
  cis_employee_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  cis_employer_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  cis_salary_cap NUMERIC,

  -- Income Tax (IR)
  income_tax_enabled BOOLEAN NOT NULL DEFAULT false,
  income_tax_config_id UUID,
  professional_expenses_deduction_enabled BOOLEAN NOT NULL DEFAULT false,
  professional_expenses_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
  professional_expenses_cap NUMERIC,
  family_deduction_enabled BOOLEAN NOT NULL DEFAULT false,
  family_deduction_per_child NUMERIC NOT NULL DEFAULT 0,
  family_deduction_max_children INTEGER NOT NULL DEFAULT 0,

  -- Leave compliance
  leave_compliance_mode TEXT NOT NULL DEFAULT 'custom'
    CHECK (leave_compliance_mode IN ('morocco_legal', 'custom')),
  enforce_minimum_leave BOOLEAN NOT NULL DEFAULT false,
  auto_allocate_annual_leave BOOLEAN NOT NULL DEFAULT false,
  annual_leave_days_per_month NUMERIC NOT NULL DEFAULT 1.5,
  sick_leave_days INTEGER NOT NULL DEFAULT 4,
  maternity_leave_weeks INTEGER NOT NULL DEFAULT 14,
  paternity_leave_days INTEGER NOT NULL DEFAULT 3,

  -- Minimum wage
  minimum_wage_check_enabled BOOLEAN NOT NULL DEFAULT false,
  minimum_daily_wage NUMERIC,
  minimum_monthly_wage NUMERIC,

  -- Payroll behavior
  default_pay_frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (default_pay_frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  default_currency TEXT NOT NULL DEFAULT 'MAD',
  round_net_pay BOOLEAN NOT NULL DEFAULT true,
  auto_generate_slips_on_payroll_run BOOLEAN NOT NULL DEFAULT true,
  password_protect_payslips BOOLEAN NOT NULL DEFAULT false,

  -- Overtime
  overtime_enabled BOOLEAN NOT NULL DEFAULT false,
  standard_working_hours NUMERIC NOT NULL DEFAULT 8,
  overtime_rate_multiplier NUMERIC NOT NULL DEFAULT 1.5,
  overtime_rate_multiplier_weekend NUMERIC NOT NULL DEFAULT 2,

  last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_compliance_settings_org ON hr_compliance_settings(organization_id);

ALTER TABLE hr_compliance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_hr_compliance" ON hr_compliance_settings;
CREATE POLICY "org_access_hr_compliance" ON hr_compliance_settings
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_hr_compliance_settings_updated_at ON hr_compliance_settings;
CREATE TRIGGER update_hr_compliance_settings_updated_at
  BEFORE UPDATE ON hr_compliance_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- HR compliance defaults are now seeded in the application layer
-- (OrganizationsService.create -> createDefaultHrComplianceSettings).
DROP TRIGGER IF EXISTS trg_create_hr_compliance_settings ON organizations;
DROP FUNCTION IF EXISTS create_default_hr_compliance_settings();


-- =====================================================================
-- HR Module — Phase 1.A: Leave Management
-- =====================================================================

-- Leave Types (per org)
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_fr TEXT,
  name_ar TEXT,
  description TEXT,

  annual_allocation NUMERIC NOT NULL DEFAULT 0,
  is_carry_forward BOOLEAN NOT NULL DEFAULT false,
  maximum_carry_forward_days NUMERIC NOT NULL DEFAULT 0,
  carry_forward_expiry_months INTEGER NOT NULL DEFAULT 3,
  is_encashable BOOLEAN NOT NULL DEFAULT false,
  encashment_amount_per_day NUMERIC,

  applicable_worker_types TEXT[] NOT NULL DEFAULT ARRAY['fixed_salary', 'daily_worker', 'metayage'],
  is_paid BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  maximum_consecutive_days INTEGER,
  minimum_advance_notice_days INTEGER NOT NULL DEFAULT 1,

  is_earned_leave BOOLEAN NOT NULL DEFAULT false,
  earned_leave_frequency TEXT
    CHECK (earned_leave_frequency IS NULL OR earned_leave_frequency IN ('monthly', 'quarterly', 'biannual', 'annual')),
  earned_leave_days_per_period NUMERIC,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_leave_types_org ON leave_types(organization_id);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_leave_types" ON leave_types;
CREATE POLICY "org_access_leave_types" ON leave_types
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_leave_types_updated_at ON leave_types;
CREATE TRIGGER update_leave_types_updated_at
  BEFORE UPDATE ON leave_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Holiday Lists
CREATE TABLE IF NOT EXISTS holiday_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_holiday_lists_org ON holiday_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_holiday_lists_year ON holiday_lists(organization_id, year);

ALTER TABLE holiday_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_holiday_lists" ON holiday_lists;
CREATE POLICY "org_access_holiday_lists" ON holiday_lists
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_holiday_lists_updated_at ON holiday_lists;
CREATE TRIGGER update_holiday_lists_updated_at
  BEFORE UPDATE ON holiday_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Holidays (in a list)
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_list_id UUID NOT NULL REFERENCES holiday_lists(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  name_fr TEXT,
  name_ar TEXT,
  holiday_type TEXT NOT NULL DEFAULT 'public'
    CHECK (holiday_type IN ('public', 'optional', 'weekly_off')),
  description TEXT,
  UNIQUE(holiday_list_id, date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_list ON holidays(holiday_list_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_holidays" ON holidays;
CREATE POLICY "org_access_holidays" ON holidays
  FOR ALL USING (
    is_organization_member((SELECT organization_id FROM holiday_lists WHERE id = holiday_list_id))
  ) WITH CHECK (
    is_organization_member((SELECT organization_id FROM holiday_lists WHERE id = holiday_list_id))
  );

-- Leave Allocations (worker x leave_type x period)
CREATE TABLE IF NOT EXISTS leave_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,

  total_days NUMERIC NOT NULL DEFAULT 0,
  used_days NUMERIC NOT NULL DEFAULT 0,
  expired_days NUMERIC NOT NULL DEFAULT 0,
  carry_forwarded_days NUMERIC NOT NULL DEFAULT 0,
  encashed_days NUMERIC NOT NULL DEFAULT 0,
  remaining_days NUMERIC GENERATED ALWAYS AS (
    total_days - used_days - expired_days - encashed_days
  ) STORED,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(worker_id, leave_type_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_leave_allocations_org ON leave_allocations(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_allocations_worker ON leave_allocations(worker_id);
CREATE INDEX IF NOT EXISTS idx_leave_allocations_type ON leave_allocations(leave_type_id);

ALTER TABLE leave_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_leave_allocations" ON leave_allocations;
CREATE POLICY "org_access_leave_allocations" ON leave_allocations
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_leave_allocations_updated_at ON leave_allocations;
CREATE TRIGGER update_leave_allocations_updated_at
  BEFORE UPDATE ON leave_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Leave Applications
CREATE TABLE IF NOT EXISTS leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,

  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  total_days NUMERIC NOT NULL,
  half_day BOOLEAN NOT NULL DEFAULT false,
  half_day_period TEXT
    CHECK (half_day_period IS NULL OR half_day_period IN ('first_half', 'second_half')),

  reason TEXT NOT NULL,
  attachment_urls TEXT[],

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  is_block_day BOOLEAN NOT NULL DEFAULT false,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (to_date >= from_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_applications_org ON leave_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_worker ON leave_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_dates ON leave_applications(from_date, to_date);

ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_leave_applications" ON leave_applications;
CREATE POLICY "org_access_leave_applications" ON leave_applications
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_leave_applications_updated_at ON leave_applications;
CREATE TRIGGER update_leave_applications_updated_at
  BEFORE UPDATE ON leave_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Leave Block Dates (e.g. harvest blackout)
CREATE TABLE IF NOT EXISTS leave_block_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  reason TEXT NOT NULL,
  applies_to TEXT[] NOT NULL DEFAULT ARRAY['all'],
  allowed_approvers UUID[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, block_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_block_dates_org_date ON leave_block_dates(organization_id, block_date);

ALTER TABLE leave_block_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_leave_block_dates" ON leave_block_dates;
CREATE POLICY "org_access_leave_block_dates" ON leave_block_dates
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

-- Leave Encashments
CREATE TABLE IF NOT EXISTS leave_encashments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  leave_allocation_id UUID NOT NULL REFERENCES leave_allocations(id) ON DELETE CASCADE,

  days_encashed NUMERIC NOT NULL CHECK (days_encashed > 0),
  amount_per_day NUMERIC NOT NULL CHECK (amount_per_day >= 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),

  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_encashments_org ON leave_encashments(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_encashments_worker ON leave_encashments(worker_id);

ALTER TABLE leave_encashments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_leave_encashments" ON leave_encashments;
CREATE POLICY "org_access_leave_encashments" ON leave_encashments
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

-- =====================================================================
-- HR Module — Phase 1.B: Payroll Processing
-- =====================================================================

-- Progressive income tax brackets (separate from tax_configurations which is
-- flat-rate VAT-style). Used by the payroll calc engine when compliance
-- settings income_tax_enabled = true.
CREATE TABLE IF NOT EXISTS income_tax_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2),
  -- NULL country_code AND non-null org_id = org override; non-null country_code
  -- AND null org_id = system default for that country.
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  bracket_set_name TEXT NOT NULL,         -- e.g. 'morocco_ir_annual_2026'
  period TEXT NOT NULL DEFAULT 'annual'
    CHECK (period IN ('annual', 'monthly')),
  currency TEXT NOT NULL DEFAULT 'MAD',

  lower_bound NUMERIC NOT NULL,           -- inclusive
  upper_bound NUMERIC,                    -- exclusive; NULL = no upper bound
  rate NUMERIC(5,2) NOT NULL,             -- % (0–100)
  quick_deduction NUMERIC NOT NULL DEFAULT 0, -- "somme à déduire" (optional)
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (organization_id IS NULL OR country_code IS NULL),
  CHECK (upper_bound IS NULL OR upper_bound > lower_bound)
);

CREATE INDEX IF NOT EXISTS idx_income_tax_brackets_country ON income_tax_brackets(country_code, bracket_set_name) WHERE organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_income_tax_brackets_org ON income_tax_brackets(organization_id, bracket_set_name) WHERE organization_id IS NOT NULL;

ALTER TABLE income_tax_brackets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "income_tax_brackets_read" ON income_tax_brackets;
CREATE POLICY "income_tax_brackets_read" ON income_tax_brackets
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );
DROP POLICY IF EXISTS "income_tax_brackets_write_org" ON income_tax_brackets;
CREATE POLICY "income_tax_brackets_write_org" ON income_tax_brackets
  FOR ALL USING (
    organization_id IS NOT NULL AND is_organization_member(organization_id)
  ) WITH CHECK (
    organization_id IS NOT NULL AND is_organization_member(organization_id)
  );

-- Seed Moroccan IR (annual brackets, 2026 reference)
INSERT INTO income_tax_brackets (country_code, bracket_set_name, period, currency, lower_bound, upper_bound, rate, quick_deduction)
VALUES
  ('MA', 'morocco_ir_annual_2026', 'annual', 'MAD',      0,   30000,  0,     0),
  ('MA', 'morocco_ir_annual_2026', 'annual', 'MAD',  30000,   50000, 10,  3000),
  ('MA', 'morocco_ir_annual_2026', 'annual', 'MAD',  50000,   60000, 20,  8000),
  ('MA', 'morocco_ir_annual_2026', 'annual', 'MAD',  60000,   80000, 30, 14000),
  ('MA', 'morocco_ir_annual_2026', 'annual', 'MAD',  80000,  180000, 34, 17200),
  ('MA', 'morocco_ir_annual_2026', 'annual', 'MAD', 180000,    NULL, 38, 24400)
ON CONFLICT DO NOTHING;

-- Salary Structures
CREATE TABLE IF NOT EXISTS salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  applicable_worker_types TEXT[] NOT NULL DEFAULT ARRAY['fixed_salary'],
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  currency TEXT NOT NULL DEFAULT 'MAD',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_salary_structures_org ON salary_structures(organization_id);

ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_salary_structures" ON salary_structures;
CREATE POLICY "org_access_salary_structures" ON salary_structures
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_salary_structures_updated_at ON salary_structures;
CREATE TRIGGER update_salary_structures_updated_at
  BEFORE UPDATE ON salary_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Salary Components (earnings + deductions on a structure)
CREATE TABLE IF NOT EXISTS salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_fr TEXT,
  name_ar TEXT,
  component_type TEXT NOT NULL CHECK (component_type IN ('earning', 'deduction')),
  category TEXT NOT NULL CHECK (category IN (
    'basic_salary', 'housing_allowance', 'transport_allowance', 'family_allowance',
    'overtime', 'bonus', 'commission', 'other_earning',
    'cnss_employee', 'cnss_employer', 'amo_employee', 'amo_employer',
    'cis_employee', 'cis_employer',
    'income_tax', 'professional_tax',
    'advance_deduction', 'loan_deduction', 'other_deduction'
  )),
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('fixed', 'percentage_of_basic', 'formula')),
  amount NUMERIC,
  percentage NUMERIC,
  formula TEXT,
  is_statutory BOOLEAN NOT NULL DEFAULT false,
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  depends_on_payment_days BOOLEAN NOT NULL DEFAULT true,
  condition_formula TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_components_structure ON salary_components(salary_structure_id);

ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_salary_components" ON salary_components;
CREATE POLICY "org_access_salary_components" ON salary_components
  FOR ALL USING (
    is_organization_member((SELECT organization_id FROM salary_structures WHERE id = salary_structure_id))
  ) WITH CHECK (
    is_organization_member((SELECT organization_id FROM salary_structures WHERE id = salary_structure_id))
  );

-- Salary Structure Assignments (worker → structure with effective dates)
CREATE TABLE IF NOT EXISTS salary_structure_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  salary_structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
  base_amount NUMERIC NOT NULL CHECK (base_amount >= 0),
  variable_amount NUMERIC NOT NULL DEFAULT 0,
  cost_center_farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  cost_center_split JSONB,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_ssa_org ON salary_structure_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_ssa_worker ON salary_structure_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_ssa_effective ON salary_structure_assignments(worker_id, effective_from DESC);

ALTER TABLE salary_structure_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_ssa" ON salary_structure_assignments;
CREATE POLICY "org_access_ssa" ON salary_structure_assignments
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

-- Payroll Runs (batch processing record)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('monthly', 'biweekly', 'weekly', 'daily')),
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  worker_type TEXT,
  total_workers INTEGER NOT NULL DEFAULT 0,
  total_gross_pay NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  total_net_pay NUMERIC NOT NULL DEFAULT 0,
  total_employer_contributions NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'processing', 'submitted', 'paid', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (pay_period_end >= pay_period_start)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON payroll_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(organization_id, pay_period_start DESC);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_payroll_runs" ON payroll_runs;
CREATE POLICY "org_access_payroll_runs" ON payroll_runs
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_payroll_runs_updated_at ON payroll_runs;
CREATE TRIGGER update_payroll_runs_updated_at
  BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Salary Slips (per worker per pay period)
CREATE TABLE IF NOT EXISTS salary_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  salary_structure_assignment_id UUID REFERENCES salary_structure_assignments(id) ON DELETE SET NULL,
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,

  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_frequency TEXT NOT NULL CHECK (pay_frequency IN ('monthly', 'biweekly', 'weekly', 'daily')),

  working_days INTEGER NOT NULL DEFAULT 0,
  present_days NUMERIC NOT NULL DEFAULT 0,
  absent_days NUMERIC NOT NULL DEFAULT 0,
  leave_days NUMERIC NOT NULL DEFAULT 0,
  holiday_days NUMERIC NOT NULL DEFAULT 0,
  payment_days NUMERIC NOT NULL DEFAULT 0,

  gross_pay NUMERIC NOT NULL DEFAULT 0,
  earnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  deductions JSONB NOT NULL DEFAULT '[]'::jsonb,
  employer_contributions JSONB NOT NULL DEFAULT '[]'::jsonb,
  net_pay NUMERIC NOT NULL DEFAULT 0,

  taxable_income NUMERIC,
  income_tax NUMERIC,
  tax_deduction_amount NUMERIC,
  tax_regime TEXT CHECK (tax_regime IS NULL OR tax_regime IN ('standard', 'simplified')),

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'paid', 'cancelled')),

  journal_entry_id UUID,
  cost_center JSONB,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(worker_id, pay_period_start, pay_period_end)
);

CREATE INDEX IF NOT EXISTS idx_salary_slips_org ON salary_slips(organization_id);
CREATE INDEX IF NOT EXISTS idx_salary_slips_worker ON salary_slips(worker_id);
CREATE INDEX IF NOT EXISTS idx_salary_slips_run ON salary_slips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_salary_slips_period ON salary_slips(organization_id, pay_period_start DESC);

ALTER TABLE salary_slips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_salary_slips" ON salary_slips;
CREATE POLICY "org_access_salary_slips" ON salary_slips
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_salary_slips_updated_at ON salary_slips;
CREATE TRIGGER update_salary_slips_updated_at
  BEFORE UPDATE ON salary_slips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Self-service: workers may read their own salary slips through workers.user_id.
DROP POLICY IF EXISTS "self_read_salary_slips" ON salary_slips;
CREATE POLICY "self_read_salary_slips" ON salary_slips
  FOR SELECT USING (
    worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
  );

-- =====================================================================
-- HR Module — Phase 1.C: Enhanced Worker Profile
-- =====================================================================

-- Personal
ALTER TABLE workers ADD COLUMN IF NOT EXISTS employment_type TEXT
  CHECK (employment_type IS NULL OR employment_type IN ('full_time', 'part_time', 'intern', 'contract', 'seasonal', 'probation'));
ALTER TABLE workers ADD COLUMN IF NOT EXISTS gender TEXT
  CHECK (gender IS NULL OR gender IN ('male', 'female'));
ALTER TABLE workers ADD COLUMN IF NOT EXISTS marital_status TEXT
  CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'divorced', 'widowed'));
ALTER TABLE workers ADD COLUMN IF NOT EXISTS number_of_children INTEGER NOT NULL DEFAULT 0
  CHECK (number_of_children >= 0);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cin_issue_date DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cin_issue_place TEXT;

-- Emergency contact
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;

-- Health
ALTER TABLE workers ADD COLUMN IF NOT EXISTS health_insurance_provider TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS health_insurance_number TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS blood_type TEXT
  CHECK (blood_type IS NULL OR blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'));

-- Contract
ALTER TABLE workers ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS probation_end_date DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS notice_period_days INTEGER NOT NULL DEFAULT 30
  CHECK (notice_period_days >= 0);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS confirmation_date DATE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS reporting_to UUID REFERENCES workers(id) ON DELETE SET NULL;

-- Profile / address
ALTER TABLE workers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS personal_email TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS permanent_address TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS current_address TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS educational_qualification TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS previous_work_experience JSONB NOT NULL DEFAULT '[]'::jsonb;

-- HR FK pointers (nullable; set by admin)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS holiday_list_id UUID REFERENCES holiday_lists(id) ON DELETE SET NULL;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS salary_structure_assignment_id UUID REFERENCES salary_structure_assignments(id) ON DELETE SET NULL;

-- Banking / tax
ALTER TABLE workers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS bank_rib TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS tax_identification_number TEXT;

-- Status (employment lifecycle)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated', 'probation'));

CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_workers_reporting_to ON workers(reporting_to) WHERE reporting_to IS NOT NULL;

-- Worker Documents
CREATE TABLE IF NOT EXISTS worker_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,

  document_type TEXT NOT NULL CHECK (document_type IN (
    'cin', 'passport', 'work_permit', 'contract', 'cnss_card', 'medical_certificate',
    'driving_license', 'pesticide_certification', 'training_certificate',
    'bank_details', 'tax_document', 'photo', 'other'
  )),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(worker_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_worker_documents_org ON worker_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_documents_worker ON worker_documents(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_documents_expiry ON worker_documents(expiry_date) WHERE expiry_date IS NOT NULL;

ALTER TABLE worker_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_worker_documents" ON worker_documents;
CREATE POLICY "org_access_worker_documents" ON worker_documents
  FOR ALL USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP POLICY IF EXISTS "self_read_worker_documents" ON worker_documents;
CREATE POLICY "self_read_worker_documents" ON worker_documents
  FOR SELECT USING (
    worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS update_worker_documents_updated_at ON worker_documents;
CREATE TRIGGER update_worker_documents_updated_at
  BEFORE UPDATE ON worker_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- HR Module — Phase 2: Operational HR
-- =====================================================================

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  grace_period_minutes INTEGER NOT NULL DEFAULT 15,
  -- Stored compute: handles end-time-after-midnight by adding 24h.
  working_hours NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN end_time > start_time THEN
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
      ELSE
        EXTRACT(EPOCH FROM ((end_time + INTERVAL '24 hours') - start_time)) / 3600
    END
  ) STORED,
  enable_auto_attendance BOOLEAN NOT NULL DEFAULT false,
  mark_late_after_minutes INTEGER,
  early_exit_before_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);
CREATE INDEX IF NOT EXISTS idx_shifts_org ON shifts(organization_id);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_shifts" ON shifts;
CREATE POLICY "org_access_shifts" ON shifts FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_shifts_updated_at ON shifts;
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Shift Assignments
CREATE TABLE IF NOT EXISTS shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_org ON shift_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_worker ON shift_assignments(worker_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift ON shift_assignments(shift_id);

ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_shift_assignments" ON shift_assignments;
CREATE POLICY "org_access_shift_assignments" ON shift_assignments FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

-- Shift Requests
CREATE TABLE IF NOT EXISTS shift_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  requested_shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  current_shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shift_requests_org_status ON shift_requests(organization_id, status);

ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_shift_requests" ON shift_requests;
CREATE POLICY "org_access_shift_requests" ON shift_requests FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

-- Onboarding Templates
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  designation TEXT,
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_org ON onboarding_templates(organization_id);

ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_onboarding_templates" ON onboarding_templates;
CREATE POLICY "org_access_onboarding_templates" ON onboarding_templates FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_onboarding_templates_updated_at ON onboarding_templates;
CREATE TRIGGER update_onboarding_templates_updated_at
  BEFORE UPDATE ON onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Onboarding Records (per worker)
CREATE TABLE IF NOT EXISTS onboarding_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_records_org ON onboarding_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_records_worker ON onboarding_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_records_status ON onboarding_records(organization_id, status);

ALTER TABLE onboarding_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_onboarding_records" ON onboarding_records;
CREATE POLICY "org_access_onboarding_records" ON onboarding_records FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_onboarding_records_updated_at ON onboarding_records;
CREATE TRIGGER update_onboarding_records_updated_at
  BEFORE UPDATE ON onboarding_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Separations (offboarding + FnF)
CREATE TABLE IF NOT EXISTS separations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  separation_type TEXT NOT NULL CHECK (separation_type IN (
    'resignation', 'termination', 'end_of_contract', 'retirement', 'death', 'dismissal'
  )),
  notice_date DATE NOT NULL,
  relieving_date DATE NOT NULL,
  exit_interview_conducted BOOLEAN NOT NULL DEFAULT false,
  exit_interview_notes TEXT,
  exit_feedback JSONB,
  fnf_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (fnf_status IN ('pending', 'processing', 'settled')),
  fnf_payables JSONB NOT NULL DEFAULT '[]'::jsonb,
  fnf_receivables JSONB NOT NULL DEFAULT '[]'::jsonb,
  fnf_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  fnf_total_payable NUMERIC NOT NULL DEFAULT 0,
  fnf_total_receivable NUMERIC NOT NULL DEFAULT 0,
  fnf_net_amount NUMERIC NOT NULL DEFAULT 0,
  fnf_settled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notice_period', 'relieved', 'settled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (relieving_date >= notice_date)
);
CREATE INDEX IF NOT EXISTS idx_separations_org ON separations(organization_id);
CREATE INDEX IF NOT EXISTS idx_separations_worker ON separations(worker_id);
CREATE INDEX IF NOT EXISTS idx_separations_status ON separations(organization_id, status);

ALTER TABLE separations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_separations" ON separations;
CREATE POLICY "org_access_separations" ON separations FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

DROP TRIGGER IF EXISTS update_separations_updated_at ON separations;
CREATE TRIGGER update_separations_updated_at
  BEFORE UPDATE ON separations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- HR Module — Phase 3: Administrative HR
-- =====================================================================

-- Expense Claim Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);
CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON expense_categories(organization_id);
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_expense_categories" ON expense_categories;
CREATE POLICY "org_access_expense_categories" ON expense_categories FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

-- Expense Claims
CREATE TABLE IF NOT EXISTS expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_tax NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,

  advance_id UUID REFERENCES payment_advances(id) ON DELETE SET NULL,
  advance_amount_allocated NUMERIC NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'partially_approved', 'rejected', 'paid', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  approval_history JSONB NOT NULL DEFAULT '[]'::jsonb,

  journal_entry_id UUID,
  cost_center JSONB,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_claims_org ON expense_claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_worker ON expense_claims(worker_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(organization_id, status);

ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_expense_claims" ON expense_claims;
CREATE POLICY "org_access_expense_claims" ON expense_claims FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));
DROP POLICY IF EXISTS "self_read_expense_claims" ON expense_claims;
CREATE POLICY "self_read_expense_claims" ON expense_claims FOR SELECT USING (
  worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);
DROP TRIGGER IF EXISTS update_expense_claims_updated_at ON expense_claims;
CREATE TRIGGER update_expense_claims_updated_at
  BEFORE UPDATE ON expense_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recruitment: Job Openings
CREATE TABLE IF NOT EXISTS job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  employment_type TEXT
    CHECK (employment_type IS NULL OR employment_type IN ('full_time', 'part_time', 'contract', 'seasonal')),
  worker_type worker_type,

  vacancies INTEGER NOT NULL DEFAULT 1 CHECK (vacancies >= 1),
  salary_range_min NUMERIC,
  salary_range_max NUMERIC,
  currency TEXT NOT NULL DEFAULT 'MAD',

  publish_date DATE,
  closing_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'on_hold', 'closed', 'cancelled')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  application_count INTEGER NOT NULL DEFAULT 0,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_openings_org_status ON job_openings(organization_id, status);

ALTER TABLE job_openings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_job_openings" ON job_openings;
CREATE POLICY "org_access_job_openings" ON job_openings FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));
DROP TRIGGER IF EXISTS update_job_openings_updated_at ON job_openings;
CREATE TRIGGER update_job_openings_updated_at
  BEFORE UPDATE ON job_openings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recruitment: Job Applicants
CREATE TABLE IF NOT EXISTS job_applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_opening_id UUID NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cin TEXT,
  resume_url TEXT,
  cover_letter_url TEXT,

  source TEXT NOT NULL DEFAULT 'direct'
    CHECK (source IN ('direct', 'referral', 'website', 'agency', 'other')),
  referred_by_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'screening', 'interview_scheduled', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn')),
  rating INTEGER CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  notes TEXT,
  tags TEXT[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_job_applicants_opening ON job_applicants(job_opening_id);
CREATE INDEX IF NOT EXISTS idx_job_applicants_status ON job_applicants(organization_id, status);

ALTER TABLE job_applicants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_job_applicants" ON job_applicants;
CREATE POLICY "org_access_job_applicants" ON job_applicants FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));
DROP TRIGGER IF EXISTS update_job_applicants_updated_at ON job_applicants;
CREATE TRIGGER update_job_applicants_updated_at
  BEFORE UPDATE ON job_applicants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recruitment: Interviews
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES job_applicants(id) ON DELETE CASCADE,
  job_opening_id UUID NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,

  round INTEGER NOT NULL DEFAULT 1,
  interview_type TEXT NOT NULL DEFAULT 'in_person'
    CHECK (interview_type IN ('phone', 'video', 'in_person')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,

  interviewer_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  feedback JSONB NOT NULL DEFAULT '[]'::jsonb,
  average_rating NUMERIC,

  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interviews_applicant ON interviews(applicant_id);
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_interviews" ON interviews;
CREATE POLICY "org_access_interviews" ON interviews FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

-- Performance: Appraisal Cycles
CREATE TABLE IF NOT EXISTS appraisal_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  self_assessment_deadline DATE,
  manager_assessment_deadline DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'self_assessment', 'manager_review', 'calibration', 'completed')),
  applicable_worker_types TEXT[] NOT NULL DEFAULT ARRAY['fixed_salary'],
  applicable_farm_ids UUID[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);
ALTER TABLE appraisal_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_appraisal_cycles" ON appraisal_cycles;
CREATE POLICY "org_access_appraisal_cycles" ON appraisal_cycles FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));
DROP TRIGGER IF EXISTS update_appraisal_cycles_updated_at ON appraisal_cycles;
CREATE TRIGGER update_appraisal_cycles_updated_at
  BEFORE UPDATE ON appraisal_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance: Appraisals
CREATE TABLE IF NOT EXISTS appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES appraisal_cycles(id) ON DELETE CASCADE,

  self_rating NUMERIC,
  self_reflections TEXT,

  manager_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  manager_rating NUMERIC,
  manager_feedback TEXT,

  kra_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,

  final_score NUMERIC,
  final_feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'self_assessment', 'manager_review', 'completed')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, cycle_id)
);
CREATE INDEX IF NOT EXISTS idx_appraisals_cycle ON appraisals(cycle_id);
ALTER TABLE appraisals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_appraisals" ON appraisals;
CREATE POLICY "org_access_appraisals" ON appraisals FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));
DROP POLICY IF EXISTS "self_read_appraisals" ON appraisals;
CREATE POLICY "self_read_appraisals" ON appraisals FOR SELECT USING (
  worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);
DROP TRIGGER IF EXISTS update_appraisals_updated_at ON appraisals;
CREATE TRIGGER update_appraisals_updated_at
  BEFORE UPDATE ON appraisals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance: Continuous Feedback
CREATE TABLE IF NOT EXISTS performance_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('peer', 'manager', 'subordinate', 'external')),
  review_period TEXT,
  rating INTEGER CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  strengths TEXT,
  improvements TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perf_feedback_worker ON performance_feedback(worker_id);
ALTER TABLE performance_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_perf_feedback" ON performance_feedback;
CREATE POLICY "org_access_perf_feedback" ON performance_feedback FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

-- =====================================================================
-- HR Module — Phase 4: Agricultural Differentiators
-- =====================================================================

-- Seasonal Campaigns
CREATE TABLE IF NOT EXISTS seasonal_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season_type TEXT NOT NULL CHECK (season_type IN ('planting', 'harvest', 'pruning', 'treatment', 'other')),
  crop_type TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_worker_count INTEGER,
  estimated_labor_budget NUMERIC,
  actual_labor_cost NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'recruiting', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_seasonal_campaigns_org ON seasonal_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_campaigns_status ON seasonal_campaigns(organization_id, status);
ALTER TABLE seasonal_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_seasonal_campaigns" ON seasonal_campaigns;
CREATE POLICY "org_access_seasonal_campaigns" ON seasonal_campaigns FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));
DROP TRIGGER IF EXISTS update_seasonal_campaigns_updated_at ON seasonal_campaigns;
CREATE TRIGGER update_seasonal_campaigns_updated_at
  BEFORE UPDATE ON seasonal_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Worker Qualifications (training matrix)
CREATE TABLE IF NOT EXISTS worker_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  qualification_type TEXT NOT NULL CHECK (qualification_type IN (
    'tractor_operation', 'pesticide_handling', 'first_aid', 'forklift',
    'irrigation_system', 'pruning', 'harvesting_technique', 'food_safety',
    'fire_safety', 'electrical', 'other'
  )),
  qualification_name TEXT NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE,
  issuing_authority TEXT,
  certificate_url TEXT,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, qualification_type)
);
CREATE INDEX IF NOT EXISTS idx_worker_qualifications_org ON worker_qualifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_qualifications_expiry ON worker_qualifications(expiry_date) WHERE expiry_date IS NOT NULL;
ALTER TABLE worker_qualifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_worker_qualifications" ON worker_qualifications;
CREATE POLICY "org_access_worker_qualifications" ON worker_qualifications FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));
DROP TRIGGER IF EXISTS update_worker_qualifications_updated_at ON worker_qualifications;
CREATE TRIGGER update_worker_qualifications_updated_at
  BEFORE UPDATE ON worker_qualifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Safety Incidents
CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  incident_date TIMESTAMPTZ NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'injury', 'near_miss', 'chemical_exposure', 'equipment_damage', 'fire', 'environmental', 'other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'serious', 'fatal')),
  worker_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  supervisor_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  location_description TEXT,
  root_cause TEXT,
  corrective_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  preventive_measures TEXT,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cnss_declaration BOOLEAN NOT NULL DEFAULT false,
  cnss_declaration_date DATE,
  cnss_declaration_reference TEXT,
  status TEXT NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported', 'investigating', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_org_date ON safety_incidents(organization_id, incident_date DESC);
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_safety_incidents" ON safety_incidents;
CREATE POLICY "org_access_safety_incidents" ON safety_incidents FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));
DROP TRIGGER IF EXISTS update_safety_incidents_updated_at ON safety_incidents;
CREATE TRIGGER update_safety_incidents_updated_at
  BEFORE UPDATE ON safety_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Worker Transport
CREATE TABLE IF NOT EXISTS worker_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  vehicle_id TEXT,
  driver_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  pickup_time TIME NOT NULL,
  destination TEXT NOT NULL,
  worker_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  capacity INTEGER,
  actual_count INTEGER,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_worker_transport_org_date ON worker_transport(organization_id, date DESC);
ALTER TABLE worker_transport ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_worker_transport" ON worker_transport;
CREATE POLICY "org_access_worker_transport" ON worker_transport FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

-- =====================================================================
-- HR Module — Phase 5: Advanced HR
-- =====================================================================

-- Grievances
CREATE TABLE IF NOT EXISTS grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  raised_by_worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  against_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  against_department TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  grievance_type TEXT NOT NULL CHECK (grievance_type IN (
    'workplace', 'colleague', 'department', 'policy', 'harassment', 'safety', 'other'
  )),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  resolution TEXT,
  resolution_date DATE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'acknowledged', 'investigating', 'resolved', 'escalated', 'closed')),
  attachments TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grievances_org_status ON grievances(organization_id, status);
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_grievances" ON grievances;
CREATE POLICY "org_access_grievances" ON grievances FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));
DROP POLICY IF EXISTS "self_read_grievances" ON grievances;
CREATE POLICY "self_read_grievances" ON grievances FOR SELECT USING (
  raised_by_worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);
DROP TRIGGER IF EXISTS update_grievances_updated_at ON grievances;
CREATE TRIGGER update_grievances_updated_at
  BEFORE UPDATE ON grievances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Training Programs
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  training_type TEXT
    CHECK (training_type IS NULL OR training_type IN ('safety', 'technical', 'certification', 'onboarding', 'other')),
  provider TEXT,
  duration_hours NUMERIC,
  cost_per_participant NUMERIC,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  recurrence TEXT
    CHECK (recurrence IS NULL OR recurrence IN ('annual', 'biannual', 'one_time')),
  applicable_worker_types TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_training_programs" ON training_programs;
CREATE POLICY "org_access_training_programs" ON training_programs FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));
DROP TRIGGER IF EXISTS update_training_programs_updated_at ON training_programs;
CREATE TRIGGER update_training_programs_updated_at
  BEFORE UPDATE ON training_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Training Enrollments
CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  enrolled_date DATE NOT NULL,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'enrolled'
    CHECK (status IN ('enrolled', 'in_progress', 'completed', 'failed', 'cancelled')),
  score NUMERIC,
  certificate_url TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, worker_id)
);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_worker ON training_enrollments(worker_id);
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_access_training_enrollments" ON training_enrollments;
CREATE POLICY "org_access_training_enrollments" ON training_enrollments FOR ALL
  USING (is_organization_member(organization_id))
  WITH CHECK (is_organization_member(organization_id));

-- =====================================================================
-- HR Module — Analytics Views
-- =====================================================================

DROP VIEW IF EXISTS workforce_summary CASCADE;
CREATE VIEW workforce_summary WITH (security_invoker = true) AS
SELECT
  organization_id,
  farm_id,
  COUNT(*) FILTER (WHERE worker_type = 'fixed_salary' AND is_active) AS fixed_salary_count,
  COUNT(*) FILTER (WHERE worker_type = 'daily_worker' AND is_active) AS daily_worker_count,
  COUNT(*) FILTER (WHERE worker_type = 'metayage' AND is_active) AS metayage_count,
  COUNT(*) FILTER (WHERE gender = 'female' AND is_active) AS female_count,
  COUNT(*) FILTER (WHERE is_cnss_declared AND is_active) AS cnss_covered_count,
  AVG(daily_rate) FILTER (WHERE worker_type = 'daily_worker') AS avg_daily_rate,
  AVG(monthly_salary) FILTER (WHERE worker_type = 'fixed_salary') AS avg_monthly_salary
FROM workers
WHERE deleted_at IS NULL
GROUP BY organization_id, farm_id;

CREATE OR REPLACE VIEW leave_balance_summary WITH (security_invoker = true) AS
SELECT
  la.organization_id,
  la.worker_id,
  w.first_name,
  w.last_name,
  lt.name AS leave_type,
  la.total_days,
  la.used_days,
  la.remaining_days,
  la.period_start,
  la.period_end
FROM leave_allocations la
JOIN workers w ON w.id = la.worker_id
JOIN leave_types lt ON lt.id = la.leave_type_id
WHERE la.period_end >= CURRENT_DATE;

CREATE OR REPLACE VIEW payroll_cost_summary WITH (security_invoker = true) AS
SELECT
  organization_id,
  farm_id,
  DATE_TRUNC('month', pay_period_start) AS month,
  COUNT(DISTINCT worker_id) AS workers_paid,
  SUM(gross_pay) AS total_gross,
  SUM(total_deductions) AS total_deductions,
  SUM(net_pay) AS total_net
FROM salary_slips
WHERE status != 'cancelled'
GROUP BY organization_id, farm_id, DATE_TRUNC('month', pay_period_start);

-- =====================================================================
-- WORKER PAYMENT HISTORY (per-worker aggregate for sparkline context)
-- =====================================================================
CREATE OR REPLACE VIEW worker_payment_history WITH (security_invoker = true) AS
SELECT
  w.id AS worker_id,
  w.first_name || ' ' || w.last_name AS worker_name,
  w.worker_type,
  COALESCE(pay.total_payments, 0) AS total_payments,
  COALESCE(pay.total_paid, 0) AS total_paid,
  COALESCE(pay.pending_amount, 0) AS pending_amount,
  COALESCE(pay.approved_amount, 0) AS approved_amount,
  pay.last_payment_date,
  COALESCE(pay.average_payment, 0) AS average_payment
FROM workers w
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total_payments,
    SUM(CASE WHEN pr.status = 'paid' THEN pr.net_amount ELSE 0 END) AS total_paid,
    SUM(CASE WHEN pr.status = 'pending' THEN pr.net_amount ELSE 0 END) AS pending_amount,
    SUM(CASE WHEN pr.status = 'approved' THEN pr.net_amount ELSE 0 END) AS approved_amount,
    MAX(pr.payment_date) AS last_payment_date,
    CASE WHEN COUNT(*) > 0
      THEN SUM(pr.net_amount) / COUNT(*)
      ELSE 0
    END AS average_payment
  FROM payment_records pr
  WHERE pr.worker_id = w.id
) pay ON true;

-- =====================================================================
-- SUPPORT SETTINGS (single global row — public read, system_admin write)
-- =====================================================================
CREATE TABLE IF NOT EXISTS support_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  email TEXT NOT NULL DEFAULT 'support@agrogina.com',
  phone TEXT NOT NULL DEFAULT '+212 600 000 000',
  whatsapp TEXT,
  address TEXT,
  hours TEXT,
  contact_email TEXT NOT NULL DEFAULT 'contact@agrogina.com',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT support_settings_singleton CHECK (id = TRUE)
);

INSERT INTO support_settings (id) VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE support_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_settings_public_read" ON support_settings;
CREATE POLICY "support_settings_public_read" ON support_settings
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "support_settings_admin_write" ON support_settings;
CREATE POLICY "support_settings_admin_write" ON support_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );

CREATE OR REPLACE FUNCTION update_support_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_settings_updated_at ON support_settings;
CREATE TRIGGER trg_support_settings_updated_at
  BEFORE UPDATE ON support_settings
  FOR EACH ROW EXECUTE FUNCTION update_support_settings_updated_at();

-- =====================================================================
-- LANDING SETTINGS (single global row — public read, system_admin write)
-- =====================================================================
CREATE TABLE IF NOT EXISTS landing_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  hero_stats JSONB NOT NULL DEFAULT '[
    {"value":"12.4k","label":"Exploitations actives"},
    {"value":"847k ha","label":"Surface monitorée"},
    {"value":"14","label":"Pays · MENA + EU"},
    {"value":"99.94%","label":"Disponibilité réseau"}
  ]'::jsonb,
  partners JSONB NOT NULL DEFAULT '[
    {"name":"Coopérative Atlas"},
    {"name":"OCP Agri"},
    {"name":"GlobalGAP"},
    {"name":"BIO Maroc"},
    {"name":"AgriBank"},
    {"name":"Crédit Agricole"},
    {"name":"INRA"},
    {"name":"Domaine Royal"}
  ]'::jsonb,
  testimonials JSONB NOT NULL DEFAULT '{
    "featured": {
      "quote":"Avant Agrogina, je remplissais des cahiers le soir. Aujourd''hui, j''ai une vision complète de mes 240 hectares depuis mon téléphone — et mes équipes savent exactement quoi faire le matin.",
      "author":"Zakaria Boutchamir",
      "role":"Ferme Mabella · 240 ha · Marrakech-Safi",
      "badge":"★★★★★ · Étude de cas"
    },
    "compact": [
      {"quote":"Le module RH a remplacé Excel et trois cahiers. Le contrôleur de la CNSS adore.","author":"Saida El Khouri","role":"Coopérative Atlas · 12 fermes"},
      {"quote":"Les alertes capteurs ont sauvé une parcelle d''agrumes du gel l''an dernier. Rentabilisé en une saison.","author":"Karim Benjelloun","role":"Domaine Agdal · 85 ha"}
    ]
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT landing_settings_singleton CHECK (id = TRUE)
);

INSERT INTO landing_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

ALTER TABLE landing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landing_settings_public_read" ON landing_settings;
CREATE POLICY "landing_settings_public_read" ON landing_settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "landing_settings_admin_write" ON landing_settings;
CREATE POLICY "landing_settings_admin_write" ON landing_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true AND r.name = 'system_admin'
    )
  );

DROP TRIGGER IF EXISTS trg_landing_settings_updated_at ON landing_settings;
CREATE TRIGGER trg_landing_settings_updated_at
  BEFORE UPDATE ON landing_settings
  FOR EACH ROW EXECUTE FUNCTION update_support_settings_updated_at();

-- =====================================================================
-- PERFORMANCE: Supabase linter fixes
-- 1) auth.<fn>() / current_setting() in RLS → wrap in (select ...) so
--    they're evaluated once per query instead of once per row.
-- 2) Drop duplicate indexes flagged by 0009_duplicate_index.
-- 3) Consolidate redundant permissive policies on selected tables.
-- =====================================================================

-- 1) Rewrite RLS policies in public schema. Idempotent: collapses
--    accidental double-wrapping (select (select auth.x())) → (select auth.x()).
DO $perf_rls_initplan$
DECLARE
  r RECORD;
  new_qual  TEXT;
  new_check TEXT;
  to_clause    TEXT;
  using_clause TEXT;
  check_clause TEXT;
  policy_kind  TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    new_qual  := r.qual;
    new_check := r.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual,
        '\mauth\.(uid|jwt|role|email)\(\)',
        '(select auth.\1())', 'g');
      new_qual := regexp_replace(new_qual,
        '\mcurrent_setting\(([^()]*)\)',
        '(select current_setting(\1))', 'g');
      -- collapse accidental double-wrap
      new_qual := regexp_replace(new_qual,
        '\(\s*select\s+\(\s*select\s+(auth\.(uid|jwt|role|email)\(\))\s*\)\s*\)',
        '(select \1)', 'g');
      new_qual := regexp_replace(new_qual,
        '\(\s*select\s+\(\s*select\s+(current_setting\([^()]*\))\s*\)\s*\)',
        '(select \1)', 'g');
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check,
        '\mauth\.(uid|jwt|role|email)\(\)',
        '(select auth.\1())', 'g');
      new_check := regexp_replace(new_check,
        '\mcurrent_setting\(([^()]*)\)',
        '(select current_setting(\1))', 'g');
      new_check := regexp_replace(new_check,
        '\(\s*select\s+\(\s*select\s+(auth\.(uid|jwt|role|email)\(\))\s*\)\s*\)',
        '(select \1)', 'g');
      new_check := regexp_replace(new_check,
        '\(\s*select\s+\(\s*select\s+(current_setting\([^()]*\))\s*\)\s*\)',
        '(select \1)', 'g');
    END IF;

    IF new_qual IS NOT DISTINCT FROM r.qual
       AND new_check IS NOT DISTINCT FROM r.with_check THEN
      CONTINUE;
    END IF;

    to_clause    := array_to_string(r.roles, ', ');
    using_clause := CASE WHEN new_qual  IS NOT NULL THEN format(' USING (%s)', new_qual)        ELSE '' END;
    check_clause := CASE WHEN new_check IS NOT NULL THEN format(' WITH CHECK (%s)', new_check)  ELSE '' END;
    policy_kind  := CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   r.policyname, r.schemaname, r.tablename);
    EXECUTE format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
                   r.policyname, r.schemaname, r.tablename,
                   policy_kind, r.cmd, to_clause, using_clause, check_clause);
  END LOOP;
END
$perf_rls_initplan$;

-- 2) Drop duplicate indexes (keep the one with the org-scoped name).
DROP INDEX IF EXISTS idx_account_mappings_org_override;
DROP INDEX IF EXISTS idx_ai_rec_citations_unique;
DROP INDEX IF EXISTS idx_biological_assets_type;
DROP INDEX IF EXISTS idx_crop_cycles_status;

-- 3) Consolidate the most flagged multiple-permissive overlaps.
--    Strategy: drop the broad admin_manage_* / admin_write_* catch-alls
--    where finer-grained org_* / read_* policies already cover the same
--    actions for the same role. Service-role-only policies are dropped
--    entirely because the service_role key bypasses RLS by design.

-- modules: admin_manage_modules covers ALL, admin_write_modules covers
-- INSERT/UPDATE/DELETE; both overlap with public_read_modules /
-- read_active_modules for SELECT. Keep admin_write_modules + the read
-- pair, drop admin_manage_modules.
DROP POLICY IF EXISTS admin_manage_modules ON modules;
-- modules public read + read_active overlap on SELECT — keep one.
DROP POLICY IF EXISTS read_active_modules ON modules;

-- roles: admin_manage_roles overlaps with org_*_roles + read_active_roles.
DROP POLICY IF EXISTS admin_manage_roles ON roles;
DROP POLICY IF EXISTS read_active_roles  ON roles;

-- account_mappings: admin_manage_account_mappings overlaps with the four
-- explicit insert/update/delete/read policies.
DROP POLICY IF EXISTS admin_manage_account_mappings ON account_mappings;

-- account_templates: admin_manage_account_templates overlaps with
-- read_published_account_templates for SELECT.
DROP POLICY IF EXISTS admin_manage_account_templates ON account_templates;

-- currencies: admin_manage_currencies overlaps with read_active_currencies.
DROP POLICY IF EXISTS admin_manage_currencies ON currencies;

-- support_settings + landing_settings: admin_write covers ALL (incl. SELECT)
-- and overlaps with the public_read policy. Restrict admin_write to
-- INSERT/UPDATE/DELETE so it no longer overlaps on SELECT.
DROP POLICY IF EXISTS support_settings_admin_write ON support_settings;
CREATE POLICY support_settings_admin_write ON support_settings
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = (select auth.uid())
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );
CREATE POLICY support_settings_admin_update ON support_settings
  FOR UPDATE TO public USING (
    EXISTS (
      SELECT 1 FROM organization_users ou JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = (select auth.uid())
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );
CREATE POLICY support_settings_admin_delete ON support_settings
  FOR DELETE TO public USING (
    EXISTS (
      SELECT 1 FROM organization_users ou JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = (select auth.uid())
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );

DROP POLICY IF EXISTS landing_settings_admin_write ON landing_settings;
CREATE POLICY landing_settings_admin_write ON landing_settings
  FOR INSERT TO public WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = (select auth.uid())
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );
CREATE POLICY landing_settings_admin_update ON landing_settings
  FOR UPDATE TO public USING (
    EXISTS (
      SELECT 1 FROM organization_users ou JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = (select auth.uid())
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );
CREATE POLICY landing_settings_admin_delete ON landing_settings
  FOR DELETE TO public USING (
    EXISTS (
      SELECT 1 FROM organization_users ou JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = (select auth.uid())
        AND ou.is_active = true
        AND r.name = 'system_admin'
    )
  );

-- Remaining permissive overlaps: drop catch-all/duplicate policies.
DROP POLICY IF EXISTS public_read_all_module_prices       ON module_prices;
DROP POLICY IF EXISTS public_read_all_subscription_pricing ON subscription_pricing;
DROP POLICY IF EXISTS service_role_all_user_profiles      ON user_profiles;
-- admin_read_* overlap with org_read_* (admin already passes via the
-- org_read predicate when they're org members; cross-org admin reads
-- happen via service role bypass).
DROP POLICY IF EXISTS admin_read_all_organizations  ON organizations;
DROP POLICY IF EXISTS admin_read_subscriptions      ON subscriptions;
DROP POLICY IF EXISTS admin_read_subscription_usage ON subscription_usage;
-- Marketplace + crop_templates legitimately need both — combine into
-- a single OR'd policy per cmd.
DO $merge_marketplace$
DECLARE
  buyers_qual TEXT;
  sellers_qual TEXT;
  buyers_upd TEXT;
  sellers_upd TEXT;
BEGIN
  SELECT qual INTO buyers_qual FROM pg_policies
    WHERE schemaname='public' AND tablename='marketplace_quote_requests'
      AND policyname='Users can view their own quote requests';
  SELECT qual INTO sellers_qual FROM pg_policies
    WHERE schemaname='public' AND tablename='marketplace_quote_requests'
      AND policyname='Sellers can view requests sent to them';
  IF buyers_qual IS NOT NULL AND sellers_qual IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own quote requests" ON marketplace_quote_requests;
    DROP POLICY IF EXISTS "Sellers can view requests sent to them"  ON marketplace_quote_requests;
    EXECUTE format(
      'CREATE POLICY marketplace_quote_requests_select ON marketplace_quote_requests FOR SELECT USING ((%s) OR (%s))',
      buyers_qual, sellers_qual);
  END IF;

  SELECT qual INTO buyers_upd FROM pg_policies
    WHERE schemaname='public' AND tablename='marketplace_quote_requests'
      AND policyname='Buyers can update their own requests';
  SELECT qual INTO sellers_upd FROM pg_policies
    WHERE schemaname='public' AND tablename='marketplace_quote_requests'
      AND policyname='Sellers can update their received requests';
  IF buyers_upd IS NOT NULL AND sellers_upd IS NOT NULL THEN
    DROP POLICY IF EXISTS "Buyers can update their own requests" ON marketplace_quote_requests;
    DROP POLICY IF EXISTS "Sellers can update their received requests" ON marketplace_quote_requests;
    EXECUTE format(
      'CREATE POLICY marketplace_quote_requests_update ON marketplace_quote_requests FOR UPDATE USING ((%s) OR (%s))',
      buyers_upd, sellers_upd);
  END IF;
END $merge_marketplace$;

-- Merge crop_templates SELECT (global + org) into a single OR'd policy.
DO $merge_crop_templates$
DECLARE
  q_global TEXT;
  q_org    TEXT;
BEGIN
  SELECT qual INTO q_global FROM pg_policies
    WHERE schemaname='public' AND tablename='crop_templates'
      AND policyname='crop_templates_select_global';
  SELECT qual INTO q_org    FROM pg_policies
    WHERE schemaname='public' AND tablename='crop_templates'
      AND policyname='crop_templates_select_org';
  IF q_global IS NOT NULL AND q_org IS NOT NULL THEN
    DROP POLICY IF EXISTS crop_templates_select_global ON crop_templates;
    DROP POLICY IF EXISTS crop_templates_select_org    ON crop_templates;
    EXECUTE format(
      'CREATE POLICY crop_templates_select ON crop_templates FOR SELECT USING ((%s) OR (%s))',
      q_global, q_org);
  END IF;
END $merge_crop_templates$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Org-scoped FKs for leave & separations
-- Prevents cross-org references where the parent FK was worker_id only.
-- ─────────────────────────────────────────────────────────────────────────────
DO $worker_org_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workers_id_org_unique' AND conrelid = 'workers'::regclass
  ) THEN
    ALTER TABLE workers
      ADD CONSTRAINT workers_id_org_unique UNIQUE (id, organization_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leave_allocations_worker_org_fkey'
      AND conrelid = 'leave_allocations'::regclass
  ) THEN
    ALTER TABLE leave_allocations
      DROP CONSTRAINT IF EXISTS leave_allocations_worker_id_fkey,
      ADD CONSTRAINT leave_allocations_worker_org_fkey
        FOREIGN KEY (worker_id, organization_id)
        REFERENCES workers(id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leave_applications_worker_org_fkey'
      AND conrelid = 'leave_applications'::regclass
  ) THEN
    ALTER TABLE leave_applications
      DROP CONSTRAINT IF EXISTS leave_applications_worker_id_fkey,
      ADD CONSTRAINT leave_applications_worker_org_fkey
        FOREIGN KEY (worker_id, organization_id)
        REFERENCES workers(id, organization_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'separations_worker_org_fkey'
      AND conrelid = 'separations'::regclass
  ) THEN
    ALTER TABLE separations
      DROP CONSTRAINT IF EXISTS separations_worker_id_fkey,
      ADD CONSTRAINT separations_worker_org_fkey
        FOREIGN KEY (worker_id, organization_id)
        REFERENCES workers(id, organization_id) ON DELETE CASCADE;
  END IF;
END $worker_org_fk$;
