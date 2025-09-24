-- Simple database setup script
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create organization_users table
CREATE TABLE IF NOT EXISTS public.organization_users (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- Create farms table
CREATE TABLE IF NOT EXISTS public.farms (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    location text,
    total_area numeric(10,2),
    area_unit text DEFAULT 'hectares',
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create parcels table
CREATE TABLE IF NOT EXISTS public.parcels (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name text NOT NULL,
    area numeric(10,2),
    area_unit text DEFAULT 'hectares',
    soil_type text,
    boundary numeric[][],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies (no recursion)
CREATE POLICY "organizations_policy" ON public.organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "organization_users_policy" ON public.organization_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "farms_policy" ON public.farms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "parcels_policy" ON public.parcels FOR ALL USING (true) WITH CHECK (true);

-- Insert sample data
INSERT INTO public.organizations (id, name, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Organization', 'demo@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.farms (id, organization_id, name, location, total_area)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Demo Farm', 'France', 50.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parcels (farm_id, name, area, soil_type) VALUES
('00000000-0000-0000-0000-000000000001', 'Parcelle Nord', 12.5, 'Argilo-limoneux'),
('00000000-0000-0000-0000-000000000001', 'Verger Sud', 8.0, 'Sablo-limoneux'),
('00000000-0000-0000-0000-000000000001', 'Prairie Est', 15.0, 'Limoneux'),
('00000000-0000-0000-0000-000000000001', 'Champ Ouest', 10.0, 'Argilo-sableux')
ON CONFLICT DO NOTHING;