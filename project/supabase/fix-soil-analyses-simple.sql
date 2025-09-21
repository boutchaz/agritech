-- =====================================================
-- SIMPLE SOIL ANALYSES FIX - NO FOREIGN KEYS
-- =====================================================
-- This creates the table without foreign key constraints to test

-- Create soil_analyses table without foreign key constraints
CREATE TABLE IF NOT EXISTS public.soil_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID, -- No foreign key constraint for now
    test_type_id UUID,
    analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    physical JSONB,
    chemical JSONB,
    biological JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant basic permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_analyses TO authenticated, service_role;
GRANT SELECT ON public.soil_analyses TO anon;
