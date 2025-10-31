-- Fix document_templates RLS policies to use roles table instead of organization_users.role
-- The organization_users table uses role_id, not role column

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can view their organization's document templates" ON document_templates;
DROP POLICY IF EXISTS "Admins and managers can create document templates" ON document_templates;
DROP POLICY IF EXISTS "Admins and managers can update document templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can delete document templates" ON document_templates;

-- Recreate policies with correct role checking (join with roles table)
CREATE POLICY "Users can view their organization's document templates"
  ON document_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can create document templates"
  ON document_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

CREATE POLICY "Admins and managers can update document templates"
  ON document_templates
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

CREATE POLICY "Admins can delete document templates"
  ON document_templates
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND r.name IN ('organization_admin', 'system_admin')
    )
  );
