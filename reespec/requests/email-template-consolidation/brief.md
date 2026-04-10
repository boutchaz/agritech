# Email Template Consolidation

## Problem

The system sends ~20 emails via 3 disconnected mechanisms:
1. **EmailService** — reads `.hbs` files from disk (7 templates)
2. **NotificationsService** — hardcoded HTML strings inline (7 templates)
3. **marketplace-templates.ts** — TypeScript functions returning HTML (6+ templates)

Meanwhile, an `email_templates` DB table exists with full CRUD API and an admin UI — but **nothing reads from it at send time**. Admins cannot view, preview, or edit the actual emails the system sends.

## Goals

1. **All email templates stored in DB** — seed the real templates (from .hbs files + hardcoded HTML) as global rows in `email_templates`
2. **Backend reads from DB at send time** — `EmailService.renderTemplate()` queries the DB instead of reading .hbs files; falls back to .hbs if DB row missing
3. **Admin app manages templates** — the admin UI at `/email-templates` shows the real templates and edits are reflected in sent emails
4. **Global templates** — not per-org. `organization_id` becomes nullable; global rows have `NULL` org

## Non-Goals

- Per-org template customization (future, not now)
- Marketplace emails (last priority, can remain hardcoded for now)
- Rich WYSIWYG email editor (raw HTML editing is fine)
- Email sending infrastructure changes (SMTP config stays the same)

## Impact

- Internal admins can preview and tweak every email the platform sends
- No more deploying code to change email wording
- Single source of truth for all email content
