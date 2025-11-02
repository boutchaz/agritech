-- Stock Management Enhancements - Priority 2 & 3 Features
-- Implements Valuation Methods, Serial/Batch Tracking, and Advanced Features

-- =====================================================
-- 1. Add Valuation Method to Inventory Items
-- =====================================================
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS valuation_method TEXT DEFAULT 'Average'
CHECK (valuation_method IN ('FIFO', 'LIFO', 'Average'));

ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS enable_batch_tracking BOOLEAN DEFAULT FALSE;

ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS enable_serial_tracking BOOLEAN DEFAULT FALSE;

ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS has_expiry_date BOOLEAN DEFAULT FALSE;

ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER; -- Days until expiry after receipt

-- Add index for valuation queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_valuation ON inventory_items(valuation_method);

COMMENT ON COLUMN inventory_items.valuation_method IS 'Inventory valuation method: FIFO, LIFO, or Average';
COMMENT ON COLUMN inventory_items.enable_batch_tracking IS 'Enable batch-wise inventory tracking';
COMMENT ON COLUMN inventory_items.enable_serial_tracking IS 'Enable serial number tracking (unique per item)';

-- =====================================================
-- 2. Stock Valuation Table (for FIFO/LIFO tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_valuation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Item and Warehouse
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

  -- Valuation Details
  quantity DECIMAL(12, 3) NOT NULL,
  cost_per_unit DECIMAL(12, 2) NOT NULL,
  total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,

  -- Valuation Date and Reference
  valuation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stock_entry_id UUID REFERENCES stock_entries(id) ON DELETE SET NULL,

  -- Batch/Serial Information
  batch_number TEXT,
  serial_number TEXT,

  -- For FIFO/LIFO: Track remaining quantity
  remaining_quantity DECIMAL(12, 3) NOT NULL DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT positive_remaining CHECK (remaining_quantity >= 0),
  CONSTRAINT unique_serial_number UNIQUE (serial_number, item_id) INITIALLY DEFERRED
);

-- Indexes
CREATE INDEX idx_stock_valuation_org ON stock_valuation(organization_id);
CREATE INDEX idx_stock_valuation_item ON stock_valuation(item_id);
CREATE INDEX idx_stock_valuation_warehouse ON stock_valuation(warehouse_id);
CREATE INDEX idx_stock_valuation_date ON stock_valuation(valuation_date DESC);
CREATE INDEX idx_stock_valuation_batch ON stock_valuation(batch_number) WHERE batch_number IS NOT NULL;
CREATE INDEX idx_stock_valuation_serial ON stock_valuation(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX idx_stock_valuation_remaining ON stock_valuation(item_id, warehouse_id, remaining_quantity)
  WHERE remaining_quantity > 0;

-- RLS
ALTER TABLE stock_valuation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock valuation in their organization"
  ON stock_valuation FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can manage stock valuation"
  ON stock_valuation FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 3. Batch Master Table (for batch tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Batch Information
  batch_number TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

  -- Receipt Information
  received_date DATE NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,

  -- Supplier Information
  supplier_id UUID REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),

  -- Quantity Tracking
  initial_quantity DECIMAL(12, 3) NOT NULL,
  current_quantity DECIMAL(12, 3) NOT NULL DEFAULT 0,

  -- Cost Information
  cost_per_unit DECIMAL(12, 2),

  -- Status
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Recalled', 'Exhausted')),

  -- Additional Information
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_batch_per_item UNIQUE (organization_id, item_id, batch_number),
  CONSTRAINT valid_dates CHECK (
    (manufacturing_date IS NULL OR expiry_date IS NULL) OR
    (manufacturing_date <= expiry_date)
  )
);

-- Indexes
CREATE INDEX idx_batches_org ON inventory_batches(organization_id);
CREATE INDEX idx_batches_item ON inventory_batches(item_id);
CREATE INDEX idx_batches_number ON inventory_batches(batch_number);
CREATE INDEX idx_batches_expiry ON inventory_batches(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_batches_status ON inventory_batches(status);

-- RLS
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view batches in their organization"
  ON inventory_batches FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage batches in their organization"
  ON inventory_batches FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 4. Serial Number Master Table
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Serial Information
  serial_number TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,

  -- Location
  warehouse_id UUID REFERENCES warehouses(id),

  -- Status
  status TEXT DEFAULT 'Available' CHECK (status IN (
    'Available',   -- In stock
    'Issued',      -- Issued/Sold
    'Defective',   -- Defective/Damaged
    'Returned',    -- Customer return
    'In Transit'   -- Being transferred
  )),

  -- Receipt Information
  received_date DATE,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),

  -- Issue Information
  issued_date DATE,
  issued_to TEXT,

  -- Warranty Information
  warranty_expiry_date DATE,

  -- Cost
  cost_per_unit DECIMAL(12, 2),

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_serial_per_org UNIQUE (organization_id, serial_number, item_id)
);

-- Indexes
CREATE INDEX idx_serial_org ON inventory_serial_numbers(organization_id);
CREATE INDEX idx_serial_item ON inventory_serial_numbers(item_id);
CREATE INDEX idx_serial_number ON inventory_serial_numbers(serial_number);
CREATE INDEX idx_serial_status ON inventory_serial_numbers(status);
CREATE INDEX idx_serial_warehouse ON inventory_serial_numbers(warehouse_id) WHERE warehouse_id IS NOT NULL;

