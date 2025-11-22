# Deadlock Fix - Database Cleanup

## The Problem

When running `cleanup.sql`, you encountered this error:

```
ERROR: 40P01: deadlock detected
Process 916472 waits for AccessExclusiveLock on relation 27650
Process 916457 waits for AccessShareLock on relation 26671
```

**Root Cause**: Active database connections (from your application, Supabase Studio, etc.) are holding locks on tables, preventing the cleanup script from dropping them.

## The Solution

Created **[cleanup-safe.sql](cleanup-safe.sql)** which:

1. **Terminates all active connections** before dropping tables
2. **Adds error handling** for each drop operation
3. **Shows detailed progress** with NOTICE messages
4. **Excludes PostGIS system tables/views**

## Usage

### Use the Safe Cleanup Script

```bash
# Production
PGPASSWORD=chn6ldl4lnfgsafgmihqvxebojnyz6ut \
  psql -h agritech-supabase-652186-5-75-154-125.traefik.me \
  -U postgres -d postgres -p 5432 -f cleanup-safe.sql

# Or use the reinitialize script (already updated to use cleanup-safe.sql)
./reinitialize.sh production
```

## What cleanup-safe.sql Does

### Step 1: Terminate Active Connections
```sql
-- Terminates all connections except the current one
-- This releases all locks that would cause deadlocks
```

### Step 2: Drop Tables with Error Handling
```sql
-- Each DROP is wrapped in BEGIN/EXCEPTION/END
-- If a drop fails, it logs the error and continues
```

### Step 3: Sleep Between Operations
```sql
-- Waits 2 seconds after terminating connections
-- Ensures connections are fully closed
```

## Differences from cleanup.sql

| Feature | cleanup.sql | cleanup-safe.sql |
|---------|-------------|------------------|
| Terminate connections | ❌ No | ✅ Yes |
| Error handling | ❌ No | ✅ Yes |
| Progress reporting | Basic | Detailed with counts |
| Deadlock protection | ❌ No | ✅ Yes |
| PostGIS protection | ✅ Yes | ✅ Yes |

## Alternative: Manual Connection Termination

If you prefer to manually terminate connections first:

```sql
-- Check active connections
SELECT pid, usename, application_name, state, query
FROM pg_stat_activity
WHERE datname = 'postgres'
AND pid != pg_backend_pid();

-- Terminate specific connection
SELECT pg_terminate_backend(PID_NUMBER);

-- Or terminate all connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'postgres'
AND pid != pg_backend_pid();

-- Then run cleanup.sql
```

## Preventing Deadlocks

Before running cleanup scripts:

1. **Stop your application**:
   ```bash
   # Stop frontend
   cd project
   pkill -f "vite"

   # Stop API
   cd agritech-api
   pkill -f "nest"
   ```

2. **Close Supabase Studio** (if open)

3. **Close pgAdmin / database tools** (if open)

4. **Run the cleanup script**

5. **Restart your application**

## What Gets Terminated

The script terminates:
- ✅ Application connections (frontend, API)
- ✅ IDE database connections (VS Code extensions, etc.)
- ✅ Supabase Studio connections
- ✅ pgAdmin connections
- ❌ NOT the current psql connection (safe)
- ❌ NOT system processes (safe)

## Verification

After running cleanup-safe.sql, you should see output like:

```
NOTICE: 🔌 Terminating active connections...
NOTICE: Terminating: PID=12345 User=postgres App=node State=idle
NOTICE: Terminating: PID=12346 User=postgres App=pgAdmin State=active
NOTICE: Terminated 2 connection(s)

NOTICE: 🗑️  Dropping all tables...
NOTICE: Dropping table: accounts
NOTICE: Dropping table: farms
...
NOTICE: Dropped 52 table(s), 0 error(s)

NOTICE: ✅ Database cleanup complete!
```

## Troubleshooting

### Still Getting Deadlocks?

**Try increasing the sleep time**:
```sql
-- In cleanup-safe.sql, change:
SELECT pg_sleep(2);

-- To:
SELECT pg_sleep(5);
```

### Permission Denied to Terminate Connections?

**Ensure you're using a superuser account**:
```bash
# Check your user's role
psql -h HOST -U postgres -c "\du postgres"

# Should show: Superuser
```

### Some Tables Still Exist?

**Check the error count in output**:
```
Dropped 52 table(s), 3 error(s)
```

**Review the errors and manually drop those tables**:
```sql
-- Check remaining tables
\dt

-- Manually drop problem table
DROP TABLE problem_table CASCADE;
```

## Updated reinitialize.sh

The `reinitialize.sh` script now uses `cleanup-safe.sql` automatically. No changes needed on your part.

```bash
# Just run it as normal
./reinitialize.sh production
```

## Summary

**Problem**: Deadlock when dropping tables due to active connections
**Solution**: Use `cleanup-safe.sql` which terminates connections first
**Status**: ✅ Fixed and tested
**Action Required**: Use `cleanup-safe.sql` instead of `cleanup.sql`

---

**Created**: 2025-11-22
**Related Files**:
- [cleanup-safe.sql](cleanup-safe.sql) - Safe cleanup script
- [cleanup.sql](cleanup.sql) - Original cleanup script (keep for reference)
- [reinitialize.sh](reinitialize.sh) - Updated to use cleanup-safe.sql
