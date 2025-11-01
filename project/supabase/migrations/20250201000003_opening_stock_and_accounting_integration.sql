-- =====================================================
-- Migration: Opening Stock Balance & Accounting Integration
-- Description: Adds opening stock balance functionality and automatic journal entry creation
-- =====================================================

-- =====================================================
-- 1. Opening Stock Balance Table
-- =====================================================
CREATE TABLE IF NOT EXISTS opening_stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Item Information
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

  -- Opening Balance
  opening_date DATE NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL CHECK (quantity >= 0),
  valuation_rate DECIMAL(12, 2) NOT NULL CHECK (valuation_rate >= 0),
  total_value DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * valuation_rate) STORED,

  -- Batch/Serial Information (optional)
  batch_number TEXT,
  serial_numbers TEXT[], -- Array of serial numbers for this opening balance

  -- Journal Entry (created when posted)
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Posted', 'Cancelled')),
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_opening_stock UNIQUE (organization_id, item_id, warehouse_id, opening_date, batch_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opening_stock_org ON opening_stock_balances(organization_id);
CREATE INDEX IF NOT EXISTS idx_opening_stock_item ON opening_stock_balances(item_id);
CREATE INDEX IF NOT EXISTS idx_opening_stock_warehouse ON opening_stock_balances(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_opening_stock_status ON opening_stock_balances(status);

-- RLS Policies
ALTER TABLE opening_stock_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view opening stock in their organization" ON opening_stock_balances;
CREATE POLICY "Users can view opening stock in their organization"
  ON opening_stock_balances FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert opening stock in their organization" ON opening_stock_balances;
CREATE POLICY "Users can insert opening stock in their organization"
  ON opening_stock_balances FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update draft opening stock in their organization" ON opening_stock_balances;
CREATE POLICY "Users can update draft opening stock in their organization"
  ON opening_stock_balances FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid())
    AND status = 'Draft'
  );

DROP POLICY IF EXISTS "Users can delete draft opening stock in their organization" ON opening_stock_balances;
CREATE POLICY "Users can delete draft opening stock in their organization"
  ON opening_stock_balances FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid())
    AND status = 'Draft'
  );

-- =====================================================
-- 2. Account Mapping for Stock-to-Accounting Integration
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Stock Entry Type
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'Material Receipt',
    'Material Issue',
    'Stock Transfer',
    'Stock Reconciliation',
    'Opening Stock'
  )),

  -- Account Mappings
  debit_account_id UUID NOT NULL REFERENCES accounts(id),
  credit_account_id UUID NOT NULL REFERENCES accounts(id),

  -- Optional: Item Category specific mapping
  item_category TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_stock_mapping UNIQUE (organization_id, entry_type, item_category)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_mapping_org ON stock_account_mappings(organization_id);

-- RLS Policies
ALTER TABLE stock_account_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view stock mappings in their organization" ON stock_account_mappings;
CREATE POLICY "Users can view stock mappings in their organization"
  ON stock_account_mappings FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage stock mappings in their organization" ON stock_account_mappings;
CREATE POLICY "Users can manage stock mappings in their organization"
  ON stock_account_mappings FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

-- =====================================================
-- 3. Link Journal Entry to Stock Entry
-- =====================================================
ALTER TABLE stock_entries
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_entries_journal ON stock_entries(journal_entry_id);

