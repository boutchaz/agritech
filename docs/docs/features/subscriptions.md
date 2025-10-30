# Subscriptions and Feature Gating

## Overview

The AgriTech Platform uses Polar.sh for subscription management, providing a tiered pricing model with feature gating and usage limits. This ensures sustainable business operations while offering flexible options for farms of all sizes, from small family operations to large commercial enterprises.

## Key Features

### Subscription Plans

Four tiers designed for different farm sizes and needs:

#### Free Plan

Perfect for trying out the platform:

- **Price:** $0/month
- **Features:**
  - 1 farm
  - 5 parcels
  - 2 users
  - 10 satellite reports/month
  - Basic task management
  - Basic inventory tracking
  - Community support

#### Basic Plan

For small to medium farms:

- **Price:** $29/month or $290/year (save 17%)
- **Features:**
  - 3 farms
  - 25 parcels
  - 5 users
  - 50 satellite reports/month
  - Full task management
  - Inventory management with purchase tracking
  - Email support
  - Export reports to PDF/Excel

#### Pro Plan

For established commercial farms:

- **Price:** $99/month or $990/year (save 17%)
- **Features:**
  - 10 farms
  - 100 parcels
  - 20 users
  - 200 satellite reports/month
  - Advanced analytics and dashboards
  - Accounting module access
  - Cost center tracking
  - Multi-currency support
  - API access (future)
  - Priority support
  - Custom branding (future)

#### Enterprise Plan

For large agricultural operations:

- **Price:** Custom pricing
- **Features:**
  - Unlimited farms
  - Unlimited parcels
  - Unlimited users
  - Unlimited satellite reports
  - All Pro features
  - Dedicated account manager
  - Custom integrations
  - On-premise deployment option (future)
  - SLA guarantee
  - 24/7 phone support
  - Custom training

### Feature Gating

Access control based on subscription level:

#### Feature Flags

Boolean features enabled/disabled by plan:

- `has_analytics` - Advanced analytics and dashboards (Pro+)
- `has_accounting` - Full accounting module (Pro+)
- `has_sensor_integration` - IoT sensor integration (Pro+, future)
- `has_api_access` - REST API access (Pro+, future)
- `has_advanced_reporting` - Custom report builder (Pro+, future)
- `has_multi_currency` - Multiple currency support (Pro+)
- `has_custom_branding` - White-label options (Enterprise, future)
- `has_priority_support` - Priority customer support (Pro+)

#### Usage Limits

Quantitative limits enforced by plan:

- `max_farms` - Maximum number of farms
- `max_parcels` - Maximum number of parcels
- `max_users` - Maximum team members
- `max_satellite_reports` - Monthly satellite analysis quota
- `max_storage_gb` - Document storage limit (future)
- `max_api_calls` - API request limit per month (future)

### Limit Enforcement

Multi-layer enforcement system:

#### 1. CASL Ability System

Frontend permission checks:

```typescript
// Defined in src/lib/casl/defineAbilityFor.ts
const ability = defineAbilityFor(user, subscription);

// Example: Check if can create farm
if (ability.can('create', 'Farm')) {
  // Check usage limit
  if (currentFarmCount < subscription.max_farms) {
    // Allow creation
  } else {
    // Show upgrade prompt
  }
}
```

#### 2. Component Guards

UI components that check permissions:

```typescript
// Feature gate component
<FeatureGate feature="analytics">
  <AdvancedAnalyticsDashboard />
</FeatureGate>

// Limit warning component
<LimitWarning resource="farms" current={5} max={3}>
  <CreateFarmButton />
</LimitWarning>

// Permission check component
<Can I="create" a="Farm">
  <CreateFarmButton />
</Can>
```

#### 3. Backend Validation

Database-level checks via RLS policies and triggers:

- RLS policies check user's subscription before queries
- Database functions validate limits before inserts
- API endpoints verify subscription status
- Webhook handlers update subscription data

### Subscription Management

Complete subscription lifecycle:

#### Trial Flow

New users get trial period:

