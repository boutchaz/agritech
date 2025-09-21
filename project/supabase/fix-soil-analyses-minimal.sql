-- =====================================================
-- MINIMAL SOIL ANALYSES FIX
-- =====================================================
-- This creates only the essential tables without dependencies

-- Create the update function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create test_types table
CREATE TABLE IF NOT EXISTS public.test_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parameters JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create soil_analyses table
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

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_soil_analyses_parcel_id ON public.soil_analyses(parcel_id);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_analysis_date ON public.soil_analyses(analysis_date);

-- Grant basic permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_analyses TO authenticated, service_role;
GRANT SELECT ON public.soil_analyses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_types TO authenticated, service_role;
GRANT SELECT ON public.test_types TO anon;

-- Insert default test type
INSERT INTO public.test_types (id, name, description, parameters) VALUES
('123e4567-e89b-12d3-a456-426614174002', 'Basic Soil Analysis', 'Standard soil analysis', 
 '{"physical": ["texture", "ph", "organicMatter"], "chemical": ["nitrogen", "phosphorus", "potassium"]}')
ON CONFLICT (id) DO NOTHING;
