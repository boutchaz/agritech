-- =====================================================
-- FINAL SOIL ANALYSIS FIX
-- =====================================================
-- This script will completely fix the soil analysis functionality

-- Step 1: Check what tables exist
SELECT 'Checking existing tables...' as status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Step 2: Create parcels table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    area DECIMAL(10,2),
    area_unit TEXT DEFAULT 'hectares',
    coordinates JSONB,
    crop_type TEXT,
    variety TEXT,
    planting_date DATE,
    expected_harvest_date DATE,
    actual_harvest_date DATE,
    soil_type TEXT,
    irrigation_type TEXT,
    fertilization_schedule JSONB,
    pest_management JSONB,
    yield_estimate DECIMAL(10,2),
    actual_yield DECIMAL(10,2),
    quality_grade TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create test_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.test_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parameters JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create soil_analyses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.soil_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID,
    test_type_id UUID,
    analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    physical JSONB,
    chemical JSONB,
    biological JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Add foreign key constraint if parcels table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcels' AND table_schema = 'public') THEN
        -- Add foreign key constraint
        ALTER TABLE public.soil_analyses 
        ADD CONSTRAINT soil_analyses_parcel_id_fkey 
        FOREIGN KEY (parcel_id) REFERENCES public.parcels(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint added successfully';
    ELSE
        RAISE NOTICE 'Parcels table does not exist, skipping foreign key constraint';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Foreign key constraint already exists';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
END $$;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_parcels_farm_id ON public.parcels(farm_id);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_parcel_id ON public.soil_analyses(parcel_id);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_analysis_date ON public.soil_analyses(analysis_date);
CREATE INDEX IF NOT EXISTS idx_test_types_name ON public.test_types(name);

-- Step 7: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcels TO authenticated, service_role;
GRANT SELECT ON public.parcels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_analyses TO authenticated, service_role;
GRANT SELECT ON public.soil_analyses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_types TO authenticated, service_role;
GRANT SELECT ON public.test_types TO anon;

-- Step 8: Insert default test type
INSERT INTO public.test_types (id, name, description, parameters) VALUES
('123e4567-e89b-12d3-a456-426614174002', 'Basic Soil Analysis', 'Standard soil analysis including pH, nutrients, and organic matter', 
 '{"physical": ["texture", "ph", "organicMatter", "moisture", "temperature"], "chemical": ["nitrogen", "phosphorus", "potassium"], "biological": ["microbialActivity"]}')
ON CONFLICT (id) DO NOTHING;

-- Step 9: Insert a sample farm and parcel for testing
INSERT INTO public.farms (id, name, description, location) VALUES
('123e4567-e89b-12d3-a456-426614174000', 'Test Farm', 'Test farm for soil analysis', 'Test Location')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parcels (id, farm_id, name, description, area) VALUES
('123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174000', 'Test Parcel', 'Test parcel for soil analysis', 1.0)
ON CONFLICT (id) DO NOTHING;

-- Step 10: Final verification
SELECT 'Setup complete! Checking results...' as status;

SELECT 
    (SELECT COUNT(*) FROM public.parcels) as parcels_count,
    (SELECT COUNT(*) FROM public.soil_analyses) as soil_analyses_count,
    (SELECT COUNT(*) FROM public.test_types) as test_types_count;
