-- Fix RLS Issues
-- Migration Date: 2026-01-29
-- Description: Fixes Row Level Security policies for proper organization access

-- Fix module_prices RLS - should be publicly readable for pricing display
DROP POLICY IF EXISTS "admin_write_module_prices" ON module_prices;
CREATE POLICY "public_read_all_module_prices"
ON module_prices FOR SELECT
USING (true);

-- Fix subscription_pricing RLS - should be publicly readable
DROP POLICY IF EXISTS "admin_write_subscription_pricing" ON subscription_pricing;
CREATE POLICY "public_read_all_subscription_pricing"
ON subscription_pricing FOR SELECT
USING (true);

-- Add proper admin policies for pricing updates
CREATE POLICY "admin_update_module_prices"
ON module_prices FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_insert_module_prices"
ON module_prices FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_update_subscription_pricing"
ON subscription_pricing FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_insert_subscription_pricing"
ON subscription_pricing FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

-- Ensure modules table has proper RLS for read access
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_modules"
ON modules FOR SELECT
USING (is_available = true OR
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin', 'organization_admin')
  )
);

CREATE POLICY "admin_write_modules"
ON modules FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

-- Fix organization_modules RLS to allow users to see their org's modules
DROP POLICY IF EXISTS "org_read_organization_modules" ON organization_modules;
DROP POLICY IF EXISTS "org_write_organization_modules" ON organization_modules;

CREATE POLICY "org_read_own_organization_modules"
ON organization_modules FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "org_update_own_organization_modules"
ON organization_modules FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
      AND role_id IN (SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin'))
  )
);

CREATE POLICY "org_insert_own_organization_modules"
ON organization_modules FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
      AND role_id IN (SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin'))
  )
);

-- Ensure organization_addons RLS is properly set
DROP POLICY IF EXISTS "org_read_organization_addons" ON organization_addons;

CREATE POLICY "org_read_own_organization_addons"
ON organization_addons FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);
