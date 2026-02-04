-- =====================================================
-- Migration: Migrate from legacy 'inventory' table to 'inventory_items'
-- =====================================================
-- This migration:
-- 1. Migrates data from legacy 'inventory' table to 'inventory_items'
-- 2. Handles data mapping between the two tables
-- 3. Drops the legacy 'inventory' table
--
-- IMPORTANT: Run this migration AFTER verifying that:
-- - All code has been updated to use 'inventory_items' instead of 'inventory'
-- - The application has been redeployed with the new code
-- =====================================================

-- =====================================================
-- STEP 1: Migrate data from inventory to inventory_items
-- =====================================================

-- Insert data from inventory to inventory_items
-- Mapping:
-- - inventory.name -> inventory_items.name
-- - inventory.quantity -> inventory_items.quantity
-- - inventory.unit -> inventory_items.unit
-- - inventory.minimum_quantity -> inventory_items.minimum_stock
-- - inventory.cost_per_unit -> inventory_items.cost_per_unit
-- - inventory.supplier -> inventory_items.supplier
-- - inventory.location -> inventory_items.location
-- - inventory.notes -> inventory_items.notes
-- - inventory.organization_id -> inventory_items.organization_id
-- - inventory.farm_id -> inventory_items.farm_id
-- - inventory.category -> inventory_items.category (with validation)

INSERT INTO inventory_items (
  id,
  organization_id,
  farm_id,
  name,
  category,
  quantity,
  unit,
  minimum_stock,
  cost_per_unit,
  supplier,
  location,
  notes,
  valuation_method,
  enable_batch_tracking,
  enable_serial_tracking,
  has_expiry_date,
  shelf_life_days,
  created_at,
  updated_at
)
SELECT
  inv.id,
  inv.organization_id,
  inv.farm_id,
  COALESCE(inv.item_name, inv.name) as name,
  CASE
    WHEN inv.category IN ('seeds', 'fertilizers', 'pesticides', 'equipment', 'tools', 'other') THEN inv.category
    ELSE 'other'
  END as category,
  inv.quantity,
  inv.unit,
  inv.minimum_quantity,
  inv.cost_per_unit,
  COALESCE(inv.supplier, inv.supplier_id::text) as supplier,
  COALESCE(inv.storage_location, inv.location) as location,
  inv.notes,
  'Average' as valuation_method,
  false as enable_batch_tracking,
  false as enable_serial_tracking,
  CASE WHEN inv.expiry_date IS NOT NULL THEN true ELSE false END as has_expiry_date,
  NULL as shelf_life_days,
  inv.created_at,
  inv.updated_at
FROM inventory inv
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_items ii WHERE ii.id = inv.id
);

-- =====================================================
-- STEP 2: Verify migration
-- =====================================================

-- Check how many records were migrated
DO $$
DECLARE
  v_inventory_count INTEGER;
  v_inventory_items_count INTEGER;
  v_migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_inventory_count FROM inventory;
  SELECT COUNT(*) INTO v_inventory_items_count FROM inventory_items;

  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  - Records in legacy inventory table: %', v_inventory_count;
  RAISE NOTICE '  - Total records in inventory_items table: %', v_inventory_items_count;

  -- Log a warning if counts don't match (indicating some records may have failed)
  IF v_inventory_count > 0 AND v_inventory_items_count < v_inventory_count THEN
    RAISE WARNING 'Warning: Not all inventory records were migrated. Please check for duplicates or errors.';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Drop the legacy inventory table
-- =====================================================

-- WARNING: This action cannot be undone!
-- Comment out the following line if you want to keep the legacy table for backup
DROP TABLE IF EXISTS inventory CASCADE;

-- =====================================================
-- POST-MIGRATION NOTES
-- =====================================================

-- After running this migration:
-- 1. Verify all data has been migrated correctly
-- 2. Test all application features that use inventory
-- 3. Remove any references to 'inventory' table from code
-- 4. Update API documentation if needed

-- To rollback (if needed before dropping):
-- -- Restore from backup or re-create inventory table from schema
