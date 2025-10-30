# Database Migrations

This document covers the complete workflow for creating, testing, and deploying database migrations in the AgriTech Platform.

## Overview

The AgriTech Platform uses Supabase CLI for database migration management. Migrations are SQL files that version-control schema changes, ensuring consistent deployments across environments.

## Migration Architecture

```mermaid
graph LR
    A[Local Dev] -->|Create Migration| B[Migration File]
    B -->|Test Locally| C[Local Supabase]
    C -->|Push| D[Remote Supabase]
    D -->|Generate Types| E[TypeScript Types]
    E -->|Commit| F[Git Repository]
```

## Directory Structure

```
project/
├── supabase/
│   ├── config.toml                    # Supabase configuration
│   ├── migrations/
│   │   ├── 00000000000000_initial_schema.sql
│   │   ├── 20251029220048_create_accounting_module_safe.sql
│   │   ├── 20251029224701_seed_chart_of_accounts.sql
│   │   └── ...
│   ├── functions/                     # Edge functions
│   └── seed.sql                       # Seed data (optional)
└── src/
    └── types/
        └── database.types.ts          # Generated types
```

## Migration Naming Convention

Migrations follow the pattern: `YYYYMMDDHHMMSS_description.sql`

**Examples:**
- `20251029220048_create_accounting_module_safe.sql`
- `20251030000000_fix_invoice_rls_policy.sql`
- `20251023000011_disable_parcels_rls.sql`

**Best Practices:**
- Use descriptive names (not just "update_schema")
- Use snake_case for descriptions
- Keep names concise but meaningful
- Prefix with action: `create_`, `add_`, `fix_`, `update_`, `remove_`

---

## Creating Migrations

### Method 1: Using Supabase CLI (Recommended)

```bash
# From /project directory

# Create a new migration
npx supabase migration new add_harvest_tracking

# This creates: supabase/migrations/20251030123456_add_harvest_tracking.sql
```

### Method 2: Manual Creation

Create a file manually following the naming convention:

```bash
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_your_migration_name.sql
```

---

## Writing Migration SQL

### Basic Structure

```sql
-- =====================================================
-- Migration: Add Harvest Tracking
-- Description: Adds harvest_deliveries table with customer linking
-- Date: 2025-10-30
-- =====================================================

-- 1. CREATE TABLES
CREATE TABLE IF NOT EXISTS harvest_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  harvest_id UUID NOT NULL REFERENCES harvests(id) ON DELETE CASCADE,

  -- Customer info
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),

  -- Delivery details
  delivery_date DATE NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,

  -- Payment
  payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid', 'partial', 'paid'
  )),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_harvest_deliveries_org
  ON harvest_deliveries(organization_id);
CREATE INDEX IF NOT EXISTS idx_harvest_deliveries_harvest
  ON harvest_deliveries(harvest_id);
CREATE INDEX IF NOT EXISTS idx_harvest_deliveries_date
  ON harvest_deliveries(delivery_date DESC);

-- 3. ENABLE RLS
ALTER TABLE harvest_deliveries ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
CREATE POLICY "org_access_harvest_deliveries" ON harvest_deliveries
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
  )
);

-- 5. CREATE TRIGGERS
CREATE TRIGGER trg_harvest_deliveries_updated_at
BEFORE UPDATE ON harvest_deliveries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. ADD COMMENTS
COMMENT ON TABLE harvest_deliveries IS
  'Tracks harvest deliveries to customers with payment status';
COMMENT ON COLUMN harvest_deliveries.payment_status IS
  'Payment status: unpaid, partial, or paid';
```

### Safe Migration Patterns

#### 1. Idempotent Operations

Always use `IF EXISTS` / `IF NOT EXISTS`:

```sql
-- ✅ GOOD: Safe to run multiple times
CREATE TABLE IF NOT EXISTS my_table (...);
DROP TABLE IF EXISTS old_table;
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_column TEXT;

-- ❌ BAD: Will fail on second run
CREATE TABLE my_table (...);
DROP TABLE old_table;
```

#### 2. Handling Existing Data

