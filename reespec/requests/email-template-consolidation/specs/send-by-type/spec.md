# Spec: sendByType reads templates from DB

## Scenario: Send email using DB template

GIVEN a global template exists with type = "user_created"
WHEN `emailService.sendByType("user_created", "test@test.com", {firstName: "Ali"})` is called
THEN the email is sent with subject and body from the DB row
AND Handlebars variables in subject and body are replaced with context values

## Scenario: Fallback to .hbs when DB template missing

GIVEN no global template exists with type = "user_created"
AND the file `templates/user-created.hbs` exists on disk
WHEN `emailService.sendByType("user_created", "test@test.com", context)` is called
THEN the email is sent using the .hbs file (existing behavior)

## Scenario: Inactive template is skipped

GIVEN a global template exists with type = "test_email" and `is_active = false`
WHEN `emailService.sendByType("test_email", ...)` is called
THEN the template is NOT used (falls back to .hbs or fails gracefully)
