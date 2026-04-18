# Brief: tour-fix

## Problem

The walkthrough/tour system (react-joyride) has three compounding bugs that make it actively harmful:

1. **Black dot beacon** — 62 of 65 tour steps render a cryptic black pulsing dot (Joyride beacon) instead of showing the tooltip directly. Users don't know what it is.
2. **Overlay lock on missing targets** — When a tour step targets a DOM element that doesn't exist (data still loading, empty state, element not on page), Joyride renders a dark semi-transparent overlay with no visible tooltip. The app becomes completely unusable.
3. **No escape hatch** — `disableOverlayClose: true` means there is no way to dismiss the overlay. No click-outside, no ESC key. The only option is refreshing the browser.

## Goal

Make the tour system reliable and non-destructive:

1. Remove all beacons — every step shows the tooltip immediately (`disableBeacon: true` on all steps).
2. Skip steps whose target element is not present in the DOM — tours only inform users about existing items.
3. Add escape hatches — `disableOverlayClose: false` (click overlay to dismiss) + ESC key listener to end the tour.

## Non-Goals

- Adding new tour steps or new tours
- Changing tour content/translations
- Modifying the TourHelpButton UI
- Backend tour-preferences changes
- Mobile tour support (already disabled)

## Impact

- Eliminates app-locking bug on every page with a tour
- Tours become a reliable onboarding tool instead of a trap
- Especially critical for Ahmed (no tech background) — a locked app with no escape is the worst possible first impression
