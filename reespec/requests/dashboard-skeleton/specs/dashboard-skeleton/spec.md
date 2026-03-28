# Spec: Dashboard Skeleton Loading

## Capability: Page-level skeleton replaces spinner

### Scenario: Dashboard renders skeleton shell before org context loads

- **GIVEN** the user navigates to `/dashboard` and `currentOrganization` is null (auth still loading)
- **WHEN** the page renders
- **THEN** a skeleton shell is displayed with:
  - A header area with skeleton breadcrumbs, title, and subtitle placeholders
  - Row 1: 4 skeleton cards in a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
  - Row 2: 2 skeleton cards in a responsive grid (`grid-cols-1 lg:grid-cols-2`)
  - Row 3: 2 skeleton cards in a responsive grid (`grid-cols-1 lg:grid-cols-2`)
- **AND** no spinning loader is visible
- **AND** the layout structure matches the real dashboard grid exactly

### Scenario: Skeleton transitions to real content without layout shift

- **GIVEN** the dashboard is showing the skeleton shell
- **WHEN** `currentOrganization` becomes available
- **THEN** the skeleton is replaced by the real dashboard (header + widget grid)
- **AND** the grid structure is identical, so no visible layout jump occurs

## Capability: Farm widget uses skeleton instead of '…' text

### Scenario: Farm widget shows skeletons while dashboard summary loads

- **GIVEN** the dashboard has loaded and the farm widget is visible
- **WHEN** `dashboardLoading` is true
- **THEN** the three stat values (parcels, surface, analyses) show `<Skeleton>` elements instead of '…' text
- **AND** the skeleton elements match the size/position of the final numeric values
