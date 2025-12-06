# Database Migration Order Guide

**Date**: December 2, 2025
**Status**: Ready for Deployment

---

## Overview

This guide explains the correct order to run database migrations for the double-entry bookkeeping system integration.

---

## Migration Order

The migrations **MUST** be run in this specific order:

### 1. Fix Journal Entry Totals (FIRST)
**File**: `20251130000000_fix_journal_entry_totals.sql`

**What it does**:
- Creates database trigger `recalculate_journal_entry_totals()`
- Automatically calculates `total_debit` and `total_credit` from `journal_items`
- Enforces three-layer validation for double-entry bookkeeping

**Why first**: Core functionality needed by all other migrations

---

### 2. Alter Account Mappings Table (SECOND)
**File**: `20251130000002_alter_account_mappings.sql`

**What it does**:
- Adds `organization_id` column to `account_mappings`
- Adds `source_key` column (replaces `mapping_key`)
- Adds `account_id` column (foreign key to `accounts` table)
- Adds `is_active` boolean flag
- Adds `metadata` JSONB column for additional configuration
- Migrates existing data to new columns
- Creates new unique indexes for org-specific mappings

**Why second**: Task and harvest mappings depend on these new columns

**Backward Compatible**: Yes - old global mappings still work

---

### 3. Task Cost Account Mappings (THIRD)
**File**: `20251201000001_task_cost_account_mappings.sql`

**What it does**:
- Creates function `create_task_cost_mappings(organization_id, country_code)`
- Creates view `v_task_cost_mappings` for easy reference
- Maps 9 task types to expense accounts (6xxx codes for Morocco)

**Depends on**: Migration #2 (altered account_mappings table)

---

### 4. Harvest Sales Account Mappings (FOURTH)
**File**: `20251201000002_harvest_sales_account_mappings.sql`

**What it does**:
- Creates function `create_harvest_sales_mappings(organization_id, country_code)`
- Creates view `v_harvest_sales_mappings` for easy reference
- Maps 5 sale types to revenue accounts (4111 for Morocco)

**Depends on**: Migration #2 (altered account_mappings table)

---

## Running the Migrations

### Option 1: Supabase CLI (Recommended)

```bash
cd project/supabase
supabase db reset  # Warning: This will reset the entire database

# Or apply migrations individually:
supabase migration up
```

### Option 2: SQL Editor (Manual)

Run each migration file in order using the Supabase SQL Editor:

1. Open Supabase Dashboard → SQL Editor
2. Paste content of `20251130000000_fix_journal_entry_totals.sql`
3. Click "Run"
4. Repeat for each migration in order

### Option 3: psql (Direct Database)

```bash
# Set your database URL
export DATABASE_URL="postgresql://..."

# Run migrations in order
psql $DATABASE_URL < 20251130000000_fix_journal_entry_totals.sql
psql $DATABASE_URL < 20251130000002_alter_account_mappings.sql
psql $DATABASE_URL < 20251201000001_task_cost_account_mappings.sql
psql $DATABASE_URL < 20251201000002_harvest_sales_account_mappings.sql
```

---

## After Running Migrations

### Step 1: Verify Migrations Applied

```sql
-- Check journal entry trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trg_recalculate_journal_totals';

-- Check account_mappings columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'account_mappings'
  AND column_name IN ('organization_id', 'source_key', 'account_id', 'is_active', 'metadata');

-- Check views created
SELECT table_name
FROM information_schema.views
WHERE table_name IN ('v_task_cost_mappings', 'v_harvest_sales_mappings');
```

### Step 2: Create Account Mappings for Each Organization

For each organization, run the setup functions:

```sql
-- Get your organization ID
SELECT id, name FROM organizations;

-- For Morocco (MA) organizations:

-- Create task cost mappings
SELECT create_task_cost_mappings('your-org-id-here', 'MA');

-- Create harvest sales mappings
SELECT create_harvest_sales_mappings('your-org-id-here', 'MA');
```

### Step 3: Verify Mappings Created

```sql
-- Check task cost mappings
SELECT * FROM v_task_cost_mappings
WHERE organization_id = 'your-org-id';

-- Expected: 9 task types mapped to expense accounts
-- planting → 6125, harvesting → 6125, irrigation → 6141, etc.

-- Check harvest sales mappings
SELECT * FROM v_harvest_sales_mappings
WHERE organization_id = 'your-org-id';

-- Expected: 5 sale types mapped to revenue account 4111
-- market, export, direct_client, processing, storage
```

---

## Common Issues & Solutions

### Issue 1: "column is_active does not exist"

**Cause**: Migration #2 (alter_account_mappings) not run yet

**Solution**: Run migrations in correct order (1 → 2 → 3 → 4)

### Issue 2: "column a.account_code does not exist"

**Cause**: View trying to access wrong column name

**Solution**: Already fixed in latest migration files (uses `a.code` instead)

### Issue 3: "unique constraint violation"

**Cause**: Trying to create duplicate mappings