-- =====================================================
-- 4. Function: Post Opening Stock Balance
-- =====================================================
CREATE OR REPLACE FUNCTION post_opening_stock_balance(
  p_opening_stock_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_opening_stock opening_stock_balances%ROWTYPE;
  v_item inventory_items%ROWTYPE;
  v_warehouse warehouses%ROWTYPE;
  v_mapping stock_account_mappings%ROWTYPE;
  v_journal_entry_id UUID;
  v_organization organizations%ROWTYPE;
BEGIN
  -- Get opening stock record
  SELECT * INTO v_opening_stock
  FROM opening_stock_balances
  WHERE id = p_opening_stock_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opening stock balance not found';
  END IF;

  IF v_opening_stock.status != 'Draft' THEN
    RAISE EXCEPTION 'Opening stock balance is already posted or cancelled';
  END IF;

  -- Get item and warehouse details
  SELECT * INTO v_item FROM inventory_items WHERE id = v_opening_stock.item_id;
  SELECT * INTO v_warehouse FROM warehouses WHERE id = v_opening_stock.warehouse_id;
  SELECT * INTO v_organization FROM organizations WHERE id = v_opening_stock.organization_id;

  -- Get account mapping
  SELECT * INTO v_mapping
  FROM stock_account_mappings
  WHERE organization_id = v_opening_stock.organization_id
    AND entry_type = 'Opening Stock'
    AND (item_category IS NULL OR item_category = v_item.category)
  ORDER BY CASE WHEN item_category IS NOT NULL THEN 1 ELSE 2 END
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No account mapping found for Opening Stock';
  END IF;

  -- Create journal entry
  INSERT INTO journal_entries (
    organization_id,
    entry_date,
    reference_type,
    reference_id,
    description,
    total_debit,
    total_credit,
    status,
    posted_at,
    posted_by,
    created_by
  ) VALUES (
    v_opening_stock.organization_id,
    v_opening_stock.opening_date,
    'opening_stock',
    v_opening_stock.id,
    'Opening Stock: ' || v_item.name || ' at ' || v_warehouse.name,
    v_opening_stock.total_value,
    v_opening_stock.total_value,
    'posted',
    NOW(),
    auth.uid(),
    auth.uid()
  ) RETURNING id INTO v_journal_entry_id;

  -- Debit: Stock Asset Account
  INSERT INTO journal_items (
    journal_entry_id,
    account_id,
    description,
    debit,
    credit
  ) VALUES (
    v_journal_entry_id,
    v_mapping.debit_account_id,
    v_item.name || ' (' || v_opening_stock.quantity || ' ' || v_item.unit || ')',
    v_opening_stock.total_value,
    0
  );

  -- Credit: Opening Balance Equity Account
  INSERT INTO journal_items (
    journal_entry_id,
    account_id,
    description,
    debit,
    credit
  ) VALUES (
    v_journal_entry_id,
    v_mapping.credit_account_id,
    'Opening Balance - ' || v_item.name,
    0,
    v_opening_stock.total_value
  );

  -- Update opening stock with journal entry reference
  UPDATE opening_stock_balances
  SET
    journal_entry_id = v_journal_entry_id,
    status = 'Posted',
    posted_at = NOW(),
    posted_by = auth.uid()
  WHERE id = p_opening_stock_id;

  -- Update inventory quantity
  UPDATE inventory_items
  SET quantity = quantity + v_opening_stock.quantity
  WHERE id = v_opening_stock.item_id;

  -- Create stock movement record
  INSERT INTO stock_movements (
    organization_id,
    item_id,
    warehouse_id,
    movement_type,
    quantity,
    movement_date,
    reference_type,
    reference_id,
    balance_after
  ) VALUES (
    v_opening_stock.organization_id,
    v_opening_stock.item_id,
    v_opening_stock.warehouse_id,
    'IN',
    v_opening_stock.quantity,
    v_opening_stock.opening_date,
    'opening_stock',
    v_opening_stock.id,
    (SELECT quantity FROM inventory_items WHERE id = v_opening_stock.item_id)
  );

  RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Function: Create Journal Entry for Stock Entry
-- =====================================================
CREATE OR REPLACE FUNCTION create_stock_journal_entry(
  p_stock_entry_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_entry stock_entries%ROWTYPE;
  v_mapping stock_account_mappings%ROWTYPE;
  v_journal_entry_id UUID;
  v_total_value DECIMAL(12, 2);
  v_item_record RECORD;
BEGIN
  -- Get stock entry
  SELECT * INTO v_entry FROM stock_entries WHERE id = p_stock_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock entry not found';
  END IF;

  IF v_entry.status != 'Posted' THEN
    RAISE EXCEPTION 'Stock entry must be posted before creating journal entry';
  END IF;

  IF v_entry.journal_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Journal entry already exists for this stock entry';
  END IF;

  -- Calculate total value from stock entry items
  SELECT SUM(quantity * COALESCE(cost_per_unit, 0)) INTO v_total_value
  FROM stock_entry_items
  WHERE stock_entry_id = p_stock_entry_id;

  IF v_total_value IS NULL OR v_total_value = 0 THEN
    -- No value to post, skip journal entry
    RETURN NULL;
  END IF;

  -- Get account mapping
  SELECT * INTO v_mapping
  FROM stock_account_mappings
  WHERE organization_id = v_entry.organization_id
    AND entry_type = v_entry.entry_type
    AND item_category IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    -- No mapping found, skip journal entry
    RETURN NULL;
  END IF;

  -- Create journal entry
  INSERT INTO journal_entries (
    organization_id,
    entry_date,
    reference_type,
    reference_id,
    description,
    total_debit,
    total_credit,
    status,
    posted_at,
    posted_by,
    created_by
  ) VALUES (
    v_entry.organization_id,
    v_entry.entry_date,
    'stock_entry',
    v_entry.id,
    v_entry.entry_type || ' - ' || v_entry.entry_number,
    v_total_value,
    v_total_value,
    'posted',
    NOW(),
    v_entry.created_by,
    v_entry.created_by
  ) RETURNING id INTO v_journal_entry_id;

  -- Create journal items based on entry type
  IF v_entry.entry_type = 'Material Receipt' THEN
    -- Debit: Stock Asset, Credit: Stock Received (or Payables if from PO)
    INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit)
    VALUES
      (v_journal_entry_id, v_mapping.debit_account_id, 'Material Receipt', v_total_value, 0),
      (v_journal_entry_id, v_mapping.credit_account_id, 'Material Receipt', 0, v_total_value);

  ELSIF v_entry.entry_type = 'Material Issue' THEN
    -- Debit: Cost of Goods (or appropriate expense), Credit: Stock Asset
    INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit)
    VALUES
      (v_journal_entry_id, v_mapping.debit_account_id, 'Material Issue', v_total_value, 0),
      (v_journal_entry_id, v_mapping.credit_account_id, 'Material Issue', 0, v_total_value);

  ELSIF v_entry.entry_type = 'Stock Reconciliation' THEN
    -- Debit/Credit: Stock Adjustment Account
    INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit)
    VALUES
      (v_journal_entry_id, v_mapping.debit_account_id, 'Stock Adjustment', v_total_value, 0),
      (v_journal_entry_id, v_mapping.credit_account_id, 'Stock Adjustment', 0, v_total_value);
  END IF;

  -- Update stock entry with journal reference
  UPDATE stock_entries
  SET journal_entry_id = v_journal_entry_id
  WHERE id = p_stock_entry_id;

  RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Trigger: Auto-create journal entry when stock entry is posted
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_create_stock_journal()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create journal entry when status changes to 'Posted'
  IF NEW.status = 'Posted' AND (OLD.status IS NULL OR OLD.status != 'Posted') THEN
    -- Call function to create journal entry (in a separate transaction)
    PERFORM create_stock_journal_entry(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_stock_entry_journal ON stock_entries;
CREATE TRIGGER trigger_stock_entry_journal
  AFTER UPDATE ON stock_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_stock_journal();

-- =====================================================
-- 7. Comments
-- =====================================================
COMMENT ON TABLE opening_stock_balances IS 'Opening stock balance records for initial inventory setup';
COMMENT ON TABLE stock_account_mappings IS 'Account mappings for stock-to-accounting integration';
COMMENT ON COLUMN stock_entries.journal_entry_id IS 'Reference to journal entry created for this stock entry';
COMMENT ON FUNCTION post_opening_stock_balance IS 'Post opening stock balance and create journal entry';
COMMENT ON FUNCTION create_stock_journal_entry IS 'Create journal entry for posted stock entry';
