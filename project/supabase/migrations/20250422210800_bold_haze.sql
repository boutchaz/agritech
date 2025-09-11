/*
  # Add detailed product categories

  1. Changes
    - Add product_categories table to store hierarchical categories
    - Add subcategories table for detailed categorization
    - Update inventory table to reference new category structure
    - Add sample data for categories

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create product categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create product subcategories table
CREATE TABLE IF NOT EXISTS product_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES product_categories(id),
  name text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, code)
);

-- Modify inventory table
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES product_categories(id),
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES product_subcategories(id);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access for authenticated users on product_categories"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read access for authenticated users on product_subcategories"
  ON product_subcategories FOR SELECT
  TO authenticated
  USING (true);

-- Insert default categories and subcategories
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
  ('Acides aminés avec micro-éléments', 'amino_acids_micro'),
  ('Acides aminés', 'amino_acids'),
  ('Acides fulviques', 'fulvic_acids'),
  ('Acides humiques', 'humic_acids'),
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
  ('Herbicides', 'herbicide'),
  ('Fongicides', 'fungicide'),
  ('Acaricides', 'acaricide'),
  ('Insecticides', 'insecticide'),
  ('Nématicides', 'nematicide'),
  ('Bactéricides', 'bactericide'),
  ('Régulateurs de croissance', 'growth_regulator')
) AS subcats(name, code);

-- Insert subcategories for Biocontrôle
WITH cat AS (SELECT id FROM product_categories WHERE code = 'biocontrol')
INSERT INTO product_subcategories (category_id, name, code)
SELECT id, name, code
FROM cat,
(VALUES 
  ('Insectes auxiliaires', 'beneficial_insects'),
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

-- Insert subcategories for Outils
WITH cat AS (SELECT id FROM product_categories WHERE code = 'tools')
INSERT INTO product_subcategories (category_id, name, code)
SELECT id, name, code
FROM cat,
(VALUES 
  ('Outils de taille', 'pruning_tools'),
  ('Outils de récolte', 'harvesting_tools'),
  ('Matériel de pulvérisation', 'spraying_equipment'),
  ('Équipements de sécurité', 'safety_equipment'),
  ('Outils de mesure', 'measurement_tools')
) AS subcats(name, code);

-- Insert subcategories for Conditionnement
WITH cat AS (SELECT id FROM product_categories WHERE code = 'packaging')
INSERT INTO product_subcategories (category_id, name, code)
SELECT id, name, code
FROM cat,
(VALUES 
  ('Caisses', 'boxes'),
  ('Sacs', 'bags'),
  ('Étiquettes', 'labels'),
  ('Palettes', 'pallets')
) AS subcats(name, code);

-- Insert subcategories for Matériel de Suivi
WITH cat AS (SELECT id FROM product_categories WHERE code = 'monitoring')
INSERT INTO product_subcategories (category_id, name, code)
SELECT id, name, code
FROM cat,
(VALUES 
  ('Stations météo', 'weather_stations'),
  ('Capteurs de sol', 'soil_sensors'),
  ('Pièges', 'traps'),
  ('Enregistreurs de données', 'data_loggers')
) AS subcats(name, code);