1. User signs up → Free plan automatically assigned
2. 14-day trial of Pro features
3. Trial expiration warning at 7 days, 3 days, 1 day
4. Trial ends → Downgrade to Free or prompt to upgrade
5. Data preserved, just features restricted

#### Upgrade/Downgrade Flow

Change subscription level:

1. User clicks "Upgrade" or "Change Plan"
2. Redirected to Polar.sh checkout
3. Selects new plan and payment method
4. Completes payment
5. Webhook received → Subscription updated in database
6. User redirected to success page
7. New limits immediately enforced
8. Confirmation email sent

#### Payment Handling

Polar.sh integration:

- **Checkout** - Hosted checkout page by Polar.sh
- **Payment Methods** - Credit card, PayPal, bank transfer
- **Invoicing** - Automatic invoice generation
- **Receipts** - Email receipts for all payments
- **Failed Payments** - Automatic retry and notification
- **Refunds** - Handled through Polar.sh dashboard

#### Subscription Status

Possible states:

- `active` - Subscription paid and current
- `trialing` - In trial period
- `past_due` - Payment failed, grace period
- `canceled` - Canceled, active until period end
- `unpaid` - Payment failed, access restricted
- `paused` - Temporarily paused (future)

### Limit Warnings

Proactive user notifications:

#### Usage Approaching Limit

When user reaches 80% of limit:

- Warning badge appears in UI
- Dashboard notification
- Email notification (optional)
- Suggestion to upgrade plan

#### Usage at Limit

When user reaches 100% of limit:

- Cannot create new resources
- Modal explaining limit reached
- Clear upgrade call-to-action
- Contact support option

#### Soft vs Hard Limits

- **Soft Limits** - Warning shown, can slightly exceed with notice
- **Hard Limits** - Strict enforcement, cannot exceed
- Most limits are hard limits for consistency

## User Interface

### Subscription Settings (`/settings/subscription`)

Comprehensive subscription management:

1. **Current Plan Card**
   - Plan name and tier
   - Monthly/annual pricing
   - Billing cycle (next billing date)
   - Payment method on file
   - Subscription status indicator

2. **Plan Features**
   - Checkmark list of included features
   - Usage statistics:
     ```
     Farms: 2 / 3
     Parcels: 18 / 25
     Users: 3 / 5
     Satellite Reports (this month): 12 / 50
     ```
   - Progress bars for visual indication

3. **Plan Comparison Table**
   - Side-by-side comparison of all plans
   - Highlight current plan
   - Feature availability checkmarks
   - "Upgrade" or "Downgrade" buttons

4. **Billing History**
   - List of past invoices
   - Date, amount, status
   - Download invoice (PDF)
   - Payment method used

5. **Actions**
   - Change plan button
   - Update payment method
   - Cancel subscription
   - Contact support

### Trial Banner

For users in trial period:

```
🎉 You're on a Pro trial! 7 days remaining.
Upgrade now to keep all features. [Upgrade] [Dismiss]
```

### Limit Warning Modal

When limit reached:

```
⚠️ Farm Limit Reached

You've reached your plan's limit of 3 farms.

Current plan: Basic ($29/month)
Farms: 3 / 3

To add more farms, upgrade to:
→ Pro Plan: 10 farms for $99/month
→ Enterprise: Unlimited farms

[Upgrade Now] [View Plans] [Contact Support]
```

### Upgrade Prompts

Strategic upgrade suggestions:

1. **Contextual Prompts**
   - When viewing analytics: "Unlock advanced analytics with Pro"
   - When exporting: "Export to Excel with Basic plan or higher"
   - When adding 6th user: "Add unlimited team members with Enterprise"

2. **Value-based Messaging**
   - Emphasize benefits, not just features
   - Show cost per farm/parcel
   - Highlight ROI (e.g., "Save $X with better crop planning")

### Checkout Success Page (`/checkout-success`)

After successful payment:

