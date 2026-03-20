---
sidebar_position: 12
title: "Compliance & Certifications"
---

# Compliance & Certifications

The Compliance module provides end-to-end management of agricultural certifications, compliance checks, corrective actions, and automated audit reminders. It is implemented as a NestJS module (`ComplianceModule`) backed by Supabase and integrates with the Notifications and Email modules.

## Architecture

The module is composed of four services:

| Service | Responsibility |
|---|---|
| `ComplianceService` | CRUD for certifications, compliance checks, evidence, requirements, and dashboard statistics |
| `ComplianceRemindersService` | Cron-based audit and certification expiry reminders |
| `ComplianceReportsService` | PDF report generation (GlobalGAP) |
| `CorrectiveActionsService` | Lifecycle management of corrective actions with statistics |

All endpoints are scoped to an organization via the `x-organization-id` header and protected by `JwtAuthGuard` and CASL-based `PoliciesGuard`.

## Certifications

A certification record tracks an organization's adherence to a standard. Supported certification types:

- **GlobalGAP**
- **HACCP**
- **ISO9001 / ISO14001**
- **Organic**
- **FairTrade**
- **Rainforest Alliance**
- **USDA Organic**

### Certification Fields

| Field | Description |
|---|---|
| `certification_type` | One of the enum values above |
| `certification_number` | Unique identifier issued by the certifying body |
| `issued_date` / `expiry_date` | Validity period (expiry must be after issued date) |
| `status` | `active`, `expired`, `pending_renewal`, or `suspended` |
| `issuing_body` | Name of the certifying organization |
| `scope` | What the certification covers (farms, products, processes) |
| `documents` | Array of attached document references (URL, type, upload date) |
| `audit_schedule` | Object with `next_audit_date`, `audit_frequency`, and `auditor_name` |

Duplicate certifications (same type and number within an organization) are rejected at creation time.

### Audit Schedule and Reminders

When a certification is created or updated with an `audit_schedule.next_audit_date`, the system automatically schedules reminders in the `audit_reminders` table at the following intervals before the audit date:

- **30 days** before
- **14 days** before
- **7 days** before
- **1 day** before

Only future reminders are scheduled; past dates are skipped. Old unsent reminders for the same certification are deleted before new ones are inserted.

## Automated Cron Jobs

The `ComplianceRemindersService` runs two daily cron jobs:

### 1. Audit Reminder Check (`0 9 * * *` UTC)

Runs every day at 09:00 UTC. It queries all `audit_reminders` where `scheduled_for <= now` and `sent_at IS NULL`, then for each due reminder:

1. Looks up organization admins (roles: `organization_admin`, `farm_manager`, `system_admin`).
2. Checks each admin's notification preferences (`user_notification_preferences` table) to determine whether the specific reminder tier is enabled.
3. Creates an in-app notification of type `AUDIT_REMINDER`.
4. Optionally sends an email using the `audit-reminder` template if email notifications are enabled.
5. Marks the reminder as sent with a timestamp and notification ID.

Reminder messages are localized in French (e.g., "Audit GlobalGAP dans 30 jours").

### 2. Certification Expiry Check (`0 10 * * *` UTC)

Runs every day at 10:00 UTC. It queries active certifications expiring within 30 days and sends `CERTIFICATION_EXPIRY` notifications to organization admins at the 30, 14, 7, and 1 day marks. Users can opt out via the `certification_expiry_reminders` preference.

## Compliance Checks

Compliance checks represent individual audits or inspections tied to a certification. They track inspection results, findings, and inline corrective actions.

### Check Types

- `pesticide_usage`
- `traceability`
- `worker_safety`
- `record_keeping`
- `environmental`
- `quality_control`

### Check Fields

| Field | Description |
|---|---|
| `certification_id` | Links to the parent certification |
| `check_type` | One of the types listed above |
| `check_date` | When the check was conducted |
| `status` | `compliant`, `non_compliant`, `needs_review`, or `in_progress` |
| `score` | Numeric score from 0 to 100 |
| `auditor_name` | Name of the person who conducted the check |
| `findings` | Array of findings, each with `requirement_code`, `finding_description`, and `severity` |
| `corrective_actions` | Array of inline actions with `action_description`, `due_date`, `responsible_person`, and `status` |
| `next_check_date` | When the next check is scheduled |

When retrieving a single check, the response includes related `compliance_evidence` records (evidence type, file URL, description, upload timestamp).

## Evidence

Evidence records can be attached to compliance checks. Each evidence record contains:

- `compliance_check_id` -- the check it belongs to
- `evidence_type` -- type classification of the evidence
- `file_url` -- URL to the uploaded file
- `description` -- text description
- `uploaded_by` -- user who uploaded the evidence

The system validates that the referenced compliance check exists and belongs to the requesting organization before creating evidence.

## Corrective Actions

