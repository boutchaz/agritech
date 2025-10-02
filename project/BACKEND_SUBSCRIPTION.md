**# Backend Subscription System Documentation

## Overview

The subscription system is now fully managed on the backend using Supabase. All validation logic, limit checks, and access control are enforced at the database level.

## Architecture

```
Frontend (React)
    ↓
Edge Function (check-subscription)
    ↓
PostgreSQL Functions + RLS Policies
    ↓
Subscriptions Table
```

## Backend Components

### 1. Database Functions

Located in: `supabase/migrations/20251002200000_subscription_enforcement.sql`

#### Core Validation Functions

**`has_valid_subscription(org_id UUID)`**
- Checks if organization has valid active subscription
- Returns: `BOOLEAN`
- Validates: status IN ('active', 'trialing') AND not expired

**`can_create_farm(org_id UUID)`**
- Checks if organization can create more farms
- Returns: `BOOLEAN`
- Validates: subscription valid + current count < max_farms

**`can_create_parcel(org_id UUID)`**
- Checks if organization can create more parcels
- Returns: `BOOLEAN`
- Validates: subscription valid + current count < max_parcels

**`can_add_user(org_id UUID)`**
- Checks if organization can add more users
- Returns: `BOOLEAN`
- Validates: subscription valid + current count < max_users

**`has_feature_access(org_id UUID, feature_name TEXT)`**
- Checks if organization has access to premium feature
- Returns: `BOOLEAN`
- Features: analytics, sensor_integration, ai_recommendations, advanced_reporting, api_access, priority_support

### 2. Row Level Security (RLS) Policies

**Farms Table**
```sql
CREATE POLICY "subscription_check_farms_insert"
  ON public.farms FOR INSERT
  WITH CHECK (
    has_valid_subscription(organization_id) AND
    can_create_farm(organization_id)
  );
```

**Parcels Table**
```sql
CREATE POLICY "subscription_check_parcels_insert"
  ON public.parcels FOR INSERT
  WITH CHECK (...);
```

**Organization Users Table**
```sql
CREATE POLICY "subscription_check_users_insert"
  ON public.organization_users FOR INSERT
  WITH CHECK (...);
```

### 3. Edge Function

Located in: `supabase/functions/check-subscription/index.ts`

**Endpoint**: `POST /functions/v1/check-subscription`

**Request Body**:
```typescript
{
  organizationId: string;
  feature?: string;  // Optional: check specific feature access
}
```

**Response**:
```typescript
{
  isValid: boolean;
  subscription: Subscription | null;
  hasFeature?: boolean;
  reason?: 'no_subscription' | 'canceled' | 'past_due' | 'expired';
  usage?: {
    farms: { current: number; max: number; canCreate: boolean };
    parcels: { current: number; max: number; canCreate: boolean };
    users: { current: number; max: number; canAdd: boolean };
  };
}
```

## Frontend Integration

### Hooks

**`useSubscriptionCheck(feature?: string)`**
- Calls backend Edge Function for validation
- Returns subscription status and usage limits
- Cached for 5 minutes

**`useCanCreateResource(type)`**
- Checks if organization can create farms/parcels/users
- Returns `canCreate: boolean` and usage stats

**`useHasFeature(feature)`**
- Checks if organization has access to premium feature
- Returns `hasAccess: boolean`

### Example Usage

```typescript
// Check subscription validity
const { data, isLoading } = useSubscriptionCheck();
if (!data?.isValid) {
  // Show subscription required screen
}

// Check if can create farm
const { canCreate, usage } = useCanCreateResource('farm');
if (!canCreate) {
  // Show upgrade message
}

// Check feature access
const { hasAccess } = useHasFeature('analytics');
if (hasAccess) {
  // Show analytics dashboard
}
```

## Deployment

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Deploy Everything

Run the deployment script:

```bash
./scripts/deploy-supabase.sh
```

This will:
1. Apply database migrations
2. Deploy Edge Functions
3. Verify deployment

### Manual Deployment

#### Database Migrations

```bash
supabase db push
```

#### Edge Functions

```bash
supabase functions deploy check-subscription --no-verify-jwt
```

### Verify Deployment

```bash
# Check functions
supabase functions list

# View logs
supabase functions logs check-subscription

# Test edge function
curl -i --location --request POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/check-subscription' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"organizationId":"YOUR_ORG_ID"}'
```

## Security

