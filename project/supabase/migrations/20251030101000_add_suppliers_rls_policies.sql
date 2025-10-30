-- Add RLS policies for suppliers table
-- The table had RLS enabled but no policies, causing all operations to fail

-- ============================================================================
-- Suppliers RLS Policies (matching customers pattern)
-- ============================================================================

-- Users can view suppliers in their organization
CREATE POLICY suppliers_select_policy ON public.suppliers
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Users can insert suppliers in their organization
CREATE POLICY suppliers_insert_policy ON public.suppliers
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Users can update suppliers in their organization
CREATE POLICY suppliers_update_policy ON public.suppliers
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Users can delete suppliers in their organization (admin/manager only)
CREATE POLICY suppliers_delete_policy ON public.suppliers
  FOR DELETE
  USING (
    organization_id IN (
      SELECT ou.organization_id
      FROM public.organization_users ou
      JOIN public.roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY suppliers_select_policy ON public.suppliers IS
  'Allow users to view suppliers in their organization';
COMMENT ON POLICY suppliers_insert_policy ON public.suppliers IS
  'Allow users to create suppliers in their organization';
COMMENT ON POLICY suppliers_update_policy ON public.suppliers IS
  'Allow users to update suppliers in their organization';
COMMENT ON POLICY suppliers_delete_policy ON public.suppliers IS
  'Allow admins and managers to delete suppliers';
