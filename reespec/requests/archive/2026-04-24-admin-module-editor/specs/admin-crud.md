# Spec: Admin Module CRUD

## List modules

GIVEN a system admin is authenticated
WHEN they call GET /api/v1/admin/modules
THEN they receive all modules with translations, ordered by display_order
AND each module includes navigation_items, dashboard_widgets, and all locale translations

## Get single module

GIVEN a system admin is authenticated
AND a module with id "abc" exists
WHEN they call GET /api/v1/admin/modules/abc
THEN they receive the full module with all translations

## Create module

GIVEN a system admin is authenticated
WHEN they POST /api/v1/admin/modules with {slug: "new-mod", category: "functional", ...}
THEN a new row is created in the modules table
AND the response includes the created module with id

## Create module — duplicate slug rejected

GIVEN a module with slug "compliance" exists
WHEN admin POSTs a module with slug "compliance"
THEN 409 Conflict is returned

## Update module

GIVEN a module with id "abc" exists
WHEN admin PATCHes /api/v1/admin/modules/abc with {price_monthly: 50, navigation_items: ["/new-route"]}
THEN the module row is updated
AND module-config cache is cleared

## Upsert translation

GIVEN a module with id "abc" exists
WHEN admin PUTs /api/v1/admin/modules/abc/translations/fr with {name: "Conformité", description: "..."}
THEN the module_translations row for (abc, fr) is upserted

## Soft delete module

GIVEN a module with id "abc" exists
WHEN admin DELETEs /api/v1/admin/modules/abc
THEN the module's is_available is set to false
AND the module still exists in the database

## Non-admin rejected

GIVEN a user with role "organization_admin" is authenticated
WHEN they call GET /api/v1/admin/modules
THEN 403 Forbidden is returned
