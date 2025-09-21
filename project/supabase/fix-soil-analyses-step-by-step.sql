-- =====================================================
-- FIX SOIL ANALYSES TABLE - STEP BY STEP
-- =====================================================
-- Run each section separately to identify where the error occurs

-- STEP 1: Create the update function (run this first)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- STEP 2: Create test_types table (run this second)
CREATE TABLE IF NOT EXISTS public.test_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parameters JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: Create soil_analyses table (run this third)
CREATE TABLE IF NOT EXISTS public.soil_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    test_type_id UUID,
    analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    physical JSONB,
    chemical JSONB,
    biological JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: Create indexes (run this fourth)
CREATE INDEX IF NOT EXISTS idx_soil_analyses_parcel_id ON public.soil_analyses(parcel_id);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_analysis_date ON public.soil_analyses(analysis_date);
CREATE INDEX IF NOT EXISTS idx_test_types_name ON public.test_types(name);

-- STEP 5: Create triggers (run this fifth)
CREATE TRIGGER update_soil_analyses_updated_at
    BEFORE UPDATE ON public.soil_analyses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_types_updated_at
    BEFORE UPDATE ON public.test_types
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 6: Grant permissions (run this sixth)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_analyses TO authenticated, service_role;
GRANT SELECT ON public.soil_analyses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_types TO authenticated, service_role;
GRANT SELECT ON public.test_types TO anon;

-- STEP 7: Insert default test type (run this last)
INSERT INTO public.test_types (id, name, description, parameters) VALUES
('123e4567-e89b-12d3-a456-426614174002', 'Basic Soil Analysis', 'Standard soil analysis including pH, nutrients, and organic matter', 
 '{"physical": ["texture", "ph", "organicMatter", "moisture", "temperature"], "chemical": ["nitrogen", "phosphorus", "potassium"], "biological": ["microbialActivity"]}')
ON CONFLICT (id) DO NOTHING;
