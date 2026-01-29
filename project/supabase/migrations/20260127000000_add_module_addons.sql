-- Add Module Addons System
-- Migration Date: 2026-01-27
-- Description: Adds support for organization addons with module purchase/management

-- Add addon columns to modules table
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS is_addon_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS addon_price_monthly NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS addon_product_id VARCHAR(100);

COMMENT ON COLUMN modules.is_addon_eligible IS 'Whether this module can be purchased as an addon';
COMMENT ON COLUMN modules.addon_price_monthly IS 'Monthly price for this module when purchased as an addon';
COMMENT ON COLUMN modules.addon_product_id IS 'Polar product ID for addon subscription';

-- Create organization_addons table
CREATE TABLE IF NOT EXISTS organization_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  polar_subscription_id VARCHAR(100),
  polar_customer_id VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, trialing, canceled, past_due
  price_monthly NUMERIC(10, 2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, module_id)
);

COMMENT ON TABLE organization_addons IS 'Organization addon subscriptions for individual modules';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_addons_org ON organization_addons(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_addons_module ON organization_addons(module_id);
CREATE INDEX IF NOT EXISTS idx_organization_addons_status ON organization_addons(status);
CREATE INDEX IF NOT EXISTS idx_organization_addons_polar_subscription ON organization_addons(polar_subscription_id);

-- Add addon slot columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS included_addon_slots INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_addon_slots INTEGER DEFAULT 0;

COMMENT ON COLUMN subscriptions.included_addon_slots IS 'Number of addon slots included in the base subscription plan';
COMMENT ON COLUMN subscriptions.additional_addon_slots IS 'Number of additional addon slots purchased separately';

-- Enable Row Level Security
ALTER TABLE organization_addons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_addons
-- Users can read addons for their organizations
CREATE POLICY "org_read_organization_addons"
ON organization_addons FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Admins can insert addons for their organizations
CREATE POLICY "org_insert_organization_addons"
ON organization_addons FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
      AND role_id IN (SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin'))
  )
);

-- Admins can update addons for their organizations
CREATE POLICY "org_update_organization_addons"
ON organization_addons FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
      AND role_id IN (SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin'))
  )
);

-- Admins can delete addons for their organizations
CREATE POLICY "org_delete_organization_addons"
ON organization_addons FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
      AND role_id IN (SELECT id FROM roles WHERE name IN ('system_admin', 'organization_admin'))
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_organization_addons_updated_at
BEFORE UPDATE ON organization_addons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
