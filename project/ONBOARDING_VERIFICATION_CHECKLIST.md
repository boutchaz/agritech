# Onboarding Flow Verification Checklist

**Purpose**: Ensure organization creation and onboarding work out of the box.

## Pre-Flight Check

Before testing onboarding, ensure all these RLS policies are applied:

### ✅ Step 1: Apply Critical RLS Policies to Database

Execute the following SQL file in Supabase Dashboard SQL Editor:
**https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou/sql**

```sql
-- Copy and paste from: CRITICAL_RLS_POLICIES_NEEDED.sql
```

This adds policies for:
- ✅ `farms` (4 policies)
- ✅ `farm_management_roles` (4 policies)
- ✅ `parcels` (4 policies)

### ✅ Step 2: Verify All Policies Exist

Run the verification script:

```sql
-- Copy and paste from: VERIFY_RLS_POLICIES.sql
```

**Expected Result**: Should show 0 tables with "RLS ENABLED but NO POLICIES"

## Complete RLS Policy Inventory (For Onboarding)

These tables must have policies for onboarding to work:

| Table | Policies | Status | Notes |
|-------|----------|--------|-------|
| `user_profiles` | 1 (ALL) | ✅ Applied | Supports upsert operations |
| `organizations` | 4 (CRUD) | ✅ Applied | Any auth user can create |
| `organization_users` | 4 (CRUD) | ✅ Applied | User can join themselves |
| `dashboard_settings` | 4 (CRUD) | ✅ Applied | Optional during onboarding |
| `subscriptions` | 4 (CRUD) | ✅ Applied | Optional trial creation |
| `farms` | 4 (CRUD) | ⚠️ **NEEDS APPLYING** | Required for Step 3 |
| `farm_management_roles` | 4 (CRUD) | ⚠️ **NEEDS APPLYING** | Assigns user as manager |
| `parcels` | 4 (CRUD) | ⚠️ **NEEDS APPLYING** | Future use |

## Onboarding Flow Test Procedure

### Test 1: Sign Up New User

1. **Action**: Create new user account
   ```javascript
   const { data, error } = await supabase.auth.signUp({
     email: 'test-' + Date.now() + '@example.com',
     password: 'Test123!@#'
   });
   ```

2. **Expected**: User created successfully, redirected to onboarding

3. **Verify**: User exists in `auth.users`
   ```sql
   SELECT id, email, created_at FROM auth.users
   WHERE email LIKE 'test-%@example.com'
   ORDER BY created_at DESC LIMIT 5;
   ```

### Test 2: Step 1 - Create Profile

1. **Action**: Fill in profile form
   - First name: "John"
   - Last name: "Doe"
   - Phone: "+1234567890"
   - Timezone: "Africa/Casablanca"

2. **Expected**: Profile saved successfully

3. **Verify**: Profile exists
   ```sql
   SELECT * FROM user_profiles
   WHERE id = (
     SELECT id FROM auth.users
     WHERE email LIKE 'test-%@example.com'
     ORDER BY created_at DESC LIMIT 1
   );
   ```

4. **Common Errors**:
   - ❌ `42501: new row violates row-level security policy`
     - **Fix**: Ensure `user_all_own_profile` policy exists
   - ❌ `PGRST116: Cannot coerce the result to a single JSON object`
     - **Fix**: Check RLS policies with verification script

### Test 3: Step 2 - Create Organization

1. **Action**: Fill in organization form
   - Name: "Test Farm Co"
   - Slug: "test-farm-co"
   - Phone: "+1234567890"
   - Email: test email

2. **Expected**:
   - Organization created
   - User automatically added to `organization_users` with `organization_admin` role

3. **Verify**: Organization and membership exist
   ```sql
   -- Check organization
   SELECT * FROM organizations
   WHERE slug = 'test-farm-co';

   -- Check membership
   SELECT ou.*, o.name as org_name
   FROM organization_users ou
   JOIN organizations o ON o.id = ou.organization_id
   WHERE ou.user_id = (
     SELECT id FROM auth.users
     WHERE email LIKE 'test-%@example.com'
     ORDER BY created_at DESC LIMIT 1
   );
   ```

4. **Common Errors**:
   - ❌ `42501: new row violates row-level security policy for table "organizations"`
     - **Fix**: Ensure `org_write_organizations` policy exists
   - ❌ `42501: new row violates row-level security policy for table "organization_users"`
     - **Fix**: Ensure `org_write_organization_users` policy exists

