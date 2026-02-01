-- Deprecate SQL functions moved to NestJS
-- Migration: 20260131000005_deprecate_sql_functions_moved_to_nestjs.sql
--
-- This migration marks SQL functions as DEPRECATED that have been moved to NestJS.
-- The functions are kept for backward compatibility but should not be used in new code.
-- Corresponding NestJS implementations are now the canonical implementations.

-- ============================================================================
-- ORG SETUP/SEEDING FUNCTIONS - Moved to NestJS (OrgSetupService)
-- ============================================================================

COMMENT ON FUNCTION seed_default_work_units IS 'DEPRECATED: Use NestJS OrgSetupService.seedDefaultWorkUnits() instead. Kept for backward compatibility.';

COMMENT ON FUNCTION seed_chart_of_accounts IS 'DEPRECATED: Use NestJS seeding service instead. Kept for backward compatibility.';

COMMENT ON FUNCTION seed_french_chart_of_accounts IS 'DEPRECATED: Use NestJS seeding service instead. Kept for backward compatibility.';

COMMENT ON FUNCTION create_default_fiscal_year IS 'DEPRECATED: Use NestJS OrgSetupService.createDefaultFiscalYear() instead. Kept for backward compatibility.';

COMMENT ON FUNCTION create_morocco_campaign IS 'DEPRECATED: Use NestJS OrgSetupService.createMoroccoCampaign() instead. Kept for backward compatibility.';

COMMENT ON FUNCTION initialize_org_account_mappings IS 'DEPRECATED: Use NestJS org initialization service instead. Kept for backward compatibility.';

COMMENT ON FUNCTION create_organization_with_farm IS 'DEPRECATED: Use NestJS OrgSetupService.initializeOrganization() instead. Kept for backward compatibility.';

-- ============================================================================
-- OPERATIONAL WORKFLOW FUNCTIONS - Moved to NestJS
-- ============================================================================

COMMENT ON FUNCTION create_task_from_template IS 'DEPRECATED: Use NestJS TaskTemplatesService.createFromTemplate() instead. Kept for backward compatibility.';

COMMENT ON FUNCTION update_task_status IS 'DEPRECATED: Use NestJS TaskTemplatesService.updateStatus() instead. Kept for backward compatibility.';

COMMENT ON FUNCTION auto_populate_cost_time_dimensions IS 'DEPRECATED: Implement in NestJS service layer. Kept for backward compatibility.';

COMMENT ON FUNCTION update_crop_cycle_financials IS 'DEPRECATED: Implement in NestJS service layer. Kept for backward compatibility.';

COMMENT ON FUNCTION create_work_record_from_existing_task IS 'DEPRECATED: Use NestJS WorkersService.backfillWorkRecordFromTask() instead. Kept for backward compatibility.';

-- ============================================================================
-- ANALYTICS/REPORTING FUNCTIONS - Moved to NestJS (AdoptionService)
-- ============================================================================

COMMENT ON FUNCTION calculate_daily_adoption_metrics IS 'DEPRECATED: Use NestJS AdoptionService.calculateDailyMetrics() instead. Kept for backward compatibility.';

COMMENT ON FUNCTION generate_adoption_report IS 'DEPRECATED: Use NestJS AdoptionService.generateReport() instead. Kept for backward compatibility.';

COMMENT ON FUNCTION get_productivity_metrics IS 'DEPRECATED: Implement in NestJS analytics service. Kept for backward compatibility.';

-- ============================================================================
-- SUBSCRIPTION/PAYMENT FUNCTIONS - Should be in NestJS
-- ============================================================================

COMMENT ON FUNCTION get_subscription_pricing IS 'DEPRECATED: Implement in NestJS subscription service. Kept for backward compatibility.';

COMMENT ON FUNCTION calculate_module_subscription_price IS 'DEPRECATED: Implement in NestJS subscription service. Kept for backward compatibility.';

COMMENT ON FUNCTION create_or_update_polar_subscription IS 'DEPRECATED: Implement in NestJS Polar integration service. Kept for backward compatibility.';

COMMENT ON FUNCTION log_polar_webhook IS 'DEPRECATED: Implement in NestJS webhook handler. Kept for backward compatibility.';

-- ============================================================================
-- ABSTRACT ENTITY REGISTRY FUNCTIONS - Should be in NestJS
-- ============================================================================

COMMENT ON FUNCTION register_abstract_entity IS 'DEPRECATED: Implement in NestJS entity service. Kept for backward compatibility.';

COMMENT ON FUNCTION log_entity_event IS 'DEPRECATED: Implement in NestJS entity service. Kept for backward compatibility.';

COMMENT ON FUNCTION get_abstract_entity IS 'DEPRECATED: Implement in NestJS entity service. Kept for backward compatibility.';

COMMENT ON FUNCTION search_entities IS 'DEPRECATED: Implement in NestJS entity service. Kept for backward compatibility.';

-- ============================================================================
-- NOTIFICATION/ALERT FUNCTIONS - Orchestrators moved to NestJS
-- Query functions kept in SQL (read-only)
-- ============================================================================

-- Note: check_low_stock_inventory and check_low_stock_variants are kept as read-only queries
-- They are called by NestJS NotificationsService.checkLowStockAndNotify()

COMMENT ON FUNCTION create_low_stock_notifications IS 'DEPRECATED: Use NestJS NotificationsService.checkLowStockAndNotify() instead. Removed.';

COMMENT ON FUNCTION trigger_low_stock_check IS 'DEPRECATED: NestJS service handles this. Removed.';

-- ============================================================================
-- END OF DEPRECATIONS
-- ============================================================================

-- Log deprecation notice
DO $$
BEGIN
  RAISE LOG 'SQL functions have been moved to NestJS. Check function comments for NestJS alternatives.';
END;
$$;
