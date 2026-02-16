-- Migration: Add NIRv, EVI, PAR indices and update satellite_indices_data
-- Date: 2026-02-16
-- Description: 
--   1. Update satellite_indices_data CHECK constraint to include NIRv, EVI, and remove PRI
--   2. Create satellite_par_data table for PAR cache
--   3. Add RLS policies and triggers

-- 1. Handle existing PRI data (rename to avoid constraint violation)
UPDATE public.satellite_indices_data SET index_name = 'DEPRECATED_PRI' WHERE index_name = 'PRI';

-- 2. Drop and recreate the CHECK constraint on satellite_indices_data
ALTER TABLE public.satellite_indices_data DROP CONSTRAINT IF EXISTS satellite_indices_data_index_name_check;
ALTER TABLE public.satellite_indices_data ADD CONSTRAINT satellite_indices_data_index_name_check 
  CHECK (index_name IN ('NDVI', 'NDRE', 'NDMI', 'MNDWI', 'GCI', 'SAVI', 'OSAVI', 'MSAVI2', 'NIRv', 'EVI', 'MSI', 'MCARI', 'TCARI'));

-- 3. Clean up deprecated PRI data
DELETE FROM public.satellite_indices_data WHERE index_name = 'DEPRECATED_PRI';

-- 4. Create the PAR cache table
CREATE TABLE IF NOT EXISTS public.satellite_par_data (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    latitude numeric(9,2) NOT NULL,
    longitude numeric(9,2) NOT NULL,
    date date NOT NULL,
    par_value numeric(12,4) NOT NULL,
    source text DEFAULT 'open-meteo-archive',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(latitude, longitude, date)
);

-- 5. Create indexes for PAR table
CREATE INDEX IF NOT EXISTS idx_satellite_par_data_date ON public.satellite_par_data(date);
CREATE INDEX IF NOT EXISTS idx_satellite_par_data_location ON public.satellite_par_data(latitude, longitude);

-- 6. Enable RLS
ALTER TABLE public.satellite_par_data ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies — READ for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view PAR cache" ON public.satellite_par_data;
CREATE POLICY "Authenticated users can view PAR cache" ON public.satellite_par_data
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- 8. Updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.satellite_par_data;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.satellite_par_data 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
