# Tasks — Admin Module Editor

## Backend

### 1. Admin module CRUD endpoints

- [ ] **RED** — Write `agritech-api/test/integration/admin/admin-modules.spec.ts`: test GET /admin/modules returns array, POST creates module with slug, PATCH updates, DELETE soft-deletes. Run `npx jest admin-modules` → tests fail (endpoints don't exist).
- [ ] **ACTION** — Add to `AdminController`: `getModules()`, `getModule(id)`, `createModule()`, `updateModule(id)`, `deleteModule(id)`. Add corresponding methods in `AdminService` that query/insert/update/delete the `modules` table with Supabase admin client. All behind `@RequireRole('system_admin')`.
- [ ] **GREEN** — Run `npx jest admin-modules` → tests pass.

### 2. Admin translation upsert endpoint

- [ ] **RED** — Add test in `admin-modules.spec.ts`: PUT /admin/modules/:id/translations/fr with {name, description, features} → creates row in module_translations. PUT again → updates existing row. Run → fails.
- [ ] **ACTION** — Add `upsertModuleTranslation(moduleId, locale, dto)` to `AdminService`. Uses Supabase `.upsert()` on `module_translations` with `(module_id, locale)` conflict. Add route in `AdminController`.
- [ ] **GREEN** — Run `npx jest admin-modules` → all tests pass.

### 3. Cache bust on module save

- [ ] **RED** — Check: `AdminService.updateModule()` does NOT call `ModuleConfigService.clearCache()`. Assertion: no cache clear in update method.
- [ ] **ACTION** — Import `ModuleConfigService` in `AdminModule`. After any create/update/delete in `AdminService`, call `this.moduleConfigService.clearCache()`. Add `clearCache()` method to `ModuleConfigService` if not already public.
- [ ] **GREEN** — Verify: `AdminService.updateModule()` now calls `clearCache()`. Module-config endpoint returns fresh data after admin save.

## Frontend — Remove hardcoded route map

### 4. Replace ROUTE_MODULE_MAP with isNavigationEnabled

- [ ] **RED** — Check: `ModuleGate.tsx` contains `ROUTE_MODULE_MAP` constant and `getModuleForPath()` function. These are hardcoded.
- [ ] **ACTION** — Rewrite `ModuleGate` to: (1) get current path from `useRouterState()`, (2) call `isNavigationEnabled(path)` from `useModuleBasedDashboard`, (3) if false AND modules are loaded, show disabled page. Remove `ROUTE_MODULE_MAP` and `getModuleForPath`. Update `ModuleGate` props: remove `moduleSlug`, the gate auto-detects from path.
- [ ] **GREEN** — Verify: `ModuleGate.tsx` no longer contains `ROUTE_MODULE_MAP`. Navigation to disabled module route shows "Module non activé". Navigation to enabled module route works normally.

### 5. Update Sidebar to use isNavigationEnabled

- [ ] **RED** — Check: Sidebar uses `isModuleActive('compliance')` with hardcoded slug strings for section visibility.
- [ ] **ACTION** — Replace `isModuleActive(slug)` calls with `isNavigationEnabled(path)` checks. For each section, check the primary route path: compliance → `isNavigationEnabled('/compliance')`, marketplace → `isNavigationEnabled('/marketplace')`, chat → `isNavigationEnabled('/chat')`. Remove `isModuleActive` helper.
- [ ] **GREEN** — Verify: Sidebar no longer contains hardcoded module slugs for visibility. Adding a route to a module's `navigation_items` in DB makes it appear in sidebar for active orgs.

### 6. Simplify route guards — remove per-route ModuleGate wrappers

- [ ] **RED** — Check: compliance/index.tsx, marketplace.tsx, lab-services.tsx, chat.tsx each have inline `ModuleGate` or `withModuleProtection` wrappers with hardcoded slugs.
- [ ] **ACTION** — Since `ModuleGate` now auto-detects from path, create a single `_moduleGated` layout route or add `ModuleGate` (no props needed) to the authenticated layout. All routes automatically gated. Remove per-route `ModuleGate` wrappers and `ComplianceDashboardGuarded`, `MarketplaceGuarded`, `LabServicesGuarded` wrapper components.
- [ ] **GREEN** — Verify: no route file imports `ModuleGate` or `withModuleProtection` directly. Module gating works for all routes by checking DB navigation_items.

## Admin App — Module Editor Page

### 7. Admin modules API service + hooks

- [ ] **RED** — Check: `admin-app/src/lib/` has no module management API functions. `admin-app/src/hooks/` has no `useAdminModules` hook.
- [ ] **ACTION** — Create `admin-app/src/hooks/useAdminModules.ts` with: `useAdminModules()` query, `useAdminModule(id)` query, `useCreateModule()` mutation, `useUpdateModule()` mutation, `useDeleteModule()` mutation, `useUpsertTranslation()` mutation. All use `apiRequest` to call `/api/v1/admin/modules/*`.
- [ ] **GREEN** — Verify: file exists with all 6 hooks exported. TypeScript compiles clean.

### 8. Module list page

- [ ] **RED** — Check: `admin-app/src/routes/_authenticated/modules.tsx` does not exist.
- [ ] **ACTION** — Create the route file with: table of all modules (columns: display_order, slug, name, category, price_monthly, required_plan, is_available), availability toggle per row, "Nouveau Module" button, click row → open edit dialog. Use existing admin-app patterns (see `banners.tsx` or `supported-countries.tsx` for reference).
- [ ] **GREEN** — Verify: route file exists, renders module table. TypeScript compiles clean.

### 9. Module edit dialog — General tab

- [ ] **RED** — Check: no edit dialog component exists in admin-app for modules.
- [ ] **ACTION** — Create edit dialog (inline in modules.tsx or separate component). General tab with react-hook-form + zod: slug, icon, color, category (select: agriculture/elevage/functional), display_order, price_monthly, required_plan (select: null/essential/professional/enterprise), is_required, is_recommended, is_addon_eligible checkboxes. Save calls PATCH /admin/modules/:id.
- [ ] **GREEN** — Verify: editing a module's price and saving → re-fetching shows updated price.

### 10. Module edit dialog — Routes & Widgets tab

- [ ] **RED** — Check: no route/widget editor exists in the edit dialog.
- [ ] **ACTION** — Add "Routes & Widgets" tab to the dialog. Two list editors: (1) navigation_items — add/remove route path strings with text input + add button, (2) dashboard_widgets — add/remove widget ID strings. On save, PATCH module with updated JSONB arrays.
- [ ] **GREEN** — Verify: adding "/new-route" to navigation_items and saving → re-fetching module shows the new route in navigation_items.

### 11. Module edit dialog — Translations tab

- [ ] **RED** — Check: no translation editor exists in the edit dialog.
- [ ] **ACTION** — Add "Translations" tab. For each locale (fr, en, ar): name input, description textarea, features list (add/remove strings). On save per locale, PUT /admin/modules/:id/translations/:locale.
- [ ] **GREEN** — Verify: editing French translation and saving → re-fetching shows updated name in fr locale.

### 12. Add modules page to admin sidebar navigation

- [ ] **RED** — Check: admin-app sidebar does not have a "Modules" nav item.
- [ ] **ACTION** — Add nav item to admin-app sidebar pointing to `/modules`. Use Package icon. Place after "Subscription Model" in the nav order.
- [ ] **GREEN** — Verify: admin sidebar shows "Modules" link. Clicking it navigates to `/modules` page.
