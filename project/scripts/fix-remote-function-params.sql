-- Fix get_user_role function to use org_id parameter instead of organization_id
-- This matches the frontend code expectations

DROP FUNCTION IF EXISTS public.get_user_role(uuid, uuid);

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

-- Fix get_user_role_level function to use org_id parameter
DROP FUNCTION IF EXISTS public.get_user_role_level(uuid, uuid);

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role_level(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_level(UUID, UUID) TO anon;

SELECT 'Functions updated successfully!' as result;
