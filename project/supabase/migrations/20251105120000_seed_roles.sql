-- Seed default roles
-- This migration creates the standard role hierarchy for the application

-- Insert roles (using ON CONFLICT to make it idempotent)
INSERT INTO roles (name, display_name, description, level, is_active) VALUES
  ('system_admin', 'System Administrator', 'Full system access across all organizations', 1, true),
  ('organization_admin', 'Organization Admin', 'Full access within their organization', 2, true),
  ('farm_manager', 'Farm Manager', 'Manage specific farms and their operations', 3, true),
  ('farm_worker', 'Farm Worker', 'Access to assigned tasks and farm operations', 4, true),
  ('day_laborer', 'Day Laborer', 'Limited access for temporary workers', 5, true),
  ('viewer', 'Viewer', 'Read-only access to information', 6, true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
