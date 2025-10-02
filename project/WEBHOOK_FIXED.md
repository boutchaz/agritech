# ✅ Polar Webhook - FIXED!

The webhook has been updated and deployed successfully.

## What Was Fixed

1. **✅ Removed JWT authentication requirement**
   - Added `verify_jwt = false` to `supabase/config.toml`
   - Deployed with `--no-verify-jwt` flag
   - Webhook is now publicly accessible (as webhooks should be)

2. **✅ Added support for `checkout.updated` events**
   - Polar sends `checkout.updated` when payment is confirmed
   - Webhook now handles this event type

3. **✅ Fixed user lookup**
   - Now queries `auth.users` to find user by email
   - Then gets organization from `organization_users`

4. **✅ Automatic plan detection**
   - Maps Polar product IDs to plan types:
     - `3b03769f-9a47-47bc-8f07-bd1f3a580dee` → Essential
     - `db925c1e-d64d-4d95-9907-dc90da5bcbe6` → Professional
     - `d53c78fb-5833-43da-a4f0-2a0bd2ff32c9` → Enterprise

5. **✅ Creates subscription with correct limits**
   - Sets proper max_farms, max_parcels, max_users
   - Enables/disables features based on plan
   - Sets 30-day billing period

## Webhook URL

```
https://mvegjdkkbhlhbjpbhpou.supabase.co/functions/v1/polar-webhook
```

## Testing

### Test from Polar Dashboard

1. Go to https://polar.sh/dashboard
2. Navigate to **Settings** → **Webhooks**
3. Find your webhook
4. Click **"Send Test Event"**
5. Select event type: `checkout.updated`

### Check Logs

```bash
npx supabase functions logs polar-webhook --tail
```

You should see:
```
📥 Webhook received: POST
📦 Event type: checkout.updated
🛒 Processing checkout: {...}
👤 Found user: ...
✅ Subscription created successfully
```

## For Your Paid Subscription

Since you already paid, you have two options:

### Option 1: Resend Webhook from Polar (Recommended)

1. Login to Polar dashboard
2. Go to **Checkouts** or **Subscriptions**
3. Find your checkout (ID: 37110390-3bfb-490a-bb37-7c297fe27958)
4. Click "Resend Webhook" or "Trigger Event"
5. The webhook will automatically create your subscription!

### Option 2: Manual SQL (Quick Fix)

Run this in Supabase SQL Editor:

```sql
-- 1. Find your user
SELECT id, email FROM auth.users WHERE email = 'testr@gmail.com';

-- 2. Find your organization
SELECT ou.organization_id, o.name
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = 'YOUR_USER_ID_FROM_STEP_1';

-- 3. Create subscription
INSERT INTO subscriptions (
  organization_id,
  polar_subscription_id,
  polar_customer_id,
  polar_product_id,
  plan_type,
  status,
  current_period_start,
  current_period_end,
  max_farms, max_parcels, max_users, max_satellite_reports,
  has_analytics, has_sensor_integration, has_ai_recommendations,
  has_advanced_reporting, has_api_access, has_priority_support
) VALUES (
  'YOUR_ORG_ID_FROM_STEP_2',
  '37110390-3bfb-490a-bb37-7c297fe27958',
  'aaea9b35-c46a-4ee5-8aff-f2fbd2df0a6e',
  'db925c1e-d64d-4d95-9907-dc90da5bcbe6',
  'professional',
  'active',
  NOW(),
  NOW() + INTERVAL '30 days',
  50, 500, 20, 100,
  true, true, true, true, true, true
)
ON CONFLICT (organization_id) DO UPDATE SET
  status = 'active',
  plan_type = 'professional',
  current_period_end = NOW() + INTERVAL '30 days',
  updated_at = NOW();
```

## Verification

After creating the subscription, verify it works:

```sql
SELECT
  o.name,
  s.plan_type,
  s.status,
  has_valid_subscription(o.id) as is_valid
FROM organizations o
JOIN subscriptions s ON o.id = s.organization_id
WHERE s.polar_customer_id = 'aaea9b35-c46a-4ee5-8aff-f2fbd2df0a6e';
```

Expected: `is_valid = true`

Then reload your app - you should have full access! ✅

## Future Payments

All future payments will automatically create subscriptions via the webhook. No manual intervention needed! 🎉
