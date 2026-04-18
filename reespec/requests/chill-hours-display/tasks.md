# Chill Hours Display — Tasks

---

## Phase 1: Backend — Snapshot input + adapter

### 1. Add `variety` to CalibrationSnapshotInput and propagate from caller

- [x] **RED** — Spec file references `variety` on `CalibrationSnapshotInput` → TS error `Property 'variety' does not exist`.
- [x] **ACTION** — Added `variety?: string | null` to DTO. In `calibration.service.ts` extended parcel select to include `variety`, added local `variety` extraction, passed on snapshot input.
- [x] **GREEN** — `tsc --noEmit` exits 0. `jest calibration-review.adapter` 38/38 passes including new "accepts variety field on snapshot input".

### 2. Add `ChillHoursDisplay` interface + `chill` field on `PhenologyDashboardData` (DTO only)

- [x] **RED** — Spec file imports `ChillHoursDisplay` → TS error `has no exported member 'ChillHoursDisplay'`.
- [x] **ACTION** — Added `ChillHoursDisplay` interface and required `chill: ChillHoursDisplay | null` on `PhenologyDashboardData`. `buildPhenologyDashboard` returns `chill: null` to satisfy the type.
- [x] **GREEN** — `tsc --noEmit` exits 0. `jest` includes new "ChillHoursDisplay shape exposes value, reference, band, phrase fields" — passes.

### 3. Adapter `buildChillDisplay` — variety lookup, band classification, phrase

- [x] **RED** — Added 8 tests S2.1–S2.7 (plus S2.1b yellow). 6 fail (S2.6/S2.7 already pass since chill defaults to null). Total 6 failed, 40 passed.
- [x] **ACTION** — Added `buildChillDisplay()` + `buildChillPhrase()` private methods in `calibration-review.adapter.ts`. Loads `getLocalCropReference('olivier')`, normalizes variety name (NFD + lowercase + trim), classifies band, builds French phrase. `buildPhenologyDashboard()` accepts `chill` as 3rd arg and passes through. Wired into `buildBlockB` line 348.
- [x] **GREEN** — `npx jest calibration-review.adapter` → 46/46 pass, all S2 cases green.

### 4. Block A concern + strength injection from chill band

- [x] **RED** — Added 5 tests S3.1–S3.5. 3 fail (S3.1, S3.2, S3.3). S3.4/S3.5 already pass since chill not yet injected.
- [x] **ACTION** — Refactored `transform()` to compute chill once and pass to `buildBlockA(input, chill)` and `buildBlockB(input, chill)`. Added overlay block in `buildBlockA` after `deriveStrengthsAndConcerns`: critique/red → push concern with `component: 'Heures de froid'` (matches existing French label convention), green → push strength, both respect 3-entry cap. Yellow/null → no-op.
- [x] **GREEN** — `jest calibration-review.adapter` 51/51 pass. `tsc --noEmit` exits 0.

---

## Phase 2: Frontend — types + UI

### 5. Mirror DTO types on the frontend

- [x] **RED** — Wrote `project/src/types/__tests__/calibration-review.types.test.ts`. IDE TS diagnostics: `Module has no exported member 'ChillHoursDisplay'` + `Property 'chill' does not exist on PhenologyDashboardData`. (Note: app `tsconfig.app.json` excludes `__tests__`, so `tsc --noEmit` won't fail; IDE/vitest typecheck carry the signal.)
- [x] **ACTION** — Added `ChillHoursDisplay` interface and required `chill: ChillHoursDisplay | null` field on `PhenologyDashboardData` in `project/src/types/calibration-review.ts`.
- [x] **GREEN** — `vitest run` 2/2 pass. `tsc --noEmit` exits 0.

### 6. `ChillHoursGauge` component — render value, reference, band, fallback badge

- [x] **RED** — Wrote `__tests__/ChillHoursGauge.test.tsx` with S5.1–S5.4. Vitest fails: `Cannot find module '../ChillHoursGauge'`.
- [x] **ACTION** — Created `ChillHoursGauge.tsx` with snowflake icon, value display, variety label + range, horizontal gauge with marker, fallback badge (testid `chill-hours-fallback-badge`), critique alert (testid `chill-hours-critique-alert`). Returns `null` when `data === null`. Uses `cn()` + Tailwind. i18n keys: `calibrationReview.chill.{title, unit, referenceLabel, fallbackBadge, bands.critique}`.
- [x] **GREEN** — `vitest run ChillHoursGauge` → 4/4 pass.

### 7. Wire `ChillHoursGauge` into `PhenologyDashboard`

- [x] **RED** — Wrote `__tests__/PhenologyDashboard.chill.test.tsx` (S6.1, S6.2). S6.1 fails (gauge testid not found).
- [x] **ACTION** — Imported `ChillHoursGauge` into `PhenologyDashboard.tsx`. Rendered `<ChillHoursGauge data={data.chill} />` between header and Phase Summary Cards, gated on `data.chill` truthy.
- [x] **GREEN** — `vitest run PhenologyDashboard.chill` → 2/2 pass.

### 8. i18n keys for chill display in en / fr / ar

- [x] **RED** — Wrote `src/locales/__tests__/chill-hours-i18n.test.ts` (24 cases: 8 keys × 3 langs). 24/24 fail (chill key missing).
- [x] **ACTION** — Added `calibrationReview.chill.{title, unit, referenceLabel, fallbackBadge, bands.{green,yellow,red,critique}}` to en/fr/ar `ai.json` files with real translations.
- [x] **GREEN** — `vitest run chill-hours-i18n` → 24/24 pass.

---

## Phase 3: Integration verification

### 9. End-to-end: review endpoint returns chill for an olive parcel with variety

- [x] **RED** — Wrote new sibling spec `calibration-chill-integration.spec.ts` with realistic snapshot inputs through the adapter. Without Phase 1+2 the test wouldn't compile (`variety` not on input, `chill` not on dashboard).
- [x] **ACTION** — No additional backend code needed; Phase 1+2 covered all wiring. (Note: actual variety in `DATA_OLIVIER.json` is "Picholine Marocaine" with bracket `[100,200]`, not `[200,400]` as the brief example assumed — adjusted assertions accordingly.)
- [x] **GREEN** — `jest calibration-chill-integration` → 4/4 pass: Picholine Marocaine 350h → green band + Block A strength; Picual 250h → red band + vigilance concern; 80h → critique concern referencing dormance; unknown variety → fallback bracket `[200,400]`. Full calibration suite shows no regressions vs develop baseline (45 failures with my changes vs 49 baseline; my changes add 19 passing tests).

### 10. Manual UI verification on real parcel

- [ ] **RED** — Visit `http://localhost:5173/parcels/fcbc99a3-aa77-4273-b6b8-afc74fedd243/ai/calibration` (the parcel from discovery). Check: PhenologyDashboard does NOT contain a chill section. Assertion fails.
- [ ] **ACTION** — Restart frontend + backend, ensure the parcel has a completed v2 calibration with `step2.chill_hours` populated. (No code changes expected — Phases 1–2 should make this work end-to-end.)
- [ ] **GREEN** — Reload the page. Chill gauge appears in PhenologyDashboard with value, variety bracket, and band color. If chill is in red/critique, Block A concern entry references chill_hours.
