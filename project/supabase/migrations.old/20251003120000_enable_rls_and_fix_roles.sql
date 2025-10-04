-- =================================
-- COMPREHENSIVE RLS AND ROLES ENHANCEMENT
-- =================================
-- This migration addresses critical security gaps and role management issues

-- =================================
-- 1. ENABLE RLS FOR CRITICAL TABLES
-- =================================

-- Enable RLS for core tables that currently lack it
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_laborers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_types ENABLE ROW LEVEL SECURITY;

-- =================================
-- 2. CREATE ENHANCED HELPER FUNCTIONS
-- =================================

-- Function to check if user is active member of organization
CREATE OR REPLACE FUNCTION public.is_active_org_member(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_users ou
        WHERE ou.user_id = $1 
        AND ou.organization_id = $2 
        AND ou.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission_for_org(user_id UUID, org_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_users ou
        JOIN public.role_permissions rp ON rp.role_id = ou.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ou.user_id = $1 
        AND ou.organization_id = $2
        AND ou.is_active = true
        AND p.name = $3
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's highest role level in organization
CREATE OR REPLACE FUNCTION public.get_user_role_level(user_id UUID, org_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT MIN(r.level)
        FROM public.organization_users ou
        JOIN public.roles r ON r.id = ou.role_id
        WHERE ou.user_id = $1 
        AND ou.organization_id = $2
        AND ou.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================
-- 3. ORGANIZATIONS RLS POLICIES
-- =================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON public.organizations;

-- Create comprehensive organizations policies
CREATE POLICY "org_members_can_view" ON public.organizations
    FOR SELECT USING (public.is_active_org_member(auth.uid(), id));

CREATE POLICY "org_admins_can_update" ON public.organizations
    FOR UPDATE USING (
        public.is_active_org_member(auth.uid(), id) AND
        public.user_has_permission_for_org(auth.uid(), id, 'organizations.update')
    );

CREATE POLICY "authenticated_can_create" ON public.organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =================================
-- 4. ORGANIZATION_USERS RLS POLICIES
-- =================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_users;
DROP POLICY IF EXISTS "Users can insert their own memberships" ON public.organization_users;

-- Create comprehensive organization_users policies
CREATE POLICY "users_can_view_own_memberships" ON public.organization_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "org_admins_can_manage_memberships" ON public.organization_users
    FOR ALL USING (
        public.is_active_org_member(auth.uid(), organization_id) AND
        public.user_has_permission_for_org(auth.uid(), organization_id, 'users.manage')
    );

CREATE POLICY "users_can_view_org_memberships" ON public.organization_users
    FOR SELECT USING (
        public.is_active_org_member(auth.uid(), organization_id)
    );

-- =================================
-- 5. FARMS RLS POLICIES
-- =================================

-- Drop existing policies
DROP POLICY IF EXISTS "Organization members can view farms" ON public.farms;
DROP POLICY IF EXISTS "Organization members can create farms" ON public.farms;
DROP POLICY IF EXISTS "Organization members can update farms" ON public.farms;

-- Create comprehensive farms policies
CREATE POLICY "org_members_can_view_farms" ON public.farms
    FOR SELECT USING (
        public.is_active_org_member(auth.uid(), organization_id)
    );

CREATE POLICY "org_members_can_create_farms" ON public.farms
    FOR INSERT WITH CHECK (
        public.is_active_org_member(auth.uid(), organization_id) AND
        public.user_has_permission_for_org(auth.uid(), organization_id, 'farms.create')
    );

CREATE POLICY "org_members_can_update_farms" ON public.farms
    FOR UPDATE USING (
        public.is_active_org_member(auth.uid(), organization_id) AND
        public.user_has_permission_for_org(auth.uid(), organization_id, 'farms.update')
    );

CREATE POLICY "org_admins_can_delete_farms" ON public.farms
    FOR DELETE USING (
        public.is_active_org_member(auth.uid(), organization_id) AND
        public.user_has_permission_for_org(auth.uid(), organization_id, 'farms.delete')
    );

-- =================================
-- 6. PARCELS RLS POLICIES
-- =================================

-- Drop existing policies
DROP POLICY IF EXISTS "Farm members can view parcels" ON public.parcels;
DROP POLICY IF EXISTS "Farm members can manage parcels" ON public.parcels;

-- Create comprehensive parcels policies
CREATE POLICY "org_members_can_view_parcels" ON public.parcels
    FOR SELECT USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id)
        )
    );

CREATE POLICY "org_members_can_create_parcels" ON public.parcels
    FOR INSERT WITH CHECK (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'parcels.create')
        )
    );

