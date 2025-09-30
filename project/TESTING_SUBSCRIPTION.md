# Testing Subscription Page - Step by Step Guide

## Prerequisites Checklist

Before testing, make sure you have:
- ✅ Edge function deployed
- ✅ Webhook secret set
- ✅ `.env` updated with Polar credentials
- ✅ Dev server running (`npm run dev`)
- ⚠️ Database migration applied

## Step 1: Apply Database Migration (If Not Done)

### Check if tables exist:

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor** in the sidebar
4. Look for these tables:
   - `subscriptions`
   - `subscription_usage`

### If tables DON'T exist, create them:

**Option A - Using Supabase Dashboard (Easiest)**:
1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"+ New query"**
3. Open the file: `/Users/boutchaz/Documents/CodeLovers/agritech/project/supabase/migrations/20250930160000_create_subscriptions.sql`
4. Copy ALL the content
5. Paste into SQL Editor
6. Click **"Run"** (bottom right)
7. Wait for "Success. No rows returned" message

**Option B - Using CLI (if Docker is running)**:
```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project
npx supabase db reset
```

## Step 2: Verify Your Organization Has a Subscription

After creating the tables, a trigger automatically creates a trial subscription for your organization.

### Check in Supabase:

1. Go to **Table Editor** → `subscriptions` table
2. You should see a row with:
   - `plan_type`: `essential`
   - `status`: `trialing`
   - `organization_id`: (your org UUID)
   - `current_period_end`: 14 days from now

### If NO subscription exists, create one manually:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this query (replace `YOUR_ORG_ID` with your actual organization UUID):

```sql
-- First, find your organization ID
SELECT id, name FROM organizations;

-- Then insert a trial subscription (use the ID from above)
INSERT INTO subscriptions (
  organization_id,
  plan_type,
  status,
  max_farms,
  max_parcels,
  max_users,
  max_satellite_reports,
  has_analytics,
  has_sensor_integration,
  has_ai_recommendations,
  has_advanced_reporting,
  has_api_access,
  has_priority_support,
  current_period_start,
  current_period_end
) VALUES (
  'YOUR_ORG_ID_HERE',  -- Replace with your organization ID
  'essential',
  'trialing',
  2,
  25,
  5,
  0,
  false,
  false,
  false,
  false,
  false,
  false,
  NOW(),
  NOW() + INTERVAL '14 days'
);

-- Create initial usage tracking
INSERT INTO subscription_usage (
  subscription_id,
  organization_id,
  farms_count,
  parcels_count,
  users_count,
  satellite_reports_count,
  period_start,
  period_end
)
SELECT
  s.id,
  s.organization_id,
  0,
  0,
  1,
  0,
  s.current_period_start,
  s.current_period_end
FROM subscriptions s
WHERE s.organization_id = 'YOUR_ORG_ID_HERE';  -- Replace with your organization ID
```

## Step 3: Test the Subscription Page

### Navigate to the page:

Open your browser and go to:
```
http://localhost:5173/settings/subscription
```

### What you should see:

1. **Top Section - Current Plan Card**:
   - Plan name: "Essential Plan"
   - Price: "$25/month"
   - Status: "trialing"
   - Renewal date: ~14 days from now

2. **Usage & Limits Card**:
   - Farms: 0 / 2
   - Parcels: 0 / 25
   - Users: 1 / 5
   - Progress bars showing usage

3. **Your Features Section**:
   - List of all Essential plan features
   - ✓ Dashboard & Parcel Management
   - ✓ Employee Management
   - ✓ Stock Management
   - etc.

4. **Billing Management Section**:
   - Link to open Polar.sh billing portal

5. **"Change Plan" Button** (top right):
   - Click to see all available plans

## Step 4: Test Plan Comparison

1. Click **"Change Plan"** button
2. You should see 3 plan cards:
   - **Essential Plan** ($25/month) - marked as "Current Plan"
   - **Professional Plan** ($75/month) - marked as "Most Popular"
   - **Agri-Business Plan** (Contact Us)

3. Each card shows:
   - Plan name and description
   - Price
   - Feature list with checkmarks
   - "Get Started" or "Current Plan" button

## Step 5: Test Trial Banner

1. Go back to dashboard: `http://localhost:5173/dashboard`
2. You should see a **blue banner** at the top:
   - Icon: Lightning bolt
   - Message: "You're on a trial period. X days remaining."
   - Button: "Upgrade Now"

3. Click "Upgrade Now" → should redirect to `/settings/subscription`

## Step 6: Test Feature Gating (Optional)

To test if features are properly gated, you can try accessing advanced features:

