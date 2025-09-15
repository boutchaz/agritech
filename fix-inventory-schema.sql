-- Fix inventory schema to match frontend expectations
-- This script adds missing tables and columns for the stock management system

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product_subcategories table
CREATE TABLE IF NOT EXISTS product_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name),
  UNIQUE(category_id, code)
);

-- Drop existing inventory table and recreate with proper schema
DROP TABLE IF EXISTS inventory;

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

-- Create purchases table for tracking stock purchases
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  price_per_unit numeric NOT NULL,
  total_price numeric GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier text,
  notes text,
  farm_id uuid NOT NULL REFERENCES farms(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for product_categories (read-only for authenticated users)
CREATE POLICY "Allow read access for authenticated users on product_categories"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for product_subcategories (read-only for authenticated users)
CREATE POLICY "Allow read access for authenticated users on product_subcategories"
  ON product_subcategories FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for inventory (users can manage inventory in their farms)
CREATE POLICY "Users can manage inventory in their farms"
  ON inventory FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

-- Create policies for purchases (users can manage purchases in their farms)
CREATE POLICY "Users can manage purchases in their farms"
  ON purchases FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

-- Add update triggers
CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_subcategories_updated_at
    BEFORE UPDATE ON product_subcategories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default product categories
INSERT INTO product_categories (name, code, description) VALUES
  ('Semences', 'SEM', 'Graines et semences pour plantation'),
  ('Engrais', 'ENG', 'Engrais et amendements du sol'),
  ('Phytosanitaires', 'PHY', 'Produits de protection des plantes'),
  ('Outillage', 'OUT', 'Outils et équipements agricoles'),
  ('Irrigation', 'IRR', 'Équipements d''irrigation'),
  ('Alimentation', 'ALI', 'Aliments pour animaux'),
  ('Santé animale', 'SAN', 'Médicaments et produits vétérinaires'),
  ('Emballage', 'EMB', 'Matériaux d''emballage'),
  ('Carburants', 'CAR', 'Carburants et lubrifiants'),
  ('Équipements', 'EQU', 'Machines et équipements agricoles')
ON CONFLICT (name) DO NOTHING;

-- Insert some default subcategories
INSERT INTO product_subcategories (category_id, name, code, description) VALUES
  ((SELECT id FROM product_categories WHERE code = 'SEM'), 'Légumes', 'SEM-LEG', 'Semences de légumes'),
  ((SELECT id FROM product_categories WHERE code = 'SEM'), 'Fruits', 'SEM-FRU', 'Semences d''arbres fruitiers'),
  ((SELECT id FROM product_categories WHERE code = 'SEM'), 'Céréales', 'SEM-CER', 'Semences de céréales'),
  ((SELECT id FROM product_categories WHERE code = 'ENG'), 'Azotés', 'ENG-AZO', 'Engrais azotés'),
  ((SELECT id FROM product_categories WHERE code = 'ENG'), 'Phosphatés', 'ENG-PHO', 'Engrais phosphatés'),
  ((SELECT id FROM product_categories WHERE code = 'ENG'), 'Potassiques', 'ENG-POT', 'Engrais potassiques'),
  ((SELECT id FROM product_categories WHERE code = 'PHY'), 'Insecticides', 'PHY-INS', 'Produits contre les insectes'),
  ((SELECT id FROM product_categories WHERE code = 'PHY'), 'Fongicides', 'PHY-FON', 'Produits contre les champignons'),
  ((SELECT id FROM product_categories WHERE code = 'PHY'), 'Herbicides', 'PHY-HER', 'Produits contre les mauvaises herbes'),
  ((SELECT id FROM product_categories WHERE code = 'OUT'), 'Manuels', 'OUT-MAN', 'Outils manuels'),
  ((SELECT id FROM product_categories WHERE code = 'OUT'), 'Électriques', 'OUT-ELE', 'Outils électriques')
ON CONFLICT (category_id, name) DO NOTHING;