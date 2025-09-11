/*
  # Add Default Products to Inventory

  1. Changes
    - Add default products to inventory table with proper categorization
    - Include common agricultural products
    - Ensure farm_id is properly set for each product
    - Fix category values to match check constraint
    
  2. Notes
    - Products are added with default values
    - Each product is properly categorized
    - Products are associated with farms through a function
    - Categories must match inventory_category_check constraint values
*/

-- Function to get category_id by code
CREATE OR REPLACE FUNCTION get_category_id(p_code text)
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT id FROM product_categories WHERE code = p_code);
END;
$$ LANGUAGE plpgsql;

-- Function to get subcategory_id by category_code and subcategory_code
CREATE OR REPLACE FUNCTION get_subcategory_id(p_category_code text, p_subcategory_code text)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT s.id 
    FROM product_subcategories s
    JOIN product_categories c ON c.id = s.category_id
    WHERE c.code = p_category_code AND s.code = p_subcategory_code
  );
END;
$$ LANGUAGE plpgsql;

-- Function to insert product for each farm
CREATE OR REPLACE FUNCTION insert_product_for_farms(
  p_name text,
  p_category_id uuid,
  p_subcategory_id uuid,
  p_quantity numeric,
  p_unit text,
  p_minimum_level numeric,
  p_price_per_unit numeric,
  p_supplier text,
  p_category text
) RETURNS void AS $$
DECLARE
  farm_record RECORD;
BEGIN
  FOR farm_record IN SELECT id FROM farms LOOP
    INSERT INTO inventory (
      name,
      category_id,
      subcategory_id,
      quantity,
      unit,
      minimum_level,
      price_per_unit,
      supplier,
      category,
      farm_id
    ) VALUES (
      p_name,
      p_category_id,
      p_subcategory_id,
      p_quantity,
      p_unit,
      p_minimum_level,
      p_price_per_unit,
      p_supplier,
      p_category,
      farm_record.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insert products for each farm
DO $$ 
BEGIN
  PERFORM insert_product_for_farms(
    'Borovell',
    get_category_id('fertilizer'),
    get_subcategory_id('fertilizer', 'micronutrients'),
    0,
    'L',
    10,
    45.00,
    'AgroSupplies',
    'fertilizer'
  );

  PERFORM insert_product_for_farms(
    'Zinvell',
    get_category_id('fertilizer'),
    get_subcategory_id('fertilizer', 'micronutrients'),
    0,
    'L',
    10,
    38.50,
    'AgroSupplies',
    'fertilizer'
  );

  PERFORM insert_product_for_farms(
    'Mangazinc',
    get_category_id('fertilizer'),
    get_subcategory_id('fertilizer', 'micronutrients'),
    0,
    'kg',
    15,
    42.00,
    'AgroSupplies',
    'fertilizer'
  );

  PERFORM insert_product_for_farms(
    'Progibb 50 SG',
    get_category_id('phytosanitary'),
    get_subcategory_id('phytosanitary', 'growth_regulator'),
    0,
    'g',
    100,
    85.00,
    'PhytoTech',
    'medicine'
  );

  PERFORM insert_product_for_farms(
    'Vellamin 24',
    get_category_id('fertilizer'),
    get_subcategory_id('fertilizer', 'amino_acids'),
    0,
    'L',
    20,
    32.50,
    'AgroSupplies',
    'fertilizer'
  );
END $$;

-- Drop the helper functions
DROP FUNCTION get_category_id;
DROP FUNCTION get_subcategory_id;
DROP FUNCTION insert_product_for_farms;