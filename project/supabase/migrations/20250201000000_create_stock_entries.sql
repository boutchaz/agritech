-- Stock Entry System Migration
-- Implements comprehensive stock transaction tracking system
-- Supports Material Receipt, Material Issue, Stock Transfer, and Reconciliation

-- =====================================================
-- 1. Stock Entries Table (Header)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Entry Identification
  entry_number TEXT NOT NULL, -- Generated: SE-2025-0001
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'Material Receipt',   -- Receiving stock from purchases
    'Material Issue',     -- Issuing stock for consumption/usage
    'Stock Transfer',     -- Moving stock between warehouses
    'Stock Reconciliation' -- Adjusting stock after physical count
  )),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Warehouse Information
  from_warehouse_id UUID REFERENCES warehouses(id), -- Source warehouse (for Issue/Transfer)
  to_warehouse_id UUID REFERENCES warehouses(id),   -- Target warehouse (for Receipt/Transfer)

  -- Reference Information
  reference_type TEXT, -- 'Purchase Order', 'Sales Order', 'Task', 'Manual', etc.
  reference_id UUID,   -- ID of referenced document
  reference_number TEXT, -- Human-readable reference (PO-2025-0001)

  -- Status and Workflow
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN (
    'Draft',      -- Created but not yet posted
    'Submitted',  -- Submitted for approval (optional)
    'Posted',     -- Posted and stock updated
    'Cancelled'   -- Cancelled entry
  )),

  -- Additional Information
  purpose TEXT, -- Free-text description of purpose
  notes TEXT,

  -- Posting Information
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES user_profiles(id),

  -- Audit Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id),

  -- Constraints
  CONSTRAINT unique_entry_number_per_org UNIQUE (organization_id, entry_number),
  CONSTRAINT valid_warehouse_combination CHECK (
    (entry_type = 'Material Receipt' AND to_warehouse_id IS NOT NULL AND from_warehouse_id IS NULL) OR
    (entry_type = 'Material Issue' AND from_warehouse_id IS NOT NULL AND to_warehouse_id IS NULL) OR
    (entry_type = 'Stock Transfer' AND from_warehouse_id IS NOT NULL AND to_warehouse_id IS NOT NULL AND from_warehouse_id != to_warehouse_id) OR
    (entry_type = 'Stock Reconciliation' AND to_warehouse_id IS NOT NULL)
  )
);

-- Index for performance
CREATE INDEX idx_stock_entries_org ON stock_entries(organization_id);
CREATE INDEX idx_stock_entries_date ON stock_entries(entry_date DESC);
CREATE INDEX idx_stock_entries_status ON stock_entries(status);
CREATE INDEX idx_stock_entries_type ON stock_entries(entry_type);
CREATE INDEX idx_stock_entries_reference ON stock_entries(reference_type, reference_id);
CREATE INDEX idx_stock_entries_from_warehouse ON stock_entries(from_warehouse_id);
CREATE INDEX idx_stock_entries_to_warehouse ON stock_entries(to_warehouse_id);

