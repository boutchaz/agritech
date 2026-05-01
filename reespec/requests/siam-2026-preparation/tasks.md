# Tasks: SIAM 2026 Preparation

All backend tasks modify `agritech-api/src/modules/demo-data/demo-data.service.ts` unless noted. Frontend tasks are in `project/src/`.

---

### 1. Add SIAM farms and parcels with Meknès coordinates

- [ ] **RED** — Write `agritech-api/test/demo-data/siam-demo.e2e-spec.ts`: call `seedSiamDemoData(orgId, userId)`, then query `farms` for org where name IN ('Ferme Atlas', 'Ferme Ziz', 'Ferme Rif') — expect exactly 3 farms with `total_area` summing to ~320. Query `parcels` joined with `farms` — expect 15-20 parcels where at least 10 have `crop_type` = 'olivier' and at least 2 have coordinates within the Meknès bounding box (lat 33.8-33.95, lon -5.6 to -5.45). Run → fails (method doesn't exist).
- [ ] **ACTION** — Add `createSiamFarmsAndParcels(orgId)` to demo-data.service.ts. Creates 3 farms with French names and Moroccan characteristics. Creates 15-20 parcels with real Meknès coordinates, crop types (olivier majority, agrumes, blé_dur), varieties (Picholine Marocaine, Haouzia), mixed planting years (3, 12, 35), planting systems (irrigué, pluvial, goutte_à_goutte), areas 5-40ha. Wire in `seedSiamDemoData()`.
- [ ] **GREEN** — Run test → 3 farms, 15-20 parcels, coordinates in Meknès bbox, correct crop distribution.

---

### 2. Add SIAM calibration data and AgromindIA recommendations

- [ ] **RED** — Extend `siam-demo.e2e-spec.ts`: after seeding, query `calibrations` for org joined with `parcels` — expect ≥5 with join resolving. At least 1 has `status` = 'validated' and non-null `scores_detail` JSONB. Query `ai_recommendations` for org — expect ≥3 rows with `language` = 'fr' or message text containing French actionable phrases. Run → fails (0 rows).
- [ ] **ACTION** — Add `createSiamCalibrations(orgId, parcels, userId)` to demo-data.service.ts. For 5 parcels, insert calibration records with populated `baseline_data`, `scores_detail`, `diagnostic_data` JSONB. Health scores 60-85. Add `createSiamRecommendations(orgId, parcels)` — insert 5 Level 1 French recommendations: "Arrosez la parcelle B3 demain avant 8h", "Risque de stress hydrique sur parcelle A1", "Récolte optimale pour parcelle C2 entre le 15 et le 20 octobre", etc. Wire in `seedSiamDemoData()`.
- [ ] **GREEN** — Run test → ≥5 calibrations with JSONB, ≥3 French recommendations.

---

### 3. Add SIAM harvest records and analyses

- [ ] **RED** — Extend `siam-demo.e2e-spec.ts`: query `harvest_records` for org — expect ≥10 rows spanning ≥2 distinct years. Query `analyses` for org — expect ≥3 with `analysis_type` IN ('soil', 'water'). Run → fails.
- [ ] **ACTION** — Add `createSiamHarvestRecords(orgId, parcels)` — for each olive/citrus parcel, insert 2-3 harvest records across 2023-2025 with realistic Moroccan yields (olive: 2-5 t/ha, citrus: 15-30 t/ha). Add `createSiamAnalyses(orgId, parcels)` — insert soil analyses (pH, EC, NPK) for 3 key parcels and water analyses for 2. Wire in `seedSiamDemoData()`.
- [ ] **GREEN** — Run test → ≥10 harvest records across ≥2 years, ≥3 analyses.

---

### 4. Wire SIAM seeder into controller, stats, and clear

- [ ] **RED** — Extend `siam-demo.e2e-spec.ts`: call `GET /organizations/{orgId}/demo-data/stats` and assert that after seeding SIAM data, the stats response includes `siam_farms`, `siam_parcels`, `siam_calibrations`, `siam_recommendations` with counts > 0. Then call `DELETE /organizations/{orgId}/demo-data/clear` and re-check stats — all should be 0. Run → fails (SIAM tables not in stats/clear).
- [ ] **ACTION** — Add SIAM-specific tables to `getDataStats()`, `clearDemoData()`, `clearDemoDataOnly()`, `exportOrganizationData()`, `importOrganizationData()`. Add a `POST /organizations/{orgId}/demo-data/seed-siam` endpoint in `demo-data.controller.ts` that calls `seedSiamDemoData()`. Ensure clear order handles FK dependencies (recommendations before calibrations before parcels before farms).
- [ ] **GREEN** — Run test → stats include SIAM tables, clear removes all SIAM data, endpoint returns 201.

---

### 5. Verify service worker caches app shell for offline demo

- [ ] **RED** — Check: the service worker config (`project/vite.config.ts` or `project/sw.ts` or equivalent) does NOT include `registerRoute` or `precacheManifest` entries for the HTML shell, JS bundles, and CSS. Assertion: service worker precaching is absent or insufficient for offline reload. Browser test: load app online → go offline → hard reload → verify page fails to load.
- [ ] **ACTION** — Configure Vite PWA plugin (or update existing SW config) to precache the app shell (index.html, JS chunks, CSS). Set `staleTime` on critical TanStack Query hooks to `Infinity` when offline (detected via `useNetworkStatus`). Ensure `OfflineIndicator` is visible in the authenticated layout.
- [ ] **GREEN** — Load app online → DevTools → go offline → hard reload → page loads from SW cache → navigate 3 pages → all render with cached data → `OfflineIndicator` shows "Offline" badge.

---

### 6. Create looping video player HTML page

- [ ] **RED** — Check: `scripts/siam-video-player.html` does not exist. Assertion: file is absent.
- [ ] **ACTION** — Create `scripts/siam-video-player.html`: fullscreen `<video>` element with `loop`, `autoplay`, `muted`, `playsinline` attributes. Accepts a video URL via query param `?src=` or defaults to `siam-demo.mp4`. Minimal CSS: `width: 100vw; height: 100vh; object-fit: cover; cursor: none;`. No visible controls. Auto-enters fullscreen on click via `requestFullscreen()`.
- [ ] **GREEN** — Open `scripts/siam-video-player.html` in browser with a test MP4 → video plays fullscreen, loops seamlessly, no controls visible.

---

### 7. Verify SIAM RDV dates match actual SIAM 2026 schedule

- [ ] **RED** — Check: `project/src/components/public/RdvRequestPage.tsx` lines 10-19 hardcode `days` array with dates '20/04' through '27/04'. Assertion: these dates match the actual SIAM 2026 dates. If SIAM is April 21-27, the '20/04' entry is wrong and the array has 8 days instead of 7. Verify against SIAM official schedule.
- [ ] **ACTION** — If dates are wrong, update the `days` array in `RdvRequestPage.tsx` to match actual SIAM 2026 dates. Also update the `fullSlots` set if needed.
- [ ] **GREEN** — Verify the `days` array in `RdvRequestPage.tsx` exactly matches SIAM 2026 official dates (confirmed via SIAM website or organizer communication).

---

### 8. Create operational playbook document

- [ ] **RED** — Check: `docs/siam-2026-playbook.md` does not exist. Assertion: file is absent.
- [ ] **ACTION** — Create `docs/siam-2026-playbook.md` containing: (1) demo script (30-sec hook, 2-min walkthrough, close), (2) team role assignments, (3) daily SIAM routine (morning check, 2h sync, evening follow-up), (4) hardware checklist, (5) fallback procedures (offline demo, video fallback, hotspot). Source content from `.sisyphus/plans/siam-2026-preparation.md` Phase 4 and 6.
- [ ] **GREEN** — Verify `docs/siam-2026-playbook.md` exists and contains sections: "Demo Script", "Team Roles", "Daily Routine", "Hardware Checklist", "Fallback Procedures".
