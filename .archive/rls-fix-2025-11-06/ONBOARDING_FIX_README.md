# Onboarding Issue Fix - Missing RLS Policies

## Problem Summary

The onboarding flow was failing with the following errors:

### 1. **Dashboard Settings Query Error**
```
{
    "code": "PGRST116",
    "details": "The result contains 0 rows",
    "hint": null,
    "message": "Cannot coerce the result to a single JSON object"
}
```
**URL**: `https://mvegjdkkbhlhbjpbhpou.supabase.co/rest/v1/dashboard_settings?select=*&user_id=eq.cbdbf1bc-f14f-445a-bb9a-85b8592a599a&organization_id=eq.9a735597-c0a7-495c-b9f7-70842e34e3df`

### 2. **User Profiles Query Returning Empty Array**
**URL**: `https://mvegjdkkbhlhbjpbhpou.supabase.co/rest/v1/user_profiles?select=*&id=eq.cbdbf1bc-f14f-445a-bb9a-85b8592a599a`

### 3. **Organization Users Query Working**
Returns: `[{"role":"organization_admin"}]` ✅

## Root Cause

Investigation revealed that:

1. **`user_profiles` table**: Had RLS enabled but **NO policies defined**
2. **`dashboard_settings` table**: Had RLS enabled but **NO policies defined**

When RLS (Row Level Security) is enabled on a table without any policies, PostgreSQL blocks ALL access to that table, causing:
- Empty result sets
- PGRST116 errors when using `.single()`
- Complete inability to read or write data

## Solution

Added the missing RLS policies for both tables:

### User Profiles Policies
- `user_read_own_profile`: Users can SELECT their own profile
- `user_write_own_profile`: Users can INSERT their own profile
- `user_update_own_profile`: Users can UPDATE their own profile

### Dashboard Settings Policies
- `user_read_own_dashboard_settings`: Users can SELECT their settings for orgs they belong to
- `user_write_own_dashboard_settings`: Users can INSERT their settings for orgs they belong to
- `user_update_own_dashboard_settings`: Users can UPDATE their settings for orgs they belong to
- `user_delete_own_dashboard_settings`: Users can DELETE their own settings

## How to Apply the Fix

### Option 1: Via Supabase Dashboard (RECOMMENDED)

1. Go to your Supabase SQL Editor:
   **https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou/sql**

2. Open the file `ONBOARDING_FIX.sql` in this directory

3. Copy and paste the SQL into the editor

4. Click **Run** to execute

5. Verify the policies were created by running the verification query at the bottom

### Option 2: Via Command Line (if psql access is available)

```bash
psql -h <your-host> -U postgres -d postgres -f ONBOARDING_FIX.sql
```

## Files Modified

1. **`/project/supabase/migrations/00000000000000_schema.sql`**
   - Added RLS policies at the end of the file (lines 4112-4165)

2. **`/project/supabase/migrations/20251106000001_add_user_profiles_dashboard_settings_rls.sql`**
   - Standalone migration file (not yet applied to remote)

3. **`/ONBOARDING_FIX.sql`**
   - Standalone SQL file for manual execution via Dashboard

## Verification

After applying the fix, test the onboarding flow:

1. Create a new user account
2. Go through the onboarding process
3. Verify that:
   - User profile is created successfully
   - Organization is created
   - Farm is created
   - Dashboard loads without errors

### Quick Test Queries

```sql
-- Check policies exist
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('user_profiles', 'dashboard_settings')
ORDER BY tablename, policyname;

-- Test user_profiles access (replace with your user ID)
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Test dashboard_settings access
SELECT * FROM dashboard_settings WHERE user_id = auth.uid();
```

## Related Code Locations

- Onboarding component: [src/components/OnboardingFlow.tsx](project/src/components/OnboardingFlow.tsx)
- Dashboard settings query: [src/routes/dashboard.tsx:71-100](project/src/routes/dashboard.tsx#L71-L100)
- Auth provider: [src/components/MultiTenantAuthProvider.tsx](project/src/components/MultiTenantAuthProvider.tsx)

## Prevention

To prevent this issue in the future:

1. **Always create RLS policies immediately after enabling RLS**:
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

   -- Immediately create at least one policy!
   CREATE POLICY "basic_access" ON table_name
     FOR ALL USING (auth.uid() = user_id);
   ```

2. **Test RLS policies** after creation by:
   - Querying as different users
   - Checking the results match expectations
   - Using `EXPLAIN` to verify policy evaluation

3. **Document RLS policies** in migration files with comments explaining:
   - Who can access what
   - Why the policy is structured that way
   - Any special cases or exceptions

## Status

- [x] Root cause identified
- [x] Fix implemented in schema file
- [x] Standalone SQL file created for manual execution
- [ ] Fix applied to remote database (needs manual execution)
- [ ] Onboarding flow tested and verified

## Next Steps

1. **Execute `ONBOARDING_FIX.sql` in Supabase Dashboard**
2. **Test the onboarding flow** with a new user
3. **Monitor for any related issues** in production
4. **Update documentation** if needed
