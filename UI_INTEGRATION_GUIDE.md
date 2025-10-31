# UI Integration Guide - Unit Management Components

This guide shows you how to access and integrate the three new UI components into your AgriTech application.

---

## Quick Access Summary

### 1. Work Unit Management
**Path**: Settings → Work Units
**Component**: `project/src/components/settings/WorkUnitManagement.tsx`
**Access**: Admin only

### 2. Piece-Work Entry
**Path**: Workers → Record Piece Work button
**Component**: `project/src/components/Workers/PieceWorkEntry.tsx`
**Access**: Farm managers and admins

### 3. Worker Configuration
**Path**: Workers → Select Worker → Configure Payment
**Component**: `project/src/components/Workers/WorkerConfiguration.tsx`
**Access**: Farm managers and admins

---

## Integration Steps

### Step 1: Create Work Units Settings Route

Create a new route file for managing work units in settings:

**File**: `project/src/routes/settings.work-units.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { WorkUnitManagement } from '@/components/settings/WorkUnitManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function WorkUnitsPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <WorkUnitManagement />
    </div>
  );
}

// Protect route - require organization admin
export const Route = createFileRoute('/settings/work-units')({
  component: withRouteProtection(
    WorkUnitsPage,
    'manage',
    'all'
  ),
});
```

### Step 2: Update Workers Page to Include New Components

**File**: `project/src/routes/workers.tsx`

Add imports at the top:

```tsx
import { PieceWorkEntry, PieceWorkList } from '@/components/Workers/PieceWorkEntry';
import { WorkerConfiguration } from '@/components/Workers/WorkerConfiguration';
```

Add a new tab for piece-work in the Tabs component:

```tsx
<Tabs defaultValue="list" className="w-full">
  <TabsList>
    <TabsTrigger value="list">
      <Users className="h-4 w-4 mr-2" />
      Workers
    </TabsTrigger>
    <TabsTrigger value="piece-work">
      <Calculator className="h-4 w-4 mr-2" />
      Piece-Work
    </TabsTrigger>
    <TabsTrigger value="metayage">
      <Calculator className="h-4 w-4 mr-2" />
      Metayage Calculator
    </TabsTrigger>
  </TabsList>

  <TabsContent value="list">
    <WorkersList />
  </TabsContent>

  <TabsContent value="piece-work">
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Piece-Work Records</h2>
        <PieceWorkEntry />
      </div>
      <PieceWorkList />
    </div>
  </TabsContent>

  <TabsContent value="metayage">
    <MetayageCalculator />
  </TabsContent>
</Tabs>
```

### Step 3: Add Work Units Link to Settings Navigation

**File**: `project/src/components/SettingsLayout.tsx` (or wherever settings navigation is defined)

Add the work units link to the settings menu:

```tsx
<nav className="space-y-1">
  <Link
    to="/settings/profile"
    className="flex items-center px-4 py-2 text-sm font-medium rounded-md"
  >
    Profile
  </Link>

  <Link
    to="/settings/organization"
    className="flex items-center px-4 py-2 text-sm font-medium rounded-md"
  >
    Organization
  </Link>

  {/* NEW: Work Units Link */}
  <Link
    to="/settings/work-units"
    className="flex items-center px-4 py-2 text-sm font-medium rounded-md"
  >
    <Package className="mr-3 h-5 w-5" />
    Work Units
  </Link>

  <Link
    to="/settings/users"
    className="flex items-center px-4 py-2 text-sm font-medium rounded-md"
  >
    Users
  </Link>
</nav>
```

### Step 4: Update Worker Detail/Edit Modal

In your existing worker detail or edit component, add a button to open payment configuration:

**Example in**: `project/src/components/Workers/WorkersList.tsx` or similar

```tsx
import { WorkerConfiguration } from './WorkerConfiguration';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/Dialog';

// Inside your worker row/card component
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline" size="sm">
      <Settings className="h-4 w-4 mr-2" />
      Configure Payment
    </Button>
  </DialogTrigger>
  <DialogContent className="max-w-2xl">
    <WorkerConfiguration
      workerId={worker.id}
      onSuccess={() => {
        // Refresh workers list
        refetch();
      }}
      onCancel={() => {
        // Close dialog
      }}
    />
  </DialogContent>
</Dialog>
```

---

## Complete Example: Updated Workers Page

Here's a complete example of how your workers page might look:

