-- Fix RLS policies to allow user signup and organization creation

-- 1. Fix organizations INSERT policy - allow all authenticated users
DROP POLICY IF EXISTS authenticated_can_create ON organizations;

CREATE POLICY "authenticated_can_create"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Fix organization_users INSERT policies
-- Remove duplicate policy
DROP POLICY IF EXISTS "Users can create their org membership" ON organization_users;

-- Fix the subscription check policy to allow self-insert
DROP POLICY IF EXISTS subscription_check_users_insert ON organization_users;

CREATE POLICY subscription_check_users_insert
ON organization_users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is adding themselves (for signup)
  auth.uid() = user_id
  OR
  -- Or if subscription check passes (for inviting others)
  (has_valid_subscription(organization_id) AND can_add_user(organization_id))
);

-- 3. Ensure user_profiles allows self-insert
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

CREATE POLICY "Users can insert their own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Comments
COMMENT ON POLICY authenticated_can_create ON organizations IS 'Allows authenticated users to create organizations';
COMMENT ON POLICY "Users can create their org membership" ON organization_users IS 'Allows users to create their own organization membership';
COMMENT ON POLICY "Users can insert their own profile" ON user_profiles IS 'Allows users to create their own profile';
