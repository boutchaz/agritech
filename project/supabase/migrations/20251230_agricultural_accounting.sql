-- =====================================================
-- AGRICULTURAL FINANCIAL YEAR ACCOUNTING MODEL
-- Migration: 20251230_agricultural_accounting.sql
-- 
-- Implements multi-time-dimension financial accounting:
-- - Fiscal Years (legal/tax)
-- - Agricultural Campaigns (Campagne Agricole)
-- - Crop Cycles (production-based accounting)
-- - Biological Assets (IAS 41 compliance)
-- - Cost Attribution Engine
--
-- Morocco/MENA Context: Supports both calendar fiscal year
-- and agricultural campaign ("Campagne Agricole 2024/2025")
-- =====================================================

-- =====================================================
-- 1. FISCAL YEARS TABLE
-- Legal/tax fiscal year with organization-specific start months
-- =====================================================
CREATE TABLE IF NOT EXISTS fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Fiscal Year Definition
  name VARCHAR(100) NOT NULL,                    -- e.g., "FY 2025", "Exercice 2024"
  code VARCHAR(20) NOT NULL,                     -- e.g., "FY2025", "EX2024"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status Management
  status VARCHAR(20) DEFAULT 'open',             -- open, closing, closed
  is_current BOOLEAN DEFAULT false,              -- Only one can be current per org
  
  -- Period Configuration  
  period_type VARCHAR(20) DEFAULT 'monthly',     -- monthly, quarterly
  
  -- Closing Information
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  closing_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
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

