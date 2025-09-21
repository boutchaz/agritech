-- Create soil analyses table
CREATE TABLE IF NOT EXISTS public.soil_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    test_type_id UUID, -- Reference to test type (can be extended later)
    analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    physical JSONB, -- {texture, ph, organicMatter, moisture, temperature, etc.}
    chemical JSONB, -- {nitrogen, phosphorus, potassium, micronutrients, etc.}
    biological JSONB, -- {microbialActivity, earthwormCount, etc.}
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_soil_analyses_parcel_id') THEN
        CREATE INDEX idx_soil_analyses_parcel_id ON public.soil_analyses(parcel_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_soil_analyses_analysis_date') THEN
        CREATE INDEX idx_soil_analyses_analysis_date ON public.soil_analyses(analysis_date);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_test_types_name') THEN
        CREATE INDEX idx_test_types_name ON public.test_types(name);
    END IF;
END $$;

-- Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS update_soil_analyses_updated_at ON public.soil_analyses;
DROP TRIGGER IF EXISTS update_test_types_updated_at ON public.test_types;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_soil_analyses_updated_at
    BEFORE UPDATE ON public.soil_analyses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_types_updated_at
    BEFORE UPDATE ON public.test_types
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions (only if not already granted)
DO $$
BEGIN
    -- Grant permissions for soil_analyses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_privileges 
        WHERE table_name = 'soil_analyses' 
        AND grantee = 'authenticated' 
        AND privilege_type = 'SELECT'
    ) THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_analyses TO authenticated, service_role;
        GRANT SELECT ON public.soil_analyses TO anon;
    END IF;
    
    -- Grant permissions for test_types
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_privileges 
        WHERE table_name = 'test_types' 
        AND grantee = 'authenticated' 
        AND privilege_type = 'SELECT'
    ) THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_types TO authenticated, service_role;
        GRANT SELECT ON public.test_types TO anon;
    END IF;
END $$;

-- Insert default test type (only if it doesn't exist)
INSERT INTO public.test_types (id, name, description, parameters) VALUES
('123e4567-e89b-12d3-a456-426614174002', 'Basic Soil Analysis', 'Standard soil analysis including pH, nutrients, and organic matter', 
 '{"physical": ["texture", "ph", "organicMatter", "moisture", "temperature"], "chemical": ["nitrogen", "phosphorus", "potassium"], "biological": ["microbialActivity"]}')
ON CONFLICT (id) DO NOTHING;
