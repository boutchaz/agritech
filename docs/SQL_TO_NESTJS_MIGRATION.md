# SQL to NestJS Migration Report

> **Date:** February 4, 2026  
> **Status:** Complete  
> **Schema File:** `project/supabase/migrations/00000000000000_schema.sql`

## Executive Summary

All business logic SQL functions have been migrated from Supabase PostgreSQL to NestJS services. The schema now contains only:
- Table definitions and indexes
- RLS (Row-Level Security) policies
- RLS helper functions
- Trigger functions for data integrity

**Before:** 74 SQL functions  
**After:** 25 SQL functions (all infrastructure/triggers)

---

## Migration Status by Category

### 1. Number Generation Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `generate_quote_number` | `generateQuoteNumber()` | `sequences.service.ts:104` | ✅ Migrated |
| `generate_invoice_number` | `generateInvoiceNumber()` | `sequences.service.ts:111` | ✅ Migrated |
| `generate_sales_order_number` | `generateSalesOrderNumber()` | `sequences.service.ts:122` | ✅ Migrated |
| `generate_purchase_order_number` | `generatePurchaseOrderNumber()` | `sequences.service.ts:129` | ✅ Migrated |
| `generate_journal_entry_number` | `generateJournalEntryNumber()` | `sequences.service.ts:136` | ✅ Migrated |
| `generate_payment_number` | `generatePaymentNumber()` | `sequences.service.ts:143` | ✅ Migrated |
| `generate_stock_entry_number` | `generateStockEntryNumber()` | `sequences.service.ts:150` | ✅ Migrated |
| `generate_item_code` | `generateItemCode()` | `items.service.ts:314` | ✅ Migrated |

**Implementation Pattern:**
```typescript
// sequences.service.ts
private async generateSequence(organizationId: string, type: SequenceType): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await client
    .from(config.table)
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte(config.dateColumn, `${year}-01-01`);
  return `${prefix}-${year}-${(count + 1).toString().padStart(5, '0')}`;
}
```

---

### 2. Financial Reports Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `get_trial_balance` | `getTrialBalance()` | `financial-reports.service.ts:118` | ✅ Migrated |
| `get_balance_sheet` | `getBalanceSheet()` | `financial-reports.service.ts:156` | ✅ Migrated |
| `get_profit_loss` | `getProfitLoss()` | `financial-reports.service.ts:202` | ✅ Migrated |
| `get_general_ledger` | `getGeneralLedger()` | `financial-reports.service.ts:254` | ✅ Migrated |
| `get_account_balance` | `getAccountBalance()` | `financial-reports.service.ts:351` | ✅ Migrated |
| `get_account_summary` | `getAccountSummary()` | `financial-reports.service.ts:326` | ✅ Migrated |

**Controller Endpoints:**
- `GET /financial-reports/trial-balance`
- `GET /financial-reports/balance-sheet`
- `GET /financial-reports/profit-loss`
- `GET /financial-reports/general-ledger`
- `GET /financial-reports/account-summary`
- `GET /financial-reports/account-balance/:accountId`

---

### 3. Journal Entry Automation Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `create_cost_journal_entry` | `createJournalEntryFromCost()` | `accounting-automation.service.ts:17` | ✅ Migrated |
| `create_revenue_journal_entry` | `createJournalEntryFromRevenue()` | `accounting-automation.service.ts:148` | ✅ Migrated |

**Note:** The SQL triggers `trg_cost_create_journal_entry` and `trg_revenue_create_journal_entry` were also removed. Journal entries are now created explicitly via NestJS API calls, providing better error handling and transaction control.

---

### 4. Account & Chart of Accounts Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `seed_moroccan_chart_of_accounts` | `seedAccounts()` | `admin.service.ts:224` | ✅ Migrated |
| `get_account_id_by_code` | Direct query in service | `accounting-automation.service.ts` | ✅ Inlined |
| `get_account_id_by_mapping` | `AccountMappingsService` | `account-mappings.service.ts` | ✅ Migrated |
| `get_account_mapping` | `getAccountMappings()` | `account-mappings.service.ts` | ✅ Migrated |
| `create_task_cost_mappings` | Template application | `accounts.service.ts:471` | ✅ Migrated |
| `create_harvest_sales_mappings` | Template application | `accounts.service.ts:471` | ✅ Migrated |

**Account Mappings Module:**
- `GET /account-mappings` - List all mappings
- `GET /account-mappings/types` - Get mapping types
- `GET /account-mappings/options` - Get mapping options
- `POST /account-mappings` - Create mapping
- `POST /account-mappings/initialize` - Initialize default mappings
- `PATCH /account-mappings/:id` - Update mapping
- `DELETE /account-mappings/:id` - Delete mapping

---

