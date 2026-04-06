# Production Wiring — Tasks

## Schema & Backend

### 1. Add crop_cycle_id and campaign_id columns to tasks table

- [x] **RED** — Check: `SELECT column_name FROM information_schema.columns WHERE table_name='tasks' AND column_name='crop_cycle_id'` returns 0 rows. Assertion: column does not exist.
- [x] **ACTION** — Add to `project/supabase/migrations/00000000000000_schema.sql`: nullable `crop_cycle_id UUID` and `campaign_id UUID` columns on `tasks` table with FK references and indexes. Run `cd project && npm run db:reset`.
- [x] **GREEN** — Same query returns 1 row. Column exists with correct FK.

### 2. Add crop_cycle_id column to plan_interventions table

- [x] **RED** — Check: `SELECT column_name FROM information_schema.columns WHERE table_name='plan_interventions' AND column_name='crop_cycle_id'` returns 0 rows.
- [x] **ACTION** — Add nullable `crop_cycle_id UUID` column with FK to crop_cycles(id) ON DELETE SET NULL and index to plan_interventions in schema.sql. Run `cd project && npm run db:reset`.
- [x] **GREEN** — Same query returns 1 row. Column exists.

### 3. Add crop_cycle_id and campaign_id to CreateTaskDto and task service

- [x] **RED** — Check: `grep -c 'crop_cycle_id' agritech-api/src/modules/tasks/dto/create-task.dto.ts` returns 0.
- [x] **ACTION** — Add optional `crop_cycle_id` and `campaign_id` UUID fields to CreateTaskDto with `@IsOptional() @IsUUID()`. Update task service to include these fields in insert/update queries. Update task types on frontend.
- [x] **GREEN** — `grep -c 'crop_cycle_id' agritech-api/src/modules/tasks/dto/create-task.dto.ts` returns 1. `tsc --noEmit` passes on both backend and frontend.

### 4. Add tasks filter by crop_cycle_id in tasks service

- [x] **RED** — Check: `grep -c 'crop_cycle_id' agritech-api/src/modules/tasks/tasks.service.ts` returns 0.
- [x] **ACTION** — Add `crop_cycle_id` filter to tasks list query and ListTasksDto/filters DTO. When `crop_cycle_id` is provided, filter tasks by it.
- [x] **GREEN** — `grep -c 'crop_cycle_id' agritech-api/src/modules/tasks/tasks.service.ts` returns at least 1. `tsc --noEmit` passes.

## Campaign UI

### 5. Add status transition buttons to campaign cards

- [x] **RED** — Check: `grep -c 'updateStatus\|Activate\|status.*transition' project/src/components/settings/CampaignManagement.tsx` returns 0.
- [x] **ACTION** — Add action buttons to campaign cards: "Activate" (planned→active), "Complete" (active→completed), "Cancel" (any→cancelled). Create `useUpdateCampaignStatus` hook calling `PATCH /campaigns/:id/status`. Add confirmation dialog for cancel.
- [x] **GREEN** — Same grep returns ≥1. `tsc --noEmit` passes on frontend.

### 6. Add delete button to campaign cards

- [x] **RED** — Check: `grep -c 'useDeleteCampaign\|deleteCampaign' project/src/components/settings/CampaignManagement.tsx` returns 0.
- [x] **ACTION** — Add `useDeleteCampaign` hook calling `DELETE /campaigns/:id`. Add delete button (hidden for active campaigns) with confirmation dialog. Add `campaignsApi.delete()` to API layer.
- [x] **GREEN** — Same grep returns ≥1. `tsc --noEmit` passes.

### 7. Campaign card click navigates to filtered crop cycles

- [x] **RED** — Check: `grep -c 'campaign_id' project/src/components/settings/CampaignManagement.tsx` returns 0 (no navigation with campaign_id).
- [x] **ACTION** — Make campaign card title/area clickable. On click, navigate to `/crop-cycles?campaign_id=<id>`. On crop-cycles page, read `campaign_id` from search params and pass to `useCropCycles` filter.
- [x] **GREEN** — Same grep returns ≥1. Crop cycles route reads search param. `tsc --noEmit` passes.

## Task ↔ Crop Cycle Link (Frontend)

### 8. Add crop cycle dropdown to task form

- [ ] **RED** — Check: `grep -c 'crop_cycle_id' project/src/components/Tasks/TaskForm.tsx` returns 0.
- [ ] **ACTION** — Add optional "Crop Cycle" select field to TaskForm. Query active crop cycles filtered by selected parcel. When a cycle is selected, auto-set campaign_id from cycle's campaign_id. "None" option always available.
- [ ] **GREEN** — Same grep returns ≥1. `tsc --noEmit` passes.

### 9. Auto-suggest crop cycle when parcel is selected

- [ ] **RED** — Check: No auto-fill logic exists — `grep -c 'auto.*cycle\|suggest.*cycle' project/src/components/Tasks/TaskForm.tsx` returns 0.
- [ ] **ACTION** — When parcel changes in task form: query active cycles for that parcel. If exactly 1, pre-fill crop_cycle_id (user can clear). If multiple, show dropdown unfilled. If none, leave empty.
- [ ] **GREEN** — Auto-suggest logic exists. When a parcel with one active cycle is selected, crop_cycle_id is pre-filled. `tsc --noEmit` passes.

## Crop Cycle Detail — Tasks Tab

### 10. Add Tasks tab to crop cycle detail page

- [ ] **RED** — Check: `grep -c 'tasks.*tab\|Tasks.*Tab\|linked.*task' project/src/components/CropCycles/CropCycleDetail.tsx` returns 0.
- [ ] **ACTION** — Add "Tasks" tab to CropCycleDetail. Query tasks filtered by `crop_cycle_id`. Show task list with status badges, assignee, due date. Link each task to `/tasks/<id>`.
- [ ] **GREEN** — Same grep returns ≥1. `tsc --noEmit` passes.

### 11. Add Interventions tab to crop cycle detail page

- [ ] **RED** — Check: `grep -c 'intervention\|plan_intervention' project/src/components/CropCycles/CropCycleDetail.tsx` returns 0.
- [ ] **ACTION** — Add "Interventions" tab to CropCycleDetail. Query plan_interventions filtered by `crop_cycle_id` (if linked) or by `parcel_id` + date range overlap with the cycle. Show intervention list with status, type, scheduled_date.
- [ ] **GREEN** — Same grep returns ≥1. `tsc --noEmit` passes.

## Crop Cycles page — search params support

### 12. Crop cycles page reads campaign_id from URL search params

- [ ] **RED** — Check: `grep -c 'searchParams\|search.*campaign\|useSearch' project/src/routes/_authenticated/(production)/crop-cycles.tsx` returns 0.
- [ ] **ACTION** — Add `validateSearch` to crop-cycles route to accept `campaign_id` param. Pass it to `CropCyclesList` as initial filter. Show campaign name as breadcrumb/filter chip when active.
- [ ] **GREEN** — Same grep returns ≥1. Navigating to `/crop-cycles?campaign_id=xxx` filters the list. `tsc --noEmit` passes.
