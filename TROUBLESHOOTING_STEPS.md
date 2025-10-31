# 🔧 Troubleshooting: Can't Access Work Units

## Step-by-Step Diagnosis

### Step 1: Access the Debug Page

I created a special debug page that shows you **exactly** what's wrong.

**Go to**: `http://localhost:5173/settings/work-units-debug`

This page will show you:
- ✅ Your current email and user ID
- ✅ Your current organization
- ✅ Your current role (THIS IS KEY!)
- ✅ All CASL permissions
- ✅ Whether you have access or not

**Screenshot or copy the information** from the debug page and share it.

---

### Step 2: Run Diagnostic SQL

Open **Supabase SQL Editor** and run this:

**File**: `debug-access-issue.sql`

```sql
-- Query 1: Check your current role
SELECT
  auth.uid() AS my_user_id,
  ou.role AS my_current_role,
  o.name AS org_name,
  up.email AS my_email
FROM organization_users ou
LEFT JOIN organizations o ON o.id = ou.organization_id
LEFT JOIN user_profiles up ON up.id = ou.user_id
WHERE ou.user_id = auth.uid();
```

**Share the result** of this query. It should show:
- `my_user_id`: Your UUID
- `my_current_role`: Should be `organization_admin` or `system_admin`
- `org_name`: Your organization name
- `my_email`: Your email

---

### Step 3: Fix Based on Debug Info

Based on what the debug page shows, choose the appropriate fix:

#### Case A: Role is NOT `organization_admin`

**Problem**: Debug page shows role like `farm_manager`, `farm_worker`, etc.

**Fix**: Run this SQL:
```sql
UPDATE organization_users
SET role = 'organization_admin'
WHERE user_id = auth.uid();
```

Then:
1. **Logout** completely
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Login** again
4. Try accessing work units again

#### Case B: Role IS `organization_admin` but still no access

**Problem**: Debug page shows correct role but `Can manage WorkUnit` is ❌ NO

**Possible Issues**:
1. CASL ability not loading properly
2. AbilityContext not initialized
3. User context not updated

**Fix**: Check if `AbilityProvider` is wrapping your app.

Look in `src/routes/__root.tsx`:

```tsx
import { AbilityProvider } from '@/lib/casl/AbilityContext';

// Should have something like:
<AbilityProvider>
  <Outlet />
</AbilityProvider>
```

#### Case C: Everything looks correct but still redirects

**Problem**: Debug page shows everything correct, but clicking regular link still redirects

**Fix**: There might be a caching issue.

1. **Hard refresh**: Ctrl+Shift+R (Cmd+Shift+R on Mac)
2. **Clear all cache**:
   ```
   Chrome: chrome://settings/clearBrowserData
   Firefox: about:preferences#privacy
   Safari: Safari > Clear History
   ```
3. **Restart dev server**:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

---

### Step 4: Test with Debug Page

After applying any fixes:

1. Go to: `http://localhost:5173/settings/work-units-debug`
2. Check all the values
3. If "Can manage WorkUnit" shows ✅ YES
4. You should see the Work Units Management component
5. Then try the regular link: `http://localhost:5173/settings/work-units`

---

## Common Issues & Solutions

### Issue 1: "Role shows as farm_manager"

**Why**: You were assigned farm_manager role initially

**Fix**:
```sql
UPDATE organization_users
SET role = 'organization_admin'
WHERE user_id = auth.uid();
```

**Then**: Logout and login

---

### Issue 2: "Auth.uid() returns null"

**Why**: Not logged in or session expired

**Fix**:
1. Logout completely
2. Clear cookies
3. Login again
4. Check: `SELECT auth.uid();` should return your UUID

---

### Issue 3: "Multiple organizations showing"

**Why**: You're member of multiple orgs with different roles

**Fix**: Make sure you're admin in the **current** organization:
```sql
UPDATE organization_users
SET role = 'organization_admin'
WHERE user_id = auth.uid()
  AND organization_id = 'YOUR_CURRENT_ORG_ID';
```

Get your current org ID:
```sql
SELECT id, name FROM organizations;
```

---

### Issue 4: "CASL shows no permissions at all"

**Why**: AbilityContext not initialized or user context not loaded

**Fix**: Check browser console for errors:
1. Press F12
2. Look for errors related to:
   - `AbilityContext`
   - `defineAbilitiesFor`
   - `User context not found`

If you see errors, the AbilityProvider might not be set up correctly.

---

### Issue 5: "Ability rules array is empty"

**Why**: Ability not computed yet or user role not loaded

**Fix**: Wait a moment and refresh. If still empty:
1. Check if `userRole` is loaded in debug page
2. Check if `currentOrganization` is loaded
3. Verify subscription is loaded

---

## Emergency Bypass (Testing Only!)

If you need to test the Work Units page **right now** while debugging:

### Option 1: Remove Route Protection

Edit `src/routes/settings.work-units.tsx`:

```tsx
// Comment out the protection
export const Route = createFileRoute('/settings/work-units')({
  // component: withRouteProtection(WorkUnitsSettingsPage, 'manage', 'WorkUnit'),
  component: WorkUnitsSettingsPage,  // Direct access
});
```

**⚠️ Remember to re-enable protection before deploying!**

### Option 2: Change Default Redirect

Edit `src/components/authorization/ProtectedRoute.tsx` line 21:

```tsx
// Change from:
redirectTo = '/tasks',

// To:
redirectTo = '/dashboard',  // Or any page you prefer
```

---

## What to Share for Help

If still not working, share:

1. **Screenshot of debug page** (`/settings/work-units-debug`)
2. **Result of SQL query**:
   ```sql
   SELECT auth.uid(), ou.role, o.name
   FROM organization_users ou
   JOIN organizations o ON o.id = ou.organization_id
   WHERE ou.user_id = auth.uid();
   ```
3. **Browser console errors** (F12 → Console tab)
4. **Network tab** (F12 → Network → Look for failed API calls)

---

## Expected Values (Working State)

When everything is working, you should see:

### On Debug Page:
```
Email: your@email.com
User ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Organization: Your Org Name
Org ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy

Role Name: organization_admin  ✅
Role Level: 2  ✅

Can manage 'all': ❌ NO (or ✅ YES if system_admin)
Can manage 'WorkUnit': ✅ YES
Can read 'WorkUnit': ✅ YES
Can manage 'PieceWork': ✅ YES
```

### In SQL:
```
my_user_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
my_current_role: organization_admin
org_name: Your Organization
my_email: your@email.com
```

---

## Quick Checklist

- [ ] Ran SQL to check role
- [ ] Updated role to `organization_admin` if needed
- [ ] Logged out completely
- [ ] Logged in again
- [ ] Cleared browser cache
- [ ] Went to debug page (`/settings/work-units-debug`)
- [ ] Verified "Can manage WorkUnit" shows ✅ YES
- [ ] Tried accessing regular work units page
- [ ] Checked browser console for errors

---

## Files Created for You

1. **`debug-access-issue.sql`** - Diagnostic SQL queries
2. **`settings.work-units-debug.tsx`** - Debug route (no protection)
3. **`fix-admin-role.sql`** - Quick fix SQL script
4. **`TROUBLESHOOTING_STEPS.md`** - This file

---

## Next Steps

1. **Go to debug page**: `http://localhost:5173/settings/work-units-debug`
2. **Take screenshot** or copy the info
3. **Share it** so I can see exactly what's wrong
4. **Apply the appropriate fix** based on what it shows

---

**The debug page will tell us exactly what's blocking your access!** 🔍

Let me know what you see on the debug page and I'll help you fix it.