### Database Level
- All validation functions use `SECURITY DEFINER`
- RLS policies automatically enforce subscription checks on INSERT
- No user can bypass subscription limits

### Edge Function Level
- Requires valid JWT token (Supabase Auth)
- Validates user has access to organization
- All checks use backend database functions

### Frontend Level
- Only displays UI based on backend responses
- Cannot bypass backend validation
- All mutations go through RLS policies

## Testing

### Test Scenarios

1. **No Subscription**
   ```sql
   DELETE FROM subscriptions WHERE organization_id = 'test-org-id';
   ```
   Result: Should block access

2. **Expired Subscription**
   ```sql
   UPDATE subscriptions
   SET current_period_end = NOW() - INTERVAL '1 day'
   WHERE organization_id = 'test-org-id';
   ```
   Result: Should block access

3. **Limit Reached**
   ```sql
   -- Create max farms for organization
   -- Try to create one more
   ```
   Result: Should fail with RLS policy violation

4. **Valid Subscription**
   ```sql
   UPDATE subscriptions
   SET status = 'active',
       current_period_end = NOW() + INTERVAL '30 days'
   WHERE organization_id = 'test-org-id';
   ```
   Result: Should allow access

### Test Edge Function

```typescript
// In browser console or test file
const { data } = await supabase.functions.invoke('check-subscription', {
  body: { organizationId: 'YOUR_ORG_ID' }
});
console.log(data);
```

## Monitoring

### View Logs

```bash
# Edge function logs
supabase functions logs check-subscription

# Database logs
supabase db logs
```

### Key Metrics to Monitor

1. **Subscription Validation Rate**
   - How often is `has_valid_subscription()` called?
   - Any performance issues?

2. **Failed Access Attempts**
   - How many RLS policy violations?
   - Which limits are hit most often?

3. **Edge Function Performance**
   - Response times
   - Error rates

## Troubleshooting

### "Subscription check failed"

1. Check if Edge Function is deployed:
   ```bash
   supabase functions list
   ```

2. Check Edge Function logs:
   ```bash
   supabase functions logs check-subscription --tail
   ```

3. Verify database functions exist:
   ```sql
   SELECT * FROM pg_proc WHERE proname LIKE '%subscription%';
   ```

### "RLS policy violation"

1. Check subscription status:
   ```sql
   SELECT * FROM subscriptions WHERE organization_id = 'org-id';
   ```

2. Verify limits:
   ```sql
   SELECT * FROM subscription_status WHERE organization_id = 'org-id';
   ```

3. Check if RLS policies are enabled:
   ```sql
   SELECT tablename, policyname FROM pg_policies
   WHERE schemaname = 'public';
   ```

### "User can bypass subscription"

If a user can bypass subscription checks:

1. Verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

2. Check policy enforcement:
   ```sql
   -- Should fail if no valid subscription
   INSERT INTO farms (organization_id, name)
   VALUES ('org-without-sub', 'Test Farm');
   ```

## Maintenance

### Update Subscription Limits

```sql
-- Update plan limits (auto-applied by trigger)
UPDATE subscriptions
SET plan_type = 'professional'
WHERE organization_id = 'org-id';
```

### Expire Subscriptions Manually

```sql
-- Run expiration check
SELECT update_expired_subscriptions();
```

### Create New Feature Flag

1. Add column to subscriptions table:
   ```sql
   ALTER TABLE subscriptions
   ADD COLUMN has_new_feature BOOLEAN DEFAULT false;
   ```

2. Update `has_feature_access()` function to include new feature

3. Update plan limits trigger to set default values

## Performance Optimization

### Indexes

All critical indexes are created:
- `idx_subscriptions_organization`
- `idx_subscriptions_status`
- `idx_usage_subscription`

### Function Caching

Database functions are marked as `STABLE` for query planner optimization.

### Edge Function Caching

Frontend caches results for 5 minutes using React Query.

## Migration from Frontend Validation

Old (Frontend):
```typescript
const isValid = isSubscriptionValid(subscription, organizationCreatedAt);
```

New (Backend):
```typescript
const { data } = useSubscriptionCheck();
const isValid = data?.isValid;
```

**Benefits:**
- ✅ Cannot be bypassed
- ✅ Centralized logic
- ✅ Database-level enforcement
- ✅ Easier to maintain
- ✅ Automatic limit checks on INSERT

## Support

For issues or questions:
1. Check logs: `supabase functions logs`
2. Review RLS policies in Supabase Dashboard
3. Test validation functions directly in SQL Editor
