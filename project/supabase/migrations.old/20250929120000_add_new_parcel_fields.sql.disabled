-- Add new parcel fields per request
-- variety (text), planting_date (date), planting_type (enum-like constrained text)

BEGIN;

ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS variety text,
  ADD COLUMN IF NOT EXISTS planting_date date,
  ADD COLUMN IF NOT EXISTS planting_type text CHECK (planting_type IN ('traditional', 'intensive', 'super_intensive', 'organic'));

-- Ensure PostgREST picks up the column immediately after adding it
NOTIFY pgrst, 'reload schema';

COMMIT;


