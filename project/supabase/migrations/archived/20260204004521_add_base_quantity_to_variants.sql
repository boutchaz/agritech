-- Add base_quantity field to product_variants table
-- This field stores the quantity in the item's default unit for each variant
-- Example: For a 100ml variant of an item with default unit "L", base_quantity = 0.1

ALTER TABLE product_variants
ADD COLUMN base_quantity NUMERIC DEFAULT 1;

COMMENT ON COLUMN product_variants.base_quantity IS 'Quantity in the item default unit. Example: for 100ml variant of item with default unit L, base_quantity = 0.1';

-- Add constraints to prevent invalid values
ALTER TABLE product_variants
ADD CONSTRAINT base_quantity_positive CHECK (base_quantity > 0),
ADD CONSTRAINT base_quantity_not_zero CHECK (base_quantity != 0),
ADD CONSTRAINT base_quantity_reasonable CHECK (base_quantity < 10000);
