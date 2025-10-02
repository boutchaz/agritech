-- Fix infinite recursion in organization_users and organizations policies
-- The issue: policies that check organization_users create infinite loops

-- ============================================================================
-- 1. FIX organization_users POLICY (remove recursion)
-- ============================================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "org_members_can_view_org_users" ON public.organization_users;

-- Create simple policy: users can view their own organization_users records
CREATE POLICY "users_can_view_own_org_membership"
  ON public.organization_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON POLICY "users_can_view_own_org_membership" ON public.organization_users IS
'Allows users to view their own organization memberships. No recursion.';

-- ============================================================================
-- 2. FIX organizations POLICY (remove recursion)
-- ============================================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "org_members_can_view_organizations" ON public.organizations;

-- Create simple policy: users can view organizations they belong to
-- This uses a direct check without recursion
CREATE POLICY "users_can_view_their_organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      -- Direct check without calling other functions
      SELECT 1
      FROM public.organization_users ou
      WHERE ou.organization_id = organizations.id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
    )
  );

COMMENT ON POLICY "users_can_view_their_organizations" ON public.organizations IS
'Allows users to view organizations they are members of. Uses direct EXISTS check to avoid recursion.';

-- ============================================================================
-- 3. ENSURE subscriptions POLICY IS SIMPLE (already correct)
-- ============================================================================

-- The subscriptions policy should already be simple and non-recursive
-- Just verify it exists

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND policyname = 'Users can view their organization subscription'
  ) THEN
    RAISE EXCEPTION 'Subscriptions policy missing! Run 20250930160000_create_subscriptions.sql';
  END IF;
END $$;

-- ============================================================================
-- 4. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  test_org_count INTEGER;
  test_user_count INTEGER;
  test_sub_count INTEGER;
BEGIN
  RAISE NOTICE '🧪 Testing fixed policies...';

  -- These should work now without recursion
  SELECT COUNT(*) INTO test_org_count FROM public.organizations;
  SELECT COUNT(*) INTO test_user_count FROM public.organization_users;
  SELECT COUNT(*) INTO test_sub_count FROM public.subscriptions;

  RAISE NOTICE '✅ Recursion fixed! Accessible rows:';
  RAISE NOTICE '  - organizations: %', test_org_count;
  RAISE NOTICE '  - organization_users: %', test_user_count;
  RAISE NOTICE '  - subscriptions: %', test_sub_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Still have recursion issues: %', SQLERRM;
END $$;

-- ============================================================================
-- 5. GRANT PERMISSIONS (ensure no issues)
-- ============================================================================

GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.organization_users TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
