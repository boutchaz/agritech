# Database Management Guide

Complete guide for managing the AgriTech database, including cleanup, reset, and reinitialization procedures.

## Quick Reference

### Essential Files

**Schema & Migrations**:
- `project/supabase/migrations/00000000000000_schema.sql` - Main database schema (all tables, functions, RLS policies)
- `project/supabase/migrations/20251122000002_fix_parcel_rls_policies.sql` - Parcel RLS policy fix

**Seed Data**:
- `project/supabase/seed/01_roles.sql` - System roles (system_admin, organization_admin, etc.)
- `project/supabase/seed/02_work_units.sql` - Work units for tasks (hours, days, etc.)
- `project/supabase/seed/03_accounts.sql` - Base chart of accounts
- `project/supabase/seed/chart-of-accounts/morocco-mad.sql` - Morocco COA (MAD currency)
- `project/supabase/seed/chart-of-accounts/france-eur.sql` - France COA (EUR currency)

**Management Scripts**:
- `scripts/cleanup-sql-files.sh` - Archive unnecessary SQL files
- `scripts/reset-database.sh` - Reset and reinitialize database
- `scripts/create-trial-subscription.js` - Create trial subscription for testing

## 1. SQL Files Cleanup

### Purpose
Remove clutter from one-off fixes, debugging scripts, and superseded migrations.

### Usage

```bash
# From project root
cd /Users/boutchaz/Documents/CodeLovers/agritech

# Run cleanup script
./scripts/cleanup-sql-files.sh
```

### What Gets Archived

**Root directory**:
- `debug-access-issue.sql` - Debugging script
- `fix-admin-role.sql` - One-off fix
- `fix-parcel-rls.sql` - Superseded by migration 20251122000002

**Project directory**:
- `fix_accounts_currency.sql` - One-off fix
- `FIX_ACCOUNTS_SCHEMA.sql` - One-off fix
- `fix_currency_to_mad.sql` - One-off fix
- `structures-table-complete.sql` - Superseded by schema
- `create-structures-table.sql` - Superseded by schema
- `apply_tasks_migration.sql` - One-off migration
- `create_subscription.sql` - Debugging script
- `check_currency_status.sql` - Debugging script
- `CRITICAL_RLS_POLICIES_NEEDED.sql` - Superseded by schema
- `ONBOARDING_FIX.sql` - One-off fix
- `VERIFY_RLS_POLICIES.sql` - Debugging script
- All files in `project/scripts/` (debugging and one-off scripts)

**Migrations backup**:
- `00000000000000_schema.sql.backup` - Use git history instead

### Archive Location

Files are moved (not deleted) to: `.archive/sql-cleanup-YYYYMMDD-HHMMSS/`

### Restore a File

If you need a file back:

```bash
# List archived cleanups
ls -la .archive/

# Find your file
find .archive/sql-cleanup-20251122-* -name "filename.sql"

# Restore it
cp .archive/sql-cleanup-YYYYMMDD-HHMMSS/path/to/file.sql /original/location/
```

## 2. Database Reset & Reinitialization

### Purpose
Reset database to a clean state and reapply schema + seed data.

### When to Use

- Fresh start for development
- After schema corruption
- Before major testing
- Production deployment (with extreme caution)

### Usage

#### Local Development

```bash
# Option 1: Use Supabase CLI (recommended for local)
cd project
npx supabase db reset

# Option 2: Use reset script (more control)
cd /Users/boutchaz/Documents/CodeLovers/agritech
./scripts/reset-database.sh
```

#### Production

```bash
# ⚠️ DANGER ZONE ⚠️
# This will DELETE ALL PRODUCTION DATA

cd /Users/boutchaz/Documents/CodeLovers/agritech
./scripts/reset-database.sh

# You will be prompted to type: "DELETE ALL PRODUCTION DATA"
```

### What the Script Does

**Step 1**: Drop all tables
- Disables triggers temporarily
- Drops all tables in `public` schema with CASCADE
- Re-enables triggers

**Step 2**: Drop all functions
- Removes all custom functions in `public` schema
- Ensures clean slate

**Step 3**: Apply main schema
- Applies `00000000000000_schema.sql`
- Creates all tables, functions, RLS policies

**Step 3.1**: Apply additional migrations
- Applies all `202*.sql` migrations in order
- Currently: `20251122000002_fix_parcel_rls_policies.sql`

