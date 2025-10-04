-- Fix RLS policies to allow users to SELECT organizations they just created
-- Problem: User can INSERT but can't SELECT the org back until they're in organization_users

-- Add policy to allow users to view organizations they own
DROP POLICY IF EXISTS "owners_can_view_their_organizations" ON organizations;

CREATE POLICY "owners_can_view_their_organizations"
ON organizations
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Comment
COMMENT ON POLICY "owners_can_view_their_organizations" ON organizations
IS 'Allows organization owners to view their organizations';
