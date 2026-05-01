# Referential Condition Engine

## Problem

The crop referential JSON defines conditions as semi-structured French strings:

```
"GDD_cumul >= 350 ET Tmoy >= 18"
"Tmoy > Tmoy_Q25 durablement (≥ 10 jours consécutifs)"
"systeme IN ['intensif', 'super_intensif']"
```

These are parsed by 5 ad-hoc regex extractors in `s4_state_machine.py` that each
handle ONE variable. The boolean logic (`ET`, `OU`), temporal semantics (`pendant`,
`durablement`), and relational comparisons (`< Tmoy_Q25`) are discarded. Adding a
new condition format requires new Python code.

The referential should be the single source of truth for all condition logic. Today
it is documentation that Python partially scrapes. It should be executable.

## Goal

Replace natural-language condition strings in the referential with structured JSON
expressions that a generic evaluator can execute. One evaluator, any condition,
any consumer (phenology, alerts, feature gates, nutrition rules).

## Condition Schema

Atomic clause — compare a context variable against a value:
```json
{ "var": "GDD_cumul", "gte": 350 }
{ "var": "Tmoy", "lt_var": "Tmoy_Q25" }
{ "var": "systeme", "in": ["intensif", "super_intensif"] }
{ "var": "GDD_cumul", "between": [350, 700] }
{ "var": "NIRv_current", "lt_var": "NIRv_summer_mean", "factor": 0.6 }
```

Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `in`, `gt_var`,
`gte_var`, `lt_var`, `lte_var` (with optional `factor` multiplier).

Boolean combinators:
```json
{ "and": [ clause, clause, ... ] }
{ "or":  [ clause, clause, ... ] }
{ "not": clause }
```

Phase transition wrapper:
```json
{
  "target": "FLORAISON",
  "when": { "and": [
    { "var": "GDD_cumul", "gte": 350 },
    { "var": "Tmoy", "gte": 18 }
  ]},
  "confidence": "MODEREE"
}
```

## Architecture

```
┌───────────────────────────────────────┐
│        Referential JSON               │
│  conditions as structured JSON trees  │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  evaluate(condition, context) → bool │
│  ~50 lines. Walks JSON tree.         │
│  No regex. No crop-specific code.    │
│  Python + TypeScript implementations │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  context: dict[str, any]             │
│  Built by signal computer (daily)    │
│  + parcel context (static)           │
│  + calibration state (GDD, phase)    │
└──────────────────────────────────────┘
```

The evaluator is **stateless**. Temporal conditions (streaks, durations) are
pre-computed by the signal layer and exposed as simple variables in the context
(e.g., `warm_streak: 12` instead of "Tmoy > Q25 pendant 12 jours").

## Signal Vocabulary

Weather: `Tmoy`, `Tmax`, `Tmin`, `precip`, `precip_30j`, `tmax_30j_pct`,
`gdd_jour`, `GDD_cumul`

Vegetation: `NDVI`, `NIRv`, `d_nirv_dt`, `d_ndvi_dt`

Computed references: `Tmoy_Q25`, `NIRv_baseline`, `NIRv_summer_mean`,
`NIRv_summer_sigma`

State: `chill_cumul`, `chill_satisfied`, `current_phase`, `etat_signal`

Streaks: `warm_streak`, `cold_streak`, `hot_streak`, `hot_dry_streak`

Parcel context: `systeme`, `maturity_phase`, `crop_type`, `age`,
`historique_satellite`, `option_C`

## Use Cases (same evaluator, different context)

- **Phenology transitions**: condition_sortie.when evaluated daily against weather+satellite signals
- **Feature activation**: conditions_activation evaluated once against parcel context
- **Alert triggers**: seuil_entree evaluated against latest satellite values
- **Nutrition eligibility**: conditions_application evaluated against parcel + soil context
- **Phase skipping**: phases_par_maturite verified against maturity_phase

## Impact Map

### Critical (core logic)

