-- Add base_quantity_at_movement to stock_movements for historical accuracy
-- This captures the base_quantity value at the time of movement creation
-- ensuring historical reports don't change when base_quantity is updated

ALTER TABLE stock_movements
ADD COLUMN base_quantity_at_movement NUMERIC;

COMMENT ON COLUMN stock_movements.base_quantity_at_movement IS 'Snapshot of variant.base_quantity at movement time. Used for accurate historical consumption calculations.';

-- Create trigger function to capture base_quantity_at_movement on insert
CREATE OR REPLACE FUNCTION capture_base_quantity_at_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Capture the current base_quantity from the variant
  SELECT base_quantity INTO NEW.base_quantity_at_movement
  FROM product_variants
  WHERE id = NEW.variant_id;

  -- If no variant found or base_quantity is null, default to 1
  IF NEW.base_quantity_at_movement IS NULL THEN
    NEW.base_quantity_at_movement := 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate base_quantity_at_movement on INSERT
DROP TRIGGER IF EXISTS trg_capture_base_quantity_at_movement ON stock_movements;
CREATE TRIGGER trg_capture_base_quantity_at_movement
  BEFORE INSERT ON stock_movements
  FOR EACH ROW
  WHEN (NEW.variant_id IS NOT NULL)
  EXECUTE FUNCTION capture_base_quantity_at_movement();

-- Add comment for documentation
COMMENT ON FUNCTION capture_base_quantity_at_movement() IS 'Automatically captures the base_quantity from product_variants at movement creation time for historical accuracy.';
