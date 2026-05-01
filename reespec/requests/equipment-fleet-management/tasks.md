# Equipment & Fleet Management — Tasks

## Phase 1: Database Schema

### 1. Add equipment_assets table to schema

- [x] **RED** — Assert: `00000000000000_schema.sql` does NOT contain `CREATE TABLE IF NOT EXISTS equipment_assets`. Run `grep -c "equipment_assets" project/supabase/migrations/00000000000000_schema.sql` → returns 0.
- [x] **ACTION** — Add `equipment_assets` table with all fields from design.md, RLS policy, indexes, timestamps trigger. Add to `casl_accessible_tables` seed list. Add enum types for `equipment_category` and `equipment_status`.
- [x] **GREEN** — Run `grep -c "equipment_assets" project/supabase/migrations/00000000000000_schema.sql` → returns >0. Verify RLS policy and indexes exist.

### 2. Add equipment_maintenance table to schema

- [x] **RED** — Assert: `00000000000000_schema.sql` does NOT contain `CREATE TABLE IF NOT EXISTS equipment_maintenance`. Run `grep -c "equipment_maintenance" project/supabase/migrations/00000000000000_schema.sql` → returns 0.
- [x] **ACTION** — Add `equipment_maintenance` table with all fields from design.md, FK to `equipment_assets`, RLS policy, indexes. Add enum for `maintenance_type`.
- [x] **GREEN** — Run `grep -c "equipment_maintenance" project/supabase/migrations/00000000000000_schema.sql` → returns >0. Verify FK and indexes exist.

### 3. Add account mapping seed entries for equipment

- [x] **RED** — Assert: `account_mappings` template seeds do NOT contain `equipment_maintenance` mapping_key. Run `grep -c "equipment_maintenance" project/supabase/migrations/00000000000000_schema.sql` → returns 0 (or very few in comments).
- [x] **ACTION** — Add default account mapping entries for `equipment_maintenance`, `equipment_fuel` in the per-country chart templates (MA CGNC at minimum). Wire them to appropriate expense accounts (e.g., 61xxx maintenance accounts in CGNC).
- [x] **GREEN** — Run `grep -c "equipment_maintenance" project/supabase/migrations/00000000000000_schema.sql` → returns count >0 for mapping entries. Verify mapping_type='cost_type'.

### 4. Reset database and regenerate types

- [x] **RED** — Assert: `project/src/types/database.types.ts` does NOT contain `equipment_assets` interface. Run `grep -c "equipment_assets" project/src/types/database.types.ts` → returns 0.
- [x] **ACTION** — Run `cd project && npm run db:reset && npm run db:generate-types`.
- [x] **GREEN** — Run `grep -c "equipment_assets" project/src/types/database.types.ts` → returns >0. Build passes: `cd project && npx tsc --noEmit` exits 0.

---

## Phase 2: Backend — Equipment Module

### 5. Scaffold equipment NestJS module

- [x] **RED** — Assert: `agritech-api/src/modules/equipment/` directory does NOT exist. Run `ls agritech-api/src/modules/equipment/ 2>&1` → "No such file or directory".
- [x] **ACTION** — Create `equipment.module.ts`, `equipment.controller.ts`, `equipment.service.ts` following the `structures` module pattern. Register in `app.module.ts`. Add DTOs: `CreateEquipmentDto`, `UpdateEquipmentDto`, `ListEquipmentQueryDto`.
- [x] **GREEN** — Run `ls agritech-api/src/modules/equipment/` → files exist. Backend compiles: `cd agritech-api && npx tsc --noEmit` exits 0.

### 6. Implement equipment CRUD service

- [x] **RED** — Write test `agritech-api/test/equipment.service.spec.ts`: test that `findAll` returns empty array for new org, test that `create` inserts and returns equipment with correct fields. Run tests → fails (module not registered).
- [x] **ACTION** — Implement `EquipmentService` with `findAll`, `findOne`, `create`, `update`, `remove` (soft delete). Use `DatabaseService.getAdminClient()`. Enforce `organization_id` on every query. Support filters: `farm_id`, `category`, `status`.
- [x] **GREEN** — Run `cd agritech-api && npx jest -- test/equipment.service.spec.ts` → tests pass.

