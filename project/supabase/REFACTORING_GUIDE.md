# Database Schema Refactoring Guide

## Current Situation
- **74 migration files**
- Many incremental fixes
- Some redundant migrations
- Hard to maintain and understand

## Recommended Refactoring Approach

### Step 1: Create Consolidated Initial Schema

#### Option A: From Current Database State (Safest)
```bash
# 1. Dump current schema from your database
supabase db dump --schema public -f supabase/migrations/00000000000000_consolidated_schema.sql

# 2. Clean up the dump (remove comments, consolidate statements)
# 3. Replace the old initial_schema.sql
```

#### Option B: Manual Consolidation
1. Start with `00000000000000_initial_schema.sql`
2. Apply all fixes from related migrations
3. Remove redundant code
4. Organize by logical sections

### Step 2: Group Related Migrations

Create a new structure:

```
migrations/
├── 00000000000000_consolidated_schema.sql  (new base schema)
├── core/
│   ├── 20251102000000_organization_users.sql (all org user fixes consolidated)
│   └── 20251006000000_user_signup_flow.sql
├── features/
│   ├── stock/
│   │   ├── 20250201000000_stock_management.sql (all stock features)
│   │   └── 20250201000010_stock_integrations.sql
│   ├── accounting/
│   │   └── 20251029000000_accounting_module.sql (consolidated)
│   └── tasks/
│       └── 20251022000000_task_management.sql (consolidated)
└── fixes/
    └── (keep critical standalone fixes here)
```

### Step 3: Consolidate Organization Users Fixes

All these can be merged into ONE file:
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

**Consolidated Content:**
```sql
-- Consolidated: Organization Users Setup and RLS Fixes
-- Includes: Table creation, RLS policies, helper functions

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.organization_users (...);

-- 2. All RLS policies (final versions)
CREATE POLICY ...;

-- 3. All helper functions (with correct search_path)
CREATE FUNCTION public.is_active_org_member(...) ...;
CREATE FUNCTION public.user_has_role(...) ...;
CREATE FUNCTION public.block_write_without_subscription() ...;
```

### Step 4: Consolidate Stock Management

Merge into logical groups:
- **Stock Core**: entries, movements, valuation
- **Item Master**: items, item_groups, pricing
- **Integrations**: quote_items, stock triggers

### Step 5: Create Migration Squash Script

See `squash_migrations.sql` template

## Implementation Plan

### Phase 1: Preparation (Safe)
1. ✅ Backup all migrations
2. ✅ Document current state
3. ✅ Identify consolidation candidates
4. ✅ Create consolidation plan

### Phase 2: Consolidation (Requires Testing)
1. Create consolidated initial schema
2. Group feature migrations
3. Test against fresh database
4. Verify all RLS policies work
5. Test critical operations

### Phase 3: Cleanup
1. Move old migrations to archive
2. Update documentation
3. Update CI/CD if needed

## Quick Start Commands

```bash
# 1. Backup current migrations
cp -r supabase/migrations supabase/migrations_backup

# 2. Dump current schema (if starting fresh)
supabase db dump --schema public > supabase/schema_dump.sql

# 3. Analyze migrations
ls supabase/migrations/*.sql | wc -l

# 4. Test consolidated schema
supabase db reset  # WARNING: This resets your local DB
```

## Best Practices

1. **Never delete production migrations** - archive them
2. **Test thoroughly** after consolidation
3. **Keep migration history** if you have production data
4. **Document why** you're consolidating
5. **One logical change per migration** going forward

## Notes for Production

If you have production data:
- **DO NOT** consolidate existing migrations
- **DO** create new consolidated schema for new deployments
- **DO** keep migration history for audit trail
- **DO** use separate "clean" migrations going forward

