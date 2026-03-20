---
sidebar_position: 10
title: "Tasks & Workforce"
---

# Tasks & Workforce

The Tasks & Workforce system covers task lifecycle management, worker profiles, time tracking, piece-work payment tracking, and automated reminders. All endpoints are multi-tenant, scoped by `organization_id`, and protected by JWT authentication with CASL-based permission guards.

## Task Management

### Task CRUD

Tasks are managed through the `TasksService` and exposed via `TasksController` at the `/tasks` route. The controller uses `JwtAuthGuard`, `OrganizationGuard`, and `PoliciesGuard` with granular permission decorators (`@CanReadTasks`, `@CanCreateTask`, `@CanUpdateTask`, `@CanDeleteTask`).

**Task types:** `planting`, `harvesting`, `irrigation`, `fertilization`, `maintenance`, `general`, `pest_control`, `pruning`, `soil_preparation`

**Priority levels:** `low`, `medium`, `high`, `urgent`

**Statuses:** `pending`, `assigned`, `in_progress`, `completed`, `cancelled`, `on_hold`

Creating a task sets the initial status to `pending` with `completion_percentage: 0`. The create endpoint also supports upsert behavior -- if an `id` is provided in the DTO, it updates the existing task instead of inserting a new one.

When a new task is created, the system records an adoption milestone (`FIRST_TASK_CREATED`) via `AdoptionService`.

### Task Fields

Each task can include:

- **Location:** `farm_id` (required), `parcel_id`, `crop_id`, `location_lat`, `location_lng`
- **Scheduling:** `scheduled_start`, `scheduled_end`, `due_date`, `estimated_duration` (hours)
- **Assignment:** `assigned_to` (worker ID)
- **Requirements:** `required_skills` (array), `equipment_required` (array), `weather_dependency` (boolean)
- **Cost:** `cost_estimate`, `payment_type` (`daily`, `per_unit`, `monthly`, `metayage`, `none`), `work_unit_id`, `units_required`, `rate_per_unit`
- **Consumables:** `planned_items` -- array of products/materials to consume on completion

### Filtering and Pagination

`GET /tasks` supports rich filtering via `TaskFiltersDto`:

| Parameter | Description |
|-----------|-------------|
| `status` | Comma-separated statuses |
| `priority` | Comma-separated priorities |
| `task_type` | Comma-separated task types |
| `assigned_to` | Worker UUID |
| `farm_id` | Farm UUID |
| `parcel_id` | Parcel UUID |
| `date_from` / `date_to` | Date range on `scheduled_start` |
| `search` | Free-text search on title and description |
| `page` / `pageSize` | Pagination (1-based, default 10 per page) |
| `sortBy` / `sortDir` | Sort field and direction (default: `scheduled_start` desc) |

When pagination parameters are provided, the response includes `{ data, total, page, pageSize, totalPages }`. Without pagination, the endpoint returns a flat array.

### My Tasks

`GET /tasks/my-tasks` returns all tasks assigned to or created by the current user across all their organizations. Supports an `includeCompleted` query parameter (default `false`). The service resolves the current user's worker record via the `workers.user_id` foreign key.

### Task Statistics

`GET /tasks/statistics` returns aggregate statistics for an organization's tasks.

### Task Categories

Tasks can be organized with custom categories scoped to an organization:

- `GET /tasks/categories/all` -- list categories
- `POST /tasks/categories` -- create a category

### Task Comments

- `GET /tasks/:taskId/comments` -- list comments on a task
- `POST /tasks/:taskId/comments` -- add a comment

### Task Completion

Two completion flows exist:

1. **Standard completion:** `PATCH /tasks/:taskId/complete` with `CompleteTaskDto`
2. **Harvest completion:** `POST /tasks/:taskId/complete-with-harvest` with `CompleteHarvestTaskDto` -- completes the task and creates a harvest record in one operation via `ReceptionBatchesService`

When a task status changes to `completed` and has an assigned worker, the system automatically creates a `work_record` entry. It calculates hours worked from `start_date`/`end_date` and payment based on the worker's payment type and rate.

### Status Change Notifications

When a task's status changes, the system sends an in-app notification to the assigned worker (if they have a linked user account) via `NotificationsService`. The notification type is `TASK_STATUS_CHANGED`.

## Task Assignment System

### Direct Assignment

Tasks can be assigned to a worker directly via:

- `PATCH /tasks/:taskId/assign` with `AssignTaskDto` (on the tasks controller)

### Detailed Assignments Module

The `TaskAssignmentsController` provides a more granular assignment system at:

```
/api/v1/organizations/:organizationId/tasks/:taskId/assignments
```

**Assignment roles:** `worker`, `supervisor`, `lead`

**Assignment statuses:** `assigned`, `working`, `completed`, `removed`

Key operations:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | List all assignments for a task (excludes `removed`) |
| `POST` | `/` | Assign a single worker |
| `POST` | `/bulk` | Assign multiple workers at once |
| `PATCH` | `/:assignmentId` | Update assignment (status, hours, notes) |
| `DELETE` | `/:assignmentId` | Soft-delete (sets status to `removed`) |

