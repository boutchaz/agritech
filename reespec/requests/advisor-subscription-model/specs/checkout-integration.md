# Spec: Checkout & Polar Integration

## Scenario: Checkout with modular pricing

**GIVEN** the user has selected modules and hectares
**WHEN** they click "Checkout"
**THEN** the frontend calls `POST /api/v1/subscriptions/checkout` with:
- `selectedModules: string[]`
- `contractedHectares: number`
- `billingCycle: 'monthly' | 'semiannual' | 'annual'`
- `discountPercent: number` (optional, defaults to 10)

**AND** the backend:
1. Computes the quote using `SubscriptionPricingService.createQuote()`
2. Stores the quote as `pending_pricing_snapshot` on the subscription row
3. Stores selected modules in `selected_modules`
4. Returns a Polar checkout URL with metadata containing the computed amount

## Scenario: Polar webhook processes modular subscription

**GIVEN** Polar confirms payment for a modular subscription
**WHEN** the `subscription.created` or `subscription.active` webhook fires
**THEN** the backend:
1. Reads `selected_modules` and `pending_pricing_snapshot` from the subscription row
2. Updates the subscription status to `active`
3. Sets `amount_ht`, `amount_tva`, `amount_ttc` from the quote snapshot
4. Clears pending fields

## Scenario: Feature access checks module selection

**GIVEN** a subscription has `selected_modules: [{id: 'erp-rh'}, {id: 'erp-stocks'}]`
**WHEN** `checkFeatureAccess(organizationId, 'hr')` is called
**THEN** it checks if `erp-rh` is in the subscription's `selected_modules` (or if the subscription is legacy formula-based, uses the old formula hierarchy)
