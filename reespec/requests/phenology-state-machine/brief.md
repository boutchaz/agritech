# Phenology State Machine — Brief

## What

Replace the current step4 phenology detection (signal-shape curve fitting) with a referential-driven state machine that implements the `protocole_phenologique` defined in each crop's referential JSON.

## Why

The current step4 fits 5 stages (dormancy_exit, plateau_start, peak, decline_start, dormancy_entry) by finding peaks/troughs on a smoothed NIRv curve. This produces nonsensical results:
- **Juvenile trees**: monotonic growth signal → stages compressed into 1-day gaps
- **Flat signals**: NIRv amplitude < 0.03 → any noise is detected as "peak"
- **Truncated data**: partial years → 40-day total cycles
- **No GDD integration**: transitions are signal-shape only, ignoring thermal time
- **No variety awareness**: hardcoded thresholds instead of per-variety chill ranges

The olive referential (`DATA_OLIVIER.json`) already defines a rigorous 6-phase state machine with GDD-driven transitions, multi-signal diagnostics, signal classification, and variety-specific chill thresholds. This spec is sitting unused.

## Goals

1. Implement the olive `protocole_phenologique` as a state machine that processes daily data chronologically
2. Use GDD-based phase transitions (e.g., DEBOURREMENT→FLORAISON at GDD≥350)
3. Use variety-specific chill thresholds from `referential.gdd.seuils_chill_units_par_variete`
4. Produce per-season phase timelines with transition dates, GDD at transition, and confidence levels
5. Maintain backward-compatible `Step4Output` so downstream consumers (review adapter, step5) continue working
6. Fall back to current signal-based detection for crops without a `protocole_phenologique`

## Non-Goals

- Implementing `protocole_phenologique` for agrumes, avocatier, palmier_dattier (future work)
- Implementing the `alertes_calibrage` from the referential (separate request)
- Changing the `classification_signal` logic (step2a already handles this partially)
- Modifying the frontend calibration review display (adapter maps to existing UI)
- Adding NIRvP to step1 SUPPORTED_INDICES (can use NIRv as proxy where NIRvP unavailable)

## Impact

- **Calibration quality**: phenology phases grounded in agronomic science instead of signal heuristics
- **Warm climates**: `Tmoy_Q25 >= 15 → skip dormancy` handles Morocco's warm zones correctly
- **Young trees**: state machine naturally handles sparse data (fewer transitions detected, not forced)
- **GDD pipeline**: the sinusoidal chill fix + this state machine = full thermal model active
