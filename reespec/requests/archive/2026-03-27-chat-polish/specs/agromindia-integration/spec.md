# AgromindIA Integration — Spec

## Capability

The chat fetches computed intelligence from existing AgromindIA services (diagnostics, recommendations, referential, annual plan, calibration) and includes it in the AI prompt context.

### Scenario: Chat response uses diagnostics scenario for parcel health

**GIVEN** a parcel with a completed calibration and diagnostic scenario "B" (vegetation stress)
**WHEN** the user asks "how is parcelle azef doing?"
**THEN** the AI response references the diagnostic scenario and its indicators
**AND** does NOT reinvent an analysis from raw NDVI numbers

### Scenario: Chat response includes pending recommendations

**GIVEN** a parcel with 2 pending AI recommendations (irrigation high priority, fertilization medium)
**WHEN** the user asks "what should I do about parcelle azef?"
**THEN** the AI response presents the actual pending recommendations with their priority and actions
**AND** does NOT generate generic agronomic advice

### Scenario: Chat response references annual plan interventions

**GIVEN** a parcel with an active annual plan with upcoming interventions
**WHEN** the user asks "what's planned for parcelle azef?"
**THEN** the AI response lists upcoming and overdue interventions from the annual plan
**AND** includes intervention type, product, dose, and timing

### Scenario: Chat uses crop referential data for advice

**GIVEN** a parcel growing "olivier" with available NPK formulas and BBCH stages in the referential
**WHEN** the user asks about fertilization for that parcel
**THEN** the AI response uses the referential NPK formulas (not generic dosages)
**AND** references the current phenological stage from BBCH data

### Scenario: Chat includes calibration baseline context

**GIVEN** a parcel with a completed calibration (baseline NDVI 0.55, zone "normal")
**WHEN** the user asks about parcel health
**THEN** the AI can compare current indices against the calibration baseline
**AND** references the zone classification

### Scenario: AgromindIA context gracefully handles missing data

**GIVEN** a parcel with no calibration and no diagnostics
**WHEN** AgromindiaContextService fetches intelligence
**THEN** diagnostics and calibration return null
**AND** recommendations returns empty array
**AND** the chat still works with whatever data IS available

### Scenario: General queries fetch AgromindIA context for top parcels

**GIVEN** an organization with 5 parcels
**WHEN** the user asks "how are my crops doing?"
**THEN** AgromindIA context is fetched for up to 3 most recent parcels
**AND** the AI provides a cross-parcel summary using computed intelligence

### Scenario: Context router activates AgromindIA for relevant queries

**GIVEN** a query containing "recommendation", "diagnostic", "plan", "calibration", parcel names, or action phrases
**WHEN** the context router analyzes the query
**THEN** `contextNeeds.agromindiaIntel` is true
**AND** AgromindiaContextService is called during context building
