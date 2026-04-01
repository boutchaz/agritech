# Mobile Feature Parity — Issues & Gotchas

## 2026-03-18 — Session 1

### Pre-existing LSP Errors (do NOT fix in Wave 1 tasks)
1. `mobile/app/(tabs)/index.tsx:202:26` — "Avoid using index of array as key" (eslint rule)
2. `mobile/src/components/ItemVariantSelector.tsx:14:41` — "Cannot find module 'lucide-react-native'" (missing package)
3. `mobile/src/lib/api.ts:26:51` — Argument type 'string | null' not assignable to 'string'
4. `mobile/src/lib/api.ts:41:5` — Type 'string | null' not assignable to 'string'
5. `mobile/src/lib/offline.ts:229:20` — forEach callback should not return value
6. `mobile/src/stores/authStore.ts:145:31` — Property 'created_at' does not exist on UserProfile

### Package Notes
- `lucide-react-native` is imported in ItemVariantSelector but NOT in package.json — needs installing
- Drawer navigation: need to verify if `@react-navigation/drawer` is installed
- react-hook-form NOT yet installed — Task 3 must install it

### Navigation Architecture Note
- Expo Router v6 uses file-based routing
- For drawer: need `@react-navigation/drawer` + `react-native-drawer-layout`
- Existing `(tabs)` group must be preserved — do NOT delete or move existing screen files
- The drawer wraps the tabs via layout composition

## 2026-04-02 — Build/verification gotcha
- Workspace filter `pnpm --filter project build` does not match any package; correct frontend package name is `agriprofy` (`pnpm --filter agriprofy build`).
