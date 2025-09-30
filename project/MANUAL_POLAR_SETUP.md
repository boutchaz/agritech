# Manual Polar.sh Setup Guide

The automated script has issues with the Polar API. Here's the simpler manual approach:

## Step 1: Go to Polar.sh Dashboard

Visit: https://polar.sh/dashboard

## Step 2: Create Products Manually

### Product 1: Essential Plan

1. Click **"Products"** → **"Create Product"**
2. Fill in:
   - **Name**: `Essential Plan`
   - **Description**: `Perfect for small commercial farms digitizing their operations. Includes core tools for farm management, employee tracking, and basic inventory management.`
   - **Type**: Recurring
   - **Recurring Interval**: Monthly

3. Click **"Create"**

4. After creation, click on the product
5. Click **"Add Price"**:
   - **Price**: `$25.00`
   - **Currency**: USD
   - **Interval**: month

6. Go to **"Metadata"** tab
7. Add metadata (JSON):
   ```json
   {
     "plan_type": "essential",
     "max_farms": "2",
     "max_parcels": "25",
     "max_users": "5",
     "has_analytics": "false"
   }
   ```
8. Save

---

### Product 2: Professional Plan

1. Click **"Products"** → **"Create Product"**
2. Fill in:
   - **Name**: `Professional Plan`
   - **Description**: `For data-driven farms leveraging analytics and precision agriculture. Includes everything in Essential plus satellite analysis, sensor integration, and AI-powered recommendations.`
   - **Type**: Recurring
   - **Recurring Interval**: Monthly
   - **Highlighted**: ✅ Yes (mark as most popular)

3. Click **"Create"**

4. Add Price:
   - **Price**: `$75.00`
   - **Currency**: USD
   - **Interval**: month

5. Add Metadata:
   ```json
   {
     "plan_type": "professional",
     "max_farms": "10",
     "max_parcels": "200",
     "max_users": "25",
     "max_satellite_reports": "10",
     "has_analytics": "true",
     "has_sensor_integration": "true",
     "has_ai_recommendations": "true"
   }
   ```
6. Save

---

### Product 3: Agri-Business Plan

1. Click **"Products"** → **"Create Product"**
2. Fill in:
   - **Name**: `Agri-Business Plan`
   - **Description**: `For large enterprises with complex agricultural operations. Unlimited everything, full financial suite, predictive analytics, API access, and priority support.`
   - **Type**: Custom / Contact Sales
   - **Price**: Leave empty or set "Contact Us"

3. Add Metadata:
   ```json
   {
     "plan_type": "enterprise",
     "max_farms": "unlimited",
     "max_parcels": "unlimited",
     "max_users": "unlimited",
     "has_analytics": "true",
     "has_api_access": "true",
     "contact_sales": "true"
   }
   ```
4. Save

---

## Step 3: Get Product IDs

After creating all products:

1. Go to each product
2. Copy the Product ID (looks like: `prod_xxxxxxxxxxxxx`)
3. Note them down:
   - Essential Plan ID: `prod_xxx...`
   - Professional Plan ID: `prod_xxx...`
   - Enterprise Plan ID: `prod_xxx...`

---

## Step 4: Update Your .env (Already Done)

Your `.env` should have:
```
VITE_POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
VITE_POLAR_ORGANIZATION_ID=ab0b4a8a-e641-452c-b79a-c3e245b5093a
```

---

## Step 5: Test Subscription Page

1. Make sure database migration is applied (see TESTING_SUBSCRIPTION.md)
2. Visit: `http://localhost:5173/settings/subscription`
3. You should see all three plans displayed

---

## Step 6: Setup Webhook (Optional for now)

Follow `WEBHOOK_SETUP.md` to configure webhooks when you're ready to test real subscriptions.

---

## Verification Checklist

✅ Three products created in Polar.sh
✅ Each product has correct pricing
✅ Metadata `plan_type` is set for each
✅ Essential & Professional have fixed monthly prices
✅ Enterprise is contact sales
✅ Professional is marked as "highlighted"

---

## Next Steps

1. Test the subscription page with the products
2. Apply database migration (create subscriptions table)
3. Create test subscription in database
4. Test feature gating
5. Setup webhooks for production

---

That's it! Much easier than fighting with the API 😊

Once you have the products created, you can test everything locally without needing webhooks initially.
