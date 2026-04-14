# Tasks — Pre-Calibrage Vegetation Check

## Backend

### 1. Pure vegetation check function + types

- [x] **RED** — Write `vegetation-check.spec.ts`: test `checkVegetation()` with 8 scenarios from spec (bypass age<4, confirmed, empty, grey zone, no data, boundary values, mixed thresholds, null planting year). Run `npx jest vegetation-check.spec.ts` → all tests fail (function does not exist).
- [x] **ACTION** — Create `vegetation-check.ts` with `VegetationStatus` type, `VegetationCheckResult` interface, and `checkVegetation(plantingYear: number | null, summerNdviValues: number[])` pure function implementing Rules 0-3.
- [x] **GREEN** — Run `npx jest vegetation-check.spec.ts` → all 10 tests pass.

### 2. fetchSummerNdvi data method

- [x] **RED** — Verified `CalibrationDataService` has no `fetchSummerNdvi` method. grep returns 0 matches.
- [x] **ACTION** — Added `fetchSummerNdvi(parcelId, organizationId): Promise<number[]>` to `CalibrationDataService`. Queries `satellite_indices_data` for NDVI, filters to month 7/8, returns numeric array.
- [x] **GREEN** — Method exists (2 references). `npx tsc --noEmit` passes clean.

### 3. Wire vegetation check into startCalibration

- [x] **RED** — Test written: mock summer NDVI [0.05, 0.08, 0.06] for parcel age=16 → expects UnprocessableEntityException. Ran → got BadRequestException (no veg check yet).
- [x] **ACTION** — Added vegetation check in `startCalibration()` after readiness check. Throws 422 with structured response on PARCELLE_VIDE. Also fixed missing CalibrationDraftService/CalibrationDataService providers in test module.
- [x] **GREEN** — Vegetation check test passes. Pre-existing tests (getLatestCalibration, recovers stuck) still pass. 2 pre-existing failures unrelated.

### 4. ZONE_GRISE flag in calibration profile_snapshot

- [x] **RED** — Test written: mock ZONE_GRISE NDVI values, assert `profile_snapshot.vegetation_check_status === "ZONE_GRISE"`. Ran → failed (field absent).
- [x] **ACTION** — Added conditional spread `...(vegetationResult.status === "ZONE_GRISE" && { vegetation_check_status: "ZONE_GRISE" })` to profile_snapshot insert.
- [x] **GREEN** — Test passes. tsc clean.

## Frontend

### 5. Handle 422 PARCELLE_VIDE in CalibrationWizard

- [x] **RED** — Verified: grep PARCELLE_VIDE in CalibrationWizard.tsx returns 0 matches.
- [x] **ACTION** — Added try/catch in `launchCalibration()`, Dialog state for vegetation error, Dialog component with "Corriger ma parcelle" button.
- [x] **GREEN** — grep returns 1 match. `npx tsc --noEmit` passes.

### 6. Handle ZONE_GRISE warning toast

- [x] **RED** — Was already added as part of Task 5 (same try/catch block handles both cases).
- [x] **ACTION** — ZONE_GRISE check + `toast.warning()` included in Task 5 implementation.
- [x] **GREEN** — grep returns 2 matches. tsc passes.

### 7. Add i18n translation keys

- [x] **RED** — Verified: grep `vegetationCheck` in locales returns 0 matches.
- [x] **ACTION** — Added keys to `ai.json` (not common.json — calibration keys live in ai namespace) for en/fr/ar: `titleParcelleVide`, `bodyParcelleVide`, `correctParcel`, `titleZoneGrise`, `bodyZoneGrise`.
- [x] **GREEN** — All 3 locale files contain `vegetationCheck` keys.
