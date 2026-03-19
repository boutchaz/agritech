# Mobile App Feature Parity — Full Web-to-Expo Port

## TL;DR

> **Quick Summary**: Port all web app functionality (~90+ routes, 97 hooks, 121 components across 8 domains) to the Expo mobile app, which currently has 8 screens and ~8-10% coverage. Build incrementally by domain, starting with foundation infrastructure, then workforce/production (highest value), then inventory/accounting/settings/misc.
> 
> **Deliverables**:
> - Complete mobile design system (15+ reusable components)
> - Navigation architecture (drawer + tabs + stacks)
> - i18n with en/fr/ar + RTL support
> - ~80+ new screens across all domains
> - ~90+ new data hooks for NestJS API
> - Offline caching for core features
> - Push notifications + deep linking
> 
> **Estimated Effort**: XL (6-9 months / 1 dev, 3-5 months / 2-3 devs)
> **Parallel Execution**: YES - 9 waves
> **Critical Path**: Foundation → Workforce/Production Core → Production Advanced → Polish

---

## Context

### Original Request
User wants full feature parity between the web app (`project/`) and the Expo mobile app (`mobile/`). Every feature available on web should also be available on mobile.

### Interview Summary
**Key Discussions**:
- **Goal**: Full feature parity (not field-worker focused, EVERYTHING)
- **Offline**: Nice to have, not critical — online-first approach
- **Current mobile coverage**: ~8-10% (8 screens, 4 hooks, 1 real component)

**Research Findings**:
- Web app uses direct Supabase queries (94 hooks); mobile uses NestJS REST API — hooks CANNOT be ported directly
- Mobile `ui/`, `forms/`, `layout/` directories are completely empty — zero reusable components
- i18n package installed but zero configuration or locale files
- The NestJS API has 96 modules — endpoint coverage needs auditing before building screens
- Complex web features (satellite heatmaps, AI calibration, accounting reports) need mobile UX adaptation
- Mobile already has solid auth flow (login, biometric, org-switch, CASL abilities)

### Metis Review
**Identified Gaps** (addressed):
- **API Endpoint Audit**: Added as Task 1 — must verify NestJS endpoints exist before building screens
- **i18n not configured**: Added dedicated i18n setup task with RTL support
- **Navigation architecture**: Current 5-tab layout insufficient for 8+ domains — needs drawer + stacks
- **No testing infrastructure**: Added test setup in foundation and test criteria per task
- **PDF generation**: Server-side generation + mobile download (NOT client-side jspdf)
- **Charts**: Pick one library (victory-native), accept simplified mobile visualizations
- **Role-based navigation**: CASL abilities must gate navigation items, not just content

---

## Work Objectives

### Core Objective
Achieve feature parity between the web application and Expo mobile app, enabling users to perform ALL operations available on web from their mobile devices.

### Concrete Deliverables
- Mobile design system with 15+ reusable components
- Navigation with drawer (domain switching) + tabs + nested stacks
- i18n supporting en, fr, ar (with RTL)
- 80+ new screens covering: Production, Workforce, Inventory, Accounting, Settings, Misc
- 90+ TanStack Query hooks for all NestJS API endpoints
- Form infrastructure with react-hook-form + zod validation
- Offline caching for tasks, harvests, parcels
- Push notifications with deep linking to specific screens

### Definition of Done
- [ ] All web domains have mobile equivalents: `cd mobile && npx tsc --noEmit`
- [ ] All API calls succeed: verified via curl against every endpoint
- [ ] Navigation works for all roles: CASL abilities gate screen visibility
- [ ] i18n: all user-facing strings use `t()`, ar locale triggers RTL
- [ ] No TypeScript errors: `cd mobile && npx tsc --noEmit` passes
- [ ] No lint errors: `cd mobile && npx eslint . --ext .ts,.tsx` passes

### Must Have
- Every web domain represented on mobile (may have simplified UX)
- Role-based navigation — different roles see different menu items
- i18n from day one — translation keys, not hardcoded strings
- Design system components shared across all screens
- Form validation with Zod (matching web validation rules)
- Pull-to-refresh and infinite scroll for all lists

### Must NOT Have (Guardrails)
- ❌ Direct Supabase queries — ALL data through NestJS API via `api.ts` client
- ❌ Hardcoded strings — ALL text through `t()` function
- ❌ Inline styles for reusable patterns — use design system components
- ❌ Client-side PDF generation — server generates, mobile downloads/shares
- ❌ Pixel-for-pixel web clones — mobile needs adapted UX (tables→lists, modals→sheets)
- ❌ Horizontal scrolling tables — use card-based list views
- ❌ Offline-first architecture — online-first with optional caching
- ❌ `as any`, `@ts-ignore`, `@ts-expect-error` — strict TypeScript
- ❌ Empty catch blocks — all errors logged + user-facing toast
- ❌ Navigation deeper than 3 levels (tab → list → detail)

### Explicit Exclusions (Web features NOT ported to mobile)
- `(desktop)/*` routes — Tauri desktop-only features
- `(public)/pitch-deck`, `(public)/blog/*` — Marketing pages
- `(public)/checkout-success` — Web payment flow (use in-app purchase or redirect)
- `settings.danger-zone` — Destructive admin actions stay web-only
- `settings.account-mappings` — Complex accounting config stays web-only
- Full accounting reports rendered on mobile (balance sheet tables etc.) — view summary + download PDF instead

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (jest + jest-expo in devDependencies, zero test files)
- **Automated tests**: Tests-after (each task includes smoke render tests)
- **Framework**: jest + jest-expo (already configured)
- **E2E**: Maestro flows for critical paths (added in polish phase)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Screens/UI**: Use Bash (`npx expo start --no-dev`) + Maestro or manual tmux verification
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Components**: Use Bash (jest) — Import, render, assert output
- **Navigation**: Use Bash + Maestro flows — Navigate through screens, verify transitions

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately, ALL parallel):
├── Task 1: API Endpoint Gap Audit [deep]
├── Task 2: Design System — Core Components [visual-engineering]
├── Task 3: Design System — Form Components [visual-engineering]
├── Task 4: i18n Setup + RTL + Locale Files [quick]
├── Task 5: Navigation Architecture (drawer + tabs + stacks) [visual-engineering]
└── Task 6: Shared Hooks Infrastructure + Query Patterns [quick]

Wave 2 (Domain Core — after Wave 1, MAX PARALLEL):
├── Task 7: Workforce — Tasks Full CRUD + Calendar (depends: 2,3,5,6) [deep]
├── Task 8: Workforce — Workers + Day Laborers + Employees (depends: 2,3,5,6) [unspecified-high]
├── Task 9: Production — Farm Hierarchy + Parcels List (depends: 2,5,6) [unspecified-high]
├── Task 10: Production — Harvests Enhancement + Crop Cycles (depends: 2,3,5,6) [unspecified-high]
├── Task 11: Inventory — Items, Variants, Warehouses (depends: 2,3,5,6) [unspecified-high]
└── Task 12: Settings — Profile, Account, Organization (depends: 2,3,5,6) [unspecified-high]

Wave 3 (Domain Detail — after Wave 2, MAX PARALLEL):
├── Task 13: Production — Parcel Detail + Sub-views (depends: 9) [deep]
├── Task 14: Production — Quality Control + Trees + Pruning (depends: 9,10) [unspecified-high]
├── Task 15: Inventory — Stock Entries, Reception, Suppliers (depends: 11) [unspecified-high]
├── Task 16: Accounting — Chart of Accounts + Journal Entries (depends: 2,3,5,6) [deep]
├── Task 17: Accounting — Customers + Suppliers Management (depends: 2,3,5,6) [unspecified-high]
├── Task 18: Workforce — Time Tracking Enhancement (depends: 7) [unspecified-high]
└── Task 19: Settings — Users, Modules, Subscription, Preferences (depends: 12) [unspecified-high]

Wave 4 (Advanced Features — after Wave 3, MAX PARALLEL):
├── Task 20: Production — Weather Dashboard + Forecasts (depends: 13) [visual-engineering]
├── Task 21: Production — AI Recommendations (read-only) (depends: 13) [unspecified-high]
├── Task 22: Production — Satellite Data Viewer (depends: 13) [deep]
├── Task 23: Production — Soil Analysis (depends: 13) [unspecified-high]
├── Task 24: Accounting — Invoices + Payments (depends: 16,17) [deep]
├── Task 25: Accounting — Quotes, Sales/Purchase Orders (depends: 16,17) [deep]
└── Task 26: Inventory — Stock Reports + Dashboard (depends: 15) [visual-engineering]

Wave 5 (Remaining Features — after Wave 3, MAX PARALLEL):
├── Task 27: Accounting — Financial Dashboard + PDF Reports (depends: 24,25) [visual-engineering]
├── Task 28: Misc — Notifications Center (depends: 5,6) [unspecified-high]
├── Task 29: Misc — Marketplace (depends: 2,3,5,6) [unspecified-high]
├── Task 30: Misc — Infrastructure + Lab Services (depends: 2,5,6) [unspecified-high]
├── Task 31: Misc — Compliance + Pest Alerts (depends: 2,5,6) [unspecified-high]
└── Task 32: Core — Dashboard Enhancement + Analytics (depends: 6) [visual-engineering]

Wave 6 (Polish — after ALL implementation):
├── Task 33: Offline Caching Enhancement [deep]
├── Task 34: Push Notifications + Deep Linking [unspecified-high]
├── Task 35: Performance Optimization + App State Management [deep]
└── Task 36: Comprehensive Test Suite + Maestro E2E [deep]

Wave FINAL (Verification — after ALL tasks, 4 parallel):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Code Quality Review (unspecified-high)
├── Task F3: Real Manual QA (unspecified-high)
└── Task F4: Scope Fidelity Check (deep)

