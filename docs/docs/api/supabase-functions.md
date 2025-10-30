# Supabase Functions API Reference

Complete reference for Supabase Edge Functions and RPC (Remote Procedure Call) database functions used in the AgriTech Platform.

## Overview

The platform uses two types of Supabase functions:

1. **Edge Functions** - Deno-based serverless functions (TypeScript)
2. **RPC Functions** - PostgreSQL stored procedures callable from the client

---

## Edge Functions

Edge Functions are deployed to Supabase and accessed via the Functions API.

### Authentication

All Edge Functions require authentication:

```typescript
const { data: { session } } = await supabase.auth.getSession();

const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* request data */ },
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'x-organization-id': currentOrganization.id
  }
});
```

---

### generate-index-image

Generate vegetation index image from satellite data.

**Location**: `/project/supabase/functions/generate-index-image/index.ts`

**Request**:
```typescript
{
  aoi: {
    geometry: GeoJSONGeometry,
    name?: string
  },
  date_range: {
    start_date: string,  // YYYY-MM-DD
    end_date: string
  },
  index: VegetationIndexType,
  cloud_coverage?: number
}
```

**Response**:
```typescript
{
  image_url: string,
  index: string,
  date: string,
  cloud_coverage: number,
  metadata: {
    available_images: number,
    suitable_images: number
  }
}
```

**Example**:
```typescript
const { data, error } = await supabase.functions.invoke('generate-index-image', {
  body: {
    aoi: {
      geometry: convertBoundaryToGeoJSON(parcel.boundary),
      name: parcel.name
    },
    date_range: {
      start_date: '2024-06-01',
      end_date: '2024-06-30'
    },
    index: 'NDVI',
    cloud_coverage: 10
  }
});

if (error) throw error;
console.log(`Image URL: ${data.image_url}`);
```

---

### post-invoice

Post an invoice to the general ledger (creates journal entry).

**Location**: `/project/supabase/functions/post-invoice/index.ts`

**Request**:
```typescript
{
  invoice_id: string,
  posting_date: string  // YYYY-MM-DD
}
```

**Response**:
```typescript
{
  success: boolean,
  invoice: Invoice,
  journal_entry: JournalEntry,
  message: string
}
```

**Example**:
```typescript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post-invoice`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'x-organization-id': currentOrganization.id,
    },
    body: JSON.stringify({
      invoice_id: 'uuid',
      posting_date: '2024-06-15'
    }),
  }
);

const data = await response.json();
console.log(`Journal Entry: ${data.journal_entry.reference_number}`);
```

---

### allocate-payment

Allocate payment to one or more invoices.

**Location**: `/project/supabase/functions/allocate-payment/index.ts`

**Request**:
```typescript
{
  payment_id: string,
  allocations: Array<{
    invoice_id: string,
    amount: number
  }>
}
```

**Response**:
```typescript
{
  success: boolean,
  payment: Payment,
  allocations: PaymentAllocation[],
  updated_invoices: Invoice[]
}
```

---

### create-invoice

Create invoice with automatic account setup and validation.

**Location**: `/project/supabase/functions/create-invoice/index.ts`

**Request**:
```typescript
{
  invoice_type: 'sales' | 'purchase',
  party_id: string,
  invoice_date: string,
  due_date: string,
  items: Array<{
    item_name: string,
    description?: string,
    quantity: number,
    rate: number,
    account_id: string,
    tax_id?: string,
    cost_center_id?: string
  }>,
  remarks?: string
}
```

**Response**:
```typescript
{
  success: boolean,
  invoice: Invoice,
  items: InvoiceItem[]
}
```

---

### polar-webhook

Handle Polar.sh subscription webhooks.

**Location**: `/project/supabase/functions/polar-webhook/index.ts`

**Webhook Events**:
- `subscription.created`
- `subscription.updated`
- `subscription.cancelled`
- `checkout.completed`

**Internal Function** - Called by Polar.sh, not directly invoked.

---

### check-subscription

Verify subscription status for organization.

**Location**: `/project/supabase/functions/check-subscription/index.ts`

**Request**:
```typescript
{
  organization_id: string
}
```

**Response**:
```typescript
{
  valid: boolean,
  subscription: {
    id: string,
    plan_name: string,
    status: string,
    expires_at: string,
    features: {
      has_analytics: boolean,
      has_sensor_integration: boolean,
      has_api_access: boolean,
      has_advanced_reporting: boolean
    },
    limits: {
      max_farms: number,
      max_parcels: number,
      max_users: number,
      max_satellite_reports: number
    }
  }
}
```

---

## RPC Functions (Database Functions)

RPC functions are PostgreSQL stored procedures callable from the Supabase client.

### Syntax

```typescript
const { data, error } = await supabase.rpc('function_name', {
  param_name: value,
  another_param: value
});
```

---

## Authentication & Authorization Functions

### get_user_organizations

Get all organizations a user belongs to with their roles.

**Parameters**:
- `user_uuid` (UUID) - User ID

**Returns**: Array of organizations
```typescript
{
  organization_id: string,
  organization_name: string,
  organization_slug: string,
  user_role: string,
  is_active: boolean
}[]
```

**Example**:
```typescript
const { data, error } = await supabase.rpc('get_user_organizations', {
  user_uuid: user.id
});

