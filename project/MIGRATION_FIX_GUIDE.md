# Database Migration Fix Guide

## Overview

This guide helps you apply all the necessary database migrations to fix the current issues with RLS policies and function parameters.

## Issues Being Fixed

1. ✅ **500 Error on `user_profiles`** - Conflicting RLS policies
2. ✅ **Parcels not visible** - Incorrect RLS policies
3. ✅ **Function parameter mismatch** - `get_user_role` parameter naming
4. ✅ **Infinite recursion on `roles`** - Recursive RLS policies on reference tables
5. ✅ **500 Error on `costs`** - Infinite recursion when querying costs

## Migrations to Apply (In Order)

### 1. Fix User Profiles RLS
**File**: `supabase/migrations/20250930000000_fix_user_profiles_rls.sql`

**What it does**:
- Cleans up conflicting user_profiles policies
- Creates simple, non-recursive policies
- Allows users to view/update their own profile
- Allows org admins to view profiles in their org

### 2. Fix Parcels RLS
**File**: `supabase/migrations/20250930000002_debug_and_fix_parcels.sql`

**What it does**:
- Removes all conflicting parcel policies
- Creates clean SELECT, INSERT, UPDATE, DELETE policies
- Ensures organization members can view parcels
- Adds debug function for troubleshooting

### 3. Fix get_user_role Function
**File**: `supabase/migrations/20250930000003_fix_get_user_role_params.sql`

**What it does**:
- Recreates `get_user_role` with correct parameter names
- Parameter: `organization_id` (not `org_id`)
- Recreates `get_user_permissions` function
- Matches frontend RPC calls

### 4. Fix Infinite Recursion (CRITICAL)
**File**: `supabase/migrations/20250930000004_fix_infinite_recursion.sql`

**What it does**:
- Makes `roles`, `permissions`, `role_permissions` readable by all authenticated users
- Removes recursive checks from these reference tables
- Simplifies `is_system_admin` function
- Fixes `costs`, `revenues`, `cost_categories` policies
- Prevents infinite recursion when querying costs/revenues

### 5. Nuclear Fix for Recursion (MOST CRITICAL)
**File**: `supabase/migrations/20250930000005_nuclear_fix_recursion.sql`

**What it does**:
- **COMPLETELY DISABLES RLS** on `roles`, `permissions`, `role_permissions` tables
- Removes ALL policies from reference tables
- Uses triggers instead of RLS for write protection
- Simplifies all policies that reference roles
- Fixes user_profiles policies to avoid recursion
- **This is the definitive fix for infinite recursion**

⚠️ **IMPORTANT**: Run this migration if you're still seeing recursion errors after migration #4

---

## How to Apply Migrations

### Option 1: Supabase CLI (Recommended)

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Push all pending migrations
supabase db push

# Or reset and apply all migrations fresh
supabase db reset
```

### Option 2: Supabase Dashboard (Manual)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run migrations **in order**:

   **Migration 1**: Copy contents of `20250930000000_fix_user_profiles_rls.sql` → Run

   **Migration 2**: Copy contents of `20250930000002_debug_and_fix_parcels.sql` → Run

   **Migration 3**: Copy contents of `20250930000003_fix_get_user_role_params.sql` → Run

   **Migration 4**: Copy contents of `20250930000004_fix_infinite_recursion.sql` → Run

4. Verify each migration completes successfully

---

## Verification Steps

After applying migrations, verify everything works:

### 1. Check User Profiles
```sql
-- Should return your profile without 500 error
SELECT * FROM public.user_profiles WHERE id = auth.uid();
```

### 2. Check Parcels Visibility
```sql
-- Should return parcels you have access to
SELECT * FROM public.parcels LIMIT 5;
```

### 3. Check get_user_role Function
```sql
-- Should return your role
SELECT * FROM public.get_user_role(
  auth.uid(),
  'your-org-id'::UUID
);
```

### 4. Check Costs/Revenues (No Recursion)
```sql
-- Should return costs without infinite recursion error
SELECT c.*, cat.name as category_name
FROM public.costs c
LEFT JOIN public.cost_categories cat ON cat.id = c.category_id
LIMIT 5;
```

### 5. Check Roles Table (No Recursion)
```sql
-- Should return roles without infinite recursion
SELECT * FROM public.roles;
```

### 6. Use Debug Function
```sql
-- Check your access to parcels
SELECT * FROM public.debug_parcel_access(
  auth.uid(),
  'your-org-id'::UUID
);
```

---

## Expected Results

After applying all migrations:

✅ **User Profiles**: Should load without 500 errors
✅ **Parcels Page**: Should display all parcels you have access to
✅ **Cost Tracking**: Profitability dashboard should work without recursion errors
✅ **Role Functions**: `get_user_role` and `get_user_permissions` should work
✅ **Reference Tables**: Roles and permissions should be queryable

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```bash
# Rollback last migration
supabase db reset

# Or restore from backup in Supabase Dashboard
```

---

## Common Issues & Solutions

### Issue: "Schema cache not refreshed"
**Solution**: Wait 5-10 seconds, or manually run:
```sql
NOTIFY pgrst, 'reload schema';
```

### Issue: "Function already exists"
**Solution**: Migrations use `CREATE OR REPLACE`, so this shouldn't happen. If it does:
```sql
DROP FUNCTION IF EXISTS public.function_name(parameter_types);
```

### Issue: Still seeing 500 errors
**Solution**:
1. Check Supabase logs (Dashboard → Logs)
2. Run verification SQL queries above
3. Check if all 4 migrations were applied
4. Look for specific error messages in browser console

### Issue: Parcels still not visible
**Solution**:
```sql
-- Check if you're in the organization
SELECT * FROM public.organization_users
WHERE user_id = auth.uid() AND is_active = true;

-- Check if farms exist
SELECT * FROM public.farms
WHERE organization_id = 'your-org-id';

-- Use debug function
SELECT * FROM public.debug_parcel_access(auth.uid(), 'your-org-id'::UUID);
```

---

## Migration Summary

| Migration | Priority | Impact |
|-----------|----------|--------|
| `20250930000000_fix_user_profiles_rls.sql` | High | Fixes user profile loading |
| `20250930000002_debug_and_fix_parcels.sql` | Critical | Fixes parcels visibility |
| `20250930000003_fix_get_user_role_params.sql` | High | Fixes role/permission functions |
| `20250930000004_fix_infinite_recursion.sql` | Critical | First attempt at fixing recursion |
| `20250930000005_nuclear_fix_recursion.sql` | **MOST CRITICAL** | **Completely eliminates infinite recursion** |

---

## Post-Migration Testing

Test these features after migrations:

1. ✅ Login and profile loading
2. ✅ Navigate to `/parcels` page
3. ✅ View parcel details
4. ✅ Navigate to profitability dashboard
5. ✅ Add costs to a parcel
6. ✅ Add revenues to a parcel
7. ✅ Check user settings page
8. ✅ Switch organizations (if multiple)

---

## Support

If issues persist after applying migrations:

1. Check Supabase Dashboard → Logs → Error Logs
2. Check browser console for specific error messages
3. Run verification SQL queries above
4. Check that all 4 migrations completed successfully
5. Verify schema cache was refreshed (`NOTIFY pgrst, 'reload schema'`)

---

**Last Updated**: 2025-09-30
**Migration Version**: 1.0.0