-- Create ONLY the missing functions with proper permissions

-- Drop functions if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS get_user_organizations(UUID);
DROP FUNCTION IF EXISTS get_organization_farms(UUID);

-- Create get_user_organizations function
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_slug TEXT,
    user_role TEXT,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Create get_organization_farms function
CREATE OR REPLACE FUNCTION get_organization_farms(org_uuid UUID)
RETURNS TABLE (
    farm_id UUID,
    farm_name TEXT,
    farm_location TEXT,
    farm_size DECIMAL,
    manager_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has access to this organization
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_organizations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_farms(UUID) TO authenticated;

-- Also grant to anon in case it's needed
GRANT EXECUTE ON FUNCTION get_user_organizations(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_organization_farms(UUID) TO anon;