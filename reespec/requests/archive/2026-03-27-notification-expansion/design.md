# Notification Expansion — Design

## Architecture Decision: Role-Based Helper

### Problem
Current pattern copies the same "fetch all org users → filter out actor → send" logic into every service. Adding role-based filtering would multiply this boilerplate across 14+ modules.

### Decision
Add `createNotificationsForRoles()` to `NotificationsService`. Modules declare **what roles** should see the notification; the service resolves users.

```
NotificationsService
├── createNotification(dto)                          # existing — single user
├── createNotificationsForUsers(userIds[], ...)      # existing — explicit user list
├── createNotificationsForRoles(orgId, roles[], ...) # NEW — role-based targeting
└── getUserIdsByRoles(orgId, roles[])                # NEW — private helper
```

### Signature
```typescript
async createNotificationsForRoles(
  organizationId: string,
  roles: string[],              // e.g. ['organization_admin', 'farm_manager']
  excludeUserId: string | null, // the actor — excluded from recipients
  type: NotificationType,
  title: string,
  message?: string,
  data?: Record<string, any>,
): Promise<void>
```

### SQL for role resolution
```sql
SELECT ou.user_id
FROM organization_users ou
JOIN roles r ON r.id = ou.role_id
WHERE ou.organization_id = $1
  AND ou.is_active = true
  AND r.name = ANY($2)        -- roles filter
  AND ou.user_id != $3         -- exclude actor
```

### Why not a separate notification-targeting table?
Over-engineering. The role matrix is stable (6 roles × ~15 types = small). If user-level preferences are needed later, a `notification_preferences` table can be added on top without changing the helper's external API.

---

## New NotificationType Enum Values

```typescript
// Phase 1 — AgromindIA
AI_RECOMMENDATION_CREATED = "ai_recommendation_created",
AI_ALERT_TRIGGERED = "ai_alert_triggered",

// Phase 2 — Operations
CROP_CYCLE_STATUS_CHANGED = "crop_cycle_status_changed",
CAMPAIGN_STATUS_CHANGED = "campaign_status_changed",
TASK_REASSIGNED = "task_reassigned",
PIECE_WORK_CREATED = "piece_work_created",

// Phase 3 — Finance
INVOICE_CREATED = "invoice_created",
JOURNAL_ENTRY_POSTED = "journal_entry_posted",
PAYMENT_STATUS_CHANGED = "payment_status_changed",

// Phase 4 — Agronomy
LAB_RESULTS_AVAILABLE = "lab_results_available",
PRODUCT_APPLICATION_COMPLETED = "product_application_completed",
SOIL_ANALYSIS_COMPLETED = "soil_analysis_completed",
HARVEST_EVENT_RECORDED = "harvest_event_recorded",
WORK_UNIT_COMPLETED = "work_unit_completed",
```

---

## Role Shorthand Constants

To avoid error-prone string arrays, define reusable constants:

```typescript
// In notifications service or a shared constants file
const MANAGEMENT_ROLES = ['organization_admin', 'farm_manager'];
const OPERATIONAL_ROLES = ['organization_admin', 'farm_manager', 'farm_worker'];
const ADMIN_ONLY_ROLES = ['organization_admin'];
```

Mapping:
- **MANAGEMENT_ROLES**: AI, crop-cycles, campaigns, invoices, payments, lab-services, soil-analyses
- **OPERATIONAL_ROLES**: task-assignments, piece-work, product-applications, harvest-events, work-units
- **ADMIN_ONLY_ROLES**: journal-entries

---

## Frontend Changes

### NotificationItem typeStyles
Add 14 new entries to the `typeStyles` map in `NotificationItem.tsx`:

| Type | Icon | Color scheme |
|------|------|-------------|
| ai_recommendation_created | 🤖 | emerald (AI brand) |
| ai_alert_triggered | 🚨 | red (urgency) |
| crop_cycle_status_changed | 🌱 | green (growth) |
| campaign_status_changed | 📅 | blue (planning) |
| task_reassigned | 🔄 | indigo (task family) |
| piece_work_created | 💼 | orange (work) |
| invoice_created | 🧾 | purple (finance) |
| journal_entry_posted | 📒 | violet (accounting) |
| payment_status_changed | 💳 | emerald (money) |
| lab_results_available | 🔬 | sky (science) |
| product_application_completed | 🧪 | lime (treatment) |
| soil_analysis_completed | 🌍 | amber (earth) |
| harvest_event_recorded | 🌾 | green (harvest family) |
| work_unit_completed | 📊 | cyan (metrics) |

### NotificationFilters typeFilters
Add corresponding filter entries to `NotificationFilters.tsx` `typeFilters[]` array and `NotificationTypeFilter` type.

### NotificationBell EnhancedNotificationItem
Add entries to `getTypeIcon()` and `getTypeStyle()` in `NotificationBell.tsx`.

---

## Integration Pattern per Module

Each module integration follows the same 4-step pattern:

1. **Module file**: Add `NotificationsModule` to `imports`
2. **Service constructor**: Inject `NotificationsService`
3. **Service method**: Add `createNotificationsForRoles()` call after the key operation
4. **Error handling**: Wrap in try/catch, log warning, never fail the main operation

```typescript
// Standard pattern for every module
try {
  await this.notificationsService.createNotificationsForRoles(
    organizationId,
    MANAGEMENT_ROLES,           // or OPERATIONAL_ROLES or ADMIN_ONLY_ROLES
    userId,                     // exclude actor
    NotificationType.XXX,
    title,
    message,
    { entityId: data.id, ... },
  );
} catch (notifError) {
  this.logger.warn(`Failed to send XXX notification: ${notifError}`);
}
```

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Notification spam if org has many events | Role-based targeting reduces volume; future: digest/preferences |
| Performance: role JOIN on every notification | Query is indexed (org_users.org_id + roles.id), <5ms |
| Missing role_id on organization_users | Helper falls back to empty array — no crash, just no notification |
| Frontend bundle size from 14 new type styles | Negligible — just object entries |

---

## What This Does NOT Change
- Existing notification integrations remain untouched (they still use `createNotificationsForUsers`)
- The notification DB schema — no migrations needed
- The WebSocket gateway — no changes needed
- The notification center UI layout — just new type entries
