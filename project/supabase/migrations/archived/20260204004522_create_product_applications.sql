-- =====================================================
-- Product Applications Table Migration
-- =====================================================
-- This migration creates the product_applications table
-- for tracking historical product applications on parcels.
--
-- Design Considerations:
-- 1. Links to parcels (for field-level history)
-- 2. Links to inventory (what was applied)
-- 3. Optional task_id (to link planned vs actual)
-- 4. Tracks quantity, area, cost for analytics
-- 5. RLS policies for multi-tenant isolation
-- =====================================================

-- Create the product_applications table
CREATE TABLE IF NOT EXISTS product_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  -- Product reference (links to inventory/items table)
  product_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,

  -- Application details
  application_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantity_used NUMERIC NOT NULL CHECK (quantity_used > 0),
  area_treated NUMERIC NOT NULL CHECK (area_treated > 0),

  -- Optional cost tracking (can be entered manually or calculated)
  cost NUMERIC CHECK (cost >= 0),
  currency TEXT DEFAULT 'MAD',

  -- Notes and additional info
  notes TEXT,

  -- Optional link to task (if application resulted from a planned task)
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT product_applications_area_positive CHECK (area_treated > 0)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_product_applications_org ON product_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_applications_farm ON product_applications(farm_id);
CREATE INDEX IF NOT EXISTS idx_product_applications_parcel ON product_applications(parcel_id);
CREATE INDEX IF NOT EXISTS idx_product_applications_product ON product_applications(product_id);

-- Date range queries for analytics
CREATE INDEX IF NOT EXISTS idx_product_applications_date ON product_applications(application_date DESC);

-- Task lookup (for planned vs actual reporting)
CREATE INDEX IF NOT EXISTS idx_product_applications_task ON product_applications(task_id);

-- Composite index for common queries (org + parcel + date)
CREATE INDEX IF NOT EXISTS idx_product_applications_org_parcel_date
  ON product_applications(organization_id, parcel_id, application_date DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_product_applications_updated_at
  BEFORE UPDATE ON product_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE product_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read applications if they belong to their organization
CREATE POLICY product_applications_select_org
  ON product_applications FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Users can insert applications for their organization
CREATE POLICY product_applications_insert_org
  ON product_applications FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Users can update applications for their organization
CREATE POLICY product_applications_update_org
  ON product_applications FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Users can delete applications for their organization
CREATE POLICY product_applications_delete_org
  ON product_applications FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE product_applications IS 'Historical record of product applications on parcels (fertilizers, pesticides, etc.)';
COMMENT ON COLUMN product_applications.parcel_id IS 'Optional: links to specific parcel. NULL if application was for entire farm';
COMMENT ON COLUMN product_applications.task_id IS 'Optional: links to task if application was planned. Enables "planned vs actual" reporting';
COMMENT ON COLUMN product_applications.area_treated IS 'Area in hectares that was treated with this product';
COMMENT ON COLUMN product_applications.quantity_used IS 'Quantity of product applied (in item unit)';
COMMENT ON COLUMN product_applications.cost IS 'Optional: cost of application. Can be entered manually or calculated from item cost';

-- =====================================================
-- HELPER VIEW FOR PARCEL APPLICATION HISTORY
-- =====================================================

-- View that joins applications with inventory details for easy querying
CREATE OR REPLACE VIEW v_parcel_applications AS
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
  -- Inventory details
  i.item_name AS product_name,
  i.default_unit AS product_unit,
  -- Farm and parcel names
  f.name AS farm_name,
  p.name AS parcel_name
FROM product_applications pa
JOIN items i ON i.id = pa.product_id
JOIN farms f ON f.id = pa.farm_id
LEFT JOIN parcels p ON p.id = pa.parcel_id;

COMMENT ON VIEW v_parcel_applications IS 'Denormalized view of product applications with related names for easy querying';

-- =====================================================
-- NOTE: Business Logic Location
-- =====================================================
-- All analytics, summaries, and business logic are implemented
-- in NestJS services (ProductApplicationsService, ParcelsService)
-- for easier maintenance and modification.
-- =====================================================
