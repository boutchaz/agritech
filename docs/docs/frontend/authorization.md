# Authorization

The AgriTech Platform uses a two-layer authorization system: **CASL** for fine-grained permissions with subscription enforcement, and **RoleBasedAccess** for simpler database-backed permission checks.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│           Authorization System                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Layer 1: CASL Ability System                       │
│  ┌────────────────────────────────────────┐         │
│  │ - Fine-grained permissions             │         │
│  │ - Subscription limit enforcement       │         │
│  │ - Feature gating                       │         │
│  │ - Dynamic ability updates              │         │
│  └────────────────────────────────────────┘         │
│                                                      │
│  Layer 2: RoleBasedAccess                           │
│  ┌────────────────────────────────────────┐         │
│  │ - Database-backed permissions          │         │
│  │ - Simple permission checks             │         │
│  │ - Component guards                     │         │
│  │ - HOC wrappers                         │         │
│  └────────────────────────────────────────┘         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Layer 1: CASL Ability System

CASL provides fine-grained, dynamic permissions with automatic subscription limit enforcement.

### Installation

```bash
npm install @casl/ability @casl/react
```

### Actions

All possible actions in the system:

```typescript
export type Action =
  | 'create' | 'read' | 'update' | 'delete' | 'manage'
  | 'invite' | 'remove' | 'activate' | 'deactivate'
  | 'export' | 'import' | 'view_analytics' | 'access_api'
  | 'approve' | 'post' | 'close' // Accounting-specific
```

### Subjects (Resources)

All possible resources:

```typescript
export type Subject =
  | 'Farm' | 'Parcel' | 'Analysis' | 'Employee' | 'DayLaborer' | 'Worker'
  | 'User' | 'Organization' | 'Subscription' | 'Role'
  | 'Cost' | 'Revenue' | 'Utility' | 'Structure' | 'Tree'
  | 'SatelliteReport' | 'Sensor' | 'Analytics' | 'API'
  | 'Stock' | 'Infrastructure' | 'FarmHierarchy' | 'Task' | 'Report'
  | 'Account' | 'JournalEntry' | 'Invoice' | 'Payment' | 'CostCenter'
  | 'Tax' | 'BankAccount' | 'Period' | 'AccountingReport'
  | 'all'
```

### Ability Definition

```typescript
// src/lib/casl/ability.ts
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability'

export type AppAbility = MongoAbility<[Action, Subject]>

interface UserContext {
  userId: string
  organizationId: string
  role: {
    name: string
    level: number
  }
  subscription: Subscription | null
  currentCounts: {
    farms: number
    parcels: number
    users: number
    satelliteReports: number
  }
}

export function defineAbilitiesFor(context: UserContext): AppAbility {
  const { role, subscription, currentCounts } = context
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

  // ROLE-BASED PERMISSIONS

  // System Admin - Full access
  if (role.name === 'system_admin') {
    can('manage', 'all')
    return build()
  }

  // Organization Admin
  if (role.name === 'organization_admin') {
    can('manage', 'Farm')
    can('manage', 'Parcel')
    can('manage', 'User')
    can('manage', 'Account')
    can('manage', 'JournalEntry')
    can('post', 'JournalEntry')
    can('approve', 'JournalEntry')
    can('close', 'Period')
    // ... more permissions
  }

  // Farm Manager
  if (role.name === 'farm_manager') {
    can('manage', 'Parcel')
    can('manage', 'Analysis')
    can('manage', 'Task')
    can('read', 'Farm')
    can('update', 'Farm')
    // ... more permissions
  }

  // Farm Worker
  if (role.name === 'farm_worker') {
    can('create', 'Analysis')
    can('read', 'Analysis')
    can('update', 'Analysis')
    can('read', 'Parcel')
    can('read', 'Task')
    can('update', 'Task')
    // ... more permissions
  }

  // SUBSCRIPTION-BASED PERMISSIONS

  if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
    cannot('create', 'all')
    cannot('update', 'all')
    cannot('delete', 'all')
    can('read', 'Subscription')
    return build()
  }

  // SUBSCRIPTION LIMITS

  // Farm creation limit
  if (currentCounts.farms >= subscription.max_farms) {
    cannot('create', 'Farm')
  }

  // Parcel creation limit
  if (currentCounts.parcels >= subscription.max_parcels) {
    cannot('create', 'Parcel')
  }

  // User invitation limit
  if (currentCounts.users >= subscription.max_users) {
    cannot('invite', 'User')
    cannot('create', 'User')
  }

  // SUBSCRIPTION FEATURES

  // Analytics (Professional+)
  if (subscription.has_analytics) {
    can('view_analytics', 'Analytics')
  } else {
    cannot('view_analytics', 'Analytics')
  }

  // Advanced reporting (Professional+)
  if (subscription.has_advanced_reporting) {
    can('export', 'all')
  } else {
    cannot('export', 'all')
  }

  // API Access (Enterprise)
  if (subscription.has_api_access) {
    can('access_api', 'API')
  }

  return build()
}
```

