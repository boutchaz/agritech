-- Fix RLS policy for inserting tasks
-- The existing "org_members_can_manage_tasks" policy doesn't specify a command type,
-- so we need to add explicit INSERT policy

-- Drop the existing generic policy if it exists
DROP POLICY IF EXISTS "org_members_can_manage_tasks" ON tasks;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "org_members_can_view_tasks" ON tasks;
DROP POLICY IF EXISTS "org_members_can_insert_tasks" ON tasks;
DROP POLICY IF EXISTS "org_members_can_update_tasks" ON tasks;
DROP POLICY IF EXISTS "org_members_can_delete_tasks" ON tasks;

-- Create separate policies for different operations
CREATE POLICY "org_members_can_view_tasks"
  ON tasks
  FOR SELECT
  USING (
    is_active_org_member(auth.uid(), farm_id)
    OR assigned_to = auth.uid()
  );

CREATE POLICY "org_members_can_insert_tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (
    -- User must be an active member of the organization
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('owner', 'admin', 'manager', 'member')
    )
    AND
    -- Farm must belong to the organization
    farm_id IN (
      SELECT f.id
      FROM farms f
      WHERE f.organization_id = tasks.organization_id
    )
  );

CREATE POLICY "org_members_can_update_tasks"
  ON tasks
  FOR UPDATE
  USING (
    is_active_org_member(auth.uid(), farm_id)
  )
  WITH CHECK (
    is_active_org_member(auth.uid(), farm_id)
  );

CREATE POLICY "org_members_can_delete_tasks"
  ON tasks
  FOR DELETE
  USING (
    user_has_permission_for_org(auth.uid(), farm_id, 'tasks.manage')
  );

-- Add comment
COMMENT ON POLICY "org_members_can_insert_tasks" ON tasks IS
  'Allows organization members to create tasks within their organization';
