# Advisor Subscription Model

## What

Replace the current 4-formula subscription system (starter/standard/premium/enterprise with flat per-hectare rates) with the modular pricing model defined in the AgroGina CFO Advisor: **ERP modular pricing (individually selectable modules at fixed DH/month) + degressive per-hectare pricing (7-tier progressive scale from 500 DH/ha/yr for <5ha down to 150 DH/ha/yr for 500+ha)**.

The advisor's model treats every subscription as a custom combination: the client selects which ERP modules they need and pays for their actual hectare range on a degressive scale, with an optional bundle discount. There are no predefined formula tiers — the price is always `sum(selected modules × size multiplier) + degressiveHaPrice(hectares)`.

## Why

The advisor was built as the authoritative financial model for AgroGina's go-to-market strategy. The current subscription system predates it and uses oversimplified assumptions (4 flat tiers, single per-ha rate). The mismatch means:

- **Pricing pages show wrong numbers** — the advisor calculates a 50ha farm at ~17,000 DH/yr (degressive + modules) but the app shows 5,500 DH/yr (starter × 50ha × 110)
- **Module access is hardcoded** — the advisor has 11 individually priced modules, but the app bundles them into 4 fixed formula groups
- **No commercial flexibility** — the advisor supports discounts, size multipliers, and custom module selection; the app cannot express any of these
- **Investor demos look wrong** — the CFO tool shows one model, the live product shows another

## Goals

1. **Modular ERP pricing** — 11 modules (4 base included, 7 upsell), each with a DH/month price, individually selectable by the org admin
2. **Degressive per-hectare pricing** — 7-tier progressive scale matching the advisor: <5ha=500, 5-20=400, 20-100=300, 100-200=250, 200-400=200, 400-500=180, 500+=150 DH/ha/yr
3. **Size multiplier** — ERP module prices scale by org size (1x for <100ha, 2.5x for 100-500ha, 5x for 500+ha)
4. **Bundle discount** — optional % discount applied to the total (default 10%)
5. **Dynamic quoting** — backend `createQuote()` computes `sum(modules × multiplier) + degressiveHa(hectares)` with discount, instead of flat `formula × hectares`
6. **Frontend subscription page** — module picker + hectare slider + live price calculator (replaces current 4-plan cards)
7. **Backward compatibility** — existing subscriptions keep their current formula and continue working until migration or renewal

## Non-Goals

- **Polar.sh product restructuring** — we keep the existing Polar checkout flow for now; the quote is calculated server-side and the Polar product is used as a payment conduit (price is set in metadata, not as a static Polar product price)
- **Advisor integration** — we do not embed the advisor tool in the main app. We extract its pricing model and constants only
- **Roadmap module billing** — the advisor's roadmap items (drone, IoT, couveuses) are future products, not part of the base subscription. They remain in the advisor only
- **Changing billing cycles or lifecycle** — the existing monthly/semiannual/annual cycles and subscription lifecycle states remain as-is
- **Changing the `subscriptions` table structure** — we reuse existing columns where possible and add new ones only for module selection

## Impact

- **Backend**: `subscription-domain.ts`, `subscription-pricing.service.ts`, `subscriptions.service.ts` — pricing engine rewrite
- **Frontend**: `lib/polar.ts` (plan definitions), `SubscriptionSettings` component, `subscriptionsService.ts` (quote API)
- **DB**: `subscriptions` table gains `selected_modules` JSONB column; `module_prices` table already exists in archive migrations
- **Polar**: checkout flow changes from "pick a product per formula" to "server-side quote → single dynamic checkout URL"
- **Existing subscriptions**: continue on their current formula until explicit migration or renewal
