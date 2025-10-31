# ✅ CASL Permissions Added for Work Units & Piece-Work

## What Was Done

### 1. Added New Subjects to CASL ✅

**File Modified**: `project/src/lib/casl/ability.ts`

**New Subjects Added**:
```typescript
export type Subject =
  // ... existing subjects
  // Work units (piece-work payment)
  | 'WorkUnit'   // ← NEW: Work units (Arbre, Caisse, Kg, Litre, etc.)
  | 'PieceWork'  // ← NEW: Piece-work records
  | 'all';
```

---

## 2. Permissions by Role

### System Admin
✅ **Full Access to Everything**
```typescript
can('manage', 'all'); // Includes WorkUnit and PieceWork
```

---

### Organization Admin
✅ **Full Access to Work Units & Piece-Work**
```typescript
can('manage', 'WorkUnit');  // Can create, read, update, delete work units
can('manage', 'PieceWork'); // Can create, read, update, delete piece-work records
```

**What they can do**:
- ✅ Access `/settings/work-units`
- ✅ Create/edit/delete work units (Arbre, Caisse, Kg, etc.)
- ✅ View all piece-work records
- ✅ Record piece-work for any worker
- ✅ Approve piece-work
- ✅ Process payments

---

### Farm Manager
✅ **Can Record Piece-Work, View Units**
```typescript
can('read', 'WorkUnit');    // Can view work units (but not create/edit)
can('manage', 'PieceWork'); // Can manage piece-work for their farm
```

**What they can do**:
- ❌ Cannot access `/settings/work-units` (admin only)
- ✅ Can view available work units
- ✅ Can record piece-work for workers
- ✅ Can view/edit/delete piece-work records
- ✅ Can approve piece-work
- ✅ Can process payments

---

### Farm Worker
✅ **Can View Own Piece-Work**
```typescript
can('read', 'WorkUnit');   // Can view work units
can('read', 'PieceWork');  // Can view piece-work (their own only via RLS)
```

**What they can do**:
- ❌ Cannot manage work units
- ❌ Cannot record piece-work (only managers)
- ✅ Can view their own piece-work records
- ✅ Can see how much they've earned

---

### Day Laborer
✅ **Can View Own Piece-Work**
```typescript
can('read', 'PieceWork'); // Can view their own piece-work records only
```

**What they can do**:
- ❌ Cannot see work units
- ❌ Cannot record piece-work
- ✅ Can view their own piece-work records
- ✅ Can see their earnings

---

### Viewer
✅ **Read-Only Access**
```typescript
can('read', 'WorkUnit');   // Can view work units
can('read', 'PieceWork');  // Can view piece-work records
```

**What they can do**:
- ❌ Cannot modify anything
- ✅ Can view work units
- ✅ Can view piece-work records
- ✅ Can view reports

---

## 3. Permission Matrix

| Role | Manage Work Units | Create Work Units | Record Piece-Work | View Own Piece-Work | View All Piece-Work |
|------|-------------------|-------------------|-------------------|---------------------|---------------------|
| **System Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Org Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Farm Manager** | ❌ | ❌ | ✅ | ✅ | ✅ (their farm) |
| **Farm Worker** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Day Laborer** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Viewer** | ❌ | ❌ | ❌ | ✅ | ✅ (read-only) |

---

## 4. Route Protection Updated

### Settings - Work Units Page

**File**: `project/src/routes/settings.work-units.tsx`

**Before**:
```typescript
withRouteProtection(Component, 'manage', 'all')
```

**After** (More Specific):
```typescript
withRouteProtection(Component, 'manage', 'WorkUnit')
```

**Result**: Only users with `can('manage', 'WorkUnit')` permission can access
- ✅ System Admin
- ✅ Organization Admin
- ❌ Everyone else

---

## 5. How to Use in Components

### Check Permission Before Showing UI

```tsx
import { useCan } from '@/lib/casl/AbilityContext';

function MyComponent() {
  const { can } = useCan();

  // Check if user can manage work units
  const canManageUnits = can('manage', 'WorkUnit');

  // Check if user can record piece-work
  const canRecordPieceWork = can('create', 'PieceWork');

  // Check if user can view piece-work
  const canViewPieceWork = can('read', 'PieceWork');

  return (
    <div>
      {canManageUnits && (
        <Link to="/settings/work-units">
          Manage Work Units
        </Link>
      )}

      {canRecordPieceWork && (
        <Button onClick={recordPieceWork}>
          Record Piece Work
        </Button>
      )}

      {canViewPieceWork && (
        <PieceWorkList />
      )}
    </div>
  );
}
```

### Use Can Component

```tsx
import { Can } from '@/components/authorization/Can';

<Can I="manage" a="WorkUnit">
  <Button>Edit Work Units</Button>
</Can>

<Can I="create" a="PieceWork">
  <PieceWorkEntry />
</Can>

<Can I="read" a="PieceWork">
  <PieceWorkList />
</Can>
```

