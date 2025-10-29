# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgriTech Platform - A comprehensive agricultural technology platform with multi-tenant architecture, satellite data analysis via Google Earth Engine, and AI-powered insights. Built for managing farms, parcels, workers, inventory, tasks, satellite vegetation analysis, and **full double-entry accounting** with subscription-based feature gating.

## Tech Stack

### Frontend (React + TypeScript)
- **Framework**: React 19 with TypeScript, Vite bundler
- **Routing**: TanStack Router v1 (file-based routing with `routeTree.gen.ts`)
- **State Management**: TanStack Query (React Query) for server state, Jotai for global atoms
- **Forms**: React Hook Form v7+ with Zod validation via `@hookform/resolvers/zod`
- **UI Components**: Custom components in `src/components/ui/`, Radix UI primitives, shadcn-inspired patterns
- **Authentication**: Supabase Auth with multi-tenant support via `MultiTenantAuthProvider`
- **Authorization**: CASL-based permissions with subscription limit enforcement
- **Styling**: Tailwind CSS with `@/` path alias for imports
- **Internationalization**: react-i18next (supports English, French, Arabic)
- **Maps**: Leaflet + React Leaflet for interactive maps, OpenLayers for advanced geospatial features
- **Charts**: ECharts for satellite heatmaps, Recharts for business analytics

### Backend Services
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Satellite Service**: FastAPI (Python) with Google Earth Engine for vegetation indices
- **Storage**: Supabase Storage for documents, invoices, and exported GeoTIFF files
- **Payments**: Polar.sh integration for subscription management
- **Background Jobs**: Celery + Redis (for batch satellite processing)

### Project Structure
```
agritech/
├── project/                          # React frontend (main application)
│   ├── src/
│   │   ├── routes/                   # TanStack Router file-based routes
│   │   ├── components/               # React components (organized by feature)
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── lib/                      # Utilities and API clients
│   │   ├── schemas/                  # Zod validation schemas
│   │   ├── types/                    # TypeScript types (including generated DB types)
│   │   └── locales/                  # i18n translations
│   └── supabase/                     # Supabase migrations and functions
├── satellite-indices-service/        # FastAPI backend
│   ├── app/
│   │   ├── api/                      # FastAPI route handlers
│   │   ├── services/                 # Business logic (GEE integration)
│   │   ├── models/                   # Pydantic models
│   │   └── core/                     # Configuration
│   └── research/                     # Jupyter notebooks for GEE research
└── supabase/                         # Database migrations and edge functions
```

## Common Commands

### Frontend Development
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

### Backend Satellite Service
```bash
# From /satellite-indices-service directory
python -m uvicorn app.main:app --reload --port 8001

# Docker (from root)
docker-compose up -d     # Starts both frontend and satellite service
```

### Database Management
```bash
# From /project directory
# Local Supabase CLI commands
npm run db:start         # Start local Supabase
npm run db:stop          # Stop local Supabase
npm run db:reset         # Reset local database

# Remote database commands (requires Supabase CLI linked project)
npm run db:push          # Push local migrations to remote (--linked)
npm run db:pull          # Pull remote schema changes
npm run db:diff          # Show schema differences (--linked)
npm run db:dump          # Dump schema to supabase/schema/public.sql

# Type generation from database schema
npm run db:generate-types        # Generate from local
npm run db:generate-types-remote # Generate from remote (--linked)
# Output: src/types/database.types.ts

# Custom schema scripts (via ./scripts/schema.sh)
npm run schema:pull      # Pull schema with backup
npm run schema:push      # Push schema changes
npm run schema:diff      # Compare schemas
npm run schema:types     # Generate types with validation
npm run schema:backup    # Backup current schema
```

### Deployment
```bash
npm run deploy:fresh:local   # Fresh deploy to local Supabase
npm run deploy:fresh:remote  # Fresh deploy to remote Supabase
npm run polar:setup          # Setup Polar.sh subscription products
```

