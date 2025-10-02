-- Refactor analysis system to support soil, plant, and water analyses
-- This migration creates a unified analyses table and migrates existing soil_analysis data

-- Create analysis_type enum
CREATE TYPE analysis_type AS ENUM ('soil', 'plant', 'water');

-- Create unified analyses table
CREATE TABLE public.analyses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    analysis_type analysis_type NOT NULL,
    analysis_date date NOT NULL,
    laboratory text,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create analysis_recommendations table
CREATE TABLE public.analysis_recommendations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    recommendation_type text CHECK (recommendation_type IN ('fertilizer', 'amendment', 'irrigation', 'pest_management', 'general')),
    priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    title text NOT NULL,
    description text,
    action_items jsonb DEFAULT '[]'::jsonb,
    estimated_cost numeric(10,2),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_analyses_parcel_id ON public.analyses(parcel_id);
CREATE INDEX idx_analyses_type ON public.analyses(analysis_type);
CREATE INDEX idx_analyses_date ON public.analyses(analysis_date DESC);
CREATE INDEX idx_analyses_parcel_type_date ON public.analyses(parcel_id, analysis_type, analysis_date DESC);
CREATE INDEX idx_analysis_recommendations_analysis_id ON public.analysis_recommendations(analysis_id);
CREATE INDEX idx_analysis_recommendations_priority ON public.analysis_recommendations(priority);

-- Create GIN index for JSONB data queries
CREATE INDEX idx_analyses_data_gin ON public.analyses USING gin(data);

-- Migrate existing soil_analysis data to new structure (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'soil_analysis') THEN
        INSERT INTO public.analyses (
            id,
            parcel_id,
            analysis_type,
            analysis_date,
            laboratory,
            data,
            notes,
            created_at,
            updated_at
        )
        SELECT
            id,
            parcel_id,
            'soil'::analysis_type,
            analysis_date,
            laboratory,
            jsonb_build_object(
                'ph_level', ph_level,
                'texture', texture,
                'organic_matter_percentage', organic_matter_percentage,
                'nitrogen_ppm', nitrogen_ppm,
                'phosphorus_ppm', phosphorus_ppm,
                'potassium_ppm', potassium_ppm,
                'calcium_ppm', calcium_ppm,
                'magnesium_ppm', magnesium_ppm,
                'sulfur_ppm', sulfur_ppm,
                'salinity_level', salinity_level,
                'cec_meq_per_100g', cec_meq_per_100g
            ) - NULLIF('{}'::text[], '{}'),  -- Remove null values
            notes,
            created_at,
            updated_at
        FROM public.soil_analysis;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analyses
CREATE POLICY "Farm members can view analyses"
    ON public.analyses FOR SELECT
    USING (
        parcel_id IN (
            SELECT p.id FROM public.parcels p
            JOIN public.farms f ON p.farm_id = f.id
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
        )
    );

CREATE POLICY "Farm members can insert analyses"
    ON public.analyses FOR INSERT
    WITH CHECK (
        parcel_id IN (
            SELECT p.id FROM public.parcels p
            JOIN public.farms f ON p.farm_id = f.id
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
            AND ou.role IN ('admin', 'manager', 'member')
        )
    );

CREATE POLICY "Farm members can update analyses"
    ON public.analyses FOR UPDATE
    USING (
        parcel_id IN (
            SELECT p.id FROM public.parcels p
            JOIN public.farms f ON p.farm_id = f.id
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
            AND ou.role IN ('admin', 'manager', 'member')
        )
    );

CREATE POLICY "Farm admins can delete analyses"
    ON public.analyses FOR DELETE
    USING (
        parcel_id IN (
            SELECT p.id FROM public.parcels p
            JOIN public.farms f ON p.farm_id = f.id
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
            AND ou.role IN ('admin', 'manager')
        )
    );

-- RLS Policies for analysis_recommendations
CREATE POLICY "Farm members can view recommendations"
    ON public.analysis_recommendations FOR SELECT
    USING (
        analysis_id IN (
            SELECT a.id FROM public.analyses a
            JOIN public.parcels p ON a.parcel_id = p.id
            JOIN public.farms f ON p.farm_id = f.id
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
        )
    );

CREATE POLICY "Farm members can manage recommendations"
    ON public.analysis_recommendations FOR ALL
    USING (
        analysis_id IN (
            SELECT a.id FROM public.analyses a
            JOIN public.parcels p ON a.parcel_id = p.id
            JOIN public.farms f ON p.farm_id = f.id
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
            AND ou.role IN ('admin', 'manager', 'member')
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER handle_analyses_updated_at
    BEFORE UPDATE ON public.analyses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_analysis_recommendations_updated_at
    BEFORE UPDATE ON public.analysis_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.analyses IS 'Unified table for soil, plant, and water analyses';
COMMENT ON COLUMN public.analyses.analysis_type IS 'Type of analysis: soil, plant, or water';
COMMENT ON COLUMN public.analyses.data IS 'JSONB field containing analysis-specific data based on analysis_type';
COMMENT ON TABLE public.analysis_recommendations IS 'Recommendations generated from analyses';

-- Note: Keep soil_analysis table for now (can be dropped in future migration after verification)
-- To drop in future: DROP TABLE IF EXISTS public.soil_analysis CASCADE;
