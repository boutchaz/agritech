# Schema File Fix Summary

## Problem Fixed
**Error:** `ERROR: 42P01: relation "public.roles" does not exist`

## Root Cause
The subscription RLS policies (Row Level Security) were referencing the `roles` table **before** it was created in the schema file.

### Original Order (Incorrect)
1. Line 254: `organization_users` table created (without `role_id` column)
2. Line 285: `subscriptions` table created
3. **Line 1902-1944: Subscription RLS policies created** ❌
   - These policies JOIN with `public.roles` table
   - But `roles` table doesn't exist yet!
4. Line 3958: `roles` table finally created
5. Line 4061: `role_id` column added to `organization_users`

### Fixed Order (Correct)
1. Line 254: `organization_users` table created (without `role_id` column)
2. Line 285: `subscriptions` table created
3. Line 1882: Comment placeholder (policies moved)
4. Line 3896: `roles` table created ✅
5. Line 3999: `role_id` column added to `organization_users` ✅
6. **Line 4016-4083: Subscription RLS policies created** ✅
   - Now the `roles` table exists
   - And `role_id` column exists in `organization_users`

## Changes Made

### 1. Removed from Line ~1882
Removed the subscription RLS policies that were referencing the `roles` table prematurely:
- `org_read_subscriptions`
- `org_insert_subscriptions`
- `org_update_subscriptions`
- `org_delete_subscriptions`

### 2. Added at Line ~4016
Moved the same policies to after:
- `roles` table creation (line 3896)
- `role_id` column addition to `organization_users` (line 3999)
- `role_id` index creation (line 4014)

## Files Updated
- ✅ `project/supabase/migrations/00000000000000_schema.sql` - Fixed
- ✅ `project/supabase/migrations/00000000000000_schema_clean.sql` - Updated copy

## Verification
To verify no more premature references:

```bash
cd project/supabase/migrations

# Find where roles table is created
grep -n "CREATE TABLE.*roles" 00000000000000_schema.sql
# Output: 3896:CREATE TABLE IF NOT EXISTS roles (

# Check for any references before line 3896
grep -in "\brolES\b" 00000000000000_schema.sql | \
  grep -v "^[0-9]*:--" | \
  awk -F: '$1 < 3896 {print}'
# Output: (empty - no premature references!)
```

## Testing
Run the migration:

```bash
# Option 1: Via Supabase CLI
npx supabase db reset

# Option 2: Via web interface
# Just run the fixed schema file directly
```

## Why This Fix Works

The RLS policies for subscriptions use this pattern:

```sql
CREATE POLICY "org_insert_subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_users ou
      JOIN public.roles r ON r.id = ou.role_id  -- ← Needs roles table!
      WHERE ou.user_id = auth.uid()
        AND r.name IN ('system_admin', 'organization_admin')
    )
  );
```

This JOIN requires:
1. ✅ The `roles` table to exist
2. ✅ The `organization_users.role_id` column to exist

By moving the policies to line 4016, both requirements are met!

## Related Files
- Original backup: `00000000000000_schema.sql.backup`
- Database reset guide: `DATABASE_RESET_GUIDE.md`
- This summary: `SCHEMA_FIX_SUMMARY.md`
