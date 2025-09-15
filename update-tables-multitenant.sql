-- Update all existing tables to be properly multi-tenant
-- This script adds organization_id to all relevant tables and updates RLS policies

-- First, let's update the main tables to include organization_id where missing

-- Update crops table
ALTER TABLE crops ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Update crops with organization_id from farms
UPDATE crops
SET organization_id = f.organization_id
FROM farms f
WHERE crops.farm_id = f.id
AND crops.organization_id IS NULL;

-- Update parcels table
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Update parcels with organization_id from crops/farms
UPDATE parcels
SET organization_id = c.organization_id
FROM crops c
WHERE parcels.crop_id = c.id
AND parcels.organization_id IS NULL;

-- Update tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Update tasks with organization_id from crops
UPDATE tasks
SET organization_id = c.organization_id
FROM crops c
WHERE tasks.crop_id = c.id
AND tasks.organization_id IS NULL;

-- Update harvests table
ALTER TABLE harvests ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Update harvests with organization_id from crops
UPDATE harvests
SET organization_id = c.organization_id
FROM crops c
WHERE harvests.crop_id = c.id
AND harvests.organization_id IS NULL;

-- Update livestock table - replace farm_id reference with organization_id
ALTER TABLE livestock DROP COLUMN IF EXISTS farm_id CASCADE;
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES farms(id);

-- Update inventory table
DROP TABLE IF EXISTS inventory CASCADE;
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
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

-- Update purchases table
DROP TABLE IF EXISTS purchases CASCADE;
CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  product_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  price_per_unit numeric NOT NULL,
  total_price numeric GENERATED ALWAYS AS (quantity * price_per_unit) STORED,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update financial_transactions table
ALTER TABLE financial_transactions DROP COLUMN IF EXISTS farm_id CASCADE;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES farms(id);

-- Update employees table
ALTER TABLE employees DROP COLUMN IF EXISTS farm_id CASCADE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES farms(id);

-- Update day_laborers table
ALTER TABLE day_laborers DROP COLUMN IF EXISTS farm_id CASCADE;
ALTER TABLE day_laborers ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE day_laborers ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES farms(id);

-- Enable RLS on updated tables
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can manage crops in their farms" ON crops;
DROP POLICY IF EXISTS "Users can manage their parcels" ON parcels;
DROP POLICY IF EXISTS "Users can manage tasks for their farms" ON tasks;
DROP POLICY IF EXISTS "Users can manage harvests for their crops" ON harvests;
DROP POLICY IF EXISTS "Users can manage livestock in their farms" ON livestock;
DROP POLICY IF EXISTS "Users can manage inventory in their farms" ON inventory;
DROP POLICY IF EXISTS "Users can manage purchases in their farms" ON purchases;
DROP POLICY IF EXISTS "Users can manage financial transactions in their farms" ON financial_transactions;
DROP POLICY IF EXISTS "Users can manage employees in their farms" ON employees;
DROP POLICY IF EXISTS "Users can manage day laborers in their farms" ON day_laborers;

-- Create new multi-tenant RLS policies

-- Crops policies
CREATE POLICY "Users can manage crops in their organizations"
  ON crops FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- Parcels policies
CREATE POLICY "Users can manage parcels in their organizations"
  ON parcels FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- Tasks policies
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
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'member')
      AND is_active = true
    )
  );

-- Harvests policies
CREATE POLICY "Users can manage harvests in their organizations"
  ON harvests FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'member')
      AND is_active = true
    )
  );

-- Livestock policies
CREATE POLICY "Users can manage livestock in their organizations"
  ON livestock FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- Inventory policies
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
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'member')
      AND is_active = true
    )
  );

-- Purchases policies
CREATE POLICY "Users can manage purchases in their organizations"
  ON purchases FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager', 'member')
      AND is_active = true
    )
  );

-- Financial transactions policies
CREATE POLICY "Users can manage financial transactions in their organizations"
  ON financial_transactions FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- Employees policies
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
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- Day laborers policies
CREATE POLICY "Users can manage day laborers in their organizations"
  ON day_laborers FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- Add update triggers for new tables
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create helper functions for multi-tenant operations
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS uuid AS $$
DECLARE
  org_id uuid;
BEGIN
  -- This would typically come from the application context
  -- For now, we'll return the first organization the user belongs to
  SELECT organization_id INTO org_id
  FROM organization_users
  WHERE user_id = auth.uid()
  AND is_active = true
  ORDER BY joined_at
  LIMIT 1;

  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION ensure_organization_access(org_id uuid, required_role text DEFAULT 'member')
RETURNS boolean AS $$
DECLARE
  user_role text;
  role_hierarchy text[] := ARRAY['viewer', 'member', 'manager', 'admin', 'owner'];
  required_level integer;
  user_level integer;
BEGIN
  -- Get user's role in the organization
  SELECT role INTO user_role
  FROM organization_users
  WHERE user_id = auth.uid()
  AND organization_id = org_id
  AND is_active = true;

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Check role hierarchy
  SELECT array_position(role_hierarchy, required_role) INTO required_level;
  SELECT array_position(role_hierarchy, user_role) INTO user_level;

  RETURN user_level >= required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;