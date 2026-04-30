# Offline-First — What's Left

## Status snapshot

**Shipped on `develop`** (6 commits, top → `fa6c9407`):
- P1 foundation: Dexie outbox, IDB query persister (7d), leader election (BroadcastChannel), `/auth/ping` heartbeat, storage-quota guard, photo queue (compress + SHA-256), wipe-on-logout, telemetry hooks, dead-letter queue + review UI, offline banner, legacy-queue migration shim.
- P2 backend safety: schema cols (`client_id`, `version`, `client_created_at`) + bump trigger on tasks / task_comments / work_records / stock_entries / stock_entry_items / harvest_records / pest_disease_reports; `file_registry.content_sha256` dedupe; global `OfflineInterceptor` (idempotency + optimistic-lock); `/auth/ping`; JWT 1h + refresh 30d documented; `ConflictDialog` component; 4 jest specs.
- P3 hooks: `useCreateTask` / `useUpdateTask` / `useCreateStockEntry` / `useUpdateStockEntry` / `useCreateHarvest` / `useUpdateHarvest` / `useCreatePestReport` route through `runOrQueue` with `_pending` optimistic stubs.
- P3 backend: `POST /sync/flush` bulk drain (≤500 items/req, topo-sort by `deps`, per-item savepoints via in-process HTTP).
- Schema-fix: pre-existing `bank_transactions ⇄ accounting_payments` ordering, `is_organization_member()` early definition, TG_OP-in-WHEN trigger split.

**Verified now**:
- `pnpm build` (project) — EXIT 0
- `pnpm build` (agritech-api) — EXIT 0
- `pnpm db:reset` — applies clean
- `pnpm vitest run src/lib/offline` — 8/8 green
- Schema introspection: `accounting_payments`, `bank_transactions`, and offline cols on every targeted table — present.

---

## Remaining work

### P3 finish (1–2 days)
The infrastructure is in place; these are integration callsites.

- **Mutation hooks not yet on the outbox** — still direct API:
  - `useDeleteTask`, `useAssignTask`, `useStartTask`, `useCompleteTask`, `useCompleteWithHarvest`
  - `useAddTaskComment`, `useUpdateTaskComment`, `useResolveTaskComment`
  - `useClockIn` / `useClockOut` (currently on legacy `lib/offlineTaskQueue` — works offline today; migrate to Dexie outbox to unify and drop the localStorage path)
  - `usePostStockEntry`, `useCancelStockEntry`, `useReverseStockEntry`
  - `useDeleteHarvest`, `useSellHarvest`
  - `useUpdatePestReport` (status transitions)
  - Pattern: copy from `useCreateTask` — generate `clientId`, call `runOrQueue`, return `_pending` stub.

- **ConflictDialog auto-mount**: today the component exists but is not surfaced. Add a Zustand store `conflictStore` (`{open, resourceLabel, mine, server, resolve}`); `runOrQueue` / executor pushes a conflict event; mount once at app root listening to the store. Currently 409s only surface as outbox `failed` rows in the dead-letter UI.

- **Photo capture forms** — `enqueuePhoto()` is built, never called. Wire into:
  - `TaskComment` form (photo on completion)
  - Pest report form (already accepts `photo_urls`)
  - Harvest record form (proof photo)
  - Pattern: on offline, `enqueuePhoto({parentResource, parentClientId, fieldName, file})` then submit parent without `photo_urls`; runtime uploads on flush, PATCHes parent with returned URL.

- **Update DTOs version field** — backend `Update*Dto` for stock-entry / harvest / pest-report still missing the optional `version` field; without it, frontend `If-Match` headers go unverified by the interceptor (it reads version from header anyway — so the dialog path works — but DTO completeness is needed for Swagger consumers).

- **`/sync/flush` integration** — the endpoint exists but the frontend outbox flush still iterates per-item via `apiExecutor`. Add a "batch mode" that, when ≥10 pending items, posts to `/sync/flush` once and consumes per-item results.

