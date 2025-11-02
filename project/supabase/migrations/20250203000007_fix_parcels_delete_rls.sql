-- =====================================================
-- Migration: Fix Parcels Delete RLS Policy
-- Description: Ensures parcels_delete_policy works correctly
--              after role harmonization
-- =====================================================

-- =====================================================
-- 1. DROP EXISTING DELETE POLICIES
-- =====================================================

-- Drop all existing delete policies to avoid conflicts
DROP POLICY IF EXISTS "parcels_delete_policy" ON public.parcels;
DROP POLICY IF EXISTS "org_members_can_delete_parcels" ON public.parcels;
DROP POLICY IF EXISTS "parcels_delete_with_permission" ON public.parcels;

-- =====================================================
-- 2. CREATE UNIFIED DELETE POLICY
-- =====================================================

-- Create a single, correct delete policy
CREATE POLICY "parcels_delete_policy" 
ON public.parcels 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1
    FROM public.farms f
    WHERE f.id = parcels.farm_id
      AND public.user_has_role(
        auth.uid(), 
        f.organization_id, 
        ARRAY['system_admin', 'organization_admin', 'farm_manager']
      )
      AND public.has_valid_subscription(f.organization_id) = true
  )
);

COMMENT ON POLICY "parcels_delete_policy" ON public.parcels IS 
'Allows users with system_admin, organization_admin, or farm_manager roles 
to delete parcels in farms belonging to their organization, provided 
the organization has a valid subscription.';

-- =====================================================
-- 3. VERIFY POLICY CREATION
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parcels'
      AND policyname = 'parcels_delete_policy'
  ) THEN
    RAISE EXCEPTION 'parcels_delete_policy was not created';
  END IF;
  
  RAISE NOTICE 'parcels_delete_policy successfully created';
END $$;

-- =====================================================
-- 4. REFRESH SCHEMA CACHE
-- =====================================================

NOTIFY pgrst, 'reload schema';

