# Database Migration Guide

This guide covers the complete workflow for creating and managing database migrations in the AgriTech Platform using Supabase.

## Overview

The AgriTech Platform uses **Supabase** (PostgreSQL) with migrations managed via the Supabase CLI. All schema changes are version-controlled through SQL migration files.

**Migration Location:** `/project/supabase/migrations/`

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Local Supabase instance running: `npm run db:start`
- Project linked to remote: `npx supabase link --project-ref YOUR_REF`

## Step-by-Step Guide

### Step 1: Create a Migration File

Migration files follow a timestamp naming convention:

**Format:** `YYYYMMDDHHMMSS_description.sql`

**Example:** `20251030120000_add_reports_table.sql`

Create the file manually or use Supabase CLI:

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Create new migration file
npx supabase migration new add_reports_table
```

This creates: `/project/supabase/migrations/20251030120000_add_reports_table.sql`

### Step 2: Write the Migration SQL

**Example: Creating a Reports Table**

**File:** `/project/supabase/migrations/20251030120000_add_reports_table.sql`

```sql
-- =====================================================
-- Add Reports Table
-- =====================================================
-- This migration creates a table for storing generated reports
-- with proper multi-tenant isolation and RLS policies
-- =====================================================

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,

  -- Report metadata
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
    'financial', 'crop_analytics', 'satellite', 'task_summary', 'harvest_report'
  )),

  -- Report data
  parameters JSONB DEFAULT '{}'::jsonb,
  data JSONB DEFAULT '{}'::jsonb,

  -- File reference if exported
  file_url TEXT,
  file_format VARCHAR(10) CHECK (file_format IN ('pdf', 'xlsx', 'csv')),

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'generating', 'completed', 'failed'
  )),
  error_message TEXT,

  -- Timestamps
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_org ON reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_farm ON reports(farm_id) WHERE farm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access reports from their organizations
CREATE POLICY "Users can view reports from their organizations"
  ON reports FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can create reports in their organizations
CREATE POLICY "Users can create reports in their organizations"
  ON reports FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own reports
CREATE POLICY "Users can update reports in their organizations"
  ON reports FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Only admins can delete reports
CREATE POLICY "Admins can delete reports"
  ON reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users
      WHERE user_id = auth.uid()
        AND organization_id = reports.organization_id
        AND role IN ('organization_admin', 'system_admin')
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Add comment for documentation
COMMENT ON TABLE reports IS 'Stores generated reports with multi-tenant isolation';
COMMENT ON COLUMN reports.parameters IS 'JSON object containing report generation parameters (date ranges, filters, etc.)';
COMMENT ON COLUMN reports.data IS 'JSON object containing the actual report data';
```

### Step 3: Test Migration Locally

Before applying to production, always test locally:

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Reset local database (applies all migrations)
npm run db:reset

# Or apply migrations incrementally
npx supabase db reset
```

**Verify the migration:**

```bash
# Check if table was created
npx supabase db diff --linked

# Or connect to local Supabase and query
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "\d reports"
```

### Step 4: Generate TypeScript Types

After creating tables, generate TypeScript types:

```bash
# Generate from local database
npm run db:generate-types

# Or generate from remote (after pushing)
npm run db:generate-types-remote
```

This updates `/project/src/types/database.types.ts`:

```typescript
export interface Database {
  public: {
    Tables: {
      reports: {
        Row: {
          id: string;
          organization_id: string;
          farm_id: string | null;
          name: string;
          report_type: 'financial' | 'crop_analytics' | 'satellite' | 'task_summary' | 'harvest_report';
          parameters: Json;
          data: Json;
          file_url: string | null;
          file_format: 'pdf' | 'xlsx' | 'csv' | null;
          status: 'pending' | 'generating' | 'completed' | 'failed';
          error_message: string | null;
          generated_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          farm_id?: string | null;
          name: string;
          report_type: 'financial' | 'crop_analytics' | 'satellite' | 'task_summary' | 'harvest_report';
          parameters?: Json;
          data?: Json;
          file_url?: string | null;
          file_format?: 'pdf' | 'xlsx' | 'csv' | null;
          status?: 'pending' | 'generating' | 'completed' | 'failed';
          error_message?: string | null;
          generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          farm_id?: string | null;
          name?: string;
          report_type?: 'financial' | 'crop_analytics' | 'satellite' | 'task_summary' | 'harvest_report';
          parameters?: Json;
          data?: Json;
          file_url?: string | null;
          file_format?: 'pdf' | 'xlsx' | 'csv' | null;
          status?: 'pending' | 'generating' | 'completed' | 'failed';
          error_message?: string | null;
          generated_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      // ... other tables
    };
  };
}
```