console.log(`User belongs to ${data.length} organizations`);
data.forEach(org => {
  console.log(`${org.organization_name} - Role: ${org.user_role}`);
});
```

---

### get_user_role

Get user's role in a specific organization.

**Parameters**:
- `user_id` (UUID) - User ID
- `org_id` (UUID, optional) - Organization ID

**Returns**:
```typescript
{
  role_name: string,
  role_display_name: string,
  role_level: number  // 1-6, lower = higher privileges
}
```

**Example**:
```typescript
const { data, error } = await supabase.rpc('get_user_role', {
  user_id: user.id,
  org_id: currentOrganization.id
});

console.log(`Role: ${data.role_display_name} (Level ${data.role_level})`);
```

---

### get_user_role_level

Get user's numeric role level in organization.

**Parameters**:
- `user_id` (UUID) - User ID
- `org_id` (UUID) - Organization ID

**Returns**: `number` (1-6)

**Role Hierarchy**:
1. `system_admin` - Platform-wide access
2. `organization_admin` - Full organization management
3. `farm_manager` - Farm-level operations
4. `farm_worker` - Task execution, analysis creation
5. `day_laborer` - Limited to assigned tasks
6. `viewer` - Read-only access

**Example**:
```typescript
const { data: roleLevel, error } = await supabase.rpc('get_user_role_level', {
  user_id: user.id,
  org_id: currentOrganization.id
});

if (roleLevel <= 2) {
  console.log('User is an admin');
}
```

---

### has_feature_access

Check if organization has access to a specific feature.

**Parameters**:
- `org_id` (UUID) - Organization ID
- `feature_name` (string) - Feature name

**Feature Names**:
- `analytics`
- `sensor_integration`
- `api_access`
- `advanced_reporting`

**Returns**: `boolean`

**Example**:
```typescript
const { data: hasAnalytics, error } = await supabase.rpc('has_feature_access', {
  org_id: currentOrganization.id,
  feature_name: 'analytics'
});

if (hasAnalytics) {
  // Show analytics dashboard
}
```

---

### has_valid_subscription

Check if organization has a valid active subscription.

**Parameters**:
- `org_id` (UUID) - Organization ID

**Returns**: `boolean`

**Example**:
```typescript
const { data: isValid, error } = await supabase.rpc('has_valid_subscription', {
  org_id: currentOrganization.id
});

if (!isValid) {
  // Redirect to subscription page
}
```

---

## Accounting Functions

### generate_invoice_number

Generate next sequential invoice number for organization.

**Parameters**:
- `p_organization_id` (UUID) - Organization ID
- `p_invoice_type` ('sales' | 'purchase') - Invoice type

**Returns**: `string`

**Format**:
- Sales: `INV-2024-00001`
- Purchase: `BILL-2024-00001`

**Example**:
```typescript
const { data: invoiceNumber, error } = await supabase.rpc('generate_invoice_number', {
  p_organization_id: currentOrganization.id,
  p_invoice_type: 'sales'
});