-- =====================================================
-- 2. FISCAL PERIODS TABLE
-- Sub-periods within fiscal year (months or quarters)
-- =====================================================
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Period Definition
  period_number INTEGER NOT NULL,                -- 1-12 for monthly, 1-4 for quarterly
  name VARCHAR(100) NOT NULL,                    -- e.g., "January 2025", "Q1 2025"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'open',             -- open, closing, closed
  
  -- Closing
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(fiscal_year_id, period_number),
  CHECK (status IN ('open', 'closing', 'closed')),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_year ON fiscal_periods(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_dates ON fiscal_periods(start_date, end_date);

-- =====================================================
-- 3. AGRICULTURAL CAMPAIGNS TABLE
-- Campagne Agricole - agricultural production season
-- e.g., "Campagne 2024/2025" spanning Sep 2024 - Aug 2025
-- =====================================================
CREATE TABLE IF NOT EXISTS agricultural_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Campaign Definition
  name VARCHAR(100) NOT NULL,                    -- e.g., "Campagne 2024/2025"
  code VARCHAR(20) NOT NULL,                     -- e.g., "CA2024-25"
  description TEXT,
  
  -- Date Range (typically crosses calendar years)
  start_date DATE NOT NULL,                      -- e.g., 2024-09-01
  end_date DATE NOT NULL,                        -- e.g., 2025-08-31
  
  -- Campaign Type
  campaign_type VARCHAR(50) DEFAULT 'general',   -- general, rainfed, irrigated
  
  -- Status
  status VARCHAR(20) DEFAULT 'planned',          -- planned, active, completed, cancelled
  is_current BOOLEAN DEFAULT false,
  
  -- Linked Fiscal Years (campaign may span 2 fiscal years)
  primary_fiscal_year_id UUID REFERENCES fiscal_years(id),
  secondary_fiscal_year_id UUID REFERENCES fiscal_years(id),
  
  -- Aggregated Metrics (updated by triggers)
  total_area_ha NUMERIC DEFAULT 0,
  total_planned_production NUMERIC DEFAULT 0,
  total_actual_production NUMERIC DEFAULT 0,
  total_costs NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, code),
  CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  CHECK (campaign_type IN ('general', 'rainfed', 'irrigated', 'greenhouse')),
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org ON agricultural_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON agricultural_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_current ON agricultural_campaigns(organization_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON agricultural_campaigns(organization_id, status);

-- =====================================================
-- 4. CROP CYCLES TABLE
-- Production cycle from land prep to final sale
-- Enhanced from existing crops table structure
-- =====================================================
CREATE TABLE IF NOT EXISTS crop_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Location
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  
  -- Crop Information
  crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,  -- Optional link to crops table
  variety_id UUID REFERENCES crop_varieties(id),
  crop_type TEXT NOT NULL,                       -- e.g., "wheat", "olive", "tomato"
  variety_name TEXT,
  
  -- Cycle Identification
  cycle_code VARCHAR(50) NOT NULL,               -- e.g., "WHT-2024-P01", "OLV-2024/25-P03"
  cycle_name VARCHAR(255),                       -- Human-readable name
  
  -- Time Dimensions (CRITICAL for multi-year accounting)
  campaign_id UUID REFERENCES agricultural_campaigns(id),
  fiscal_year_id UUID REFERENCES fiscal_years(id),
  season TEXT,                                   -- spring, summer, autumn, winter
  
  -- Lifecycle Dates
  land_prep_date DATE,
  planting_date DATE,
  expected_harvest_start DATE,
  expected_harvest_end DATE,
  actual_harvest_start DATE,
  actual_harvest_end DATE,
  cycle_closed_date DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'planned',          -- planned, land_prep, growing, harvesting, completed, cancelled
  
  -- Area & Production
  planted_area_ha NUMERIC,
  harvested_area_ha NUMERIC,
  expected_yield_per_ha NUMERIC,
  expected_total_yield NUMERIC,
  actual_yield_per_ha NUMERIC,
  actual_total_yield NUMERIC,
  yield_unit TEXT DEFAULT 'kg',
  
  -- Quality
  average_quality_grade TEXT,
  quality_notes TEXT,
  
  -- Financial Summary (calculated/cached)
  total_costs NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  cost_per_ha NUMERIC,
  cost_per_unit NUMERIC,
  revenue_per_ha NUMERIC,
  profit_margin NUMERIC,
  
  -- Valuation (for WIP accounting)
  wip_valuation NUMERIC DEFAULT 0,               -- Work-in-progress value
  inventory_valuation NUMERIC DEFAULT 0,         -- Unsold harvest value
  valuation_method TEXT DEFAULT 'cost',          -- cost, fair_value, nrv
  last_valuation_date DATE,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
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

-- =====================================================
-- 5. BIOLOGICAL ASSETS TABLE (IAS 41 Compliance)
-- For perennials: orchards, vineyards, livestock
-- =====================================================
CREATE TABLE IF NOT EXISTS biological_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Location
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  
  -- Asset Classification (IAS 41)
  asset_type VARCHAR(50) NOT NULL,               -- bearer_plant, consumable_plant, livestock_bearer, livestock_consumable
  asset_category VARCHAR(100) NOT NULL,          -- e.g., "olive_trees", "citrus_grove", "vineyard", "dairy_cattle"
  asset_name VARCHAR(255) NOT NULL,
  asset_code VARCHAR(50) NOT NULL,
  
  -- Quantity & Area
  quantity INTEGER,                               -- Number of trees/animals
  area_ha NUMERIC,
  
  -- Lifecycle
  acquisition_date DATE NOT NULL,
  maturity_date DATE,                            -- When asset becomes productive
  expected_useful_life_years INTEGER,
  current_age_years INTEGER,
  
  -- Status
  status VARCHAR(30) DEFAULT 'immature',         -- immature, productive, declining, disposed
  is_productive BOOLEAN DEFAULT false,
  
  -- Initial Recognition (IAS 41)
  initial_cost NUMERIC NOT NULL DEFAULT 0,       -- Historical cost
  accumulated_depreciation NUMERIC DEFAULT 0,
  carrying_amount NUMERIC,                       -- Net book value (cost - depreciation)
  
  -- Fair Value (IAS 41)
  fair_value NUMERIC,
  fair_value_date DATE,
  fair_value_method TEXT,                        -- market_price, dcf, cost_approach
  fair_value_level INTEGER,                      -- 1, 2, or 3 per IFRS 13
  
  -- Production Capacity
  expected_annual_yield NUMERIC,
  expected_yield_unit TEXT DEFAULT 'kg',
  actual_ytd_yield NUMERIC DEFAULT 0,
  
  -- Depreciation (for bearer plants under cost model)
  depreciation_method TEXT DEFAULT 'straight_line',
  annual_depreciation NUMERIC,
  residual_value NUMERIC DEFAULT 0,
  
  -- Notes
  variety_info TEXT,
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
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

-- =====================================================
-- 6. BIOLOGICAL ASSET VALUATIONS TABLE
-- Track fair value changes over time (IAS 41)
-- =====================================================
CREATE TABLE IF NOT EXISTS biological_asset_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biological_asset_id UUID NOT NULL REFERENCES biological_assets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Valuation Date & Period
  valuation_date DATE NOT NULL,
  fiscal_year_id UUID REFERENCES fiscal_years(id),
  fiscal_period_id UUID REFERENCES fiscal_periods(id),
  
  -- Values
  previous_fair_value NUMERIC,
  current_fair_value NUMERIC NOT NULL,
  fair_value_change NUMERIC,                     -- Gain or loss
  
  -- Valuation Details
  valuation_method TEXT NOT NULL,                -- market_price, dcf, cost_approach
  fair_value_level INTEGER,                      -- 1, 2, or 3
  market_price_reference NUMERIC,
  discount_rate NUMERIC,                         -- For DCF
  
  -- Physical Changes
  quantity_change INTEGER DEFAULT 0,             -- Births, deaths, purchases, sales
  natural_increase NUMERIC DEFAULT 0,            -- Growth gain
  
  -- Harvest/Produce
  harvest_quantity NUMERIC DEFAULT 0,
  harvest_value NUMERIC DEFAULT 0,
  
  -- Journal Entry Link
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  -- Supporting Documentation
  valuation_report_url TEXT,
  appraiser_name TEXT,
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CHECK (valuation_method IN ('market_price', 'dcf', 'cost_approach')),
  CHECK (fair_value_level IN (1, 2, 3))
);