### Step 5: Push to Remote (Production)

Once tested locally, push to remote Supabase:

```bash
# Review what will change
npm run db:diff

# Push migrations to remote
npm run db:push

# Verify types match remote
npm run db:generate-types-remote
```

**Alternative: Use schema scripts for safer deployment**

```bash
# Backup current schema
npm run schema:backup

# Review differences
npm run schema:diff

# Push with validation
npm run schema:push

# Generate types with validation
npm run schema:types
```

## Real-World Examples

### Example 1: Accounting Module Migration

This is a complex migration from the actual codebase:

**File:** `/project/supabase/migrations/20251029220048_create_accounting_module_safe.sql`

```sql
-- =====================================================
-- Accounting Module - Phase 1: General Ledger, Invoices, Payments
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CURRENCIES
-- =====================================================

CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  decimal_places INT DEFAULT 2 CHECK (decimal_places >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed common currencies
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
('MAD', 'Moroccan Dirham', 'MAD', 2),
('USD', 'US Dollar', '$', 2),
('EUR', 'Euro', '€', 2)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. CHART OF ACCOUNTS
-- =====================================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,

  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,

  account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
    'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
  )),
  account_subtype VARCHAR(100),

  is_group BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  currency_code VARCHAR(3) REFERENCES currencies(code) DEFAULT 'MAD',
  allow_cost_center BOOLEAN DEFAULT TRUE,

  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id, code),
  CHECK (
    (is_group = TRUE AND parent_id IS NULL) OR
    (is_group = FALSE)
  )
);

CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accounts from their organizations"
  ON accounts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );
```

### Example 2: Adding Columns to Existing Table

**File:** `/project/supabase/migrations/20251023000006_make_tasks_farm_id_nullable.sql`

```sql
-- Make farm_id nullable in tasks table
ALTER TABLE tasks
  ALTER COLUMN farm_id DROP NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_farm_id
  ON tasks(farm_id)
  WHERE farm_id IS NOT NULL;

-- Update RLS policies to handle NULL farm_id
DROP POLICY IF EXISTS "Users can view tasks from their organizations" ON tasks;

CREATE POLICY "Users can view tasks from their organizations"
  ON tasks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );
```

## Migration Patterns

### 1. Safe Column Addition

```sql
-- Add column with default value
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS soil_ph DECIMAL(3,1);

-- Add NOT NULL constraint later after data migration
-- ALTER TABLE parcels ALTER COLUMN soil_ph SET NOT NULL;
```

### 2. Renaming Columns/Tables

```sql
-- Rename column
ALTER TABLE tasks
  RENAME COLUMN worker_id TO assigned_to;

-- Rename table
ALTER TABLE old_table_name
  RENAME TO new_table_name;

-- Update indexes and constraints
ALTER INDEX idx_old_name RENAME TO idx_new_name;
```

### 3. Data Migration

```sql
-- Migrate data before schema change
UPDATE tasks
SET status = 'pending'
WHERE status IS NULL;

-- Then add constraint
ALTER TABLE tasks
  ALTER COLUMN status SET NOT NULL;
```

### 4. Creating Functions

```sql
-- Create a custom function
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  role VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    ou.role
  FROM organizations o
  INNER JOIN organization_users ou ON o.id = ou.organization_id
  WHERE ou.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5. Adding Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Row Level Security (RLS) Best Practices

### Multi-Tenant Isolation

Every table should have RLS policies for multi-tenant isolation:

```sql
-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "Users can view records from their organizations"
  ON your_table FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- INSERT policy
