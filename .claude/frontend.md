# Frontend Development Guide

## Tech Stack
- **Framework**: React 19 with TypeScript, Vite bundler
- **Routing**: TanStack Router v1 (file-based routing)
- **State Management**: TanStack Query for server state, Jotai for global atoms
- **Forms**: React Hook Form v7+ with Zod validation
- **UI Components**: Custom components in `src/components/ui/`, Radix UI primitives
- **Styling**: Tailwind CSS
- **i18n**: react-i18next (English, French, Arabic)
- **Maps**: Leaflet + React Leaflet, OpenLayers for advanced features
- **Charts**: ECharts (satellite heatmaps), Recharts (business analytics)

## Project Structure
```
project/src/
├── routes/                   # TanStack Router file-based routes
├── components/               # React components (organized by feature)
├── hooks/                    # Custom React hooks
├── lib/                      # Utilities and API clients
├── schemas/                  # Zod validation schemas
├── types/                    # TypeScript types (including generated DB types)
└── locales/                  # i18n translations
```

## Component Organization

### By Feature
- `src/components/ui/` - Reusable primitives (Input, Select, FormField, Dialog, etc.)
- `src/components/SatelliteAnalysis/` - Satellite imagery viewers and analysis
- `src/components/SoilAnalysis/` - Soil analysis features
- `src/components/Workers/` - Worker management
- `src/components/Tasks/` - Task management
- `src/components/Harvests/` - Harvest tracking
- `src/components/Dashboard/` - Dashboard widgets
- `src/components/FarmHierarchy/` - Organization/farm/parcel hierarchy
- `src/components/authorization/` - Permission wrappers (Can, LimitWarning, ProtectedRoute)
- `src/components/Payments/` - Polar.sh subscription integration

## Form Patterns (React Hook Form + Zod)

### Standard Pattern
```typescript
// 1. Define Zod schema
const formSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email(),
});

// 2. Create form with zodResolver
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  mode: "onSubmit",  // or "onChange", "onBlur"
  defaultValues: { name: '', email: '' }
});

// 3. Handle submission with TanStack Query mutation
const mutation = useMutation({
  mutationFn: (data) => api.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['key'] });
  }
});

// 4. Use FormField components (custom wrapper around react-hook-form Controller)
<FormField
  control={form.control}
  name="name"
  render={({ field }) => <Input {...field} />}
/>
```

### Advanced Patterns
**Nested Forms**: Use `FormProvider` + `useFormContext()` for deeply nested components

**Dynamic Lists**: Use `useFieldArray()` for repeating form sections (e.g., adding multiple workers)

**Example**: See [src/components/Tasks/TaskForm.tsx](../project/src/components/Tasks/TaskForm.tsx)

## Data Fetching (TanStack Query)

All data fetching uses TanStack Query for caching, synchronization, and optimistic updates.

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

### Query Configuration Best Practices
- Set appropriate `staleTime` (5-30 min based on data mutability)
- Use `enabled` flag for conditional queries
- Invalidate queries after mutations with `queryClient.invalidateQueries()`
- Use `refetchOnWindowFocus: false` for expensive queries

## Internationalization

### Translations
Location: `src/locales/{en,fr,ar}/translation.json`

### Usage
```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

// In JSX
<h1>{t('key.nested.path')}</h1>
```

## Path Aliases
Use `@/` prefix for imports:
```typescript
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
```

Configured in `tsconfig.json` and `vite.config.ts`

## Development Commands

```bash
# From /project directory
npm run dev              # Start Vite dev server on port 5173
npm run build            # Build for production (runs type-check + vite build)
npm run preview          # Preview production build

# Linting & Type checking
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run type-check       # TypeScript type checking (tsc --noEmit)

# Testing
npm test                 # Run Vitest tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Playwright test UI
npm run test:e2e:debug   # Playwright debug mode
```

## Code Style
- ESLint enforced with pre-commit hooks (Husky + lint-staged)
- Fix on save recommended in VSCode
- Run `npm run lint:fix` before commits

## Testing Strategy
- **Unit tests**: Vitest for utilities and hooks (`src/utils/__tests__/`, `src/components/__tests__/`)
- **E2E tests**: Playwright for critical user flows (`test:e2e`)
- **Manual testing**: Test database migrations on local Supabase before remote push

## Performance Optimizations
- React Query caching with strategic `staleTime` configuration
- Lazy route loading via TanStack Router
- Pagination for large datasets
- Debounced search inputs
- Virtual scrolling for long lists

## Common Workflows

### Adding a New Route
1. Create route file in `src/routes/` (e.g., `_authenticated.new-feature.tsx`)
2. Export route with `createFileRoute('/new-feature')`
3. Add navigation link in `src/components/Sidebar.tsx`
4. Update permissions in `src/lib/casl/defineAbilityFor.ts` if needed
5. Test with different roles to ensure proper access control

### Adding a New Component
1. Create component in appropriate feature directory
2. Use TypeScript for props interface
3. Follow existing patterns (forms, data fetching)
4. Add permission checks if needed (Can, FeatureGate)
5. Write unit tests for complex logic

## Troubleshooting

**"Module not found" errors**: Run `npm install` and ensure `@/` paths are correct

**Type errors after schema changes**: Run `npm run db:generate-types-remote` and restart TypeScript server

**Hot reload not working**: Check Vite config, restart dev server
