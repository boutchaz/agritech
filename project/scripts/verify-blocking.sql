-- Verify that session-level blocking is active
-- Run this in Supabase SQL Editor while logged in

-- ============================================================================
-- 1. CHECK YOUR SESSION STATUS
-- ============================================================================
SELECT
  '📊 Your Session Status' as report,
  *
FROM current_session_status;

-- Expected: Should show has_access = false and access_status = '❌ ACCESS BLOCKED'

-- ============================================================================
-- 2. CHECK SUBSCRIPTION VALIDATION FUNCTION
-- ============================================================================
SELECT
  '🔍 Subscription Validation' as report,
  organization_id,
  has_valid_subscription(organization_id) as is_valid
FROM organization_users
WHERE user_id = auth.uid()
LIMIT 1;

-- Expected: is_valid = false (no active subscriptions)

-- ============================================================================
-- 3. TEST READ BLOCKING (should return no rows or error)
-- ============================================================================
SELECT
  '📖 Attempting to read farms...' as report,
  COUNT(*) as farm_count
FROM farms;

-- Expected: 0 rows (RLS policy blocks access) or permission error

-- ============================================================================
-- 4. TEST WRITE BLOCKING (should fail with error)
-- ============================================================================
-- Uncomment to test (will fail):
-- INSERT INTO farms (name, organization_id)
-- VALUES ('Test Farm', (SELECT organization_id FROM organization_users WHERE user_id = auth.uid() LIMIT 1));

-- Expected: ERROR - "Cannot perform this operation: Active subscription required"

-- ============================================================================
-- 5. CHECK ALL ACTIVE POLICIES
-- ============================================================================
SELECT
  '🛡️ Active RLS Policies' as report,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'subscription_required%'
ORDER BY tablename, cmd;

-- Expected: Should see SELECT and INSERT policies for all 10 tables

-- ============================================================================
-- 6. CHECK WRITE-BLOCKING TRIGGERS
-- ============================================================================
SELECT
  '⚡ Write-Blocking Triggers' as report,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname LIKE 'block_%_without_sub'
ORDER BY tgname;

-- Expected: Should see triggers on farms, parcels, analyses

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT
  '✅ Verification Summary' as report,
  (SELECT COUNT(*) FROM pg_policies WHERE policyname LIKE 'subscription_required%') as total_policies,
  (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE policyname LIKE 'subscription_required%') as protected_tables,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'block_%_without_sub') as write_triggers,
  CASE
    WHEN EXISTS (SELECT 1 FROM current_session_status WHERE has_access = false) THEN '🔒 BLOCKING ACTIVE'
    WHEN EXISTS (SELECT 1 FROM current_session_status WHERE has_access = true) THEN '✅ ACCESS GRANTED'
    ELSE '⚠️ UNKNOWN STATUS'
  END as blocking_status;
