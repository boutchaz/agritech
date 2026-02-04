-- Migration: 20260204154000_cleanup_deprecated_tables_and_functions.sql
-- Purpose: Remove deprecated tables (day_laborers, employees) and deprecated SQL functions
-- These have been superseded by the 'workers' table and NestJS services respectively.

-- ============================================================================
-- STEP 1: DROP DEPRECATED TABLES
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_day_laborers_updated_at ON day_laborers;
DROP TRIGGER IF EXISTS trg_day_laborers_populate_org_id ON day_laborers;
DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
DROP TRIGGER IF EXISTS trg_employees_populate_org_id ON employees;

-- Drop RLS policies for day_laborers
DROP POLICY IF EXISTS "org_read_day_laborers" ON day_laborers;
DROP POLICY IF EXISTS "org_write_day_laborers" ON day_laborers;
DROP POLICY IF EXISTS "org_update_day_laborers" ON day_laborers;
DROP POLICY IF EXISTS "org_delete_day_laborers" ON day_laborers;

-- Drop RLS policies for employees
DROP POLICY IF EXISTS "org_read_employees" ON employees;
DROP POLICY IF EXISTS "org_write_employees" ON employees;
DROP POLICY IF EXISTS "org_update_employees" ON employees;
DROP POLICY IF EXISTS "org_delete_employees" ON employees;

-- Drop indexes (will be dropped automatically with CASCADE, but being explicit)
DROP INDEX IF EXISTS idx_day_laborers_farm;
DROP INDEX IF EXISTS idx_day_laborers_organization;
DROP INDEX IF EXISTS idx_employees_farm;
DROP INDEX IF EXISTS idx_employees_organization;
DROP INDEX IF EXISTS idx_employees_employee_id;

-- Drop the tables
DROP TABLE IF EXISTS day_laborers CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- ============================================================================
-- STEP 2: DROP DEPRECATED SQL FUNCTIONS (Moved to NestJS)
-- ============================================================================

-- Org Setup/Seeding Functions (OrgSetupService)
DROP FUNCTION IF EXISTS seed_default_work_units(UUID);
DROP FUNCTION IF EXISTS seed_chart_of_accounts(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS seed_french_chart_of_accounts(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS create_default_fiscal_year(UUID, DATE);
DROP FUNCTION IF EXISTS create_morocco_campaign(UUID);
DROP FUNCTION IF EXISTS initialize_org_account_mappings(UUID);
DROP FUNCTION IF EXISTS create_organization_with_farm(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT[]);

-- Operational Workflow Functions (TaskTemplatesService, WorkersService)
DROP FUNCTION IF EXISTS create_task_from_template(UUID, UUID, UUID, DATE, UUID);
DROP FUNCTION IF EXISTS update_task_status(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS auto_populate_cost_time_dimensions();
DROP FUNCTION IF EXISTS update_crop_cycle_financials();
DROP FUNCTION IF EXISTS create_work_record_from_existing_task(UUID);

-- Analytics/Reporting Functions (AdoptionService)
DROP FUNCTION IF EXISTS calculate_daily_adoption_metrics(UUID, DATE);
DROP FUNCTION IF EXISTS generate_adoption_report(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_productivity_metrics(UUID, DATE, DATE);

-- Subscription/Payment Functions
DROP FUNCTION IF EXISTS get_subscription_pricing(TEXT, TEXT);
DROP FUNCTION IF EXISTS calculate_module_subscription_price(UUID, TEXT[]);
DROP FUNCTION IF EXISTS create_or_update_polar_subscription(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS log_polar_webhook(TEXT, TEXT, JSONB);

-- Abstract Entity Registry Functions (EntitiesService)
DROP FUNCTION IF EXISTS register_abstract_entity(UUID, TEXT, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS log_entity_event(UUID, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS get_abstract_entity(UUID);
DROP FUNCTION IF EXISTS search_entities(UUID, TEXT, TEXT, INTEGER, INTEGER);

-- ============================================================================
-- STEP 3: LOG COMPLETION
-- ============================================================================

DO $$
BEGIN
  RAISE LOG 'Migration 20260204154000: Removed deprecated tables (day_laborers, employees) and 23 deprecated SQL functions.';
END;
$$;
