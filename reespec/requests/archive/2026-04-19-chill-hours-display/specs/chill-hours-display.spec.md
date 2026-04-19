# Spec: Chill Hours Display

## Capability 1: Snapshot input carries parcel variety

### S1.1 Variety field on CalibrationSnapshotInput
- **GIVEN** a calibration record for a parcel where `parcels.variety = 'Picholine Marocaine'`
- **WHEN** `CalibrationService` builds the snapshot input for the review adapter
- **THEN** the snapshot input includes `variety: 'Picholine Marocaine'`
- **AND** when `parcels.variety` is null, the snapshot input includes `variety: null`

---

## Capability 2: Adapter computes ChillHoursDisplay

### S2.1 Variety found in referentiel — green band
- **GIVEN** `step2.chill_hours = 450` and `variety = 'Picual'` (referentiel `heures_froid_requises = [400, 600]`)
- **WHEN** the adapter builds `block_b.phenology_dashboard.chill`
- **THEN** the result is `{ value: 450, reference: { min: 400, max: 600, source: 'variety', variety_label: 'Picual' }, band: 'yellow', phrase: <non-empty> }`

### S2.2 Variety found — red band (below min, above critique)
- **GIVEN** `step2.chill_hours = 250` and `variety = 'Picual'` (bracket `[400, 600]`)
- **WHEN** the adapter builds chill display
- **THEN** `band === 'red'` and `value === 250` and `reference.source === 'variety'`

### S2.3 Critique band always wins (below 100)
- **GIVEN** `step2.chill_hours = 80` for any variety
- **WHEN** the adapter builds chill display
- **THEN** `band === 'critique'`

### S2.4 Variety not in referentiel — fallback bracket
- **GIVEN** `step2.chill_hours = 300` and `variety = 'Unknown Variety'`
- **WHEN** the adapter builds chill display
- **THEN** `reference.min === 200` and `reference.max === 400` and `reference.source === 'fallback'` and `reference.variety_label === null`
- **AND** `band === 'yellow'` (300 in [200, 400))

### S2.5 No variety on parcel — fallback bracket
- **GIVEN** `variety = null` and `step2.chill_hours = 500`
- **WHEN** the adapter builds chill display
- **THEN** `reference.source === 'fallback'` and `band === 'green'` (500 ≥ 400)

### S2.6 chill_hours missing from step2 — null result
- **GIVEN** `step2` exists but lacks `chill_hours`
- **WHEN** the adapter builds chill display
- **THEN** the result is `null`
- **AND** `block_b.phenology_dashboard.chill === null`

### S2.7 Non-olive crop — null chill display
- **GIVEN** `crop_type = 'agrumes'` and `chill_hours = 200`
- **WHEN** the adapter builds chill display
- **THEN** the result is `null` (chill display is olive-only for v1)

---

## Capability 3: Block A concern injection

### S3.1 Critique chill produces critique concern in Block A
- **GIVEN** chill display has `band === 'critique'`
- **WHEN** the adapter builds `block_a.concerns`
- **THEN** an entry exists with `{ component: 'chill_hours', severity: 'critique', target_block: 'B' }`
- **AND** the entry's `phrase` mentions the value and "dormance"

### S3.2 Red chill produces vigilance concern in Block A
- **GIVEN** chill display has `band === 'red'` (e.g. value 250, variety Picual, min 400)
- **WHEN** the adapter builds `block_a.concerns`
- **THEN** an entry exists with `{ component: 'chill_hours', severity: 'vigilance', target_block: 'B' }`
- **AND** the entry's `phrase` mentions the variety min and the actual value

### S3.3 Green chill produces a strength entry
- **GIVEN** chill display has `band === 'green'`
- **WHEN** the adapter builds `block_a.strengths`
- **THEN** an entry exists with `{ component: 'chill_hours' }` and a non-empty `phrase`

### S3.4 Yellow chill produces neither concern nor strength
- **GIVEN** chill display has `band === 'yellow'`
- **WHEN** the adapter builds Block A
- **THEN** no entry with `component: 'chill_hours'` exists in `concerns`
- **AND** no entry with `component: 'chill_hours'` exists in `strengths`

### S3.5 Null chill display produces no Block A entry
- **GIVEN** chill display is `null` (missing from step2 or non-olive)
- **WHEN** the adapter builds Block A
- **THEN** no `chill_hours` entry exists in `concerns` or `strengths`

---

## Capability 4: Frontend type mirror

### S4.1 Frontend types match backend DTO
- **GIVEN** the backend DTO declares `ChillHoursDisplay` and adds `chill: ChillHoursDisplay | null` on `PhenologyDashboardData`
- **WHEN** TypeScript compiles `project/src/types/calibration-review.ts`
- **THEN** a corresponding `ChillHoursDisplay` interface exists on the frontend with identical field names and types
- **AND** `PhenologyDashboardData.chill: ChillHoursDisplay | null` is declared

---

## Capability 5: ChillHoursGauge UI component

### S5.1 Renders nothing when data is null
- **GIVEN** `<ChillHoursGauge data={null} />`
- **WHEN** the component renders
- **THEN** the rendered output is empty (no DOM nodes)

### S5.2 Renders value, reference, and band color
- **GIVEN** `<ChillHoursGauge data={{ value: 342, reference: { min: 200, max: 400, source: 'variety', variety_label: 'Picholine' }, band: 'yellow', phrase: 'OK' }} />`
- **WHEN** the component renders
- **THEN** the DOM contains the text `342`, the text `Picholine`, and the text `200–400` (or `200-400`)
- **AND** the gauge marker element has a class or style indicating yellow band

### S5.3 Shows fallback badge when reference source is fallback
- **GIVEN** chill data with `reference.source === 'fallback'`
- **WHEN** rendered
- **THEN** the DOM contains the i18n string for `calibrationReview.chill.fallbackBadge`

### S5.4 Renders critique band styling
- **GIVEN** chill data with `band === 'critique'`
- **WHEN** rendered
- **THEN** a critique-specific element/class is present (red background, alert icon)

---

## Capability 6: Wired into PhenologyDashboard

### S6.1 PhenologyDashboard renders ChillHoursGauge when chill present
- **GIVEN** review data with `block_b.phenology_dashboard.chill` non-null
- **WHEN** `<PhenologyDashboard />` renders
- **THEN** the rendered output contains the `ChillHoursGauge` component
- **AND** it appears before the season timelines section

### S6.2 PhenologyDashboard hides chill section when null
- **GIVEN** review data with `block_b.phenology_dashboard.chill === null`
- **WHEN** `<PhenologyDashboard />` renders
- **THEN** no `ChillHoursGauge` element is in the DOM
- **AND** the rest of the dashboard renders normally (no errors)

---

## Capability 7: i18n keys present in all 3 languages

### S7.1 All chill keys exist in en, fr, ar
- **GIVEN** the `ai.json` files for `en`, `fr`, `ar`
- **WHEN** parsed
- **THEN** every key under `calibrationReview.chill.*` (title, unit, referenceLabel, fallbackBadge, bands.green, bands.yellow, bands.red, bands.critique) exists in all three files
- **AND** no value is the literal string `TODO` or empty
