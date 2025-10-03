# Centralized Authorization System

A complete authorization system combining **CASL** (frontend) and **Supabase RLS** (backend) to manage role-based access control and subscription limits.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │ ────▶│     CASL     │ ────▶│  Component  │
│  Component  │      │   Abilities  │      │  Renders    │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │
       │                     ▼
       │              ┌──────────────┐
       └─────────────▶│   Supabase   │
                      │  API + RLS   │
                      └──────────────┘
```

## Usage Examples

### 1. Conditional Rendering Based on Permissions

```tsx
import { Can } from './components/authorization/Can';

function FarmsList() {
  return (
    <div>
      <Can I="create" a="Farm">
        <button>Create New Farm</button>
      </Can>

      <Can I="create" a="Farm" fallback={<div>Upgrade to create more farms</div>}>
        <button>Create New Farm</button>
      </Can>
    </div>
  );
}
```

### 2. Programmatic Permission Checks

```tsx
import { useCan } from '../lib/casl/AbilityContext';

function FarmActions() {
  const { can, cannot } = useCan();

  const handleCreate = () => {
    if (cannot('create', 'Farm')) {
      alert('You cannot create farms. Upgrade your subscription.');
      return;
    }

    // Create farm logic
  };

  return (
    <button
      onClick={handleCreate}
      disabled={cannot('create', 'Farm')}
    >
      Create Farm
    </button>
  );
}
```

### 3. Show Limit Warnings

```tsx
import { LimitWarning } from './components/authorization/LimitWarning';

function FarmsPage() {
  const { data: farms } = useFarms();

  return (
    <div>
      <LimitWarning
        resourceType="farms"
        currentCount={farms.length}
        className="mb-4"
      />
      {/* Rest of page */}
    </div>
  );
}
```

### 4. Check Subscription Features

```tsx
import { useCan } from '../lib/casl/AbilityContext';

function AnalyticsPage() {
  const { can } = useCan();

  if (!can('view_analytics', 'Analytics')) {
    return (
      <div>
        <h2>Analytics Not Available</h2>
        <p>Upgrade to Professional or Enterprise to access analytics.</p>
      </div>
    );
  }

  return <AnalyticsDashboard />;
}
```

## Permission Matrix

### Role-Based Permissions

| Action | System Admin | Org Admin | Farm Manager | Farm Worker | Day Laborer | Viewer |
|--------|-------------|-----------|--------------|-------------|-------------|--------|
| Manage Organizations | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Farms | ✅ | ✅ | Update only | ❌ | ❌ | ❌ |
| Manage Parcels | ✅ | ✅ | ✅ | Read only | Read only | Read only |
| Create Analyses | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage Costs | ✅ | ✅ | ✅ | Read only | ❌ | Read only |
| View Reports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Subscription-Based Limits

| Resource | Essential | Professional | Enterprise |
|----------|-----------|--------------|------------|
| Farms | 2 | 10 | Unlimited |
| Parcels | 25 | 200 | Unlimited |
| Users | 5 | 25 | Unlimited |
| Satellite Reports | 0 | 10/month | Unlimited |
| Analytics | ❌ | ✅ | ✅ |
| Sensors | ❌ | ✅ | ✅ |
| Advanced Reporting | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ |

## Backend Enforcement (RLS)

All permissions are enforced at the database level using Row Level Security:

### Example RLS Policy

```sql
-- Users can only create farms if they're admin AND within subscription limits
CREATE POLICY "farms_insert_policy"
  ON public.farms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_role(
      auth.uid(),
      organization_id,
      ARRAY['system_admin', 'organization_admin']
    )
    AND public.can_create_resource(organization_id, 'farm') = true
  );
```

### Helper Functions

```sql
-- Check if user has specific role
public.user_has_role(user_id, org_id, role_names[])

-- Check if subscription allows creating resource
public.can_create_resource(org_id, resource_type)

-- Check if subscription is valid
public.has_valid_subscription(org_id)
```

## Adding New Permissions

### 1. Frontend (CASL)

Edit `src/lib/casl/ability.ts`:

```typescript
// Add new action
export type Action =
  | 'create' | 'read' | 'update' | 'delete'
  | 'my_new_action'; // Add here

// Add new subject
export type Subject =
  | 'Farm' | 'Parcel'
  | 'MyNewResource'; // Add here

// Define ability
export function defineAbilitiesFor(context: UserContext): AppAbility {
  const { can } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (role.name === 'organization_admin') {
    can('my_new_action', 'MyNewResource');
  }

  return build();
}
```

### 2. Backend (RLS)

Create migration:

```sql
-- Add RLS policy for new resource
CREATE POLICY "my_resource_policy"
  ON public.my_resource
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_role(
      auth.uid(),
      organization_id,
      ARRAY['system_admin', 'organization_admin']
    )
  );
```

## Testing Authorization

```typescript
import { defineAbilitiesFor } from '../lib/casl/ability';

describe('Authorization', () => {
  it('should allow admin to create farms within limit', () => {
    const ability = defineAbilitiesFor({
      userId: 'user-1',
      organizationId: 'org-1',
      role: { name: 'organization_admin', level: 2 },
      subscription: {
        status: 'active',
        max_farms: 10,
        // ... other fields
      },
      currentCounts: { farms: 5, parcels: 10, users: 3, satelliteReports: 0 },
    });

    expect(ability.can('create', 'Farm')).toBe(true);
  });

  it('should block farm creation when limit reached', () => {
    const ability = defineAbilitiesFor({
      userId: 'user-1',
      organizationId: 'org-1',
      role: { name: 'organization_admin', level: 2 },
      subscription: {
        status: 'active',
        max_farms: 10,
        // ... other fields
      },
      currentCounts: { farms: 10, parcels: 10, users: 3, satelliteReports: 0 },
    });

    expect(ability.can('create', 'Farm')).toBe(false);
  });
});
```

## Security Best Practices

1. **Always enforce on backend**: CASL is for UX only. RLS is the real security.
2. **Test limits**: Ensure subscription limits are checked in both frontend and backend.
3. **Fail securely**: If subscription check fails, deny access.
4. **Audit actions**: Log all permission checks for security audits.
5. **Keep in sync**: Frontend CASL rules should match backend RLS policies.

## Troubleshooting

### Permission denied errors

1. Check user's role in organization
2. Verify subscription is active
3. Check if resource limit has been reached
4. Review RLS policy for the table

### Limits not enforcing

1. Verify `can_create_resource()` function is working
2. Check if subscription data is correct
3. Ensure RLS policies call the limit check function

### Frontend shows button but backend blocks

This means CASL and RLS are out of sync. Update CASL rules to match RLS policies.
