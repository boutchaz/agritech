-- Seed essential roles for the system
-- This ensures roles exist before users are created

INSERT INTO public.roles (name, display_name, description, level)
VALUES
  ('system_admin', 'System Administrator', 'Full access to all features', 100),
  ('organization_admin', 'Organization Administrator', 'Full access within organization', 80),
  ('farm_manager', 'Farm Manager', 'Manage specific farm operations', 60),
  ('farm_worker', 'Farm Worker', 'Basic farm operations access', 40),
  ('day_laborer', 'Day Laborer', 'Temporary worker access', 20),
  ('viewer', 'Viewer', 'Read-only access', 10)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  level = EXCLUDED.level;

-- Grant execute permissions on edge functions to service role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO service_role;

-- Ensure service role can insert into all tables
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA auth TO service_role;
