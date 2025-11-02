-- Fix RLS policy for invoices to allow all organization members to create invoices
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "org_write_invoices" ON invoices;

-- Create new INSERT policy that allows all organization members (not just specific roles)
CREATE POLICY "org_write_invoices" ON invoices
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
  )
);

-- Also update UPDATE policy to be consistent
DROP POLICY IF EXISTS "org_update_invoices" ON invoices;

CREATE POLICY "org_update_invoices" ON invoices
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
  )
);

-- Add DELETE policy if it doesn't exist
DROP POLICY IF EXISTS "org_delete_invoices" ON invoices;

CREATE POLICY "org_delete_invoices" ON invoices
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid()
    AND role IN ('organization_admin', 'farm_manager')
  )
);
