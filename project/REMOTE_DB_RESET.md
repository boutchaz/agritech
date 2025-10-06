# Remote Database Reset Guide

This guide explains how to clean and reset your remote Supabase database to start fresh.

## ⚠️ WARNING: Destructive Operation

Cleaning the remote database will:
- ❌ Delete ALL tables and data
- ❌ Remove ALL functions and triggers
- ❌ Delete ALL user accounts
- ❌ Remove ALL types and enums

**This cannot be undone!** Make sure you have a backup if needed.

## 🎯 Methods to Clean Remote Database

### Method 1: Automated Script (Recommended)

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Run the cleanup script
npm run db:clean-remote
```

This script will:
1. Prompt for confirmation (you must type "yes" and "DELETE EVERYTHING")
2. Drop all tables, functions, types, and auth users
3. Apply fresh schema from `supabase/schema/public.sql`
4. Optionally apply seed data

### Method 2: Manual via Dashboard

1. Go to your dashboard: http://agritech-supabase-652186-5-75-154-125.traefik.me/project/default/sql
2. Run this SQL:

```sql
-- Disable all triggers temporarily
SET session_replication_role = replica;

-- Drop all tables
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Drop all functions
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes
            FROM pg_proc INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
            WHERE pg_namespace.nspname = 'public') LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
  END LOOP;
END $$;

-- Drop all types
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
  END LOOP;
END $$;

-- Clear auth users
TRUNCATE auth.users CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Vacuum
VACUUM FULL;
```

3. Then apply your schema manually by copying contents of `supabase/schema/public.sql`

### Method 3: Using psql (Direct Connection)

```bash
# Set environment variables (or they're loaded from .env)
export POSTGRES_HOST="agritech-supabase-652186-5-75-154-125.traefik.me"
export POSTGRES_PASSWORD="your-password"
export POSTGRES_USER="postgres"

# Connect and run cleanup
psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/postgres" \
  -f scripts/clean-remote-db.sh
```

## 📋 Complete Reset Workflow

Here's the recommended step-by-step process:

```bash
# 1. Backup current schema (optional but recommended)
npm run schema:pull
npm run schema:backup

# 2. Clean remote database
npm run db:clean-remote

# 3. Verify it's clean
# Go to dashboard and check Table Editor - should be empty

# 4. Apply fresh schema
npm run schema:push

# 5. Apply migrations if you have any
npm run db:migrate

# 6. Seed data (optional)
npm run db:deploy-remote

# 7. Generate TypeScript types
npm run db:generate-types-remote

# 8. Test your application
npm run dev
```

## 🔐 Environment Variables

The cleanup script needs these credentials (from `.env` or `.env.local`):

```env
POSTGRES_HOST=agritech-supabase-652186-5-75-154-125.traefik.me
POSTGRES_PASSWORD=chn6ldl4lnfgsafgmihqvxebojnyz6ut
POSTGRES_USER=postgres
POSTGRES_DB=postgres
POSTGRES_PORT=5432
```

If not in `.env`, the script will prompt you for the password.

## 🛡️ Safety Measures

The cleanup script includes multiple safety features:

1. **Double Confirmation**: You must type "yes" and then "DELETE EVERYTHING"
2. **Connection Test**: Verifies connection before proceeding
3. **Verbose Output**: Shows what's being dropped
4. **Schema Application**: Automatically applies fresh schema after cleanup
5. **Optional Seed**: Asks before applying seed data

## 🔄 Alternative: Start with Migrations

If you prefer using migrations instead of a complete reset:

```bash
# 1. Pull current schema
npm run schema:pull

# 2. Create a migration for your changes
# Edit files in supabase/migrations/

# 3. Push migrations only
npm run db:migrate

# 4. Generate types
npm run db:generate-types-remote
```

## 📊 Verify Clean Database

After cleaning, verify your database is empty:

```sql
-- Check for tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check for functions
SELECT proname FROM pg_proc 
  INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
  WHERE pg_namespace.nspname = 'public';

-- Check for types
SELECT typname FROM pg_type 
  WHERE typnamespace = 'public'::regnamespace AND typtype = 'e';

-- Check auth users
SELECT count(*) FROM auth.users;
```

All queries should return no results (or count = 0 for users).

## 🚨 Troubleshooting

### "Failed to connect to database"
- Check your credentials in `.env`
- Verify the remote database is running
- Test connection: `psql "postgresql://postgres:PASSWORD@HOST:5432/postgres" -c "SELECT 1;"`

### "Permission denied"
- Make sure you're using the `postgres` superuser
- Check if your password is correct
- Verify service role key in `.env`

### "Schema file not found"
- Ensure `supabase/schema/public.sql` exists
- Or pull from remote first: `npm run schema:pull`

### Script won't execute
- Make sure it's executable: `chmod +x scripts/clean-remote-db.sh`
- Run directly: `./scripts/clean-remote-db.sh`

## 📚 Related Documentation

- [Remote Supabase Setup](./REMOTE_SUPABASE.md)
- [Database Management](./DATABASE.md)
- [Schema Management](./supabase/schema/README.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## 🎯 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run db:clean-remote` | Clean and reset remote database |
| `npm run schema:backup` | Backup current schema |
| `npm run schema:pull` | Pull remote schema to local |
| `npm run schema:push` | Push local schema to remote |
| `npm run db:generate-types-remote` | Generate TypeScript types |

---

**Remember**: Always double-check before cleaning production databases! This operation is irreversible.

