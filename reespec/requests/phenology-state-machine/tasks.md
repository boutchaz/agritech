# Phenology State Machine — Tasks

## Phase 1: Extract and scaffold

### 1. Move current step4 to legacy module

- [ ] **RED** — Check: `backend-service/app/services/calibration/step4_legacy.py` does not exist. `step4_phenology_detection.py` contains `_find_constrained_stages_for_year` and `_fallback_stages`.
- [ ] **ACTION** — Move all current curve-fitting functions from `step4_phenology_detection.py` into `step4_legacy.py`. Export a single `detect_phenology_legacy(...)` function with the same signature. Keep `step4_phenology_detection.py` as the entry point that imports and delegates.
- [ ] **GREEN** — Verify: `step4_legacy.py` exists with `detect_phenology_legacy`. Running `python3 -m pytest tests/test_gdd_service.py tests/test_calibration_weather_extraction.py` still passes. Orchestrator still calls `detect_phenology` from `step4_phenology_detection.py` unchanged.

### 2. Define phase types and extended Step4Output

- [ ] **RED** — Write `tests/test_step4_state_machine.py`: import `OlivePhase`, `PhaseTransition`, `SeasonTimeline` from `app.services.calibration.step4_state_machine`. Assert `OlivePhase.DORMANCE.value == "DORMANCE"` and `OlivePhase.FLORAISON.value == "FLORAISON"`. Run → ImportError (module doesn't exist).
- [ ] **ACTION** — Create `step4_state_machine.py` with: `OlivePhase` enum (DORMANCE, DEBOURREMENT, FLORAISON, NOUAISON, STRESS_ESTIVAL, REPRISE_AUTOMNALE), `PhaseTransition` dataclass (phase, start_date, end_date, gdd_at_entry, confidence), `SeasonTimeline` dataclass (year, transitions, mode). Add `phase_timeline` optional field to `Step4Output` in `types.py`.
- [ ] **GREEN** — Run `python3 -m pytest tests/test_step4_state_machine.py` → passes.

## Phase 2: Core state machine

### 3. Implement daily signal computation

- [ ] **RED** — In `tests/test_step4_state_machine.py`: add test `test_compute_daily_signals`. Given a weather day (Tmax=25, Tmin=10, precip=0) and NIRv points, assert `GDD_jour == 10.25`, `Tmoy == 17.5`, `Precip_30j` computed correctly. Run → fails (function not implemented).
- [ ] **ACTION** — Implement `_compute_daily_signals(weather_day, satellite_lookup, weather_history_30d) -> DailySignals` in `step4_state_machine.py`. Computes GDD_jour, Tmoy, Precip_30j, Tmax_30j_pct, dNIRv_dt, dNDVI_dt per the referential's `calculs_preliminaires`.
- [ ] **GREEN** — Run test → passes.

### 4. Implement PHASE_0 (DORMANCE) entry and exit

- [ ] **RED** — Add test `test_dormancy_exit_on_warm_streak`. Given 30 days of cold weather (Tmoy < 8) then 12 days of warm weather (Tmoy > 12, where Tmoy_Q25=10), assert the machine transitions from PHASE_0 to PHASE_1 on day 40 (10 consecutive warm days after chill satisfied). Run → fails.
- [ ] **ACTION** — Implement `OlivePhaseStateMachine` class with `process_day(date, signals)` method. Implement PHASE_0 logic: chill accumulation, warm-streak detection (≥ 10 days Tmoy > Tmoy_Q25), transition to PHASE_1 with GDD reset.
- [ ] **GREEN** — Run test → passes.

### 5. Implement warm climate skip (Tmoy_Q25 ≥ 15)

- [ ] **RED** — Add test `test_warm_climate_skips_dormancy`. Given Tmoy_Q25=16, assert machine starts at PHASE_1, never enters PHASE_0. Run → fails.
- [ ] **ACTION** — Add warm-climate check in `OlivePhaseStateMachine.__init__`: if `Tmoy_Q25 >= 15`, set initial state to PHASE_1 and skip chill tracking.
- [ ] **GREEN** — Run test → passes.

### 6. Implement variety-specific chill thresholds

- [ ] **RED** — Add test `test_arbequina_chill_threshold_200`. Given variety="Arbequina" and referential with `seuils_chill_units_par_variete.Arbequina=[200,400]`, assert chill threshold is 200 (lower bound). Add test `test_picholine_chill_threshold_100` for Picholine Marocaine with threshold 100. Run → fails.
- [ ] **ACTION** — Extract chill threshold from `reference_data["gdd"]["seuils_chill_units_par_variete"][variety]` using lower bound. Fall back to 150 if variety not found.
- [ ] **GREEN** — Run tests → pass.

### 7. Implement PHASE_1→2 (DEBOURREMENT→FLORAISON) transition

- [ ] **RED** — Add test `test_debourrement_to_floraison_at_gdd_350`. Given machine in PHASE_1, feed days until GDD_cumul reaches 350 with Tmoy≥18. Assert transition to PHASE_2 occurs at the correct date. Run → fails.
- [ ] **ACTION** — Implement PHASE_1 exit condition: `GDD_cumul >= 350 AND Tmoy >= 18`.
- [ ] **GREEN** — Run test → passes.

### 8. Implement PHASE_2→3 (FLORAISON→NOUAISON) transition

- [ ] **RED** — Add test `test_floraison_to_nouaison_at_gdd_700`. Given machine in PHASE_2, feed days until GDD_cumul > 700. Assert transition to PHASE_3. Also test early exit when Tmoy > 25 sustained. Run → fails.
- [ ] **ACTION** — Implement PHASE_2 exit: `GDD_cumul > 700 OR Tmoy > 25 sustained (≥ 5 days)`.
- [ ] **GREEN** — Run test → passes.

### 9. Implement PHASE_3→4 (NOUAISON→STRESS_ESTIVAL) transition

- [ ] **RED** — Add test `test_nouaison_to_stress_estival`. Given machine in PHASE_3, feed days with Tmax > 30 and dry conditions (Precip_30j < 5). Assert transition to PHASE_4. Run → fails.
- [ ] **ACTION** — Implement PHASE_3 exit: dry + hot conditions.
- [ ] **GREEN** — Run test → passes.

### 10. Implement PHASE_4→6 and PHASE_6→0 transitions

- [ ] **RED** — Add test `test_stress_to_reprise_on_rain`. Given machine in PHASE_4, feed a rain event (Precip > 20) with Tmoy < 25 and dNIRv_dt > 0. Assert transition to PHASE_6. Then feed cold days (Tmoy < Tmoy_Q25). Assert transition back to PHASE_0. Run → fails.
- [ ] **ACTION** — Implement PHASE_4 exits (→ PHASE_6 on rain+cooling, → PHASE_0 on winter arrival). Implement PHASE_6 exit (→ PHASE_0 on sustained cold).
- [ ] **GREEN** — Run test → passes.

## Phase 3: Integration

### 11. Implement full-season run and SeasonTimeline output

- [ ] **RED** — Add test `test_full_season_produces_timeline`. Given a realistic 12-month dataset for a Moroccan olive parcel (cold winter, warm spring, hot summer, autumn rain), run the state machine. Assert it produces a SeasonTimeline with ≥ 4 phase transitions, each with valid dates and GDD values. Run → fails.
- [ ] **ACTION** — Implement `run_olive_state_machine(satellite_data, weather_data, variety, reference_data) -> list[SeasonTimeline]` that groups data by cycle year, runs the state machine per year, and returns timelines.
- [ ] **GREEN** — Run test → passes.

### 12. Map SeasonTimeline to Step4Output

- [ ] **RED** — Add test `test_timeline_maps_to_step4output`. Given a SeasonTimeline with all 6 phases, assert the mapped Step4Output has valid PhenologyDates (dormancy_exit, plateau_start, peak, decline_start, dormancy_entry) with reasonable date gaps (≥ 14 days between exit and peak). Run → fails.
- [ ] **ACTION** — Implement `_map_timeline_to_step4output(timelines) -> Step4Output` that maps phase transitions to PhenologyDates fields, computes mean_dates, variability, and GDD correlation.
- [ ] **GREEN** — Run test → passes.

### 13. Wire into detect_phenology dispatcher

- [ ] **RED** — Add test `test_detect_phenology_uses_state_machine_for_olive`. Call `detect_phenology(step1, step2, crop_type="olivier", reference_data=olive_ref)`. Assert the output has `phase_timeline` field populated (state machine ran). Add test `test_detect_phenology_uses_legacy_for_agrumes`. Call with crop_type="agrumes". Assert no `phase_timeline` (legacy path). Run → fails.
- [ ] **ACTION** — Update `detect_phenology` in `step4_phenology_detection.py`: if `reference_data` has `protocole_phenologique`, call `run_olive_state_machine`. Otherwise, call `detect_phenology_legacy`.
- [ ] **GREEN** — Run tests → pass. Run `python3 -m pytest tests/test_gdd_service.py tests/test_calibration_weather_extraction.py` → still pass (no regression).

### 14. Integration test with real parcel data shape

- [ ] **RED** — Add test `test_mejjat_parcel_shape`. Using data shaped like the mejjat parcel (568 NIRv points Apr 2024–Mar 2026, 1091 weather days, Arbequina, warm climate), run the full pipeline. Assert: 2026 cycle year is skipped (< 120 days), no yearly stage has exit-to-peak gap < 14 days, phase_timeline contains at least DEBOURREMENT and STRESS_ESTIVAL for 2025. Run → fails.
- [ ] **ACTION** — Debug and fix any edge cases in the state machine revealed by this realistic data shape.
- [ ] **GREEN** — Run test → passes. The state machine produces agronomically plausible phenology for the mejjat parcel data shape.
