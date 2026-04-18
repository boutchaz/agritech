# AgroGina Tasks Enhancement Proposal

**Product**: AgroGina Agricultural ERP — Tasks Module (`/tasks`)
**Date**: April 2026
**Scope**: Structured enhancement proposal based on full codebase audit
**Status**: Draft for CEO review

---

## 1. Jobs-to-be-Done (by Persona)

### Karim — Farm Manager, Large Farm (300ha, Meknes)
*Hates friction. Needs "who does what, when, where" at a glance.*

| # | JTBD | Context | Current Gap |
|---|------|---------|-------------|
| K1 | Assign today's irrigation blocks before 7am | Morning briefing — 6 parcels, 12 workers, 3 crews | No "today view" filter; must scroll full list; no crew/group assignment |
| K2 | See which tasks are blocked by overdue predecessors | Spraying can't start until soil prep finishes | Dependencies exist but no visual blocking indicator in list/kanban views |
| K3 | Reassign a worker mid-day when someone doesn't show up | Ahmed called in sick, need to shift his 3 tasks to Youssef | Must open each task individually; no bulk reassign |
| K4 | Know at 5pm what got done today vs. what didn't | End-of-day status check before going home | No "daily summary" view; must manually scan all tasks |
| K5 | Approve completed tasks from my phone while in the field | Walking parcels, can't be at desk | TaskDetailDialog has hardcoded French; actions work but UX is not mobile-first |
| K6 | Prevent pesticide application when conditions are unsafe | Safety/compliance — product label specifies max wind speed, rain-free period, temperature range | No weather window integration; wind speed thresholds should come from product label data, not a universal rule |
| K7 | Quickly duplicate last week's fertilization plan for this week | Same crops, same products, new dates | No "duplicate task" or "copy from template" action |
| K8 | See cost accumulating as tasks are completed | Budget tracking per campaign | Payment info exists but no running total view; costs fragmented |

### Hassan — Agronomist (manages 5-15 farms)
*Wants traceability, dependencies, scientific context, history.*

| # | JTBD | Context | Current Gap |
|---|------|---------|-------------|
| H1 | Prove pesticide application window for audit (PHI/REI) | Export certification requires spray records with dates, products, dosages, pre-harvest intervals | Stock consumption linked but no PHI/REI calculation; no application record printout |
| H2 | Plan a spray schedule respecting weather forecasts and PHI | Next 7 days: rain Wed-Fri, harvest Monday → must spray by Tuesday | No weather integration; no PHI countdown display |
| H3 | Link tasks to specific crop cycle stages | Fertilization at flowering vs. fruit-set requires different NPK | crop_cycle_id exists in form but no stage awareness or validation |
| H4 | Track which parcels have been irrigated this week | 15 parcels across 5 farms, need to spot the gap | Calendar view exists but no parcel-level weekly heatmap |
| H5 | Review historical task completion rates by worker/parcel | Season planning — who is productive on what crop | Statistics API exists but no visual trend/history in UI |
| H6 | Attach a scouting photo to a pest control task before it's assigned | Found aphids, photo evidence needed for the treatment task | Attachments exist but can't attach before task creation |
| H7 | Set task dependencies so spraying waits for soil analysis results | Sequential operations — can't skip steps | Dependencies implemented but no Gantt/timeline view to visualize them |
| H8 | View all tasks for a specific crop cycle across farms | Comparing olive grove treatments across 3 farms | Filter by crop_cycle_id exists in backend but not exposed in UI filters |

### Fatima — Org Admin / Cooperative (500-2000ha)
*Reporting, consolidation across members, exports for compliance.*

| # | JTBD | Context | Current Gap |
|---|------|---------|-------------|
| F1 | Generate a monthly task completion report across all farms | Board reporting — need completion rates, costs, delays | Statistics API exists but no exportable report; no date-range filtering in stats |
| F2 | See which cooperative members are behind on their task plans | Consolidation view across 8+ farm members | No multi-farm consolidated view; must switch farms one by one |
| F3 | Export pesticide application records for export certification | GLOBALG.A.P requires spray records with PHI | No export functionality; no compliance-specific report template |
| F4 | Compare labor costs across farms this month | Budget variance analysis | Payment data exists per-task but no farm-comparison or aggregation view |
| F5 | Approve new task templates for standard operations | Standardize fertilizer schedules across the cooperative | Task templates exist in backend but no UI for template management |
| F6 | Track seasonal worker productivity trends | Hiring decisions for next season | No worker-level analytics dashboard; no time-series view |
| F7 | Receive alerts when a farm has >3 overdue tasks | Risk management for cooperative members | Email notifications exist for overdue but no in-app alert dashboard |

### Ahmed — Small Farm Manager (50ha, Darija, Low Digital Literacy)
*Needs Level 1: simple, actionable, zero jargon.*

