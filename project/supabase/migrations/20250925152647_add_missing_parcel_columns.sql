-- Add missing columns to parcels table to match schema.sql
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS soil_type text,
  ADD COLUMN IF NOT EXISTS irrigation_type text CHECK (irrigation_type IN ('drip', 'sprinkler', 'flood', 'none')),
  ADD COLUMN IF NOT EXISTS planting_density numeric,
  ADD COLUMN IF NOT EXISTS perimeter numeric,
  ADD COLUMN IF NOT EXISTS calculated_area numeric;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
