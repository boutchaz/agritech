# TanStack Query Hooks API Reference

Complete reference for all TanStack Query (React Query) hooks used in the AgriTech Platform for data fetching, caching, and mutations.

## Overview

The platform uses TanStack Query v5 for server state management. All data fetching is done through custom hooks that wrap `useQuery` and `useMutation`.

**Key Benefits**:
- Automatic caching and background refetching
- Optimistic updates
- Request deduplication
- Offline support
- TypeScript type safety

---

## Query Key Structure

Query keys follow a consistent hierarchical structure:

```typescript
// Authentication
['auth', 'profile', userId]
['auth', 'organizations', userId]
['auth', 'farms', organizationId]

// Resources
['invoices', organizationId]
['invoices', organizationId, type]
['invoice', invoiceId]

['tasks', organizationId, filters]
['task', taskId]

['workers', organizationId, farmId?]
['worker', workerId]

['parcels', farmId]
['parcel', parcelId]

['satellite-data', parcelId, { startDate, endDate, indices }]
```

---

## Authentication Hooks

### useAuth

Get current authentication state and user context.

**Source**: `/project/src/hooks/useAuth.ts`

**Returns**:
```typescript
{
  user: User | null,
  profile: UserProfile | null,
  organizations: Organization[],
  currentOrganization: Organization | null,
  farms: Farm[],
  currentFarm: Farm | null,
  userRole: UserRole | null,
  loading: boolean,
  needsOnboarding: boolean,
  setCurrentOrganization: (org: Organization) => void,
  setCurrentFarm: (farm: Farm) => void,
  signOut: () => Promise<void>,
  refreshUserData: () => Promise<void>,
  hasRole: (roleName: string | string[]) => boolean,
  isAtLeastRole: (roleName: string) => boolean
}
```

**Example**:
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const {
    user,
    currentOrganization,
    currentFarm,
    userRole,
    hasRole,
    isAtLeastRole
  } = useAuth();

  if (!user) return <Login />;

  // Check specific role
  if (hasRole('organization_admin')) {
    return <AdminPanel />;
  }

  // Check role hierarchy
  if (isAtLeastRole('farm_manager')) {
    return <FarmManagement />;
  }

  return <Dashboard />;
}
```

---

### useUserProfile

Fetch user profile data.

**Query Key**: `['auth', 'profile', userId]`

**Returns**: `UserProfile`
```typescript
{
  id: string,
  first_name: string,
  last_name: string,
  avatar_url?: string,
  phone?: string,
  timezone: string,
  language: string,
  password_set?: boolean
}
```

**Stale Time**: 5 minutes

---

### useUserOrganizations

Fetch all organizations user belongs to.

**Query Key**: `['auth', 'organizations', userId]`

**Returns**: `Organization[]`

**Stale Time**: 5 minutes

---

### useSubscription

Get subscription details for current organization.

**Query Key**: `['subscription', organizationId]`

**Returns**:
```typescript
{
  id: string,
  organization_id: string,
  polar_subscription_id: string,
  plan_name: string,
  status: 'active' | 'cancelled' | 'expired' | 'trial',
  current_period_start: string,
  current_period_end: string,
  cancel_at_period_end: boolean,
  max_farms: number,
  max_parcels: number,
  max_users: number,
  max_satellite_reports: number,
  has_analytics: boolean,
  has_sensor_integration: boolean,
  has_api_access: boolean,
  has_advanced_reporting: boolean
}
```

**Example**:
```typescript
import { useSubscription } from '@/hooks/useSubscription';

function FeatureGate({ feature, children }) {
  const { data: subscription, isLoading } = useSubscription();

  if (isLoading) return <Loading />;

  if (!subscription?.[`has_${feature}`]) {
    return <UpgradePrompt />;
  }

  return <>{children}</>;
}
```

---

## Accounting Hooks

### useInvoices

Fetch all invoices for current organization.

**Query Key**: `['invoices', organizationId]`

**Returns**: `Invoice[]`

**Example**:
```typescript
import { useInvoices } from '@/hooks/useInvoices';

