# Chill Hours Display — Design

## Data Flow

```
backend-service (FastAPI)
    │  step2.chill_hours (already computed)
    ▼
calibrations.report_v2 (JSONB column, already persisted)
    │
    ▼
agritech-api CalibrationReviewAdapter
    │  + lookup variety bracket from DATA_OLIVIER.json
    │  + classify band (green/yellow/red/critique)
    │  + inject concern into Block A when below min
    ▼
CalibrationReviewView.block_b.phenology_dashboard.chill
CalibrationReviewView.block_a.concerns / strengths
    │
    ▼
useCalibrationReview hook (frontend)
    │
    ▼
PhenologyDashboard.tsx → renders ChillHoursGauge
BlockASynthese.tsx → renders concern (existing concern list, no new component)
```

## Backend Changes

### 1. Extend DTO `BlockBAnalyse.phenology_dashboard`

`agritech-api/src/modules/calibration/dto/calibration-review.dto.ts`

```ts
export interface ChillHoursDisplay {
  value: number;                    // step2.chill_hours
  reference: {
    min: number;
    max: number;
    source: 'variety' | 'fallback'; // 'fallback' = bracket [200,400] used
    variety_label: string | null;   // e.g. "Picholine Marocaine"
  };
  band: 'green' | 'yellow' | 'red' | 'critique';
  phrase: string;                   // pre-computed narrative for Hassan
}

// added to PhenologyDashboardData
export interface PhenologyDashboardData {
  // ... existing fields
  chill: ChillHoursDisplay | null;  // null if step2.chill_hours missing
}
```

### 2. Adapter logic

`agritech-api/src/modules/calibration/calibration-review.adapter.ts`

New helper `buildChillDisplay(snapshot, parcel, referentiel)`:

```ts
function buildChillDisplay(
  output: CalibrationOutput,
  parcel: Parcel,
  referentiel: OlivierReferentiel,
): ChillHoursDisplay | null {
  const value = output.step2?.chill_hours;
  if (value == null) return null;

  // Look up variety bracket
  const variety = parcel.variety?.trim();
  const varietyEntry = variety
    ? referentiel.varietes?.find(v => normalizeVariety(v.nom) === normalizeVariety(variety))
    : null;
  const bracket = varietyEntry?.heures_froid_requises ?? [200, 400];
  const source = varietyEntry ? 'variety' : 'fallback';

  // Classify band
  let band: ChillHoursDisplay['band'];
  if (value < 100) band = 'critique';
  else if (value < bracket[0]) band = 'red';
  else if (value < bracket[1]) band = 'yellow';
  else band = 'green';

  // Narrative phrase (Hassan-grade, French)
  const phrase = buildChillPhrase(value, bracket, band, varietyEntry?.nom);

  return {
    value,
    reference: {
      min: bracket[0],
      max: bracket[1],
      source,
      variety_label: varietyEntry?.nom ?? null,
    },
    band,
    phrase,
  };
}
```

Inject into Block B builder where `phenology_dashboard` is assembled.

### 3. Block A concern injection

In `buildBlockASynthese`, after computing strengths/concerns from health components, append chill concern when applicable:

```ts
if (chill?.band === 'critique') {
  concerns.push({
    component: 'chill_hours',
    phrase: `Déficit critique de froid hivernal (${chill.value}h). Dormance non satisfaite — risque majeur sur la floraison.`,
    severity: 'critique',
    target_block: 'B',
  });
} else if (chill?.band === 'red') {
  concerns.push({
    component: 'chill_hours',
    phrase: `Heures de froid insuffisantes (${chill.value}h, requis ${chill.reference.min}h pour ${chill.reference.variety_label ?? 'cette variété'}).`,
    severity: 'vigilance',
    target_block: 'B',
  });
} else if (chill?.band === 'green') {
  strengths.push({
    component: 'chill_hours',
    phrase: `Besoin en froid hivernal satisfait (${chill.value}h).`,
  });
}
// yellow → no entry in strengths or concerns (neutral)
```

### 4. Variety lookup utility

Reuse `crop-reference-loader.ts` (already loads `DATA_OLIVIER.json`). Add `normalizeVariety()` helper to handle case / accent / whitespace mismatches between `parcels.variety` (free text) and referentiel `nom` field.

## Frontend Changes

### 1. Type updates

`project/src/types/calibration-review.ts` — mirror new `ChillHoursDisplay` interface and add `chill: ChillHoursDisplay | null` on `PhenologyDashboardData`.

### 2. New component `ChillHoursGauge.tsx`

`project/src/components/calibration/review/ChillHoursGauge.tsx`

```
┌──────────────────────────────────────────────┐
│ ❄  Heures de froid                  342 h     │
├──────────────────────────────────────────────┤
│ Picholine Marocaine — réf 200–400h           │
│                                                │
│   0     100    200      342      400    600   │
│   ├──────│──────│────────●────────│──────┤    │
│   crit   red   yellow      yellow   green     │
│                                                │
│ ✓ Satisfaisant pour cette variété             │
└──────────────────────────────────────────────┘
```

- Single horizontal gauge, four color bands matching variety bracket
- Marker at current value
- Footer phrase from backend (`chill.phrase`)
- Badge "réf défaut" when `source === 'fallback'`

### 3. Wire into `PhenologyDashboard.tsx`

Add `<ChillHoursGauge data={data.chill} />` directly under the dashboard header, before season timelines. Hide cleanly when `data.chill === null`.

### 4. Block A — no UI change needed

`BlockASynthese.tsx` already iterates `concerns` and `strengths` arrays. New entry renders automatically as `component: 'chill_hours'`. Add icon mapping in the concern → icon resolver.

## i18n

New keys in `ai.json` namespace, all 3 languages:

```
calibrationReview.chill.title
calibrationReview.chill.unit              // "h"
calibrationReview.chill.referenceLabel    // "Référence"
calibrationReview.chill.fallbackBadge     // "Réf. par défaut"
calibrationReview.chill.bands.green
calibrationReview.chill.bands.yellow
calibrationReview.chill.bands.red
calibrationReview.chill.bands.critique
```

The `phrase` field comes pre-localized from backend (French only initially; future: translate at adapter level using parcel locale).

## Testing

- Backend adapter unit test: 4 cases (each band) + variety found / fallback / step2 missing
- Block A concern injection test: critique → concern, red → concern, yellow → nothing, green → strength
- Frontend snapshot test for `ChillHoursGauge` for each band
- Skip E2E for this request — no new flow, only display

## Open Questions

1. Should `phrase` be localized at backend (per-org locale lookup) or sent as a key + params? Defer until i18n infra for backend strings exists.
2. Should we offer a "chill alert" notification when a parcel transitions critique year-over-year? Out of scope; capture as future request.
3. Block A icon for `chill_hours` concern — Snowflake / Thermometer? Pick during execute.
