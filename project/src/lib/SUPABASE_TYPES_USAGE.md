# Using Typed Supabase Client

This guide explains how to use the type-safe Supabase client throughout the application.

## Overview

We use Supabase's auto-generated TypeScript types for full type safety when querying the database. Types are generated from the database schema and provide compile-time safety.

## Generating Types

Run this command whenever the database schema changes:

```bash
npm run db:generate-types
```

This generates `src/types/database.types.ts` from your local Supabase instance.

## Importing Types

```typescript
import { supabase, type UserProfile, type Organization, type Farm } from '../lib/supabase';

// Or use the generic helpers
import { type Tables, type InsertDto, type UpdateDto } from '../lib/supabase';
```

## Available Type Helpers

### Tables<T>
Get the Row type for any table:

```typescript
type Worker = Tables<'workers'>;
type Parcel = Tables<'parcels'>;
```

### InsertDto<T>
Get the Insert type for creating new records:

```typescript
type WorkerInsert = InsertDto<'workers'>;

const newWorker: WorkerInsert = {
  organization_id: 'uuid',
  first_name: 'John',
  last_name: 'Doe',
  // TypeScript will error if required fields are missing
};
```

### UpdateDto<T>
Get the Update type for updating records:

```typescript
type WorkerUpdate = UpdateDto<'workers'>;

const updates: WorkerUpdate = {
  first_name: 'Jane',
  // All fields are optional
};
```

### Enums<T>
Get enum types from the database:

```typescript
type AnalysisType = Enums<'analysis_type'>;
```

## Common Usage Patterns

### 1. Fetching Data (SELECT)

```typescript
// Type is automatically inferred
const { data, error } = await supabase
  .from('workers')
  .select('*')
  .eq('organization_id', orgId);

// data is typed as Tables<'workers'>[] | null
```

### 2. Inserting Data (INSERT)

```typescript
import { type InsertDto } from '../lib/supabase';

type WorkerInsert = InsertDto<'workers'>;

const newWorker: WorkerInsert = {
  organization_id: orgId,
  first_name: 'John',
  last_name: 'Doe',
  worker_type: 'permanent',
  employment_status: 'active',
};

const { data, error } = await supabase
  .from('workers')
  .insert(newWorker)
  .select()
  .single();

// data is typed as Tables<'workers'> | null
```

### 3. Updating Data (UPDATE)

```typescript
import { type UpdateDto } from '../lib/supabase';

type WorkerUpdate = UpdateDto<'workers'>;

const updates: WorkerUpdate = {
  employment_status: 'inactive',
  exit_date: new Date().toISOString(),
};

const { data, error } = await supabase
  .from('workers')
  .update(updates)
  .eq('id', workerId)
  .select()
  .single();
```

### 4. Using in React Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase, type Worker } from '../lib/supabase';

export const useWorkers = (organizationId: string) => {
  return useQuery({
    queryKey: ['workers', organizationId],
    queryFn: async (): Promise<Worker[]> => {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });
};
```

### 5. Joins with Type Safety

```typescript
const { data, error } = await supabase
  .from('workers')
  .select(`
    *,
    organizations!inner(name),
    farms(name, location)
  `)
  .eq('organization_id', orgId);

// For complex joins, define custom return types
type WorkerWithRelations = Worker & {
  organizations: { name: string };
  farms: { name: string; location: string | null } | null;
};
```

### 6. Using Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, type InsertDto } from '../lib/supabase';

type WorkerInsert = InsertDto<'workers'>;

export const useCreateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (worker: WorkerInsert) => {
      const { data, error } = await supabase
        .from('workers')
        .insert(worker)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
};
```

## Pre-defined Common Types

These types are exported from `src/lib/supabase.ts`:

- `UserProfile` - user_profiles table
- `Organization` - organizations table
- `OrganizationUser` - organization_users table
- `Farm` - farms table
- `Parcel` - parcels table
- `Worker` - workers table
- `Analysis` - analyses table
- `Subscription` - subscriptions table

```typescript
import { type UserProfile, type Organization } from '../lib/supabase';
```

## Best Practices

1. **Always use generated types** - Don't manually define database table types
2. **Regenerate on schema changes** - Run `npm run db:generate-types` after migrations
3. **Use InsertDto for forms** - Helps with form validation and required fields
4. **Type query results explicitly** - Makes refactoring easier and catches errors early
5. **Handle null cases** - Supabase returns `null` for not found, array queries never return null

## Example: Complete CRUD Hook

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, type Parcel, type InsertDto, type UpdateDto } from '../lib/supabase';

type ParcelInsert = InsertDto<'parcels'>;
type ParcelUpdate = UpdateDto<'parcels'>;

// Read
export const useParcels = (farmId: string) => {
  return useQuery({
    queryKey: ['parcels', farmId],
    queryFn: async (): Promise<Parcel[]> => {
      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('farm_id', farmId);

      if (error) throw error;
      return data || [];
    },
  });
};

// Create
export const useCreateParcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcel: ParcelInsert) => {
      const { data, error } = await supabase
        .from('parcels')
        .insert(parcel)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parcels', data.farm_id] });
    },
  });
};

// Update
export const useUpdateParcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ParcelUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('parcels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['parcels', data.farm_id] });
    },
  });
};

// Delete
export const useDeleteParcel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('parcels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
    },
  });
};
```

## Troubleshooting

### Types out of sync
If TypeScript errors appear after schema changes:
```bash
npm run db:generate-types
```

### Type errors in complex queries
For complex joins, define custom types that extend the base types:

```typescript
type CustomWorker = Worker & {
  custom_field: string;
};
```

### Missing types
Check that the table exists in the database and run type generation.