function InvoiceList() {
  const { data: invoices, isLoading, error } = useInvoices();

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {invoices?.map(inv => (
        <li key={inv.id}>
          {inv.invoice_number} - ${inv.grand_total}
        </li>
      ))}
    </ul>
  );
}
```

---

### useInvoicesByType

Fetch invoices filtered by type.

**Parameters**:
- `type`: `'sales' | 'purchase'`

**Query Key**: `['invoices', organizationId, type]`

**Returns**: `Invoice[]`

**Example**:
```typescript
const { data: salesInvoices } = useInvoicesByType('sales');
const { data: purchaseInvoices } = useInvoicesByType('purchase');
```

---

### useInvoice

Fetch single invoice with items.

**Parameters**:
- `invoiceId`: `string | null`

**Query Key**: `['invoice', invoiceId]`

**Returns**: `InvoiceWithItems`
```typescript
{
  ...Invoice,
  items?: InvoiceItem[]
}
```

**Example**:
```typescript
function InvoiceDetail({ id }) {
  const { data: invoice, isLoading } = useInvoice(id);

  return (
    <div>
      <h2>{invoice?.invoice_number}</h2>
      <ul>
        {invoice?.items?.map(item => (
          <li key={item.id}>{item.item_name}: ${item.amount}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

### useInvoicesByStatus

Fetch invoices filtered by status.

**Parameters**:
- `status`: `'draft' | 'submitted' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled'`

**Query Key**: `['invoices', organizationId, 'status', status]`

**Returns**: `Invoice[]`

---

### useInvoiceStats

Calculate invoice statistics.

**Returns**:
```typescript
{
  total: number,
  draft: number,
  submitted: number,
  paid: number,
  partiallyPaid: number,
  overdue: number,
  cancelled: number,
  totalAmount: number,
  outstandingAmount: number
}
```

**Example**:
```typescript
const stats = useInvoiceStats();

console.log(`Total invoices: ${stats.total}`);
console.log(`Outstanding: $${stats.outstandingAmount.toFixed(2)}`);
```

---

### useCreateInvoice

Create new invoice mutation.

**Returns**: `UseMutationResult`

**Example**:
```typescript
import { useCreateInvoice } from '@/hooks/useInvoices';

function CreateInvoiceForm() {
  const createInvoice = useCreateInvoice();

  const onSubmit = async (data) => {
    try {
      const invoice = await createInvoice.mutateAsync({
        invoice_type: 'sales',
        party_id: customerId,
        invoice_date: '2024-06-15',
        due_date: '2024-07-15',
        items: [
          {
            item_name: 'Product A',
            quantity: 10,
            rate: 100,
            account_id: salesAccountId
          }
        ],
        remarks: 'Thank you for your business'
      });

      console.log(`Created: ${invoice.invoice_number}`);
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
      <button
        type="submit"
        disabled={createInvoice.isPending}
      >
        {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
      </button>
    </form>
  );
}
```

---

### usePostInvoice

Post invoice to general ledger (creates journal entry).

**Returns**: `UseMutationResult`

**Example**:
```typescript
const postInvoice = usePostInvoice();

await postInvoice.mutateAsync({
  invoice_id: invoiceId,
  posting_date: '2024-06-15'
});
```

---

### useDeleteInvoice

Delete invoice (only drafts).

**Returns**: `UseMutationResult`

**Example**:
```typescript
const deleteInvoice = useDeleteInvoice();

await deleteInvoice.mutateAsync(invoiceId);
```

---

### useAccounts

Fetch chart of accounts for organization.

**Query Key**: `['accounts', organizationId]`

**Returns**: `Account[]`

**Stale Time**: 5 minutes

**Example**:
```typescript
import { useAccounts } from '@/hooks/useAccounts';

function AccountSelector() {
  const { data: accounts, isLoading } = useAccounts();

  return (
    <select>
      {accounts?.data?.map(account => (
        <option key={account.id} value={account.id}>
          {account.code} - {account.name}
        </option>
      ))}
    </select>
  );
}
```

---

### usePayments

Fetch accounting payments with filters.

**Parameters**:
- `organizationId`: `string`
- `filters?`: `PaymentFilters`

**Query Key**: `['payments', organizationId, filters]`

**Returns**: `PaymentSummary[]`

---

### useJournalEntries

Fetch journal entries with filters.

**Query Key**: `['journal_entries', organizationId, filters]`

**Returns**: `JournalEntry[]`

---

## Task Management Hooks

### useTasks

Fetch tasks with optional filters.

**Parameters**:
- `organizationId`: `string`
- `filters?`: `TaskFilters`

**Query Key**: `['tasks', organizationId, filters]`

**Task Filters**:
```typescript
{
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled',
  priority?: 'low' | 'medium' | 'high' | 'urgent',
  task_type?: string,
  assigned_to?: string,
  farm_id?: string,
  parcel_id?: string,
  date_from?: string,
  date_to?: string,
  search?: string
}
```

**Returns**: `TaskSummary[]`

**Example**:
```typescript
import { useTasks } from '@/hooks/useTasks';

function TaskList() {
  const { currentOrganization } = useAuth();
  const { data: tasks, isLoading } = useTasks(
    currentOrganization.id,
    {
      status: ['pending', 'in_progress'],
      priority: 'high',
      farm_id: currentFarm.id
    }
  );

  return (
    <ul>
      {tasks?.map(task => (
        <li key={task.id}>
          {task.title} - {task.status}
        </li>
      ))}
    </ul>
  );
}
```

---

### useTask

Fetch single task with details.

**Parameters**:
- `taskId`: `string | null`

**Query Key**: `['task', taskId]`

**Returns**: `TaskSummary`

---

### useTaskCategories

Fetch task categories for organization.

**Query Key**: `['task-categories', organizationId]`

**Returns**: `TaskCategory[]`

---

### useTaskComments

Fetch comments for task.

**Query Key**: `['task-comments', taskId]`

**Returns**: `TaskComment[]`

---

### useTaskTimeLogs

Fetch time logs for task.

**Query Key**: `['task-time-logs', taskId]`

**Returns**: `TaskTimeLog[]`

---

### useCreateTask

Create new task mutation.

**Example**:
```typescript
import { useCreateTask } from '@/hooks/useTasks';

function CreateTaskButton() {
  const createTask = useCreateTask();
  const { currentOrganization } = useAuth();

  const handleCreate = async () => {
    await createTask.mutateAsync({
      organization_id: currentOrganization.id,
      title: 'Irrigate North Field',
      description: 'Complete irrigation cycle',
      task_type: 'irrigation',
      priority: 'high',
      scheduled_start: '2024-06-15T08:00:00Z',
      scheduled_end: '2024-06-15T12:00:00Z',
      assigned_to: workerId,
      parcel_id: parcelId
    });
  };

  return (
    <button onClick={handleCreate}>
      Create Task
    </button>
  );
}
```

---

### useUpdateTask

Update task mutation.

**Example**:
```typescript
const updateTask = useUpdateTask();

await updateTask.mutateAsync({
  taskId: task.id,
  updates: {
    status: 'completed',
    completion_percentage: 100,
    actual_end: new Date().toISOString()
  }
});
```

---

### useAssignTask

Assign task to worker.

**Example**:
```typescript
const assignTask = useAssignTask();

await assignTask.mutateAsync({
  taskId: task.id,
  workerId: worker.id
});
```

---

### useCompleteTask

Complete task with optional quality rating and cost.

**Example**:
```typescript
const completeTask = useCompleteTask();

await completeTask.mutateAsync({
  taskId: task.id,
  qualityRating: 4.5,
  actualCost: 250,
  notes: 'Completed successfully'
});
```

---

### useClockIn / useClockOut

Worker time tracking.

**Example**:
```typescript
const clockIn = useClockIn();
const clockOut = useClockOut();

// Clock in
const { timeLog } = await clockIn.mutateAsync({
  task_id: taskId,
  worker_id: workerId,
  location_lat: 33.5731,
  location_lng: -7.5898,
  notes: 'Starting work'
});

// Clock out
await clockOut.mutateAsync({
  time_log_id: timeLog.id,
  break_duration: 30,  // minutes
  notes: 'Work completed'
});
```

---

## Worker Management Hooks

### useWorkers

Fetch workers for organization.

**Parameters**:
- `organizationId`: `string | null`
- `farmId?`: `string | null`

**Query Key**: `['workers', organizationId, farmId]`

**Returns**: `Worker[]`

**Example**:
```typescript
import { useWorkers } from '@/hooks/useWorkers';

function WorkerList() {
  const { currentOrganization, currentFarm } = useAuth();
  const { data: workers, isLoading } = useWorkers(
    currentOrganization.id,
    currentFarm?.id
  );

  return (
    <ul>
      {workers?.map(worker => (
        <li key={worker.id}>
          {worker.first_name} {worker.last_name} - {worker.worker_type}
        </li>
      ))}
    </ul>
  );
}
```

---

### useWorker

Fetch single worker with details.

**Parameters**:
- `workerId`: `string | null`

**Query Key**: `['worker', workerId]`

**Returns**: `Worker`

---

### useActiveWorkers

Fetch only active workers summary.

**Query Key**: `['active-workers', organizationId]`

**Returns**: `Worker[]`

---

### useCreateWorker

Create new worker mutation.

**Example**:
```typescript
const createWorker = useCreateWorker();

await createWorker.mutateAsync({
  organization_id: currentOrganization.id,
  first_name: 'Ahmed',
  last_name: 'Benali',
  worker_type: 'daily_worker',
  daily_rate: 150,
  phone: '+212600000000',
  hire_date: '2024-06-01'
});
```

---

### useUpdateWorker

Update worker mutation.

**Example**:
```typescript
const updateWorker = useUpdateWorker();

await updateWorker.mutateAsync({
  id: workerId,
  data: {
    daily_rate: 175,
    phone: '+212611111111'
  }
});
```

---

### useDeactivateWorker

Deactivate worker (soft delete).

**Example**:
```typescript
const deactivateWorker = useDeactivateWorker();

await deactivateWorker.mutateAsync({
  workerId: workerId,
  endDate: '2024-06-30'
});
```

---

### useWorkerStats

Get worker statistics.

**Query Key**: `['worker-stats', workerId]`

**Returns**:
```typescript
{
  worker: Worker,
  totalWorkRecords: number,
  totalPaid: number,
  pendingPayments: number,
  totalDaysWorked: number,
  totalTasksCompleted: number
}
```

---

### useCalculateMetayageShare

Calculate métayage worker share.

**Example**:
```typescript
const calculateShare = useCalculateMetayageShare();

const share = await calculateShare.mutateAsync({
  workerId: workerId,
  grossRevenue: 50000,
  totalCharges: 10000
});

console.log(`Worker's share: ${share}`);
```

---

## Parcel Management Hooks

### useParcels

Fetch parcels for farm.

**Parameters**:
- `farmId`: `string | null`

**Returns**:
```typescript
{
  parcels: Parcel[],
  loading: boolean,
  error: string | null,
  addParcel: (name, boundary, details?) => Promise<Parcel>,
  updateParcel: (id, updates) => Promise<Parcel>,
  deleteParcel: (id) => Promise<void>,
  refresh: () => Promise<void>
}
```

**Example**:
```typescript
import { useParcels } from '@/hooks/useParcels';

function ParcelManager() {
  const { currentFarm } = useAuth();
  const {
    parcels,
    loading,
    addParcel,
    updateParcel,
    deleteParcel
  } = useParcels(currentFarm?.id);

  const handleCreate = async () => {
    const newParcel = await addParcel(
      'North Field',
      boundary,  // [[lon, lat], ...]
      {
        soil_type: 'Clay',
        irrigation_type: 'Drip',
        area: 2.5,
        crop_id: cropId
      }
    );
  };

  return (
    <div>
      {parcels.map(parcel => (
        <ParcelCard
          key={parcel.id}
          parcel={parcel}
          onUpdate={(updates) => updateParcel(parcel.id, updates)}
          onDelete={() => deleteParcel(parcel.id)}
        />
      ))}
    </div>
  );
}
```

---

### useParcelsQuery

TanStack Query version of useParcels.

**Query Key**: `['parcels', { organizationId, farmId }]`

**Returns**: `Parcel[]`

---

## Satellite Data Hooks

### useSatelliteIndices

Satellite analysis operations.

**Returns**:
```typescript
{
  calculateIndices: (boundary, parcelName, indices, dateRange?) => Promise<IndexCalculationResponse>,
  getTimeSeries: (boundary, parcelName, index, dateRange?) => Promise<TimeSeriesResponse>,
  exportIndexMap: (boundary, parcelName, date, index) => Promise<{ download_url, expires_at }>,
  loading: boolean,
  error: string | null,
  availableIndices: string[],
  loadAvailableIndices: () => Promise<void>
}
```

**Example**:
```typescript
import { useSatelliteIndices } from '@/hooks/useSatelliteIndices';

function SatelliteAnalysis({ parcel }) {
  const {
    calculateIndices,
    getTimeSeries,
    loading,
    error
  } = useSatelliteIndices();

  const analyzeParcel = async () => {
    // Calculate current indices
    const result = await calculateIndices(
      parcel.boundary,
      parcel.name,
      ['NDVI', 'NDRE', 'NDMI'],
      {
        start_date: '2024-06-01',
        end_date: '2024-06-30'
      }
    );

    console.log('Indices:', result.indices);

    // Get historical data
    const timeSeries = await getTimeSeries(
      parcel.boundary,
      parcel.name,
      'NDVI',
      {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      }
    );

    console.log('Time series:', timeSeries.data);
  };

  return (
    <button onClick={analyzeParcel} disabled={loading}>
      {loading ? 'Analyzing...' : 'Analyze Parcel'}
    </button>
  );
}
```

---

## Harvest Management Hooks

### useHarvests

Fetch harvests with filters.

**Query Key**: `['harvests', organizationId, filters]`

**Returns**: `Harvest[]`

---

## Inventory Hooks

### useInventory

Fetch inventory items for organization.

**Query Key**: `['inventory', organizationId]`

**Returns**: `InventoryItem[]`

---

## Supplier & Customer Hooks

### useSuppliers

Fetch suppliers for organization.

**Query Key**: `['suppliers', organizationId]`

**Returns**: `Supplier[]`

---

### useCustomers

Fetch customers for organization.

**Query Key**: `['customers', organizationId]`

**Returns**: `Customer[]`

---

## Advanced Patterns

### Optimistic Updates

Update UI immediately before server response:

```typescript
const updateTask = useMutation({
  mutationFn: (updates) => supabase.from('tasks').update(updates)....,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['tasks'] });

    // Snapshot current value
    const previousTasks = queryClient.getQueryData(['tasks']);

    // Optimistically update
    queryClient.setQueryData(['tasks'], (old) => {
      return old.map(task =>
        task.id === newData.id ? { ...task, ...newData } : task
      );
    });

    return { previousTasks };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['tasks'], context.previousTasks);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }
});
```

---

### Dependent Queries

Load data sequentially:

```typescript
// Load organization first
const { data: org } = useQuery({
  queryKey: ['organization', orgId],
  queryFn: () => fetchOrganization(orgId)
});

// Then load farms (depends on org)
const { data: farms } = useQuery({
  queryKey: ['farms', org?.id],
  queryFn: () => fetchFarms(org.id),
  enabled: !!org?.id  // Only run when org is loaded
});
```

---

### Parallel Queries

Load multiple independent queries:

```typescript
function Dashboard() {
  const queries = useQueries({
    queries: [
      {
        queryKey: ['tasks', orgId],
        queryFn: () => fetchTasks(orgId)
      },
      {
        queryKey: ['workers', orgId],
        queryFn: () => fetchWorkers(orgId)
      },
      {
        queryKey: ['parcels', farmId],
        queryFn: () => fetchParcels(farmId)
      }
    ]
  });

  const [tasksQuery, workersQuery, parcelsQuery] = queries;
  const isLoading = queries.some(q => q.isLoading);

  return (
    <div>
      {isLoading ? <Loading /> : (
        <>
          <TaskList tasks={tasksQuery.data} />
          <WorkerList workers={workersQuery.data} />
          <ParcelList parcels={parcelsQuery.data} />
        </>
      )}
    </div>
  );
}
```

---

### Infinite Queries

Load paginated data:

```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteQuery({
  queryKey: ['tasks', 'infinite'],
  queryFn: ({ pageParam = 0 }) => fetchTasks({ offset: pageParam }),
  getNextPageParam: (lastPage, pages) => {
    return lastPage.length === 20 ? pages.length * 20 : undefined;
  }
});

return (
  <div>
    {data?.pages.map(page =>
      page.map(task => <TaskCard key={task.id} task={task} />)
    )}
    {hasNextPage && (
      <button
        onClick={() => fetchNextPage()}
        disabled={isFetchingNextPage}
      >
        Load More
      </button>
    )}
  </div>
);
```

---

### Mutation with Invalidation

Invalidate related queries after mutation:

```typescript
const createTask = useMutation({
  mutationFn: (task) => supabase.from('tasks').insert(task),
  onSuccess: (data) => {
    // Invalidate and refetch multiple related queries
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['task-statistics'] });
    queryClient.invalidateQueries({ queryKey: ['worker-availability'] });

    // Navigate to new task
    navigate({ to: `/tasks/${data.id}` });
  }
});
```

---

## Configuration

### Default Query Options

Set global defaults in QueryClient:

```typescript
// src/main.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,  // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    },
    mutations: {
      retry: 0
    }
  }
});
```

---

### Per-Hook Configuration

Override defaults per hook:

```typescript
const { data } = useQuery({
  queryKey: ['expensive-query'],
  queryFn: fetchExpensiveData,
  staleTime: 10 * 60 * 1000,  // 10 minutes
  cacheTime: 30 * 60 * 1000,  // 30 minutes
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
});
```

---

## Troubleshooting

### Issue: "Query is stuck in loading state"

**Cause**: Query key changing unexpectedly

**Solution**: Ensure stable query keys
```typescript
// Bad: Object creates new reference each render
useQuery({ queryKey: ['tasks', { status: 'pending' }] });

// Good: Use stable primitives
useQuery({ queryKey: ['tasks', status] });
```

---

### Issue: "Too many refetches"

**Cause**: Query invalidated too frequently

**Solution**: Use more specific query keys
```typescript
// Bad: Invalidates all tasks
queryClient.invalidateQueries({ queryKey: ['tasks'] });

// Good: Invalidate specific task
queryClient.invalidateQueries({ queryKey: ['task', taskId] });
```

---

### Issue: "Stale data shown"

**Cause**: staleTime too high

**Solution**: Reduce staleTime or force refetch
```typescript
// Force refetch
queryClient.invalidateQueries({ queryKey: ['tasks'] });

// Or reduce staleTime
useQuery({
  queryKey: ['tasks'],
  staleTime: 0  // Always consider stale
});
```

---

## Related Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Supabase Functions API](/api/supabase-functions)
- [State Management Guide](/guides/state-management)
- [Performance Optimization](/guides/performance)
