-- =====================================================
-- CASL 403 Debug Query
-- Run this in Supabase SQL Editor to diagnose permission issues
-- =====================================================

-- 1. Check if the user exists in organization_users for this organization
SELECT
    ou.user_id,
    ou.organization_id,
    ou.is_active,
    ou.role_id,
    r.name as role_name,
    r.display_name,
    r.level
FROM organization_users ou
LEFT JOIN roles r ON ou.role_id = r.id
WHERE ou.user_id = '6538daa3-ee31-4609-8e96-775ace9b7cda'
  AND ou.organization_id = 'e481b02c-7c6a-47a0-a8eb-7491d66caace';

-- 2. Check all organizations the user belongs to
SELECT
    ou.user_id,
    ou.organization_id,
    o.name as organization_name,
    ou.is_active,
    r.name as role_name,
    r.display_name,
    r.level
FROM organization_users ou
LEFT JOIN organizations o ON ou.organization_id = o.id
LEFT JOIN roles r ON ou.role_id = r.id
WHERE ou.user_id = '6538daa3-ee31-4609-8e96-775ace9b7cda'
ORDER BY ou.is_active DESC, o.name;

-- 3. Check if the role has permissions defined
SELECT
    r.id,
    r.name,
    r.display_name,
    r.level
FROM roles r
WHERE r.name IN ('organization_admin', 'system_admin', 'farm_manager');

-- 4. List all available roles
SELECT
    id,
    name,
    display_name,
    level
FROM roles
ORDER BY level DESC;
