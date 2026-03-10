-- Add missing updated_at columns to stock_movements and stock_valuation tables
-- These tables had BEFORE UPDATE triggers (trg_stock_movements_updated_at, trg_stock_valuation_updated_at)
-- that call update_updated_at_column() which sets NEW.updated_at = NOW(),
-- but the tables were missing the updated_at column, causing:
--   'record "new" has no field "updated_at"'
-- on any UPDATE (e.g., stock transfers, material issues, reconciliation).

-- Add updated_at to stock_movements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stock_movements'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE stock_movements ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Add updated_at to stock_valuation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stock_valuation'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE stock_valuation ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Backfill existing rows: set updated_at = created_at for rows that had NULL
UPDATE stock_movements SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE stock_valuation SET updated_at = created_at WHERE updated_at IS NULL;