-- Row Level Security and permissions
-- This file defines RLS policies and grants permissions

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated, service_role;
GRANT SELECT ON public.organizations TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.farms TO authenticated, service_role;
GRANT SELECT ON public.farms TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcels TO authenticated, service_role;
GRANT SELECT ON public.parcels TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_types TO authenticated, service_role;
GRANT SELECT ON public.test_types TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_analyses TO authenticated, service_role;
GRANT SELECT ON public.soil_analyses TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.structures TO authenticated, service_role;
GRANT SELECT ON public.structures TO anon;

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies for now)
-- Organizations: allow all authenticated users to read, only service_role to modify
CREATE POLICY "Allow authenticated users to read organizations" ON public.organizations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service_role to manage organizations" ON public.organizations
    FOR ALL USING (auth.role() = 'service_role');

-- Farms: allow all authenticated users to read, only service_role to modify
CREATE POLICY "Allow authenticated users to read farms" ON public.farms
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service_role to manage farms" ON public.farms
    FOR ALL USING (auth.role() = 'service_role');

-- Parcels: allow all authenticated users to read, only service_role to modify
CREATE POLICY "Allow authenticated users to read parcels" ON public.parcels
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service_role to manage parcels" ON public.parcels
    FOR ALL USING (auth.role() = 'service_role');

-- Test types: allow all authenticated users to read, only service_role to modify
CREATE POLICY "Allow authenticated users to read test_types" ON public.test_types
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service_role to manage test_types" ON public.test_types
    FOR ALL USING (auth.role() = 'service_role');

-- Soil analyses: allow all authenticated users to read, only service_role to modify
CREATE POLICY "Allow authenticated users to read soil_analyses" ON public.soil_analyses
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service_role to manage soil_analyses" ON public.soil_analyses
    FOR ALL USING (auth.role() = 'service_role');

-- Structures: allow all authenticated users to read, only service_role to modify
CREATE POLICY "Allow authenticated users to read structures" ON public.structures
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service_role to manage structures" ON public.structures
    FOR ALL USING (auth.role() = 'service_role');
