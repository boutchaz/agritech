# Authentication

The AgriTech Platform uses Supabase Auth integrated with a custom multi-tenant authentication provider for comprehensive user authentication and context management.

## Overview

The authentication system provides:
- User authentication via Supabase Auth
- Multi-tenant organization management
- Role-based access control
- Session persistence
- Onboarding flow
- Password management
- Subscription validation

## Architecture

```
┌─────────────────────────────────────────────┐
│     MultiTenantAuthProvider                  │
├─────────────────────────────────────────────┤
│                                              │
│  ┌────────────┐    ┌──────────────────┐    │
│  │ Supabase   │───▶│ User Context     │    │
│  │ Auth       │    │ - Profile        │    │
│  └────────────┘    │ - Organizations  │    │
│                    │ - Farms          │    │
│  ┌────────────┐    │ - Current Org    │    │
│  │ TanStack   │───▶│ - Current Farm   │    │
│  │ Query      │    │ - Role           │    │
│  └────────────┘    └──────────────────┘    │
│                                              │
└─────────────────────────────────────────────┘
```

## Supabase Auth Setup

### Two Client Instances

The platform uses two Supabase clients to prevent circular dependencies:

**1. Auth Client** (`src/lib/auth-supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js'

export const authSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**2. Main Data Client** (`src/lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## MultiTenantAuthProvider

The core authentication provider manages user state, organizations, farms, and roles.

### Provider Setup

```typescript
// src/main.tsx
import { MultiTenantAuthProvider } from '@/components/MultiTenantAuthProvider'

function App() {
  return (
    <MultiTenantAuthProvider>
      <RouterProvider router={router} />
    </MultiTenantAuthProvider>
  )
}
```

### Context Structure

```typescript
interface AuthContextType {
  user: User | null                          // Supabase auth user
  profile: UserProfile | null                // User profile data
  organizations: Organization[]              // All user organizations
  currentOrganization: Organization | null   // Selected organization
  farms: Farm[]                              // Farms in current org
  currentFarm: Farm | null                   // Selected farm
  userRole: UserRole | null                  // Role in current org
  loading: boolean                           // Loading state
  needsOnboarding: boolean                   // Onboarding required
  setCurrentOrganization: (org: Organization) => void
  setCurrentFarm: (farm: Farm) => void
  signOut: () => Promise<void>
  refreshUserData: () => Promise<void>
  hasRole: (roleName: string | string[]) => boolean
  isAtLeastRole: (roleName: string) => boolean
}
```

### Using the Auth Context

```typescript
import { useAuth } from '@/hooks/useAuth'

function MyComponent() {
  const {
    user,                    // Current user
    profile,                 // User profile
    organizations,           // All organizations
    currentOrganization,     // Selected organization
    farms,                   // Farms in current org
    currentFarm,             // Selected farm
    userRole,                // User role
    hasRole,                 // Check specific role
    isAtLeastRole,           // Check role hierarchy
    signOut,                 // Sign out function
  } = useAuth()

  if (!user) return <LoginPrompt />

  return (
    <div>
      <h1>Welcome, {profile?.first_name}!</h1>
      <p>Organization: {currentOrganization?.name}</p>
      <p>Farm: {currentFarm?.name}</p>
      <p>Role: {userRole?.role_name}</p>
      {hasRole('organization_admin') && (
        <AdminPanel />
      )}
    </div>
  )
}
```

## Authentication Flow

### 1. Initial Load

```typescript
// MultiTenantAuthProvider.tsx (excerpt)
useEffect(() => {
  // Check active sessions and set the user
  authSupabase.auth.getSession().then(({ data: { session } }) => {
    const sessionUser = session?.user ?? null
    setUser(sessionUser)
    setShowAuth(!sessionUser)
    setAuthLoading(false)
  })

  // Listen for changes on auth state (sign in, sign out, etc.)
  const { data: { subscription } } = authSupabase.auth.onAuthStateChange(
    async (event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)

      if (sessionUser) {
        setShowAuth(false)
      } else {
        // Clear all user data on sign out
        setCurrentOrganization(null)
        setCurrentFarm(null)
        setShowAuth(true)

        // Redirect to login on sign out
        if (event === 'SIGNED_OUT') {
          window.location.href = '/login'
        }
      }

      setAuthLoading(false)
    }
  )

  return () => subscription.unsubscribe()
}, [])
```

### 2. Data Fetching with TanStack Query

```typescript
// src/hooks/useAuthQueries.ts
import { useQuery } from '@tanstack/react-query'
import { authSupabase } from '@/lib/auth-supabase'

export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['auth', 'profile', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await authSupabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })
}

export const useUserOrganizations = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['auth', 'organizations', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await authSupabase
        .rpc('get_user_organizations', { user_id: userId })

      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useOrganizationFarms = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: ['auth', 'farms', organizationId],
    queryFn: async () => {
      if (!organizationId) return []
      const { data, error } = await authSupabase
        .from('farms')
        .select('*')
        .eq('organization_id', organizationId)

      if (error) throw error
      return data
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  })
}
```

### 3. Role Fetching

```typescript
// MultiTenantAuthProvider.tsx (excerpt)
const fetchUserRole = async () => {
  if (!user?.id || !currentOrganization?.id) {
    setUserRole(null)
    return
  }

  try {
    const { data: roleData, error } = await authSupabase
      .rpc('get_user_role', {
        user_id: user.id,
        org_id: currentOrganization.id
      })

    if (error) throw error
    setUserRole(roleData?.[0] || null)
  } catch (error) {
    console.error('Error fetching user role:', error)
    setUserRole(null)
  }
}

useEffect(() => {
  fetchUserRole()
}, [user?.id, currentOrganization?.id])
```

## Role Hierarchy

```typescript
const roleHierarchy: Record<string, number> = {
  system_admin: 1,        // Platform-wide access
  organization_admin: 2,  // Full organization management
  farm_manager: 3,        // Farm-level operations
  farm_worker: 4,         // Task execution, analysis creation
  day_laborer: 5,         // Limited to assigned tasks
  viewer: 6,              // Read-only access
}
```

### Role Checking Functions

```typescript
// Check specific role(s)
const hasRole = (roleName: string | string[]): boolean => {
  if (!userRole) return false
  const roles = Array.isArray(roleName) ? roleName : [roleName]
  return roles.includes(userRole.role_name)
}

// Check role hierarchy (user level <= required level)
const isAtLeastRole = (roleName: string): boolean => {
  if (!userRole) return false

  const userLevel = roleHierarchy[userRole.role_name]
  const requiredLevel = roleHierarchy[roleName]

  return userLevel <= requiredLevel
}
```

**Usage:**

```typescript
const { hasRole, isAtLeastRole } = useAuth()

// Check specific role
if (hasRole('organization_admin')) {
  // Admin-only features
}

// Check multiple roles
if (hasRole(['organization_admin', 'farm_manager'])) {
  // Admin or manager features
}

// Check role hierarchy
if (isAtLeastRole('farm_worker')) {
  // Accessible by farm_worker, farm_manager, and organization_admin
}
```

## Session Management

### Persistence

User context is persisted to localStorage:

```typescript
// Store organization
const handleSetCurrentOrganization = (org: Organization) => {
  setCurrentOrganization(org)
  setCurrentFarm(null) // Clear current farm when switching orgs
  localStorage.setItem('currentOrganization', JSON.stringify(org))
}

// Store farm
const handleSetCurrentFarm = (farm: Farm) => {
  setCurrentFarm(farm)
  localStorage.setItem('currentFarm', JSON.stringify(farm))
}
```

### Restoration

On load, attempt to restore from localStorage:

```typescript
useEffect(() => {
  if (organizations.length > 0 && !currentOrganization) {
    // Try to restore from localStorage first
    const savedOrg = localStorage.getItem('currentOrganization')
    if (savedOrg) {
      try {
        const org = JSON.parse(savedOrg)
        // Verify the saved org still exists
        const validOrg = organizations.find(o => o.id === org.id)
        if (validOrg) {
          setCurrentOrganization(validOrg)
          return
        }
      } catch (error) {
        console.error('Error parsing saved organization:', error)
      }
    }

    // Default to first organization
    setCurrentOrganization(organizations[0])
  }
}, [organizations, currentOrganization])
```

## Protected Routes

Routes are protected by the `_authenticated` layout:

```typescript
// src/routes/_authenticated.tsx
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const { user } = await context.auth
    if (!user) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: AuthenticatedLayout,
})
```

## Onboarding Flow

### Detection

```typescript
const needsOnboarding = !!(
  user && !loading && (
    // No profile yet
    !profile || !profile.first_name || !profile.last_name ||
    // No organizations yet
    organizations.length === 0 ||
    // Has org but onboarding not completed
    (organizations.length > 0 && currentOrganization &&
     !currentOrganization.onboarding_completed)
  )
)
```

### Redirect

Users are redirected to onboarding if needed (handled in application logic).

## Password Management

### Password Set Check

```typescript
useEffect(() => {
  const isOnNoPasswordRequiredRoute = noPasswordRequiredRoutes.some(route =>
    location.pathname.startsWith(route)
  )

  if (isOnNoPasswordRequiredRoute) return

  if (!loading && !profileLoading && user && profile &&
      profile.password_set === false && !isOnSetPasswordPage && !isPublicRoute) {
    // Redirect to set-password
    window.location.href = '/set-password'
  }
}, [loading, profileLoading, user, profile, isOnSetPasswordPage, isPublicRoute])
```

## Subscription Validation

### Check Subscription Status

```typescript
import { isSubscriptionValid } from '@/lib/polar'

const hasValidSubscription = isSubscriptionValid(subscription)

// Block access if no valid subscription (except settings)
if (!hasValidSubscription && !isOnSettingsPage && currentOrganization) {
  const reason = !subscription
    ? 'no_subscription'
    : subscription.status === 'canceled'
    ? 'canceled'
    : subscription.status === 'past_due'
    ? 'past_due'
    : 'expired'

  return <SubscriptionRequired reason={reason} />
}
```

## Sign Out

### Sign Out Mutation

```typescript
// src/hooks/useAuthQueries.ts
export const useSignOut = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await authSupabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => {
      // Clear all queries
      queryClient.clear()
      // Clear localStorage
      localStorage.removeItem('currentOrganization')
      localStorage.removeItem('currentFarm')
    },
  })
}
```

### Usage

```typescript
const { signOut } = useAuth()

<button onClick={() => signOut()}>
  Sign out
</button>
```

## Refresh User Data

Force refresh user data:

```typescript
const { refreshUserData } = useAuth()

<button onClick={() => refreshUserData()}>
  Refresh
</button>
```

## Public Routes

Routes that don't require authentication:

```typescript
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/select-trial',
  '/set-password'
]
```

## Loading States

The provider shows a loading spinner while fetching user data:

```typescript
if (loading && !isPublicRoute) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    </div>
  )
}
```

## Organization & Farm Switching

### Organization Switcher

```typescript
import { useAuth } from '@/hooks/useAuth'

function OrganizationSwitcher() {
  const { organizations, currentOrganization, setCurrentOrganization } = useAuth()

  return (
    <select
      value={currentOrganization?.id}
      onChange={(e) => {
        const org = organizations.find(o => o.id === e.target.value)
        if (org) setCurrentOrganization(org)
      }}
    >
      {organizations.map(org => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  )
}
```

### Farm Switcher

```typescript
function FarmSwitcher() {
  const { farms, currentFarm, setCurrentFarm } = useAuth()

  return (
    <select
      value={currentFarm?.id}
      onChange={(e) => {
        const farm = farms.find(f => f.id === e.target.value)
        if (farm) setCurrentFarm(farm)
      }}
    >
      {farms.map(farm => (
        <option key={farm.id} value={farm.id}>
          {farm.name}
        </option>
      ))}
    </select>
  )
}
```

## Best Practices

1. **Use auth hooks**: Always use `useAuth()` instead of accessing context directly
2. **Check loading state**: Wait for `loading` to be false before rendering
3. **Handle null states**: User, profile, org, and farm can be null
4. **Role checks**: Use `hasRole()` and `isAtLeastRole()` for access control
5. **Persist context**: Organization and farm selection are persisted
6. **Clear on signout**: Always clear localStorage and query cache
7. **Public routes**: Define public routes to prevent auth redirects

## Troubleshooting

### User not authenticated
- Check Supabase session is active
- Verify environment variables are set
- Check browser console for auth errors

### Role not loading
- Verify RPC function `get_user_role` exists
- Check user has organization membership
- Ensure organization context is set

### Infinite loading
- Check TanStack Query is configured correctly
- Verify all auth queries have `enabled` flags
- Check for circular dependencies

## Summary

The authentication system provides comprehensive user management with multi-tenancy, role-based access, and subscription validation. By using the `MultiTenantAuthProvider` and `useAuth` hook, components can access user context and control access throughout the application.