### Ability Provider

```typescript
// src/lib/casl/AbilityContext.tsx
import { createContext } from 'react'
import { createContextualCan } from '@casl/react'
import { defineAbilitiesFor } from './ability'

export const AbilityContext = createContext<AppAbility | null>(null)
export const Can = createContextualCan(AbilityContext.Consumer)

export function AbilityProvider({ children }: { children: React.ReactNode }) {
  const { user, currentOrganization, userRole } = useAuth()
  const { data: subscription } = useSubscription()
  const { data: counts } = useResourceCounts()

  const ability = useMemo(() => {
    if (!user || !currentOrganization || !userRole) {
      return defineAbilitiesFor({
        userId: '',
        organizationId: '',
        role: { name: 'viewer', level: 6 },
        subscription: null,
        currentCounts: { farms: 0, parcels: 0, users: 0, satelliteReports: 0 },
      })
    }

    return defineAbilitiesFor({
      userId: user.id,
      organizationId: currentOrganization.id,
      role: { name: userRole.role_name, level: userRole.level },
      subscription,
      currentCounts: counts,
    })
  }, [user, currentOrganization, userRole, subscription, counts])

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  )
}
```

### Component-Based Permission Check

Use the `<Can>` component for conditional rendering:

```typescript
import { Can } from '@/components/authorization/Can'

function MyComponent() {
  return (
    <>
      <Can I="create" a="Farm">
        <CreateFarmButton />
      </Can>

      <Can I="update" a="Parcel" fallback={<UpgradePrompt />}>
        <EditParcelButton />
      </Can>

      <Can I="view_analytics" a="Analytics">
        <AnalyticsDashboard />
      </Can>
    </>
  )
}
```

### Programmatic Permission Check

Use the `useCan` hook:

```typescript
import { useCan } from '@/lib/casl/AbilityContext'

function MyComponent() {
  const canCreateFarm = useCan('create', 'Farm')
  const canExport = useCan('export', 'Report')

  const handleCreateFarm = () => {
    if (!canCreateFarm) {
      toast.error('You have reached your farm limit')
      return
    }
    // Create farm logic
  }

  return (
    <div>
      <button
        onClick={handleCreateFarm}
        disabled={!canCreateFarm}
      >
        Create Farm
      </button>

      {canExport && (
        <button onClick={handleExport}>Export</button>
      )}
    </div>
  )
}
```

### Limit Helpers

```typescript
// Check if limit reached
import { isLimitReached } from '@/lib/casl/ability'

const limitReached = isLimitReached(subscription, currentFarms, 'farms')

// Get remaining count
import { getRemainingCount } from '@/lib/casl/ability'

const remaining = getRemainingCount(subscription, currentParcels, 'parcels')
// Returns null for unlimited (Enterprise)
```

### Limit Warning Component

```typescript
import { LimitWarning } from '@/components/authorization/LimitWarning'

function FarmsList() {
  return (
    <div>
      <LimitWarning resource="farms" />
      <FarmCards />
    </div>
  )
}
```

## Layer 2: RoleBasedAccess

Simpler database-backed permission system for straightforward checks.

### useRoleBasedAccess Hook

```typescript
// src/hooks/useRoleBasedAccess.tsx
import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export const useRoleBasedAccess = () => {
  const { user, currentOrganization } = useAuth()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])

  // Fetch role and permissions
  useEffect(() => {
    if (!user?.id) return

    const fetchData = async () => {
      const { data: roleData } = await supabase
        .rpc('get_user_role', { user_id: user.id, org_id: currentOrganization?.id })

      const { data: permissionsData } = await supabase
        .rpc('get_user_permissions', { user_id: user.id })

      setUserRole(roleData?.[0] || null)
      setUserPermissions(permissionsData || [])
    }

    fetchData()
  }, [user?.id, currentOrganization?.id])

  const hasPermission = useCallback((resource: ResourceType, action: ActionType) => {
    return userPermissions.some(
      p => p.resource === resource && (p.action === action || p.action === 'manage')
    )
  }, [userPermissions])

  const hasRole = useCallback((roleName: string | string[]) => {
    if (!userRole) return false
    const roles = Array.isArray(roleName) ? roleName : [roleName]
    return roles.includes(userRole.role_name)
  }, [userRole])

  return {
    userRole,
    userPermissions,
    hasPermission,
    hasRole,
    isAtLeastRole,
    canAccessResource,
  }
}
```

