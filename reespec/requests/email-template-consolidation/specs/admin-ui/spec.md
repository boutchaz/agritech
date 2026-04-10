# Spec: Admin UI shows global templates

## Scenario: Admin sees all system email templates

GIVEN global templates are seeded in the DB
WHEN the admin navigates to /email-templates
THEN all system templates are listed grouped by category
AND each template shows name, type, category, active status

## Scenario: Admin edits a template

GIVEN the admin selects a template
WHEN they edit the subject and HTML body and click Save
THEN the DB row is updated
AND the next email sent with that type uses the new content

## Scenario: Admin previews a template

GIVEN the admin selects a template
WHEN they click the preview button
THEN an iframe renders the raw HTML body
