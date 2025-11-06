-- Add RLS policies for subscriptions table
-- This allows users to read subscriptions for their organization

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_view_org_subscription" ON subscriptions;
DROP POLICY IF EXISTS "admins_manage_subscription" ON subscriptions;
DROP POLICY IF EXISTS "org_read_subscriptions" ON subscriptions;

-- Allow users to view subscriptions for organizations they belong to
CREATE POLICY "org_read_subscriptions" ON subscriptions
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

-- Allow organization admins to insert subscriptions
CREATE POLICY "org_insert_subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id) AND
    EXISTS (
      SELECT 1
      FROM public.organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = subscriptions.organization_id
        AND ou.role IN ('system_admin', 'organization_admin')
        AND ou.is_active = true
    )
  );

-- Allow organization admins to update subscriptions
CREATE POLICY "org_update_subscriptions" ON subscriptions
  FOR UPDATE USING (
    is_organization_member(organization_id) AND
    EXISTS (
      SELECT 1
      FROM public.organization_users
      WHERE user_id = auth.uid()
        AND organization_id = subscriptions.organization_id
        AND role IN ('system_admin', 'organization_admin')
        AND is_active = true
    )
  );

-- Allow organization admins to delete subscriptions
CREATE POLICY "org_delete_subscriptions" ON subscriptions
  FOR DELETE USING (
    is_organization_member(organization_id) AND
    EXISTS (
      SELECT 1
      FROM public.organization_users
      WHERE user_id = auth.uid()
        AND organization_id = subscriptions.organization_id
        AND role IN ('system_admin', 'organization_admin')
        AND is_active = true
    )
  );

