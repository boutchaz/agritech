-- Fix work_units and piece_work_records RLS policies to use roles table
-- The organization_users table uses role_id, not role column

-- =====================================================
-- Fix work_units policies
-- =====================================================

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view units in their organization" ON work_units;
DROP POLICY IF EXISTS "Admins can manage units in their organization" ON work_units;

-- Recreate with correct role checking
CREATE POLICY "Users can view units in their organization"
  ON work_units FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage units in their organization"
  ON work_units FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND r.name IN ('organization_admin', 'system_admin')
    )
  );

-- =====================================================
-- Fix piece_work_records policies
-- =====================================================

-- Drop existing incorrect policy
DROP POLICY IF EXISTS "Farm managers and admins can manage piece work" ON piece_work_records;

-- Recreate with correct role checking
CREATE POLICY "Farm managers and admins can manage piece work"
  ON piece_work_records FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );
