-- Comprehensive migration to replace all inventory_items references with items table
-- This updates all foreign keys to point to the new items table

-- 1. inventory_batches
ALTER TABLE inventory_batches
  DROP CONSTRAINT IF EXISTS inventory_batches_item_id_fkey;

ALTER TABLE inventory_batches
  ADD CONSTRAINT inventory_batches_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- 2. inventory_serial_numbers
ALTER TABLE inventory_serial_numbers
  DROP CONSTRAINT IF EXISTS inventory_serial_numbers_item_id_fkey;

ALTER TABLE inventory_serial_numbers
  ADD CONSTRAINT inventory_serial_numbers_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- 3. stock_movements
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_item_id_fkey;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- 4. stock_valuation
ALTER TABLE stock_valuation
  DROP CONSTRAINT IF EXISTS stock_valuation_item_id_fkey;

ALTER TABLE stock_valuation
  ADD CONSTRAINT stock_valuation_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- 5. opening_stock_balances
ALTER TABLE opening_stock_balances
  DROP CONSTRAINT IF EXISTS opening_stock_balances_item_id_fkey;

ALTER TABLE opening_stock_balances
  ADD CONSTRAINT opening_stock_balances_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- 6. stock_closing_items
ALTER TABLE stock_closing_items
  DROP CONSTRAINT IF EXISTS stock_closing_items_item_id_fkey;

ALTER TABLE stock_closing_items
  ADD CONSTRAINT stock_closing_items_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- Note: inventory_items table is now deprecated
-- All new development should use the items table
-- Consider migrating any data from inventory_items to items if needed