CREATE INDEX IF NOT EXISTS idx_bio_valuations_asset ON biological_asset_valuations(biological_asset_id);
CREATE INDEX IF NOT EXISTS idx_bio_valuations_date ON biological_asset_valuations(valuation_date DESC);
CREATE INDEX IF NOT EXISTS idx_bio_valuations_fiscal ON biological_asset_valuations(fiscal_year_id);

-- =====================================================
-- 7. CROP CYCLE COST ALLOCATIONS TABLE
-- Junction table for partial cost allocation to cycles
-- Supports shared costs (machinery, overhead) across cycles
-- =====================================================
CREATE TABLE IF NOT EXISTS crop_cycle_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Source (what is being allocated)
  source_type VARCHAR(50) NOT NULL,              -- cost, revenue, journal_item
  source_id UUID NOT NULL,                       -- FK to costs, revenues, or journal_items
  
  -- Target (where it's allocated)
  crop_cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
  
  -- Allocation
  allocation_percentage NUMERIC NOT NULL,        -- 0-100
  allocated_amount NUMERIC NOT NULL,
  
  -- Allocation Basis
  allocation_method TEXT DEFAULT 'manual',       -- manual, area, production, time
  allocation_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(source_type, source_id, crop_cycle_id),
  CHECK (source_type IN ('cost', 'revenue', 'journal_item')),
  CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  CHECK (allocation_method IN ('manual', 'area', 'production', 'time', 'equal'))
);

CREATE INDEX IF NOT EXISTS idx_cycle_alloc_source ON crop_cycle_allocations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_cycle_alloc_cycle ON crop_cycle_allocations(crop_cycle_id);

-- =====================================================
-- 8. ALTER EXISTING TABLES - Add Time Dimension FKs
-- =====================================================