## Architecture & Patterns

### Multi-Tenant Architecture

**Hierarchy**: Organizations → Farms → Parcels → Divergent Sub-parcels (AOI-based)

**Context Management**: `MultiTenantAuthProvider` (`src/components/MultiTenantAuthProvider.tsx`)
- Manages user authentication state via Supabase Auth
- Maintains current organization and farm selection (persisted to localStorage)
- Provides role-based access via `userRole`, `hasRole()`, `isAtLeastRole()`
- Handles onboarding flows for new users
- Subscription validation and password setup enforcement

**Role Hierarchy** (numeric levels 1-6):
1. `system_admin` - Platform-wide access
2. `organization_admin` - Full organization management (billing, users, settings)
3. `farm_manager` - Farm-level operations
4. `farm_worker` - Task execution, analysis creation, cost management
5. `day_laborer` - Limited to assigned tasks only
6. `viewer` - Read-only access

**Access Context**:
```typescript
const {
  user,                    // Supabase auth user
  profile,                 // User profile
  organizations,           // All user's orgs
  currentOrganization,     // Selected org
  farms,                   // Farms in current org
  currentFarm,             // Selected farm
  userRole,                // Role in current org
  hasRole,                 // Check specific role(s)
  isAtLeastRole            // Check role hierarchy
} = useAuth();
```

### Authorization (Two-Layer System)

**Layer 1: CASL Ability** (`src/lib/casl/`) - Fine-grained permissions with subscription enforcement
- Permissions: `manage`, `create`, `read`, `update`, `delete`, `invite`, `export`
- Resources: `all`, `Farm`, `Parcel`, `User`, `SatelliteReport`, `Analysis`, `Task`, etc.
- Subscription limits enforced: `max_farms`, `max_parcels`, `max_users`, `max_satellite_reports`
- Feature flags: `has_analytics`, `has_sensor_integration`, `has_api_access`, `has_advanced_reporting`

**Usage**:
```typescript
import { Can } from '@/components/authorization/Can';
import { useCan } from '@/lib/casl/AbilityContext';

// Component-based
<Can I="create" a="Farm">
  <CreateFarmButton />
</Can>

// Programmatic
const canCreateFarm = useCan('create', 'Farm');
```

**Layer 2: RoleBasedAccess Hook** (`src/hooks/useRoleBasedAccess.tsx`) - Simpler DB-backed checks
- Uses Supabase RPC functions for permission lookups
- Provides `<PermissionGuard>`, `<RoleGuard>` components
- HOC: `withPermission(Component, resource, action)`

### Route Structure (TanStack Router)

**File-based routing** in `src/routes/` with auto-generated `routeTree.gen.ts` (DO NOT EDIT manually).

**Naming Conventions**:
- `__root.tsx` - Root layout with providers
- `_authenticated.tsx` - Protected layout wrapper (checks auth + subscription)
- `dashboard.tsx` - Maps to `/dashboard`
- `settings.profile.tsx` - Nested route `/settings/profile` (dot notation)
- `tasks.index.tsx` - Index route for `/tasks`
- `tasks.calendar.tsx` - Child route `/tasks/calendar`
- `$moduleId.tsx` - Dynamic route with parameter (e.g., `/fruit-trees`)

**Protection Pattern**:
- All protected routes inherit from `_authenticated` layout
- Layout uses `beforeLoad` hook to check authentication
- Unauthenticated users redirected to `/login?redirect={current_url}`
- Subscription validation blocks non-paying users (except `/settings`)

**Route Registration**:
```typescript
export const Route = createFileRoute('/path')({
  component: ComponentName,
  // Or with CASL protection:
  component: withRouteProtection(ComponentName, 'action', 'resource'),
})
```

### Component Organization

**By Feature**:
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

### Form Patterns (React Hook Form + Zod)

**Standard Pattern**:
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

**Nested Forms**: Use `FormProvider` + `useFormContext()` for deeply nested components

