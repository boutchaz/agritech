# Tasks: Email Template Consolidation

---

### 1. Schema: make organization_id nullable + add RLS for global templates

- [x] **RED** — Query: `INSERT INTO email_templates (name, type, category, subject, html_body, is_system) VALUES ('test', 'test_x', 'general', 'Test', '<p>Test</p>', true)` fails with NOT NULL constraint on organization_id.
- [x] **ACTION** — In `00000000000000_schema.sql`: change `organization_id UUID NOT NULL` to `organization_id UUID`, update RLS policy to allow global rows (`organization_id IS NULL`) for service role, add partial index on `(type) WHERE organization_id IS NULL`.
- [x] **GREEN** — Run `db:reset`. Insert a row with `organization_id = NULL` succeeds. Existing org-scoped rows still work. Index exists.

---

### 2. Seed all system templates as global rows

- [x] **RED** — Query `SELECT type FROM email_templates WHERE organization_id IS NULL` returns 0 rows.
- [x] **ACTION** — In `EmailTemplatesService`, create `seedGlobalTemplates()` method with per-type idempotency check. Includes all 15 system types (7 from .hbs + 8 from getDefaultTemplates). Called via onModuleInit. Unique partial index prevents race condition duplicates.
- [x] **GREEN** — After backend restart, `SELECT type FROM email_templates WHERE organization_id IS NULL` returns 15 rows. Running again produces no duplicates.

---

### 3. Add sendByType method to EmailService

- [x] **RED** — `emailService.sendByType` method does not exist. Calling it throws.
- [x] **ACTION** — Added `sendByType(type, to, context)` to EmailService. Injects DatabaseService (optional). Queries email_templates for global active template by type, compiles subject+body with Handlebars. Falls back to .hbs file if no DB row.
- [x] **GREEN** — TypeScript compiles clean. Method exists with DB lookup → Handlebars compile → send → fallback chain.

---

### 4. Migrate EmailService convenience methods to sendByType

- [x] **RED** — `sendUserCreatedEmail()` reads from `user-created.hbs` file, not from DB.
- [x] **ACTION** — Rewrote all three to call `this.sendByType()`: user_created, password_reset, test_email.
- [x] **GREEN** — TypeScript compiles clean. All three methods now delegate to sendByType.

---

### 5. Migrate RemindersService to sendByType

- [x] **RED** — `remindersService.sendReminderEmail()` calls `emailService.sendEmail({template: 'task-due-soon'})` reading .hbs files.
- [x] **ACTION** — Updated RemindersService to use `sendByType()` with types: task_due_soon, task_due_today, task_overdue. Updated ComplianceRemindersService to use `sendByType('audit_reminder', ...)`.
- [x] **GREEN** — TypeScript compiles clean. Both services now use DB-backed templates via sendByType.

---

### 6. Migrate NotificationsService invoice email to sendByType

- [x] **RED** — `notificationsService.sendInvoiceEmail()` uses hardcoded `generateInvoiceEmail()` HTML string.
- [x] **ACTION** — Injected EmailService into NotificationsService. `sendInvoiceEmail()` now uses `emailServiceDb.sendByType('invoice_email', ...)` with fallback to hardcoded HTML.
- [x] **GREEN** — TypeScript compiles clean. Invoice email now uses DB template when EmailService is available.

---

### 7. Update admin app to show global templates only

- [x] **RED** — Admin email-templates page queries all templates regardless of organization_id, showing org-scoped noise.
- [x] **ACTION** — Updated query to `.is('organization_id', null)`. Removed org filter dropdown, org display in list items and detail panel. Cleaned up unused imports.
- [x] **GREEN** — TypeScript compiles clean. Page now shows only global templates with category filter and search.

---

### 8. Add unique constraint for global template types

- [x] **RED** — Two rows with same `type` and `organization_id IS NULL` can be inserted (no uniqueness enforced).
- [x] **ACTION** — Added partial unique index `idx_email_templates_global_type_unique` in schema. Pulled forward to task 2 to prevent seed race conditions.
- [x] **GREEN** — Duplicate global template type insert fails with unique violation. 15 rows seeded cleanly.

---
