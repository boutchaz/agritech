# Migrations Consolidated into Schema.sql

**Date**: December 2, 2025
**Status**: ✅ Complete

---

## Summary

All Phase 2 and Phase 3 migrations have been successfully merged into the main schema file:
[00000000000000_schema.sql](project/supabase/migrations/00000000000000_schema.sql)

The separate migration files are now **redundant** and can be safely deleted.

---

## What Was Merged

### 1. Journal Entry Trigger (Lines 1228-1277)

**Source**: `20251130000000_fix_journal_entry_totals.sql`

**Added**:
- Function: `recalculate_journal_entry_totals()`
- Trigger: `trg_recalculate_totals` on `journal_items` table
- Auto-calculates `total_debit` and `total_credit` for journal entries

**Location in schema.sql**: Right after the `journal_items` table definition

---

### 2. Account Mappings Table Enhancement (Lines 513-554)

**Source**: `20251130000002_alter_account_mappings.sql`

**Changes to `account_mappings` table**:
```sql
-- NEW columns added:
organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
source_key VARCHAR(100)
account_id UUID REFERENCES accounts(id) ON DELETE CASCADE
is_active BOOLEAN DEFAULT true
metadata JSONB DEFAULT '{}'::jsonb

-- NEW unique constraints:
UNIQUE (country_code, accounting_standard, mapping_type, mapping_key)  -- Global templates
UNIQUE (organization_id, mapping_type, source_key)                     -- Org-specific
```

**Purpose**: Allows both global template mappings and organization-specific account mappings

**Location in schema.sql**: Updated the original `account_mappings` table definition

---

### 3. Task Cost Account Mappings (Lines 7933-7999)

**Source**: `20251201000001_task_cost_account_mappings.sql`

**Added**:
- Function: `create_task_cost_mappings(p_organization_id, p_country_code)`
- Maps 9 task types to expense account (6125 - Agricultural Operations)
- Maps cash and AP accounts for payment processing

**Task Types Mapped**:
- planting
- harvesting
- irrigation
- fertilization
- pest_control
- pruning
- soil_preparation
- maintenance
- general

**Location in schema.sql**: Before final verification block (line 7933)

---

### 4. Harvest Sales Account Mappings (Lines 8002-8063)

**Source**: `20251201000002_harvest_sales_account_mappings.sql`

**Added**:
- Function: `create_harvest_sales_mappings(p_organization_id, p_country_code)`
- Maps 5 sale types to revenue account (4111 - Sales Revenue)
- Includes AR and Cash account references for payment terms

**Sale Types Mapped**:
- market
- export
- direct_client
- processing
- storage

**Location in schema.sql**: Before final verification block (line 8002)

---

### 5. Helper Views (Lines 8066-8101)

**Added**:
- `v_task_cost_mappings` - Easy reference for task cost mappings
- `v_harvest_sales_mappings` - Easy reference for harvest sales mappings

**Purpose**: Simplified queries for application code to fetch account mappings

---

## Files That Can Be Deleted

The following migration files have been merged and are now redundant:

```
project/supabase/migrations/20251130000000_fix_journal_entry_totals.sql
project/supabase/migrations/20251130000002_alter_account_mappings.sql
project/supabase/migrations/20251201000001_task_cost_account_mappings.sql
project/supabase/migrations/20251201000002_harvest_sales_account_mappings.sql
```

**⚠️ Before Deleting**:
1. Ensure schema.sql has been successfully deployed
2. Verify all functions and views are working
3. Test account mapping creation for both tasks and harvests
4. Keep backups if desired for historical reference

---

## Verification Checklist

Run these queries to verify the merge was successful:

### 1. Check Account Mappings Table Structure
```sql
\d account_mappings
-- Should show: organization_id, source_key, account_id, is_active, metadata columns
```

### 2. Check Trigger Exists
```sql
SELECT tgname, tgtype FROM pg_trigger WHERE tgname = 'trg_recalculate_totals';
-- Should return: trg_recalculate_totals | AFTER
```

### 3. Check Functions Exist
```sql
SELECT proname FROM pg_proc WHERE proname IN (
  'recalculate_journal_entry_totals',
  'create_task_cost_mappings',
  'create_harvest_sales_mappings'
);
-- Should return all 3 function names
```

### 4. Check Views Exist
```sql
SELECT viewname FROM pg_views WHERE viewname IN (
  'v_task_cost_mappings',
  'v_harvest_sales_mappings'
);
-- Should return both view names
```

### 5. Test Account Mapping Creation
```sql
-- Get your organization ID
SELECT id FROM organizations LIMIT 1;

-- Create task cost mappings
SELECT create_task_cost_mappings('your-org-id-here', 'MA');

-- Create harvest sales mappings
SELECT create_harvest_sales_mappings('your-org-id-here', 'MA');

-- Verify task mappings
SELECT * FROM v_task_cost_mappings WHERE organization_id = 'your-org-id-here';

-- Verify harvest mappings
SELECT * FROM v_harvest_sales_mappings WHERE organization_id = 'your-org-id-here';
```

---

## Deployment Notes

Since everything is now in `00000000000000_schema.sql`:

### Fresh Database Setup
```bash
# Simply run the schema file
psql -U postgres -d agritech -f project/supabase/migrations/00000000000000_schema.sql
```

### Existing Database
If you have an existing database that already ran the separate migrations:

1. **Option A**: No action needed - the separate migrations already applied these changes
2. **Option B**: Reset and re-run schema.sql:
   ```bash
   # WARNING: This drops all data
   psql -U postgres -d agritech -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   psql -U postgres -d agritech -f project/supabase/migrations/00000000000000_schema.sql
   ```

---

## Related Documentation

- [PHASE3_HARVESTS_INTEGRATION_COMPLETE.md](PHASE3_HARVESTS_INTEGRATION_COMPLETE.md) - Phase 3 implementation details
- [DOUBLE_ENTRY_QUICK_REFERENCE.md](DOUBLE_ENTRY_QUICK_REFERENCE.md) - Double-entry accounting reference
- [DATABASE_CONNECTION_FIX.md](DATABASE_CONNECTION_FIX.md) - Connection pool configuration
- [MIGRATION_ORDER_GUIDE.md](MIGRATION_ORDER_GUIDE.md) - Old migration order (now obsolete)

---

## Summary of Changes to schema.sql

| Line Range | Content | Source Migration |
|------------|---------|------------------|
| 513-554 | Enhanced account_mappings table definition | 20251130000002_alter_account_mappings.sql |
| 1228-1277 | Journal entry trigger and function | 20251130000000_fix_journal_entry_totals.sql |
| 7933-7999 | Task cost mappings function | 20251201000001_task_cost_account_mappings.sql |
| 8002-8063 | Harvest sales mappings function | 20251201000002_harvest_sales_account_mappings.sql |
| 8066-8101 | Helper views and comments | Both 20251201000001 and 20251201000002 |

---

## Next Steps

1. ✅ Test the merged schema.sql on a fresh database
2. ✅ Verify all functions, triggers, and views work correctly
3. ✅ Test creating account mappings for an organization
4. ✅ Test task completion with journal entry creation
5. ✅ Test harvest sale with journal entry creation
6. 🔲 Delete redundant migration files (after verification)
7. 🔲 Update deployment documentation to reference single schema.sql

---

**Status**: ✅ Consolidation Complete - Single Source of Truth Established