**Solution**: Check existing mappings first:
```sql
SELECT * FROM account_mappings
WHERE organization_id = 'your-org-id'
  AND mapping_type IN ('cost_type', 'harvest_sale');
```

### Issue 4: "Chart of accounts not seeded"

**Cause**: Organization doesn't have GL accounts created yet

**Solution**: Seed chart of accounts first:
```sql
-- Use the NestJS API endpoint:
POST /api/v1/accounts/seed-moroccan-chart
Headers: x-organization-id: your-org-id
```

---

## Migration Files Location

```
project/supabase/migrations/
├── 20251130000000_fix_journal_entry_totals.sql        (FIRST)
├── 20251130000002_alter_account_mappings.sql          (SECOND)
├── 20251201000001_task_cost_account_mappings.sql      (THIRD)
└── 20251201000002_harvest_sales_account_mappings.sql  (FOURTH)
```

---

## Schema Changes Summary

### `account_mappings` Table (BEFORE)

```sql
CREATE TABLE account_mappings (
  id UUID PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  accounting_standard VARCHAR(50) NOT NULL,
  mapping_type VARCHAR(50) NOT NULL,
  mapping_key VARCHAR(100) NOT NULL,  -- OLD
  account_code VARCHAR(50) NOT NULL,  -- OLD
  description TEXT,
  created_at TIMESTAMPTZ
);
```

### `account_mappings` Table (AFTER)

```sql
CREATE TABLE account_mappings (
  id UUID PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  accounting_standard VARCHAR(50) NOT NULL,
  mapping_type VARCHAR(50) NOT NULL,
  mapping_key VARCHAR(100) NOT NULL,     -- Still exists for backward compat
  account_code VARCHAR(50) NOT NULL,     -- Still exists for backward compat
  description TEXT,
  created_at TIMESTAMPTZ,
  -- NEW COLUMNS:
  organization_id UUID REFERENCES organizations(id),  -- NEW
  source_key VARCHAR(100),                             -- NEW
  account_id UUID REFERENCES accounts(id),            -- NEW
  is_active BOOLEAN DEFAULT true,                     -- NEW
  metadata JSONB DEFAULT '{}'::jsonb                  -- NEW
);
```

---

## Testing After Migration

### 1. Test Task Cost Journal Entry

```bash
# Complete a task with actual_cost
PATCH /api/v1/organizations/:orgId/tasks/:taskId/complete
{
  "actual_cost": 500,
  "notes": "Task completed"
}

# Verify journal entry created
GET /api/v1/journal-entries?reference_type=task&reference_id=:taskId
```

### 2. Test Harvest Sale Journal Entry

```bash
# Sell a harvest
POST /api/v1/organizations/:orgId/harvests/:harvestId/sell
{
  "sale_date": "2025-12-02",
  "quantity_sold": 500,
  "price_per_unit": 12.50,
  "payment_terms": "cash",
  "customer_name": "Local Market"
}

# Verify journal entry created
GET /api/v1/journal-entries?reference_type=harvest_sale&reference_id=:harvestId
```

### 3. Verify Double-Entry Balance

```sql
SELECT
  je.entry_number,
  je.total_debit,
  je.total_credit,
  je.total_debit - je.total_credit as difference
FROM journal_entries je
WHERE je.reference_type IN ('task', 'harvest_sale')
ORDER BY je.created_at DESC
LIMIT 10;

-- Expected: difference should be 0.00 for all entries
```

---

## Rollback Plan

If issues occur, you can rollback migrations in REVERSE order:

```sql
-- 1. Drop harvest sales mappings
DROP VIEW IF EXISTS v_harvest_sales_mappings;
DROP FUNCTION IF EXISTS create_harvest_sales_mappings;

-- 2. Drop task cost mappings
DROP VIEW IF EXISTS v_task_cost_mappings;
DROP FUNCTION IF EXISTS create_task_cost_mappings;

-- 3. Revert account_mappings changes
ALTER TABLE account_mappings
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS account_id,
  DROP COLUMN IF EXISTS source_key,
  DROP COLUMN IF EXISTS organization_id;

-- 4. Drop journal entry trigger
DROP TRIGGER IF EXISTS trg_recalculate_journal_totals ON journal_items;
DROP FUNCTION IF EXISTS recalculate_journal_entry_totals;
```

---

## Success Criteria

- [ ] All 4 migrations run without errors
- [ ] Trigger `trg_recalculate_journal_totals` exists
- [ ] Views `v_task_cost_mappings` and `v_harvest_sales_mappings` exist
- [ ] Account mappings created for at least one organization
- [ ] Test task completion creates journal entry
- [ ] Test harvest sale creates journal entry
- [ ] All journal entries are balanced (total_debit = total_credit)

---

## Support

For issues:
1. Check [DATABASE_CONNECTION_FIX.md](DATABASE_CONNECTION_FIX.md)
2. Check [DOUBLE_ENTRY_QUICK_REFERENCE.md](DOUBLE_ENTRY_QUICK_REFERENCE.md)
3. Review application logs for detailed error messages

**Status**: ✅ **MIGRATIONS READY FOR DEPLOYMENT**
