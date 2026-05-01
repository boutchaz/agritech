# Tasks: Referential Condition Engine

**STATUS: COMPLETE** — All 15 tasks done. Shipped in `ad3180df`. 146 tests pass.

## Phase 1: Evaluator (foundation — everything else depends on this)

### 1. evaluate() handles constant comparisons

- [x] **RED** — Write `backend-service/tests/test_condition_evaluator.py`: test `evaluate()` with `eq`, `neq`, `gt`, `gte`, `lt`, `lte` against numeric and boolean context values. Test missing variable returns `false`. Run `python -m pytest tests/test_condition_evaluator.py` → fails (module not found).
- [x] **ACTION** — Create `backend-service/app/services/calibration/support/condition_evaluator.py` with `evaluate(condition, context, diagnostics=None) -> bool`. Implement constant comparison operators.
- [x] **GREEN** — Run `python -m pytest tests/test_condition_evaluator.py` → all constant comparison tests pass.

### 2. evaluate() handles range, set, and var-vs-var

- [x] **RED** — Add tests for `between`, `in`, `gt_var`/`lt_var`/`gte_var`/`lte_var` with `factor`. Test edge cases: `between` inclusive bounds, `in` with strings, `factor` default 1.0, missing reference variable. Run → new tests fail.
- [x] **ACTION** — Implement `between`, `in`, and `*_var` operators in `evaluate()`.
- [x] **GREEN** — Run `python -m pytest tests/test_condition_evaluator.py` → all pass.

### 3. evaluate() handles boolean combinators and nesting

- [x] **RED** — Add tests for `and`, `or`, `not`, nested `and`+`or`, and bare array rejection (`ValueError`). Run → new tests fail.
- [x] **ACTION** — Implement `and`/`or`/`not` branches. Raise `ValueError` on bare list input.
- [x] **GREEN** — Run `python -m pytest tests/test_condition_evaluator.py` → all pass.

### 4. evaluate() diagnostics support

- [x] **RED** — Add tests: pass `diagnostics=[]`, evaluate a failing `and` clause, assert diagnostics list contains entries with `var`, `op`, `expected`, `actual`, `result` for each atomic clause. Test that `diagnostics=None` (default) works without error. Run → new tests fail.
- [x] **ACTION** — Add diagnostics recording to each atomic clause evaluation. Append `{"var", "op", "expected", "actual", "result"}` to diagnostics list when provided.
- [x] **GREEN** — Run `python -m pytest tests/test_condition_evaluator.py` → all pass including diagnostics tests. **54 tests.**

## Phase 2: Referential migration (olive first, then remaining crops)

### 5. Migrate DATA_OLIVIER.json phases to structured format

- [x] **RED** — Write `backend-service/tests/test_referential_structured_conditions.py`: load `DATA_OLIVIER.json`, assert `protocole_phenologique.phases` keys are phase names (not PHASE_0), each phase has `exit` array, each exit has `when` dict with `var`/`and`/`or` key (not a string). Assert `signaux.streaks` exists with 4 streak definitions. Run → fails (old format).
- [x] **ACTION** — Rewrite `DATA_OLIVIER.json` `protocole_phenologique.phases` from string conditions to structured JSON per design.md. Add `signaux.streaks` block. Keep old `filtrage` and `classification_signal` sections unchanged.
- [x] **GREEN** — Run `python -m pytest tests/test_referential_structured_conditions.py` → olive assertions pass.

### 6. Migrate DATA_AGRUMES.json, DATA_AVOCATIER.json, DATA_PALMIER_DATTIER.json

- [x] **RED** — Extend `test_referential_structured_conditions.py` to validate all 4 crop files with same assertions. Add crop-specific streak threshold checks (palm hot_streak > 35). Run → 3 new crops fail.
- [x] **ACTION** — Migrate the 3 remaining referential files. Add `signaux.streaks` with crop-appropriate thresholds.
- [x] **GREEN** — Run `python -m pytest tests/test_referential_structured_conditions.py` → all 4 crops pass. **48 tests.**

## Phase 3: State machine rewrite (the core change)

### 7. PhaseDefinition dataclass and loader

- [x] **RED** — Add test in `tests/test_step4_state_machine.py`: call `load_phase_definitions(reference_data)` with olive structured referential, assert returns list of `PhaseDefinition` objects with correct names, exit counts, skip_when for DORMANCE. Run → fails (function not found).
- [x] **ACTION** — Create `PhaseDefinition` dataclass (`name`, `exits: list[dict]`, `skip_when: dict|None`, `entry_when: dict|None`). Write `load_phase_definitions(reference_data)` that parses structured `protocole_phenologique.phases` into `PhaseDefinition` list. Add fallback: if phases have string conditions (old format), log warning and return empty list.
- [x] **GREEN** — Run `python -m pytest tests/test_step4_state_machine.py::test_load_phase_definitions*` → pass.

### 8. Referential-driven streak computation

