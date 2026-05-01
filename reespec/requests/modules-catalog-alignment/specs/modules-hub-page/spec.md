# Spec — /modules Hub Page (DB-driven)

## GIVEN the hub page renders for an authenticated user

### Scenario: hardcoded MODULE_SECTIONS is gone
- **GIVEN** the source of `project/src/routes/_authenticated/(misc)/modules.tsx`
- **WHEN** I grep for `MODULE_SECTIONS`
- **THEN** there are zero matches

### Scenario: renders active modules from the DB
- **GIVEN** the org has `core`, `chat_advisor`, `accounting`, `production` active
- **WHEN** the hub page renders
- **THEN** the page shows at least one ModuleCard for each of those four slugs
- **AND** each card has the translated name from `module_translations`

### Scenario: inactive sellable modules render as locked with contact-sales CTA
- **GIVEN** the org has `compliance` inactive
- **AND** `compliance.is_required = false`
- **WHEN** the hub page renders
- **THEN** a ModuleCard for compliance is visible
- **AND** the card has a lock icon
- **AND** the card has a "Contacter le service commercial" CTA (i18n key `modules.contactSales`)

### Scenario: sections group by category
- **GIVEN** the catalog contains modules across categories `core`, `analytics`, `hr`, `accounting`
- **WHEN** the hub page renders
- **THEN** there is one section header per distinct category that has at least one module visible
- **AND** sections are ordered by the min `display_order` of the modules they contain

### Scenario: role gating via CASL still applies
- **GIVEN** the user's role is `day_laborer`
- **AND** `day_laborer` cannot read subject `Invoice`
- **WHEN** the hub page renders
- **THEN** the ModuleCard for `accounting` is rendered but in disabled state (clicking does not navigate)
- **AND** the card shows a role badge indicating required role
