# TypeScript Type Generation

Generating TypeScript types from PostgreSQL database schema for type-safe database access.

## Overview

The AgriTech Platform uses Supabase CLI to auto-generate TypeScript types from the database schema, ensuring type safety between frontend and backend.

## Quick Start

```bash
# Generate from remote database
npm run db:generate-types-remote

# Generate from local database
npm run db:generate-types

# Output: src/types/database.types.ts
```

## Generated Types Structure

### Database Interface

```typescript
export interface Database {
  public: {
    Tables: {
      farms: {
        Row: Farm;              // SELECT
        Insert: FarmInsert;     // INSERT
        Update: FarmUpdate;     // UPDATE
      };
      // ... other tables
    };
    Views: {
      vw_ledger: {
        Row: LedgerView;
      };
      // ... other views
    };
    Functions: {
      has_valid_subscription: {
        Args: { org_id: string };
        Returns: boolean;
      };
      // ... other functions
    };
    Enums: {
      worker_type: 'fixed_salary' | 'daily_worker' | 'metayage';
      // ... other enums
    };
  };
}
```

### Helper Types

```typescript
// Extract table row type
export type Farm = Database['public']['Tables']['farms']['Row'];

// Extract insert type
export type FarmInsert = Database['public']['Tables']['farms']['Insert'];

// Extract update type
export type FarmUpdate = Database['public']['Tables']['farms']['Update'];

// Enum type
export type WorkerType = Database['public']['Enums']['worker_type'];
```

## Usage in Application

### With Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Now all queries are type-safe
const { data: farms } = await supabase
  .from('farms')  // ✅ Autocomplete available
  .select('*')
  .eq('organization_id', orgId);

// Type-safe insert
const { data, error } = await supabase
  .from('farms')
  .insert({
    organization_id: orgId,
    name: 'New Farm',
    total_area: 100.5
  }); // ✅ TypeScript validates all fields
```

### With TanStack Query

```typescript
import type { Farm } from '@/types/database.types';

export const useFarms = (orgId: string) => {
  return useQuery({
    queryKey: ['farms', orgId],
    queryFn: async (): Promise<Farm[]> => {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('organization_id', orgId);

      if (error) throw error;
      return data;
    }
  });
};
```

### With Zod Validation

```typescript
import { z } from 'zod';
import type { FarmInsert } from '@/types/database.types';

// Create Zod schema from database type
export const farmSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1, 'Name required'),
  total_area: z.number().positive().optional(),
  location: z.string().optional(),
}) satisfies z.ZodType<Partial<FarmInsert>>;

export type FarmFormData = z.infer<typeof farmSchema>;
```

## Workflow

### 1. Schema Changes

```bash
# Make schema changes via migration
npx supabase migration new add_new_field

# Edit migration file
# supabase/migrations/XXXXXX_add_new_field.sql
ALTER TABLE farms ADD COLUMN IF NOT EXISTS soil_type VARCHAR(100);
```

### 2. Apply Migration

```bash
# Test locally
npx supabase db reset

# Push to remote
npm run db:push
```

### 3. Regenerate Types

```bash
# Generate types from updated schema
npm run db:generate-types-remote

# Types are now updated in src/types/database.types.ts
```

### 4. Type Check

```bash
# Verify no type errors
npm run type-check

# If errors, fix code to match new schema
```

### 5. Commit Changes

```bash
git add supabase/migrations src/types/database.types.ts
git commit -m "feat: add soil_type field to farms"
```

## Custom Helper Types

Create additional helper types in `src/types/helpers.ts`:

```typescript
import type { Database } from './database.types';

// Table shorthand
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Usage
type Farm = Tables<'farms'>;
type NewFarm = InsertDto<'farms'>;
type FarmUpdate = UpdateDto<'farms'>;
```

### Relationships

```typescript
// Farm with related parcels
export type FarmWithParcels = Tables<'farms'> & {
  parcels: Tables<'parcels'>[];
};

// Invoice with items
export type InvoiceWithItems = Tables<'invoices'> & {
  items: Tables<'invoice_items'>[];
};
```

## Troubleshooting

### Issue: Types Not Updating

```bash
# Clear Supabase cache
rm -rf .supabase/

# Restart local Supabase
npx supabase stop
npx supabase start

# Regenerate types
npm run db:generate-types
```

### Issue: Type Errors After Migration

1. Check migration applied successfully
2. Regenerate types
3. Update application code to match new schema
4. Run type checker: `npm run type-check`

### Issue: RLS Blocking Type Generation

```bash
# Use service role key for type generation
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm run db:generate-types-remote
```

## Best Practices

1. **Always regenerate types after schema changes**
2. **Commit types with migrations**
3. **Use helper types for common patterns**
4. **Validate with Zod before database operations**
5. **Type check in CI/CD pipeline**

## NPM Scripts

```json
{
  "scripts": {
    "db:generate-types": "supabase gen types typescript --local > src/types/database.types.ts",
    "db:generate-types-remote": "supabase gen types typescript --linked > src/types/database.types.ts",
    "type-check": "tsc --noEmit"
  }
}
```

## Next Steps

- [Schema](./schema.md) - Complete database schema
- [Migrations](./migrations.md) - Migration workflow
- [Frontend Integration](../frontend/data-fetching.md) - Using types in application
