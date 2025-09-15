-- Verify what actually exists in the database

-- 1. Check all tables in public schema
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check all functions in public schema
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 3. Check if specific tables exist
SELECT
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles')
         THEN 'EXISTS'
         ELSE 'MISSING'
    END as user_profiles_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations')
         THEN 'EXISTS'
         ELSE 'MISSING'
    END as organizations_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farms')
         THEN 'EXISTS'
         ELSE 'MISSING'
    END as farms_status;

-- 4. Check if specific functions exist
SELECT
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_organizations')
         THEN 'EXISTS'
         ELSE 'MISSING'
    END as get_user_organizations_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_organization_farms')
         THEN 'EXISTS'
         ELSE 'MISSING'
    END as get_organization_farms_status;