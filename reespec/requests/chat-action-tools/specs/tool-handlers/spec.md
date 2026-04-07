# Spec: Tool Handlers

## Scenario: create_task preview resolves entity names

- **GIVEN** context contains parcel B3 (id=xxx, farm_id=yyy) and worker Ahmed Benali (id=zzz)
- **WHEN** AI calls `create_task` with `mode=preview`, `parcel_id=xxx`, `assigned_to=zzz`
- **THEN** preview_data includes `parcel_name: "B3"`, `farm_name: "Farm Meknes"`, `worker_name: "Ahmed Benali"`
- **AND** a pending action is stored

## Scenario: create_task execute calls TasksService.create

- **GIVEN** a pending action for `create_task` exists with valid parameters
- **WHEN** AI calls `confirm_pending_action`
- **THEN** `TasksService.create(userId, organizationId, dto)` is called with the stored parameters mapped to `CreateTaskDto`
- **AND** the result includes the created task ID

## Scenario: record_harvest preview with defaults

- **GIVEN** user says "3 tonnes d'olives B3" (no date, no quality)
- **WHEN** AI calls `record_harvest` with `mode=preview`, `parcel_id=xxx`, `quantity=3`, `unit=tons`
- **THEN** preview_data defaults `harvest_date` to today
- **AND** `quality_grade` is shown as "Not specified"

## Scenario: record_harvest execute calls HarvestService.create

- **GIVEN** a pending action for `record_harvest` exists
- **WHEN** confirmed
- **THEN** `HarvestService.create(userId, organizationId, dto)` is called
- **AND** farm_id is resolved from parcel's farm_id if not explicitly provided

## Scenario: record_product_application validates product exists

- **GIVEN** AI calls `record_product_application` with a `product_id`
- **WHEN** the product does not exist in the org's inventory
- **THEN** preview returns `{ success: false, error: "Product not found" }`
- **AND** no pending action is created

## Scenario: log_parcel_event with recalibration trigger

- **GIVEN** user reports a disease on parcel B3
- **WHEN** AI calls `log_parcel_event` with `type=disease`, `recalibrage_requis=true`
- **THEN** preview card shows a warning: "⚠️ This will trigger a partial recalibration"
- **AND** on confirm, `ParcelEventsService.createEvent` is called which triggers recalibration

## Scenario: record_stock_entry for material receipt

- **GIVEN** user says "Reçu 500kg d'engrais NPK au magasin principal"
- **WHEN** AI calls `record_stock_entry` with `entry_type=Material Receipt`, `items=[{item_id, quantity: 500, unit: 'kg'}]`, `to_warehouse_id=xxx`
- **THEN** preview shows item name, warehouse name, quantity
- **AND** on confirm, `StockEntriesService.createStockEntry(dto)` is called

## Scenario: assign_task_worker validates task exists

- **GIVEN** AI calls `assign_task_worker` with a `task_id`
- **WHEN** the task does not exist or belongs to a different org
- **THEN** preview returns `{ success: false, error: "Task not found" }`

## Scenario: complete_task validates task is in completable state

- **GIVEN** AI calls `complete_task` with a `task_id`
- **WHEN** the task status is already `completed`
- **THEN** preview returns `{ success: false, error: "Task is already completed" }`

## Scenario: CASL blocks unauthorized action

- **GIVEN** a user with role `viewer` (no create permissions)
- **WHEN** AI calls any write tool
- **THEN** the tool returns `{ success: false, error: "Permission denied" }`
- **AND** no pending action is created
