# Authorization Guards Implementation

## ✅ Implemented Guards

### 1. **FarmHierarchyTree Component**
**File**: `src/components/FarmHierarchyTree.tsx`

**Guards Added**:
- ✅ **Create Parcel**: Checks subscription limits before showing "Add Parcel" button
- ✅ **Edit Parcel**: Only shows edit button if user has `update` permission on `Parcel`
- ✅ **Delete Parcel**: Only shows delete button if user has `delete` permission on `Parcel`

**Example**:
```tsx
<Can
  I="create"
  a="Parcel"
  fallback={<div>Upgrade your plan to add more parcels</div>}
>
  <button>Ajouter une parcelle</button>
</Can>
```

### 2. **UsersSettings Component**
**File**: `src/components/UsersSettings.tsx`

**Guards Added**:
- ✅ **Invite User**: Checks both role permission AND subscription user limit
- ✅ **Limit Warning**: Shows warning when approaching user limit

**Example**:
```tsx
<Can I="invite" a="User" fallback={<div>Upgrade to invite more users</div>}>
  <PermissionGuard resource="users" action="create">
    <button>Inviter un utilisateur</button>
  </PermissionGuard>
</Can>

<LimitWarning resourceType="users" currentCount={users.length} />
```

### 3. **Satellite Analysis Page**
**File**: `src/routes/satellite-analysis.tsx`

**Guards Added**:
- ✅ **Feature Access**: Blocks entire page if subscription doesn't include satellite reports
- ✅ **Upgrade Prompt**: Shows beautiful upgrade screen with feature benefits

**Example**:
```tsx
if (!can('create', 'SatelliteReport')) {
  return (
    <div>
      <h2>Satellite Analysis - Professional Feature</h2>
      <p>Unlock powerful satellite imagery analysis...</p>
      <button onClick={() => navigate('/settings/subscription')}>
        Upgrade to Professional
      </button>
    </div>
  );
}
```

## 🔒 Backend Enforcement (RLS)

All frontend guards are backed by database-level Row Level Security policies:

### Farms Table
```sql
-- Can only create if admin role AND within subscription limits
CREATE POLICY "farms_insert_policy"
  ON public.farms FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_role(auth.uid(), organization_id, ARRAY['system_admin', 'organization_admin'])
    AND public.can_create_resource(organization_id, 'farm') = true
  );
```

### Parcels Table
```sql
-- Can only create if has permission AND within limits
CREATE POLICY "parcels_insert_policy"
  ON public.parcels FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farms f
      WHERE f.id = farm_id
        AND public.user_has_role(auth.uid(), f.organization_id,
            ARRAY['system_admin', 'organization_admin', 'farm_manager'])
        AND public.can_create_resource(f.organization_id, 'parcel') = true
    )
  );
```

### Organization Users Table
```sql
-- Handled by invite-user Edge Function with limit checking
```

## 📊 Permission Matrix

| Feature | Essential | Professional | Enterprise | Roles Required |
|---------|-----------|--------------|------------|----------------|
| Create Farms | 2 max | 10 max | Unlimited | Admin |
| Create Parcels | 25 max | 200 max | Unlimited | Admin, Manager |
| Invite Users | 5 max | 25 max | Unlimited | Admin |
| Edit Parcels | ✅ | ✅ | ✅ | Admin, Manager |
| Delete Parcels | ✅ | ✅ | ✅ | Admin, Manager |
| Satellite Analysis | ❌ | ✅ (10/mo) | ✅ (Unlimited) | All |
| View Analytics | ❌ | ✅ | ✅ | All |
| API Access | ❌ | ❌ | ✅ | Admin |

## 🎯 User Experience

### When Limit Reached
**Before Guard**:
- User clicks "Create" button
- API returns error
- Confusing error message
- Bad UX

**After Guard**:
- "Create" button hidden or disabled
- Shows friendly message: "Upgrade to create more farms"
- `<LimitWarning>` shows before reaching limit
- Clear call-to-action to upgrade
- Great UX!

### When Feature Not Available
**Satellite Analysis (Essential Plan)**:
```
┌─────────────────────────────────────────────┐
│  🔒 Satellite Analysis - Professional Feature │
│                                               │
│  Unlock powerful satellite imagery analysis   │
│  to monitor crop health...                    │
│                                               │
│  ✓ Real-time satellite imagery analysis      │
│  ✓ Vegetation health monitoring              │
│  ✓ Historical trends                         │
│                                               │
│  [ Upgrade to Professional → ]               │
└─────────────────────────────────────────────┘
```

## 🧪 Testing Guards

### Test Create Parcel with Limit
```tsx
// Setup: User has 25 parcels (Essential plan limit)
const { data: subscription } = useSubscription();
const parcelsCount = 25;

// Guard should block
const { can } = useCan();
expect(can('create', 'Parcel')).toBe(false);

// UI should show upgrade message
<Can I="create" a="Parcel">
  <button>Add Parcel</button> {/* Not shown */}
</Can>
```

### Test Satellite Access
```tsx
// Setup: User on Essential plan
const { can } = useCan();
expect(can('create', 'SatelliteReport')).toBe(false);

// Page should show upgrade screen
if (!can('create', 'SatelliteReport')) {
  return <UpgradeScreen />;
}
```

## 📝 Adding New Guards

### Step 1: Define Permission in CASL
`src/lib/casl/ability.ts`
```typescript
// Add new action
export type Action = 'create' | 'read' | 'my_action';

// Define rule
if (subscription.has_my_feature) {
  can('my_action', 'MyResource');
}
```

### Step 2: Add RLS Policy
```sql
CREATE POLICY "my_resource_policy"
  ON public.my_resource FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_role(auth.uid(), organization_id, ARRAY['admin'])
    AND public.has_valid_subscription(organization_id) = true
  );
```

### Step 3: Use in Component
```tsx
<Can I="my_action" a="MyResource" fallback={<UpgradePrompt />}>
  <button>Do Action</button>
</Can>
```

## 🔐 Security Checklist

- ✅ All create/update/delete operations have guards
- ✅ Subscription limits enforced on frontend AND backend
- ✅ Feature flags checked before rendering premium features
- ✅ Role permissions validated at component level
- ✅ RLS policies mirror CASL rules
- ✅ Edge Functions validate permissions server-side
- ✅ Friendly upgrade prompts instead of errors
- ✅ Limit warnings shown proactively

## 📚 Related Documentation

- [Authorization Guide](./AUTHORIZATION_GUIDE.md) - Complete system overview
- [CASL Docs](https://casl.js.org/v6/en/) - Frontend authorization library
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security) - Backend security
