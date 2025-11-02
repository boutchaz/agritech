-- Fix RLS policy for organizations UPDATE
-- Problem: org_admins_can_update policy used user_has_permission_for_org() 
-- which required organizations.update permission that doesn't exist in permissions table
-- Solution: Simplify policy to allow admin/owner roles directly

-- Drop the old restrictive policy
DROP POLICY IF EXISTS org_admins_can_update ON organizations;

-- Create simplified policy: allow org members with admin/owner role to update
CREATE POLICY org_admins_can_update ON organizations
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      WHERE ou.organization_id = organizations.id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND ou.role IN ('admin', 'owner')
    )
  );

COMMENT ON POLICY org_admins_can_update ON organizations IS 
  'Allow active organization members with admin or owner role to update organization settings';