### P3 tests (1 day)
- **Frontend Playwright offline**: `tests/e2e/offline.spec.ts` using `context.setOffline(true)`. Cover: create task → reconnect → row syncs; 2-tab edit → 409 + dialog; hard reload offline → tasks list renders from cache; 500 queued items → bulk flush < 30s; logout wipes IDB.
- **Backend integration**: spin up Postgres test DB, run real migration, assert (a) idempotent POST replays single row, (b) stale `If-Match` returns 409 with current row body, (c) `file_registry` SHA dedupe returns existing URL, (d) `/sync/flush` 500-item mixed batch returns ok/conflict/error per item without aborting.

### P4 production-readiness (3–5 days)
- **Telemetry dashboards** in PostHog: gauges already emitted (`outbox_depth`, `outbox_oldest_age_seconds`, `flush_duration_ms`, `conflict_count`, `dead_letter_count`, `storage_ratio`). Add alert: `outbox_oldest_age_seconds p95 > 24h` → page on-call; `dead_letter_count_24h > 0` → ticket; `conflict_rate > 5%` → review; `flush_duration_ms p95 > 10s` → investigate.
- **Feature flag `offline_v1`**: gate `initOfflineRuntime()` + persister behind a PostHog flag so rollout is staged (10% → 50% → 100%).
- **k6 load test**: 100 concurrent devices each flushing 50-item batch → assert p95 < 3s, no 5xx.
- **7-day farm smoke test**: build PWA, install on 2 Android devices, airplane-mode walkthrough of full task → harvest → stock → photo → comment → reconnect over 7 consecutive days at one Karim-persona farm.
- **Rollback path**: settings UI button "Reset offline cache" → `wipeOffline({scope: 'all'})`.

### Non-goals (do not pursue without CEO approval)
- IDB-at-rest encryption (defer to regulatory ask).
- CRDT merging (LWW + dialog is the chosen model).
- iOS PWA parity — Safari throttles IDB + Background Sync; document as known degraded experience.
- Full-text offline search.

---

## Critical files (for the next session)

**Frontend hooks to migrate**: `project/src/hooks/useTasks.ts` (delete/assign/start/complete/comments/clock), `useStockEntries.ts` (post/cancel/reverse), `useHarvests.ts` (delete/sell), `usePestAlerts.ts` (status update).

**New files needed**:
- `project/src/stores/conflictStore.ts` — Zustand for conflict dialog
- `project/src/components/ConflictDialogHost.tsx` — listens to store, mounts dialog at app root
- `project/tests/e2e/offline.spec.ts` — Playwright suite
- `agritech-api/test/integration/offline.spec.ts` — Postgres-backed integration tests
- `project/src/lib/offline/batchFlush.ts` — switch between per-item and `/sync/flush` based on queue depth

**Integration sites for photoQueue**:
- Task completion form (`project/src/components/Tasks/...`)
- Pest report form (`project/src/components/PestAlerts/...`)
- Harvest form (`project/src/components/Harvest/...`)

**DTOs to extend**:
- `agritech-api/src/modules/stock-entries/dto/update-stock-entry.dto.ts` — add `version`
- `agritech-api/src/modules/harvests/dto/update-harvest.dto.ts` — add `version`
- `agritech-api/src/modules/pest-alerts/dto/update-pest-report.dto.ts` — add `version`

---

## Verification gate before declaring done

- [ ] All build commands return EXIT 0 (already true today)
- [ ] All hooks use the outbox or are explicitly documented as not-applicable
- [ ] ConflictDialog auto-shows on 409
- [ ] Photo capture works offline end-to-end on real Android device
- [ ] Playwright offline suite green in CI
- [ ] PostHog dashboard shows all 6 gauges
- [ ] One full week of telemetry from a flagged 10% cohort with no `dead_letter_count_24h > 0` paged
- [ ] CEO has signed off on flag ramp to 100%
