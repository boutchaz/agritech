-- =====================================================
-- COMPLETE SUPABASE SETUP FOR AGRITECH PLATFORM
-- =====================================================
-- Single script to set up everything for self-hosted Supabase
-- Run this once on a fresh Supabase instance to configure the entire database
-- Compatible with MCP (Model Context Protocol) integration
-- Harmonized schema with all required columns

-- =====================================================
-- STEP 1: CREATE CORE TABLES
-- =====================================================

-- User profiles table (MCP compatible)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    bio TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations table (MCP compatible with all required columns)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    contact_person TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    industry TEXT,
    employee_count INTEGER,
    founded_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization users (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Farms table (enhanced for AgriTech)
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    coordinates JSONB, -- {lat: number, lng: number}
    size DECIMAL(10,2),
    size_unit TEXT DEFAULT 'hectares' CHECK (size_unit IN ('hectares', 'acres', 'square_meters')),
    manager_name TEXT,
    manager_phone TEXT,
    manager_email TEXT,
    soil_type TEXT,
    climate_zone TEXT,
    irrigation_type TEXT,
    certification_status TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    established_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parcels table (enhanced for precision agriculture)
CREATE TABLE IF NOT EXISTS public.parcels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    area DECIMAL(10,2),
    area_unit TEXT DEFAULT 'hectares' CHECK (area_unit IN ('hectares', 'acres', 'square_meters')),
    coordinates JSONB, -- GeoJSON polygon or point
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
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'harvested', 'fallow', 'preparing', 'planting', 'growing', 'dormant')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crops table (master data for crop types)
CREATE TABLE IF NOT EXISTS public.crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    scientific_name TEXT,
    variety TEXT,
    category TEXT, -- e.g., 'grains', 'vegetables', 'fruits', 'herbs'
    growing_season_months INTEGER[], -- array of month numbers
    planting_depth DECIMAL(5,2), -- in cm
    spacing_requirements JSONB, -- {row_spacing: number, plant_spacing: number, unit: 'cm'}
    water_requirements JSONB, -- {daily_liters: number, frequency: 'daily'|'weekly'}
    soil_ph_min DECIMAL(3,1),
    soil_ph_max DECIMAL(3,1),
    temperature_min DECIMAL(5,2), -- in celsius
    temperature_max DECIMAL(5,2), -- in celsius
    days_to_harvest INTEGER,
    yield_per_hectare DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory table (for stock management)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_type TEXT CHECK (item_type IN ('seed', 'fertilizer', 'pesticide', 'equipment', 'fuel', 'other')),
    category TEXT,
    brand TEXT,
    quantity DECIMAL(10,2),
    unit TEXT, -- kg, liters, pieces, etc.
    cost_per_unit DECIMAL(10,2),
    supplier TEXT,
    batch_number TEXT,
    expiry_date DATE,
    storage_location TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'low_stock', 'out_of_stock', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table (for tracking farm activities)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('planting', 'harvesting', 'fertilizing', 'irrigation', 'pest_control', 'soil_analysis', 'maintenance', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    equipment_used TEXT[],
    materials_used JSONB,
    weather_conditions JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 2: CREATE HELPFUL FUNCTIONS
-- =====================================================

-- Function to get user organizations
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid UUID)
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_slug TEXT,
    user_role TEXT,
    is_active BOOLEAN,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.slug,
        ou.role,
        ou.is_active,
        ou.joined_at
    FROM public.organizations o
    JOIN public.organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = user_uuid AND ou.is_active = true
    ORDER BY ou.joined_at;
END;
$$;

-- Function to get organization farms
CREATE OR REPLACE FUNCTION public.get_organization_farms(org_uuid UUID)
RETURNS TABLE (
    farm_id UUID,
    farm_name TEXT,
    farm_location TEXT,
    farm_size DECIMAL,
    manager_name TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id,
        f.name,
        f.location,
        f.size,
        f.manager_name,
        f.status
    FROM public.farms f
    WHERE f.organization_id = org_uuid AND f.status = 'active'
    ORDER BY f.created_at;
END;
$$;

-- Function to get farm parcels
CREATE OR REPLACE FUNCTION public.get_farm_parcels(farm_uuid UUID)
RETURNS TABLE (
    parcel_id UUID,
    parcel_name TEXT,
    crop_type TEXT,
    area DECIMAL,
    status TEXT,
    planting_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.crop_type,
        p.area,
        p.status,
        p.planting_date
    FROM public.parcels p
    WHERE p.farm_id = farm_uuid
    ORDER BY p.created_at;
END;
$$;

-- Function to get current user profile
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_data json;
BEGIN
    INSERT INTO public.user_profiles (id, email, created_at, updated_at)
    SELECT auth.uid(), auth.email(), NOW(), NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid()
    );

    SELECT to_json(user_profiles.*)
    INTO profile_data
    FROM public.user_profiles
    WHERE id = auth.uid();

    RETURN profile_data;
END;
$$;

-- Function to create organization with owner
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
    org_name TEXT,
    org_slug TEXT,
    owner_user_id UUID,
    org_email TEXT DEFAULT NULL,
    org_phone TEXT DEFAULT NULL,
    org_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Create organization
    INSERT INTO public.organizations (name, slug, email, phone, address)
    VALUES (org_name, org_slug, org_email, org_phone, org_address)
    RETURNING id INTO org_id;

    -- Add owner to organization
    INSERT INTO public.organization_users (organization_id, user_id, role)
    VALUES (org_id, owner_user_id, 'owner');

    -- Create user profile if it doesn't exist
    INSERT INTO public.user_profiles (id, email, created_at, updated_at)
    SELECT owner_user_id, auth.email(), NOW(), NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = owner_user_id
    );

    RETURN org_id;
