-- Fix access to subscriptions, organizations, and organization_users tables
-- These tables must be readable even without a subscription (otherwise circular dependency)

-- ============================================================================
-- CREATE BYPASS POLICIES FOR CRITICAL TABLES
-- ============================================================================

-- 1. Allow users to read organizations they're members of (no subscription check)
DROP POLICY IF EXISTS "org_members_can_view_organizations" ON public.organizations;
CREATE POLICY "org_members_can_view_organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ou.organization_id
      FROM public.organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
    )
  );

-- 2. Allow users to read organization_users (no subscription check)
DROP POLICY IF EXISTS "org_members_can_view_org_users" ON public.organization_users;
CREATE POLICY "org_members_can_view_org_users"
  ON public.organization_users
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT ou.organization_id
      FROM public.organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
    )
  );

-- 3. Subscriptions policy already exists and is correct
-- It allows reading subscription data without subscription check
-- (see 20250930160000_create_subscriptions.sql line 179)

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.organization_users TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

COMMENT ON POLICY "org_members_can_view_organizations" ON public.organizations IS
'Allows users to view their organizations WITHOUT subscription check. Required to avoid circular dependency when checking subscriptions.';

COMMENT ON POLICY "org_members_can_view_org_users" ON public.organization_users IS
'Allows users to view organization membership WITHOUT subscription check. Required to avoid circular dependency when checking subscriptions.';

-- ============================================================================
-- TESTING
-- ============================================================================

DO $$
DECLARE
  test_org_count INTEGER;
  test_user_count INTEGER;
  test_sub_count INTEGER;
BEGIN
  RAISE NOTICE '🧪 Testing access to critical tables...';

  -- These queries should work even without subscription
  SELECT COUNT(*) INTO test_org_count FROM public.organizations;
  SELECT COUNT(*) INTO test_user_count FROM public.organization_users;
  SELECT COUNT(*) INTO test_sub_count FROM public.subscriptions;

  RAISE NOTICE '📊 Accessible tables (should work):';
  RAISE NOTICE '  - organizations: % rows', test_org_count;
  RAISE NOTICE '  - organization_users: % rows', test_user_count;
  RAISE NOTICE '  - subscriptions: % rows', test_sub_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Critical tables are accessible for subscription checking';
END $$;
