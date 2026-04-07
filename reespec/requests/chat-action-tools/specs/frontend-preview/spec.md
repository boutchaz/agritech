# Spec: Frontend Preview Card

## Scenario: Preview card renders in chat

- **GIVEN** an assistant message contains a `json:action_preview` block
- **WHEN** the message is rendered
- **THEN** an `ActionPreviewCard` component is displayed with action type header, field/value pairs, and a "pending" visual indicator (amber border)

## Scenario: Preview card shows resolved names not UUIDs

- **GIVEN** preview_data contains `parcel_name: "B3 - Oliviers"`, `farm_name: "Farm Meknes"`
- **WHEN** the card renders
- **THEN** it shows human-readable names, not UUIDs

## Scenario: Preview card shows instruction text

- **GIVEN** a preview card is rendered
- **WHEN** the user sees it
- **THEN** the card footer shows: "Say 'confirme' to save or correct any detail" (translated)

## Scenario: Different action types show relevant fields

- **GIVEN** action_type is `record_harvest`
- **WHEN** card renders
- **THEN** it shows: Parcel, Quantity + Unit, Date, Quality Grade (if provided)

- **GIVEN** action_type is `create_task`
- **WHEN** card renders
- **THEN** it shows: Title, Parcel, Farm, Priority, Type, Due Date, Assigned To (if provided)

- **GIVEN** action_type is `record_stock_entry`
- **WHEN** card renders
- **THEN** it shows: Entry Type, Items (name + qty + unit each), Warehouse, Date

## Scenario: Recalibration warning on parcel events

- **GIVEN** action_type is `log_parcel_event` and `recalibrage_requis=true`
- **WHEN** card renders
- **THEN** a warning badge appears: "⚠️ Triggers recalibration"