```
✅ Subscription Activated!

Welcome to the Pro Plan!

What's New:
✓ 10 farms (was 3)
✓ 100 parcels (was 25)
✓ 20 users (was 5)
✓ 200 satellite reports/month (was 50)
✓ Advanced analytics
✓ Full accounting module
✓ Priority support

Your first payment of $99 has been processed.
Next billing date: November 25, 2025

[Go to Dashboard] [View Receipt]
```

## Usage Guide

### Starting a Trial

New user trial activation:

1. User signs up at `/register`
2. Completes onboarding at `/onboarding`
3. System automatically:
   - Creates Free plan subscription
   - Activates 14-day Pro trial
   - Sets trial expiration date
   - Records trial start in database
4. User has full Pro access for 14 days
5. Trial banner shows remaining days

### Upgrading Subscription

To upgrade from Free to Basic:

1. Navigate to `/settings/subscription`
2. Click "Upgrade" button on Basic plan card
3. Redirected to Polar.sh checkout:
   - URL includes organization ID in metadata
   - Polar.sh checkout page loads
4. Select billing cycle (monthly or annual)
5. Enter payment information
6. Click "Subscribe"
7. Polar.sh processes payment
8. Sends webhook to platform
9. Platform webhook handler:
   - Updates subscription in database
   - Sets new limits
   - Records payment
10. User redirected to `/checkout-success`
11. New limits immediately active

### Downgrading Subscription

To downgrade from Pro to Basic:

1. Navigate to `/settings/subscription`
2. Click "Change Plan"
3. Select Basic plan
4. Confirm downgrade:
   - Warning about losing features
   - Data will be preserved
   - Downgrade effective at period end
5. Polar.sh processes change
6. Webhook updates database
7. User continues on Pro until period ends
8. At period end:
   - Subscription changes to Basic
   - Features restricted
   - Limits enforced
   - If over new limits, must reduce before creating more

### Handling Limit Reached

When trying to create 4th farm on Basic plan:

1. User clicks "Create Farm"
2. System checks:
   - Current farms: 3
   - Max farms: 3
   - Limit reached!
3. System shows limit warning modal
4. User options:
   - Upgrade to Pro (10 farms)
   - Delete unused farm
   - Contact support for help
5. If user clicks "Upgrade":
   - Redirected to subscription settings
   - Can select Pro plan
   - After upgrade, farm creation allowed

### Canceling Subscription

To cancel paid subscription:

1. Navigate to `/settings/subscription`
2. Click "Cancel Subscription"
3. Confirmation dialog:
   ```
   Cancel Subscription?

   Your Pro subscription will be canceled.

   What happens:
   • Billing stops immediately
   • You keep Pro access until Nov 25, 2024
   • After that, downgraded to Free plan
   • All data is preserved
   • You can re-subscribe anytime

   Reason for canceling? [Optional feedback]

   [Keep Subscription] [Yes, Cancel]
   ```
4. If confirmed:
   - Polar.sh cancellation request
   - Webhook updates database
   - Status changes to `canceled`
   - Access continues until period end
5. Confirmation email sent

### Re-activating After Cancellation

To resume subscription:

1. Navigate to `/settings/subscription`
2. Shows "Subscription Canceled" status
3. "Reactivate" button available
4. Click "Reactivate"
5. Redirected to Polar.sh checkout
6. Same plan automatically selected
7. Complete payment
8. Subscription immediately active
9. Full access restored

## API Integration

### Database Schema