### Example: Test Analytics Gate

Create a test component with feature gate:

```tsx
import FeatureGate from '../components/FeatureGate';

<FeatureGate feature="analytics">
  <div>This is only visible for Professional+ plans</div>
</FeatureGate>
```

Since you're on Essential (trial), you should see a lock icon with "Upgrade Now" button instead.

## Step 7: Test Plan Upgrade Simulation

To test upgrading a plan:

1. Go to Supabase → **Table Editor** → `subscriptions`
2. Find your subscription row
3. Edit the `plan_type` column:
   - Change from `essential` to `professional`
4. Edit the `status` column:
   - Change from `trialing` to `active`
5. Save changes

6. Go back to your app and refresh: `http://localhost:5173/settings/subscription`

You should now see:
- **Current Plan**: "Professional Plan"
- **Price**: "$75/month"
- **New Limits**:
  - Farms: 0 / 10
  - Parcels: 0 / 200
  - Users: 1 / 25
  - Satellite Reports: 0 / 10 (NEW!)
- **Status**: "active"
- **More features** listed

## Step 8: Test Usage Warnings

To test usage limit warnings:

1. Go to Supabase → **SQL Editor**
2. Update usage to be near limit:

```sql
-- Update usage to 90% of limit (for Essential plan: 2 farms)
UPDATE subscription_usage
SET
  farms_count = 2,
  parcels_count = 22,
  users_count = 4
WHERE organization_id = 'YOUR_ORG_ID_HERE';
```

3. Refresh subscription page
4. You should see **yellow warning bars** for usage near limits

5. To test at-limit warning:

```sql
-- Update usage to 100% of limit
UPDATE subscription_usage
SET
  farms_count = 2,
  parcels_count = 25,
  users_count = 5
WHERE organization_id = 'YOUR_ORG_ID_HERE';
```

6. Refresh - you should see **red warning bars** indicating limits reached

## Troubleshooting

### "Loading..." never finishes

**Problem**: Subscription query failing

**Check**:
1. Open browser console (F12)
2. Look for errors
3. Check Network tab for failed requests

**Solutions**:
- Verify tables exist in Supabase
- Check RLS policies are enabled
- Verify user is authenticated
- Check organization_id is set

### "No subscription found"

**Problem**: No subscription record in database

**Solution**:
- Run the SQL in Step 2 to create a subscription manually
- Make sure to use YOUR actual organization_id

### Subscription page shows but with wrong data

**Problem**: Wrong organization_id or multiple subscriptions

**Check**:
```sql
-- See all subscriptions
SELECT * FROM subscriptions;

-- See current usage
SELECT * FROM subscription_usage;
```

**Solution**:
- Delete duplicate subscriptions
- Update organization_id to match your current org

### Trial banner not showing

**Problem**: Status is not 'trialing' or date is in the past

**Solution**:
```sql
UPDATE subscriptions
SET
  status = 'trialing',
  current_period_end = NOW() + INTERVAL '14 days'
WHERE organization_id = 'YOUR_ORG_ID_HERE';
```

## Console Commands for Quick Testing

### Check current subscription:
```sql
SELECT
  s.plan_type,
  s.status,
  s.current_period_end,
  s.max_farms,
  s.max_parcels
FROM subscriptions s
JOIN organization_users ou ON s.organization_id = ou.organization_id
WHERE ou.user_id = auth.uid();
```

### Reset to trial:
```sql
UPDATE subscriptions
SET
  plan_type = 'essential',
  status = 'trialing',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '14 days'
WHERE organization_id = (
  SELECT organization_id
  FROM organization_users
  WHERE user_id = auth.uid()
  LIMIT 1
);
```

### Upgrade to Professional:
```sql
UPDATE subscriptions
SET
  plan_type = 'professional',
  status = 'active'
WHERE organization_id = (
  SELECT organization_id
  FROM organization_users
  WHERE user_id = auth.uid()
  LIMIT 1
);
```

## Success Criteria

✅ Subscription page loads without errors
✅ Current plan displays correctly
✅ Usage bars show with correct limits
✅ Features list matches the plan
✅ Trial banner appears (if on trial)
✅ "Change Plan" shows all 3 plans
✅ Feature gates block unpaid features
✅ Usage warnings appear when near limits

## Next Steps After Testing

Once everything works:

1. Configure actual Polar.sh products
2. Test real checkout flow
3. Test webhook with real subscription events
4. Monitor production subscriptions
5. Add upgrade CTAs throughout app

---

**Need Help?**
- Check browser console for errors
- Check Supabase logs for function errors
- Review WEBHOOK_SETUP.md for configuration issues
