# Spec: Beacon removal

All tour steps must show tooltips directly without a beacon dot.

## Scenarios

### All steps have disableBeacon

- **GIVEN** the tour definitions in `getTourDefinitions()`
- **WHEN** any tour is started
- **THEN** every step object has `disableBeacon: true`
- **AND** no pulsing beacon dot appears before the tooltip