```sql
-- Add column with default value
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5, 2) DEFAULT 0;

-- Backfill data
UPDATE tasks
SET estimated_hours = 8.0
WHERE estimated_hours IS NULL AND status = 'pending';
```

#### 3. Enum Types

```sql
-- Create enum type safely
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'submitted', 'paid', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add values to existing enum
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'overdue';
```

#### 4. Renaming (Careful!)

```sql
-- Rename column (can break app if not coordinated)
ALTER TABLE tasks RENAME COLUMN due_date TO deadline;

-- Better: Add new column, migrate data, then drop old
ALTER TABLE tasks ADD COLUMN deadline DATE;
UPDATE tasks SET deadline = due_date WHERE deadline IS NULL;
-- Deploy app with support for both columns
-- Then in next migration:
-- ALTER TABLE tasks DROP COLUMN due_date;
```

---

## Testing Migrations Locally

### 1. Start Local Supabase

```bash
npm run db:start

# Or directly:
npx supabase start
```

This starts:
- PostgreSQL on `localhost:54322`
- Kong API Gateway on `localhost:8000`
- Studio UI on `http://localhost:54323`

### 2. Apply Migrations

Migrations are automatically applied when Supabase starts. To manually apply:

```bash
npx supabase db reset
```

### 3. Verify in Studio

Open Supabase Studio:
```bash
npx supabase studio
# Opens http://localhost:54323
```

Check:
- Table created correctly
- Columns have correct types
- Indexes exist
- RLS policies active
- Triggers working

### 4. Test with SQL

```bash
# Open PostgreSQL shell
npx supabase db shell

# Or connect with psql
psql postgresql://postgres:postgres@localhost:54322/postgres
```

Run test queries:

```sql
-- Test insert
INSERT INTO harvest_deliveries (
  organization_id, harvest_id, customer_name,
  delivery_date, quantity, unit_price, total_amount
) VALUES (
  '...', '...', 'Test Customer',
  CURRENT_DATE, 100.0, 5.0, 500.0
);

-- Test RLS (should fail if not in org)
SELECT * FROM harvest_deliveries;

-- Test triggers
UPDATE harvest_deliveries SET quantity = 150 WHERE id = '...';
SELECT updated_at FROM harvest_deliveries WHERE id = '...';
```

---

## Pushing to Remote

### Prerequisites

1. **Link project** (one-time):

```bash
npx supabase link --project-ref your-project-ref

# Find project ref in Supabase dashboard URL:
# https://supabase.com/dashboard/project/YOUR-PROJECT-REF
```

2. **Verify connection**:

```bash
npx supabase db remote list
```

### Push Workflow

#### Step 1: Review Changes

```bash
# Compare local vs remote
npm run db:diff

# Or:
npx supabase db diff --linked
```

This shows what will change when you push.

#### Step 2: Backup Remote (Critical!)

```bash
# Backup current schema
npm run schema:backup

# Or manually:
npx supabase db dump --data-only > backup_$(date +%Y%m%d).sql
```

#### Step 3: Push Migrations

```bash
# Push all pending migrations
npm run db:push

# Or:
npx supabase db push --linked
```

**What happens:**
1. Supabase CLI reads local migrations
2. Compares with `supabase_migrations` table on remote
3. Applies any new migrations in order
4. Updates migration history

#### Step 4: Verify Push

```bash
# Check migration status
npx supabase migration list --linked

# Should show all migrations as applied
```

---

## Type Generation

After schema changes, regenerate TypeScript types:

```bash
# Generate from remote database
npm run db:generate-types-remote

# Or from local:
npm run db:generate-types

# Output: src/types/database.types.ts
```

**Verify types:**

```bash
# TypeScript type check
npm run type-check
```

---

## Migration Best Practices

### 1. Atomic Migrations

Each migration should be a single logical unit:

✅ **GOOD:**
```
20251030120000_add_harvest_deliveries_table.sql     # One feature
20251030120100_add_harvest_indices.sql              # Related indexes
```

❌ **BAD:**
```
20251030120000_add_everything.sql  # Multiple unrelated changes
```

### 2. Forward-Only Migrations

