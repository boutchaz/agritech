# Polar Webhook Setup Guide

## 🎯 Goal
Connect Polar.sh payment webhooks to Supabase to automatically create subscriptions when users pay.

---

## ✅ Step 1: Deploy the Webhook Function

First, deploy the polar-webhook function to Supabase:

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Deploy the webhook function
npx supabase functions deploy polar-webhook
```

After deployment, you'll get a URL like:
```
https://your-project.supabase.co/functions/v1/polar-webhook
```

**Copy this URL** - you'll need it for Polar configuration.

---

## ✅ Step 2: Set Environment Variables in Supabase

The webhook needs a secret to verify requests from Polar.

### 2.1 Generate a webhook secret

Run this in your terminal:

```bash
openssl rand -hex 32
```

This generates a random secret like: `a1b2c3d4e5f6...`

**Copy this secret** - you'll use it in both Supabase and Polar.

### 2.2 Set the secret in Supabase

```bash
# Set the webhook secret
npx supabase secrets set POLAR_WEBHOOK_SECRET=your-generated-secret-here

# Verify it's set
npx supabase secrets list
```

---

## ✅ Step 3: Configure Webhook in Polar.sh

### 3.1 Login to Polar Dashboard

1. Go to https://polar.sh/dashboard
2. Navigate to **Settings** → **Webhooks**
3. Click **"Add Webhook"**

### 3.2 Configure the webhook

**Webhook URL:**
```
https://your-project.supabase.co/functions/v1/polar-webhook
```

**Webhook Secret:**
Paste the same secret you generated in Step 2.1

**Events to Subscribe:**
- ✅ `subscription.created`
- ✅ `subscription.updated`
- ✅ `subscription.canceled`
- ✅ `subscription.past_due`

### 3.3 Save the webhook

Click **"Save Webhook"** or **"Create Webhook"**

---

## ✅ Step 4: Test the Webhook

### 4.1 Send a test event from Polar

In Polar dashboard, find your webhook and click **"Send Test Event"**.

### 4.2 Check Supabase logs

```bash
npx supabase functions logs polar-webhook --tail
```

You should see:
```
✅ Webhook received
✅ Processing event: subscription.created
✅ Subscription updated successfully
```

### 4.3 Verify in database

Run this in Supabase SQL Editor:

```sql
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;
```

You should see a test subscription created.

---

## ✅ Step 5: Configure Product Metadata in Polar

**CRITICAL:** Each product in Polar needs metadata so the webhook knows which plan it is.

### 5.1 Go to Products in Polar Dashboard

1. Navigate to **Products** → Select your product
2. Scroll to **Metadata** section
3. Add these key-value pairs:

#### For Essential Plan ($25/mo):
```
plan_type: essential
max_farms: 5
max_parcels: 50
max_users: 3
```

#### For Professional Plan ($75/mo):
```
plan_type: professional
max_farms: 50
max_parcels: 500
max_users: 20
```

#### For Enterprise Plan (custom):
```
plan_type: enterprise
max_farms: 999999
max_parcels: 999999
max_users: 999999
```

### 5.2 Save the product metadata

Click **Save** on each product.

---

## ✅ Step 6: Update Checkout Flow to Pass Organization ID

The webhook needs to know which organization the subscription is for. Update your checkout code:

### 6.1 Check current checkout implementation

```typescript
// src/lib/polar.ts - getCheckoutUrl function should include metadata
export function getCheckoutUrl(
  planType: PlanType,
  organizationId: string // Add this parameter
): string {
  const plan = SUBSCRIPTION_PLANS[planType];
  if (!plan.productId) {
    throw new Error(`No product ID configured for ${planType} plan`);
  }

  const baseUrl = import.meta.env.VITE_POLAR_CHECKOUT_URL;
  const params = new URLSearchParams({
    product_id: plan.productId,
    // Pass organization ID in metadata
    'metadata[organization_id]': organizationId,
    'metadata[plan_type]': planType,
  });

  return `${baseUrl}?${params.toString()}`;
}
```

### 6.2 Update component to pass organization ID

In `SubscriptionSettings.tsx`:

```typescript
const handleSelectPlan = (planType: PlanType) => {
  if (!currentOrganization?.id) {
    alert('No organization selected');
    return;
  }

  if (planType === 'enterprise') {
    window.location.href = 'mailto:sales@agritech.com';
    return;
  }

  try {
    // Pass organization ID to checkout
    const checkoutUrl = getCheckoutUrl(planType, currentOrganization.id);
    window.location.href = checkoutUrl;
  } catch (error) {
    console.error('Failed to get checkout URL:', error);
    alert('Failed to start checkout process.');
  }
};
```

---

## ✅ Step 7: Handle Your Paid Subscription Manually (One-Time Fix)

Since you already paid but the webhook didn't work, manually create the subscription:

### 7.1 Get your Polar subscription details

1. Go to https://polar.sh/dashboard
2. Find your subscription under **Subscriptions**
3. Note down:
   - Subscription ID
   - Customer ID
   - Product ID
   - Current period end date

### 7.2 Create subscription manually

Run this in Supabase SQL Editor:

```sql
-- Replace these values with your actual data
INSERT INTO subscriptions (
  organization_id,
  polar_subscription_id,
  polar_customer_id,
  polar_product_id,
  plan_type,
  status,
  current_period_start,
  current_period_end,
  max_farms,
  max_parcels,
  max_users,
  max_satellite_reports,
  has_analytics,
  has_sensor_integration,
  has_ai_recommendations,
  has_advanced_reporting,
  has_api_access,
  has_priority_support
) VALUES (
  'your-org-id-here',           -- Get from: SELECT id FROM organizations WHERE name = 'Your Org Name';
  'sub_xxx',                      -- From Polar dashboard
  'cus_xxx',                      -- From Polar dashboard
  'prod_xxx',                     -- From Polar dashboard
  'professional',                 -- Or 'essential' / 'enterprise'
  'active',
  NOW(),
  NOW() + INTERVAL '30 days',    -- Or the actual end date from Polar
  50,                             -- professional plan limits
  500,
  20,
  100,
  true,
  true,
  true,
  true,
  true,
  true
)
ON CONFLICT (organization_id)
DO UPDATE SET
  polar_subscription_id = EXCLUDED.polar_subscription_id,
  polar_customer_id = EXCLUDED.polar_customer_id,
  polar_product_id = EXCLUDED.polar_product_id,
  plan_type = EXCLUDED.plan_type,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW();