Critical Path: Task 1-6 → Task 9 → Task 13 → Task 22 → Task 33-36 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 7 (Waves 2, 3, 4)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | ALL (audit informs API gaps) | 1 |
| 2 | — | 7-32 | 1 |
| 3 | — | 7-32 | 1 |
| 4 | — | 7-32 | 1 |
| 5 | — | 7-32 | 1 |
| 6 | — | 7-32 | 1 |
| 7 | 2,3,5,6 | 18 | 2 |
| 8 | 2,3,5,6 | — | 2 |
| 9 | 2,5,6 | 13,14 | 2 |
| 10 | 2,3,5,6 | 14 | 2 |
| 11 | 2,3,5,6 | 15 | 2 |
| 12 | 2,3,5,6 | 19 | 2 |
| 13 | 9 | 20,21,22,23 | 3 |
| 14 | 9,10 | — | 3 |
| 15 | 11 | 26 | 3 |
| 16 | 2,3,5,6 | 24,25 | 3 |
| 17 | 2,3,5,6 | 24,25 | 3 |
| 18 | 7 | — | 3 |
| 19 | 12 | — | 3 |
| 20 | 13 | — | 4 |
| 21 | 13 | — | 4 |
| 22 | 13 | — | 4 |
| 23 | 13 | — | 4 |
| 24 | 16,17 | 27 | 4 |
| 25 | 16,17 | 27 | 4 |
| 26 | 15 | — | 4 |
| 27 | 24,25 | — | 5 |
| 28 | 5,6 | — | 5 |
| 29 | 2,3,5,6 | — | 5 |
| 30 | 2,5,6 | — | 5 |
| 31 | 2,5,6 | — | 5 |
| 32 | 6 | — | 5 |
| 33 | ALL impl | — | 6 |
| 34 | ALL impl | — | 6 |
| 35 | ALL impl | — | 6 |
| 36 | ALL impl | — | 6 |

### Agent Dispatch Summary

