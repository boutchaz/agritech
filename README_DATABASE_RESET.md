# Database Reset - Quick Start

## Problem You Encountered

When running `cleanup.sql`, you got a **deadlock error**:
```
ERROR: 40P01: deadlock detected
```

This happens because your application/tools have active connections to the database.

## ✅ Solution: Use cleanup-safe.sql

The fixed script terminates all active connections before dropping tables.

## Quick Commands

### Option 1: Automatic Reset (Recommended)

```bash
# Make script executable (first time only)
chmod +x reinitialize.sh

# Run it
./reinitialize.sh production
# Type: DELETE ALL PRODUCTION DATA
```

This will:
1. ✅ Terminate all active connections (no more deadlocks!)
2. ✅ Drop all tables, views, functions, triggers
3. ✅ Apply main schema
4. ✅ Apply migrations
5. ✅ Apply seed data

### Option 2: Manual Cleanup Only

```bash
PGPASSWORD=chn6ldl4lnfgsafgmihqvxebojnyz6ut \
  psql -h agritech-supabase-652186-5-75-154-125.traefik.me \
  -U postgres -d postgres -p 5432 -f cleanup-safe.sql
```

Then manually apply schema and seeds.

## Files Available

### Cleanup Scripts

**[cleanup-safe.sql](cleanup-safe.sql)** - ⭐ USE THIS ONE
- Terminates active connections (fixes deadlock)
- Error handling for each drop
- Detailed progress reporting
- **Recommended for all environments**

**[cleanup.sql](cleanup.sql)** - Original version
- Doesn't terminate connections
- May cause deadlocks if app is running
- Keep for reference only

### Automation Scripts

**[reinitialize.sh](reinitialize.sh)** - Complete reset
- Uses `cleanup-safe.sql` (already updated)
- Applies schema and seeds
- Environment detection
- **Safest option**

**[scripts/reset-database.sh](scripts/reset-database.sh)** - Advanced reset
- More detailed output
- Auto-detects environment from .env
- Alternative to reinitialize.sh

## What You'll See

When running `cleanup-safe.sql`, you'll see:

```
NOTICE: 🔌 Terminating active connections...
NOTICE: Terminating: PID=12345 User=postgres App=node State=idle
NOTICE: Terminated 2 connection(s)

NOTICE: 🗑️  Dropping all tables...
NOTICE: Dropping table: accounts
NOTICE: Dropping table: farms
NOTICE: Dropping table: parcels
... (50+ tables)
NOTICE: Dropped 52 table(s), 0 error(s)

NOTICE: ✅ Database cleanup complete!
```

## After Reset

### 1. Verify Database

```bash
# Check tables exist
PGPASSWORD=chn6ldl4lnfgsafgmihqvxebojnyz6ut \
  psql -h agritech-supabase-652186-5-75-154-125.traefik.me \
  -U postgres -d postgres -c "\dt"

# Should show ~50 tables (organizations, farms, parcels, etc.)
```

### 2. Create Trial Subscription

```bash
cd scripts
node create-trial-subscription.js
```

### 3. Test Application

- Navigate to https://agritech-dashboard.thebzlab.online
- Login with your credentials
- Create organization
- Import farms

## Troubleshooting

### "Permission denied to terminate backend"

You need superuser privileges. The credentials in the script should work.

### Still getting deadlocks?

Increase the sleep time in `cleanup-safe.sql`:
```sql
SELECT pg_sleep(5);  -- Change from 2 to 5 seconds
```

### Some tables still exist after cleanup?

Check the error count in the output. Manually drop problem tables:
```sql
DROP TABLE problem_table CASCADE;
```

## Safety Features

### cleanup-safe.sql
- ✅ Terminates only client connections (not system processes)
- ✅ Preserves PostGIS system tables
- ✅ Error handling (continues on failure)
- ✅ Detailed progress reporting

### reinitialize.sh
- ✅ Production requires typing: "DELETE ALL PRODUCTION DATA"
- ✅ Local requires typing: "y"
- ✅ Shows what will be done before starting

## Complete Documentation

For more details, see:
- **[DEADLOCK_FIX.md](DEADLOCK_FIX.md)** - Detailed explanation of the deadlock fix
- **[CLEANUP_COMPLETE.md](CLEANUP_COMPLETE.md)** - Overview of all cleanup features
- **[DB_RESET_GUIDE.md](DB_RESET_GUIDE.md)** - Quick reference guide
- **[DATABASE_MANAGEMENT.md](DATABASE_MANAGEMENT.md)** - Complete documentation

## Summary

**Your Issue**: Deadlock when running cleanup.sql
**Root Cause**: Active connections holding locks
**Fix**: Use cleanup-safe.sql (terminates connections first)
**Action**: Run `./reinitialize.sh production`
**Status**: ✅ Ready to use

---

**Last Updated**: 2025-11-22 (Deadlock fix applied)
