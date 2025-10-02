# Subscription System Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. Prerequisites Installed
- [x] Supabase CLI installed (`/opt/homebrew/bin/supabase`)
- [ ] Logged in to Supabase CLI
- [ ] Project linked to remote Supabase instance

### 2. Files Ready for Deployment

#### Database Migration
- `supabase/migrations/20251002200000_subscription_enforcement.sql`
  - ✅ 6 validation functions (has_valid_subscription, can_create_*, has_feature_access)
  - ✅ 3 RLS policies for farms, parcels, organization_users
  - ✅ Subscription status view
  - ✅ Auto-expiration function

#### Edge Function
- `supabase/functions/check-subscription/index.ts`
  - ✅ Subscription validation endpoint
  - ✅ Usage limits checking
  - ✅ Feature access validation

#### Frontend Hooks
- `src/hooks/useSubscriptionCheck.ts`
  - ✅ useSubscriptionCheck()
  - ✅ useCanCreateResource()
  - ✅ useHasFeature()

## 🚀 Deployment Steps

### Step 1: Login to Supabase

```bash
supabase login
```

This will open your browser for authentication.

### Step 2: Link to Your Project

Get your project reference from Supabase Dashboard:
- Go to https://app.supabase.com
- Select your project
- Go to Settings > General
- Copy "Reference ID"

Then link:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You'll be prompted for your database password.

### Step 3: Apply Database Migrations

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project
supabase db push
```

This applies the subscription enforcement migration with all functions and policies.

**Expected Output:**
```
Applying migration 20251002200000_subscription_enforcement.sql...
✓ Migration applied successfully
```

**Verify in Dashboard:**
1. Go to Database > Functions
2. You should see:
   - has_valid_subscription
   - can_create_farm
   - can_create_parcel
   - can_add_user
   - has_feature_access
   - update_expired_subscriptions

### Step 4: Deploy Edge Function

```bash
supabase functions deploy check-subscription --no-verify-jwt
```

**Expected Output:**
```
Deploying check-subscription...
✓ Function deployed successfully
```

**Verify in Dashboard:**
1. Go to Edge Functions
2. You should see: check-subscription (Deployed)

### Step 5: Set Environment Variables

If your Edge Function needs environment variables:

```bash
supabase secrets set SOME_SECRET=value
```

### Step 6: Test the Deployment

#### Test Database Functions

```sql
-- In SQL Editor (Supabase Dashboard)

-- Test subscription validation
SELECT has_valid_subscription('YOUR_ORG_ID');

-- Test limit checking
SELECT can_create_farm('YOUR_ORG_ID');
SELECT can_create_parcel('YOUR_ORG_ID');
SELECT can_add_user('YOUR_ORG_ID');

-- Test feature access
SELECT has_feature_access('YOUR_ORG_ID', 'analytics');

-- View subscription status
SELECT * FROM subscription_status WHERE organization_id = 'YOUR_ORG_ID';
```

#### Test Edge Function

In your browser console or test file:

```javascript
const { data, error } = await supabase.functions.invoke('check-subscription', {
  body: {
    organizationId: 'YOUR_ORG_ID'
  }
});

console.log('Subscription check:', data);
```

Expected response:
```json
{
  "isValid": true,
  "subscription": { ... },
  "usage": {
    "farms": { "current": 1, "max": 2, "canCreate": true },
    "parcels": { "current": 5, "max": 25, "canCreate": true },
    "users": { "current": 2, "max": 5, "canAdd": true }
  }
}
```

### Step 7: Update Frontend Environment

Make sure your `.env` has the correct Supabase URL and Keys:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### Step 8: Test End-to-End

1. **Test Without Subscription:**
   - Create test organization
   - Delete subscription: `DELETE FROM subscriptions WHERE organization_id = 'test-org'`
   - Try to access app → Should be blocked

2. **Test With Trial:**
   - Create subscription with status = 'trialing'
   - Access app → Should work with trial banner

3. **Test Limits:**
   - Create farms until limit reached
   - Try to create one more → Should fail with error message

4. **Test Expired:**
   - Set `current_period_end = NOW() - INTERVAL '1 day'`
   - Try to access → Should be blocked

## 📊 Monitoring After Deployment

### View Edge Function Logs

```bash
supabase functions logs check-subscription --tail
```

### Check Database Performance

```sql
-- Monitor function calls
SELECT * FROM pg_stat_user_functions
WHERE funcname LIKE '%subscription%';

