# Design: SIAM 2026 Preparation

## Approach

Three dev tasks, each independently deployable. The lead capture, landing page, and base demo data seeder already exist — we extend, not build from scratch.

## Key Decisions

### D1: Extend existing demo-data service, not a new script

The existing `demo-data.service.ts` (10K+ lines, 37 entity types) already seeds rich data via `POST /organizations/:orgId/demo-data/seed`. Rather than creating a standalone `scripts/seed-siam-demo.ts`, we add a `seedSiamDemoData()` method to the existing service. This reuses all FK wiring, return-type patterns, and clear/stats/export coverage established in the `enhance-demo-data` request.

**Why**: The existing seeder handles idempotency, FK chains, stats, clear, export/import. A separate script would duplicate all of this.

### D2: Offline via service worker + TanStack Query cache, not static JSON files

Static JSON files in `/public/demo-data/` cannot survive a hard reload offline — the SPA shell itself (JS, HTML) wouldn't load without network. The project already has service worker infrastructure (`ServiceWorkerUpdate.tsx`, SW registration in `main.tsx`).

**Approach**: Ensure the service worker is configured to precache the app shell (HTML, JS, CSS) and the TanStack Query `staleTime` is aggressive enough that the cached data survives a reload. The existing `useNetworkStatus` hook already detects offline state.

**Offline flow**:
1. App is loaded once online (normal usage or before SIAM)
2. Service worker caches the app shell
3. TanStack Query cache persists in memory for the session
4. On hard reload offline → service worker serves cached shell → app bootstraps from query cache
5. `OfflineIndicator` shows status

**Alternative rejected**: Static JSON files. As Momus noted, this is contradictory — a hard reload offline can't serve `/public/demo-data/*.json` if the SPA shell itself isn't cached.

### D3: Video player as simple HTML page, not a React route

The looping video player runs on a second screen at the booth. It doesn't need auth, routing, or React — just a fullscreen `<video>` with loop and autoplay. A standalone HTML file opened directly in the browser is simpler and more reliable.

### D4: QR code points to existing `/rdv-siam` route

The route `(public)/rdv-siam.tsx` already exists and redirects to `/rdv?source=siam-2026`. The `RdvRequestPage` has the full form with SIAM dates (April 20-27), crop selection, region selection, and submits to `POST /api/v1/public/rdv/siam`. No new landing page needed.

## Task Breakdown

### Task 1: SIAM demo data enrichment (backend)

Add `seedSiamDemoData(organizationId, userId)` to `demo-data.service.ts`. Called from a new endpoint or triggered manually before SIAM. Creates a Meknès-region org with:
- 3 farms (olive, citrus, cereals) — 320ha total
- 15-20 parcels with real Meknès coordinates
- Calibration data (all 8 steps) for 5+ parcels
- AgromindIA recommendations in French (Level 1)
- Harvest records (2-3 years), analyses, tasks, workers

Uses the same FK wiring pattern as existing methods.

### Task 2: Offline demo reliability (frontend)

Ensure the service worker precaches the app shell. Verify TanStack Query `staleTime` settings are aggressive enough. Test the full offline flow: load online → go offline → hard reload → app works.

### Task 3: Looping video player + operational docs

Standalone HTML page for the second screen. Demo script, team roles, and daily routine as markdown docs.

## Risks

| Risk | Mitigation |
|------|-----------|
| Service worker doesn't precache enough | Test on a fresh device before SIAM; fallback: keep the app tab open (don't close/reload) |
| Demo data FK chain breaks | Reuse existing method patterns with `if (!parent?.id) return` guards |
| SIAM dates wrong in RdvRequestPage | Verify hardcoded dates match actual SIAM 2026 dates |
| TanStack Query cache evicted on reload | SW caches shell; cache survives same-session; document the "load once" procedure |

## Tradeoffs

- **Extending existing service vs new script**: Adds code to an already large file (10K+ lines) but avoids duplicating FK wiring and stats/clear coverage. Future refactor to `seeds/` dir can happen later.
- **Service worker approach vs simpler "just don't reload"**: SW requires more testing but gives real offline resilience. The simpler approach (keep tab open) is the fallback procedure documented for the team.
