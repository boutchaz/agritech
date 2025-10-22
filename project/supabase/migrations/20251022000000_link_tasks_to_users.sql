-- Link tasks to platform users instead of just worker names
-- This allows proper assignment to users who can actually see their tasks

-- First, let's understand what we have:
-- - tasks.assigned_to is currently TEXT (can be worker name or UUID)
-- - workers.user_id links workers to auth.users

-- Step 1: Change assigned_to to be a UUID reference to auth.users
-- We'll rename the old column first for safety
DO $$
BEGIN
  -- Only proceed if assigned_to is currently text type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks'
    AND column_name = 'assigned_to'
    AND data_type = 'text'
  ) THEN
    -- Rename old column as backup
    ALTER TABLE tasks RENAME COLUMN assigned_to TO assigned_to_old;

    -- Add new assigned_to as UUID
    ALTER TABLE tasks ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

    -- Try to migrate data if possible (if assigned_to_old contains valid UUIDs)
    UPDATE tasks
    SET assigned_to = assigned_to_old::uuid
    WHERE assigned_to_old IS NOT NULL
    AND assigned_to_old ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Drop old column after verification
    -- ALTER TABLE tasks DROP COLUMN assigned_to_old; -- Uncomment after verification
  END IF;
END $$;

-- Step 2: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- Step 3: Create a view to get all assignable users in an organization
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

-- Step 4: Grant permissions
GRANT SELECT ON assignable_users TO authenticated;

-- Step 5: Add comments
COMMENT ON COLUMN tasks.assigned_to IS 'User ID of the person assigned to this task. References auth.users, allowing platform users to see their assigned tasks.';
COMMENT ON VIEW assignable_users IS 'View of all users who can be assigned to tasks, including workers with platform access and regular organization members.';

-- Step 6: Update RLS policy to allow users to see tasks assigned to them
CREATE POLICY "Users can view tasks assigned to them"
  ON tasks
  FOR SELECT
  USING (
    assigned_to = auth.uid()
  );

-- Step 7: Create a helper function to get user's assignable tasks
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
  WHERE t.assigned_to = user_uuid
  ORDER BY t.scheduled_start DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_tasks(uuid) TO authenticated;

COMMENT ON FUNCTION get_user_tasks IS 'Retrieves all tasks assigned to a specific user with related farm and parcel information.';
