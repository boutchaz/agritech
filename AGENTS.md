# AGENTS.md - AgriTech Platform

> AI agent reference for this multi-tenant agricultural SaaS monorepo.

## Package Manager

This project uses **pnpm** workspaces. All commands should be run from the root directory.

```bash
# Install pnpm if not installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

## Build/Lint/Test Commands

### Root Commands (run from repository root)
```bash
pnpm dev                 # Start main frontend (project/)
pnpm dev:api             # Start NestJS API
pnpm dev:admin           # Start admin app
pnpm dev:marketplace     # Start marketplace frontend
pnpm dev:cms             # Start Strapi CMS
pnpm dev:docs            # Start documentation

pnpm build               # Build all packages
pnpm lint                # Lint all packages
pnpm lint:fix            # Lint + auto-fix all packages
pnpm test                # Run frontend tests
pnpm test:api            # Run API tests
pnpm test:e2e            # Run E2E tests

pnpm db:generate-types   # Generate Supabase types
pnpm db:push             # Push migrations to remote
pnpm db:reset            # Reset local Supabase

pnpm tauri:dev           # Run desktop app in dev mode
pnpm tauri:build         # Build desktop app

pnpm clean               # Remove all node_modules
```

### Package-specific Commands
```bash
# Run command in specific package
pnpm --filter agriprofy <command>
pnpm --filter agritech-api <command>
pnpm --filter agritech-admin <command>
pnpm --filter marketplace-frontend <command>
pnpm --filter cms <command>
pnpm --filter agritech-docs <command>

# Examples
pnpm --filter agriprofy test
pnpm --filter agritech-api start:dev
```

### Main Frontend (project/)
```bash
pnpm --filter agriprofy dev              # Vite dev server (port 5173)
pnpm --filter agriprofy build            # Production build
pnpm --filter agriprofy lint:fix         # ESLint auto-fix
pnpm --filter agriprofy type-check       # TypeScript check

pnpm --filter agriprofy test             # Vitest (all tests)
pnpm --filter agriprofy test:e2e         # Playwright E2E

pnpm --filter agriprofy db:generate-types-remote  # Generate types
pnpm --filter agriprofy db:reset         # Reset local Supabase
pnpm --filter agriprofy db:push          # Push migrations to remote
```

### NestJS API (agritech-api/)
```bash
pnpm --filter agritech-api start:dev     # Dev with hot-reload
pnpm --filter agritech-api build         # Build
pnpm --filter agritech-api start:prod    # Production
pnpm --filter agritech-api lint          # ESLint + auto-fix
pnpm --filter agritech-api test          # Jest tests
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
pnpm db:generate-types
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
2. Skipping `pnpm db:generate-types` after schema changes
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

---

## Environment Variables

**Frontend:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SATELLITE_SERVICE_URL`
**Backend:** `GEE_SERVICE_ACCOUNT`, `GEE_PRIVATE_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`