- **Wave 1**: **6 tasks** — T1→`deep`, T2→`visual-engineering`, T3→`visual-engineering`, T4→`quick`, T5→`visual-engineering`, T6→`quick`
- **Wave 2**: **6 tasks** — T7→`deep`, T8→`unspecified-high`, T9→`unspecified-high`, T10→`unspecified-high`, T11→`unspecified-high`, T12→`unspecified-high`
- **Wave 3**: **7 tasks** — T13→`deep`, T14→`unspecified-high`, T15→`unspecified-high`, T16→`deep`, T17→`unspecified-high`, T18→`unspecified-high`, T19→`unspecified-high`
- **Wave 4**: **7 tasks** — T20→`visual-engineering`, T21→`unspecified-high`, T22→`deep`, T23→`unspecified-high`, T24→`deep`, T25→`deep`, T26→`visual-engineering`
- **Wave 5**: **6 tasks** — T27→`visual-engineering`, T28→`unspecified-high`, T29→`unspecified-high`, T30→`unspecified-high`, T31→`unspecified-high`, T32→`visual-engineering`
- **Wave 6**: **4 tasks** — T33→`deep`, T34→`unspecified-high`, T35→`deep`, T36→`deep`
- **FINAL**: **4 tasks** — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [x] 1. API Endpoint Gap Audit

  **What to do**:
  - Enumerate ALL 94 web hooks in `project/src/hooks/` — extract the Supabase queries each makes (table, select, filters, joins)
  - For each web hook's query, check if an equivalent NestJS API endpoint exists in `agritech-api/src/modules/`
  - Document gaps: web queries with no API equivalent (these need backend work BEFORE mobile screens)
  - For existing mobile API endpoints in `mobile/src/lib/api.ts`, verify they return the same data shape the web uses
  - Produce a gap report: `mobile/docs/api-audit.md` with columns: Web Hook | Supabase Query | NestJS Endpoint | Status (EXISTS/MISSING/PARTIAL)
  - Flag any endpoints that exist but return different data shapes

  **Must NOT do**:
  - Do NOT implement missing endpoints — just document gaps
  - Do NOT modify any API code

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires systematic cross-referencing of 94 hooks across two codebases with careful analysis
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: ALL subsequent tasks (audit informs API gaps)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `project/src/hooks/` — All 97 web hooks, each contains supabase.from() queries
  - `mobile/src/lib/api.ts:376-516` — Existing mobile API definitions (authApi, tasksApi, harvestsApi, farmsApi, parcelsApi, filesApi)
  - `mobile/src/hooks/useTasks.ts` — Example of a complete mobile hook that maps to API endpoints

  **API/Type References**:
  - `agritech-api/src/modules/` — All 96 NestJS modules with their controllers defining endpoints
  - `project/src/types/database.types.ts` — Web's Supabase-generated types (data shapes)

  **WHY Each Reference Matters**:
  - Web hooks show exactly what data the web app needs — each hook = 1 data requirement
  - NestJS modules show what the API already exposes — compare to identify gaps
  - Mobile api.ts shows what mobile already has wired up — baseline

  **Acceptance Criteria**:
  - [ ] Gap report produced with ALL 94 web hooks documented
  - [ ] Each hook mapped to: EXISTS (API endpoint found) / MISSING (no endpoint) / PARTIAL (endpoint exists but different data shape)
  - [ ] Summary count: X endpoints exist, Y missing, Z partial

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Audit report completeness
    Tool: Bash (grep + wc)
    Preconditions: Audit report exists at mobile/docs/api-audit.md
    Steps:
      1. Count rows in the audit table: grep -c '|' mobile/docs/api-audit.md
      2. Verify at least 90 entries (94 hooks minus a few utility hooks)
      3. Verify every row has a status column value: grep -cE '(EXISTS|MISSING|PARTIAL)' mobile/docs/api-audit.md
    Expected Result: 90+ rows, each with a status classification
    Failure Indicators: Fewer than 80 rows, or rows without status
    Evidence: .sisyphus/evidence/task-1-audit-completeness.txt

  Scenario: No web hooks missed
    Tool: Bash (diff)
    Preconditions: Audit report exists
    Steps:
      1. List all files in project/src/hooks/: ls project/src/hooks/*.ts | wc -l
      2. Compare count against audit report entries
      3. Verify no hook file is absent from the audit
    Expected Result: Every hook file appears in the audit report
    Failure Indicators: A hook file exists that isn't in the audit
    Evidence: .sisyphus/evidence/task-1-hooks-coverage.txt
  ```

  **Commit**: YES
  - Message: `docs(mobile): API endpoint gap audit — web-to-mobile parity`
  - Files: `mobile/docs/api-audit.md`

- [x] 2. Design System — Core Components

  **What to do**:
  - Create `mobile/src/components/ui/` with these components, all consuming theme tokens from `mobile/src/constants/theme.ts`:
    - `Button.tsx` — variants: primary, secondary, outline, ghost, destructive. States: loading, disabled
    - `Text.tsx` — semantic variants: heading, subheading, body, caption, label
    - `Card.tsx` — elevated card with optional header, footer, press handler
    - `Badge.tsx` — status badges (success, warning, error, info, neutral)
    - `Avatar.tsx` — image with fallback initials
    - `Divider.tsx` — horizontal/vertical separator
    - `EmptyState.tsx` — icon + title + subtitle + optional action button
    - `LoadingState.tsx` — centered spinner with optional message
    - `ErrorState.tsx` — error message with retry button
    - `Toast.tsx` — success/error/info toast notifications (use react-native-reanimated for animation)
    - `BottomSheet.tsx` — modal sheet from bottom (replaces web modals for mobile)
    - `SearchBar.tsx` — search input with debounce and clear button
    - `ListItem.tsx` — standard list row with left icon, title, subtitle, right chevron/action
    - `SegmentedControl.tsx` — tab-like segment for filter switching
    - `IconButton.tsx` — circular icon-only button
  - Create `mobile/src/components/ui/index.ts` barrel export
  - Each component must accept `testID` prop for testing
  - All colors/spacing/fontSize from theme.ts — zero hardcoded values
  - Write smoke render tests for each component in `mobile/src/components/ui/__tests__/`

  **Must NOT do**:
  - Do NOT install a UI library (NativeBase, Tamagui) — build from primitives
  - Do NOT use hardcoded colors — use `colors` from theme
  - Do NOT create complex composed components (that's Task 3)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI components with precise styling, animations, and visual states
  - **Skills**: [`design-system`]
    - `design-system`: Provides token architecture, component API patterns, accessibility guidance
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not browser-based

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6)
  - **Blocks**: Tasks 7-32 (all screens depend on these components)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `mobile/src/constants/theme.ts` — Design tokens (colors, spacing, borderRadius, fontSize, shadows) — ALL components must consume these
  - `mobile/app/(tabs)/tasks.tsx:156-279` — Example of inline StyleSheet patterns to extract into components (TaskCard → Card, filter buttons → SegmentedControl)
  - `mobile/app/(tabs)/index.tsx:18-59` — QuickAction and StatCard patterns to formalize into Card + Badge components

  **External References**:
  - React Native component patterns: use `Pressable` over `TouchableOpacity` for new components
  - `react-native-reanimated` (installed) — for Toast enter/exit animations

  **WHY Each Reference Matters**:
  - theme.ts defines the exact token values — components MUST use these, not their own
  - Existing screen code shows what patterns recur — extract these into components
  - Reanimated is already installed — use for smooth animations

  **Acceptance Criteria**:
  - [ ] 15 components created in `mobile/src/components/ui/`
  - [ ] Barrel export at `mobile/src/components/ui/index.ts`
  - [ ] All components use theme tokens: `grep -rL "from.*theme" mobile/src/components/ui/*.tsx` returns empty
  - [ ] All components accept `testID` prop
  - [ ] `cd mobile && npx tsc --noEmit` passes
  - [ ] Smoke tests exist: `cd mobile && npx jest --testPathPattern=components/ui`

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All 15 components exist and export correctly
    Tool: Bash
    Preconditions: Components created
    Steps:
      1. ls mobile/src/components/ui/*.tsx | wc -l → should be ≥15
      2. cat mobile/src/components/ui/index.ts → should export all 15 components
      3. cd mobile && npx tsc --noEmit → should pass with zero errors
    Expected Result: 15+ component files, barrel export includes all, TypeScript clean
    Failure Indicators: Missing files, missing exports, TS errors
    Evidence: .sisyphus/evidence/task-2-component-inventory.txt

  Scenario: No hardcoded colors in components
    Tool: Bash (grep)
    Preconditions: Components created
    Steps:
      1. grep -rn '#[0-9a-fA-F]\{3,6\}' mobile/src/components/ui/*.tsx — should return 0 matches
      2. grep -rn "color:" mobile/src/components/ui/*.tsx — verify all reference theme tokens
    Expected Result: Zero hardcoded hex colors; all colors reference theme.ts tokens
    Failure Indicators: Any hardcoded hex color found
    Evidence: .sisyphus/evidence/task-2-no-hardcoded-colors.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): design system core components — 15 reusable UI primitives`
  - Files: `mobile/src/components/ui/*`

- [x] 3. Design System — Form Components

  **What to do**:
  - Install `react-hook-form` and `@hookform/resolvers` in mobile
  - Create form components in `mobile/src/components/forms/`:
    - `FormField.tsx` — wrapper with label, error message, required indicator
    - `TextInput.tsx` — text input with validation states (error border, helper text)
    - `TextArea.tsx` — multiline text input
    - `Select.tsx` — modal-based single select (bottom sheet with options list)
    - `MultiSelect.tsx` — modal-based multi select with checkboxes
    - `DatePicker.tsx` — date selection using native date picker
    - `TimePicker.tsx` — time selection
    - `Switch.tsx` — toggle switch with label
    - `Checkbox.tsx` — checkbox with label
    - `RadioGroup.tsx` — radio button group
    - `NumberInput.tsx` — numeric input with increment/decrement
    - `ImagePicker.tsx` — photo capture/gallery selection using expo-image-picker
    - `LocationPicker.tsx` — GPS location capture with map preview using expo-location + react-native-maps
    - `FormProvider.tsx` — react-hook-form provider wrapper with zodResolver
  - Create `mobile/src/components/forms/index.ts` barrel export
  - Each form component must integrate with react-hook-form's Controller pattern
  - Write smoke tests in `mobile/src/components/forms/__tests__/`

  **Must NOT do**:
  - Do NOT create domain-specific forms (that happens in domain tasks)
  - Do NOT hardcode validation — forms use Zod schemas passed via zodResolver
  - Do NOT create complex multi-step forms yet

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Form UX requires careful state management, keyboard handling, and visual feedback
  - **Skills**: [`design-system`]
    - `design-system`: Form patterns, accessibility, validation UX
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: Not a React (web) project

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5, 6)
  - **Blocks**: Tasks 7-32 (all forms depend on these)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `mobile/src/components/ItemVariantSelector.tsx:56-313` — Existing modal-based select pattern (Item + Variant selection) — formalize into Select component
  - `project/src/components/ui/` — Web's shadcn-based form components for API inspiration
  - `mobile/app/(tabs)/clock.tsx` — Existing form-like inputs to refactor

  **API/Type References**:
  - `mobile/package.json:59` — `zod` already installed at ^3.23.0
  - `mobile/package.json:34` — `expo-image-picker` already installed
  - `mobile/package.json:39` — `expo-location` already installed

  **External References**:
  - react-hook-form docs: Controller pattern for RN — https://react-hook-form.com/get-started#ReactNative
  - @hookform/resolvers: zodResolver integration

  **WHY Each Reference Matters**:
  - ItemVariantSelector shows the modal-based select UX already established — formalize it
  - Zod + expo-image-picker + expo-location are already installed — no new deps needed except react-hook-form
  - Web form components show what patterns to adapt for mobile

  **Acceptance Criteria**:
  - [ ] 14 form components created in `mobile/src/components/forms/`
  - [ ] react-hook-form + @hookform/resolvers installed: `grep "react-hook-form" mobile/package.json`
  - [ ] All form components integrate with react-hook-form Controller
  - [ ] `cd mobile && npx tsc --noEmit` passes
  - [ ] Smoke tests: `cd mobile && npx jest --testPathPattern=components/forms`

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Form components integrate with react-hook-form
    Tool: Bash (grep)
    Preconditions: Form components created
    Steps:
      1. grep -rn "Controller\|useController" mobile/src/components/forms/*.tsx | wc -l → should be ≥10
      2. grep -rn "zodResolver" mobile/src/components/forms/FormProvider.tsx → should find import
      3. cd mobile && npx tsc --noEmit → passes
    Expected Result: All input components use Controller pattern, FormProvider includes zodResolver
    Failure Indicators: Components with standalone state instead of form integration
    Evidence: .sisyphus/evidence/task-3-form-integration.txt

  Scenario: Package dependencies installed
    Tool: Bash
    Preconditions: None
    Steps:
      1. grep "react-hook-form" mobile/package.json → should find entry
      2. grep "@hookform/resolvers" mobile/package.json → should find entry
      3. ls mobile/node_modules/react-hook-form → should exist
    Expected Result: Both packages in package.json and installed
    Failure Indicators: Missing from package.json or node_modules
    Evidence: .sisyphus/evidence/task-3-deps.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): form infrastructure — 14 form components with react-hook-form + zod`
  - Files: `mobile/src/components/forms/*`, `mobile/package.json`

- [x] 4. i18n Setup + RTL + Locale Files

  **What to do**:
  - Configure i18next in `mobile/src/lib/i18n.ts`:
    - Language detection from device locale via expo-localization
    - Fallback to English
    - Namespace-based organization matching web app structure
  - Create locale file structure mirroring web's `project/src/locales/`:
    - `mobile/src/locales/en/common.json` — shared keys (buttons, labels, errors)
    - `mobile/src/locales/en/navigation.json` — menu items, tab labels
    - `mobile/src/locales/en/auth.json` — login/auth strings
    - `mobile/src/locales/fr/` — French translations (copy structure, translate keys)
    - `mobile/src/locales/ar/` — Arabic translations (copy structure, translate keys)
  - Configure RTL support for Arabic:
    - Add `I18nManager.forceRTL(true)` when locale is 'ar'
    - Add RTL-aware style utilities
  - Create `useTranslation` wrapper hook if needed
  - Add i18n initialization to `mobile/app/_layout.tsx`
  - Convert existing hardcoded strings in current screens to use `t()` function
  - Add a language switcher component to Profile screen

  **Must NOT do**:
  - Do NOT translate all domain-specific content yet — just common/nav/auth namespaces
  - Do NOT create complex translation management — simple JSON files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration + JSON files + hook wiring, no complex logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `design-system`: i18n is infrastructure, not UI design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5, 6)
  - **Blocks**: Tasks 7-32 (all screens must use t())
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `project/src/locales/` — Web's translation file structure (en, fr, ar namespaces)
  - `mobile/app/(tabs)/index.tsx:78-83` — Example of hardcoded strings to convert: "Good morning", "Worker", "Select Farm"
  - `mobile/app/(tabs)/tasks.tsx:95-99` — Filter labels to translate: "All", "Pending", "Active", "Done"

  **API/Type References**:
  - `mobile/package.json:47-49` — i18next ^23.11.0 + react-i18next ^14.1.0 + expo-localization ~17.0.8 already installed

  **WHY Each Reference Matters**:
  - Web locales show the established translation key structure — maintain consistency
  - Existing hardcoded strings show what needs converting immediately
  - i18n packages already installed — just need configuration

  **Acceptance Criteria**:
  - [ ] i18n configured in `mobile/src/lib/i18n.ts`
  - [ ] Locale files exist for en, fr, ar with at minimum common + navigation + auth namespaces
  - [ ] `mobile/app/_layout.tsx` initializes i18n
  - [ ] Existing screens use `t()` for all user-facing strings: `grep -rn "t('" mobile/app/` shows usage
  - [ ] Arabic locale triggers RTL: `I18nManager.forceRTL` called when ar is selected
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: i18n configuration works
    Tool: Bash
    Preconditions: i18n configured
    Steps:
      1. Verify config file exists: ls mobile/src/lib/i18n.ts
      2. Verify locale files: ls mobile/src/locales/en/common.json mobile/src/locales/fr/common.json mobile/src/locales/ar/common.json
      3. Verify initialization: grep "i18n" mobile/app/_layout.tsx
      4. cd mobile && npx tsc --noEmit → passes
    Expected Result: Config exists, 3 locales with common namespace, layout initializes i18n
    Failure Indicators: Missing files, missing initialization
    Evidence: .sisyphus/evidence/task-4-i18n-setup.txt

  Scenario: No hardcoded strings remain in existing screens
    Tool: Bash (grep)
    Preconditions: i18n configured, existing screens converted
    Steps:
      1. grep -rn "Good morning\|Good afternoon\|Good evening" mobile/app/ → should return 0
      2. grep -rn "'Pending'\|'Active'\|'Done'" mobile/app/(tabs)/tasks.tsx → should return 0 (these should be t() calls)
    Expected Result: Zero hardcoded strings in converted screens
    Failure Indicators: Any hardcoded user-facing string found
    Evidence: .sisyphus/evidence/task-4-no-hardcoded-strings.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): i18n setup with en/fr/ar locales and RTL support`
  - Files: `mobile/src/lib/i18n.ts`, `mobile/src/locales/**`, `mobile/app/_layout.tsx`, `mobile/app/(tabs)/*.tsx`

- [x] 5. Navigation Architecture (Drawer + Tabs + Stacks)

  **What to do**:
  - Redesign navigation from current 5-tab-only layout to support 8+ domains:
    - **Drawer** (main level): Domain switching — Home, Production, Workforce, Inventory, Accounting, Settings, Misc
    - **Tabs** (per domain or for main): Context-appropriate tabs within each domain
    - **Stacks** (detail): Push screens for detail/edit views within each domain
  - Create route structure under `mobile/app/`:
    - `(drawer)/_layout.tsx` — Drawer navigation with domain menu items
    - `(drawer)/(home)/` — Dashboard tab group
    - `(drawer)/(production)/` — Production screens (parcels, harvests, crops, etc.)
    - `(drawer)/(workforce)/` — Workforce screens (tasks, workers, calendar)
    - `(drawer)/(inventory)/` — Inventory screens
    - `(drawer)/(accounting)/` — Accounting screens
    - `(drawer)/(settings)/` — Settings screens
    - `(drawer)/(misc)/` — Marketplace, lab services, etc.
  - Implement CASL-based menu visibility:
    - Read abilities from `useAbility()` hook
    - Hide drawer items user cannot access
    - Show appropriate empty state for unauthorized navigation attempts
  - Preserve existing tab-based UX for the home/field-worker view
  - Add breadcrumb-style header for navigation context

  **Must NOT do**:
  - Do NOT create placeholder screens for all domains yet — just the navigation structure
  - Do NOT go deeper than 3 navigation levels (drawer → list → detail)
  - Do NOT remove existing screens — migrate them into the new structure

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Navigation architecture is core UX with drawer, tabs, animations, and transitions
  - **Skills**: [`design-system`]
    - `design-system`: Navigation patterns, responsive layout considerations
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not browser-based

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 6)
  - **Blocks**: Tasks 7-32 (all screens live within this navigation)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `mobile/app/(tabs)/_layout.tsx` — Current tab layout to evolve/wrap with drawer
  - `mobile/app/_layout.tsx` — Root layout with auth check — must integrate drawer here
  - `project/src/components/Sidebar.tsx` — Web's sidebar with domain grouping — adapt for mobile drawer
  - `project/src/routes/_authenticated.tsx` — Web's authenticated layout with sidebar + content area

  **API/Type References**:
  - `mobile/src/hooks/useAbility.ts` — CASL ability hook for permission-based menu visibility
  - `mobile/src/lib/ability.ts` — Ability definitions used for authorization

  **WHY Each Reference Matters**:
  - Current tab layout shows what to preserve for the home/field view
  - Web sidebar shows the exact domain grouping to mirror in the drawer
  - Ability hook enables permission-gated navigation items

  **Acceptance Criteria**:
  - [ ] Drawer navigation with domain sections renders
  - [ ] Existing 5 tabs still work within the new structure (no regression)
  - [ ] CASL abilities hide/show drawer items based on user role
  - [ ] Navigation ≤3 levels deep everywhere
  - [ ] `cd mobile && npx tsc --noEmit` passes
  - [ ] Back navigation works correctly on all stack levels

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Drawer opens and shows domain items
    Tool: Bash
    Preconditions: Navigation architecture implemented
    Steps:
      1. Verify drawer layout exists: ls mobile/app/\(drawer\)/_layout.tsx
      2. Verify domain route groups exist: ls -d mobile/app/\(drawer\)/\(production\) mobile/app/\(drawer\)/\(workforce\) mobile/app/\(drawer\)/\(inventory\) mobile/app/\(drawer\)/\(accounting\)
      3. cd mobile && npx tsc --noEmit → passes
    Expected Result: Drawer layout + 6+ domain groups exist, no TS errors
    Failure Indicators: Missing layout files or domain groups
    Evidence: .sisyphus/evidence/task-5-navigation-structure.txt

  Scenario: Existing screens not broken
    Tool: Bash
    Preconditions: Migration complete
    Steps:
      1. Verify home screen exists in new structure
      2. Verify tasks screen exists in new structure
      3. Verify harvest screen exists in new structure
      4. cd mobile && npx tsc --noEmit → passes
    Expected Result: All existing screens accessible, no TS errors
    Failure Indicators: Missing screens, broken imports, TS errors
    Evidence: .sisyphus/evidence/task-5-no-regression.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): navigation architecture — drawer + domain routing + CASL gating`
  - Files: `mobile/app/(drawer)/**`, `mobile/app/_layout.tsx`

- [x] 6. Shared Hooks Infrastructure + Query Patterns

  **What to do**:
  - Create hook infrastructure following the existing `useTasks.ts` pattern:
    - `mobile/src/hooks/queryKeys.ts` — Centralized query key factory for ALL domains (prevents key collisions)
    - `mobile/src/hooks/useQueryConfig.ts` — Shared query configuration (staleTime defaults, retry config, error handling)
    - `mobile/src/hooks/usePagination.ts` — Infinite scroll pagination hook using TanStack Query's `useInfiniteQuery`
    - `mobile/src/hooks/useMutationWithToast.ts` — Mutation wrapper that shows toast on success/error
    - `mobile/src/hooks/useRefreshOnFocus.ts` — Refetch queries when app comes to foreground (AppState listener)
    - `mobile/src/hooks/useNetworkStatus.ts` — Network connectivity hook using @react-native-community/netinfo (already installed)
  - Extend `mobile/src/lib/api.ts` with generic CRUD helpers:
    - `createCrudApi<T>(basePath)` — returns { getAll, getById, create, update, delete } for any entity
    - Add request timeout (30s)
    - Add retry logic (1 retry on network error)
  - Set up QueryClient provider in `mobile/app/_layout.tsx` with:
    - Default staleTime: 5 minutes
    - Default gcTime: 30 minutes
    - Error boundary integration
    - Offline mutation persistence (TanStack Query's `PersistQueryClient`)

  **Must NOT do**:
  - Do NOT create domain-specific hooks yet (those come in domain tasks)
  - Do NOT implement complex offline sync — just basic query persistence
  - Do NOT modify existing working hooks (useTasks, useHarvests, useFarms)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Infrastructure utilities following established patterns, no complex UI
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `design-system`: Not UI-related

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4, 5)
  - **Blocks**: Tasks 7-32 (all hooks build on this infrastructure)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `mobile/src/hooks/useTasks.ts` — THE canonical hook pattern to follow: query key factory, staleTime, useQuery + useMutation, proper invalidation
  - `mobile/src/lib/api.ts:140-195` — Existing request method with auth header injection and token refresh — extend this
  - `mobile/src/lib/api.ts:260` — Singleton `api` client instance — all hooks use this

  **API/Type References**:
  - `mobile/package.json:24` — `@tanstack/react-query` ^5.51.0 already installed
  - `mobile/package.json:19` — `@react-native-community/netinfo` ^11.4.1 already installed

  **WHY Each Reference Matters**:
  - useTasks.ts is the gold standard — all new hooks must match its patterns exactly
  - api.ts client is the single point of API access — extend it, don't create alternatives
  - TanStack Query v5 supports PersistQueryClient for offline mutation queueing

  **Acceptance Criteria**:
  - [ ] Query key factory at `mobile/src/hooks/queryKeys.ts` with namespaces for all planned domains
  - [ ] Pagination hook works with `useInfiniteQuery`
  - [ ] Mutation wrapper shows toast on success/error
  - [ ] App foreground refetch works via AppState
  - [ ] Network status hook returns connectivity state
  - [ ] API client has request timeout (30s) and retry (1x)
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Query key factory covers all domains
    Tool: Bash (grep)
    Preconditions: queryKeys.ts created
    Steps:
      1. grep -c ":" mobile/src/hooks/queryKeys.ts → should have keys for: tasks, harvests, farms, parcels, workers, inventory, accounting, settings
      2. Verify no duplicate base keys
    Expected Result: 8+ domain key namespaces defined
    Failure Indicators: Missing domains, duplicate keys
    Evidence: .sisyphus/evidence/task-6-query-keys.txt

  Scenario: API client has timeout and retry
    Tool: Bash (grep)
    Preconditions: api.ts extended
    Steps:
      1. grep -n "timeout\|AbortController\|signal" mobile/src/lib/api.ts → should find timeout implementation
      2. grep -n "retry" mobile/src/lib/api.ts → should find retry logic
    Expected Result: Both timeout and retry present in API client
    Failure Indicators: Missing timeout or retry handling
    Evidence: .sisyphus/evidence/task-6-api-resilience.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile): shared hooks infrastructure — query keys, pagination, mutations, network status`
  - Files: `mobile/src/hooks/queryKeys.ts`, `mobile/src/hooks/use*.ts`, `mobile/src/lib/api.ts`

- [ ] 7. Workforce — Tasks Full CRUD + Calendar

  **What to do**:
  - Enhance existing task list (`tasks.tsx`) with: create task button, swipe-to-complete, bulk status update
  - Build task creation/edit form screen using form components from Task 3
  - Build task detail screen with: full details, comments, time logs, status transitions, assigned worker info
  - Build task calendar view using a calendar library (react-native-calendars) showing tasks by due date
  - Create hooks: `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useTaskComments`, `useTaskTimeLogs`
  - Add task assignment UI — select worker from workers list
  - Add task notifications — mark as read, quick actions from notification

  **Must NOT do**:
  - Do NOT build worker management (that's Task 8)
  - Do NOT modify the existing useTasks.ts hook — extend with new hooks alongside it

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Full CRUD with calendar integration, comments, time logs — multiple interacting screens
  - **Skills**: [`design-system`]
  - **Skills Evaluated but Omitted**: `playwright` (not browser)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11, 12)
  - **Blocks**: Task 18 (Time Tracking Enhancement)
  - **Blocked By**: Tasks 2, 3, 5, 6

  **References**:
  - `mobile/app/(tabs)/tasks.tsx` — Current read-only task list to enhance
  - `mobile/app/task/[id].tsx` — Current task detail to enhance
  - `mobile/src/hooks/useTasks.ts` — Existing hooks (useMyTasks, useTaskStatistics, useCreateTask etc.)
  - `mobile/src/lib/api.ts:396-439` — tasksApi with all endpoints (create, update, complete, clockIn/Out, comments)
  - `project/src/routes/_authenticated/(workforce)/tasks/` — Web's task views for feature reference
  - `project/src/components/Tasks/` — Web's task components for UI inspiration

  **Acceptance Criteria**:
  - [ ] Task create/edit form with validation (title required, priority selection, date picker, worker assignment)
  - [ ] Task detail shows comments, time logs, status transitions
  - [ ] Calendar view shows tasks by due date with color-coded status
  - [ ] Swipe-to-complete on task list items
  - [ ] All API calls through existing tasksApi
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Create a new task
    Tool: Bash (curl)
    Steps:
      1. curl -X POST $API_URL/api/v1/tasks -H "Authorization: Bearer $TOKEN" -H "x-organization-id: $ORG" -H "Content-Type: application/json" -d '{"title":"Test Task","priority":"high","status":"pending"}' → 201
      2. Verify response has id, title, priority fields
    Expected Result: Task created successfully with 201 status
    Evidence: .sisyphus/evidence/task-7-create-task.txt

  Scenario: Calendar view renders
    Tool: Bash
    Steps:
      1. cd mobile && npx tsc --noEmit → passes
      2. grep -rn "react-native-calendars" mobile/app/ → calendar component used
    Expected Result: Calendar component imported and used in task calendar screen
    Evidence: .sisyphus/evidence/task-7-calendar.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile/workforce): tasks full CRUD + calendar view`
  - Files: `mobile/app/(drawer)/(workforce)/**`, `mobile/src/hooks/useTasks*.ts`

- [ ] 8. Workforce — Workers + Day Laborers + Employees

  **What to do**:
  - Build workers list screen with search, filter by role/status
  - Build worker detail screen showing: profile info, assigned tasks, time logs, attendance
  - Build worker create/edit form (name, role, contact info, farm assignment)
  - Build day laborer management: daily attendance tracking, piece-work rate setting
  - Build employee management: contract details, scheduled hours
  - Create hooks: `useWorkers`, `useWorker`, `useCreateWorker`, `useUpdateWorker`, `useDayLaborers`, `useEmployees`
  - Add corresponding API methods to `api.ts` if not present

  **Must NOT do**:
  - Do NOT build payroll calculations
  - Do NOT build complex HR features

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 9, 10, 11, 12)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3, 5, 6

  **References**:
  - `project/src/routes/_authenticated/(workforce)/workers.tsx` — Web workers list
  - `project/src/routes/_authenticated/(workforce)/workers.$workerId.tsx` — Web worker detail
  - `project/src/components/Workers/` — Web worker components
  - `project/src/components/DayLaborerManagement.tsx` — Web day laborer management
  - `project/src/components/EmployeeManagement.tsx` — Web employee management
  - `project/src/hooks/useWorkers.ts` — Web workers hook (Supabase queries to replicate via API)

  **Acceptance Criteria**:
  - [ ] Workers list with search and role filter
  - [ ] Worker detail with tasks, time logs, attendance
  - [ ] Worker create/edit form with validation
  - [ ] Day laborer attendance tracking
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Workers list loads
    Tool: Bash (curl)
    Steps:
      1. curl $API_URL/api/v1/workers -H "Authorization: Bearer $TOKEN" -H "x-organization-id: $ORG" → 200
    Expected Result: Array of workers returned
    Evidence: .sisyphus/evidence/task-8-workers-list.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile/workforce): workers, day laborers, employee management`
  - Files: `mobile/app/(drawer)/(workforce)/**`, `mobile/src/hooks/useWorkers.ts`

- [ ] 9. Production — Farm Hierarchy + Parcels List

  **What to do**:
  - Build farm hierarchy screen showing: organizations → farms → parcels → sub-parcels tree view
  - Build parcels list screen with: search, filter by farm/status/crop, map view toggle
  - Build farm detail screen with: farm info, parcels list, weather summary, key metrics
  - Integrate react-native-maps for map view of parcels (plot polygon boundaries if GeoJSON available)
  - Create hooks: `useParcelsByFarm`, `useFarmHierarchy`, `useFarmDetail`, `useParcelSearch`
  - Add farm/parcel API methods to `api.ts` if not fully present

  **Must NOT do**:
  - Do NOT build parcel detail sub-views yet (that's Task 13)
  - Do NOT build satellite/AI features
  - Do NOT implement polygon editing on map

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 10, 11, 12)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Tasks 2, 5, 6

  **References**:
  - `project/src/routes/_authenticated/(production)/farm-hierarchy.tsx` — Web farm hierarchy
  - `project/src/routes/_authenticated/(production)/parcels.tsx` — Web parcels list
  - `project/src/components/FarmHierarchy/` — Web farm hierarchy components
  - `project/src/hooks/useFarmHierarchy.ts` — Web farm hierarchy hook
  - `project/src/hooks/useParcels.ts` — Web parcels hook
  - `mobile/src/lib/api.ts:496-505` — Existing parcelsApi (getParcels, getParcel)
  - `mobile/package.json:52` — react-native-maps already installed

  **Acceptance Criteria**:
  - [ ] Farm hierarchy tree view renders (org → farms → parcels)
  - [ ] Parcels list with search, farm filter, status filter
  - [ ] Map view showing parcel locations using react-native-maps
  - [ ] Farm detail screen with parcels and metrics
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Parcels list loads with farm filter
    Tool: Bash (curl)
    Steps:
      1. curl "$API_URL/api/v1/parcels?farm_id=$FARM_ID" -H "Authorization: Bearer $TOKEN" -H "x-organization-id: $ORG" → 200
    Expected Result: Array of parcels for the specified farm
    Evidence: .sisyphus/evidence/task-9-parcels-list.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile/production): farm hierarchy + parcels list + map view`
  - Files: `mobile/app/(drawer)/(production)/**`, `mobile/src/hooks/useParcels.ts`, `mobile/src/hooks/useFarmHierarchy.ts`

- [ ] 10. Production — Harvests Enhancement + Crop Cycles

  **What to do**:
  - Enhance existing harvest recording flow:
    - Multi-photo capture with camera + gallery
    - GPS location auto-capture
    - Quality grade selection
    - Crop type selection from parcel's configured crops
  - Build harvests history list with: date range filter, farm filter, crop filter, summary stats
  - Build harvest detail screen with: photos gallery, map location, quality info, edit capability
  - Build crop cycles management: create/view/edit crop cycles, link to parcels
  - Create hooks: `useCropCycles`, `useCreateCropCycle`, `useCrops`, `useHarvestStatistics`
  - Add API methods for crop cycles

  **Must NOT do**:
  - Do NOT build crop cycle profitability (Task 13)
  - Do NOT build crop templates management

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 11, 12)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 2, 3, 5, 6

  **References**:
  - `mobile/app/harvest/new.tsx` — Existing harvest creation screen to enhance
  - `mobile/app/(tabs)/harvest.tsx` — Existing harvest tab
  - `mobile/src/hooks/useHarvests.ts` — Existing harvest hook
  - `mobile/src/lib/api.ts:441-484` — harvestsApi with CRUD endpoints
  - `project/src/routes/_authenticated/(production)/harvests.tsx` — Web harvests
  - `project/src/routes/_authenticated/(production)/crop-cycles.tsx` — Web crop cycles
  - `project/src/hooks/useCrops.ts` — Web crops hook

  **Acceptance Criteria**:
  - [ ] Harvest form with multi-photo, GPS, quality grade, crop selection
  - [ ] Harvests history with date/farm/crop filters
  - [ ] Crop cycles list + create/edit
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Create harvest with photo
    Tool: Bash (curl)
    Steps:
      1. curl -X POST $API_URL/api/v1/organizations/$ORG/harvests -H "Authorization: Bearer $TOKEN" -d '{"farm_id":"$FARM","parcel_id":"$PARCEL","harvest_date":"2026-03-18","quantity":100,"unit":"kg"}' → 201
    Expected Result: Harvest created with 201 status
    Evidence: .sisyphus/evidence/task-10-create-harvest.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile/production): enhanced harvests + crop cycles management`
  - Files: `mobile/app/(drawer)/(production)/harvests/**`, `mobile/src/hooks/useHarvests.ts`, `mobile/src/hooks/useCropCycles.ts`

- [ ] 11. Inventory — Items, Variants, Warehouses

  **What to do**:
  - Build items list screen with: search, filter by group/status, item code display
  - Build item detail screen with: variants list, stock levels per warehouse, pricing
  - Build item create/edit form: name, code, unit, group, has_variants toggle
  - Build variant management: add/edit variants for an item, set pricing, track stock
  - Build warehouses list + detail: name, location, capacity, stock overview
  - Refactor existing `ItemVariantSelector.tsx` to use new design system components
  - Create hooks: `useItems`, `useItemVariants`, `useWarehouses`, `useCreateItem`, `useUpdateItem`
  - Add inventory API methods to `api.ts`

  **Must NOT do**:
  - Do NOT build stock entries/transactions (Task 15)
  - Do NOT build supplier management (Task 15)
  - Do NOT build stock reports (Task 26)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10, 12)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 2, 3, 5, 6

  **References**:
  - `mobile/src/components/ItemVariantSelector.tsx` — Existing item/variant selector to refactor
  - `project/src/routes/_authenticated/(inventory)/stock/items.tsx` — Web items list
  - `project/src/routes/_authenticated/(inventory)/stock/warehouses.tsx` — Web warehouses
  - `project/src/hooks/useItems.ts` — Web items hook
  - `project/src/hooks/useWarehouses.ts` — Web warehouses hook
  - `project/src/hooks/useInventory.ts` — Web inventory hook

  **Acceptance Criteria**:
  - [ ] Items list with search, filter by group
  - [ ] Item detail with variants and stock levels
  - [ ] Item create/edit form
  - [ ] Warehouses list + detail with stock overview
  - [ ] ItemVariantSelector refactored to use design system
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Items list API works
    Tool: Bash (curl)
    Steps:
      1. curl "$API_URL/api/v1/items?organization_id=$ORG" -H "Authorization: Bearer $TOKEN" → 200
    Expected Result: Items array returned
    Evidence: .sisyphus/evidence/task-11-items-list.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile/inventory): items, variants, warehouses management`
  - Files: `mobile/app/(drawer)/(inventory)/**`, `mobile/src/hooks/useItems.ts`, `mobile/src/hooks/useWarehouses.ts`

- [ ] 12. Settings — Profile, Account, Organization

  **What to do**:
  - Build profile settings screen: edit name, phone, avatar upload
  - Build account settings: change password, email display, biometric toggle
  - Build organization settings: view org info, switch organization
  - Build organization switcher component (enhance existing in authStore)
  - Build farm switcher component for production context
  - Create hooks: `useUpdateProfile`, `useChangePassword`, `useOrganization`
  - Migrate existing profile tab into settings section

  **Must NOT do**:
  - Do NOT build user management for admins (Task 19)
  - Do NOT build subscription/billing (Task 19)
  - Do NOT build module configuration (Task 19)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9, 10, 11)
  - **Blocks**: Task 19
  - **Blocked By**: Tasks 2, 3, 5, 6

  **References**:
  - `mobile/app/(tabs)/profile.tsx` — Current profile screen to evolve
  - `mobile/src/stores/authStore.ts` — Auth store with org switching
  - `project/src/routes/_authenticated/(settings)/settings.profile.tsx` — Web profile settings
  - `project/src/routes/_authenticated/(settings)/settings.account.tsx` — Web account settings
  - `project/src/routes/_authenticated/(settings)/settings.organization.tsx` — Web org settings
  - `project/src/components/OrganizationSwitcher.tsx` — Web org switcher

  **Acceptance Criteria**:
  - [ ] Profile edit with avatar upload
  - [ ] Password change form
  - [ ] Organization switcher works (clears query cache on switch)
  - [ ] Farm switcher for production context
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Profile update API
    Tool: Bash (curl)
    Steps:
      1. curl -X PATCH $API_URL/api/v1/auth/me -H "Authorization: Bearer $TOKEN" -d '{"first_name":"Test"}' → 200
    Expected Result: Profile updated
    Evidence: .sisyphus/evidence/task-12-profile-update.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile/settings): profile, account, organization settings`
  - Files: `mobile/app/(drawer)/(settings)/**`, `mobile/src/hooks/useProfile.ts`

- [ ] 13. Production — Parcel Detail + Sub-views

  **What to do**:
  - Build parcel detail screen with tabbed/segmented sub-views:
    - Overview: area, current crop, status, location map, key metrics
    - Production: linked harvests, crop cycles, yield history
    - Profitability: cost vs revenue summary (simplified from web's full charts)
    - Reports: downloadable PDF reports (server-generated)
  - Build parcel edit form: name, area, area_unit, status, crop assignment
  - Integrate react-native-maps for parcel boundary display (if GeoJSON available)
  - Create hooks: `useParcelDetail`, `useParcelProduction`, `useParcelProfitability`, `useUpdateParcel`

  **Must NOT do**:
  - Do NOT build satellite/AI/weather sub-views (Tasks 20-23)
  - Do NOT implement parcel boundary editing on map

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-19)
  - **Blocks**: Tasks 20, 21, 22, 23
  - **Blocked By**: Task 9

  **References**:
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.tsx` — Web parcel detail layout
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.index.tsx` — Web parcel overview
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.production.tsx` — Web production tab
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.profitability.tsx` — Web profitability
  - `project/src/hooks/useParcelData.ts` — Web parcel data hook
  - `project/src/hooks/useProfitabilityQuery.ts` — Web profitability hook

  **Acceptance Criteria**:
  - [ ] Parcel detail with segmented sub-views (overview, production, profitability, reports)
  - [ ] Parcel edit form
  - [ ] Map showing parcel location
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Parcel detail loads
    Tool: Bash (curl)
    Steps:
      1. curl $API_URL/api/v1/parcels/$PARCEL_ID -H "Authorization: Bearer $TOKEN" -H "x-organization-id: $ORG" → 200
    Expected Result: Parcel data returned with all fields
    Evidence: .sisyphus/evidence/task-13-parcel-detail.txt
  ```

  **Commit**: YES
  - Message: `feat(mobile/production): parcel detail with sub-views`
  - Files: `mobile/app/(drawer)/(production)/parcel/**`

- [ ] 14. Production — Quality Control + Trees + Pruning

  **What to do**:
  - Build quality control screen: record quality inspections, grade harvests, view QC history
  - Build tree management: tree inventory per parcel, tree health status, age tracking
  - Build pruning management: schedule pruning tasks, record completed pruning, link to trees
  - Create hooks: `useQualityControl`, `useTreeManagement`, `usePruning`
  - Add API methods for QC, trees, pruning

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Tasks 9, 10

  **References**:
  - `project/src/routes/_authenticated/(production)/quality-control.tsx` — Web QC
  - `project/src/routes/_authenticated/(production)/trees.tsx` — Web tree management
  - `project/src/routes/_authenticated/(production)/pruning.tsx` — Web pruning
  - `project/src/hooks/useTreeManagement.ts` — Web tree hook
  - `project/src/components/TreeManagement.tsx` — Web tree components

  **Acceptance Criteria**:
  - [ ] Quality control inspection form + history
  - [ ] Tree inventory per parcel
  - [ ] Pruning schedule + records
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(mobile/production): quality control, trees, pruning`
  - Files: `mobile/app/(drawer)/(production)/quality-control/**`, `mobile/app/(drawer)/(production)/trees/**`

- [ ] 15. Inventory — Stock Entries, Reception, Suppliers

  **What to do**:
  - Build stock entries screen: list entries, create new entry (in/out/transfer), entry detail
  - Build reception batches: receive incoming stock, record batch details, link to purchase order
  - Build suppliers list + detail: supplier info, purchase history, contact
  - Build supplier create/edit form
  - Create hooks: `useStockEntries`, `useCreateStockEntry`, `useReceptionBatches`, `useSuppliers`
  - Add API methods

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 26
  - **Blocked By**: Task 11

  **References**:
  - `project/src/routes/_authenticated/(inventory)/stock/entries.tsx` — Web stock entries
  - `project/src/routes/_authenticated/(inventory)/stock/reception.tsx` — Web reception
  - `project/src/routes/_authenticated/(inventory)/stock/suppliers.tsx` — Web suppliers
  - `project/src/hooks/useStockEntries.ts` — Web stock entries hook
  - `project/src/hooks/useSuppliers.ts` — Web suppliers hook
  - `project/src/hooks/useReceptionBatches.ts` — Web reception batches hook

  **Acceptance Criteria**:
  - [ ] Stock entries list with create (in/out/transfer types)
  - [ ] Reception batches recording
  - [ ] Suppliers CRUD
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(mobile/inventory): stock entries, reception batches, suppliers`
  - Files: `mobile/app/(drawer)/(inventory)/stock/**`, `mobile/src/hooks/useStockEntries.ts`

- [ ] 16. Accounting — Chart of Accounts + Journal Entries

  **What to do**:
  - Build chart of accounts screen: tree view of account hierarchy (assets, liabilities, equity, income, expense)
  - Build account detail screen: account info, recent transactions, balance
  - Build journal entries list: date filter, search, entry detail
  - Build journal entry creation form: date, debit/credit lines (multi-line form), narration
  - Ensure debit/credit balancing validation (total debits = total credits)
  - Create hooks: `useAccounts`, `useJournalEntries`, `useCreateJournalEntry`
  - Add API methods

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Double-entry accounting requires careful debit/credit balancing logic
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 24, 25
  - **Blocked By**: Tasks 2, 3, 5, 6

  **References**:
  - `project/src/routes/_authenticated/(accounting)/accounting/accounts.tsx` — Web accounts
  - `project/src/routes/_authenticated/(accounting)/accounting/journal.tsx` — Web journal
  - `project/src/hooks/useAccounts.ts` — Web accounts hook
  - `project/src/hooks/useJournalEntries.ts` — Web journal entries hook

  **Acceptance Criteria**:
  - [ ] Chart of accounts tree view
  - [ ] Journal entries list with date filter
  - [ ] Journal entry creation with debit/credit balancing
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(mobile/accounting): chart of accounts + journal entries`
  - Files: `mobile/app/(drawer)/(accounting)/accounts/**`, `mobile/src/hooks/useAccounts.ts`

- [ ] 17. Accounting — Customers + Suppliers Management

  **What to do**:
  - Build customers list + detail + create/edit form
  - Build accounting suppliers management (may overlap with inventory suppliers — shared or separate based on API)
  - Customer detail: contact info, outstanding balance, invoice history, payment history
  - Create hooks: `useCustomers`, `useCreateCustomer`, `useCustomerDetail`
  - Add API methods

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 24, 25
  - **Blocked By**: Tasks 2, 3, 5, 6

  **References**:
  - `project/src/routes/_authenticated/(accounting)/accounting/customers.tsx` — Web customers
  - `project/src/hooks/useCustomers.ts` — Web customers hook

  **Acceptance Criteria**:
  - [ ] Customers list with search
  - [ ] Customer detail with balance + history
  - [ ] Customer create/edit form
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(mobile/accounting): customers + suppliers management`
  - Files: `mobile/app/(drawer)/(accounting)/customers/**`, `mobile/src/hooks/useCustomers.ts`

- [ ] 18. Workforce — Time Tracking Enhancement

  **What to do**:
  - Enhance clock in/out screen with: GPS geofencing, task association, break tracking
  - Build time log history: view past clock entries, filter by date/worker/task
  - Build time summary dashboard: hours today/week/month, overtime tracking
  - Add background location tracking for delivery/field work (if user opts in)
  - Create hooks: `useTimeLogs`, `useTimeTracking`, `useTimeSummary`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 7

  **References**:
  - `mobile/app/(tabs)/clock.tsx` — Existing clock screen to enhance
  - `mobile/src/stores/timeTrackingStore.ts` — Existing time tracking Zustand store
  - `mobile/src/lib/api.ts:429-435` — Existing clockIn/clockOut/getTimeLogs API methods
  - `project/src/routes/_authenticated/(workforce)/workforce/tasks.calendar.tsx` — Web time tracking

  **Acceptance Criteria**:
  - [ ] Clock in/out with GPS capture
  - [ ] Time log history with filters
  - [ ] Time summary (daily/weekly/monthly)
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(mobile/workforce): enhanced time tracking with GPS + history`
  - Files: `mobile/app/(drawer)/(workforce)/clock/**`, `mobile/src/hooks/useTimeTracking.ts`

- [ ] 19. Settings — Users, Modules, Subscription, Preferences

  **What to do**:
  - Build users management screen (admin only): list users, invite user, change roles
  - Build module configuration: enable/disable modules (production, inventory, accounting, etc.)
  - Build subscription info screen: current plan, usage, upgrade options (link to web for payment)
  - Build preferences screen: language selector, theme (future dark mode), notification preferences
  - Build documents settings: document templates viewing
  - Build fiscal years management (simplified)
  - Create hooks: `useUsers`, `useModules`, `useSubscription`, `usePreferences`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 12

  **References**:
  - `project/src/routes/_authenticated/(settings)/settings.users.tsx` — Web users management
  - `project/src/routes/_authenticated/(settings)/settings.modules.tsx` — Web modules config
  - `project/src/routes/_authenticated/(settings)/settings.subscription.tsx` — Web subscription
  - `project/src/routes/_authenticated/(settings)/settings.preferences.tsx` — Web preferences

  **Acceptance Criteria**:
  - [ ] Users list with invite and role management (admin only)
  - [ ] Module toggle configuration
  - [ ] Subscription info display
  - [ ] Language selector integrated with i18n
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(mobile/settings): users, modules, subscription, preferences`
  - Files: `mobile/app/(drawer)/(settings)/**`, `mobile/src/hooks/useSettings.ts`

- [ ] 20. Production — Weather Dashboard + Forecasts

  **What to do**:
  - Build weather dashboard screen per parcel: current conditions, 7-day forecast, historical trends
  - Build weather alerts view: frost warnings, extreme heat, heavy rain
  - Use simplified chart visualization (victory-native or react-native-svg-charts) for temperature/precipitation trends
  - Create hooks: `useWeatherForecast`, `useWeatherAlerts`, `useWeatherAnalytics`
  - Add weather API methods

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`design-system`]

  **Parallelization**: Wave 4 | **Blocked By**: Task 13

  **References**:
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.weather.tsx` — Web weather view
  - `project/src/hooks/useWeatherForecast.ts` — Web weather hook
  - `project/src/components/WeatherAnalytics/` — Web weather components
  - `project/src/components/WeatherForecast.tsx` — Web weather forecast component

  **Acceptance Criteria**:
  - [ ] Weather dashboard with current conditions + 7-day forecast
  - [ ] Chart showing temperature/precipitation trends
  - [ ] Weather alerts display
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/production): weather dashboard + forecasts`

- [ ] 21. Production — AI Recommendations (read-only)

  **What to do**:
  - Build AI recommendations view per parcel: display AI-generated farming recommendations
  - Build AI alerts view: show AI-detected issues (pest risk, irrigation needs, etc.)
  - Build AI plan summary: view AI-generated cultivation plans
  - These are READ-ONLY views consuming existing API data — no AI processing on mobile
  - Create hooks: `useAIRecommendations`, `useAIAlerts`, `useAIPlan`

  **Must NOT do**:
  - Do NOT build AI calibration on mobile
  - Do NOT build AI diagnostics input on mobile
  - Do NOT run any AI models on-device

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**: Wave 4 | **Blocked By**: Task 13

  **References**:
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.recommendations.tsx` — Web AI recommendations
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.alerts.tsx` — Web AI alerts
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.plan.summary.tsx` — Web AI plan
  - `project/src/hooks/useAIRecommendations.ts` — Web AI hook
  - `project/src/hooks/useAIAlerts.ts` — Web AI alerts hook

  **Acceptance Criteria**:
  - [ ] AI recommendations list per parcel
  - [ ] AI alerts with severity indicators
  - [ ] AI plan summary view
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/production): AI recommendations + alerts (read-only)`

- [ ] 22. Production — Satellite Data Viewer

  **What to do**:
  - Build satellite indices view: display NDVI, EVI, NDWI values for parcel
  - Build satellite timeseries chart: show index values over time with date range selector
  - Display satellite data on react-native-maps as colored overlay (simplified heatmap)
  - NOTE: react-native-maps has limited heatmap support — use colored polygon fills instead of true heatmap
  - Create hooks: `useSatelliteIndices`, `useSatelliteTimeSeries`

  **Must NOT do**:
  - Do NOT build satellite heatmap editing
  - Do NOT build TIF file upload
  - Do NOT build calibration workflows

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires map integration + chart + data processing
  - **Skills**: [`design-system`]

  **Parallelization**: Wave 4 | **Blocked By**: Task 13

  **References**:
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.satellite.tsx` — Web satellite layout
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.satellite.index.tsx` — Web satellite indices
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.satellite.timeseries.tsx` — Web timeseries
  - `project/src/hooks/useSatelliteIndices.ts` — Web satellite hook
  - `project/src/hooks/useCachedSatelliteTimeSeries.ts` — Web timeseries hook

  **Acceptance Criteria**:
  - [ ] Satellite indices display (NDVI, EVI, NDWI values)
  - [ ] Timeseries chart with date range
  - [ ] Map with colored parcel overlay
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/production): satellite data viewer`

- [ ] 23. Production — Soil Analysis

  **What to do**:
  - Build soil analysis list per parcel: view past analyses
  - Build soil analysis detail: nutrients, pH, organic matter, recommendations
  - Build soil analysis form: record new analysis results
  - Create hooks: `useSoilAnalyses`, `useCreateSoilAnalysis`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**: Wave 4 | **Blocked By**: Task 13

  **References**:
  - `project/src/routes/_authenticated/(production)/production/soil-analysis.tsx` — Web soil analysis
  - `project/src/hooks/useSoilAnalyses.ts` — Web soil analyses hook
  - `project/src/components/SoilAnalysis/` — Web soil analysis components

  **Acceptance Criteria**:
  - [ ] Soil analyses list per parcel
  - [ ] Analysis detail with nutrient data
  - [ ] Create new analysis form
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/production): soil analysis`

- [ ] 24. Accounting — Invoices + Payments

  **What to do**:
  - Build invoices list: filter by status (draft/sent/paid/overdue), customer, date range
  - Build invoice detail: line items, totals, tax, payment status, attached files
  - Build invoice creation form: customer select, line items (add/remove), tax, due date
  - Build payments list: filter by type (incoming/outgoing), date, amount
  - Build payment recording form: amount, date, method, linked invoice/order
  - Create hooks: `useInvoices`, `useCreateInvoice`, `usePayments`, `useRecordPayment`

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`design-system`]

  **Parallelization**: Wave 4 | **Blocked By**: Tasks 16, 17

  **References**:
  - `project/src/routes/_authenticated/(accounting)/accounting/invoices.tsx` — Web invoices
  - `project/src/routes/_authenticated/(accounting)/accounting/payments.tsx` — Web payments
  - `project/src/hooks/useInvoices.ts` — Web invoices hook
  - `project/src/hooks/usePayments.ts` — Web payments hook

  **Acceptance Criteria**:
  - [ ] Invoices list with status/date filters
  - [ ] Invoice creation with line items
  - [ ] Payments list + recording
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/accounting): invoices + payments`

- [ ] 25. Accounting — Quotes, Sales Orders, Purchase Orders

  **What to do**:
  - Build quotes list + create/edit: customer, line items, validity date, convert to sales order
  - Build sales orders list + detail: order status tracking, linked invoices
  - Build purchase orders list + create: supplier, items, expected delivery, approval status
  - Create hooks: `useQuotes`, `useSalesOrders`, `usePurchaseOrders` with CRUD operations

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`design-system`]

  **Parallelization**: Wave 4 | **Blocked By**: Tasks 16, 17

  **References**:
  - `project/src/routes/_authenticated/(accounting)/accounting/quotes.tsx` — Web quotes
  - `project/src/routes/_authenticated/(accounting)/accounting/sales-orders.tsx` — Web sales orders
  - `project/src/routes/_authenticated/(accounting)/accounting/purchase-orders.tsx` — Web purchase orders
  - `project/src/hooks/useQuotes.ts` — Web quotes hook
  - `project/src/hooks/useSalesOrders.ts` — Web sales orders hook
  - `project/src/hooks/usePurchaseOrders.ts` — Web purchase orders hook

  **Acceptance Criteria**:
  - [ ] Quotes CRUD with line items
  - [ ] Sales orders with status tracking
  - [ ] Purchase orders with approval
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/accounting): quotes, sales orders, purchase orders`

- [ ] 26. Inventory — Stock Reports + Dashboard

  **What to do**:
  - Build stock dashboard: total items, low stock alerts, stock value summary
  - Build stock reports: stock level report, stock movement report
  - Build stock item groups view: group items, view group totals
  - Charts for stock trends using victory-native
  - Create hooks: `useStockReports`, `useStockDashboard`, `useItemGroups`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`design-system`]

  **Parallelization**: Wave 4 | **Blocked By**: Task 15

  **References**:
  - `project/src/routes/_authenticated/(inventory)/stock/reports.tsx` — Web stock reports
  - `project/src/routes/_authenticated/(inventory)/stock/groups.tsx` — Web item groups

  **Acceptance Criteria**:
  - [ ] Stock dashboard with summary cards
  - [ ] Low stock alerts
  - [ ] Stock level + movement reports
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/inventory): stock reports + dashboard`

- [ ] 27. Accounting — Financial Dashboard + PDF Reports

  **What to do**:
  - Build financial dashboard: revenue/expense summary, cash flow overview, AR/AP aging summary
  - Build reports download screen: Balance Sheet, P&L, Cash Flow, Trial Balance, General Ledger, Aged reports
  - Reports are SERVER-GENERATED PDFs — mobile triggers generation and downloads/shares the file
  - Use victory-native for dashboard charts (pie charts for expense categories, bar charts for monthly revenue)
  - Create hooks: `useFinancialDashboard`, `useDownloadReport`

  **Must NOT do**:
  - Do NOT render full accounting reports as tables on mobile
  - Do NOT generate PDFs on the client — server generates, mobile downloads

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`design-system`]

  **Parallelization**: Wave 5 | **Blocked By**: Tasks 24, 25

  **References**:
  - `project/src/routes/_authenticated/(accounting)/accounting/reports.tsx` — Web reports
  - `project/src/hooks/useFinancialReports.ts` — Web financial reports hook
  - `project/src/components/Accounting/` — Web accounting components

  **Acceptance Criteria**:
  - [ ] Financial dashboard with charts
  - [ ] Report download triggers server PDF generation
  - [ ] PDF file opens in device viewer or share sheet
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/accounting): financial dashboard + PDF report downloads`

- [ ] 28. Misc — Notifications Center

  **What to do**:
  - Build notifications list screen: all notifications grouped by date
  - Build notification detail/action: tap to navigate to relevant screen
  - Mark as read/unread, mark all as read
  - Integrate with existing `mobile/src/lib/notifications.ts`
  - Create hooks: `useNotifications`, `useMarkNotificationRead`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**: Wave 5 | **Blocked By**: Tasks 5, 6

  **References**:
  - `mobile/src/lib/notifications.ts` — Existing notification setup
  - `project/src/routes/_authenticated/(misc)/notifications.tsx` — Web notifications
  - `project/src/hooks/useNotifications.ts` — Web notifications hook
  - `project/src/components/NotificationBell.tsx` — Web notification bell

  **Acceptance Criteria**:
  - [ ] Notifications list grouped by date
  - [ ] Tap notification navigates to relevant screen
  - [ ] Mark as read/unread works
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/misc): notifications center`

- [ ] 29. Misc — Marketplace

  **What to do**:
  - Build marketplace browse screen: list products/services available
  - Build marketplace detail: product info, pricing, seller info
  - Build marketplace order flow: add to cart, place order (simplified)
  - Create hooks: `useMarketplace`, `useMarketplaceOrder`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`design-system`]

  **Parallelization**: Wave 5 | **Blocked By**: Tasks 2, 3, 5, 6

  **References**:
  - `project/src/routes/_authenticated/(misc)/marketplace.tsx` — Web marketplace
  - `project/src/routes/_authenticated/(misc)/marketplace/` — Web marketplace sub-routes
  - `project/src/components/Marketplace/` — Web marketplace components

  **Acceptance Criteria**:
  - [ ] Marketplace product list
  - [ ] Product detail view
  - [ ] Order placement flow
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/misc): marketplace`

- [ ] 30. Misc — Infrastructure + Lab Services

  **What to do**:
  - Build infrastructure management screen: view/manage farm infrastructure (irrigation, buildings, equipment)
  - Build lab services screen: view lab test results, request new tests
  - Create hooks: `useInfrastructure`, `useLabServices`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**: Wave 5 | **Blocked By**: Tasks 2, 5, 6

  **References**:
  - `project/src/routes/_authenticated/(misc)/infrastructure.tsx` — Web infrastructure
  - `project/src/routes/_authenticated/(misc)/lab-services.tsx` — Web lab services
  - `project/src/components/InfrastructureManagement.tsx` — Web infrastructure components
  - `project/src/hooks/useLabServices.ts` — Web lab services hook

  **Acceptance Criteria**:
  - [ ] Infrastructure list + detail
  - [ ] Lab services results + request form
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/misc): infrastructure + lab services`

- [ ] 31. Misc — Compliance + Pest Alerts

  **What to do**:
  - Build compliance dashboard: regulatory compliance status, checklist items, due dates
  - Build pest alerts screen: view active pest alerts, severity, recommended actions
  - Create hooks: `useCompliance`, `usePestAlerts`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**: Wave 5 | **Blocked By**: Tasks 2, 5, 6

  **References**:
  - `project/src/routes/_authenticated/compliance/` — Web compliance routes
  - `project/src/routes/_authenticated/pest-alerts/` — Web pest alerts
  - `project/src/hooks/useCompliance.ts` — Web compliance hook
  - `project/src/hooks/usePestAlerts.ts` — Web pest alerts hook

  **Acceptance Criteria**:
  - [ ] Compliance dashboard with checklist
  - [ ] Pest alerts with severity + actions
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/misc): compliance + pest alerts`

- [ ] 32. Core — Dashboard Enhancement + Analytics

  **What to do**:
  - Enhance home dashboard with: cross-domain summary cards (production, inventory, accounting, workforce)
  - Build analytics screen: key metrics with charts (harvests over time, revenue, task completion rate)
  - Implement dashboard based on module configuration (show/hide sections based on active modules)
  - Use victory-native for analytics charts
  - Create hooks: `useDashboardSummary`, `useAnalytics`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`design-system`]

  **Parallelization**: Wave 5 | **Blocked By**: Task 6

  **References**:
  - `mobile/app/(tabs)/index.tsx` — Current home dashboard to enhance
  - `project/src/routes/_authenticated/(core)/dashboard.tsx` — Web dashboard
  - `project/src/routes/_authenticated/(core)/analytics.tsx` — Web analytics
  - `project/src/hooks/useDashboardSummary.ts` — Web dashboard hook
  - `project/src/hooks/useModuleBasedDashboard.ts` — Web module-based dashboard hook
  - `project/src/components/Dashboard/` — Web dashboard components

  **Acceptance Criteria**:
  - [ ] Dashboard with cross-domain summary cards
  - [ ] Analytics with key metric charts
  - [ ] Module-based section visibility
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile/core): enhanced dashboard + analytics`

- [ ] 33. Offline Caching Enhancement

  **What to do**:
  - Extend existing `mobile/src/lib/offline.ts` to cover all major domains:
    - Cache: parcels, workers, items, recent invoices, farm hierarchy
    - Background sync: queue mutations when offline, sync when back online
  - Integrate TanStack Query's PersistQueryClient with expo-sqlite or MMKV for cache persistence
  - Add visual indicator for offline mode (already have `OfflineIndicator` concept)
  - Show queued mutations count when offline
  - Create hooks: `useOfflineSync`, `useOfflineStatus`, `useCachedData`

  **Must NOT do**:
  - Do NOT implement conflict resolution — last-write-wins for now
  - Do NOT cache large datasets (satellite images, PDF reports)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**: Wave 6 | **Blocked By**: ALL implementation tasks

  **References**:
  - `mobile/src/lib/offline.ts` — Existing offline sync implementation (tasks, harvests, farms only)
  - `mobile/src/lib/storage.ts` — Existing storage utilities
  - `mobile/package.json:23,44` — react-native-mmkv + expo-sqlite both installed

  **Acceptance Criteria**:
  - [ ] Cache persists across app restarts
  - [ ] Mutations queue when offline
  - [ ] Sync completes when back online
  - [ ] Visual offline indicator shown
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile): offline caching enhancement`

- [ ] 34. Push Notifications + Deep Linking

  **What to do**:
  - Configure expo-notifications for push token registration with NestJS API
  - Implement notification categories: task assigned, harvest recorded, invoice due, low stock, weather alert, pest alert
  - Build deep linking map: each notification type → specific screen
  - Configure expo-linking for universal links
  - Handle notification tap → navigate to correct screen
  - Create hooks: `usePushNotifications`, `useDeepLinking`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**: Wave 6 | **Blocked By**: ALL implementation tasks

  **References**:
  - `mobile/src/lib/notifications.ts` — Existing notification setup
  - `mobile/app.json` — Expo configuration (add notification config)
  - `mobile/package.json:40` — expo-notifications already installed

  **Acceptance Criteria**:
  - [ ] Push token registered with API
  - [ ] Notification tap navigates to correct screen
  - [ ] Deep links open correct screen
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `feat(mobile): push notifications + deep linking`

- [ ] 35. Performance Optimization + App State Management

  **What to do**:
  - Implement AppState listener for background/foreground transitions:
    - Refetch stale queries on foreground
    - Pause/resume background tasks
  - Optimize list rendering: implement FlashList for large lists (replace FlatList)
  - Add image caching for avatars, product images (expo-image handles this)
  - Memory management: cleanup large data on screen unmount
  - Add skeleton loading states for all screens
  - Performance monitoring: add basic timing metrics

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**: Wave 6 | **Blocked By**: ALL implementation tasks

  **References**:
  - `mobile/app/(tabs)/tasks.tsx` — Example of FlatList to optimize
  - `mobile/package.json:33` — expo-image already installed (has caching)

  **Acceptance Criteria**:
  - [ ] AppState listener triggers query refetch
  - [ ] FlashList used for lists with 50+ potential items
  - [ ] Skeleton loading on all list screens
  - [ ] `cd mobile && npx tsc --noEmit` passes

  **Commit**: YES — `perf(mobile): performance optimization + app state management`

- [ ] 36. Comprehensive Test Suite + Maestro E2E

  **What to do**:
  - Write smoke render tests for ALL screens (import, render with mocked providers, assert no crash)
  - Write hook tests for critical hooks: useTasks, useHarvests, useItems, useInvoices (mock API, verify behavior)
  - Set up Maestro E2E test flows for critical paths:
    - Login → Dashboard → Tasks → Create Task → Complete Task
    - Login → Harvests → Record Harvest → View History
    - Login → Inventory → Create Item → Add Stock
    - Login → Accounting → Create Invoice → Record Payment
  - Configure CI pipeline for test execution

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`maestro-e2e`]
    - `maestro-e2e`: E2E test flow creation for mobile apps

  **Parallelization**: Wave 6 | **Blocked By**: ALL implementation tasks

  **References**:
  - `mobile/package.json:72-74` — jest + jest-expo + typescript configured
  - `project/src/hooks/__tests__/` — Web hook test patterns

  **Acceptance Criteria**:
  - [ ] Smoke tests for 80%+ screens: `cd mobile && npx jest --coverage`
  - [ ] Critical hook tests pass
  - [ ] Maestro flows complete without errors
  - [ ] `cd mobile && npx jest` → all pass, 0 failures

  **Commit**: YES — `test(mobile): comprehensive test suite + Maestro E2E flows`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + linter + `npx jest`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

Each wave gets its own commits grouped by domain:
- **Wave 1**: `feat(mobile): design system core components` / `feat(mobile): i18n setup` / `feat(mobile): navigation architecture`
- **Wave 2-5**: `feat(mobile/{domain}): {description}` — e.g., `feat(mobile/workforce): tasks full CRUD + calendar`
- **Wave 6**: `feat(mobile): offline caching` / `feat(mobile): push notifications` / `chore(mobile): test suite`

---

## Success Criteria

### Verification Commands
```bash
cd mobile && npx tsc --noEmit           # Expected: no errors
cd mobile && npx eslint . --ext .ts,.tsx # Expected: no errors
cd mobile && npx jest                    # Expected: all tests pass
cd mobile && npx expo start --no-dev    # Expected: app starts without crashes
```

### Final Checklist
- [ ] All 8 web domains have mobile equivalents
- [ ] All screens render without crashes
- [ ] All API calls use `api.ts` client (no direct Supabase)
- [ ] All strings use `t()` function (no hardcoded text)
- [ ] CASL abilities gate navigation and screen content
- [ ] Forms validate with Zod before submission
- [ ] Pull-to-refresh works on all list screens
- [ ] No `as any`, `@ts-ignore`, or empty catch blocks
- [ ] Design system components used consistently
- [ ] Navigation stays ≤3 levels deep everywhere
