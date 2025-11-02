# Migration Consolidation Strategy

## Overview
You currently have 74 migration files with many incremental fixes. This guide will help you consolidate them into a cleaner structure.

## Approach Options

### Option 1: Squash into New Initial Schema (Recommended for Development)
Create a fresh consolidated initial schema by:
1. Dumping current database schema
2. Creating a new consolidated initial schema
3. Resetting migrations (risky if in production)

### Option 2: Group Related Migrations
Keep migrations but group related fixes together

### Option 3: Create Base Schema + Feature Migrations
Split into:
- Base schema (tables, indexes, constraints)
- Feature modules (accounting, stock, tasks, etc.)
- Fix migrations (keep these separate)

## Recommended Structure

### Phase 1: Analysis
1. Identify consolidation candidates:
   - Multiple fixes to same function (organization_users RLS fixes)
   - Feature creation + subsequent fixes
   - Schema adjustments that could be combined

2. Categories to consolidate:
   - **Organization/User Setup**: Initial auth, RLS fixes
   - **Stock Management**: Stock entries, valuation, item master
   - **Accounting Module**: All accounting-related
   - **Tasks System**: Task management and fixes
   - **Farms/Parcels**: Core agriculture features

### Phase 2: Consolidation Script
See `consolidate_migrations.sh` for automated consolidation

### Phase 3: Verification
1. Test against local database
2. Verify RLS policies
3. Check function dependencies
4. Test critical operations

## Migration Categories Identified

### Core Setup (Can consolidate)
- `00000000000000_initial_schema.sql` (base)
- `20251102000000_ensure_organization_users_table.sql`
- `20251102000001_fix_organization_users_rls_recursion.sql`
- `20250201000012_fix_organization_users_rls_recursion_v2.sql`
- `20250201000013_fix_org_users_rls_complete.sql`
- `20250201000014_fix_functions_search_path.sql`
- `20250201000015_fix_user_has_role_function.sql`
- `20250201000016_ensure_organization_users_and_fix_policies.sql`
- `20250201000017_debug_organization_users_issue.sql`
- `20250201000018_fix_block_write_without_subscription.sql`
- `20250201000019_fix_block_write_trigger_function.sql`

### Stock Management (Can consolidate)
- `20250201000000_create_stock_entries.sql`
- `20250201000001_stock_valuation_and_enhancements.sql`
- `20250201000003_opening_stock_and_accounting_integration.sql`
- `20250201000005_create_item_master_system.sql`
- `20250201000006_migrate_to_item_master.sql`
- `20250201000007_remove_inventory_items.sql`
- `20250201000008_update_stock_entry_trigger.sql`
- `20250201000009_fix_stock_movements_rls.sql`
- `20250201000010_add_item_id_to_quote_items.sql`

### Tasks System (Can consolidate)
- `20250121000000_enhanced_task_management.sql`
- `20251022000000_link_tasks_to_users.sql`
- `20251023000000_fix_tasks_insert_policy.sql` through `20251023000006_make_tasks_farm_id_nullable.sql`

### Accounting (Already somewhat grouped)
- `20251029220048_create_accounting_module_safe.sql`
- `20251030100000_fix_accounting_payments_rls.sql`
- `20251030101000_add_suppliers_rls_policies.sql`
- `20251030110000_create_billing_cycle.sql`

## Important Notes

⚠️ **WARNING**: Do NOT consolidate migrations if:
- You're in production with users
- You can't reset the database
- You need to maintain migration history

✅ **Safe to consolidate if**:
- Still in development
- Can reset local/staging databases
- Want cleaner migration history going forward

## Next Steps

1. Review this strategy
2. Choose consolidation approach
3. Run consolidation script (if approved)
4. Test thoroughly
5. Update documentation

