-- =====================================================
-- CRITICAL RLS POLICIES FOR ONBOARDING
-- =====================================================
-- These policies are REQUIRED for the onboarding flow to work
-- Tables: farms, farm_management_roles, and any other critical tables
-- =====================================================

-- =====================================================
-- FARMS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "org_read_farms" ON farms;
DROP POLICY IF EXISTS "org_write_farms" ON farms;
DROP POLICY IF EXISTS "org_update_farms" ON farms;
DROP POLICY IF EXISTS "org_delete_farms" ON farms;

-- Read: Users can view farms in their organization
CREATE POLICY "org_read_farms" ON farms
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

-- Insert: Organization members can create farms
CREATE POLICY "org_write_farms" ON farms
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

-- Update: Organization members can update farms
CREATE POLICY "org_update_farms" ON farms
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

-- Delete: Organization members can delete farms
CREATE POLICY "org_delete_farms" ON farms
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- =====================================================
-- FARM_MANAGEMENT_ROLES RLS POLICIES (if table exists)
-- =====================================================

DROP POLICY IF EXISTS "org_read_farm_roles" ON farm_management_roles;
DROP POLICY IF EXISTS "org_write_farm_roles" ON farm_management_roles;
DROP POLICY IF EXISTS "org_update_farm_roles" ON farm_management_roles;
DROP POLICY IF EXISTS "org_delete_farm_roles" ON farm_management_roles;

-- Read: Users can view farm roles in their organization
CREATE POLICY "org_read_farm_roles" ON farm_management_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND is_organization_member(farms.organization_id)
    )
  );

-- Insert: Organization members can assign farm roles
CREATE POLICY "org_write_farm_roles" ON farm_management_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND is_organization_member(farms.organization_id)
    )
  );

-- Update: Organization members can update farm roles
CREATE POLICY "org_update_farm_roles" ON farm_management_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND is_organization_member(farms.organization_id)
    )
  );

-- Delete: Organization members can delete farm roles
CREATE POLICY "org_delete_farm_roles" ON farm_management_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND is_organization_member(farms.organization_id)
    )
  );

-- =====================================================
-- PARCELS RLS POLICIES (for future when users add parcels)
-- =====================================================

DROP POLICY IF EXISTS "org_read_parcels" ON parcels;
DROP POLICY IF EXISTS "org_write_parcels" ON parcels;
DROP POLICY IF EXISTS "org_update_parcels" ON parcels;
DROP POLICY IF EXISTS "org_delete_parcels" ON parcels;

-- Read: Users can view parcels in their organization
CREATE POLICY "org_read_parcels" ON parcels
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

-- Insert: Organization members can create parcels
CREATE POLICY "org_write_parcels" ON parcels
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

-- Update: Organization members can update parcels
CREATE POLICY "org_update_parcels" ON parcels
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

-- Delete: Organization members can delete parcels
CREATE POLICY "org_delete_parcels" ON parcels
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that all policies were created
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('farms', 'farm_management_roles', 'parcels')
ORDER BY tablename, policyname;

-- Expected results:
-- farms: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- farm_management_roles: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- parcels: 4 policies (SELECT, INSERT, UPDATE, DELETE)
