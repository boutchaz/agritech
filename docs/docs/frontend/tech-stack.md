# Frontend Tech Stack

The AgriTech Platform frontend is built with modern web technologies, optimized for performance, developer experience, and scalability.

## Core Technologies

### React 19 + TypeScript

- **React 19**: Latest version with improved performance and concurrent features
- **TypeScript**: Full type safety across the entire application
- **Vite**: Fast build tool and development server
  - Hot Module Replacement (HMR)
  - Optimized production builds
  - Development server on port 5173

```json
// package.json dependencies (excerpt)
{
  "react": "^19.x",
  "typescript": "^5.x",
  "vite": "^5.x"
}
```

### Routing: TanStack Router v1

File-based routing system with automatic code splitting and type-safe navigation.

**Key Features:**
- File-based route definition in `src/routes/`
- Auto-generated route tree (`routeTree.gen.ts`)
- Type-safe navigation and parameters
- Built-in loading states and error boundaries
- Route guards and authentication checks

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  component: DashboardComponent,
})
```

### State Management

**TanStack Query (React Query)** - Server state management
- Automatic caching and synchronization
- Optimistic updates
- Background refetching
- Request deduplication
- Query invalidation on mutations

**Jotai** - Global client state atoms
- Minimal boilerplate
- Atomic state updates
- Derived state support
- TypeScript-first design

```typescript
// Server state with TanStack Query
const { data: parcels } = useQuery({
  queryKey: ['parcels', { farmId }],
  queryFn: () => fetchParcels(farmId),
  staleTime: 1000 * 60, // 1 minute
})

// Global atoms with Jotai
import { atom } from 'jotai'
const selectedParcelAtom = atom<Parcel | null>(null)
```

### UI Libraries

**Tailwind CSS**
- Utility-first CSS framework
- Custom design system
- Dark mode support
- Responsive design utilities

**Radix UI Primitives**
- Accessible components (Dialog, Select, Dropdown, etc.)
- Unstyled, customizable components
- ARIA-compliant by default

**shadcn-inspired Components**
- Custom component library in `src/components/ui/`
- Built on Radix UI primitives
- Styled with Tailwind CSS

**Lucide React**
- Modern icon library
- Tree-shakeable
- Consistent icon design

### Forms and Validation

**React Hook Form v7+**
- High-performance form library
- Minimal re-renders
- Built-in validation
- Support for nested forms and field arrays

**Zod**
- TypeScript-first schema validation
- Runtime type checking
- Integration with React Hook Form via `@hookform/resolvers/zod`

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email(),
})

const form = useForm({
  resolver: zodResolver(schema),
})
```

## Backend Integration

### Supabase

**Two Client Instances:**

1. **Main Data Client** (`src/lib/supabase.ts`)
   - RLS-protected queries
   - Real-time subscriptions
   - Storage access

2. **Auth Client** (`src/lib/auth-supabase.ts`)
   - Dedicated authentication
   - Prevents circular dependencies

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**Features Used:**
- Row Level Security (RLS)
- Edge Functions
- Storage buckets
- Real-time subscriptions
- Database functions (RPC)

### FastAPI Satellite Service

Integration with Python backend for satellite imagery analysis.

**API Client** (`src/lib/satellite-api.ts`)
- Singleton API instance
- TypeScript interfaces for all endpoints
- Error handling and retries

**Key Endpoints:**
- `/api/indices/available-dates` - Cloud-free imagery dates
- `/api/indices/calculate` - Vegetation indices calculation
- `/api/indices/heatmap` - ECharts heatmap data
- `/api/indices/export` - GeoTIFF exports

## Visualization Libraries

### ECharts

Advanced charting library for satellite data visualization.

**Used For:**
- Satellite heatmaps overlays
- Time series vegetation indices
- Interactive data exploration
- High-performance rendering

### Recharts

Simple charting library for business analytics.

**Used For:**
- Profitability charts
- Cost analysis
- Revenue tracking
- Simple bar/line charts

### Leaflet + React Leaflet

Interactive map library for geospatial data.

**Features:**
- Parcel boundary drawing
- GeoJSON rendering
- Interactive map controls
- Custom markers and popups

### OpenLayers

Advanced geospatial features.

**Used For:**
- Advanced coordinate transformations
- Projection handling
- Complex geospatial operations

## Internationalization

### react-i18next

Full i18n support with translation management.

**Supported Languages:**
- English (en)
- French (fr)
- Arabic (ar) with RTL support

**Translation Files:** `src/locales/{lang}/common.json`

```typescript
import { useTranslation } from 'react-i18next'

const { t, i18n } = useTranslation()
const text = t('nav.dashboard') // "Dashboard"
i18n.changeLanguage('fr') // Switch to French
```

## Authentication & Authorization

### Multi-Tenant Authentication

**Supabase Auth** integrated with custom multi-tenant provider.

**Provider:** `MultiTenantAuthProvider`
- User authentication state
- Organization context
- Farm context
- Role-based access control
- Session persistence

### Authorization System

**CASL (v6)** - Fine-grained permissions
- Ability-based access control
- Subscription limit enforcement
- Feature gating

**RoleBasedAccess** - Database-backed permissions
- Simpler permission checks
- Component guards

## Development Tools

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Linting & Formatting

- **ESLint**: Code quality rules
- **Husky**: Git hooks
- **lint-staged**: Pre-commit linting

### Testing

**Vitest** - Unit and integration tests
- Fast test runner
- Vite-compatible
- Jest-like API

**Playwright** - End-to-end tests
- Cross-browser testing
- UI mode for debugging
- Test generation tools

```bash
npm test              # Run Vitest tests
npm run test:e2e      # Run Playwright E2E
npm run test:e2e:ui   # Playwright UI mode
```

## Build & Deployment

### Vite Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'tanstack': ['@tanstack/react-router', '@tanstack/react-query'],
        },
      },
    },
  },
})
```

### Environment Variables

```bash
# .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SATELLITE_SERVICE_URL=http://localhost:8001
VITE_POLAR_ACCESS_TOKEN=your_polar_token
```

**Access in Code:**
```typescript
const apiUrl = import.meta.env.VITE_SUPABASE_URL
```

## Path Aliases

The `@/` alias maps to the `src/` directory for cleaner imports.

```typescript
// Instead of:
import { supabase } from '../../../lib/supabase'

// Use:
import { supabase } from '@/lib/supabase'
```

## Performance Optimizations

1. **Route-based Code Splitting**: Automatic with TanStack Router
2. **Query Caching**: TanStack Query with strategic `staleTime`
3. **Lazy Loading**: Dynamic imports for heavy components
4. **Debounced Inputs**: Search and filter operations
5. **Virtual Scrolling**: Long lists (workers, tasks)
6. **Optimized Images**: Cloud-optimized GeoTIFFs for satellite data

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ features required
- No IE11 support

## Package Manager

**npm** is used throughout the project. All commands use `npm run` prefix.

```bash
npm install           # Install dependencies
npm run dev           # Start dev server
npm run build         # Production build
npm run preview       # Preview production build
```

## Summary

The AgriTech frontend combines cutting-edge React ecosystem tools with robust backend integration to deliver a performant, type-safe, and scalable agricultural management platform. The tech stack prioritizes developer experience while ensuring production-grade reliability.
