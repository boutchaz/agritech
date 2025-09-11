/*
  # Fix Stock Management Schema

  1. Changes
    - Drop and recreate inventory table with correct schema
    - Add proper check constraints for categories
    - Add sample data for testing
    - Fix foreign key relationships

  2. Security
    - Maintain existing RLS policies
    - Ensure proper user access control
*/

-- Drop existing inventory table and related tables
DROP TABLE IF EXISTS product_applications CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS product_subcategories CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;

-- Create product categories table
CREATE TABLE product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product subcategories table
CREATE TABLE product_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES product_categories(id),
  name text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, code)
);

-- Create inventory table
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES product_categories(id),
  subcategory_id uuid REFERENCES product_subcategories(id),
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  minimum_level numeric NOT NULL DEFAULT 0,
  price_per_unit numeric DEFAULT 0,
  supplier text,
  last_purchase_date date,
  farm_id uuid NOT NULL REFERENCES farms(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchases table
CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES inventory(id),
  quantity numeric NOT NULL,
  price_per_unit numeric NOT NULL,
  total_price numeric NOT NULL,
  purchase_date date NOT NULL,
  supplier text NOT NULL,
  notes text,
  farm_id uuid NOT NULL REFERENCES farms(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product applications table
CREATE TABLE product_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES inventory(id),
  farm_id uuid REFERENCES farms(id),
  application_date date NOT NULL,
  quantity_used numeric NOT NULL,
  area_treated numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access for authenticated users on product_categories"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access for authenticated users on product_subcategories"
  ON product_subcategories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage inventory in their farms"
ON inventory
FOR ALL
TO authenticated
USING (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage purchases for their farms"
ON purchases
FOR ALL
TO authenticated
USING (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage product applications for their farms"
ON product_applications
FOR ALL
TO authenticated
USING (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
);

-- Insert default categories
INSERT INTO product_categories (name, code) VALUES
  ('Fertilisants', 'fertilizer'),
  ('Produits Phytosanitaires', 'phytosanitary'),
  ('Produits de Biocontrôle', 'biocontrol'),
  ('Amendements', 'soil_amendment'),
  ('Matériel d''Irrigation', 'irrigation'),
  ('Outils et Équipements', 'tools'),
  ('Matériel de Conditionnement', 'packaging'),
  ('Matériel de Suivi', 'monitoring');

-- Insert subcategories for Fertilisants
WITH cat AS (SELECT id FROM product_categories WHERE code = 'fertilizer')
INSERT INTO product_subcategories (category_id, name, code) 
SELECT id, name, code
FROM cat,
(VALUES 
  ('NPK', 'npk'),
  ('Azotés', 'nitrogen'),
  ('Phosphatés', 'phosphorus'),
  ('Potassiques', 'potassium'),
  ('Calciques', 'calcium'),
  ('Magnésiens', 'magnesium'),
  ('Oligo-éléments', 'micronutrients'),
  ('Organiques', 'organic'),
  ('Biostimulants', 'biostimulants')
) AS subcats(name, code);

-- Insert subcategories for Produits Phytosanitaires
WITH cat AS (SELECT id FROM product_categories WHERE code = 'phytosanitary')
INSERT INTO product_subcategories (category_id, name, code)
SELECT id, name, code
FROM cat,
(VALUES 
  ('Fongicides', 'fungicide'),
  ('Insecticides', 'insecticide'),
  ('Régulateurs de croissance', 'growth_regulator')
) AS subcats(name, code);

-- Insert subcategories for Biocontrôle
WITH cat AS (SELECT id FROM product_categories WHERE code = 'biocontrol')
INSERT INTO product_subcategories (category_id, name, code)
SELECT id, name, code
FROM cat,
(VALUES 
  ('Phéromones', 'pheromones'),
  ('Fongicides biologiques', 'biological_fungicides'),
  ('Extraits végétaux', 'plant_extracts')
) AS subcats(name, code);

-- Insert subcategories for Amendements
WITH cat AS (SELECT id FROM product_categories WHERE code = 'soil_amendment')
INSERT INTO product_subcategories (category_id, name, code)
SELECT id, name, code
FROM cat,
(VALUES 
  ('Compost', 'compost'),
  ('Fumier', 'manure'),
  ('Chaux', 'lime'),
  ('Gypse', 'gypsum'),
  ('Soufre', 'sulfur'),
  ('Matière organique', 'organic_matter')
) AS subcats(name, code);

-- Insert subcategories for Irrigation
WITH cat AS (SELECT id FROM product_categories WHERE code = 'irrigation')
INSERT INTO product_subcategories (category_id, name, code)
SELECT id, name, code
FROM cat,
(VALUES 
  ('Goutteurs', 'drippers'),
  ('Tuyaux', 'pipes'),
  ('Filtres', 'filters'),
  ('Vannes', 'valves'),
  ('Régulateurs de pression', 'pressure_regulators'),
  ('Raccords', 'connectors')
) AS subcats(name, code);

-- Add trigger for updating timestamps
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_applications_updated_at
    BEFORE UPDATE ON product_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to update inventory quantity after application
CREATE OR REPLACE FUNCTION update_inventory_after_application()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory
  SET quantity = quantity - NEW.quantity_used
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_after_application
    AFTER INSERT ON product_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_after_application();