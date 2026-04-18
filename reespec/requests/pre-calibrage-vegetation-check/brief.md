# Pre-Calibrage Vegetation Check

## Problem

When a user clicks "Lancer le calibrage", the system runs a full 7-step calibration pipeline (~10 minutes) on the parcel. If the parcel has no trees (sol nu, wrong polygon, abandoned field), this wastes compute, AI tokens, and user time — only to produce garbage results.

There is no early gate that checks whether the parcel actually contains vegetation before committing to the full calibration.

## Goal

Add a deterministic vegetation check inside `startCalibration()` (Phase 0.5) that uses historical NDVI from `satellite_indices_data` to detect empty parcels and block calibration before it starts.

## Non-Goals

- No LLM call — pure arithmetic (mean, min, threshold comparison)
- No stddev calculation
- No crop-specific summer windows — July-August universal
- No confidence level output — 4 statuses are sufficient
- No special UX for age correction — "Corriger ma parcelle" sends back to Phase 0
- No new endpoint — inline in existing `startCalibration()`, returns 422 on block

## Decision Rules

| Rule | Condition | Status | Action |
|------|-----------|--------|--------|
| 0 | age < 4 years | BYPASS_JEUNE_PLANTATION | skip check, continue |
| 1 | mean ≥ 0.28 AND min ≥ 0.18 | VEGETATION_CONFIRMEE | continue |
| 2 | mean < 0.15 AND min < 0.10 | PARCELLE_VIDE | block (422) |
| 3 | none of above | ZONE_GRISE | warn + continue |

- `mean` = average NDVI for July-August dates across all available history
- `min` = lowest NDVI value among July-August dates
- Rule absolue: when in doubt, let through (never block a real farmer on partial data)

## Impact

- Saves ~10 min per false calibration on empty parcels
- Gives clear user feedback: "your parcel has no trees" instead of a failed calibration
- ZONE_GRISE flag can be used downstream by calibration engine for extra caution
