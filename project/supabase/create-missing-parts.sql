-- Create the missing parts for multi-tenant auth
-- Since organizations and organization_users already exist

-- 1. Create user_profiles table if it doesn't exist
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

-- 2. Create farms table if it doesn't exist
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    size DECIMAL(10,2),
    manager_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS on missing tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 5. Create RLS policies for farms
DROP POLICY IF EXISTS "Users can view farms in their organizations" ON farms;
CREATE POLICY "Users can view farms in their organizations"
    ON farms FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 6. Create essential functions
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

-- 7. Create demo farm if none exists
INSERT INTO farms (organization_id, name, location, size, manager_name)
SELECT o.id, 'Demo Farm', 'Demo Location', 25.5, 'Demo Manager'
FROM organizations o
WHERE o.name = 'Demo Farm Organization'
AND NOT EXISTS (SELECT 1 FROM farms WHERE organization_id = o.id)
LIMIT 1;