When an assignment is created for a task with status `pending`, the task is automatically updated to `assigned`.

Re-assigning a previously removed worker reactivates the existing assignment record rather than creating a duplicate.

The service also provides `getWorkerAssignments()` to retrieve all assignments for a specific worker, optionally filtered by status and with task details included.

## Task Templates

The `TaskTemplatesService` allows creating new tasks from existing task records used as templates. Endpoint:

```
POST /organizations/:organizationId/task-templates/create-from-template
```

The `CreateTaskFromTemplateDto` accepts:
- `templateId` (required) -- the source task ID
- `farmId` (optional override)
- `assignedTo` (optional override)
- `scheduledDate` (optional override)

When creating from a template, the system copies:
- All task fields (title, description, type, priority, estimated duration, equipment, etc.)
- Task dependencies from the `task_dependencies` table
- Task equipment from the `task_equipment` table

The new task is created with status `pending`.

An additional endpoint exists for updating task status with optional notes:

```
POST /organizations/:organizationId/tasks/update-status
```

Notes are stored as `task_comments`.

## Worker Management

### Worker CRUD

Workers are managed through `WorkersController` at `/organizations/:organizationId/workers`, protected by `@CanReadWorkers`, `@CanCreateWorker`, `@CanUpdateWorker`, `@CanDeleteWorker` permission decorators.

**Worker profile fields:**

- **Identity:** `first_name`, `last_name`, `email`, `phone`, `cin`, `date_of_birth`, `photo_url`
- **Employment:** `position`, `worker_type`, `is_active`, `farm_id`, `specialties`, `certifications`
- **Compensation:** `hourly_rate`, `daily_rate`, `monthly_salary`, `payment_method`, `payment_frequency`
- **Social:** `cnss_number`, `bank_account`, `address`
- **Metayage (sharecropping):** `metayage_type`, `metayage_percentage`, `calculation_basis`, `metayage_contract_details`

Workers support both soft-delete (deactivation with end date) and hard-delete.

When a worker is created, a `WORKER_ADDED` notification is sent to all other active users in the organization.

### Worker Statistics

`GET /organizations/:organizationId/workers/:workerId/stats` returns:
- Total work records
- Total amount paid (from work records + payment records + metayage settlements)
- Pending payments
- Total days worked and tasks completed

### Work Records

Each worker has work records tracking daily labor:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/:workerId/work-records` | List records (filterable by date range) |
| `POST` | `/:workerId/work-records` | Create a record |
| `PATCH` | `/:workerId/work-records/:recordId` | Update a record |

There is also a backfill endpoint to retroactively create work records from completed tasks:

```
POST /organizations/:organizationId/workers/backfill-work-records
```

### Metayage (Sharecropping) System

The platform supports traditional Moroccan sharecropping arrangements with predefined percentage tiers:

| Type | Default Percentage |
|------|-------------------|
| `khammass` | 20% |
| `rebaa` | 25% |
| `tholth` | 33.33% |

Custom percentages can override the defaults. The `calculation_basis` can be `gross_revenue` or `net_revenue` (revenue minus charges).

Endpoints:

- `GET /:workerId/metayage-settlements` -- list settlements
- `POST /:workerId/metayage-settlements` -- create a settlement
- `POST /:workerId/calculate-metayage-share` -- calculate the worker's share from gross revenue and charges

### Platform Access Provisioning

`POST /:workerId/grant-platform-access` creates a Supabase auth user for the worker, links them to the organization with the `farm_worker` role, and sends a welcome email with a temporary password (expires in 7 days). The flow:

1. Generates a random 16-character password
2. Creates a Supabase auth user with email confirmation
3. Creates/upserts a `user_profiles` record
4. Assigns the `farm_worker` role in `organization_users`
5. Links the auth user to the worker record via `user_id`
6. Sends a welcome email via `EmailService`

If any step fails after auth user creation, the auth user is rolled back (deleted).

### Worker Self-Service (Dashboard)

The `WorkersMeController` at `/workers/me` provides endpoints for workers to access their own data without needing organization-level permissions:

| Endpoint | Description |
|----------|-------------|
| `GET /workers/me` | Current worker profile |
| `GET /workers/me/tasks` | Tasks assigned to current worker (filterable by status, with limit) |
| `GET /workers/me/time-logs` | Time logs (filterable by date range, with limit) |
| `GET /workers/me/statistics` | Performance statistics (tasks breakdown, hours, earnings) |

The statistics response includes:
- **Tasks:** total, completed, in progress, pending, overdue, completion rate (%)
- **Time:** total hours, total minutes, total sessions
- **Payments:** total earnings, pending payments

## Time Tracking

Time tracking is built into the tasks controller with clock-in/clock-out functionality:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tasks/:taskId/clock-in` | Start time tracking |
| `PATCH` | `/tasks/time-logs/:timeLogId/clock-out` | Stop time tracking |
| `GET` | `/tasks/:taskId/time-logs` | List time logs for a task |
| `GET` | `/tasks/time-logs/active-session` | Get current user's active session |
| `POST` | `/tasks/:taskId/clock-in-with-validation` | Clock in with location validation |
| `POST` | `/tasks/time-logs/auto-clock-out` | Auto-close stale sessions (default: 12 hours) |

