# State Management

The AgriTech Platform uses a dual state management approach: **TanStack Query** for server state and **Jotai** for global client state.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              Application State                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  Server State              Client State         │
│  ┌──────────────┐          ┌──────────────┐    │
│  │ TanStack     │          │ Jotai        │    │
│  │ Query        │          │ Atoms        │    │
│  │              │          │              │    │
│  │ - Parcels    │          │ - UI State   │    │
│  │ - Workers    │          │ - Selections │    │
│  │ - Tasks      │          │ - Filters    │    │
│  │ - Satellite  │          │ - Modal open │    │
│  └──────────────┘          └──────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

## TanStack Query (React Query)

TanStack Query manages all server-side data with automatic caching, synchronization, and optimistic updates.

### Installation

```bash
npm install @tanstack/react-query
```

### Setup

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### Query Key Structure

Consistent query key naming ensures proper caching and invalidation.

**Convention:** `[resource, filters/params]`

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
['invoices', { organizationId, status }]
['inventory', { warehouseId }]

// Detail queries
['parcel', parcelId]
['worker', workerId]
['task', taskId]
```

### Query Configuration

Different queries have different caching strategies:

```typescript
// Auth queries - longer stale time
const { data: profile } = useQuery({
  queryKey: ['auth', 'profile', userId],
  queryFn: () => fetchProfile(userId),
  staleTime: 1000 * 60 * 5, // 5 minutes
  retry: 1, // Minimal retries for auth
  enabled: !!userId,
})

// Feature queries - shorter stale time
const { data: parcels } = useQuery({
  queryKey: ['parcels', { farmId }],
  queryFn: () => fetchParcels(farmId),
  staleTime: 1000 * 60, // 1 minute
  enabled: !!farmId,
})

// Expensive queries - disabled refetch
const { data: satelliteData } = useQuery({
  queryKey: ['satellite-data', parcelId, { startDate, endDate }],
  queryFn: () => fetchSatelliteData(parcelId, startDate, endDate),
  staleTime: 1000 * 60 * 10, // 10 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  enabled: !!parcelId,
})
```

### Custom Query Hooks

Encapsulate query logic in custom hooks for reusability.

**Example: `useAuthQueries.ts`**

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
    staleTime: 1000 * 60 * 5,
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
```

**Usage:**

```typescript
import { useUserProfile, useUserOrganizations } from '@/hooks/useAuthQueries'

function ProfileComponent() {
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id)
  const { data: organizations, isLoading: orgsLoading } = useUserOrganizations(user?.id)

  if (profileLoading || orgsLoading) return <Spinner />

  return (
    <div>
      <h1>{profile.first_name} {profile.last_name}</h1>
      <p>Organizations: {organizations.length}</p>
    </div>
  )
}
```

### Mutations

Mutations modify server data with automatic cache invalidation.

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

function useCreateParcel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (newParcel: NewParcel) => {
      return supabase.from('parcels').insert(newParcel).select().single()
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch parcels list
      queryClient.invalidateQueries({
        queryKey: ['parcels', { farmId: variables.farmId }]
      })

      // Optionally add the new parcel to the cache immediately
      queryClient.setQueryData(
        ['parcel', data.id],
        data
      )
    },
    onError: (error) => {
      console.error('Error creating parcel:', error)
    },
  })
}