**File**: `project/src/routes/workers.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Users, Calculator, Package, Settings } from 'lucide-react';
import WorkersList from '@/components/Workers/WorkersList';
import MetayageCalculator from '@/components/Workers/MetayageCalculator';
import { PieceWorkEntry, PieceWorkList } from '@/components/Workers/PieceWorkEntry';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import Sidebar from '@/components/Sidebar';
import ModernPageHeader from '@/components/ModernPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function WorkersPage() {
  const { currentOrganization } = useAuth();

  if (!currentOrganization) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 overflow-auto">
        <ModernPageHeader
          title="Workers Management"
          description="Manage permanent workers, day laborers, and piece-work"
        />

        <div className="container mx-auto p-6">
          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="list">
                <Users className="h-4 w-4 mr-2" />
                Workers
              </TabsTrigger>
              <TabsTrigger value="piece-work">
                <Package className="h-4 w-4 mr-2" />
                Piece-Work
              </TabsTrigger>
              <TabsTrigger value="metayage">
                <Calculator className="h-4 w-4 mr-2" />
                Metayage
              </TabsTrigger>
            </TabsList>

            {/* Workers List Tab */}
            <TabsContent value="list">
              <WorkersList />
            </TabsContent>

            {/* Piece-Work Tab */}
            <TabsContent value="piece-work">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Piece-Work Records</h2>
                    <p className="text-muted-foreground">
                      Track work completed by units (trees, boxes, kg, etc.)
                    </p>
                  </div>
                  <PieceWorkEntry />
                </div>

                {/* Filters (optional) */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Add date filters, worker filters, etc. */}
                </div>

                {/* List of piece-work records */}
                <PieceWorkList />
              </div>
            </TabsContent>

            {/* Metayage Tab */}
            <TabsContent value="metayage">
              <MetayageCalculator />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/workers')({
  component: withRouteProtection(WorkersPage, 'read', 'Worker'),
});
```

---

## Standalone Component Usage

If you want to use these components in other places, here are the import examples:

### 1. Work Unit Management (Settings)

```tsx
import { WorkUnitManagement } from '@/components/settings/WorkUnitManagement';

function MySettingsPage() {
  return (
    <div>
      <WorkUnitManagement />
    </div>
  );
}
```

### 2. Piece-Work Entry (Modal/Dialog)

```tsx
import { PieceWorkEntry } from '@/components/Workers/PieceWorkEntry';

function MyComponent() {
  return (
    <div>
      {/* Button to open piece-work entry dialog */}
      <PieceWorkEntry
        workerId="optional-worker-id"
        taskId="optional-task-id"
        parcelId="optional-parcel-id"
        onSuccess={() => {
          console.log('Piece-work recorded!');
        }}
      />
    </div>
  );
}
```

### 3. Piece-Work List (Display)

```tsx
import { PieceWorkList } from '@/components/Workers/PieceWorkEntry';

function MyComponent() {
  return (
    <div>
      {/* List all piece-work records */}
      <PieceWorkList />

      {/* Or filter by worker */}
      <PieceWorkList workerId="worker-uuid" />

      {/* Or filter by date range and status */}
      <PieceWorkList
        filters={{
          startDate: '2025-10-01',
          endDate: '2025-10-31',
          status: 'pending'
        }}
      />
    </div>
  );
}
```

### 4. Worker Configuration (Modal/Dialog)

```tsx
import { WorkerConfiguration } from '@/components/Workers/WorkerConfiguration';
import { Dialog, DialogContent } from '@/components/ui/Dialog';

function WorkerEditModal({ workerId, isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <WorkerConfiguration
          workerId={workerId}
          onSuccess={() => {
            console.log('Configuration saved!');
            onClose();
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
```

---

## Navigation Menu Updates

### Update Sidebar Navigation

**File**: `project/src/components/Sidebar.tsx`

Add work units to settings section:

```tsx
// In settings section
{hasRole(['organization_admin', 'system_admin']) && (
  <>
    <NavItem to="/settings" icon={Settings} label="Settings" />
    <NavItem to="/settings/work-units" icon={Package} label="Work Units" />
    <NavItem to="/settings/organization" icon={Building2} label="Organization" />
  </>
)}
```

---

## Access Control

All components include built-in access control:

### Work Unit Management
- **Required Permission**: `manage` on `all` (Org admin only)
- **Automatically enforced** by RLS policies

### Piece-Work Entry
- **Required Permission**: `create` on `Worker` (Farm managers and admins)
- Workers can view their own records

### Worker Configuration
- **Required Permission**: `update` on `Worker` (Farm managers and admins)

