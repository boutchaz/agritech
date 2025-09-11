/*
  # Add task categories and specialties

  1. Changes
    - Create task_categories table if not exists
    - Create junction table for day laborer specialties
    - Add default task categories
    - Remove old specialties columns
    
  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create task_categories table if not exists
CREATE TABLE IF NOT EXISTS task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create junction table for day laborer specialties
CREATE TABLE IF NOT EXISTS day_laborer_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_laborer_id uuid REFERENCES day_laborers(id) ON DELETE CASCADE,
  category_id uuid REFERENCES task_categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(day_laborer_id, category_id)
);

-- Enable RLS
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_laborer_specialties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access for authenticated users on task_categories" ON task_categories;
DROP POLICY IF EXISTS "Users can manage specialties for their laborers" ON day_laborer_specialties;

-- Create policies
CREATE POLICY "Allow read access for authenticated users on task_categories"
  ON task_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage specialties for their laborers"
  ON day_laborer_specialties
  FOR ALL
  TO authenticated
  USING (
    day_laborer_id IN (
      SELECT id FROM day_laborers
      WHERE farm_id IN (
        SELECT id FROM farms
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    day_laborer_id IN (
      SELECT id FROM day_laborers
      WHERE farm_id IN (
        SELECT id FROM farms
        WHERE user_id = auth.uid()
      )
    )
  );

-- Insert default task categories if they don't exist
INSERT INTO task_categories (name, description)
SELECT name, description
FROM (VALUES
  ('Taille', 'Taille des arbres et arbustes'),
  ('Récolte', 'Récolte des fruits et produits'),
  ('Traitement', 'Application des traitements phytosanitaires'),
  ('Irrigation', 'Gestion et maintenance de l''irrigation'),
  ('Fertilisation', 'Application des engrais et amendements'),
  ('Désherbage', 'Contrôle des mauvaises herbes'),
  ('Plantation', 'Plantation des arbres et cultures')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM task_categories WHERE name = v.name
);

-- Remove old specialties columns if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'day_laborers' AND column_name = 'specialties'
  ) THEN
    ALTER TABLE day_laborers DROP COLUMN specialties;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'day_laborers' AND column_name = 'task_types'
  ) THEN
    ALTER TABLE day_laborers DROP COLUMN task_types;
  END IF;
END $$;