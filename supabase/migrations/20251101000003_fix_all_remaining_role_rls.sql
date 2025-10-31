-- Fix all remaining RLS policies that incorrectly use organization_users.role
-- These include: currencies, invoices, journal_entries, analyses, plantation_types, tree_categories, trees, organizations

-- =====================================================
-- Fix currencies policies
-- =====================================================
DROP POLICY IF EXISTS "currencies_modify_admin" ON currencies;

CREATE POLICY "currencies_modify_admin" ON currencies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND r.name IN ('system_admin', 'organization_admin')
    )
  );

-- =====================================================
-- Fix invoices policies
-- =====================================================
DROP POLICY IF EXISTS "org_delete_invoices" ON invoices;

CREATE POLICY "org_delete_invoices" ON invoices
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

-- =====================================================
-- Fix journal_entries policies
-- =====================================================
DROP POLICY IF EXISTS "org_update_journal_entries" ON journal_entries;
DROP POLICY IF EXISTS "org_write_journal_entries" ON journal_entries;

CREATE POLICY "org_update_journal_entries" ON journal_entries
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

CREATE POLICY "org_write_journal_entries" ON journal_entries
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

-- =====================================================
-- Fix analyses policies
-- =====================================================
DROP POLICY IF EXISTS "Farm admins can delete analyses" ON analyses;
DROP POLICY IF EXISTS "Farm members can insert analyses" ON analyses;
DROP POLICY IF EXISTS "Farm members can update analyses" ON analyses;

CREATE POLICY "Farm admins can delete analyses" ON analyses
  FOR DELETE
  USING (
    parcel_id IN (
      SELECT p.id
      FROM parcels p
      JOIN farms f ON p.farm_id = f.id
      JOIN organization_users ou ON f.organization_id = ou.organization_id
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

CREATE POLICY "Farm members can insert analyses" ON analyses
  FOR INSERT
  WITH CHECK (
    parcel_id IN (
      SELECT p.id
      FROM parcels p
      JOIN farms f ON p.farm_id = f.id
      JOIN organization_users ou ON f.organization_id = ou.organization_id
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager', 'farm_worker')
    )
  );

CREATE POLICY "Farm members can update analyses" ON analyses
  FOR UPDATE
  USING (
    parcel_id IN (
      SELECT p.id
      FROM parcels p
      JOIN farms f ON p.farm_id = f.id
      JOIN organization_users ou ON f.organization_id = ou.organization_id
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager', 'farm_worker')
    )
  );

-- =====================================================
-- Fix analysis_recommendations policies
-- =====================================================
DROP POLICY IF EXISTS "Farm members can manage recommendations" ON analysis_recommendations;

CREATE POLICY "Farm members can manage recommendations" ON analysis_recommendations
  FOR ALL
  USING (
    analysis_id IN (
      SELECT a.id
      FROM analyses a
      JOIN parcels p ON a.parcel_id = p.id
      JOIN farms f ON p.farm_id = f.id
      JOIN organization_users ou ON f.organization_id = ou.organization_id
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager', 'farm_worker')
    )
  );

-- =====================================================
-- Fix plantation_types policies
-- =====================================================
DROP POLICY IF EXISTS "Admins and managers can delete plantation types" ON plantation_types;
DROP POLICY IF EXISTS "Admins and managers can insert plantation types" ON plantation_types;
DROP POLICY IF EXISTS "Admins and managers can update plantation types" ON plantation_types;

CREATE POLICY "Admins and managers can delete plantation types" ON plantation_types
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

CREATE POLICY "Admins and managers can insert plantation types" ON plantation_types
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

CREATE POLICY "Admins and managers can update plantation types" ON plantation_types
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

-- =====================================================
-- Fix tree_categories policies
-- =====================================================
DROP POLICY IF EXISTS "Admins and managers can delete tree categories" ON tree_categories;
DROP POLICY IF EXISTS "Admins and managers can insert tree categories" ON tree_categories;
DROP POLICY IF EXISTS "Admins and managers can update tree categories" ON tree_categories;

CREATE POLICY "Admins and managers can delete tree categories" ON tree_categories
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

CREATE POLICY "Admins and managers can insert tree categories" ON tree_categories
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

CREATE POLICY "Admins and managers can update tree categories" ON tree_categories
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

-- =====================================================
-- Fix trees policies
-- =====================================================
DROP POLICY IF EXISTS "Admins and managers can delete trees" ON trees;
DROP POLICY IF EXISTS "Admins and managers can insert trees" ON trees;
DROP POLICY IF EXISTS "Admins and managers can update trees" ON trees;

CREATE POLICY "Admins and managers can delete trees" ON trees
  FOR DELETE
  USING (
    category_id IN (
      SELECT tree_categories.id
      FROM tree_categories
      JOIN organization_users ou ON tree_categories.organization_id = ou.organization_id
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

CREATE POLICY "Admins and managers can insert trees" ON trees
  FOR INSERT
  WITH CHECK (
    category_id IN (
      SELECT tree_categories.id
      FROM tree_categories
      JOIN organization_users ou ON tree_categories.organization_id = ou.organization_id
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

CREATE POLICY "Admins and managers can update trees" ON trees
  FOR UPDATE
  USING (
    category_id IN (
      SELECT tree_categories.id
      FROM tree_categories
      JOIN organization_users ou ON tree_categories.organization_id = ou.organization_id
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'farm_manager')
    )
  );

-- =====================================================
-- Fix organizations policies
-- =====================================================
DROP POLICY IF EXISTS "org_admins_can_update" ON organizations;

CREATE POLICY "org_admins_can_update" ON organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = organizations.id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('organization_admin', 'system_admin')
    )
  );
