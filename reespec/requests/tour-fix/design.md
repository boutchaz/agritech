# Design: tour-fix

## Approach

All changes are in `project/src/contexts/TourContext.tsx`. No new files, no backend changes.

### 1. Disable all beacons

Add `disableBeacon: true` to every step in `getTourDefinitions()`. 65 steps across 15 tours. The 3 steps that already have it are unaffected.

### 2. Filter out steps with missing targets

Before passing steps to `<Joyride />`, filter them to only include steps whose `target` selector matches an element currently in the DOM. Steps targeting `'body'` always pass (they're center-positioned modals).

Strategy: compute `currentSteps` by filtering `tourDefinitions[currentTour]` through `document.querySelector(step.target)`. This runs on each render when a tour is active — cheap since it's at most ~15 querySelectorAll calls.

If all steps are filtered out (no targets exist), don't run the tour at all.

### 3. Escape hatches

- Set `disableOverlayClose: false` in the `<Joyride />` props — clicking the overlay dismisses the tour.
- Add a `keydown` listener for `Escape` that calls `endTour()` when a tour is running. Add/remove the listener based on `tourState.isRunning`.
- Handle Joyride's `EVENTS.OVERLAY` callback to properly end the tour when overlay is clicked.

## Risks

- **Step filtering timing**: If data loads AFTER the tour starts and new targets appear, those steps won't be included. Acceptable — the tour shows what's available at activation time. User can restart the tour later.
- **All steps filtered**: If a tour is started but zero targets exist, the tour silently doesn't run. Better than locking the UI.

## Rejected alternatives

- **Wait for targets to appear (polling/MutationObserver)**: Over-engineered. Rural Morocco on 3G — if data hasn't loaded, the user shouldn't be stuck waiting for a tour step. Skip and move on.
- **Disable tours entirely**: Tours are valuable for onboarding. Fix them, don't remove them.
