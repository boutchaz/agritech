-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE CHECK (name IN ('system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'day_laborer', 'viewer')),
    display_name TEXT NOT NULL,
    description TEXT,
    level INTEGER NOT NULL, -- Hierarchy level: 1=system_admin, 2=org_admin, 3=farm_manager, 4=farm_worker, 5=day_laborer, 6=viewer
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    resource TEXT NOT NULL, -- e.g., 'utilities', 'parcels', 'users'
    action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'manage')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Update organization_users table to include role_id
ALTER TABLE public.organization_users
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_level ON public.roles(level);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON public.permissions(action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_role_id ON public.organization_users(role_id);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for roles (readable by all authenticated users)
CREATE POLICY "Authenticated users can view roles" ON public.roles
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create RLS policies for permissions (readable by all authenticated users)
CREATE POLICY "Authenticated users can view permissions" ON public.permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create RLS policies for role_permissions (readable by all authenticated users)
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create helper function to check if user is system admin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_system_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_users ou
        JOIN public.roles r ON r.id = ou.role_id
        WHERE ou.user_id = user_id AND r.name = 'system_admin'
    );
$$;

-- Only system admins can INSERT, UPDATE, DELETE roles
CREATE POLICY "Only system admins can insert roles" ON public.roles
    FOR INSERT WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "Only system admins can update roles" ON public.roles
    FOR UPDATE USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Only system admins can delete roles" ON public.roles
    FOR DELETE USING (public.is_system_admin(auth.uid()));

-- Only system admins can INSERT, UPDATE, DELETE permissions
CREATE POLICY "Only system admins can insert permissions" ON public.permissions
    FOR INSERT WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "Only system admins can update permissions" ON public.permissions
    FOR UPDATE USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Only system admins can delete permissions" ON public.permissions
    FOR DELETE USING (public.is_system_admin(auth.uid()));

-- Only system admins can INSERT, UPDATE, DELETE role_permissions
CREATE POLICY "Only system admins can insert role permissions" ON public.role_permissions
    FOR INSERT WITH CHECK (public.is_system_admin(auth.uid()));

CREATE POLICY "Only system admins can update role permissions" ON public.role_permissions
    FOR UPDATE USING (public.is_system_admin(auth.uid()));

CREATE POLICY "Only system admins can delete role permissions" ON public.role_permissions
    FOR DELETE USING (public.is_system_admin(auth.uid()));

-- Insert default roles
INSERT INTO public.roles (name, display_name, description, level) VALUES
('system_admin', 'System Administrator', 'Manages the entire platform and all organizations', 1),
('organization_admin', 'Organization Administrator', 'Manages a specific organization, including its farms, users, and billing', 2),
('farm_manager', 'Farm Manager', 'Manages the day-to-day operations of a single farm', 3),
('farm_worker', 'Farm Worker', 'Regular employee with access to specific features relevant to their work', 4),
('day_laborer', 'Day Laborer', 'Temporary worker with very limited access for specific tasks', 5),
('viewer', 'Viewer', 'Read-only role for stakeholders, consultants, or observers', 6)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    level = EXCLUDED.level,
    updated_at = NOW();

-- Insert default permissions
INSERT INTO public.permissions (name, display_name, description, resource, action) VALUES
-- Utilities permissions
('utilities.create', 'Create Utilities', 'Create new utility records', 'utilities', 'create'),
('utilities.read', 'Read Utilities', 'View utility records', 'utilities', 'read'),
('utilities.update', 'Update Utilities', 'Edit utility records', 'utilities', 'update'),
('utilities.delete', 'Delete Utilities', 'Delete utility records', 'utilities', 'delete'),
('utilities.manage', 'Manage Utilities', 'Full utilities management including invoices and reports', 'utilities', 'manage'),

-- Users permissions
('users.create', 'Create Users', 'Add new users to organization', 'users', 'create'),
('users.read', 'Read Users', 'View user information', 'users', 'read'),
('users.update', 'Update Users', 'Edit user information and roles', 'users', 'update'),
('users.delete', 'Delete Users', 'Remove users from organization', 'users', 'delete'),
('users.manage', 'Manage Users', 'Full user management including role assignments', 'users', 'manage'),

-- Organizations permissions
('organizations.create', 'Create Organizations', 'Create new organizations', 'organizations', 'create'),
('organizations.read', 'Read Organizations', 'View organization information', 'organizations', 'read'),
('organizations.update', 'Update Organizations', 'Edit organization settings', 'organizations', 'update'),
('organizations.delete', 'Delete Organizations', 'Delete organizations', 'organizations', 'delete'),
('organizations.manage', 'Manage Organizations', 'Full organization management', 'organizations', 'manage'),

-- Farms permissions
('farms.create', 'Create Farms', 'Create new farms', 'farms', 'create'),
('farms.read', 'Read Farms', 'View farm information', 'farms', 'read'),
('farms.update', 'Update Farms', 'Edit farm settings and data', 'farms', 'update'),
('farms.delete', 'Delete Farms', 'Delete farms', 'farms', 'delete'),
('farms.manage', 'Manage Farms', 'Full farm management', 'farms', 'manage'),

-- Parcels permissions
('parcels.create', 'Create Parcels', 'Create new parcels', 'parcels', 'create'),
('parcels.read', 'Read Parcels', 'View parcel information', 'parcels', 'read'),
('parcels.update', 'Update Parcels', 'Edit parcel data', 'parcels', 'update'),
('parcels.delete', 'Delete Parcels', 'Delete parcels', 'parcels', 'delete'),

-- Stock permissions
('stock.create', 'Create Stock', 'Add new stock items', 'stock', 'create'),
('stock.read', 'Read Stock', 'View stock information', 'stock', 'read'),
('stock.update', 'Update Stock', 'Edit stock levels and data', 'stock', 'update'),
('stock.delete', 'Delete Stock', 'Remove stock items', 'stock', 'delete'),

-- Reports permissions
('reports.read', 'Read Reports', 'View reports and analytics', 'reports', 'read'),
('reports.create', 'Create Reports', 'Generate custom reports', 'reports', 'create')

ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action;

-- Assign permissions to roles
WITH role_permission_mappings AS (
    SELECT
        r.id as role_id,
        p.id as permission_id
    FROM public.roles r
    CROSS JOIN public.permissions p
    WHERE
        -- System Admin gets all permissions
        (r.name = 'system_admin') OR

        -- Organization Admin permissions
        (r.name = 'organization_admin' AND p.name IN (
            'utilities.read', 'utilities.create', 'utilities.update', 'utilities.manage',
            'users.read', 'users.create', 'users.update', 'users.manage',
            'organizations.read', 'organizations.update',
            'farms.read', 'farms.create', 'farms.update', 'farms.manage',
            'parcels.read', 'parcels.create', 'parcels.update',
            'stock.read', 'stock.create', 'stock.update',
            'reports.read', 'reports.create'
        )) OR

        -- Farm Manager permissions
        (r.name = 'farm_manager' AND p.name IN (
            'utilities.read', 'utilities.create', 'utilities.update', 'utilities.manage',
            'users.read',
            'farms.read', 'farms.update',
            'parcels.read', 'parcels.create', 'parcels.update', 'parcels.delete',
            'stock.read', 'stock.create', 'stock.update', 'stock.delete',
            'reports.read', 'reports.create'
        )) OR

        -- Farm Worker permissions
        (r.name = 'farm_worker' AND p.name IN (
            'utilities.read',
            'parcels.read', 'parcels.update',
            'stock.read', 'stock.update',
            'reports.read'
        )) OR

        -- Day Laborer permissions
        (r.name = 'day_laborer' AND p.name IN (
            'utilities.read',
            'parcels.read',
            'stock.read'
        )) OR

        -- Viewer permissions
        (r.name = 'viewer' AND p.name IN (
            'utilities.read',
            'farms.read',
            'parcels.read',
            'stock.read',
            'reports.read'
        ))
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role_id, permission_id FROM role_permission_mappings
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create trigger for updated_at on roles
CREATE TRIGGER handle_updated_at_roles
    BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_users ou
        JOIN public.role_permissions rp ON rp.role_id = ou.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ou.user_id = $1 AND p.name = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID, org_id UUID DEFAULT NULL)
RETURNS TABLE(role_name TEXT, role_display_name TEXT, role_level INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT r.name, r.display_name, r.level
    FROM public.organization_users ou
    JOIN public.roles r ON r.id = ou.role_id
    WHERE ou.user_id = user_id
    AND (org_id IS NULL OR ou.organization_id = org_id)
    ORDER BY r.level ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.name, p.resource, p.action
    FROM public.organization_users ou
    JOIN public.role_permissions rp ON rp.role_id = ou.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ou.user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';