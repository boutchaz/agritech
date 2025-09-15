/*
  # Initial Schema Setup for Agricultural Management System

  1. New Tables
    - All tables from previous migration
    - Fixed syntax for column comments
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users (with IF NOT EXISTS)
    - Prevent duplicate entries in crop types, categories, and varieties

  3. Triggers
    - Add triggers to prevent duplicate entries (with IF NOT EXISTS)
    - Add triggers for updating timestamps
*/

-- Create trigger functions
CREATE OR REPLACE FUNCTION prevent_duplicate_crop_type()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM crop_types
    WHERE LOWER(name) = LOWER(NEW.name)
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'A crop type with this name already exists';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_duplicate_crop_category()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM crop_categories
    WHERE LOWER(name) = LOWER(NEW.name)
    AND type_id = NEW.type_id
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'A crop category with this name already exists for this type';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_duplicate_crop_variety()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM crop_varieties
    WHERE LOWER(name) = LOWER(NEW.name)
    AND category_id = NEW.category_id
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'A crop variety with this name already exists for this category';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create tables
CREATE TABLE IF NOT EXISTS crop_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crop_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id uuid NOT NULL REFERENCES crop_types(id),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crop_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES crop_categories(id),
  name text NOT NULL,
  description text,
  planting_period text,
  recommended_climate text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tree_yield_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variety_id uuid REFERENCES crop_varieties(id),
  min_age integer NOT NULL,
  max_age integer NOT NULL,
  min_yield numeric NOT NULL,
  max_yield numeric NOT NULL,
  unit text NOT NULL DEFAULT 'kg/tree',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES task_categories(id),
  variety_id uuid REFERENCES crop_varieties(id),
  name text NOT NULL,
  description text,
  season text NOT NULL CHECK (season IN ('winter', 'spring', 'summer', 'autumn')),
  month_start integer CHECK (month_start BETWEEN 1 AND 12),
  month_end integer CHECK (month_end BETWEEN 1 AND 12),
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  estimated_duration interval,
  recommendations text[],
  alerts text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  size numeric NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  variety_id uuid REFERENCES crop_varieties(id),
  planting_date date NOT NULL,
  harvest_date date,
  status text NOT NULL CHECK (status IN ('planned', 'planted', 'growing', 'harvested')),
  field_id text NOT NULL,
  farm_id uuid NOT NULL REFERENCES farms(id),
  expected_yield numeric,
  notes text,
  irrigation_method text,
  irrigation_frequency text,
  fertilizer_type text,
  fertilizer_schedule text,
  planting_density numeric,
  trees_count integer,
  soil_type text,
  pruning_date date,
  last_soil_analysis date,
  irrigation_type text,
  disease_history jsonb,
  satellite_imagery jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add comment for satellite_imagery column
