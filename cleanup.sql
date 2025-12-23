-- ============================================================================
-- DATABASE CLEANUP SCRIPT - AgriTech Platform
-- ============================================================================
-- This script drops ALL tables, functions, triggers, policies, and storage
-- Use this to completely reset the database to an empty state
--
-- ⚠️  WARNING: THIS WILL DELETE ALL DATA PERMANENTLY
--
-- Usage:
--   psql -h HOST -U postgres -d postgres -p 5432 -f cleanup.sql
--
-- After running this, you can reinitialize with:
--   psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/00000000000000_schema.sql
--
-- Updated: 2025-12-23 - Includes file_registry and all marketplace tables
--
-- This script will drop:
--   • 130+ tables (organizations, farms, items, invoices, marketplace_*, etc.)
--   • 20+ views (auth_users_view, file_storage_stats, stock_balance_*, etc.)
--   • 50+ functions (number generators, RPC functions, orphan detection, etc.)
--   • All RLS policies on public schema tables
--   • All storage buckets (products, invoices, documents)
--   • All custom ENUM types
--   • All triggers (updated_at, etc.)
-- ============================================================================

BEGIN;

-- Disable triggers for faster cleanup
SET session_replication_role = 'replica';

-- ============================================================================
-- DROP STORAGE BUCKETS (Supabase Storage)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all custom storage buckets
    FOR r IN (
        SELECT id
        FROM storage.buckets
        WHERE id NOT IN ('avatars')  -- Keep system buckets if any
        ORDER BY id
    ) LOOP
        RAISE NOTICE 'Dropping storage bucket: %', r.id;

        -- Delete all objects in bucket first
        DELETE FROM storage.objects WHERE bucket_id = r.id;

        -- Delete the bucket
        DELETE FROM storage.buckets WHERE id = r.id;
    END LOOP;
END$$;

-- ============================================================================
-- DROP ALL RLS POLICIES
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all RLS policies on tables in public schema
    FOR r IN (
        SELECT
            schemaname,
            tablename,
            policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    ) LOOP
        RAISE NOTICE 'Dropping policy: % on table %', r.policyname, r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END$$;

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
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ DATABASE CLEANUP COMPLETE!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'The following have been removed:';
    RAISE NOTICE '  • All tables (organizations, farms, parcels, items, invoices, etc.)';
    RAISE NOTICE '  • All views (auth_users_view, file_storage_stats, etc.)';
    RAISE NOTICE '  • All functions (number generators, RPC functions, etc.)';
    RAISE NOTICE '  • All triggers (updated_at triggers, etc.)';
    RAISE NOTICE '  • All RLS policies';
    RAISE NOTICE '  • All storage buckets (products, invoices, documents)';
    RAISE NOTICE '  • All custom types (enums)';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'NEXT STEPS - Reinitialize Database:';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '1️⃣  Apply main schema (comprehensive):';
    RAISE NOTICE '    psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/00000000000000_schema.sql';
    RAISE NOTICE '';
    RAISE NOTICE '2️⃣  Apply additional migrations (if needed):';
    RAISE NOTICE '    psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/20251122000002_fix_parcel_rls_policies.sql';
    RAISE NOTICE '';
    RAISE NOTICE '3️⃣  Seed reference data:';
    RAISE NOTICE '    psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/01_roles.sql';
    RAISE NOTICE '    psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/02_work_units.sql';
    RAISE NOTICE '    psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/03_accounts.sql';
    RAISE NOTICE '';
    RAISE NOTICE '4️⃣  Seed Strapi marketplace categories:';
    RAISE NOTICE '    Categories will auto-seed on Strapi bootstrap (cms/src/index.ts)';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE 'SCHEMA INCLUDES (Updated 2025-12-23):';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📦 Core Tables:';
    RAISE NOTICE '   • organizations, organization_users, user_profiles';
    RAISE NOTICE '   • subscriptions, modules, organization_modules';
    RAISE NOTICE '';
    RAISE NOTICE '🌾 Farm Management:';
    RAISE NOTICE '   • farms, parcels, crops, parcel_crops';
    RAISE NOTICE '   • satellite_indices, soil_analyses, analyses';
    RAISE NOTICE '';
    RAISE NOTICE '👥 Workforce:';
    RAISE NOTICE '   • workers, work_units, day_laborers, employees';
    RAISE NOTICE '   • tasks, task_assignments, task_categories';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Inventory & Stock:';
    RAISE NOTICE '   • item_groups, items, item_variants, item_unit_conversions';
    RAISE NOTICE '   • warehouses, bins, stock_entries, stock_transactions';
    RAISE NOTICE '   • harvests, harvest_records, reception_batches';
    RAISE NOTICE '';
    RAISE NOTICE '💰 Accounting & Finance:';
    RAISE NOTICE '   • accounts, account_templates, account_mappings';
    RAISE NOTICE '   • journal_entries, journal_items, cost_centers';
    RAISE NOTICE '   • invoices, invoice_items, accounting_payments';
    RAISE NOTICE '';
    RAISE NOTICE '🛒 Sales & Procurement:';
    RAISE NOTICE '   • customers, suppliers, quotes, quote_items';
    RAISE NOTICE '   • sales_orders, sales_order_items, purchase_orders';
    RAISE NOTICE '   • deliveries, delivery_items';
    RAISE NOTICE '';
    RAISE NOTICE '🏪 Marketplace:';
    RAISE NOTICE '   • marketplace_listings, marketplace_products';
    RAISE NOTICE '   • marketplace_orders, marketplace_order_items';
    RAISE NOTICE '   • marketplace_carts, marketplace_cart_items';
    RAISE NOTICE '   • marketplace_reviews, marketplace_partners';
    RAISE NOTICE '';
    RAISE NOTICE '📁 File Management:';
    RAISE NOTICE '   • file_registry (tracks all uploaded files)';
    RAISE NOTICE '   • file_storage_stats view';
    RAISE NOTICE '   • detect_orphaned_files(), mark_orphaned_files() functions';
    RAISE NOTICE '';
    RAISE NOTICE '🗂️  Storage Buckets:';
    RAISE NOTICE '   • products (marketplace images)';
    RAISE NOTICE '   • invoices (PDF documents)';
    RAISE NOTICE '   • documents (general files)';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END$$;
