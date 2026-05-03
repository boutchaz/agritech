# HR Module Quick Wins — Implementation Plan (v3)

> **Goal**: Close the gap between AgroGina HR and Frappe HR by completing 5 features where the backend already exists but the frontend (and sometimes API layer) is missing.
>
> **Priority**: All P0/P1 items from the Frappe HR gap analysis.
> **Estimated effort**: ~4-5 days total for all 5 quick wins.

---

## Reference Patterns (use these, don't reinvent)

| Pattern | File | Signature / Usage |
|---------|------|-------------------|
| **Safe money math** | `invoices.service.ts` / `ledger.helper.ts` | `const roundCurrency = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100` |
| **Storage path validator** | `files.service.ts` | `private assertSafeStoragePath(bucket: string, filePath: string): void` |
| **PG transaction** | `database.service.ts` | `async executeInPgTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T>` |
| **FOR UPDATE lock** | `leave-applications.service.ts:324` | `SELECT ... FROM leave_allocations FOR UPDATE` inside `executeInPgTransaction` |
| **Notification emit** | `notifications.service.ts` + `notifications.gateway.ts` | `this.gateway.sendToUser(userId, payload, organizationId)` — always pass orgId |
| **CASL grants** | `casl-ability.factory.ts` | Hardcoded per role; custom roles from `role_permissions` |
| **Permission gen** | `scripts/gen-permissions-sql.ts` | Run `npm run gen:perms` — outputs to schema.sql |
| **CASL resources** | `casl/resources.ts` | Source-of-truth for permission resources |

---

## Quick Win 1: Geofence Admin UI

**Status**: DB schema ✅ | Backend CRUD ✅ | API client ✅ | Hooks ✅ | UI ❌

**What**: Allow HR admins to manage geofences (location zones per farm) for attendance validation. This is the **canary** — it exercises the full pipeline (build, auth, i18n, deploy) before the harder wins.

### Backend (none needed)

All endpoints, service methods, DTOs already exist:
- `GET /attendance/geofences` (list, optional `?farm_id=`)
- `POST /attendance/geofences` (create)
- `PATCH /attendance/geofences/:id` (update)
- `DELETE /attendance/geofences/:id` (delete)

API client hooks exist: `useGeofences`, `useCreateGeofence`, `useUpdateGeofence`, `useDeleteGeofence`

### Frontend

- **Route**: **Standalone route** `geofences.tsx` — NOT a tab on attendance. The attendance page is already busy, and loading map state on every attendance view is wasteful.
- **Components**:
  - Table: farm name, geofence name, lat/lng, radius (meters), active status toggle
  - Create/edit dialog: farm picker, name, lat/lng inputs, radius slider (10m–5km), active toggle
  - **Radius cap**: Backend DTO already enforces `radius_m` 10–50000. **Change to 10–5000 (5km)**. A 50km fence covers a province — useless for attendance. Update `upsert-geofence.dto.ts` max from 50000 to 5000. Frontend slider should match.
  - Delete confirmation
  - Map preview showing geofence circles (optional, follow-up)
- **i18n**: Add keys to all 3 languages

### Files to touch

```
NEW:  project/src/routes/_authenticated/(workforce)/workforce/geofences.tsx
EDIT: project/src/locales/{en,fr,ar}/common.json
```

### Effort

~2h. Ship this end-to-end including deploy — **verifies the build pipeline + auth-cookie flow + i18n work cleanly before tackling harder wins.**

---

## Quick Win 2: Recruitment Interviews

**Status**: DB schema ✅ | Backend CRUD ✅ | API client ✅ | Hooks ✅ | UI ❌

**What**: Add interview scheduling/feedback to the recruitment page. Currently only has Openings + Applicants tabs.

### Backend (none needed)

Endpoints exist:
- `GET /organizations/:orgId/interviews` (list, optional `?applicant_id=`)
- `POST /organizations/:orgId/interviews` (create)
- `PUT /organizations/:orgId/interviews/:id` (update — includes status and feedback)

