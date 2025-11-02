-- =====================================================
-- CONSOLIDATED: Organization Users Setup and RLS Fixes
-- =====================================================
-- This consolidates ALL organization_users related migrations:
-- - Table creation
-- - RLS policies  
-- - Helper functions with proper search_path
-- - Trigger functions
--
-- Original migrations consolidated:
-- - 20251102000000_ensure_organization_users_table.sql
-- - 20251102000001_fix_organization_users_rls_recursion.sql
-- - 20250201000012_fix_organization_users_rls_recursion_v2.sql
-- - 20250201000013_fix_org_users_rls_complete.sql
-- - 20250201000014_fix_functions_search_path.sql
-- - 20250201000015_fix_user_has_role_function.sql
-- - 20250201000016_ensure_organization_users_and_fix_policies.sql
-- - 20250201000017_debug_organization_users_issue.sql
-- - 20250201000018_fix_block_write_without_subscription.sql
-- - 20250201000019_fix_block_write_trigger_function.sql
-- =====================================================

-- =====================================================
-- 1. CREATE organization_users TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organization_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    role_id INTEGER,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    invited_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_users_organization_id
    ON public.organization_users(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_user_id
    ON public.organization_users(user_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_org_user
    ON public.organization_users(organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_role
    ON public.organization_users(role);

CREATE INDEX IF NOT EXISTS idx_organization_users_is_active
    ON public.organization_users(is_active);

-- Enable RLS
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. HELPER FUNCTIONS (with correct search_path)
-- =====================================================

-- is_active_org_member: Check if user is active member
CREATE OR REPLACE FUNCTION public.is_active_org_member(user_id UUID, org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM public.organization_users ou
        WHERE ou.user_id = is_active_org_member.user_id
        AND ou.organization_id = is_active_org_member.org_id
        AND ou.is_active = true
    ) INTO v_result;
    
    RETURN COALESCE(v_result, FALSE);
END;
$$;

-- user_has_role: Check if user has specific role(s)
CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id UUID, p_organization_id UUID, p_role_names TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_users ou
    WHERE ou.user_id = p_user_id
      AND ou.organization_id = p_organization_id
      AND ou.is_active = true
      AND (
        ou.role = ANY(p_role_names)
        OR
        (ou.role_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = ou.role_id
          AND r.name = ANY(p_role_names)
        ))
      )
  ) INTO v_result;
  
  RETURN COALESCE(v_result, FALSE);
END;
$$;

-- user_can_view_org_membership: Check view permissions
CREATE OR REPLACE FUNCTION public.user_can_view_org_membership(org_id UUID, viewing_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
    IF viewing_user_id = target_user_id THEN
        RETURN TRUE;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = viewing_user_id
          AND ou.is_active = true
    ) INTO v_result;
    
    RETURN COALESCE(v_result, FALSE);
END;
$$;

-- is_organization_admin: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = user_uuid
          AND ou.role IN ('owner', 'admin')
          AND ou.is_active = true
    ) INTO v_result;
    
    RETURN COALESCE(v_result, FALSE);
END;
$$;

-- is_organization_owner: Check if user is owner
CREATE OR REPLACE FUNCTION public.is_organization_owner(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = user_uuid
          AND ou.role = 'owner'
          AND ou.is_active = true
    ) INTO v_result;
    
    RETURN COALESCE(v_result, FALSE);
END;
$$;

-- block_write_without_subscription: Trigger function for subscription checks
CREATE OR REPLACE FUNCTION public.block_write_without_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_org_id UUID;
  is_valid BOOLEAN;
BEGIN
  SELECT organization_id INTO user_org_id
  FROM public.organization_users
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'User is not a member of any organization';
  END IF;

  is_valid := public.has_valid_subscription(user_org_id);

  IF NOT is_valid THEN
    RAISE EXCEPTION 'Organization does not have a valid subscription. Please upgrade to continue.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "organization_users_select_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_insert_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_update_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_delete_policy" ON public.organization_users;
DROP POLICY IF EXISTS "users_can_view_org_memberships" ON public.organization_users;
DROP POLICY IF EXISTS "users_can_view_own_memberships" ON public.organization_users;
DROP POLICY IF EXISTS "users_can_view_own_org_membership" ON public.organization_users;
DROP POLICY IF EXISTS "org_admins_can_manage_memberships" ON public.organization_users;
DROP POLICY IF EXISTS "subscription_check_users_insert" ON public.organization_users;

-- SELECT: Users can view their own memberships and memberships in their orgs
CREATE POLICY "organization_users_select_policy" ON public.organization_users
    FOR SELECT
    TO authenticated
    USING (
        public.user_can_view_org_membership(organization_id, auth.uid(), user_id)
    );

-- INSERT: Only organization owners/admins can add users
CREATE POLICY "organization_users_insert_policy" ON public.organization_users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_organization_admin(organization_id, auth.uid())
    );

-- UPDATE: Only organization owners/admins can update memberships
CREATE POLICY "organization_users_update_policy" ON public.organization_users
    FOR UPDATE
    TO authenticated
    USING (
        public.is_organization_admin(organization_id, auth.uid())
    )
    WITH CHECK (
        public.is_organization_admin(organization_id, auth.uid())
    );

-- DELETE: Only organization owners can remove users
CREATE POLICY "organization_users_delete_policy" ON public.organization_users
    FOR DELETE
    TO authenticated
    USING (
        public.is_organization_owner(organization_id, auth.uid())
    );

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.is_active_org_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(UUID, UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_org_membership(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_owner(UUID, UUID) TO authenticated;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organization_users_updated_at ON public.organization_users;

CREATE TRIGGER update_organization_users_updated_at
    BEFORE UPDATE ON public.organization_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.organization_users IS 'Maps users to organizations with roles and permissions';
COMMENT ON COLUMN public.organization_users.role IS 'User role in the organization: owner, admin, manager, member, viewer';
COMMENT ON COLUMN public.organization_users.is_active IS 'Whether the user membership is currently active';

