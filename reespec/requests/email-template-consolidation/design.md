# Design: Email Template Consolidation

## Architecture

```
BEFORE                                    AFTER
──────                                    ─────
EmailService                              EmailService
  → reads .hbs file from disk               → queries email_templates WHERE type = X
  → compiles with Handlebars                    AND organization_id IS NULL
  → sends                                   → compiles html_body with Handlebars
                                            → falls back to .hbs if no DB row
NotificationsService                         → sends
  → builds HTML inline
  → sends via own transporter             NotificationsService
                                            → calls EmailService.sendByType()
                                            → no more inline HTML
```

## Schema Change

Make `organization_id` nullable. Global templates have `NULL` org.

```sql
ALTER TABLE email_templates ALTER COLUMN organization_id DROP NOT NULL;
```

RLS policy update: global templates (org IS NULL) readable by service role only.
The admin app uses Supabase directly with service-level access, so no RLS issue.
Backend uses `getAdminClient()` which bypasses RLS.

Add index for global template lookup:
```sql
CREATE INDEX idx_email_templates_global_type ON email_templates (type) WHERE organization_id IS NULL;
```

## Template Type Registry

Each email the system sends gets a unique `type` string. This is the lookup key.

| type                    | category   | current source              |
|-------------------------|------------|-----------------------------|
| user_created            | general    | user-created.hbs            |
| password_reset          | general    | password-reset.hbs          |
| test_email              | general    | test.hbs                    |
| task_due_soon           | task       | task-due-soon.hbs           |
| task_due_today          | task       | task-due-today.hbs          |
| task_overdue            | task       | task-overdue.hbs            |
| audit_reminder          | reminder   | audit-reminder.hbs          |
| invoice_email           | invoice    | NotificationsService inline |
| rdv_siam                | general    | PublicRdvService inline     |
| health_alert            | general    | AlertService inline         |
| quote_request_received  | marketplace| NotificationsService inline |
| quote_response_sent     | marketplace| NotificationsService inline |
| order_confirmed         | order      | NotificationsService inline |
| new_order_to_seller     | order      | NotificationsService inline |
| order_status_update     | order      | NotificationsService inline |

## EmailService Changes

New method: `sendByType(type, to, context)`:
1. Query `email_templates` WHERE `type = ?` AND `organization_id IS NULL` AND `is_active = true`
2. If found: compile `html_body` with Handlebars, use `subject` from DB (also compile with Handlebars for variable substitution)
3. If not found: fall back to existing .hbs file behavior (safety net during migration)
4. Send via nodemailer

Existing `sendEmail()` method stays unchanged for backward compat during migration.
Callers migrate one-by-one from `sendEmail({template: 'x'})` to `sendByType('x', to, context)`.

## Seeding

On app startup (or via migration), seed all global templates into `email_templates` with:
- `organization_id = NULL`
- `is_system = true`
- `html_body` = content from current .hbs files / hardcoded HTML
- `variables` = list of Handlebars variables used

The existing `getDefaultTemplates()` in EmailTemplatesService already has marketplace templates.
Extend it with the .hbs-based templates and use it as the seed source.

## Admin App

The admin email-templates page already exists. Filter to show `organization_id IS NULL` rows.
No org dropdown needed since all templates are global.

## Migration Order

Phase 1: Schema + seed + sendByType method + admin UI filter
Phase 2: Migrate .hbs-based callers (EmailService methods)
Phase 3: Migrate hardcoded HTML callers (NotificationsService)
Phase 4: Marketplace emails (last)

## Risks

- **Broken emails if seed fails**: Fallback to .hbs files mitigates this
- **Handlebars in subject line**: Need to compile subject too, not just body
- **Template cache invalidation**: EmailService caches compiled .hbs templates in a Map; DB templates should NOT be cached (or use short TTL) so admin edits take effect immediately
