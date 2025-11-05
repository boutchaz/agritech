-- Drop the check_reconciliation_quantities constraint entirely
-- We'll handle validation at the application layer for better error messages and flexibility
ALTER TABLE stock_entry_items DROP CONSTRAINT IF EXISTS check_reconciliation_quantities;
