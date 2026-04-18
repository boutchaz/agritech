# Spec: Stock Movements & Inventory Batches

## Capability
After seeding, stock_movements and inventory_batches are populated with real FK connections.

### Scenario: Stock movements reference real items, warehouses, and stock entries
- **GIVEN** demo data has been seeded
- **WHEN** querying `stock_movements` joined with `items` and `warehouses`
- **THEN** at least 5 movements exist. Each has a valid `item_id` → existing item, `warehouse_id` → existing warehouse. At least 1 movement has `stock_entry_id` → existing stock entry. Movement types include at least 'IN' and 'OUT'. `movement_date` spans multiple weeks.

### Scenario: Inventory batches reference real items, suppliers, and purchase orders
- **GIVEN** demo data has been seeded
- **WHEN** querying `inventory_batches` joined with `items` and `suppliers`
- **THEN** at least 3 batches exist. Each has valid `item_id` → existing item. At least 1 batch has `supplier_id` → existing supplier. At least 1 batch has `purchase_order_id` → existing PO. Batches have realistic `batch_number`, `received_date`, `expiry_date` (for perishables).
