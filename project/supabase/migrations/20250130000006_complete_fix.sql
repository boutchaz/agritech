-- Complete fix for ambiguous column references and missing audit_logs
-- This migration safely handles all function dependencies

-- Step 1: Drop ALL policies that depend on the functions we need to recreate
-- Organizations policies
DROP POLICY IF EXISTS "org_members_can_view" ON public.organizations;
DROP POLICY IF EXISTS "org_admins_can_update" ON public.organizations;
DROP POLICY IF EXISTS "org_admins_can_manage_memberships" ON public.organization_users;
DROP POLICY IF EXISTS "users_can_view_org_memberships" ON public.organization_users;

-- Farms policies
DROP POLICY IF EXISTS "org_members_can_view_farms" ON public.farms;
DROP POLICY IF EXISTS "org_members_can_create_farms" ON public.farms;
DROP POLICY IF EXISTS "org_members_can_update_farms" ON public.farms;
DROP POLICY IF EXISTS "org_admins_can_delete_farms" ON public.farms;

-- Parcels policies
DROP POLICY IF EXISTS "org_members_can_view_parcels" ON public.parcels;
DROP POLICY IF EXISTS "org_members_can_create_parcels" ON public.parcels;
DROP POLICY IF EXISTS "org_members_can_update_parcels" ON public.parcels;
DROP POLICY IF EXISTS "org_members_can_delete_parcels" ON public.parcels;

-- Crops policies
DROP POLICY IF EXISTS "org_members_can_view_crops" ON public.crops;
DROP POLICY IF EXISTS "org_members_can_manage_crops" ON public.crops;

-- Soil analyses policies
DROP POLICY IF EXISTS "org_members_can_view_soil_analyses" ON public.soil_analyses;
DROP POLICY IF EXISTS "org_members_can_manage_soil_analyses" ON public.soil_analyses;

-- Tasks policies
DROP POLICY IF EXISTS "org_members_can_view_tasks" ON public.tasks;
DROP POLICY IF EXISTS "org_members_can_manage_tasks" ON public.tasks;

-- Inventory policies
DROP POLICY IF EXISTS "org_members_can_view_inventory" ON public.inventory;
DROP POLICY IF EXISTS "org_members_can_manage_inventory" ON public.inventory;

-- Financial transactions policies
DROP POLICY IF EXISTS "org_members_can_view_transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "org_admins_can_manage_transactions" ON public.financial_transactions;

-- Work records policies
DROP POLICY IF EXISTS "org_members_can_view_work_records" ON public.work_records;
DROP POLICY IF EXISTS "org_members_can_manage_work_records" ON public.work_records;

-- Employees policies
DROP POLICY IF EXISTS "org_members_can_view_employees" ON public.employees;
DROP POLICY IF EXISTS "org_admins_can_manage_employees" ON public.employees;

-- Day laborers policies
DROP POLICY IF EXISTS "org_members_can_view_day_laborers" ON public.day_laborers;
DROP POLICY IF EXISTS "org_admins_can_manage_day_laborers" ON public.day_laborers;

-- Livestock policies
DROP POLICY IF EXISTS "org_members_can_view_livestock" ON public.livestock;
DROP POLICY IF EXISTS "org_members_can_manage_livestock" ON public.livestock;

-- Role templates policies
DROP POLICY IF EXISTS "org_members_can_view_org_templates" ON public.role_templates;
DROP POLICY IF EXISTS "org_admins_can_manage_org_templates" ON public.role_templates;

-- Role assignments audit policies
DROP POLICY IF EXISTS "org_admins_can_view_role_audit" ON public.role_assignments_audit;

-- Step 2: Now we can safely drop and recreate the functions
DROP FUNCTION IF EXISTS public.get_user_role(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_role_level(UUID, UUID);
DROP FUNCTION IF EXISTS public.user_has_permission_for_org(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.is_active_org_member(UUID, UUID);

-- Step 3: Create audit_logs table first
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id uuid REFERENCES auth.users(id),
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: Recreate the functions with explicit parameter references
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID, org_id UUID DEFAULT NULL)
RETURNS TABLE(role_name TEXT, role_display_name TEXT, role_level INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT r.name, r.display_name, r.level
    FROM public.organization_users ou
    JOIN public.roles r ON r.id = ou.role_id
    WHERE ou.user_id = $1
    AND (org_id IS NULL OR ou.organization_id = $2)
    ORDER BY r.level ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Step 5: Recreate all the policies
-- Organizations policies
CREATE POLICY "org_members_can_view" ON public.organizations
    FOR SELECT USING (public.is_active_org_member(auth.uid(), id));

CREATE POLICY "org_admins_can_update" ON public.organizations
    FOR UPDATE USING (public.user_has_permission_for_org(auth.uid(), id, 'organizations.update'));

CREATE POLICY "org_admins_can_manage_memberships" ON public.organization_users
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), organization_id, 'users.manage'));

CREATE POLICY "users_can_view_org_memberships" ON public.organization_users
    FOR SELECT USING (public.is_active_org_member(auth.uid(), organization_id));

