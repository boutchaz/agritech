# AgriTech Platform - Claude Code Instructions

You are working on a comprehensive agricultural technology platform built with React, TypeScript, Supabase, and Google Earth Engine.

## Context

This is a multi-tenant SaaS platform for agricultural management with:
- Full farm and parcel management
- Satellite vegetation index analysis (12+ indices)
- Complete double-entry accounting system
- Worker management and task assignment
- Harvest tracking and profitability analysis
- Subscription-based feature gating

## Architecture Principles

### 1. Multi-Tenancy
- **Hierarchy**: Organizations → Farms → Parcels → Sub-parcels
- **Access Control**: Two-layer system (CASL permissions + Role-based access)
- **Data Isolation**: All queries filtered by `organization_id` via RLS

### 2. React Patterns
- Use **TanStack Query** for ALL data fetching
- Use **React Hook Form** with **Zod** for forms
- Use **Jotai** for global state only
- Use **TanStack Router** for file-based routing

### 3. Type Safety
- Always use generated types from `src/types/database.types.ts`
- Run `npm run db:generate-types-remote` after schema changes
- Use TypeScript strict mode

### 4. Component Organization
```typescript
// Component structure
components/
├── ui/              # Reusable primitives
├── SatelliteAnalysis/
├── Accounting/      # Accounting modules
├── Workers/
└── Dashboard/
```

### 5. Data Fetching Pattern
```typescript
// Always use custom hooks with TanStack Query
export function useInvoices(orgId: string) {
  return useQuery({
    queryKey: ['invoices', orgId],
    queryFn: () => accountingApi.getInvoices(orgId),
    staleTime: 5 * 60 * 1000,
  });
}
```

## Common Tasks

### Adding a New Feature
1. Create route in `src/routes/_authenticated.feature.tsx`
2. Add navigation link in `src/components/Sidebar.tsx`
3. Update permissions in `src/lib/casl/defineAbilityFor.ts`
4. Create API functions in appropriate `-api.ts` file
5. Create custom hooks in `src/hooks/`

### Database Changes
1. Create migration in `project/supabase/migrations/`
2. Test locally: `npm run db:reset`
3. Generate types: `npm run db:generate-types`
4. Push to remote: `npm run db:push`

### Edge Functions
- Located in `project/supabase/functions/`
- Use Deno runtime
- Always include authentication
- Return proper CORS headers

## Code Style

- **2-space indentation**
- **camelCase** for variables
- **PascalCase** for components
- **ESLint** enforced
- Use path aliases (`@/` instead of relative imports)

## Key Patterns

### Forms
```typescript
// 1. Define schema
const schema = z.object({ name: z.string().min(1) });

// 2. Create form
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '' }
});

// 3. Submit with mutation
const mutation = useMutation({
  mutationFn: (data) => api.create(data),
  onSuccess: () => queryClient.invalidateQueries(['key'])
});
```

### Authorization
```typescript
// Component protection
<Can I="create" a="Farm">
  <CreateFarmButton />
</Can>

// Programmatic check
const canCreate = useCan('create', 'Farm');
```

### Satellite Analysis
```typescript
// Use satellite API client
import { satelliteApi } from '@/lib/satellite-api';

const response = await satelliteApi.calculateIndices({
  aoi: { geometry: boundary, name: 'My Parcel' },
  date_range: { start_date: '2024-01-01', end_date: '2024-01-31' },
  indices: ['NDVI', 'NDRE'],
  cloud_coverage: 10
});
```

## Important Files

- `CLAUDE.md` - Complete architecture documentation
- `project/src/lib/casl/ability.ts` - Permission definitions
- `project/src/lib/accounting-api.ts` - Accounting operations
- `satellite-indices-service/app/services/earth_engine.py` - GEE integration

## When Making Changes

1. **Always** run type checking after schema changes
2. **Always** generate database types
3. **Always** update CLAUDE.md if architecture changes
4. **Always** test locally before pushing to remote
5. **Always** check permissions match the feature

## Common Mistakes to Avoid

❌ Don't forget to add RLS policies for new tables
❌ Don't skip type generation
❌ Don't use direct Supabase queries in components
❌ Don't forget to invalidate queries after mutations
❌ Don't hardcode organization data
❌ Don't skip authentication in edge functions

## Testing

- Unit tests: `npm test` (Vitest)
- E2E tests: `npm run test:e2e` (Playwright)
- Linting: `npm run lint`
- Type checking: `npm run type-check`

## Getting Help

Refer to:
1. `CLAUDE.md` for detailed architecture
2. `AGENTS.md` for repository guidelines
3. Component files for examples
4. Supabase/docs for database patterns

