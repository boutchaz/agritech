-- Declarative Schema for Farm Management System
-- This file defines the complete database schema in a declarative way

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    full_name text,
    first_name text,
    last_name text,
    avatar_url text,
    phone text,
    timezone text DEFAULT 'UTC',
    language text DEFAULT 'en',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Organizations table
CREATE TABLE public.organizations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
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

-- Farms table (enhanced with hierarchy support)
CREATE TABLE public.farms (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    location text,
    size numeric(10,2),
    area_unit text DEFAULT 'hectares' CHECK (area_unit IN ('hectares', 'acres', 'square_meters')),
    description text,
    latitude numeric(10,6),
    longitude numeric(10,6),
    parent_farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
    farm_type text DEFAULT 'main' CHECK (farm_type IN ('main', 'sub')),
    hierarchy_level integer DEFAULT 1,
    manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active boolean DEFAULT true,
    established_date date,
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

-- Farm management roles table
CREATE TABLE public.farm_management_roles (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('main_manager', 'sub_manager', 'supervisor', 'coordinator')),
    permissions jsonb DEFAULT '{}',
    assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(farm_id, user_id, role)
);

-- Farm hierarchy relationships table (for complex hierarchies)
CREATE TABLE public.farm_hierarchy (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    parent_farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    child_farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    relationship_type text DEFAULT 'sub_farm' CHECK (relationship_type IN ('sub_farm', 'branch', 'division', 'section')),
    hierarchy_level integer NOT NULL DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(parent_farm_id, child_farm_id)
);

-- Farm management permissions table
CREATE TABLE public.farm_permissions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    role text NOT NULL UNIQUE,
    permissions jsonb NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
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
CREATE INDEX idx_farms_parent_farm_id ON public.farms(parent_farm_id);
CREATE INDEX idx_farms_manager_id ON public.farms(manager_id);
CREATE INDEX idx_farms_type ON public.farms(farm_type);
CREATE INDEX idx_farms_hierarchy_level ON public.farms(hierarchy_level);
CREATE INDEX idx_farm_management_roles_farm_id ON public.farm_management_roles(farm_id);
CREATE INDEX idx_farm_management_roles_user_id ON public.farm_management_roles(user_id);
CREATE INDEX idx_farm_management_roles_role ON public.farm_management_roles(role);
CREATE INDEX idx_farm_hierarchy_parent ON public.farm_hierarchy(parent_farm_id);
CREATE INDEX idx_farm_hierarchy_child ON public.farm_hierarchy(child_farm_id);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_management_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

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