END;
$$;

-- Function to get organization statistics
CREATE OR REPLACE FUNCTION public.get_organization_stats(org_uuid UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats json;
BEGIN
    SELECT json_build_object(
        'total_farms', (SELECT COUNT(*) FROM public.farms WHERE organization_id = org_uuid),
        'total_parcels', (SELECT COUNT(*) FROM public.parcels p JOIN public.farms f ON p.farm_id = f.id WHERE f.organization_id = org_uuid),
        'total_users', (SELECT COUNT(*) FROM public.organization_users WHERE organization_id = org_uuid AND is_active = true),
        'total_area', (SELECT COALESCE(SUM(f.size), 0) FROM public.farms f WHERE f.organization_id = org_uuid),
        'active_crops', (SELECT COUNT(DISTINCT p.crop_type) FROM public.parcels p JOIN public.farms f ON p.farm_id = f.id WHERE f.organization_id = org_uuid AND p.status = 'active')
    ) INTO stats;
    
    RETURN stats;
END;
$$;

-- Auto-create user profile trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, created_at, updated_at)
    VALUES (new.id, new.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 3: CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_organization_users_updated_at ON public.organization_users;
DROP TRIGGER IF EXISTS update_farms_updated_at ON public.farms;
DROP TRIGGER IF EXISTS update_parcels_updated_at ON public.parcels;
DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
DROP TRIGGER IF EXISTS update_activities_updated_at ON public.activities;

-- Create trigger to auto-create user profiles
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_users_updated_at
    BEFORE UPDATE ON public.organization_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON public.farms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parcels_updated_at
    BEFORE UPDATE ON public.parcels
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 4: GRANT PERMISSIONS
-- =====================================================

-- Grant basic permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon, service_role;

-- =====================================================
-- STEP 5: CREATE INDEXES
-- =====================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON public.organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_org_id ON public.organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_farms_organization_id ON public.farms(organization_id);
CREATE INDEX IF NOT EXISTS idx_parcels_farm_id ON public.parcels(farm_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_email ON public.organizations(email);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_farms_status ON public.farms(status);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON public.parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_crop_type ON public.parcels(crop_type);
CREATE INDEX IF NOT EXISTS idx_inventory_organization_id ON public.inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_farm_id ON public.inventory(farm_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(status);
CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON public.activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_farm_id ON public.activities(farm_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON public.activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.activities(status);

-- =====================================================
-- STEP 6: INSERT SAMPLE DATA (Optional)
-- =====================================================

-- Insert sample crops data
INSERT INTO public.crops (name, scientific_name, category, days_to_harvest, yield_per_hectare) VALUES
('Wheat', 'Triticum aestivum', 'grains', 120, 3500),
('Corn', 'Zea mays', 'grains', 90, 8000),
('Tomatoes', 'Solanum lycopersicum', 'vegetables', 75, 45000),
('Potatoes', 'Solanum tuberosum', 'vegetables', 100, 25000),
('Olive Trees', 'Olea europaea', 'fruits', 1825, 8000)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 7: RELOAD SCHEMA
-- =====================================================

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- STEP 8: VERIFY SETUP
-- =====================================================

-- Return success message with table counts
SELECT 
    'Setup complete! Database configured for AgriTech platform with MCP compatibility.' as status,
    (SELECT COUNT(*) FROM public.user_profiles) as user_profiles_count,
    (SELECT COUNT(*) FROM public.organizations) as organizations_count,
    (SELECT COUNT(*) FROM public.organization_users) as organization_users_count,
    (SELECT COUNT(*) FROM public.farms) as farms_count,
    (SELECT COUNT(*) FROM public.parcels) as parcels_count,
    (SELECT COUNT(*) FROM public.crops) as crops_count,
    (SELECT COUNT(*) FROM public.inventory) as inventory_count,
    (SELECT COUNT(*) FROM public.activities) as activities_count;