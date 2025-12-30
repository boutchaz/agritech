---
title: Data Fetching Guide
description: Best practices and patterns for fetching data in the AgriTech Platform
---

# Data Fetching Guide

This guide explains the data fetching architecture of the AgriTech Platform and provides best practices for implementing new data fetching logic.

## 3-Layer Architecture

The platform uses a standardized three-layer architecture for all data fetching operations:

1.  **API Layer** (`src/lib/api/`)
2.  **Hook Layer** (`src/hooks/`)
3.  **Component Layer**

```mermaid
graph LR
    Component[Component Layer] --> Hook[Hook Layer]
    Hook --> API[API Layer]
    API --> Backend[Backend Services]
    
    subgraph "Frontend"
        Component
        Hook
        API
    end
    
    subgraph "Backend"
        Backend
    end
```

### 1. API Layer (`src/lib/api/`)

The API layer is responsible for making the actual network requests. It abstracts away the details of whether we are calling Supabase, a NestJS API, or the Python Satellite service.

**Rules:**
- One file per resource (e.g., `farms.ts`, `crops.ts`, `tasks.ts`)
- Export a single object containing all methods
- Use `apiClient` for REST calls or the `supabase` client for direct DB access
- Handle response transformation if necessary
- Throw errors for the hook layer to catch

**Example:**

```typescript
// project/src/lib/api/crops.ts
import { supabase } from '../supabase';

export const cropsApi = {
  async getAll(organizationId: string, farmId?: string): Promise<Crop[]> {
    let query = supabase
      .from('crops')
      .select('*, farms!inner(organization_id)')
      .eq('farms.organization_id', organizationId);

    if (farmId) {
      query = query.eq('farm_id', farmId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
```

### 2. Hook Layer (`src/hooks/`)

The hook layer wraps the API calls in TanStack Query hooks. This layer handles caching, loading states, error states, and revalidation.

**Rules:**
- One file per resource or related group of hooks
- Use `useQuery` for fetching and `useMutation` for updates
- Always include `organizationId` in the query key for proper multi-tenant isolation
- Set appropriate `staleTime` and `enabled` flags
- Use `useAuth` to get the current context

**Example:**

```typescript
// project/src/hooks/useCrops.ts
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { cropsApi } from '@/lib/api/crops';

export function useCrops(farmId?: string) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['crops', organizationId, farmId],
    queryFn: () => cropsApi.getAll(organizationId!, farmId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### 3. Component Layer

Components consume the custom hooks to display data and trigger mutations.

**Rules:**
- **NEVER** call Supabase or the API layer directly in a component
- Handle loading and error states gracefully
- Use `onSuccess` or `onError` callbacks for mutations if local UI feedback is needed

**Example:**

```typescript
// project/src/components/CropList.tsx
import { useCrops } from '@/hooks/useCrops';

export function CropList({ farmId }: { farmId: string }) {
  const { data: crops, isLoading, error } = useCrops(farmId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div className="grid gap-4">
      {crops?.map(crop => (
        <CropCard key={crop.id} crop={crop} />
      ))}
    </div>
  );
}
```

## When to Create New Hooks

- **New Resource**: Create a new API module and corresponding hooks file for any new database table or API resource.
- **Complex Filtering**: If you need a specific set of filters that are used in multiple places, create a specialized hook (e.g., `useActiveTasks`).
- **Data Transformation**: If multiple components need the same transformed data, perform the transformation in the hook layer or the API layer.

## Best Practices

### Query Keys
Always follow the hierarchical query key pattern:
`['resource', organizationId, { filters }]` or `['resource', organizationId, id]`

### Mutation Invalidation
After a mutation succeeds, always invalidate the relevant queries to ensure the UI stays in sync.

```typescript
// project/src/hooks/useTasks.ts
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => tasksApi.create(data),
    onSuccess: (newTask) => {
      // Invalidate the tasks list for this organization
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', newTask.organization_id] 
      });
    }
  });
}
```

### Error Handling
The API layer should throw meaningful errors, and the component layer should use `toast.error` or error boundaries to inform the user.

### Type Safety
Always define and export interfaces for your data models in the API layer or a shared `types/` directory.

```typescript
export interface Crop {
  id: string;
  name: string;
  // ...
}
```