### Protect Routes

```tsx
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

export const Route = createFileRoute('/my-route')({
  component: withRouteProtection(
    MyComponent,
    'manage',    // action
    'WorkUnit'   // resource
  ),
});
```

---

## 6. Combined with RLS

CASL permissions work **together** with Row Level Security (RLS):

### Frontend (CASL)
- Controls what UI elements are visible
- Prevents unauthorized actions in the app
- Fast client-side checks

### Backend (RLS)
- Enforces permissions at database level
- Prevents direct database access
- Secure server-side validation

**Example**:
```typescript
// Frontend: CASL hides button for non-managers
const canRecord = can('create', 'PieceWork'); // false for farm workers

// Backend: RLS blocks insert even if they try directly
INSERT INTO piece_work_records ... // ❌ Fails for farm workers
```

**Both layers work together** for complete security! 🔒

---

## 7. Testing Permissions

### Test as Different Roles

```sql
-- Make user an organization admin
UPDATE organization_users
SET role = 'organization_admin'
WHERE user_id = 'user-id' AND organization_id = 'org-id';

-- Make user a farm manager
UPDATE organization_users
SET role = 'farm_manager'
WHERE user_id = 'user-id' AND organization_id = 'org-id';

-- Make user a farm worker
UPDATE organization_users
SET role = 'farm_worker'
WHERE user_id = 'user-id' AND organization_id = 'org-id';
```

### Test Checklist

| Test | Org Admin | Farm Manager | Farm Worker |
|------|-----------|--------------|-------------|
| Can see "Unités de travail" in settings | ✅ | ❌ | ❌ |
| Can access `/settings/work-units` | ✅ | ❌ | ❌ |
| Can create work units | ✅ | ❌ | ❌ |
| Can edit work units | ✅ | ❌ | ❌ |
| Can view work units in dropdowns | ✅ | ✅ | ✅ |
| Can record piece-work | ✅ | ✅ | ❌ |
| Can view all piece-work | ✅ | ✅ (farm) | ❌ |
| Can view own piece-work | ✅ | ✅ | ✅ |

---

## 8. Error Messages

When users try to access without permission:

### Via Route Protection
```
"You don't have permission to access this page"
```

### Via Component Protection
- Component/button simply doesn't render
- No error message (cleaner UX)

### Via Direct API Call
```
"Permission denied" (from RLS)
```

---

## 9. Summary of Changes

| File | Changes | Status |
|------|---------|--------|
| `project/src/lib/casl/ability.ts` | Added `WorkUnit` and `PieceWork` subjects | ✅ |
| `project/src/lib/casl/ability.ts` | Added permissions for all roles | ✅ |
| `project/src/routes/settings.work-units.tsx` | Updated route protection to use `WorkUnit` | ✅ |

---

## 10. Documentation Updated

The following docs now include CASL information:

- ✅ CASL types updated with new subjects
- ✅ Permissions defined for all roles
- ✅ Route protection using correct resource
- ✅ Ready for use in components

---

## 11. Next Steps

### For Developers

1. **Use CASL checks** in your components:
   ```tsx
   const { can } = useCan();
   if (can('manage', 'WorkUnit')) {
     // Show admin UI
   }
   ```

2. **Use Can component** for conditional rendering:
   ```tsx
   <Can I="create" a="PieceWork">
     <RecordButton />
   </Can>
   ```

3. **Protect routes** with proper resources:
   ```tsx
   withRouteProtection(Component, 'manage', 'WorkUnit')
   ```

### For Testing

1. Test with different user roles
2. Verify permissions work as expected
3. Check that RLS + CASL work together
4. Ensure UI hides properly based on permissions

---

## 12. Permission Reference

Quick reference for developers:

```typescript
// Work Units
can('manage', 'WorkUnit')  // Create, read, update, delete units
can('create', 'WorkUnit')  // Create new units
can('read', 'WorkUnit')    // View units
can('update', 'WorkUnit')  // Edit units
can('delete', 'WorkUnit')  // Delete units

// Piece-Work
can('manage', 'PieceWork')  // Full access to piece-work
can('create', 'PieceWork')  // Record piece-work
can('read', 'PieceWork')    // View piece-work
can('update', 'PieceWork')  // Edit piece-work
can('delete', 'PieceWork')  // Delete piece-work
```

---

## ✅ Complete!

All CASL permissions are now configured for Work Units and Piece-Work:

- ✅ Types added to CASL
- ✅ Permissions defined for all roles
- ✅ Routes protected properly
- ✅ Ready to use in components
- ✅ Works with RLS for security

**Your app now has complete permission control for the unit management system!** 🎉

---

**Last Updated**: October 31, 2025
**Version**: 1.0.0
**Status**: ✅ COMPLETE
