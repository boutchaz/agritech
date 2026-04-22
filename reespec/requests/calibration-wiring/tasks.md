# Calibration Wizard → Pipeline Wiring — Tasks

Execution order matters. Each task is one RED→ACTION→GREEN cycle.

---

## Phase 1: Frontend — Harvest History Persistence

### 1. Save wizard harvest records to DB before launching calibration

- [ ] **RED** — Write test in `project/src/__tests__/calibrationWizard.test.tsx`: render CalibrationWizard with harvest data fixture (3 rows), trigger launchCalibration, assert that `harvestsApi.create` (or equivalent) was called 3 times with correct payload (year→harvest_date, yield_value→quantity, unit, quality_grade). Test fails — no harvest saving logic exists.
- [ ] **ACTION** — In `CalibrationWizard.tsx` `launchCalibration()`, before `startCalibration.mutateAsync()`, add harvest record creation: map `wizardValues.harvests[]` to `harvest_records` rows, create via `analysesApi` or a new `harvestsApi.create()`. Deduplicate against any existing records by year.
- [ ] **GREEN** — Run test → passes. Verify existing wizard flow still works (no regression in form submission).

### 2. Handle harvest record deduplication (update existing years)

- [ ] **RED** — Write test: given a parcel with existing `harvest_records` for 2023, submit wizard with harvests for 2023+2024+2025. Assert 2023 is updated (not duplicated) and 2024+2025 are created. Test fails — no upsert logic.
- [ ] **ACTION** — In the harvest saving logic, fetch existing records for the parcel first, then upsert by year (update matching, insert new).
- [ ] **GREEN** — Run test → passes. Verify total records = 3 (no duplicates).

---

## Phase 2: FastAPI — Confidence Scoring with Ground-Truth

### 3. Soil analysis content scoring (field completeness)

- [ ] **RED** — Write `backend-service/tests/test_confidence_ground_truth.py`: test that `calculate_confidence_score()` with `soil_fields` containing all 6 required fields scores 20, with 3 fields scores ~10, with empty dict scores 0. Test fails — current code only checks date, ignores fields.
- [ ] **ACTION** — In `confidence.py` `_soil_score()`: when `soil_fields` is non-empty, call `_analysis_completeness_score()` (already exists) with `SOIL_REQUIRED_FIELDS` and the actual field dict. Replace the current date-only logic: recent date + complete fields → 20, recent date + partial → 10, old date → 10 regardless of completeness, no date → 0.
- [ ] **GREEN** — Run `pytest tests/test_confidence_ground_truth.py` → passes.

### 4. Water analysis content scoring

- [ ] **RED** — Write test in same file: test that `_water_score()` with complete `water_fields` (all 5 required) scores 15, partial scores 8, empty scores 0. Test fails — current code only checks date.
- [ ] **ACTION** — In `confidence.py` `_water_score()`: use `_analysis_completeness_score()` with `WATER_REQUIRED_FIELDS` and the actual field dict. Same pattern as soil.
- [ ] **GREEN** — Run tests → passes.

### 5. Foliar analysis confidence component

- [ ] **RED** — Write test: test that `ConfidenceInput` with foliar analysis date + fields produces a "foliar" component with score > 0. Test fails — no foliar component exists.
- [ ] **ACTION** — Add `foliar_analysis_date` and `foliar_fields` to `ConfidenceInput`. Add `FOLIAR_REQUIRED_FIELDS = {"nitrogen_percentage", "phosphorus_percentage", "potassium_percentage"}`. Add `_foliar_score()` function (max 5 points). Add "foliar" to `calculate_confidence_score()` output. Update `_COMPONENT_MAX_SCORES` in orchestrator to include foliar (5.0). Update orchestrator to extract foliar analysis from `calibration_input.analyses` and pass to confidence.
- [ ] **GREEN** — Run tests → passes. Verify `normalized_score` adapts (total/115 vs total/110).

### 6. Cultural history boosts profile score

- [ ] **RED** — Write test: test that `_profile_score()` with cultural history (pruning_type, past_fertilization, stress_events) scores higher than without. Test fails — profile score only checks crop_type, variety, planting_year, planting_system, has_boundary.
- [ ] **ACTION** — In `confidence.py` `_profile_score()`: add +2.0 if `input_data.cultural_history` has pruning_type, +2.0 if past_fertilization, +2.0 if stress_events. Adjust max possible profile score from 10 to ~16 (or cap at 10). Wire cultural_history through `ConfidenceInput` (add field) and orchestrator.
- [ ] **GREEN** — Run tests → passes. Verify profile score range is bounded.

---

## Phase 3: FastAPI — Health Score Ground-Truth Adjustment

### 7. Soil/water analysis adjusts health score components

- [ ] **RED** — Write `backend-service/tests/test_health_score_ground_truth.py`: test that `calculate_health_score()` with good soil data (pH 6.8, OM 3%) produces a nutritional component higher than the satellite-only baseline. Test with poor soil (pH 8.8, EC 5) produces lower. Test fails — no analysis parameters accepted.
- [ ] **ACTION** — Add optional `soil_analysis`, `water_analysis`, `foliar_analysis` params to `calculate_health_score()`. Implement bounded adjustment factors: good soil → nutritional ×1.1–1.2, poor soil → nutritional ×0.8–0.9. High SAR water → hydric ×0.85. Adjustments are multiplicative on satellite-derived scores, bounded ±20%. Wire analyses through orchestrator to s8.
- [ ] **GREEN** — Run tests → passes. Assert adjustment is within [0.8, 1.2] bounds. Assert no-analysis case produces identical scores to current behavior.