### Test 4: Step 3 - Create First Farm

1. **Action**: Fill in farm form
   - Name: "Main Farm"
   - Location: "Casablanca, Morocco"
   - Size: 100
   - Unit: "hectares"
   - Type: "main"
   - Description: "Primary farming location"

2. **Expected**:
   - Farm created
   - User assigned as `main_manager` in `farm_management_roles`

3. **Verify**: Farm and role assignment
   ```sql
   -- Check farm
   SELECT * FROM farms
   WHERE organization_id IN (
     SELECT organization_id FROM organization_users
     WHERE user_id = (
       SELECT id FROM auth.users
       WHERE email LIKE 'test-%@example.com'
       ORDER BY created_at DESC LIMIT 1
     )
   );

   -- Check farm role assignment
   SELECT fmr.*, f.name as farm_name
   FROM farm_management_roles fmr
   JOIN farms f ON f.id = fmr.farm_id
   WHERE fmr.user_id = (
     SELECT id FROM auth.users
     WHERE email LIKE 'test-%@example.com'
     ORDER BY created_at DESC LIMIT 1
   );
   ```

4. **Common Errors**:
   - ❌ `42501: new row violates row-level security policy for table "farms"`
     - **Fix**: Apply `CRITICAL_RLS_POLICIES_NEEDED.sql`
   - ❌ `42501: new row violates row-level security policy for table "farm_management_roles"`
     - **Fix**: Apply `CRITICAL_RLS_POLICIES_NEEDED.sql`

### Test 5: Complete Onboarding

1. **Expected**:
   - Redirected to dashboard
   - Organization set as current organization
   - Farm set as current farm
   - Dashboard loads without errors

2. **Verify**: Everything is accessible
   ```sql
   -- Check user can see their data
   SELECT
     'User Profile' as type,
     CASE WHEN EXISTS (
       SELECT 1 FROM user_profiles WHERE id = auth.uid()
     ) THEN '✅ Accessible' ELSE '❌ Blocked' END as status
   UNION ALL
   SELECT
     'Organizations',
     CASE WHEN EXISTS (
       SELECT 1 FROM organizations
       WHERE is_organization_member(id)
     ) THEN '✅ Accessible' ELSE '❌ Blocked' END
   UNION ALL
   SELECT
     'Farms',
     CASE WHEN EXISTS (
       SELECT 1 FROM farms f
       JOIN organizations o ON o.id = f.organization_id
       WHERE is_organization_member(o.id)
     ) THEN '✅ Accessible' ELSE '❌ Blocked' END;
   ```

## Quick Debugging Queries

### Check All Policies for a Table

```sql
SELECT
  policyname,
  cmd,
  qual::text,
  with_check::text
FROM pg_policies
WHERE tablename = 'YOUR_TABLE_NAME'
ORDER BY policyname;
```

### Check if Table Has RLS Enabled

```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'YOUR_TABLE_NAME';
```

### Test if User Can Access Organization

```sql
-- Replace with actual user ID and org ID
SELECT is_organization_member('9a735597-c0a7-495c-b9f7-70842e34e3df');
-- Should return: true
```

### Check Current User's Organizations

```sql
SELECT o.*
FROM organizations o
WHERE is_organization_member(o.id);
```

## Success Criteria

✅ All tests pass without RLS errors
✅ User can create profile, organization, and farm
✅ User can access dashboard after onboarding
✅ No PGRST116 or 42501 errors in browser console
✅ All tables return expected data

## Next Steps After Verification

1. ✅ Test with multiple users
2. ✅ Test organization switching (if user joins multiple orgs)
3. ✅ Test farm switching
4. ✅ Verify subscription limits work (if applicable)

## Rollback Plan

If issues occur:

1. **Remove policies**: Use `DROP POLICY IF EXISTS` for each policy
2. **Disable RLS temporarily**: `ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;`
3. **Debug**: Check error logs in Supabase Dashboard
4. **Re-apply**: Once fixed, re-enable RLS and apply corrected policies

---

**Last Updated**: November 6, 2025
**Status**: Ready for testing
**Required Actions**: Apply CRITICAL_RLS_POLICIES_NEEDED.sql to database
