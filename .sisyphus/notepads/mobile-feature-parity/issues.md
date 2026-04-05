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

## 2026-04-02 — Mobile typecheck baseline
- `pnpm exec tsc --noEmit` in `mobile/` still fails due pre-existing unrelated errors in accounting/tabs/lib/store files.
- ErrorBoundary/layout changes themselves are clean in LSP diagnostics, so this task should verify via modified-file diagnostics rather than whole-app type baseline until existing debt is resolved.

## 2026-04-02 — Log cleanup gotcha
- Some mobile files had stale LSP diagnostics after edits; re-reading the source showed the code had already been cleaned up.
- `mobile/src/lib/analyticsQueue.ts` depended on a missing `expo-network` import and a missing local `./analytics` module; it was normalized to the existing NetInfo dependency and a minimal local analytics shim to keep the mobile package type-safe.

## 2026-04-02 — Jest Expo warning noise in API tests
- `api.request()` calls `resolveOrganizationId()` fallback, which requires `authStore`; importing `authStore` pulls `expo-local-authentication` and can emit non-fatal Jest Expo native-module warnings during API tests.
- Tests still pass; warning suppression is optional but not required for correctness.

## 2026-04-02 — Accessibility implementation gotchas
- React Native type defs in this workspace reject `accessibilityRole="separator"`; `Divider` uses a safe cast while still emitting separator semantics at runtime.
- `pnpm --dir mobile exec tsc --noEmit` still reports pre-existing unrelated mobile errors (clock, harvest/new, ItemVariantSelector import, authStore). Verification for this task should rely on clean LSP diagnostics for the touched component files.

## 2026-04-02 — Login RHF migration verification baseline
- `pnpm exec tsc --noEmit` in `mobile/` still fails due unrelated pre-existing errors in `app/(drawer)/(tabs)/clock.tsx`, `app/harvest/new.tsx`, `src/components/ItemVariantSelector.tsx`, and `src/stores/authStore.ts`.
- `lsp_diagnostics` on the modified file `mobile/app/(auth)/login.tsx` is clean; use file-scoped diagnostics for this migration until global mobile TS debt is fixed.
