# Advisor Subscription Model — Design

## Approach

Extract the advisor's pricing engine as the source of truth and replace the formula-based system with a modular one. The pricing calculation becomes: **`total = (sum(selected_modules) × size_multiplier + degressiveHaPrice(hectares)) × (1 - discount%)`**.

### Pricing Constants (from advisor `engineStore.ts`)

**ERP Modules** (DH/month, before multiplier):
| Module | Price | Base? |
|--------|-------|-------|
| Multi-Fermes & Parcellaire | 100 | Yes |
| Dashboard & Live Map | 50 | Yes |
| Tâches Agronomiques | 80 | Yes |
| Récolte & Traçabilité | 50 | Yes |
| RH & Paie Agronomique | 80 | No |
| Stocks & Entrepôts | 60 | No |
| Compta & Facturation | 250 | No |
| Contrôle Qualité | 40 | No |
| Conformité & Normes | 60 | No |
| Marketplace | 50 | No |
| Assistant IA | 60 | No |

**Size Multiplier**:
- <100 ha → 1x
- 100–500 ha → 2.5x
- 500+ ha → 5x

**Degressive Per-Hectare Pricing** (DH/ha/year, progressive):
| Range | Price/ha/yr |
|-------|-------------|
| < 5 ha | 500 |
| 5–20 ha | 400 |
| 20–100 ha | 300 |
| 100–200 ha | 250 |
| 200–400 ha | 200 |
| 400–500 ha | 180 |
| 500+ ha | 150 |

**Default Discount**: 10% bundle discount

### Architecture Changes

#### 1. Backend: `subscription-domain.ts` — Replace formulas with modular config

Current: `SubscriptionFormula` enum + `FORMULA_POLICIES` static map
New: 
- Remove `FORMULA_POLICIES` 
- Add `ERP_MODULES` config (id, name, pricePerMonth, isBase)
- Add `HA_PRICE_TIERS` config (maxHa, pricePerHaYear)
- Add `SIZE_MULTIPLIER_TIERS` config (thresholds + multiplier)
- Keep `SubscriptionFormula` enum for backward compatibility (existing subscriptions still have a `formula` field)
- Add `computeQuote(modules[], hectares, billingCycle, discount%)` function that replaces `createQuote(formula, hectares, billingCycle)`

#### 2. Backend: `subscription-pricing.service.ts` — New pricing engine

Replace `resolveFormulaRate(formula)` with:
- `computeErpMonthly(selectedModuleIds[])` — sum of selected module prices
- `resolveSizeMultiplier(hectares)` — lookup multiplier tier
- `computeHaTotalPrice(hectares, tiers[])` — degressive tier calculation (same algorithm as advisor)
- `createQuote(input)` — computes full breakdown:
  - erpMonthly = sum(modules) × sizeMultiplier
  - haAnnual = degressiveHaPrice(hectares)
  - annualHt = (erpMonthly × 12 + haAnnual) × (1 - discount%)
  - cycleHt = annualHt / installmentsPerYear
  - cycleTva = cycleHt × vatRate
  - cycleTtc = cycleHt + cycleTva

#### 3. Backend: `subscriptions.service.ts` — Updated checkout flow

- `createCheckoutUrl()` changes from formula-based to module-based:
  - Accept `selectedModules: string[]` + `contractedHectares: number` + `billingCycle`
  - Compute quote server-side
  - Store selected modules in `subscriptions.selected_modules` JSONB
  - Pass quote amount to Polar as metadata (Polar product = generic payment conduit)
- `createQuote()` exposes new breakdown with module details
- `getSubscriptionCatalog()` returns modules list + ha tiers + size multipliers
- Backward compatibility: `checkSubscription()` still works for legacy formula subscriptions

#### 4. DB Schema Changes

```sql
-- Add module selection to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS selected_modules JSONB DEFAULT '[]';
-- selected_modules stores [{id: 'erp-multiferme', name: '...', pricePerMonth: 100}, ...]

-- Add hectare pricing mode
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ha_pricing_mode VARCHAR(20) DEFAULT 'progressive';

-- Add discount
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) DEFAULT 10;

-- Add size multiplier
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS size_multiplier NUMERIC(5,2) DEFAULT 1;
```

No new tables needed. The existing `module_prices` table from the archived migration is not reused — pricing constants live in code (like the advisor).

#### 5. Frontend: `lib/polar.ts` — Replace plan definitions

Current: `SUBSCRIPTION_PLANS` with 4 hardcoded `PlanDetails` objects
New:
- `ERP_MODULES` config matching backend (same 11 modules)
- `HA_PRICE_TIERS` config (7 tiers)
- `SIZE_MULTIPLIER_TIERS` config
- `computeQuote()` client-side mirror of backend pricing (for live preview)
- Keep `normalizePlanType()` and `isSubscriptionValid()` for backward compat
- Remove `SUBSCRIPTION_PLANS`, `PlanDetails`, `getPlanDetails()`, `getDefaultHectaresForPlan()`, `getEstimatedPricing()`

#### 6. Frontend: `SubscriptionSettings` component — Module picker UI

Replace 4-plan card grid with:
- **Module picker**: checkbox grid showing 11 modules (4 base pre-selected, disabled), each with DH/month
- **Hectare input**: number input or slider for contracted hectares
- **Live price calculator**: real-time preview showing ERP monthly + ha annual + discount = total
- **Billing cycle selector**: monthly / semiannual / annual (existing)
- **Checkout button**: calls new `createCheckout()` with selected modules + hectares

#### 7. Polar.sh Integration

Current: 4 static products (one per formula × billing cycle)
New: Single generic product per billing cycle (monthly, semiannual, annual). The actual price is passed as metadata and the checkout URL includes the computed amount. This avoids creating 11×3 = 33 Polar products.

**Important**: If Polar doesn't support dynamic pricing via metadata, we'll use the Polar Custom Checkout API to create a one-time checkout session with the computed amount. This needs verification.

## Risks

1. **Polar dynamic pricing** — Polar.sh may not support arbitrary amounts per checkout. Mitigation: verify with Polar API docs; fallback to using Polar for subscription management only and generating payment links with computed amounts.
2. **Existing subscription migration** — ~N active subscriptions on old formulas need to keep working. Mitigation: backward-compatible code path that detects `formula`-only subscriptions and serves them as-is.
3. **Module access enforcement** — currently `checkFeatureAccess()` checks formula hierarchy. With modular pricing, it must check `selected_modules`. Mitigation: `selected_modules` is stored on the subscription row; `checkFeatureAccess()` reads it.
4. **Frontend scope** — the subscription settings page needs a significant UI rewrite. Mitigation: break into small vertical slices.

## Rejected Alternatives

- **Keep 4 formulas but use advisor rates** — rejected because the advisor model is fundamentally modular, not tiered. Simplifying back to 4 tiers would lose the key advantage (clients pick exactly what they need).
- **Dual model (formulas + modules)** — rejected as overly complex. Two pricing models would confuse both the codebase and users.
- **Store pricing in DB** — rejected because the advisor keeps pricing in code constants for simplicity. DB-based pricing adds admin UI complexity with no current need (pricing changes are rare and version-controlled).
