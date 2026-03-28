# Design: dashboard-skeleton

## Approach

Create a `DashboardSkeleton` component that replicates the exact layout structure of the regular dashboard, using existing `<Skeleton>` primitives. Replace the `PageLoader` guard in `dashboard.tsx` with this component.

## Layout to Mirror

The regular dashboard renders:

```
ModernPageHeader (breadcrumbs + title + subtitle + actions)

InlineFarmSelector (thin bar)

Row 1: 4 cards  — grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
  [ParcelsOverview] [StockAlerts] [HarvestSummary] [SalesOverview]

Row 2: 2 wide   — grid-cols-1 lg:grid-cols-2
  [UpcomingTasks] [Accounting]

Row 3: 2 wide   — grid-cols-1 lg:grid-cols-2
  [Analysis] [Workers]
```

The skeleton must use the **same grid classes** and **same approximate heights** so the transition is shift-free.

## Component Structure

```
DashboardSkeleton (new)
├── Header skeleton (breadcrumbs + title + subtitle + action pills)
├── Farm selector skeleton (thin bar)
├── Row 1: 4x WidgetSkeleton (short, stat-card style)
├── Row 2: 2x WidgetSkeleton (tall, list style)
└── Row 3: 2x WidgetSkeleton (tall, list style)
```

### File location

`project/src/components/Dashboard/DashboardSkeleton.tsx`

Lives alongside the widget files it mirrors. Single component, no props needed — it's a static layout shell.

## Integration Point

In `project/src/routes/_authenticated/(core)/dashboard.tsx`, replace:

```tsx
if (!currentOrganization) {
  return <PageLoader />;
}
```

with:

```tsx
if (!currentOrganization) {
  return <DashboardSkeleton />;
}
```

## Skeleton Primitives

Reuse existing `<Skeleton>` from `@/components/ui/skeleton`. No new skeleton primitives needed — compose with the base `Skeleton` component for precise shape matching.

## Farm Widget '…' Fix

In `Dashboard.tsx`, the farm widget uses `dashboardLoading ? '…' : value` for three stats. Replace with inline `<Skeleton>` elements to match the skeleton language used everywhere else.

## Decisions

- **No skeleton for live mode**: Live mode is opt-in (toggle defaults to `false`), so the page skeleton always shows the regular layout shape. If someone refreshes while in live mode, they briefly see regular skeleton → regular dashboard → toggle to live. Acceptable.
- **Static component, no props**: The skeleton doesn't need settings or org data. It always shows the "full" layout (all widgets visible). Minor mismatch if a user has widgets toggled off, but skeletons are transient — nobody notices.
- **Header skeleton is inline**: Not a separate reusable component yet. When we do other pages, we'll extract a `PageHeaderSkeleton` then. YAGNI for now.

## Risks

- **Height mismatch**: If skeleton card heights don't approximate real widget heights, there'll be a subtle shift when content loads. Mitigation: match the padding/structure of each widget's existing skeleton state.
- **Double skeleton flash**: Layer 1 (page skeleton) → Layer 2 (widget skeletons) could flash if org loads very fast. Acceptable — both are skeletons so the visual is coherent, not jarring.
