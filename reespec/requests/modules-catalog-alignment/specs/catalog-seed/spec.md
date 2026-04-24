# Spec — Catalog Seed

## GIVEN a fresh database migration

### Scenario: 11 module rows are seeded
- **GIVEN** the migration `20260424000000_align_modules_catalog.sql` has run
- **WHEN** I query `SELECT slug FROM modules WHERE is_available = true ORDER BY slug`
- **THEN** I get exactly these 12 slugs (alphabetical): `accounting, agromind_advisor, chat_advisor, compliance, core, fruit_trees, marketplace, personnel, production, sales_purchasing, satellite, stock`

### Scenario: core is marked required
- **GIVEN** the migration has run
- **WHEN** I query `SELECT is_required FROM modules WHERE slug = 'core'`
- **THEN** `is_required = true`

### Scenario: all other modules are not required
- **GIVEN** the migration has run
- **WHEN** I query `SELECT slug FROM modules WHERE is_required = false AND is_available = true`
- **THEN** the result contains 11 rows and does NOT contain `core`

### Scenario: core has canonical navigation items
- **GIVEN** the migration has run
- **WHEN** I query `SELECT navigation_items FROM modules WHERE slug = 'core'`
- **THEN** the JSONB array contains at least `/dashboard`, `/farm-hierarchy`, `/parcels`, `/settings`, `/notifications`

### Scenario: agromind_advisor owns the AI sub-path
- **GIVEN** the migration has run
- **WHEN** I query `SELECT navigation_items FROM modules WHERE slug = 'agromind_advisor'`
- **THEN** the JSONB array contains `/parcels/:id/ai` (path template form, with parameter placeholder)

### Scenario: translations are seeded for fr/en/ar
- **GIVEN** the migration has run
- **WHEN** I query `SELECT locale, COUNT(*) FROM module_translations GROUP BY locale`
- **THEN** `fr`, `en`, `ar` each have 12 rows (one per module)

### Scenario: core module translation has expected name
- **GIVEN** the migration has run
- **WHEN** I query `SELECT name FROM module_translations WHERE locale='fr' AND module_id = (SELECT id FROM modules WHERE slug='core')`
- **THEN** `name` is `'Cœur'` (or an agreed French label — set in seed)

## GIVEN the seed is re-run

### Scenario: idempotent re-run does not duplicate rows
- **GIVEN** the migration has already run once
- **WHEN** I run the migration SQL a second time
- **THEN** `SELECT COUNT(*) FROM modules WHERE is_available = true` still returns 12
- **AND** `SELECT COUNT(*) FROM module_translations` is unchanged