API client: `interviewsApi.list/create/update`
Hooks: `useInterviews`, `useCreateInterview`, `useUpdateInterview`

### Multi-tenant FK validation (MANDATORY)

- **Interviewer picker**: Only show org members in the multi-select. Backend must verify all `interviewer_ids` belong to the org before writing.
- **Applicant + Opening**: Both already FK-constrained, but verify org ownership in the service before creating.

### Notifications (MANDATORY)

- Interview scheduled → notify applicant + all interviewers
- Interview status change (completed/cancelled) → notify applicant + interviewers
- Use: `this.notificationsService.createNotificationsForUsers(userIds, { organizationId, ... })` + `this.gateway.sendToUser(userId, payload, organizationId)`
- **Interviewer cap (MANDATORY)**: `interviewer_ids` array max length **10** in DTO + server-side guard. A multi-select with no limit lets a fat-finger blast 30+ people with notifications.

### Interview feedback JSONB schema (PINNED)

The `feedback` column is JSONB with no enforced schema. Pin the shape now to prevent `average_rating` compute breakage:

```ts
// feedback: array of interviewer feedback entries
interface InterviewFeedback {
  interviewer_id: string;  // UUID — must match an entry in interviewer_ids
  rating: number;          // 1-5 integer — server validates range
  notes?: string;          // optional free text
  submitted_at: string;    // ISO 8601 timestamp
}
// average_rating = sum(rating) / count, computed server-side on every update
// Server MUST validate: rating is integer 1-5, interviewer_id in interviewer_ids, no duplicates
```

### Frontend

- **UI**: Add "Interviews" tab to existing `recruitment.tsx` page
  - Interview list: applicant name, opening title, round, type, scheduled date, duration, status badge, average rating
  - Create dialog: applicant picker (filtered by opening), opening picker, round, interview type, date/time, duration, location, interviewer multi-select (org members only)
  - Edit dialog: change status, add feedback (per-interviewer rating + notes)
  - View feedback: timeline, average rating, interviewer details
  - Filter by: opening, status, date range
- **i18n**: Add keys to all 3 languages

### Files to touch

```
EDIT: project/src/routes/_authenticated/(workforce)/workforce/recruitment.tsx (add Interviews tab)
EDIT: project/src/locales/{en,fr,ar}/common.json
```

### Effort

~4h. UI + interviewer org-scoping + notifications.

---

## Quick Win 3: Worker Documents UI

**Status**: DB schema ✅ | Backend CRUD ✅ | API client ❌ | Hooks ❌ | UI ❌

**What**: Worker document management — upload, verify, track expiry. Backend is rich (13 document types, expiry tracking, verification workflow, upsert-by-type).

### Backend (none needed — but file upload path needs allowlisting)

All endpoints exist:
- `GET /organizations/:orgId/worker-documents` (list, filters: `worker_id`, `document_type`, `expiring_within_days`)
- `GET /organizations/:orgId/worker-documents/:id`
- `POST /organizations/:orgId/worker-documents` (upsert by worker+type)
- `PUT /organizations/:orgId/worker-documents/:id`
- `PUT /organizations/:orgId/worker-documents/:id/verify`
- `DELETE /organizations/:orgId/worker-documents/:id`

Document types: `cin, passport, work_permit, contract, cnss_card, medical_certificate, driving_license, pesticide_certification, training_certificate, bank_details, tax_document, photo, other`

CASL subject `WorkerDocument` already exists in both `subject.enum.ts` and `ability.ts`.

### File uploads — Storage path hardening (MANDATORY)

- **Bucket name**: `worker-documents` (pinned — do not deviate)
- **Add bucket** to allowlist in `files.service.ts`
- **Path template**: `${orgId}/worker-documents/${workerId}/${docType}/${filename}`
- **Server-side validation**: Call `assertSafeStoragePath(bucket, path)` — reject paths without the org-scoped prefix
- Do NOT trust the frontend to provide correct paths