-- Check RLS policy performance
SELECT * FROM pg_stat_all_tables
WHERE schemaname = 'public'
AND relname IN ('farms', 'parcels', 'organization_users');
```

### Monitor Subscription Status

```sql
-- Overview of all subscriptions
SELECT
  plan_type,
  status,
  COUNT(*) as count
FROM subscriptions
GROUP BY plan_type, status;

-- Find expiring soon
SELECT * FROM subscription_status
WHERE expiration_status = 'expiring_soon';

-- Find past due
SELECT * FROM subscriptions
WHERE status = 'past_due';
```

## 🔧 Troubleshooting

### Migration Failed

**Error: "relation already exists"**
```bash
# Check existing functions
supabase db diff --schema public

# If needed, manually drop and reapply
```

**Error: "permission denied"**
```bash
# Ensure you're using the correct database password
supabase link --project-ref YOUR_REF
```

### Edge Function Not Working

**Check deployment:**
```bash
supabase functions list
```

**View logs:**
```bash
supabase functions logs check-subscription
```

**Test directly:**
```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/check-subscription' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"organizationId":"test-org-id"}'
```

### RLS Policies Not Working

**Verify RLS is enabled:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('farms', 'parcels', 'organization_users');
```

**Check policies:**
```sql
SELECT * FROM pg_policies
WHERE schemaname = 'public';
```

**Test directly:**
```sql
-- This should fail if no valid subscription
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-id';

INSERT INTO farms (organization_id, name)
VALUES ('org-without-subscription', 'Test Farm');
-- Expected: RLS policy violation
```

## 🎯 Post-Deployment Tasks

### 1. Create Test Subscriptions

For existing production organizations:

```sql
-- Give all existing orgs a trial subscription
INSERT INTO subscriptions (
  organization_id,
  plan_type,
  status,
  current_period_start,
  current_period_end
)
SELECT
  id,
  'essential',
  'trialing',
  NOW(),
  NOW() + INTERVAL '14 days'
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM subscriptions);
```

### 2. Set Up Scheduled Tasks

Create a cron job to expire subscriptions:

In Supabase Dashboard:
1. Go to Database > Extensions
2. Enable `pg_cron`
3. Create job:

```sql
SELECT cron.schedule(
  'expire-subscriptions',
  '0 * * * *', -- Every hour
  $$SELECT update_expired_subscriptions()$$
);
```

### 3. Set Up Monitoring

Create alerts for:
- Subscriptions expiring in 7 days
- Past due subscriptions
- Organizations hitting limits

### 4. Document API Endpoints

Update your API documentation to include the Edge Function endpoint.

## 📝 Quick Reference

### Key Database Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `has_valid_subscription(org_id)` | Check if subscription valid | BOOLEAN |
| `can_create_farm(org_id)` | Check if can create farm | BOOLEAN |
| `can_create_parcel(org_id)` | Check if can create parcel | BOOLEAN |
| `can_add_user(org_id)` | Check if can add user | BOOLEAN |
| `has_feature_access(org_id, feature)` | Check feature access | BOOLEAN |

### Edge Function Endpoint

```
POST https://YOUR_PROJECT.supabase.co/functions/v1/check-subscription

Headers:
- Authorization: Bearer YOUR_JWT_TOKEN
- Content-Type: application/json

Body:
{
  "organizationId": "uuid",
  "feature": "analytics" // optional
}
```

### Frontend Hooks

```typescript
// Check subscription
const { data, isLoading } = useSubscriptionCheck();

// Check resource limits
const { canCreate } = useCanCreateResource('farm');

// Check feature access
const { hasAccess } = useHasFeature('analytics');
```

## ✅ Deployment Checklist

- [ ] Supabase CLI logged in
- [ ] Project linked
- [ ] Database migration applied
- [ ] Edge function deployed
- [ ] Database functions verified
- [ ] RLS policies verified
- [ ] Edge function tested
- [ ] Frontend hooks tested
- [ ] End-to-end testing complete
- [ ] Monitoring set up
- [ ] Documentation updated

## 🎉 Done!

Your subscription system is now fully deployed and running on Supabase backend!
