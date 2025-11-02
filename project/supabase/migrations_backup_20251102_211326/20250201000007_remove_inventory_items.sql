-- =====================================================
-- Migration: Remove obsolete inventory_items table
-- Description: Drops inventory_items and updates all references to use items table
-- =====================================================

-- =====================================================
-- 1. UPDATE STOCK_VALUATION FOREIGN KEY
-- =====================================================

-- Drop old foreign key constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_valuation_item_id_fkey'
    AND table_name = 'stock_valuation'
  ) THEN
    ALTER TABLE stock_valuation
      DROP CONSTRAINT stock_valuation_item_id_fkey;
  END IF;
END $$;

-- Update foreign key to reference items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_valuation_item_id_fkey'
    AND table_name = 'stock_valuation'
  ) THEN
    ALTER TABLE stock_valuation
      ADD CONSTRAINT stock_valuation_item_id_fkey 
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 2. UPDATE OPENING_STOCK_BALANCES FOREIGN KEY
-- =====================================================

-- Drop old foreign key constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'opening_stock_balances_item_id_fkey'
    AND table_name = 'opening_stock_balances'
  ) THEN
    ALTER TABLE opening_stock_balances
      DROP CONSTRAINT opening_stock_balances_item_id_fkey;
  END IF;
END $$;

-- Update foreign key to reference items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'opening_stock_balances_item_id_fkey'
    AND table_name = 'opening_stock_balances'
  ) THEN
    ALTER TABLE opening_stock_balances
      ADD CONSTRAINT opening_stock_balances_item_id_fkey 
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 3. UPDATE STOCK_CLOSING_ITEMS FOREIGN KEY
-- =====================================================

-- Drop old foreign key constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_closing_items_item_id_fkey'
    AND table_name = 'stock_closing_items'
  ) THEN
    ALTER TABLE stock_closing_items
      DROP CONSTRAINT stock_closing_items_item_id_fkey;
  END IF;
END $$;

-- Update foreign key to reference items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_closing_items_item_id_fkey'
    AND table_name = 'stock_closing_items'
  ) THEN
    ALTER TABLE stock_closing_items
      ADD CONSTRAINT stock_closing_items_item_id_fkey 
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 4. UPDATE FUNCTIONS THAT REFERENCE inventory_items
-- =====================================================

-- Update get_item_stock_value function
CREATE OR REPLACE FUNCTION get_item_stock_value(
  p_item_id UUID,
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
  v_valuation_method TEXT;
  v_total_value DECIMAL(12, 2) := 0;
BEGIN
  -- Get valuation method from items table
  SELECT valuation_method INTO v_valuation_method
  FROM items
  WHERE id = p_item_id;

  -- Calculate based on method
  CASE v_valuation_method
    WHEN 'Moving Average' THEN
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

-- Update opening_stock_balance_trigger function
CREATE OR REPLACE FUNCTION process_opening_stock_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_warehouse RECORD;
  v_journal_entry_id UUID;
  v_item_account_id UUID;
  v_stock_account_id UUID;
BEGIN
  -- Get item and warehouse details from items table
  SELECT * INTO v_item FROM items WHERE id = NEW.item_id;
  SELECT * INTO v_warehouse FROM warehouses WHERE id = NEW.warehouse_id;

  -- Only process if status is 'Posted'
  IF NEW.status = 'Posted' AND (OLD.status IS NULL OR OLD.status != 'Posted') THEN
    -- Create stock valuation entry
    INSERT INTO stock_valuation (
      organization_id,
      item_id,
      warehouse_id,
      quantity,
      remaining_quantity,
      cost_per_unit,
      total_cost,
      valuation_date
    )
    VALUES (
      NEW.organization_id,
      NEW.item_id,
      NEW.warehouse_id,
      NEW.opening_quantity,
      NEW.opening_quantity,
      NEW.opening_cost_per_unit,
      NEW.opening_quantity * NEW.opening_cost_per_unit,
      NEW.opening_date
    );

    -- Create journal entry if accounting integration enabled
    -- (This would reference items table now)
    -- Journal entry logic here...

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. DROP OBSOLETE TABLE AND RELATED OBJECTS
-- =====================================================

-- Drop RLS policies on inventory_items
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Organization members can manage inventory" ON inventory_items;
END $$;

-- Drop indexes on inventory_items
DROP INDEX IF EXISTS idx_inventory_items_valuation;
DROP INDEX IF EXISTS idx_inventory_items_org;
DROP INDEX IF EXISTS idx_inventory_items_farm;

-- Drop triggers
DROP TRIGGER IF EXISTS handle_updated_at ON inventory_items;

-- Drop the table (CASCADE will drop any remaining dependencies)
DROP TABLE IF EXISTS inventory_items CASCADE;

-- =====================================================
-- 6. CLEANUP: Remove migration functions if they exist
-- =====================================================

DROP FUNCTION IF EXISTS migrate_inventory_to_items(UUID);
DROP FUNCTION IF EXISTS update_stock_entry_items_item_refs(UUID);

-- =====================================================
-- NOTES
-- =====================================================

-- This migration removes the obsolete inventory_items table
-- All references should now point to the items table
-- Make sure to run this after data has been migrated to items table

