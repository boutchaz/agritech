-- =====================================================
-- DATABASE RESET SCRIPT
-- =====================================================
-- This script completely resets the database by:
-- 1. Dropping all tables, views, functions, types, sequences
-- 2. Clearing auth.users (optional - commented out for safety)
-- =====================================================
-- WARNING: This will DELETE ALL DATA permanently!
-- =====================================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- =====================================================
-- 1. DROP ALL TABLES (excluding PostGIS system tables)
-- =====================================================
DO $$
DECLARE
    r RECORD;
    postgis_tables TEXT[] := ARRAY[
        'spatial_ref_sys',
        'geography_columns',
        'geometry_columns',
        'raster_columns',
        'raster_overviews'
    ];
BEGIN
    -- Drop all tables in public schema, excluding PostGIS system tables
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename != ALL(postgis_tables)
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
END $$;

-- =====================================================
-- 2. DROP ALL VIEWS (excluding PostGIS system views)
-- =====================================================
DO $$
DECLARE
    r RECORD;
    postgis_views TEXT[] := ARRAY[
        'geography_columns',
        'geometry_columns',
        'raster_columns',
        'raster_overviews'
    ];
BEGIN
    FOR r IN (
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
        AND viewname != ALL(postgis_views)
    ) LOOP
        BEGIN
            EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
            RAISE NOTICE 'Dropped view: %', r.viewname;
        EXCEPTION WHEN OTHERS THEN
            -- Skip views that can't be dropped (e.g., PostGIS system views)
            RAISE NOTICE 'Skipped view: % (may be PostGIS system view)', r.viewname;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 3. DROP ALL FUNCTIONS (excluding PostGIS functions)
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc
        INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid)
        WHERE ns.nspname = 'public'
        -- Exclude PostGIS functions (they're in the postgis schema but may appear here)
        AND proname NOT LIKE 'st_%'
        AND proname NOT LIKE 'postgis_%'
        AND proname NOT LIKE 'addgeometrycolumn%'
        AND proname NOT LIKE 'dropgeometrycolumn%'
    ) LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
            RAISE NOTICE 'Dropped function: %', r.proname;
        EXCEPTION WHEN OTHERS THEN
            -- Skip functions that can't be dropped (e.g., PostGIS functions)
            RAISE NOTICE 'Skipped function: % (may be PostGIS system function)', r.proname;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 4. DROP ALL TYPES/ENUMS
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT typname 
        FROM pg_type 
        WHERE typnamespace = 'public'::regnamespace 
        AND typtype = 'e'
    ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        RAISE NOTICE 'Dropped type: %', r.typname;
    END LOOP;
END $$;

-- =====================================================
-- 5. DROP ALL SEQUENCES
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', r.sequencename;
    END LOOP;
END $$;

-- =====================================================
-- 6. CLEAR AUTH USERS (OPTIONAL - DANGEROUS!)
-- =====================================================
-- Uncomment the line below ONLY if you want to delete all user accounts
-- TRUNCATE auth.users CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- =====================================================
-- 7. VACUUM TO CLEAN UP (OPTIONAL - Run separately)
-- =====================================================
-- NOTE: VACUUM cannot run inside a transaction block
-- If you want to run VACUUM, execute it separately after this script:
-- VACUUM FULL;

-- =====================================================
-- RESET COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run the main schema: psql -f migrations/00000000000000_schema.sql
-- 2. Run additional migrations: psql -f migrations/202*.sql
-- 3. Run seed data: psql -f seed/01_roles.sql, etc.
-- =====================================================

SELECT 'Database reset complete! All tables, functions, types, and sequences have been dropped.' as result;