### Notifications (post-MVP, but plan for it)

- Document expiring within 30 days → notify HR admin role (cron-driven, skip for now but leave a `// TODO: EXPIRY_NOTIFICATION` comment in the list endpoint)

### Frontend

- **API client**: Create `worker-documents.ts` in `src/lib/api/`
  - `workerDocumentsApi.list(orgId, filters?)`
  - `workerDocumentsApi.getOne(orgId, id)`
  - `workerDocumentsApi.create(orgId, data)`
  - `workerDocumentsApi.update(orgId, id, data)`
  - `workerDocumentsApi.verify(orgId, id)`
  - `workerDocumentsApi.delete(orgId, id)`
- **Hooks**: Create `useWorkerDocuments.ts` in `src/hooks/`
  - `useWorkerDocuments(orgId, filters?)`
  - `useWorkerDocument(orgId, id)`
  - `useCreateWorkerDocument()`
  - `useUpdateWorkerDocument()`
  - `useVerifyWorkerDocument()`
  - `useDeleteWorkerDocument()`
- **UI**:
  - Add "Documents" tab to worker detail page (`workers.$workerId.tsx`)
  - Components:
    - Document list grouped by type with status badges (verified ✅ / expired 🔴 / expiring soon 🟡 / missing ⚪)
    - Upload dialog: type picker, file upload via Supabase Storage, expiry date, notes
    - Verify action (admin only) — one-click, updates badge
    - Expiry summary card: "3 documents expiring within 30 days" with links
- **i18n**: Add keys to all 3 languages (~30 keys for this feature: document type labels, status badges, upload dialog, verify actions, expiry messages)

### Tests (MANDATORY — minimum coverage)

The backend exists but has zero tests. Add to a new `worker-documents.service.spec.ts`:
1. **Org-scope test**: Create document with foreign org's worker_id → expect rejection
2. **Validation test**: Invalid document_type → expect error; duplicate type for same worker → upsert (not error)
3. **Verify test**: Verify flips `is_verified=true` + sets `verified_by`/`verified_at`; calling verify twice is **idempotent** (no error, same result)
4. **Happy path**: Upload → verify → update → delete round-trip

### Files to touch

```
NEW:  project/src/lib/api/worker-documents.ts
NEW:  project/src/hooks/useWorkerDocuments.ts
EDIT: project/src/routes/_authenticated/(workforce)/workers.$workerId.tsx (add Documents tab)
EDIT: agritech-api/src/modules/files/files.service.ts (add worker-documents bucket to allowlist)
NEW:  agritech-api/src/modules/worker-documents/worker-documents.service.spec.ts
EDIT: project/src/locales/{en,fr,ar}/common.json
```

### Effort

~6-8h. Storage integration + API client + hooks + upload UI + expiry tracking + verify flow + tests. Not 4h.

---

## Quick Win 4: Leave Block Dates

**Status**: DB schema ✅ | Backend CRUD ❌ | API client ❌ | Hooks ❌ | UI ❌

**What**: Allow HR admins to block specific dates when leave cannot be taken (harvest season, peak periods). Frappe HR calls this "Leave Block Lists."

### Backend

Add to `leave-management` module:

- **Controller**: `leave-block-dates.controller.ts`
  - `GET /organizations/:orgId/leave-block-dates` — list (optional `?year=2026`)
  - `POST /organizations/:orgId/leave-block-dates` — create
  - `PUT /organizations/:orgId/leave-block-dates/:id` — update
  - `DELETE /organizations/:orgId/leave-block-dates/:id` — delete
- **Service**: `leave-block-dates.service.ts`
  - CRUD methods
  - **Extract `overlapsBlockDate()` from `leave-applications.service.ts`** into this service. Leave-applications imports and calls it. DO NOT fork the logic.
- **DTOs**: `create-leave-block-date.dto.ts`, `update-leave-block-date.dto.ts`
  - Fields: `block_date` (date), `reason` (string), `applies_to` (string[]), `allowed_approvers` (UUID[])
