-- =====================================================
-- DATABASE RESET SCRIPT
-- =====================================================
-- This script completely resets the database by:
-- 1. Dropping all tables, views, functions, types, sequences, triggers
-- 2. Clearing storage buckets
-- 3. Resetting sequences
-- 4. Clearing auth.users (optional - commented out for safety)
-- =====================================================
-- WARNING: This will DELETE ALL DATA permanently!
-- =====================================================

BEGIN;

-- Disable triggers temporarily to avoid cascade issues
SET session_replication_role = 'replica';

-- =====================================================
-- 1. DROP ALL TABLES (excluding system tables)
-- =====================================================
DO $$
DECLARE
    r RECORD;
    system_tables TEXT[] := ARRAY[
        'spatial_ref_sys',
        'geography_columns',
        'geometry_columns',
        'raster_columns',
        'raster_overviews',
        'schema_migrations'
    ];
BEGIN
    RAISE NOTICE '=== Dropping all tables ===';

    -- Drop all tables in public schema, excluding system tables
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename != ALL(system_tables)
        ORDER BY tablename
    ) LOOP
        BEGIN
            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
            RAISE NOTICE 'Dropped table: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Warning: Could not drop table % - %', r.tablename, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE 'Total tables dropped: %', (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public');
END $$;

-- =====================================================
-- 2. DROP ALL VIEWS (excluding system views)
-- =====================================================
DO $$
DECLARE
    r RECORD;
    system_views TEXT[] := ARRAY[
        'geography_columns',
        'geometry_columns',
        'raster_columns',
        'raster_overviews'
    ];
BEGIN
    RAISE NOTICE '=== Dropping all views ===';

    FOR r IN (
        SELECT viewname
        FROM pg_views
        WHERE schemaname = 'public'
        AND viewname != ALL(system_views)
        ORDER BY viewname
    ) LOOP
        BEGIN
            EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
            RAISE NOTICE 'Dropped view: %', r.viewname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Warning: Could not drop view % - %', r.viewname, SQLERRM;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 3. DROP ALL MATERIALIZED VIEWS
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '=== Dropping all materialized views ===';

    FOR r IN (
        SELECT matviewname
        FROM pg_matviews
        WHERE schemaname = 'public'
        ORDER BY matviewname
    ) LOOP
        BEGIN
            EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.' || quote_ident(r.matviewname) || ' CASCADE';
            RAISE NOTICE 'Dropped materialized view: %', r.matviewname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Warning: Could not drop materialized view % - %', r.matviewname, SQLERRM;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 4. DROP ALL FUNCTIONS (excluding system functions)
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '=== Dropping all functions ===';

    FOR r IN (
        SELECT
            p.proname as func_name,
            pg_get_function_arguments(p.oid) as args,
            ns.nspname as schema_name
        FROM pg_proc p
        INNER JOIN pg_namespace ns ON (p.pronamespace = ns.oid)
        WHERE ns.nspname IN ('public')
        -- Exclude system functions
        AND p.prokind = 'f'  -- normal functions only (not aggregates, windows, etc)
        AND p.proname NOT LIKE 'pg_%'
        AND p.proname NOT LIKE 'st_%'  -- PostGIS functions start with st_
        AND p.proname NOT LIKE 'postgis_%'
        ORDER BY p.proname
    ) LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || r.schema_name || '.' || quote_ident(r.func_name) || '(' || r.args || ') CASCADE';
            RAISE NOTICE 'Dropped function: %', r.func_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Warning: Could not drop function % - %', r.func_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 5. DROP ALL TRIGGERS
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '=== Dropping all triggers ===';

    FOR r IN (
        SELECT
            trigger_name,
            event_object_table as table_name
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY trigger_name
    ) LOOP
        BEGIN
            EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.' || quote_ident(r.table_name) || ' CASCADE';
            RAISE NOTICE 'Dropped trigger: % on %', r.trigger_name, r.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Warning: Could not drop trigger % - %', r.trigger_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 6. DROP ALL TYPES/ENUMS (excluding system types)
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '=== Dropping all custom types ===';

    FOR r IN (
        SELECT typname
        FROM pg_type
        WHERE typnamespace = 'public'::regnamespace
        AND typtype = 'e'  -- enums only
        ORDER BY typname
    ) LOOP
        BEGIN
            EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
            RAISE NOTICE 'Dropped type: %', r.typname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Warning: Could not drop type % - %', r.typname, SQLERRM;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 7. DROP ALL SEQUENCES
-- =====================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '=== Dropping all sequences ===';

    FOR r IN (
        SELECT sequencename
        FROM pg_sequences
        WHERE schemaname = 'public'
        ORDER BY sequencename
    ) LOOP
        BEGIN
            EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
            RAISE NOTICE 'Dropped sequence: %', r.sequencename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Warning: Could not drop sequence % - %', r.sequencename, SQLERRM;
        END;
    END LOOP;
END $$;

-- =====================================================
-- 8. CLEAR SUPABASE STORAGE (buckets + objects)
-- =====================================================
DO $$
DECLARE
    bucket RECORD;
    obj_count INTEGER;
BEGIN
    RAISE NOTICE '=== Clearing Supabase storage ===';

    IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
        RAISE NOTICE 'Skipping: storage schema not present (non-Supabase Postgres target)';
        RETURN;
    END IF;

    -- Delete all objects from every bucket, then delete the buckets
    FOR bucket IN
        SELECT id, name FROM storage.buckets ORDER BY name
    LOOP
        BEGIN
            -- Count objects before deleting
            SELECT COUNT(*) INTO obj_count
            FROM storage.objects
            WHERE bucket_id = bucket.id;

            -- Delete all objects in this bucket
            DELETE FROM storage.objects WHERE bucket_id = bucket.id;

            -- Delete the bucket itself
            DELETE FROM storage.buckets WHERE id = bucket.id;

            RAISE NOTICE 'Cleared bucket "%": % objects deleted', bucket.name, obj_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Warning: Could not clear bucket "%" - %', bucket.name, SQLERRM;
        END;
    END LOOP;

    -- Verify
    SELECT COUNT(*) INTO obj_count FROM storage.objects;
    RAISE NOTICE 'Remaining storage objects: % (should be 0)', obj_count;
END $$;

-- =====================================================
-- 9. VERIFY CLEANUP
-- =====================================================
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    func_count INTEGER;
    type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM pg_tables WHERE schemaname = 'public';
    SELECT COUNT(*) INTO view_count FROM pg_views WHERE schemaname = 'public';
    SELECT COUNT(*) INTO func_count FROM pg_proc p JOIN pg_namespace ns ON p.pronamespace = ns.oid WHERE ns.nspname = 'public' AND p.prokind = 'f';
    SELECT COUNT(*) INTO type_count FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e';

    RAISE NOTICE '';
    RAISE NOTICE '=== Cleanup Verification ===';
    RAISE NOTICE 'Remaining tables: % (should be 0 or only system tables)', table_count;
    RAISE NOTICE 'Remaining views: % (should be 0)', view_count;
    RAISE NOTICE 'Remaining functions: % (should be 0)', func_count;
    RAISE NOTICE 'Remaining types: % (should be 0)', type_count;
END $$;

-- =====================================================
-- 10. CLEAR AUTH USERS (OPTIONAL - DANGEROUS!)
-- =====================================================
-- Uncomment the line below ONLY if you want to delete all user accounts
-- WARNING: This cannot be undone!
TRUNCATE auth.users CASCADE;
TRUNCATE auth.identities CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- =====================================================
-- 11. VACUUM TO CLEAN UP (OPTIONAL)
-- =====================================================
-- NOTE: VACUUM cannot run inside a transaction block
-- If you want to run VACUUM, execute it separately after this script:
-- VACUUM FULL ANALYZE;

-- =====================================================
-- RESET COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run the main schema: psql -f migrations/00000000000000_schema.sql
-- 2. Run any additional seed data: psql -f seed/*.sql
-- 3. Verify the schema is correct
-- =====================================================

SELECT '================================================================================' as separator;
SELECT 'Database reset complete!' as status;
SELECT 'All tables, functions, types, sequences, triggers, and views have been dropped.' as details;
SELECT 'Next: Run migrations/00000000000000_schema.sql to recreate the schema.' as next_step;
SELECT '================================================================================' as separator;
