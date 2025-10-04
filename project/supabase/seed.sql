-- Seed data for roles table
-- Note: Temporarily disable system admin check triggers for initial seed
DO $$
BEGIN
  -- Drop triggers if they exist
  DROP TRIGGER IF EXISTS enforce_system_admin_roles_delete ON roles;
  DROP TRIGGER IF EXISTS enforce_system_admin_roles_insert ON roles;
  DROP TRIGGER IF EXISTS enforce_system_admin_roles_update ON roles;
END $$;

INSERT INTO roles (name, display_name, description, level, is_active) VALUES
  ('system_admin', 'System Administrator', 'Full system access including all organizations', 1, true),
  ('organization_admin', 'Organization Admin', 'Full control over organization settings and users', 2, true),
  ('farm_manager', 'Farm Manager', 'Manage farms, parcels, and workers', 3, true),
  ('farm_worker', 'Farm Worker', 'Manage assigned parcels and tasks', 4, true),
  ('day_laborer', 'Day Laborer', 'View assigned tasks only', 5, true),
  ('viewer', 'Viewer', 'Read-only access', 6, true)
ON CONFLICT (name) DO NOTHING;

-- Recreate triggers after seeding roles
DO $$
BEGIN
  CREATE TRIGGER enforce_system_admin_roles_insert
    BEFORE INSERT ON roles
    FOR EACH ROW
    EXECUTE FUNCTION check_system_admin_for_reference_tables();

  CREATE TRIGGER enforce_system_admin_roles_update
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION check_system_admin_for_reference_tables();

  CREATE TRIGGER enforce_system_admin_roles_delete
    BEFORE DELETE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION check_system_admin_for_reference_tables();
EXCEPTION
  WHEN duplicate_object THEN NULL; -- Ignore if triggers already exist
END $$;

-- Seed data for permissions table (basic permissions)
-- Temporarily disable system admin check for permissions
DO $$
BEGIN
  DROP TRIGGER IF EXISTS enforce_system_admin_permissions_delete ON permissions;
  DROP TRIGGER IF EXISTS enforce_system_admin_permissions_insert ON permissions;
  DROP TRIGGER IF EXISTS enforce_system_admin_permissions_update ON permissions;
END $$;

INSERT INTO permissions (name, display_name, resource, action, description) VALUES
  -- Organization permissions
  ('org.read', 'View Organization', 'organization', 'read', 'View organization details'),
  ('org.update', 'Update Organization', 'organization', 'update', 'Update organization settings'),
  ('org.delete', 'Delete Organization', 'organization', 'delete', 'Delete organization'),

  -- User management permissions
  ('users.read', 'View Users', 'users', 'read', 'View users'),
  ('users.create', 'Create Users', 'users', 'create', 'Create new users'),
  ('users.update', 'Update Users', 'users', 'update', 'Update user details'),
  ('users.delete', 'Delete Users', 'users', 'delete', 'Delete users'),
  ('users.manage', 'Manage Roles', 'users', 'manage', 'Assign and change user roles'),

  -- Farm permissions
  ('farms.read', 'View Farms', 'farms', 'read', 'View farms'),
  ('farms.create', 'Create Farms', 'farms', 'create', 'Create new farms'),
  ('farms.update', 'Update Farms', 'farms', 'update', 'Update farm details'),
  ('farms.delete', 'Delete Farms', 'farms', 'delete', 'Delete farms'),

  -- Parcel permissions
  ('parcels.read', 'View Parcels', 'parcels', 'read', 'View parcels'),
  ('parcels.create', 'Create Parcels', 'parcels', 'create', 'Create new parcels'),
  ('parcels.update', 'Update Parcels', 'parcels', 'update', 'Update parcel details'),
  ('parcels.delete', 'Delete Parcels', 'parcels', 'delete', 'Delete parcels'),

  -- Worker permissions
  ('workers.read', 'View Workers', 'workers', 'read', 'View workers'),
  ('workers.create', 'Add Workers', 'workers', 'create', 'Add new workers'),
  ('workers.update', 'Update Workers', 'workers', 'update', 'Update worker details'),
  ('workers.delete', 'Remove Workers', 'workers', 'delete', 'Remove workers'),

  -- Analysis permissions
  ('analyses.read', 'View Analyses', 'analyses', 'read', 'View analyses'),
  ('analyses.create', 'Create Analyses', 'analyses', 'create', 'Create analyses'),
  ('analyses.update', 'Update Analyses', 'analyses', 'update', 'Update analyses'),
  ('analyses.delete', 'Delete Analyses', 'analyses', 'delete', 'Delete analyses'),

  -- Report permissions
  ('reports.read', 'View Reports', 'reports', 'read', 'View reports'),
  ('reports.create', 'Generate Reports', 'reports', 'create', 'Generate reports'),
  ('reports.manage', 'Export Reports', 'reports', 'manage', 'Export reports'),

  -- Settings permissions
  ('settings.read', 'View Settings', 'settings', 'read', 'View settings'),
  ('settings.update', 'Update Settings', 'settings', 'update', 'Update settings'),

  -- Subscription permissions
  ('subscription.read', 'View Subscription', 'subscription', 'read', 'View subscription details'),
  ('subscription.manage', 'Manage Subscription', 'subscription', 'manage', 'Manage subscription and billing')
ON CONFLICT (name) DO NOTHING;

-- Recreate permissions triggers
DO $$
BEGIN
  CREATE TRIGGER enforce_system_admin_permissions_insert
    BEFORE INSERT ON permissions
    FOR EACH ROW
    EXECUTE FUNCTION check_system_admin_for_reference_tables();

  CREATE TRIGGER enforce_system_admin_permissions_update
    BEFORE UPDATE ON permissions
    FOR EACH ROW
    EXECUTE FUNCTION check_system_admin_for_reference_tables();

  CREATE TRIGGER enforce_system_admin_permissions_delete
    BEFORE DELETE ON permissions
    FOR EACH ROW
    EXECUTE FUNCTION check_system_admin_for_reference_tables();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'organization_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'farm_manager'
  AND p.name IN (
    'farms.read', 'farms.create', 'farms.update',
    'parcels.read', 'parcels.create', 'parcels.update', 'parcels.delete',
    'workers.read', 'workers.create', 'workers.update',
    'analyses.read', 'analyses.create', 'analyses.update',
    'reports.read', 'reports.create', 'reports.manage'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'farm_worker'
  AND p.name IN (
    'parcels.read', 'parcels.update',
    'workers.read',
    'analyses.read', 'analyses.create',
    'reports.read'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer'
  AND p.resource IN ('farms', 'parcels', 'workers', 'analyses', 'reports')
  AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- Note: crop_categories requires type_id which references crop_types
-- We'll skip seeding crop_categories since the structure needs revision

-- Note: Skipping crop_types seed as it depends on crop_categories

-- Note: plantation_types requires organization_id
-- Skipping plantation_types seed as it's organization-specific data