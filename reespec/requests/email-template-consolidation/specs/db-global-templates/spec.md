# Spec: Global email templates in DB

## Scenario: organization_id is nullable for global templates

GIVEN the `email_templates` table
WHEN a row is inserted with `organization_id = NULL`
THEN the insert succeeds and `is_system = true`

## Scenario: Seed populates all system email types

GIVEN an empty `email_templates` table (no global rows)
WHEN the seed function runs
THEN rows exist for all system types: user_created, password_reset, test_email, task_due_soon, task_due_today, task_overdue, audit_reminder, invoice_email, quote_request_received, quote_response_sent, order_confirmed, new_order_to_seller, order_status_update
AND each row has `organization_id = NULL` and `is_system = true`
AND each row has non-empty `html_body`, `subject`, and `variables`

## Scenario: Seed is idempotent

GIVEN global templates already exist in DB
WHEN the seed function runs again
THEN no duplicate rows are created
