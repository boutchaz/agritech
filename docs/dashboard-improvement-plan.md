# AgriTech Dashboard Improvement Plan
## From 6/10 to 10/10 - Mobile, Tablet, Desktop & UX Excellence

**Date:** February 2026
**Target:** Commercial farms 50-200+ ha in Morocco/MENA

---

## Executive Summary

A comprehensive analysis by a team of specialists (Architecture, Mobile, UX) has identified the current dashboard as a **solid foundation (6.5/10)** with significant opportunities for improvement. This plan outlines specific, actionable improvements to achieve **production-ready excellence (9.5/10)**.

### Current Scores

| Dimension | Current | Target |
|-----------|---------|--------|
| **Mobile Responsiveness** | 4.1/10 | 9/10 |
| **UX Consistency** | 6/10 | 9/10 |
| **Dashboard Architecture** | 8/10 | 9/10 |
| **Loading States** | 5/10 | 9/10 |
| **Quick Actions** | 3/10 | 8/10 |

---

## Phase 1: Critical Mobile Fixes (Week 1-2)

### 1.1 Add Bottom Navigation Bar (Mobile)

**Priority:** Critical | **Effort:** 4 hours

Create `/project/src/components/MobileBottomNav.tsx`:

```tsx
// Key features:
// - Fixed bottom position with safe-area-inset support
// - 5 tabs: Dashboard, Parcels, Tasks, Stock, More
// - Active state with green highlight
// - Badge support for notifications
// - Hidden on desktop (lg:hidden)
```

**Files to modify:**
- Create: `/project/src/components/MobileBottomNav.tsx`
- Modify: `/project/src/routes/_authenticated.tsx` (add component)
- Modify: `/project/src/components/Sidebar.tsx` (hide hamburger on mobile)

### 1.2 Fix Touch Target Sizes

**Priority:** High | **Effort:** 2 hours

Audit all interactive elements and ensure minimum 44px touch targets:

```css
/* Add to global CSS */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Button variants */
.btn-mobile {
  @apply min-h-11 min-w-11 px-4 py-3;
}
```

**Files to audit:**
- `/project/src/components/Sidebar.tsx:376` - Close button `h-8 w-8` → `h-11 w-11`
- All icon buttons in widgets
- Table action buttons

### 1.3 Add Safe Area Insets

**Priority:** Medium | **Effort:** 1 hour

```css
/* Add to globals.css */
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
}

.mobile-container {
  padding-bottom: var(--safe-area-inset-bottom);
}
```

### 1.4 Mobile Dashboard Widget Layout

**Priority:** High | **Effort:** 3 hours

Reorganize dashboard grid for mobile:
- Single column on mobile (< 640px)
- Collapsible widgets with summary/expanded states
- Priority ordering: Parcels > Tasks > Stock > Weather

**Files to modify:**
- `/project/src/components/Dashboard.tsx:173` - Add `grid-cols-1 sm:grid-cols-2`
- Create mobile widget variants

---

## Phase 2: UX Polish (Week 2-3)

### 2.1 Wire Up Dashboard Quick Actions

**Priority:** Critical | **Effort:** 3 hours

**Current issue:** Quick action buttons in `DashboardHome.tsx:127-151` have no onClick handlers.

```tsx
// Fix implementation
const quickActions = [
  { icon: Plus, label: t('dashboard.quickActions.newTask'), onClick: () => navigate({ to: '/tasks', search: { create: true } }) },
  { icon: MapPin, label: t('dashboard.quickActions.newParcel'), onClick: () => navigate({ to: '/parcels', search: { create: true } }) },
  { icon: Sprout, label: t('dashboard.quickActions.newCycle'), onClick: () => navigate({ to: '/crop-cycles', search: { create: true } }) },
  { icon: FileSpreadsheet, label: t('dashboard.quickActions.newInvoice'), onClick: () => navigate({ to: '/accounting/invoices', search: { create: true } }) },
];
```

### 2.2 Standardize Loading States

**Priority:** High | **Effort:** 4 hours

Create specialized skeleton components:

```tsx
// Create: /project/src/components/ui/skeletons.tsx
export function ParcelCardSkeleton() { /* ... */ }
export function TaskCardSkeleton() { /* ... */ }
export function WidgetSkeleton() { /* ... */ }
export function TableRowSkeleton({ columns }: { columns: number }) { /* ... */ }
```

**Replace inline `animate-pulse` divs in:**
- `ParcelsOverviewWidget.tsx`
- `UpcomingTasksWidget.tsx`
- `StockAlertsWidget.tsx`
- `HarvestSummaryWidget.tsx`

### 2.3 Add Retry Buttons to Error States

**Priority:** High | **Effort:** 2 hours

**Files to modify:**
- `/project/src/components/DashboardHome.tsx:82-89`
- All widget error states

```tsx
// Pattern to implement
if (error) {
  return (
    <EmptyState
      variant="card"
      icon={AlertCircle}
      title={t('common.error')}
      description={error.message}
      action={{ label: t('common.retry'), onClick: () => refetch() }}
    />
  );
}
```

### 2.4 Fix Dynamic Tailwind Classes

**Priority:** High | **Effort:** 1 hour

**Issue:** `DashboardHome.tsx:100-102` uses dynamic color classes that don't work with Tailwind JIT.

```tsx
// Before (broken)
className={`bg-${stat.color}-100`}

// After (working)
const colorMap = {
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  // ...
};
className={colorMap[stat.color]}
```

### 2.5 Enhance Command Palette

