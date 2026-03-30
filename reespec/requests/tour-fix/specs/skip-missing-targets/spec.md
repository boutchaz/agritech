# Spec: Skip missing targets

Tour steps whose target element is not in the DOM should be excluded.

## Scenarios

### Step with existing target is included

- **GIVEN** a tour step targeting `[data-tour="infrastructure-list"]`
- **WHEN** the element `[data-tour="infrastructure-list"]` exists in the DOM
- **THEN** the step is included in the active tour steps

### Step with missing target is skipped

- **GIVEN** a tour step targeting `[data-tour="infrastructure-add"]`
- **WHEN** the element `[data-tour="infrastructure-add"]` does NOT exist in the DOM
- **THEN** the step is excluded from the active tour steps

### Body-targeted steps always included

- **GIVEN** a tour step targeting `'body'`
- **WHEN** the tour is active
- **THEN** the step is always included (body always exists)

### All targets missing — tour does not run

- **GIVEN** a tour where no step targets exist in the DOM
- **WHEN** the tour is started
- **THEN** Joyride `run` is false (tour does not activate)
- **AND** no overlay appears
