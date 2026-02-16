# Production Module: Full Review, Unit Tests & Quality Control Implementation

## TL;DR

> **Quick Summary**: Comprehensive unit test coverage for all 5 Production sub-modules (Campaigns, Crop Cycles, Harvests + Deliveries, Reception Batches) plus full enterprise-grade implementation of the Quality Control module with 7 features including multi-step approval workflows, non-conformity management, and PDF certificate generation.
> 
> **Deliverables**:
> - Shared test utilities (`test-utils.tsx`) with mock factories for auth, i18n, QueryClient
> - Unit tests for ALL layers: hooks, components, API layers, utilities — across 4 existing modules
> - Full QC module: NestJS backend endpoints + frontend (types, API, hooks, components, routes)
> - Enterprise QC features: inspection checklists, defect detection, grade assignment, metrics dashboard, non-conformity reporting, multi-step acceptance workflow, PDF certificates
> - Unit tests for the new QC module
> 
> **Estimated Effort**: XL (35+ tasks across frontend and backend)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 (test utils) → Tasks 2-9 (existing module tests) → Task 10 (QC types) → Tasks 11-25 (QC implementation + tests)

---

## Context

### Original Request
Review the Production module (Campaigns, Crop Cycles, Harvests, Reception Batches, Quality Control), implement Quality Control fully, and write unit tests for everything.

### Interview Summary
**Key Discussions**:
- Quality Control is currently a placeholder page — needs FULL enterprise implementation
- All 7 QC features requested: checklists, defect detection, grading, metrics, non-conformity, acceptance workflow, certificates
- QC API pattern: REST apiClient (like Harvests/ReceptionBatches) — requires NestJS backend
- Delivery hooks ARE in scope for Harvests testing (all 15 hooks)
- Enterprise complexity for workflow: multi-step approvals, role-based routing, email notifications, SLA tracking
- Test strategy: tests-after for all modules
- Test scope: ALL layers (hooks, components, API, utilities)

**Research Findings**:
- Test infrastructure exists: Vitest (jsdom) + @testing-library/react + userEvent
- Only 2 test files exist in entire frontend — effectively zero test coverage
- Two API patterns: Supabase direct (Campaigns, CropCycles) vs REST apiClient (Harvests, ReceptionBatches)
- `quality_inspections` table already exists in Supabase with RLS policies
- `database.types.ts` already includes quality_inspections Row/Insert/Update types
- jsPDF + jspdf-autotable already installed for PDF generation
- `useDeleteReceptionBatch` calls `.cancel()` instead of `.delete()` — documented behavior (not a bug fix)

### Metis Review
**Identified Gaps** (addressed):
- QC API pattern decision → User chose REST apiClient
- Delivery hooks scope → User chose INCLUDE
- QC complexity level → User chose Full Enterprise
- Mock strategy for two API patterns → Defined: mock `supabase` for Supabase direct, mock `apiClient` for REST
- Shared test utilities needed → Task 1 creates them
- `useAuth` mock pattern missing → Included in test utils
- `useTranslation` mock pattern → Included in test utils

---

## Work Objectives

### Core Objective
Achieve comprehensive unit test coverage across the entire Production module and build a full enterprise-grade Quality Control sub-module from scratch (NestJS backend + React frontend).

### Concrete Deliverables
- `project/src/test/test-utils.tsx` — shared test utilities + mock factories
- ~40+ test files covering hooks, components, API layers, utilities for all 5 sub-modules
- `agritech-api/src/modules/quality-control/` — NestJS QC module (controller, service, DTOs, module)
- `project/src/types/quality-control.ts` — QC TypeScript types
- `project/src/lib/api/quality-control.ts` — QC API client
- `project/src/hooks/useQualityControl.ts` — QC TanStack Query hooks
- `project/src/components/QualityControl/` — 7+ QC components
- Updated route: `(production)/production/quality-control.tsx` — real QC page replacing placeholder

### Definition of Done
- [ ] `cd project && npx vitest run --reporter=verbose` → ALL tests pass, zero failures
- [ ] `cd project && npx tsc --noEmit` → zero type errors in new files
- [ ] `cd project && npx eslint src/components/QualityControl/ src/hooks/useQualityControl.ts src/lib/api/quality-control.ts --max-warnings 0` → zero warnings
- [ ] QC page loads and renders all 7 features (agent-verified via Playwright)

### Must Have
- Shared test utilities as foundation for all test files
- Mock factories for `useAuth`, `useTranslation`, `QueryClient` provider
- Tests for BOTH API patterns (Supabase direct + REST apiClient)
- All 15 hooks in `useHarvests.ts` tested (including 9 delivery hooks)
- Full QC backend: NestJS endpoints for CRUD + workflow
- Full QC frontend: types, API, hooks, 7 feature components
- Enterprise workflow: multi-step approval, SLA tracking, notifications
- PDF certificate generation using existing jsPDF

### Must NOT Have (Guardrails)
- ❌ NO new database migrations — use existing `quality_inspections` table
- ❌ NO new npm dependencies — all libraries already installed
- ❌ NO bug fixes in existing code — document bugs in test comments, don't fix
- ❌ NO testing TanStack Router route definitions — only components and hooks
- ❌ NO testing shadcn/ui component internals — test behavior not UI library
- ❌ NO integration tests disguised as unit tests — mock at API boundaries
- ❌ NO `as any`, `@ts-ignore`, `@ts-expect-error` in new code
- ❌ NO refactoring existing code while testing

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after for all modules
- **Framework**: Vitest (vitest.config.ts already configured)

### Mock Strategy per API Pattern

| API Pattern | Modules | Mock Target | Example |
|---|---|---|---|
| Supabase Direct | Campaigns, CropCycles | `vi.mock('@/lib/supabase')` | Mock `supabase.from('agricultural_campaigns').select()...` |
| REST apiClient | Harvests, ReceptionBatches, QC (new) | `vi.mock('@/lib/api-client')` or `vi.mock('@/lib/api/harvests')` | Mock `apiClient.get('/api/v1/organizations/.../harvests')` |
| Hooks in Components | All component tests | `vi.mock('@/hooks/useHarvests')` | Mock entire hook module return values |

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Every task includes specific verification scenarios. The executing agent verifies directly.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Create shared test utilities (FOUNDATION — blocks everything)

Wave 2 (After Wave 1):
├── Task 2: Harvests API layer tests
├── Task 3: Harvests utility/type tests  
├── Task 6: Reception Batches API layer tests
├── Task 10: QC types + interfaces definition
└── Task 11: QC NestJS backend module

Wave 3 (After Wave 2):
├── Task 4: Harvests hooks tests (depends: 2)
├── Task 5: Harvests components tests (depends: 4)
├── Task 7: Reception Batches hooks tests (depends: 6)
├── Task 8: Campaigns & CropCycles hooks tests (depends: 1)
├── Task 9: Campaigns & CropCycles components tests (depends: 8)
├── Task 12: QC API client layer (depends: 10, 11)
└── Task 13: QC hooks (depends: 12)

Wave 4 (After Wave 3):
├── Task 14: QC Inspection Checklists component (depends: 13)
├── Task 15: QC Defect Detection component (depends: 13)
├── Task 16: QC Grade Assignment component (depends: 13)
├── Task 17: QC Quality Metrics Dashboard (depends: 13)
├── Task 18: QC Non-Conformity Reporting (depends: 13)
├── Task 19: QC Acceptance Workflow (depends: 13)
├── Task 20: QC Certificate Generation (depends: 13)
├── Task 21: QC Route Integration (depends: 14-20)
└── Tasks 22-28: QC unit tests for all new code (depends: 14-21)

Wave 5 (Final):
└── Task 29: Final integration verification + test suite run
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2-9 | None (foundation) |
| 2 | 1 | 4, 5 | 3, 6, 10, 11 |
| 3 | 1 | — | 2, 6, 10, 11 |
| 4 | 2 | 5 | 7, 8, 12, 13 |
| 5 | 4 | — | 7, 9, 14-20 |
| 6 | 1 | 7 | 2, 3, 10, 11 |
| 7 | 6 | — | 4, 8, 12, 13 |
| 8 | 1 | 9 | 4, 7, 12 |
| 9 | 8 | — | 5, 7, 14-20 |
| 10 | None | 12 | 2, 3, 6, 11 |
| 11 | None | 12 | 2, 3, 6, 10 |
| 12 | 10, 11 | 13 | 4, 7, 8 |
| 13 | 12 | 14-21 | 5, 9 |
| 14-20 | 13 | 21 | Each other |
| 21 | 14-20 | 22-28 | — |
| 22-28 | 21 | 29 | Each other |
| 29 | 22-28 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | `task(category="quick", load_skills=[], ...)` |
| 2 | 2, 3, 6, 10, 11 | 5 parallel agents: `category="unspecified-low"` for tests, `category="ultrabrain"` for QC backend |
| 3 | 4, 5, 7, 8, 9, 12, 13 | 7 parallel agents |
| 4 | 14-21, 22-28 | Up to 7 parallel for components, then 7 for tests |
| 5 | 29 | 1 final verification agent |