-- RLS
ALTER TABLE inventory_serial_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view serial numbers in their organization"
  ON inventory_serial_numbers FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage serial numbers in their organization"
  ON inventory_serial_numbers FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 5. Stock Closing Entry (Period-end Closing)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_closing_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Closing Period
  closing_date DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fiscal_period TEXT, -- 'Q1', 'Q2', 'Q3', 'Q4', 'Annual'

  -- Status
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Posted', 'Cancelled')),

  -- Totals
  total_quantity DECIMAL(12, 3),
  total_valuation DECIMAL(12, 2),

  -- Notes
  notes TEXT,

  -- Posting Information
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES user_profiles(id),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_closing_per_period UNIQUE (organization_id, closing_date, fiscal_period)
);

-- Indexes
CREATE INDEX idx_closing_org ON stock_closing_entries(organization_id);
CREATE INDEX idx_closing_date ON stock_closing_entries(closing_date DESC);
CREATE INDEX idx_closing_status ON stock_closing_entries(status);

-- RLS
ALTER TABLE stock_closing_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view closings in their organization"
  ON stock_closing_entries FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage closings in their organization"
  ON stock_closing_entries FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 6. Stock Closing Items (Snapshot of inventory)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_closing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_id UUID NOT NULL REFERENCES stock_closing_entries(id) ON DELETE CASCADE,

  -- Item and Warehouse
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),

  -- Quantity and Valuation
  closing_quantity DECIMAL(12, 3) NOT NULL,
  closing_rate DECIMAL(12, 2) NOT NULL,
  closing_value DECIMAL(12, 2) GENERATED ALWAYS AS (closing_quantity * closing_rate) STORED,

  -- Batch/Serial
  batch_number TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_closing_items_closing ON stock_closing_items(closing_id);
CREATE INDEX idx_closing_items_item ON stock_closing_items(item_id);
CREATE INDEX idx_closing_items_warehouse ON stock_closing_items(warehouse_id);

-- RLS
ALTER TABLE stock_closing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view closing items in their organization"
  ON stock_closing_items FOR SELECT
  USING (
    closing_id IN (
      SELECT id FROM stock_closing_entries WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 7. Helper Functions
-- =====================================================

-- Function to get current stock value for an item using specified valuation method
CREATE OR REPLACE FUNCTION get_item_stock_value(
  p_item_id UUID,
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
  v_valuation_method TEXT;
  v_total_value DECIMAL(12, 2) := 0;
BEGIN
  -- Get valuation method
  SELECT valuation_method INTO v_valuation_method
  FROM inventory_items
  WHERE id = p_item_id;

  -- Calculate based on method
  CASE v_valuation_method
    WHEN 'Average' THEN
      SELECT
        COALESCE(SUM(total_cost), 0)
      INTO v_total_value
      FROM stock_valuation
      WHERE item_id = p_item_id
        AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
        AND remaining_quantity > 0;

    WHEN 'FIFO' THEN
      -- For FIFO, sum oldest entries first
      SELECT
        COALESCE(SUM(remaining_quantity * cost_per_unit), 0)
      INTO v_total_value
      FROM stock_valuation
      WHERE item_id = p_item_id
        AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
        AND remaining_quantity > 0
      ORDER BY valuation_date ASC;

    WHEN 'LIFO' THEN
      -- For LIFO, sum newest entries first
      SELECT
        COALESCE(SUM(remaining_quantity * cost_per_unit), 0)
      INTO v_total_value
      FROM stock_valuation
      WHERE item_id = p_item_id
        AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
        AND remaining_quantity > 0
      ORDER BY valuation_date DESC;
  END CASE;

  RETURN v_total_value;
END;
$$ LANGUAGE plpgsql;

-- Function to get expiring items
CREATE OR REPLACE FUNCTION get_expiring_items(
  p_organization_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  batch_number TEXT,
  expiry_date DATE,
  days_to_expiry INTEGER,
  current_quantity DECIMAL(12, 3)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.item_id,
    i.name AS item_name,
    b.batch_number,
    b.expiry_date,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry,
    b.current_quantity
  FROM inventory_batches b
  JOIN inventory_items i ON b.item_id = i.id
  WHERE b.organization_id = p_organization_id
    AND b.status = 'Active'
    AND b.expiry_date IS NOT NULL
    AND b.expiry_date <= (CURRENT_DATE + p_days_ahead)
    AND b.current_quantity > 0
  ORDER BY b.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items(
  p_organization_id UUID
)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  current_quantity DECIMAL(12, 3),
  minimum_quantity DECIMAL(12, 3),
  deficit DECIMAL(12, 3)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id AS item_id,
    i.name AS item_name,
    COALESCE(i.current_quantity, 0) AS current_quantity,
    COALESCE(i.minimum_quantity, 0) AS minimum_quantity,
    GREATEST(COALESCE(i.minimum_quantity, 0) - COALESCE(i.current_quantity, 0), 0) AS deficit
  FROM inventory_items i
  WHERE i.organization_id = p_organization_id
    AND COALESCE(i.current_quantity, 0) < COALESCE(i.minimum_quantity, 0)
  ORDER BY deficit DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. Comments
-- =====================================================
COMMENT ON TABLE stock_valuation IS 'Stock valuation entries for FIFO/LIFO/Average cost tracking';
COMMENT ON TABLE inventory_batches IS 'Batch tracking for inventory items with expiry dates';
COMMENT ON TABLE inventory_serial_numbers IS 'Serial number tracking for individual items';
COMMENT ON TABLE stock_closing_entries IS 'Period-end stock closing entries for accounting';
COMMENT ON COLUMN inventory_items.valuation_method IS 'FIFO, LIFO, or Average cost method';
