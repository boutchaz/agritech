-- Test if functions exist and work

-- 1. Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_organizations', 'get_organization_farms');

-- 2. Test if we can call the function (this might fail if function doesn't exist)
-- SELECT * FROM get_user_organizations('f2a148bc-9a0d-47ec-a370-6bff8d05c148');

-- 3. Check what's in the organizations table
SELECT COUNT(*) as org_count FROM organizations;

-- 4. Check what's in the user_profiles table
SELECT COUNT(*) as profile_count FROM user_profiles;