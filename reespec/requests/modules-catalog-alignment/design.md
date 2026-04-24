# Design — Modules Catalog Alignment

## Architecture

```
  ┌──────────────────────────────────────────────────────────────────┐
  │  admin-app (sysadmin only)                                       │
  │  ─────────────────────────                                       │
  │  /modules         →  PATCH /admin/modules/:id  (catalog CRUD)    │
  │  /clients/:orgId  →  PUT   /admin/orgs/:id/modules  (licensing)  │
  └────────────────┬─────────────────────────────────────────────────┘
                   │ writes
                   ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  DB (single source of truth)                                     │
  │  modules          (slug, name, nav_items, is_required, ...)      │
  │  module_translations (per-locale display strings)                │
  │  organization_modules (per-org is_active)                        │
  └────────────────┬─────────────────────────────────────────────────┘
                   │ reads (via NestJS)
                   ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  project/ (end user)                                             │
  │  ─────────                                                       │
  │  GET /api/v1/module-config   →  full catalog (locale-aware)      │
  │  GET /api/v1/organizations/:id/modules  →  per-org is_active     │
  │                                                                  │
  │  useModuleConfig()  ┐                                            │
  │  useModules()       ├─▶  useModuleBasedDashboard()                │
  │                     │      ├─ isNavigationEnabled(path)          │
  │                     │      │     (longest-prefix-wins)           │
  │                     │      └─ isWidgetEnabled(id)                │
  │                     │                                            │
  │                     └─▶  useIsModuleActive(slug)                  │
  │                             (UI-level: tabs, widgets, inline)    │
  │                                                                  │
  │  Consumers:                                                      │
  │  • ModuleGate (route wrapper) — isNavigationEnabled              │
  │  • Sidebar (nav rendering)    — isNavigationEnabled              │
  │  • /modules hub (launcher)    — activeModules + config           │
  │  • Parcel AI tabs, badges,    — useIsModuleActive                │
  │    inline features                                               │
  └──────────────────────────────────────────────────────────────────┘
```

## Key decisions

### 1. Slug is the canonical id

`modules.slug` (already in schema) is the single stable key. Frontend code references slugs (`'agromind_advisor'`), not display names. Display names come from `module_translations` via `/api/v1/module-config`.

`organization_modules` join column is `module_id` (UUID), but the response shape surfaced to frontend includes `slug` — `organization-modules.service.ts` must be extended to select and return `slug`. Currently returns only `id, name, icon, category, description, required_plan, is_active, settings` — missing slug.

### 2. Gating = longest-prefix-wins × UI-level hook

Route-level gating in `useModuleBasedDashboard.isNavigationEnabled`:

```typescript
// Current (broken):
for (const nav of availableNavigationSet) {
  if (path.startsWith(nav)) return true; // first match wins
}
return false;

// Fixed:
// Find the LONGEST nav_item across ALL modules (active or not) that is a prefix of path.
// Then check whether its owning module is active.
let longest = '';
let longestModuleSlug: string | null = null;
for (const module of allModulesWithNavItems) {
  for (const nav of module.navigationItems) {
    if (path.startsWith(nav) && nav.length > longest.length) {
      longest = nav;
      longestModuleSlug = module.slug;
    }
  }
}
if (!longestModuleSlug) return false;
return activeModuleSlugs.includes(longestModuleSlug);
```

Requires iterating all modules, not just active ones. The hook must expose BOTH sets (catalog + active).

