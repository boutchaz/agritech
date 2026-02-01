-- Low Stock Warning Alerts
-- Migration: 20260131000003_low_stock_alerts.sql

-- Add show_stock_alerts preference to organizations if not exists
-- This flag enables/disables stock alerts per organization
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS show_stock_alerts BOOLEAN DEFAULT true;

-- Add last_stock_check_at to track when stock was last checked
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS last_stock_check_at TIMESTAMPTZ;

-- ============================================================================
-- KEEP IN SQL: Read-only query functions (can be called via RPC from NestJS)
-- ============================================================================

-- Function to check low stock for inventory_items
CREATE OR REPLACE FUNCTION check_low_stock_inventory(p_organization_id UUID)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  current_quantity NUMERIC,
  minimum_stock NUMERIC,
  unit TEXT,
  shortage_quantity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ii.id,
    ii.name,
    ii.quantity,
    ii.minimum_stock,
    ii.unit,
    ii.minimum_stock - ii.quantity as shortage_quantity
  FROM inventory_items ii
  WHERE ii.organization_id = p_organization_id
    AND ii.minimum_stock IS NOT NULL
    AND ii.quantity <= ii.minimum_stock
    AND ii.quantity >= 0;  -- Only valid non-negative quantities
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check low stock for product_variants
CREATE OR REPLACE FUNCTION check_low_stock_variants(p_organization_id UUID)
RETURNS TABLE (
  variant_id UUID,
  variant_name TEXT,
  item_id UUID,
  item_name TEXT,
  current_quantity NUMERIC,
  min_stock_level NUMERIC,
  unit TEXT,
  shortage_quantity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.id,
    pv.variant_name,
    pv.item_id,
    i.name as item_name,
    pv.quantity,
    pv.min_stock_level,
    pv.unit,
    pv.min_stock_level - pv.quantity as shortage_quantity
  FROM product_variants pv
  JOIN items i ON i.id = pv.item_id
  WHERE pv.organization_id = p_organization_id
    AND pv.min_stock_level IS NOT NULL
    AND pv.quantity <= pv.min_stock_level
    AND pv.quantity >= 0  -- Only valid non-negative quantities
    AND pv.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on query functions
GRANT EXECUTE ON FUNCTION check_low_stock_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION check_low_stock_variants TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION check_low_stock_inventory IS 'Returns inventory items below their minimum stock level for an organization. Called by NestJS StockService.';
COMMENT ON FUNCTION check_low_stock_variants IS 'Returns product variants below their minimum stock level for an organization. Called by NestJS StockService.';

-- Note: The actual notification creation logic is in NestJS (stock.service.ts)
-- NestJS calls these functions via RPC to get low stock items, then creates notifications
-- This keeps operational workflows in application code where they belong