// Usage
function CreateParcelForm() {
  const createParcel = useCreateParcel()

  const handleSubmit = (values: NewParcel) => {
    createParcel.mutate(values, {
      onSuccess: () => {
        toast.success('Parcel created!')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={createParcel.isPending}>
        {createParcel.isPending ? 'Creating...' : 'Create Parcel'}
      </button>
    </form>
  )
}
```

### Optimistic Updates

Update the UI immediately before the server responds:

```typescript
function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      return supabase.from('tasks').update(updates).eq('id', taskId).select().single()
    },
    onMutate: async ({ taskId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['tasks', { parcelId }])

      // Optimistically update to the new value
      queryClient.setQueryData(['tasks', { parcelId }], (old: Task[]) =>
        old.map(task => task.id === taskId ? { ...task, ...updates } : task)
      )

      // Return a context object with the snapshot
      return { previousTasks }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', { parcelId }], context.previousTasks)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
```

### Pagination

Handle paginated data with `useInfiniteQuery`:

```typescript
function useParcels(farmId: string) {
  return useInfiniteQuery({
    queryKey: ['parcels', { farmId }],
    queryFn: ({ pageParam = 0 }) => {
      const limit = 20
      return supabase
        .from('parcels')
        .select('*')
        .eq('farm_id', farmId)
        .range(pageParam * limit, (pageParam + 1) * limit - 1)
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined
    },
    initialPageParam: 0,
  })
}

// Usage
function ParcelsList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useParcels(farmId)

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.map(parcel => (
            <ParcelCard key={parcel.id} parcel={parcel} />
          ))}
        </div>
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

### Dependent Queries

Execute queries in sequence when one depends on another:

```typescript
function ParcelDetails({ parcelId }: { parcelId: string }) {
  // First query: Get parcel
  const { data: parcel } = useQuery({
    queryKey: ['parcel', parcelId],
    queryFn: () => fetchParcel(parcelId),
  })

  // Second query: Get analyses for this parcel (depends on parcel.id)
  const { data: analyses } = useQuery({
    queryKey: ['analyses', { parcelId: parcel?.id }],
    queryFn: () => fetchAnalyses(parcel!.id),
    enabled: !!parcel, // Only run when parcel exists
  })

  return <div>{/* Render parcel and analyses */}</div>
}
```

### Real-time Updates with Supabase

Combine TanStack Query with Supabase real-time subscriptions:

```typescript
function useParcelsRealtime(farmId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['parcels', { farmId }],
    queryFn: () => fetchParcels(farmId),
  })

  useEffect(() => {
    if (!farmId) return

    const channel = supabase
      .channel(`parcels:${farmId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcels',
          filter: `farm_id=eq.${farmId}`,
        },
        () => {
          // Invalidate query on any change
          queryClient.invalidateQueries({ queryKey: ['parcels', { farmId }] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [farmId, queryClient])

  return query
}
```

## Jotai (Global Client State)

Jotai manages lightweight global state with atoms.

### Installation

```bash
npm install jotai
```

### Creating Atoms

```typescript
// src/atoms/ui.ts
import { atom } from 'jotai'

// Simple atom
export const sidebarOpenAtom = atom(true)

// Read-only derived atom
export const sidebarWidthAtom = atom((get) => {
  const isOpen = get(sidebarOpenAtom)
  return isOpen ? 256 : 64
})

// Write-only atom
export const toggleSidebarAtom = atom(
  null, // no read
  (get, set) => {
    set(sidebarOpenAtom, !get(sidebarOpenAtom))
  }
)
```

### Using Atoms

```typescript
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { sidebarOpenAtom, toggleSidebarAtom } from '@/atoms/ui'

function Sidebar() {
  const [isOpen, setIsOpen] = useAtom(sidebarOpenAtom)
  // Or just read:
  // const isOpen = useAtomValue(sidebarOpenAtom)
  // Or just write:
  // const setIsOpen = useSetAtom(sidebarOpenAtom)

  return (
    <aside className={isOpen ? 'w-64' : 'w-16'}>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
    </aside>
  )
}

function Header() {
  const toggle = useSetAtom(toggleSidebarAtom)

  return (
    <header>
      <button onClick={() => toggle()}>Toggle Sidebar</button>
    </header>
  )
}
```

### Common Atom Patterns

**Selected Item:**

```typescript
// src/atoms/selection.ts
import { atom } from 'jotai'
import type { Parcel } from '@/types/database'

export const selectedParcelAtom = atom<Parcel | null>(null)
```

**Filters:**

```typescript
// src/atoms/filters.ts
import { atom } from 'jotai'

export const parcelFilterAtom = atom({
  cropType: 'all',
  status: 'active',
  searchQuery: '',
})
```

**Modal State:**

```typescript
// src/atoms/modals.ts
import { atom } from 'jotai'

export const createParcelModalAtom = atom(false)
export const editTaskModalAtom = atom<{ open: boolean; taskId: string | null }>({
  open: false,
  taskId: null,
})
```

## When to Use What?

### Use TanStack Query for:
- Data fetched from APIs (Supabase, satellite service)
- Server-side state (parcels, workers, tasks, etc.)
- Caching and synchronization
- Background refetching
- Optimistic updates

### Use Jotai for:
- UI state (sidebar open, dark mode)
- Form wizards (multi-step forms)
- Temporary selections
- Client-only state
- Simple global state without server interaction

### Use React State (useState) for:
- Local component state
- Form inputs (controlled components)
- Temporary UI state (hover, focus)
- Component-specific state

## Best Practices

### TanStack Query

1. **Consistent query keys**: Follow the `[resource, params]` convention
2. **Custom hooks**: Encapsulate query logic in hooks (`useAuthQueries`, `useParcels`)
3. **Enable flag**: Use `enabled` to prevent unnecessary queries
4. **Stale time**: Configure based on data volatility
5. **Error handling**: Handle errors gracefully with `onError`
6. **Invalidation**: Use specific query keys for targeted invalidation

### Jotai

1. **Small atoms**: Keep atoms focused and minimal
2. **Derived atoms**: Use read-only atoms for computed values
3. **Atom files**: Organize atoms by feature (`ui.ts`, `filters.ts`)
4. **Type safety**: Always type your atoms
5. **Avoid overuse**: Don't use for server data (use TanStack Query)

## Performance Tips

1. **Selective invalidation**: Only invalidate specific queries
   ```typescript
   queryClient.invalidateQueries({ queryKey: ['parcels', { farmId }] })
   ```

2. **Background refetching**: Use `refetchInterval` for real-time data
   ```typescript
   useQuery({
     queryKey: ['tasks'],
     queryFn: fetchTasks,
     refetchInterval: 30000, // 30 seconds
   })
   ```

3. **Prefetching**: Prefetch data on hover
   ```typescript
   const queryClient = useQueryClient()

   const onMouseEnter = () => {
     queryClient.prefetchQuery({
       queryKey: ['parcel', parcelId],
       queryFn: () => fetchParcel(parcelId),
     })
   }
   ```

4. **Query cancellation**: Cancel queries on component unmount
   (TanStack Query does this automatically)

## Debugging

### React Query Devtools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

<ReactQueryDevtools initialIsOpen={false} />
```

- View all queries and their states
- Inspect query data and cache
- Manually refetch or invalidate queries
- Debug stale/fresh states

### Jotai DevTools

```typescript
import { DevTools } from 'jotai-devtools'

<DevTools />
```

- View all atoms and their values
- Track atom updates
- Time-travel debugging

## Summary

The AgriTech Platform's state management strategy leverages the strengths of both TanStack Query and Jotai:

- **TanStack Query** handles all server state with powerful caching and synchronization
- **Jotai** manages lightweight global client state with minimal boilerplate
- **React state** handles local component state

This separation of concerns ensures optimal performance, maintainability, and developer experience.