**Dynamic Lists**: Use `useFieldArray()` for repeating form sections (e.g., adding multiple workers)

### Data Fetching (TanStack Query)

**All data fetching uses TanStack Query** for caching, synchronization, and optimistic updates.

**Query Key Structure**:
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
```

**Query Configuration**:
- **staleTime**: 5 minutes (auth queries), 1 minute (feature queries)
- **Retries**: Minimal (1) for auth to handle 403 gracefully
- **Refetch on mount**: Disabled for expensive satellite queries

**Custom Hooks Pattern**:
```typescript
// src/hooks/useParcels.ts
export const useParcels = (farmId: string) => {
  return useQuery({
    queryKey: ['parcels', { farmId }],
    queryFn: () => supabase.from('parcels').select('*').eq('farm_id', farmId),
    enabled: !!farmId,
  });
};
```

### Satellite Service Integration

**API Client**: `src/lib/satellite-api.ts` (singleton `satelliteApi` instance)

**Key Endpoints**:
- `POST /api/indices/available-dates` - Get available satellite dates for AOI
- `POST /api/indices/calculate` - Calculate vegetation indices (NDVI, NDRE, etc.)
- `POST /api/indices/heatmap` - Get heatmap data for ECharts visualization
- `POST /api/indices/export` - Export GeoTIFF files
- `POST /api/analysis/parcel-statistics` - Comprehensive parcel analysis with stats
- `POST /api/analysis/cloud-coverage` - Check if cloud-free images exist
- `POST /api/analysis/batch` - Start batch processing job for multiple parcels

**Cloud Masking Strategy**:
- Default: AOI-based cloud filtering (`use_aoi_cloud_filter: true`)
- Includes 300m buffer around AOI (`cloud_buffer_meters: 300`)
- Pre-checks cloud coverage before expensive calculations

**Vegetation Indices**: NDVI, NDRE, NDMI, MNDWI, GCI, SAVI, OSAVI, MSAVI2, PRI, MSI, MCARI, TCARI

**Data Flow**:
1. Frontend requests available dates for parcel AOI
2. User selects date and indices
3. Backend queries Google Earth Engine (Sentinel-2 imagery)
4. Statistics calculated and saved to `satellite_data` table
5. Optional GeoTIFF export to Supabase Storage
6. Frontend displays heatmaps, time series, and reports

### Supabase Integration

**Two Clients**:
- `src/lib/supabase.ts` - Main data client (RLS-protected queries)
- `src/lib/auth-supabase.ts` - Auth-only client (prevents circular dependencies)

**Edge Functions** (in `supabase/functions/`):
- `generate-index-image` - Proxies satellite service with user JWT authentication
- Additional functions for secure server-side operations

**Storage Buckets**:
- `invoices` - Purchase receipts and invoices
- `documents` - General document storage
- `satellite-exports` - GeoTIFF exports (time-limited signed URLs)

**RLS (Row Level Security)**: Enforced at database level for all tables. Users can only access data from their organizations.

**RPC Functions** (key helpers):
- `get_user_organizations()` - Returns user's orgs with roles
- `create_organization_with_owner()` - Creates org and assigns owner role
- `check_feature_access(feature_name)` - Check if subscription allows feature

## Key Features & Implementation Patterns

### Stock Management
- **Auto-product creation**: Products created automatically during purchase entry
- **Packaging types**: Supports bidon (5L, 10L, 20L), sac (25kg, 50kg), etc.
- **Invoice uploads**: Stored in Supabase Storage with purchase records
- **Supplier/Warehouse**: Full supplier and warehouse management

### Satellite Analysis
- **Available dates**: Pre-check for cloud-free images before analysis
- **Interactive viewers**: ECharts heatmaps with Leaflet overlay for parcels
- **Time series**: Historical vegetation index tracking
- **Export**: Download GeoTIFF files for GIS software
- **Batch processing**: Queue multiple parcels for overnight processing

### Task Management
- **Task types**: Irrigation, fertilization, pesticide, harvest, maintenance, etc.
- **Assignment**: Assign to workers or day laborers
- **Cost tracking**: Track costs per task (labor, materials, utilities)
- **Payment status**: Mark tasks as paid/unpaid
- **Calendar view**: View tasks on calendar (`/tasks/calendar`)

### Harvest Management
- **Harvest tracking**: Record harvest date, quantity, quality
- **Cost allocation**: Link costs from tasks to harvest
- **Profitability**: Calculate profit per harvest (revenue - costs)

### Subscription System (Polar.sh)
- **Plans**: Free, Basic, Pro, Enterprise
- **Feature gating**: `<FeatureGate feature="analytics">` component
- **Usage limits**: `<LimitWarning resource="farms" />` component
- **Checkout flow**: `/select-trial` → Polar checkout → `/checkout-success`
- **Webhooks**: Update subscription status via Polar webhooks

### Accounting Module (Double-Entry Bookkeeping)
- **Chart of Accounts**: Hierarchical account structure (Assets, Liabilities, Equity, Revenue, Expenses)
- **General Ledger**: Full journal entry system with debit/credit validation
- **Invoices**: Sales and purchase invoices with automatic GL posting
- **Payments**: Payment matching with invoice allocation
- **Cost Centers**: Track costs by farm/parcel for analytics
- **Reports**: Balance Sheet, P&L, Trial Balance, Aged Receivables/Payables
- **Integration**: Auto-creates journals from purchases, harvests, tasks
- **Multi-currency**: Support for multiple currencies with exchange rates
- **Bank Accounts**: Bank account management linked to GL

## Database Schema Highlights

### Core Tables

**Operations**:
- `user_profiles` - User information (language, timezone, preferences)
- `organizations` - Multi-tenant orgs (currency, timezone, settings)
- `organization_users` - User-org relationships with roles
- `farms` - Farm management
- `parcels` - Crop parcels with GeoJSON boundaries
- `divergent_subparcels` - Sub-parcels within parcels (for varied crop areas)
- `workers` - Permanent workers (contracts, salaries)
- `day_laborers` - Temporary workers (daily rates)
- `tasks` - Task management with costs
- `harvests` - Harvest tracking
- `satellite_data` - Vegetation index statistics and GeoTIFF URLs
- `inventory` - Stock management with packaging info
- `purchases` - Purchase entries with invoice uploads
- `suppliers`, `warehouses` - Supply chain management
- `subscriptions` - Polar.sh subscription data

**Accounting** (Phase 1):
- `accounts` - Chart of Accounts hierarchy
- `journal_entries` - Ledger transactions (header)
- `journal_items` - Ledger transaction lines (debit/credit)
- `invoices` - Sales and purchase invoices
- `invoice_items` - Invoice line items
- `payments` - Payment records
- `payment_allocations` - Payment-to-invoice matching
- `cost_centers` - Cost tracking dimensions (farms/parcels)
- `taxes` - Tax definitions and rates
- `bank_accounts` - Bank account management
- `currencies` - Currency definitions

### Key Functions

**Operations**:
- `get_user_organizations()` - User's org list with roles
- `create_organization_with_owner()` - Org creation with owner role
- `check_feature_access(feature_name)` - Feature availability check
- `get_current_user_profile()` - Current user profile

**Accounting**:
- `validate_journal_balance()` - Auto-update journal entry totals (trigger)
- `update_invoice_totals()` - Recalculate invoice amounts from line items (trigger)
- `update_invoice_outstanding()` - Update outstanding balance when payments allocated (trigger)
- `generate_invoice_number()` - Generate sequential invoice numbers
- `generate_payment_number()` - Generate sequential payment numbers

## Environment Variables

### Frontend (.env in /project)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SATELLITE_SERVICE_URL=http://localhost:8001
VITE_POLAR_ACCESS_TOKEN=your_polar_token
```

