# Calibration Wizard → Pipeline Wiring — Design

## Architecture Overview

```
┌─────────────────────┐      ┌─────────────────────┐      ┌──────────────────────┐
│  Frontend (React)   │      │  NestJS Backend      │      │  FastAPI Pipeline    │
│                     │      │                      │      │                      │
│  CalibrationWizard  │─────▶│  startCalibration()  │─────▶│  run_calibration_    │
│  8 steps            │      │  builds DTO          │      │  pipeline()          │
│                     │      │  fetches analyses    │      │                      │
│  NEW: saves harvest │      │  fetches harvests    │      │  NEW: reads analyses │
│  records to DB      │      │  NEW: passes harvest │      │  content, cultural   │
│                     │      │  wizard data         │      │  history, regularity │
└─────────────────────┘      └─────────────────────┘      └──────────────────────┘
                                                                │
                                ┌───────────────────────────────┤
                                │                               │
                        ┌───────▼──────┐              ┌────────▼───────┐
                        │  confidence  │              │  health_score  │
                        │  NEW: uses   │              │  NEW: ground   │
                        │  analysis    │              │  truth adj.    │
                        │  content     │              └────────────────┘
                        └──────────────┘
                        ┌──────────────┐              ┌────────────────┐
                        │  yield_pot.  │              │  recommend.    │
                        │  NEW: uses   │              │  NEW: ground   │
                        │  harvests    │              │  truth context │
                        │  + regularity│              └────────────────┘
                        └──────────────┘
```

## Design Decisions

### D1: Satellite stays primary, ground-truth supplements

Satellite-derived scores are the baseline. Ground-truth data (soil, water, foliar) acts as **adjustment factors** (0.8×–1.2×) on top of satellite scores, never replaces them entirely. If no ground-truth data exists, behavior is identical to current output.

**Rationale**: Satellite data is always available for calibrated parcels. Ground-truth may be missing, outdated, or inaccurate. The pipeline must degrade gracefully.

### D2: Analysis content scoring via field completeness

Current confidence scoring only checks `soil_analysis_date` (any date → points). New approach: check **which fields are populated** in the analysis data dict, score completeness as a ratio. A soil analysis with only pH scores lower than one with pH + EC + NPK + organic matter.

**Rationale**: The wizard already collects this detail. The confidence score should reflect data richness, not just presence.

### D3: Harvest history saved to `harvest_records` table before calibration

Wizard harvests (3-5 rows with year, yield, unit, quality) are persisted to the existing `harvest_records` table via a new endpoint or by calling the existing harvest creation API from the wizard's `launchCalibration()`. This means the data flows through the existing `fetchHarvestRecords()` path naturally.

**Rationale**: Reuses existing infrastructure. The `harvest_records` table already exists with `parcel_id`, `harvest_date`, `quantity`, `unit`, `quality_grade`. No schema change needed. The wizard just wasn't saving to it.

**Rejected**: Passing harvest data as a separate DTO field. This would create a parallel path for harvest data that bypasses the existing fetch, creating inconsistency.

### D4: Cultural history and harvest regularity wired into pipeline via `CalibrationInput`

`CalibrationInput` already has `cultural_history: dict` and `harvest_regularity: str | None` fields. These are already populated by NestJS. The fix is purely in the FastAPI pipeline stages — read and use these fields.

### D5: Foliar analysis as a new confidence component

Foliar analysis currently has zero representation in confidence scoring. Add a new optional component `"foliar"` with max_score=5.0, rebalancing the total from 110 to 115. This keeps existing confidence scores unchanged (they won't have foliar data) while rewarding parcels that provide it.

**Rejected**: Reweighting existing components to make room for foliar. This would change scores for all existing calibrations.

### D6: Recommendations get ground-truth context injection

The `generate_recommendations()` function signature expands to accept analysis data, cultural history, and harvest regularity. New recommendation types are added:
- `soil_nutrition` — triggered by low pH, high EC, missing nutrients
- `water_quality` — triggered by high SAR, high chloride
- `foliar_deficiency` — triggered by low foliar nutrient percentages
- `cultural_practice` — triggered by pruning/fertilization gaps
- `harvest_regularity` — triggered by alternance patterns

Each uses Level 1 (simple actionable) or Level 3 (scientific detail) language based on the existing display level system.

### D7: Health score adjustments bounded to ±20%

Soil/water/foliar ground truth adjusts health score components by at most ±20% (0.8×–1.2× multiplier). For example:
- Good soil (pH 6.5-7.5, organic matter >2%): nutritional component ×1.1
- Poor soil (pH >8.5, EC >4): nutritional component ×0.8
- Complete foliar showing balanced NPK: nutritional component ×1.2
- Water with high SAR (>6): hydric component ×0.85

These bounds prevent ground-truth from overwhelming satellite-derived scores.

### D8: AI report prompt enrichment

The `generateCalibrationSummary()` in NestJS receives `blockA` data. The fix: include a `ground_truth_context` field in `blockA` that summarizes soil/water/foliar/cultural data. The LLM prompt already asks for "actionable interpretation" — it will naturally use this context when available.

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Ground-truth data changes existing scores too much | Medium | ±20% bound on adjustments, with unit tests asserting bounds |
| Harvest records from wizard conflict with existing records | Low | Wizard saves with `source: 'calibration_wizard'` in notes field |
| Foliar analysis schema varies across crops | Low | Defensive access — check for None, skip if missing |
| Confidence rebalance (110→115) confuses existing consumers | Low | `normalized_score` is the public-facing metric, it adapts automatically |
| Cultural history fields are sparse (most null) | High | Graceful — only score populated fields |

## Files Changed

### Frontend (project/src/)
- `components/calibration/CalibrationWizard.tsx` — save harvest records before launching
- `lib/api/harvests.ts` or `lib/api/calibration.ts` — harvest creation helper

### NestJS Backend (agritech-api/src/)
- `modules/calibration/calibration.service.ts` — pass harvest wizard data through
- `modules/ai-reports/ai-reports.service.ts` — enrich prompt with ground-truth context
- `modules/calibration/calibration-review.adapter.ts` — include ground truth in block_a

### FastAPI Pipeline (backend-service/app/)
- `services/calibration/support/confidence.py` — use analysis content, add foliar component, cultural scoring
- `services/calibration/support/recommendations.py` — ground-truth context injection
- `services/calibration/pipeline/s6_yield_potential.py` — use harvest_regularity for alternance
- `services/calibration/pipeline/s8_health_score.py` — ground-truth adjustment factors
- `services/calibration/orchestrator.py` — wire cultural_history and harvest_regularity through
- `services/calibration/types.py` — no changes needed (CalibrationInput already has fields)

### Tests
- `backend-service/tests/test_calibration_orchestrator.py` — new tests for ground-truth integration
- `backend-service/tests/test_confidence_ground_truth.py` — new file
- `backend-service/tests/test_recommendations_ground_truth.py` — new file
- `backend-service/tests/test_health_score_ground_truth.py` — new file
