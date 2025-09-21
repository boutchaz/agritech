-- Create soil analysis tables
-- This migration creates the necessary tables for soil analysis functionality

-- Create test_types table
CREATE TABLE IF NOT EXISTS public.test_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create soil_analyses table
CREATE TABLE IF NOT EXISTS public.soil_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL,
    test_type_id UUID,
    analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    physical JSONB NOT NULL DEFAULT '{}',
    chemical JSONB NOT NULL DEFAULT '{}',
    biological JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE public.soil_analyses
ADD CONSTRAINT soil_analyses_parcel_id_fkey
FOREIGN KEY (parcel_id) REFERENCES public.parcels(id) ON DELETE CASCADE;

ALTER TABLE public.soil_analyses
ADD CONSTRAINT soil_analyses_test_type_id_fkey
FOREIGN KEY (test_type_id) REFERENCES public.test_types(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_soil_analyses_parcel_id ON public.soil_analyses(parcel_id);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_analysis_date ON public.soil_analyses(analysis_date);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_test_type_id ON public.soil_analyses(test_type_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.test_types
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.soil_analyses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_types TO authenticated, service_role;
GRANT SELECT ON public.test_types TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_analyses TO authenticated, service_role;
GRANT SELECT ON public.soil_analyses TO anon;

-- Insert default test types
INSERT INTO public.test_types (id, name, description) VALUES
    ('123e4567-e89b-12d3-a456-426614174002', 'Analyse Standard', 'Analyse standard du sol incluant pH, texture et nutriments'),
    ('123e4567-e89b-12d3-a456-426614174003', 'Analyse Complète', 'Analyse complète incluant propriétés physiques, chimiques et biologiques'),
    ('123e4567-e89b-12d3-a456-426614174004', 'Analyse Rapide', 'Analyse rapide pour surveillance régulière')
ON CONFLICT (id) DO NOTHING;