-- Verify it worked
SELECT * FROM subscriptions WHERE organization_id = 'your-org-id-here';
```

---

## ✅ Step 8: Verify Everything Works

### 8.1 Check subscription is active

```sql
SELECT
  o.name as organization,
  s.plan_type,
  s.status,
  s.current_period_end,
  has_valid_subscription(o.id) as is_valid
FROM organizations o
JOIN subscriptions s ON o.id = s.organization_id
WHERE o.id = 'your-org-id';
```

Expected result: `is_valid = true`

### 8.2 Reload your app

The app should now:
- ✅ Show no blocking screen
- ✅ Display your plan in settings
- ✅ Show correct usage limits

### 8.3 Test a new subscription

1. Create a test organization
2. Go to Settings → Subscription
3. Click "Change Plan" → Select a plan
4. Complete checkout in Polar
5. Webhook should automatically create subscription

---

## 🔍 Troubleshooting

### Webhook not receiving events

**Check webhook logs:**
```bash
npx supabase functions logs polar-webhook --tail
```

**Common issues:**
1. ❌ Wrong webhook URL → Check Polar dashboard
2. ❌ Wrong webhook secret → Reset in both Polar and Supabase
3. ❌ Function not deployed → Run `npx supabase functions deploy polar-webhook`

### Webhook receives events but doesn't create subscription

**Check for errors in logs:**
```bash
npx supabase functions logs polar-webhook
```

**Common issues:**
1. ❌ Missing `organization_id` in metadata → Configure checkout to pass it
2. ❌ Missing `plan_type` in metadata → Add to Polar product metadata
3. ❌ RLS policy blocking insert → Webhook uses service role, should bypass RLS

### Subscription created but user still blocked

**Check subscription validity:**
```sql
SELECT
  s.*,
  has_valid_subscription(s.organization_id) as is_valid
FROM subscriptions s
WHERE organization_id = 'your-org-id';
```

**Common issues:**
1. ❌ `status != 'active'` → Update status to 'active'
2. ❌ `current_period_end` in the past → Update to future date
3. ❌ Wrong `organization_id` → Verify it matches your org

---

## 📝 Quick Reference

**Webhook URL:**
```
https://your-project.supabase.co/functions/v1/polar-webhook
```

**Deploy webhook:**
```bash
npx supabase functions deploy polar-webhook
```

**View logs:**
```bash
npx supabase functions logs polar-webhook --tail
```

**Set secret:**
```bash
npx supabase secrets set POLAR_WEBHOOK_SECRET=your-secret
```

**Test webhook from Polar:**
Polar Dashboard → Webhooks → Your webhook → Send Test Event

---

## ✅ Success Checklist

- [ ] Webhook function deployed to Supabase
- [ ] Webhook secret set in Supabase
- [ ] Webhook configured in Polar dashboard with correct URL
- [ ] Webhook secret matches in Polar and Supabase
- [ ] Events subscribed: created, updated, canceled, past_due
- [ ] Product metadata configured with plan_type and limits
- [ ] Checkout flow passes organization_id in metadata
- [ ] Test webhook sent and subscription created in database
- [ ] Manual subscription created for your paid account
- [ ] App shows no blocking screen after subscription

---

That's it! Your Polar webhook should now be working correctly. 🎉
