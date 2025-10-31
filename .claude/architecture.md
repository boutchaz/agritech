# Architecture Guide

## Multi-Tenant Architecture

### Hierarchy
Organizations → Farms → Parcels → Divergent Sub-parcels (AOI-based)

### Context Management
`MultiTenantAuthProvider` ([src/components/MultiTenantAuthProvider.tsx](../project/src/components/MultiTenantAuthProvider.tsx))

**Responsibilities**:
- Manages user authentication state via Supabase Auth
- Maintains current organization and farm selection (persisted to localStorage)
- Provides role-based access via `userRole`, `hasRole()`, `isAtLeastRole()`
- Handles onboarding flows for new users
- Subscription validation and password setup enforcement

**Usage**:
```typescript
const {
  user,                    // Supabase auth user
  profile,                 // User profile
  organizations,           // All user's orgs
  currentOrganization,     // Selected org
  farms,                   // Farms in current org
  currentFarm,             // Selected farm
  userRole,                // Role in current org
  hasRole,                 // Check specific role(s)
  isAtLeastRole            // Check role hierarchy
} = useAuth();
```

### Role Hierarchy (Numeric levels 1-6)
1. `system_admin` - Platform-wide access
2. `organization_admin` - Full organization management (billing, users, settings)
3. `farm_manager` - Farm-level operations
4. `farm_worker` - Task execution, analysis creation, cost management
5. `day_laborer` - Limited to assigned tasks only
6. `viewer` - Read-only access

## Authorization System (Two Layers)

### Layer 1: CASL Ability
Location: `src/lib/casl/`

**Fine-grained permissions with subscription enforcement**

**Permissions**: `manage`, `create`, `read`, `update`, `delete`, `invite`, `export`

**Resources**: `all`, `Farm`, `Parcel`, `User`, `SatelliteReport`, `Analysis`, `Task`, etc.

**Subscription limits enforced**:
- `max_farms`
- `max_parcels`
- `max_users`
- `max_satellite_reports`

**Feature flags**:
- `has_analytics`
- `has_sensor_integration`
- `has_api_access`
- `has_advanced_reporting`

**Usage**:
```typescript
import { Can } from '@/components/authorization/Can';
import { useCan } from '@/lib/casl/AbilityContext';

// Component-based
<Can I="create" a="Farm">
  <CreateFarmButton />
</Can>

// Programmatic
const canCreateFarm = useCan('create', 'Farm');
```

### Layer 2: RoleBasedAccess Hook
Location: `src/hooks/useRoleBasedAccess.tsx`

**Simpler DB-backed checks**
- Uses Supabase RPC functions for permission lookups
- Provides `<PermissionGuard>`, `<RoleGuard>` components
- HOC: `withPermission(Component, resource, action)`

## Route Structure (TanStack Router)

**File-based routing** in `src/routes/` with auto-generated `routeTree.gen.ts` (DO NOT EDIT manually).

### Naming Conventions
- `__root.tsx` - Root layout with providers
- `_authenticated.tsx` - Protected layout wrapper (checks auth + subscription)
- `dashboard.tsx` - Maps to `/dashboard`
- `settings.profile.tsx` - Nested route `/settings/profile` (dot notation)
- `tasks.index.tsx` - Index route for `/tasks`
- `tasks.calendar.tsx` - Child route `/tasks/calendar`
- `$moduleId.tsx` - Dynamic route with parameter (e.g., `/fruit-trees`)

### Protection Pattern
- All protected routes inherit from `_authenticated` layout
- Layout uses `beforeLoad` hook to check authentication
- Unauthenticated users redirected to `/login?redirect={current_url}`
- Subscription validation blocks non-paying users (except `/settings`)

### Route Registration
```typescript
export const Route = createFileRoute('/path')({
  component: ComponentName,
  // Or with CASL protection:
  component: withRouteProtection(ComponentName, 'action', 'resource'),
})
```

## Data Flow

### Query Key Structure
```typescript
// Auth-related
['auth', 'profile', userId]
['auth', 'organizations', userId]
['auth', 'farms', organizationId]

// Features
['parcels', { organizationId, farmId }]
['workers', { organizationId }]
['tasks', { parcelId }]
['satellite-data', parcelId, { startDate, endDate, indices }]
```

### Query Configuration Guidelines
- **staleTime**: 5 minutes (auth queries), 1 minute (feature queries)
- **Retries**: Minimal (1) for auth to handle 403 gracefully
- **Refetch on mount**: Disabled for expensive satellite queries

### Custom Hooks Pattern
```typescript
// src/hooks/useParcels.ts
export const useParcels = (farmId: string) => {
  return useQuery({
    queryKey: ['parcels', { farmId }],
    queryFn: () => supabase.from('parcels').select('*').eq('farm_id', farmId),
    enabled: !!farmId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

## Subscription System (Polar.sh)

### Plans
Free, Basic, Pro, Enterprise

### Components
- `<FeatureGate feature="analytics">` - Feature gating
- `<LimitWarning resource="farms" />` - Usage limit warnings

### Checkout Flow
`/select-trial` → Polar checkout → `/checkout-success`

### Webhooks
Update subscription status via Polar webhooks

## Performance Patterns

### React Query Caching
- Strategic `staleTime` configuration
- Proper query key structure to avoid cache misses
- Mutation-based invalidation instead of polling

### Route Loading
- Lazy route loading via TanStack Router
- Code splitting at route boundaries

### Large Datasets
- Pagination for large datasets (parcels, inventory, tasks)
- Virtual scrolling for long lists (workers, tasks)
- Debounced search inputs
