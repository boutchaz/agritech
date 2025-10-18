# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgriTech Platform - A comprehensive agricultural technology platform with multi-tenant architecture, satellite data analysis, and AI-powered insights.

## Tech Stack

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript, Vite bundler
- **Routing**: TanStack Router v1 (file-based routing)
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form v7+ with Zod validation via @hookform/resolvers/zod
- **UI Components**: Custom components in `src/components/ui/`
- **Authentication**: Supabase Auth with multi-tenant support
- **Styling**: Tailwind CSS
- **Internationalization**: react-i18next

### Backend Services
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Satellite Service**: FastAPI (Python) with Google Earth Engine
- **Storage**: Supabase Storage for documents/invoices
- **Payments**: Polar.sh integration for subscriptions

## Common Commands

### Development
```bash
# Frontend development
npm run dev              # Start Vite dev server on port 5173

# Backend satellite service
cd satellite-indices-service
python -m uvicorn app.main:app --reload --port 8001

# Run tests
npm test                 # Run vitest tests
npm run test:watch      # Run tests in watch mode
npm run test:e2e        # Run Playwright E2E tests

# Linting & Type checking
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix ESLint issues
npm run type-check      # TypeScript type checking
```

### Database Management
```bash
# Supabase DB commands
npm run db:push         # Push local migrations to remote
npm run db:pull         # Pull remote schema changes
npm run db:reset        # Reset local database
npm run db:migrate      # Run migrations
npm run db:generate-types  # Generate TypeScript types from DB schema

# Schema management
npm run schema:pull     # Pull schema from remote
npm run schema:push     # Push schema to remote
npm run schema:diff     # Show schema differences
npm run schema:types    # Generate TypeScript types
```

### Build & Deploy
```bash
npm run build           # Build for production
npm run preview         # Preview production build
npm run deploy:fresh:remote  # Fresh deploy to remote
```

## Architecture & Patterns

### Multi-Tenant Architecture
- **Context**: `MultiTenantAuthProvider` manages organization/farm context
- **Hierarchy**: Organizations → Farms → Parcels
- **Roles**: owner, admin, member, viewer (defined per organization)
- **Access Control**: CASL-based permissions in `lib/casl/`

### Route Structure (TanStack Router)
- File-based routing in `src/routes/`
- Protected routes use `_authenticated` layout
- Settings routes nested under `settings.*`
- Dynamic routes use `$param` syntax

### Component Organization
```
src/components/
├── ui/              # Reusable UI components (Input, Select, FormField)
├── SatelliteAnalysis/  # Satellite imagery components
├── SoilAnalysis/    # Soil analysis features
├── Workers/         # Worker management
└── authorization/   # Permission components (Can, LimitWarning)
```

### Form Patterns
Always use React Hook Form with Zod:
```typescript
// 1. Define Zod schema
const schema = z.object({
  field: z.string().min(1)
});

// 2. Use with useForm
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  mode: "onSubmit"
});

// 3. For nested components, use FormProvider + useFormContext
// 4. For dynamic lists, use useFieldArray
```

### Data Fetching
Use TanStack Query for all API calls:
```typescript
// Custom hooks in src/hooks/
useQuery({ queryKey: ['key'], queryFn: fetchData })
useMutation({ mutationFn: updateData })
```

### Supabase Integration
- Client initialized in `lib/supabase.ts`
- Auth handled via `useAuth()` hook
- RLS policies enforce data access
- Storage buckets for file uploads

### Satellite Service API
- Base URL from `VITE_SATELLITE_SERVICE_URL` env
- Client in `lib/satellite-api.ts`
- Handles vegetation indices, time series, heatmaps
- Google Earth Engine backend processing

## Key Features & Implementation

### Stock Management (`StockManagement.tsx`)
- Auto-creates products during purchase
- Packaging types (bidon 5L, sac 25kg, etc.)
- Invoice/receipt upload to Supabase Storage
- Supplier and warehouse management

### Satellite Analysis
- Available dates fetched via `/indices/available-dates`
- Index image generation for NDVI, NDRE, etc.
- Interactive viewers with ECharts/Leaflet
- Time series analysis

### Subscription System
- Polar.sh integration for payment processing
- Feature gating with `FeatureGate` component
- Usage limits tracked in database
- Subscription tiers: free, basic, pro, enterprise

## Database Schema Highlights

### Core Tables
- `organizations` - Multi-tenant orgs
- `organization_users` - User-org relationships with roles
- `farms` - Farm management
- `parcels` - Crop parcels with GeoJSON boundaries
- `inventory` - Stock management with packaging info
- `suppliers`, `warehouses` - Supply chain

### Key Functions
- `get_user_organizations()` - User's org list
- `create_organization_with_owner()` - Org creation with owner role
- `check_feature_access()` - Feature availability check

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SATELLITE_SERVICE_URL
VITE_POLAR_ACCESS_TOKEN
```

### Satellite Service (.env)
```
GEE_SERVICE_ACCOUNT
GEE_PRIVATE_KEY
GEE_PROJECT_ID
SUPABASE_URL
SUPABASE_KEY
```

## Testing Strategy
- Unit tests with Vitest for utilities/hooks
- Component tests for critical UI components
- E2E tests with Playwright for user flows
- Test database migrations before deploying

## Performance Considerations
- React Query caching with staleTime configuration
- Lazy loading for routes with TanStack Router
- Image optimization for satellite imagery
- Pagination for large datasets (parcels, inventory)