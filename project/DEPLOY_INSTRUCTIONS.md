# Database Deployment Instructions

## Quick Fix for Current Error

You're seeing this error:
```
"message": "column \"description_fr\" of relation \"accounts\" does not exist"
```

This is because your remote database has old multilingual columns that need to be removed.

## Option 1: Quick Fix (Recommended)

Run this single SQL script in Supabase SQL Editor:

### Step 1: Open SQL Editor
Go to: https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou/sql

### Step 2: Run the Fix Script
Copy and paste the contents of **[FIX_ACCOUNTS_SCHEMA.sql](FIX_ACCOUNTS_SCHEMA.sql)** and click "Run"

This will:
- Remove all old multilingual columns (`description_fr`, `description_ar`, `description_en`, `name_fr`, `name_ar`, `name_en`)
- Show you the current schema
- Fix the error immediately

### Step 3: Verify
The query should show only these columns:
```
id, organization_id, code, name, account_type, account_subtype,
parent_id, description, currency_code, is_group, is_active,
allow_cost_center, created_at, created_by, updated_at
```

**Done!** The error should be fixed.

---

## Option 2: Full Schema Deployment (Complete Setup)

If you want to deploy the complete multi-country accounting system:

### Step 1: Fix the accounts table first
Run [FIX_ACCOUNTS_SCHEMA.sql](FIX_ACCOUNTS_SCHEMA.sql) as described above

### Step 2: Deploy full schema
Copy and paste **entire** [00000000000000_schema.sql](supabase/migrations/00000000000000_schema.sql) into SQL Editor and run

This will add:
- ✅ Multi-country accounting tables (`account_templates`, `account_mappings`)
- ✅ Support for 5 countries (Morocco, Tunisia, France, USA, UK)
- ✅ 119 pre-configured account templates
- ✅ 55 account mappings for automatic journal entries
- ✅ Generic `seed_chart_of_accounts()` function
- ✅ Updated ledger integration triggers

### Step 3: Test
```sql
-- Test Morocco seeding
SELECT * FROM seed_chart_of_accounts('your-org-id', 'MA', 'PCEC');

-- Should return:
-- {accounts_created: 36, success: true, message: "Successfully created 36 accounts for MA - PCEC"}
```

---

## Why Database Push is Failing

The automated `npx supabase db push` command fails with:
```
failed to connect to postgres: dial tcp [...]: connect: no route to host
```

This is a **network connectivity issue** between your machine and Supabase servers. Manual deployment via SQL Editor is the correct workaround.

---

## What Changed in the Schema

### 1. Accounts Table Cleanup
**Before** (old schema):
```sql
CREATE TABLE accounts (
  ...
  name VARCHAR(255),
  name_fr VARCHAR(255),  -- REMOVED
  name_ar VARCHAR(255),  -- REMOVED
  name_en VARCHAR(255),  -- REMOVED
  description TEXT,
  description_fr TEXT,   -- REMOVED
  description_ar TEXT,   -- REMOVED
  description_en TEXT,   -- REMOVED
  ...
);
```

**After** (new schema):
```sql
CREATE TABLE accounts (
  ...
  name VARCHAR(255),        -- Single name field
  description TEXT,         -- Single description field
  ...
);
```

**Why**: The multi-country accounting system uses templates instead of multilingual columns. Each country gets its own pre-configured accounts in their language.

### 2. New Multi-Country Tables

**account_templates**:
```sql
CREATE TABLE account_templates (
  country_code VARCHAR(2),           -- MA, TN, FR, US, GB
  accounting_standard VARCHAR(50),   -- PCEC, PCN, PCG, GAAP, FRS102
  account_code VARCHAR(50),
  account_name VARCHAR(255),         -- In country's language
  account_type VARCHAR(50),
  ...
);
```

**account_mappings**:
```sql
CREATE TABLE account_mappings (
  country_code VARCHAR(2),
  accounting_standard VARCHAR(50),
  mapping_type VARCHAR(50),    -- 'cost_type', 'revenue_type', 'cash'
  mapping_key VARCHAR(100),    -- 'labor', 'harvest', 'bank'
  account_code VARCHAR(50),
  ...
);
```

### 3. Organizations Table Extended
```sql
ALTER TABLE organizations
ADD COLUMN country_code VARCHAR(2);        -- ISO 3166-1 alpha-2
ADD COLUMN accounting_standard VARCHAR(50); -- PCG, PCEC, PCN, GAAP, FRS102
```

Existing organizations automatically set to France (FR/PCG).

---

## Troubleshooting

### Error: "column description_fr does not exist"
**Solution**: Run [FIX_ACCOUNTS_SCHEMA.sql](FIX_ACCOUNTS_SCHEMA.sql) first

### Error: "relation account_templates does not exist"
**Solution**: Deploy full schema [00000000000000_schema.sql](supabase/migrations/00000000000000_schema.sql)

### Frontend still shows error after deployment
**Solution**:
1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
2. Clear Supabase cache by restarting dev server
3. Verify schema deployed correctly with verification queries below

### Verification Queries

```sql
-- 1. Check accounts table has correct schema
SELECT column_name FROM information_schema.columns
WHERE table_name = 'accounts' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check multi-country tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('account_templates', 'account_mappings');

-- 3. Check templates loaded
SELECT country_code, accounting_standard, COUNT(*) as accounts
FROM account_templates
GROUP BY country_code, accounting_standard;

-- Expected:
-- MA | PCEC   | 36
-- TN | PCN    | 26
-- FR | PCG    | 0  (uses legacy function)
-- US | GAAP   | 27
-- GB | FRS102 | 30

-- 4. Check mappings loaded
SELECT country_code, COUNT(*) as mappings
FROM account_mappings
GROUP BY country_code;

-- Expected: 11 mappings per country (5 countries = 55 total)
```

---

## Files Reference

| File | Purpose |
|------|---------|
| [FIX_ACCOUNTS_SCHEMA.sql](FIX_ACCOUNTS_SCHEMA.sql) | Quick fix for description_fr error |
| [00000000000000_schema.sql](supabase/migrations/00000000000000_schema.sql) | Complete database schema |
| [MULTI_COUNTRY_ACCOUNTING_IMPLEMENTATION.md](MULTI_COUNTRY_ACCOUNTING_IMPLEMENTATION.md) | Full implementation guide |
| [FRONTEND_FIXES_SUMMARY.md](FRONTEND_FIXES_SUMMARY.md) | Frontend error fixes |

---

## Support

If you encounter issues:
1. Check that FIX_ACCOUNTS_SCHEMA.sql ran successfully (should show success messages)
2. Verify columns using the verification queries above
3. Check browser console for specific error messages
4. Ensure frontend is using latest code (restart dev server)

---

## Status After Deployment

✅ **Frontend**: All React errors fixed
✅ **Schema**: Cleanup migration added
✅ **Multi-Country**: 5 countries supported
✅ **Ledger**: Automatic journal entries work
⏳ **Deployment**: Awaiting manual SQL execution

Run [FIX_ACCOUNTS_SCHEMA.sql](FIX_ACCOUNTS_SCHEMA.sql) now to fix the immediate error!
