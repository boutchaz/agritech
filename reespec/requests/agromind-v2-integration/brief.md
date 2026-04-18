# AgromindIA V2 Integration

## What

Replace the current AgromindIA engine architecture with the V2 spec — config-driven prompts, structured referentiel data (94KB olivier with 20 OLI-XX prescriptions, GDD model, co-occurrence matrix, phenological protocol), phase-age-aware calibration, recommendation governance with 8-state lifecycle, and deterministic annual plan assembly.

## Why

The current implementation has fundamental gaps vs the agronomist-authored specifications:
- Alert taxonomy has 6 OLI codes vs 20 required, with wrong mappings
- Confidence scoring doesn't match spec weights (Bloc A 25pts + Bloc B 75pts)
- No recommendation lifecycle (state machine, expiration, evaluation windows, frequency limits)
- Prompts hardcode agronomic rules instead of reading from referentiel JSON
- No phase-age awareness (juvenile/entrée_production/pleine_production/sénescence)
- No signal classification (SIGNAL_PUR/MIXTE_MODÉRÉ/DOMINÉ_ADVENTICES)
- Annual plan is AI-generated with interpretation latitude; spec requires deterministic assembly

## Goals

1. Rewrite DB schema tables for calibration/recommendations/plans to match V2 data model
2. Deploy V2 referentiel files (DATA_OLIVIER_v5 + MOTEUR_CONFIG.json) and update loader
3. Replace V1 prompts with V2 config-driven prompt builders
4. Implement recommendation governance (lifecycle state machine, 6-bloc structure, journal)
5. Add diagnostic session concept linking AI runs to individual recommendations
6. Update parcel lifecycle state machine to V2 states
7. Update frontend hooks/components to consume new data shapes

## Non-Goals

- No new frontend pages or UX redesign (adapt existing components to new data)
- No new cultures beyond what referentiel files already cover (olivier, agrumes, avocatier, palmier)
- No ML model training (data collection tables are for future use)
- No changes to the satellite service (backend-service/FastAPI) endpoints
- No changes to non-AI modules (accounting, stock, workforce, marketplace)

## Impact

- **Backend**: Major rewrite of calibration module, ai-reports prompts, recommendation service
- **Frontend**: Moderate — hooks and type updates, component data shape changes
- **DB**: Full schema rewrite of AI-related tables (preprod, no data migration needed)
- **Referentials**: Replace DATA_OLIVIER.json with v5, add MOTEUR_CONFIG.json
- **Tests**: All calibration/recommendation integration tests need rewrite
