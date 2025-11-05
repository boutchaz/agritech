-- Fix stock_entry_items to reference the correct items table
-- The foreign key was pointing to inventory_items but should point to items

-- Drop the old foreign key constraint
ALTER TABLE stock_entry_items
  DROP CONSTRAINT IF EXISTS stock_entry_items_item_id_fkey;

-- Add the correct foreign key constraint to items table
ALTER TABLE stock_entry_items
  ADD CONSTRAINT stock_entry_items_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
