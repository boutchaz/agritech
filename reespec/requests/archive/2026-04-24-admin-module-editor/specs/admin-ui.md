# Spec: Admin UI — Module Editor Page

## Page loads with module list

GIVEN system admin navigates to /modules in admin-app
THEN a table shows all modules with columns: Order, Slug, Name, Category, Price, Plan, Active
AND modules are sorted by display_order

## Create new module via dialog

GIVEN admin clicks "Nouveau Module"
WHEN they fill slug, category, price and submit
THEN module appears in the table
AND a success toast is shown

## Edit module via dialog

GIVEN admin clicks edit on a module row
WHEN the edit dialog opens
THEN it shows 3 tabs: General, Routes & Widgets, Translations
AND General tab shows: slug, icon, color, category, display_order, price_monthly, required_plan, is_required, is_recommended, is_addon_eligible
AND Routes & Widgets tab shows editable lists for navigation_items and dashboard_widgets
AND Translations tab shows name + description + features for each locale (fr, en, ar)

## Edit navigation_items

GIVEN admin is on Routes & Widgets tab
WHEN they add "/new-route" to the routes list and save
THEN the module's navigation_items in DB includes "/new-route"

## Edit translations

GIVEN admin is on Translations tab
WHEN they change the French name to "Nouveau nom" and save
THEN module_translations row for (module_id, 'fr') has name = "Nouveau nom"

## Toggle module availability

GIVEN admin clicks the availability toggle on a module row
THEN module's is_available flips
AND the change is reflected immediately in the table