COMMENT ON COLUMN crops.satellite_imagery IS 'Satellite imagery data including NDVI (biomass) and NDRE (chlorophyll) indices';

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES task_templates(id),
  crop_id uuid REFERENCES crops(id),
  category_id uuid REFERENCES task_categories(id),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  assigned_to uuid REFERENCES auth.users(id),
  planned_start_date date NOT NULL,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS harvests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid REFERENCES crops(id),
  harvest_date date NOT NULL,
  quantity numeric NOT NULL,
  quality text NOT NULL CHECK (quality IN ('excellent', 'good', 'average', 'poor')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS livestock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  quantity integer NOT NULL,
  health text NOT NULL CHECK (health IN ('good', 'attention', 'critical')),
  last_checkup date NOT NULL,
  farm_id uuid NOT NULL REFERENCES farms(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('seeds', 'fertilizer', 'feed', 'medicine', 'equipment')),
  quantity numeric NOT NULL,
  unit text NOT NULL,
  minimum_level numeric NOT NULL,
  farm_id uuid NOT NULL REFERENCES farms(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL,
  category text NOT NULL,
  date date NOT NULL,
  description text,
  farm_id uuid NOT NULL REFERENCES farms(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add triggers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_crop_type_duplicate') THEN
    CREATE TRIGGER check_crop_type_duplicate
      BEFORE INSERT OR UPDATE ON crop_types
      FOR EACH ROW
      EXECUTE FUNCTION prevent_duplicate_crop_type();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_crop_category_duplicate') THEN
    CREATE TRIGGER check_crop_category_duplicate
      BEFORE INSERT OR UPDATE ON crop_categories
      FOR EACH ROW
      EXECUTE FUNCTION prevent_duplicate_crop_category();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_crop_variety_duplicate') THEN
    CREATE TRIGGER check_crop_variety_duplicate
      BEFORE INSERT OR UPDATE ON crop_varieties
      FOR EACH ROW
      EXECUTE FUNCTION prevent_duplicate_crop_variety();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE crop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_yield_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crop_types' 
    AND policyname = 'Allow read access for authenticated users on crop_types'
  ) THEN
    CREATE POLICY "Allow read access for authenticated users on crop_types"
      ON crop_types FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crop_categories' 
    AND policyname = 'Allow read access for authenticated users on crop_categories'
  ) THEN
    CREATE POLICY "Allow read access for authenticated users on crop_categories"
      ON crop_categories FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crop_varieties' 
    AND policyname = 'Allow read access for authenticated users on crop_varieties'
  ) THEN
    CREATE POLICY "Allow read access for authenticated users on crop_varieties"
      ON crop_varieties FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tree_yield_ranges' 
    AND policyname = 'Allow read access for authenticated users on tree_yield_ranges'
  ) THEN
    CREATE POLICY "Allow read access for authenticated users on tree_yield_ranges"
      ON tree_yield_ranges FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'task_categories' 
    AND policyname = 'Allow read access for authenticated users on task_categories'
  ) THEN
    CREATE POLICY "Allow read access for authenticated users on task_categories"
      ON task_categories FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'task_templates' 
    AND policyname = 'Allow read access for authenticated users on task_templates'
  ) THEN
    CREATE POLICY "Allow read access for authenticated users on task_templates"
      ON task_templates FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'farms' 
    AND policyname = 'Users can manage their own farms'
  ) THEN
    CREATE POLICY "Users can manage their own farms"
      ON farms FOR ALL
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crops' 
    AND policyname = 'Users can manage crops in their farms'
  ) THEN
    CREATE POLICY "Users can manage crops in their farms"
      ON crops FOR ALL
      TO authenticated
      USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
      WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tasks' 
    AND policyname = 'Users can manage tasks for their farms'
  ) THEN
    CREATE POLICY "Users can manage tasks for their farms"
      ON tasks FOR ALL
      TO authenticated
      USING (crop_id IN (
        SELECT c.id FROM crops c
        JOIN farms f ON c.farm_id = f.id
        WHERE f.user_id = auth.uid()
      ))
      WITH CHECK (crop_id IN (
        SELECT c.id FROM crops c
        JOIN farms f ON c.farm_id = f.id
        WHERE f.user_id = auth.uid()
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'harvests' 
    AND policyname = 'Users can manage harvests for their crops'
  ) THEN
    CREATE POLICY "Users can manage harvests for their crops"
      ON harvests FOR ALL
      TO authenticated
      USING (crop_id IN (
        SELECT c.id FROM crops c
        JOIN farms f ON c.farm_id = f.id
        WHERE f.user_id = auth.uid()
      ))
      WITH CHECK (crop_id IN (
        SELECT c.id FROM crops c
        JOIN farms f ON c.farm_id = f.id
        WHERE f.user_id = auth.uid()
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'livestock' 
    AND policyname = 'Users can manage livestock in their farms'
  ) THEN
    CREATE POLICY "Users can manage livestock in their farms"
      ON livestock FOR ALL
      TO authenticated
      USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory' 
    AND policyname = 'Users can manage inventory in their farms'
  ) THEN
    CREATE POLICY "Users can manage inventory in their farms"
      ON inventory FOR ALL
      TO authenticated
      USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'financial_transactions' 
    AND policyname = 'Users can manage financial transactions in their farms'
  ) THEN
    CREATE POLICY "Users can manage financial transactions in their farms"
      ON financial_transactions FOR ALL
      TO authenticated
      USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));
  END IF;
END $$;/*
  # Add parcels table and relations

  1. New Tables
    - `parcels`
      - `id` (uuid, primary key)
      - `name` (text)
      - `boundary` (jsonb) - Stores the parcel boundary coordinates
      - `crop_id` (uuid) - References the crops table
      - `soil_type` (text)
      - `area` (numeric) - Size in hectares
      - `planting_density` (integer) - Trees per hectare
      - `irrigation_type` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on parcels table
    - Add policy for authenticated users to manage their parcels

  3. Relations
    - Link parcels to crops table
*/