-- RLS Policies for farm_management_roles
CREATE POLICY "Users can view their farm management roles" ON public.farm_management_roles
    FOR SELECT USING (
        user_id = auth.uid() OR
        farm_id IN (
            SELECT f.id
            FROM public.farms f
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true AND ou.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Farm managers can manage roles" ON public.farm_management_roles
    FOR ALL USING (
        farm_id IN (
            SELECT f.id
            FROM public.farms f
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true AND ou.role IN ('admin', 'manager')
        )
    );

-- RLS Policies for farm_hierarchy
CREATE POLICY "Organization members can view farm hierarchy" ON public.farm_hierarchy
    FOR SELECT USING (
        parent_farm_id IN (
            SELECT f.id
            FROM public.farms f
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
        )
    );

CREATE POLICY "Farm managers can manage hierarchy" ON public.farm_hierarchy
    FOR ALL USING (
        parent_farm_id IN (
            SELECT f.id
            FROM public.farms f
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true AND ou.role IN ('admin', 'manager')
        )
    );

-- RLS Policies for farm_permissions (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view permissions" ON public.farm_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

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
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.organization_users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.parcels FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.crop_types FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.crop_varieties FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.crops FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.soil_analysis FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.weather_data FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.farm_management_roles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.farm_hierarchy FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.farm_permissions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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
    COALESCE(o.slug, o.name) as organization_slug, -- Use slug if exists, fallback to name
    ou.role as user_role,
    ou.is_active
  FROM organization_users ou
  JOIN organizations o ON ou.organization_id = o.id
  WHERE ou.user_id = user_uuid AND ou.is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  first_name text,
  last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.uid() as id,
    auth.email() as email,
    COALESCE(up.full_name, '') as full_name,
    COALESCE(up.first_name, '') as first_name,
    COALESCE(up.last_name, '') as last_name
  FROM auth.users u
  LEFT JOIN public.user_profiles up ON u.id = up.id
  WHERE u.id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_organization_farms(org_uuid uuid)
RETURNS TABLE(
    farm_id uuid,
    farm_name text,
    farm_location text,
    farm_size numeric,
    farm_type text,
    parent_farm_id uuid,
    hierarchy_level integer,
    manager_name text,
    sub_farms_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as farm_id,
        f.name as farm_name,
        COALESCE(f.location, '') as farm_location,
        COALESCE(f.size, 0) as farm_size,
        COALESCE(f.farm_type, 'main') as farm_type,
        f.parent_farm_id,
        COALESCE(f.hierarchy_level, 1) as hierarchy_level,
        COALESCE(up.first_name || ' ' || up.last_name, 'No Manager') as manager_name,
        COALESCE(sub_count.count, 0) as sub_farms_count
    FROM public.farms f
    LEFT JOIN public.user_profiles up ON f.manager_id = up.id
    LEFT JOIN (
        SELECT parent_farm_id, COUNT(*) as count
        FROM public.farms
        WHERE parent_farm_id IS NOT NULL AND COALESCE(is_active, true) = true
        GROUP BY parent_farm_id
    ) sub_count ON f.id = sub_count.parent_farm_id
    WHERE f.organization_id = org_uuid AND COALESCE(f.is_active, true) = true
    ORDER BY f.hierarchy_level, f.name;
END;
$$;

-- Enhanced functions for farm hierarchy management

-- Function to get farm hierarchy tree
CREATE OR REPLACE FUNCTION public.get_farm_hierarchy_tree(org_uuid uuid, root_farm_id uuid DEFAULT NULL)
RETURNS TABLE(
    farm_id uuid,
    farm_name text,
    farm_type text,
    parent_farm_id uuid,
    hierarchy_level integer,
    manager_name text,
    sub_farms_count bigint,
    farm_size numeric,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE farm_tree AS (
        -- Base case: start with root farms (no parent) or specific farm
        SELECT 
            f.id as farm_id,
            f.name as farm_name,
            COALESCE(f.farm_type, 'main') as farm_type,
            f.parent_farm_id,
            COALESCE(f.hierarchy_level, 1) as hierarchy_level,
            COALESCE(up.first_name || ' ' || up.last_name, 'No Manager') as manager_name,
            0::bigint as sub_farms_count,
            COALESCE(f.size, 0) as farm_size,
            COALESCE(f.is_active, true) as is_active
        FROM public.farms f
        LEFT JOIN public.user_profiles up ON f.manager_id = up.id
        WHERE f.organization_id = org_uuid 
            AND (root_farm_id IS NULL AND f.parent_farm_id IS NULL OR f.id = root_farm_id)
            AND COALESCE(f.is_active, true) = true
        
        UNION ALL
        
        -- Recursive case: get sub-farms
        SELECT 
            f.id as farm_id,
            f.name as farm_name,
            COALESCE(f.farm_type, 'main') as farm_type,
            f.parent_farm_id,
            COALESCE(f.hierarchy_level, 1) as hierarchy_level,
            COALESCE(up.first_name || ' ' || up.last_name, 'No Manager') as manager_name,
            0::bigint as sub_farms_count,
            COALESCE(f.size, 0) as farm_size,
            COALESCE(f.is_active, true) as is_active
        FROM public.farms f
        LEFT JOIN public.user_profiles up ON f.manager_id = up.id
        INNER JOIN farm_tree ft ON f.parent_farm_id = ft.farm_id
        WHERE f.organization_id = org_uuid
            AND COALESCE(f.is_active, true) = true
    )
    SELECT 
        ft.farm_id,
        ft.farm_name,
        ft.farm_type,
        ft.parent_farm_id,
        ft.hierarchy_level,
        ft.manager_name,
        COALESCE(sub_count.count, 0) as sub_farms_count,
        ft.farm_size,
        ft.is_active
    FROM farm_tree ft
    LEFT JOIN (
        SELECT parent_farm_id, COUNT(*) as count
        FROM public.farms
        WHERE parent_farm_id IS NOT NULL AND COALESCE(is_active, true) = true
        GROUP BY parent_farm_id
    ) sub_count ON ft.farm_id = sub_count.parent_farm_id
    ORDER BY ft.hierarchy_level, ft.farm_name;
END;
$$;

-- Function to get user's farm management roles
CREATE OR REPLACE FUNCTION public.get_user_farm_roles(user_uuid uuid)
RETURNS TABLE(
    farm_id uuid,
    farm_name text,
    role text,
    permissions jsonb,
    assigned_at timestamptz,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if farm_management_roles table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'farm_management_roles'
    ) THEN
        RETURN QUERY
        SELECT
            f.id as farm_id,
            f.name as farm_name,
            fmr.role,
            COALESCE(fp.permissions, '{}') as permissions,
            fmr.assigned_at,
            fmr.is_active
        FROM public.farm_management_roles fmr
        JOIN public.farms f ON fmr.farm_id = f.id
        LEFT JOIN public.farm_permissions fp ON fmr.role = fp.role
        WHERE fmr.user_id = user_uuid AND fmr.is_active = true;
    ELSE
        -- Return empty result if table doesn't exist
        RETURN;
    END IF;
END;
$$;

-- Function to create a sub-farm
CREATE OR REPLACE FUNCTION public.create_sub_farm(
    parent_farm_id_param uuid,
    sub_farm_name text,
    sub_farm_location text,
    sub_farm_area numeric,
    area_unit_param text DEFAULT 'hectares',
    sub_farm_description text DEFAULT NULL,
    manager_id_param uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_farm_id uuid;
    parent_org_id uuid;
    parent_hierarchy_level integer;
BEGIN
    -- Get parent farm details
    SELECT organization_id, COALESCE(hierarchy_level, 1) + 1
    INTO parent_org_id, parent_hierarchy_level
    FROM public.farms
    WHERE id = parent_farm_id_param;
    
    IF parent_org_id IS NULL THEN
        RAISE EXCEPTION 'Parent farm not found';
    END IF;
    
    -- Create the sub-farm
    INSERT INTO public.farms (
        organization_id,
        name,
        location,
        size,
        area_unit,
        description,
        parent_farm_id,
        farm_type,
        hierarchy_level,
        manager_id,
        is_active
    ) VALUES (
        parent_org_id,
        sub_farm_name,
        sub_farm_location,
        sub_farm_area,
        area_unit_param,
        sub_farm_description,
        parent_farm_id_param,
        'sub',
        parent_hierarchy_level,
        manager_id_param,
        true
    ) RETURNING id INTO new_farm_id;
    
    -- Create hierarchy relationship (if table exists)
    BEGIN
        INSERT INTO public.farm_hierarchy (
            parent_farm_id,
            child_farm_id,
            hierarchy_level
        ) VALUES (
            parent_farm_id_param,
            new_farm_id,
            parent_hierarchy_level
        );
    EXCEPTION
        WHEN undefined_table THEN
            -- Table doesn't exist yet, skip this step
            NULL;
    END;
    
    -- Assign manager role (if table exists)
    IF manager_id_param IS NOT NULL THEN
        BEGIN
            INSERT INTO public.farm_management_roles (
                farm_id,
                user_id,
                role,
                assigned_by
            ) VALUES (
                new_farm_id,
                manager_id_param,
                'sub_manager',
                auth.uid()
            );
        EXCEPTION
            WHEN undefined_table THEN
                -- Table doesn't exist yet, skip this step
                NULL;
        END;
    END IF;
    
    RETURN new_farm_id;
END;
$$;

-- Function to assign farm management role
CREATE OR REPLACE FUNCTION public.assign_farm_role(
    farm_id_param uuid,
    user_id_param uuid,
    role_param text,
    permissions_param jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has permission to assign roles
    IF NOT EXISTS (
        SELECT 1 FROM public.farms f
        JOIN public.organization_users ou ON f.organization_id = ou.organization_id
        WHERE f.id = farm_id_param
            AND ou.user_id = auth.uid()
            AND ou.is_active = true
            AND ou.role IN ('admin', 'manager')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to assign farm roles';
    END IF;

    -- Insert or update role assignment
    BEGIN
        INSERT INTO public.farm_management_roles (
            farm_id,
            user_id,
            role,
            permissions,
            assigned_by
        ) VALUES (
            farm_id_param,
            user_id_param,
            role_param,
            COALESCE(permissions_param, '{}'),
            auth.uid()
        )
        ON CONFLICT (farm_id, user_id, role)
        DO UPDATE SET
            permissions = EXCLUDED.permissions,
            assigned_by = EXCLUDED.assigned_by,
            assigned_at = now(),
            is_active = true,
            updated_at = now();
    EXCEPTION
        WHEN undefined_table THEN
            -- Table doesn't exist yet, return false
            RETURN false;
    END;

    RETURN true;
END;
$$;

-- Insert default permissions for different roles
INSERT INTO public.farm_permissions (role, permissions, description) VALUES
('main_manager', '{"manage_farms": true, "manage_sub_farms": true, "manage_users": true, "view_reports": true, "manage_crops": true, "manage_parcels": true, "manage_inventory": true, "manage_activities": true}', 'Full management access to main farm and all sub-farms'),
('sub_manager', '{"manage_farms": false, "manage_sub_farms": true, "manage_users": false, "view_reports": true, "manage_crops": true, "manage_parcels": true, "manage_inventory": true, "manage_activities": true}', 'Management access to assigned sub-farms only'),
('supervisor', '{"manage_farms": false, "manage_sub_farms": false, "manage_users": false, "view_reports": true, "manage_crops": true, "manage_parcels": false, "manage_inventory": false, "manage_activities": true}', 'Supervisory access with limited management capabilities'),
('coordinator', '{"manage_farms": false, "manage_sub_farms": false, "manage_users": false, "view_reports": true, "manage_crops": false, "manage_parcels": false, "manage_inventory": false, "manage_activities": true}', 'Coordination role with activity management access')
ON CONFLICT (role) DO NOTHING;

-- Function to get farm parcels
CREATE OR REPLACE FUNCTION public.get_farm_parcels(farm_uuid uuid)
RETURNS TABLE(
    parcel_id uuid,
    parcel_name text,
    area numeric,
    area_unit text,
    soil_type text,
    irrigation_type text,
    elevation numeric,
    slope_percentage numeric,
    notes text,
    crops_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as parcel_id,
        p.name as parcel_name,
        COALESCE(p.area, 0) as area,
        COALESCE(p.area_unit, 'hectares') as area_unit,
        p.soil_type,
        p.irrigation_type,
        p.elevation,
        p.slope_percentage,
        p.notes,
        COALESCE(crop_count.count, 0) as crops_count
    FROM public.parcels p
    LEFT JOIN (
        SELECT parcel_id, COUNT(*) as count
        FROM public.crops
        WHERE parcel_id IS NOT NULL
        GROUP BY parcel_id
    ) crop_count ON p.id = crop_count.parcel_id
    WHERE p.farm_id = farm_uuid
    ORDER BY p.name;
END;
$$;

-- Function to get organization parcels (through farms)
CREATE OR REPLACE FUNCTION public.get_organization_parcels(org_uuid uuid)
RETURNS TABLE(
    parcel_id uuid,
    parcel_name text,
    farm_id uuid,
    farm_name text,
    area numeric,
    area_unit text,
    soil_type text,
    irrigation_type text,
    elevation numeric,
    slope_percentage numeric,
    crops_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as parcel_id,
        p.name as parcel_name,
        f.id as farm_id,
        f.name as farm_name,
        COALESCE(p.area, 0) as area,
        COALESCE(p.area_unit, 'hectares') as area_unit,
        p.soil_type,
        p.irrigation_type,
        p.elevation,
        p.slope_percentage,
        COALESCE(crop_count.count, 0) as crops_count
    FROM public.parcels p
    JOIN public.farms f ON p.farm_id = f.id
    LEFT JOIN (
        SELECT parcel_id, COUNT(*) as count
        FROM public.crops
        WHERE parcel_id IS NOT NULL
        GROUP BY parcel_id
    ) crop_count ON p.id = crop_count.parcel_id
    WHERE f.organization_id = org_uuid AND COALESCE(f.is_active, true) = true
    ORDER BY f.name, p.name;
END;
$$;

-- =================================
-- FUNCTION PERMISSIONS
-- =================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_organizations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_farms(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_farm_hierarchy_tree(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_farm_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sub_farm(uuid, text, text, numeric, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_farm_role(uuid, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_farm_parcels(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_parcels(uuid) TO authenticated;

-- =================================
-- CRITICAL MISSING TABLES
-- =================================

-- Inventory Management
CREATE TABLE public.inventory_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text CHECK (category IN ('seeds', 'fertilizers', 'pesticides', 'equipment', 'tools', 'other')),
    quantity numeric(10,2) NOT NULL DEFAULT 0,
    unit text NOT NULL,
    minimum_stock numeric(10,2),
    cost_per_unit numeric(10,2),
    supplier text,
    location text,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Farm Activities/Tasks
CREATE TABLE public.farm_activities (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    crop_id uuid REFERENCES public.crops(id) ON DELETE SET NULL,
    parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
    activity_type text NOT NULL CHECK (activity_type IN ('planting', 'watering', 'fertilizing', 'pest_control', 'harvesting', 'maintenance', 'other')),
    title text NOT NULL,
    description text,
    scheduled_date date NOT NULL,
    completed_date date,
    assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    estimated_duration interval,
    actual_duration interval,
    notes text,
    cost numeric(10,2),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Financial Transactions
CREATE TABLE public.transactions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
    crop_id uuid REFERENCES public.crops(id) ON DELETE SET NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    category text NOT NULL,
    subcategory text,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'USD',
    description text,
    transaction_date date NOT NULL,
    payment_method text,
    reference_number text,
    is_recurring boolean DEFAULT false,
    parent_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Harvest Records (separate from crops for multiple harvests)
CREATE TABLE public.harvests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    crop_id uuid NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    harvest_date date NOT NULL,
    quantity numeric(10,2) NOT NULL,
    quality_grade text CHECK (quality_grade IN ('A', 'B', 'C', 'D', 'rejected')),
    moisture_content numeric(5,2),
    storage_location text,
    market_price numeric(10,2),
    buyer text,
    sold_quantity numeric(10,2),
    sold_price numeric(10,2),
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Audit Log for tracking changes
CREATE TABLE public.audit_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id uuid REFERENCES auth.users(id),
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- =================================
-- DATA INTEGRITY CONSTRAINTS
-- =================================

-- Add missing columns if they don't exist
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS irrigation_type text CHECK (irrigation_type IN ('drip', 'sprinkler', 'flood', 'none'));

-- Ensure PostgREST picks up the column immediately after adding it
NOTIFY pgrst, 'reload schema';

-- Frontend expects these optional fields when creating parcels
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS planting_density numeric(10,2),
  ADD COLUMN IF NOT EXISTS perimeter numeric(12,2),
  ADD COLUMN IF NOT EXISTS calculated_area numeric(10,2);

-- Add new parcel fields
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS variety text,
  ADD COLUMN IF NOT EXISTS planting_date date,
  ADD COLUMN IF NOT EXISTS planting_type text CHECK (planting_type IN ('traditional', 'intensive', 'super_intensive', 'organic'));

-- Reload schema cache after adding additional columns
NOTIFY pgrst, 'reload schema';

-- Add check constraints for numeric values
ALTER TABLE public.farms
  ADD CONSTRAINT chk_farms_area CHECK (size >= 0),
  ADD CONSTRAINT chk_farms_coordinates CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));

ALTER TABLE public.parcels
  ADD CONSTRAINT chk_parcels_area CHECK (area >= 0),
  ADD CONSTRAINT chk_parcels_slope CHECK (slope_percentage >= 0 AND slope_percentage <= 100),
  ADD CONSTRAINT chk_parcels_elevation CHECK (elevation >= -500);

ALTER TABLE public.crops
  ADD CONSTRAINT chk_crops_area CHECK (planted_area >= 0),
  ADD CONSTRAINT chk_crops_yields CHECK (expected_yield >= 0 AND actual_yield >= 0),
  ADD CONSTRAINT chk_crops_dates CHECK (planting_date <= expected_harvest_date);

ALTER TABLE public.soil_analysis
  ADD CONSTRAINT chk_soil_ph CHECK (ph_level >= 0 AND ph_level <= 14),
  ADD CONSTRAINT chk_soil_percentages CHECK (organic_matter_percentage >= 0 AND organic_matter_percentage <= 100);

ALTER TABLE public.weather_data
  ADD CONSTRAINT chk_weather_humidity CHECK (humidity_percentage >= 0 AND humidity_percentage <= 100),
  ADD CONSTRAINT chk_weather_rainfall CHECK (rainfall_mm >= 0),
  ADD CONSTRAINT chk_weather_temperature CHECK (temperature_celsius >= -50 AND temperature_celsius <= 60),
  ADD CONSTRAINT chk_weather_uv CHECK (uv_index >= 0 AND uv_index <= 15);

ALTER TABLE public.inventory_items
  ADD CONSTRAINT chk_inventory_quantity CHECK (quantity >= 0),
  ADD CONSTRAINT chk_inventory_minimum_stock CHECK (minimum_stock >= 0);

ALTER TABLE public.transactions
  ADD CONSTRAINT chk_transaction_amount CHECK (amount != 0);

ALTER TABLE public.harvests
  ADD CONSTRAINT chk_harvest_quantity CHECK (quantity >= 0),
  ADD CONSTRAINT chk_harvest_sold_quantity CHECK (sold_quantity >= 0 AND sold_quantity <= quantity);

-- =================================
-- PERFORMANCE INDEXES
-- =================================

-- Inventory indexes
CREATE INDEX idx_inventory_organization ON public.inventory_items(organization_id);
CREATE INDEX idx_inventory_farm ON public.inventory_items(farm_id);
CREATE INDEX idx_inventory_category ON public.inventory_items(category);
CREATE INDEX idx_inventory_low_stock ON public.inventory_items(organization_id) WHERE quantity <= minimum_stock;

-- Activities indexes
CREATE INDEX idx_activities_farm ON public.farm_activities(farm_id);
CREATE INDEX idx_activities_assigned ON public.farm_activities(assigned_to);
CREATE INDEX idx_activities_status ON public.farm_activities(status);
CREATE INDEX idx_activities_date ON public.farm_activities(scheduled_date);
CREATE INDEX idx_activities_pending ON public.farm_activities(farm_id, scheduled_date) WHERE status = 'pending';

-- Transactions indexes
CREATE INDEX idx_transactions_organization ON public.transactions(organization_id);
CREATE INDEX idx_transactions_farm ON public.transactions(farm_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_category ON public.transactions(category);

-- Harvests indexes
CREATE INDEX idx_harvests_crop ON public.harvests(crop_id);
CREATE INDEX idx_harvests_date ON public.harvests(harvest_date);
CREATE INDEX idx_harvests_quality ON public.harvests(quality_grade);

-- Audit log indexes
CREATE INDEX idx_audit_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_crops_status_farm ON public.crops(farm_id, status);
CREATE INDEX idx_crops_dates ON public.crops(planting_date, expected_harvest_date);
CREATE INDEX idx_soil_analysis_parcel_date ON public.soil_analysis(parcel_id, analysis_date DESC);
CREATE INDEX idx_weather_farm_date ON public.weather_data(farm_id, recorded_at DESC);

-- =================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- =================================

-- Enable RLS for new tables
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory
CREATE POLICY "Organization members can manage inventory" ON public.inventory_items
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for activities
CREATE POLICY "Farm members can manage activities" ON public.farm_activities
    FOR ALL USING (
        farm_id IN (
            SELECT f.id
            FROM public.farms f
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
        )
    );

-- RLS Policies for transactions (restricted to managers/admins)
CREATE POLICY "Managers can view transactions" ON public.transactions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Managers can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'manager')
            AND is_active = true
        )
    );

CREATE POLICY "Managers can update transactions" ON public.transactions
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'manager')
            AND is_active = true
        )
    );

CREATE POLICY "Managers can delete transactions" ON public.transactions
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'manager')
            AND is_active = true
        )
    );

-- RLS Policies for harvests
CREATE POLICY "Farm members can manage harvests" ON public.harvests
    FOR ALL USING (
        crop_id IN (
            SELECT c.id
            FROM public.crops c
            JOIN public.farms f ON c.farm_id = f.id
            JOIN public.organization_users ou ON f.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid() AND ou.is_active = true
        )
    );

-- RLS Policies for audit logs (read-only for admins)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
            AND ou.role = 'admin'
            AND ou.is_active = true
        )
    );

-- =================================
-- UPDATED TRIGGERS
-- =================================

-- Add triggers for updated_at on new tables
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.farm_activities FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.harvests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =================================
-- AUDIT TRIGGER FUNCTION
-- =================================

-- Function to create audit logs
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        auth.uid(),
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to critical tables
CREATE TRIGGER audit_farms AFTER INSERT OR UPDATE OR DELETE ON public.farms
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_crops AFTER INSERT OR UPDATE OR DELETE ON public.crops
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_transactions AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_harvests AFTER INSERT OR UPDATE OR DELETE ON public.harvests
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- =================================
-- SATELLITE INDICES SERVICE TABLES
-- =================================

-- Satellite Processing Jobs table
CREATE TABLE public.satellite_processing_jobs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid REFERENCES public.parcels(id) ON DELETE CASCADE,
    job_type text NOT NULL DEFAULT 'batch_processing' CHECK (job_type IN ('batch_processing', 'single_parcel', 'cloud_check')),
    indices text[] NOT NULL, -- Array of vegetation indices to calculate
    date_range_start date NOT NULL,
    date_range_end date NOT NULL,
    cloud_coverage_threshold numeric(5,2) DEFAULT 10.0 CHECK (cloud_coverage_threshold >= 0 AND cloud_coverage_threshold <= 100),
    scale integer DEFAULT 10 CHECK (scale >= 10 AND scale <= 1000),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress_percentage numeric(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    total_tasks integer DEFAULT 0,
    completed_tasks integer DEFAULT 0,
    failed_tasks integer DEFAULT 0,
    error_message text,
    results_summary jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    started_at timestamptz,
    completed_at timestamptz,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Satellite Indices Data table
CREATE TABLE public.satellite_indices_data (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    processing_job_id uuid REFERENCES public.satellite_processing_jobs(id) ON DELETE SET NULL,
    date date NOT NULL,
    index_name text NOT NULL CHECK (index_name IN ('NDVI', 'NDRE', 'NDMI', 'MNDWI', 'GCI', 'SAVI', 'OSAVI', 'MSAVI2', 'PRI', 'MSI', 'MCARI', 'TCARI')),
    mean_value numeric(10,6),
    min_value numeric(10,6),
    max_value numeric(10,6),
    std_value numeric(10,6),
    median_value numeric(10,6),
    percentile_25 numeric(10,6),
    percentile_75 numeric(10,6),
    percentile_90 numeric(10,6),
    pixel_count integer,
    cloud_coverage_percentage numeric(5,2),
    image_source text DEFAULT 'Sentinel-2',
    geotiff_url text, -- URL to download the GeoTIFF file
    geotiff_expires_at timestamptz, -- When the GeoTIFF URL expires
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(parcel_id, date, index_name) -- Prevent duplicate data for same parcel/date/index
);

-- AOI (Area of Interest) table for satellite processing
CREATE TABLE public.satellite_aois (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid REFERENCES public.parcels(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    geometry_json jsonb, -- GeoJSON representation for API responses
    area_hectares numeric(10,4),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Cloud Coverage Check Results table
CREATE TABLE public.cloud_coverage_checks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    aoi_id uuid REFERENCES public.satellite_aois(id) ON DELETE SET NULL,
    check_date date NOT NULL,
    date_range_start date NOT NULL,
    date_range_end date NOT NULL,
    max_cloud_threshold numeric(5,2) NOT NULL,
    has_suitable_images boolean NOT NULL,
    available_images_count integer DEFAULT 0,
    suitable_images_count integer DEFAULT 0,
    min_cloud_coverage numeric(5,2),
    max_cloud_coverage numeric(5,2),
    avg_cloud_coverage numeric(5,2),
    recommended_date date,
    all_cloud_percentages numeric(5,2)[],
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Processing Task Queue table for background processing
CREATE TABLE public.satellite_processing_tasks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    processing_job_id uuid NOT NULL REFERENCES public.satellite_processing_jobs(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    aoi_id uuid REFERENCES public.satellite_aois(id) ON DELETE SET NULL,
    task_type text NOT NULL DEFAULT 'calculate_indices' CHECK (task_type IN ('calculate_indices', 'export_geotiff', 'cloud_check')),
    indices text[] NOT NULL,
    date_range_start date NOT NULL,
    date_range_end date NOT NULL,
    cloud_coverage_threshold numeric(5,2) DEFAULT 10.0,
    scale integer DEFAULT 10,
    priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying')),
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    error_message text,
    result_data jsonb,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- =================================
-- SATELLITE TABLES INDEXES
-- =================================

CREATE INDEX idx_satellite_processing_jobs_org ON public.satellite_processing_jobs(organization_id);
CREATE INDEX idx_satellite_processing_jobs_farm ON public.satellite_processing_jobs(farm_id);
CREATE INDEX idx_satellite_processing_jobs_parcel ON public.satellite_processing_jobs(parcel_id);
CREATE INDEX idx_satellite_processing_jobs_status ON public.satellite_processing_jobs(status);
CREATE INDEX idx_satellite_processing_jobs_created ON public.satellite_processing_jobs(created_at);

CREATE INDEX idx_satellite_indices_data_org ON public.satellite_indices_data(organization_id);
CREATE INDEX idx_satellite_indices_data_farm ON public.satellite_indices_data(farm_id);
CREATE INDEX idx_satellite_indices_data_parcel ON public.satellite_indices_data(parcel_id);
CREATE INDEX idx_satellite_indices_data_date ON public.satellite_indices_data(date);
CREATE INDEX idx_satellite_indices_data_index ON public.satellite_indices_data(index_name);
CREATE INDEX idx_satellite_indices_data_parcel_date ON public.satellite_indices_data(parcel_id, date);
CREATE INDEX idx_satellite_indices_data_parcel_index ON public.satellite_indices_data(parcel_id, index_name);

CREATE INDEX idx_satellite_aois_org ON public.satellite_aois(organization_id);
CREATE INDEX idx_satellite_aois_farm ON public.satellite_aois(farm_id);
CREATE INDEX idx_satellite_aois_parcel ON public.satellite_aois(parcel_id);

CREATE INDEX idx_cloud_coverage_checks_org ON public.cloud_coverage_checks(organization_id);
CREATE INDEX idx_cloud_coverage_checks_parcel ON public.cloud_coverage_checks(parcel_id);
CREATE INDEX idx_cloud_coverage_checks_date ON public.cloud_coverage_checks(check_date);

CREATE INDEX idx_satellite_processing_tasks_job ON public.satellite_processing_tasks(processing_job_id);
CREATE INDEX idx_satellite_processing_tasks_org ON public.satellite_processing_tasks(organization_id);
CREATE INDEX idx_satellite_processing_tasks_parcel ON public.satellite_processing_tasks(parcel_id);
CREATE INDEX idx_satellite_processing_tasks_status ON public.satellite_processing_tasks(status);
CREATE INDEX idx_satellite_processing_tasks_priority ON public.satellite_processing_tasks(priority DESC, created_at ASC);

-- =================================
-- SATELLITE TABLES RLS
-- =================================

-- Enable Row Level Security
ALTER TABLE public.satellite_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_indices_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_aois ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_coverage_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_processing_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for satellite_processing_jobs
CREATE POLICY "Organization members can manage processing jobs" ON public.satellite_processing_jobs
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for satellite_indices_data
CREATE POLICY "Organization members can view satellite data" ON public.satellite_indices_data
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Service can insert satellite data" ON public.satellite_indices_data
    FOR INSERT WITH CHECK (true); -- Allow service to insert data

CREATE POLICY "Service can update satellite data" ON public.satellite_indices_data
    FOR UPDATE USING (true); -- Allow service to update data

-- RLS Policies for satellite_aois
CREATE POLICY "Organization members can manage AOIs" ON public.satellite_aois
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for cloud_coverage_checks
CREATE POLICY "Organization members can view cloud checks" ON public.cloud_coverage_checks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Service can insert cloud checks" ON public.cloud_coverage_checks
    FOR INSERT WITH CHECK (true);

-- RLS Policies for satellite_processing_tasks
CREATE POLICY "Organization members can view processing tasks" ON public.satellite_processing_tasks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Service can manage processing tasks" ON public.satellite_processing_tasks
    FOR ALL USING (true);

-- =================================
-- STRUCTURES HELPER FUNCTIONS
-- =================================

-- Helper function to get structures for a farm
CREATE OR REPLACE FUNCTION public.get_farm_structures(farm_uuid uuid)
RETURNS TABLE(
    structure_id uuid,
    structure_name text,
    structure_type text,
    location jsonb,
    installation_date date,
    condition text,
    usage text,
    structure_details jsonb,
    notes text,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as structure_id,
        s.name as structure_name,
        s.type as structure_type,
        s.location,
        s.installation_date,
        s.condition,
        s.usage,
        s.structure_details,
        s.notes,
        s.is_active,
        s.created_at,
        s.updated_at
    FROM public.structures s
    WHERE s.farm_id = farm_uuid
        AND s.is_active = true
    ORDER BY s.type, s.name;
END;
$$;

-- Helper function to get organization structures
CREATE OR REPLACE FUNCTION public.get_organization_structures(org_uuid uuid)
RETURNS TABLE(
    structure_id uuid,
    structure_name text,
    structure_type text,
    farm_id uuid,
    farm_name text,
    location jsonb,
    installation_date date,
    condition text,
    usage text,
    structure_details jsonb,
    notes text,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as structure_id,
        s.name as structure_name,
        s.type as structure_type,
        f.id as farm_id,
        f.name as farm_name,
        s.location,
        s.installation_date,
        s.condition,
        s.usage,
        s.structure_details,
        s.notes,
        s.is_active,
        s.created_at,
        s.updated_at
    FROM public.structures s
    JOIN public.farms f ON s.farm_id = f.id
    WHERE s.organization_id = org_uuid
        AND s.is_active = true
        AND f.is_active = true
    ORDER BY f.name, s.type, s.name;
END;
$$;

-- =================================
-- SATELLITE FUNCTIONS
-- =================================

-- Function to get parcels with their geometry for satellite processing
CREATE OR REPLACE FUNCTION public.get_parcels_for_satellite_processing(org_uuid uuid)
RETURNS TABLE(
    parcel_id uuid,
    parcel_name text,
    farm_id uuid,
    farm_name text,
    organization_id uuid,
    boundary numeric[][],
    area_hectares numeric,
    soil_type text,
    irrigation_type text,
    elevation numeric,
    slope_percentage numeric,
    notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as parcel_id,
        p.name as parcel_name,
        f.id as farm_id,
        f.name as farm_name,
        f.organization_id,
        p.boundary,
        COALESCE(p.area, 0) as area_hectares,
        p.soil_type,
        p.irrigation_type,
        p.elevation,
        p.slope_percentage,
        p.notes
    FROM public.parcels p
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.organization_id = org_uuid
        AND COALESCE(f.is_active, true) = true
        AND p.boundary IS NOT NULL -- Only parcels with defined boundaries
    ORDER BY f.name, p.name;
END;
$$;

-- Function to get latest satellite data for a parcel
CREATE OR REPLACE FUNCTION public.get_latest_satellite_data(parcel_uuid uuid, index_name_param text DEFAULT NULL)
RETURNS TABLE(
    index_name text,
    date date,
    mean_value numeric,
    min_value numeric,
    max_value numeric,
    std_value numeric,
    median_value numeric,
    cloud_coverage_percentage numeric,
    geotiff_url text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sid.index_name,
        sid.date,
        sid.mean_value,
        sid.min_value,
        sid.max_value,
        sid.std_value,
        sid.median_value,
        sid.cloud_coverage_percentage,
        sid.geotiff_url,
        sid.created_at
    FROM public.satellite_indices_data sid
    WHERE sid.parcel_id = parcel_uuid
        AND (index_name_param IS NULL OR sid.index_name = index_name_param)
    ORDER BY sid.date DESC, sid.created_at DESC;
END;
$$;

-- Function to get satellite data statistics for date range
CREATE OR REPLACE FUNCTION public.get_satellite_data_statistics(
    parcel_uuid uuid,
    index_name_param text,
    start_date_param date,
    end_date_param date
)
RETURNS TABLE(
    index_name text,
    data_points_count bigint,
    mean_value numeric,
    min_value numeric,
    max_value numeric,
    std_value numeric,
    median_value numeric,
    first_date date,
    last_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sid.index_name,
        COUNT(*) as data_points_count,
        AVG(sid.mean_value) as mean_value,
        MIN(sid.min_value) as min_value,
        MAX(sid.max_value) as max_value,
        STDDEV(sid.mean_value) as std_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sid.mean_value) as median_value,
        MIN(sid.date) as first_date,
        MAX(sid.date) as last_date
    FROM public.satellite_indices_data sid
    WHERE sid.parcel_id = parcel_uuid
        AND sid.index_name = index_name_param
        AND sid.date BETWEEN start_date_param AND end_date_param
    GROUP BY sid.index_name;
END;
$$;

-- =================================
-- SATELLITE TRIGGERS
-- =================================

-- Create triggers for updated_at timestamps
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.satellite_processing_jobs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.satellite_indices_data FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.satellite_aois FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.cloud_coverage_checks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.satellite_processing_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_parcels_for_satellite_processing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_satellite_data(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_satellite_data_statistics(uuid, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_farm_structures(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_structures(uuid) TO authenticated;

-- =================================
-- FARM INFRASTRUCTURE STRUCTURES
-- =================================

-- Farm infrastructure structures table
CREATE TABLE IF NOT EXISTS public.structures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('stable', 'technical_room', 'basin', 'well')),
    location JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}',
    installation_date DATE NOT NULL,
    condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),
    usage TEXT,
    structure_details JSONB DEFAULT '{}',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for structures
CREATE INDEX IF NOT EXISTS idx_structures_organization_id ON public.structures(organization_id);
CREATE INDEX IF NOT EXISTS idx_structures_farm_id ON public.structures(farm_id);
CREATE INDEX IF NOT EXISTS idx_structures_type ON public.structures(type);
CREATE INDEX IF NOT EXISTS idx_structures_condition ON public.structures(condition);
CREATE INDEX IF NOT EXISTS idx_structures_installation_date ON public.structures(installation_date);
CREATE INDEX IF NOT EXISTS idx_structures_is_active ON public.structures(is_active);
CREATE INDEX IF NOT EXISTS idx_structures_org_farm ON public.structures(organization_id, farm_id);
CREATE INDEX IF NOT EXISTS idx_structures_farm_type ON public.structures(farm_id, type);

-- Enable RLS for structures
ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for structures
CREATE POLICY "Users can view structures from their organization's farms" ON public.structures
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can insert structures to their organization's farms" ON public.structures
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update structures from their organization's farms" ON public.structures
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can delete structures from their organization's farms" ON public.structures
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Add trigger for updated_at on structures
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.structures FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add audit trigger for structures
CREATE TRIGGER audit_structures AFTER INSERT OR UPDATE OR DELETE ON public.structures
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- =================================
-- SATELLITE FILES STORAGE TABLE
-- =================================

-- Create satellite_files table for storing file metadata
CREATE TABLE IF NOT EXISTS public.satellite_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE SET NULL,
    index VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_satellite_files_organization_id ON public.satellite_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_satellite_files_parcel_id ON public.satellite_files(parcel_id);
CREATE INDEX IF NOT EXISTS idx_satellite_files_index ON public.satellite_files(index);
CREATE INDEX IF NOT EXISTS idx_satellite_files_date ON public.satellite_files(date);
CREATE INDEX IF NOT EXISTS idx_satellite_files_created_at ON public.satellite_files(created_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_satellite_files_org_index_date ON public.satellite_files(organization_id, index, date);

-- Enable RLS
ALTER TABLE public.satellite_files ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to access their files
CREATE POLICY "Users can access satellite files for their organizations" ON public.satellite_files
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_users 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for service role to manage all files
CREATE POLICY "Service role can manage all satellite files" ON public.satellite_files
    FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE TRIGGER update_satellite_files_updated_at 
    BEFORE UPDATE ON public.satellite_files 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Refresh the schema cache (for PostgREST)
NOTIFY pgrst, 'reload schema';