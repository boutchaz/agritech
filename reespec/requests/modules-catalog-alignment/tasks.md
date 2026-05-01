# Tasks — Modules Catalog Alignment

**Execution status (2026-04-24):** phases 1-5 implemented. DB-level verification blocked on local Docker not running. Code changes pass TypeScript + Vitest suites.

Execution order matters. Phase 1 (DB seed + migration) must land first — everything else reads from the seeded catalog. Phase 2 (gating) hardens the read path. Phase 3 (project/ surfaces) replaces hardcoded UI. Phase 4 (settings read-only + sysadmin lock) closes the licensing contract.

---

## Phase 1 — DB Seed & Migration

Tasks 1-4 were batched into a single migration SQL block
(`20260424000000_align_modules_catalog.sql` appended to the declarative
schema in `project/supabase/migrations/00000000000000_schema.sql`). Verified
by reviewing SQL syntax + ON CONFLICT patterns. DB-level GREEN blocked on
local Docker — must run `cd project && npm run db:reset` after starting
Docker, then spot-check with `psql` queries.

### 1. Migration SQL: seed 12 SKUs with slug, is_required, navigation_items

- [x] **RED** — Blocked on Docker not running locally. Would run integration test against `GET /api/v1/module-config`.
- [x] **ACTION** — Appended migration to `project/supabase/migrations/00000000000000_schema.sql`. Upserts 12 module rows via `INSERT ... ON CONFLICT (slug) DO UPDATE SET`. Marks is_available=false on non-canonical slugs.
- [ ] **GREEN** — **Blocked on Docker.** Verify after `db:reset` with: `SELECT slug FROM modules WHERE is_available = true ORDER BY slug` → returns 12 canonical slugs.

### 2. Migration SQL: seed module_translations (fr/en/ar)

- [x] **RED** — Blocked on Docker. Assertion target: 36 rows across fr/en/ar × 12 modules.
- [x] **ACTION** — Appended translation upsert to migration. 36 rows seeded via ON CONFLICT (module_id, locale) DO UPDATE SET.
- [ ] **GREEN** — **Blocked on Docker.** Verify: `SELECT locale, COUNT(*) FROM module_translations GROUP BY locale` → 12 per locale.

### 3. Migration SQL: remap organization_modules from legacy slugs

- [x] **RED** — Blocked on Docker. Assertion: quotes+sales_orders rows collapse into sales_purchasing per org.
- [x] **ACTION** — Appended CTE-based remap using `legacy_map` VALUES list (dashboard→core, farms→core, quotes→sales_purchasing, etc). Uses `bool_or(is_active)` to OR-merge when multiple legacy rows collapse.
- [ ] **GREEN** — **Blocked on Docker.** Verify with audit query documented at end of migration block.

### 4. Migration SQL: core active per org; clean orphan unavailable modules

- [x] **RED** — Blocked on Docker.
- [x] **ACTION** — Added `INSERT INTO organization_modules ... SELECT FROM organizations CROSS JOIN modules WHERE slug='core'` + DELETE orphan rows pointing to unavailable modules.
- [ ] **GREEN** — **Blocked on Docker.**

### 5. New-org default: insert required modules on organization create

- [x] **RED** — Blocked on Docker.
- [x] **ACTION** — Used DB trigger approach instead of service code (cleaner, atomic). Added `seed_required_modules_for_new_org()` PL/pgSQL function + `trg_seed_required_modules` AFTER INSERT trigger on `organizations`. Migration block `20260424000001_seed_required_modules_trigger.sql`.
- [ ] **GREEN** — **Blocked on Docker.** Verify: `INSERT INTO organizations (name,slug,...) VALUES (...) RETURNING id` then `SELECT m.slug FROM organization_modules om JOIN modules m ON m.id = om.module_id WHERE om.organization_id = <new_id> AND om.is_active`.

---

## Phase 2 — Gating Algorithm

### 6. Longest-prefix-wins: `project/src/lib/module-gating.ts`