- **Module**: Register in `leave-management.module.ts`

### Multi-tenant FK validation (MANDATORY)

- On create/update: validate every UUID in `allowed_approvers` is an org member before writing.

### CASL permissions (full chain, not just the enum)

1. Add `LEAVE_BLOCK_DATE` to `Subject` enum in `subject.enum.ts`
2. Add grants in `casl-ability.factory.ts`:
   - `organization_admin` → full CRUD
   - `farm_manager` → Read + Create
   - `farm_worker` / `day_laborer` / `viewer` → Read only
3. Add resource to `casl/resources.ts`
4. Run `npm run gen:perms` — regenerates permission SQL
5. Verify the generated SQL in schema migration

### Frontend

- **API client**: Add `leaveBlockDatesApi` to `leave-management.ts`
- **Hooks**: `useLeaveBlockDates`, `useCreateLeaveBlockDate`, `useUpdateLeaveBlockDate`, `useDeleteLeaveBlockDate` in `useLeaveManagement.ts`
- **UI**: New route `leave-block-dates.tsx`
  - Calendar-style list of blocked dates with reason and applies_to
  - Create/edit dialog with date picker, reason, applies_to selector, allowed_approvers picker
  - Delete confirmation
- **i18n**: Add keys to all 3 languages

### Files to touch

```
NEW:  agritech-api/src/modules/leave-management/leave-block-dates.controller.ts
NEW:  agritech-api/src/modules/leave-management/leave-block-dates.service.ts
NEW:  agritech-api/src/modules/leave-management/dto/create-leave-block-date.dto.ts
EDIT: agritech-api/src/modules/leave-management/leave-management.module.ts
EDIT: agritech-api/src/modules/leave-management/leave-applications.service.ts (extract overlapsBlockDate → import from new service)
EDIT: agritech-api/src/modules/casl/subject.enum.ts
EDIT: agritech-api/src/modules/casl/casl-ability.factory.ts
EDIT: agritech-api/src/modules/casl/resources.ts
EDIT: project/src/lib/api/leave-management.ts
EDIT: project/src/hooks/useLeaveManagement.ts
NEW:  project/src/routes/_authenticated/(workforce)/workforce/leave-block-dates.tsx
EDIT: project/src/locales/{en,fr,ar}/common.json
```

### Tests (MANDATORY — minimum coverage)

For `leave-block-dates.service.ts`:
1. **Org-scope test**: Create block date with foreign org's UUID in `allowed_approvers` → expect rejection
2. **Validation test**: Create with empty reason or past date → expect validation error
3. **Happy path**: CRUD round-trip + verify `overlapsBlockDate()` returns true for blocked date

### Effort

~8-10h. Backend CRUD + extract shared logic + CASL full chain + tests + API client + hooks + UI.

---

## Quick Win 5: Leave Encashments

**Status**: DB schema ✅ | Backend CRUD ❌ | API client ❌ | Hooks ❌ | UI ❌

**What**: Allow workers to encash unused leave days. Leave types already have `is_encashable` and `encashment_amount_per_day`. Leave allocations have `encashed_days` counter. We need the encashment *workflow*.

### Backend

- **Controller**: `leave-encashments.controller.ts`
  - `GET /organizations/:orgId/leave-encashments` — list (optional `?worker_id=`, `?status=`)
  - `POST /organizations/:orgId/leave-encashments` — create
  - `PUT /organizations/:orgId/leave-encashments/:id/approve` — approve
  - `PUT /organizations/:orgId/leave-encashments/:id/cancel` — cancel
