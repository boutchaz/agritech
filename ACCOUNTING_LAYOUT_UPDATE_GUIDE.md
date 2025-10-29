# Accounting Pages - Layout Update Guide

## Summary

Updated accounting pages to match the system's layout pattern used by stock, parcels, tasks, and other pages.

## Changes Made

### 1. Created AccountingPageLayout Component ✅

**File**: `project/src/components/AccountingPageLayout.tsx`

A reusable layout component that provides:
- Sidebar with modules
- ModernPageHeader with breadcrumbs
- Organization switcher integration
- Dark mode toggle
- Loading state
- Consistent flex layout with `bg-gray-50` background

**Usage**:
```typescript
import { AccountingPageLayout } from '@/components/AccountingPageLayout';

<AccountingPageLayout
  title="Invoices"
  subtitle="Manage sales and purchase invoices"
  pageIcon={Receipt}
>
  {/* Page content goes here */}
</AccountingPageLayout>
```

### 2. Simplified Accounting Layout ✅

**File**: `project/src/routes/_authenticated.accounting.tsx`

Changed from a custom layout to a simple passthrough:
```typescript
export const Route = createFileRoute('/_authenticated/accounting')({
  component: () => <Outlet />,
});
```

### 3. Updated Accounting Dashboard ✅

**File**: `project/src/routes/_authenticated.accounting.index.tsx`

Completely rewritten to match stock/parcels pattern:
- Includes Sidebar
- Uses ModernPageHeader with breadcrumbs
- Full page layout with `flex min-h-screen`
- Loading state before organization is ready
- Content wrapped in `<main>` with `p-6` padding

**Pattern Used**:
```typescript
return (
  <div className="flex min-h-screen">
    <Sidebar {...props} />
    <main className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ModernPageHeader breadcrumbs={[...]} title="..." subtitle="..." />
      <div className="p-6">
        {/* Content */}
      </div>
    </main>
  </div>
);
```

## Remaining Pages to Update

### 4. Invoices Page - NEEDS UPDATE

**File**: `project/src/routes/_authenticated.accounting.invoices.tsx`

**Current**: Simple page without proper layout

**Required Changes**:
1. Import `AccountingPageLayout` component
2. Wrap content in `AccountingPageLayout`
3. Remove custom header/title (handled by layout)
4. Keep only the content cards and tables

**Example Structure**:
```typescript
import { AccountingPageLayout } from '@/components/AccountingPageLayout';
import { Receipt } from 'lucide-react';

function InvoicesPage() {
  return (
    <AccountingPageLayout
      title="Invoices"
      subtitle="Manage sales and purchase invoices"
      pageIcon={Receipt}
    >
      <div className="space-y-6">
        {/* Stats cards */}
        {/* Invoice table */}
        {/* Notes */}
      </div>
    </AccountingPageLayout>
  );
}
```

### 5. Payments Page - NEEDS UPDATE

**File**: `project/src/routes/_authenticated.accounting.payments.tsx`

**Required Changes**:
```typescript
import { AccountingPageLayout } from '@/components/AccountingPageLayout';
import { CreditCard } from 'lucide-react';

<AccountingPageLayout
  title="Payments"
  subtitle="Track and manage incoming and outgoing payments"
  pageIcon={CreditCard}
>
  {/* Content */}
</AccountingPageLayout>
```

### 6. Journal Page - NEEDS UPDATE

**File**: `project/src/routes/_authenticated.accounting.journal.tsx`

**Required Changes**:
```typescript
import { AccountingPageLayout } from '@/components/AccountingPageLayout';
import { BookOpen } from 'lucide-react';

<AccountingPageLayout
  title="Journal Entries"
  subtitle="Manage general ledger journal entries"
  pageIcon={BookOpen}
>
  {/* Content */}
</AccountingPageLayout>
```

### 7. Reports Page - NEEDS UPDATE

**File**: `project/src/routes/_authenticated.accounting.reports.tsx`