CREATE POLICY "org_members_can_update_parcels" ON public.parcels
    FOR UPDATE USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'parcels.update')
        )
    );

CREATE POLICY "org_members_can_delete_parcels" ON public.parcels
    FOR DELETE USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'parcels.delete')
        )
    );

-- =================================
-- 7. CROPS RLS POLICIES
-- =================================

-- Drop existing policies
DROP POLICY IF EXISTS "Farm members can manage crops" ON public.crops;

-- Create comprehensive crops policies
CREATE POLICY "org_members_can_view_crops" ON public.crops
    FOR SELECT USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id)
        )
    );

CREATE POLICY "org_members_can_manage_crops" ON public.crops
    FOR ALL USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'farms.manage')
        )
    );

-- =================================
-- 8. CROP TYPES & VARIETIES RLS POLICIES
-- =================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view crop types" ON public.crop_types;
DROP POLICY IF EXISTS "Authenticated users can manage crop types" ON public.crop_types;
DROP POLICY IF EXISTS "Anyone can view crop varieties" ON public.crop_varieties;
DROP POLICY IF EXISTS "Authenticated users can manage crop varieties" ON public.crop_varieties;

-- Create comprehensive crop types policies
CREATE POLICY "authenticated_can_view_crop_types" ON public.crop_types
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "org_admins_can_manage_crop_types" ON public.crop_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid() 
            AND ou.is_active = true
            AND r.level <= 2 -- system_admin or organization_admin
        )
    );

-- Create comprehensive crop varieties policies
CREATE POLICY "authenticated_can_view_crop_varieties" ON public.crop_varieties
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "org_admins_can_manage_crop_varieties" ON public.crop_varieties
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid() 
            AND ou.is_active = true
            AND r.level <= 2 -- system_admin or organization_admin
        )
    );

-- =================================
-- 9. SOIL ANALYSES RLS POLICIES
-- =================================

CREATE POLICY "org_members_can_view_soil_analyses" ON public.soil_analyses
    FOR SELECT USING (
        parcel_id IN (
            SELECT p.id FROM public.parcels p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE public.is_active_org_member(auth.uid(), f.organization_id)
        )
    );

CREATE POLICY "org_members_can_manage_soil_analyses" ON public.soil_analyses
    FOR ALL USING (
        parcel_id IN (
            SELECT p.id FROM public.parcels p
            JOIN public.farms f ON p.farm_id = f.id
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'parcels.update')
        )
    );

-- =================================
-- 10. USER PROFILES RLS POLICIES
-- =================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create comprehensive user_profiles policies
CREATE POLICY "users_can_view_own_profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_can_insert_own_profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "org_admins_can_view_profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid() 
            AND ou.is_active = true
            AND r.level <= 2 -- system_admin or organization_admin
        )
    );

-- =================================
-- 11. TASKS RLS POLICIES
-- =================================

CREATE POLICY "org_members_can_view_tasks" ON public.tasks
    FOR SELECT USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id)
        )
    );

CREATE POLICY "org_members_can_manage_tasks" ON public.tasks
    FOR ALL USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'farms.manage')
        )
    );

-- =================================
-- 12. INVENTORY RLS POLICIES
-- =================================

CREATE POLICY "org_members_can_view_inventory" ON public.inventory
    FOR SELECT USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id)
        )
    );

CREATE POLICY "org_members_can_manage_inventory" ON public.inventory
    FOR ALL USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'stock.manage')
        )
    );

-- =================================
-- 13. FINANCIAL TRANSACTIONS RLS POLICIES
-- =================================

CREATE POLICY "org_members_can_view_transactions" ON public.financial_transactions
    FOR SELECT USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id)
        )
    );

CREATE POLICY "org_admins_can_manage_transactions" ON public.financial_transactions
    FOR ALL USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'organizations.manage')
        )
    );

-- =================================
-- 14. WORK RECORDS RLS POLICIES
-- =================================

CREATE POLICY "org_members_can_view_work_records" ON public.work_records
    FOR SELECT USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id)
        )
    );

CREATE POLICY "org_members_can_manage_work_records" ON public.work_records
    FOR ALL USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'farms.manage')
        )
    );

-- =================================
-- 15. EMPLOYEES & DAY LABORERS RLS POLICIES
-- =================================

CREATE POLICY "org_members_can_view_employees" ON public.employees
    FOR SELECT USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id)
        )
    );

CREATE POLICY "org_admins_can_manage_employees" ON public.employees
    FOR ALL USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'users.manage')
        )
    );

