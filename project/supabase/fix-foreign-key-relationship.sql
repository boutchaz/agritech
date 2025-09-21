-- =====================================================
-- FIX FOREIGN KEY RELATIONSHIP
-- =====================================================
-- This script fixes the foreign key relationship between soil_analyses and parcels

-- First, check if the foreign key constraint exists
-- If it doesn't exist, add it
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'soil_analyses_parcel_id_fkey' 
        AND table_name = 'soil_analyses'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE public.soil_analyses 
        ADD CONSTRAINT soil_analyses_parcel_id_fkey 
        FOREIGN KEY (parcel_id) REFERENCES public.parcels(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Refresh the schema cache (this might help with the relationship detection)
NOTIFY pgrst, 'reload schema';
