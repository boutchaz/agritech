-- =====================================================
-- FIX: Grant Admin Role for Work Units Access
-- =====================================================
-- Run this SQL in Supabase SQL Editor to grant yourself admin access
-- =====================================================

-- Step 1: Check your current user ID and role
SELECT
  auth.uid() AS your_user_id,
  ou.organization_id,
  ou.role AS current_role,
  o.name AS organization_name,
  up.email
FROM organization_users ou
JOIN organizations o ON o.id = ou.organization_id
JOIN user_profiles up ON up.id = ou.user_id
WHERE ou.user_id = auth.uid();

-- Step 2: If your role is NOT 'organization_admin' or 'system_admin',
-- uncomment and run ONE of the following:

-- Option A: Make yourself Organization Admin (Recommended)
-- UPDATE organization_users
-- SET role = 'organization_admin'
-- WHERE user_id = auth.uid();

-- Option B: Make yourself System Admin (Full access)
-- UPDATE organization_users
-- SET role = 'system_admin'
-- WHERE user_id = auth.uid();

-- Step 3: Verify the change
SELECT
  auth.uid() AS your_user_id,
  ou.organization_id,
  ou.role AS new_role,
  o.name AS organization_name
FROM organization_users ou
JOIN organizations o ON o.id = ou.organization_id
WHERE ou.user_id = auth.uid();

-- Step 4: Check if you now have the required permissions
-- This should return TRUE after granting admin role
SELECT
  auth.uid() AS user_id,
  ou.role,
  CASE
    WHEN ou.role IN ('system_admin', 'organization_admin') THEN 'YES ✅'
    ELSE 'NO ❌'
  END AS can_access_work_units
FROM organization_users ou
WHERE ou.user_id = auth.uid();

-- =====================================================
-- After running this script:
-- 1. Logout and login again
-- 2. Or refresh the page (Ctrl+R / Cmd+R)
-- 3. Navigate to Settings → Unités de travail
-- 4. You should now see the Work Units page (not tasks)
-- =====================================================