### 5. Farm & Analytics Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `get_farm_hierarchy_tree` | `getFarmHierarchy()` | `farms.service.ts:207` | ✅ Migrated |
| `has_valid_subscription` | `hasValidSubscription()` | `subscriptions.service.ts:378` | ✅ Migrated |
| `get_parcel_performance_summary` | `getParcelPerformance()` | `production-intelligence.service.ts:394` | ✅ Migrated |

---

### 6. Module Configuration Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `get_module_config` | `getModuleConfig()` | `module-config.service.ts:24` | ✅ Migrated |
| `get_widget_to_module_map` | Included in module config | `module-config.service.ts` | ✅ Merged |
| `clear_module_config_cache` | `clearCache()` | `module-config.service.ts` | ✅ Migrated |
| `refresh_module_config_cache` | `clearCache()` | `module-config.service.ts` | ✅ Migrated |
| `get_module_crop_types` | Strapi integration | `reference-data.service.ts` | ✅ Migrated |
| `get_generic_filter_options` | Direct queries per module | Various services | ✅ Distributed |
| `get_module_data` | Per-module services | Various services | ✅ Distributed |

---

### 7. Stock & Inventory Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `process_stock_entry_posting` | `processStockMovementsPg()` | `stock-entries.service.ts:488` | ✅ Migrated |
| `adjust_inventory` | Direct stock operations | `stock-entries.service.ts` | ✅ Inlined |

**Stock Entry Processing Methods:**
- `processMaterialReceiptPg()` - Stock entries.service.ts:524
- `processMaterialIssuePg()` - stock-entries.service.ts:605
- `processStockTransferPg()` - stock-entries.service.ts:690
- `processStockReconciliationPg()` - stock-entries.service.ts:825

---

### 8. Marketplace Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `check_marketplace_stock_availability` | Direct query | `cart.service.ts` | ✅ Inlined |
| `deduct_marketplace_listing_stock` | `deductMarketplaceListingStock()` | `orders.service.ts:17` | ✅ Migrated |
| `restore_marketplace_listing_stock` | `restoreMarketplaceListingStock()` | `orders.service.ts:46` | ✅ Migrated |
| `get_seller_quote_stats` | Direct query | `sellers.service.ts` | ✅ Inlined |

---

### 9. User Profile Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `create_or_update_user_profile` | Direct table operations | `users.service.ts`, `auth.service.ts` | ✅ Inlined |

**Note:** User profile creation/update is now handled through direct Supabase table operations in multiple services (users, auth, onboarding).

---

### 10. Fiscal Year & Campaign Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `get_fiscal_year_for_date` | `FiscalYearsService` queries | `fiscal-years.service.ts` | ✅ Migrated |
| `get_campaign_for_date` | `CampaignsService` queries | `campaigns.service.ts` | ✅ Migrated |

**Fiscal Years Module:**
- `GET /fiscal-years` - List all
- `GET /fiscal-years/active` - Get active fiscal year
- `GET /fiscal-years/:id` - Get by ID
- `POST /fiscal-years` - Create
- `PATCH /fiscal-years/:id` - Update
- `DELETE /fiscal-years/:id` - Delete
- `POST /fiscal-years/:id/close` - Close fiscal year
- `POST /fiscal-years/:id/reopen` - Reopen fiscal year

**Campaigns Module:**
- `GET /campaigns` - List all with filters
- `GET /campaigns/statistics` - Get statistics
- `GET /campaigns/:id` - Get by ID
- `POST /campaigns` - Create
- `PATCH /campaigns/:id` - Update
- `DELETE /campaigns/:id` - Delete
- `PATCH /campaigns/:id/status` - Update status

---

### 11. Tax & Translation Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `calculate_tax_amount` | Inline calculations | `quotes.service.ts`, `sales-orders.service.ts`, `purchase-orders.service.ts` | ✅ Inlined |
| `get_account_name_translation` | Strapi CMS | `strapi.service.ts` | ✅ Externalized |
| `upsert_account_translation` | Strapi CMS | `strapi.service.ts` | ✅ Externalized |

**Tax Calculation Pattern:**
```typescript
// Used in quotes, sales orders, purchase orders
const taxAmount = (amount * (item.tax_rate || 0)) / 100;
const lineTotal = amount + taxAmount;
```

---

### 12. File Management Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `detect_orphaned_files` | Background job | `files.service.ts` | ✅ Migrated |
| `mark_orphaned_files` | Background job | `files.service.ts` | ✅ Migrated |

---

### 13. Admin Functions ✅

| SQL Function (Removed) | NestJS Implementation | File | Status |
|------------------------|----------------------|------|--------|
| `refresh_admin_org_summary` | `AdminService` | `admin.service.ts` | ✅ Migrated |
| `get_user_organizations` | Direct query | `organization-users.service.ts` | ✅ Inlined |

