-- Complete test of subscription blocking system
-- Run this in Supabase SQL Editor while logged in as a user

-- ============================================================================
-- 1. VERIFY YOU CAN READ CRITICAL TABLES (should work)
-- ============================================================================

SELECT '✅ Step 1: Reading critical tables (should work)' as test_step;

SELECT 'Organizations' as table_name, COUNT(*) as count FROM organizations;
SELECT 'Organization Users' as table_name, COUNT(*) as count FROM organization_users;
SELECT 'Subscriptions' as table_name, COUNT(*) as count FROM subscriptions;

-- ============================================================================
-- 2. CHECK YOUR SUBSCRIPTION STATUS
-- ============================================================================

SELECT '✅ Step 2: Checking subscription status' as test_step;

SELECT
  ou.organization_id,
  o.name as org_name,
  has_valid_subscription(ou.organization_id) as has_valid_sub,
  s.status as subscription_status
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
LEFT JOIN subscriptions s ON ou.organization_id = s.organization_id
WHERE ou.user_id = auth.uid()
LIMIT 1;

-- Expected: has_valid_sub = false, subscription_status = NULL or 'past_due'

-- ============================================================================
-- 3. TEST DATA ACCESS (should be blocked)
-- ============================================================================

SELECT '✅ Step 3: Attempting to read protected tables (should be blocked)' as test_step;

-- These should return 0 rows because RLS blocks access
SELECT 'Farms' as table_name, COUNT(*) as count FROM farms;
SELECT 'Parcels' as table_name, COUNT(*) as count FROM parcels;
SELECT 'Employees' as table_name, COUNT(*) as count FROM employees;

-- Expected: All counts should be 0 (blocked by RLS)

-- ============================================================================
-- 4. TEST WRITE ACCESS (should fail)
-- ============================================================================

-- Uncomment to test (will throw error):
/*
INSERT INTO farms (name, organization_id)
VALUES (
  'Test Farm',
  (SELECT organization_id FROM organization_users WHERE user_id = auth.uid() LIMIT 1)
);
*/

-- Expected: ERROR - "Cannot perform this operation: Active subscription required"

-- ============================================================================
-- 5. SUMMARY
-- ============================================================================

SELECT '📊 SUMMARY' as test_step;

SELECT
  CASE
    WHEN has_valid_subscription((SELECT organization_id FROM organization_users WHERE user_id = auth.uid() LIMIT 1)) THEN
      '❌ BLOCKING NOT WORKING - You have valid subscription'
    ELSE
      '✅ BLOCKING IS WORKING - No valid subscription detected'
  END as blocking_status,
  (SELECT COUNT(*) FROM farms) as farms_visible,
  (SELECT COUNT(*) FROM parcels) as parcels_visible,
  CASE
    WHEN (SELECT COUNT(*) FROM farms) = 0 AND (SELECT COUNT(*) FROM parcels) = 0 THEN
      '✅ RLS IS BLOCKING DATA ACCESS'
    ELSE
      '❌ RLS NOT WORKING - Data is visible'
  END as rls_status;