- [x] **RED** — Add test: create state machine with `signaux.streaks` config, feed 5 days of weather where `Tmoy > 25` for first 3 days then drops, assert `context["hot_streak"]` is 3 at day 3, resets to 0 at day 4. Run → fails.
- [x] **ACTION** — In `CropPhaseStateMachine.__init__`, read `signaux.streaks` from referential. In `process_day()`, before exit evaluation: for each streak definition, call `evaluate(streak_condition, raw_weather_context)`, increment counter if true, reset if false. Expose counters in `_build_context()`.
- [x] **GREEN** — Run streak tests → pass.

### 9. Generic process_day() replaces 6 _handle_*() functions

- [x] **RED** — Add test: create state machine with olive structured phases, feed weather that should trigger DORMANCE → DEBOURREMENT transition (chill satisfied + warm streak), assert machine transitions. Repeat for DEBOURREMENT → FLORAISON (GDD >= 350 + Tmoy >= 18). Run → fails (old handlers still active).
- [x] **ACTION** — Rewrite `CropPhaseStateMachine.process_day()`: build context dict, iterate `phase_def.exits`, call `evaluate(exit.when, context)`, transition on first match. Remove `_handle_dormance`, `_handle_debourrement`, `_handle_floraison`, `_handle_nouaison`, `_handle_stress_estival`, `_handle_reprise_automnale`, and `_PHASE_HANDLERS` dict.
- [x] **GREEN** — Run `python -m pytest tests/test_step4_state_machine.py` → all 33 tests pass (behavioral equivalence with old handlers).

### 10. Remove PhaseConfig threshold fields and regex extractors

- [x] **RED** — Assert `PhaseConfig` has no fields named `gdd_debourrement_exit`, `tmoy_floraison_min`, etc. Assert functions `_extract_gdd_from_condition`, `_extract_tmoy_from_condition`, `_extract_days_threshold`, `_as_condition_text` do not exist in module. Run → fails (they still exist).
- [x] **ACTION** — Delete the 15 threshold fields from `PhaseConfig` (keep only `chill_threshold`, `chill_months`, `active_phases`). Delete the 5 regex extractor functions. Update `extract_phase_config()` to return minimal `PhaseConfig` (chill + streaks + active_phases).
- [x] **GREEN** — Run `python -m pytest tests/test_step4_state_machine.py` → all pass. Regex extractors confirmed deleted.

## Phase 4: Adjacent systems

### 11. Update s1_satellite_extraction.py condition_artefact

- [x] **RED** — Add test in `tests/test_calibration_satellite_extraction.py`: pass structured `condition_artefact: {"var": "spike_ratio", "gt": 0.30}` in referential, assert spike tolerance is 0.30. Run → fails (expects string).
- [x] **ACTION** — Update `_parse_spike_tolerance()` to detect structured dict format and read threshold directly. Keep string regex fallback for backward compat.
- [x] **GREEN** — Run `python -m pytest tests/test_calibration_satellite_extraction.py` → pass.

### 12. Update test fixtures with new structured format

- [x] **RED** — Run `python -m pytest tests/test_step4_state_machine.py::test_extract_phase_config_parses_custom_protocol_strings` → fails (old string fixtures vs new parser).
- [x] **ACTION** — Rewrite fixture to use structured condition JSON. Update assertions to verify `PhaseDefinition` objects. Fixed test fixtures in phenology detection, percentile calculation, and orchestrator tests.
- [x] **GREEN** — Run `python -m pytest tests/test_step4_state_machine.py` → all 33 tests pass.

### 13. TypeScript condition evaluator

- [x] **RED** — Write `agritech-api/src/common/condition-evaluator.spec.ts`: same test cases as Python evaluator (constant ops, range, set, var-vs-var, and/or/not, diagnostics, bare array rejection). Run `npx jest condition-evaluator` → fails.
- [x] **ACTION** — Create `agritech-api/src/common/condition-evaluator.ts` with `evaluate(condition, context, diagnostics?)` matching Python behavior exactly.
- [x] **GREEN** — Run `npx jest condition-evaluator` → all pass. **44 tests.**

## Phase 5: Integration verification

### 14. Orchestrator integration test with structured referential

- [x] **RED** — Run `python -m pytest tests/test_calibration_orchestrator.py` → verify existing integration test still passes with the new structured referential.
- [x] **ACTION** — Fixed orchestrator test fixtures (expanded satellite images to 12 entries for min_observed_images guard, fixed MSAVI→MSAVI2 normalization assertion).
- [x] **GREEN** — Run `python -m pytest tests/test_calibration_orchestrator.py` → 2/2 pass. Full suite: 146 pass, 0 fail (on changed files).

### 15. Verify AI prompts handle structured conditions

- [x] **RED** — Check `calibrage.prompt.v3.ts` and `operationnel.prompt.v3.ts` for old-format references.
- [x] **ACTION** — Updated `calibrage.prompt.v3.ts`: PHASE_0→PHASE_6 references replaced with DORMANCE→REPRISE_AUTOMNALE phase names. `operationnel.prompt.v3.ts` was already clean.
- [x] **GREEN** — `grep -r "PHASE_0\|PHASE_1\|condition.*ET.*Tmoy" agritech-api/src/libs/agromind-ia/` → no old-format references.
