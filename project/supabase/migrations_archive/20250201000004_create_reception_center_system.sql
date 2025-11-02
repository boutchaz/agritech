-- =====================================================
-- Migration: Reception Center System (Using Existing Warehouses)
-- Description: Extend warehouses for reception capability and create reception batches for harvest quality control
-- =====================================================

-- =====================================================
-- 1. Extend Warehouses Table for Reception Functionality
-- =====================================================

-- Add reception-specific fields to warehouses
ALTER TABLE warehouses
ADD COLUMN IF NOT EXISTS is_reception_center BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reception_type TEXT CHECK (reception_type IN (
  'general',      -- General purpose
  'olivier',      -- Olive-specific
  'viticole',     -- Wine/vineyard-specific
  'laitier',      -- Dairy-specific
  'fruiter',      -- Fruit-specific
  'legumier'      -- Vegetable-specific
)),
ADD COLUMN IF NOT EXISTS has_weighing_station BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_quality_lab BOOLEAN DEFAULT false;

-- Create index for reception centers
CREATE INDEX IF NOT EXISTS idx_warehouses_reception_center ON warehouses(is_reception_center) WHERE is_reception_center = true;

-- Comments
COMMENT ON COLUMN warehouses.is_reception_center IS 'Whether this warehouse also functions as a reception center for harvests';
COMMENT ON COLUMN warehouses.reception_type IS 'Crop-specific reception type if this is a reception center';
COMMENT ON COLUMN warehouses.has_weighing_station IS 'Has equipment for weighing incoming harvests';
COMMENT ON COLUMN warehouses.has_quality_lab IS 'Has facilities for quality control testing';

