# Mobile Feature Parity — Learnings

## 2026-03-18 — Session 1 (ses_2fccf6f46ffe4J8UWniqyvKGj1)

### Project State at Wave 1 Start

**Existing mobile app structure:**
- `mobile/app/(tabs)/` — 5 tabs: index (home dashboard), tasks, harvest, clock, profile
- `mobile/app/(auth)/` — login, set-password
- `mobile/app/task/[id].tsx` — task detail
- `mobile/app/harvest/new.tsx` — harvest form
- `mobile/app/_layout.tsx` — Stack nav, QueryClient, auth check, push notifications
- `mobile/app/(tabs)/_layout.tsx` — Tabs nav with 5 tabs

**Existing hooks (4 only):**
- `mobile/src/hooks/useTasks.ts` — THE canonical pattern (useMyTasks, useTaskStatistics, useCreateTask)
- `mobile/src/hooks/useHarvests.ts`
- `mobile/src/hooks/useFarms.ts`
- `mobile/src/hooks/useAbility.ts`

**Existing components:**
- `mobile/src/components/ItemVariantSelector.tsx` — 617 lines, modal-based selectors
- `mobile/src/components/ui/` — EMPTY
- `mobile/src/components/forms/` — EMPTY
- `mobile/src/components/layout/` — EMPTY

**Existing API client:** `mobile/src/lib/api.ts` — 516 lines
- Singleton `api` client instance
- authApi, tasksApi, harvestsApi, farmsApi, parcelsApi, filesApi
- Token refresh on 401
- Analytics headers (X-Device-Type, X-App-Version, etc.)
- `api.uploadFile()` for multipart

**Theme tokens:** `mobile/src/constants/theme.ts`
- colors: primary, gray, red, yellow, blue, white, black, transparent
- spacing: xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)
- borderRadius: none sm md lg xl 2xl full
- fontSize: xs sm base lg xl 2xl 3xl 4xl
- fontWeight: normal medium semibold bold
- shadows: sm md lg

**Installed packages relevant to Wave 1:**
- expo-router ~6.0.22
- @react-navigation/native ^7.0.0
- react-native-gesture-handler ~2.28.0
- react-native-reanimated ~4.1.1
- react-native-safe-area-context ~5.6.0
- react-native-screens ~4.16.0
- i18next ^23.11.0 + react-i18next ^14.1.0 + expo-localization ~17.0.8
- @tanstack/react-query ^5.51.0
- zod ^3.23.0
- zustand ^4.5.0
- react-native-mmkv ^3.1.0
- expo-sqlite ~16.0.10
- @react-native-community/netinfo ^11.4.1
- expo-image-picker ~17.0.10
- expo-location ~19.0.8
- react-native-maps 1.20.1

### Critical Architecture Rules
1. ALL API calls via `api.ts` singleton — no direct Supabase
2. ALL user-facing strings via `t()` — no hardcoded text
3. Navigation max 3 levels deep
4. No `as any`, `@ts-ignore`, or empty catch blocks
5. Design system components ONLY from `mobile/src/components/ui/` + forms/

## Task 1 — API Gap Audit Findings

- Scanned 96 web hook files under `project/src/hooks` (excluding 3 `__tests__` files) and produced `mobile/docs/api-audit.md`.
- Status distribution: 2 `EXISTS`, 77 `PARTIAL`, 17 `MISSING` against coverage in `mobile/src/lib/api.ts`.
- Biggest gap pattern: most web hooks already call NestJS REST modules, but mobile only wraps auth/tasks/harvests/farms/parcels/files, so domain APIs (inventory, accounting, production intelligence, AI, notifications, subscriptions) are largely `PARTIAL`.
- Only direct Supabase usage found in hooks is `useMultiTenantLookups` (`crop_types`, `product_categories`, `task_categories`, `test_types`) and remains `MISSING` on mobile.
- High-priority mobile API expansion candidates from audit: workforce (`workers`, `task-assignments`), production (`deliveries`, `analyses`, `satellite`, `soil-analyses`), inventory (`items`, `stock-entries`, `reception-batches`, `warehouses`), accounting (`invoices`, `journal-entries`, `payments`, `purchase-orders`, `quotes`, `sales-orders`).

## Task 2 — Design System Core Components
- Created 15 components in mobile/src/components/ui/
- Used only theme tokens for all component colors; no hardcoded hex values
- Implemented shared primitives with Pressable-based interactions and exported all component prop types through ui barrel
- `npx tsc --noEmit` currently fails due pre-existing TypeScript errors outside `mobile/src/components/ui/`

## Task 3 — Form Components
- Installed react-hook-form + @hookform/resolvers
- Created 14 form components using Controller pattern
- Used text-input fallbacks for date/time entry and kept image/location pickers self-contained with Expo APIs
- `npx tsc --noEmit` shows no errors in `mobile/src/components/forms/`, but still fails on pre-existing issues outside forms

## Task 4 — i18n Setup
- i18next configured at mobile/src/lib/i18n.ts
- Locales: en/fr/ar with namespaces: common, navigation, auth
- RTL enabled for ar locale via I18nManager.forceRTL
- Used `useTranslation('auth')` and `useTranslation('navigation')` for namespaced keys in screens; added dashboard/task-specific keys under `common.json`

## Task 5 — Navigation Architecture
- Drawer layout at mobile/app/(drawer)/_layout.tsx
- 6 domain route groups created with placeholder index screens
- _layout.tsx updated to import i18n and register (drawer) screen
- Added drawer-scoped `(tabs)` re-export wrappers so the new drawer can host existing tab screens without moving `mobile/app/(tabs)/`
- Used CASL visibility checks from `useAbility()` and mapped inventory access to the existing mobile `Inventory` subject instead of a non-existent `Item` subject

## Task 6 — Hooks Infrastructure
- queryKeys.ts: centralized key factory for X domains
- usePagination: useInfiniteQuery wrapper
- useMutationWithToast: mutation with toast notifications
- useRefreshOnFocus: AppState-based refetch trigger
- useNetworkStatus: NetInfo wrapper
- api.ts: added 30s timeout + 1 retry on network error

## 2026-04-02 — Notification Redirect Normalization
- Added shared route mapper at `project/src/lib/notification-routes.ts` to centralize redirect logic for both notification surfaces.
- Mapper must normalize mixed backend keys (`parcelId`/`parcel_id`, `report_id`) and prefers semantic destination by type for AI, soil analysis, and admin notifications.
- Marketplace quote notifications should route to `/marketplace/quote-requests/received` (not `/marketplace/quotes`), and order redirects should not pass unsupported search params.
- `NotificationCenter.tsx` and `NotificationBell.tsx` now both resolve destinations via `getNotificationRedirect`, ensuring toast "View" action availability for all valid redirectable types.
