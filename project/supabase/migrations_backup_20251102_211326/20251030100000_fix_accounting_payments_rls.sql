-- Fix RLS policies for accounting_payments table
-- The policies were using 'role' column which doesn't exist in organization_users
-- Need to join with roles table using role_id

-- Drop existing policies
DROP POLICY IF EXISTS "org_write_accounting_payments" ON accounting_payments;
DROP POLICY IF EXISTS "org_update_accounting_payments" ON accounting_payments;
DROP POLICY IF EXISTS "org_delete_accounting_payments" ON accounting_payments;

-- Recreate INSERT policy with correct role check
CREATE POLICY "org_write_accounting_payments" ON accounting_payments
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT ou.organization_id
    FROM organization_users ou
    JOIN roles r ON r.id = ou.role_id
    WHERE ou.user_id = auth.uid()
    AND ou.is_active = true
    AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
  )
);

-- Recreate UPDATE policy with correct role check
CREATE POLICY "org_update_accounting_payments" ON accounting_payments
FOR UPDATE USING (
  organization_id IN (
    SELECT ou.organization_id
    FROM organization_users ou
    JOIN roles r ON r.id = ou.role_id
    WHERE ou.user_id = auth.uid()
    AND ou.is_active = true
    AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
  )
);

-- Add DELETE policy
CREATE POLICY "org_delete_accounting_payments" ON accounting_payments
FOR DELETE USING (
  organization_id IN (
    SELECT ou.organization_id
    FROM organization_users ou
    JOIN roles r ON r.id = ou.role_id
    WHERE ou.user_id = auth.uid()
    AND ou.is_active = true
    AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
  )
  -- Only allow deleting draft payments
  AND status = 'draft'
);

COMMENT ON POLICY "org_write_accounting_payments" ON accounting_payments IS
  'Allow admins and farm managers to create payment records';
COMMENT ON POLICY "org_update_accounting_payments" ON accounting_payments IS
  'Allow admins and farm managers to update payment records';
COMMENT ON POLICY "org_delete_accounting_payments" ON accounting_payments IS
  'Allow admins and farm managers to delete draft payment records only';
