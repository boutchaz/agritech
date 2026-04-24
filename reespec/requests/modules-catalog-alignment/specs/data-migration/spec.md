# Spec — Data Migration (organization_modules)

## GIVEN an existing org with old-schema organization_modules rows

### Scenario: old quotes + sales_orders rows collapse into sales_purchasing
- **GIVEN** org `O1` has `organization_modules` rows with `is_active=true` pointing to old modules `quotes` and `sales_orders`
- **WHEN** the migration runs
- **THEN** org `O1` has exactly one `organization_modules` row with `is_active=true` pointing to the new module `sales_purchasing`
- **AND** the old rows pointing to `quotes`/`sales_orders` module ids are gone

### Scenario: old harvests row maps to production
- **GIVEN** org `O2` has `organization_modules` row with `is_active=true` pointing to old module `harvests`
- **WHEN** the migration runs
- **THEN** org `O2` has an `organization_modules` row with `is_active=true` pointing to new module `production`

### Scenario: inactive old rows are not forced active
- **GIVEN** org `O3` has `organization_modules` row with `is_active=false` pointing to old module `reports`
- **AND** org `O3` has no row pointing to `invoices`
- **WHEN** the migration runs
- **THEN** org `O3` has an `organization_modules` row pointing to new module `accounting` with `is_active=false`

### Scenario: if mixed — any true wins
- **GIVEN** org `O4` has two rows — `customers` (is_active=true) and `purchase_orders` (is_active=false) — both mapping to `sales_purchasing`
- **WHEN** the migration runs
- **THEN** org `O4` has one `organization_modules` row pointing to `sales_purchasing` with `is_active=true`

## GIVEN every org after migration

### Scenario: every org has core active
- **GIVEN** the migration has run
- **WHEN** I query `SELECT COUNT(*) FROM organizations o WHERE NOT EXISTS (SELECT 1 FROM organization_modules om JOIN modules m ON m.id = om.module_id WHERE om.organization_id = o.id AND m.slug = 'core' AND om.is_active = true)`
- **THEN** the count is `0`

### Scenario: orphan old module rows are cleaned up
- **GIVEN** the migration has run
- **WHEN** I query `SELECT COUNT(*) FROM modules WHERE slug NOT IN ('core','chat_advisor','agromind_advisor','satellite','personnel','stock','production','fruit_trees','compliance','sales_purchasing','accounting','marketplace')`
- **THEN** the count is `0`

## GIVEN a new organization created post-migration

### Scenario: new org has only required modules enabled
- **GIVEN** the migration has run
- **WHEN** a new organization is inserted via `OrganizationsService.createOrganization()`
- **THEN** the org has exactly one `organization_modules` row with `is_active=true` pointing to `core`
- **AND** the org has zero rows with `is_active=true` for any other module
