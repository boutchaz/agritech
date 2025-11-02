# Role Harmonization Migration

## Overview
This migration standardizes role names across the entire system by mapping legacy role names to new standardized role names.

## Role Mapping

| Legacy Role | New Role | Description |
|------------|----------|-------------|
| `owner` | `system_admin` | System administrator (full access) |
| `admin` | `organization_admin` | Organization administrator |
| `manager` | `farm_manager` | Farm manager |
| `member` | `farm_worker` | Farm worker |
| `viewer` | `viewer` | Read-only access |

## Standardized Role Names

The system now uses the following standardized role names:
1. **system_admin** - System administrator (highest level)
2. **organization_admin** - Organization administrator
3. **farm_manager** - Farm manager
4. **farm_worker** - Farm worker
5. **day_laborer** - Day laborer
6. **viewer** - Read-only observer

## What This Migration Does

1. **Creates `normalize_role_name()` function** - Maps legacy roles to new roles
2. **Migrates existing data** - Updates all `organization_users.role` values
3. **Updates table constraint** - Enforces new role names
4. **Updates `user_has_role()` function** - Handles both legacy and new role names automatically
5. **Updates organization owners** - Ensures owners have `system_admin` role
6. **Adds performance index** - Indexes normalized role names

## Backward Compatibility

The `user_has_role()` function automatically handles legacy role name mapping, so:
- RLS policies continue to work
- Frontend code can use standardized names
- Legacy role names are automatically normalized

## How to Apply

```bash
# Run the migration
supabase migration up

# Or apply directly
psql -f project/supabase/migrations/20250203000006_harmonize_role_names.sql
```

## Verification

After running the migration, verify:
1. All legacy roles are migrated: `SELECT role, COUNT(*) FROM organization_users GROUP BY role;`
2. No legacy roles remain: Should only see new role names
3. `user_has_role()` function works: Test with legacy and new role names

