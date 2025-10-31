# Race Condition Final Fix - Work Units Access Issue

## Problem Summary

Users with `organization_admin` role were being redirected to `/tasks` when trying to access `/settings/work-units`, despite having the correct permissions.

### Root Cause

The `ProtectedRoute` component was checking permissions before the authentication context fully loaded, causing a **race condition**:

1. Page loads → `MultiTenantAuthProvider` starts loading user data
2. While `authLoading = true`, `user = null`, `currentOrganization = null`, `userRole = null`
3. `AbilityContext` receives null values and returns a **guest ability** (with rules, but no permissions)
4. `ProtectedRoute` sees `ability.rules.length > 0` ✅ (thinks it's loaded)
5. Checks permission with **guest ability** → `ability.can('manage', 'WorkUnit')` returns `false` ❌
6. Redirects to `/tasks` before auth finishes loading

### Why Guest Ability Had Rules

In `AbilityContext.tsx` (lines 79-87):
```typescript
if (!user || !currentOrganization || !userRole) {
  // Guest ability - can do nothing
  return defineAbilitiesFor({
    userId: '',
    organizationId: '',
    role: { name: 'viewer', level: 999 },
    subscription: null,
    currentCounts: { farms: 0, parcels: 0, users: 0, satelliteReports: 0 },
  });
}
```

This guest ability **has rules** (from `defineAbilitiesFor`), so `ability.rules.length > 0` was `true`, but all permissions were denied.

## Solution

Modified `ProtectedRoute.tsx` to wait for **BOTH** conditions:

### Before (Incorrect)
```typescript
// Only checked if ability rules were loaded
const hasRulesLoaded = ability.rules && ability.rules.length > 0;

if (hasRulesLoaded && !ability.can(action, subject)) {
  navigate({ to: redirectTo }); // ❌ Redirects with guest ability
}
```

### After (Correct)
```typescript
// Check BOTH auth loading AND ability rules
const hasRulesLoaded = ability.rules && ability.rules.length > 0;
const authFullyLoaded = !authLoading && user && currentOrganization && userRole;
const isReady = hasRulesLoaded && authFullyLoaded;

useEffect(() => {
  // Only check permission after BOTH auth and rules are fully loaded
  if (isReady && !ability.can(action, subject)) {
    console.warn(`Access denied to ${subject}. Required: ${action}`, {
      user: user?.email,
      role: userRole?.role_name,
      organization: currentOrganization?.name,
    });
    navigate({ to: redirectTo });
  }
}, [ability, action, subject, navigate, redirectTo, isReady, user, userRole, currentOrganization]);

// Show loading while auth is loading OR rules aren't loaded yet
if (!isReady) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {authLoading ? 'Loading authentication...' : 'Loading permissions...'}
        </p>
      </div>
    </div>
  );
}
```

## Key Changes

1. **Import auth context**: `import { useAuth } from '../MultiTenantAuthProvider';`
2. **Check auth loading state**: `const { loading: authLoading, user, currentOrganization, userRole } = useAuth();`
3. **Combined ready check**: `const isReady = hasRulesLoaded && authFullyLoaded;`
4. **Better loading message**: Shows "Loading authentication..." vs "Loading permissions..." based on state
5. **Enhanced access denied page**: Shows required action, subject, and user's current role

## Files Modified

- **`project/src/components/authorization/ProtectedRoute.tsx`** - Added auth loading check

## Testing

After this fix:

1. Navigate to `/settings/work-units`
2. You should see "Loading authentication..." briefly
3. Then "Loading permissions..." (very brief)
4. Then the Work Units Management page loads ✅

### Debug Page

Visit `/settings/work-units-debug` to verify:
- ✅ Email and User ID should be populated
- ✅ Role Name: organization_admin
- ✅ Can manage 'WorkUnit': ✅ YES
- ✅ Ability Rules: [Array with rules]
- ✅ Work Units Management component displayed

## Timeline of Fixes

1. **First attempt**: Added `ability.rules.length > 0` check → Still failed (guest ability has rules)
2. **Debug discovery**: Created debug page showing `ability.rules: []` and "Email: Not loaded"
3. **Root cause identified**: Race condition - checking permissions before auth loaded
4. **Final fix**: Combined check for both `authFullyLoaded` AND `hasRulesLoaded`

## Prevention

This pattern should be used in all route protection scenarios:

```typescript
// Always check both auth state AND ability state
const authFullyLoaded = !authLoading && user && currentOrganization && userRole;
const isReady = hasRulesLoaded && authFullyLoaded;

if (!isReady) {
  return <LoadingSpinner />;
}
```

## Related Components

- `MultiTenantAuthProvider.tsx` - Auth context with comprehensive loading state
- `AbilityContext.tsx` - CASL ability provider that returns guest ability when auth not loaded
- `ProtectedRoute.tsx` - Route protection wrapper (NOW FIXED)
- `withRouteProtection.tsx` - HOC that uses ProtectedRoute

## Next Steps

If users still experience issues:
1. Clear browser cache and localStorage
2. Logout and login again
3. Check console for any errors
4. Visit debug page to verify auth/permission state