| # | JTBD | Context | Current Gap |
|---|------|---------|-------------|
| A1 | See what I need to do today in one sentence | "سقي القطعة B3 قبل 8 صباحاً" (sqi l-qit'a B3 qbl 8 sbah) — no labels, no badges | No Level 1 view; current list shows badges, priorities, status colors — overwhelming |
| A2 | Mark a task as done with one tap | In the field, gloves on, one hand on phone | Complete button exists but requires opening detail dialog for harvest tasks |
| A3 | Add a voice note instead of typing | Can't type in Darija easily | No voice input; comments are text-only |
| A4 | See tasks grouped by parcel, not by status | Thinks in terms of "my olive grove" not "pending vs. in-progress" | Kanban uses status columns; no parcel-grouped view option |
| A5 | Get a notification when a new task is assigned to me | Doesn't check the app proactively | No push notification system (PWA not yet implemented) |
| A6 | Read labels in Darija/Arabic, not French | "في الانتظار" vs "مسندة" is clear; "En attente" vs "Assignée" is not | Labels have i18n but ar translations may be incomplete; form has hardcoded French |
| A7 | Take a photo to prove the work is done | Visual evidence > text descriptions | Attachments exist in detail but not in the "quick complete" flow |

---

## 2. Heuristic UX Audit

### Methodology
Full source code audit of **12 task-related components** (`project/src/components/Tasks/`), **5 route files** (`tasks.tsx` layout + `index.tsx` + `calendar.tsx` + `kanban.tsx` + `$taskId.tsx`), hooks, API service, and type definitions. Findings ranked by severity. **52 findings** across 10 categories (List, Calendar, Kanban, Detail, Form, Mobile, Offline, Error States, Worker Availability, Thumb-Reach): ~5 Blockers, ~25 Major, ~22 Minor.

**Evidence scope**: This is a **code-based audit** — findings cite specific file paths and line numbers from the source. No live-product screenshots were captured (the baseline URL was provided but the browser audit was not completed due to authentication requirements). Recommendations should be validated against the live `/tasks` experience before implementation begins.

### 2.1 List View (`TasksList.tsx` — 1012 lines)

| Finding | Severity | Evidence |
|---------|----------|----------|
| **No farm/parcel/type filter chips** — Only status filters. Users with multi-farm orgs (Karim, Fatima) must scroll through mixed results. Farm filter exists in backend (`task-filters.dto.ts`) but not exposed in UI. | **Blocker** | Lines 826-851: only status filter buttons. No farm, parcel, task_type, or assignee filters in UI. |
| **Stats bar fetches ALL tasks** — `useTasks(organizationId, {})` on line 129 loads every task for stats calculation. For orgs with 1000+ tasks, this is a performance killer over 3G. | **Major** | Line 129: `const { data: allTasksForStats = [] } = useTasks(organizationId, {});` — unbounded fetch. |
| **Stats cards don't use the paginated API** — 7 stat cards calculated client-side from full dataset. Should use the statistics endpoint (`/api/v1/tasks/statistics`). | **Major** | Lines 136-148: client-side `filter().length` on full array. Backend `getStatistics()` exists but unused. |
| **Task form opens in full-screen overlay** — Modal is `fixed inset-0` with max-w-2xl. Not a shadcn Dialog. Disruptive for quick edits. | **Major** | TaskForm.tsx line 389: `<div className="fixed inset-0 bg-black bg-opacity-50...">` |
| **Bulk actions only change status** — No bulk reassign, bulk reschedule, bulk delete. Most common manager action (reassign) requires opening each task. | **Major** | Lines 220-238: `handleBulkStatusChange` only accepts `TaskStatus`. |
| **No keyboard shortcuts** — Power users (Hassan) can't use keyboard for rapid task management. | Minor | No `useHotkeys` or keyboard event handlers anywhere. |
| **Date display uses relative time** — "3 days ago" instead of actual dates. Confusing for scheduling. | Minor | Lines 297-303: `formatDistance()` for scheduled_start display. |
| **Empty state has double content** — Both `emptyMessage` and `emptyExtra` render for non-filtered empty state. | Minor | Lines 993-1005: `emptyAction` + `EmptyState` both rendered. |

### 2.2 Calendar View (`TasksCalendar.tsx` — 668 lines)

| Finding | Severity | Evidence |
|---------|----------|----------|
| **No drag-and-drop** — Tasks can't be rescheduled by dragging on the calendar. Must open form and change dates manually. | **Major** | No DnD library used. CalendarBody only renders items, no drag handlers. |
| **No week/day views** — Only month view. Daily planning (Karim's "7am briefing") is impossible. | **Major** | No view mode switcher. Only `CalendarBody` renders month grid. |
| **Loads ALL tasks for the month** — No pagination. For large farms with 200+ tasks/month, this will lag on 3G. | **Major** | Lines 593-596: `useTasks(organizationId, { date_from, date_to })` — no limit. |
| **Calendar uses custom Kibo UI library** — `@/components/kibo-ui/calendar`. Limited customization. Not a standard calendar library with drag-drop support. | Minor | Lines 1-14: imports from custom calendar package. |
| **No task creation by clicking a date** — Can't click an empty date to create a task for that date. Must use the "+" button then manually set the date. | Minor | `_handleDateClick` (line 243) only sets `selectedDate`, doesn't open creation form. |
| **Right panel shows tasks for clicked date but no way to create** — The empty state has a "+" button but it opens the full form without pre-filling the date. | Minor | Lines 414-422: `onCreateTask` doesn't pass the selected date. |

### 2.3 Kanban/Board View (`TasksKanban.tsx` — 654 lines)

| Finding | Severity | Evidence |
|---------|----------|----------|
| **Only 4 columns: pending, assigned, in_progress, completed** — Missing: paused, overdue, cancelled. Overdue tasks are invisible on the board! | **Blocker** | Line 52: `const KANBAN_COLUMNS = ['pending', 'assigned', 'in_progress', 'completed']` — filtered at line 455: `t.status !== 'cancelled' && t.status !== 'overdue' && t.status !== 'paused'` |
| **No filtering on kanban** — Can't filter by farm, parcel, worker, or type. Board shows everything. | **Major** | No filter state or UI. `useTasks(organizationId, {})` on line 441 — unfiltered. |
| **No WIP limits** — No visual indicator when a column has too many items. No "in-progress limit" like real kanban boards. | Minor | No WIP limit logic. |
| **Loads ALL tasks at once** — Same as calendar, no server-side pagination for kanban. | **Major** | Line 441: `useTasks(organizationId, {})` — fetches everything. |
| **Transition validation blocks valid moves silently** — `VALID_TRANSITIONS` (line 76-81) shows invalid drop via red highlight but no tooltip explaining WHY the move is invalid. | Minor | Lines 622-626: `isInvalidDrop` visual only, no explanation text. |
| **Arabic language falls back to French** — Line 439: `lang.startsWith('ar') ? 'fr' : 'en'` — Arabic users see French labels. | **Major** | `TasksKanban.tsx` line 439: hardcoded `? 'fr'` for Arabic. |

### 2.4 Task Detail (`$taskId.tsx` — 1200+ lines & `TaskDetailDialog.tsx` — 949 lines)

| Finding | Severity | Evidence |
|---------|----------|----------|
| **Massive code duplication** — `$taskId.tsx` and `TaskDetailDialog.tsx` share ~80% identical logic: harvest form, per-unit form, start/pause/complete handlers, crop loading. ~600 lines duplicated. | **Major** | Compare `TaskDetailDialog.tsx` lines 62-374 with `$taskId.tsx` lines 70-459. |
| **Hardcoded French strings throughout** — Both files have dozens of untranslated strings: "Enregistrer la récolte", "Terminer complètement", "Numéro de lot", "Culture récoltée", etc. | **Blocker** | TaskDetailDialog.tsx: lines 441-447 ("Type de tâche"), 449 ("Ferme"), 457 ("Parcelle"), 466 ("Assigné à"), 477 ("Durée estimée"), 486 ("Date prévue"), 496 ("Date limite"), 509 ("Description"), 518 ("Informations de paiement"), 551 ("Paiement à l'unité"), 651 ("Enregistrer la récolte"), 704 ("Numéro de lot"), 790 ("Grade de qualité"), etc. |
| **No back navigation confirmation** — Completing a harvest task navigates away but there's no undo. Accidental completions are irreversible. | Major | Line 354: `navigate({ to: '/tasks' })` — immediate navigation on success. |
| **Assignee sidebar shows logged-in user, not task assignee** — "Assignee" card shows `profile` (current user) instead of the task's assigned worker. | **Blocker** | Lines 1022-1043: `profile` used for assignee display, not `task.worker_name` or `taskAssignments`. |
| **No task edit from detail page** — "Edit" button navigates away to list with query param. Loses context. | Major | Line 462: `navigate({ to: '/tasks', search: { editTaskId: task.id } })` — full navigation. |

### 2.5 Task Form (`TaskForm.tsx` — 1091 lines)

| Finding | Severity | Evidence |
|---------|----------|----------|
| **Too long for mobile** — 1091-line form in a scrollable overlay. No section collapse. 3G users will struggle. | **Major** | Single continuous `<form>` with no accordion/stepper pattern. |
| **Payment section always visible** — Shown even for tasks with no payment implications. Adds cognitive load. | Minor | Lines 736-891: payment section renders when `task.payment_type` exists or defaults to 'daily'. |
| **Stock section toggle is hidden** — Optional stock types show a checkbox deep in the form. Easy to miss. | Minor | Lines 895-916: `stockEnabled` checkbox buried mid-form. |
| **Hardcoded French in some labels** — "Inclus dans le salaire" (line 679), "Montant forfaitaire (MAD)" (line 827). | **Major** | Lines 679, 827-828, 838: untranslated strings. |
| **Auto-title generation only works in French** — Line 269: `TASK_TYPE_LABELS[formData.task_type as TaskType]?.fr` — always uses French. | **Major** | Line 269: hardcoded `?.fr` for auto-generated title. |
| **No template selection UI** — `template_id` exists in type definition but no UI to select from task templates. Backend templates exist. | Major | No template selector in form. `task-templates` module exists in backend. |
| **No repeat pattern UI** — `repeat_pattern` exists in type but no recurrence UI in the form. | Major | No recurrence selector. RepeatPattern type defined but unused in form. |

### 2.6 Mobile / Responsive

| Finding | Severity | Evidence |
|---------|----------|----------|
| **Quick action buttons hidden on mobile** — Lines 365-366: `hidden xl:flex` and `hidden md:flex` hide Start/Pause/Complete buttons on small screens. Only accessible via dropdown. | **Major** | `renderTaskActions` hides buttons: `hidden xl:flex items-center gap-2`. |
| **Form overlay is not mobile-optimized** — `max-w-2xl w-full` works but the inner form has 2-3 column grids that squish on small screens. | Minor | Lines 422, 488, 691: `grid grid-cols-2/3 gap-4` — may need `grid-cols-1 sm:grid-cols-2`. |
| **No swipe gestures** — No swipe-to-complete, swipe-to-reassign on mobile. | Minor | No touch gesture library used. |
| **No bottom sheet pattern** — Task detail uses full overlay instead of mobile-native bottom sheet. | Minor | `fixed inset-0` pattern instead of sheet/drawer. |

### 2.7 Offline / Connectivity

| Finding | Severity | Evidence |
|---------|----------|----------|
| **staleTime only 30 seconds** — All task queries use `staleTime: 30 * 1000` (line 41, useTasks.ts). On 3G, this means aggressive refetching. Should be 5-10 minutes. | **Major** | useTasks.ts line 41: `staleTime: 30 * 1000`. |
| **No optimistic updates for task actions** — Start, pause, complete all await the API before UI updates. 3G latency = perceived lag. | **Major** | No `onMutate` with optimistic update in useUpdateTask (line 162-189). Only `onSuccess` invalidation. |
| **No offline queue** — Failed mutations show console.error but don't queue for retry. If network drops mid-complete, the action is lost. | **Major** | Lines 156-168 (TasksList.tsx): `console.error('Failed to start task:', error)` — no retry/queue. |
| **No connectivity indicator** — Users can't tell if their data is stale or live. | Minor | No network status banner. |
| **Work units query has 5min staleTime but tasks only 30s** — Inconsistent caching strategy. | Minor | TaskForm.tsx line 193: `staleTime: 5 * 60 * 1000` vs useTasks.ts line 41: `staleTime: 30 * 1000`. |
| **No sync conflict resolution** — If two users edit the same task while offline, there is no merge strategy. Last write wins silently. | **Major** | No version/timestamp check in `tasksApi.update()`. No `updated_at` conflict detection in patch payload. |
| **No local draft saving** — If the form is abandoned or the page crashes, all entered data is lost. No autosave to localStorage/IndexedDB. | **Major** | No `beforeunload` handler, no draft persistence in TaskForm. |

### 2.8 Error States

| Finding | Severity | Evidence |
|---------|----------|----------|
| **Error messages are hardcoded French** — Error states like "Erreur lors du démarrage de la tâche" are not translated. Ahmed sees French error text. | **Blocker** | TaskDetailDialog.tsx lines 182, 199, 218, 241, 279, 368: all `catch` blocks have hardcoded French fallback strings. |
| **No retry mechanism for failed mutations** — When a task action fails (network error), there's a red banner but no "Retry" button. User must repeat the entire action. | **Major** | `setError(err.message)` pattern throughout — no retry UI. |
| **No graceful degradation for list fetch failure** — If `usePaginatedTasks` fails, the user sees nothing. No cached data shown with "stale data" warning. | Minor | `usePaginatedTasks` has no `placeholderData` for error state; only `keepPreviousData` for loading. |

### 2.9 Worker Availability & Assignment

| Finding | Severity | Evidence |
|---------|----------|----------|
| **Worker availability hook is disabled** — `useWorkerAvailability` exists but returns `null` with `enabled: false`. Backend endpoint not implemented. | **Major** | useTasks.ts lines 115-124: `enabled: false`, placeholder only. |
| **No worker capacity display during assignment** — When assigning a worker, the manager can't see how many tasks they already have or their current workload. | **Major** | Task form assignment dropdown shows worker list but no task count or hours. |
| **Multi-worker assignment requires separate modal** — The `task-assignments` API exists but the primary task form only supports single `assigned_to`. Multi-worker assignment is a separate flow. | Minor | TaskForm has `assigned_to` (single); multi-worker via `TaskAssignee` component in detail view. |

### 2.10 Mobile Thumb-Reach Constraints

| Finding | Severity | Evidence |
|---------|----------|----------|
| **Primary actions at top, not bottom** — Start/Pause/Complete buttons in task detail are in a sidebar (desktop) or at the top of the page. Mobile UX best practice: primary actions at bottom within thumb reach. | **Major** | `$taskId.tsx` sidebar at lines 1021-1110; no mobile-specific repositioning. |
| **Navigation tabs at top require reach** — List/Calendar/Kanban tabs are at the top of the page. On a 6" phone held one-handed, these require thumb stretch. | Minor | tasks.tsx layout: tabs at lines 72-88, no bottom navigation option. |
| **Bulk action checkbox in top-left** — Selection checkboxes are at the left edge of rows. Right-handed users must stretch or use two hands. | Minor | TasksList: checkbox pattern in table rows, left-aligned. |

---

## 3. Agronomic / Ops Workflow Gaps

### 3.1 What's Missing (High-Impact Gaps)

| Gap | Domain Impact | Current State | Recommendation |
|-----|---------------|---------------|----------------|
| **Weather window integration** | Spray timing, irrigation planning, harvest scheduling | FastAPI backend (port 8001) already provides weather data (temperature, precipitation, ET0). Zero integration in task context. | Consume existing weather data from FastAPI backend; add weather widget to task detail; warn when scheduling spray during forecasted rain; show PHI against forecast. Spray thresholds should be product-specific from label data, not universal rules. |
| **PHI/REI calculation for pesticide tasks** | Export certification (GLOBALG.A.P), worker safety | Stock products linked but no interval tracking | When pest_control task is completed with products, auto-calculate and display re-entry interval and pre-harvest interval on affected parcels. PHI/REI values must come from product label data (product-specific), not hardcoded. |
| **Equipment assignment** | Tractor scheduling, equipment conflict detection | `equipment_required` field exists in type but no UI | Add equipment selector to task form; add equipment calendar view to detect conflicts |
| **Geo-verification for clock-in** | Time fraud prevention, proof of presence | `location_lat/lng` fields exist in ClockInRequest but unused in UI | Add GPS capture on clock-in; validate worker is within parcel polygon |
| **Task template management** | Standardized operations, seasonal planning | Backend `task-templates` module exists; `template_id` in Task type; zero UI | Add template selector to task form; add template management page |
| **Recurring task creation** | Daily irrigation, weekly scouting, monthly maintenance | `repeat_pattern` in type definition; `parent_task_id` for tracking; zero UI for creation | Add recurrence rule builder to task form (frequency, days, end date) |
| **Parcel-level task heatmap** | Visual coverage analysis — which parcels are neglected | Calendar shows tasks by date, not by parcel geography | Add a map/heatmap view showing parcel task density |
| **Crop cycle stage validation** | Prevent wrong task types at wrong stages | `crop_cycle_id` linked but stage-unaware | Auto-suggest task types based on current crop cycle stage; warn if fertilization at wrong stage |
| **Stock deduction preview** | Budget awareness before committing products | Planned items added to form but no cost preview | Show real-time cost estimate as products are added to the task form |
| **Multi-farm consolidated view** | Fatima needs cross-farm visibility | Each view scoped to single org; no farm comparison | Add "all farms" filter option for org_admin+ roles |
| **Worker availability & workload at assignment time** | Prevent overloading workers; smarter dispatch | `useWorkerAvailability` hook exists but `enabled: false` (backend unimplemented) | Implement backend endpoint; show task count + logged hours next to worker name in assignment dropdown |

### 3.2 What's Over-Exposed (Should Be Simplified)

| Element | Problem | Recommendation |
|---------|---------|----------------|
| **Payment section in task form** | Shown for every task; irrelevant for 60% of task types | Auto-hide unless task involves workers with payment; collapse into "Advanced" section for Ahmed |
| **Dependency management** | Powerful but complex; most users never need it | Show only for Hassan (Level 3); hide for Ahmed (Level 1) |
| **Harvest completion form** | 15+ fields including temperature, humidity, intended_for | Auto-hide expert fields; show core fields (quantity, unit, quality) by default; expand for Level 3 |
| **Stats bar (7 cards)** | Too much info at once for small farms | Adaptive: show 3 cards for <10 tasks; show 7 for >50 tasks. Ahmed should see 1 summary card. |
| **Priority + status + type badges per task** | 3-4 badges per task card in list view | Consolidate into single status indicator; show type as icon only; priority as color of title text |

---

## 4. Prioritized Backlog (25 Items)

**Method**: Items are grouped into **4 tiers by feasibility window** (Do First → Do Next → Plan Carefully → Strategic). Within each tier, items are ordered by priority. Impact and effort are scored 1–5 independently for rough sizing, not as a strict sort key.
**Risk categories**: O = Offline/connectivity concern, P = Permissions/role-gating required, D = Data model change requiring CEO/engineering governance, A = New API endpoint or backend infrastructure required

### Tier 1: High Impact, Low Effort (Do First)

| # | Item | Impact | Effort | User Outcome | Acceptance Criteria | Risk |
|---|------|--------|--------|--------------|---------------------|------|
| 1 | **Fix hardcoded French strings** (TaskDetailDialog + TaskForm) | 5 | 1 | Ahmed can use tasks in Arabic/Darija | All user-facing strings use `t()` key; no inline French/English text | None |
| 2 | **Fix Arabic fallback to French in Kanban** | 5 | 1 | Arabic labels render correctly | `lang === 'ar'` returns Arabic labels, not French | None |
| 3 | **Fix Assignee card showing logged-in user** | 5 | 1 | Task detail shows actual assigned worker(s), not current user | Sidebar displays `taskAssignments` worker list | None |
| 4 | **Increase staleTime to 5 minutes** | 4 | 1 | Faster perceived performance on 3G; less unnecessary refetching | All task hooks use `staleTime: 5 * 60 * 1000` | O |
| 5 | **Use statistics endpoint for stats bar** | 4 | 2 | Stats bar loads instantly; no full-table scan on 3G | Replace `useTasks(organizationId, {})` with `useTaskStatistics(organizationId)` | None |
| 6 | **Add farm/parcel/type filter to list view** | 5 | 2 | Karim can filter tasks by farm, parcel, or task type | FilterBar shows dropdowns for farm, parcel, task_type; backend already supports these params | None |
| 7 | **Add "duplicate task" action** | 4 | 2 | Karim can duplicate last week's plan in one click | "Duplicate" option in task dropdown; opens form pre-filled with source task data | None |

### Tier 2: High Impact, Medium Effort (Do Next)

| # | Item | Impact | Effort | User Outcome | Acceptance Criteria | Risk |
|---|------|--------|--------|--------------|---------------------|------|
| 8 | **Add overdue/paused columns to Kanban** | 5 | 2 | All task statuses visible on the board | Kanban shows 6 columns: pending, assigned, in_progress, paused, completed, overdue | None |
| 9 | **Optimistic updates for task status changes** | 5 | 2 | Instant visual feedback on start/pause/complete; no 3G lag | `onMutate` updates cache immediately; `onError` rolls back | O |
| 10 | **Add kanban filters (farm, type, worker)** | 4 | 2 | Board view becomes usable for multi-farm orgs | Filter dropdowns above kanban grid; `useTasks` receives filter params | None |
| 11 | **Refactor TaskDetailDialog + $taskId to eliminate duplication** | 3 | 3 | Maintainable code; single source of truth for detail views | Shared `useTaskActions` hook; shared `TaskCompletionForms` component; both views use them | None |
| 12 | **Mobile-first form redesign (stepper/accordion)** | 5 | 3 | Ahmed can create tasks on his phone without frustration | Form uses sections: Basic → Location → Assignment → Payment; each collapsible | None |
| 13 | **Add "today view" filter preset** | 5 | 2 | Karim sees exactly what's due today in one click | "Today" button in filters; filters by `scheduled_start <= today AND due_date >= today AND status != completed` | None |
| 14 | **Add task type icons (not just Wheat for harvest)** | 3 | 2 | Visual differentiation: droplet for irrigation, leaf for fertilization, bug for pest control | Each TaskType has a distinct Lucide icon in list/kanban/calendar cards | None |

### Tier 3: High Impact, Higher Effort (Plan Carefully)

| # | Item | Impact | Effort | User Outcome | Acceptance Criteria | Risk |
|---|------|--------|--------|--------------|---------------------|------|
| 15 | **Template management UI** | 5 | 3 | Hassan can save recurring task patterns; Fatima can standardize across farms | Template CRUD page; template selector in task form; pre-fills all fields. **Requires organization_admin role to create/edit templates** | A: New template CRUD endpoints needed (table exists) |
| 16 | **Recurring task creation UI** | 5 | 3 | Weekly irrigation, monthly maintenance auto-generated | Recurrence builder in task form (frequency, interval, days, end date); backend creates child tasks via scheduled job | A: Needs backend cron job to generate child tasks from repeat_pattern (column exists) |
| 17 | **Weather window warnings** | 5 | 3 | Spraying warned when rain forecast; irrigation suggested before dry spell | Integrate with existing FastAPI weather backend (port 8001) which already provides temperature, precipitation, ET0 data; alert banner on task form for weather-sensitive types; spray thresholds from product label data, not universal rules | D: Needs product-specific spray threshold config in stock catalog |
| 18 | **Add week/day views to calendar** | 4 | 3 | Daily planning view for Karim's morning briefing | Toggle: month/week/day; day view shows hourly timeline | None |
| 19 | **Offline queue for task mutations** | 5 | 4 | Tasks can be completed offline; syncs when connectivity returns | Service Worker intercepts failed mutations; queues in IndexedDB; retries on reconnect. **Must include conflict resolution: compare `updated_at` timestamps; prompt user on conflict** | O |
| 20 | **Bulk reassign workers** | 4 | 3 | Karim reassigns 5 tasks in 3 taps instead of 15 | Bulk action bar adds "Reassign" option; worker picker modal | None |

### Tier 4: Medium Impact, Strategic Value

| # | Item | Impact | Effort | User Outcome | Acceptance Criteria | Risk |
|---|------|--------|--------|--------------|---------------------|------|
| 21 | **PHI/REI display on pest control tasks** | 4 | 3 | Compliance: shows "23 days until harvest allowed" after spraying | After completing pest_control with products, calculate and display PHI on affected parcel. **Thresholds from product label data, not universal constants** | D: Needs product PHI data in stock catalog |
| 22 | **Geo-verification on clock-in** | 3 | 3 | Anti-fraud: worker must be at parcel to clock in | GPS capture on clock-in button; validate against parcel polygon; show warning if outside | D: Needs parcel boundary polygons in DB |
| 23 | **Task export (CSV/PDF) for compliance** | 4 | 3 | Fatima generates spray records for GLOBALG.A.P certification | Export button on list view; date range + task type filter; generates CSV with all compliance fields. **Requires organization_admin role; must respect farm-level visibility for farm_manager** | P: Role-gated (organization_admin + farm_manager for own farms) |
| 24 | **Parcel task heatmap (map view)** | 4 | 4 | Visual: see which parcels have tasks today/this week | Map component with parcel polygons; color intensity = task count; click to filter | D: Needs parcel geojson data |
| 25 | **Connectivity indicator + sync status + local draft autosave** | 3 | 3 | Users see "offline mode" banner; form data survives crashes | Network status hook; banner shows "Last synced 5 min ago" / "Offline — changes queued". TaskForm saves to IndexedDB on field change; restores on re-open; clears on submit. **Offline queue must include conflict resolution: compare `updated_at` timestamps; prompt user on conflict** | O |

---

## 5. Level 1 vs Level 3 Display Strategy

### Level 1 (Default for: Ahmed, new users, mobile, `farm_worker` and `day_laborer` roles)
**Philosophy**: "What do I do next?" — One clear action per task. No scientific data. **All labels in Arabic/Darija by default.**

| Screen | Level 1 Treatment |
|--------|-------------------|
| **Task List** | Show: title (Arabic), parcel name, due date (absolute: "15 أبريل" / "15 Avril"), single action button ("ابدأ" / "Commencer" or "أنهِ" / "Terminer"). Hide: badges, priority labels, stats bar, meta info. Show 1 summary card: "5 مهام اليوم" / "5 tâches aujourd'hui" |
| **Task Card** | Title, parcel icon + name, due date, one big action button. No badges. Priority conveyed by card border color only. |
| **Task Form** | Stepper with 3 steps: "ماذا" (title, type) → "أين" (farm, parcel) → "متى" (date). Advanced options collapsed. |
| **Task Detail** | Title, description, parcel, worker, date. One big action: "ابدأ" / "أنهِ". No payment section. No dependencies. |
| **Kanban** | 3 columns only: "للقيام" / "قيد التنفيذ" / "مكتمل". No priority badges. No meta info. |
| **Calendar** | Today highlighted. Tasks shown as colored dots. Tap to see task name + one action. |

### Level 3 (Default for: Hassan, `organization_admin` and `farm_manager` roles)
**Philosophy**: Full scientific context, traceability, compliance fields, dependency graphs.

| Screen | Level 3 Treatment |
|--------|-------------------|
| **Task List** | Full metadata: all badges, worker, farm/parcel, duration, checklist progress, attachments count, dependency indicator. Stats bar with 7 cards. Advanced filters. |
| **Task Detail** | All sections: dependencies graph, work logs, attachments, payment details, PHI countdown, weather conditions, crop cycle stage. Harvest form with full quality grading, temperature, humidity fields. |
| **Task Form** | All fields visible: payment section, stock section, dependencies, recurrence, crop cycle, equipment. |
| **Kanban** | 6 columns, WIP limits, dependency lines between cards, priority sorting within columns. |

### Level 2 — BLOCKED
Per CEO decision, Level 2 is **not to be implemented** until product defines it. Do NOT create intermediate complexity levels. The system should switch cleanly between Level 1 and Level 3 based on user role/preference.

### Implementation Pattern
```typescript
// Proposed: display level based on role + preference
// CASL roles: system_admin > organization_admin > farm_manager > farm_worker > day_laborer > viewer
const useDisplayLevel = () => {
  const { profile } = useAuth();
  // Level 3 for org_admin and farm_manager (managers/agronomists)
  const isExpertRole = ['system_admin', 'organization_admin', 'farm_manager'].includes(profile.role);
  const preference = localStorage.getItem('displayLevel'); // manual override
  
  if (preference === 'expert') return 'L3';
  if (preference === 'simple') return 'L1';
  return isExpertRole ? 'L3' : 'L1';
};
```
> **Note**: There is no `agronomist` role in the current CASL role hierarchy. Hassan's persona maps to `farm_manager`. If a distinct agronomist role is needed in the future, that requires CEO/engineering governance (new role in `RoleLevel` enum + CASL policy updates).

---

## 6. Instrumentation Plan

### 6.1 Events to Track

| Event | Trigger | Properties | Why |
|-------|---------|------------|-----|
| `task.created` | Task created | task_type, farm_id, has_parcel, has_assignee, has_crop_cycle, payment_type | Measure form completeness; identify friction points |
| `task.assigned` | Worker assigned to task | task_id, worker_id, assignment_method (direct/bulk/template) | Measure time-to-assign |
| `task.started` | Task moved to in_progress | task_id, time_since_creation, time_since_scheduled_start | Measure planning accuracy (on-time start rate) |
| `task.completed` | Task completed | task_id, time_since_creation, actual_vs_estimated_hours, completion_type (normal/harvest/partial) | Measure on-time completion rate; actual vs. estimate accuracy |
| `task.overdue` | Task passes due_date while not completed | task_id, days_overdue, task_type, farm_id | Measure overdue rate by type/farm |
| `task.reassigned` | Worker changed after assignment | task_id, old_worker_id, new_worker_id, reason (if captured) | Measure rework rate; identify unreliable workers |
| `task.form.abandoned` | Task form closed without saving | step_reached, fields_filled, task_type, time_spent_ms | Measure form abandonment; identify confusing sections |
| `task.view.switched` | User switches between list/calendar/kanban | from_view, to_view | Measure preferred views by role |
| `task.filter.applied` | User applies a filter | filter_type (status/farm/parcel/type), filter_value | Measure most-used filters |
| `task.bulk_action` | Bulk action performed | action_type, count_of_tasks | Measure bulk action adoption |
| `task.attachment.added` | File attached to task | task_id, file_type, file_size | Measure evidence capture rate |
| `task.checklist.progress` | Checklist item toggled | task_id, completion_percentage | Measure subtask granularity |

### 6.2 Success Metrics

| Metric | Formula | Target | Timeframe |
|--------|---------|--------|-----------|
| **On-time start rate** | % of tasks with `actual_start <= scheduled_start` | >80% | 3 months |
| **On-time completion rate** | % of tasks with `completed_date <= due_date` | >70% | 3 months |
| **Time-to-assign** | Median time from task creation to worker assignment | <2 hours | 1 month |
| **Form completion rate** | % of task forms submitted vs. opened | >85% | 2 months |
| **Form abandonment by step** | % of users who abandon at each form section | <15% per step | 2 months |
| **Actual vs. Estimated hours** | Median ratio of `actual_duration / estimated_duration` | 0.8-1.2 | 3 months |
| **Rework rate** | % of tasks reassigned after initial assignment | <10% | 3 months |
| **Daily active users (Tasks)** | Unique users who view/create/complete a task daily | 80% of active users | 1 month |
| **Offline action success rate** | % of offline mutations that sync successfully | >99% | Post-PWA |
| **Photo evidence rate** | % of completed tasks with at least 1 attachment | >60% (for harvest/pest_control) | 3 months |

### 6.3 Implementation Approach
- Use existing TanStack Query mutation callbacks as event triggers (no extra API calls)
- Store events in Supabase `analytics_events` table (org-scoped)
- Build a simple analytics dashboard in the existing org admin panel
- Track display level usage to validate L1/L3 hypothesis
- **Governance note**: The `analytics_events` table is a new schema addition and requires CEO/engineering review before implementation. Consider using the existing `notifications` or `audit_logs` table pattern instead.

---

## 7. Competitive / Pattern Analysis

### 7.1 Patterns Worth Stealing

| Pattern | Source | Application to AgroGina |
|---------|--------|------------------------|
| **"My Work" dashboard** | Field service apps (Jobber, ServiceTitan) | Ahmed's default view: today's tasks only, swipe to complete, photo capture built into completion flow |
| **Smart scheduling** | Google Calendar + weather APIs | "Spray window" suggestion: system proposes optimal dates based on existing FastAPI weather data (port 8001) + PHI constraints from product labels |
| **Task templates with pre-filled checklists** | Procore (construction) | "Irrigation template" auto-creates: check valves, measure flow rate, record duration, take photos. Standardized operations. |
| **Inline task creation from calendar** | Notion Calendar | Click any date cell → quick-create with just title + parcel. Full form for advanced users. |
| **"Quick complete" with photo** | WhatsApp Business (proof of delivery) | Complete button → camera opens → take photo → done. No form for simple tasks. |
| **Status timeline in task detail** | Jira / Linear | Visual timeline showing: Created → Assigned → Started → Paused → Completed with timestamps and who did what |
| **Parcel color-coding on task cards** | FarmLogs | Each parcel has a consistent color. Task cards show parcel color bar. Instant visual grouping without reading text. |
| **Offline-first architecture** | GraphQL offline clients (WatermelonDB) | Queue mutations locally; sync when online. Show sync status indicator. Already in TanStack Query's capability with proper config. |
| **Voice notes** | WhatsApp / Telegram | Audio attachment type for task comments. Ahmed speaks Darija, can't type. Voice > text in rural context. |
| **Worker "scorecard"** | Field service platforms | Worker detail page shows: tasks completed, on-time rate, avg quality rating, total hours. Manager view for performance tracking. |

### 7.2 What NOT to Copy

| Pattern | Source | Why It Fails for AgroGina |
|---------|--------|--------------------------|
| **Complex Gantt charts** | MS Project, Monday.com | Too complex for Ahmed; Hassan needs dependency view but not full project management. Simple dependency list is enough. |
| **AI auto-assignment** | ServiceNow, ClickUp | Worker availability data is unreliable (no real-time tracking). Manual assignment with suggestions is more trustworthy. |
| **Real-time collaboration** | Notion, Linear | Multiple people editing same task simultaneously is rare in farm context. Conflicts would confuse users. |
| **Email-heavy notifications** | Western SaaS tools | Moroccan farm workers don't check email. WhatsApp/push notifications are the channel. |
| **Complex permission matrices** | Enterprise tools | AgroGina already has CASL. Don't add task-level permissions — farm-level + role-level is enough. |
| **Resource leveling algorithms** | Construction PM | Too complex; farm work is seasonal and weather-dependent, not predictable enough for algorithmic scheduling. |
| **Time tracking per-minute** | Toggl, Harvest | Moroccan farms track by half-day or day, not by minute. `estimated_duration` in hours is granular enough. |
| **Desktop-first kanban** | Trello, Jira | Users are in the field. Mobile-first card design with big touch targets, not desktop columns that squeeze on phone. |
| **Subscription-gated features** | Western SaaS | Pricing should be per-hectare, not per-feature. Core task management must be available to all tiers. |
| **English-only technical terms** | Global platforms | "Sprint", "Epic", "Story" mean nothing to Ahmed. Use: "Tâche", "Récolte", "Traitement". No borrowed jargon. |

---

## 8. Constraints & Non-Goals

### Constraints (MUST respect)
1. **Multi-tenant isolation**: Every query scoped by `organization_id`. No cross-org visibility without explicit org context.
2. **Role-based access**: CASL permissions already in place. New features must respect existing guard stack.
3. **Incremental UX**: No full rewrite. Each backlog item must be implementable independently.
4. **Schema governance**: Items marked "D" (data model) require CEO/engineering review before implementation.
5. **i18n completeness**: All 3 languages (en, fr, ar) must be updated for every new string.
6. **Offline-first mental model**: Every feature must degrade gracefully with intermittent connectivity.

### Non-Goals (explicitly OUT of scope)
1. **Cross-organization dashboards** — Each org sees only its data. Super-admin views are separate.
2. **Real-time collaboration** — No WebSocket-based simultaneous editing.
3. **Mobile native app** — PWA is the target, not React Native.
4. **External calendar sync** — No Google Calendar / Outlook integration (yet).
5. **AI task auto-creation** — AgromindIA integration is separate from this enhancement cycle.
6. **Level 2 display** — Blocked per CEO decision. Do NOT implement.
7. **Complex project management** — No Gantt, no resource leveling, no earned value.

---

## Appendix A: Current Architecture Summary

| Layer | File Count | Key Patterns |
|-------|-----------|--------------|
| Routes | 5 | `tasks.tsx` (layout + tabs), `index.tsx` (list), `calendar.tsx`, `kanban.tsx`, `$taskId.tsx` (detail) |
| Components | 12 | TasksList, TasksCalendar, TasksKanban, TaskForm, TaskDetailDialog, TaskAssignee, TaskAttachments, TaskChecklist, TaskDependencies, TaskWorklog, TaskCommentInput, CommentDisplay |
| Hooks | 2 | useTasks (all CRUD + queries), useTaskAssignments |
| API | 2 | tasksApi (full REST), task-assignments API |
| Types | 1 | Comprehensive: 575 lines covering Task, TaskSummary, 15+ interfaces |
| Backend | 6 modules | tasks, task-assignments, task-templates + DTOs, services, controllers |
| DB | 2 files | Schema + stock link migration |

## Appendix B: Key Technical Debt

1. **TaskDetailDialog vs $taskId.tsx**: ~600 lines of duplicated logic. Must consolidate.
2. **Hardcoded French**: ~50+ untranslated strings across TaskDetailDialog, TaskForm, $taskId.
3. **Stats calculation client-side**: Should use `/api/v1/tasks/statistics` endpoint.
4. **Calendar uses custom Kibo UI**: Consider switching to a library with DnD + week/day views (e.g., FullCalendar, react-big-calendar).
5. **No error boundaries**: Task views have no error boundary. A crash in one component kills the whole page.
6. **Form state complexity**: TaskForm manages 6+ pieces of local state beyond react-hook-form. Consider a Zustand store for form state.
7. **No offline conflict resolution**: Last-write-wins without version check. Needs `updated_at` comparison on patch.
8. **No draft persistence**: Form data lost on crash/navigation. Need autosave to IndexedDB.
9. **Worker availability endpoint unimplemented**: Hook exists but disabled (`enabled: false`). Critical for assignment UX.