-- =====================================================
-- 2. Reception Batches Table
-- =====================================================
CREATE TABLE IF NOT EXISTS reception_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT, -- Warehouse acting as reception center

  -- Source Information
  harvest_id UUID REFERENCES harvest_records(id) ON DELETE SET NULL,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE RESTRICT,
  crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
  culture_type TEXT,

  -- Batch Identification
  batch_code TEXT NOT NULL,
  reception_date DATE NOT NULL,
  reception_time TIME DEFAULT CURRENT_TIME,

  -- Weight & Quantity
  weight DECIMAL(10, 2) NOT NULL,
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  quantity DECIMAL(10, 2),
  quantity_unit TEXT,

  -- Quality Control
  quality_grade TEXT CHECK (quality_grade IN ('A', 'B', 'C', 'Extra', 'First', 'Second', 'Third')),
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  quality_notes TEXT,
  humidity_percentage DECIMAL(5, 2),
  maturity_level TEXT,
  temperature DECIMAL(4, 1),
  moisture_content DECIMAL(5, 2),

  -- Workers Involved
  received_by UUID REFERENCES workers(id) ON DELETE SET NULL,
  quality_checked_by UUID REFERENCES workers(id) ON DELETE SET NULL,

  -- Decision Point
  decision TEXT NOT NULL CHECK (decision IN (
    'pending',           -- Awaiting decision
    'direct_sale',       -- Sell immediately
    'storage',           -- Keep in warehouse/move to different warehouse
    'transformation',    -- Send to transformation
    'rejected'           -- Reject batch
  )) DEFAULT 'pending',

  -- Decision Links
  destination_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL, -- If moved to different warehouse
  transformation_order_id UUID, -- Future: transformation orders
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,

  -- Stock Entry Link (after decision)
  stock_entry_id UUID REFERENCES stock_entries(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN (
    'received',          -- Just received at reception center
    'quality_checked',   -- Quality control completed
    'decision_made',     -- Decision taken (sale/storage/transform/reject)
    'processed',         -- Processed (moved to stock/sold/transformed)
    'cancelled'          -- Cancelled
  )),

  -- Photos & Documentation
  photos JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,

  -- Additional Information
  notes TEXT,
  lot_code TEXT, -- Additional lot identifier

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id),

  -- Constraints
  CONSTRAINT unique_reception_batch_code UNIQUE(organization_id, batch_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reception_batches_organization ON reception_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_reception_batches_warehouse ON reception_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_reception_batches_harvest ON reception_batches(harvest_id);
CREATE INDEX IF NOT EXISTS idx_reception_batches_parcel ON reception_batches(parcel_id);
CREATE INDEX IF NOT EXISTS idx_reception_batches_date ON reception_batches(reception_date DESC);
CREATE INDEX IF NOT EXISTS idx_reception_batches_status ON reception_batches(status);
CREATE INDEX IF NOT EXISTS idx_reception_batches_decision ON reception_batches(decision);
CREATE INDEX IF NOT EXISTS idx_reception_batches_batch_code ON reception_batches(batch_code);

-- RLS Policies
ALTER TABLE reception_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reception batches in their organization" ON reception_batches;
CREATE POLICY "Users can view reception batches in their organization"
  ON reception_batches FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage reception batches in their organization" ON reception_batches;
CREATE POLICY "Users can manage reception batches in their organization"
  ON reception_batches FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

-- Comments
COMMENT ON TABLE reception_batches IS 'Reception batches tracking harvest reception, quality control, and decision workflow';
COMMENT ON COLUMN reception_batches.warehouse_id IS 'Warehouse acting as reception center where batch was received';
COMMENT ON COLUMN reception_batches.destination_warehouse_id IS 'Destination warehouse if batch is moved after reception';

-- =====================================================
-- 3. Update harvest_records Table
-- =====================================================
ALTER TABLE harvest_records
ADD COLUMN IF NOT EXISTS reception_batch_id UUID REFERENCES reception_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_harvest_records_reception_batch ON harvest_records(reception_batch_id);

COMMENT ON COLUMN harvest_records.reception_batch_id IS 'Reference to reception batch created from this harvest';

-- =====================================================
-- 4. Update stock_entries Table
-- =====================================================
ALTER TABLE stock_entries
ADD COLUMN IF NOT EXISTS reception_batch_id UUID REFERENCES reception_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_entries_reception_batch ON stock_entries(reception_batch_id);

COMMENT ON COLUMN stock_entries.reception_batch_id IS 'Reference to reception batch if entry created from reception';

-- =====================================================
-- 5. Function: Generate Reception Batch Code
-- =====================================================
CREATE OR REPLACE FUNCTION generate_reception_batch_code(
  p_organization_id UUID,
  p_warehouse_id UUID,
  p_culture_type TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_warehouse_name TEXT;
  v_culture_prefix TEXT;
  v_sequence_number INTEGER;
  v_batch_code TEXT;
  v_warehouse_code TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Get warehouse name
  SELECT name INTO v_warehouse_name
  FROM warehouses
  WHERE id = p_warehouse_id;

  IF v_warehouse_name IS NULL THEN
    RAISE EXCEPTION 'Warehouse not found';
  END IF;

  -- Create warehouse code from first 2 letters of name
  v_warehouse_code := UPPER(LEFT(REGEXP_REPLACE(v_warehouse_name, '[^A-Za-z]', '', 'g'), 2));
  IF LENGTH(v_warehouse_code) < 2 THEN
    v_warehouse_code := LPAD(v_warehouse_code, 2, 'X');
  END IF;

  -- Get culture prefix (first 4 chars, uppercase)
  v_culture_prefix := UPPER(LEFT(COALESCE(p_culture_type, 'GENE'), 4));

  -- Get next sequence number for this org/warehouse/culture/year
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(SPLIT_PART(batch_code, '-', 5), '[^0-9]', '', 'g'), '') AS INTEGER)
  ), 0) + 1
  INTO v_sequence_number
  FROM reception_batches
  WHERE organization_id = p_organization_id
    AND warehouse_id = p_warehouse_id
    AND batch_code LIKE 'LOT-' || v_year || '-' || v_culture_prefix || '-%'
    AND EXTRACT(YEAR FROM reception_date) = EXTRACT(YEAR FROM CURRENT_DATE);

  -- Format: LOT-YYYY-CULTURE-WH-NNNN
  -- Example: LOT-2025-OLIV-MA-0035
  v_batch_code := 'LOT-' || v_year || '-' || v_culture_prefix || '-' ||
                  v_warehouse_code || '-' ||
                  LPAD(v_sequence_number::TEXT, 4, '0');

  RETURN v_batch_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_reception_batch_code IS 'Generate unique batch code in format LOT-YYYY-CULTURE-WH-NNNN';

