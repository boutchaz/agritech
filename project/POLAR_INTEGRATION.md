# Polar.sh Integration Guide

This document explains how to complete the Polar.sh integration for the AgriTech application.

## Overview

The application now supports three subscription tiers:
- **Essential Plan**: $25/month - For small commercial farms
- **Professional Plan**: $75/month - For data-driven precision agriculture
- **Agri-Business Plan**: Contact Sales - For large enterprises

## Setup Instructions

### 1. Create a Polar.sh Account

1. Go to [polar.sh](https://polar.sh) and create an account
2. Create your organization
3. Note your Organization ID from the dashboard

### 2. Create Products in Polar.sh

Create three products:

**Essential Plan**
- Name: "Essential Plan"
- Price: $25/month
- Add metadata: `plan_type: essential`

**Professional Plan**
- Name: "Professional Plan"
- Price: $75/month
- Add metadata: `plan_type: professional`

**Agri-Business Plan** (optional, contact-based)
- Name: "Agri-Business Plan"
- Custom pricing
- Add metadata: `plan_type: enterprise`

### 3. Configure Environment Variables

Update your `.env` file:

```bash
VITE_POLAR_ACCESS_TOKEN=polar_at_xxx
VITE_POLAR_ORGANIZATION_ID=your-org-id
POLAR_WEBHOOK_SECRET=whsec_xxx
```

To get your access token:
1. Go to Polar.sh Dashboard → Settings → API Keys
2. Create a new API key with subscription management permissions

### 4. Deploy Webhook Handler

The webhook handler is located at `/supabase/functions/polar-webhook/index.ts`

Deploy it:
```bash
npx supabase functions deploy polar-webhook --no-verify-jwt
```

Get your webhook URL:
```
https://your-project.supabase.co/functions/v1/polar-webhook
```

### 5. Configure Polar.sh Webhook

In your Polar.sh dashboard:
1. Go to Settings → Webhooks
2. Add a new webhook endpoint
3. Use the URL from step 4
4. Select events to listen to:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
   - `subscription.past_due`
5. Copy the webhook secret and add it to your `.env` as `POLAR_WEBHOOK_SECRET`

### 6. Apply Database Migration

Run the migration to create subscription tables:

```bash
npx supabase db push
```

Or apply manually:
```sql
-- Run the SQL in: supabase/migrations/20250930160000_create_subscriptions.sql
```

## Features Implemented

### 1. Subscription Management UI

- **Subscription Plans Page**: `/settings/subscription`
- **Plan Comparison**: Visual comparison of all three plans
- **Usage Dashboard**: Real-time usage tracking for farms, parcels, users, and satellite reports

### 2. Feature Gating

Use the `<FeatureGate>` component to restrict features:

```tsx
import FeatureGate from '../components/FeatureGate';

<FeatureGate feature="analytics">
  <AdvancedAnalytics />
</FeatureGate>
```

Available features:
- `analytics` - Professional & Enterprise
- `sensorIntegration` - Professional & Enterprise
- `aiRecommendations` - Professional & Enterprise
- `advancedReporting` - Professional & Enterprise
- `apiAccess` - Enterprise only
- `prioritySupport` - Enterprise only

### 3. Usage Limit Warnings

Display warnings when approaching limits:

```tsx
import UsageLimitWarning from '../components/UsageLimitWarning';

<UsageLimitWarning limitType="parcels" />
```

### 4. Subscription Banner

Automatically displays trial, past_due, or cancellation notices at the top of the dashboard.

### 5. Database Schema

**subscriptions table**:
- Stores subscription details, plan type, status
- Tracks usage limits and feature flags
- Syncs with Polar.sh via webhooks

**subscription_usage table**:
- Tracks current usage against limits
- Resets each billing period
- Used for displaying usage bars and warnings

## Plan Limits & Features

### Essential Plan ($25/month)
- 2 Farms, 25 Parcels, 5 Users
- Core management tools
- Manual soil analysis
- Weather forecast
- No advanced analytics

### Professional Plan ($75/month)
- 10 Farms, 200 Parcels, 25 Users
- Everything in Essential
- 10 Satellite reports/month
- Sensor integration
- AI recommendations
- Advanced reporting

### Enterprise Plan (Contact Sales)
- Unlimited farms, parcels, users
- Everything in Professional
- Unlimited satellite reports
- API access
- Priority support
- Custom onboarding

## Testing

### Test Webhooks Locally

1. Use Polar.sh test mode
2. Trigger test webhook events from dashboard
3. Monitor Supabase Edge Function logs:
   ```bash
   npx supabase functions logs polar-webhook
   ```

### Test Subscription Flow

1. Create a test subscription in Polar.sh
2. Add `organization_id` to subscription metadata
3. Verify subscription appears in database
4. Check feature gates work correctly
5. Test usage limit warnings

## Usage Tracking

To update usage counts, create a background job or trigger:

```sql
-- Example: Update farms count when a farm is created
CREATE OR REPLACE FUNCTION update_farms_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE subscription_usage
  SET farms_count = (
    SELECT COUNT(*) FROM farms WHERE organization_id = NEW.organization_id
  )
  WHERE organization_id = NEW.organization_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_farm_created
AFTER INSERT ON farms
FOR EACH ROW
EXECUTE FUNCTION update_farms_usage();
```

## Security Notes

1. **Webhook Verification**: Always verify webhook signatures in production
2. **Service Role Key**: Keep `SUPABASE_SERVICE_ROLE_KEY` secret
3. **API Keys**: Rotate Polar.sh API keys regularly
4. **RLS Policies**: Users can only view their organization's subscription

## Support

For issues or questions:
- Polar.sh docs: https://docs.polar.sh
- Supabase docs: https://supabase.com/docs
- Project issues: Create an issue in the repository

## Next Steps

1. [ ] Create Polar.sh account and products
2. [ ] Deploy webhook handler
3. [ ] Configure environment variables
4. [ ] Apply database migration
5. [ ] Test subscription flow
6. [ ] Implement usage tracking triggers
7. [ ] Add upgrade CTAs throughout the app
8. [ ] Set up analytics to track conversions
