-- =====================================================
-- COMPREHENSIVE RLS FIX FOR ONBOARDING
-- =====================================================
-- Multiple tables had RLS enabled without policies, blocking all access
-- This fixes: user_profiles, organizations, and dashboard_settings
-- =====================================================

-- =====================================================
-- 1. USER_PROFILES RLS POLICIES
-- =====================================================
-- Allow users to read/write their own profile
-- IMPORTANT: Allow ALL operations since onboarding uses upsert()

DROP POLICY IF EXISTS "user_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_write_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_all_own_profile" ON user_profiles;

-- Single policy for all operations (SELECT, INSERT, UPDATE)
CREATE POLICY "user_all_own_profile" ON user_profiles
  FOR ALL USING (
    id = auth.uid()
  )
  WITH CHECK (
    id = auth.uid()
  );

-- =====================================================
-- 2. ORGANIZATIONS RLS POLICIES
-- =====================================================
-- Users can view organizations they belong to
-- Only admins can create/update organizations

DROP POLICY IF EXISTS "org_read_organizations" ON organizations;
DROP POLICY IF EXISTS "org_write_organizations" ON organizations;
DROP POLICY IF EXISTS "org_update_organizations" ON organizations;
DROP POLICY IF EXISTS "org_delete_organizations" ON organizations;

-- Read: Users can see organizations they're members of
CREATE POLICY "org_read_organizations" ON organizations
  FOR SELECT USING (
    is_organization_member(id)
  );

-- Insert: Any authenticated user can create an organization
-- (they become owner via organization_users trigger/insert)
CREATE POLICY "org_write_organizations" ON organizations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Update: Organization admins can update
CREATE POLICY "org_update_organizations" ON organizations
  FOR UPDATE USING (
    is_organization_member(id)
  );

-- Delete: Organization admins can delete
CREATE POLICY "org_delete_organizations" ON organizations
  FOR DELETE USING (
    is_organization_member(id)
  );

-- =====================================================
-- 3. DASHBOARD_SETTINGS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "user_read_own_dashboard_settings" ON dashboard_settings;
DROP POLICY IF EXISTS "user_write_own_dashboard_settings" ON dashboard_settings;
DROP POLICY IF EXISTS "user_update_own_dashboard_settings" ON dashboard_settings;
DROP POLICY IF EXISTS "user_delete_own_dashboard_settings" ON dashboard_settings;

CREATE POLICY "user_read_own_dashboard_settings" ON dashboard_settings
  FOR SELECT USING (
    user_id = auth.uid() AND
    is_organization_member(organization_id)
  );

CREATE POLICY "user_write_own_dashboard_settings" ON dashboard_settings
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    is_organization_member(organization_id)
  );

CREATE POLICY "user_update_own_dashboard_settings" ON dashboard_settings
  FOR UPDATE USING (
    user_id = auth.uid() AND
    is_organization_member(organization_id)
  );

CREATE POLICY "user_delete_own_dashboard_settings" ON dashboard_settings
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that all policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('user_profiles', 'organizations', 'dashboard_settings')
ORDER BY tablename, policyname;

-- Expected results:
-- user_profiles: 1 policy (ALL operations)
-- organizations: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- dashboard_settings: 4 policies (SELECT, INSERT, UPDATE, DELETE)
