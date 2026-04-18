# Spec: Multi-tenancy fixes in getParcelProfitability

## Capability

All queries in `getParcelProfitability()` must filter by `organization_id`.

## Scenarios

### S1: Costs query filters by organization_id

**GIVEN** a parcel with costs belonging to org A
**WHEN** `getParcelProfitability()` is called with org B's organizationId
**THEN** no costs from org A are returned

### S2: Revenues query filters by organization_id

**GIVEN** a parcel with revenues belonging to org A
**WHEN** `getParcelProfitability()` is called with org B's organizationId
**THEN** no revenues from org A are returned

### S3: Journal items expense query filters by organization_id

**GIVEN** journal entries with expense items for a parcel in org A
**WHEN** `getParcelProfitability()` is called with org B's organizationId
**THEN** no expense journal items from org A are returned

### S4: Journal items revenue query filters by organization_id

**GIVEN** journal entries with revenue items for a parcel in org A
**WHEN** `getParcelProfitability()` is called with org B's organizationId
**THEN** no revenue journal items from org A are returned

### S5: Work records query filters by organization_id

**GIVEN** work records linked to tasks on a parcel in org A
**WHEN** `getParcelProfitability()` is called with org B's organizationId
**THEN** no work records from org A are returned