### Satellite Service (.env in /satellite-indices-service)
```bash
GEE_SERVICE_ACCOUNT=your_gee_service_account
GEE_PRIVATE_KEY=your_gee_private_key
GEE_PROJECT_ID=your_gee_project_id
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
```

## Development Guidelines

### Type Safety
- Always generate types after schema changes: `npm run db:generate-types-remote`
- Use `Database` types from `src/types/database.types.ts`
- Helper types: `Tables<'table_name'>`, `InsertDto<'table_name'>`, `UpdateDto<'table_name'>`

### Path Aliases
- Use `@/` prefix for imports: `import { supabase } from '@/lib/supabase'`
- Configured in `tsconfig.json` and `vite.config.ts`

### Internationalization
- Add translations to `src/locales/{en,fr,ar}/translation.json`
- Use `useTranslation()` hook: `const { t } = useTranslation();`
- Format: `t('key.nested.path')`

### Code Style
- ESLint enforced with pre-commit hooks (Husky + lint-staged)
- Fix on save recommended in VSCode
- Run `npm run lint:fix` before commits

### Testing Strategy
- **Unit tests**: Vitest for utilities and hooks (`src/utils/__tests__/`, `src/components/__tests__/`)
- **E2E tests**: Playwright for critical user flows (`test:e2e`)
- **Manual testing**: Test database migrations on local Supabase before remote push

