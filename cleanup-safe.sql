-- ============================================================================
-- SAFE DATABASE CLEANUP SCRIPT
-- ============================================================================
-- This script safely drops all tables by first terminating active connections
-- Use this to completely reset the database to an empty state
--
-- ⚠️  WARNING: THIS WILL DELETE ALL DATA PERMANENTLY
--
-- Usage:
--   psql -h HOST -U postgres -d postgres -p 5432 -f cleanup-safe.sql
--
-- After running this, you can reinitialize with:
--   psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/00000000000000_schema.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: TERMINATE ALL OTHER CONNECTIONS
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    terminated_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔌 Terminating active connections...';
    RAISE NOTICE '';

    -- Terminate all connections except current one
    FOR r IN (
        SELECT pid, usename, application_name, state
        FROM pg_stat_activity
        WHERE datname = current_database()
        AND pid != pg_backend_pid()
        AND backend_type = 'client backend'
    ) LOOP
        RAISE NOTICE 'Terminating: PID=% User=% App=% State=%', r.pid, r.usename, r.application_name, r.state;
        PERFORM pg_terminate_backend(r.pid);
        terminated_count := terminated_count + 1;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Terminated % connection(s)', terminated_count;
    RAISE NOTICE '';
END$$;

-- Wait a moment for connections to fully terminate
SELECT pg_sleep(2);

-- ============================================================================
-- STEP 2: DISABLE TRIGGERS
-- ============================================================================

SET session_replication_role = 'replica';

-- ============================================================================
-- STEP 3: DROP ALL TABLES (SAFE ORDER)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    drop_count INT := 0;
    error_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  Dropping all tables...';
    RAISE NOTICE '';

    -- Drop all tables in public schema (except PostGIS system tables)
    -- Using CASCADE to handle dependencies automatically
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
        ORDER BY tablename
    ) LOOP
        BEGIN
            RAISE NOTICE 'Dropping table: %', r.tablename;
            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
            drop_count := drop_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to drop table %: %', r.tablename, SQLERRM;
            error_count := error_count + 1;
        END;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Dropped % table(s), % error(s)', drop_count, error_count;
    RAISE NOTICE '';
END$$;

-- ============================================================================
-- STEP 4: DROP ALL VIEWS
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    drop_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '👁️  Dropping all views...';
    RAISE NOTICE '';

    -- Drop all views in public schema (except PostGIS system views)
    FOR r IN (
        SELECT viewname
        FROM pg_views
        WHERE schemaname = 'public'
        AND viewname NOT IN ('geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
        ORDER BY viewname
    ) LOOP
        BEGIN
            RAISE NOTICE 'Dropping view: %', r.viewname;
            EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
            drop_count := drop_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to drop view %: %', r.viewname, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Dropped % view(s)', drop_count;
    RAISE NOTICE '';
END$$;

-- ============================================================================
-- STEP 5: DROP ALL FUNCTIONS
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    drop_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚙️  Dropping all functions...';
    RAISE NOTICE '';

    -- Drop all functions in public schema
    FOR r IN (
        SELECT
            p.proname as function_name,
            pg_catalog.pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        INNER JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname
    ) LOOP
        BEGIN
            RAISE NOTICE 'Dropping function: %(%)', r.function_name, r.args;
            EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.function_name) || '(' || r.args || ') CASCADE';
            drop_count := drop_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to drop function %(% ): %', r.function_name, r.args, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Dropped % function(s)', drop_count;
    RAISE NOTICE '';
END$$;

-- ============================================================================
-- STEP 6: DROP ALL SEQUENCES
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    drop_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔢 Dropping all sequences...';
    RAISE NOTICE '';

    -- Drop all sequences in public schema
    FOR r IN (
        SELECT sequencename
        FROM pg_sequences
        WHERE schemaname = 'public'
        ORDER BY sequencename
    ) LOOP
        BEGIN
            RAISE NOTICE 'Dropping sequence: %', r.sequencename;
            EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
            drop_count := drop_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to drop sequence %: %', r.sequencename, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Dropped % sequence(s)', drop_count;
    RAISE NOTICE '';
END$$;

-- ============================================================================
-- STEP 7: DROP ALL TYPES
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    drop_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📦 Dropping all types...';
    RAISE NOTICE '';

    -- Drop all custom types in public schema
    FOR r IN (
        SELECT typname
        FROM pg_type t
        INNER JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.typtype = 'e'  -- enum types
        ORDER BY typname
    ) LOOP
        BEGIN
            RAISE NOTICE 'Dropping type: %', r.typname;
            EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
            drop_count := drop_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to drop type %: %', r.typname, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Dropped % type(s)', drop_count;
    RAISE NOTICE '';
END$$;

-- ============================================================================
-- STEP 8: DROP ALL TRIGGERS
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    drop_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚡ Dropping all triggers...';
    RAISE NOTICE '';

    -- Drop all triggers in public schema
    FOR r IN (
        SELECT
            trigger_name,
            event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY trigger_name
    ) LOOP
        BEGIN
            RAISE NOTICE 'Dropping trigger: % on %', r.trigger_name, r.event_object_table;
            EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.' || quote_ident(r.event_object_table) || ' CASCADE';
            drop_count := drop_count + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to drop trigger %: %', r.trigger_name, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Dropped % trigger(s)', drop_count;
    RAISE NOTICE '';
END$$;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Database cleanup complete!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Apply main schema:';
    RAISE NOTICE '     psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/00000000000000_schema.sql';
    RAISE NOTICE '';
    RAISE NOTICE '  2. Apply additional migrations:';
    RAISE NOTICE '     psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/20251122000002_fix_parcel_rls_policies.sql';
    RAISE NOTICE '';
    RAISE NOTICE '  3. Apply seed data:';
    RAISE NOTICE '     psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/01_roles.sql';
    RAISE NOTICE '     psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/02_work_units.sql';
    RAISE NOTICE '     psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/03_accounts.sql';
    RAISE NOTICE '';
END$$;