---

## TODOs

### PHASE 0: Test Infrastructure Foundation

- [ ] 1. Create Shared Test Utilities

  **What to do**:
  - Create `project/src/test/test-utils.tsx` with:
    - `createTestQueryClient()` — creates a QueryClient with disabled retries, no cacheTime
    - `renderWithProviders(ui, options?)` — wraps component in QueryClientProvider + any needed providers
    - `mockUseAuth(overrides?)` — factory returning `{ currentOrganization: { id: 'test-org-id', name: 'Test Org' }, user: {...}, hasRole: vi.fn() }`
    - `mockUseTranslation()` — factory returning `{ t: (key: string) => key, i18n: { language: 'en', changeLanguage: vi.fn() } }`
    - `createMockHarvest(overrides?)` — factory for HarvestSummary test data
    - `createMockReceptionBatch(overrides?)` — factory for ReceptionBatch test data
    - `createMockCampaign(overrides?)` — factory for AgriculturalCampaign test data
    - `createMockCropCycle(overrides?)` — factory for CropCycle test data
  - Update `project/src/test/setup.ts` to include any global mocks (e.g., `window.matchMedia`)

  **Must NOT do**:
  - Do not mock TanStack Router
  - Do not add any npm dependencies
  - Do not modify vitest.config.ts (it's already correct)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file creation with well-defined patterns from existing tests
  - **Skills**: []
    - No special skills needed — standard TypeScript file creation
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work involved

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo — foundation task)
  - **Blocks**: Tasks 2-9 (all test-writing tasks)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `project/src/components/__tests__/SoilAnalysis.test.tsx` — Existing component test pattern (describe/it/expect, userEvent, render)
  - `project/src/utils/__tests__/geocoding.test.ts` — Existing utility test pattern (pure function tests)
  - `project/src/test/setup.ts` — Current test setup file to extend

  **API/Type References** (contracts to implement against):
  - `project/src/types/harvests.ts` — HarvestSummary, HarvestRecord type shapes for mock factory
  - `project/src/types/reception.ts` — ReceptionBatch type shape for mock factory
  - `project/src/types/agricultural-accounting.ts` — AgriculturalCampaign, CropCycle type shapes

  **Test References**:
  - `project/vitest.config.ts` — Vitest config (globals: true, jsdom, setupFiles)

  **Documentation References**:
  - TanStack Query testing: https://tanstack.com/query/latest/docs/framework/react/guides/testing

  **WHY Each Reference Matters**:
  - `SoilAnalysis.test.tsx`: Shows the team's preferred test structure — follow exactly
  - `setup.ts`: Must be extended, not replaced — preserve existing `@testing-library/jest-dom` import
  - Type files: Mock factories must produce data matching these exact interfaces

  **Acceptance Criteria**:

  - [ ] File created: `project/src/test/test-utils.tsx`
  - [ ] All exports: `createTestQueryClient`, `renderWithProviders`, `mockUseAuth`, `mockUseTranslation`, `createMockHarvest`, `createMockReceptionBatch`, `createMockCampaign`, `createMockCropCycle`
  - [ ] `cd project && npx tsc --noEmit src/test/test-utils.tsx` → zero type errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Test utilities compile and export correctly
    Tool: Bash
    Preconditions: project/ dependencies installed
    Steps:
      1. cd project && npx tsc --noEmit src/test/test-utils.tsx
      2. Assert: exit code 0, zero errors
    Expected Result: File compiles without errors
    Evidence: Terminal output captured

  Scenario: Mock factories produce valid typed objects
    Tool: Bash
    Preconditions: test-utils.tsx exists
    Steps:
      1. Create a minimal test file that imports and calls each factory
      2. Run: cd project && npx vitest run src/test/__tests__/test-utils.test.ts --reporter=verbose
      3. Assert: all assertions pass
    Expected Result: All mock factories produce correctly typed objects
    Evidence: vitest output
  ```

  **Commit**: YES
  - Message: `test(production): add shared test utilities and mock factories`
  - Files: `project/src/test/test-utils.tsx`, `project/src/test/setup.ts`
  - Pre-commit: `cd project && npx tsc --noEmit`

---

### PHASE 1: Unit Tests for Existing Modules — Harvests

- [ ] 2. Harvests API Layer Tests

  **What to do**:
  - Create `project/src/lib/api/__tests__/harvests.test.ts`
  - Test `harvestsApi`: `getAll`, `getPaginated`, `getOne`, `getById`, `create`, `update`, `delete`
  - Mock `apiClient` (from `@/lib/api-client`)
  - Test URL construction, parameter passing, error handling
  - Test `PaginatedHarvestQuery` parameter building (all filter combinations)
  - Create `project/src/lib/api/__tests__/deliveries.test.ts`
  - Test `deliveriesApi`: `getAll`, `getById`, `create`, `updateStatus`, `complete`, `updatePayment`, `cancel`, `getItems`, `getTracking`

  **Must NOT do**:
  - Do not make actual HTTP requests
  - Do not test apiClient internals

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward API mock testing with clear patterns
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI — pure function testing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 6, 10, 11)
  - **Blocks**: Task 4 (Harvests hooks tests)
  - **Blocked By**: Task 1 (test utilities)

  **References**:

  **Pattern References**:
  - `project/src/lib/api/harvests.ts` — The harvestsApi implementation being tested (URL patterns, parameter building)
  - `project/src/lib/api/deliveries.ts` — The deliveriesApi implementation being tested
  - `project/src/lib/api-client.ts` — The apiClient being mocked (understand its interface)
  - `project/src/lib/api/createCrudApi.ts` — `buildQueryUrl` and `requireOrganizationId` utilities used by harvestsApi

  **API/Type References**:
  - `project/src/types/harvests.ts` — All type definitions: `HarvestRecord`, `HarvestSummary`, `HarvestFilters`, `CreateHarvestRequest`, delivery types
  - `project/src/lib/api/types.ts` — `PaginatedQuery`, `PaginatedResponse` generic types

  **WHY Each Reference Matters**:
  - `harvests.ts` (API): Contains exact URL patterns like `/api/v1/organizations/${orgId}/harvests` — tests must verify these
  - `api-client.ts`: Understand what to mock — `apiClient.get`, `.post`, `.patch`, `.delete`
  - `createCrudApi.ts`: `requireOrganizationId` throws when undefined — test this error case

  **Acceptance Criteria**:

  - [ ] Test files created: `project/src/lib/api/__tests__/harvests.test.ts`, `project/src/lib/api/__tests__/deliveries.test.ts`
  - [ ] Minimum 20 test cases across both files
  - [ ] `cd project && npx vitest run src/lib/api/__tests__/harvests.test.ts src/lib/api/__tests__/deliveries.test.ts --reporter=verbose` → ALL PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All Harvests API tests pass
    Tool: Bash
    Preconditions: Task 1 completed, test-utils.tsx exists
    Steps:
      1. cd project && npx vitest run src/lib/api/__tests__/harvests.test.ts --reporter=verbose
      2. Assert: exit code 0
      3. Assert: output contains "Tests" and "0 failed"
      4. Assert: minimum 10 test cases pass
    Expected Result: All harvest API tests green
    Evidence: Terminal output captured

  Scenario: All Deliveries API tests pass
    Tool: Bash
    Preconditions: Task 1 completed
    Steps:
      1. cd project && npx vitest run src/lib/api/__tests__/deliveries.test.ts --reporter=verbose
      2. Assert: exit code 0
      3. Assert: minimum 10 test cases pass
    Expected Result: All delivery API tests green
    Evidence: Terminal output captured

  Scenario: Error case — missing organizationId throws
    Tool: Bash
    Preconditions: Tests written
    Steps:
      1. Verify test file contains test case for calling harvestsApi.getAll(undefined, undefined)
      2. Verify assertion checks for thrown error
    Expected Result: Error case is covered
    Evidence: Test file content
  ```

  **Commit**: YES
  - Message: `test(harvests): add unit tests for harvests and deliveries API layers`
  - Files: `project/src/lib/api/__tests__/harvests.test.ts`, `project/src/lib/api/__tests__/deliveries.test.ts`
  - Pre-commit: `cd project && npx vitest run src/lib/api/__tests__/ --reporter=verbose`

