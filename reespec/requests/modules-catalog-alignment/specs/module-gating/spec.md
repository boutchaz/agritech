# Spec — Module Gating (route + UI)

## GIVEN an org with core active and agromind_advisor inactive

### Scenario: /dashboard is allowed
- **WHEN** `isNavigationEnabled('/dashboard')` is called
- **THEN** it returns `true`

### Scenario: /parcels is allowed
- **WHEN** `isNavigationEnabled('/parcels')` is called
- **THEN** it returns `true`

### Scenario: /parcels/abc is allowed (fallback to core)
- **WHEN** `isNavigationEnabled('/parcels/abc-123-uuid')` is called
- **THEN** it returns `true` (longest match is `/parcels` owned by `core`)

### Scenario: /parcels/abc/ai is blocked
- **WHEN** `isNavigationEnabled('/parcels/abc-123-uuid/ai')` is called
- **THEN** it returns `false` (longest match is `/parcels/:id/ai` owned by `agromind_advisor` which is inactive)

### Scenario: /parcels/abc/ai/diagnostics is blocked
- **WHEN** `isNavigationEnabled('/parcels/abc-123-uuid/ai/diagnostics')` is called
- **THEN** it returns `false`

## GIVEN an org with core + agromind_advisor both active

### Scenario: /parcels/abc/ai is allowed
- **WHEN** `isNavigationEnabled('/parcels/abc-123-uuid/ai')` is called
- **THEN** it returns `true`

### Scenario: /parcels/abc/ai/diagnostics is allowed
- **WHEN** `isNavigationEnabled('/parcels/abc-123-uuid/ai/diagnostics')` is called
- **THEN** it returns `true`

## GIVEN an org with only core active

### Scenario: /marketplace is blocked
- **WHEN** `isNavigationEnabled('/marketplace/quote-requests/received')` is called
- **THEN** it returns `false` (longest match is `/marketplace` owned by `marketplace` which is inactive; no shorter match exists)

### Scenario: unknown path is blocked
- **WHEN** `isNavigationEnabled('/nonexistent-route')` is called
- **THEN** it returns `false` (no nav_item prefixes it)

## UI-level hook

### Scenario: useIsModuleActive returns true for active module
- **GIVEN** an org where `useModuleBasedDashboard().activeModules` contains `'agromind_advisor'`
- **WHEN** `useIsModuleActive('agromind_advisor')` is called
- **THEN** it returns `true`

### Scenario: useIsModuleActive returns false for inactive module
- **GIVEN** an org where `activeModules` does NOT contain `'marketplace'`
- **WHEN** `useIsModuleActive('marketplace')` is called
- **THEN** it returns `false`

### Scenario: useIsModuleActive fails closed during loading
- **GIVEN** `useModuleBasedDashboard().isLoading === true`
- **WHEN** `useIsModuleActive('agromind_advisor')` is called
- **THEN** it returns `false`

## ModuleGate component

### Scenario: route within inactive module shows disabled page
- **GIVEN** the user navigates to `/marketplace/quote-requests/received`
- **AND** the org does not have `marketplace` active
- **WHEN** `ModuleGate` renders the route
- **THEN** the page shows "Module non activé" text (i18n key `modules.disabled.title`)
- **AND** does NOT render the inner page content

### Scenario: route within active module renders children
- **GIVEN** the user navigates to `/compliance`
- **AND** the org has `compliance` active
- **WHEN** `ModuleGate` renders the route
- **THEN** the inner page content renders
- **AND** no "Module non activé" text appears

### Scenario: alwaysAllowed hardcode is removed
- **GIVEN** the source code of `project/src/components/authorization/ModuleGate.tsx`
- **WHEN** I grep for `alwaysAllowed`
- **THEN** there are zero matches
