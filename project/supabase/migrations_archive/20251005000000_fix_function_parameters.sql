-- Migration: Fix get_user_role function parameters from organization_id to org_id
-- This aligns the database function with the frontend expectations

-- Drop existing functions (they will be recreated with correct parameters)
DROP FUNCTION IF EXISTS public.get_user_role(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_role_level(uuid, uuid);

-- Recreate get_user_role with org_id parameter
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID, org_id UUID DEFAULT NULL)
RETURNS TABLE(role_name TEXT, role_display_name TEXT, role_level INTEGER) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.name,
        r.display_name,
        r.level
    FROM public.organization_users ou
    INNER JOIN public.roles r ON r.id = ou.role_id
    WHERE ou.user_id = get_user_role.user_id
        AND (get_user_role.org_id IS NULL OR ou.organization_id = get_user_role.org_id)
        AND ou.is_active = true
    ORDER BY r.level ASC
    LIMIT 1;
END;
$$;

-- Recreate get_user_role_level with org_id parameter
CREATE OR REPLACE FUNCTION public.get_user_role_level(user_id UUID, org_id UUID)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT r.level
        FROM public.organization_users ou
        INNER JOIN public.roles r ON r.id = ou.role_id
        WHERE ou.user_id = get_user_role_level.user_id
            AND ou.organization_id = get_user_role_level.org_id
            AND ou.is_active = true
        ORDER BY r.level ASC
        LIMIT 1
    );
END;
$$;

-- Grant permissions to all roles
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_user_role_level(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_level(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role_level(UUID, UUID) TO service_role;