---

- [ ] 3. Harvests Utility & Type Helper Tests

  **What to do**:
  - Create `project/src/types/__tests__/harvests.test.ts`
  - Test type guards and any exported utility functions from `types/harvests.ts`
  - Test `HarvestStatistics` computation logic (extracted from `useHarvestStatistics` hook)
  - Test edge cases: empty arrays, division by zero (avgQuantityPerHarvest), null/undefined fields
  - Test `CompleteHarvestTaskRequest` structure validation

  **Must NOT do**:
  - Do not test TypeScript type definitions themselves (they're compile-time only)
  - Do not import from hooks (pure utility/type tests only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small set of pure function tests
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 6, 10, 11)
  - **Blocks**: None directly
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `project/src/utils/__tests__/geocoding.test.ts` — Pure function test pattern to follow
  - `project/src/hooks/useHarvests.ts:63-93` — `useHarvestStatistics` computation logic that should be extracted/tested

  **API/Type References**:
  - `project/src/types/harvests.ts` — All types and any exported utility functions

  **WHY Each Reference Matters**:
  - `geocoding.test.ts`: Shows pattern for testing utility functions — import, call, assert
  - `useHarvestStatistics` lines 74-89: Contains computation logic (totalQuantity, totalRevenue, avgQuantityPerHarvest) that needs edge case testing

  **Acceptance Criteria**:

  - [ ] Test file created: `project/src/types/__tests__/harvests.test.ts`
  - [ ] Minimum 8 test cases
  - [ ] Edge case covered: empty array → all stats = 0, no NaN
  - [ ] `cd project && npx vitest run src/types/__tests__/harvests.test.ts --reporter=verbose` → ALL PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Harvest utility tests pass
    Tool: Bash
    Steps:
      1. cd project && npx vitest run src/types/__tests__/harvests.test.ts --reporter=verbose
      2. Assert: exit code 0, all tests pass
    Expected Result: All utility tests green
    Evidence: Terminal output
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `test(harvests): add utility and type helper tests`
  - Files: `project/src/types/__tests__/harvests.test.ts`

---

- [ ] 4. Harvests Hooks Tests (ALL 15 hooks)

  **What to do**:
  - Create `project/src/hooks/__tests__/useHarvests.test.ts`
  - Test ALL 15 hooks:
    - **Harvest queries**: `useHarvests`, `usePaginatedHarvests`, `useHarvest`, `useHarvestStatistics`
    - **Delivery queries**: `useDeliveries`, `useDelivery`, `useDeliveryItems`, `useDeliveryTracking`
    - **Harvest mutations**: `useCreateHarvest`, `useUpdateHarvest`, `useDeleteHarvest`
    - **Delivery mutations**: `useCreateDelivery`, `useUpdateDeliveryStatus`, `useCompleteDelivery`, `useUpdateDeliveryPayment`, `useCancelDelivery`
  - Use `@testing-library/react` `renderHook` with `createTestQueryClient` wrapper
  - Mock `harvestsApi` and `deliveriesApi` modules
  - Mock `useAuth` for hooks that use it directly
  - Test: success data returns, loading states, enabled/disabled conditions, cache invalidation on mutations, error propagation
  - Test edge cases: `organizationId` empty → returns empty/disabled, `currentOrganization` null → throws

  **Must NOT do**:
  - Do not test actual API calls (mocked)
  - Do not test QueryClient internals

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 15 hooks with complex query/mutation patterns, cache invalidation logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 7, 8, 9, 12, 13)
  - **Blocks**: Task 5 (Harvests components tests)
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `project/src/hooks/useHarvests.ts` — ALL 15 hooks being tested
  - `project/src/test/test-utils.tsx` — `createTestQueryClient`, `mockUseAuth` (from Task 1)

  **API/Type References**:
  - `project/src/lib/api/harvests.ts` — `harvestsApi` to mock (mock at module level)
  - `project/src/lib/api/deliveries.ts` — `deliveriesApi` to mock
  - `project/src/types/harvests.ts` — Return types for assertions

  **External References**:
  - TanStack Query testing: https://tanstack.com/query/latest/docs/framework/react/guides/testing

  **WHY Each Reference Matters**:
  - `useHarvests.ts`: Every hook's queryKey, enabled conditions, onSuccess invalidation patterns must be tested
  - `harvestsApi`/`deliveriesApi`: Mock these modules — `vi.mock('../lib/api/harvests')` — provide mock implementations

  **Acceptance Criteria**:

  - [ ] Test file: `project/src/hooks/__tests__/useHarvests.test.ts`
  - [ ] All 15 hooks tested (4 harvest queries + 4 delivery queries + 3 harvest mutations + 4 delivery mutations)
  - [ ] Minimum 30 test cases
  - [ ] `cd project && npx vitest run src/hooks/__tests__/useHarvests.test.ts --reporter=verbose` → ALL PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All 15 harvest/delivery hooks tested
    Tool: Bash
    Steps:
      1. cd project && npx vitest run src/hooks/__tests__/useHarvests.test.ts --reporter=verbose
      2. Assert: exit code 0
      3. Assert: output contains 15 describe blocks (one per hook)
      4. Assert: minimum 30 test cases pass
    Expected Result: Comprehensive hook coverage
    Evidence: Verbose vitest output

  Scenario: Cache invalidation verified on mutations
    Tool: Bash
    Steps:
      1. Verify test file contains assertions checking queryClient.invalidateQueries calls
      2. Verify at least 1 test per mutation hook checks invalidation keys
    Expected Result: All mutation hooks verify cache invalidation
    Evidence: Test file content
  ```

  **Commit**: YES
  - Message: `test(harvests): add comprehensive hook tests for all 15 harvest and delivery hooks`
  - Files: `project/src/hooks/__tests__/useHarvests.test.ts`

---

- [ ] 5. Harvests Components Tests

  **What to do**:
  - Create `project/src/components/Harvests/__tests__/HarvestCard.test.tsx`
    - Test rendering with different statuses (stored, in_delivery, delivered, sold, spoiled)
    - Test quality badge rendering for each grade
    - Test button callbacks (onEdit, onDelete, onViewDetails, onCreateReception)
  - Create `project/src/components/Harvests/__tests__/HarvestForm.test.tsx`
    - Test form rendering with empty state (create mode)
    - Test form pre-populated with harvest data (edit mode)
    - Test zod validation: required fields, positive quantity, date format
    - Test form submission calls correct mutation
    - Test farm/parcel cascading select
    - Mock: `useAuth`, `useFarms`, `useParcelsByFarm`, `useCreateHarvest`, `useUpdateHarvest`, `useWarehouses`
  - Create `project/src/components/Harvests/__tests__/HarvestStatistics.test.tsx`
    - Test rendering with statistics data
    - Test rendering with zero/empty statistics
  - Create `project/src/components/Harvests/__tests__/HarvestDetailsModal.test.tsx`
    - Test modal rendering with harvest data
    - Test close callback

  **Must NOT do**:
  - Do not test shadcn/ui Dialog internals
  - Do not test react-hook-form internals
  - Do not make actual API calls

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 4 component test files with complex form testing and user interaction
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component rendering and interaction testing requires UI understanding

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8, 9, 12, 13)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 4

  **References**:

  **Pattern References**:
  - `project/src/components/__tests__/SoilAnalysis.test.tsx` — Component test pattern: render, userEvent, assert
  - `project/src/components/Harvests/HarvestForm.tsx` — Form component with react-hook-form + zod
  - `project/src/components/Harvests/HarvestCard.tsx` — Display component with status/grade mapping
  - `project/src/components/Harvests/HarvestStatistics.tsx` — Statistics display component
  - `project/src/components/Harvests/HarvestDetailsModal.tsx` — Modal component

  **API/Type References**:
  - `project/src/types/harvests.ts:HarvestSummary` — Prop types for HarvestCard
  - `project/src/types/harvests.ts:HarvestStatistics` — Prop types for HarvestStatistics

  **WHY Each Reference Matters**:
  - `SoilAnalysis.test.tsx`: THE reference test — follow this exact structure (render, query, interact, assert)
  - `HarvestForm.tsx:20-34`: Zod schema defines validation rules to test
  - `HarvestCard.tsx:16-36`: Status/grade color mapping logic to verify

  **Acceptance Criteria**:

  - [ ] 4 test files created in `project/src/components/Harvests/__tests__/`
  - [ ] Minimum 25 test cases across all files
  - [ ] `cd project && npx vitest run src/components/Harvests/__tests__/ --reporter=verbose` → ALL PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All Harvest component tests pass
    Tool: Bash
    Steps:
      1. cd project && npx vitest run src/components/Harvests/__tests__/ --reporter=verbose
      2. Assert: exit code 0
      3. Assert: minimum 25 tests pass
    Expected Result: All component tests green
    Evidence: Verbose vitest output

  Scenario: HarvestForm validation rejects invalid input
    Tool: Bash
    Steps:
      1. Verify test file contains test case: submit with empty farm_id → shows error
      2. Verify test case: submit with quantity=0 → shows error
      3. Verify test case: submit with valid data → calls createMutation
    Expected Result: Validation tests cover required fields
    Evidence: Test file content
  ```

  **Commit**: YES
  - Message: `test(harvests): add component tests for HarvestCard, HarvestForm, HarvestStatistics, HarvestDetailsModal`
  - Files: `project/src/components/Harvests/__tests__/*.test.tsx`