### Performance Optimizations
- React Query caching with strategic `staleTime` configuration
- Lazy route loading via TanStack Router
- Image optimization for satellite imagery (cloud-optimized GeoTIFFs)
- Pagination for large datasets (parcels, inventory, tasks)
- Debounced search inputs
- Virtual scrolling for long lists (workers, tasks)

## Common Workflows

### Adding a New Feature Route
1. Create route file in `src/routes/` (e.g., `_authenticated.new-feature.tsx`)
2. Export route with `createFileRoute('/new-feature')`
3. Add navigation link in `src/components/Sidebar.tsx`
4. Update permissions in `src/lib/casl/defineAbilityFor.ts` if needed
5. Test with different roles to ensure proper access control

### Adding a New Database Table
1. Create migration SQL in `project/supabase/migrations/`
2. Test locally: `npm run db:reset`
3. Generate types: `npm run db:generate-types`
4. Push to remote: `npm run db:push`
5. Create custom hooks in `src/hooks/` for querying the table

### Adding a New Satellite Index
1. Add index to `VegetationIndex` type in `src/lib/satellite-api.ts`
2. Update `VEGETATION_INDICES` array
3. Add description to `VEGETATION_INDEX_DESCRIPTIONS`
4. Implement calculation in satellite service `app/services/gee_service.py`
5. Test with small AOI before deploying

### Deploying Schema Changes
1. Review changes: `npm run schema:diff`
2. Backup current: `npm run schema:backup`
3. Push changes: `npm run schema:push`
4. Verify types: `npm run schema:types`
5. Test in staging environment before production

## Troubleshooting

### Common Issues

**"Module not found" errors**: Run `npm install` and ensure `@/` paths are correct

**Type errors after schema changes**: Run `npm run db:generate-types-remote` and restart TypeScript server

**Supabase CLI errors**: Ensure project is linked: `npx supabase link --project-ref your_ref`

**Satellite service timeout**: Check GEE credentials, reduce AOI size, or increase cloud coverage threshold

**RLS policy blocks queries**: Verify user is in correct organization and has required role

**Polar.sh webhook failures**: Check webhook URL is publicly accessible and secret is configured

## Documentation & Resources

- **Supabase Docs**: https://supabase.com/docs
- **TanStack Router**: https://tanstack.com/router/latest
- **TanStack Query**: https://tanstack.com/query/latest
- **React Hook Form**: https://react-hook-form.com
- **Google Earth Engine**: https://earthengine.google.com
- **Polar.sh API**: https://api.polar.sh/docs
