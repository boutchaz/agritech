# Spec: Calibration State Machine

## Capability: Update parcel lifecycle and calibration states to V2

### S1. Parcel state machine valid transitions
- **GIVEN** a parcel in state `awaiting_data`
- **WHEN** satellite + weather download completes
- **THEN** parcel transitions to `ready_calibration`

- **GIVEN** a parcel in state `ready_calibration`
- **WHEN** user starts calibration
- **THEN** parcel transitions to `calibrating`

- **GIVEN** a parcel in state `calibrating`
- **WHEN** calibration engine completes AND user validates
- **THEN** parcel transitions to `calibrated`

- **GIVEN** a parcel in state `calibrated`
- **WHEN** system presents nutrition option
- **THEN** parcel transitions to `awaiting_nutrition_option`

- **GIVEN** a parcel in state `awaiting_nutrition_option`
- **WHEN** user confirms A/B/C
- **THEN** parcel transitions to `active`

### S2. Recalibration loop from active
- **GIVEN** a parcel in state `active`
- **WHEN** a partial (F2) or annual (F3) recalibration is triggered
- **THEN** parcel transitions to `calibrating`
- **AND** after completion returns through `calibrated → awaiting_nutrition_option → active`

### S3. Invalid transitions rejected
- **GIVEN** a parcel in state `awaiting_data`
- **WHEN** a transition to `active` is attempted
- **THEN** a BadRequestException is thrown

### S4. Calibration record status transitions
- **GIVEN** a calibration record with status `in_progress`
- **WHEN** the engine completes successfully
- **THEN** status transitions to `awaiting_validation`

- **GIVEN** a calibration record with status `awaiting_validation`
- **WHEN** user validates
- **THEN** status transitions to `validated`

- **GIVEN** a calibration record with confidence < 25%
- **WHEN** engine completes
- **THEN** status is set to `insufficient`

### S5. Phase age detection
- **GIVEN** a parcel with `planting_year` and culture referentiel loaded
- **WHEN** calibration starts
- **THEN** `phase_age` is determined from referentiel `systemes[system].entree_production_annee` and `pleine_production_annee`
- **AND** it is one of: `juvenile`, `entree_production`, `pleine_production`, `senescence`

### S6. Boundary change resets to awaiting_data
- **GIVEN** a parcel in any state except `awaiting_data`
- **WHEN** the parcel boundary (AOI) is changed
- **THEN** parcel resets to `awaiting_data`