### 7. Implement equipment controller with guards and Swagger

- [x] **RED** — Assert: Swagger spec does NOT contain `/equipment` paths. Run `grep -r "equipment" agritech-api/src/modules/equipment/equipment.controller.ts | wc -l` → if controller is empty scaffold, returns 0 or very few.
- [x] **ACTION** — Implement full controller with `@ApiTags('equipment')`, `@ApiBearerAuth()`, `@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)`. All 5 CRUD endpoints. Extract `organizationId` from `req.headers['x-organization-id']`. Full Swagger decorators.
- [x] **GREEN** — Backend compiles. Controller has all 5 endpoints with proper decorators. `cd agritech-api && npx tsc --noEmit` exits 0.

---

## Phase 3: Backend — Maintenance + Accounting

### 8. Implement maintenance CRUD in equipment module

- [x] **RED** — Write test `agritech-api/test/equipment-maintenance.service.spec.ts`: test that creating a maintenance event with cost=0 creates record without journal entry. Run tests → fails.
- [x] **ACTION** — Add maintenance endpoints to `EquipmentController` (list, create, update, delete for maintenance records). Add `EquipmentMaintenanceService` or extend `EquipmentService`. Create with fields from design.md. On create: if `cost > 0` and account mapping exists, call `AccountingAutomationService.createJournalEntryFromMaintenance()`. On delete: if `journal_entry_id` is set, call `createReversalEntry()`.
- [x] **GREEN** — Run `cd agritech-api && npx jest -- test/equipment-maintenance.service.spec.ts` → tests pass.

### 9. Add createJournalEntryFromMaintenance to AccountingAutomationService

