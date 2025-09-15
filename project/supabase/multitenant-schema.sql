-- Multi-tenant AgriTech Platform Schema
-- This script creates the complete multi-tenant database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization users (many-to-many relationship)
CREATE TABLE IF NOT EXISTS organization_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Farms table
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    coordinates JSONB, -- {lat: number, lng: number}
    size DECIMAL(10,2), -- in hectares
    size_unit TEXT DEFAULT 'hectares',
    manager_name TEXT,
    manager_contact TEXT,
    established_date DATE,
    farm_type TEXT, -- crop, livestock, mixed, etc.
    certifications TEXT[], -- organic, fair-trade, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they belong to"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization owners and admins can update their organization"
    ON organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for organization_users
CREATE POLICY "Users can view organization memberships they're part of"
    ON organization_users FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization owners and admins can manage users"
    ON organization_users FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND is_active = true
        )
    );

-- RLS Policies for farms
CREATE POLICY "Users can view farms in their organizations"
    ON farms FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization members can manage farms"
    ON farms FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager')
            AND is_active = true
        )
    );

-- Functions for the frontend
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_slug TEXT,
    user_role TEXT,
    is_active BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.slug,
        ou.role,
        ou.is_active
    FROM organizations o
    JOIN organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = user_uuid AND ou.is_active = true
    ORDER BY ou.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION get_organization_farms(org_uuid UUID)
RETURNS TABLE (
    farm_id UUID,
    farm_name TEXT,
    farm_location TEXT,
    farm_size DECIMAL,
    manager_name TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- Check if the user has access to this organization
    IF NOT EXISTS (
        SELECT 1 FROM organization_users
        WHERE organization_id = org_uuid
        AND user_id = auth.uid()
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access denied to organization farms';
    END IF;

    RETURN QUERY
    SELECT
        f.id,
        f.name,
        f.location,
        f.size,
        f.manager_name
    FROM farms f
    WHERE f.organization_id = org_uuid AND f.is_active = true
    ORDER BY f.created_at;
END;
$$;

-- Function to create a new organization with the user as owner
CREATE OR REPLACE FUNCTION create_organization_with_owner(
    org_name TEXT,
    org_slug TEXT,
    owner_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Insert organization
    INSERT INTO organizations (name, slug)
    VALUES (org_name, org_slug)
    RETURNING id INTO new_org_id;

    -- Add user as owner
    INSERT INTO organization_users (organization_id, user_id, role)
    VALUES (new_org_id, owner_user_id, 'owner');

    RETURN new_org_id;
END;
$$;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_users_updated_at
    BEFORE UPDATE ON organization_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_org_id ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_farms_organization_id ON farms(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Sample data (optional - remove in production)
-- Create a demo organization
DO $$
DECLARE
    demo_org_id UUID;
BEGIN
    -- Check if demo organization already exists
    SELECT id INTO demo_org_id FROM organizations WHERE slug = 'demo-farm' LIMIT 1;

    IF demo_org_id IS NULL THEN
        INSERT INTO organizations (name, slug, description)
        VALUES ('Demo Farm', 'demo-farm', 'A demonstration farm for testing')
        RETURNING id INTO demo_org_id;

        -- Add a demo farm
        INSERT INTO farms (organization_id, name, location, size, manager_name)
        VALUES (
            demo_org_id,
            'Demo Orchard',
            'Demo Location, Country',
            25.5,
            'Demo Manager'
        );
    END IF;
END $$;