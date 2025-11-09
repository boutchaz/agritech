-- Add trigger to automatically update total_debit and total_credit on journal_entries
-- when journal_items are inserted, updated, or deleted

CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the journal entry totals by summing the journal items
  UPDATE journal_entries
  SET
    total_debit = COALESCE((
      SELECT SUM(debit)
      FROM journal_items
      WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
    ), 0),
    total_credit = COALESCE((
      SELECT SUM(credit)
      FROM journal_items
      WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
    ), 0)
  WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_journal_entry_totals ON journal_items;

-- Create trigger for INSERT, UPDATE, DELETE on journal_items
CREATE TRIGGER trigger_update_journal_entry_totals
AFTER INSERT OR UPDATE OR DELETE ON journal_items
FOR EACH ROW
EXECUTE FUNCTION update_journal_entry_totals();

-- Backfill existing journal entries with correct totals
UPDATE journal_entries je
SET
  total_debit = COALESCE((
    SELECT SUM(debit)
    FROM journal_items
    WHERE journal_entry_id = je.id
  ), 0),
  total_credit = COALESCE((
    SELECT SUM(credit)
    FROM journal_items
    WHERE journal_entry_id = je.id
  ), 0);