- **Service**: `leave-encashments.service.ts`
  - Create: validate leave type `is_encashable`, check allocation balance, compute `total_amount`
  - **Approve (ATOMIC — hard requirement)**:
    ```
    await this.db.executeInPgTransaction(async (pg) => {
      // 1. Lock the allocation row
      const allocResult = await pg.query(
        `SELECT used_days, encashed_days, total_days FROM leave_allocations
         WHERE id = $1 AND organization_id = $2 FOR UPDATE`, [allocationId, orgId]);
      // 2. Validate balance: total_days - used_days - encashed_days >= days_encashed
      // 3. Flip encashment status to 'approved', set approved_by/at
      // 4. Increment allocation encashed_days
    });
    ```
  - **Cancel (ATOMIC — hard requirement)**:
    ```
    await this.db.executeInPgTransaction(async (pg) => {
      // If encashment was 'approved':
      //   1. Lock allocation FOR UPDATE
      //   2. Decrement encashed_days
      //   3. Flip encashment status to 'cancelled'
      // If encashment was 'pending':
      //   Just flip status to 'cancelled' (no allocation change needed)
    });
    ```
  - **Cancel authorization (MANDATORY)**: Mirror `leave-applications.cancel` — pass `isAdmin: boolean` into the service.
    - Worker cancelling their own pending encashment → allowed (no allocation change needed)
    - Worker cancelling an **approved** encashment → **DENIED**. Only admin (farm_manager / organization_admin) can reverse an approval.
    - Admin cancelling any encashment → allowed, with allocation counter reversal if approved
    - Service must check: `if (encashment.status === 'approved' && !isAdmin) throw ForbiddenException`
  - **Money math (MANDATORY)**: `total_amount = roundCurrency(days_encashed * amount_per_day)` — use the `roundCurrency` pattern from `invoices.service.ts`. No raw float multiplication.
- **DTOs**: `create-leave-encashment.dto.ts`
  - Fields: `worker_id`, `leave_type_id`, `leave_allocation_id`, `days_encashed`
  - Computed server-side: `amount_per_day` (from leave type), `total_amount`
- **Module**: Register in `leave-management.module.ts`

### Multi-tenant FK validation (MANDATORY)

On create: validate `worker_id`, `leave_type_id`, and `leave_allocation_id` all belong to the org BEFORE writing. Use the same pattern as `leave-applications.service.ts`.

### Notifications (MANDATORY)

- Encashment created → notify farm_manager/organization_admin for approval
- Encashment approved → notify worker (PAYMENT_PROCESSED-like event)
- Encashment cancelled → notify worker
- Use: `this.notificationsService.createNotificationsForUsers(...)` + `this.gateway.sendToUser(userId, payload, organizationId)`

### CASL permissions (full chain)

1. Add `LEAVE_ENCASHMENT` to `Subject` enum
2. Add grants in `casl-ability.factory.ts`:
   - `organization_admin` → full CRUD + approve
   - `farm_manager` → Create + Read + approve
   - `farm_worker` → Create + Read (own encashments only)
   - `day_laborer` / `viewer` → Read only
3. Add resource to `casl/resources.ts`
4. Run `npm run gen:perms`

### Frontend

- **API client**: Add `leaveEncashmentsApi` to `leave-management.ts`
- **Hooks**: `useLeaveEncashments`, `useCreateLeaveEncashment`, `useApproveLeaveEncashment`, `useCancelLeaveEncashment`
- **UI**: New route `leave-encashments.tsx`
  - Table: worker name, leave type, days encashed, amount (formatted with currency), status badge, actions
  - Create dialog:
    - Worker picker
    - Leave type picker (filtered to only `is_encashable` types)
    - Shows remaining balance from allocation
    - Days input → auto-computes amount using `roundCurrency`
    - Pre-submit validation: days > remaining balance → error
  - Approve/Cancel actions per row (with confirmation dialog)
  - Filter by: status, worker, leave type
- **i18n**: Add keys to all 3 languages

### Files to touch