---

### PHASE 1 (continued): Reception Batches Tests

- [ ] 6. Reception Batches API Layer Tests

  **What to do**:
  - Create `project/src/lib/api/__tests__/reception-batches.test.ts`
  - Test `receptionBatchesApi`: `getAll`, `getPaginated`, `getById`, `create`, `update`, `updateQualityControl`, `makeDecision`, `cancel`
  - Test filter parameter building (warehouse_id, parcel_id, status, decision, quality_grade, crop_id, harvest_id, date range)
  - Test error handling when organizationId is missing

  **Must NOT do**:
  - Do not make actual HTTP requests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Follows same pattern as Task 2 (API layer testing)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 10, 11)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `project/src/lib/api/reception-batches.ts` — API implementation being tested
  - Task 2 output — Follow same mock pattern established for harvestsApi

  **API/Type References**:
  - `project/src/types/reception.ts` — All reception batch types
  - `project/src/lib/api/types.ts` — `PaginatedResponse` generic

  **WHY Each Reference Matters**:
  - `reception-batches.ts`: Complex filter parameter building with 10+ optional params — each needs a test

  **Acceptance Criteria**:

  - [ ] Test file: `project/src/lib/api/__tests__/reception-batches.test.ts`
  - [ ] Minimum 15 test cases
  - [ ] `cd project && npx vitest run src/lib/api/__tests__/reception-batches.test.ts --reporter=verbose` → ALL PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Reception Batches API tests pass
    Tool: Bash
    Steps:
      1. cd project && npx vitest run src/lib/api/__tests__/reception-batches.test.ts --reporter=verbose
      2. Assert: exit code 0, minimum 15 tests pass
    Expected Result: All API tests green
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `test(reception): add unit tests for reception batches API layer`
  - Files: `project/src/lib/api/__tests__/reception-batches.test.ts`

---

- [ ] 7. Reception Batches Hooks Tests

  **What to do**:
  - Create `project/src/hooks/__tests__/useReceptionBatches.test.ts`
  - Test ALL hooks: `useReceptionBatches`, `usePaginatedReceptionBatches`, `useReceptionBatch`, `useHarvestReceptionBatches`, `useReceptionBatchStats`, `useCreateReceptionBatch`, `useUpdateReceptionBatch`, `useUpdateQualityControl`, `useMakeReceptionDecision`, `useCancelReceptionBatch`, `useDeleteReceptionBatch`, `useReceptionCenters`
  - Test `useReceptionBatchStats` client-side statistics computation (the hook fetches all batches and computes stats)
  - Test edge cases: empty batches → stats all zeros, `qualityScoreCount === 0` → average_quality_score === undefined
  - Document: `useDeleteReceptionBatch` calls `.cancel()` not `.delete()` — verify this behavior in test comment
  - Test cache invalidation patterns (cross-domain: `stock-entries`, `sales-orders` invalidated by `useMakeReceptionDecision`)

  **Must NOT do**:
  - Do not fix the cancel-vs-delete issue — document it

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 12 hooks including complex client-side stat computation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 5, 8, 9, 12, 13)
  - **Blocks**: None directly
  - **Blocked By**: Tasks 1, 6

  **References**:

  **Pattern References**:
  - `project/src/hooks/useReceptionBatches.ts` — All 12 hooks being tested
  - Task 4 output — Follow same renderHook pattern established for harvest hooks

  **API/Type References**:
  - `project/src/lib/api/reception-batches.ts` — API to mock
  - `project/src/lib/api/warehouses.ts` — `warehousesApi` used by `useReceptionCenters`
  - `project/src/types/reception.ts` — `ReceptionBatchStats` type for stats assertions

  **WHY Each Reference Matters**:
  - `useReceptionBatches.ts:86-156`: `useReceptionBatchStats` does client-side computation — most complex hook to test
  - `useReceptionBatches.ts:305`: Documents the cancel-vs-delete behavior to verify

  **Acceptance Criteria**:

  - [ ] Test file: `project/src/hooks/__tests__/useReceptionBatches.test.ts`
  - [ ] All 12 hooks tested
  - [ ] Minimum 25 test cases
  - [ ] Edge case tested: empty batches → `average_quality_score === undefined`
  - [ ] Comment documents `useDeleteReceptionBatch` cancel behavior
  - [ ] `cd project && npx vitest run src/hooks/__tests__/useReceptionBatches.test.ts --reporter=verbose` → ALL PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All reception batch hook tests pass
    Tool: Bash
    Steps:
      1. cd project && npx vitest run src/hooks/__tests__/useReceptionBatches.test.ts --reporter=verbose
      2. Assert: exit code 0, minimum 25 tests pass
    Expected Result: All hook tests green
    Evidence: Verbose vitest output
  ```

  **Commit**: YES
  - Message: `test(reception): add comprehensive hook tests for all 12 reception batch hooks`
  - Files: `project/src/hooks/__tests__/useReceptionBatches.test.ts`

---

### PHASE 1 (continued): Campaigns & Crop Cycles Tests

- [ ] 8. Campaigns & Crop Cycles Hooks Tests

  **What to do**:
  - Create `project/src/hooks/__tests__/useAgriculturalAccounting.test.ts`
  - Test Campaign hooks: `useCampaigns`, `useCurrentCampaign`, `useCampaignSummary`, `useCreateCampaign`, `useUpdateCampaign`
  - Test CropCycle hooks: `useCropCycles`, `useCropCycle`, `useCropCyclePnL`, `useCreateCropCycle`, `useUpdateCropCycle`, `useCompleteCropCycle`
  - **Mock strategy DIFFERENT**: These use Supabase direct — mock `@/lib/supabase` module
  - Mock `supabase.from('agricultural_campaigns').select('*').eq(...)` chain
  - Test filter combinations for `useCropCycles` (campaign_id, fiscal_year_id, farm_id, parcel_id, status, crop_type)
  - Test toast notifications on success/error (mock `sonner` toast)

  **Must NOT do**:
  - Do not test fiscal year hooks (out of scope — that's accounting, not production)
  - Do not use the REST apiClient mock pattern — Supabase mock is different

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 11 hooks with Supabase chain mocking complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 5, 7, 9, 12, 13)
  - **Blocks**: Task 9 (Campaigns & CropCycles components)
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `project/src/hooks/useAgriculturalAccounting.ts:113-300+` — Campaign and CropCycle hooks being tested
  - `project/src/lib/api/agricultural-accounting.ts:119-270` — `campaignsApi` and `cropCyclesApi` (Supabase direct pattern)

  **API/Type References**:
  - `project/src/lib/supabase.ts` — The Supabase client to mock
  - `project/src/types/agricultural-accounting.ts` — All campaign/crop cycle types

  **WHY Each Reference Matters**:
  - `agricultural-accounting.ts`: Shows the Supabase chain pattern (`supabase.from().select().eq().order()`) — must mock this exact chain
  - Hooks call `toast.success/error` from sonner — mock these for assertion

  **Acceptance Criteria**:

  - [ ] Test file: `project/src/hooks/__tests__/useAgriculturalAccounting.test.ts`
  - [ ] 11 hooks tested (5 campaign + 6 crop cycle)
  - [ ] Minimum 22 test cases
  - [ ] Supabase mock pattern established and working
  - [ ] Toast notifications verified on mutation success/error
  - [ ] `cd project && npx vitest run src/hooks/__tests__/useAgriculturalAccounting.test.ts --reporter=verbose` → ALL PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All campaign/crop cycle hook tests pass
    Tool: Bash
    Steps:
      1. cd project && npx vitest run src/hooks/__tests__/useAgriculturalAccounting.test.ts --reporter=verbose
      2. Assert: exit code 0, minimum 22 tests pass
    Expected Result: All hook tests green
    Evidence: Verbose vitest output
  ```

  **Commit**: YES
  - Message: `test(campaigns,crop-cycles): add hook tests for campaigns and crop cycle hooks with Supabase mocking`
  - Files: `project/src/hooks/__tests__/useAgriculturalAccounting.test.ts`

