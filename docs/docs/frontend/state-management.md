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

## Data Fetching Architecture

The platform follows a three-layer pattern for data fetching:

1.  **API Layer** (`src/lib/api/`): Encapsulates raw Supabase or REST API calls.
2.  **Hook Layer** (`src/hooks/`): Wraps API calls in TanStack Query hooks.
3.  **Component Layer**: Consumes hooks to display data.

### API Layer Pattern

All data fetching logic is encapsulated in the `lib/api/` directory. Each module exports an object containing related API methods.

```typescript
// project/src/lib/api/farms.ts
import { supabase } from '../supabase';

export const farmsApi = {
  getAll: async (orgId: string) => {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('organization_id', orgId);
    
    if (error) throw error;
    return data;
  },
  
  getOne: async (id: string) => {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  }
};
```

### Hook Layer Pattern

Custom hooks use TanStack Query to manage the lifecycle and caching of API requests.

```typescript
// project/src/hooks/useFarms.ts
import { useQuery } from '@tanstack/react-query';
import { farmsApi } from '@/lib/api/farms';

export function useFarms(orgId: string) {
  return useQuery({
    queryKey: ['farms', orgId],
    queryFn: () => farmsApi.getAll(orgId),
    staleTime: 5 * 60 * 1000,
    enabled: !!orgId,
  });
}
```

### Component Usage

Components never call Supabase or the API layer directly. They only use custom hooks.

```typescript
// project/src/components/FarmList.tsx
import { useFarms } from '@/hooks/useFarms';

function FarmList({ orgId }: { orgId: string }) {
  const { data: farms, isLoading, error } = useFarms(orgId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {farms?.map(farm => (
        <li key={farm.id}>{farm.name}</li>
      ))}
    </ul>
  );
}
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

**Convention:** `[resource, organizationId, ...params/filters]`

```typescript
// Auth-related
['users', 'me']
['users', 'organizations']

// Features
['farms', organizationId]
['parcels', organizationId, { farmId }]
['crops', organizationId, farmId, parcelId]
['tasks', organizationId, filters]
['workers', organizationId]

// Detail queries
['farm', organizationId, farmId]
['parcel', organizationId, parcelId]
['task', organizationId, taskId]
['crop', organizationId, cropId]
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

Encapsulate query logic in custom hooks for reusability. Hooks should always use the API layer and the `useAuth` hook for context.

**Example: `useCrops.ts`**

```typescript
// src/hooks/useCrops.ts
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { cropsApi } from '@/lib/api/crops';

export function useCrops(options?: {
  farmId?: string;
  parcelId?: string;
  enabled?: boolean;
}) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['crops', organizationId, options?.farmId, options?.parcelId],
    queryFn: () => cropsApi.getAll(organizationId!, options?.farmId, options?.parcelId),
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,
  });
}
```

**Usage:**

```typescript
import { useCrops } from '@/hooks/useCrops';

function CropList({ farmId }: { farmId: string }) {
  const { data: crops, isLoading } = useCrops({ farmId });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1>Crops ({crops?.length || 0})</h1>
      {crops?.map(crop => (
        <CropCard key={crop.id} crop={crop} />
      ))}
    </div>
  );
}
```

### Mutations

Mutations modify server data with automatic cache invalidation. They should also use the API layer.

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks';

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateTaskRequest & { organizationId: string }) => {
      const { organizationId, ...taskData } = request;
      return tasksApi.create(organizationId, taskData);
    },
    onSuccess: (data) => {
      // Invalidate and refetch tasks list for this organization
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', data.organization_id] 
      });
      // Update statistics
      queryClient.invalidateQueries({ 
        queryKey: ['task-statistics', data.organization_id] 
      });
    },
  });
}
```

### Optimistic Updates

Update the UI immediately before the server responds:

```typescript
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, organizationId, updates }: { 
      taskId: string; 
      organizationId: string; 
      updates: Partial<Task> 
    }) => {
      return tasksApi.update(organizationId, taskId, updates);
    },
    onMutate: async ({ taskId, organizationId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks', organizationId] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['tasks', organizationId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['tasks', organizationId], (old: Task[]) =>
        old?.map(task => task.id === taskId ? { ...task, ...updates } : task)
      );

      // Return a context object with the snapshot
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['tasks', variables.organizationId], 
          context.previousTasks
        );
      }
    },
    onSettled: (data) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', data?.organization_id] 
      });
    },
  });
}
```

### Pagination

Handle paginated data with `useInfiniteQuery` by passing the page parameters to the API layer:

```typescript
export function useParcelsInfinite(organizationId: string, farmId: string) {
  return useInfiniteQuery({
    queryKey: ['parcels', 'infinite', organizationId, farmId],
    queryFn: ({ pageParam = 0 }) => {
      return parcelsApi.getAll({ 
        organization_id: organizationId, 
        farm_id: farmId,
        page: pageParam,
        limit: 20
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: !!organizationId && !!farmId,
  });
}
```

### Dependent Queries

Execute queries in sequence when one depends on another:

```typescript
function ParcelDetails({ parcelId, organizationId }: { 
  parcelId: string; 
  organizationId: string 
}) {
  // First query: Get parcel
  const { data: parcel } = useQuery({
    queryKey: ['parcel', organizationId, parcelId],
    queryFn: () => parcelsApi.getOne(parcelId, organizationId),
    enabled: !!parcelId,
  });

  // Second query: Get analyses for this parcel (depends on parcel.id)
  const { data: analyses } = useQuery({
    queryKey: ['analyses', organizationId, { parcelId: parcel?.id }],
    queryFn: () => analysesApi.getAll({ parcelId: parcel!.id }, organizationId),
    enabled: !!parcel, // Only run when parcel exists
  });

  return <div>{/* Render parcel and analyses */}</div>;
}
```

### Real-time Updates with Supabase

Combine TanStack Query with Supabase real-time subscriptions. The subscription should invalidate the relevant TanStack Query keys.

```typescript
function useParcelsRealtime(organizationId: string, farmId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['parcels', organizationId, { farmId }],
    queryFn: () => parcelsApi.getAll({ farm_id: farmId }, organizationId),
  });

  useEffect(() => {
    if (!farmId) return;

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
          queryClient.invalidateQueries({ 
            queryKey: ['parcels', organizationId, { farmId }] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [farmId, organizationId, queryClient]);

  return query;
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
