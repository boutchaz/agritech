# Calibration Wizard → Pipeline Wiring

## Problem

The calibration wizard collects rich agronomic data across 8 steps (soil analysis, water analysis, foliar analysis, 3-5 year harvest history, cultural practices like pruning/fertilization/stress events). This data either **never reaches the pipeline** or **reaches it but is never read by any computation step**. The result: two parcels with identical satellite signatures but completely different agronomic realities get the same calibration output — same health score, same yield potential, same confidence, same generic recommendations.

### Evidence

A super-intensive Arbequina parcel (4x2, 1.07ha) with complete wizard data (soil, water, foliar, harvests, cultural history) produces:
- **Confidence 2.3/10** — as if no ground-truth data exists
- **Yield 3-6 T/ha** — from reference tables only, ignoring actual harvest history
- **Phenology: AMORCAGE with referential cycle** — no ground-truth adjustment
- **Recommendations: generic satellite-only** — nothing about entered soil pH, water EC, pruning regime

## Root Cause — 3 Layers

### Layer 1: Frontend — Data never saved
- Wizard harvest history (3-5 years of yields from Step 6) is **never persisted to DB**. Only `harvest_regularity` enum is sent.
- The actual `harvests` array with year-by-year yields vanishes at submit time.

### Layer 2: Backend — Data passed but never read
- `cultural_history` dict (pruning, fertilization, stress events) flows to FastAPI `CalibrationInput` → **no pipeline step reads it**.
- `harvest_regularity` flows to FastAPI → **no pipeline step reads it**.
- Soil/water/foliar analyses are saved as `analyses` records, fetched back by the pipeline, but **only their DATE is used** (for confidence scoring). The actual field values (pH, EC, NPK, SAR, etc.) are ignored.

### Layer 3: Pipeline — No agronomic integration
- **s6_yield_potential**: uses reference tables + satellite, ignores `harvest_records` actual values and `harvest_regularity`.
- **s8_health_score**: pure satellite indices (NIRv, NDMI, NDRE). No soil/water/foliar ground-truth correction.
- **confidence**: checks analysis dates only, not field completeness or content.
- **recommendations**: generic satellite-only thresholds. No soil, water, foliar, or cultural practice context.
- **phenology**: referential-only. No adjustment for pruning timing, stress events, or irrigation changes.

## Scope — 8 Integration Points

| # | Wizard Data | Target Stage | What Changes |
|---|---|---|---|
| 1 | Harvest history (3-5yr yields) | Frontend → DB → s6_yield | Save to `harvest_records` table, use actual yields in yield calculation |
| 2 | Harvest regularity | s6_yield + confidence | Adjust alternance detection, yield bracket confidence |
| 3 | Soil analysis values | s8_health + confidence + recs | Ground-truth nutritional component, raise confidence when complete |
| 4 | Water analysis values | s8_health + confidence + recs | Ground-truth hydric component, irrigation quality context |
| 5 | Foliar analysis values | s8_health + confidence + recs | Direct nutrient status overrides for nutritional score |
| 6 | Cultural history (pruning, fert, stress) | confidence + recs | Profile completeness scoring, contextual recommendations |
| 7 | Real plantation age | maturity_phase | Use wizard-reported age alongside planting_year |
| 8 | All of the above | AI report prompt | Richer agronomic context for LLM narrative generation |

## Constraints

- **Backward compatible**: existing calibrated parcels keep their results. New wiring only affects new calibrations.
- **Satellite stays primary**: satellite-derived scores are the baseline. Ground-truth data supplements/corrects, never replaces entirely.
- **No schema changes**: use existing `analyses` table data, existing `harvest_records` table, existing `cultural_history` dict.
- **Dual-backend split**: FastAPI owns all pipeline math. NestJS owns data fetching and API surface.
- **AgromindIA display levels**: recs must respect Level 1/3 distinction (Level 2 BLOCKED per decisions.md).

## Success Criteria

1. Two Arbequina parcels with same satellite but different soil/water/harvests produce **different health scores, yield potentials, and recommendations**.
2. Confidence score **reflects actual data completeness** — a parcel with full wizard data scores 5+/10, not 2.3/10.
3. Yield potential uses **actual harvest history** when available, not just reference tables.
4. Recommendations reference **specific ground-truth data** ("your soil pH of 8.2 suggests…", not just "check vegetation health").
5. All pipeline changes have **unit tests** with fixtures demonstrating before/after difference.

## Out of Scope

- New wizard steps or UI changes
- Schema changes (new tables or columns)
- Recalibrating existing parcels automatically
- Frontend report display changes (that's a separate request)