```
NEW:  agritech-api/src/modules/leave-management/leave-encashments.controller.ts
NEW:  agritech-api/src/modules/leave-management/leave-encashments.service.ts
NEW:  agritech-api/src/modules/leave-management/dto/create-leave-encashment.dto.ts
EDIT: agritech-api/src/modules/leave-management/leave-management.module.ts
EDIT: agritech-api/src/modules/casl/subject.enum.ts
EDIT: agritech-api/src/modules/casl/casl-ability.factory.ts
EDIT: agritech-api/src/modules/casl/resources.ts
EDIT: project/src/lib/api/leave-management.ts
EDIT: project/src/hooks/useLeaveManagement.ts
NEW:  project/src/routes/_authenticated/(workforce)/workforce/leave-encashments.tsx
EDIT: project/src/locales/{en,fr,ar}/common.json
```

### Tests (MANDATORY — minimum coverage)

For `leave-encashments.service.ts`:
1. **Org-scope test**: Create encashment with foreign org's allocation → expect rejection
2. **Validation test**: Days encashed > remaining balance → expect error
3. **Float safety test**: `3 days × 33.33 = 99.99` not `99.98999999999999`
4. **Atomicity test**: Approve increments `encashed_days` AND flips status in one tx; if one fails, both roll back
5. **Cancel authorization test**: Worker cancelling an approved encashment → Forbidden; admin cancelling → allowed with counter reversal
6. **Happy path**: Create → Approve → verify allocation counter updated → Cancel (admin) → verify counter decremented

### Effort

~8-10h. Transactional approve/cancel + float-safe math + notifications + CASL chain + tests + full UI.

---

## Implementation Order (revised)

| Order | Quick Win | Effort | Rationale |
|-------|-----------|--------|-----------|
| 1 | **Geofence Admin UI** | ~2h | Pure frontend. Ships as **canary** — verifies build pipeline, auth, i18n, deploy all work before harder wins. |
| 2 | **Recruitment Interviews** | ~4h | Pure frontend + interviewer org-scoping + notifications. Backend/API/hooks exist. |
| 3 | **Worker Documents UI** | ~6-8h | API client + hooks + Storage integration + upload + expiry tracking + verify flow. Backend exists. |
| 4 | **Leave Block Dates** | ~8-10h | New backend CRUD + extract shared logic + CASL chain + tests + full frontend. |
| 5 | **Leave Encashments** | ~8-10h | New backend with transactions + float-safe math + notifications + CASL chain + tests + full frontend. |

**Total estimated effort**: ~28-34 hours (~4-5 days)

**Canary checkpoint**: After shipping #1, verify end-to-end before starting #2. If the pipeline breaks, fix infra before building on it.

---

## Cross-cutting concerns (v3)

### No new migrations required
All 5 features use existing DB tables with existing RLS policies. **Do NOT add migrations speculatively.** If a migration seems needed, stop and validate against the schema first.

### RLS sanity check (MANDATORY for features creating new services)
Existing tables (`leave_block_dates`, `leave_encashments`, `interviews`, `worker_documents`, `farm_geofences`) all have RLS policies using `is_organization_member(organization_id)`. New services must NOT bypass RLS by using admin client without org filtering. Verify by reading the existing policy before writing the service.

### Build validation (MANDATORY)
- Run `npm run build` in `agritech-api/` AND `npx tsc --noEmit` in `project/` before committing.
- `tsc --noEmit` alone is NOT sufficient — `nest build` with stricter project config catches errors `tsc` misses.

### Code patterns
- Follow existing patterns: react-hook-form + zod, TanStack Query hooks, shadcn/ui, `cn()`, dark mode variants
- i18n: `t('key', 'Fallback text')` in all 3 languages (en, fr, ar)
- **i18n volume estimate**: ~20-40 keys per feature × 3 languages = ~60-120 key-value pairs per feature. Total across all 5: ~300-600 key-value pairs. This is non-trivial translation work — budget ~1h per feature for i18n alone. Consider batching all keys into a single PR for translator review.
- Organization_id filtering on every query — no exceptions

### Money math
- ALWAYS use `roundCurrency` (EPSILON pattern) for any financial calculation. No raw float multiplication.
- Reference: `invoices.service.ts` → `const roundCurrency = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100`

