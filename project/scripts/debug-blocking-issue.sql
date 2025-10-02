-- Debug why blocking isn't working
-- Run this while logged in as a user

-- 1. Check current user and organization
SELECT
  'Current User & Org' as check_type,
  auth.uid() as user_id,
  ou.organization_id,
  ou.is_active as user_is_active,
  o.name as org_name
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = auth.uid();

-- 2. Check subscription status
SELECT
  'Subscription Status' as check_type,
  s.*
FROM subscriptions s
WHERE s.organization_id IN (
  SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
);

-- 3. Test has_valid_subscription function
SELECT
  'Validation Function Result' as check_type,
  ou.organization_id,
  has_valid_subscription(ou.organization_id) as is_valid
FROM organization_users ou
WHERE ou.user_id = auth.uid();

-- 4. Check if RLS policies exist
SELECT
  'RLS Policies' as check_type,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'subscription_required%';

-- 5. Check if policies are on farms table
SELECT
  'Farms Policies' as check_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'farms';

-- 6. Test if we can actually read farms
SELECT
  'Can Read Farms?' as check_type,
  COUNT(*) as farm_count
FROM farms;

-- 7. Check RLS is enabled on tables
SELECT
  'RLS Enabled?' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('farms', 'parcels', 'analyses', 'employees')
ORDER BY tablename;
