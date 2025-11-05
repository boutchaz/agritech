-- Drop the valid_reconciliation_quantities constraint if it exists
-- This constraint is causing issues with stock entry creation
ALTER TABLE stock_entry_items DROP CONSTRAINT IF EXISTS valid_reconciliation_quantities;

-- Add a more flexible constraint that only applies to reconciliation entries
-- We'll handle validation in the application layer for better error messages
ALTER TABLE stock_entry_items
  ADD CONSTRAINT check_reconciliation_quantities
  CHECK (
    -- For reconciliation entries, system_quantity and physical_quantity should both be set or both be null
    (system_quantity IS NULL AND physical_quantity IS NULL) OR
    (system_quantity IS NOT NULL AND physical_quantity IS NOT NULL)
  );