CREATE TABLE IF NOT EXISTS parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  boundary jsonb NOT NULL,
  crop_id uuid REFERENCES crops(id),
  soil_type text,
  area numeric,
  planting_density integer,
  irrigation_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their parcels"
  ON parcels FOR ALL
  TO authenticated
  USING (
    crop_id IN (
      SELECT c.id 
      FROM crops c
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    crop_id IN (
      SELECT c.id 
      FROM crops c
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

-- Add trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parcels_updated_at
    BEFORE UPDATE ON parcels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();/*
  # Add Soil Analysis Tables

  1. New Tables
    - soil_analyses: Stores detailed soil analysis data
    - soil_recommendations: Stores recommendations based on soil analysis

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create soil_analyses table
CREATE TABLE IF NOT EXISTS soil_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid REFERENCES parcels(id),
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  physical jsonb NOT NULL,
  chemical jsonb NOT NULL,
  biological jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create soil_recommendations table
CREATE TABLE IF NOT EXISTS soil_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES soil_analyses(id),
  recommendation text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  category text NOT NULL CHECK (category IN ('amendment', 'fertilization', 'biological', 'management')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE soil_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE soil_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage soil analyses for their parcels"
  ON soil_analyses FOR ALL
  TO authenticated
  USING (
    parcel_id IN (
      SELECT p.id 
      FROM parcels p
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    parcel_id IN (
      SELECT p.id 
      FROM parcels p
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage soil recommendations for their analyses"
  ON soil_recommendations FOR ALL
  TO authenticated
  USING (
    analysis_id IN (
      SELECT sa.id 
      FROM soil_analyses sa
      JOIN parcels p ON sa.parcel_id = p.id
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    analysis_id IN (
      SELECT sa.id 
      FROM soil_analyses sa
      JOIN parcels p ON sa.parcel_id = p.id
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

-- Add triggers for updating timestamps
CREATE TRIGGER update_soil_analyses_updated_at
    BEFORE UPDATE ON soil_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soil_recommendations_updated_at
    BEFORE UPDATE ON soil_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();/*
  # Add Soil Test Types and Update Soil Analyses

  1. New Tables
    - `soil_test_types`: Types d'analyses de sol disponibles
    - Mise à jour de la table `soil_analyses` existante

  2. Security
    - Enable RLS on soil_test_types
    - Add policy for authenticated users
*/

-- Create soil_test_types table
CREATE TABLE IF NOT EXISTS soil_test_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add test_type_id to existing soil_analyses table
ALTER TABLE soil_analyses 
  ADD COLUMN IF NOT EXISTS test_type_id uuid REFERENCES soil_test_types(id),
  ADD COLUMN IF NOT EXISTS notes text;

-- Enable RLS
ALTER TABLE soil_test_types ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow read access for authenticated users on soil_test_types"
  ON soil_test_types FOR SELECT
  TO authenticated
  USING (true);

-- Insert default test types
INSERT INTO soil_test_types (name, code, description) VALUES
  ('Analyse de base', 'basic', 'Analyse standard incluant texture, pH, matière organique, phosphore et potassium'),
  ('Analyse complète', 'complete', 'Analyse approfondie incluant tous les paramètres de base plus azote et autres éléments'),
  ('Analyse spécialisée arboriculture', 'specialized', 'Analyse adaptée aux besoins spécifiques des cultures arboricoles');/*
  # Add INSERT policy for soil analyses

  1. Changes
    - Add RLS policy to allow authenticated users to insert soil analyses for parcels they own
    
  2. Security
    - Users can only insert soil analyses for parcels that belong to their farms
    - Maintains existing read policy
*/

CREATE POLICY "Users can insert soil analyses for their parcels"
ON public.soil_analyses
FOR INSERT
TO authenticated
WITH CHECK (
  parcel_id IN (
    SELECT p.id
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);/*
  # Fix soil analyses RLS policies

  1. Changes
    - Drop existing RLS policies for soil_analyses table
    - Create new comprehensive RLS policies that properly handle all operations
    
  2. Security
    - Enable RLS on soil_analyses table
    - Add policies for:
      - Inserting new soil analyses
      - Reading existing soil analyses
      - Updating soil analyses
      - Deleting soil analyses
    - All policies verify user ownership through farm association
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert soil analyses for their parcels" ON soil_analyses;
DROP POLICY IF EXISTS "Users can manage soil analyses for their parcels" ON soil_analyses;

-- Create new comprehensive policies
CREATE POLICY "Enable read access for users own soil analyses"
ON soil_analyses
FOR SELECT
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable insert access for users own parcels"
ON soil_analyses
FOR INSERT
TO authenticated
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update access for users own soil analyses"
ON soil_analyses
FOR UPDATE
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
)
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete access for users own soil analyses"
ON soil_analyses
FOR DELETE
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);/*
  # Update soil analyses RLS policies

  1. Changes
    - Modify RLS policies for soil_analyses table to properly handle insert operations
    - Ensure policy checks follow the correct relationship chain:
      soil_analyses -> parcels -> crops -> farms -> user_id

  2. Security
    - Enable RLS (already enabled)
    - Update policies to properly check ownership through the relationship chain
    - Maintain existing read/update/delete policies
*/

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Enable insert access for users own parcels" ON soil_analyses;

-- Create new insert policy with correct ownership check
CREATE POLICY "Enable insert access for users own parcels" ON soil_analyses
FOR INSERT
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);/*
  # Fix soil analyses RLS policies

  1. Changes
    - Drop existing RLS policies for soil_analyses table
    - Create new policies with correct roles and conditions
    - Ensure authenticated users can:
      - Insert soil analyses for parcels they own
      - Read their own soil analyses
      - Update their own soil analyses
      - Delete their own soil analyses

  2. Security
    - Policies are scoped to authenticated users only
    - Access is restricted to soil analyses for parcels owned by the user
    - All operations verify ownership through the farm -> crop -> parcel chain
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable delete access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable insert access for users own parcels" ON soil_analyses;
DROP POLICY IF EXISTS "Enable read access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable update access for users own soil analyses" ON soil_analyses;

-- Create new policies with correct roles and conditions
CREATE POLICY "Enable insert for users own parcels"
ON soil_analyses
FOR INSERT
TO authenticated
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable read for users own soil analyses"
ON soil_analyses
FOR SELECT
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for users own soil analyses"
ON soil_analyses
FOR UPDATE
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
)
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete for users own soil analyses"
ON soil_analyses
FOR DELETE
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);/*
  # Update soil analyses RLS policies

  1. Changes
    - Drop existing RLS policies for soil_analyses table
    - Create new comprehensive RLS policies that properly handle all operations
    - Ensure proper access control based on farm ownership

  2. Security
    - Enable RLS on soil_analyses table
    - Add policies for:
      - SELECT: Users can read soil analyses for their farms' parcels
      - INSERT: Users can create soil analyses for their farms' parcels
      - UPDATE: Users can update soil analyses for their farms' parcels
      - DELETE: Users can delete soil analyses for their farms' parcels
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable insert for users own parcels" ON soil_analyses;
DROP POLICY IF EXISTS "Enable update for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable delete for users own soil analyses" ON soil_analyses;

-- Create new comprehensive policies
CREATE POLICY "Enable read access for users own soil analyses"
ON soil_analyses FOR SELECT
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable insert access for users own soil analyses"
ON soil_analyses FOR INSERT
TO authenticated
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update access for users own soil analyses"
ON soil_analyses FOR UPDATE
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
)
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete access for users own soil analyses"
ON soil_analyses FOR DELETE
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);/*
  # Update soil analyses RLS policies

  1. Changes
    - Drop existing RLS policies for soil_analyses table
    - Create new comprehensive RLS policies that properly handle all operations
    - Ensure proper validation of parcel ownership through farms hierarchy

  2. Security
    - Enable RLS on soil_analyses table
    - Add policies for:
      - SELECT: Users can read soil analyses for parcels in their farms
      - INSERT: Users can create soil analyses for parcels in their farms
      - UPDATE: Users can update soil analyses for parcels in their farms
      - DELETE: Users can delete soil analyses for parcels in their farms
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable insert access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable update access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable delete access for users own soil analyses" ON soil_analyses;

-- Create new comprehensive policies
CREATE POLICY "Enable read access for users own soil analyses"
ON soil_analyses FOR SELECT
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable insert access for users own soil analyses"
ON soil_analyses FOR INSERT
TO authenticated
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update access for users own soil analyses"
ON soil_analyses FOR UPDATE
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
)
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete access for users own soil analyses"
ON soil_analyses FOR DELETE
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);/*
  # Fix RLS policies for soil analyses table

  1. Changes
    - Drop existing RLS policies for soil_analyses table
    - Create new consolidated RLS policy that properly handles all operations
    - Ensure policy checks user ownership through the parcel -> crop -> farm chain
  
  2. Security
    - Maintains RLS enabled on soil_analyses table
    - Creates single policy that handles all operations (SELECT, INSERT, UPDATE, DELETE)
    - Verifies user ownership through proper table relationships
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable delete access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable insert access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable read access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable update access for users own soil analyses" ON soil_analyses;

-- Create new consolidated policy
CREATE POLICY "Users can manage their own soil analyses" ON soil_analyses
  FOR ALL
  TO authenticated
  USING (
    parcel_id IN (
      SELECT p.id 
      FROM parcels p
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    parcel_id IN (
      SELECT p.id 
      FROM parcels p
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );/*
  # Update soil analyses table schema

  1. Changes
    - Drop existing soil_analyses table
    - Create new soil_analyses table with correct columns
    - Recreate RLS policy
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS soil_analyses CASCADE;

-- Create new soil_analyses table with correct schema
CREATE TABLE soil_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid REFERENCES parcels(id),
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  physical jsonb NOT NULL,
  chemical jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE soil_analyses ENABLE ROW LEVEL SECURITY;

-- Create consolidated RLS policy
CREATE POLICY "Users can manage their own soil analyses" ON soil_analyses
  FOR ALL
  TO authenticated
  USING (
    parcel_id IN (
      SELECT p.id 
      FROM parcels p
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    parcel_id IN (
      SELECT p.id 
      FROM parcels p
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

-- Add trigger for updating timestamps
CREATE TRIGGER update_soil_analyses_updated_at
    BEFORE UPDATE ON soil_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();/*
  # Add biological properties column to soil analyses

  1. Changes
    - Add `biological` column to `soil_analyses` table to store biological soil properties
      - Uses JSONB type to store structured data about biological properties
      - Column is nullable since not all analyses may include biological data
    - Update updated_at trigger to track changes

  2. Notes
    - The biological column will store properties like:
      - Microbial biomass
      - Earthworm count
      - Bacterial activity
      - Fungal presence
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'soil_analyses' 
    AND column_name = 'biological'
  ) THEN
    ALTER TABLE soil_analyses 
    ADD COLUMN biological jsonb;
  END IF;
END $$;/*
  # Add notes column to soil_analyses table

  1. Changes
    - Add 'notes' column to soil_analyses table
      - Type: text
      - Nullable: true (optional field)
      - No default value

  2. Security
    - No changes to RLS policies needed as the existing policies will cover the new column
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'soil_analyses' AND column_name = 'notes'
  ) THEN
    ALTER TABLE soil_analyses ADD COLUMN notes text;
  END IF;
END $$;/*
  # Create IoT Infrastructure Tables

  1. New Tables
    - sensor_devices: Links physical devices to parcels
    - sensor_readings: Stores raw sensor data
    - climate_readings: Stores climate-specific readings

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create sensor_devices table
CREATE TABLE IF NOT EXISTS sensor_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  parcel_id uuid REFERENCES parcels(id),
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  last_seen timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sensor_readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  timestamp timestamptz NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create climate_readings table
CREATE TABLE IF NOT EXISTS climate_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid REFERENCES parcels(id),
  type text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sensor_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE climate_readings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own devices"
  ON sensor_devices FOR SELECT
  TO authenticated
  USING (
    parcel_id IN (
      SELECT p.id 
      FROM parcels p
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view readings from their devices"
  ON sensor_readings FOR SELECT
  TO authenticated
  USING (
    device_id IN (
      SELECT device_id 
      FROM sensor_devices sd
      JOIN parcels p ON sd.parcel_id = p.id
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view climate data for their parcels"
  ON climate_readings FOR SELECT
  TO authenticated
  USING (
    parcel_id IN (
      SELECT p.id 
      FROM parcels p
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

-- Add trigger for updating timestamps
CREATE TRIGGER update_sensor_devices_updated_at
    BEFORE UPDATE ON sensor_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();/*
  # Add product purchases tracking

  1. New Tables
    - `purchases`: Track product purchases and stock updates
      - `id` (uuid, primary key)
      - `product_id` (uuid) - References inventory table
      - `quantity` (numeric)
      - `price_per_unit` (numeric)
      - `total_price` (numeric)
      - `purchase_date` (date)
      - `supplier` (text)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes to existing tables
    - Add `price_per_unit` to inventory table
    - Add `last_purchase_date` to inventory table

  3. Security
    - Enable RLS on purchases table
    - Add policies for authenticated users
*/

-- Add new columns to inventory table
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS price_per_unit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_purchase_date date;

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
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

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage purchases for their farms"
  ON purchases FOR ALL
  TO authenticated
  USING (
    farm_id IN (
      SELECT id FROM farms
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    farm_id IN (
      SELECT id FROM farms
      WHERE user_id = auth.uid()
    )
  );

-- Add trigger for updating timestamps
CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();/*
  # Add supplier column to inventory table

  1. Changes
    - Add 'supplier' column to inventory table
      - Type: text
      - Nullable: true (to maintain compatibility with existing records)

  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Safe migration that won't affect existing data
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'inventory' 
    AND column_name = 'supplier'
  ) THEN
    ALTER TABLE inventory 
    ADD COLUMN supplier text;
  END IF;
END $$;/*
  # Fix inventory table RLS policies

  1. Changes
    - Drop existing RLS policies for inventory table
    - Create new comprehensive RLS policy that properly handles all operations
    - Ensure policy checks user ownership through the farm relationship

  2. Security
    - Enable RLS on inventory table
    - Add policy for all operations (SELECT, INSERT, UPDATE, DELETE)
    - Verify user ownership through farm relationship
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage inventory in their farms" ON inventory;

-- Create new comprehensive policy
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
);/*
  # Add Product Applications Table

  1. New Tables
    - product_applications: Track product usage in fields
      - id (uuid)
      - product_id (uuid, references inventory)
      - farm_id (uuid, references farms)
      - application_date (date)
      - quantity_used (numeric)
      - area_treated (numeric)
      - notes (text)
      - created_at, updated_at (timestamps)

  2. Security
    - Enable RLS
    - Add policy for authenticated users
*/

-- Create product_applications table
CREATE TABLE IF NOT EXISTS product_applications (
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
ALTER TABLE product_applications ENABLE ROW LEVEL SECURITY;

-- Create policy
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

-- Add trigger for updating timestamps
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
    EXECUTE FUNCTION update_inventory_after_application();/*
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
) AS subcats(name, code);/*
  # Fix inventory RLS and add farm_id

  1. Changes
    - Drop existing RLS policies for inventory table
    - Create new comprehensive RLS policy that properly handles all operations
    - Add farm_id to inventory table if not exists
    - Add foreign key constraint to farms table
*/

-- Add farm_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'farm_id'
  ) THEN
    ALTER TABLE inventory 
    ADD COLUMN farm_id uuid REFERENCES farms(id);
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage inventory in their farms" ON inventory;

-- Create new comprehensive policy
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
);/*
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
DROP FUNCTION insert_product_for_farms;/*
  # Fix Product Applications RLS Policy

  1. Changes
    - Drop existing RLS policy for product_applications table
    - Create new comprehensive RLS policy that properly handles all operations
    - Ensure policy checks user ownership through the farm relationship
    - Fix issue with insert operations being blocked

  2. Security
    - Enable RLS on product_applications table
    - Add policy for all operations (SELECT, INSERT, UPDATE, DELETE)
    - Verify user ownership through farm relationship
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage product applications for their farms" ON product_applications;

-- Create new comprehensive policy
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
);/*
  # Fix Product Applications RLS Policy

  1. Changes
    - Drop existing RLS policy for product_applications table
    - Create new comprehensive RLS policy that properly handles all operations
    - Ensure policy checks user ownership through the farm relationship
    - Fix issue with insert operations being blocked

  2. Security
    - Enable RLS on product_applications table
    - Add policy for all operations (SELECT, INSERT, UPDATE, DELETE)
    - Verify user ownership through farm relationship
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage product applications for their farms" ON product_applications;

-- Create new comprehensive policy
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
);/*
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
    EXECUTE FUNCTION update_inventory_after_application();/*
  # Add Infrastructure and Machinery Management

  1. New Tables
    - `structures`: Store farm structures like stables, technical rooms, etc.
    - `machinery`: Store farm machinery and equipment
    - `maintenance_history`: Track maintenance for both structures and machinery

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create structures table
CREATE TABLE structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  location jsonb NOT NULL,
  installation_date date NOT NULL,
  condition text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create machinery table
CREATE TABLE machinery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  purchase_date date NOT NULL,
  operating_hours numeric DEFAULT 0,
  last_maintenance date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create maintenance_history table
CREATE TABLE maintenance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  resource_id uuid NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('structure', 'machinery')),
  maintenance_date date NOT NULL,
  maintenance_type text NOT NULL,
  description text,
  cost numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own structures"
  ON structures
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own machinery"
  ON machinery
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own maintenance history"
  ON maintenance_history
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

-- Add triggers for updating timestamps
CREATE TRIGGER update_structures_updated_at
    BEFORE UPDATE ON structures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machinery_updated_at
    BEFORE UPDATE ON machinery
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_history_updated_at
    BEFORE UPDATE ON maintenance_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();-- Create demo user if not exists
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Insert user if not exists and get the id
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'demo@agrosmart.com',
    crypt('demo123456', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO demo_user_id;

  -- If user already exists, get their id
  IF demo_user_id IS NULL THEN
    SELECT id INTO demo_user_id
    FROM auth.users
    WHERE email = 'demo@agrosmart.com';
  END IF;

  -- Create default farm for demo user if not exists
  INSERT INTO farms (
    name,
    location,
    size,
    user_id
  )
  VALUES (
    'Ferme de démonstration',
    'Bni Yagrine, Maroc',
    2.5,
    demo_user_id
  )
  ON CONFLICT DO NOTHING;
END $$;-- Create default farm if not exists
INSERT INTO farms (
  id,
  name,
  location,
  size
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'Ferme de démonstration',
  'Bni Yagrine, Maroc',
  2.5
) ON CONFLICT (id) DO NOTHING;

-- Disable RLS temporarily for demo purposes
ALTER TABLE farms DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE structures DISABLE ROW LEVEL SECURITY;
ALTER TABLE machinery DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history DISABLE ROW LEVEL SECURITY;/*
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
  );/*
  # Add Employees and Day Laborers Management

  1. New Tables
    - `employees`: Store permanent employees information
    - `day_laborers`: Store day laborers information
    - `work_records`: Track work hours and tasks

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  cin text NOT NULL,
  phone text,
  address text,
  hire_date date NOT NULL,
  position text NOT NULL,
  salary numeric NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create day_laborers table
CREATE TABLE IF NOT EXISTS day_laborers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  cin text NOT NULL,
  phone text,
  address text,
  daily_rate numeric NOT NULL,
  specialties text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create work_records table
CREATE TABLE IF NOT EXISTS work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  worker_id uuid NOT NULL,
  worker_type text NOT NULL CHECK (worker_type IN ('employee', 'day_laborer')),
  work_date date NOT NULL,
  hours_worked numeric,
  task_description text NOT NULL,
  parcel_id uuid REFERENCES parcels(id),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their employees"
  ON employees
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their day laborers"
  ON day_laborers
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage work records"
  ON work_records
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

-- Add triggers for updating timestamps
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_day_laborers_updated_at
    BEFORE UPDATE ON day_laborers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_records_updated_at
    BEFORE UPDATE ON work_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();/*
  # Update Day Laborers Schema for Multiple Payment Types

  1. Changes
    - Add payment_type column to day_laborers table
    - Add task_rate and unit_rate columns
    - Update work_records table to handle different payment types
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to day_laborers table
ALTER TABLE day_laborers
ADD COLUMN payment_type text NOT NULL DEFAULT 'daily' CHECK (payment_type IN ('daily', 'task', 'unit')),
ADD COLUMN task_rate numeric,
ADD COLUMN unit_rate numeric,
ADD COLUMN unit_type text;

-- Update work_records table
ALTER TABLE work_records
ADD COLUMN units_completed numeric,
ADD COLUMN task_completed boolean DEFAULT false,
ADD COLUMN payment_type text NOT NULL DEFAULT 'daily' CHECK (payment_type IN ('daily', 'task', 'unit')),
ADD COLUMN payment_amount numeric;/*
  # Fix day laborers RLS policy

  1. Changes
    - Drop existing policy if it exists
    - Create new policy for day laborers table
    
  2. Security
    - Maintain RLS enabled
    - Ensure proper user access control through farm relationship
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their day laborers" ON day_laborers;

-- Enable RLS (idempotent)
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policy
CREATE POLICY "Users can manage their day laborers"
ON day_laborers
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
);/*
  # Add Day Laborers Management

  1. Changes
    - Create day_laborers table if not exists
    - Add proper columns for tracking worker information
    - Add payment type options (daily, task, unit based)
    - Enable RLS with proper policies
    
  2. Security
    - Enable RLS on day_laborers table
    - Add policy for authenticated users to manage their laborers
*/

-- Create day_laborers table if not exists
CREATE TABLE IF NOT EXISTS day_laborers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  cin text NOT NULL,
  phone text,
  address text,
  daily_rate numeric NOT NULL,
  specialties text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  payment_type text DEFAULT 'daily' CHECK (payment_type IN ('daily', 'task', 'unit')),
  task_rate numeric,
  unit_rate numeric,
  unit_type text
);

-- Enable RLS
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their day laborers" ON day_laborers;

-- Create new policy
CREATE POLICY "Users can manage their day laborers"
ON day_laborers
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

-- Add trigger for updating timestamps
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_day_laborers_updated_at'
  ) THEN
    CREATE TRIGGER update_day_laborers_updated_at
      BEFORE UPDATE ON day_laborers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;/*
  # Fix Day Laborers RLS Policy

  1. Changes
    - Drop existing RLS policy for day_laborers table
    - Create new comprehensive RLS policy that properly handles all operations
    - Ensure policy checks user ownership through the farm relationship
    - Fix issue with insert operations being blocked

  2. Security
    - Enable RLS on day_laborers table
    - Add policy for all operations (SELECT, INSERT, UPDATE, DELETE)
    - Verify user ownership through farm relationship
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their day laborers" ON day_laborers;

-- Temporarily disable RLS to allow policy changes
ALTER TABLE day_laborers DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;

-- Create new comprehensive policy
CREATE POLICY "Users can manage their own day laborers"
ON day_laborers
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
);-- Temporarily disable RLS
ALTER TABLE day_laborers DISABLE ROW LEVEL SECURITY;

-- Add task types if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'day_laborers' 
    AND column_name = 'task_types'
  ) THEN
    ALTER TABLE day_laborers 
    ADD COLUMN task_types text[] DEFAULT ARRAY['taille', 'récolte', 'traitement', 'irrigation', 'fertilisation', 'désherbage', 'plantation'];
  END IF;
END $$;

-- Re-enable RLS
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Users can manage their own day laborers" ON day_laborers;

-- Create new comprehensive policy
CREATE POLICY "Users can manage their own day laborers"
ON day_laborers
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
);-- Create task_categories table if not exists
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
END $$;/*
  # Add Utilities Management

  1. New Tables
    - `utilities`: Store utility charges like electricity, water, diesel, etc.
      - id (uuid)
      - farm_id (uuid)
      - type (text) - electricity, water, diesel, etc.
      - amount (numeric)
      - date (date)
      - notes (text)
      - created_at, updated_at (timestamps)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create utilities table
CREATE TABLE IF NOT EXISTS utilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('electricity', 'water', 'diesel', 'gas', 'internet', 'phone', 'other')),
  amount numeric NOT NULL,
  date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE utilities ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their utilities"
  ON utilities
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

-- Add trigger for updating timestamps
CREATE TRIGGER update_utilities_updated_at
    BEFORE UPDATE ON utilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();/*
  # Add structure-specific fields

  1. Changes
    - Add structure_details JSONB column to store type-specific fields
    - Add structure_type enum with specific types
    - Add usage field for structure purpose
    
  2. Notes
    - Using JSONB for flexibility in storing different field sets per type
    - Each type will have its own schema validation
*/

-- Add structure_details column
ALTER TABLE structures
ADD COLUMN IF NOT EXISTS structure_details jsonb NOT NULL DEFAULT '{}';

-- Add usage column
ALTER TABLE structures
ADD COLUMN IF NOT EXISTS usage text;

-- Modify type column to use enum
ALTER TABLE structures
DROP CONSTRAINT IF EXISTS structures_type_check;

ALTER TABLE structures
ADD CONSTRAINT structures_type_check 
CHECK (type IN ('stable', 'technical_room', 'basin', 'well'));

-- Create function to validate structure details based on type
CREATE OR REPLACE FUNCTION validate_structure_details()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.type
    WHEN 'stable' THEN
      IF NOT (
        NEW.structure_details ? 'width' AND
        NEW.structure_details ? 'length' AND
        NEW.structure_details ? 'height' AND
        NEW.structure_details ? 'construction_type'
      ) THEN
        RAISE EXCEPTION 'Stable must have width, length, height, and construction_type';
      END IF;
    
    WHEN 'basin' THEN
      IF NOT (
        NEW.structure_details ? 'shape' AND
        NEW.structure_details ? 'dimensions' AND
        NEW.structure_details ? 'volume'
      ) THEN
        RAISE EXCEPTION 'Basin must have shape, dimensions, and volume';
      END IF;
      
      IF NOT NEW.structure_details->>'shape' = ANY (ARRAY['trapezoidal', 'rectangular', 'cubic', 'circular']) THEN
        RAISE EXCEPTION 'Invalid basin shape';
      END IF;
    
    WHEN 'technical_room' THEN
      IF NOT (
        NEW.structure_details ? 'width' AND
        NEW.structure_details ? 'length' AND
        NEW.structure_details ? 'height' AND
        NEW.structure_details ? 'equipment'
      ) THEN
        RAISE EXCEPTION 'Technical room must have width, length, height, and equipment';
      END IF;
    
    WHEN 'well' THEN
      IF NOT (
        NEW.structure_details ? 'depth' AND
        NEW.structure_details ? 'condition' AND
        NEW.structure_details ? 'pump_type' AND
        NEW.structure_details ? 'pump_power'
      ) THEN
        RAISE EXCEPTION 'Well must have depth, condition, pump_type, and pump_power';
      END IF;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_structure_details_trigger ON structures;

CREATE TRIGGER validate_structure_details_trigger
  BEFORE INSERT OR UPDATE ON structures
  FOR EACH ROW
  EXECUTE FUNCTION validate_structure_details();/*
  # Add task categories and day laborer specialties

  1. Changes
    - Create task_categories table if not exists
    - Create day_laborer_specialties junction table
    - Add RLS policies
    - Insert default categories
    - Remove old columns
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
END $$;/*
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
END $$;/*
  # Add Day Laborer Specialties

  1. Changes
    - Insert default task categories
    - No need to recreate table or policy as they already exist

  2. Security
    - Maintain existing RLS policies
*/

-- Insert default task categories if they don't exist
INSERT INTO task_categories (name, description)
VALUES
  ('Fertilisation', 'Application des engrais et amendements'),
  ('Taille', 'Taille des arbres et arbustes'),
  ('Récolte', 'Récolte des fruits et produits'),
  ('Irrigation', 'Gestion et maintenance de l''irrigation'),
  ('Désherbage', 'Contrôle des mauvaises herbes'),
  ('Entretien', 'Entretien général des parcelles'),
  ('Protection', 'Application des traitements phytosanitaires'),
  ('Plantation', 'Plantation des arbres et cultures'),
  ('Traitement', 'Application des traitements phytosanitaires')
ON CONFLICT DO NOTHING;