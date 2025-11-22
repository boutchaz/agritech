-- Fix RLS policy for parcels to allow authenticated users to create parcels
-- if they have access to the farm's organization

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "org_write_parcels" ON parcels;

-- Create new INSERT policy that properly checks organization access
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

-- Also update the UPDATE policy to match
DROP POLICY IF EXISTS "org_update_parcels" ON parcels;

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
  );

-- Update DELETE policy as well
DROP POLICY IF EXISTS "org_delete_parcels" ON parcels;

CREATE POLICY "org_delete_parcels" ON parcels
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms f
      INNER JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE f.id = parcels.farm_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND ou.role_id IN (
          SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin', 'farm_manager')
        )
    )
  );

-- READ policy should also be updated for consistency
DROP POLICY IF EXISTS "org_read_parcels" ON parcels;

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