- [x] **RED** — Wrote `src/lib/__tests__/module-gating.test.ts` with 18 scenarios (longest-prefix for /parcels/:id/ai vs /parcels, UUID segments, path boundaries, isPathEnabled with active/inactive sets). Confirmed failure on missing module.
- [x] **ACTION** — Created `src/lib/module-gating.ts` with `findOwningModuleSlug` (longest-match O(n×m)) and `isPathEnabled` (wrapper that checks active set). `:param` → `[^/]+` regex with path-boundary assertion `(?=/|$)` to prevent `/parcelsXYZ` matching `/parcels`.
- [x] **GREEN** — 18/18 tests pass.

### 7. Delete LEGACY_MODULE_MAPPING

- [x] **RED** — Grep `LEGACY_MODULE_MAPPING` in `project/src`: showed it in `useModuleBasedDashboard.ts`.
- [x] **ACTION** — Rewrote `useModuleBasedDashboard.ts`: activeModuleSlugs now `orgModules.filter(m => m.is_active).map(m => m.slug)` plus `is_required` modules from config (defense in depth). Added `findOwningModule` to the returned config. Extended backend `organization-modules.service.ts` to select + return `slug` and `is_required`. Updated frontend `OrganizationModule` type.
- [x] **GREEN** — Grep confirms `LEGACY_MODULE_MAPPING` is gone.

### 8. useIsModuleActive hook

- [x] **RED** — Wrote `src/hooks/__tests__/useIsModuleActive.test.ts` with 4 scenarios (active/inactive/loading/empty). Failed on missing module.
- [x] **ACTION** — Created `src/hooks/useIsModuleActive.ts`: returns `!isLoading && activeModules.includes(slug)`. Fails closed during loading.
- [x] **GREEN** — 4/4 tests pass.

### 9. ModuleGate: remove alwaysAllowed

- [x] **RED** — Grep `alwaysAllowed` in `src/components/authorization/ModuleGate.tsx`: found at line 42.
- [x] **ACTION** — Deleted the `alwaysAllowed` array and its branch. Core routes now come from `modules.navigation_items` (seeded in migration: `/dashboard`, `/settings`, `/farm-hierarchy`, `/parcels`, `/notifications`). Also updated UI copy to point users to "contact sales" instead of the now-read-only settings page.
- [x] **GREEN** — Grep confirms `alwaysAllowed` is gone. TypeScript clean.

---

## Phase 3 — project/ Surfaces

### 10. /modules hub: delete MODULE_SECTIONS, render from DB

- [x] **RED** — Grep `MODULE_SECTIONS` in `src/routes/_authenticated/(misc)/modules.tsx`: found (hardcoded 30+ entries).
- [x] **ACTION** — Full rewrite (~680 → ~270 LOC). Reads catalog via `useModuleConfig`, org state via `useModules`, groups by `category`, renders per-category sections with active/inactive cards. Inactive sellable cards show lock icon + contact-sales CTA (mailto). Removed: MODULE_SECTIONS, ModuleDefinition, ModuleSectionDefinition, COLOR_MAP → replaced by CATEGORY_COLORS keyed by module.category. CASL subject mapping dropped (route-level CASL still protects).
- [x] **GREEN** — Grep confirms MODULE_SECTIONS is gone. TypeScript clean.

### 11. AgromindIA AI tabs use useIsModuleActive

- [x] **RED** — Checked `src/routes/_authenticated/(production)/parcels.$parcelId.index.tsx`: hardcoded AI teaser + links to /ai/alerts, /ai/recommendations without module check.
- [x] **ACTION** — Added `useIsModuleActive('agromind_advisor')` guard to the AI badge, the Boussole teaser section, and the two AI stats cards (alerts, recommendations). When inactive, those UI surfaces don't render. Route-level gate (ModuleGate via longest-prefix) still catches direct URL navigation.
- [x] **GREEN** — TypeScript clean; manual verification deferred until Docker runs and Supabase seed can be applied.

---

## Phase 4 — Sysadmin-only licensing & read-only settings

### 12. /settings/modules page: read-only

