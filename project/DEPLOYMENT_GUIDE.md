# 🚀 Deployment Guide - AgriTech Platform

Complete guide for deploying the AgriTech platform to fresh Supabase instances.

## 📋 Table of Contents

1. [One-Click Deployment](#one-click-deployment)
2. [Manual Deployment](#manual-deployment)
3. [Post-Deployment Setup](#post-deployment-setup)
4. [Troubleshooting](#troubleshooting)

---

## 🎯 One-Click Deployment

### Quick Start

**Deploy to Local Supabase:**
```bash
./scripts/deploy-fresh.sh local
```

**Deploy to Remote Supabase:**
```bash
./scripts/deploy-fresh.sh remote
```

### What Gets Deployed

The deployment script automatically handles:

- ✅ **Database Schema**: All tables, columns, indexes, constraints
- ✅ **RLS Policies**: Row-level security policies for all tables
- ✅ **Database Functions**: PostgreSQL functions and triggers
- ✅ **Edge Functions**: Supabase Edge Functions (Deno)
- ✅ **Seed Data**: Essential roles and reference data
- ✅ **Extensions**: pg_net, pgcrypto, pgjwt
- ✅ **Webhooks**: Database webhooks for user creation

### Prerequisites

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **For Local Deployment:**
   - Docker Desktop installed and running
   - No additional setup needed

3. **For Remote Deployment:**
   - Link to your Supabase project:
     ```bash
     supabase link --project-ref YOUR_PROJECT_REF
     ```

---

## 🔧 Manual Deployment

If you need more control or troubleshooting, follow these manual steps:

### Step 1: Start Supabase (Local Only)

```bash
cd project
supabase start
```

Wait for all services to start. You should see:
- API URL: http://127.0.0.1:54321
- Studio URL: http://127.0.0.1:54323
- DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres

### Step 2: Apply Database Schema

**Option A: From Remote Dump (Recommended for local)**
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < supabase/remote_schema.sql
```

**Option B: From Migrations**
```bash
supabase db reset --local  # Resets and applies all migrations
```

### Step 3: Apply RLS Policy Fixes

```bash
# Fix organizations RLS policies
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < supabase/migrations/20251003150000_fix_organizations_rls.sql

# Fix organizations SELECT policy
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < supabase/migrations/20251003151000_fix_organizations_select_rls.sql

# Fix tree seeding function security
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < supabase/migrations/20251003152000_fix_seed_tree_function_security.sql
```

### Step 4: Seed Essential Data

**Seed Roles:**
```sql
-- In Supabase Studio SQL Editor or psql
ALTER TABLE roles DISABLE TRIGGER enforce_system_admin_roles_insert;

INSERT INTO roles (name, display_name, description, level) VALUES
  ('system_admin', 'System Administrator', 'Full access to all features', 100),
  ('organization_admin', 'Organization Administrator', 'Full access within organization', 80),
  ('farm_manager', 'Farm Manager', 'Manage specific farm operations', 60),
  ('farm_worker', 'Farm Worker', 'Basic farm operations access', 40),
  ('day_laborer', 'Day Laborer', 'Temporary worker access', 20),
  ('viewer', 'Viewer', 'Read-only access', 10)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  level = EXCLUDED.level;

ALTER TABLE roles ENABLE TRIGGER enforce_system_admin_roles_insert;
```

### Step 5: Deploy Edge Functions

**Local:**
```bash
# Functions are auto-deployed when you run supabase start
# To redeploy a function:
supabase functions serve on-user-created --env-file supabase/.env.local
```

**Remote:**
```bash
supabase functions deploy on-user-created
```

### Step 6: Configure Database Settings

**Local:**
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgjwt;

-- Configure app settings for webhooks
ALTER DATABASE postgres SET app.settings.supabase_url TO 'http://127.0.0.1:54321';
ALTER DATABASE postgres SET app.settings.service_role_key TO 'YOUR_LOCAL_SERVICE_ROLE_KEY';
```

**Remote:**
```sql
-- In Supabase Dashboard SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgjwt;

-- Configure app settings
ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://YOUR_PROJECT_REF.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key TO 'YOUR_SERVICE_ROLE_KEY';
```

---

## 🔐 Post-Deployment Setup

### 1. Verify Deployment

**Check Tables:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Check Roles:**
```sql
SELECT name, display_name, level FROM roles ORDER BY level DESC;
```

**Check RLS Policies:**
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('organizations', 'organization_users', 'user_profiles')
ORDER BY tablename, cmd;
```

**Check Functions:**
```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname LIKE '%seed%' OR proname LIKE '%user%';
```

### 2. Configure Environment Variables

**Local (.env.local):**
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Production (.env.production):**
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 3. Test User Signup Flow

1. Navigate to your app
2. Click "Sign Up"
3. Register a new user
4. Check logs:
   ```bash
   # Local
   supabase functions logs on-user-created --local

   # Remote
   supabase functions logs on-user-created
   ```

5. Verify in database:
   ```sql
   -- Check user profile was created
   SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 1;

   -- Check organization was created
   SELECT * FROM organizations ORDER BY created_at DESC LIMIT 1;

   -- Check user was added to organization
   SELECT ou.*, r.name as role_name
   FROM organization_users ou
   JOIN roles r ON ou.role_id = r.id
   ORDER BY ou.created_at DESC LIMIT 1;

   -- Check tree categories were seeded
   SELECT COUNT(*) FROM tree_categories;
   ```

---

## 🐛 Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause:** RLS policies not properly configured

**Solution:**
```bash
# Re-apply RLS policy fixes
./scripts/deploy-fresh.sh local
```

Or manually:
```sql
-- Check which policy is blocking
SET ROLE authenticated;
SET request.jwt.claims.sub TO 'test-user-id';

-- Try to insert (will show which policy blocks)
INSERT INTO organizations (name, slug, owner_id) VALUES ('Test', 'test', 'test-user-id');
```

### Issue: "organization_admin role not found"

**Cause:** Roles table not seeded

**Solution:**
```bash
# Re-run seed script
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres << 'EOF'
ALTER TABLE roles DISABLE TRIGGER enforce_system_admin_roles_insert;
INSERT INTO roles (name, display_name, description, level) VALUES
  ('organization_admin', 'Organization Administrator', 'Full access within organization', 80)
ON CONFLICT (name) DO NOTHING;
ALTER TABLE roles ENABLE TRIGGER enforce_system_admin_roles_insert;
EOF
```

### Issue: Edge Function not triggering

**Cause:** Webhook not configured or pg_net extension missing

**Solution:**
```sql
-- Check pg_net is installed
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- If not, install it
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Check webhook trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_schema = 'auth';
```

### Issue: Tree categories not created

**Cause:** Seed function running as SECURITY INVOKER instead of SECURITY DEFINER

**Solution:**
```sql
-- Check function security
SELECT proname, prosecdef FROM pg_proc
WHERE proname = 'seed_tree_data_for_new_organization';

-- Should show prosecdef = true
-- If not, re-apply migration:
ALTER FUNCTION seed_tree_data_for_new_organization() SECURITY DEFINER;
```

### Issue: Cannot connect to local database

**Cause:** Supabase not running or ports blocked

**Solution:**
```bash
# Check if running
docker ps | grep supabase

# If not running, start it
supabase start

# Check ports
nc -z 127.0.0.1 54322  # Should succeed
```

---

## 📚 Architecture Overview

### User Signup Flow

1. **User signs up** via Auth component
2. **Supabase Auth** creates user in auth.users table
3. **Database Trigger** (`on_auth_user_created_webhook`) fires
4. **Webhook calls Edge Function** (`on-user-created`)
5. **Edge Function creates:**
   - User profile in `user_profiles`
   - Organization in `organizations`
   - Organization membership in `organization_users`
6. **Database Trigger** on organizations table fires
7. **Seed function** creates default tree categories and plantation types

### Key Files

```
project/
├── supabase/
│   ├── migrations/              # Database migrations
│   │   ├── 20250925150209_remote_schema.sql
│   │   ├── 20251003150000_fix_organizations_rls.sql
│   │   ├── 20251003151000_fix_organizations_select_rls.sql
│   │   └── 20251003152000_fix_seed_tree_function_security.sql
│   ├── functions/               # Edge Functions
│   │   └── on-user-created/
│   │       └── index.ts
│   ├── seed/                    # Seed data
│   │   └── 01_roles.sql
│   └── remote_schema.sql        # Complete schema dump
├── scripts/
│   └── deploy-fresh.sh          # One-click deployment
├── src/
│   └── utils/
│       └── authSetup.ts         # Frontend user setup utility
└── DEPLOYMENT_GUIDE.md          # This file
```

---

## 🔄 Updating Existing Deployment

To apply new changes to an existing deployment:

```bash
# Create new migration
supabase migration new your_migration_name

# Edit the migration file in supabase/migrations/

# Apply it
supabase db push  # Remote
# or
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < supabase/migrations/YOUR_FILE.sql  # Local
```

---

## 📞 Support

If you encounter issues:

1. Check logs:
   ```bash
   supabase functions logs on-user-created --local
   docker logs supabase_db_project
   ```

2. Verify RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'YOUR_TABLE';
   ```

3. Test with service role (bypasses RLS):
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   const supabase = createClient(url, SERVICE_ROLE_KEY)
   ```

---

**Status**: ✅ Production Ready

**Last Updated**: 2025-10-03

**Version**: 1.0.0
