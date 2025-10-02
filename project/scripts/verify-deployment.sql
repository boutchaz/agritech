-- Verification Script for Subscription System Deployment
-- Run this in Supabase SQL Editor to verify everything is working

-- ============================================================================
-- 1. CHECK DATABASE FUNCTIONS
-- ============================================================================

\echo '🔍 Checking Database Functions...'

SELECT
  proname as function_name,
  pronargs as num_args,
  provolatile as volatility
FROM pg_proc
WHERE proname IN (
  'has_valid_subscription',
  'can_create_farm',
  'can_create_parcel',
  'can_add_user',
  'has_feature_access',
  'update_expired_subscriptions'
)
ORDER BY proname;

-- Expected: 6 functions

-- ============================================================================
-- 2. CHECK RLS POLICIES
-- ============================================================================

\echo '🔒 Checking RLS Policies...'

SELECT
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE '%subscription%'
ORDER BY tablename, policyname;

-- Expected: 3 policies (farms, parcels, organization_users)

-- ============================================================================
-- 3. CHECK SUBSCRIPTION_STATUS VIEW
-- ============================================================================

\echo '👀 Checking subscription_status View...'

SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'subscription_status';

-- Expected: 1 view

-- ============================================================================
-- 4. TEST FUNCTIONS WITH SAMPLE DATA
-- ============================================================================

\echo '🧪 Testing Functions...'

-- Test has_valid_subscription (should work with any org that has subscription)
SELECT
  'has_valid_subscription' as test_function,
  organization_id,
  has_valid_subscription(organization_id) as result
FROM subscriptions
LIMIT 1;

-- Test can_create_farm
SELECT
  'can_create_farm' as test_function,
  organization_id,
  can_create_farm(organization_id) as can_create,
  (SELECT COUNT(*) FROM farms WHERE organization_id = s.organization_id) as current_count,
  max_farms as limit
FROM subscriptions s
LIMIT 1;

-- Test feature access
SELECT
  'has_feature_access' as test_function,
  organization_id,
  has_feature_access(organization_id, 'analytics') as has_analytics,
  has_feature_access(organization_id, 'ai_recommendations') as has_ai,
  plan_type
FROM subscriptions
LIMIT 1;

-- ============================================================================
-- 5. CHECK SUBSCRIPTION OVERVIEW
-- ============================================================================

\echo '📊 Subscription Overview...'

SELECT
  plan_type,
  status,
  COUNT(*) as count
FROM subscriptions
GROUP BY plan_type, status
ORDER BY plan_type, status;

-- ============================================================================
-- 6. CHECK USAGE STATISTICS
-- ============================================================================

\echo '📈 Usage Statistics...'

SELECT * FROM subscription_status LIMIT 5;

-- ============================================================================
-- 7. VERIFY RLS IS ENABLED
-- ============================================================================

\echo '🔐 Checking RLS Status...'

SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('farms', 'parcels', 'organization_users', 'subscriptions')
ORDER BY tablename;

-- Expected: All tables should have rls_enabled = true

-- ============================================================================
-- SUMMARY
-- ============================================================================

\echo ''
\echo '✅ Verification Complete!'
\echo ''
\echo 'Expected Results:'
\echo '- 6 database functions'
\echo '- 3 RLS policies'
\echo '- 1 subscription_status view'
\echo '- All tables have RLS enabled'
\echo '- Functions return proper boolean results'
