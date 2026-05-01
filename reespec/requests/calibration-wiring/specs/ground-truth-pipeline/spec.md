# Spec: Ground-Truth Pipeline Integration

## Capability 1: Harvest History Persistence

### Scenario: Wizard harvest records are saved to harvest_records table

- **GIVEN** a wizard form with 3 harvest rows: [{year: 2023, yield_value: 4.2, unit: "t_ha"}, {year: 2024, yield_value: 3.8, unit: "t_ha"}, {year: 2025, yield_value: 5.1, unit: "t_ha"}]
- **WHEN** the user clicks "Launch Calibration"
- **THEN** 3 rows are created in `harvest_records` table for the parcel with harvest dates derived from year, quantities from yield_value, and source noted as calibration_wizard
- **AND** the subsequent `fetchHarvestRecords()` in calibration.service.ts returns these rows
- **AND** they flow through to `calibrationInput.harvest_records` in the FastAPI pipeline

### Scenario: Existing harvest records are not duplicated

- **GIVEN** a parcel with existing harvest_records for 2023 and 2024
- **WHEN** wizard submits harvest data for 2023, 2024, 2025
- **THEN** only the 2025 record is created (matching years are updated, not duplicated)

## Capability 2: Confidence Scoring with Analysis Content

### Scenario: Soil analysis content boosts confidence

- **GIVEN** a calibration with a soil analysis containing pH=7.2, EC=1.8, organic_matter=2.5%, N=45, P=32, K=280 (all 6 required fields)
- **WHEN** confidence is calculated
- **THEN** soil component scores 20/20 (full completeness, recent date)
- **AND** total confidence is higher than the same parcel without soil analysis data

### Scenario: Partial soil analysis gives partial score

- **GIVEN** a calibration with a soil analysis containing only pH=7.2, EC=1.8
- **WHEN** confidence is calculated
- **THEN** soil component scores between 0 and 20 (partial completeness)

### Scenario: Foliar analysis adds new confidence component

- **GIVEN** a calibration with a foliar analysis containing N, P, K values
- **WHEN** confidence is calculated
- **THEN** a "foliar" component exists with score > 0 and max_score = 5

### Scenario: Cultural history boosts profile score

- **GIVEN** a calibration with cultural_history containing pruning_type, past_fertilization, stress_events
- **WHEN** confidence is calculated
- **THEN** profile component score is higher than without cultural history

## Capability 3: Health Score Ground-Truth Adjustment

### Scenario: Good soil data adjusts nutritional score upward

- **GIVEN** satellite-derived nutritional score of 60
- **AND** soil analysis with pH=6.8, organic_matter=3.2%, balanced NPK
- **WHEN** health score is calculated
- **THEN** nutritional component is adjusted upward by up to +20% (max 72)
- **AND** total health score is higher than satellite-only

### Scenario: Poor soil data adjusts nutritional score downward

- **GIVEN** satellite-derived nutritional score of 60
- **AND** soil analysis with pH=8.8, EC=5.2, organic_matter=0.5%
- **WHEN** health score is calculated
- **THEN** nutritional component is adjusted downward by up to -20% (min 48)

### Scenario: Water quality adjusts hydric score

- **GIVEN** satellite-derived hydric score of 70
- **AND** water analysis with SAR=8.5, chloride=15meq
- **WHEN** health score is calculated
- **THEN** hydric component is adjusted downward (high SAR = poor infiltration)

### Scenario: No ground-truth data leaves scores unchanged

- **GIVEN** satellite-derived nutritional score of 60
- **AND** no soil analysis data
- **WHEN** health score is calculated
- **THEN** nutritional component remains exactly 60 (backward compatible)

## Capability 4: Yield Potential with Harvest Regularity

### Scenario: Harvest regularity "marked_alternance" widens yield range

- **GIVEN** reference yield range 3-6 T/ha
- **AND** harvest_regularity = "marked_alternance"
- **WHEN** yield potential is calculated
- **THEN** yield range is wider than reference (e.g., 2-7 T/ha) reflecting alternance uncertainty

### Scenario: Harvest regularity "stable" narrows yield range

- **GIVEN** reference yield range 3-6 T/ha
- **AND** harvest_regularity = "stable"
- **WHEN** yield potential is calculated
- **THEN** yield range may be narrower (e.g., 3.5-5.5 T/ha) reflecting stability

### Scenario: Actual harvest history overrides reference range

- **GIVEN** reference yield range 3-6 T/ha
- **AND** 3 years of harvest records: [4.2, 3.8, 5.1] T/ha
- **WHEN** yield potential is calculated
- **THEN** historical average (4.37) is factored into the range
- **AND** method becomes "reference_and_history"

## Capability 5: Ground-Truth Recommendations

### Scenario: High pH soil generates soil-specific recommendation

- **GIVEN** soil analysis with pH=8.5
- **WHEN** recommendations are generated
- **THEN** a recommendation of type "soil_nutrition" is present
- **AND** message references the specific pH value and suggests corrective action

### Scenario: High SAR water generates water quality recommendation

- **GIVEN** water analysis with SAR=7.2
- **WHEN** recommendations are generated
- **THEN** a recommendation of type "water_quality" is present

### Scenario: No pruning generates cultural practice recommendation

- **GIVEN** cultural_history with pruning_type = null (never pruned)
- **AND** maturity_phase indicating mature trees
- **WHEN** recommendations are generated
- **THEN** a recommendation of type "cultural_practice" mentions pruning

### Scenario: Foliar nitrogen deficiency generates deficiency recommendation

- **GIVEN** foliar analysis with nitrogen_percentage = 1.2 (below threshold)
- **WHEN** recommendations are generated
- **THEN** a recommendation of type "foliar_deficiency" is present

### Scenario: No ground-truth data produces only satellite-based recs (backward compatible)

- **GIVEN** no soil, water, foliar, or cultural history data
- **WHEN** recommendations are generated
- **THEN** recommendations are identical to current output

## Capability 6: AI Report Enrichment

### Scenario: Ground-truth context enriches AI narrative

- **GIVEN** a calibration with soil pH=8.2, water SAR=6, harvest_regularity="marked_alternance"
- **WHEN** generateCalibrationSummary() is called
- **THEN** the blockA data includes a ground_truth_context section
- **AND** the AI narrative references specific ground-truth values

### Scenario: No ground-truth data produces unchanged narrative

- **GIVEN** a calibration with no analyses and no cultural history
- **WHEN** generateCalibrationSummary() is called
- **THEN** blockA data is identical to current format (no ground_truth_context)
