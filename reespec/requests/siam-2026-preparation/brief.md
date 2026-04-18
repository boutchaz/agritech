# Brief: SIAM 2026 Preparation

## What & Why

SIAM Meknès (~April 21-27, 2026) is AgroGina's primary customer acquisition event. We have a medium booth (12-20m²), 2-4 people, targeting farmers (customers), partners/distributors, and investors.

The app needs to be demo-ready with a polished offline experience and realistic Moroccan farm data. Existing infrastructure already covers lead capture (`/rdv-siam` → `/rdv` with `RdvRequestPage`), the backend public-rdv module, i18n, and an enhance-demo-data seeder (14 tasks completed).

**What's missing** is SIAM-specific demo polish: a dedicated SIAM demo organization with richer data, a reliable offline fallback that survives hard reloads, a looping demo video player, and operational readiness (demo script, team roles, daily routines).

## Goals

1. **Demo readiness**: A dedicated "Domaine Toubkal" demo org (~320ha Meknès) with satellite data, calibration results, AgromindIA recommendations, and realistic Moroccan agriculture data
2. **Offline resilience**: App works fully offline at the booth — survives hard reload, browser cache clear, and fresh device — using the existing service worker infrastructure
3. **Video fallback**: A looping 2-min screen recording that plays on a second screen when the team is busy
4. **Operational readiness**: Demo script memorized, team roles assigned, daily SIAM routines established, print materials ordered

## Non-Goals

- No new lead capture system — `/rdv-siam` + HubSpot handles this (CEO decision)
- No new landing page — `/rdv?source=siam-2026` is the existing SIAM lead page
- No schema changes — all demo data fits existing tables
- No new API endpoints — demo data seeds through existing `POST /organizations/:orgId/demo-data/seed`

## Impact

- Sales demos go from "this might show..." to a fully alive demo with Moroccan data
- Zero risk of "demo not working" due to SIAM WiFi failures
- Team operates with a clear playbook, not ad-hoc

## Key Discovery: What Already Exists

| Capability | Status | Location |
|-----------|--------|----------|
| Lead capture form (SIAM) | ✅ Done | `(public)/rdv-siam.tsx` → `(public)/rdv.tsx` → `RdvRequestPage.tsx` |
| Backend RDV endpoint | ✅ Done | `agritech-api/src/modules/public-rdv/` |
| SIAM date slots | ✅ Done | Hardcoded April 20-27 in `RdvRequestPage.tsx` |
| i18n for RDV form | ✅ Done | `siamRdv.*` namespace in all 3 languages |
| Demo data seeder | ✅ Done | `agritech-api/src/modules/demo-data/demo-data.service.ts` (14 entity types enhanced) |
| Offline detection | ✅ Done | `OfflineIndicator`, `NetworkStatusProvider`, `useNetworkStatus` |
| Service worker infra | ✅ Done | `ServiceWorkerUpdate.tsx`, `main.tsx` registration |
| Marketing landing | ✅ Done | `LandingPage.tsx` with contact form, pricing, FAQ |