-- RLS Policies
ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock entries in their organization"
  ON stock_entries FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create stock entries in their organization"
  ON stock_entries FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update stock entries in their organization"
  ON stock_entries FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete draft stock entries in their organization"
  ON stock_entries FOR DELETE
  USING (
    status = 'Draft' AND
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 2. Stock Entry Items Table (Line Items)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_entry_id UUID NOT NULL REFERENCES stock_entries(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL DEFAULT 1,

  -- Item Information
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  item_name TEXT NOT NULL, -- Denormalized for reporting

  -- Quantity Information
  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL, -- Unit of measure

  -- Warehouse Information (for line-level warehouse control)
  source_warehouse_id UUID REFERENCES warehouses(id), -- For transfers and issues
  target_warehouse_id UUID REFERENCES warehouses(id), -- For transfers and receipts

  -- Batch/Serial Tracking
  batch_number TEXT,
  serial_number TEXT,
  expiry_date DATE,

  -- Cost Information
  cost_per_unit DECIMAL(12, 2),
  total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,

  -- Reconciliation Fields
  system_quantity DECIMAL(12, 3), -- For reconciliation: system count
  physical_quantity DECIMAL(12, 3), -- For reconciliation: physical count
  variance DECIMAL(12, 3) GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED,

  -- Additional Information
  notes TEXT,

  -- Audit Fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_line_per_entry UNIQUE (stock_entry_id, line_number),
  CONSTRAINT valid_reconciliation_quantities CHECK (
    (system_quantity IS NULL AND physical_quantity IS NULL) OR
    (system_quantity IS NOT NULL AND physical_quantity IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_stock_entry_items_entry ON stock_entry_items(stock_entry_id);
CREATE INDEX idx_stock_entry_items_item ON stock_entry_items(item_id);
CREATE INDEX idx_stock_entry_items_batch ON stock_entry_items(batch_number);
CREATE INDEX idx_stock_entry_items_serial ON stock_entry_items(serial_number);

-- RLS Policies (inherit from parent stock_entries)
ALTER TABLE stock_entry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock entry items in their organization"
  ON stock_entry_items FOR SELECT
  USING (
    stock_entry_id IN (
      SELECT id FROM stock_entries WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage stock entry items in their organization"
  ON stock_entry_items FOR ALL
  USING (
    stock_entry_id IN (
      SELECT id FROM stock_entries WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 3. Stock Movement Ledger (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Movement Details
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'IN',  -- Stock increase (Receipt)
    'OUT', -- Stock decrease (Issue)
    'TRANSFER' -- Stock movement between warehouses
  )),
  movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Item and Warehouse
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),

  -- Quantity
  quantity DECIMAL(12, 3) NOT NULL, -- Positive for IN, negative for OUT
  unit TEXT NOT NULL,

  -- Balance After Movement
  balance_quantity DECIMAL(12, 3) NOT NULL,

  -- Cost Information
  cost_per_unit DECIMAL(12, 2),
  total_cost DECIMAL(12, 2),

  -- Reference to Stock Entry
  stock_entry_id UUID REFERENCES stock_entries(id) ON DELETE SET NULL,
  stock_entry_item_id UUID REFERENCES stock_entry_items(id) ON DELETE SET NULL,

  -- Batch/Serial
  batch_number TEXT,
  serial_number TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Indexes
CREATE INDEX idx_stock_movements_org ON stock_movements(organization_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date DESC);
CREATE INDEX idx_stock_movements_entry ON stock_movements(stock_entry_id);

-- RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock movements in their organization"
  ON stock_movements FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 4. Functions and Triggers
-- =====================================================

-- Function to generate stock entry number
CREATE OR REPLACE FUNCTION generate_stock_entry_number(p_organization_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM stock_entries
  WHERE organization_id = p_organization_id
    AND entry_number LIKE 'SE-' || v_year || '-%';

  v_number := 'SE-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock quantities when entry is posted
CREATE OR REPLACE FUNCTION update_stock_on_entry_post()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_current_quantity DECIMAL(12, 3);
  v_new_quantity DECIMAL(12, 3);
BEGIN
  -- Only process if status changed to 'Posted'
  IF NEW.status = 'Posted' AND (OLD.status IS NULL OR OLD.status != 'Posted') THEN

    -- Process each item in the entry
    FOR v_item IN
      SELECT * FROM stock_entry_items WHERE stock_entry_id = NEW.id
    LOOP
      -- Handle different entry types
      CASE NEW.entry_type
        WHEN 'Material Receipt' THEN
          -- Increase stock in target warehouse
          UPDATE inventory_items
          SET
            current_quantity = COALESCE(current_quantity, 0) + v_item.quantity,
            updated_at = NOW()
          WHERE id = v_item.item_id;

          -- Record movement
          SELECT COALESCE(current_quantity, 0) INTO v_current_quantity
          FROM inventory_items WHERE id = v_item.item_id;

          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, created_by
          ) VALUES (
            NEW.organization_id, 'IN', v_item.item_id, NEW.to_warehouse_id,
            v_item.quantity, v_item.unit, v_current_quantity,
            v_item.cost_per_unit, v_item.total_cost,
            NEW.id, v_item.id, v_item.batch_number, NEW.posted_by
          );

        WHEN 'Material Issue' THEN
          -- Decrease stock from source warehouse
          UPDATE inventory_items
          SET
            current_quantity = GREATEST(COALESCE(current_quantity, 0) - v_item.quantity, 0),
            updated_at = NOW()
          WHERE id = v_item.item_id;

          -- Record movement
          SELECT COALESCE(current_quantity, 0) INTO v_current_quantity
          FROM inventory_items WHERE id = v_item.item_id;

          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity, stock_entry_id,
            stock_entry_item_id, batch_number, created_by
          ) VALUES (
            NEW.organization_id, 'OUT', v_item.item_id, NEW.from_warehouse_id,
            -v_item.quantity, v_item.unit, v_current_quantity,
            NEW.id, v_item.id, v_item.batch_number, NEW.posted_by
          );

        WHEN 'Stock Transfer' THEN
          -- No net change in total quantity, just location change
          -- Record OUT movement from source
          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity, stock_entry_id,
            stock_entry_item_id, created_by
          ) VALUES (
            NEW.organization_id, 'TRANSFER', v_item.item_id, NEW.from_warehouse_id,
            -v_item.quantity, v_item.unit, 0, NEW.id, v_item.id, NEW.posted_by
          );

          -- Record IN movement to target
          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity, stock_entry_id,
            stock_entry_item_id, created_by
          ) VALUES (
            NEW.organization_id, 'TRANSFER', v_item.item_id, NEW.to_warehouse_id,
            v_item.quantity, v_item.unit, 0, NEW.id, v_item.id, NEW.posted_by
          );

        WHEN 'Stock Reconciliation' THEN
          -- Adjust stock to match physical count
          v_new_quantity := v_item.physical_quantity;

          UPDATE inventory_items
          SET
            current_quantity = v_new_quantity,
            updated_at = NOW()
          WHERE id = v_item.item_id;

          -- Record movement (variance)
          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity, stock_entry_id,
            stock_entry_item_id, created_by
          ) VALUES (
            NEW.organization_id,
            CASE WHEN v_item.variance > 0 THEN 'IN' ELSE 'OUT' END,
            v_item.item_id, NEW.to_warehouse_id,
            v_item.variance, v_item.unit, v_new_quantity,
            NEW.id, v_item.id, NEW.posted_by
          );
      END CASE;
    END LOOP;

    -- Update posted timestamp
    NEW.posted_at := NOW();
    NEW.posted_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stock on entry post
CREATE TRIGGER trigger_update_stock_on_post
  BEFORE UPDATE ON stock_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_entry_post();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_stock_entry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stock_entry_updated
  BEFORE UPDATE ON stock_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_entry_timestamp();

-- =====================================================
-- 5. Comments
-- =====================================================
COMMENT ON TABLE stock_entries IS 'Stock entry transactions for material receipts, issues, transfers, and reconciliations';
COMMENT ON TABLE stock_entry_items IS 'Line items for stock entries';
COMMENT ON TABLE stock_movements IS 'Complete audit trail of all stock movements';
COMMENT ON COLUMN stock_entries.entry_type IS 'Type: Material Receipt, Material Issue, Stock Transfer, or Stock Reconciliation';
COMMENT ON COLUMN stock_entries.status IS 'Status: Draft, Submitted, Posted, or Cancelled';
