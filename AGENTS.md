# AGENTS.md - AgriTech Platform

> AI agent reference for this multi-tenant agricultural SaaS monorepo.

## Build/Lint/Test Commands

### Main Frontend (project/)
```bash
npm run dev              # Vite dev server (port 5173)
npm run build            # Production build
npm run lint:fix         # ESLint auto-fix
npm run type-check       # TypeScript check

npm test                 # Vitest (all tests)
npx vitest run path/to/file.test.ts  # Single test
npm run test:e2e         # Playwright E2E
npx playwright test e2e/specific.spec.ts  # Single E2E

npm run db:generate-types-remote  # Generate types (use after schema changes)
npm run db:reset         # Reset local Supabase
npm run db:push          # Push migrations to remote
```

### NestJS API (agritech-api/)
```bash
npm run start:dev        # Dev with hot-reload
npm run build && npm run start:prod  # Production
npm run lint             # ESLint + auto-fix
npm test                 # Jest tests
npx jest --testPathPattern="sequence"  # Single test
```

### Python Backend (backend-service/)
```bash
uvicorn app.main:app --reload --port 8001  # Dev server
pytest                   # All tests
pytest -v -k "test_name" # Single test
pytest --cov=app tests/  # With coverage
```

### Pre-commit Hook
Husky runs `lint-staged` on `project/*.{ts,tsx}` files with `eslint --fix`.

---

## Code Style

### TypeScript/React
- **2-space indent**, semicolons, single quotes
- `camelCase` variables/functions, `PascalCase` components/types
- Use `@/` path aliases: `import { X } from '@/lib/supabase'`
- Import order: external → `@/` aliases → relative → types

### Python
- **4-space indent**, PEP 8, type hints required
- `snake_case` functions/vars, `PascalCase` classes

---

## Type Safety (CRITICAL)

**NEVER use:** `as any`, `@ts-ignore`, `@ts-expect-error`

**Always regenerate types after schema changes:**
```bash
npm run db:generate-types-remote
```

**Use generated types:**
```typescript
import type { Database } from '@/types/database.types';
type Farm = Database['public']['Tables']['farms']['Row'];
```

---

## Data Fetching Pattern

```typescript
// Always use TanStack Query with custom hooks
export function useFarms(orgId: string) {
  return useQuery({
    queryKey: ['farms', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('farms').select('*').eq('organization_id', orgId);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,  // REQUIRED
    enabled: !!orgId,          // REQUIRED
  });
}

// Always invalidate after mutations
useMutation({
  mutationFn: createFarm,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['farms'] }),
});
```

---

## Forms Pattern

```typescript
const schema = z.object({ name: z.string().min(1), area: z.number().positive() });
const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', area: 0 } });
```

---

## Error Handling

```typescript
// NEVER: try { } catch (e) { }
// ALWAYS:
try {
  await operation();
} catch (error) {
  console.error('Failed:', error);
  toast.error('Something went wrong');
  throw error;
}
```

---

## Authorization (CASL)

```typescript
<Can I="create" a="Farm"><CreateButton /></Can>
const ability = useAbility(); if (ability.can('delete', 'Farm')) { ... }
```

---

## Key Files

| Purpose | Location |
|---------|----------|
| DB types | `project/src/types/database.types.ts` |
| Permissions | `project/src/lib/casl/defineAbilityFor.ts` |
| Routes | `project/src/routes/` |
| Hooks | `project/src/hooks/` |
| UI components | `project/src/components/ui/` |
| Translations | `project/src/locales/{en,fr,ar}/` |
| Migrations | `project/supabase/migrations/` |
| Satellite API | `backend-service/app/` |
| NestJS modules | `agritech-api/src/modules/` |

---

## Multi-Tenant Architecture

**Hierarchy:** Organizations -> Farms -> Parcels -> Sub-parcels

**Roles:** system_admin > organization_admin > farm_manager > farm_worker > day_laborer > viewer

**All queries MUST filter:** `.eq('organization_id', currentOrganization.id)`

---

## Common Mistakes

1. Forgetting RLS policies on new tables
2. Skipping `npm run db:generate-types-remote` after schema changes
3. Direct Supabase queries in components (use hooks)
4. Missing query invalidation after mutations
5. Skipping `staleTime` in queries
6. Not testing with different roles/subscription tiers

---

## Slash Commands

- `/add-feature` - Guided feature implementation
- `/fix-bug` - Systematic bug fixing

---

## Environment Variables

**Frontend:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SATELLITE_SERVICE_URL`
**Backend:** `GEE_SERVICE_ACCOUNT`, `GEE_PRIVATE_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`

---

## Before Committing

```bash
cd project && npm run lint:fix && npm run type-check && npm test
```