CREATE POLICY "org_members_can_view_day_laborers" ON public.day_laborers
    FOR SELECT USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id)
        )
    );

CREATE POLICY "org_admins_can_manage_day_laborers" ON public.day_laborers
    FOR ALL USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'users.manage')
        )
    );

-- =================================
-- 16. LIVESTOCK RLS POLICIES
-- =================================

CREATE POLICY "org_members_can_view_livestock" ON public.livestock
    FOR SELECT USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id)
        )
    );

CREATE POLICY "org_members_can_manage_livestock" ON public.livestock
    FOR ALL USING (
        farm_id IN (
            SELECT f.id FROM public.farms f
            WHERE public.is_active_org_member(auth.uid(), f.organization_id) AND
            public.user_has_permission_for_org(auth.uid(), f.organization_id, 'farms.manage')
        )
    );

-- =================================
-- 17. REFERENCE TABLES RLS POLICIES
-- =================================

-- Task categories, templates, product categories, etc.
CREATE POLICY "authenticated_can_view_task_categories" ON public.task_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "org_admins_can_manage_task_categories" ON public.task_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid() 
            AND ou.is_active = true
            AND r.level <= 2
        )
    );

CREATE POLICY "authenticated_can_view_task_templates" ON public.task_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "org_admins_can_manage_task_templates" ON public.task_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid() 
            AND ou.is_active = true
            AND r.level <= 2
        )
    );

CREATE POLICY "authenticated_can_view_product_categories" ON public.product_categories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "org_admins_can_manage_product_categories" ON public.product_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid() 
            AND ou.is_active = true
            AND r.level <= 2
        )
    );

CREATE POLICY "authenticated_can_view_product_subcategories" ON public.product_subcategories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "org_admins_can_manage_product_subcategories" ON public.product_subcategories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid() 
            AND ou.is_active = true
            AND r.level <= 2
        )
    );

CREATE POLICY "authenticated_can_view_test_types" ON public.test_types
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "org_admins_can_manage_test_types" ON public.test_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid() 
            AND ou.is_active = true
            AND r.level <= 2
        )
    );

-- =================================
-- 18. MIGRATE LEGACY ROLES TO NEW SYSTEM
-- =================================

-- Update organization_users to use new role system
UPDATE public.organization_users 
SET role_id = (
    CASE 
        WHEN role = 'admin' OR role = 'owner' THEN (SELECT id FROM public.roles WHERE name = 'organization_admin')
        WHEN role = 'manager' THEN (SELECT id FROM public.roles WHERE name = 'farm_manager')
        WHEN role = 'member' THEN (SELECT id FROM public.roles WHERE name = 'farm_worker')
        ELSE (SELECT id FROM public.roles WHERE name = 'viewer')
    END
)
WHERE role_id IS NULL;

-- =================================
-- 19. CREATE AUDIT TRIGGER FOR CRITICAL TABLES
-- =================================

-- Add audit triggers to newly secured tables
CREATE TRIGGER audit_organizations AFTER INSERT OR UPDATE OR DELETE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_organization_users AFTER INSERT OR UPDATE OR DELETE ON public.organization_users
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_farms AFTER INSERT OR UPDATE OR DELETE ON public.farms
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_parcels AFTER INSERT OR UPDATE OR DELETE ON public.parcels
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_crops AFTER INSERT OR UPDATE OR DELETE ON public.crops
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_financial_transactions AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- =================================
-- 20. GRANT PERMISSIONS TO FUNCTIONS
-- =================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_active_org_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission_for_org(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_level(UUID, UUID) TO authenticated;

-- =================================
-- 21. REFRESH SCHEMA CACHE
-- =================================

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- =================================
-- 22. VERIFICATION QUERIES
-- =================================

-- Verify RLS is enabled on all critical tables
DO $$
DECLARE
    table_name TEXT;
    rls_status BOOLEAN;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'organizations', 'organization_users', 'farms', 'parcels', 
            'crops', 'soil_analyses', 'user_profiles', 'tasks', 'inventory',
            'financial_transactions', 'work_records', 'employees', 'day_laborers',
            'livestock', 'crop_types', 'crop_varieties'
        )
    LOOP
        SELECT rowsecurity INTO rls_status 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = table_name;
        
        IF NOT rls_status THEN
            RAISE NOTICE 'WARNING: RLS not enabled on table %', table_name;
        ELSE
            RAISE NOTICE 'SUCCESS: RLS enabled on table %', table_name;
        END IF;
    END LOOP;
END $$;