### Atomicity
- Any operation that flips status + updates a counter MUST use `executeInPgTransaction` with `FOR UPDATE` lock on the counter row.
- Reference: `leave-applications.service.ts:approve()` — the exact pattern for encashments.

### Multi-tenant FK validation
- Every create/update must verify foreign IDs belong to the org BEFORE writing.
- This applies to: encashment worker/type/allocation IDs, block date approver IDs, interview interviewer IDs.

### File uploads
- Use `assertSafeStoragePath(bucket, path)` — path must include org scope: `${orgId}/worker-documents/${workerId}/${docType}/${filename}`
- Reject paths without org-scoped prefix server-side
- Add new bucket to allowlist in `files.service.ts`

### Notifications
- Minimum: status-change events for encashments, interview scheduling, document verification
- Always pass `organizationId` to `gateway.sendToUser(userId, payload, organizationId)`

### CASL permissions (full chain, not just the enum)
For every new subject:
1. Add to `Subject` enum in `subject.enum.ts`
2. Add role grants in `casl-ability.factory.ts`
3. Add resource to `casl/resources.ts`
4. Run `npm run gen:perms` — regenerates permission SQL
5. Verify generated SQL

### Tests (minimum for each new backend service)
1. Org-scope test (foreign-id rejection)
2. Validation test (zero/negative/boundary inputs)
3. One happy-path round-trip

### Audit review before each PR
Run this checklist against every PR diff:
```
[ ] Every DB write verifies org membership of foreign IDs
[ ] No raw float math on money fields (roundCurrency used)
[ ] Status + counter updates wrapped in executeInPgTransaction with FOR UPDATE
[ ] New CASL subjects have full chain (enum → factory → resources → gen:perms)
[ ] RLS policies on target tables use is_organization_member() — verify, don't assume
[ ] No new DB migrations added unless explicitly required
[ ] Storage paths are org-scoped and validated server-side
[ ] Notification payloads include organizationId
[ ] Interview feedback JSONB matches pinned schema before compute
[ ] Interviewer arrays capped at 10
```

---

## Review Log

### Review 1 — Architecture & Security Hardening

**Source**: Plan review against recent production audit findings.

| # | Issue | Correction Applied | Rationale |
|---|-------|--------------------|-----------|
| 1 | Effort estimates too optimistic | Worker Docs 6→6-8h, Block Dates 6→8-10h, Encashments 6→8-10h. Total 21h→28-34h | Storage integration, CASL chain, tests all add real hours. |
| 2 | Build validation gate insufficient | `npm run build` in agritech-api AND `npx tsc --noEmit` in project | A deploy was lost because `nest build` (stricter tsconfig) caught errors `tsc` missed. |
| 3 | Geofence UI choice | Standalone route `geofences.tsx`, NOT a tab on attendance | Attendance page is already busy. Loading map state on every attendance view is wasteful. Standalone ages better. |
| 4 | CASL grants incomplete | 5-step chain per new subject: enum → factory grants → resources.ts → `npm run gen:perms` → verify SQL | Adding to the enum is half the job. Precommit hook blocks otherwise. Missing any step = runtime 403. |
| 5 | Encashment approve/cancel atomicity | `executeInPgTransaction` + `FOR UPDATE` on `leave_allocations` row. Cancel reverses both status and counter. | Same float-spend class as leave approve/cancel. Without lock, concurrent approvals double-spend the allocation. Reference: `leave-applications.service.ts:approve()`. |
| 6 | Multi-tenant FK validation | Every create/update verifies foreign IDs belong to org before writing. Applies to: encashment worker/type/allocation, block date approvers, interview interviewers. | Recent HR audit finding: without this, cross-org data leakage is possible via crafted FK values. |
| 7 | File upload storage hardening | Bucket name pinned (`worker-documents`), path template `${orgId}/worker-documents/${workerId}/${docType}/${filename}`, `assertSafeStoragePath` called server-side. | Don't trust frontend paths. Reject anything without org-scoped prefix. |
| 8 | Notifications missing from plan | Encashment status changes → worker + admin. Interview scheduling → applicant + interviewers. Document expiry → HR admin (post-MVP). All via org-scoped `sendToUser(userId, payload, organizationId)`. | Without notifications, HR flows are dead-letter — nobody knows to act. |
| 9 | Money math — float bug class | `roundCurrency` (EPSILON pattern) mandatory for encashment `total_amount`. Float safety test added. | Same bug class as piece-work and invoices. Raw float multiplication produces `99.98999999999999`. |
| 10 | Block dates logic fork risk | Extract `overlapsBlockDate()` from leave-applications into new block-dates service. Leave-applications imports it. Don't fork. | If duplicated, the two copies will drift. One gets a bug fix, the other doesn't. |
| 11 | Tests — none planned | Minimum per new backend service: org-scope test, validation test, happy-path. Encashments get 6 (adds atomicity, float, cancel-auth). | Current HR test suite is empty. Start here. |
| 12 | Sequencing — canary checkpoint | Ship #1 (Geofence) end-to-end before starting #2. Verify build pipeline + auth-cookie flow + i18n drop all work. | Recent infra changes mean the pipeline might be fragile. Don't build on a broken foundation. |
| 13 | Cross-cutting audit review | 4-line pre-PR checklist (later expanded to 10 in Review 2). | Easy to forget org-filter/FK-validation/float-safe patterns mid-implementation. |

