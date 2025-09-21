-- =====================================================
-- SIMPLE FOREIGN KEY FIX
-- =====================================================
-- This is a simpler approach to fix the foreign key relationship

-- First, let's see what foreign key constraints already exist
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'soil_analyses';

-- If no foreign key exists, add it (this will fail if parcels table doesn't exist)
DO $$
BEGIN
    -- Try to add the foreign key constraint
    BEGIN
        ALTER TABLE public.soil_analyses 
        ADD CONSTRAINT soil_analyses_parcel_id_fkey 
        FOREIGN KEY (parcel_id) REFERENCES public.parcels(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint added successfully';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
    END;
END $$;