Don't modify existing migrations. Instead, create new ones:

```sql
-- DON'T edit: 20251029000000_create_invoices.sql

-- DO create new:
-- 20251030000000_add_invoice_payment_terms.sql
ALTER TABLE invoices ADD COLUMN payment_terms VARCHAR(50);
```

### 3. Data Migrations

For data changes, use transactions:

```sql
BEGIN;

-- Add new column
ALTER TABLE workers ADD COLUMN employment_type VARCHAR(50);

-- Migrate existing data
UPDATE workers
SET employment_type = 'permanent'
WHERE worker_type = 'fixed_salary';

UPDATE workers
SET employment_type = 'temporary'
WHERE worker_type = 'daily_worker';

-- Make column required
ALTER TABLE workers ALTER COLUMN employment_type SET NOT NULL;

COMMIT;
```

### 4. Breaking Changes

For breaking changes (column removal, rename), use two-phase migration:

**Phase 1: Add new, support both**
```sql
-- 20251030000000_add_new_status_column.sql
ALTER TABLE tasks ADD COLUMN task_status VARCHAR(50);
UPDATE tasks SET task_status = status;
```

Deploy app with support for both columns.

**Phase 2: Remove old**
```sql
-- 20251031000000_remove_old_status_column.sql
ALTER TABLE tasks DROP COLUMN status;
```

### 5. Testing Checklist

Before pushing:

- [ ] Migration runs successfully locally
- [ ] RLS policies tested with different users
- [ ] Indexes created and query performance verified
- [ ] Triggers execute correctly
- [ ] Data integrity maintained
- [ ] TypeScript types generated without errors
- [ ] App builds and runs with new schema

---

## Common Migration Patterns

### Adding a New Table

```sql
-- 1. Create table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_email ON customers(email);

-- 3. RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access_customers" ON customers
FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

-- 4. Trigger
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Adding a Column

```sql
-- Add column with default
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'net_30';

-- Make it required after backfill
ALTER TABLE invoices
ALTER COLUMN payment_terms SET NOT NULL;
```

### Adding a Foreign Key

```sql
-- Add column first
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Then add foreign key
ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_customer
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_tasks_customer ON tasks(customer_id);
```

### Modifying Column Type

```sql
-- Safe: Expanding size
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(100);

-- Risky: Narrowing or changing type
-- 1. Add new column
ALTER TABLE products ADD COLUMN price_new DECIMAL(10, 2);

-- 2. Migrate data
UPDATE products SET price_new = price::DECIMAL(10, 2);

-- 3. Drop old, rename new
ALTER TABLE products DROP COLUMN price;
ALTER TABLE products RENAME COLUMN price_new TO price;
```

### Adding Computed Columns

```sql
-- Add generated column
ALTER TABLE invoice_items
ADD COLUMN amount DECIMAL(15, 2)
GENERATED ALWAYS AS (quantity * unit_price) STORED;

