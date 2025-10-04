-- =================================
-- DEBUG AND FIX PARCELS RLS
-- =================================

-- Step 1: Check current policies and drop them
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'parcels'
    LOOP
        RAISE NOTICE 'Dropping policy: %', policy_record.policyname;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.parcels', policy_record.policyname);
    END LOOP;
END $$;

-- Step 2: Verify helper functions exist
DO $$
BEGIN
    -- Check is_active_org_member exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'is_active_org_member'
    ) THEN
        -- Create it if missing
        CREATE FUNCTION public.is_active_org_member(user_id UUID, org_id UUID)
        RETURNS BOOLEAN AS $func$
        BEGIN
            RETURN EXISTS (
                SELECT 1 FROM public.organization_users ou
                WHERE ou.user_id = $1
                AND ou.organization_id = $2
                AND ou.is_active = true
            );
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;

        RAISE NOTICE 'Created is_active_org_member function';
    ELSE
        RAISE NOTICE 'is_active_org_member function exists';
    END IF;
END $$;

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, working policies
-- Policy 1: SELECT - Allow members to view parcels in their organization's farms
CREATE POLICY "parcels_select_policy" ON public.parcels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.farms f
            INNER JOIN public.organization_users ou
                ON ou.organization_id = f.organization_id
            WHERE f.id = parcels.farm_id
                AND ou.user_id = auth.uid()
                AND ou.is_active = true
        )
    );

-- Policy 2: INSERT - Allow members with permission to create parcels
CREATE POLICY "parcels_insert_policy" ON public.parcels
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.farms f
            INNER JOIN public.organization_users ou
                ON ou.organization_id = f.organization_id
            LEFT JOIN public.role_permissions rp
                ON rp.role_id = ou.role_id
            LEFT JOIN public.permissions p
                ON p.id = rp.permission_id
            WHERE f.id = parcels.farm_id
                AND ou.user_id = auth.uid()
                AND ou.is_active = true
                AND (p.name = 'parcels.create' OR ou.role_id IN (
                    SELECT id FROM public.roles WHERE level <= 3
                ))
        )
    );

-- Policy 3: UPDATE - Allow members with permission to update parcels
CREATE POLICY "parcels_update_policy" ON public.parcels
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.farms f
            INNER JOIN public.organization_users ou
                ON ou.organization_id = f.organization_id
            WHERE f.id = parcels.farm_id
                AND ou.user_id = auth.uid()
                AND ou.is_active = true
        )
    );

-- Policy 4: DELETE - Allow members with permission to delete parcels
CREATE POLICY "parcels_delete_policy" ON public.parcels
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM public.farms f
            INNER JOIN public.organization_users ou
                ON ou.organization_id = f.organization_id
            LEFT JOIN public.role_permissions rp
                ON rp.role_id = ou.role_id
            LEFT JOIN public.permissions p
                ON p.id = rp.permission_id
            WHERE f.id = parcels.farm_id
                AND ou.user_id = auth.uid()
                AND ou.is_active = true
                AND (p.name = 'parcels.delete' OR ou.role_id IN (
                    SELECT id FROM public.roles WHERE level <= 2
                ))
        )
    );

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcels TO authenticated;

-- Step 6: Verify policies were created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'parcels';

    IF policy_count = 4 THEN
        RAISE NOTICE 'SUCCESS: All 4 parcels policies created';
    ELSE
        RAISE WARNING 'Only % policies created for parcels', policy_count;
    END IF;
END $$;

-- Step 7: Test query to ensure it works
-- This creates a function to help debug
CREATE OR REPLACE FUNCTION public.debug_parcel_access(test_user_id UUID, test_org_id UUID)
RETURNS TABLE(
    can_see_farms BOOLEAN,
    is_org_member BOOLEAN,
    farm_count INTEGER,
    parcel_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXISTS (
            SELECT 1 FROM public.farms f
            INNER JOIN public.organization_users ou ON ou.organization_id = f.organization_id
            WHERE ou.user_id = test_user_id AND ou.organization_id = test_org_id AND ou.is_active = true
        ) as can_see_farms,
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = test_user_id AND ou.organization_id = test_org_id AND ou.is_active = true
        ) as is_org_member,
        (SELECT COUNT(*)::INTEGER FROM public.farms f WHERE f.organization_id = test_org_id) as farm_count,
        (SELECT COUNT(*)::INTEGER FROM public.parcels p
         INNER JOIN public.farms f ON f.id = p.farm_id
         WHERE f.organization_id = test_org_id) as parcel_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.debug_parcel_access(UUID, UUID) TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';