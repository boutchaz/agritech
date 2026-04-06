# Chat Action Tools — Tasks

---

## Phase 1: Pending Action Infrastructure

### 1. Create chat_pending_actions table + RLS

- [x] **RED** — Check: `chat_pending_actions` table does not exist in the schema. Run `grep -c 'chat_pending_actions' project/supabase/migrations/00000000000000_schema.sql` → returns 0.
- [x] **ACTION** — Add `chat_pending_actions` table to the declarative schema: `id UUID PK`, `user_id UUID NOT NULL`, `organization_id UUID NOT NULL`, `tool_name TEXT NOT NULL`, `parameters JSONB NOT NULL`, `preview_data JSONB NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`, `expires_at TIMESTAMPTZ DEFAULT now() + interval '30 minutes'`. Add unique constraint on `(user_id, organization_id)`. Enable RLS with `is_organization_member()` policy. Run `cd project && npm run db:reset && npm run db:generate-types`.
- [x] **GREEN** — Run `grep -c 'chat_pending_actions' project/supabase/migrations/00000000000000_schema.sql` → returns >0. Verify types regenerated.

### 2. PendingActionService — upsert, load, delete, expire

- [x] **RED** — Write test `agritech-api/src/modules/chat/tools/__tests__/pending-action.service.spec.ts`: test that `upsert()` stores an action, `load()` retrieves it, `delete()` removes it, `load()` returns null for expired actions. Run `npx jest pending-action.service.spec` → fails (service doesn't exist).
- [x] **ACTION** — Create `agritech-api/src/modules/chat/tools/pending-action.service.ts` with methods: `upsert(userId, orgId, toolName, parameters, previewData)`, `load(userId, orgId): PendingAction | null` (checks expires_at), `delete(userId, orgId)`. Uses `DatabaseService` Supabase admin client.
- [x] **GREEN** — Run `npx jest pending-action.service.spec` → all tests pass.

### 3. confirm_pending_action and cancel_pending_action meta-tools

- [x] **RED** — Write test `agritech-api/src/modules/chat/tools/__tests__/meta-tools.spec.ts`: test that `executeTool('confirm_pending_action', ...)` loads pending action and calls the appropriate service, returns `{ success: false }` when no pending action exists, and rejects expired actions. Test that `cancel_pending_action` deletes the pending action. Run → fails.
- [x] **ACTION** — Add `confirm_pending_action` and `cancel_pending_action` to `ChatToolsService.getToolDefinitions()` and `executeTool()`. `confirm` loads pending action via `PendingActionService`, dispatches to the right service based on `tool_name`, deletes pending row on success. `cancel` calls `PendingActionService.delete()`.
- [x] **GREEN** — Run `npx jest meta-tools.spec` → all tests pass.

---

## Phase 2: Upgrade Existing Tools to Preview-First

### 4. Refactor create_task tool to support mode=preview

- [x] **RED** — Write test `agritech-api/src/modules/chat/tools/__tests__/create-task-tool.spec.ts`: test that calling `create_task` with `mode=preview` returns preview_data with resolved parcel_name/farm_name/worker_name and stores a pending action (does NOT call TasksService.create). Test that `mode=execute` is rejected (must use confirm_pending_action). Run → fails.
- [x] **ACTION** — Refactor `createTaskFromRecommendation` in `ChatToolsService` to: accept `mode` param, on `preview` → validate params, resolve entity names via DB lookups, call `PendingActionService.upsert()`, return preview_data. Remove direct execution path (execution happens only via `confirm_pending_action`). Update tool definition to include `mode` param.
- [x] **GREEN** — Run `npx jest create-task-tool.spec` → passes. Run `npx jest chat-tools` → all existing tests still pass.

### 5. Refactor mark_intervention_done to support mode=preview

- [x] **RED** — Write test: calling `mark_intervention_done` with `mode=preview` returns preview_data with intervention title and plan name, stores pending action. Run → fails.
- [x] **ACTION** — Add `mode` param to `mark_intervention_done`. Preview looks up intervention details for display. Execution moves to `confirm_pending_action` dispatch.
- [x] **GREEN** — Run tests → pass.

---

## Phase 3: New Tool Handlers

### 6. record_harvest tool

- [x] **RED** — Write test `agritech-api/src/modules/chat/tools/__tests__/record-harvest-tool.spec.ts`: test preview returns `{ success: true, preview_data: { parcel_name, crop_type, quantity, unit, harvest_date, quality_grade } }` and stores pending action. Test that confirm dispatches to HarvestService.create. Test that missing parcel returns error. Run → fails.
- [x] **ACTION** — Add `record_harvest` tool definition and handler in `ChatToolsService`. Preview: validate params, resolve parcel name + crop type + farm_id from parcel record, default harvest_date to today. Map to `CreateHarvestDto` on confirm. Wire `HarvestService` into `ChatToolsModule`.
- [x] **GREEN** — Run `npx jest record-harvest-tool.spec` → passes.

### 7. record_product_application tool

- [x] **RED** — Write test `agritech-api/src/modules/chat/tools/__tests__/record-product-application-tool.spec.ts`: test preview resolves product name from item_id, parcel name, returns preview_data. Test that non-existent product_id returns error. Test confirm dispatches to ProductApplicationsService. Run → fails.
- [x] **ACTION** — Add `record_product_application` tool definition and handler. Preview: validate, resolve product name (from items table), parcel name, default application_date to today. Map to `CreateProductApplicationDto` on confirm. Wire service.
- [x] **GREEN** — Run tests → pass.

### 8. log_parcel_event tool

- [x] **RED** — Write test `agritech-api/src/modules/chat/tools/__tests__/log-parcel-event-tool.spec.ts`: test preview shows event type, parcel name, description, recalibrage warning flag. Test confirm dispatches to ParcelEventsService.createEvent. Run → fails.
- [x] **ACTION** — Add `log_parcel_event` tool definition and handler. Preview: validate, resolve parcel name, default date_evenement to today, default recalibrage_requis to false. Include `recalibrage_warning: true` in preview_data when recalibrage_requis is true. Map to `CreateParcelEventDto` on confirm.
- [x] **GREEN** — Run tests → pass.

### 9. record_stock_entry tool

- [x] **RED** — Write test `agritech-api/src/modules/chat/tools/__tests__/record-stock-entry-tool.spec.ts`: test preview resolves item names and warehouse names from IDs, returns structured preview_data. Test confirm dispatches to StockEntriesService.createStockEntry. Test that invalid item_id returns error. Run → fails.
- [x] **ACTION** — Add `record_stock_entry` tool definition and handler. Preview: validate entry_type, resolve each item's name from items table, resolve warehouse name(s), default entry_date to today. Map to `CreateStockEntryDto` on confirm. Wire service.
- [x] **GREEN** — Run tests → pass.

### 10. assign_task_worker tool

- [x] **RED** — Write test `agritech-api/src/modules/chat/tools/__tests__/assign-task-tool.spec.ts`: test preview resolves task title, worker name, role. Test that non-existent task returns error. Test confirm dispatches to TaskAssignmentsService.createAssignment. Run → fails.
- [x] **ACTION** — Add `assign_task_worker` tool definition and handler. Preview: validate task_id exists in org, resolve task title + worker name. Map to `CreateTaskAssignmentDto` on confirm. Wire service.
- [x] **GREEN** — Run tests → pass.

### 11. complete_task tool

- [x] **RED** — Write test `agritech-api/src/modules/chat/tools/__tests__/complete-task-tool.spec.ts`: test preview shows task title and status transition. Test that already-completed task returns error. Test confirm dispatches to TasksService.complete. Run → fails.
- [x] **ACTION** — Add `complete_task` tool definition and handler. Preview: validate task exists, check status is completable (pending/assigned/in_progress), show title + current status → completed. Map to `CompleteTaskDto` on confirm.
- [x] **GREEN** — Run tests → pass.

---

## Phase 4: Frontend Preview Card

### 12. ActionPreviewCard component

- [x] **RED** — Write test `project/src/components/Chat/__tests__/ActionPreviewCard.test.tsx`: render an ActionPreviewCard with `action_type: "record_harvest"` and preview fields. Assert it renders parcel name, quantity, date, and "confirme" instruction text. Assert amber/yellow border class is present. Run `npx vitest run ActionPreviewCard` → fails (component doesn't exist).
- [x] **ACTION** — Create `project/src/components/Chat/cards/ActionPreviewCard.tsx`. Renders a Card with: action type header + icon, key/value field list (varies by action_type), amber left border, footer instruction text (i18n). Register in `cardRegistry` as `action_preview`.
- [x] **GREEN** — Run `npx vitest run ActionPreviewCard` → passes.

### 13. ActionPreviewCard handles all action types

- [x] **RED** — Write tests for each action type: `create_task` shows Title/Parcel/Priority/Assigned To, `record_stock_entry` shows items list with names + quantities, `log_parcel_event` with recalibrage shows warning badge. Run → fails.
- [x] **ACTION** — Add field configuration per action_type in ActionPreviewCard. Use a mapping object: `{ record_harvest: ['parcel_name', 'quantity', 'unit', ...], create_task: ['title', 'parcel_name', ...], ... }`. Add recalibration warning badge for log_parcel_event.
- [x] **GREEN** — Run tests → all pass.

---

## Phase 5: System Prompt Update

### 14. Update system prompt with tool usage instructions

- [x] **RED** — Check: `prompt-builder.service.ts` does not contain "mode=preview" or "confirm_pending_action" instructions. Run `grep -c 'preview' agritech-api/src/modules/chat/prompt/prompt-builder.service.ts` → returns 0.
- [x] **ACTION** — Add tool usage section to system prompt in `buildSystemPrompt()` when `enableTools` is true: (1) always call tools with mode=preview first, (2) recognize confirm/cancel intents in multiple languages (confirme/oui/yes/نعم for confirm, annule/non/cancel/لا for cancel), (3) on user corrections, re-call same tool with updated params and mode=preview, (4) never execute directly.
- [x] **GREEN** — Run `grep -c 'preview' agritech-api/src/modules/chat/prompt/prompt-builder.service.ts` → returns >0. Run existing chat tests → pass.

---

## Phase 6: Integration & Wiring

### 15. Wire all new services into ChatToolsModule

- [x] **RED** — Check: `ChatToolsModule` imports do not include HarvestService, ProductApplicationsService, ParcelEventsService, StockEntriesService, TaskAssignmentsService, PendingActionService. Run `grep -c 'HarvestService\|PendingActionService' agritech-api/src/modules/chat/tools/chat-tools.module.ts` → returns 0.
- [x] **ACTION** — Update `ChatToolsModule` to import required modules and inject all services into `ChatToolsService`. Update `ChatToolsService` constructor. Add `PendingActionService` as a provider.
- [x] **GREEN** — Run `grep -c 'PendingActionService' agritech-api/src/modules/chat/tools/chat-tools.module.ts` → returns >0. Run `npx jest chat-tools` → all tool tests pass. Run `cd agritech-api && npx tsc --noEmit` → no errors.

### 16. End-to-end smoke test: preview → refine → confirm flow

- [x] **RED** — Write integration test `agritech-api/src/modules/chat/tools/__tests__/preview-confirm-flow.spec.ts`: call `executeTool('record_harvest', { mode: 'preview', ... })` → verify pending action stored. Call `executeTool('record_harvest', { mode: 'preview', quantity: 5, ... })` → verify pending action updated. Call `executeTool('confirm_pending_action', {})` → verify HarvestService.create was called with quantity=5. Run → fails.
- [x] **ACTION** — Fix any integration issues found. Ensure dispatch table in `confirm_pending_action` covers all tool names.
- [x] **GREEN** — Run integration test → passes. Run full `npx jest chat` → all chat tests pass.

---

**Total: 16 tasks across 6 phases**
- Phase 1: Infrastructure (tasks 1-3)
- Phase 2: Upgrade existing tools (tasks 4-5)  
- Phase 3: New tool handlers (tasks 6-11)
- Phase 4: Frontend (tasks 12-13)
- Phase 5: Prompt engineering (task 14)
- Phase 6: Wiring & integration (tasks 15-16)
