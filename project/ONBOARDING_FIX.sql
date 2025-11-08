-- =====================================================
-- ONBOARDING FIX: Add Missing RLS Policies
-- =====================================================
-- Issue: user_profiles and dashboard_settings tables had RLS enabled
-- but no policies defined, causing all queries to return empty results
--
-- This was breaking the onboarding flow with errors like:
-- - "Cannot coerce the result to a single JSON object" (PGRST116)
-- - Empty arrays returned for user_profiles queries
--
-- Execute this SQL in your Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou/sql
-- =====================================================

-- USER_PROFILES RLS POLICIES
-- Users can only read and modify their own profile
DROP POLICY IF EXISTS "user_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_write_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON user_profiles;

CREATE POLICY "user_read_own_profile" ON user_profiles
  FOR SELECT USING (
    id = auth.uid()
  );

CREATE POLICY "user_write_own_profile" ON user_profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );

CREATE POLICY "user_update_own_profile" ON user_profiles
  FOR UPDATE USING (
    id = auth.uid()
  );

-- DASHBOARD_SETTINGS RLS POLICIES
-- Users can manage their dashboard settings for organizations they belong to
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
-- VERIFICATION QUERIES
-- Run these after executing the policies to verify they work:
-- =====================================================

-- Check that policies were created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('user_profiles', 'dashboard_settings')
ORDER BY tablename, policyname;

-- This should show 3 policies for user_profiles and 4 for dashboard_settings
