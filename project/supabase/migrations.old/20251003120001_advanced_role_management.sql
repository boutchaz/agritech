-- =================================
-- ADDITIONAL ROLE MANAGEMENT ENHANCEMENTS
-- =================================
-- This migration adds advanced role management features

-- =================================
-- 1. CREATE ROLE ASSIGNMENT AUDIT TABLE
-- =================================

CREATE TABLE IF NOT EXISTS public.role_assignments_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    old_role_id UUID REFERENCES public.roles(id),
    new_role_id UUID NOT NULL REFERENCES public.roles(id),
    assigned_by UUID REFERENCES auth.users(id),
    reason TEXT,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.role_assignments_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy for role assignments audit
CREATE POLICY "org_admins_can_view_role_audit" ON public.role_assignments_audit
    FOR SELECT USING (
        public.is_active_org_member(auth.uid(), organization_id) AND
        public.user_has_permission_for_org(auth.uid(), organization_id, 'users.manage')
    );

-- =================================
-- 2. CREATE ROLE TEMPLATES TABLE
-- =================================

CREATE TABLE IF NOT EXISTS public.role_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_system_template BOOLEAN DEFAULT FALSE,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for role templates
CREATE POLICY "authenticated_can_view_system_templates" ON public.role_templates
    FOR SELECT USING (is_system_template = true);

CREATE POLICY "org_members_can_view_org_templates" ON public.role_templates
    FOR SELECT USING (
        organization_id IS NULL OR 
        public.is_active_org_member(auth.uid(), organization_id)
    );

CREATE POLICY "org_admins_can_manage_org_templates" ON public.role_templates
    FOR ALL USING (
        organization_id IS NOT NULL AND
        public.is_active_org_member(auth.uid(), organization_id) AND
        public.user_has_permission_for_org(auth.uid(), organization_id, 'users.manage')
    );

-- =================================
-- 3. CREATE PERMISSION GROUPS TABLE
-- =================================

CREATE TABLE IF NOT EXISTS public.permission_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policy for permission groups
CREATE POLICY "authenticated_can_view_permission_groups" ON public.permission_groups
    FOR SELECT USING (auth.role() = 'authenticated');

-- =================================
-- 4. INSERT DEFAULT PERMISSION GROUPS
-- =================================

INSERT INTO public.permission_groups (name, display_name, description, permissions) VALUES
('farm_management', 'Farm Management', 'Core farm management permissions', ARRAY['farms.create', 'farms.read', 'farms.update', 'farms.manage', 'parcels.create', 'parcels.read', 'parcels.update', 'parcels.delete']),
('user_management', 'User Management', 'User and role management permissions', ARRAY['users.create', 'users.read', 'users.update', 'users.delete', 'users.manage']),
('financial_management', 'Financial Management', 'Financial and transaction permissions', ARRAY['organizations.read', 'organizations.update', 'organizations.manage']),
('reporting', 'Reporting', 'Report generation and viewing permissions', ARRAY['reports.read', 'reports.create']),
('utilities_management', 'Utilities Management', 'Utilities and infrastructure permissions', ARRAY['utilities.create', 'utilities.read', 'utilities.update', 'utilities.delete', 'utilities.manage']),
('stock_management', 'Stock Management', 'Inventory and stock management permissions', ARRAY['stock.create', 'stock.read', 'stock.update', 'stock.delete'])
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

-- =================================
-- 5. CREATE ADVANCED ROLE MANAGEMENT FUNCTIONS
-- =================================