console.log(`Next invoice: ${invoiceNumber}`);
// Output: "INV-2024-00123"
```

---

### generate_payment_number

Generate next sequential payment number.

**Parameters**:
- `p_organization_id` (UUID) - Organization ID
- `p_payment_type` ('receive' | 'pay') - Payment type

**Returns**: `string`

**Format**:
- Receive: `PAY-IN-2024-00001`
- Pay: `PAY-OUT-2024-00001`

**Example**:
```typescript
const { data: paymentNumber, error } = await supabase.rpc('generate_payment_number', {
  p_organization_id: currentOrganization.id,
  p_payment_type: 'receive'
});

console.log(`Payment number: ${paymentNumber}`);
// Output: "PAY-IN-2024-00045"
```

---

### generate_journal_entry_number

Generate next journal entry number.

**Parameters**:
- `p_organization_id` (UUID) - Organization ID

**Returns**: `string`

**Format**: `JE-2024-00001`

**Example**:
```typescript
const { data: jeNumber, error } = await supabase.rpc('generate_journal_entry_number', {
  p_organization_id: currentOrganization.id
});

console.log(`Journal Entry: ${jeNumber}`);
```

---

### get_account_balance

Get current balance for an account.

**Parameters**:
- `p_account_id` (UUID) - Account ID
- `p_organization_id` (UUID) - Organization ID
- `p_as_of_date` (date, optional) - Balance as of specific date

**Returns**:
```typescript
{
  account_id: string,
  account_code: string,
  account_name: string,
  account_type: string,
  debit_total: number,
  credit_total: number,
  balance: number  // Debit - Credit
}
```

**Example**:
```typescript
const { data: balance, error } = await supabase.rpc('get_account_balance', {
  p_account_id: accountId,
  p_organization_id: currentOrganization.id,
  p_as_of_date: '2024-06-30'
});

console.log(`${balance.account_name}: ${balance.balance.toFixed(2)}`);
```

---

### get_account_balance_period

Get account balance for a specific period.

**Parameters**:
- `p_account_id` (UUID) - Account ID
- `p_organization_id` (UUID) - Organization ID
- `p_start_date` (date) - Period start
- `p_end_date` (date) - Period end

**Returns**:
```typescript
{
  opening_balance: number,
  period_debit: number,
  period_credit: number,
  closing_balance: number
}
```

**Example**:
```typescript
const { data: periodBalance, error } = await supabase.rpc('get_account_balance_period', {
  p_account_id: accountId,
  p_organization_id: currentOrganization.id,
  p_start_date: '2024-01-01',
  p_end_date: '2024-12-31'
});

console.log(`Opening: ${periodBalance.opening_balance}`);
console.log(`Closing: ${periodBalance.closing_balance}`);
```

---

### seed_chart_of_accounts

Seed default chart of accounts for new organization.

**Parameters**:
- `org_id` (UUID) - Organization ID
- `currency_code` (string, optional) - Currency code (default 'MAD')

**Returns**: `void`

**Automatically called** when new organization is created.

**Example** (manual call):
```typescript
const { error } = await supabase.rpc('seed_chart_of_accounts', {
  org_id: newOrganization.id,
  currency_code: 'USD'
});
```

---

## Task Management Functions

### get_worker_availability

Check if worker is available for a specific date.

**Parameters**:
- `p_worker_id` (UUID) - Worker ID
- `p_date` (date) - Date to check

**Returns**:
```typescript
{
  worker_id: string,
  date: string,
  is_available: boolean,
  assigned_tasks_count: number,
  total_hours_assigned: number,
  conflicts: Array<{
    task_id: string,
    task_title: string,
    scheduled_start: string,
    scheduled_end: string
  }>
}
```

**Example**:
```typescript
const { data: availability, error } = await supabase.rpc('get_worker_availability', {
  p_worker_id: workerId,
  p_date: '2024-06-15'
});