| File | Change | Lines |
|------|--------|-------|
| `s4_state_machine.py` | Rewrite `extract_phase_config()` — read structured JSON instead of regex scraping | 283-467 |
| `s4_state_machine.py` | Delete 5 regex extractors (`_as_condition_text`, `_extract_threshold`, `_extract_gdd_from_condition`, `_extract_tmoy_from_condition`, `_extract_days_threshold`) | 236-265, 470-485 |
| `s4_state_machine.py` | Rewrite 6 `_handle_*()` phase functions — call `evaluate(condition, context)` instead of checking `cfg.*` fields | 547-653 |
| `s4_state_machine.py` | Replace `PhaseConfig` dataclass (15+ hardcoded threshold fields) with condition trees from referential | 185-234 |
| `DATA_OLIVIER.json` | Migrate all condition strings to structured JSON | protocole_phenologique.phases |
| `DATA_AGRUMES.json` | Same migration | protocole_phenologique.phases |
| `DATA_AVOCATIER.json` | Same migration | protocole_phenologique.phases |
| `DATA_PALMIER_DATTIER.json` | Same migration | protocole_phenologique.phases |
| `test_step4_state_machine.py` | Update hardcoded condition fixtures | 492-525 |

### Medium (adjacent systems)

| File | Change |
|------|--------|
| `s1_satellite_extraction.py` | Update `_parse_spike_tolerance()` to read structured condition_artefact |
| `alert-taxonomy.ts` | Align `AlertCondition` with shared schema (already close) |
| AI prompts (`calibrage.prompt.v3.ts`) | Verify structured JSON still works as LLM context |

### New files

| File | Purpose |
|------|---------|
| `condition_evaluator.py` | Python evaluator (~50 lines) + diagnostics support |
| `condition-evaluator.ts` | TypeScript mirror (~50 lines) |

### Additional referential changes

| File | Change |
|------|--------|
| `DATA_OLIVIER.json` | Add `signaux.streaks` block defining warm/cold/hot/hot_dry streak conditions |
| `DATA_AGRUMES.json` | Same — streak thresholds may differ per crop (e.g., citrus hot = Tmoy > 30) |
| `DATA_AVOCATIER.json` | Same |
| `DATA_PALMIER_DATTIER.json` | Same — date palm hot threshold is higher (Tmoy > 35) |

### Signal layer changes

| File | Change |
|------|--------|
| `s4_state_machine.py` | Extract streak tracking from handlers. Read `signaux.streaks` from referential. Call `evaluate()` per streak definition daily to increment/reset counters. Expose counters in context dict. |

### Unchanged

Frontend (no condition parsing), `crop-reference-loader.ts` (pass-through),
`calibration-data.service.ts`, `calibration-review.adapter.ts`, `referential_utils.py`

## Constraints

- Evaluator must be pure function: `(condition_json, context_dict) → bool`
- No crop-specific logic in evaluator — all crop differences live in referential JSON
- Signal vocabulary must be documented in one place (shared between signal computer and referential authors)
- Backward compatibility: if a referential still has string conditions (during migration), `extract_phase_config()` should fall back to regex extraction until fully migrated
- AI prompts receive full referential — structured JSON must remain interpretable by LLM

## Resolved Decisions

1. **Explicit wrapping required** — `conditions_activation` and all condition lists must use `{"and": [...]}` or `{"or": [...]}`. No bare arrays. Prevents hidden AND default.

2. **Debug logging** — `evaluate()` accepts optional diagnostics collector. Records every clause with var name, expected/actual values, result. Zero cost when not requested.

3. **Streak definitions in `signaux.streaks`** — Streak thresholds live in the referential as condition expressions, evaluated daily by the signal layer to maintain counters. Phase conditions check pre-computed counters. Same `evaluate()` function used in both places. New streak type = JSON only, zero Python.

```json
"signaux": {
  "streaks": {
    "warm_streak":    { "var": "Tmoy", "gt_var": "Tmoy_Q25" },
    "cold_streak":    { "var": "Tmoy", "lt_var": "Tmoy_Q25" },
    "hot_streak":     { "var": "Tmoy", "gt": 25 },
    "hot_dry_streak": { "and": [
      { "var": "Tmax", "gt": 30 },
      { "var": "precip_30j", "lt": 5 }
    ]}
  }
}
```

## Open Questions

None — ready for planning.
