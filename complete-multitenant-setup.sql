-- Complete Multi-Tenant AgriTech Setup
-- Run this script in your Supabase SQL Editor to set up multi-tenancy

-- 1. Create organizations and user management tables
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  website text,
  phone text,
  email text,
  address jsonb,
  subscription_plan text DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'premium', 'enterprise')),
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
  max_farms integer DEFAULT 5,
  max_users integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  avatar_url text,
  phone text,
  timezone text DEFAULT 'UTC',
  language text DEFAULT 'fr',
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Recreate farms table with organization reference
DROP TABLE IF EXISTS farms CASCADE;
CREATE TABLE farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text NOT NULL,
  coordinates jsonb,
  size numeric NOT NULL,
  size_unit text DEFAULT 'hectares',
  farm_type text,
  description text,
  manager_id uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create product management tables
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

-- 4. Recreate all main tables with proper organization references
DROP TABLE IF EXISTS crops CASCADE;
CREATE TABLE crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  variety_id uuid REFERENCES crop_varieties(id),
  planting_date date NOT NULL,
  harvest_date date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'planted', 'growing', 'harvested')),
  field_id text NOT NULL,
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

DROP TABLE IF EXISTS inventory CASCADE;
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES farms(id),
  name text NOT NULL,
  category_id uuid REFERENCES product_categories(id),
  subcategory_id uuid REFERENCES product_subcategories(id),
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  minimum_level numeric NOT NULL DEFAULT 0,
  price_per_unit numeric DEFAULT 0,
  supplier text,
  last_purchase_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TABLE IF EXISTS tasks CASCADE;
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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

DROP TABLE IF EXISTS employees CASCADE;
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES farms(id),
  name text NOT NULL,
  role text NOT NULL,
  phone text,
  email text,
  hire_date date NOT NULL,
  salary numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can view organization members"
  ON organization_users FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can view and edit their profile"
  ON user_profiles FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view farms in their organizations"
  ON farms FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Product categories are public"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Product subcategories are public"
  ON product_subcategories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage data in their organizations"
  ON crops FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can manage inventory in their organizations"
  ON inventory FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can manage tasks in their organizations"
  ON tasks FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can manage employees in their organizations"
  ON employees FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- 7. Create helper functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid uuid)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  user_role text,
  is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.slug,
    ou.role,
    ou.is_active
  FROM organizations o
  JOIN organization_users ou ON o.id = ou.organization_id
  WHERE ou.user_id = user_uuid
  AND ou.is_active = true
  ORDER BY ou.joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_organization_farms(org_uuid uuid)
RETURNS TABLE (
  farm_id uuid,
  farm_name text,
  farm_location text,
  farm_size numeric,
  manager_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.location,
    f.size,
    COALESCE(up.first_name || ' ' || up.last_name, 'Non assigné')
  FROM farms f
  LEFT JOIN user_profiles up ON f.manager_id = up.id
  WHERE f.organization_id = org_uuid
  AND f.is_active = true
  ORDER BY f.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add update triggers
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON farms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Insert default data
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

INSERT INTO product_subcategories (category_id, name, code, description) VALUES
  ((SELECT id FROM product_categories WHERE code = 'SEM'), 'Légumes', 'SEM-LEG', 'Semences de légumes'),
  ((SELECT id FROM product_categories WHERE code = 'SEM'), 'Fruits', 'SEM-FRU', 'Semences d''arbres fruitiers'),
  ((SELECT id FROM product_categories WHERE code = 'ENG'), 'Azotés', 'ENG-AZO', 'Engrais azotés'),
  ((SELECT id FROM product_categories WHERE code = 'ENG'), 'Phosphatés', 'ENG-PHO', 'Engrais phosphatés'),
  ((SELECT id FROM product_categories WHERE code = 'PHY'), 'Insecticides', 'PHY-INS', 'Produits contre les insectes'),
  ((SELECT id FROM product_categories WHERE code = 'PHY'), 'Fongicides', 'PHY-FON', 'Produits contre les champignons')
ON CONFLICT (category_id, name) DO NOTHING;

-- 10. Insert task categories if they don't exist
INSERT INTO task_categories (name, description) VALUES
  ('Fertilisation', 'Application des engrais et amendements'),
  ('Taille', 'Taille des arbres et arbustes'),
  ('Récolte', 'Récolte des fruits et produits'),
  ('Irrigation', 'Gestion et maintenance de l''irrigation'),
  ('Désherbage', 'Contrôle des mauvaises herbes'),
  ('Entretien', 'Entretien général des parcelles'),
  ('Protection', 'Application des traitements phytosanitaires'),
  ('Plantation', 'Plantation des arbres et cultures')
ON CONFLICT DO NOTHING;