**Step 4**: Apply seed data
- `01_roles.sql` - System roles
- `02_work_units.sql` - Work units
- `03_accounts.sql` - Base chart of accounts

### Environment Detection

The script automatically detects your environment based on `.env`:

**Production**:
- `VITE_SUPABASE_URL=https://agritech.thebzlab.online`
- Host: `agritech-supabase-652186-5-75-154-125.traefik.me`
- Requires confirmation: "DELETE ALL PRODUCTION DATA"

**Local**:
- `VITE_SUPABASE_URL=http://127.0.0.1:54321` or localhost
- Host: `127.0.0.1`
- Requires confirmation: y/N

### After Reset

**Required steps**:

1. **Create organization** (if needed):
```sql
-- Manual via Supabase Studio or API
INSERT INTO organizations (name, settings) VALUES ('MyOrg', '{}');
```

2. **Create user and link to organization**:
```sql
-- Via Supabase Auth + organization_users table
```

3. **Create trial subscription**:
```bash
cd scripts
node create-trial-subscription.js
```

4. **Import farm data** (if needed):
```typescript
// Via API endpoint /api/v1/farms/import
```

## 3. Create Trial Subscription

### Purpose
Create a 30-day trial subscription for testing without blocking features.

### Usage

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/scripts
node create-trial-subscription.js
```

### What It Does

1. Connects to production database
2. Creates subscription in `subscriptions` table:
   - Plan: "free_trial"
   - Status: "active"
   - Duration: 30 days from now
   - Organization: "codelovers" (default)

### Customization

Edit `create-trial-subscription.js` to change:
- Organization UUID
- Subscription duration
- Plan type

## 4. Common Workflows

### Fresh Local Setup

```bash
# 1. Reset local database
cd project
npx supabase db reset

# 2. Start local development
npm run dev

# 3. Create organization and user via UI onboarding
# (No subscription needed for local)
```

### Production Deployment

```bash
# 1. Backup current production data
npm run db:backup

# 2. Test migrations locally first
cd project
npx supabase db reset
npm run dev
# Verify everything works

# 3. Apply to production (via Supabase Dashboard or CLI)
npm run db:push

# 4. Verify production
npm run db:verify
```

### After RLS Policy Changes

```bash
# 1. Update schema file
# Edit: project/supabase/migrations/00000000000000_schema.sql

# 2. Create standalone migration (optional)
# Create: project/supabase/migrations/YYYYMMDD000001_description.sql

# 3. Test locally
npx supabase db reset

# 4. Push to production
npm run db:push
```

### Clean Up Old SQL Files

```bash
# Archive unnecessary files
./scripts/cleanup-sql-files.sh

# Review archived files
ls -la .archive/sql-cleanup-*/

# Delete archive after verification (optional)
rm -rf .archive/sql-cleanup-YYYYMMDD-HHMMSS/
```

## 5. Troubleshooting

### Reset Script Fails

**Error**: "Schema file not found"
- **Fix**: Check path in script matches your file location
- **Path**: `/Users/boutchaz/Documents/CodeLovers/agritech/project/supabase/migrations/00000000000000_schema.sql`

**Error**: "Connection refused"
- **Fix**: Check database host and port in `.env`
- **Local**: Should be `127.0.0.1:54321`
- **Production**: Should be traefik.me URL

**Error**: "Permission denied"
- **Fix**: Make script executable
```bash
chmod +x scripts/reset-database.sh
```

### Cleanup Script Issues

**Error**: "Directory not found"
- **Fix**: Update paths in script to match your installation
- **Default**: `/Users/boutchaz/Documents/CodeLovers/agritech`

### Subscription Not Working After Reset

**Issue**: "Subscription Required" screen appears

**Fix**: Create trial subscription
```bash
cd scripts
node create-trial-subscription.js
```

**Or** check subscription status:
```sql
SELECT * FROM subscriptions WHERE organization_id = 'your-org-uuid';
```

### RLS Policy Errors

**Error**: "new row violates row-level security policy"

**Fix**: Ensure user is member of organization
```sql
SELECT * FROM organization_users WHERE user_id = 'your-user-uuid';
```

**Fix**: Verify RLS policies are applied
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'your_table_name';
```

## 6. Database Schema Files

### Main Schema (`00000000000000_schema.sql`)

**Contains**:
- All table definitions (50+ tables)
- All functions (RPC endpoints, helpers)
- All RLS policies (row-level security)
- All indexes (performance optimization)
- All triggers (auto-updates, validations)