Time logs are stored in the `task_time_logs` table with `clock_in`, `clock_out`, `duration_minutes`, and `worker_id` fields.

## Piece-Work Tracking

### Work Units

Work units define measurable units of output for piece-work payment. Managed via `WorkUnitsController` at `/work-units`.

**Unit categories:** `count`, `weight`, `volume`, `area`, `length`

Each work unit has:
- `code` (unique per organization, stored uppercase)
- `name`, `name_ar`, `name_fr` (multilingual)
- `unit_category`, `base_unit`, `conversion_factor`
- `is_active`, `allow_decimal`, `usage_count`

Work units with `usage_count > 0` cannot be deleted -- they must be deactivated instead.

### Piece-Work Records

Piece-work records track output-based labor at `/organizations/:organizationId/farms/:farmId/piece-work`.

Each record links a worker, a work unit, and optionally a task and parcel. The `total_amount` is automatically calculated as `units_completed * rate_per_unit`.

**Payment statuses:** `pending` -> `approved` (after verification) -> `paid`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | List records (filterable by worker, task, parcel, date range, payment status, search) |
| `GET` | `/:id` | Get single record |
| `POST` | `/` | Create record (auto-calculates total, increments work unit usage count) |
| `PATCH` | `/:id` | Update record (auto-recalculates total if units or rate change) |
| `DELETE` | `/:id` | Delete record (blocked if `payment_status` is `paid`) |
| `PATCH` | `/:id/verify` | Verify and approve a record |

## Reminders & Notifications

### Automated Cron Jobs

The `RemindersService` uses `@nestjs/schedule` to run two recurring jobs:

1. **Due-soon check** (`0 8 * * *` UTC, daily at 8:00 AM): finds tasks due within the next 24 hours that are still in `pending`, `assigned`, or `in_progress` status. Sends a `due_soon` reminder.

2. **Overdue check** (`0 */6 * * *` UTC, every 6 hours): finds overdue tasks and sends escalating alerts:
   - 1 day overdue: `overdue_1d` reminder
   - 3 days overdue: `overdue_3d` reminder

### Reminder Deduplication

Each reminder is recorded in the `task_reminders` table with `task_id`, `reminder_type`, and `sent_at`. Before sending, the service checks if a reminder of the same type has already been sent for a given task to prevent duplicates.

### Notification Channels

Reminders are delivered through two channels:

- **In-app notifications** via `NotificationsService` (type: `TASK_REMINDER`)
- **Email** via `EmailService` using templates: `task-due-soon`, `task-due-today`, `task-overdue`, `task-reminder`

### User Preferences

Users can control their notification preferences per organization via the `/reminders` endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/reminders/preferences` | Get current preferences |
| `POST` | `/reminders/preferences` | Update preferences (upsert) |
| `POST` | `/reminders/test` | Manually trigger reminder checks |

Configurable preferences:
- `taskRemindersEnabled` -- master toggle
- `taskReminder1dBefore` -- 1-day advance reminder
- `taskReminderOnDueDate` -- due-date reminder
- `taskOverdueAlerts` -- overdue escalation alerts
- `emailNotifications` -- email channel toggle
- `pushNotifications` -- push channel toggle

If a user has `task_reminders_enabled` set to `false`, all reminders are suppressed. If `email_notifications` is `false`, only in-app notifications are sent.

## Key File Paths

| Module | Path |
|--------|------|
| Tasks service | `agritech-api/src/modules/tasks/tasks.service.ts` |
| Tasks controller | `agritech-api/src/modules/tasks/tasks.controller.ts` |
| Task DTOs | `agritech-api/src/modules/tasks/dto/` |
| Task assignments service | `agritech-api/src/modules/task-assignments/task-assignments.service.ts` |
| Task assignments controller | `agritech-api/src/modules/task-assignments/task-assignments.controller.ts` |
| Task templates service | `agritech-api/src/modules/task-templates/task-templates.service.ts` |
| Task templates controller | `agritech-api/src/modules/task-templates/task-templates.controller.ts` |
| Workers service | `agritech-api/src/modules/workers/workers.service.ts` |
| Workers controller | `agritech-api/src/modules/workers/workers.controller.ts` |
| Worker self-service controller | `agritech-api/src/modules/workers/workers-me.controller.ts` |
| Piece-work service | `agritech-api/src/modules/piece-work/piece-work.service.ts` |
| Piece-work controller | `agritech-api/src/modules/piece-work/piece-work.controller.ts` |
| Work units service | `agritech-api/src/modules/work-units/work-units.service.ts` |
| Work units controller | `agritech-api/src/modules/work-units/work-units.controller.ts` |
| Reminders service | `agritech-api/src/modules/reminders/reminders.service.ts` |
| Reminders controller | `agritech-api/src/modules/reminders/reminders.controller.ts` |
