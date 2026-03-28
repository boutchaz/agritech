# UI Consistency — Tasks

Batch 1: Replace all raw `<button>` with shadcn `<Button>` + fix i18n + add accessibility.

Each task targets a group of related files. RED = verify raw buttons exist, ACTION = replace them, GREEN = verify zero raw buttons remain + TypeScript compiles.

---

### 1. Tasks components (8 files)

- [x] **RED** — Run `grep -rn "<button" src/components/Tasks/ | grep -v "components/ui/"` and confirm raw `<button>` elements exist in: TaskDetailDialog, TaskDependencies, TaskChecklist, TasksList, TaskCommentInput, TaskAssignee, TasksKanban, TaskForm. Count the total.
- [x] **ACTION** — Replace all raw `<button>` with `<Button>` (appropriate variant/size). Convert status filter chips in TasksList to `Button` with variant swap. Add `aria-label` to icon-only buttons. Replace hardcoded strings with `t()`. Add `Button` import where missing. Add i18n keys to en/fr/ar locale files.
- [x] **GREEN** — Run `grep -rn "<button" src/components/Tasks/ | grep -v "components/ui/"` → 0 results. Run `cd project && npx tsc --noEmit` → no errors in changed files.

### 2. Dashboard components (12 files)

- [x] **RED** — Run `grep -rn "<button"` across Dashboard/, DashboardHome, Dashboard.tsx, DashboardSettings, LiveDashboard/ and confirm raw buttons exist.
- [x] **ACTION** — Replace all raw `<button>` with `<Button>`. Convert quick actions in DashboardHome to proper `<Button>` variants. Add `aria-label` to icon-only buttons. Fix i18n. Add imports and locale keys.
- [x] **GREEN** — Grep returns 0 raw buttons. `tsc --noEmit` passes.

### 3. Farm & Parcel components (16 files)

- [x] **RED** — Run `grep -rn "<button"` across FarmHierarchy/, FarmHierarchyManager, FarmHierarchyTree, FarmRoleManager, FarmSwitcher, ParcelCard, ParcelView, ParcelReportGenerator, Map, parcels/, SwipableParcelCards and confirm raw buttons exist.
- [x] **ACTION** — Replace all raw `<button>` with `<Button>`. Convert view mode toggles (e.g., in Map.tsx) to `Button size="icon" variant={active ? "default" : "ghost"}` with `aria-label`. Fix i18n. Add imports and locale keys.
- [x] **GREEN** — Grep returns 0 raw buttons (3 remaining in commented-out code). `tsc --noEmit` passes.

### 4. AI, Satellite & Calibration components (24 files)

- [x] **RED** — Run `grep -rn "<button"` across AIReportSection/, ai/, SatelliteAnalysisView/, SatelliteIndices, calibration/, adaptive/, WeatherAnalytics/ and confirm raw buttons exist.
- [x] **ACTION** — Replace all raw `<button>` with `<Button>`. Added Button import to 24 files. Replaced 74 raw buttons.
- [x] **GREEN** — Grep returns 0 raw buttons. `tsc --noEmit` passes.

### 5. Stock, Harvests, Workers & Payments components (14 files)

- [x] **RED** — Run `grep -rn "<button"` across StockManagement, Stock/, Harvests/, Workers/, DayLaborerManagement, EmployeeManagement, ProductApplications, Payments/ and confirm raw buttons exist.
- [x] **ACTION** — Replace all raw `<button>` with `<Button>`. Preserved `type="submit"` on form submit buttons. Replaced 76 raw buttons across 14 files.
- [x] **GREEN** — Grep returns 0 raw buttons. `tsc --noEmit` passes.

### 6. Analysis, Soil, Irrigation & Utilities components (12 files)

- [x] **RED** — Confirmed 89 raw buttons across 12 files.
- [x] **ACTION** — Replaced all 89 raw `<button>` with `<Button>`. Added Button imports to all files.
- [x] **GREEN** — Grep returns 0 raw buttons. `tsc --noEmit` passes.

### 7. Settings, Auth & Onboarding components (16 files)

- [x] **RED** — Confirmed 88 raw buttons across 16 files.
- [x] **ACTION** — Replaced all 88 raw `<button>` with `<Button>`. Added Button imports.
- [x] **GREEN** — Grep returns 0 raw buttons. `tsc --noEmit` passes.

### 8. Subscription, Navigation & Misc components (29 files)

- [x] **RED** — Confirmed 70 raw buttons across 29 files.
- [x] **ACTION** — Replaced all 70 raw `<button>` with `<Button>`. Added Button imports.
- [x] **GREEN** — Grep returns 0 raw buttons. `tsc --noEmit` passes.

### 9. Route files (26 files)

- [x] **RED** — Confirmed 94 raw buttons across 26 route files.
- [x] **ACTION** — Replaced all 94 raw `<button>` with `<Button>`. Preserved `type="submit"` on auth forms. Added Button imports.
- [x] **GREEN** — Grep returns 0 raw buttons. `tsc --noEmit` passes.

### 10. Final i18n locale sync

- [x] **RED** — Confirmed missing keys: 12 new common keys + tasks.checklist keys added during button replacement not yet in locale files.
- [x] **ACTION** — Added 12 common keys (retry, close, edit, clearSearch, resetFilters, viewAll, gridView, listView, dragHandle, toggleSatellite, satellite, map, fullscreen, exitFullscreen) + tasks.checklist keys to all 3 locale files with proper translations.
- [x] **GREEN** — All new keys present in en/fr/ar. Pre-existing sync gaps (not caused by this work) remain.

### 11. Full verification pass

- [x] **RED** — Found 16 stragglers: OrganizationSwitcher (8), RoleProtectedRoute (3), CSVBulkUpload (5).
- [x] **ACTION** — Fixed all 16 stragglers. Fixed Can.tsx JSDoc comments. `tsc --noEmit` passes.
- [x] **GREEN** — Zero active raw `<button>` outside `components/ui/`. 3 remain in commented-out dead code in Map.tsx. 1,301 total `<Button>` uses. TypeScript compiles clean.
