-- Link utilities to accounting journal entries
-- Adds journal_entry_id column for traceability and cleanup

ALTER TABLE public.utilities
ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_utilities_journal_entry
  ON public.utilities(journal_entry_id)
  WHERE journal_entry_id IS NOT NULL;
