# 🔧 Fix: Redirect to Tasks When Clicking Work Units

## Problem

When clicking "Unités de travail" (Work Units) in Settings, you're being redirected to `/tasks` instead of seeing the Work Units page.

## Root Cause

The `ProtectedRoute` component (line 21 in `src/components/authorization/ProtectedRoute.tsx`) has a default redirect to `/tasks` when permission is denied:

```typescript
redirectTo = '/tasks',
```

This means **you don't have the required permission** to access Work Units.

**Required Permission**: `can('manage', 'WorkUnit')`

---

## Solution: Check Your User Role

### Step 1: Verify Your Role in Database

Run this SQL query to check your role:

```sql
SELECT
  ou.user_id,
  ou.organization_id,
  ou.role,
  up.email
FROM organization_users ou
JOIN user_profiles up ON up.id = ou.user_id
WHERE ou.user_id = auth.uid()  -- Your current user
  AND ou.organization_id = 'YOUR_ORG_ID';  -- Your current org
```

**Expected Result**: `role` should be **`organization_admin`** or **`system_admin`**

---

### Step 2: Grant Admin Role (If Needed)

If your role is not `organization_admin`, run this:

```sql
-- Update your role to organization admin
UPDATE organization_users
SET role = 'organization_admin'
WHERE user_id = auth.uid()
  AND organization_id = 'YOUR_ORG_ID';
```

Or if you want to be a system admin:

```sql
-- Update your role to system admin
UPDATE organization_users
SET role = 'system_admin'
WHERE user_id = auth.uid()
  AND organization_id = 'YOUR_ORG_ID';
```

---

### Step 3: Refresh Your Browser

After updating the role:
1. **Logout** and **Login** again
2. Or simply **refresh** the page (Ctrl+R or Cmd+R)
3. Click "Unités de travail" again

---

## Alternative: Check in Browser Console

Open browser console (F12) and check for this warning:

```
Access denied to WorkUnit. Required: manage
```

If you see this, it confirms the permission issue.

---

## Quick Test: Verify CASL Permissions

Add this temporary code to your Settings page to debug:

```tsx
import { useCan } from '@/lib/casl/AbilityContext';

function DebugPermissions() {
  const { can } = useCan();

  console.log('Can manage WorkUnit?', can('manage', 'WorkUnit'));
  console.log('Can read WorkUnit?', can('read', 'WorkUnit'));
  console.log('Can manage all?', can('manage', 'all'));

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200">
      <p>Can manage WorkUnit: {can('manage', 'WorkUnit') ? '✅' : '❌'}</p>
      <p>Can read WorkUnit: {can('read', 'WorkUnit') ? '✅' : '❌'}</p>
      <p>Can manage all: {can('manage', 'all') ? '✅' : '❌'}</p>
    </div>
  );
}
```

---

## Permission Requirements by Role

| Role | Can Access Work Units Page | Required Permission |
|------|---------------------------|---------------------|
| **System Admin** | ✅ Yes | `manage('all')` |
| **Org Admin** | ✅ Yes | `manage('WorkUnit')` |
| **Farm Manager** | ❌ No | Only `read('WorkUnit')` |
| **Farm Worker** | ❌ No | Only `read('WorkUnit')` |
| **Day Laborer** | ❌ No | No WorkUnit permission |
| **Viewer** | ❌ No | Only `read('WorkUnit')` |

**Only System Admins and Organization Admins** can access the Work Units settings page.

---

## Fix #1: Make Yourself an Admin

### Via Supabase Dashboard

1. Go to **Supabase Dashboard**
2. Open **Table Editor**
3. Select **`organization_users`** table
4. Find your user (filter by `user_id = your_user_id`)
5. Edit the `role` column
6. Change to: **`organization_admin`**
7. Save

---

## Fix #2: Update CASL Ability Context

If you're sure you're an admin but still getting redirected, the CASL ability might not be loading properly.

### Check AbilityContext

Make sure `AbilityContext` is properly initialized in your app:

```tsx
// In your __root.tsx or App.tsx
import { AbilityProvider } from '@/lib/casl/AbilityContext';

<AbilityProvider>
  {/* Your app */}
</AbilityProvider>
```

---

## Fix #3: Bypass Protection (Development Only)

**⚠️ For debugging only!** Temporarily remove route protection:

```tsx
// In settings.work-units.tsx
// Comment out withRouteProtection
export const Route = createFileRoute('/settings/work-units')({
  // component: withRouteProtection(WorkUnitsSettingsPage, 'manage', 'WorkUnit'),
  component: WorkUnitsSettingsPage,  // Direct access (no protection)
});
```

**Remember to re-enable protection after testing!**

---

## Verification Steps

After applying the fix:

1. ✅ Logout and login again
2. ✅ Go to Settings
3. ✅ Click "Unités de travail"
4. ✅ Should see Work Units page (not tasks)
5. ✅ Can create/edit work units

---

## Still Not Working?

### Check Browser Console

Look for these errors:
- ❌ `Access denied to WorkUnit`
- ❌ Permission check failing
- ❌ Ability not defined

### Check Network Tab

- Does the API call to fetch user profile succeed?
- Is the role correctly returned?
- Is the organization_id correct?

### Clear Cache

```bash
# Clear browser cache
Ctrl+Shift+Delete (Windows/Linux)
Cmd+Shift+Delete (Mac)

# Or hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

---

## Expected Behavior After Fix

### When You're an Admin:

1. Click "Paramètres" (Settings)
2. See "Unités de travail" in menu (with 📦 icon)
3. Click on it
4. **Navigate to `/settings/work-units`** ✅
5. See Work Units Management page
6. Can create/edit work units

### When You're NOT an Admin:

1. Click "Paramètres" (Settings)
2. **"Unités de travail" is hidden** (not in menu)
3. If you try to access `/settings/work-units` directly
4. **Redirected to `/tasks`** with "Access Denied" message

---

## Summary

**Problem**: Redirected to `/tasks` when clicking Work Units

**Cause**: User doesn't have `manage WorkUnit` permission

**Solution**: Make user an `organization_admin` or `system_admin`

**SQL Fix**:
```sql
UPDATE organization_users
SET role = 'organization_admin'
WHERE user_id = auth.uid()
  AND organization_id = 'YOUR_ORG_ID';
```

**After Fix**: Logout/Login and try again ✅

---

## Quick Reference

### Get Your User ID
```sql
SELECT auth.uid();
```

### Get Your Current Role
```sql
SELECT role FROM organization_users
WHERE user_id = auth.uid()
LIMIT 1;
```

### Get Your Current Organization ID
```sql
SELECT organization_id FROM organization_users
WHERE user_id = auth.uid()
LIMIT 1;
```

### Make Yourself Admin
```sql
UPDATE organization_users
SET role = 'organization_admin'
WHERE user_id = auth.uid();
```

---

**Last Updated**: October 31, 2025
**Issue**: Redirect to tasks instead of work units
**Fix**: Grant admin role to user