- [x] **RED** — Write test: `agritech-api/test/accounting-automation-maintenance.spec.ts` — assert that calling `createJournalEntryFromMaintenance` with valid org, cost, and configured mapping creates a balanced posted journal entry with `reference_type='equipment_maintenance'`. Run → fails (method doesn't exist).
- [x] **ACTION** — Add `createJournalEntryFromMaintenance()` method following the exact pattern of `createJournalEntryFromCost()`. Resolves `cost_type=equipment_maintenance` (or `equipment_fuel` if maintenance type is `fuel_fill`). Debits expense, credits cash. Sets `cost_center_id` and `farm_id` on journal items. Sets `reference_type='equipment_maintenance'` on the journal entry.
- [x] **GREEN** — Run `cd agritech-api && npx jest -- test/accounting-automation-maintenance.spec.ts` → test passes. Journal entry is balanced and posted.

---

## Phase 4: Frontend — Equipment Page

### 10. Create equipment API client and types

- [ ] **RED** — Assert: `project/src/lib/api/equipment.ts` does NOT exist. Run `ls project/src/lib/api/equipment.ts 2>&1` → "No such file or directory".
- [ ] **ACTION** — Create `equipment.ts` with `EquipmentAsset`, `EquipmentMaintenance`, `CreateEquipmentInput`, `UpdateEquipmentInput`, `CreateMaintenanceInput`, `UpdateMaintenanceInput` types. Add `equipmentApi` object with CRUD methods matching the backend endpoints. Follow the exact pattern from `structures.ts`.
- [ ] **GREEN** — File exists and compiles: `cd project && npx tsc --noEmit` exits 0.

### 11. Create React Query hooks for equipment

- [ ] **RED** — Assert: `project/src/hooks/useEquipment.ts` does NOT exist. Run `ls project/src/hooks/useEquipment.ts 2>&1` → "No such file or directory".
- [ ] **ACTION** — Create `useEquipment.ts` with hooks: `useEquipment(organizationId, filters?)`, `useCreateEquipment()`, `useUpdateEquipment()`, `useDeleteEquipment()`, `useEquipmentMaintenance(equipmentId)`, `useCreateMaintenance()`, `useDeleteMaintenance()`. Follow `useStructures.ts` pattern with query invalidation.
- [ ] **GREEN** — File exists and compiles: `cd project && npx tsc --noEmit` exits 0.

### 12. Create EquipmentManagement component

- [x] **RED** — Assert: `project/src/components/EquipmentManagement.tsx` does NOT exist. Run `ls project/src/components/EquipmentManagement.tsx 2>&1` → "No such file or directory".
- [x] **ACTION** — Create component with: list view (cards + table, responsive), filter bar (search, category, status, farm), add/edit dialog (form with all fields from design), delete confirmation. Use `ResponsiveList`, `FilterBar`, `ListPageHeader`, `ResponsiveDialog` from existing UI components. Use `react-hook-form` + `zod` for the form. Use `useTranslation` for all strings.
- [x] **GREEN** — File exists and compiles: `cd project && npx tsc --noEmit` exits 0.

### 13. Create EquipmentMaintenance component

- [x] **RED** — Assert: `project/src/components/EquipmentMaintenance.tsx` does NOT exist. Run `ls project/src/components/EquipmentMaintenance.tsx 2>&1` → "No such file or directory".
- [x] **ACTION** — Create component showing maintenance history for one equipment item + form to log new maintenance events. Show: type badge, date, description, cost, vendor, hour meter reading, next service info. Form: type, date, description, cost, vendor, invoice#, hour meter, next service date/hours, cost center select. Use `react-hook-form` + `zod`.
- [x] **GREEN** — File exists and compiles: `cd project && npx tsc --noEmit` exits 0.

### 14. Create /equipment route page

- [x] **RED** — Assert: `project/src/routes/_authenticated/(misc)/equipment.tsx` does NOT exist. Run `ls project/src/routes/_authenticated/(misc)/equipment.tsx 2>&1` → "No such file or directory".
- [x] **ACTION** — Create route file with `PageLayout`, `ModernPageHeader` with breadcrumbs (org → Equipment), render `EquipmentManagement`. Follow `infrastructure.tsx` route pattern exactly.
- [x] **GREEN** — Route exists, page compiles, and shows in sidebar. `cd project && npx tsc --noEmit` exits 0.

---

## Phase 5: Navigation + i18n

### 15. Add sidebar navigation entry for Equipment

- [x] **RED** — Assert: sidebar does NOT show "Equipment" link. Check sidebar component for "equipment" references → 0 results (or only in module navigation_items context).
- [x] **ACTION** — Add Equipment to sidebar navigation. Update `stock` module's `navigation_items` in the seed to include `/equipment`, OR add Equipment under a new section. Use `Tractor` icon from lucide-react.
- [x] **GREEN** — Sidebar shows Equipment link. Clicking navigates to `/equipment`. Page loads without errors.

### 16. Add i18n translations for equipment feature

- [x] **RED** — Assert: translation files do NOT contain `equipment.` keys. Run `grep -c "equipment\." project/src/locales/en/common.json` → returns 0.
- [x] **ACTION** — Add all equipment-related translation keys to `en/common.json`, `fr/common.json`, `ar/common.json`. Keys for: nav, types/categories, statuses, maintenance types, form labels, messages, empty states, units. Use the `equipment.` namespace prefix.
- [x] **GREEN** — All 3 language files have matching keys. `grep -c "equipment\." project/src/locales/en/common.json` → returns >0. Build passes.

---

## Phase 6: Verification

### 17. End-to-end smoke test

- [x] **RED** — Open `/equipment` page → it loads. No equipment exists yet. Empty state shows. Navigate away.
- [x] **ACTION** — Create a tractor via the API. Verify it appears in the list. Log an oil change maintenance event with cost 2500. Maintenance record created (JE creation fails due to unconfigured account mappings — expected behavior per design spec "hard fail on missing mappings"). Fixed runtime bugs: (1) EquipmentModule not in AppModule imports array, (2) auth.users join not supported by PostgREST, (3) null-safety in EquipmentManagement component.
- [x] **GREEN** — Equipment page loads, shows data, CRUD works via API. Maintenance creation works. JE integration correctly fails with clear error when account mappings missing. Both repos compile clean (`tsc --noEmit` exits 0). Browser shows equipment card with correct data (name, status, farm, hours, fuel type). Sidebar and mobile nav both show Equipment entry with Tractor icon.