if (!availability.is_available) {
  console.log(`Worker has ${availability.assigned_tasks_count} tasks on this day`);
  availability.conflicts.forEach(c => {
    console.log(`- ${c.task_title}: ${c.scheduled_start}`);
  });
}
```

---

## Worker Payment Functions

### calculate_daily_worker_payment

Calculate payment for daily worker based on work records.

**Parameters**:
- `p_worker_id` (UUID) - Worker ID
- `p_period_start` (date) - Period start
- `p_period_end` (date) - Period end

**Returns**:
```typescript
{
  worker_id: string,
  base_amount: number,
  days_worked: number,
  hours_worked: number,
  overtime_amount: number,
  total_amount: number
}
```

**Example**:
```typescript
const { data: payment, error } = await supabase.rpc('calculate_daily_worker_payment', {
  p_worker_id: workerId,
  p_period_start: '2024-06-01',
  p_period_end: '2024-06-30'
});

console.log(`Days worked: ${payment.days_worked}`);
console.log(`Total payment: ${payment.total_amount.toFixed(2)}`);
```

---

### calculate_fixed_salary_payment

Calculate payment for fixed salary worker.

**Parameters**:
- `p_worker_id` (UUID) - Worker ID
- `p_period_start` (date) - Period start
- `p_period_end` (date) - Period end

**Returns**:
```typescript
{
  worker_id: string,
  base_amount: number,
  days_in_period: number,
  overtime_amount: number,
  total_amount: number
}
```

**Example**:
```typescript
const { data: salary, error } = await supabase.rpc('calculate_fixed_salary_payment', {
  p_worker_id: workerId,
  p_period_start: '2024-06-01',
  p_period_end: '2024-06-30'
});

console.log(`Monthly salary: ${salary.base_amount.toFixed(2)}`);
```

---

### calculate_metayage_share

Calculate métayage (sharecropping) worker's share.

**Parameters**:
- `p_worker_id` (UUID) - Worker ID
- `p_gross_revenue` (numeric) - Total revenue
- `p_total_charges` (numeric, optional) - Total costs to deduct

**Returns**: `numeric` (share amount)

**Calculation**:
- Based on worker's métayage type and percentage
- Khammass (1/5), Rebaa (1/4), Tholth (1/3), or custom
- Can use gross or net revenue based on worker settings

**Example**:
```typescript
const { data: share, error } = await supabase.rpc('calculate_metayage_share', {
  p_worker_id: workerId,
  p_gross_revenue: 50000,
  p_total_charges: 10000
});

console.log(`Worker's share: ${share.toFixed(2)}`);
```

---

### get_worker_advance_deductions

Get total advance deductions for worker's next payment.

**Parameters**:
- `p_worker_id` (UUID) - Worker ID
- `p_payment_date` (date) - Payment date

**Returns**: `numeric` (total to deduct)

**Example**:
```typescript
const { data: deductions, error } = await supabase.rpc('get_worker_advance_deductions', {
  p_worker_id: workerId,
  p_payment_date: '2024-06-30'
});

console.log(`Advance deductions: ${deductions.toFixed(2)}`);
```

---

## Harvest & Delivery Functions

### generate_delivery_note_number

Generate next delivery note number.

**Parameters**: None (auto-increments globally)

**Returns**: `string`

**Format**: `DN-2024-00001`

**Trigger**: Automatically called on delivery note insert

---

### get_harvest_statistics

Get comprehensive harvest statistics for period.

**Parameters**:
- `p_organization_id` (UUID) - Organization ID
- `p_farm_id` (UUID, optional) - Filter by farm
- `p_parcel_id` (UUID, optional) - Filter by parcel
- `p_start_date` (date) - Period start
- `p_end_date` (date) - Period end

**Returns**:
```typescript
{
  total_harvests: number,
  total_quantity: number,
  total_revenue: number,
  total_cost: number,
  net_profit: number,
  average_quality: number,
  by_crop: Array<{
    crop_name: string,
    quantity: number,
    revenue: number
  }>,
  by_parcel: Array<{
    parcel_name: string,
    quantity: number,
    revenue: number
  }>
}
```

**Example**:
```typescript
const { data: stats, error } = await supabase.rpc('get_harvest_statistics', {
  p_organization_id: currentOrganization.id,
  p_farm_id: currentFarm.id,
  p_start_date: '2024-01-01',
  p_end_date: '2024-12-31'
});