**Priority:** Medium | **Effort:** 3 hours

Add create actions to GlobalCommandPalette:

```tsx
// Add to actions array
{ id: 'create-parcel', name: 'Create new parcel', shortcut: ['c', 'p'], perform: () => navigate('/parcels?create=true') },
{ id: 'create-task', name: 'Create new task', shortcut: ['c', 't'], perform: () => navigate('/tasks?create=true') },
{ id: 'create-cycle', name: 'Create new crop cycle', shortcut: ['c', 'c'], perform: () => navigate('/crop-cycles?create=true') },
{ id: 'create-invoice', name: 'Create new invoice', shortcut: ['c', 'i'], perform: () => navigate('/accounting/invoices?create=true') },
```

### 2.6 Add Keyboard Shortcut Help

**Priority:** Low | **Effort:** 2 hours

Create shortcut help overlay triggered by `?` key:

```tsx
// Create: /project/src/components/KeyboardShortcutsHelp.tsx
// Show all available shortcuts in a modal
```

---

## Phase 3: Responsive Design Excellence (Week 3-4)

### 3.1 Tablet-Specific Layout

**Priority:** Medium | **Effort:** 6 hours

Optimize for 768px-1024px breakpoint:

```tsx
// Sidebar behavior on tablet
// - Partial width (280px instead of full)
// - Overlay mode with backdrop
// - Swipe to close gesture
```

### 3.2 Widget Responsive Grid

**Priority:** Medium | **Effort:** 4 hours

```tsx
// Dashboard.tsx grid improvements
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  {/* KPI cards */}
</div>
<div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
  {/* Larger widgets */}
</div>
```

### 3.3 Form Mobile Optimization

**Priority:** High | **Effort:** 4 hours

- Stack form fields vertically on mobile
- Increase input sizes (min-h-12)
- Add `inputmode` attributes for numeric fields
- Prevent zoom on focus (font-size >= 16px)

### 3.4 Table Responsive Patterns

**Priority:** Medium | **Effort:** 4 hours

Options for mobile tables:
1. **Card view** - Convert rows to stacked cards
2. **Priority columns** - Show only essential columns on mobile
3. **Horizontal scroll with indicator** - Add scroll shadow

---

## Phase 4: Performance & Polish (Week 4-5)

### 4.1 Optimistic UI Updates

**Priority:** Medium | **Effort:** 6 hours

Implement optimistic updates for:
- Task status changes
- Parcel updates
- Stock entries

```tsx
// Pattern using React Query
const mutation = useMutation({
  mutationFn: updateTask,
  onMutate: async (newTask) => {
    await queryClient.cancelQueries({ queryKey: ['tasks'] });
    const previousTasks = queryClient.getQueryData(['tasks']);
    queryClient.setQueryData(['tasks'], (old) => old.map(t => t.id === newTask.id ? newTask : t));
    return { previousTasks };
  },
  onError: (err, newTask, context) => {
    queryClient.setQueryData(['tasks'], context.previousTasks);
  },
});
```

### 4.2 Chart Export Functionality

**Priority:** Low | **Effort:** 3 hours

Add PNG/SVG export to TimeSeriesChart:
- Export button in chart toolbar
- Include legend and date range in export

### 4.3 Progressive Loading Indicators

**Priority:** Low | **Effort:** 2 hours

Add percentage indicators for long operations:
- Satellite data sync
- Report generation
- Data imports

---

## Implementation Timeline

| Week | Focus | Tasks |
|------|-------|-------|
| 1 | Mobile Critical | Bottom nav, touch targets, safe areas |
| 2 | Mobile + UX | Widget layout, quick actions, loading states |
| 3 | UX Polish | Error states, command palette, skeletons |
| 4 | Responsive | Tablet layout, forms, tables |
| 5 | Performance | Optimistic updates, exports, polish |

---

## Files to Create

1. `/project/src/components/MobileBottomNav.tsx` - Bottom navigation bar
2. `/project/src/components/ui/skeletons.tsx` - Specialized skeleton components
3. `/project/src/components/KeyboardShortcutsHelp.tsx` - Shortcut help overlay
4. `/project/src/styles/mobile.css` - Mobile-specific styles

## Files to Modify

### Critical
- `/project/src/routes/_authenticated.tsx` - Add bottom nav
- `/project/src/components/DashboardHome.tsx` - Wire quick actions, fix colors
- `/project/src/components/Sidebar.tsx` - Mobile improvements

### High Priority
- `/project/src/components/Dashboard.tsx` - Responsive grid
- `/project/src/components/Dashboard/*.tsx` - All widgets for skeletons
- `/project/src/components/GlobalCommandPalette.tsx` - Add create actions

### Medium Priority
- `/project/src/routes/_authenticated/(production)/parcels.tsx` - Mobile forms
- `/project/src/routes/_authenticated/(workforce)/tasks.tsx` - Mobile forms
- All form components

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Mobile Score | ~60 | 90+ |
| Time to Interactive (3G) | ~5s | <3s |
| Touch target failures | 15+ | 0 |
| Console errors | 5+ | 0 |
| Keyboard navigation | Partial | Full |

---

## Quick Wins (Do First)

These can be done in a single afternoon:

1. **Fix quick actions** - 30 min
2. **Fix dynamic Tailwind colors** - 15 min
3. **Add retry buttons** - 30 min
4. **Increase touch targets** - 1 hour
5. **Add create actions to command palette** - 1 hour

Total: ~3.25 hours for immediate visible improvements.
