# Tasks: dashboard-skeleton

## Status: complete

---

### 1. Create DashboardSkeleton component

- [x] **RED** — Verify `project/src/components/Dashboard/DashboardSkeleton.tsx` does not exist. Verify importing `DashboardSkeleton` from that path would fail. Assertion: file is absent.
- [x] **ACTION** — Create `DashboardSkeleton.tsx` with a skeleton header (breadcrumb pills, title bar, subtitle bar, action pill area) + 3-row widget grid using `<Skeleton>` primitives. Row 1: 4 cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), Row 2: 2 cards (`grid-cols-1 lg:grid-cols-2`), Row 3: 2 cards (`grid-cols-1 lg:grid-cols-2`). Use same padding/spacing as the real dashboard (`p-3 sm:p-4 lg:p-6 space-y-6`). Each skeleton card should approximate the height of its corresponding widget's existing skeleton state.
- [x] **GREEN** — Verify file exists, is non-empty, exports `DashboardSkeleton`, and passes `tsc --noEmit`.

### 2. Replace PageLoader with DashboardSkeleton in dashboard route

- [x] **RED** — Read `project/src/routes/_authenticated/(core)/dashboard.tsx`. Confirm it imports `PageLoader` and returns `<PageLoader />` when `!currentOrganization`. Assertion: `PageLoader` is used as the loading fallback.
- [x] **ACTION** — Replace the `PageLoader` import with `DashboardSkeleton` import. Replace `return <PageLoader />;` with `return <DashboardSkeleton />;`. Remove the unused `PageLoader` import.
- [x] **GREEN** — Verify `dashboard.tsx` no longer references `PageLoader`. Verify it imports and renders `DashboardSkeleton`. Run `tsc --noEmit` — passes.

### 3. Replace '…' text with Skeleton in farm widget

- [x] **RED** — Read `project/src/components/Dashboard.tsx`. Confirm the farm widget uses `dashboardLoading ? '…'` for three stat values (parcels count, total area, analyses count). Assertion: literal `'…'` is used as loading placeholder.
- [x] **ACTION** — Import `Skeleton` from `@/components/ui/skeleton`. Replace the three `dashboardLoading ? '…' : value` ternaries with `dashboardLoading ? <Skeleton className="h-6 w-12 inline-block" /> : value` (adjust size to match the `text-base sm:text-lg font-semibold` text it replaces).
- [x] **GREEN** — Verify `Dashboard.tsx` no longer contains `'…'` as a loading placeholder. Verify it imports `Skeleton`. Run `tsc --noEmit` — passes.
