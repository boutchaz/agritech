---
sidebar_position: 3
---

# Mobile App (Expo/React Native)

## Overview

AgroGina Field is a mobile companion app built with Expo SDK 54 for field workers. It provides task management, harvest recording, time tracking, and offline support for daily farm operations.

**Location:** `mobile/`

## Tech Stack

- **Expo SDK 54** with `expo-router` (file-based routing)
- **TanStack Query** for server state management
- **Zustand** for client state (auth store)
- **expo-sqlite** for offline cache
- **expo-camera** for harvest photo capture
- **expo-location** for GPS tracking
- **expo-local-authentication** for biometric login
- **expo-secure-store** for secure token storage

## Directory Structure

```
mobile/
├── app/                  # Expo Router pages
│   ├── _layout.tsx       # Root layout with providers
│   ├── (auth)/           # Auth screens (login)
│   ├── (tabs)/           # Main tab navigation
│   │   ├── index.tsx     # Home dashboard
│   │   ├── tasks.tsx     # Task list
│   │   ├── harvest.tsx   # Harvest recording
│   │   ├── clock.tsx     # Time tracking
│   │   └── profile.tsx   # User profile
│   ├── task/[id].tsx     # Task detail
│   └── harvest/new.tsx   # New harvest modal
├── src/
│   ├── hooks/            # React Query hooks
│   ├── stores/           # Zustand stores
│   ├── lib/              # API client, offline sync
│   ├── types/            # TypeScript types
│   └── constants/        # Config, theme
└── package.json
```

## Tab Navigation

| Tab | Icon | Description |
|-----|------|-------------|
| Home | `home` | Dashboard with today's summary |
| Tasks | `checkbox` | View and complete assigned tasks |
| Harvest | `leaf` | Record new harvests |
| Clock | `time` | Clock in/out, view time entries |
| Profile | `person` | Settings and logout |

## Permissions

| Permission | Purpose |
|------------|---------|
| Camera | Capture harvest photos, document crop conditions |
| Location | Record harvest GPS coordinates |
| Background Location | Geofenced clock-in/out |
| Face ID / Biometrics | Quick secure login |
| Notifications | Task reminders |

## Commands

```bash
cd mobile

# Development
npm start            # Start Expo dev server
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator

# Code quality
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
npm run type-check   # TypeScript check
```

## Environment Variables

```bash
# mobile/.env
API_URL=https://agritech-api.thebzlab.online
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

## State Management

- **Server state**: TanStack Query (React Query) for all API data fetching and caching
- **Client state**: Zustand for authentication and local UI state
- **Offline cache**: expo-sqlite for local data persistence when offline
