# Chill Hours Display — Brief

## Problem

The calibration engine computes `step2.chill_hours` (cumulative hours T<7.2°C, season resets Nov) for every parcel, but the value is dropped before the UI sees it. For olive farms, chill accumulation drives dormancy break — a deficit means weak flowering, low fruit set, and poor yield. Hassan (agronome) needs the number to plan; Karim (farm manager) needs to know when it's a problem. Today neither can see it without downloading the full technical export.

## Goal

Surface `chill_hours` on `/parcels/:parcelId/ai/calibration` with variety-aware reference thresholds. Hassan sees the number + bracket + traffic light. Karim sees a Block A concern only when the value is risky.

## Non-Goals

- Not building a chill-hours forecast (we display measured cumulative only)
- Not modifying the engine — value already computed
- Not adding chill_hours to weather page (separate decision)
- Not surfacing other step2 weather fields in this request (extreme_events, monthly_aggregates → future)

## Scope

- Extend backend review adapter to include chill_hours + variety reference bracket on Block B
- Add traffic-light component inside `PhenologyDashboard` (dormancy is the scientific link)
- Add Block A concern auto-injection when chill is below variety min or below absolute critical (100h)
- i18n strings for en / fr / ar
- Variety reference lookup from `agritech-api/referentials/DATA_OLIVIER.json` (`heures_froid_requises`)
- Fallback bracket `[200, 400]` when variety is unknown / missing from referentiel

## Key Design Decisions (from discovery)

1. **Display in PhenologyDashboard, raise concern in Block A** — both placements, same data. Dashboard is Hassan-grade detail; Block A is Karim-grade narrative.
2. **Traffic-light bands per variety bracket `[min, max]`**:
   - Green: `chill_hours >= max` (sufficient)
   - Yellow: `min <= chill_hours < max` (borderline)
   - Red: `chill_hours < min` (insufficient)
   - Always-critique: `chill_hours < 100` (rule OLI-08)
3. **Block A concern severity mapping**:
   - `chill_hours < 100` → severity `critique`
   - `chill_hours < min` (but ≥100) → severity `vigilance`
   - Otherwise no concern (and add to strengths if green)
4. **Variety-aware reference loaded from referentiel** — not hard-coded. Reuses existing `crop-reference-loader` infrastructure.
5. **Fallback bracket `[200, 400]`** when no variety match — chosen as middle-of-range olive default. Logged as quality flag so UI can show "default reference used".

## Impact

- **Hassan** (agronome, 5–15 farms, expert): Reads chill against the variety bracket, decides whether dormancy was satisfied, plans winter pruning timing accordingly.
- **Karim** (farm manager, 300ha, hates complexity): Sees a Block A concern only when chill is risky — actionable, non-noisy.
- **Ahmed** (50ha, no tech): Doesn't read the dashboard, but if chill is critique he sees the Block A concern in plain language.

## Risks

- **Stale variety mapping**: If referentiel `heures_froid_requises` is wrong for a region, all parcels of that variety get wrong traffic light. Mitigation: log fallback usage, surface "default reference used" badge, allow agronome to override variety on parcel.
- **Wide olive bracket means meaningful values land yellow**: Picholine `[200,400]` spans 2x — most years sit yellow. Acceptable for v1; future: per-region adjustment.
- **No Mediterranean wide-baseline data**: We don't yet know typical chill for Meknes / Marrakech / Souss to validate thresholds against reality. Mitigation: collect 1 season of values across active parcels before adjusting bands.