CREATE POLICY "Users can insert records in their organizations"
  ON your_table FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE policy
CREATE POLICY "Users can update records in their organizations"
  ON your_table FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- DELETE policy (admin only)
CREATE POLICY "Admins can delete records"
  ON your_table FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users
      WHERE user_id = auth.uid()
        AND organization_id = your_table.organization_id
        AND role IN ('organization_admin', 'system_admin')
    )
  );
```

## Rollback Strategy

### Creating Rollback Migrations

For every migration, consider creating a rollback:

**Forward migration:** `20251030120000_add_reports_table.sql`
**Rollback:** `20251030120001_rollback_reports_table.sql`

```sql
-- Rollback migration
DROP TRIGGER IF EXISTS reports_updated_at ON reports;
DROP FUNCTION IF EXISTS update_reports_updated_at();
DROP POLICY IF EXISTS "Users can view reports from their organizations" ON reports;
DROP POLICY IF EXISTS "Users can create reports in their organizations" ON reports;
DROP POLICY IF EXISTS "Users can update reports in their organizations" ON reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON reports;
DROP TABLE IF EXISTS reports;
```

### Manual Rollback

```bash
# Manually revert last migration
npx supabase db reset --version <previous_version>
```

## Troubleshooting

### Issue 1: Migration Fails on Remote

**Error:** "relation already exists"

**Solution:** Use `IF NOT EXISTS` and `IF EXISTS`:

```sql
CREATE TABLE IF NOT EXISTS reports (...);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS new_column TEXT;
DROP TABLE IF EXISTS old_table;
```

### Issue 2: RLS Policy Blocks Queries

**Error:** "permission denied for table"

**Solution:** Check RLS policies allow the operation:

```sql
-- Debug RLS
SELECT * FROM pg_policies WHERE tablename = 'reports';

-- Temporarily disable RLS for debugging (NEVER in production)
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
```

### Issue 3: Type Generation Out of Sync

**Solution:**

```bash
# Pull latest schema
npm run db:pull

# Regenerate types
npm run db:generate-types-remote

# Restart TypeScript server in VSCode
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### Issue 4: Foreign Key Constraint Violation

**Error:** "violates foreign key constraint"

**Solution:** Ensure referenced data exists or use `ON DELETE CASCADE`:

```sql
-- Option 1: Cascading delete
ALTER TABLE child_table
  ADD CONSTRAINT fk_parent
  FOREIGN KEY (parent_id)
  REFERENCES parent_table(id)
  ON DELETE CASCADE;

-- Option 2: Set NULL on delete
ALTER TABLE child_table
  ADD CONSTRAINT fk_parent
  FOREIGN KEY (parent_id)
  REFERENCES parent_table(id)
  ON DELETE SET NULL;
```

## Checklist

- [ ] Migration file created with timestamp naming
- [ ] SQL includes `IF NOT EXISTS` / `IF EXISTS` for idempotency
- [ ] Indexes added for foreign keys and frequently queried columns
- [ ] RLS enabled and policies created for multi-tenant isolation
- [ ] Triggers created for `updated_at` (if applicable)
- [ ] Comments added for documentation
- [ ] Tested locally with `npm run db:reset`
- [ ] Types generated with `npm run db:generate-types`
- [ ] Schema diff reviewed with `npm run db:diff`
- [ ] Pushed to remote with `npm run db:push`
- [ ] Verified in Supabase dashboard
- [ ] TypeScript types regenerated from remote

## Next Steps

- [Adding a Feature](./adding-feature.md) - Build the full feature stack
- [Creating Components](./creating-component.md) - Create UI for your new tables
- [Testing Guide](./testing.md) - Test database interactions

## Reference

- **Migrations Directory:** `/project/supabase/migrations/`
- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Generated Types:** `/project/src/types/database.types.ts`
- **Schema Scripts:** `/project/scripts/schema.sh`
