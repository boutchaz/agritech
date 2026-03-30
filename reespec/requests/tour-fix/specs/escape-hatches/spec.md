# Spec: Escape hatches

Users must always be able to dismiss a tour.

## Scenarios

### Overlay click dismisses tour

- **GIVEN** a tour is running with the overlay visible
- **WHEN** the user clicks the dark overlay
- **THEN** the tour ends and the overlay disappears
- **AND** the app is fully interactive again

### ESC key dismisses tour

- **GIVEN** a tour is running
- **WHEN** the user presses the Escape key
- **THEN** the tour ends and the overlay disappears
- **AND** the app is fully interactive again

### ESC listener cleaned up

- **GIVEN** no tour is running
- **WHEN** the user presses the Escape key
- **THEN** nothing happens (no dangling event listener)
