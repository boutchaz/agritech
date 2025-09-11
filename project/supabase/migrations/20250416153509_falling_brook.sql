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
END $$;