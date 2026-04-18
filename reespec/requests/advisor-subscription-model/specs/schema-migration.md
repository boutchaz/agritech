# Spec: DB Schema & Migration

## Scenario: Subscriptions table gains modular columns

**GIVEN** the current `subscriptions` table exists with formula-based columns
**WHEN** the migration runs
**THEN** the following columns are added:
- `selected_modules JSONB DEFAULT '[]'` — stores array of `{id, name, pricePerMonth}` for the client's selected modules
- `ha_pricing_mode VARCHAR(20) DEFAULT 'progressive'` — 'progressive' or 'static' (matches advisor)
- `discount_pct NUMERIC(5,2) DEFAULT 10` — bundle discount percentage
- `size_multiplier NUMERIC(5,2) DEFAULT 1` — computed size multiplier at time of subscription

**AND** existing rows are NOT modified — they keep their `formula` and work via backward compat path.

## Scenario: Legacy subscriptions continue to work

**GIVEN** a subscription was created before this migration with `formula: 'standard'`
**WHEN** the subscription is accessed via API
**THEN** it still returns valid data, `checkSubscription()` still works, and the user has the same access as before
**AND** `selected_modules` is `[]` (or null) — the backward compat code path derives module access from the formula

## Scenario: New subscriptions use modular pricing

**GIVEN** a new subscription is created after migration
**WHEN** checkout completes
**THEN** `selected_modules` is populated with the client's module choices
**AND** `formula` is set to `null` (or a derived value for legacy compat)
**AND** `price_ht_per_ha_year` is set to the weighted average ha price (for backward compat with existing reporting)
