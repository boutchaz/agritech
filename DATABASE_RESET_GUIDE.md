# Database Reset Guide - Fix "relation public.roles does not exist" Error

## Problem
When running migrations, you get the error:
```
ERROR: 42P01: relation "public.roles" does not exist
```

## Root Cause
The database has a partial state from previous migrations. Some tables exist while others don't, causing dependency issues.

## Solution: Proper Database Reset

### Option 1: Using Supabase CLI (Recommended)

```bash
# 1. Stop Supabase (if running)
npx supabase stop

# 2. Start with clean database
npx supabase start

# 3. Reset database with all migrations
npx supabase db reset

# 4. Verify it worked
npx supabase db diff
```

### Option 2: Manual Reset via Web Interface

If you must use the Supabase web interface:

1. **Drop all existing objects in the correct order:**

```sql
-- Drop all policies first
DROP POLICY IF EXISTS "Organization admins can insert modules" ON organization_modules;
DROP POLICY IF EXISTS "Organization admins can update modules" ON organization_modules;
DROP POLICY IF EXISTS "Users can view their organization's modules" ON organization_modules;
DROP POLICY IF EXISTS "Allow authenticated users to view modules" ON modules;
-- Add any other policies you have

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS organization_modules CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS organization_users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
-- Add other tables as needed

-- Drop all functions
DROP FUNCTION IF EXISTS create_default_organization_modules() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- Add other functions as needed
```

2. **Then run migrations in order:**
   - First: `00000000000000_schema.sql`
   - Then: All other migrations in timestamp order

### Option 3: Create Fresh Database

If the above doesn't work:

```bash
# Stop Supabase
npx supabase stop

# Remove the database volume
docker volume rm supabase_db_<project_name>

# Start fresh
npx supabase start
npx supabase db reset
```

## Migration Order

Migrations must run in this exact order:

1. `00000000000000_schema.sql` - Base schema (includes roles table)
2. `20251122000002_fix_parcel_rls_policies.sql`
3. `20251127000001_create_modules.sql` (requires roles table)
4. `20251130000000_fix_journal_entry_totals.sql`
5. `20251130000001_add_check_and_reserve_stock_function.sql`
6. `20251130000002_alter_account_mappings.sql`
7. `20251201000001_task_cost_account_mappings.sql`
8. `20251201000002_harvest_sales_account_mappings.sql`

## Verification

After reset, verify tables exist:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

You should see `roles`, `permissions`, `role_permissions`, etc.

## Important Notes

- **DO NOT** run individual migration files out of order
- **DO NOT** run only the schema file if other migrations have already been applied
- **ALWAYS** use `npx supabase db reset` for a clean slate
- The schema file is **idempotent** (safe to run multiple times) but context matters

## Files Involved

- Base schema: `project/supabase/migrations/00000000000000_schema.sql`
- Modules migration: `project/supabase/migrations/20251127000001_create_modules.sql` (references roles in RLS policies)

## If You're Still Getting Errors

1. Check which migrations have been applied:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
   ```

2. Check if roles table exists:
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'roles'
   );
   ```

3. If the table exists but queries fail, check the schema:
   ```sql
   \d+ roles
   ```