---

## Phase 4: FastAPI — Yield Potential Enhancement

### 8. Harvest regularity adjusts yield range

- [ ] **RED** — Write test in `test_calibration_orchestrator.py` (or new file): test that `calculate_yield_potential()` with `harvest_regularity="marked_alternance"` produces a wider range than the same input without. Test with `"stable"` produces narrower range. Test fails — function ignores harvest_regularity.
- [ ] **ACTION** — Add `harvest_regularity` param to `calculate_yield_potential()`. When "marked_alternance": widen range by ±15%. When "very_irregular": widen by ±25%. When "stable": narrow by ±10%. Wire through orchestrator from `calibration_input.harvest_regularity`.
- [ ] **GREEN** — Run tests → passes. Verify backward compatibility (None → no adjustment).

---

## Phase 5: FastAPI — Ground-Truth Recommendations

### 9. Soil-aware recommendations

- [ ] **RED** — Write `backend-service/tests/test_recommendations_ground_truth.py`: test that `generate_recommendations()` with soil pH=8.8 produces a recommendation of type "soil_nutrition". Test fails — function doesn't accept soil data.
- [ ] **ACTION** — Add `soil_analysis`, `water_analysis`, `foliar_analysis`, `cultural_history`, `harvest_regularity` params to `generate_recommendations()`. Add `_soil_recommendations()`: high pH (>8.2) → alkalinity alert, low OM (<1%) → organic amendment, high EC (>4) → salinity risk. Wire through orchestrator.
- [ ] **GREEN** — Run tests → passes. Verify no soil data → zero soil recommendations (backward compatible).

### 10. Water quality recommendations

- [ ] **RED** — Write test: test that water analysis with SAR=7.5 produces a "water_quality" recommendation. Test fails.
- [ ] **ACTION** — Add `_water_recommendations()`: high SAR (>6) → infiltration risk, high chloride (>10meq) → toxicity risk, high EC (>3 dS/m) → salinity risk. Return water-specific recommendations.
- [ ] **GREEN** — Run tests → passes.

### 11. Cultural practice recommendations

- [ ] **RED** — Write test: test that cultural_history with no pruning and mature trees produces a "cultural_practice" recommendation. Test fails.
- [ ] **ACTION** — Add `_cultural_recommendations()`: no pruning on mature trees → pruning needed, no fertilization history → fertilization program needed, stress events present → resilience advice. Return cultural-specific recommendations.
- [ ] **GREEN** — Run tests → passes.

### 12. Foliar deficiency recommendations

- [ ] **RED** — Write test: test that foliar analysis with nitrogen=1.0% (below threshold) produces a "foliar_deficiency" recommendation. Test fails.
- [ ] **ACTION** — Add `_foliar_recommendations()`: N<1.5% → nitrogen deficiency, K<0.8% → potassium deficiency, Fe<50ppm → iron deficiency. Use crop-specific thresholds from reference_data where available, else generic defaults.
- [ ] **GREEN** — Run tests → passes.

---

## Phase 6: Orchestrator Wiring

### 13. Wire all ground-truth data through orchestrator

- [ ] **RED** — Write integration test: create a `CalibrationInput` with full cultural_history, harvest_regularity, and analyses (soil + water + foliar). Run `run_calibration_pipeline()`. Assert: (a) confidence > 5/10, (b) recommendations contain ground-truth types, (c) health score differs from satellite-only baseline. Test fails — orchestrator doesn't pass data to sub-steps.
- [ ] **ACTION** — In `orchestrator.py` `run_calibration_pipeline()`: extract foliar analysis from `calibration_input.analyses`, pass analyses content to confidence (with soil_fields, water_fields, foliar_fields), pass analyses to health score, pass cultural_history + harvest_regularity to yield potential and recommendations. Update all function calls.
- [ ] **GREEN** — Run `pytest tests/test_calibration_orchestrator.py` → passes. Verify the "same satellite, different ground-truth" scenario produces different outputs.

---

## Phase 7: NestJS — AI Report Enrichment

### 14. Enrich AI report prompt with ground-truth context

- [ ] **RED** — Write test in `agritech-api/src/modules/ai-reports/ai-reports.service.spec.ts`: call `generateCalibrationSummary()` with blockA containing `ground_truth_context: {soil: {pH: 8.2}, water: {SAR: 6}}`. Assert the AI prompt includes ground-truth data. Test fails — no ground_truth_context field.
- [ ] **ACTION** — In `calibration-review.adapter.ts`, build `ground_truth_context` from calibration output analyses and cultural_history. Add to blockA structure. In `ai-reports.service.ts`, append ground-truth summary to the data context sent to LLM.
- [ ] **GREEN** — Run tests → passes. Verify no ground-truth → unchanged prompt (backward compatible).

---

## Phase 8: End-to-End Verification

### 15. Integration test: same satellite, different ground-truth produces different output

- [ ] **RED** — Write test: create two calibration runs with identical satellite + weather fixtures but different ground-truth (one with complete soil/water/foliar/cultural data, one with none). Assert: different confidence scores, different health scores, different recommendation sets, different yield ranges. Test fails — both produce identical output.
- [ ] **ACTION** — All wiring from tasks 1-14 must be complete. If test still fails, identify and fix remaining gaps.
- [ ] **GREEN** — Run test → passes. The two calibrations produce meaningfully different results.
