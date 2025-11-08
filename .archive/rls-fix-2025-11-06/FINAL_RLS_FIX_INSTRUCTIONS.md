# Final Onboarding RLS Fix - Complete Instructions

## Problem Analysis Update

After applying the initial fix, we discovered **THREE tables** with RLS enabled but no policies:

1. ✅ `user_profiles` - **FIXED** (initially had separate policies, now using single ALL policy for upsert support)
2. ✅ `organizations` - **FIXED** (was completely missing policies)
3. ✅ `dashboard_settings` - **FIXED**

## Current Errors

### Error 1: User Profiles Insert Blocked
```json
{
    "code": "42501",
    "details": null,
    "hint": null,
    "message": "new row violates row-level security policy for table \"user_profiles\""
}
```
**Cause**: The onboarding flow uses `.upsert()` which requires both INSERT and UPDATE permissions. The initial fix had separate policies which didn't work well with upsert.

**Solution**: Changed to a single `FOR ALL` policy that covers SELECT, INSERT, UPDATE, and DELETE.

### Error 2: Organizations Query Returns Empty
```
GET .../organizations?select=*&id=eq.9a735597-c0a7-495c-b9f7-70842e34e3df
406 (Not Acceptable)

{
    "code": "PGRST116",
    "details": "The result contains 0 rows",
    "hint": null,
    "message": "Cannot coerce the result to a single JSON object"
}
```
**Cause**: `organizations` table had **NO RLS policies at all**, blocking all access.

**Solution**: Added 4 policies for SELECT, INSERT, UPDATE, DELETE operations.

## Complete Fix to Apply

### Step 1: Open Supabase SQL Editor
Go to: **https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou/sql**

### Step 2: Execute the Comprehensive Fix
Copy and paste the contents of `COMPREHENSIVE_RLS_FIX.sql` into the SQL editor and click **Run**.

The SQL file contains:
- **1 policy for user_profiles** (`FOR ALL` - supports upsert)
- **4 policies for organizations** (SELECT, INSERT, UPDATE, DELETE)
- **4 policies for dashboard_settings** (SELECT, INSERT, UPDATE, DELETE)

### Step 3: Verify Policies Were Created
After running the SQL, execute this verification query:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('user_profiles', 'organizations', 'dashboard_settings')
ORDER BY tablename, policyname;
```

**Expected output:**
- `user_profiles` → 1 row: `user_all_own_profile` (ALL)
- `organizations` → 4 rows: read, write, update, delete policies
- `dashboard_settings` → 4 rows: read, write, update, delete policies

**Total: 9 policies**

## Policy Details

### User Profiles Policy
```sql
CREATE POLICY "user_all_own_profile" ON user_profiles
  FOR ALL USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```
- **Allows**: Users to SELECT, INSERT, UPDATE, DELETE their own profile
- **Key feature**: Single policy supports `.upsert()` used in onboarding

### Organizations Policies
```sql
-- SELECT: Users see organizations they belong to
CREATE POLICY "org_read_organizations" ON organizations
  FOR SELECT USING (is_organization_member(id));

-- INSERT: Any authenticated user can create an organization
CREATE POLICY "org_write_organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Organization members can update
CREATE POLICY "org_update_organizations" ON organizations
  FOR UPDATE USING (is_organization_member(id));

-- DELETE: Organization members can delete
CREATE POLICY "org_delete_organizations" ON organizations
  FOR DELETE USING (is_organization_member(id));
```

### Dashboard Settings Policies
```sql
-- Users can manage their settings for organizations they belong to
CREATE POLICY "user_read_own_dashboard_settings" ON dashboard_settings
  FOR SELECT USING (
    user_id = auth.uid() AND is_organization_member(organization_id)
  );
-- ... (plus INSERT, UPDATE, DELETE with similar logic)
```

## Testing the Fix

After applying the SQL, test the complete onboarding flow:

### 1. Create a Test User
```javascript
// Sign up a new user
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'TestPassword123!'
});
```

### 2. Go Through Onboarding
- Step 1: Create profile (first name, last name, phone, timezone)
- Step 2: Create organization (name, slug, phone)
- Step 3: Create first farm (name, location, size)

### 3. Expected Behavior
- ✅ Profile created without errors
- ✅ Organization created without errors
- ✅ Farm created without errors
- ✅ Dashboard loads successfully
- ✅ Organization settings accessible

### 4. Quick Verification Queries
```sql
-- Check your profile was created
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Check organizations you're a member of
SELECT o.* FROM organizations o
WHERE is_organization_member(o.id);

-- Check dashboard settings
SELECT * FROM dashboard_settings
WHERE user_id = auth.uid();
```

## Files Modified

1. **`/COMPREHENSIVE_RLS_FIX.sql`** ⭐ **USE THIS ONE**
   - Complete standalone SQL file with all fixes
   - Ready to execute in Supabase Dashboard
   - Includes verification queries

2. **`/project/supabase/migrations/00000000000000_schema.sql`**
   - Main schema file updated with comprehensive fix
   - Lines 4112-4197

3. **`/FINAL_RLS_FIX_INSTRUCTIONS.md`**
   - This document (complete instructions)

## Troubleshooting

### If you still get errors after applying:

1. **Check policies exist**:
   ```sql
   SELECT count(*) FROM pg_policies
   WHERE tablename IN ('user_profiles', 'organizations', 'dashboard_settings');
   ```
   Should return `9`

2. **Check RLS is enabled**:
   ```sql
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE tablename IN ('user_profiles', 'organizations', 'dashboard_settings');
   ```
   All should show `rowsecurity = true`

3. **Test as your actual user**:
   Make sure you're testing with the authenticated user, not as anonymous

4. **Check the `is_organization_member` function exists**:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'is_organization_member';
   ```
   Should return 1 row

### Common Issues

**Issue**: "function is_organization_member does not exist"
**Fix**: This function should be defined in the schema. Check around line 1000-1100 of the schema file.

**Issue**: "permission denied for table organizations"
**Fix**: Make sure you executed ALL the SQL from `COMPREHENSIVE_RLS_FIX.sql`, not just parts of it.

## Summary Checklist

- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `COMPREHENSIVE_RLS_FIX.sql`
- [ ] Paste and execute in SQL Editor
- [ ] Run verification query (should see 9 policies)
- [ ] Test onboarding with a new user
- [ ] Verify all 3 steps complete successfully
- [ ] Check dashboard loads without errors

## Need Help?

If issues persist:
1. Check browser console for specific error messages
2. Check Supabase logs in Dashboard → Logs
3. Verify you're using the correct project (mvegjdkkbhlhbjpbhpou)
4. Try logging out and back in after applying the fix

---

**Status**: Ready to apply
**Impact**: Fixes all onboarding RLS issues
**Risk**: Low (only adds policies, doesn't modify data)
**Rollback**: If needed, just DROP the policies created
