-- Minimal Multi-tenant Schema - Only Essential Tables
-- This creates just what's needed for authentication to work

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Farms table
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    size DECIMAL(10,2),
    manager_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view organizations they belong to" ON organizations FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Users can view organization memberships" ON organization_users FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Users can view farms in their organizations" ON farms FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true)
);

-- Essential Functions
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
    SELECT o.id, o.name, o.slug, ou.role, ou.is_active
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
    IF NOT EXISTS (
        SELECT 1 FROM organization_users
        WHERE organization_id = org_uuid AND user_id = auth.uid() AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access denied to organization farms';
    END IF;

    RETURN QUERY
    SELECT f.id, f.name, f.location, f.size, f.manager_name
    FROM farms f
    WHERE f.organization_id = org_uuid AND f.is_active = true
    ORDER BY f.created_at;
END;
$$;

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
    INSERT INTO organizations (name, slug)
    VALUES (org_name, org_slug)
    RETURNING id INTO new_org_id;

    INSERT INTO organization_users (organization_id, user_id, role)
    VALUES (new_org_id, owner_user_id, 'owner');

    RETURN new_org_id;
END;
$$;

-- Create demo data
INSERT INTO organizations (name, slug, description) VALUES
('Demo Farm Organization', 'demo-farm', 'A demonstration farm organization')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO farms (organization_id, name, location, size, manager_name)
SELECT o.id, 'Demo Farm', 'Demo Location', 25.5, 'Demo Manager'
FROM organizations o
WHERE o.slug = 'demo-farm'
AND NOT EXISTS (SELECT 1 FROM farms WHERE organization_id = o.id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_org_id ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_farms_organization_id ON farms(organization_id);