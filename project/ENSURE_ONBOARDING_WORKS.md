# How to Ensure Organization Creation Works Out of the Box

## Quick Start

To guarantee onboarding works, you need to apply **one more SQL file** to your database.

### ⚡ Action Required

1. **Go to Supabase SQL Editor**:
   https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou/sql

2. **Copy and execute**: `CRITICAL_RLS_POLICIES_NEEDED.sql`

3. **Verify**: Run the verification query at the bottom

That's it! Your onboarding flow will now work end-to-end.

---

## What Was the Issue?

When we fixed the initial onboarding RLS issue, we discovered that while `user_profiles`, `organizations`, and `dashboard_settings` were blocking access, there were **additional critical tables** that also had RLS enabled but no policies:

### Critical Tables Missing Policies

| Table | Impact | Status |
|-------|--------|--------|
| `user_profiles` | ✅ FIXED | Step 1: Profile creation |
| `organizations` | ✅ FIXED | Step 2: Org creation |
| `dashboard_settings` | ✅ FIXED | Dashboard loading |
| `farms` | ⚠️ **NEEDS FIX** | Step 3: Farm creation |
| `farm_management_roles` | ⚠️ **NEEDS FIX** | Step 3: Role assignment |
| `parcels` | ⚠️ **NEEDS FIX** | Future: Adding parcels |

## What We've Done

### ✅ Already Applied (Working)

These RLS policies are already in your database and working:

1. **user_profiles** (1 policy)
   - Users can manage their own profile
   - Supports `.upsert()` for onboarding

2. **organizations** (4 policies)
   - Any authenticated user can create organization
   - Members can view/update their organizations

3. **organization_users** (4 policies)
   - Users can add themselves to organizations
   - Users can view their own memberships

4. **dashboard_settings** (4 policies)
   - Users manage settings for their organizations

### ⚠️ Still Need to Apply

These policies are **prepared in the schema file** but need to be applied to your database:

5. **farms** (4 policies)
   - Organization members can CRUD farms
   - Critical for Step 3 of onboarding

6. **farm_management_roles** (4 policies)
   - Assigns user as farm manager
   - Critical for Step 3 of onboarding

7. **parcels** (4 policies)
   - Organization members can CRUD parcels
   - Needed when users add parcels later

## Files Available

### 1. CRITICAL_RLS_POLICIES_NEEDED.sql ⭐
**USE THIS NOW**
- Contains policies for farms, farm_management_roles, parcels
- Ready to execute in Supabase Dashboard
- Includes verification queries

### 2. VERIFY_RLS_POLICIES.sql
**USE THIS TO CHECK**
- Scans all 101 tables with RLS enabled
- Shows which tables are missing policies
- Helps prevent future issues

### 3. ONBOARDING_VERIFICATION_CHECKLIST.md
**USE THIS TO TEST**
- Complete step-by-step testing guide
- SQL queries to verify each step
- Common error solutions

### 4. Schema File (Already Updated)
`project/supabase/migrations/00000000000000_schema.sql`
- Lines 4199-4297: New policies added
- Will be applied automatically on fresh database deployments

## Step-by-Step Instructions

### Step 1: Apply Missing Policies

```sql
-- Execute this in Supabase SQL Editor
-- Copy from: CRITICAL_RLS_POLICIES_NEEDED.sql

-- FARMS RLS POLICIES (4 policies)
-- FARM_MANAGEMENT_ROLES RLS POLICIES (4 policies)
-- PARCELS RLS POLICIES (4 policies)
```

### Step 2: Verify Policies Were Created

```sql
-- Check that all policies exist
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('farms', 'farm_management_roles', 'parcels')
GROUP BY tablename
ORDER BY tablename;

-- Expected result:
-- farms: 4
-- farm_management_roles: 4
-- parcels: 4
```

### Step 3: Run Comprehensive Verification

```sql
-- Copy from: VERIFY_RLS_POLICIES.sql
-- Should show 0 tables with "RLS ENABLED but NO POLICIES"
```

### Step 4: Test Complete Onboarding Flow

Follow the checklist in `ONBOARDING_VERIFICATION_CHECKLIST.md`:

1. ✅ Sign up new user
2. ✅ Step 1: Create profile
3. ✅ Step 2: Create organization
4. ✅ Step 3: Create first farm
5. ✅ Verify dashboard loads

## Expected Results After Fix

### Before Applying Policies

```json
// Step 3: Creating farm
{
    "code": "42501",
    "message": "new row violates row-level security policy for table \"farms\""
}
```

### After Applying Policies

```javascript
// Step 3: Creating farm
✅ Farm created successfully
✅ User assigned as main_manager
✅ Redirected to dashboard
✅ All data accessible
```

## Database Policy Summary

After applying all fixes, you'll have:

| Category | Tables | Total Policies |
|----------|--------|----------------|
| **User Management** | user_profiles | 1 |
| **Organization** | organizations, organization_users | 8 |
| **Farm Hierarchy** | farms, farm_management_roles, parcels | 12 |
| **Settings** | dashboard_settings | 4 |
| **Subscriptions** | subscriptions | 4 |
| **Total** | 7 tables | 29 policies |

## Future Protection

To prevent this issue from happening again:

### When Adding New Tables

```sql
-- ❌ DON'T do this:
CREATE TABLE new_table (...);
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
-- (and forget to add policies!)

-- ✅ DO this:
CREATE TABLE new_table (...);
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Immediately add at least one policy:
CREATE POLICY "basic_access" ON new_table
  FOR ALL USING (
    is_organization_member(organization_id)
  );
```

### Regular Audits

Run this periodically:

```sql
-- Copy from: VERIFY_RLS_POLICIES.sql
-- Check for tables with RLS but no policies
```

## Troubleshooting

### Issue: Policies Won't Apply

**Error**: `syntax error at or near "CREATE"`

**Solution**: Make sure you're running the SQL as a single batch in the SQL Editor, not line by line.

### Issue: Verification Shows Missing Policies

**Solution**:
1. Check if SQL executed completely (scroll to bottom of results)
2. Re-run the CRITICAL_RLS_POLICIES_NEEDED.sql
3. Check for typos in table names

### Issue: Onboarding Still Fails

**Debug Steps**:
1. Check browser console for specific error
2. Run verification queries from checklist
3. Test `is_organization_member()` function works
4. Verify user has correct role in organization_users

## Success Checklist

- [ ] Applied CRITICAL_RLS_POLICIES_NEEDED.sql
- [ ] Verified 12 new policies created (4+4+4)
- [ ] Ran VERIFY_RLS_POLICIES.sql - 0 tables blocking
- [ ] Tested complete onboarding flow - all 3 steps work
- [ ] Dashboard loads without errors
- [ ] Can create multiple organizations/farms

## Support

If issues persist after following this guide:

1. **Check**: Browser console for specific error codes
2. **Verify**: All SQL files executed completely
3. **Test**: Individual policy with `EXPLAIN` queries
4. **Review**: Supabase Dashboard logs

---

**Status**: Ready to apply
**Estimated Time**: 5 minutes
**Risk Level**: Low (only adds policies, no data changes)
**Rollback**: Can drop policies if needed

## Summary

**The Fix**: Apply `CRITICAL_RLS_POLICIES_NEEDED.sql` to database

**Why**: Farms and farm_management_roles tables had RLS enabled but no policies

**Impact**: Enables complete onboarding flow from signup to dashboard

**Next**: Follow ONBOARDING_VERIFICATION_CHECKLIST.md to test

🎯 **Goal**: Onboarding works out of the box for all new users!
