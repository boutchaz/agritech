-- ============================================================================
-- DATABASE CLEANUP SCRIPT
-- ============================================================================
-- This script drops ALL tables, functions, triggers, and policies
-- Use this to completely reset the database to an empty state
--
-- ⚠️  WARNING: THIS WILL DELETE ALL DATA PERMANENTLY
--
-- Usage:
--   psql -h HOST -U postgres -d postgres -p 5432 -f cleanup.sql
--
-- After running this, you can reinitialize with:
--   psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/00000000000000_schema.sql
-- ============================================================================

BEGIN;

-- Disable triggers for faster cleanup
SET session_replication_role = 'replica';

-- ============================================================================
-- DROP ALL TABLES
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables in public schema (excluding tables that belong to extensions)
    FOR r IN (
        SELECT t.tablename
        FROM pg_tables t
        WHERE t.schemaname = 'public'
        -- Exclude tables that belong to extensions (like PostGIS)
        AND NOT EXISTS (
            SELECT 1
            FROM pg_class c
            INNER JOIN pg_namespace n ON c.relnamespace = n.oid
            LEFT JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'e'
            LEFT JOIN pg_extension e ON d.refobjid = e.oid
            WHERE n.nspname = 'public'
            AND c.relname = t.tablename
            AND c.relkind = 'r'  -- regular table
            AND e.oid IS NOT NULL
        )
        ORDER BY t.tablename
    ) LOOP
        RAISE NOTICE 'Dropping table: %', r.tablename;
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END$$;

-- ============================================================================
-- DROP ALL VIEWS
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all views in public schema (excluding views that belong to extensions)
    FOR r IN (
        SELECT v.viewname
        FROM pg_views v
        WHERE v.schemaname = 'public'
        -- Exclude views that belong to extensions (like PostGIS)
        AND NOT EXISTS (
            SELECT 1
            FROM pg_class c
            INNER JOIN pg_namespace n ON c.relnamespace = n.oid
            LEFT JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'e'
            LEFT JOIN pg_extension e ON d.refobjid = e.oid
            WHERE n.nspname = 'public'
            AND c.relname = v.viewname
            AND c.relkind = 'v'  -- view
            AND e.oid IS NOT NULL
        )
        ORDER BY v.viewname
    ) LOOP
        RAISE NOTICE 'Dropping view: %', r.viewname;
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
END$$;

-- ============================================================================
-- DROP ALL FUNCTIONS
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all functions in public schema (excluding functions that belong to extensions)
    FOR r IN (
        SELECT
            p.proname as function_name,
            pg_catalog.pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        INNER JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        -- Exclude functions that belong to extensions (like PostGIS)
        AND NOT EXISTS (
            SELECT 1
            FROM pg_depend d
            INNER JOIN pg_extension e ON d.refobjid = e.oid
            WHERE d.objid = p.oid
            AND d.deptype = 'e'  -- extension dependency
        )
        ORDER BY p.proname
    ) LOOP
        RAISE NOTICE 'Dropping function: %(%)', r.function_name, r.args;
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.function_name) || '(' || r.args || ') CASCADE';
    END LOOP;
END$$;

-- ============================================================================
-- DROP ALL SEQUENCES
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all sequences in public schema
    FOR r IN (
        SELECT sequencename
        FROM pg_sequences
        WHERE schemaname = 'public'
        ORDER BY sequencename
    ) LOOP
        RAISE NOTICE 'Dropping sequence: %', r.sequencename;
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
    END LOOP;
END$$;

-- ============================================================================
-- DROP ALL TYPES
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all custom types in public schema (excluding types that belong to extensions)
    FOR r IN (
        SELECT typname
        FROM pg_type t
        INNER JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.typtype = 'e'  -- enum types
        -- Exclude types that belong to extensions (like PostGIS)
        AND NOT EXISTS (
            SELECT 1
            FROM pg_depend d
            INNER JOIN pg_extension e ON d.refobjid = e.oid
            WHERE d.objid = t.oid
            AND d.deptype = 'e'  -- extension dependency
        )
        ORDER BY typname
    ) LOOP
        RAISE NOTICE 'Dropping type: %', r.typname;
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END$$;

-- ============================================================================
-- DROP ALL TRIGGERS
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all triggers in public schema
    FOR r IN (
        SELECT
            trigger_name,
            event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY trigger_name
    ) LOOP
        RAISE NOTICE 'Dropping trigger: % on %', r.trigger_name, r.event_object_table;
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.' || quote_ident(r.event_object_table) || ' CASCADE';
    END LOOP;
END$$;

-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database cleanup complete!';
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