---

- [ ] 9. Campaigns & Crop Cycles Components Tests

  **What to do**:
  - Create `project/src/components/settings/__tests__/CampaignManagement.test.tsx`
    - Test campaign list rendering
    - Test create dialog opens and submits
    - Test edit dialog pre-populates data
    - Test status badge rendering for each CampaignStatus
    - Test `is_current` toggle
    - Mock: `useCampaigns`, `useCampaignSummary`, `useCreateCampaign`, `useUpdateCampaign`, `useFiscalYears`, `useAuth`
  - Create `project/src/components/CropCycles/__tests__/CropCyclesList.test.tsx`
    - Test list rendering with cycles
    - Test empty state
    - Test filter UI (campaign, status, farm dropdowns)
    - Test create cycle dialog with zod validation
    - Test status transitions
    - Mock all hooks: `useCropCycles`, `useCropCyclePnL`, `useCreateCropCycle`, `useUpdateCropCycle`, `useCompleteCropCycle`, `useCampaigns`, `useFiscalYears`, `useFarms`
  - Create `project/src/components/CropCycles/__tests__/CropCycleDetail.test.tsx`
    - Test detail view rendering with cycle data
    - Test tab navigation
    - Test loading state

  **Must NOT do**:
  - Do not test the timeline/Gantt view in CropCyclesList (too complex for unit tests, E2E territory)
  - Do not test shadcn Dialog animations

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Large components (1020 and 716 lines) with complex forms and state
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Complex component testing with forms, dialogs, state management

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 7)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 8

  **References**:

  **Pattern References**:
  - `project/src/components/settings/CampaignManagement.tsx` — Campaign CRUD component (404 lines)
  - `project/src/components/CropCycles/CropCyclesList.tsx` — Crop cycles list (1020 lines)
  - `project/src/components/CropCycles/CropCycleDetail.tsx` — Cycle detail view (716 lines)
  - `project/src/components/__tests__/SoilAnalysis.test.tsx` — Component test pattern to follow

  **API/Type References**:
  - `project/src/types/agricultural-accounting.ts:49-70` — `AgriculturalCampaign` interface for mock data
  - `project/src/types/agricultural-accounting.ts:72-100` — `CropCycle` interface for mock data

  **WHY Each Reference Matters**:
  - `CampaignManagement.tsx:43-50`: Zod schema defines validation rules to test
  - `CropCyclesList.tsx`: Massive component — focus tests on CRUD flow + filters, skip timeline

  **Acceptance Criteria**:

  - [ ] 3 test files created
  - [ ] Minimum 20 test cases across all files
  - [ ] `cd project && npx vitest run src/components/settings/__tests__/ src/components/CropCycles/__tests__/ --reporter=verbose` → ALL PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: All campaign/crop cycle component tests pass
    Tool: Bash
    Steps:
      1. cd project && npx vitest run src/components/settings/__tests__/CampaignManagement.test.tsx src/components/CropCycles/__tests__/ --reporter=verbose
      2. Assert: exit code 0, minimum 20 tests pass
    Expected Result: All component tests green
    Evidence: Verbose vitest output
  ```

  **Commit**: YES
  - Message: `test(campaigns,crop-cycles): add component tests for CampaignManagement and CropCycle components`
  - Files: `project/src/components/settings/__tests__/CampaignManagement.test.tsx`, `project/src/components/CropCycles/__tests__/*.test.tsx`

---

### PHASE 2: Quality Control — Foundation

- [ ] 10. QC Types & Interfaces Definition

  **What to do**:
  - Create `project/src/types/quality-control.ts` with comprehensive types:
    - `QualityInspection` — maps to existing `quality_inspections` DB table
    - `InspectionChecklist`, `ChecklistItem`, `ChecklistTemplate`
    - `Defect`, `DefectCategory`, `DefectSeverity` ('critical' | 'major' | 'minor' | 'cosmetic')
    - `GradeRule`, `GradeAssignment`, `GradeThreshold`
    - `QualityMetrics`, `QualityKPI`, `QualityTrend`
    - `NonConformity`, `NonConformityStatus`, `CorrectiveAction`, `NCRSeverity`
    - `ApprovalWorkflow`, `WorkflowStep`, `ApprovalStatus`, `WorkflowRole`
    - `QualityCertificate`, `CertificateTemplate`
    - `QualityNotification`, `SLAConfig`, `SLAStatus`
    - Enterprise workflow types: `ApprovalChain`, `ApprovalStepConfig`, `EscalationRule`
    - DTO types: `CreateInspectionDto`, `UpdateInspectionDto`, `CreateNonConformityDto`, `MakeApprovalDecisionDto`
  - Use existing `database.types.ts` quality_inspections Row type as base
  - Define `QCFilters` for query filtering

  **Must NOT do**:
  - Do not create database migrations
  - Do not use `as any` — all types must be strict

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex type system design for enterprise QC domain — requires deep domain modeling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 6)
  - **Blocks**: Tasks 12, 13, 14-21
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `project/src/types/harvests.ts` — Type file pattern (enums, interfaces, DTOs)
  - `project/src/types/reception.ts` — Similar domain (quality grades, batch workflows)
  - `project/src/types/agricultural-accounting.ts` — Large shared type file pattern

  **API/Type References**:
  - `project/src/types/database.types.ts` — Generated types for `quality_inspections` table (Row/Insert/Update)
  - `project/supabase/migrations/` — DB schema for quality_inspections table constraints

  **WHY Each Reference Matters**:
  - `database.types.ts`: Source of truth for DB column types — QualityInspection interface must be compatible
  - `reception.ts`: Shows how QualityGrade and quality scoring is already typed — must be consistent
  - `harvests.ts`: Shows the pattern for DTOs (Create, Update) alongside entity interfaces

  **Acceptance Criteria**:

  - [ ] File created: `project/src/types/quality-control.ts`
  - [ ] All types compile: `cd project && npx tsc --noEmit src/types/quality-control.ts` → zero errors
  - [ ] Types cover: inspections, checklists, defects, grades, metrics, non-conformity, workflows, certificates, notifications, SLA
  - [ ] Compatible with existing `quality_inspections` DB types

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: QC types compile cleanly
    Tool: Bash
    Steps:
      1. cd project && npx tsc --noEmit
      2. Assert: no errors related to quality-control.ts
    Expected Result: All types valid
    Evidence: tsc output
  ```

  **Commit**: YES
  - Message: `feat(quality-control): define comprehensive TypeScript types for enterprise QC module`
  - Files: `project/src/types/quality-control.ts`

---

- [ ] 11. QC NestJS Backend Module

  **What to do**:
  - Create `agritech-api/src/modules/quality-control/` module:
    - `quality-control.module.ts` — NestJS module registration
    - `quality-control.controller.ts` — REST endpoints:
      - `GET /api/v1/organizations/:orgId/quality-inspections` (list with filters)
      - `GET /api/v1/organizations/:orgId/quality-inspections/:id` (single)
      - `POST /api/v1/organizations/:orgId/quality-inspections` (create)
      - `PATCH /api/v1/organizations/:orgId/quality-inspections/:id` (update)
      - `DELETE /api/v1/organizations/:orgId/quality-inspections/:id` (delete)
      - `POST /api/v1/organizations/:orgId/quality-inspections/:id/approve` (workflow)
      - `POST /api/v1/organizations/:orgId/quality-inspections/:id/reject` (workflow)
      - `GET /api/v1/organizations/:orgId/quality-inspections/stats` (metrics)
      - `POST /api/v1/organizations/:orgId/non-conformities` (NCR CRUD)
      - `GET /api/v1/organizations/:orgId/non-conformities` (NCR list)
      - `PATCH /api/v1/organizations/:orgId/non-conformities/:id` (NCR update)
      - `POST /api/v1/organizations/:orgId/quality-certificates` (generate)
    - `quality-control.service.ts` — Business logic (Supabase queries, workflow engine, SLA tracking)
    - `dto/` — Request validation DTOs with class-validator
    - `quality-control.service.spec.ts` — Unit tests for service
    - `quality-control.controller.spec.ts` — Unit tests for controller
  - Register module in `app.module.ts`
  - Implement enterprise workflow logic: multi-step approval chains, role-based routing, escalation rules
  - Implement SLA tracking: inspection due dates, overdue alerts
  - Implement notification triggers (email via existing notification service if available, or event-based)

  **Must NOT do**:
  - Do not modify the database schema (use existing `quality_inspections` table + JSONB `results` for flexible data)
  - Do not install new npm packages in the API

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Enterprise backend with workflow engine, SLA tracking, multi-step approvals — complex business logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 6, 10)
  - **Blocks**: Task 12 (QC API client)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/` — Existing NestJS module patterns (follow directory structure, naming, decorators)
  - `agritech-api/src/modules/harvests/` — If exists, follow as closest feature pattern for REST endpoints
  - `agritech-api/src/modules/reception-batches/` — If exists, follow for batch/workflow patterns

  **API/Type References**:
  - `project/src/types/database.types.ts` — `quality_inspections` table schema (columns, constraints)
  - `project/supabase/migrations/` — Full DB schema for table definition, RLS policies

  **External References**:
  - NestJS docs: https://docs.nestjs.com/controllers — Controller patterns
  - NestJS testing: https://docs.nestjs.com/fundamentals/testing — Service/controller unit testing

  **WHY Each Reference Matters**:
  - Existing NestJS modules: Ensure consistent module registration, middleware, guards
  - `quality_inspections` table: Defines the data contract — service queries must match schema
  - RLS policies: Backend must pass `organization_id` for all queries to satisfy RLS

  **Acceptance Criteria**:

  - [ ] Module created: `agritech-api/src/modules/quality-control/`
  - [ ] All endpoints implemented and accessible
  - [ ] Service unit tests: `cd agritech-api && npx jest --testPathPattern=quality-control --verbose` → ALL PASS
  - [ ] Module compiles: `cd agritech-api && npx nest build` → zero errors
  - [ ] Minimum 20 test cases in service + controller specs

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: NestJS QC module builds successfully
    Tool: Bash
    Steps:
      1. cd agritech-api && npx nest build
      2. Assert: exit code 0
    Expected Result: Module compiles
    Evidence: Build output

  Scenario: QC backend tests pass
    Tool: Bash
    Steps:
      1. cd agritech-api && npx jest --testPathPattern=quality-control --verbose
      2. Assert: exit code 0, minimum 20 tests pass
    Expected Result: All backend tests green
    Evidence: Jest output
  ```

  **Commit**: YES
  - Message: `feat(api): implement enterprise quality control NestJS module with workflow engine and SLA tracking`
  - Files: `agritech-api/src/modules/quality-control/**`

---

- [ ] 12. QC Frontend API Client Layer

  **What to do**:
  - Create `project/src/lib/api/quality-control.ts`
  - Implement `qualityControlApi` object with methods matching NestJS endpoints:
    - `getAll(organizationId, filters)` → `GET /api/v1/organizations/:orgId/quality-inspections`
    - `getById(organizationId, id)` → `GET .../quality-inspections/:id`
    - `create(organizationId, data)` → `POST .../quality-inspections`
    - `update(organizationId, id, data)` → `PATCH .../quality-inspections/:id`
    - `delete(organizationId, id)` → `DELETE .../quality-inspections/:id`
    - `approve(organizationId, id, data)` → `POST .../quality-inspections/:id/approve`
    - `reject(organizationId, id, data)` → `POST .../quality-inspections/:id/reject`
    - `getStats(organizationId, filters)` → `GET .../quality-inspections/stats`
    - `getNonConformities(organizationId, filters)` → `GET .../non-conformities`
    - `createNonConformity(organizationId, data)` → `POST .../non-conformities`
    - `updateNonConformity(organizationId, id, data)` → `PATCH .../non-conformities/:id`
    - `generateCertificate(organizationId, inspectionId)` → `POST .../quality-certificates`
  - Follow REST apiClient pattern from `harvests.ts` and `reception-batches.ts`
  - Use `buildQueryUrl` and `requireOrganizationId` from `createCrudApi.ts`

  **Must NOT do**:
  - Do not use Supabase direct (user chose REST pattern)
  - Do not add new imports beyond existing libraries

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Follows established REST apiClient pattern — straightforward implementation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 5, 7, 8, 9)
  - **Blocks**: Task 13 (QC hooks)
  - **Blocked By**: Tasks 10, 11

  **References**:

  **Pattern References**:
  - `project/src/lib/api/harvests.ts` — EXACT pattern to follow for REST apiClient usage
  - `project/src/lib/api/reception-batches.ts` — Filter parameter building pattern
  - `project/src/lib/api/createCrudApi.ts` — `buildQueryUrl`, `requireOrganizationId` utilities

  **API/Type References**:
  - `project/src/types/quality-control.ts` — Types defined in Task 10
  - `project/src/lib/api-client.ts` — `apiClient` interface

  **WHY Each Reference Matters**:
  - `harvests.ts`: Copy this exact structure — import apiClient, use buildQueryUrl, requireOrganizationId
  - `reception-batches.ts`: Shows complex filter building with many optional params — QC filters will be similar

  **Acceptance Criteria**:

  - [ ] File created: `project/src/lib/api/quality-control.ts`
  - [ ] All 12 API methods implemented
  - [ ] `cd project && npx tsc --noEmit` → zero errors in quality-control.ts

  **Commit**: YES
  - Message: `feat(quality-control): implement QC API client layer following REST apiClient pattern`
  - Files: `project/src/lib/api/quality-control.ts`

---

- [ ] 13. QC TanStack Query Hooks

  **What to do**:
  - Create `project/src/hooks/useQualityControl.ts`
  - Implement hooks following `useHarvests.ts` and `useReceptionBatches.ts` patterns:
    - **Queries**: `useQualityInspections`, `useQualityInspection`, `useQualityStats`, `useNonConformities`, `useNonConformity`, `useInspectionChecklists`
    - **Mutations**: `useCreateInspection`, `useUpdateInspection`, `useDeleteInspection`, `useApproveInspection`, `useRejectInspection`, `useCreateNonConformity`, `useUpdateNonConformity`, `useGenerateCertificate`
  - All queries must: use `queryKey` with organizationId, set `enabled: !!organizationId`, include `staleTime`
  - All mutations must: invalidate related queries on success, use `useQueryClient()`
  - Workflow hooks should invalidate both inspection and notification queries

  **Must NOT do**:
  - Do not compute stats client-side (backend provides stats endpoint)
  - Do not skip `staleTime` on any query

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Follows well-established hook patterns from existing modules
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 5, 7, 8, 9)
  - **Blocks**: Tasks 14-21 (all QC components)
  - **Blocked By**: Task 12

  **References**:

  **Pattern References**:
  - `project/src/hooks/useHarvests.ts` — Hook pattern: query with organizationId, mutation with invalidation
  - `project/src/hooks/useReceptionBatches.ts` — More complex hook pattern with stats, multiple invalidations

  **API/Type References**:
  - `project/src/lib/api/quality-control.ts` — API methods to call (from Task 12)
  - `project/src/types/quality-control.ts` — Return types (from Task 10)

  **WHY Each Reference Matters**:
  - `useHarvests.ts`: Shows the exact pattern for query hooks (queryKey, queryFn, enabled) and mutation hooks (mutationFn, onSuccess invalidation)
  - `useReceptionBatches.ts`: Shows cross-domain invalidation pattern (invalidating stock-entries from reception mutations)

  **Acceptance Criteria**:

  - [ ] File created: `project/src/hooks/useQualityControl.ts`
  - [ ] 14 hooks implemented (6 queries + 8 mutations)
  - [ ] All hooks have proper `staleTime`, `enabled`, and cache invalidation
  - [ ] `cd project && npx tsc --noEmit` → zero errors

  **Commit**: YES
  - Message: `feat(quality-control): implement TanStack Query hooks for QC module`
  - Files: `project/src/hooks/useQualityControl.ts`

---

### PHASE 3: Quality Control — Feature Components

- [ ] 14. QC Inspection Checklists Component

  **What to do**:
  - Create `project/src/components/QualityControl/InspectionChecklists.tsx`
    - Checklist template management (create, edit, delete templates)
    - Execute inspection: load template, fill checklist items, compute score
    - Checklist items: checkbox + notes per item, pass/fail/N-A
    - Link to reception batch or harvest
    - Use react-hook-form + zod for validation
    - Store checklist data in `quality_inspections.results` JSONB

  **Must NOT do**:
  - Do not create separate DB tables for checklists (use JSONB results field)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex interactive form UI with dynamic checklist rendering
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15-20)
  - **Blocks**: Task 21 (route integration)
  - **Blocked By**: Task 13

  **References**:

  **Pattern References**:
  - `project/src/components/Harvests/HarvestForm.tsx` — Form pattern (react-hook-form + zod)
  - `project/src/components/Stock/ReceptionBatchForm.tsx` — Complex multi-section form
  - `project/src/components/settings/CampaignManagement.tsx` — CRUD list + dialog form pattern

  **API/Type References**:
  - `project/src/types/quality-control.ts:InspectionChecklist` — Type to implement
  - `project/src/hooks/useQualityControl.ts` — Hooks to use

  **Acceptance Criteria**:
  - [ ] Component renders checklist template list
  - [ ] Create/edit template dialog works
  - [ ] Execute inspection form with dynamic items
  - [ ] `cd project && npx tsc --noEmit` → zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Checklist component renders and compiles
    Tool: Bash
    Steps:
      1. cd project && npx tsc --noEmit
      2. Assert: zero errors related to InspectionChecklists.tsx
    Expected Result: Component compiles
    Evidence: tsc output
  ```

  **Commit**: YES (groups with 15-20)
  - Message: `feat(quality-control): implement inspection checklists component`

---

- [ ] 15. QC Defect Detection & Logging Component

  **What to do**:
  - Create `project/src/components/QualityControl/DefectDetection.tsx`
    - Log defects: category, severity (critical/major/minor/cosmetic), description, photos
    - Predefined defect categories (configurable list stored in JSONB)
    - Defect list view with severity badges and filtering
    - Link defects to specific inspection
    - Photo upload integration (existing file upload patterns)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**: Wave 4 (with 14, 16-20) | Blocks: 21 | Blocked By: 13

  **References**:
  - `project/src/components/Harvests/HarvestCard.tsx` — Status badge pattern
  - `project/src/types/quality-control.ts:Defect` — Type definition

  **Acceptance Criteria**:
  - [ ] Component renders defect list and log form
  - [ ] Severity badges display correctly
  - [ ] `cd project && npx tsc --noEmit` → zero errors

  **Commit**: YES (groups with 14, 16-20)

---

- [ ] 16. QC Grade Assignment Component

  **What to do**:
  - Create `project/src/components/QualityControl/GradeAssignment.tsx`
    - Display inspection results and auto-calculate grade from checklist scores
    - Grade thresholds: configurable rules (score ranges → grade)
    - Manual grade override with justification
    - Grade history view per batch/product
    - Consistent with existing QualityGrade type ('A' | 'B' | 'C' | 'Extra' | 'First' | 'Second' | 'Third')

  **Recommended Agent Profile**: `visual-engineering` + `frontend-ui-ux`

  **Parallelization**: Wave 4 | Blocks: 21 | Blocked By: 13

  **References**:
  - `project/src/types/reception.ts:QualityGrade` — Existing grade enum to match
  - `project/src/components/Harvests/HarvestCard.tsx:38-50` — Quality badge rendering pattern

  **Acceptance Criteria**:
  - [ ] Auto-grade calculation from scores
  - [ ] Manual override with justification
  - [ ] Consistent with existing QualityGrade type

  **Commit**: YES (groups with 14-15, 17-20)

---

- [ ] 17. QC Quality Metrics Dashboard Component

  **What to do**:
  - Create `project/src/components/QualityControl/QualityMetricsDashboard.tsx`
    - Summary cards: total inspections, avg quality score, rejection rate, pass rate
    - Grade distribution breakdown
    - Quality trend over time (use lightweight chart — recharts is already in package.json if available, otherwise simple HTML/CSS bars)
    - Filter by date range, farm, parcel, crop type
    - Follow `HarvestStatistics.tsx` pattern for summary cards

  **Recommended Agent Profile**: `visual-engineering` + `frontend-ui-ux`

  **Parallelization**: Wave 4 | Blocks: 21 | Blocked By: 13

  **References**:
  - `project/src/components/Harvests/HarvestStatistics.tsx` — Statistics card pattern
  - `project/src/components/Dashboard/HarvestSummaryWidget.tsx` — Dashboard widget pattern

  **Acceptance Criteria**:
  - [ ] Summary cards render with stats data
  - [ ] Empty state handled gracefully
  - [ ] Date range filter works

  **Commit**: YES (groups with 14-16, 18-20)

---

- [ ] 18. QC Non-Conformity Reporting Component

  **What to do**:
  - Create `project/src/components/QualityControl/NonConformityReport.tsx`
    - NCR creation form: severity, description, root cause analysis, affected batches
    - NCR list with status badges (open, under_review, corrective_action, resolved, closed)
    - Corrective action tracking: assign actions, due dates, responsible person
    - Escalation rules: auto-escalate if SLA exceeded
    - Link to source inspection
    - Email notification triggers for new NCRs and escalations

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Enterprise workflow with escalation logic and SLA tracking
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**: Wave 4 | Blocks: 21 | Blocked By: 13

  **References**:
  - `project/src/types/quality-control.ts:NonConformity` — Type definition
  - `project/src/components/Stock/ReceptionBatchList.tsx` — List with status filtering pattern

  **Acceptance Criteria**:
  - [ ] NCR create/edit form works
  - [ ] Corrective action tracking with due dates
  - [ ] Status workflow (open → resolved → closed)
  - [ ] Escalation logic implemented

  **Commit**: YES (groups with 14-17, 19-20)

---

- [ ] 19. QC Acceptance Workflow Component

  **What to do**:
  - Create `project/src/components/QualityControl/AcceptanceWorkflow.tsx`
    - Multi-step approval visualization (stepper UI)
    - Role-based routing: inspector → supervisor → QC manager (configurable chain)
    - Approve/reject with comments at each step
    - Workflow history timeline
    - SLA indicators: time remaining, overdue warnings
    - Email notifications at each workflow step
    - Escalation: auto-escalate to next level if SLA exceeded

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Enterprise multi-step approval workflow with role-based routing
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**: Wave 4 | Blocks: 21 | Blocked By: 13

  **References**:
  - `project/src/types/quality-control.ts:ApprovalWorkflow` — Workflow types
  - `project/src/lib/casl/defineAbilityFor.ts` — CASL permissions for role-based access

  **Acceptance Criteria**:
  - [ ] Multi-step approval stepper renders
  - [ ] Role-based approve/reject buttons (CASL integration)
  - [ ] Workflow history timeline displays
  - [ ] SLA countdown/overdue indicators

  **Commit**: YES (groups with 14-18, 20)

---

- [ ] 20. QC Certificate Generation Component

  **What to do**:
  - Create `project/src/components/QualityControl/CertificateGenerator.tsx`
    - Generate PDF quality certificate from approved inspection data
    - Use existing jsPDF + jspdf-autotable (already installed)
    - Certificate includes: inspection details, grade, inspector info, approval chain, date, organization branding
    - Preview before download
    - Certificate number generation (sequential per organization)
    - Follow pattern from `AIReportExport.tsx` for jsPDF usage

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: PDF generation with specific formatting requirements
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**: Wave 4 | Blocks: 21 | Blocked By: 13

  **References**:
  - `project/src/components/` — Search for `AIReportExport.tsx` or any jsPDF usage for pattern
  - jsPDF docs: https://github.com/parallax/jsPDF
  - jspdf-autotable: https://github.com/simonbengtsson/jsPDF-AutoTable

  **Acceptance Criteria**:
  - [ ] PDF generates with correct data
  - [ ] Preview renders before download
  - [ ] Certificate includes all required sections

  **Commit**: YES (groups with 14-19)
  - Message: `feat(quality-control): implement all 7 QC feature components`
  - Files: `project/src/components/QualityControl/*.tsx`

---

- [ ] 21. QC Route Integration — Replace Placeholder

  **What to do**:
  - Update `project/src/routes/_authenticated/(production)/production/quality-control.tsx`:
    - Replace placeholder with real QC page
    - Tab-based layout: Inspections | Checklists | Non-Conformities | Metrics | Certificates
    - Integrate all 7 feature components
    - Add route protection with CASL (`withRouteProtection`)
  - Update `project/src/routes/_authenticated/(production)/quality-control.tsx` (second route file):
    - Same integration as above

  **Must NOT do**:
  - Do not add new route files (update existing)
  - Do not change the URL paths

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Wave 4)
  - **Blocks**: Tasks 22-28
  - **Blocked By**: Tasks 14-20

  **References**:
  - `project/src/routes/_authenticated/(production)/production/quality-control.tsx` — File to update (currently placeholder)
  - `project/src/routes/_authenticated/(production)/quality-control.tsx` — Second route file to update
  - `project/src/routes/_authenticated/(production)/production/harvests.tsx` — Tab layout pattern

  **Acceptance Criteria**:
  - [ ] Placeholder replaced with functional QC page
  - [ ] Tab navigation between all 5 sections works
  - [ ] Route protection applied
  - [ ] `cd project && npx tsc --noEmit` → zero errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: QC page loads with all tabs
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:5173, authenticated user
    Steps:
      1. Navigate to http://localhost:5173/production/quality-control
      2. Wait for page load (timeout: 10s)
      3. Assert: Tab "Inspections" is visible
      4. Assert: Tab "Checklists" is visible
      5. Assert: Tab "Non-Conformities" is visible
      6. Assert: Tab "Metrics" is visible
      7. Assert: Tab "Certificates" is visible
      8. Click "Checklists" tab
      9. Assert: Checklists content renders
      10. Screenshot: .sisyphus/evidence/task-21-qc-page.png
    Expected Result: QC page loads with all 5 tabs functional
    Evidence: .sisyphus/evidence/task-21-qc-page.png
  ```

  **Commit**: YES
  - Message: `feat(quality-control): integrate all QC components into route, replacing placeholder`
  - Files: `project/src/routes/_authenticated/(production)/production/quality-control.tsx`, `project/src/routes/_authenticated/(production)/quality-control.tsx`

---

### PHASE 4: Quality Control Tests

- [ ] 22. QC API Layer Tests

  **What to do**:
  - Create `project/src/lib/api/__tests__/quality-control.test.ts`
  - Test all 12 `qualityControlApi` methods
  - Follow same pattern as Task 2 (Harvests API tests)
  - Mock `apiClient`, test URL construction, parameter passing, error handling

  **Recommended Agent Profile**: `unspecified-low`

  **Parallelization**: Wave 5 (with 23-28) | Blocked By: 12, 21

  **References**: Task 2 output (API test pattern), `project/src/lib/api/quality-control.ts`

  **Acceptance Criteria**:
  - [ ] Minimum 20 test cases
  - [ ] `cd project && npx vitest run src/lib/api/__tests__/quality-control.test.ts --reporter=verbose` → ALL PASS

  **Commit**: YES (groups with 23-28)

---

- [ ] 23. QC Hooks Tests

  **What to do**:
  - Create `project/src/hooks/__tests__/useQualityControl.test.ts`
  - Test all 14 hooks (6 queries + 8 mutations)
  - Follow same pattern as Task 4 (Harvests hooks tests)
  - Verify cache invalidation for workflow mutations (approve/reject should invalidate inspections + notifications)

  **Recommended Agent Profile**: `unspecified-high`

  **Parallelization**: Wave 5 (with 22, 24-28) | Blocked By: 13, 21

  **References**: Task 4 output (hook test pattern), `project/src/hooks/useQualityControl.ts`

  **Acceptance Criteria**:
  - [ ] All 14 hooks tested
  - [ ] Minimum 28 test cases
  - [ ] `cd project && npx vitest run src/hooks/__tests__/useQualityControl.test.ts --reporter=verbose` → ALL PASS

  **Commit**: YES (groups with 22, 24-28)

---

- [ ] 24-28. QC Component Tests (5 tasks — one per major component)

  **What to do**:
  - 24: `project/src/components/QualityControl/__tests__/InspectionChecklists.test.tsx`
  - 25: `project/src/components/QualityControl/__tests__/DefectDetection.test.tsx`
  - 26: `project/src/components/QualityControl/__tests__/GradeAssignment.test.tsx`
  - 27: `project/src/components/QualityControl/__tests__/NonConformityReport.test.tsx` + `AcceptanceWorkflow.test.tsx`
  - 28: `project/src/components/QualityControl/__tests__/QualityMetricsDashboard.test.tsx` + `CertificateGenerator.test.tsx`

  Each test file should:
  - Mock all hooks used by the component
  - Test rendering, user interactions, form validation, error states
  - Test empty states and loading states
  - Follow `SoilAnalysis.test.tsx` pattern

  **Recommended Agent Profile**: `unspecified-high` + `frontend-ui-ux`

  **Parallelization**: Wave 5 (parallel with each other) | Blocked By: 14-21

  **Acceptance Criteria**:
  - [ ] 7 test files created
  - [ ] Minimum 40 test cases total across all QC component tests
  - [ ] `cd project && npx vitest run src/components/QualityControl/__tests__/ --reporter=verbose` → ALL PASS

  **Commit**: YES
  - Message: `test(quality-control): add comprehensive unit tests for all QC components and hooks`

---

### PHASE 5: Final Verification

- [ ] 29. Final Integration Verification

  **What to do**:
  - Run the complete test suite: `cd project && npx vitest run --reporter=verbose`
  - Verify zero failures across all test files
  - Run type checking: `cd project && npx tsc --noEmit`
  - Run linting: `cd project && npx eslint src/ --max-warnings 0` (on new files only if full lint is noisy)
  - Verify NestJS builds: `cd agritech-api && npx nest build`
  - Run NestJS tests: `cd agritech-api && npx jest --testPathPattern=quality-control --verbose`
  - Count total test cases and produce summary report

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**: Sequential (final) | Blocked By: ALL previous tasks

  **Acceptance Criteria**:

  - [ ] `cd project && npx vitest run --reporter=verbose` → ALL PASS, 0 failures
  - [ ] `cd project && npx tsc --noEmit` → 0 errors
  - [ ] `cd agritech-api && npx nest build` → 0 errors
  - [ ] `cd agritech-api && npx jest --testPathPattern=quality-control --verbose` → ALL PASS
  - [ ] Total test count ≥ 200 across all test files

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Full test suite passes
    Tool: Bash
    Steps:
      1. cd project && npx vitest run --reporter=verbose 2>&1 | tail -20
      2. Assert: "0 failed" in output
      3. Assert: total test count >= 150 (frontend)
    Expected Result: All frontend tests pass
    Evidence: Complete vitest output

  Scenario: NestJS QC module passes
    Tool: Bash
    Steps:
      1. cd agritech-api && npx jest --testPathPattern=quality-control --verbose 2>&1 | tail -10
      2. Assert: "0 failed" in output
      3. Assert: minimum 20 tests pass
    Expected Result: All backend tests pass
    Evidence: Jest output

  Scenario: Type safety verified
    Tool: Bash
    Steps:
      1. cd project && npx tsc --noEmit 2>&1 | tail -5
      2. Assert: no new type errors introduced
    Expected Result: Zero type errors
    Evidence: tsc output
  ```

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task(s) | Message | Key Files | Verification |
|---|---|---|---|
| 1 | `test(production): add shared test utilities and mock factories` | `test/test-utils.tsx` | `tsc --noEmit` |
| 2-3 | `test(harvests): add API layer and utility tests` | `api/__tests__/harvests.test.ts`, `deliveries.test.ts`, `types/__tests__/harvests.test.ts` | `vitest run` |
| 4 | `test(harvests): add comprehensive hook tests for all 15 hooks` | `hooks/__tests__/useHarvests.test.ts` | `vitest run` |
| 5 | `test(harvests): add component tests` | `Harvests/__tests__/*.test.tsx` | `vitest run` |
| 6-7 | `test(reception): add API and hook tests for reception batches` | `api/__tests__/reception-batches.test.ts`, `hooks/__tests__/useReceptionBatches.test.ts` | `vitest run` |
| 8-9 | `test(campaigns,crop-cycles): add hook and component tests` | `hooks/__tests__/useAgriculturalAccounting.test.ts`, component tests | `vitest run` |
| 10 | `feat(quality-control): define comprehensive TypeScript types` | `types/quality-control.ts` | `tsc --noEmit` |
| 11 | `feat(api): implement enterprise QC NestJS module` | `agritech-api/src/modules/quality-control/**` | `nest build && jest` |
| 12-13 | `feat(quality-control): implement API client and hooks` | `api/quality-control.ts`, `hooks/useQualityControl.ts` | `tsc --noEmit` |
| 14-20 | `feat(quality-control): implement all 7 QC feature components` | `components/QualityControl/*.tsx` | `tsc --noEmit` |
| 21 | `feat(quality-control): integrate QC into route, replacing placeholder` | Route files | `tsc --noEmit` |
| 22-28 | `test(quality-control): add comprehensive unit tests for all QC code` | `__tests__/*.test.ts(x)` | `vitest run` |

---

## Success Criteria

### Verification Commands
```bash
# Frontend tests (ALL must pass)
cd project && npx vitest run --reporter=verbose
# Expected: ≥150 tests, 0 failures

# Type safety
cd project && npx tsc --noEmit
# Expected: 0 errors

# Backend build
cd agritech-api && npx nest build
# Expected: 0 errors

# Backend tests
cd agritech-api && npx jest --testPathPattern=quality-control --verbose
# Expected: ≥20 tests, 0 failures
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All frontend tests pass (≥150 test cases)
- [ ] All backend tests pass (≥20 test cases)
- [ ] Zero type errors
- [ ] QC page functional with all 7 features
- [ ] QC replaces placeholder (no more "under development" message)
- [ ] Enterprise workflow working (multi-step approval, SLA, notifications)
- [ ] PDF certificate generation working