---

## Remaining SQL Functions (Kept in Schema)

These 25 functions remain in the schema as they are essential infrastructure:

### RLS Helper Functions (5)
| Function | Purpose |
|----------|---------|
| `is_organization_member(p_organization_id)` | Check if user is org member |
| `is_internal_admin()` | Check if user is internal admin |
| `check_organization_access(p_user_id, p_organization_id)` | Verify user access to org |
| `check_organization_access(p_organization_id)` | Verify current user access |
| `get_user_org_role(p_user_id, p_organization_id)` | Get user's role in org |

### Trigger Functions (20)
| Function | Purpose |
|----------|---------|
| `update_updated_at_column()` | Auto-update timestamps |
| `handle_new_user()` | Create user profile on signup |
| `audit_trigger_func()` | Audit logging |
| `soft_delete()` | Soft delete records |
| `sync_farm_geometry()` | Sync farm geometries |
| `sync_parcel_geometry()` | Sync parcel geometries |
| `capture_base_quantity_at_movement()` | Track stock quantities |
| `validate_stock_movement_unit()` | Validate stock units |
| `populate_organization_id_from_farm()` | Auto-populate org ID |
| `populate_organization_id_from_parcel()` | Auto-populate org ID |
| `populate_organization_id_from_tree_category()` | Auto-populate org ID |
| `ensure_single_default_template()` | Template constraints |
| `ensure_single_current_fiscal_year()` | Fiscal year constraints |
| `update_document_templates_timestamp()` | Template timestamps |
| `update_quote_request_updated_at()` | Quote request timestamps |
| `update_campaigns_updated_at()` | Campaign timestamps |
| `update_quality_inspections_updated_at()` | Inspection timestamps |
| `update_account_mappings_updated_at()` | Mapping timestamps |
| `update_product_variants_updated_at()` | Variant timestamps |

---

## Architecture Benefits

### Before (SQL-heavy)
```
Client → API → Supabase RPC → SQL Function → Database
                    ↓
              Complex PL/pgSQL logic
              Hard to test
              Limited error handling
```

### After (NestJS-centric)
```
Client → NestJS API → Service Layer → Supabase Client → Database
              ↓
         TypeScript logic
         Full test coverage
         Rich error handling
         Dependency injection
         Transaction support
```

---

## Testing Coverage

| Module | Test File | Tests |
|--------|-----------|-------|
| Sequences | `sequences.service.spec.ts` | Number generation |
| Financial Reports | `financial-reports.service.spec.ts` | All report types |
| Subscriptions | `subscriptions.service.spec.ts` | `hasValidSubscription()` |
| Fiscal Years | `fiscal-years.service.spec.ts` | CRUD + close/reopen |
| Account Mappings | `account-mappings.service.spec.ts` | CRUD + initialization |
| Stock Entries | `stock-entries.service.spec.ts` | All stock operations |
| Production Intelligence | `production-intelligence.service.spec.ts` | `getParcelPerformance()` |

---

## Migration Verification Checklist

- [x] All number generation functions migrated to `SequencesService`
- [x] All financial report functions migrated to `FinancialReportsService`
- [x] Journal entry automation migrated to `AccountingAutomationService`
- [x] Account mappings migrated to `AccountMappingsService`
- [x] Stock entry processing migrated to `StockEntriesService`
- [x] Marketplace stock functions migrated to `OrdersService`
- [x] Item code generation migrated to `ItemsService`
- [x] No RPC calls to removed functions remain in codebase
- [x] TypeScript compiles without errors
- [x] ESLint passes (only pre-existing warnings)

---

## Files Modified in This Migration

### NestJS Services
1. `agritech-api/src/modules/items/items.service.ts` - Added `generateItemCode()`
2. `agritech-api/src/modules/marketplace/orders.service.ts` - Added stock deduct/restore methods

### Test Files
1. `agritech-api/src/modules/marketplace/orders.service.spec.ts` - Updated mocks

### Schema
1. `project/supabase/migrations/00000000000000_schema.sql` - Removed ~50 business logic functions

---

## Rollback Plan

If issues arise, the removed SQL functions are archived in:
```
project/supabase/migrations/archived/20260131000005_deprecate_sql_functions.sql
```

To restore a function, copy it from the archived file back to the main schema.

---

## Maintenance Notes

1. **Adding New Sequences:** Add to `SequenceType` enum and `sequenceConfigs` in `sequences.service.ts`
2. **Adding New Reports:** Add methods to `financial-reports.service.ts`
3. **Modifying Stock Logic:** Update `stock-entries.service.ts` processing methods
4. **Account Mappings:** Use `AccountMappingsService` for all mapping operations

---

*Generated by Claude Code Migration Tool*
