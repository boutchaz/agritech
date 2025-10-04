-- =================================
-- FIX PARCELS RLS POLICIES
-- =================================
-- This migration fixes the parcels visibility issue by correcting the RLS policies

-- First, drop all existing conflicting parcels policies
DROP POLICY IF EXISTS "Farm members can view parcels" ON public.parcels;
DROP POLICY IF EXISTS "Farm members can manage parcels" ON public.parcels;
DROP POLICY IF EXISTS "org_members_can_view_parcels" ON public.parcels;
DROP POLICY IF EXISTS "org_members_can_create_parcels" ON public.parcels;
DROP POLICY IF EXISTS "org_members_can_update_parcels" ON public.parcels;
DROP POLICY IF EXISTS "org_members_can_delete_parcels" ON public.parcels;

-- Ensure RLS is enabled
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

-- Create correct parcels policies
-- Policy 1: Allow organization members to view parcels in their farms
CREATE POLICY "parcels_select_org_members" ON public.parcels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.farms f
            INNER JOIN public.organization_users ou
                ON ou.organization_id = f.organization_id
            WHERE f.id = public.parcels.farm_id
                AND ou.user_id = auth.uid()
                AND ou.is_active = true
        )
    );

-- Policy 2: Allow users with parcels.create permission to create parcels
CREATE POLICY "parcels_insert_with_permission" ON public.parcels
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.farms f
            INNER JOIN public.organization_users ou
                ON ou.organization_id = f.organization_id
            INNER JOIN public.role_permissions rp
                ON rp.role_id = ou.role_id
            INNER JOIN public.permissions p
                ON p.id = rp.permission_id
            WHERE f.id = public.parcels.farm_id
                AND ou.user_id = auth.uid()
                AND ou.is_active = true
                AND p.name = 'parcels.create'
        )
    );

-- Policy 3: Allow users with parcels.update permission to update parcels
CREATE POLICY "parcels_update_with_permission" ON public.parcels
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.farms f
            INNER JOIN public.organization_users ou
                ON ou.organization_id = f.organization_id
            INNER JOIN public.role_permissions rp
                ON rp.role_id = ou.role_id
            INNER JOIN public.permissions p
                ON p.id = rp.permission_id
            WHERE f.id = public.parcels.farm_id
                AND ou.user_id = auth.uid()
                AND ou.is_active = true
                AND p.name = 'parcels.update'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.farms f
            INNER JOIN public.organization_users ou
                ON ou.organization_id = f.organization_id
            INNER JOIN public.role_permissions rp
                ON rp.role_id = ou.role_id
            INNER JOIN public.permissions p
                ON p.id = rp.permission_id
            WHERE f.id = public.parcels.farm_id
                AND ou.user_id = auth.uid()
                AND ou.is_active = true
                AND p.name = 'parcels.update'
        )
    );

-- Policy 4: Allow users with parcels.delete permission to delete parcels
CREATE POLICY "parcels_delete_with_permission" ON public.parcels
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM public.farms f
            INNER JOIN public.organization_users ou
                ON ou.organization_id = f.organization_id
            INNER JOIN public.role_permissions rp
                ON rp.role_id = ou.role_id
            INNER JOIN public.permissions p
                ON p.id = rp.permission_id
            WHERE f.id = public.parcels.farm_id
                AND ou.user_id = auth.uid()
                AND ou.is_active = true
                AND p.name = 'parcels.delete'
        )
    );

-- Verify the policies are working
DO $$
BEGIN
    -- Check if policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'parcels'
        AND policyname = 'parcels_select_org_members'
    ) THEN
        RAISE EXCEPTION 'parcels_select_org_members policy was not created';
    END IF;

    RAISE NOTICE 'Parcels RLS policies successfully recreated';
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';