-- Add columns to costs table
ALTER TABLE costs 
  ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES agricultural_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES fiscal_periods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_costs_crop_cycle ON costs(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_costs_campaign ON costs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_costs_fiscal_year ON costs(fiscal_year_id);

-- Add columns to revenues table  
ALTER TABLE revenues
  ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES agricultural_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES fiscal_periods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS harvest_record_id UUID REFERENCES harvest_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_revenues_crop_cycle ON revenues(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_revenues_campaign ON revenues(campaign_id);
CREATE INDEX IF NOT EXISTS idx_revenues_fiscal_year ON revenues(fiscal_year_id);

-- Add columns to journal_items table
ALTER TABLE journal_items
  ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES agricultural_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fiscal_period_id UUID REFERENCES fiscal_periods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS biological_asset_id UUID REFERENCES biological_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_journal_items_crop_cycle ON journal_items(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_campaign ON journal_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_fiscal_year ON journal_items(fiscal_year_id);

-- Add columns to harvest_records table
ALTER TABLE harvest_records
  ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES agricultural_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_harvest_records_crop_cycle ON harvest_records(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_harvest_records_campaign ON harvest_records(campaign_id);

-- Add columns to cost_centers table
ALTER TABLE cost_centers
  ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cost_centers_crop_cycle ON cost_centers(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent ON cost_centers(parent_id);

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Get fiscal year for a given date
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

-- Get campaign for a given date
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

-- Auto-populate fiscal year and campaign on costs
CREATE OR REPLACE FUNCTION auto_populate_cost_time_dimensions()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set fiscal year if not provided
  IF NEW.fiscal_year_id IS NULL AND NEW.date IS NOT NULL THEN
    NEW.fiscal_year_id := get_fiscal_year_for_date(NEW.organization_id, NEW.date);
  END IF;
  
  -- Auto-set campaign if not provided
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

-- Auto-populate fiscal year and campaign on revenues
DROP TRIGGER IF EXISTS trg_auto_revenue_time_dimensions ON revenues;
CREATE TRIGGER trg_auto_revenue_time_dimensions
  BEFORE INSERT OR UPDATE ON revenues
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_cost_time_dimensions();

-- Update crop cycle financial totals
CREATE OR REPLACE FUNCTION update_crop_cycle_financials()
RETURNS TRIGGER AS $$
DECLARE
  v_crop_cycle_id UUID;
BEGIN
  -- Determine which crop_cycle_id to update
  IF TG_OP = 'DELETE' THEN
    v_crop_cycle_id := OLD.crop_cycle_id;
  ELSE
    v_crop_cycle_id := NEW.crop_cycle_id;
  END IF;
  
  -- Skip if no crop cycle linked
  IF v_crop_cycle_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Recalculate totals
  UPDATE crop_cycles cc SET
    total_costs = COALESCE((
      SELECT SUM(amount) FROM costs WHERE crop_cycle_id = cc.id
    ), 0),
    total_revenue = COALESCE((
      SELECT SUM(amount) FROM revenues WHERE crop_cycle_id = cc.id
    ), 0),
    updated_at = NOW()
  WHERE id = v_crop_cycle_id;
  
  -- Update derived fields
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

-- =====================================================
-- 10. REPORTING VIEWS
-- =====================================================

-- Crop Cycle P&L View
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

-- Campaign Summary View
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

-- Fiscal Year vs Campaign Reconciliation View
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

-- =====================================================
-- 11. ROW LEVEL SECURITY POLICIES
-- =====================================================

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

-- =====================================================
-- 12. SEED DATA: MOROCCO CAMPAIGN TEMPLATES
-- =====================================================

-- Function to create default fiscal year
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

-- Function to create Morocco agricultural campaign
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
    (v_start_year || '-09-01')::DATE,   -- September start (typical Morocco)
    (v_end_year || '-08-31')::DATE,     -- August end
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

-- =====================================================
-- 13. UPDATE TRIGGERS FOR UPDATED_AT
-- =====================================================

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

-- =====================================================
-- END OF MIGRATION
-- =====================================================

COMMENT ON TABLE fiscal_years IS 'Legal/tax fiscal years with organization-specific configuration';
COMMENT ON TABLE fiscal_periods IS 'Sub-periods within fiscal years (monthly or quarterly)';
COMMENT ON TABLE agricultural_campaigns IS 'Agricultural production campaigns (Campagne Agricole) that may span calendar years';
COMMENT ON TABLE crop_cycles IS 'Production cycles from land preparation to sale, with full cost/revenue attribution';
COMMENT ON TABLE biological_assets IS 'Perennial biological assets (orchards, livestock) per IAS 41';
COMMENT ON TABLE biological_asset_valuations IS 'Fair value tracking for biological assets per IAS 41';
COMMENT ON TABLE crop_cycle_allocations IS 'Partial cost/revenue allocation to crop cycles for shared resources';