**Size**: ~310 KB (318,361 bytes)

**DO NOT**:
- Edit manually unless you know what you're doing
- Split into multiple files (keep as single source of truth)
- Commit with merge conflicts unresolved

**DO**:
- Keep in sync with production
- Test changes locally before pushing
- Document significant changes in migration files

### Additional Migrations

**Purpose**: Incremental changes after initial schema

**Naming convention**: `YYYYMMDD000001_description.sql`

**Example**: `20251122000002_fix_parcel_rls_policies.sql`

**When to create**:
- Bug fixes that need to be tracked
- Schema changes after deployment
- New features requiring DB changes

**When NOT to create**:
- Initial development (edit schema.sql directly)
- One-off debugging fixes
- Temporary experiments

### Seed Files

**Purpose**: Initial data required for system to function

**Location**: `project/supabase/seed/`

**Files**:
- `01_roles.sql` - System roles (required)
- `02_work_units.sql` - Work units (required)
- `03_accounts.sql` - Base accounts (required)
- `chart-of-accounts/*.sql` - Country-specific COA (optional)

**When to edit**:
- Adding new system role
- Adding new work unit type
- Updating base chart of accounts

**When to rerun**:
- After database reset
- After role/unit changes
- When seeding new environment

## 7. Best Practices

### Version Control

✅ **DO**:
- Commit schema changes with descriptive messages
- Create git tags for major schema versions
- Document breaking changes in commit message

❌ **DON'T**:
- Commit backup files (*.sql.backup)
- Commit debugging scripts to main branch
- Push untested schema changes

### Migration Strategy

✅ **DO**:
- Test migrations locally first
- Create rollback plan for production changes
- Apply migrations during low-traffic periods

❌ **DON'T**:
- Apply migrations directly to production without testing
- Delete old migrations (they're history)
- Modify already-applied migrations

### File Organization

✅ **DO**:
- Keep only essential SQL files in repo
- Archive one-off fixes and debugging scripts
- Use descriptive file names

❌ **DON'T**:
- Clutter root directory with SQL files
- Keep duplicate or superseded files
- Use generic names like "fix.sql"

## 8. Security Considerations

### Production Resets

**⚠️ EXTREME CAUTION REQUIRED**

Before resetting production:
1. ✅ Export all data (users, organizations, farms, etc.)
2. ✅ Notify all users of downtime
3. ✅ Test reset script on staging environment
4. ✅ Have rollback plan ready
5. ✅ Schedule during maintenance window

### Database Credentials

**Never**:
- Commit database passwords to git
- Share production credentials publicly
- Use weak passwords

**Always**:
- Use environment variables
- Rotate credentials regularly
- Use least-privilege accounts

### RLS Policies

**Always**:
- Test RLS policies thoroughly
- Verify policies block unauthorized access
- Document policy logic

**Never**:
- Disable RLS in production
- Use overly permissive policies
- Skip RLS testing

## 9. Quick Reference Commands

### Cleanup

```bash
# Archive old SQL files
./scripts/cleanup-sql-files.sh

# List archives
ls -la .archive/

# Restore file
cp .archive/sql-cleanup-DATE/path/to/file.sql ./
```

### Reset Database

```bash
# Local (Supabase CLI)
npx supabase db reset

# Local/Production (script)
./scripts/reset-database.sh

# Check database status
npm run db:status
```

### Subscriptions

```bash
# Create trial
node scripts/create-trial-subscription.js

# Check subscriptions
psql -h HOST -U postgres -d postgres -c "SELECT * FROM subscriptions;"
```

### Schema Management

```bash
# Generate types
npm run db:generate-types-remote

# Push schema
npm run db:push

# Compare schemas
npm run schema:diff

# Backup schema
npm run schema:backup
```

## 10. Support

### Getting Help

**Documentation**:
- See `.claude/` directory for detailed architecture docs
- See `CLAUDE.md` for development guide

**Common Issues**:
- Check `PARCEL_RLS_FIX.md` for RLS policy issues
- Check `BATCH_DELETE_IMPLEMENTATION.md` for batch operations
- Check `LOCAL_DEV_SETUP.md` for environment setup

**Still Stuck?**:
- Check Supabase logs in Dashboard
- Review git history for schema changes
- Check `.archive/` for archived fixes that might help

---

**Last Updated**: 2025-11-22
**Version**: 1.0
**Maintained By**: AgriTech Development Team