---

## Testing the Integration

### 1. Test Work Units Management

1. Login as organization admin
2. Navigate to **Settings → Work Units**
3. Click **"Load Default Units"** (if empty)
4. Verify 15 default units are created
5. Try creating a custom unit
6. Try editing a unit
7. Try deleting an unused unit

### 2. Test Worker Configuration

1. Navigate to **Workers**
2. Select or create a worker
3. Click **"Configure Payment"**
4. Select **"Per Unit (Piece-work)"**
5. Choose a unit and set a rate
6. Save and verify configuration

### 3. Test Piece-Work Entry

1. Navigate to **Workers → Piece-Work** tab
2. Click **"Record Piece Work"**
3. Fill in the form:
   - Select worker (should auto-fill unit and rate)
   - Enter units completed
   - Add quality rating
4. Save and verify record appears in list

### 4. Test Payment Integration

1. Create some piece-work records
2. Navigate to **Payments → Create Payment**
3. Select worker and period
4. Verify payment calculation includes piece-work
5. Create and mark payment as paid
6. Check **Accounting → Journal** for auto-created entry

---

## Common Integration Patterns

### Pattern 1: Task-Based Piece-Work

Record piece-work directly from a task:

```tsx
import { PieceWorkEntry } from '@/components/Workers/PieceWorkEntry';

function TaskDetailPage({ task }) {
  return (
    <div>
      <h1>{task.title}</h1>

      {/* Record piece-work for this task */}
      <PieceWorkEntry
        taskId={task.id}
        parcelId={task.parcel_id}
      />
    </div>
  );
}
```

### Pattern 2: Worker Dashboard

Show worker's own piece-work records:

```tsx
import { PieceWorkList } from '@/components/Workers/PieceWorkEntry';

function WorkerDashboard({ workerId }) {
  return (
    <div>
      <h1>My Work</h1>

      {/* Show only this worker's records */}
      <PieceWorkList
        workerId={workerId}
        filters={{
          startDate: getCurrentMonthStart(),
          endDate: getCurrentMonthEnd()
        }}
      />
    </div>
  );
}
```

### Pattern 3: Mobile Field Entry

Quick entry form for field supervisors:

```tsx
import { PieceWorkEntry } from '@/components/Workers/PieceWorkEntry';

function MobileFieldEntry() {
  return (
    <div className="mobile-optimized">
      <PieceWorkEntry
        // Pre-select current parcel from GPS
        parcelId={getCurrentParcelFromGPS()}
        onSuccess={() => {
          // Show success toast
          // Reset form for next entry
        }}
      />
    </div>
  );
}
```

---

## Troubleshooting

### Components not rendering

**Issue**: Component imports fail

**Solution**: Ensure you're using the correct import paths with `@/` alias:
```tsx
import { WorkUnitManagement } from '@/components/settings/WorkUnitManagement';
```

### "Cannot read properties of undefined"

**Issue**: Components try to access data before it's loaded

**Solution**: Add loading states:
```tsx
const { data: workUnits, isLoading } = useQuery(...);

if (isLoading) return <div>Loading...</div>;
```

### Permission errors

**Issue**: Users can't access components

**Solution**: Check RLS policies and user roles:
```sql
-- Verify user's role
SELECT role FROM organization_users
WHERE user_id = auth.uid();

-- Check permissions
SELECT * FROM check_feature_access('work_units');
```

### TypeScript errors

**Issue**: Type errors after adding components

**Solution**: Regenerate types:
```bash
npm run db:generate-types-remote
```

---

## Summary Checklist

- [ ] Create `settings.work-units.tsx` route
- [ ] Update `workers.tsx` to include piece-work tab
- [ ] Add work units link to settings navigation
- [ ] Add payment configuration button to worker detail/edit
- [ ] Test all three components
- [ ] Verify access control works
- [ ] Test end-to-end workflow (unit → config → record → payment)

---

## Next Steps

1. **Deploy the routes**: Copy the route files to your routes directory
2. **Update navigation**: Add links in sidebar and settings menu
3. **Test locally**: Run the app and test each component
4. **Train users**: Show farm managers how to use the new features
5. **Monitor**: Check for any issues in production

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify database migration ran successfully
3. Ensure user has proper role and permissions
4. Review component props and required parameters
5. Check [UNIT_MANAGEMENT_GUIDE.md](./UNIT_MANAGEMENT_GUIDE.md) for detailed docs

---

**Last Updated**: October 31, 2025
**Version**: 1.0.0
