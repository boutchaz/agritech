---
sidebar_position: 5
title: "Development Setup & Commands"
---

# AGENTS.md - AgroGina Platform

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

## Desktop App (Tauri)

### Overview
The AgroGina Desktop app is a standalone offline-capable application built with **Tauri v1** (Rust backend + web frontend). It allows users to work without internet connection by importing organization data bundles.

**Location:** `project/src-tauri/`

### Key Features
- **Offline-first**: Works completely offline with local SQLite database
- **Data Import**: Import encrypted organization data bundles from the web app
- **Full CRUD**: Manage farms, parcels, tasks, workers, harvests, inventory
- **Local Authentication**: Secure bcrypt password hashing for offline login
- **Cross-platform**: Builds for macOS, Windows, and Linux

### Architecture
```
project/src-tauri/
├── src/
│   ├── main.rs           # Tauri app entry point
│   ├── commands/         # Tauri IPC commands (Rust)
│   │   ├── auth.rs       # Local login/logout/setup
│   │   ├── farms.rs      # Farm CRUD operations
│   │   ├── parcels.rs    # Parcel CRUD operations
│   │   ├── organizations.rs
│   │   ├── import.rs     # Bundle import/validation
│   │   └── data.rs       # Generic table operations
│   └── db/
│       ├── mod.rs        # SQLite database initialization
│       └── schema.sql    # Full database schema (856 lines)
├── icons/                # App icons for all platforms
├── Cargo.toml           # Rust dependencies
└── tauri.conf.json      # Tauri configuration
```

### Database Schema
The desktop app mirrors the cloud database with 35+ tables including:
- **Core**: organizations, roles, user_profiles, organization_users
- **Farm**: farms, parcels, structures, warehouses, cost_centers
- **Workforce**: workers, tasks, task_assignments
- **Harvest**: harvest_records, reception_batches
- **Inventory**: items, item_groups, stock_entries, stock_entry_items
- **Sales**: customers, quotes, sales_orders, invoices
- **Purchasing**: suppliers, purchase_orders
- **Accounting**: accounts, journal_entries, costs, revenues, payments

### Commands

```bash
# Development (from project/ directory)
pnpm tauri:dev           # Run desktop app with hot-reload

# Build for production
pnpm tauri:build         # Build for current platform

# Build for specific platform (requires Rust toolchain)
cd src-tauri && cargo build --release
```

### Dependencies (Rust)
- `tauri` v1 - Desktop framework
- `rusqlite` - SQLite database
- `bcrypt` - Password hashing
- `aes-gcm` - Encryption for data bundles
- `uuid` - ID generation
- `chrono` - Date/time handling

### Data Bundle Import
Users can export their organization data from the web app as an encrypted bundle and import it into the desktop app:

1. Web app exports: farms, parcels, workers, tasks, harvests, inventory, etc.
2. Bundle is encrypted with user-provided passphrase
3. Desktop app validates and imports the bundle
4. User can work offline with full data access

---

## Mobile App (Expo/React Native)

### Overview
**AgroGina Field** is a mobile companion app built with **Expo SDK 54** for field workers. It provides essential features for daily farm operations.

**Location:** `mobile/`

### Key Features
- **Task Management**: View and complete assigned tasks
- **Harvest Recording**: Log harvests with photos and GPS location
- **Time Tracking**: Clock in/out with geofencing support
- **Offline Support**: Works offline with SQLite sync
- **Biometric Auth**: Face ID / fingerprint login
- **Camera Integration**: Document crop conditions
- **GPS Tracking**: Record harvest locations

### Architecture
```
mobile/
├── app/                  # Expo Router pages
│   ├── _layout.tsx       # Root layout with providers
│   ├── index.tsx         # Entry redirect
│   ├── (auth)/           # Auth screens
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (tabs)/           # Main tab navigation
│   │   ├── _layout.tsx   # Tab bar configuration
│   │   ├── index.tsx     # Home dashboard
│   │   ├── tasks.tsx     # Task list
│   │   ├── harvest.tsx   # Harvest recording
│   │   ├── clock.tsx     # Time tracking
│   │   └── profile.tsx   # User profile
│   ├── task/[id].tsx     # Task detail screen
│   └── harvest/new.tsx   # New harvest modal
├── src/
│   ├── hooks/            # React Query hooks
│   │   ├── useTasks.ts
│   │   ├── useHarvests.ts
│   │   └── useFarms.ts
│   ├── stores/           # Zustand stores
│   │   └── authStore.ts
│   ├── lib/
│   │   ├── api.ts        # API client
│   │   └── offline.ts    # Offline sync logic
│   ├── types/
│   │   ├── auth.ts
│   │   └── database.types.ts
│   └── constants/
│       ├── config.ts     # API URLs
│       └── theme.ts      # Design tokens
├── assets/               # Images and icons
├── app.json              # Expo configuration
└── package.json
```

### Tab Navigation
| Tab | Icon | Description |
|-----|------|-------------|
| Home | `home` | Dashboard with today's summary |
| Tasks | `checkbox` | View and complete assigned tasks |
| Harvest | `leaf` | Record new harvests |
| Clock | `time` | Clock in/out, view time entries |
| Profile | `person` | User settings and logout |

### Commands

```bash
cd mobile

# Development
npm start               # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator

# Linting
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix lint issues
npm run type-check     # TypeScript check

# Build (requires EAS CLI)
npx expo prebuild      # Generate native projects
npx eas build         # Build for app stores
```

### Expo Plugins
- `expo-router` - File-based routing
- `expo-camera` - Harvest photo capture
- `expo-location` - GPS tracking for harvests
- `expo-local-authentication` - Biometric login
- `expo-secure-store` - Secure token storage
- `expo-sqlite` - Offline database
- `expo-notifications` - Task reminders
- `expo-image-picker` - Photo selection

### Permissions (iOS/Android)
| Permission | Purpose |
|------------|---------|
| Camera | Capture harvest photos, document crop conditions |
| Location | Record harvest GPS, geofenced clock-in |
| Background Location | Delivery tracking |
| Face ID / Biometrics | Quick secure login |
| Notifications | Task reminders |

### Environment Variables
```bash
# mobile/.env
API_URL=https://agritech-api.thebzlab.online
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

### State Management
- **Server State**: TanStack Query (React Query) for API data
- **Client State**: Zustand for auth and local UI state
- **Offline**: expo-sqlite for local cache

---

## Before Committing

```bash
cd project && npm run lint:fix && npm run type-check && npm test
```

---

## Environment Variables

**Frontend:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SATELLITE_SERVICE_URL`, `VITE_API_URL`
**Backend:** `GEE_SERVICE_ACCOUNT`, `GEE_PRIVATE_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`
**Mobile:** `API_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
