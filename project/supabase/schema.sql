-- Declarative Schema for Farm Management System
-- This file defines the complete database schema in a declarative way

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE public.organizations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    email text,
    phone text,
    address text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Organization users (membership table)
CREATE TABLE public.organization_users (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- Farms table
CREATE TABLE public.farms (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    location text,
    total_area numeric(10,2),
    area_unit text DEFAULT 'hectares' CHECK (area_unit IN ('hectares', 'acres', 'square_meters')),
    description text,
    latitude numeric(10,6),
    longitude numeric(10,6),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Parcels table
CREATE TABLE public.parcels (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name text NOT NULL,
    area numeric(10,2),
    area_unit text DEFAULT 'hectares' CHECK (area_unit IN ('hectares', 'acres', 'square_meters')),
    soil_type text,
    boundary numeric[][],
    elevation numeric(6,2),
    slope_percentage numeric(5,2),
    irrigation_type text CHECK (irrigation_type IN ('drip', 'sprinkler', 'flood', 'none')),
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Crop types table
CREATE TABLE public.crop_types (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    category text CHECK (category IN ('cereals', 'vegetables', 'fruits', 'legumes', 'herbs')),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Crop varieties table
CREATE TABLE public.crop_varieties (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    crop_type_id uuid NOT NULL REFERENCES public.crop_types(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    days_to_maturity integer,
    optimal_temperature_min numeric(4,1),
    optimal_temperature_max numeric(4,1),
    water_requirements text CHECK (water_requirements IN ('low', 'medium', 'high')),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(crop_type_id, name)
);

-- Crops (plantings) table
CREATE TABLE public.crops (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
    variety_id uuid NOT NULL REFERENCES public.crop_varieties(id) ON DELETE RESTRICT,
    name text NOT NULL,
    planting_date date,
    expected_harvest_date date,
    actual_harvest_date date,
    planted_area numeric(10,2),
    expected_yield numeric(10,2),
    actual_yield numeric(10,2),
    yield_unit text DEFAULT 'kg' CHECK (yield_unit IN ('kg', 'tons', 'bushels', 'crates')),
    status text DEFAULT 'planned' CHECK (status IN ('planned', 'planted', 'growing', 'harvested', 'failed')),
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Soil analysis table
CREATE TABLE public.soil_analysis (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    analysis_date date NOT NULL,
    ph_level numeric(3,1),
    organic_matter_percentage numeric(5,2),
    nitrogen_ppm numeric(8,2),
    phosphorus_ppm numeric(8,2),
    potassium_ppm numeric(8,2),
    calcium_ppm numeric(8,2),
    magnesium_ppm numeric(8,2),
    sulfur_ppm numeric(8,2),
    salinity_level numeric(5,2),
    cec_meq_per_100g numeric(6,2),
    texture text CHECK (texture IN ('sand', 'loamy_sand', 'sandy_loam', 'loam', 'silt_loam', 'silt', 'clay_loam', 'silty_clay_loam', 'sandy_clay', 'silty_clay', 'clay')),
    laboratory text,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Weather data table
CREATE TABLE public.weather_data (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    recorded_at timestamptz NOT NULL,
    temperature_celsius numeric(4,1),
    humidity_percentage numeric(5,2),
    rainfall_mm numeric(6,2),
    wind_speed_kmh numeric(5,2),
    wind_direction text,
    pressure_hpa numeric(6,2),
    uv_index numeric(3,1),
    source text DEFAULT 'manual' CHECK (source IN ('manual', 'weather_station', 'api')),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_organization_users_org_id ON public.organization_users(organization_id);
CREATE INDEX idx_organization_users_user_id ON public.organization_users(user_id);
CREATE INDEX idx_farms_org_id ON public.farms(organization_id);
CREATE INDEX idx_parcels_farm_id ON public.parcels(farm_id);
CREATE INDEX idx_crops_farm_id ON public.crops(farm_id);
CREATE INDEX idx_crops_parcel_id ON public.crops(parcel_id);
CREATE INDEX idx_soil_analysis_parcel_id ON public.soil_analysis(parcel_id);
CREATE INDEX idx_weather_data_farm_id ON public.weather_data(farm_id);
CREATE INDEX idx_weather_data_recorded_at ON public.weather_data(recorded_at);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their organizations" ON public.organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization admins can update organizations" ON public.organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
        )
    );

-- RLS Policies for organization_users
CREATE POLICY "Users can view their own memberships" ON public.organization_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own memberships" ON public.organization_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for farms
CREATE POLICY "Organization members can view farms" ON public.farms
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization members can create farms" ON public.farms
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization members can update farms" ON public.farms
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for parcels
CREATE POLICY "Farm members can view parcels" ON public.parcels
    FOR SELECT USING (
        farm_id IN (
            SELECT f.id
            FROM public.farms f
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
        )
    );

CREATE POLICY "Farm members can manage parcels" ON public.parcels
    FOR ALL USING (
        farm_id IN (
            SELECT f.id
            FROM public.farms f
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
        )
    );

-- RLS Policies for crop types (public read, admin write)
CREATE POLICY "Anyone can view crop types" ON public.crop_types
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage crop types" ON public.crop_types
    FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for crop varieties (public read, admin write)
CREATE POLICY "Anyone can view crop varieties" ON public.crop_varieties
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage crop varieties" ON public.crop_varieties
    FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for crops
CREATE POLICY "Farm members can manage crops" ON public.crops
    FOR ALL USING (
        farm_id IN (
            SELECT f.id
            FROM public.farms f
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
        )
    );

-- RLS Policies for soil analysis
CREATE POLICY "Farm members can manage soil analysis" ON public.soil_analysis
    FOR ALL USING (
        parcel_id IN (
            SELECT p.id
            FROM public.parcels p
            JOIN public.farms f ON p.farm_id = f.id
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
        )
    );

-- RLS Policies for weather data
CREATE POLICY "Farm members can manage weather data" ON public.weather_data
    FOR ALL USING (
        farm_id IN (
            SELECT f.id
            FROM public.farms f
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
        )
    );

-- Function to automatically add creator as admin
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.organization_users (organization_id, user_id, role, is_active)
    VALUES (NEW.id, auth.uid(), 'admin', true)
    ON CONFLICT (organization_id, user_id) DO UPDATE SET is_active = true;
    RETURN NEW;
END;
$$;

-- Create trigger for auto-membership
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create triggers for updated_at timestamps
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.organization_users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.parcels FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.crop_types FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.crop_varieties FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.crops FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.soil_analysis FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.weather_data FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper functions for frontend queries
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid uuid)
RETURNS TABLE(
  organization_id uuid,
  organization_name text,
  organization_slug text,
  user_role text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as organization_id,
    o.name as organization_name,
    o.slug as organization_slug,
    ou.role as user_role,
    ou.is_active
  FROM public.organization_users ou
  JOIN public.organizations o ON ou.organization_id = o.id
  WHERE ou.user_id = user_uuid AND ou.is_active = true;
END;
$$;