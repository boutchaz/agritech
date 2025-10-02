-- Inject subscription checking into existing RLS helper functions
-- This modifies the existing permission functions to require valid subscriptions

-- ============================================================================
-- 1. MODIFY is_active_org_member TO REQUIRE SUBSCRIPTION
-- ============================================================================

-- This function is used by SELECT policies
-- Original: just checks if user is in organization
-- Modified: ALSO checks if organization has valid subscription

CREATE OR REPLACE FUNCTION public.is_active_org_member(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is active member AND organization has valid subscription
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_users ou
    WHERE ou.user_id = $1
      AND ou.organization_id = $2
      AND ou.is_active = true
      -- NEW: Require valid subscription
      AND public.has_valid_subscription($2) = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_active_org_member IS
'Checks if user is active member of organization AND organization has valid subscription. Used by SELECT RLS policies.';

-- ============================================================================
-- 2. MODIFY user_has_permission_for_org TO REQUIRE SUBSCRIPTION
-- ============================================================================

-- This function is used by INSERT/UPDATE/DELETE policies
-- Original: checks user permissions
-- Modified: ALSO checks subscription

CREATE OR REPLACE FUNCTION public.user_has_permission_for_org(
  user_id UUID,
  org_id UUID,
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  -- First check subscription - fail fast if no subscription
  IF NOT public.has_valid_subscription(org_id) THEN
    RETURN FALSE;
  END IF;

  -- Then check user permissions (existing logic)
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_users ou
    JOIN public.role_permissions rp ON ou.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ou.user_id = $1
      AND ou.organization_id = $2
      AND ou.is_active = true
      AND p.name = $3
      AND rp.is_active = true
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_permission_for_org IS
'Checks if user has permission for organization AND organization has valid subscription. Used by INSERT/UPDATE/DELETE RLS policies.';

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Test the modified functions
DO $$
DECLARE
  test_user_id UUID;
  test_org_id UUID;
  can_view BOOLEAN;
  can_create BOOLEAN;
BEGIN
  RAISE NOTICE '🧪 Testing modified RLS functions...';

  -- Get a test user and org
  SELECT
    ou.user_id,
    ou.organization_id
  INTO test_user_id, test_org_id
  FROM public.organization_users ou
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No users found to test';
    RETURN;
  END IF;

  -- Test is_active_org_member (should fail without subscription)
  can_view := public.is_active_org_member(test_user_id, test_org_id);

  -- Test user_has_permission_for_org (should fail without subscription)
  can_create := public.user_has_permission_for_org(test_user_id, test_org_id, 'farms.create');

  RAISE NOTICE '📊 Results for org %:', test_org_id;
  RAISE NOTICE '  - Has valid subscription: %', public.has_valid_subscription(test_org_id);
  RAISE NOTICE '  - Can view (is_active_org_member): %', can_view;
  RAISE NOTICE '  - Can create (user_has_permission): %', can_create;
  RAISE NOTICE '';

  IF NOT can_view AND NOT can_create THEN
    RAISE NOTICE '✅ BLOCKING IS WORKING - Functions correctly deny access without subscription';
  ELSE
    RAISE NOTICE '⚠️  WARNING - Functions still allow access (might have active subscription?)';
  END IF;
END $$;

-- ============================================================================
-- 4. CLEANUP OLD SUBSCRIPTION POLICIES (if any)
-- ============================================================================

-- Remove the subscription-specific policies we created earlier
-- They're now redundant since subscription check is in the helper functions

DROP POLICY IF EXISTS "subscription_required_farms_select" ON public.farms;
DROP POLICY IF EXISTS "subscription_required_farms_insert" ON public.farms;
DROP POLICY IF EXISTS "subscription_required_parcels_select" ON public.parcels;
DROP POLICY IF EXISTS "subscription_required_parcels_insert" ON public.parcels;
DROP POLICY IF EXISTS "subscription_required_analyses_select" ON public.analyses;
DROP POLICY IF EXISTS "subscription_required_analyses_insert" ON public.analyses;
DROP POLICY IF EXISTS "subscription_required_employees_select" ON public.employees;
DROP POLICY IF EXISTS "subscription_required_employees_insert" ON public.employees;
DROP POLICY IF EXISTS "subscription_required_day_laborers_select" ON public.day_laborers;
DROP POLICY IF EXISTS "subscription_required_day_laborers_insert" ON public.day_laborers;
DROP POLICY IF EXISTS "subscription_required_utilities_select" ON public.utilities;
DROP POLICY IF EXISTS "subscription_required_utilities_insert" ON public.utilities;
DROP POLICY IF EXISTS "subscription_required_structures_select" ON public.structures;
DROP POLICY IF EXISTS "subscription_required_structures_insert" ON public.structures;
DROP POLICY IF EXISTS "subscription_required_trees_select" ON public.trees;
DROP POLICY IF EXISTS "subscription_required_trees_insert" ON public.trees;
DROP POLICY IF EXISTS "subscription_required_costs_select" ON public.costs;
DROP POLICY IF EXISTS "subscription_required_costs_insert" ON public.costs;
DROP POLICY IF EXISTS "subscription_required_revenues_select" ON public.revenues;
DROP POLICY IF EXISTS "subscription_required_revenues_insert" ON public.revenues;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- This migration works by modifying the EXISTING RLS helper functions
-- instead of creating new policies. This is cleaner because:
--
-- 1. All existing policies automatically inherit subscription checking
-- 2. No policy conflicts (OR-based policy evaluation)
-- 3. Centralized logic in two functions
-- 4. Easy to maintain and understand
--
-- Now ALL RLS policies that use these functions will require subscriptions:
-- - org_members_can_view_farms → uses is_active_org_member
-- - org_members_can_create_farms → uses user_has_permission_for_org
-- - org_members_can_view_parcels → uses is_active_org_member
-- - ... and so on for ALL tables