The standalone corrective actions system (separate from inline check corrective actions) provides full lifecycle management for non-compliance findings.

### Statuses

| Status | Description |
|---|---|
| `open` | Newly created, awaiting action |
| `in_progress` | Work is underway |
| `resolved` | Action completed, pending verification |
| `verified` | Resolution has been verified |
| `overdue` | Past due date (tracked via filters) |

### Priority Levels

`critical`, `high`, `medium`, `low`

### Corrective Action Fields

| Field | Description |
|---|---|
| `certification_id` | Related certification |
| `compliance_check_id` | Related compliance check (optional) |
| `finding_description` | Description of the non-compliance |
| `requirement_code` | Code of the violated requirement |
| `priority` | Priority level |
| `action_description` | What must be done |
| `responsible_person` | Person assigned |
| `due_date` | Deadline |
| `notes` | Additional notes |
| `resolved_at` | Auto-set when status moves to `resolved` |
| `verified_by` / `verified_at` | Verification tracking |

### Filtering

Corrective actions support filtering by `status`, `priority`, `certification_id`, and `overdue` (boolean flag that filters actions past their due date).

### Statistics

The `GET /compliance/corrective-actions/stats` endpoint returns:

- `total` -- total number of corrective actions
- `open`, `in_progress`, `resolved`, `verified` -- counts by status
- `overdue` -- count of open/in-progress actions past due date
- `resolution_rate` -- ratio of closed (resolved + verified) to total
- `average_resolution_days` -- mean days to resolution

## Compliance Requirements

The system stores a catalog of compliance requirements in the `compliance_requirements` table, each with a `requirement_code`, `requirement_description`, `category`, `certification_type`, and `is_critical` flag. Requirements can be retrieved for all types or filtered to a specific certification type (e.g., `GlobalGAP`).

## Dashboard

The `GET /compliance/dashboard` endpoint returns aggregated statistics:

```json
{
  "certifications": {
    "total": 5,
    "active": 3,
    "expiring_soon": 1
  },
  "checks": {
    "recent": [...],
    "non_compliant_count": 2,
    "average_score": 87.5
  }
}
```

- **Expiring soon**: active certifications expiring within 90 days.
- **Recent checks**: last 10 checks from the past 30 days, ordered by date descending.
- **Average score**: computed from all checks that have a score.

## PDF Reports

The `GET /compliance/certifications/:id/report/pdf` endpoint generates a downloadable GlobalGAP compliance report using `jsPDF` with `jspdf-autotable`. The report includes:

1. Certification details (number, issuing body, validity period, status, scope)
2. Requirements checklist table (code, description, category, critical flag)
3. Compliance checks table (date, type, auditor, score, status)
4. Non-conformities and corrective actions section
5. Summary with overall score, total checks, compliant/non-compliant counts, and requirement statistics

The report is returned as a binary PDF attachment.

## Key Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/compliance/certifications` | List all certifications |
| `GET` | `/compliance/certifications/:id` | Get a single certification |
| `POST` | `/compliance/certifications` | Create a certification |
| `PATCH` | `/compliance/certifications/:id` | Update a certification |
| `DELETE` | `/compliance/certifications/:id` | Delete a certification |
| `GET` | `/compliance/checks` | List all compliance checks |
| `GET` | `/compliance/checks/:id` | Get a single check with evidence |
| `POST` | `/compliance/checks` | Create a compliance check |
| `PATCH` | `/compliance/checks/:id` | Update a compliance check |
| `DELETE` | `/compliance/checks/:id` | Delete a compliance check |
| `GET` | `/compliance/requirements` | List requirements (optional `?certification_type=` filter) |
| `POST` | `/compliance/evidence` | Upload evidence for a check |
| `GET` | `/compliance/dashboard` | Get dashboard statistics |
| `GET` | `/compliance/certifications/:id/report/pdf` | Download GlobalGAP PDF report |
| `GET` | `/compliance/corrective-actions/stats` | Get corrective action statistics |
| `GET` | `/compliance/corrective-actions` | List corrective actions (filterable) |
| `GET` | `/compliance/corrective-actions/:id` | Get a single corrective action |
| `POST` | `/compliance/corrective-actions` | Create a corrective action |
| `PATCH` | `/compliance/corrective-actions/:id` | Update a corrective action |
| `DELETE` | `/compliance/corrective-actions/:id` | Delete a corrective action |

## Database Tables

| Table | Purpose |
|---|---|
| `certifications` | Certification records per organization |
| `compliance_checks` | Audit/inspection records linked to certifications |
| `compliance_evidence` | Evidence files attached to checks |
| `compliance_requirements` | Catalog of requirements by certification type |
| `corrective_actions` | Standalone corrective action records |
| `corrective_action_evidence` | Evidence for corrective actions |
| `audit_reminders` | Scheduled reminder records for upcoming audits |
| `user_notification_preferences` | Per-user reminder opt-in/opt-out settings |
