-- Apply this via Supabase SQL Editor or npx supabase db execute

-- Step 1: Create assignable_users view first (doesn't depend on schema changes)
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
WHERE ou.role IN ('organization_admin', 'farm_manager', 'farm_worker', 'day_laborer')
ORDER BY up.last_name, up.first_name;

GRANT SELECT ON assignable_users TO authenticated;

COMMENT ON VIEW assignable_users IS 'View of all users who can be assigned to tasks, including workers with platform access and regular organization members.';

-- Step 2: Create helper function to get user's tasks
CREATE OR REPLACE FUNCTION get_user_tasks(user_uuid uuid)
RETURNS TABLE (
  task_id uuid,
  task_title text,
  task_description text,
  task_type text,
  priority text,
  status text,
  scheduled_start timestamp with time zone,
  due_date date,
  farm_name text,
  parcel_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    t.id,
    t.title,
    t.description,
    t.task_type,
    t.priority,
    t.status,
    t.scheduled_start,
    t.due_date,
    f.name as farm_name,
    p.name as parcel_name
  FROM tasks t
  LEFT JOIN farms f ON f.id = t.farm_id
  LEFT JOIN parcels p ON p.id = t.parcel_id
  WHERE t.assigned_to = user_uuid::text
  ORDER BY t.scheduled_start DESC;
$$;

GRANT EXECUTE ON FUNCTION get_user_tasks(uuid) TO authenticated;

COMMENT ON FUNCTION get_user_tasks IS 'Retrieves all tasks assigned to a specific user with related farm and parcel information.';
