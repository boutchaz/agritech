# Spec: Dynamic Route Gating

## ModuleGate uses DB-driven routes

GIVEN module "compliance" has navigation_items ["/compliance", "/compliance/certifications"]
AND the org has "compliance" module active
WHEN user navigates to /compliance
THEN the page renders normally

## ModuleGate blocks disabled module route

GIVEN module "compliance" has navigation_items ["/compliance"]
AND the org does NOT have "compliance" module active
WHEN user navigates to /compliance
THEN "Module non activé" page is shown

## Sidebar hides items for disabled modules

GIVEN module "marketplace" has navigation_items ["/marketplace"]
AND the org does NOT have "marketplace" module active
WHEN sidebar renders
THEN marketplace nav section is not visible

## Fallback when no navigation_items configured

GIVEN no modules have any navigation_items configured
WHEN user navigates to any route
THEN all routes are accessible (permissive fallback)
AND sidebar shows all sections

## Admin adds route to module — takes effect without deploy

GIVEN admin adds "/new-feature" to module "compliance" navigation_items
AND admin saves + cache is cleared
WHEN a user with compliance module active navigates to /new-feature
THEN the route is accessible
AND when a user WITHOUT compliance module navigates to /new-feature
THEN "Module non activé" is shown
