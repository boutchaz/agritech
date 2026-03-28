# Notification Expansion — Brief

## What
Add in-app real-time notifications to 14 business modules that currently lack them, with **role-based targeting** so each user only sees notifications relevant to their role.

## Why
- AgromindIA recommendations and alerts are the **core differentiator** — users must know about them instantly
- Karim (farm_manager) needs visibility on crop cycles, campaigns, task assignments, piece-work without checking each module
- Fatima (organization_admin) needs accounting events (invoices, journal entries, payments) surfaced immediately
- Hassan (agronome) needs lab results, soil analyses, product applications to act on scientific data
- Ahmed (farm_worker) needs field-level events (harvest events, work units, piece-work) on his simple interface
- Current system blasts ALL org members for every notification — wastes attention, creates noise

## Goals
1. Add `createNotificationsForRoles()` helper to `NotificationsService` — single place for role-based user resolution
2. Add 15 new `NotificationType` enum values
3. Integrate notifications into 14 modules at key lifecycle points
4. Add frontend type styles + filter entries for all new notification types
5. Migrate existing modules to use role-based targeting (stretch)

## Non-Goals
- Email notifications for new types (future work)
- User-level notification preferences / mute settings (future work)
- Push notifications / PWA service worker (separate request)
- Changing the notification UI layout or center page
- Notification grouping / digest (future work)

## Impact
- Every persona gets relevant, timely alerts without noise
- AgromindIA becomes proactive — users don't have to go looking for recommendations
- Accounting module gets proper in-app visibility (only had email before)
- Foundation for future notification preferences system

## Modules & Priority

| Phase | Module | Notification Types |
|-------|--------|--------------------|
| 1 — AgromindIA | ai-recommendations | `ai_recommendation_created` |
| 1 — AgromindIA | ai-alerts | `ai_alert_triggered` |
| 2 — Operations | crop-cycles | `crop_cycle_status_changed` |
| 2 — Operations | campaigns | `campaign_status_changed` |
| 2 — Operations | task-assignments | `task_reassigned` |
| 2 — Operations | piece-work | `piece_work_created` |
| 3 — Finance | invoices | `invoice_created` |
| 3 — Finance | journal-entries | `journal_entry_posted` |
| 3 — Finance | payments | `payment_status_changed` |
| 4 — Agronomy | lab-services | `lab_results_available` |
| 4 — Agronomy | product-applications | `product_application_completed` |
| 4 — Agronomy | soil-analyses | `soil_analysis_completed` |
| 4 — Agronomy | harvest-events | `harvest_event_recorded` |
| 4 — Agronomy | work-units | `work_unit_completed` |

## Role Targeting Matrix

| Notification Type | org_admin | farm_manager | farm_worker | day_laborer | viewer |
|---|---|---|---|---|---|
| ai_recommendation_created | ✅ | ✅ | ✗ | ✗ | ✗ |
| ai_alert_triggered | ✅ | ✅ | ✗ | ✗ | ✗ |
| crop_cycle_status_changed | ✅ | ✅ | ✗ | ✗ | ✗ |
| campaign_status_changed | ✅ | ✅ | ✗ | ✗ | ✗ |
| task_reassigned | ✅ | ✅ | ✅* | ✗ | ✗ |
| piece_work_created | ✅ | ✅ | ✅ | ✗ | ✗ |
| invoice_created | ✅ | ✅ | ✗ | ✗ | ✗ |
| journal_entry_posted | ✅ | ✗ | ✗ | ✗ | ✗ |
| payment_status_changed | ✅ | ✅ | ✗ | ✗ | ✗ |
| lab_results_available | ✅ | ✅ | ✗ | ✗ | ✗ |
| product_application_completed | ✅ | ✅ | ✅ | ✗ | ✗ |
| soil_analysis_completed | ✅ | ✅ | ✗ | ✗ | ✗ |
| harvest_event_recorded | ✅ | ✅ | ✅ | ✗ | ✗ |
| work_unit_completed | ✅ | ✅ | ✅ | ✗ | ✗ |

*task_reassigned: the assigned worker always receives regardless of role
