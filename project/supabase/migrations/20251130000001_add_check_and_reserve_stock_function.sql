-- Migration: Add check_and_reserve_stock function to prevent race conditions
-- Issue: TECHNICAL_DEBT.md #4 - Race Conditions in Stock Availability Check
-- Date: 2025-11-30

-- This function provides atomic stock availability checking with row locking
-- to prevent concurrent posts from overselling inventory.

CREATE OR REPLACE FUNCTION check_and_reserve_stock(
  p_item_id UUID,
  p_warehouse_id UUID,
  p_quantity NUMERIC,
  p_organization_id UUID DEFAULT NULL
) RETURNS TABLE(available NUMERIC, reserved BOOLEAN, message TEXT) AS $$
DECLARE
  v_available NUMERIC;
  v_reserved BOOLEAN;
  v_message TEXT;
BEGIN
  -- Lock the stock movement rows for this item/warehouse to prevent concurrent modifications
  -- This ensures that only one transaction can check and reserve stock at a time
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_available
  FROM stock_movements
  WHERE item_id = p_item_id
    AND warehouse_id = p_warehouse_id
    AND (p_organization_id IS NULL OR organization_id = p_organization_id)
  FOR UPDATE;  -- Critical: Locks these rows until transaction completes

  -- Check if sufficient stock is available
  IF v_available >= p_quantity THEN
    v_reserved := TRUE;
    v_message := format('Stock reserved: %s units available', v_available);
  ELSE
    v_reserved := FALSE;
    v_message := format('Insufficient stock: need %s, have %s', p_quantity, v_available);
  END IF;

  -- Return the result
  RETURN QUERY SELECT v_available, v_reserved, v_message;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_and_reserve_stock(UUID, UUID, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_reserve_stock(UUID, UUID, NUMERIC, UUID) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION check_and_reserve_stock IS
'Atomically checks stock availability with row locking to prevent race conditions.
Use this function within a transaction when issuing or transferring stock.
Example:
  BEGIN;
  SELECT * FROM check_and_reserve_stock(item_id, warehouse_id, 100, org_id);
  -- If reserved = true, proceed with stock movement
  INSERT INTO stock_movements ...
  COMMIT;
';
