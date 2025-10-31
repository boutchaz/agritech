-- =====================================================
-- DEBUG: Why Can't I Access Work Units?
-- =====================================================
-- Run these queries ONE BY ONE to diagnose the issue
-- =====================================================

-- Query 1: Check your current user and role
-- Copy the results and share them
SELECT
  auth.uid() AS my_user_id,
  ou.user_id,
  ou.organization_id,
  ou.role AS my_current_role,
  o.name AS org_name,
  up.email AS my_email,
  up.full_name
FROM organization_users ou
LEFT JOIN organizations o ON o.id = ou.organization_id
LEFT JOIN user_profiles up ON up.id = ou.user_id
WHERE ou.user_id = auth.uid()
ORDER BY ou.created_at DESC
LIMIT 5;

-- Query 2: Check ALL your roles in ALL organizations
SELECT
  ou.organization_id,
  o.name AS organization_name,
  ou.role,
  ou.created_at
FROM organization_users ou
LEFT JOIN organizations o ON o.id = ou.organization_id
WHERE ou.user_id = auth.uid()
ORDER BY ou.created_at DESC;

-- Query 3: Force update to organization_admin for ALL your orgs
-- UNCOMMENT this if Query 1 shows you're NOT an admin:
-- UPDATE organization_users
-- SET role = 'organization_admin'
-- WHERE user_id = auth.uid();

-- Query 4: Verify the update worked
SELECT
  'After Update:' AS status,
  ou.organization_id,
  o.name AS org_name,
  ou.role AS new_role,
  CASE
    WHEN ou.role IN ('system_admin', 'organization_admin') THEN '✅ YES - Should work!'
    ELSE '❌ NO - Still no access'
  END AS can_access_work_units
FROM organization_users ou
LEFT JOIN organizations o ON o.id = ou.organization_id
WHERE ou.user_id = auth.uid();

-- Query 5: Check if work_units table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'work_units'
) AS work_units_table_exists;

-- Query 6: Check RLS policies on work_units
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'work_units';

-- =====================================================
-- IMPORTANT: Share the results of Query 1 and Query 4
-- =====================================================
