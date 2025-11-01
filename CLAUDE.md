# AgriTech Platform - Claude Code Guide

Multi-tenant agricultural platform with satellite analysis (Google Earth Engine), inventory, tasks, accounting, and subscription-based feature gating.

## Quick Reference

**Stack**: React 19 + TypeScript, TanStack Router v1, TanStack Query, Supabase (PostgreSQL), FastAPI (Python)
**Imports**: Use `@/` prefix (`import { supabase } from '@/lib/supabase'`)
**Hierarchy**: Organizations → Farms → Parcels → Sub-parcels

## Key Commands

```bash
# Frontend (from /project)
npm run dev                      # Dev server :5173
npm run build                    # Production build
npm run type-check               # TypeScript check

# Database
npm run db:generate-types-remote # Generate types from remote DB
npm run db:push                  # Push migrations to remote
npm run schema:diff              # Compare schemas

# Satellite Service (from /satellite-indices-service)
python -m uvicorn app.main:app --reload --port 8001
```

## Architecture Patterns

### Multi-Tenant Auth
**Context**: `MultiTenantAuthProvider` ([src/components/MultiTenantAuthProvider.tsx](project/src/components/MultiTenantAuthProvider.tsx))

```typescript
const { user, profile, currentOrganization, currentFarm, userRole, hasRole, isAtLeastRole } = useAuth();
```

**Roles** (1=highest → 6=lowest): `system_admin`, `organization_admin`, `farm_manager`, `farm_worker`, `day_laborer`, `viewer`

### Authorization (Two Layers)

**CASL** ([src/lib/casl/](project/src/lib/casl/)) - Subscription-aware permissions:
```typescript
import { Can } from '@/components/authorization/Can';
<Can I="create" a="Farm"><CreateButton /></Can>
```

**RoleGuards** ([src/hooks/useRoleBasedAccess.tsx](project/src/hooks/useRoleBasedAccess.tsx)) - Simple role checks

### Routes (TanStack Router)
File-based in `src/routes/`, generates `routeTree.gen.ts` (DO NOT EDIT manually)

**Conventions**:
- `__root.tsx` - Root layout
- `_authenticated.tsx` - Protected layout (auth + subscription)
- `settings.profile.tsx` → `/settings/profile` (dot = nesting)
- `$moduleId.tsx` - Dynamic param

**Protection**:
```typescript
export const Route = createFileRoute('/path')({
  component: withRouteProtection(Component, 'action', 'resource'),
})
```

### Forms (React Hook Form + Zod)
Pattern: Zod schema → `zodResolver` → `useForm` → `<FormField>` wrapper

Example: [src/components/Tasks/TaskForm.tsx](project/src/components/Tasks/TaskForm.tsx)

### Data Fetching (TanStack Query)
All API calls use TanStack Query. Custom hooks in `src/hooks/`.

**Query Keys**:
- `['auth', 'profile', userId]`
- `['parcels', { organizationId, farmId }]`
- `['satellite-data', parcelId, { indices }]`

**Configuration**: Set `staleTime` based on data mutability (5-30 min)

### Satellite Service
**Client**: `src/lib/satellite-api.ts` (singleton `satelliteApi`)

**Endpoints**: `/api/indices/available-dates`, `/api/indices/calculate`, `/api/indices/heatmap`, `/api/analysis/parcel-statistics`

**Vegetation Indices**: NDVI, NDRE, NDMI, MNDWI, GCI, SAVI, OSAVI, MSAVI2, PRI, MSI, MCARI, TCARI

**Flow**: Request dates → Select date/indices → Query GEE → Save to `satellite_data` → Display heatmaps

### Supabase
**Clients**:
- `src/lib/supabase.ts` - Main data (RLS-protected)
- `src/lib/auth-supabase.ts` - Auth only (prevents circular deps)

**Storage Buckets**: `invoices`, `documents`, `satellite-exports`

**Key RPCs**: `get_user_organizations()`, `create_organization_with_owner()`, `check_feature_access()`

## Component Organization

- `src/components/ui/` - Primitives (Input, Select, Dialog, etc.)
- `src/components/SatelliteAnalysis/` - Satellite viewers
- `src/components/Tasks/`, `Workers/`, `Harvests/` - Feature modules
- `src/components/authorization/` - Permission wrappers (Can, FeatureGate, LimitWarning)
- `src/components/FarmHierarchy/` - Org/farm/parcel management

## Database Schema

**Operations Tables**: `organizations`, `farms`, `parcels`, `divergent_subparcels`, `workers`, `day_laborers`, `tasks`, `harvests`, `satellite_data`, `inventory`, `purchases`, `suppliers`, `warehouses`, `subscriptions`

**Accounting Tables**: `accounts`, `journal_entries`, `journal_items`, `invoices`, `invoice_items`, `payments`, `payment_allocations`, `cost_centers`, `taxes`, `bank_accounts`, `currencies`

**RLS**: Enforced on all tables. Users access only their organization's data.

## Key Features

**Satellite Analysis**: Cloud-free image detection, vegetation index calculation, time series, GeoTIFF export, batch processing

**Subscription (Polar.sh)**: Plans (Free, Basic, Pro, Enterprise), feature gating, usage limits, webhook integration

**Accounting**: Double-entry bookkeeping, Chart of Accounts, GL journals, invoices, payments, cost centers, financial reports

**Stock Management**: Auto-product creation, packaging types (bidon, sac), invoice uploads, supplier/warehouse management

## Development Guidelines

**Type Safety**: Generate types after schema changes with `npm run db:generate-types-remote`. Use types from `src/types/database.types.ts`.

**i18n**: Translations in `src/locales/{en,fr,ar}/translation.json`. Use `const { t } = useTranslation();`

**Code Style**: ESLint + Husky pre-commit hooks. Run `npm run lint:fix` before commits.

**Testing**: Vitest (unit), Playwright (E2E). Test migrations on local Supabase first.

**Build Configuration**: Uses minimal Vite config without manual chunk splitting to avoid React context issues. Single bundle approach (~5MB uncompressed, 1.3MB gzipped) ensures all React-dependent libraries share the same React instance. Leaflet SSR issues handled via `ssr.noExternal` config.

## Common Workflows

**Add Route**: Create in `src/routes/` → Add to Sidebar → Update CASL permissions if needed

**Add DB Table**: Migration SQL → `npm run db:reset` → `npm run db:generate-types` → `npm run db:push` → Create hooks

**Add Satellite Index**: Update `VegetationIndex` type in `satellite-api.ts` → Implement in `gee_service.py` → Test with small AOI

**Deploy Schema**: `npm run schema:diff` → `npm run schema:backup` → `npm run schema:push` → `npm run schema:types`

## Troubleshooting

- **Module not found**: Check `@/` paths, run `npm install`
- **Type errors**: `npm run db:generate-types-remote`, restart TS server
- **RLS blocks queries**: Verify user in correct org with required role
- **Satellite timeout**: Check GEE credentials, reduce AOI size, increase cloud threshold

## Detailed Documentation

For in-depth guides, see `.claude/` directory:
- `architecture.md` - Multi-tenant patterns, auth flows
- `database.md` - Schema details, RLS policies, migrations
- `frontend.md` - Component patterns, forms, routing
- `satellite.md` - GEE integration, indices, batch processing
- `accounting.md` - Double-entry system, journal workflows

**Resources**: [Supabase Docs](https://supabase.com/docs) | [TanStack Router](https://tanstack.com/router/latest) | [TanStack Query](https://tanstack.com/query/latest) | [React Hook Form](https://react-hook-form.com)