-- =====================================================
-- 6. Function: Create Stock Entry from Reception Batch
-- =====================================================
CREATE OR REPLACE FUNCTION create_stock_entry_from_reception_batch(
  p_reception_batch_id UUID,
  p_destination_warehouse_id UUID,
  p_item_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_batch reception_batches%ROWTYPE;
  v_stock_entry_id UUID;
  v_entry_number TEXT;
  v_quantity DECIMAL(10, 2);
  v_unit TEXT;
BEGIN
  -- Get reception batch
  SELECT * INTO v_batch
  FROM reception_batches
  WHERE id = p_reception_batch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reception batch not found';
  END IF;

  IF v_batch.status = 'processed' THEN
    RAISE EXCEPTION 'Reception batch already processed';
  END IF;

  -- Determine quantity and unit
  v_quantity := COALESCE(v_batch.quantity, v_batch.weight);
  v_unit := COALESCE(v_batch.quantity_unit, v_batch.weight_unit);

  -- Generate entry number
  SELECT 'MR-RCP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
         LPAD((
           SELECT COALESCE(MAX(
             CAST(NULLIF(REGEXP_REPLACE(SPLIT_PART(entry_number, '-', 4), '[^0-9]', '', 'g'), '') AS INTEGER)
           ), 0) + 1
           FROM stock_entries
           WHERE organization_id = v_batch.organization_id
             AND entry_number LIKE 'MR-RCP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'
         )::TEXT, 4, '0')
  INTO v_entry_number;

  -- Determine if it's a transfer or receipt
  -- If destination is same as reception warehouse, it's just a receipt (stays in place)
  -- If destination is different, it's a transfer
  IF p_destination_warehouse_id = v_batch.warehouse_id THEN
    -- Material Receipt (stays at reception warehouse)
    INSERT INTO stock_entries (
      organization_id,
      entry_type,
      entry_number,
      entry_date,
      to_warehouse_id,
      reference_type,
      reference_id,
      reference_number,
      reception_batch_id,
      purpose,
      status,
      created_by
    ) VALUES (
      v_batch.organization_id,
      'Material Receipt',
      v_entry_number,
      v_batch.reception_date,
      p_destination_warehouse_id,
      'reception_batch',
      v_batch.id,
      v_batch.batch_code,
      p_reception_batch_id,
      'Reception from ' || v_batch.batch_code,
      'Draft',
      v_batch.created_by
    ) RETURNING id INTO v_stock_entry_id;
  ELSE
    -- Stock Transfer (move to different warehouse)
    INSERT INTO stock_entries (
      organization_id,
      entry_type,
      entry_number,
      entry_date,
      from_warehouse_id,
      to_warehouse_id,
      reference_type,
      reference_id,
      reference_number,
      reception_batch_id,
      purpose,
      status,
      created_by
    ) VALUES (
      v_batch.organization_id,
      'Stock Transfer',
      REPLACE(v_entry_number, 'MR-RCP', 'ST-RCP'),
      v_batch.reception_date,
      v_batch.warehouse_id,
      p_destination_warehouse_id,
      'reception_batch',
      v_batch.id,
      v_batch.batch_code,
      p_reception_batch_id,
      'Transfer from reception ' || v_batch.batch_code,
      'Draft',
      v_batch.created_by
    ) RETURNING id INTO v_stock_entry_id;
  END IF;

  -- Create stock entry item
  INSERT INTO stock_entry_items (
    stock_entry_id,
    item_id,
    quantity,
    unit,
    batch_number,
    notes
  ) VALUES (
    v_stock_entry_id,
    p_item_id,
    v_quantity,
    v_unit,
    v_batch.batch_code,
    'Quality: ' || COALESCE(v_batch.quality_grade, 'N/A') ||
    ', Score: ' || COALESCE(v_batch.quality_score::TEXT, 'N/A')
  );

  -- Update reception batch
  UPDATE reception_batches
  SET
    stock_entry_id = v_stock_entry_id,
    destination_warehouse_id = p_destination_warehouse_id,
    decision = 'storage',
    status = 'decision_made',
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_reception_batch_id;

  RETURN v_stock_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_stock_entry_from_reception_batch IS 'Create Material Receipt or Stock Transfer from reception batch depending on destination';

-- =====================================================
-- 7. Function: Create Sales Order from Reception Batch
-- =====================================================
CREATE OR REPLACE FUNCTION create_sales_order_from_reception_batch(
  p_reception_batch_id UUID,
  p_customer_id UUID,
  p_item_id UUID,
  p_unit_price DECIMAL(12, 2)
)
RETURNS UUID AS $$
DECLARE
  v_batch reception_batches%ROWTYPE;
  v_sales_order_id UUID;
  v_order_number TEXT;
  v_quantity DECIMAL(10, 2);
  v_unit TEXT;
BEGIN
  -- Get reception batch
  SELECT * INTO v_batch
  FROM reception_batches
  WHERE id = p_reception_batch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reception batch not found';
  END IF;

  IF v_batch.status = 'processed' THEN
    RAISE EXCEPTION 'Reception batch already processed';
  END IF;

  -- Determine quantity and unit
  v_quantity := COALESCE(v_batch.quantity, v_batch.weight);
  v_unit := COALESCE(v_batch.quantity_unit, v_batch.weight_unit);

  -- Generate order number
  SELECT 'SO-RCP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
         LPAD((
           SELECT COALESCE(MAX(
             CAST(NULLIF(REGEXP_REPLACE(SPLIT_PART(order_number, '-', 4), '[^0-9]', '', 'g'), '') AS INTEGER)
           ), 0) + 1
           FROM sales_orders
           WHERE organization_id = v_batch.organization_id
             AND order_number LIKE 'SO-RCP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'
         )::TEXT, 4, '0')
  INTO v_order_number;

  -- Create sales order
  INSERT INTO sales_orders (
    organization_id,
    customer_id,
    order_number,
    order_date,
    status,
    notes,
    created_by
  ) VALUES (
    v_batch.organization_id,
    p_customer_id,
    v_order_number,
    v_batch.reception_date,
    'draft',
    'Direct sale from reception batch ' || v_batch.batch_code,
    v_batch.created_by
  ) RETURNING id INTO v_sales_order_id;

  -- Create sales order item
  INSERT INTO sales_order_items (
    sales_order_id,
    item_name,
    description,
    quantity,
    unit,
    rate
  ) VALUES (
    v_sales_order_id,
    COALESCE(v_batch.culture_type, 'Product') || ' - ' || v_batch.batch_code,
    'Quality: ' || COALESCE(v_batch.quality_grade, 'N/A'),
    v_quantity,
    v_unit,
    p_unit_price
  );

  -- Update reception batch
  UPDATE reception_batches
  SET
    sales_order_id = v_sales_order_id,
    decision = 'direct_sale',
    status = 'decision_made',
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_reception_batch_id;

  RETURN v_sales_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_sales_order_from_reception_batch IS 'Create Sales Order from reception batch for direct sale';

-- =====================================================
-- 8. Trigger: Update Reception Batch Status
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_reception_batch_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When quality check is done
  IF NEW.quality_checked_by IS NOT NULL AND (OLD.quality_checked_by IS NULL OR OLD IS NULL) THEN
    NEW.status := 'quality_checked';
  END IF;

  -- When decision is made
  IF NEW.decision != 'pending' AND (OLD IS NULL OR OLD.decision = 'pending') THEN
    IF NEW.status IN ('received', 'quality_checked') THEN
      NEW.status := 'decision_made';
    END IF;
  END IF;

  -- When stock entry or sales order is linked
  IF (NEW.stock_entry_id IS NOT NULL OR NEW.sales_order_id IS NOT NULL)
     AND NEW.status = 'decision_made' THEN
    NEW.status := 'processed';
  END IF;

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reception_batch_status_update ON reception_batches;
CREATE TRIGGER trigger_reception_batch_status_update
  BEFORE INSERT OR UPDATE ON reception_batches
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_reception_batch_status();