-- Farms policies
CREATE POLICY "org_members_can_view_farms" ON public.farms
    FOR SELECT USING (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "org_members_can_create_farms" ON public.farms
    FOR INSERT WITH CHECK (public.user_has_permission_for_org(auth.uid(), organization_id, 'farms.create'));

CREATE POLICY "org_members_can_update_farms" ON public.farms
    FOR UPDATE USING (public.user_has_permission_for_org(auth.uid(), organization_id, 'farms.update'));

CREATE POLICY "org_admins_can_delete_farms" ON public.farms
    FOR DELETE USING (public.user_has_permission_for_org(auth.uid(), organization_id, 'farms.delete'));

-- Parcels policies
CREATE POLICY "org_members_can_view_parcels" ON public.parcels
    FOR SELECT USING (public.is_active_org_member(auth.uid(), farm_id));

CREATE POLICY "org_members_can_create_parcels" ON public.parcels
    FOR INSERT WITH CHECK (public.user_has_permission_for_org(auth.uid(), farm_id, 'parcels.create'));

CREATE POLICY "org_members_can_update_parcels" ON public.parcels
    FOR UPDATE USING (public.user_has_permission_for_org(auth.uid(), farm_id, 'parcels.update'));

CREATE POLICY "org_members_can_delete_parcels" ON public.parcels
    FOR DELETE USING (public.user_has_permission_for_org(auth.uid(), farm_id, 'parcels.delete'));

-- Crops policies
CREATE POLICY "org_members_can_view_crops" ON public.crops
    FOR SELECT USING (public.is_active_org_member(auth.uid(), farm_id));

CREATE POLICY "org_members_can_manage_crops" ON public.crops
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), farm_id, 'crops.manage'));

-- Soil analyses policies
CREATE POLICY "org_members_can_view_soil_analyses" ON public.soil_analyses
    FOR SELECT USING (public.is_active_org_member(auth.uid(), parcel_id));

CREATE POLICY "org_members_can_manage_soil_analyses" ON public.soil_analyses
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), parcel_id, 'soil_analyses.manage'));

-- Tasks policies
CREATE POLICY "org_members_can_view_tasks" ON public.tasks
    FOR SELECT USING (public.is_active_org_member(auth.uid(), farm_id));

CREATE POLICY "org_members_can_manage_tasks" ON public.tasks
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), farm_id, 'tasks.manage'));

-- Inventory policies
CREATE POLICY "org_members_can_view_inventory" ON public.inventory
    FOR SELECT USING (public.is_active_org_member(auth.uid(), farm_id));

CREATE POLICY "org_members_can_manage_inventory" ON public.inventory
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), farm_id, 'inventory.manage'));

-- Financial transactions policies
CREATE POLICY "org_members_can_view_transactions" ON public.financial_transactions
    FOR SELECT USING (public.is_active_org_member(auth.uid(), farm_id));

CREATE POLICY "org_admins_can_manage_transactions" ON public.financial_transactions
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), farm_id, 'financial.manage'));

-- Work records policies
CREATE POLICY "org_members_can_view_work_records" ON public.work_records
    FOR SELECT USING (public.is_active_org_member(auth.uid(), farm_id));

CREATE POLICY "org_members_can_manage_work_records" ON public.work_records
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), farm_id, 'work_records.manage'));

-- Employees policies
CREATE POLICY "org_members_can_view_employees" ON public.employees
    FOR SELECT USING (public.is_active_org_member(auth.uid(), farm_id));

CREATE POLICY "org_admins_can_manage_employees" ON public.employees
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), farm_id, 'employees.manage'));

-- Day laborers policies
CREATE POLICY "org_members_can_view_day_laborers" ON public.day_laborers
    FOR SELECT USING (public.is_active_org_member(auth.uid(), farm_id));

CREATE POLICY "org_admins_can_manage_day_laborers" ON public.day_laborers
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), farm_id, 'day_laborers.manage'));

-- Livestock policies
CREATE POLICY "org_members_can_view_livestock" ON public.livestock
    FOR SELECT USING (public.is_active_org_member(auth.uid(), farm_id));

CREATE POLICY "org_members_can_manage_livestock" ON public.livestock
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), farm_id, 'livestock.manage'));

-- Role templates policies
CREATE POLICY "org_members_can_view_org_templates" ON public.role_templates
    FOR SELECT USING (public.is_active_org_member(auth.uid(), organization_id));

CREATE POLICY "org_admins_can_manage_org_templates" ON public.role_templates
    FOR ALL USING (public.user_has_permission_for_org(auth.uid(), organization_id, 'templates.manage'));

-- Role assignments audit policies
CREATE POLICY "org_admins_can_view_role_audit" ON public.role_assignments_audit
    FOR SELECT USING (public.user_has_permission_for_org(auth.uid(), organization_id, 'audit.view'));

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid() 
            AND r.name IN ('system_admin', 'organization_admin')
        )
    );

-- Step 6: Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger AS $func$
BEGIN
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        auth.uid(),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