**Required Changes**:
```typescript
import { AccountingPageLayout } from '@/components/AccountingPageLayout';
import { FileSpreadsheet } from 'lucide-react';

<AccountingPageLayout
  title="Financial Reports"
  subtitle="Access comprehensive financial reports and analytics"
  pageIcon={FileSpreadsheet}
>
  {/* Content */}
</AccountingPageLayout>
```

## Layout Pattern Comparison

### Before (Wrong Pattern)
```typescript
// Uses _authenticated layout with simple container
<div className="container mx-auto px-4 py-6">
  <h1>Page Title</h1>
  <p>Subtitle</p>
  {/* Content */}
</div>
```

### After (Correct Pattern - Like Stock/Parcels)
```typescript
// Full page layout with own Sidebar and ModernPageHeader
<div className="flex min-h-screen">
  <Sidebar {...} />
  <main className="flex-1 bg-gray-50 dark:bg-gray-900">
    <ModernPageHeader
      breadcrumbs={[
        { icon: Building2, label: orgName, path: '/settings/organization' },
        { icon: PageIcon, label: pageTitle, isActive: true }
      ]}
      title="Page Title"
      subtitle="Page subtitle"
    />
    <div className="p-6">
      {/* Page content */}
    </div>
  </main>
</div>
```

## Benefits of New Layout

1. **Consistency**: Matches stock, parcels, tasks, workers pages
2. **Navigation**: Sidebar always visible with accounting module highlighted
3. **Breadcrumbs**: Clear navigation path via ModernPageHeader
4. **Organization Context**: Organization name in breadcrumbs
5. **Responsive**: Proper mobile/desktop layout
6. **Theme Support**: Dark mode toggle in Sidebar
7. **Loading States**: Proper loading UX before data ready

## Testing Checklist

After updating all pages, verify:

- [ ] Sidebar visible on all accounting pages
- [ ] Active module highlighted as "accounting"
- [ ] Breadcrumbs show: Organization Name → Page Name
- [ ] ModernPageHeader displays correct title and subtitle
- [ ] Background is `bg-gray-50 dark:bg-gray-900`
- [ ] Content has proper padding (`p-6`)
- [ ] Dark mode toggle works
- [ ] Navigation between accounting pages works
- [ ] Sidebar links to other modules work
- [ ] Loading state shows before organization loads
- [ ] Mobile responsive layout works

## Quick Update Script

To update each remaining page:

1. Add import:
   ```typescript
   import { AccountingPageLayout } from '@/components/AccountingPageLayout';
   import { IconName } from 'lucide-react';
   ```

2. Replace page function:
   ```typescript
   function PageName() {
     // ... keep all state and data

     return (
       <AccountingPageLayout
         title="Page Title"
         subtitle="Page description"
         pageIcon={IconName}
       >
         <div className="space-y-6">
           {/* Move all existing content here */}
           {/* Remove any custom headers/titles */}
         </div>
       </AccountingPageLayout>
     );
   }
   ```

3. Remove:
   - Custom page headers
   - Manual title/subtitle rendering
   - Container divs

4. Keep:
   - All state management
   - Data fetching logic
   - Stats cards
   - Tables
   - Action buttons
   - Notes/alerts

## Icon Reference

Use these icons for each page:

| Page | Icon | Import |
|------|------|--------|
| Dashboard | BookOpen | `import { BookOpen } from 'lucide-react'` |
| Invoices | Receipt | `import { Receipt } from 'lucide-react'` |
| Payments | CreditCard | `import { CreditCard } from 'lucide-react'` |
| Journal | BookOpen | `import { BookOpen } from 'lucide-react'` |
| Reports | FileSpreadsheet | `import { FileSpreadsheet } from 'lucide-react'` |

## Summary

✅ **Completed**:
- Created `AccountingPageLayout` component
- Simplified accounting layout route
- Updated dashboard page to match system pattern

⏳ **Remaining**:
- Update invoices page
- Update payments page
- Update journal page
- Update reports page

All pages should use the `AccountingPageLayout` wrapper component for consistency with the rest of the system.
