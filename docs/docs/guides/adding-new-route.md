# Adding a New Route

This guide walks you through adding a new route to the AgriTech Platform using TanStack Router's file-based routing system.

## Overview

The AgriTech Platform uses **TanStack Router v1** with file-based routing. Routes are automatically generated from files in `/project/src/routes/`, and the route tree is auto-generated in `routeTree.gen.ts` (never edit this file manually).

## File Naming Conventions

TanStack Router uses specific naming patterns to determine route structure:

| File Name | Route Path | Description |
|-----------|-----------|-------------|
| `dashboard.tsx` | `/dashboard` | Simple route |
| `settings.profile.tsx` | `/settings/profile` | Nested route (dot notation) |
| `tasks.index.tsx` | `/tasks` | Index route |
| `tasks.calendar.tsx` | `/tasks/calendar` | Child route |
| `$moduleId.tsx` | `/fruit-trees` or any ID | Dynamic route parameter |
| `_authenticated.tsx` | N/A | Layout wrapper (underscore prefix) |
| `__root.tsx` | N/A | Root layout |

## Step-by-Step Guide

### Step 1: Create the Route File

Create a new file in `/project/src/routes/`. For this example, we'll create a "Reports" page.

**Location:** `/project/src/routes/reports.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, Download } from 'lucide-react';

function ReportsPage() {
  const { currentOrganization, currentFarm } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">
            Generate and download reports for {currentFarm?.name || currentOrganization.name}
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Financial Reports</CardTitle>
            <CardDescription>Revenue, expenses, and profitability</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Crop Analytics</CardTitle>
            <CardDescription>Yield and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Export the route with createFileRoute
export const Route = createFileRoute('/reports')({
  component: ReportsPage,
});
```

### Step 2: Add Protection (if needed)

For protected routes that require authentication and specific permissions, use the `withRouteProtection` HOC:

```tsx
import { withRouteProtection } from '../components/authorization/withRouteProtection';

// ... component code ...

export const Route = createFileRoute('/reports')({
  component: withRouteProtection(ReportsPage, 'read', 'Report'),
});
```

**Available Permissions:**
- Actions: `manage`, `create`, `read`, `update`, `delete`, `invite`, `export`
- Resources: `Farm`, `Parcel`, `User`, `SatelliteReport`, `Analysis`, `Task`, `Invoice`, `Report`, etc.

### Step 3: Add to Protected Layout (if needed)

Most routes should be nested under the `_authenticated` layout for automatic authentication checks. To do this, rename your file:

**Before:** `reports.tsx`
**After:** `_authenticated.reports.tsx` (not required if using beforeLoad)

Or use the `beforeLoad` hook in your route:

```tsx
export const Route = createFileRoute('/reports')({
  beforeLoad: async ({ context, location }) => {
    const { user } = await context.auth;
    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: ReportsPage,
});
```

However, the **recommended approach** is to inherit from `_authenticated.tsx` layout automatically by placing your route file appropriately.

### Step 4: Add Navigation Link

Add a link to your new route in the sidebar:

**Location:** `/project/src/components/Sidebar.tsx`

```tsx
// Add to the navigation items array
const navigationItems = [
  { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'reports', name: 'Reports', icon: FileText, path: '/reports' }, // NEW
  { id: 'tasks', name: 'Tasks', icon: CheckSquare, path: '/tasks' },
  // ... other items
];
```

### Step 5: Test the Route

1. Start the development server:
   ```bash
   cd /Users/boutchaz/Documents/CodeLovers/agritech/project
   npm run dev
   ```

2. Navigate to `http://localhost:5173/reports`

3. Verify:
   - Route loads correctly
   - Authentication protection works
   - Navigation link is visible in sidebar
   - Data loads as expected

## Advanced Patterns

### Nested Routes with Dot Notation

For nested routes like `/settings/profile`:

**File:** `settings.profile.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';

function ProfileSettings() {
  return <div>Profile Settings</div>;
}

export const Route = createFileRoute('/settings/profile')({
  component: ProfileSettings,
});
```

### Dynamic Routes with Parameters

For routes with dynamic segments like `/parcels/$parcelId`:

**File:** `parcels.$parcelId.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';

function ParcelDetail() {
  const { parcelId } = Route.useParams(); // Access the parameter

  return <div>Parcel ID: {parcelId}</div>;
}

export const Route = createFileRoute('/parcels/$parcelId')({
  component: ParcelDetail,
});
```

### Index Routes

For the default route of a section like `/tasks/` (as opposed to `/tasks/calendar`):

**File:** `tasks.index.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';

function TasksIndex() {
  return <div>Default Tasks View</div>;
}

export const Route = createFileRoute('/tasks/')({
  component: TasksIndex,
});
```

### Layout Routes (Underscore Prefix)

Layout routes wrap child routes without adding to the URL. See the existing `_authenticated.tsx`:

**File:** `_authenticated.tsx`

```tsx
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    // Check authentication before loading protected routes
    const { user } = await context.auth;
    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1">
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  );
}
```

## Real-World Example: Accounting Route

Here's how the accounting dashboard route is implemented:

**File:** `/project/src/routes/accounting.tsx`

```tsx
import React, { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { useInvoices, useInvoiceStats } from '../hooks/useInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AppContent: React.FC = () => {
  const { currentOrganization } = useAuth();
  const { data: invoices = [] } = useInvoices();
  const invoiceStats = useInvoiceStats();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Accounting Dashboard</h1>
      {/* Dashboard content */}
    </div>
  );
};

export const Route = createFileRoute('/accounting')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
```

## Common Pitfalls

### 1. Don't Edit `routeTree.gen.ts`

This file is auto-generated. Changes will be overwritten. The route tree updates automatically when you create/modify route files.

### 2. Use Correct Path Aliases

Always use `@/` for imports:
```tsx
// ✅ Correct
import { Button } from '@/components/ui/button';

// ❌ Wrong
import { Button } from '../components/ui/button';
```

### 3. Subscription Validation

The `_authenticated.tsx` layout checks subscription validity. Users without valid subscriptions are blocked from most routes except `/settings/*`. Keep this in mind when building features.

### 4. Multi-Tenant Context

Always check for `currentOrganization` and `currentFarm` from `useAuth()`:

```tsx
const { currentOrganization, currentFarm } = useAuth();

if (!currentOrganization) {
  return <div>Loading...</div>;
}
```

## Checklist

- [ ] Created route file with proper naming convention
- [ ] Added route export with `createFileRoute`
- [ ] Implemented component with TypeScript types
- [ ] Added authentication/authorization if needed
- [ ] Added navigation link to Sidebar
- [ ] Tested route loads correctly
- [ ] Tested authentication protection
- [ ] Tested with different user roles (if permission-based)
- [ ] Verified multi-tenant context (organization/farm selection)

## Next Steps

- [Creating Components](./creating-component.md) - Learn how to build reusable components
- [Database Migration](./database-migration.md) - Add database tables for your feature
- [Testing Guide](./testing.md) - Write tests for your new route

## Reference

- **TanStack Router Docs:** https://tanstack.com/router/latest
- **Route Files:** `/project/src/routes/`
- **Sidebar Component:** `/project/src/components/Sidebar.tsx`
- **Auth Hook:** `/project/src/hooks/useAuth.ts`
- **Route Protection:** `/project/src/components/authorization/withRouteProtection.tsx`