UI-level gating (for embedded features that aren't dedicated routes):

```typescript
export function useIsModuleActive(slug: string): boolean {
  const { activeModules, isLoading } = useModuleBasedDashboard();
  if (isLoading) return false; // fail-closed during load
  return activeModules.includes(slug);
}
```

Consumers: AgromindIA tabs inside `/parcels/:id`, compliance badges, marketplace links embedded on order pages.

### 3. `is_required` replaces `alwaysAllowed`

`core` module has `is_required = true` and `navigation_items = ['/dashboard','/settings','/farm-hierarchy','/notifications','/parcels']`. The seed script guarantees every org has `organization_modules(core) = {is_active: true}`. No separate "always allowed" list in ModuleGate — remove the hardcoded array.

Admin-app module picker must disable the `core` checkbox (UI) and backend must reject `is_active = false` updates on any `is_required = true` module (defense in depth).

### 4. Sub-gating for AgromindIA

Two layers, complementary:

- **Route-level**: `agromind_advisor.navigation_items = ['/parcels/<uuid>/ai']`. Longest-prefix-wins picks this over `core`'s `/parcels`. Direct navigation to `/parcels/abc/ai/diagnostics` falls through to the "module non activé" page when `agromind_advisor` inactive.
- **UI-level**: Parcel detail page uses `useIsModuleActive('agromind_advisor')` to conditionally render AI tabs. If inactive: tab rendered in greyed state with lock icon and upgrade CTA; clicking does nothing (or opens sales contact modal).

Why both: the route-level gate catches direct navigation + bookmarks; the UI-level gate is the primary path for Hassan clicking around and needs to show the feature exists. Using only route-level is jarring ("I don't even know this exists"); using only UI-level leaks via direct URLs.

### 5. `/settings/modules` → read-only

Current component `ModulesSettings` allows toggle. Rewrite to render:

- List of active modules (icon, translated name, description)
- Count: `X of 12 modules enabled`
- Contact sales CTA when inactive sellable modules exist (`Contact sales to enable <module>` — opens mailto or form)
- Role guard stays `['system_admin','organization_admin']` but neither role gets toggle UI in project/

Backend `organization-modules.service.ts:84 updateOrganizationModule` becomes sysadmin-only (line 111 currently allows `organization_admin`). Change to reject non-sysadmin. Admin-app uses a separate `/admin/*` endpoint path so this doesn't affect the backoffice flow.

### 6. Display grouping on `/modules` hub

Current hardcoded `MODULE_SECTIONS` groups by hand-written sections. Replace: group modules by `modules.category`. Existing categories in code: `core, production, operations, hr, inventory, sales, purchasing, accounting, analytics, agriculture, elevage`. Map 11 SKUs:

| slug | category |
|---|---|
| core | core |
| chat_advisor | analytics |
| agromind_advisor | analytics |
| satellite | analytics |
| personnel | hr |
| stock | inventory |
| production | production |
| fruit_trees | agriculture |
| compliance | operations |
| sales_purchasing | sales |
| accounting | accounting |
| marketplace | sales |

`/modules` hub renders one section per category, sorted by `display_order`. Only active modules render as launchable; inactive sellable modules render greyed with "contact sales" CTA (same pattern as `/settings/modules`).

### 7. Data migration strategy

New migration file `project/supabase/migrations/20260424000000_align_modules_catalog.sql`. Idempotent. Steps:

1. Upsert 11 new module rows by slug (use `INSERT ... ON CONFLICT (slug) DO UPDATE`).
2. Seed `module_translations` for fr/en/ar per new slug.
3. Remap `organization_modules` rows: for each row where `module_id` points to an old seed row, find the corresponding new slug via a static mapping table in the migration, swap `module_id`. If target already exists, keep the OR of `is_active`.
4. Ensure every org has `organization_modules(core) = {is_active: true}`.
5. Delete orphaned old module rows (no organization_modules reference + not in new catalog).

Old → new mapping:

```
dashboard        → core
farms            → core
harvests         → production
tasks            → personnel
workers          → personnel
stock            → stock
customers        → sales_purchasing
suppliers        → sales_purchasing
quotes           → sales_purchasing
sales_orders     → sales_purchasing
purchase_orders  → sales_purchasing
invoices         → accounting
accounting       → accounting
reports          → accounting
satellite        → satellite
```

Migration preserves data: if org had `quotes` + `sales_orders` active, it ends up with `sales_purchasing` active once.

### 8. Default state for new orgs

New orgs get `organization_modules` rows inserted for every `is_required = true` module with `is_active = true`. Sellable modules default to `is_active = false` (no trial). Sales call determines the rest. Handled by a DB trigger on `organizations` insert (or service-level code in `OrganizationsService.createOrganization`).

Justification: simpler than trial logic, matches the custom-invoice sales model ("the client didn't pay for it, don't show it").

## Open question resolutions

| Question (from brief) | Resolution |
|---|---|
| Default state for new orgs | `is_required` only. No trial. Trigger or service-level insert. |
| Polar migration handling | Migration touches only `organization_modules`. Polar tables untouched. Any discrepancy surfaces in audit, not blocked. |
| `is_required` lock | Admin-app picker disables checkbox + backend rejects `is_active=false` on required modules (NestJS service throws 400). |
| Route manifest autocomplete | Out of scope this request. Sysadmin types paths manually. Validation (route exists in RouteTree) is a future enhancement. |

## Risks

1. **Migration touches every org.** Blast radius = all data. Mitigated by: idempotent SQL, transaction wrapper, dry-run on staging, audit query before/after showing per-org module count diff.
2. **Existing demo orgs may rely on the old 15-name schema.** Mitigated by: mapping table covers every old slug; orphan check before delete.
3. **`/settings/modules` going read-only is a visible UX change.** Org admins who expected a toggle will complain. Mitigated by: clear CTA to contact sales; changelog entry.
4. **Longest-prefix-wins algorithm cost.** O(modules × nav_items) per check. At 12 modules × ~5 nav_items = 60 comparisons — negligible.
5. **`useIsModuleActive` during loading returns `false`.** Fail-closed means AI tabs flash hidden before appearing. Acceptable tradeoff vs. leaking access. Skeleton loader at the tab container level covers this visually.
6. **LEGACY_MODULE_MAPPING removal breaks if seed doesn't fully replace it.** Mitigated by: end-to-end spec that asserts a fresh install renders all modules correctly without the mapping.

## What we are NOT changing

- Admin-app `/modules` page (CMS CRUD) — already works.
- Admin-app `/clients/:orgId` module picker — already works.
- `/admin/modules/*` and `/admin/orgs/:id/modules` backend endpoints — already work.
- Polar / `polar_subscriptions` / `organization_addons` / `module_prices` tables — stay intact for pricing display.
- CASL permissions — orthogonal to licensing; role × module is a two-axis grid.
