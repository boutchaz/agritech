-- =====================================================
-- Stock Reservations, Warehouse Stock Levels, and Stock Entry Approvals
-- Required by Stock Management Production Readiness (Sprints 2, 3, 4)
-- =====================================================

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

-- Trigger: update warehouse_stock_levels on stock_movements change
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

-- Trigger: update reserved_quantity on stock_reservations change
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

-- One-time backfill for existing data
DO $$
DECLARE
  v_record RECORD;
  v_existing_id UUID;
  v_reserved NUMERIC;
BEGIN
  FOR v_record IN
    SELECT
      sm.organization_id,
      sm.item_id,
      sm.variant_id,
      sm.warehouse_id,
      SUM(sm.quantity) AS quantity,
      MAX(sm.created_at) AS last_movement_at
    FROM stock_movements sm
    GROUP BY sm.organization_id, sm.item_id, sm.variant_id, sm.warehouse_id
  LOOP
    SELECT COALESCE(SUM(quantity), 0) INTO v_reserved
    FROM stock_reservations sr
    WHERE sr.organization_id = v_record.organization_id
      AND sr.item_id = v_record.item_id
      AND sr.warehouse_id = v_record.warehouse_id
      AND sr.status = 'active'
      AND sr.expires_at > NOW()
      AND (sr.variant_id = v_record.variant_id OR (v_record.variant_id IS NULL AND sr.variant_id IS NULL));

    SELECT id INTO v_existing_id
    FROM warehouse_stock_levels wsl
    WHERE wsl.organization_id = v_record.organization_id
      AND wsl.item_id = v_record.item_id
      AND wsl.warehouse_id = v_record.warehouse_id
      AND (wsl.variant_id = v_record.variant_id OR (v_record.variant_id IS NULL AND wsl.variant_id IS NULL))
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE warehouse_stock_levels
      SET quantity = v_record.quantity,
          reserved_quantity = v_reserved,
          last_movement_at = v_record.last_movement_at,
          updated_at = NOW()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO warehouse_stock_levels (
        organization_id,
        item_id,
        variant_id,
        warehouse_id,
        quantity,
        reserved_quantity,
        last_movement_at
      )
      VALUES (
        v_record.organization_id,
        v_record.item_id,
        v_record.variant_id,
        v_record.warehouse_id,
        v_record.quantity,
        v_reserved,
        v_record.last_movement_at
      );
    END IF;
  END LOOP;
END $$;

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

-- =====================================================
-- RLS Policies
-- =====================================================

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

-- Warehouse Stock Levels Policies (read-only for org members, writes via triggers)
ALTER TABLE warehouse_stock_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_read_warehouse_stock_levels" ON warehouse_stock_levels;
CREATE POLICY "org_read_warehouse_stock_levels" ON warehouse_stock_levels
  FOR SELECT USING (is_organization_member(organization_id));

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
