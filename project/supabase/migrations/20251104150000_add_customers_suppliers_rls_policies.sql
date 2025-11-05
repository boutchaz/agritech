-- Add RLS policies for customers and suppliers tables
SET search_path = public;

-- Enable RLS
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;

-- Customers Policies
DROP POLICY IF EXISTS "org_read_customers" ON customers;
CREATE POLICY "org_read_customers" ON customers
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_customers" ON customers;
CREATE POLICY "org_write_customers" ON customers
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_customers" ON customers;
CREATE POLICY "org_update_customers" ON customers
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_customers" ON customers;
CREATE POLICY "org_delete_customers" ON customers
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

-- Suppliers Policies
DROP POLICY IF EXISTS "org_read_suppliers" ON suppliers;
CREATE POLICY "org_read_suppliers" ON suppliers
  FOR SELECT USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_write_suppliers" ON suppliers;
CREATE POLICY "org_write_suppliers" ON suppliers
  FOR INSERT WITH CHECK (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_update_suppliers" ON suppliers;
CREATE POLICY "org_update_suppliers" ON suppliers
  FOR UPDATE USING (
    is_organization_member(organization_id)
  );

DROP POLICY IF EXISTS "org_delete_suppliers" ON suppliers;
CREATE POLICY "org_delete_suppliers" ON suppliers
  FOR DELETE USING (
    is_organization_member(organization_id)
  );

COMMENT ON POLICY "org_read_customers" ON customers IS 'Allow organization members to read their organization customers';
COMMENT ON POLICY "org_write_customers" ON customers IS 'Allow organization members to create customers for their organization';
