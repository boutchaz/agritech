-- =====================================================
-- Migration: Migrate from inventory_items to items table
-- Description: Updates existing foreign keys and migrates data if needed
-- =====================================================

-- =====================================================
-- 1. UPDATE stock_entry_items FOREIGN KEY
-- =====================================================

-- First, drop the old foreign key constraint if it exists
DO $$ 
BEGIN
  -- Check if foreign key constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_entry_items_item_id_fkey'
    AND table_name = 'stock_entry_items'
  ) THEN
    -- Drop the old constraint
    ALTER TABLE stock_entry_items
      DROP CONSTRAINT stock_entry_items_item_id_fkey;
  END IF;
END $$;

-- Add new foreign key to items table (if item_id exists in items)
-- Note: This assumes items will be created/migrated from inventory_items first
-- For now, make it nullable and allow NULL values during transition
ALTER TABLE stock_entry_items
  ALTER COLUMN item_id DROP NOT NULL; -- Make nullable during migration

-- Create new foreign key constraint (only where item_id exists in items table)
-- We'll use a trigger or manual migration to populate items first

-- Add a comment to indicate this needs manual migration
COMMENT ON COLUMN stock_entry_items.item_id IS 'References items table. Must be migrated from inventory_items. Currently nullable during transition.';

-- =====================================================
-- 2. HELPER FUNCTION: Migrate inventory_items to items
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_inventory_to_items(
  p_organization_id UUID
)
RETURNS TABLE (
  old_item_id UUID,
  new_item_id UUID,
  item_code TEXT
) AS $$
DECLARE
  v_agriculture_group_id UUID;
  v_inputs_group_id UUID;
  v_old_item RECORD;
  v_new_item_id UUID;
  v_item_code TEXT;
BEGIN
  -- Get or create Agriculture > Inputs group
  SELECT id INTO v_inputs_group_id
  FROM item_groups
  WHERE organization_id = p_organization_id
    AND name = 'Inputs'
    AND parent_group_id IN (
      SELECT id FROM item_groups 
      WHERE organization_id = p_organization_id AND name = 'Agriculture'
    )
  LIMIT 1;

  IF v_inputs_group_id IS NULL THEN
    -- Create groups if they don't exist
    PERFORM seed_default_item_groups(p_organization_id);
    
    SELECT id INTO v_inputs_group_id
    FROM item_groups
    WHERE organization_id = p_organization_id
      AND name = 'Inputs'
      AND parent_group_id IN (
        SELECT id FROM item_groups 
        WHERE organization_id = p_organization_id AND name = 'Agriculture'
      )
    LIMIT 1;
  END IF;

  -- Loop through inventory_items and create items
  FOR v_old_item IN
    SELECT * FROM inventory_items
    WHERE organization_id = p_organization_id
  LOOP
    -- Generate item code
    SELECT generate_item_code(p_organization_id, v_inputs_group_id, 'INV') INTO v_item_code;

    -- Create item
    INSERT INTO items (
      organization_id,
      item_code,
      item_name,
      description,
      item_group_id,
      is_active,
      is_sales_item,
      is_purchase_item,
      is_stock_item,
      maintain_stock,
      default_unit,
      stock_uom,
      standard_rate,
      created_at,
      updated_at
    )
    VALUES (
      v_old_item.organization_id,
      v_item_code,
      v_old_item.name,
      v_old_item.notes,
      v_inputs_group_id,
      true,
      true,
      true,
      true,
      true,
      v_old_item.unit,
      v_old_item.unit,
      v_old_item.cost_per_unit,
      v_old_item.created_at,
      v_old_item.updated_at
    )
    RETURNING id INTO v_new_item_id;

    -- Return mapping
    RETURN QUERY SELECT v_old_item.id, v_new_item_id, v_item_code;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_inventory_to_items IS 'Migrates inventory_items to items table for an organization';

-- =====================================================
-- 3. FUNCTION: Update stock_entry_items with new item_ids
-- =====================================================

CREATE OR REPLACE FUNCTION update_stock_entry_items_item_refs(
  p_organization_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_mapping RECORD;
  v_updated_count INTEGER := 0;
BEGIN
  -- For each old inventory_item_id, update stock_entry_items
  FOR v_mapping IN
    SELECT old_item_id, new_item_id
    FROM migrate_inventory_to_items(p_organization_id)
  LOOP
    -- Update stock_entry_items that reference the old inventory_item
    UPDATE stock_entry_items
    SET item_id = v_mapping.new_item_id
    WHERE item_id = v_mapping.old_item_id
      AND stock_entry_id IN (
        SELECT id FROM stock_entries WHERE organization_id = p_organization_id
      );

    v_updated_count := v_updated_count + SQL%ROWCOUNT;
  END LOOP;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE FOREIGN KEY CONSTRAINT (After Migration)
-- =====================================================

-- Note: This should be run AFTER migrating data
-- For now, we'll make it nullable and allow NULL during transition
-- The actual foreign key will be added after data migration is complete

-- Add foreign key constraint (only where item_id is not NULL)
-- This allows NULL values during migration, but ensures data integrity where item_id is set
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stock_entry_items_item_id_fkey'
    AND table_name = 'stock_entry_items'
  ) THEN
    ALTER TABLE stock_entry_items
      ADD CONSTRAINT stock_entry_items_item_id_fkey 
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Make item_id required after migration
-- ALTER TABLE stock_entry_items
--   ALTER COLUMN item_id SET NOT NULL;

-- =====================================================
-- 5. UPDATE REFERENCE IN STOCK ENTRIES
-- =====================================================

-- Ensure stock_entry_items references items table properly
-- The foreign key constraint above will enforce this

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_stock_entry_items_item_new 
  ON stock_entry_items(item_id) 
  WHERE item_id IS NOT NULL;

-- =====================================================
-- NOTES FOR MANUAL MIGRATION
-- =====================================================

-- To complete the migration:
-- 1. Run: SELECT migrate_inventory_to_items('<organization_id>');
-- 2. Run: SELECT update_stock_entry_items_item_refs('<organization_id>');
-- 3. Verify data integrity
-- 4. Make item_id NOT NULL: ALTER TABLE stock_entry_items ALTER COLUMN item_id SET NOT NULL;

