-- Add missing columns to parcels table to match schema.sql
-- Only run if parcels table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parcels') THEN
    ALTER TABLE public.parcels
      ADD COLUMN IF NOT EXISTS soil_type text,
      ADD COLUMN IF NOT EXISTS irrigation_type text CHECK (irrigation_type IN ('drip', 'sprinkler', 'flood', 'none')),
      ADD COLUMN IF NOT EXISTS planting_density numeric,
      ADD COLUMN IF NOT EXISTS perimeter numeric,
      ADD COLUMN IF NOT EXISTS calculated_area numeric;
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
