# Database Reset Quick Guide

Quick reference for resetting and reinitializing the AgriTech database.

## Quick Start

### Reset Everything (Recommended)

```bash
# Local development
./reinitialize.sh local

# Production (requires confirmation)
./reinitialize.sh production
```

This script:
1. ✅ Drops all tables, functions, views, triggers
2. ✅ Applies main schema
3. ✅ Applies additional migrations
4. ✅ Applies seed data (roles, work_units, accounts)

### Manual Reset (Advanced)

If you need more control:

```bash
# Step 1: Drop everything
psql -h HOST -U postgres -d postgres -p 5432 -f cleanup.sql

# Step 2: Apply schema
psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/00000000000000_schema.sql

# Step 3: Apply additional migrations
psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/20251122000002_fix_parcel_rls_policies.sql

# Step 4: Apply seed data
psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/01_roles.sql
psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/02_work_units.sql
psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/03_accounts.sql
```

## Database Credentials

### Local Development
- **Host**: `127.0.0.1`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `postgres`
- **Database**: `postgres`

### Production
- **Host**: `agritech-supabase-652186-5-75-154-125.traefik.me`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `chn6ldl4lnfgsafgmihqvxebojnyz6ut`
- **Database**: `postgres`

## After Reset

### 1. Create Trial Subscription (Production)

```bash
cd scripts
node create-trial-subscription.js
```

### 2. Verify Database

```bash
# Check tables exist
psql -h HOST -U postgres -d postgres -c "\dt"

# Check roles are seeded
psql -h HOST -U postgres -d postgres -c "SELECT * FROM roles;"

# Check functions exist
psql -h HOST -U postgres -d postgres -c "\df"
```

### 3. Test Application

- Login to application
- Create organization
- Create farm
- Import parcels

## Files Reference

### Scripts
- **[cleanup.sql](cleanup.sql)** - Drops all database objects
- **[reinitialize.sh](reinitialize.sh)** - Complete reset script
- **[scripts/create-trial-subscription.js](scripts/create-trial-subscription.js)** - Create trial subscription

### Schema
- **[project/supabase/migrations/00000000000000_schema.sql](project/supabase/migrations/00000000000000_schema.sql)** - Main schema (all tables, functions, RLS)
- **[project/supabase/migrations/20251122000002_fix_parcel_rls_policies.sql](project/supabase/migrations/20251122000002_fix_parcel_rls_policies.sql)** - Parcel RLS fix

### Seed Data
- **[project/supabase/seed/01_roles.sql](project/supabase/seed/01_roles.sql)** - System roles
- **[project/supabase/seed/02_work_units.sql](project/supabase/seed/02_work_units.sql)** - Work units
- **[project/supabase/seed/03_accounts.sql](project/supabase/seed/03_accounts.sql)** - Chart of accounts

## Troubleshooting

### Script Fails: "Permission denied"
```bash
chmod +x reinitialize.sh
chmod +x cleanup.sql
```

### Script Fails: "psql: command not found"
Install PostgreSQL client:
```bash
# macOS
brew install postgresql

# Ubuntu
sudo apt-get install postgresql-client
```

### Error: "Connection refused"
Check your database host and port in the script or environment variables.

### Error: "password authentication failed"
Verify password in script matches your database credentials.

## Warning

⚠️ **Production Resets**: This will **DELETE ALL DATA** permanently. Always:
1. Backup data first
2. Test on local/staging first
3. Notify users of downtime
4. Have rollback plan ready

## Alternative: Supabase CLI (Local Only)

For local development, you can also use:
```bash
cd project
npx supabase db reset
```

This is faster but only works for local Supabase instances.

---

**For detailed documentation**, see [DATABASE_MANAGEMENT.md](DATABASE_MANAGEMENT.md)