-- Or use trigger for more complex logic
CREATE OR REPLACE FUNCTION calculate_invoice_item_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.amount := NEW.quantity * NEW.unit_price * (1 + NEW.tax_rate / 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_invoice_item_amount
BEFORE INSERT OR UPDATE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION calculate_invoice_item_amount();
```

---

## Rollback Strategy

Supabase doesn't support automatic rollback. For critical migrations:

### 1. Backup Before Push

```bash
# Full database dump
npx supabase db dump --data-only > pre_migration_backup.sql
```

### 2. Create Rollback Migration

For every migration, prepare a rollback:

**Forward: 20251030000000_add_deliveries.sql**
```sql
CREATE TABLE harvest_deliveries (...);
```

**Rollback: 20251030000001_rollback_deliveries.sql** (don't push unless needed)
```sql
DROP TABLE IF EXISTS harvest_deliveries;
```

### 3. Manual Rollback Steps

If migration fails:

```bash
# 1. Connect to remote database
npx supabase db shell --linked

# 2. Manually revert changes
DROP TABLE harvest_deliveries;

# 3. Remove migration record
DELETE FROM supabase_migrations
WHERE version = '20251030000000';
```

---

## Advanced Patterns

### Conditional Migrations

```sql
-- Only add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE tasks ADD COLUMN priority VARCHAR(50) DEFAULT 'medium';
  END IF;
END $$;
```

### Batch Updates

```sql
-- Update in batches to avoid locks
DO $$
DECLARE
  batch_size INT := 1000;
  updated INT;
BEGIN
  LOOP
    UPDATE tasks SET status = 'completed'
    WHERE id IN (
      SELECT id FROM tasks
      WHERE end_date < CURRENT_DATE AND status = 'in_progress'
      LIMIT batch_size
    );

    GET DIAGNOSTICS updated = ROW_COUNT;
    EXIT WHEN updated = 0;

    -- Commit batch
    COMMIT;
  END LOOP;
END $$;
```

### Concurrent Index Creation

```sql
-- Create index without blocking writes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status
  ON tasks(status);
```

---

## Troubleshooting

### Migration Fails to Apply

**Error: "relation already exists"**
```sql
-- Use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS my_table (...);
```

**Error: "column already exists"**
```sql
-- Check before adding
DO $$
BEGIN
  ALTER TABLE my_table ADD COLUMN IF NOT EXISTS my_column TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
```

### Type Generation Fails

```bash
# Clear cache and retry
rm -rf .supabase/
npm run db:generate-types-remote
```

### RLS Policy Blocks Migration

```sql
-- Temporarily disable RLS for migration
ALTER TABLE my_table DISABLE ROW LEVEL SECURITY;

-- Run migrations

-- Re-enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
```

### Large Data Migration Timeout

```sql
-- Use COPY for bulk inserts
\COPY my_table FROM '/path/to/data.csv' WITH CSV HEADER;

-- Or batch updates with progress logging
DO $$
DECLARE
  total_rows INT;
  processed INT := 0;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM my_table WHERE needs_update;

  WHILE processed < total_rows LOOP
    UPDATE my_table SET ... WHERE ... LIMIT 1000;
    processed := processed + 1000;
    RAISE NOTICE 'Processed % of % rows', processed, total_rows;
    COMMIT;
  END LOOP;
END $$;
```

---

## NPM Scripts Reference

```json
{
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:push": "supabase db push --linked",
    "db:pull": "supabase db pull --linked",
    "db:diff": "supabase db diff --linked",
    "db:dump": "supabase db dump --linked -f schema.sql",
    "db:generate-types": "supabase gen types typescript --local > src/types/database.types.ts",
    "db:generate-types-remote": "supabase gen types typescript --linked > src/types/database.types.ts",
    "schema:pull": "./scripts/schema.sh pull",
    "schema:push": "./scripts/schema.sh push",
    "schema:diff": "./scripts/schema.sh diff",
    "schema:types": "./scripts/schema.sh types",
    "schema:backup": "./scripts/schema.sh backup"
  }
}
```

---

## Migration Checklist

### Before Creating Migration

- [ ] Schema design reviewed and approved
- [ ] Breaking changes identified and planned
- [ ] Rollback strategy prepared
- [ ] Testing plan documented

### During Migration Creation

- [ ] Descriptive migration name
- [ ] Idempotent SQL (IF EXISTS, IF NOT EXISTS)
- [ ] Indexes created for foreign keys
- [ ] RLS policies added
- [ ] Triggers created where needed
- [ ] Comments added for documentation

### Before Pushing

- [ ] Tested locally with `db:reset`
- [ ] RLS policies tested with different users
- [ ] TypeScript types generated successfully
- [ ] App builds and runs
- [ ] Remote backup created
- [ ] Team notified of deployment

### After Pushing

- [ ] Migration applied successfully
- [ ] Types regenerated and committed
- [ ] App deployed with schema changes
- [ ] Verified in production
- [ ] Documentation updated

---

## Next Steps

- [RLS Policies](./rls-policies.md) - Row Level Security implementation
- [Functions](./functions.md) - PostgreSQL functions and RPCs
- [Triggers](./triggers.md) - Database triggers and automation
- [Type Generation](./type-generation.md) - TypeScript type generation workflow
