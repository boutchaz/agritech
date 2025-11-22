-- Fix RLS policies for parcels table
-- This migration updates the RLS policies to properly check organization access
-- through the organization_users table instead of using the is_organization_member function

-- Drop existing policies
DROP POLICY IF EXISTS "org_write_parcels" ON parcels;
DROP POLICY IF EXISTS "org_update_parcels" ON parcels;
DROP POLICY IF EXISTS "org_delete_parcels" ON parcels;
DROP POLICY IF EXISTS "org_read_parcels" ON parcels;

-- CREATE: Allow authenticated users to create parcels if they have access to the farm's organization
CREATE POLICY "org_write_parcels" ON parcels
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms f
      INNER JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE f.id = parcels.farm_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
    )
  );

-- READ: Allow authenticated users to read parcels from farms they have access to
CREATE POLICY "org_read_parcels" ON parcels
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms f
      INNER JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE f.id = parcels.farm_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
    )
  );

-- UPDATE: Allow authenticated users to update parcels from farms they have access to
CREATE POLICY "org_update_parcels" ON parcels
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms f
      INNER JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE f.id = parcels.farm_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
    )
  ) WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms f
      INNER JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE f.id = parcels.farm_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
    )
  );

-- DELETE: Allow system_admin, organization_admin, and farm_manager to delete parcels
CREATE POLICY "org_delete_parcels" ON parcels
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms f
      INNER JOIN organization_users ou ON ou.organization_id = f.organization_id
      INNER JOIN roles r ON r.id = ou.role_id
      WHERE f.id = parcels.farm_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  );
