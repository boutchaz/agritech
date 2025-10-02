# Subscription System Documentation

## Overview

The application uses Polar.sh for subscription management with three tiers: Essential, Professional, and Agri-Business. The system includes grandfathering for existing users.

## Configuration

### Enforcement Date

Set in `/src/config/subscription.ts`:

```typescript
export const SUBSCRIPTION_ENFORCEMENT_DATE = new Date('2025-10-02T00:00:00Z');
```

**Options:**
- **Past date** (e.g., `'2020-01-01'`) - All organizations require subscription
- **Today's date** - New organizations require subscription, existing users grandfathered
- **Future date** - All users have free access until that date

### Other Settings

```typescript
export const SUBSCRIPTION_CONFIG = {
  WARNING_DAYS_BEFORE_EXPIRATION: 7,  // Show warning banner
  GRACE_PERIOD_DAYS: 0,                // Days after expiration before blocking
  SHOW_LEGACY_USER_BANNER: true,      // Show banner for grandfathered users
  EXEMPT_PATHS: [                      // Paths always accessible
    '/settings/subscription',
    '/settings/organization',
  ],
};
```

## Subscription Plans

### Essential Plan ($25/month)
- 3 Modules: Fruit Trees, Cereals, Vegetables
- 2 Farms, 25 Parcels, 5 Users
- Basic features

### Professional Plan ($75/month)
- 5 Modules: Essential + Mushrooms, Livestock
- 10 Farms, 200 Parcels, 25 Users
- Advanced features (Analytics, AI, Sensors, Satellite)

### Agri-Business Plan (Custom Pricing)
- All modules unlocked
- Unlimited everything
- Full features + API access + Priority support

## How It Works

### 1. New Organizations (Created After Enforcement Date)
- **Without subscription**: Blocked with "Subscription Required" screen
- **With active subscription**: Full access based on plan features
- **Trialing subscription**: Full access with trial banner

### 2. Legacy Organizations (Created Before Enforcement Date)
- **No subscription**: Full access + "Legacy User" banner (optional)
- **With subscription**: Full access + benefits

### 3. Subscription States

| Status | Access | Banner |
|--------|--------|--------|
| `active` | ✅ Full | None |
| `trialing` | ✅ Full | Blue trial banner |
| `past_due` | ❌ Blocked | Red payment warning |
| `canceled` | ❌ Blocked* | Orange cancellation notice |
| No subscription (new org) | ❌ Blocked | N/A |
| No subscription (legacy) | ✅ Full | Purple legacy banner |

*Canceled subscriptions remain active until `current_period_end`

## Components

### Core Validation
- **`isSubscriptionValid()`** - Main validation logic with grandfathering
- **Location**: `/src/lib/polar.ts`

### UI Components

1. **SubscriptionRequired** (`/src/components/SubscriptionRequired.tsx`)
   - Full-screen blocker for invalid subscriptions
   - Shows reason-specific messages
   - Provides upgrade/settings buttons

2. **SubscriptionBanner** (`/src/components/SubscriptionBanner.tsx`)
   - Top banner for trials, warnings, and payment issues
   - Dismissible per session

3. **LegacyUserBanner** (`/src/components/LegacyUserBanner.tsx`)
   - Encourages legacy users to upgrade
   - Dismissible and stored in sessionStorage

### Route Protection
- **`_authenticated.tsx`** - Checks subscription on all authenticated routes
- **`ProtectedRoute.tsx`** - Reusable component with subscription checking

## Setup Scripts

### Product Setup
```bash
yarn polar:setup
```
Creates/updates products in Polar.sh with module metadata.

### Utilities
```bash
npx tsx scripts/check-polar-products.ts        # View products
npx tsx scripts/restore-main-products.ts       # Unarchive main products
npx tsx scripts/cleanup-polar-duplicates.ts    # Archive duplicates
```

## Deployment Checklist

### Before Going Live

1. **Set Enforcement Date**
   ```typescript
   // In src/config/subscription.ts
   export const SUBSCRIPTION_ENFORCEMENT_DATE = new Date('2025-10-15T00:00:00Z');
   ```

2. **Configure Polar**
   - Update `.env` with production Polar tokens
   - Change `VITE_POLAR_SERVER` to `production`
   - Run `yarn polar:setup` to create production products

3. **Test Scenarios**
   - [ ] New org without subscription → Blocked
   - [ ] New org with subscription → Access granted
   - [ ] Legacy org without subscription → Access granted (with banner)
   - [ ] Expired subscription → Blocked
   - [ ] Trial subscription → Access with banner

4. **Database**
   - Ensure `subscriptions` table exists
   - Add default subscriptions for existing orgs (if desired)

### Migration Strategy for Existing Users

**Option A: Grandfather All Existing Users**
```typescript
// Set to past date
export const SUBSCRIPTION_ENFORCEMENT_DATE = new Date('2020-01-01T00:00:00Z');
```
- All current users keep free access
- Only new signups require subscription

**Option B: Require Subscriptions for All**
```typescript
// Set to future date
export const SUBSCRIPTION_ENFORCEMENT_DATE = new Date('2099-12-31T00:00:00Z');
```
- Create subscriptions in database for all existing orgs
- Then set enforcement date to current date

**Option C: Grace Period**
```typescript
// Set to 30 days from now
export const SUBSCRIPTION_ENFORCEMENT_DATE = new Date('2025-11-15T00:00:00Z');
export const SUBSCRIPTION_CONFIG = {
  GRACE_PERIOD_DAYS: 30,
  // ...
};
```
- Users see banner but maintain access
- Blocking starts after grace period

## Troubleshooting

### Users Blocked Incorrectly

1. Check organization `created_at` date
2. Verify `SUBSCRIPTION_ENFORCEMENT_DATE` setting
3. Check subscription status in database
4. Review `isSubscriptionValid()` logic

### Products Not Showing in Polar

1. Verify environment variables in `.env`
2. Check Polar server setting (sandbox vs production)
3. Run `npx tsx scripts/check-polar-products.ts`
4. Ensure products are not archived

### Module Access Issues

1. Check `available_modules` in product metadata
2. Verify `isModuleAvailable()` in `/src/lib/polar.ts`
3. Ensure subscription has correct `plan_type`

## Support

For issues:
1. Check application logs
2. Review Polar.sh dashboard
3. Verify database subscription records
4. Test with different organization created dates
