# Polar.sh Webhook Setup Guide

## Step 1: Deploy the Webhook Handler to Supabase

### Option A: Using Supabase CLI (Recommended)

1. **Start Docker Desktop** (required for Supabase CLI)

2. **Deploy the webhook function**:
   ```bash
   cd /Users/boutchaz/Documents/CodeLovers/agritech/project
   npx supabase functions deploy polar-webhook --no-verify-jwt
   ```

3. **Get your webhook URL**:
   After deployment, you'll see output like:
   ```
   Deployed Function polar-webhook
   URL: https://xxxxx.supabase.co/functions/v1/polar-webhook
   ```

   Copy this URL - you'll need it for Polar.sh configuration.

4. **Set environment secrets** for the edge function:
   ```bash
   npx supabase secrets set POLAR_WEBHOOK_SECRET=your_webhook_secret_from_polar
   ```

### Option B: Using Supabase Dashboard (Alternative)

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the sidebar
3. Click **"Create a new function"**
4. Name it: `polar-webhook`
5. Copy the content from `supabase/functions/polar-webhook/index.ts`
6. Click **Deploy**
7. Copy the function URL

---

## Step 2: Configure Polar.sh Organization

### 2.1 Create Polar.sh Account

1. Go to [https://polar.sh](https://polar.sh)
2. Sign up and create your organization
3. Complete your organization profile

### 2.2 Create Products

Create three products in Polar.sh dashboard:

#### **Product 1: Essential Plan**
- **Name**: Essential Plan
- **Description**: Perfect for small commercial farms digitizing their operations
- **Price**: $25.00 USD / month
- **Billing Period**: Monthly
- **Metadata** (Important!):
  ```json
  {
    "plan_type": "essential"
  }
  ```

#### **Product 2: Professional Plan**
- **Name**: Professional Plan
- **Description**: For data-driven farms leveraging analytics and precision agriculture
- **Price**: $75.00 USD / month
- **Billing Period**: Monthly
- **Metadata** (Important!):
  ```json
  {
    "plan_type": "professional"
  }
  ```

#### **Product 3: Agri-Business Plan**
- **Name**: Agri-Business Plan
- **Description**: For large enterprises with complex agricultural operations
- **Price**: Custom (Contact Sales)
- **Metadata** (Important!):
  ```json
  {
    "plan_type": "enterprise"
  }
  ```

### 2.3 Note Your Organization ID

1. In Polar.sh dashboard, go to **Settings** → **Organization**
2. Copy your **Organization ID** (looks like: `org_xxxxxxxxxxxxx`)
3. Add it to your `.env` file:
   ```
   VITE_POLAR_ORGANIZATION_ID=org_xxxxxxxxxxxxx
   ```

---

## Step 3: Create API Access Token

1. In Polar.sh dashboard, go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name it: `AgriTech Backend`
4. Select permissions:
   - ✅ Read subscriptions
   - ✅ Write subscriptions
   - ✅ Read customers
5. Click **Create**
6. Copy the token (starts with `polar_at_`)
7. Add it to your `.env` file:
   ```
   VITE_POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
   ```

---

## Step 4: Configure Webhook in Polar.sh

1. In Polar.sh dashboard, go to **Settings** → **Webhooks**
2. Click **"Add Endpoint"**
3. Enter your webhook URL from Step 1:
   ```
   https://xxxxx.supabase.co/functions/v1/polar-webhook
   ```

4. **Select Events to Listen**:
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.canceled`
   - ✅ `subscription.past_due`
   - ✅ `subscription.active` (if available)

5. Click **"Create Endpoint"**

6. **Copy the Webhook Secret**:
   - After creating, you'll see a signing secret (starts with `whsec_`)
   - Copy this secret
   - Add it to your Supabase Edge Function secrets:
     ```bash
     npx supabase secrets set POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
     ```

   Or add it manually in Supabase Dashboard:
   - Go to **Edge Functions** → **polar-webhook** → **Settings**
   - Add secret: `POLAR_WEBHOOK_SECRET` = `whsec_xxxxxxxxxxxxx`

---

## Step 5: Update Environment Variables

Update your `.env` file with all the values:

```env
# Supabase (already configured)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Polar.sh Configuration
VITE_POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
VITE_POLAR_ORGANIZATION_ID=org_xxxxxxxxxxxxx
POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Important**: Restart your development server after updating `.env`:
```bash
npm run dev
```

---

## Step 6: Apply Database Migration

The subscription tables need to be created in your database.

### If Docker is Running:
```bash
npx supabase db reset
```

### If Docker is NOT Running (Manual Method):

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **"New Query"**
3. Copy the entire content from:
   ```
   /supabase/migrations/20250930160000_create_subscriptions.sql
   ```
4. Paste it into the SQL editor
5. Click **"Run"**

This creates:
- `subscriptions` table
- `subscription_usage` table
- Triggers and functions
- RLS policies

---

## Step 7: Test the Integration

### 7.1 Test Webhook Delivery

1. In Polar.sh dashboard, go to **Settings** → **Webhooks**
2. Click on your webhook endpoint
3. Click **"Send test event"**
4. Select `subscription.created`
5. Check if it shows "200 OK" response

### 7.2 Monitor Webhook Logs

```bash
# Watch logs in real-time
npx supabase functions logs polar-webhook --follow
```

Or in Supabase Dashboard:
- Go to **Edge Functions** → **polar-webhook** → **Logs**

### 7.3 Test Subscription Flow

1. **Create a test subscription** in Polar.sh:
   - Use test mode/sandbox if available
   - Create a subscription for Essential Plan
   - In the subscription metadata, add:
     ```json
     {
       "organization_id": "your-org-uuid-from-database"
     }
     ```

2. **Verify in Database**:
   - Go to Supabase → **Table Editor** → `subscriptions`
   - You should see the subscription with:
     - `plan_type`: `essential`
     - `status`: `active`
     - `polar_subscription_id`: filled in
     - Correct limits (2 farms, 25 parcels, 5 users)

3. **Test in Application**:
   - Navigate to `/settings/subscription` in your app
   - You should see the subscription details
   - Usage bars should display
   - Feature gates should work

---

## Step 8: Configure Checkout Flow

### Update Checkout Links

In your app, when users click "Upgrade", they should be redirected to Polar.sh checkout:

The checkout URL format:
```
https://polar.sh/checkout/{organization_id}/{product_id}?metadata[organization_id]={supabase_org_id}
```

**Important**: Always pass the organization_id in metadata so the webhook can link the subscription to the correct organization.

Example implementation is already in:
- `src/components/SubscriptionSettings.tsx`
- `src/components/SubscriptionPlans.tsx`

---

## Troubleshooting

### Webhook Returns 401 Unauthorized

**Problem**: Missing or invalid webhook secret

**Solution**:
```bash
# Set the secret in Supabase
npx supabase secrets set POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Redeploy the function
npx supabase functions deploy polar-webhook --no-verify-jwt
```

### Webhook Returns 500 Error

**Problem**: Database connection or missing tables

**Solution**:
1. Check Supabase logs: `npx supabase functions logs polar-webhook`
2. Verify tables exist: Check Supabase Dashboard → Table Editor
3. Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Edge Function secrets

### Subscription Not Appearing in App

**Problem**: Missing `organization_id` in metadata

**Solution**:
1. In Polar.sh, edit the subscription
2. Add to metadata:
   ```json
   {
     "organization_id": "uuid-from-your-database"
   }
   ```
3. Trigger webhook again or wait for next event

### Feature Gates Not Working

**Problem**: Subscription not loaded or plan_type mismatch

**Solution**:
1. Check browser console for errors
2. Verify subscription in database has correct `plan_type`
3. Clear browser cache and reload
4. Check React Query devtools to see if subscription is cached

---

## Security Checklist

Before going to production:

- [ ] Webhook signature verification is enabled
- [ ] `POLAR_WEBHOOK_SECRET` is set in Supabase secrets
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never exposed to frontend
- [ ] API keys are stored in environment variables
- [ ] Webhook endpoint is using HTTPS
- [ ] RLS policies are enabled on subscription tables
- [ ] Test mode subscriptions are cleaned up

---

## Support Resources

- **Polar.sh Documentation**: https://docs.polar.sh
- **Polar.sh Webhooks**: https://docs.polar.sh/webhooks
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Supabase Secrets**: https://supabase.com/docs/guides/functions/secrets

---

## Quick Reference Commands

```bash
# Deploy webhook
npx supabase functions deploy polar-webhook --no-verify-jwt

# Set secrets
npx supabase secrets set POLAR_WEBHOOK_SECRET=whsec_xxx

# View logs
npx supabase functions logs polar-webhook --follow

# Apply migrations
npx supabase db reset

# Restart dev server
npm run dev
```

---

## Next Steps After Setup

1. Test trial flow (14-day trial is automatic for new orgs)
2. Test upgrade from Essential → Professional
3. Test downgrade flows
4. Set up usage tracking triggers (see POLAR_INTEGRATION.md)
5. Add upgrade CTAs throughout the app
6. Monitor conversion metrics in Polar.sh dashboard