**Subscriptions Table:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

  -- Polar.sh Integration
  polar_subscription_id TEXT UNIQUE,
  polar_product_id TEXT,
  polar_customer_id TEXT,

  -- Plan Details
  plan_name TEXT NOT NULL, -- free, basic, pro, enterprise
  plan_tier INTEGER NOT NULL, -- 1=Free, 2=Basic, 3=Pro, 4=Enterprise
  billing_cycle TEXT, -- monthly, annual
  price_amount NUMERIC,
  currency TEXT DEFAULT 'USD',

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  -- active, trialing, past_due, canceled, unpaid

  -- Dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Limits
  max_farms INTEGER NOT NULL DEFAULT 1,
  max_parcels INTEGER NOT NULL DEFAULT 5,
  max_users INTEGER NOT NULL DEFAULT 2,
  max_satellite_reports INTEGER NOT NULL DEFAULT 10,
  max_storage_gb INTEGER DEFAULT 5,

  -- Feature Flags
  has_analytics BOOLEAN DEFAULT FALSE,
  has_accounting BOOLEAN DEFAULT FALSE,
  has_sensor_integration BOOLEAN DEFAULT FALSE,
  has_api_access BOOLEAN DEFAULT FALSE,
  has_advanced_reporting BOOLEAN DEFAULT FALSE,
  has_multi_currency BOOLEAN DEFAULT FALSE,
  has_priority_support BOOLEAN DEFAULT FALSE,
  has_custom_branding BOOLEAN DEFAULT FALSE,

  -- Usage Tracking
  current_farms INTEGER DEFAULT 0,
  current_parcels INTEGER DEFAULT 0,
  current_users INTEGER DEFAULT 0,
  current_satellite_reports INTEGER DEFAULT 0,
  satellite_reports_reset_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_polar ON subscriptions(polar_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

**Subscription Functions:**

```sql
-- Check if feature is available
CREATE OR REPLACE FUNCTION check_feature_access(
  p_organization_id UUID,
  p_feature_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_feature BOOLEAN;
BEGIN
  SELECT
    CASE p_feature_name
      WHEN 'analytics' THEN has_analytics
      WHEN 'accounting' THEN has_accounting
      WHEN 'sensor_integration' THEN has_sensor_integration
      WHEN 'api_access' THEN has_api_access
      WHEN 'advanced_reporting' THEN has_advanced_reporting
      WHEN 'multi_currency' THEN has_multi_currency
      WHEN 'priority_support' THEN has_priority_support
      WHEN 'custom_branding' THEN has_custom_branding
      ELSE FALSE
    END INTO v_has_feature
  FROM subscriptions
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'trialing');

  RETURN COALESCE(v_has_feature, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if can create resource
CREATE OR REPLACE FUNCTION can_create_resource(
  p_organization_id UUID,
  p_resource_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
  v_max_count INTEGER;
BEGIN
  SELECT
    CASE p_resource_type
      WHEN 'farm' THEN current_farms
      WHEN 'parcel' THEN current_parcels
      WHEN 'user' THEN current_users
      WHEN 'satellite_report' THEN current_satellite_reports
      ELSE 0
    END,
    CASE p_resource_type
      WHEN 'farm' THEN max_farms
      WHEN 'parcel' THEN max_parcels
      WHEN 'user' THEN max_users
      WHEN 'satellite_report' THEN max_satellite_reports
      ELSE 0
    END
  INTO v_current_count, v_max_count
  FROM subscriptions
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'trialing');

  RETURN v_current_count < v_max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment resource usage
CREATE OR REPLACE FUNCTION increment_resource_usage(
  p_organization_id UUID,
  p_resource_type TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  UPDATE subscriptions
  SET
    current_farms = CASE WHEN p_resource_type = 'farm' THEN current_farms + p_increment ELSE current_farms END,
    current_parcels = CASE WHEN p_resource_type = 'parcel' THEN current_parcels + p_increment ELSE current_parcels END,
    current_users = CASE WHEN p_resource_type = 'user' THEN current_users + p_increment ELSE current_users END,
    current_satellite_reports = CASE WHEN p_resource_type = 'satellite_report' THEN current_satellite_reports + p_increment ELSE current_satellite_reports END,
    updated_at = NOW()
  WHERE organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Polar.sh Webhook Handler

Process subscription events:

```typescript
// Webhook endpoint: POST /api/webhooks/polar
export async function POST(request: Request) {
  const body = await request.json();
  const signature = request.headers.get('polar-signature');

  // Verify webhook signature
  if (!verifyPolarWebhook(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = body.event;

  switch (event.type) {
    case 'subscription.created':
      await handleSubscriptionCreated(event.data);
      break;

    case 'subscription.updated':
      await handleSubscriptionUpdated(event.data);
      break;

    case 'subscription.canceled':
      await handleSubscriptionCanceled(event.data);
      break;

    case 'payment.succeeded':
      await handlePaymentSucceeded(event.data);
      break;

    case 'payment.failed':
      await handlePaymentFailed(event.data);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response('OK', { status: 200 });
}

async function handleSubscriptionCreated(data: any) {
  const { subscription_id, customer_id, product_id, metadata } = data;
  const organizationId = metadata.organization_id;

  // Get product details to determine plan
  const product = await polar.products.get(product_id);
  const planLimits = getPlanLimits(product.name);

  // Update subscription in database
  await supabase
    .from('subscriptions')
    .update({
      polar_subscription_id: subscription_id,
      polar_customer_id: customer_id,
      polar_product_id: product_id,
      plan_name: product.name.toLowerCase(),
      status: 'active',
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end,
      ...planLimits
    })
    .eq('organization_id', organizationId);
}
```

### CASL Ability Definition

Permission system integration:

```typescript
// src/lib/casl/defineAbilityFor.ts
import { defineAbility } from '@casl/ability';

export function defineAbilityFor(user, subscription) {
  return defineAbility((can, cannot) => {
    // ... role-based permissions ...

    // Subscription-based permissions
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Feature flags
      if (subscription.has_analytics) {
        can('read', 'Analytics');
      }

      if (subscription.has_accounting) {
        can('manage', 'Accounting');
      }

      // Usage limits
      if (subscription.current_farms < subscription.max_farms) {
        can('create', 'Farm');
      } else {
        cannot('create', 'Farm').because('Subscription farm limit reached');
      }

      if (subscription.current_parcels < subscription.max_parcels) {
        can('create', 'Parcel');
      } else {
        cannot('create', 'Parcel').because('Subscription parcel limit reached');
      }

      // ... more limit checks ...
    } else {
      // Subscription inactive or unpaid
      cannot('create', 'all').because('Subscription inactive');
      can('read', 'all'); // Allow read-only access
      can('update', 'Subscription'); // Allow reactivation
    }
  });
}
```

## Code Examples

### Feature Gate Component

```typescript
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback
}) => {
  const { subscription } = useAuth();

  const hasFeature = subscription?.[`has_${feature}`] === true;

  if (!hasFeature) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert variant="warning">
        <AlertTitle>Upgrade Required</AlertTitle>
        <AlertDescription>
          This feature requires a Pro plan or higher.
          <Button asChild className="ml-2">
            <Link to="/settings/subscription">Upgrade Now</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

// Usage
<FeatureGate feature="analytics">
  <AdvancedAnalyticsDashboard />
</FeatureGate>
```

### Limit Warning Component

```typescript
interface LimitWarningProps {
  resource: 'farms' | 'parcels' | 'users' | 'satellite_reports';
  children: React.ReactNode;
}

export const LimitWarning: React.FC<LimitWarningProps> = ({
  resource,
  children
}) => {
  const { subscription } = useAuth();
  const navigate = useNavigate();

  const current = subscription?.[`current_${resource}`] || 0;
  const max = subscription?.[`max_${resource}`] || 0;
  const percentage = (current / max) * 100;

  const canCreate = current < max;
  const nearLimit = percentage >= 80;

  const handleUpgrade = () => {
    navigate('/settings/subscription');
  };

  if (!canCreate) {
    return (
      <div>
        <Alert variant="destructive">
          <AlertTitle>{resource} Limit Reached</AlertTitle>
          <AlertDescription>
            You've reached your plan's limit of {max} {resource}.
            Upgrade to add more.
          </AlertDescription>
        </Alert>
        <Button onClick={handleUpgrade}>Upgrade Plan</Button>
      </div>
    );
  }

  return (
    <>
      {nearLimit && (
        <Alert variant="warning">
          <AlertTitle>Approaching Limit</AlertTitle>
          <AlertDescription>
            You're using {current} of {max} {resource} ({percentage.toFixed(0)}%).
            Consider upgrading soon.
          </AlertDescription>
        </Alert>
      )}
      {children}
    </>
  );
};

// Usage
<LimitWarning resource="farms">
  <CreateFarmButton />
</LimitWarning>
```

### Usage Tracking

```typescript
// When creating a farm
const createFarm = useMutation({
  mutationFn: async (farmData) => {
    // Check if can create
    const { data: canCreate } = await supabase.rpc('can_create_resource', {
      p_organization_id: organizationId,
      p_resource_type: 'farm'
    });

    if (!canCreate) {
      throw new Error('Farm limit reached. Please upgrade your plan.');
    }

    // Create farm
    const { data: farm, error } = await supabase
      .from('farms')
      .insert(farmData)
      .select()
      .single();

    if (error) throw error;

    // Increment usage counter
    await supabase.rpc('increment_resource_usage', {
      p_organization_id: organizationId,
      p_resource_type: 'farm',
      p_increment: 1
    });

    return farm;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['farms'] });
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    toast.success('Farm created successfully');
  },
  onError: (error) => {
    if (error.message.includes('limit reached')) {
      // Show upgrade modal
      showUpgradeModal('farms');
    } else {
      toast.error(error.message);
    }
  }
});
```

## Best Practices

### Subscription Management

1. **Clear communication** - Explain limits and features clearly
2. **Transparent pricing** - No hidden fees or surprises
3. **Easy upgrades** - Frictionless upgrade process
4. **Fair enforcement** - Consistent limit enforcement
5. **Data preservation** - Never delete user data on downgrade

### Limit Enforcement

1. **Proactive warnings** - Warn at 80% of limit
2. **Graceful degradation** - Allow read-only on limit reached
3. **Clear messaging** - Explain why action blocked
4. **Easy resolution** - One-click upgrade option
5. **Support access** - Always allow contacting support

### User Experience

1. **Trial generosity** - Give full Pro access in trial
2. **No credit card for trial** - Remove signup friction
3. **Value-based messaging** - Focus on benefits, not features
4. **Contextual prompts** - Show upgrade options at right time
5. **Smooth transitions** - No disruption during upgrades

### Technical Implementation

1. **Cache subscription data** - Don't query on every request
2. **Webhook redundancy** - Handle duplicate webhooks
3. **Graceful failures** - Degrade gracefully if Polar.sh down
4. **Audit logging** - Log all subscription changes
5. **Testing** - Thoroughly test upgrade/downgrade flows

## Related Features

- All features are gated by subscription level
- [Farm Management](./farm-management.md) - Subject to farm limits
- [Satellite Analysis](./satellite-analysis.md) - Subject to report limits

## Troubleshooting

### Subscription Not Activating

**Issue:** Paid but subscription still showing as Free

**Solutions:**
- Check webhook was received (check logs)
- Verify Polar.sh webhook URL is correct
- Manually trigger webhook resend in Polar.sh
- Check subscription status in Polar.sh dashboard
- Contact Polar.sh support if issue persists

### Limits Not Updating

**Issue:** Created resource but limit counter not decremented

**Solutions:**
- Verify increment_resource_usage function called
- Check database trigger is working
- Manually update current_* fields if needed
- Review application logs for errors
- Check RLS policies not blocking update

### Upgrade Not Reflecting

**Issue:** Upgraded plan but features still restricted

**Solutions:**
- Refresh page to reload subscription data
- Check subscription table for updated limits
- Verify webhook processed successfully
- Clear browser cache
- Check CASL ability is using latest subscription

### Payment Failed

**Issue:** Payment declined during upgrade

**Solutions:**
- Verify payment method is valid
- Check for sufficient funds
- Try alternative payment method
- Polar.sh will retry automatically
- Contact Polar.sh support for payment issues
- User will receive email notification

### Trial Not Expiring

**Issue:** Trial period ended but still has Pro access

**Solutions:**
- Check trial_end date in database
- Verify cron job checking trial expiration
- Manually update status to 'active' with Free limits
- Review trial expiration logic
- Check for bugs in trial handling code
