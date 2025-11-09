-- =====================================================
-- Add missing reference columns to journal_entries table
-- =====================================================

-- Add reference_type and reference_id columns if they don't exist
DO $$
BEGIN
  -- Add reference_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'journal_entries'
    AND column_name = 'reference_type'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN reference_type VARCHAR(50);
  END IF;

  -- Add reference_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'journal_entries'
    AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN reference_id UUID;
  END IF;

  -- Rename description to remarks if description exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'journal_entries'
    AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'journal_entries'
    AND column_name = 'remarks'
  ) THEN
    ALTER TABLE journal_entries RENAME COLUMN description TO remarks;
  END IF;

  -- Add remarks column if it doesn't exist and description was already renamed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'journal_entries'
    AND column_name = 'remarks'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'journal_entries'
    AND column_name = 'description'
  ) THEN
    ALTER TABLE journal_entries ADD COLUMN remarks TEXT;
  END IF;
END $$;

-- Create index for reference columns if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);

COMMENT ON COLUMN journal_entries.reference_type IS 'Type of referenced entity (e.g., sales_invoice, purchase_invoice, utilities, customer_payment, supplier_payment)';
COMMENT ON COLUMN journal_entries.reference_id IS 'UUID of the referenced entity';
COMMENT ON COLUMN journal_entries.remarks IS 'Additional notes or remarks about the journal entry';
