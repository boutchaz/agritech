# Tasks: tour-fix

## File under change

`project/src/contexts/TourContext.tsx`

---

### 1. Add disableBeacon: true to all tour steps

- [x] **RED** — Write `project/src/contexts/__tests__/TourContext.test.ts`: import `getTourDefinitions` (or extract the definitions for testing), assert that every step object across all tour definitions has `disableBeacon: true`. Run test → fails (62 steps lack it).
- [x] **ACTION** — In `getTourDefinitions()`, add `disableBeacon: true` to every step that doesn't already have it (62 steps across 12 tours: dashboard, farm-management, parcels, tasks, workers, inventory, accounting, satellite, reports, harvests, infrastructure, billing, settings). Exported `getTourDefinitions` for testability.
- [x] **GREEN** — Run test → all 65 steps have `disableBeacon: true`. Passes.

### 2. Filter out steps with missing DOM targets

- [x] **RED** — Wrote 4 tests for `filterStepsByDomPresence`: body always included, missing selectors excluded, existing selectors included, empty when all missing. Run → fails (function doesn't exist).
- [x] **ACTION** — Added exported `filterStepsByDomPresence()` function. Used it to compute `currentSteps` and `shouldRun` (false when no valid steps). `<Joyride run={shouldRun}>`.
- [x] **GREEN** — All 5 tests pass.

### 3. Enable overlay click dismiss

- [x] **RED** — Wrote test asserting `JOYRIDE_PROPS.disableOverlayClose` is `false`. Run → fails (not exported, was `true`).
- [x] **ACTION** — Added exported `JOYRIDE_PROPS` with `disableOverlayClose: false`. Used in `<Joyride />`. Added `ACTIONS.CLOSE` handler in callback to call `endTour()`.
- [x] **GREEN** — All 6 tests pass.

### 4. Add ESC key listener to dismiss tour

- [x] **RED** — Wrote 2 tests for `handleEscKey`: calls endTour on Escape, ignores other keys. Run → fails (function doesn't exist).
- [x] **ACTION** — Added exported `handleEscKey()` factory. Added `useEffect` in TourProvider that registers/cleans up keydown listener based on `tourState.isRunning`.
- [x] **GREEN** — All 8 tests pass.

### 5. Manual verification on deployed app

- [ ] **RED** — Check: visit `/infrastructure`, trigger the infrastructure tour from help button. Observe: black beacon dot appears and/or overlay locks the app.
- [ ] **ACTION** — Build and deploy (or run locally). Navigate to `/infrastructure`, trigger the tour.
- [ ] **GREEN** — Verify: no beacon dot, tooltip shows directly on existing elements, missing targets are skipped, clicking overlay or pressing ESC dismisses the tour. App remains usable at all times.

**Note:** TypeScript compiles clean (`tsc --noEmit`). All 8 new tests pass. 2 pre-existing test failures in Stock module (unrelated).