console.log(`Total harvests: ${stats.total_harvests}`);
console.log(`Total revenue: ${stats.total_revenue.toFixed(2)}`);
console.log(`Profit margin: ${((stats.net_profit / stats.total_revenue) * 100).toFixed(1)}%`);
```

---

## Profitability Functions

### calculate_profitability

Calculate profitability for parcels with cost and revenue breakdown.

**Parameters**:
- `p_organization_id` (UUID) - Organization ID
- `p_parcel_id` (UUID, optional) - Filter by parcel
- `p_start_date` (date, optional) - Period start
- `p_end_date` (date, optional) - Period end

**Returns**:
```typescript
{
  parcel_id: string,
  parcel_name: string,
  total_costs: number,
  total_revenue: number,
  net_profit: number,
  profit_margin: number,  // Percentage
  cost_breakdown: {
    labor: number,
    materials: number,
    utilities: number,
    other: number
  },
  revenue_breakdown: {
    sales: number,
    subsidies: number,
    other: number
  }
}[]
```

**Example**:
```typescript
const { data: profitability, error } = await supabase.rpc('calculate_profitability', {
  p_organization_id: currentOrganization.id,
  p_parcel_id: parcelId,
  p_start_date: '2024-01-01',
  p_end_date: '2024-12-31'
});

profitability.forEach(p => {
  console.log(`${p.parcel_name}:`);
  console.log(`  Revenue: ${p.total_revenue.toFixed(2)}`);
  console.log(`  Costs: ${p.total_costs.toFixed(2)}`);
  console.log(`  Profit: ${p.net_profit.toFixed(2)} (${p.profit_margin.toFixed(1)}%)`);
});
```

---

## Satellite Data Functions

### get_latest_satellite_data

Get latest satellite data for parcel.

**Parameters**:
- `parcel_uuid` (UUID) - Parcel ID
- `index_name_param` (string, optional) - Filter by index

**Returns**:
```typescript
{
  index_name: string,
  date: string,
  mean_value: number,
  min_value: number,
  max_value: number,
  std_value: number,
  median_value: number,
  cloud_coverage_percentage: number,
  geotiff_url: string,
  created_at: string
}[]
```

**Example**:
```typescript
const { data: latestData, error } = await supabase.rpc('get_latest_satellite_data', {
  parcel_uuid: parcelId,
  index_name_param: 'NDVI'
});

console.log(`Latest NDVI: ${latestData[0].mean_value.toFixed(3)}`);
console.log(`Date: ${latestData[0].date}`);
```

---

### get_satellite_data_statistics

Get satellite data statistics for period.

**Parameters**:
- `parcel_uuid` (UUID) - Parcel ID
- `index_name_param` (string) - Index name
- `start_date_param` (date) - Period start
- `end_date_param` (date) - Period end

**Returns**:
```typescript
{
  index_name: string,
  data_points_count: number,
  mean_value: number,
  min_value: number,
  max_value: number,
  std_value: number,
  median_value: number,
  first_date: string,
  last_date: string
}
```

**Example**:
```typescript
const { data: stats, error } = await supabase.rpc('get_satellite_data_statistics', {
  parcel_uuid: parcelId,
  index_name_param: 'NDVI',
  start_date_param: '2024-01-01',
  end_date_param: '2024-12-31'
});

