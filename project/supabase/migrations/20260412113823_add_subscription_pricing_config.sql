-- Add subscription_pricing_config table for admin-managed pricing model
CREATE TABLE IF NOT EXISTS subscription_pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modules JSONB NOT NULL DEFAULT '[]',
  ha_tiers JSONB NOT NULL DEFAULT '[]',
  size_multipliers JSONB NOT NULL DEFAULT '[]',
  default_discount_percent NUMERIC NOT NULL DEFAULT 10,
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscription_pricing_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON subscription_pricing_config;
CREATE POLICY "service_role_only" ON subscription_pricing_config
  FOR ALL USING (auth.role() = 'service_role');

-- Also make banners.organization_id nullable (global banners)
ALTER TABLE banners ALTER COLUMN organization_id DROP NOT NULL;

-- Update banners RLS to allow global banners
DROP POLICY IF EXISTS "org_access" ON banners;
CREATE POLICY "org_access" ON banners
  FOR ALL USING (organization_id IS NULL OR public.is_organization_member(organization_id));
