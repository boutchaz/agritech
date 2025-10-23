-- Essential migration for tasks functionality
-- This creates the assignable_users view needed for the dropdown

-- Create a view to get all assignable users in an organization
CREATE OR REPLACE VIEW assignable_users AS
SELECT DISTINCT
  u.id as user_id,
  up.first_name,
  up.last_name,
  up.first_name || ' ' || up.last_name as full_name,
  ou.organization_id,
  ou.role,
  w.id as worker_id,
  w.position as worker_position,
  CASE
    WHEN w.id IS NOT NULL THEN 'worker'
    ELSE 'user'
  END as user_type
FROM auth.users u
INNER JOIN user_profiles up ON up.id = u.id
INNER JOIN organization_users ou ON ou.user_id = u.id
LEFT JOIN workers w ON w.user_id = u.id AND w.is_active = true
WHERE ou.role IN ('admin', 'manager', 'member')
ORDER BY up.last_name, up.first_name;

-- Grant permissions
GRANT SELECT ON assignable_users TO authenticated;

-- Add comment
COMMENT ON VIEW assignable_users IS 'View of all users who can be assigned to tasks, including workers with platform access and regular organization members.';