-- Function to assign role with audit trail
CREATE OR REPLACE FUNCTION public.assign_role_with_audit(
    target_user_id UUID,
    target_org_id UUID,
    new_role_id UUID,
    reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    old_role_id UUID;
    current_user_role_level INTEGER;
    new_role_level INTEGER;
BEGIN
    -- Check if current user has permission to assign roles
    IF NOT public.user_has_permission_for_org(auth.uid(), target_org_id, 'users.manage') THEN
        RAISE EXCEPTION 'Insufficient permissions to assign roles';
    END IF;

    -- Get current user's role level
    current_user_role_level := public.get_user_role_level(auth.uid(), target_org_id);
    
    -- Get new role level
    SELECT level INTO new_role_level FROM public.roles WHERE id = new_role_id;
    
    -- Check if user can assign this role level
    IF new_role_level < current_user_role_level THEN
        RAISE EXCEPTION 'Cannot assign role with higher privileges than your own';
    END IF;

    -- Get old role
    SELECT role_id INTO old_role_id 
    FROM public.organization_users 
    WHERE user_id = target_user_id AND organization_id = target_org_id;

    -- Update role
    UPDATE public.organization_users 
    SET role_id = new_role_id, updated_at = NOW()
    WHERE user_id = target_user_id AND organization_id = target_org_id;

    -- Create audit record
    INSERT INTO public.role_assignments_audit (
        user_id, organization_id, old_role_id, new_role_id, 
        assigned_by, reason
    ) VALUES (
        target_user_id, target_org_id, old_role_id, new_role_id,
        auth.uid(), reason
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(user_id UUID, org_id UUID)
RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT, granted_by_role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p.name as permission_name,
        p.resource,
        p.action,
        r.name as granted_by_role
    FROM public.organization_users ou
    JOIN public.role_permissions rp ON rp.role_id = ou.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.roles r ON r.id = ou.role_id
    WHERE ou.user_id = $1 
    AND ou.organization_id = $2
    AND ou.is_active = true
    ORDER BY p.resource, p.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can perform action
CREATE OR REPLACE FUNCTION public.can_user_perform_action(
    user_id UUID, 
    org_id UUID, 
    resource_name TEXT, 
    action_name TEXT
)
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
        AND p.resource = $3
        AND (p.action = $4 OR p.action = 'manage')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get role hierarchy for organization
CREATE OR REPLACE FUNCTION public.get_organization_role_hierarchy(org_id UUID)
RETURNS TABLE(
    role_id UUID,
    role_name TEXT,
    display_name TEXT,
    level INTEGER,
    user_count BIGINT,
    permissions_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as role_id,
        r.name as role_name,
        r.display_name,
        r.level,
        COUNT(ou.user_id) as user_count,
        COUNT(rp.permission_id) as permissions_count
    FROM public.roles r
    LEFT JOIN public.organization_users ou ON r.id = ou.role_id AND ou.organization_id = org_id AND ou.is_active = true
    LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
    GROUP BY r.id, r.name, r.display_name, r.level
    ORDER BY r.level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================
-- 6. CREATE ROLE TEMPLATE FUNCTIONS
-- =================================

-- Function to create role from template
CREATE OR REPLACE FUNCTION public.create_role_from_template(
    template_id UUID,
    org_id UUID,
    custom_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_role_id UUID;
    template_data RECORD;
BEGIN
    -- Check permissions
    IF NOT public.user_has_permission_for_org(auth.uid(), org_id, 'users.manage') THEN
        RAISE EXCEPTION 'Insufficient permissions to create roles';
    END IF;

    -- Get template data
    SELECT * INTO template_data FROM public.role_templates WHERE id = template_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Create new role
    INSERT INTO public.roles (name, display_name, description, level, is_active)
    VALUES (
        COALESCE(custom_name, template_data.name || '_' || org_id::text),
        template_data.display_name,
        template_data.description,
        3, -- Default to farm_manager level
        true
    ) RETURNING id INTO new_role_id;

    -- Assign permissions from template
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT new_role_id, p.id
    FROM public.permissions p
    WHERE p.name = ANY(template_data.permissions);

    RETURN new_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================
-- 7. CREATE ROLE VALIDATION FUNCTIONS
-- =================================

-- Function to validate role assignment
CREATE OR REPLACE FUNCTION public.validate_role_assignment(
    target_user_id UUID,
    target_org_id UUID,
    new_role_id UUID
)
RETURNS TABLE(
    is_valid BOOLEAN,
    error_message TEXT,
    warnings TEXT[]
) AS $$
DECLARE
    current_user_role_level INTEGER;
    new_role_level INTEGER;
    target_user_current_role_level INTEGER;
    warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get current user's role level
    current_user_role_level := public.get_user_role_level(auth.uid(), target_org_id);
    
    -- Get new role level
    SELECT level INTO new_role_level FROM public.roles WHERE id = new_role_id;
    
    -- Get target user's current role level
    target_user_current_role_level := public.get_user_role_level(target_user_id, target_org_id);

    -- Check if user exists in organization
    IF NOT public.is_active_org_member(target_user_id, target_org_id) THEN
        RETURN QUERY SELECT FALSE, 'User is not a member of this organization', ARRAY[]::TEXT[];
        RETURN;
    END IF;

    -- Check if current user has permission
    IF NOT public.user_has_permission_for_org(auth.uid(), target_org_id, 'users.manage') THEN
        RETURN QUERY SELECT FALSE, 'Insufficient permissions to assign roles', ARRAY[]::TEXT[];
        RETURN;
    END IF;

    -- Check if user can assign this role level
    IF new_role_level < current_user_role_level THEN
        RETURN QUERY SELECT FALSE, 'Cannot assign role with higher privileges than your own', ARRAY[]::TEXT[];
        RETURN;
    END IF;

    -- Add warnings
    IF new_role_level > target_user_current_role_level THEN
        warnings := array_append(warnings, 'This will increase the user''s privileges');
    END IF;

    IF new_role_level = 1 THEN -- system_admin
        warnings := array_append(warnings, 'System admin role grants full platform access');
    END IF;

    RETURN QUERY SELECT TRUE, NULL, warnings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================
-- 8. GRANT PERMISSIONS TO NEW FUNCTIONS
-- =================================

GRANT EXECUTE ON FUNCTION public.assign_role_with_audit(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_perform_action(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_role_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_role_from_template(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_role_assignment(UUID, UUID, UUID) TO authenticated;

-- =================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =================================

CREATE INDEX IF NOT EXISTS idx_role_assignments_audit_user_org ON public.role_assignments_audit(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_audit_assigned_by ON public.role_assignments_audit(assigned_by);
CREATE INDEX IF NOT EXISTS idx_role_assignments_audit_effective_date ON public.role_assignments_audit(effective_date);

CREATE INDEX IF NOT EXISTS idx_role_templates_org_id ON public.role_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_role_templates_is_system ON public.role_templates(is_system_template);

CREATE INDEX IF NOT EXISTS idx_permission_groups_name ON public.permission_groups(name);

-- =================================
-- 10. CREATE TRIGGERS FOR AUDIT
-- =================================

-- Trigger for role assignments audit
CREATE OR REPLACE FUNCTION public.audit_role_assignment()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.role_id != NEW.role_id THEN
        INSERT INTO public.role_assignments_audit (
            user_id, organization_id, old_role_id, new_role_id, assigned_by
        ) VALUES (
            NEW.user_id, NEW.organization_id, OLD.role_id, NEW.role_id, auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_role_assignment_trigger
    AFTER UPDATE ON public.organization_users
    FOR EACH ROW EXECUTE FUNCTION public.audit_role_assignment();

-- =================================
-- 11. REFRESH SCHEMA CACHE
-- =================================

NOTIFY pgrst, 'reload schema';
