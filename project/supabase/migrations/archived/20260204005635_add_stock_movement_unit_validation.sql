-- Add validation trigger to ensure stock_movements.unit matches the variant's unit
-- This prevents users from manually entering incorrect units that would corrupt consumption data
-- Note: CHECK constraints with subqueries are not allowed in PostgreSQL, so we use a trigger

-- Create trigger function for unit validation
CREATE OR REPLACE FUNCTION validate_stock_movement_unit()
RETURNS TRIGGER AS $$
DECLARE
  expected_unit TEXT;
BEGIN
  -- Only validate if variant_id is provided
  IF NEW.variant_id IS NOT NULL THEN
    -- Get the expected unit from the variant
    SELECT wu.code INTO expected_unit
    FROM product_variants pv
    JOIN work_units wu ON pv.unit_id = wu.id
    WHERE pv.id = NEW.variant_id;

    -- Validate that the unit matches
    IF expected_unit IS NOT NULL AND NEW.unit != expected_unit THEN
      RAISE EXCEPTION 'Unit "%" does not match variant unit "%". Variant ID: %',
        NEW.unit, expected_unit, NEW.variant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for unit validation
DROP TRIGGER IF EXISTS trg_validate_stock_movement_unit ON stock_movements;
CREATE TRIGGER trg_validate_stock_movement_unit
  BEFORE INSERT OR UPDATE OF unit, variant_id ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION validate_stock_movement_unit();

COMMENT ON FUNCTION validate_stock_movement_unit() IS 'Validates that stock_movements.unit matches the variant''s unit from work_units with detailed error messaging';