---

### Review 2 — Edge Cases & Schema Pinning

**Source**: Detailed plan review for ambiguous semantics and missing edge cases.

| # | Issue | Correction Applied | Rationale |
|---|-------|--------------------|-----------|
| 1 | **Encashment cancel authorization ambiguous** | Added `isAdmin` flag mirroring `leave-applications.cancel`. Worker can cancel own *pending* only. Worker cancelling *approved* → Forbidden. Admin can cancel anything with counter reversal. Added test case. | Without this, a worker can reverse an admin's approval, effectively undoing a financial decision. |
| 2 | **Geofence radius range too large** | DTO max changed from 50000m (50km) → 5000m (5km). Frontend slider matches. | 50km covers a Moroccan province. Useless for attendance. Practical max is ~5km (a large farm + surrounding area). |
| 3 | **Interview feedback JSONB untyped** | Pinned schema: `{ interviewer_id: UUID, rating: 1-5 int, notes?: string, submitted_at: ISO }[]`. Server validates: rating range, interviewer_id ∈ interviewer_ids, no duplicates. `average_rating` computed server-side. | Without a pinned shape, every UI iteration breaks the `average_rating` compute. JSONB is schemaless — enforce in service layer. |
| 4 | **Worker documents verify untested** | Added idempotent verify test: calling verify twice returns same result, no error. | Verify is a trust-establishing action — must be bulletproof. Idempotency prevents double-notification or audit confusion. |
| 5 | **Notification spam risk on interviews** | `interviewer_ids` capped at 10 in DTO + server-side guard. | Multi-select without limit + fat-finger = 30+ notification blast. Cap prevents abuse. |
| 6 | **i18n key volume underestimated** | ~20-40 keys × 3 langs per feature. Total ~300-600 key-value pairs across all 5. Budget ~1h per feature. Suggest batching into single PR for translator review. | i18n is non-trivial work. Each key needs: English source, French translation, Arabic translation + RTL considerations. |
| 7 | **Storage bucket name ambiguous** | Pinned: `worker-documents` (removed "e.g."). | "e.g." leads to drift between code and Supabase project config. Pin it now. |
| 8 | **Migration assumption not stated** | Added explicit: "No new migrations required for any quick win." | Without this line, someone adds a migration speculatively, creating drift between branches. |
| 9 | **RLS policy verification missing** | Added RLS sanity check to cross-cutting + audit checklist: verify `is_organization_member(organization_id)` on target tables before writing service. | Services using admin client bypass RLS. Must add explicit org filters. Easy to forget — recent audit caught this. |
