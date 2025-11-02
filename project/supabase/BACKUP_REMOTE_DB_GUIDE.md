# Backup Remote Database & Consolidate Migrations

## Overview
Backing up your remote Supabase database schema is the safest way to create a consolidated initial schema. This ensures you capture the **actual current state** of your production/staging database.

## Quick Start

### Step 1: Link to Remote Project

```bash
# Link to your remote Supabase project
supabase link --project-ref your-project-ref

# Or if already linked, check current project
supabase projects list
```

### Step 2: Backup Remote Schema

```bash
# Full schema backup (structure + functions + policies)
supabase db dump --linked \
    --schema public \
    --schema auth \
    --data-only=false \
    > supabase/schema_backups/remote_schema_$(date +%Y%m%d_%H%M%S).sql

# Or use the automated script
chmod +x supabase/backup_and_consolidate.sh
./supabase/backup_and_consolidate.sh
```

### Step 3: Create Consolidated Schema

```bash
# The backup script will help you create a consolidated schema
# Or manually:
cp supabase/schema_backups/remote_schema_*.sql supabase/migrations/00000000000000_consolidated_schema.sql

# Then clean it up (remove comments, format)
```

## Detailed Commands

### Backup Options

#### 1. Schema Only (Recommended)
```bash
# Structure only - no data
supabase db dump --linked \
    --schema public \
    --data-only=false \
    > consolidated_schema.sql
```

#### 2. Schema + Data (for testing)
```bash
# Structure + data (useful for local testing)
supabase db dump --linked \
    --schema public \
    --schema auth \
    --data-only=true \
    > schema_with_data.sql
```

#### 3. Specific Tables Only
```bash
# Only specific tables
supabase db dump --linked \
    --table public.organization_users \
    --table public.farms \
    --data-only=false \
    > specific_tables.sql
```

#### 4. Exclude Tables
```bash
# All except certain tables
supabase db dump --linked \
    --schema public \
    --exclude-table public.audit_logs \
    --data-only=false \
    > schema_minus_audit.sql
```

## Workflow for Consolidation

### Option A: Replace Initial Schema (Clean Start)

```bash
# 1. Backup remote
supabase db dump --linked --schema public --data-only=false > remote_schema.sql

# 2. Clean it up
# - Remove unnecessary comments
# - Format consistently
# - Organize into logical sections
# - Add documentation

# 3. Replace initial schema
mv remote_schema.sql supabase/migrations/00000000000000_consolidated_schema.sql

# 4. Archive old migrations
mkdir -p supabase/migrations_archive
mv supabase/migrations/202*.sql supabase/migrations_archive/

# 5. Test locally
supabase db reset
```

### Option B: Create New Consolidated Migration

```bash
# 1. Backup remote
supabase db dump --linked --schema public --data-only=false > current_schema.sql

# 2. Create a new migration that represents current state
# This allows you to keep history but start fresh going forward

# 3. From now on, use the consolidated schema as reference
```

## Cleaning Up the Dump

The `supabase db dump` output needs cleanup:

### Remove Noise
```bash
# Remove comment lines (optional - keep important comments)
sed -i '' '/^--/d' consolidated_schema.sql

# Remove empty lines
sed -i '' '/^$/N;/^\n$/d' consolidated_schema.sql

# Format consistently (use pg_format if available)
pg_format consolidated_schema.sql > formatted_schema.sql
```

### Organize Sections
```sql
-- =====================================================
-- CONSOLIDATED SCHEMA
-- =====================================================
-- This schema was generated from remote database backup
-- Date: 2025-02-02
-- Project: your-project-ref
-- =====================================================

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ... etc

-- =====================================================
-- 2. TABLES
-- =====================================================
-- 2.1 Core Tables
CREATE TABLE public.organizations (...);
CREATE TABLE public.organization_users (...);

-- 2.2 Feature Tables
-- Stock Management
CREATE TABLE public.items (...);
-- etc

-- =====================================================
-- 3. FUNCTIONS
-- =====================================================
-- Helper functions
-- Trigger functions
-- RPC functions

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================
-- Policies for each table

-- =====================================================
-- 5. TRIGGERS
-- =====================================================
-- All triggers
```

## Verification Steps

### 1. Test on Fresh Database
```bash
# Reset local database
supabase db reset

# Verify schema matches
supabase db diff  # Should show minimal/no differences
```

### 2. Check Critical Functions
```sql
-- Test functions that were problematic
SELECT public.is_active_org_member(auth.uid(), 'org-id'::uuid);
SELECT public.user_has_role(auth.uid(), 'org-id'::uuid, ARRAY['admin']);
```

### 3. Verify RLS Policies
```sql
-- Check all policies exist
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 4. Test Critical Operations
- Create/delete farms
- Create organization users
- Stock operations
- Accounting operations

## Best Practices

1. **Always Backup Before Consolidation**
   ```bash
   # Create timestamped backup
   supabase db dump --linked > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test Locally First**
   ```bash
   supabase db reset  # Start fresh
   # Apply consolidated schema
   # Test all operations
   ```

3. **Keep Original Migrations**
   ```bash
   # Archive, don't delete
   mkdir -p supabase/migrations_archive
   mv supabase/migrations/202*.sql supabase/migrations_archive/
   ```

4. **Document Changes**
   ```sql
   -- Add header comments explaining what was consolidated
   -- List original migrations that were merged
   -- Note any manual adjustments made
   ```

5. **Version Control**
   ```bash
   # Commit consolidated schema
   git add supabase/migrations/00000000000000_consolidated_schema.sql
   git commit -m "feat: consolidate migrations from remote schema backup"
   ```

## Troubleshooting

### Issue: "Not linked to a project"
```bash
# Link to project first
supabase link --project-ref your-project-ref

# Or use environment variable
export SUPABASE_PROJECT_REF=your-project-ref
supabase db dump --linked
```

### Issue: "Permission denied"
```bash
# Make sure you have access to the project
# Check with: supabase projects list
```

### Issue: "Schema too large"
```bash
# Dump specific schemas only
supabase db dump --linked --schema public --data-only=false

# Or split by feature
supabase db dump --linked --table public.farms --table public.parcels
```

## Next Steps After Backup

1. **Review the consolidated schema**
2. **Organize into logical sections** (see example above)
3. **Add comprehensive comments**
4. **Test on fresh database**
5. **Update documentation**
6. **Create feature-based migrations going forward**