### Permission Guard Component

```typescript
import { PermissionGuard } from '@/hooks/useRoleBasedAccess'

function MyComponent() {
  return (
    <PermissionGuard
      resource="Farm"
      action="create"
      fallback={<UpgradePrompt />}
    >
      <CreateFarmForm />
    </PermissionGuard>
  )
}
```

### Role Guard Component

```typescript
import { RoleGuard } from '@/hooks/useRoleBasedAccess'

function AdminPanel() {
  return (
    <RoleGuard
      roles={['organization_admin', 'system_admin']}
      fallback={<AccessDenied />}
    >
      <AdminContent />
    </RoleGuard>
  )
}
```

### Higher-Order Component

```typescript
import { withPermission } from '@/hooks/useRoleBasedAccess'

const ProtectedComponent = withPermission(
  MyComponent,
  'Parcel',
  'update',
  FallbackComponent
)
```

## Feature Gating

Restrict features based on subscription plan:

```typescript
import { FeatureGate } from '@/components/FeatureGate'

function Dashboard() {
  return (
    <>
      <BasicDashboard />

      <FeatureGate feature="analytics">
        <AdvancedAnalytics />
      </FeatureGate>

      <FeatureGate feature="sensor_integration">
        <SensorDashboard />
      </FeatureGate>

      <FeatureGate feature="api_access">
        <APIDocumentation />
      </FeatureGate>
    </>
  )
}
```

## Route Protection

Protect entire routes with permissions:

```typescript
import { withRouteProtection } from '@/lib/casl/routeProtection'

export const Route = createFileRoute('/employees')({
  component: withRouteProtection(
    EmployeesComponent,
    'read',
    'Employee'
  ),
})
```

## Best Practices

### When to Use CASL vs RoleBasedAccess

**Use CASL for:**
- Complex permission logic
- Subscription-based limits
- Feature gating
- Dynamic permissions that change based on context

**Use RoleBasedAccess for:**
- Simple role checks
- Database-backed permissions
- When you need direct database access
- Legacy code compatibility

### Permission Naming

- **Actions**: Use verbs (create, read, update, delete, manage, export)
- **Subjects**: Use PascalCase singular nouns (Farm, Parcel, User)
- **Features**: Use snake_case (has_analytics, has_api_access)

### Defensive Programming

Always check permissions before sensitive operations:

```typescript
function deleteParcel(parcelId: string) {
  const canDelete = useCan('delete', 'Parcel')

  if (!canDelete) {
    toast.error('You do not have permission to delete parcels')
    return
  }

  // Proceed with deletion
}
```

### UI Feedback

Show clear feedback when limits are reached:

```typescript
import { LimitWarning } from '@/components/authorization/LimitWarning'

function CreateParcelButton() {
  const canCreate = useCan('create', 'Parcel')
  const { data: subscription } = useSubscription()
  const { data: counts } = useResourceCounts()

  const remaining = getRemainingCount(subscription, counts.parcels, 'parcels')

  return (
    <>
      <LimitWarning resource="parcels" />
      <button disabled={!canCreate}>
        Create Parcel {remaining !== null && `(${remaining} remaining)`}
      </button>
    </>
  )
}
```

### Server-Side Validation

Always validate permissions on the server side (Row Level Security in Supabase):

```sql
-- Example RLS policy
CREATE POLICY "Users can only manage parcels in their organizations"
  ON parcels
  FOR ALL
  USING (
    farm_id IN (
      SELECT id FROM farms
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid()
      )
    )
  );
```

## Troubleshooting

### Permissions not updating
- Check that ability is recalculated when context changes
- Verify subscription data is loaded
- Ensure resource counts are updated

### Cannot see protected content
- Verify user role is correct
- Check subscription status
- Verify ability definition includes the permission
- Check component is wrapped in AbilityProvider

### Limit not enforced
- Check current counts are accurate
- Verify subscription limits are set correctly
- Ensure ability is recalculated after count changes

## Summary

The AgriTech Platform's two-layer authorization system provides:

1. **CASL**: Fine-grained, dynamic permissions with subscription enforcement
2. **RoleBasedAccess**: Simple database-backed permission checks

Together, they ensure robust access control throughout the application, from UI rendering to API calls, with automatic subscription limit enforcement.
