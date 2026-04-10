# Spec: Migrate callers to sendByType

## Scenario: sendUserCreatedEmail uses DB template

GIVEN a global template with type = "user_created" exists
WHEN `emailService.sendUserCreatedEmail(email, firstName, lastName, tempPassword, orgName)` is called
THEN it delegates to `sendByType("user_created", email, {firstName, lastName, ...})`

## Scenario: sendPasswordResetEmail uses DB template

GIVEN a global template with type = "password_reset" exists
WHEN `emailService.sendPasswordResetEmail(email, firstName, tempPassword)` is called
THEN it delegates to `sendByType("password_reset", email, {firstName, tempPassword, loginUrl})`

## Scenario: Task reminders use DB template

GIVEN global templates exist for task_due_soon, task_due_today, task_overdue
WHEN `remindersService.sendReminderEmail()` is called with reminderType = "due_soon"
THEN it sends via `sendByType("task_due_soon", ...)`

## Scenario: Invoice email uses DB template

GIVEN a global template with type = "invoice_email" exists
WHEN `notificationsService.sendInvoiceEmail(data)` is called
THEN it delegates to `emailService.sendByType("invoice_email", data.partyEmail, context)`
AND the hardcoded HTML generator method is no longer used

## Scenario: Audit reminder uses DB template

GIVEN a global template with type = "audit_reminder" exists
WHEN `complianceRemindersService.sendAuditReminderEmail()` is called
THEN it sends via `sendByType("audit_reminder", ...)`