console.log(`Data points: ${stats.data_points_count}`);
console.log(`Average NDVI: ${stats.mean_value.toFixed(3)}`);
console.log(`Range: ${stats.min_value.toFixed(3)} - ${stats.max_value.toFixed(3)}`);
```

---

## Resource Limit Functions

### can_create_farm

Check if organization can create more farms (subscription limit).

**Parameters**:
- `org_id` (UUID) - Organization ID

**Returns**: `boolean`

**Example**:
```typescript
const { data: canCreate, error } = await supabase.rpc('can_create_farm', {
  org_id: currentOrganization.id
});

if (!canCreate) {
  alert('Farm limit reached. Upgrade your subscription.');
}
```

---

### can_create_parcel

Check if organization can create more parcels (subscription limit).

**Parameters**:
- `org_id` (UUID) - Organization ID

**Returns**: `boolean`

---

### can_add_user

Check if organization can add more users (subscription limit).

**Parameters**:
- `org_id` (UUID) - Organization ID

**Returns**: `boolean`

---

### can_create_resource

Check if organization can create resource (generic limit check).

**Parameters**:
- `p_organization_id` (UUID) - Organization ID
- `p_resource_type` (string) - Resource type ('farms', 'parcels', 'users', 'satellite_reports')

**Returns**: `boolean`

**Example**:
```typescript
const { data: canCreate, error } = await supabase.rpc('can_create_resource', {
  p_organization_id: currentOrganization.id,
  p_resource_type: 'satellite_reports'
});

if (!canCreate) {
  console.log('Satellite report limit reached');
}
```

---

## Best Practices

### Error Handling

Always handle RPC errors gracefully:

```typescript
const { data, error } = await supabase.rpc('function_name', { params });

if (error) {
  console.error('RPC Error:', error.message);
  // Handle specific errors
  if (error.message.includes('permission')) {
    // Permission error
  } else if (error.message.includes('not found')) {
    // Resource not found
  }
  throw error;
}
```

### Type Safety

Define TypeScript types for RPC results:

```typescript
interface WorkerAvailability {
  worker_id: string;
  date: string;
  is_available: boolean;
  assigned_tasks_count: number;
  total_hours_assigned: number;
  conflicts: Array<{
    task_id: string;
    task_title: string;
    scheduled_start: string;
    scheduled_end: string;
  }>;
}

const { data, error } = await supabase.rpc('get_worker_availability', {
  p_worker_id: workerId,
  p_date: '2024-06-15'
});

const availability: WorkerAvailability = data;
```

### Caching

Cache RPC results when appropriate:

```typescript
const { data, error } = await supabase.rpc('get_account_balance', {
  p_account_id: accountId,
  p_organization_id: orgId
});

// Cache for 5 minutes
queryClient.setQueryData(
  ['account-balance', accountId],
  data,
  { staleTime: 5 * 60 * 1000 }
);
```

### Transaction Safety

For multi-step operations, use Edge Functions with transactions:

```typescript
// Instead of multiple RPC calls:
// 1. Generate invoice number
// 2. Create invoice
// 3. Create invoice items
// 4. Update inventory

// Use Edge Function:
await supabase.functions.invoke('create-invoice', {
  body: { /* invoice data */ }
});

// Edge Function handles all steps in a transaction
```

---

## Troubleshooting

### Common Issues

**Issue**: "function does not exist"

**Solution**: Run migrations or check function name spelling
```bash
npm run db:reset  # Reset local database with all migrations
```

**Issue**: "permission denied for function"

**Solution**: Check RLS policies and function SECURITY DEFINER
```sql
-- Functions with SECURITY DEFINER run with creator privileges
CREATE OR REPLACE FUNCTION my_function()
RETURNS ...
SECURITY DEFINER  -- Add this
AS $$
...
$$;
```

**Issue**: "relation does not exist"

**Solution**: Ensure search_path is set correctly
```sql
-- Set search_path in function
CREATE OR REPLACE FUNCTION my_function()
...
SET search_path = public, auth
AS $$
...
$$;
```

---

## Related Resources

- [Database Schema Reference](/database/schema)
- [Authentication Guide](/guides/authentication)
- [Subscription Management](/features/subscriptions)
- [Supabase RPC Documentation](https://supabase.com/docs/guides/database/functions)
