/*
  # Add Product Catalog Schema

  1. Changes
    - Add new columns to product_categories and product_subcategories
    - Create product_catalog table for predefined products
    - Update existing categories and add new ones
    - Add sample products

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Add description column to categories if not exists
ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS description text;

-- Add description column to subcategories if not exists
ALTER TABLE product_subcategories
ADD COLUMN IF NOT EXISTS description text;

-- Create product catalog table
CREATE TABLE IF NOT EXISTS product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES product_categories(id),
  subcategory_id uuid REFERENCES product_subcategories(id),
  name text NOT NULL,
  description text,
  composition text,
  dosage text,
  usage text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow read access for authenticated users on product_catalog"
  ON product_catalog FOR SELECT
  TO authenticated
  USING (true);

-- Clear existing categories and subcategories
TRUNCATE product_subcategories CASCADE;
TRUNCATE product_categories CASCADE;

-- Insert categories
INSERT INTO product_categories (name, code, description) VALUES
  ('Fertilisant', 'fertilizer', 'Produits pour la nutrition des plantes'),
  ('Hygiène publique', 'hygiene', 'Produits pour l''hygiène et la désinfection'),
  ('Produits phytosanitaires', 'phytosanitary', 'Produits de protection des cultures'),
  ('Semences', 'seeds', 'Semences et plants'),
  ('Matériels agricoles et jardinage', 'equipment', 'Équipements et outils agricoles');

-- Insert subcategories for Fertilisant
WITH cat AS (SELECT id FROM product_categories WHERE code = 'fertilizer')
INSERT INTO product_subcategories (category_id, name, code) 
SELECT id, name, code
FROM cat,
(VALUES 
  ('Acides aminés avec microéléments', 'amino_acids_micro'),
  ('Acides aminés', 'amino_acids'),
  ('Acides fulviques', 'fulvic_acids'),
  ('Acides humiques', 'humic_acids'),
  ('Biostimulants', 'biostimulants'),
  ('Correcteur de carences', 'deficiency_corrector'),
  ('Engrais spécial', 'special_fertilizer'),
  ('Générateurs de défenses', 'defense_generators'),
  ('NPK gel', 'npk_gel'),
  ('NPK liquide concentré', 'npk_liquid')
) AS subcats(name, code);

-- Insert subcategories for Hygiène publique
WITH cat AS (SELECT id FROM product_categories WHERE code = 'hygiene')
INSERT INTO product_subcategories (category_id, name, code)
SELECT id, name, code
FROM cat,
(VALUES 
  ('Insecticide inodore', 'odorless_insecticide'),
  ('Insecticide avec odeur', 'scented_insecticide'),
  ('Rodenticides', 'rodenticides'),
  ('Larvicides', 'larvicides'),
  ('Gel', 'gel'),
  ('Accessoires', 'accessories')
) AS subcats(name, code);

-- Insert subcategories for Produits phytosanitaires
WITH cat AS (SELECT id FROM product_categories WHERE code = 'phytosanitary')
INSERT INTO product_subcategories (category_id, name, code)
SELECT id, name, code
FROM cat,
(VALUES 
  ('Herbicide', 'herbicide'),
  ('Fongicides', 'fungicide'),
  ('Acaricides', 'acaricide')
) AS subcats(name, code);

-- Insert products into catalog
WITH 
  amino_micro AS (
    SELECT s.id as subcategory_id, c.id as category_id 
    FROM product_subcategories s 
    JOIN product_categories c ON c.id = s.category_id 
    WHERE s.code = 'amino_acids_micro'
  ),
  amino AS (
    SELECT s.id as subcategory_id, c.id as category_id 
    FROM product_subcategories s 
    JOIN product_categories c ON c.id = s.category_id 
    WHERE s.code = 'amino_acids'
  )
INSERT INTO product_catalog (
  category_id,
  subcategory_id,
  name,
  description,
  composition,
  dosage,
  usage
) VALUES
  (
    (SELECT category_id FROM amino_micro),
    (SELECT subcategory_id FROM amino_micro),
    'Vellamin Ca 1L',
    '2,5-5 ml par litre d''eau. Répéter 5 à 6 fois à l''apparition des fruits. Par voie foliaire ou irrigation.',
    '7% acétate de calcium',
    '2,5-5 ml/L',
    'Contrôle des carences en calcium, améliore la qualité et la consistance des fruits.'
  ),
  (
    (SELECT category_id FROM amino_micro),
    (SELECT subcategory_id FROM amino_micro),
    'Vellamin Fe 1L',
    'Correcteur des carences en fer. Produit à base de biomolécules organiques naturelles et d''acides aminés L-α.',
    'Fer (Fe) 6%, Acides aminés libres 6%',
    '5-10L/Ha (radiculaire), 2,5-5 ml/L ou 2,5-5L/Ha (foliaire)',
    'Pour conditions de stress, et correction rapide des carences en fer.'
  ),
  (
    (SELECT category_id FROM amino_micro),
    (SELECT subcategory_id FROM amino_micro),
    'Vellamin Fe 5L',
    'Même formulation que Vellamin Fe 1L, mais en format 5L.',
    'Fer (Fe) 6%, Acides aminés libres 6%',
    '5-10L/Ha (radiculaire), 2,5-5 ml/L ou 2,5-5L/Ha (foliaire)',
    'Pour conditions de stress, et correction rapide des carences en fer.'
  ),
  (
    (SELECT category_id FROM amino),
    (SELECT subcategory_id FROM amino),
    'Vellamin 24 1L',
    'Apport direct en L-aminoacides pour stimuler le métabolisme des plantes.',
    'Acides aminés 24%, Azote total 6,8%, Azote organique 5,4%, Azote uréique 1,4%, Matière organique 50%',
    'Foliaire : 200-300 cc/100L ; Radiculaire : 8 à 40 L/Ha selon irrigation',
    'Favorise la récupération des cultures, améliore l''efficacité des traitements phytosanitaires.'
  ),
  (
    (SELECT category_id FROM amino),
    (SELECT subcategory_id FROM amino),
    'Vellamin 24 5L',
    'Même produit que Vellamin 24 1L en format 5L.',
    'Acides aminés 24%, Azote total 6,8%, Azote organique 5,4%, Azote uréique 1,4%, Matière organique 50%',
    'Foliaire : 200-300 cc/100L ; Radiculaire : 8 à 40 L/Ha selon irrigation',
    'Favorise la récupération des cultures, améliore l''efficacité des traitements phytosanitaires.'
  );