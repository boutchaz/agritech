# SQL Files Cleanup & Database Reset Summary

## What Was Done

Created a complete database management solution for AgriTech platform.

## Files Created

### 1. Core Scripts

**[cleanup.sql](cleanup.sql)** - SQL script to drop everything
- Drops all tables (CASCADE)
- Drops all views
- Drops all functions
- Drops all sequences
- Drops all custom types
- Drops all triggers
- Shows progress with RAISE NOTICE messages

**[reinitialize.sh](reinitialize.sh)** - Complete reset script
- Runs cleanup.sql
- Applies main schema
- Applies additional migrations
- Applies seed data
- Supports both local and production environments

### 2. Management Scripts

**[scripts/cleanup-sql-files.sh](scripts/cleanup-sql-files.sh)** - Archive old SQL files
- Archives debugging scripts
- Archives one-off fixes
- Archives superseded migrations
- Creates timestamped archive directory
- Safe to run (moves files, doesn't delete)

**[scripts/reset-database.sh](scripts/reset-database.sh)** - Advanced reset script
- More detailed than reinitialize.sh
- Environment auto-detection from .env
- Step-by-step progress reporting
- Production safety confirmation

**[scripts/create-trial-subscription.js](scripts/create-trial-subscription.js)** - Moved from root
- Create trial subscription for testing
- 30-day duration
- Active status

### 3. Documentation

**[DATABASE_MANAGEMENT.md](DATABASE_MANAGEMENT.md)** - Comprehensive guide
- Essential files reference
- SQL cleanup procedures
- Database reset procedures
- Trial subscription creation
- Common workflows
- Troubleshooting
- Best practices
- Security considerations

**[DB_RESET_GUIDE.md](DB_RESET_GUIDE.md)** - Quick reference
- Quick start commands
- Database credentials
- Post-reset steps
- Files reference
- Troubleshooting

**[SQL_CLEANUP_SUMMARY.md](SQL_CLEANUP_SUMMARY.md)** - This file
- What was created
- How to use
- Examples

## Usage

### Quick Database Reset

```bash
# Local development
./reinitialize.sh local

# Production (requires typing "DELETE ALL PRODUCTION DATA")
./reinitialize.sh production
```

### Manual Cleanup & Reset

```bash
# Step 1: Drop everything
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -p 5432 -f cleanup.sql

# Step 2: Apply schema
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/00000000000000_schema.sql

# Step 3: Apply migrations
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/migrations/20251122000002_fix_parcel_rls_policies.sql

# Step 4: Apply seed data
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/01_roles.sql
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/02_work_units.sql
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -p 5432 -f project/supabase/seed/03_accounts.sql
```

### Archive Old SQL Files

```bash
# Archive unnecessary SQL files
./scripts/cleanup-sql-files.sh

# Result: Files moved to .archive/sql-cleanup-YYYYMMDD-HHMMSS/
```

## Examples

### Example 1: Fresh Local Development

```bash
# Reset local database
./reinitialize.sh local

# Start development
cd project
npm run dev
```

### Example 2: Production Reset (DANGER!)

```bash
# DANGER: This deletes all production data
./reinitialize.sh production

# Type: DELETE ALL PRODUCTION DATA

# Create trial subscription
cd scripts
node create-trial-subscription.js

# Import your data
# (via application or API)
```

### Example 3: Test Schema Changes

```bash
# Edit schema
vim project/supabase/migrations/00000000000000_schema.sql

# Test locally
./reinitialize.sh local

# Verify in application
cd project
npm run dev

# If good, push to production
npm run db:push
```

## What Gets Cleaned Up

### By cleanup.sql
- ✅ All tables in public schema
- ✅ All views
- ✅ All functions
- ✅ All sequences
- ✅ All custom types (enums)
- ✅ All triggers

### By cleanup-sql-files.sh

**Root directory**:
- debug-access-issue.sql
- fix-admin-role.sql
- fix-parcel-rls.sql

**Project directory**:
- fix_accounts_currency.sql
- FIX_ACCOUNTS_SCHEMA.sql
- fix_currency_to_mad.sql
- structures-table-complete.sql
- create-structures-table.sql
- apply_tasks_migration.sql
- create_subscription.sql
- check_currency_status.sql
- CRITICAL_RLS_POLICIES_NEEDED.sql
- ONBOARDING_FIX.sql
- VERIFY_RLS_POLICIES.sql
- apply_assignable_users.sql
- check_subscription_access.sql
- check_org_subscription.sql

**Scripts directory** (all debugging files):
- GRANT_SUBSCRIPTION_NOW.sql
- debug-subscriptions.sql
- list-tables.sql
- create-subscription-from-webhook.sql
- fix-remote-function-params.sql
- verify-deployment.sql
- check-subscriptions.sql
- debug-blocking-issue.sql
- verify-blocking.sql
- create-my-subscription.sql
- test-complete-blocking.sql
- grant-test-subscription.sql

**Migrations directory**:
- 00000000000000_schema.sql.backup

## Essential Files (NOT Cleaned)

### Schema & Migrations
- ✅ project/supabase/migrations/00000000000000_schema.sql
- ✅ project/supabase/migrations/20251122000002_fix_parcel_rls_policies.sql

### Seed Data
- ✅ project/supabase/seed/01_roles.sql
- ✅ project/supabase/seed/02_work_units.sql
- ✅ project/supabase/seed/03_accounts.sql
- ✅ project/supabase/seed/chart-of-accounts/*.sql

### Backend Service
- ✅ backend-service/database/satellite_files_table.sql
- ✅ backend-service/database/satellite_indices_tables.sql

## Safety Features

### cleanup.sql
- Uses `IF EXISTS` clauses (no errors if already dropped)
- Uses `CASCADE` for proper dependency handling
- Wrapped in transaction (BEGIN/COMMIT)
- Shows progress via RAISE NOTICE

### reinitialize.sh
- Detects environment (local vs production)
- Requires confirmation for production
- Production requires typing full phrase: "DELETE ALL PRODUCTION DATA"
- Local requires typing: y

### cleanup-sql-files.sh
- Moves files (doesn't delete)
- Creates timestamped archive
- Can restore files easily
- Shows what was archived

## Verification

After reset, verify database state:

```bash
# Check tables
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -c "\dt"

# Check functions
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -c "\df"

# Check roles
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -c "SELECT * FROM roles;"

# Check work_units
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -c "SELECT * FROM work_units;"
```

## Troubleshooting

### cleanup.sql fails

**Check**:
- Database connection parameters
- Password is correct
- User has DROP permissions

**Try**:
```bash
# Test connection first
PGPASSWORD=yourpass psql -h HOST -U postgres -d postgres -c "SELECT version();"
```

### reinitialize.sh fails

**Check**:
- Script is executable: `chmod +x reinitialize.sh`
- psql is installed: `which psql`
- Path to migration files is correct

### Nothing happens (no output)

**Fix**: The script redirects output to /dev/null. Remove the redirect to see output:

```bash
# In reinitialize.sh, change:
psql ... > /dev/null 2>&1

# To:
psql ...
```

## Next Steps After Reset

1. **Verify database**:
   - Tables created
   - Functions exist
   - Seed data loaded

2. **Create organization** (via application or API)

3. **Create trial subscription**:
   ```bash
   node scripts/create-trial-subscription.js
   ```

4. **Test application**:
   - Login
   - Create farm
   - Import parcels
   - Verify features work

5. **Import production data** (if applicable):
   - Export from old database
   - Import via API endpoints

## Benefits

### Before
- 50+ scattered SQL files
- No clear way to reset database
- Manual multi-step process
- Easy to miss steps
- Inconsistent states

### After
- ✅ Single cleanup.sql to drop everything
- ✅ Single reinitialize.sh to rebuild
- ✅ Organized scripts directory
- ✅ Clear documentation
- ✅ Safe production handling
- ✅ Archived old files (recoverable)

## Archive Location

Old SQL files are archived to:
```
.archive/sql-cleanup-YYYYMMDD-HHMMSS/
```

**Safe to delete after verification** (usually 1-2 weeks)

To restore a file:
```bash
cp .archive/sql-cleanup-20251122-*/path/to/file.sql ./original/location/
```

## Support

For detailed documentation:
- **[DATABASE_MANAGEMENT.md](DATABASE_MANAGEMENT.md)** - Complete guide
- **[DB_RESET_GUIDE.md](DB_RESET_GUIDE.md)** - Quick reference
- **[PARCEL_RLS_FIX.md](PARCEL_RLS_FIX.md)** - RLS policy fixes
- **[BATCH_DELETE_IMPLEMENTATION.md](BATCH_DELETE_IMPLEMENTATION.md)** - Batch operations

---

**Created**: 2025-11-22
**Status**: ✅ Complete and tested
**Breaking Changes**: None (only organization, no code changes)
