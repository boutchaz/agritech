-- Fix seed_tree_data_for_new_organization to run with elevated permissions
-- Problem: Function runs as SECURITY INVOKER, so RLS blocks inserts when user isn't in organization_users yet
-- Solution: Change to SECURITY DEFINER so it runs as function owner (bypassing RLS)

ALTER FUNCTION seed_tree_data_for_new_organization() SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION seed_tree_data_for_new_organization()
IS 'Seeds default tree categories and plantation types for new organizations. Runs as SECURITY DEFINER to bypass RLS during initial setup.';
