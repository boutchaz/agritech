-- =================================
-- FIX GET_USER_ROLE FUNCTION PARAMETERS
-- =================================
-- This fixes the parameter naming to match frontend calls

-- Drop the existing function (all variants)
DROP FUNCTION IF EXISTS public.get_user_role(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_role(user_id UUID, org_id UUID);
DROP FUNCTION IF EXISTS public.get_user_role(user_id UUID, organization_id UUID);

-- Create the correct function with proper parameter names
CREATE OR REPLACE FUNCTION public.get_user_role(
    user_id UUID,
    organization_id UUID DEFAULT NULL
)
RETURNS TABLE(
    role_name TEXT,
    role_display_name TEXT,
    role_level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.name,
        r.display_name,
        r.level
    FROM public.organization_users ou
    INNER JOIN public.roles r ON r.id = ou.role_id
    WHERE ou.user_id = get_user_role.user_id
        AND (get_user_role.organization_id IS NULL OR ou.organization_id = get_user_role.organization_id)
        AND ou.is_active = true
    ORDER BY r.level ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID, UUID) TO authenticated;

-- Test the function
DO $$
DECLARE
    func_exists BOOLEAN;
BEGIN
    -- Check if function exists with correct signature
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'get_user_role'
        AND p.pronargs = 2
    ) INTO func_exists;

    IF func_exists THEN
        RAISE NOTICE 'SUCCESS: get_user_role function created with correct parameters';
    ELSE
        RAISE EXCEPTION 'FAILED: get_user_role function not found';
    END IF;
END $$;

-- Also create get_user_permissions function if it doesn't exist
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(
    permission_name TEXT,
    resource TEXT,
    action TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.name,
        p.resource,
        p.action
    FROM public.organization_users ou
    INNER JOIN public.role_permissions rp ON rp.role_id = ou.role_id
    INNER JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ou.user_id = get_user_permissions.user_id
        AND ou.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';