# Modules Catalog Alignment

## What

Align the `modules` catalog, `organization_modules` activation, and the project/ frontend gating so that a single source of truth — what sysadmin configured in the admin-app — drives what every organization sees. Replace the hardcoded `MODULE_SECTIONS`, `LEGACY_MODULE_MAPPING`, and `alwaysAllowed` arrays in project/ with DB-driven gating, seed a coarse 11-SKU catalog, migrate existing org rows, and convert `/settings/modules` to read-only.

## Why

The backoffice (admin-app `/modules` page + `/clients/:orgId` module picker) and its backend (`/admin/modules/*`, `/admin/orgs/:id/modules`) are already built, but project/ ignores them in three places:

1. **`/modules` hub page** (`project/src/routes/_authenticated/(misc)/modules.tsx`) — renders a hardcoded `MODULE_SECTIONS` of 30+ kebab-case ids, gated only by CASL. Never reads `organization_modules`.
2. **`useModuleBasedDashboard.ts`** — contains a `LEGACY_MODULE_MAPPING` of old DB seed names to a third set of 9 slugs. Layers on top of whatever DB seed + admin-app catalog say.
3. **`ModuleGate.tsx`** — reads DB `navigation_items` correctly but uses prefix-match (`path.startsWith(nav)`) with first-hit wins. Breaks sub-route gating: `/parcels/:id/ai/*` under `agromind_advisor` is auto-allowed by `/parcels` under `core`.
4. **`alwaysAllowed = ['/dashboard','/settings','/farm-hierarchy','/notifications']`** — hardcoded in `ModuleGate`. Should be expressed as `is_required = true` on the `core` module.
5. **`/settings/modules`** in project/ lets `organization_admin` flip `is_active`, violating both the licensing model (sysadmin-only) and the memory rule that internal admin features live in admin-app.

The DB seed in `00000000000000_schema.sql:499-515` is a stale list of 15 snake_case names (`farms`, `harvests`, `sales_orders`, etc.) that matches neither the admin-app expectations nor the coarse SKU model the sales team will sell against.

## Licensing model

Custom-invoice sales — a sales call determines which modules each client gets, then `system_admin` activates them per organization from admin-app. No org-admin self-toggle, no plan-based auto-unlock. `organization_modules.is_active` is the single licensing flag. See `decisions.md` entry "Module licensing is sysadmin-only, custom-invoice — 2026-04-24" for rationale.

## Coarse module catalog (11 SKUs)

| slug | routes (navigation_items) | bundled |
|---|---|---|
| `core` | dashboard, farm-hierarchy, parcels, settings, notifications | `is_required = true` |
| `chat_advisor` | /chat | free |
| `agromind_advisor` | /parcels/:id/ai/* (calibration, diagnostics, recommendations, annual plan, references) | sellable |
| `satellite` | satellite imagery, vegetation indices, weather endpoints | sellable |
| `personnel` | workers, tasks | sellable |
| `stock` | stock, infrastructure | sellable |
| `production` | campaigns, crop-cycles, harvests, reception-batches, quality-control | sellable |
| `fruit_trees` | trees, orchards, pruning | sellable |
| `compliance` | compliance overview, certifications | sellable |
| `sales_purchasing` | quotes, sales-orders, purchase-orders | sellable |
| `accounting` | invoices, payments, journal, reports | sellable |
| `marketplace` | marketplace received/sent | sellable |

## Goals

1. **DB seed reconciled.** Replace the 15 old snake_case seed rows with the 11 coarse SKUs. Each row has `slug`, `name`, `icon`, `category`, `price_monthly`, `is_required`, `navigation_items`. Translations seeded for fr/en/ar via `module_translations`.
2. **Existing data migrated.** `organization_modules` rows keyed on old module ids get mapped to the new 11 SKUs via a migration. Semantic mapping: `farms`/`harvests` → `core` + `production`, `sales_orders`/`quotes` → `sales_purchasing`, etc.
3. **`/modules` hub page made DB-driven.** Delete `MODULE_SECTIONS` hardcode. Read active modules from `useModules()`. Render sections grouped by `category` or by a new `display_group` column. Role gating via CASL stays (orthogonal to licensing).
4. **`ModuleGate` fixed.** `isNavigationEnabled(path)` switches from first-match-wins to longest-prefix-wins. `alwaysAllowed` hardcode deleted — expressed as `is_required = true` on `core`. Core routes live in `core.navigation_items`.
5. **`LEGACY_MODULE_MAPPING` deleted.** After seed reconciliation there's no legacy to map; slugs in DB = slugs in code.
6. **`useIsModuleActive(slug)` hook created** for UI-level gating. Used to hide/grey AgromindIA tabs inside `/parcels/:id`, compliance badges, marketplace links embedded in other pages.
7. **`/settings/modules` converted to read-only.** Shows active module list + "contact sales to add more" CTA. No toggle UI. `RoleProtectedRoute` kept so only `organization_admin`+ can view.
8. **Sub-gating for AgromindIA** verified end-to-end. An org without `agromind_advisor` sees greyed AI tabs on the parcel page with an upgrade CTA, and hitting `/parcels/:id/ai/diagnostics` directly falls through `ModuleGate` to the "module non activé" page.

## Non-Goals

- Admin-app changes (CMS already built).
- Backend admin endpoint changes (already built — `AdminController` has modules + orgs/:id/modules CRUD).
- Subscription plan / Polar wiring changes. `required_plan`, `module_prices`, `organization_addons` stay in the schema for display only; do not gate access.
- Building a matrix view for bulk per-org module editing. Per-org page inside `/clients/:orgId` (already built) is the single path for sysadmin.

## Impact

- Single source of truth: `organization_modules × modules.navigation_items` drives every gate in project/.
- Sales can sell modules independently (e.g. "only AgromindIA Advisor") without code changes to project/.
- Sysadmin's clicks in admin-app actually change what orgs see.
- Removes three layers of hardcoded catalog duplication (MODULE_SECTIONS, LEGACY_MODULE_MAPPING, alwaysAllowed).

## Open questions (for planning phase)

- Default state for newly-created orgs: `core` + `chat_advisor` only, or a trial period with everything enabled? (Affects onboarding + seed SQL.)
- How does the migration handle orgs currently on Polar-backed subscriptions? Likely: leave Polar records untouched, only reconcile `organization_modules` rows.
- `is_required = true` on `core` means it can never be unticked in the admin-app. Admin-app module picker needs to respect this (disable checkbox, show lock icon).
- Route manifest for nav_items validation — does the backoffice need autocomplete of valid React routes, or do we trust sysadmin to type correctly?

## Related

- Archived: `reespec/requests/archive/2026-04-24-admin-module-editor/` — delivered the admin-app CMS and backend endpoints this request depends on.
- Decisions: `decisions.md` entries dated 2026-04-24 (licensing model, 11 SKU catalog, single source of truth).
