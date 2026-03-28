# Notification Expansion — Tasks

## Foundation

### 1. Add role-based notification helper to NotificationsService

- [x] **RED** — Write `agritech-api/src/modules/notifications/notifications.service.spec.ts` test: call `createNotificationsForRoles(orgId, ['farm_manager'], excludeUserId, ...)`, assert it resolves users by role from `organization_users JOIN roles`, excludes the actor, and calls `createNotification` for each matching user. Run `npx jest notifications.service.spec` → test fails (method doesn't exist).
- [x] **ACTION** — In `NotificationsService`: add `MANAGEMENT_ROLES`, `OPERATIONAL_ROLES`, `ADMIN_ONLY_ROLES` constants. Add private `getUserIdsByRoles(orgId, roles[], excludeUserId)` that queries `organization_users JOIN roles`. Add public `createNotificationsForRoles(orgId, roles[], excludeUserId, type, title, message?, data?)` that calls `getUserIdsByRoles` then `createNotificationsForUsers`. Wrap the role query in try/catch — return empty array on failure.
- [x] **GREEN** — Run `npx jest notifications.service.spec` → test passes. Run `npx tsc --noEmit` → compiles.

### 2. Add 15 new NotificationType enum values

- [x] **RED** — Check: `notification.dto.ts` does not contain `AI_RECOMMENDATION_CREATED`. Assertion: grep returns nothing.
- [x] **ACTION** — Add all 15 new enum values to `NotificationType` in `notification.dto.ts`: `AI_RECOMMENDATION_CREATED`, `AI_ALERT_TRIGGERED`, `CROP_CYCLE_STATUS_CHANGED`, `CAMPAIGN_STATUS_CHANGED`, `TASK_REASSIGNED`, `PIECE_WORK_CREATED`, `INVOICE_CREATED`, `JOURNAL_ENTRY_POSTED`, `PAYMENT_STATUS_CHANGED`, `LAB_RESULTS_AVAILABLE`, `PRODUCT_APPLICATION_COMPLETED`, `SOIL_ANALYSIS_COMPLETED`, `HARVEST_EVENT_RECORDED`, `WORK_UNIT_COMPLETED`.
- [x] **GREEN** — Run `npx tsc --noEmit` in `agritech-api/` → compiles. Grep confirms all 15 values present.

### 3. Add frontend notification type styles, icons, and filters

- [x] **RED** — Check: `NotificationItem.tsx` `typeStyles` does not contain key `ai_recommendation_created`. `NotificationFilters.tsx` `NotificationTypeFilter` type does not include `ai_recommendation_created`. Assertions fail.
- [x] **ACTION** — In `NotificationItem.tsx`: add 14 new entries to `typeStyles` map with appropriate colors and emoji icons. In `NotificationFilters.tsx`: extend `NotificationTypeFilter` union type with 14 new values, add entries to `typeFilters[]` array. In `NotificationBell.tsx`: add entries to `getTypeIcon()` and `getTypeStyle()` switch statements. Add `getPriorityFromType` entries for new types (ai_alert_triggered = high, ai_recommendation = medium, etc.).
- [x] **GREEN** — Run `npx tsc --noEmit` in `project/` → compiles. Grep confirms all new types in typeStyles, typeFilters, and getTypeIcon.

---

## Phase 1 — AgromindIA

### 4. Integrate notifications into ai-recommendations

- [x] **RED** — Check: `ai-recommendations.service.ts` does not contain `this.notificationsService`. `ai-recommendations.module.ts` does not import `NotificationsModule`. Assertions: grep returns nothing.
- [x] **ACTION** — In `ai-recommendations.module.ts`: add `NotificationsModule` to imports. In `ai-recommendations.service.ts`: inject `NotificationsService` in constructor. After successful `createRecommendation`, add try/catch block calling `createNotificationsForRoles(orgId, MANAGEMENT_ROLES, null, AI_RECOMMENDATION_CREATED, title, message, {recommendationId, parcelId, priority, alertCode})`. Use `null` as excludeUserId since AI is the actor.
- [x] **GREEN** — Run `npx tsc --noEmit` in `agritech-api/` → compiles. Grep confirms `notificationsService` in service and `NotificationsModule` in module.

### 5. Integrate notifications into ai-alerts

- [x] **RED** — Check: `ai-alerts.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `ai-alerts.module.ts`: add `NotificationsModule` to imports. In `ai-alerts.service.ts`: inject `NotificationsService`. After successful `createAiAlert`, add try/catch calling `createNotificationsForRoles(orgId, MANAGEMENT_ROLES, null, AI_ALERT_TRIGGERED, title, message, {alertId, parcelId, alertCode, severity})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

---

## Phase 2 — Operations

### 6. Integrate notifications into crop-cycles

- [x] **RED** — Check: `crop-cycles.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `crop-cycles.module.ts`: add `NotificationsModule` to imports. In `crop-cycles.service.ts`: inject `NotificationsService`. After successful `updateStatus`, add try/catch calling `createNotificationsForRoles(orgId, MANAGEMENT_ROLES, userId, CROP_CYCLE_STATUS_CHANGED, title, message, {cropCycleId, parcelName, cropName, oldStatus, newStatus})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

### 7. Integrate notifications into campaigns

- [x] **RED** — Check: `campaigns.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `campaigns.module.ts`: add `NotificationsModule` to imports. In `campaigns.service.ts`: inject `NotificationsService`. After successful `updateStatus`, add try/catch calling `createNotificationsForRoles(orgId, MANAGEMENT_ROLES, userId, CAMPAIGN_STATUS_CHANGED, title, message, {campaignId, campaignName, oldStatus, newStatus})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

### 8. Integrate notifications into task-assignments

- [x] **RED** — Check: `task-assignments.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `task-assignments.module.ts`: add `NotificationsModule` to imports. In `task-assignments.service.ts`: inject `NotificationsService`. After successful `createAssignment`, add try/catch calling `createNotificationsForRoles(orgId, OPERATIONAL_ROLES, userId, TASK_REASSIGNED, title, message, {taskId, assignmentId, workerId, workerName})`. Also send a direct notification to the assigned worker via `createNotification({userId: assignedWorkerId, ...})` if they have a user account.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

### 9. Integrate notifications into piece-work

- [x] **RED** — Check: `piece-work.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `piece-work.module.ts`: add `NotificationsModule` to imports. In `piece-work.service.ts`: inject `NotificationsService`. After successful `create`, add try/catch calling `createNotificationsForRoles(orgId, OPERATIONAL_ROLES, createdBy, PIECE_WORK_CREATED, title, message, {pieceWorkId, description, farmName})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

---

## Phase 3 — Finance

### 10. Integrate in-app notifications into invoices

- [x] **RED** — Check: `invoices.service.ts` contains `notificationsService` but only uses `sendInvoiceEmail`. Grep for `createNotificationsForRoles` returns nothing.
- [x] **ACTION** — In `invoices.service.ts`: in the `create` method, after successful invoice creation, add try/catch calling `createNotificationsForRoles(orgId, MANAGEMENT_ROLES, userId, INVOICE_CREATED, title, message, {invoiceId, invoiceNumber, invoiceType, amount, currency})`. Keep existing email functionality untouched.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms `createNotificationsForRoles` in invoices service.

### 11. Integrate notifications into journal-entries

- [x] **RED** — Check: `journal-entries.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `journal-entries.module.ts`: add `NotificationsModule` to imports. In `journal-entries.service.ts`: inject `NotificationsService`. After successful `post` (not create — only when finalized), add try/catch calling `createNotificationsForRoles(orgId, ADMIN_ONLY_ROLES, userId, JOURNAL_ENTRY_POSTED, title, message, {journalEntryId, entryNumber, totalDebit, totalCredit})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

### 12. Integrate notifications into payments

- [x] **RED** — Check: `payments.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `payments.module.ts`: add `NotificationsModule` to imports. In `payments.service.ts`: inject `NotificationsService`. After successful `create` and `updateStatus`, add try/catch calling `createNotificationsForRoles(orgId, MANAGEMENT_ROLES, userId, PAYMENT_STATUS_CHANGED, title, message, {paymentId, amount, currency, status})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

---

## Phase 4 — Agronomy

### 13. Integrate notifications into lab-services

- [x] **RED** — Check: `lab-services.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `lab-services.module.ts`: add `NotificationsModule` to imports. In `lab-services.service.ts`: inject `NotificationsService`. After successful `updateOrder` that sets status to completed, add try/catch calling `createNotificationsForRoles(orgId, MANAGEMENT_ROLES, userId, LAB_RESULTS_AVAILABLE, title, message, {labOrderId, sampleType, parcelName})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

### 14. Integrate notifications into product-applications

- [x] **RED** — Check: `product-applications.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `product-applications.module.ts`: add `NotificationsModule` to imports. In `product-applications.service.ts`: inject `NotificationsService`. After successful `createProductApplication`, add try/catch calling `createNotificationsForRoles(orgId, OPERATIONAL_ROLES, userId, PRODUCT_APPLICATION_COMPLETED, title, message, {applicationId, productName, parcelName, quantity})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

### 15. Integrate notifications into soil-analyses

- [x] **RED** — Check: `soil-analyses.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `soil-analyses.module.ts`: add `NotificationsModule` to imports. In `soil-analyses.service.ts`: inject `NotificationsService`. After successful `create` or `update` with completed status, add try/catch calling `createNotificationsForRoles(orgId, MANAGEMENT_ROLES, userId, SOIL_ANALYSIS_COMPLETED, title, message, {analysisId, parcelName, analysisType})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

### 16. Integrate notifications into harvest-events

- [x] **RED** — Check: `harvest-events.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `harvest-events.module.ts`: add `NotificationsModule` to imports. In `harvest-events.service.ts`: inject `NotificationsService`. After successful `create`, add try/catch calling `createNotificationsForRoles(orgId, OPERATIONAL_ROLES, userId, HARVEST_EVENT_RECORDED, title, message, {harvestEventId, cropName, parcelName, quantity, unit})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.

### 17. Integrate notifications into work-units

- [x] **RED** — Check: `work-units.service.ts` does not contain `this.notificationsService`. Assertion: grep returns nothing.
- [x] **ACTION** — In `work-units.module.ts`: add `NotificationsModule` to imports. In `work-units.service.ts`: inject `NotificationsService`. After successful `update` that sets status to completed, add try/catch calling `createNotificationsForRoles(orgId, OPERATIONAL_ROLES, userId, WORK_UNIT_COMPLETED, title, message, {workUnitId, description, workerName, hours})`.
- [x] **GREEN** — Run `npx tsc --noEmit` → compiles. Grep confirms integration.
