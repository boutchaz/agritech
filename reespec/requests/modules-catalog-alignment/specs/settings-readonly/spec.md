# Spec — /settings/modules Read-Only

## GIVEN an organization_admin visits /settings/modules

### Scenario: no toggle controls are rendered
- **GIVEN** the component `project/src/components/ModulesSettings.tsx`
- **WHEN** it renders with a logged-in organization_admin
- **THEN** the rendered DOM contains zero `<input type="checkbox">` or Switch components wired to `is_active`
- **AND** zero buttons with text matching `/activer|désactiver|enable|disable|toggle/i`

### Scenario: lists the org's active modules
- **GIVEN** the org has `core`, `production`, `sales_purchasing` active
- **WHEN** the page renders
- **THEN** there is one list item per active module showing its icon + translated name
- **AND** inactive modules are either hidden or rendered under a separate "Indisponible" section

### Scenario: contact-sales CTA is visible when any sellable module is inactive
- **GIVEN** the org has at least one sellable module (non-required) with `is_active = false`
- **WHEN** the page renders
- **THEN** the page shows a CTA button (i18n key `modules.contactSales`) linked to `mailto:` or a contact form

### Scenario: system_admin sees the same read-only UI (no bypass)
- **GIVEN** a user with role `system_admin` logs into project/ (not admin-app)
- **WHEN** they visit `/settings/modules`
- **THEN** they see the same read-only list
- **AND** they do NOT see toggle controls

## Backend surface

### Scenario: PATCH /api/v1/organizations/:orgId/modules/:moduleId is rejected for organization_admin
- **GIVEN** a user with role `organization_admin` on org `O1`
- **WHEN** they PATCH `/api/v1/organizations/O1/modules/<moduleId>` with `{is_active: true}`
- **THEN** the response status is `403`
- **AND** the response body contains `"You do not have permission to update modules"` or similar

### Scenario: PATCH is rejected even for system_admin (deprecated path)
- **GIVEN** a user with role `system_admin`
- **WHEN** they PATCH `/api/v1/organizations/O1/modules/<moduleId>`
- **THEN** the response status is `410 Gone` or `403`
- **AND** the response message points to the admin-app endpoint `/api/v1/admin/orgs/:id/modules`

### Scenario: attempting to deactivate a required module is rejected
- **GIVEN** a system_admin calls PUT `/api/v1/admin/orgs/O1/modules` with the enabled array missing `core`
- **WHEN** the handler runs
- **THEN** the response status is `400`
- **AND** the message mentions `core` cannot be deactivated (or "required module")