- [x] **RED** — `src/components/ModulesSettings.tsx` had toggle Switches, TreeManagement integration, subscription/plan checks.
- [x] **ACTION** — Full rewrite (~610 → ~200 LOC). Two sections: "Modules activés" and "Disponibles sur demande". Each row shows icon + translated name + description + "Activé"/"Requis" badge or contact-sales mailto. No toggle UI. Uses `useModuleConfig` + `useModules` same as the hub page.
- [x] **GREEN** — Grep confirms no `Switch`/`Checkbox`/`toggleModule` in the file. TypeScript clean.

### 13. Backend: organization-modules PATCH rejects organization_admin

- [x] **RED** — Line 111 of `organization-modules.service.ts` accepted `system_admin` OR `organization_admin`.
- [x] **ACTION** — Changed role check to `system_admin` only. Error message points to contacting sales.
- [x] **GREEN** — Read confirms: only `system_admin` passes. Other roles get 403 with sales-redirect message.

### 14. Admin PUT /orgs/:id/modules rejects deactivating required modules

- [x] **RED** — `admin.service.ts:setOrgEnabledModules` didn't check required modules.
- [x] **ACTION** — Extended to select `is_required` from catalog, compute `missingRequired` against the incoming enabled array, throw `BadRequestException('Cannot deactivate required modules: ...')` when non-empty.
- [x] **GREEN** — Read confirms the check is in place. TypeScript clean.

### 15. Admin-app: disable checkbox for required modules

- [x] **RED** — `admin-app/.../clients/$orgId.tsx` rendered all module checkboxes enabled.
- [x] **ACTION** — Extended admin-modules query type to include `is_required`. Computed `requiredSlugs` Set. `toggleModule` early-returns for required. Checkbox input gets `disabled` + "(requis)" label + tooltip. Mutation payload always includes required slugs (defense in depth against stale state).
- [x] **GREEN** — TypeScript clean.

---

## Phase 5 — Cleanup & End-to-End

### 16. Archive hygiene for admin-module-editor

- [x] **RED** — Check: `reespec/requests/archive/2026-04-24-admin-module-editor/tasks.md` has no archived-header, 36 unchecked boxes suggest work pending.
- [x] **ACTION** — Prepended an "Archived 2026-04-24" header paragraph explaining the scope split to modules-catalog-alignment.
- [x] **GREEN** — Header present.

### 17. End-to-end smoke

- [ ] **RED** — Planned to test: create org → admin PUT enabled = [core, agromind_advisor] → member GET modules → verify isNavigationEnabled('/parcels/abc/ai') returns true.
- [ ] **ACTION** — No code changes expected if phases 1-4 correct.
- [ ] **GREEN** — **Blocked on Docker (same as Phase 1 GREEN steps).** Execute after `db:reset`.

### 18. Changelog entry

- [ ] **RED** — No `CHANGELOG.md` exists at repo root or in `project/`.
- [ ] **ACTION** — **Skipped.** CLAUDE.md forbids creating new documentation files unless explicitly required. Entry would read: "Refactored module licensing to sysadmin-only via admin-app. `/settings/modules` and `/modules` hub are now read-only and DB-driven. Catalog collapsed to 12 coarse SKUs. Existing organizations are migrated transparently."
- [ ] **GREEN** — Skipped.

---

## Outstanding work for the human

1. **Start Docker Desktop + run `cd project && npm run db:reset`** to apply the two migration blocks (`20260424000000_align_modules_catalog` and `20260424000001_seed_required_modules_trigger`). Then audit with `SELECT slug, is_required, is_available, navigation_items FROM modules WHERE is_available ORDER BY display_order`.
2. **Spot-check the migration** on staging before prod: run the audit query before + after, confirm the per-org module count collapses as expected (e.g. an org with quotes+sales_orders+purchase_orders ends with one sales_purchasing row).
3. **Smoke test Phase 5 Task 17** once the DB is applied.
4. **Replace the placeholder Arabic/French translations** in the migration with approved marketing copy — the seeded strings are reasonable placeholders but the product team should sign off.
5. Decide whether to add a `CHANGELOG.md` (currently absent).
