# Spec: Frontend Adaptation

## Capability: Update frontend types, hooks, and components for V2 data shapes

### S1. Database types regenerated and compile
- **GIVEN** the schema has been rewritten and `db:generate-types` run
- **WHEN** `tsc --noEmit` is run on the frontend project
- **THEN** no type errors related to AI/calibration tables

### S2. Parcel ai_phase uses V2 states
- **GIVEN** the `AIStatusBadge` component
- **WHEN** it receives a parcel with `ai_phase = 'ready_calibration'`
- **THEN** it renders the appropriate badge (not "unknown" or error)
- **AND** all V2 states are handled: `awaiting_data`, `ready_calibration`, `calibrating`, `calibrated`, `awaiting_nutrition_option`, `active`, `archived`

### S3. Calibration hooks consume V2 response shape
- **GIVEN** the calibration service returns V2 output (with `phase_age`, `mode_calibrage` V2 values, `diagnostic_data`, `baseline_data`)
- **WHEN** `useCalibrationV2` hook processes the response
- **THEN** it correctly maps the data without runtime errors

### S4. Calibration review displays V2 data
- **GIVEN** a completed V2 calibration with `phase_age`, health score breakdown, and `message_amelioration`
- **WHEN** the calibration review page renders
- **THEN** it shows phase age, health score components, and dynamic improvement messages

### S5. Recommendation list shows 6-bloc structure
- **GIVEN** recommendations with `bloc_1_constat` through `bloc_6_suivi`
- **WHEN** the recommendation detail is displayed
- **THEN** all 6 blocs are rendered with their respective content
- **AND** the `mention_responsabilite` disclaimer is shown
