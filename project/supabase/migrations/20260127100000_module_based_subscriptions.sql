-- Module-Based Subscriptions with Pricing
-- Migration Date: 2026-01-27
-- Description: Adds module pricing and subscription pricing configuration

-- Create module_prices table for individual module pricing
CREATE TABLE IF NOT EXISTS module_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  plan_type VARCHAR(50), -- null = all plans, 'essential', 'professional', 'enterprise'
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE module_prices IS 'Pricing for modules per plan type';

-- Create unique constraint for active pricing
CREATE UNIQUE INDEX IF NOT EXISTS idx_module_prices_active
ON module_prices(module_id, plan_type)
WHERE is_active = true AND (valid_until IS NULL OR valid_until > NOW());

-- Create subscription_pricing table for global pricing configuration
CREATE TABLE IF NOT EXISTS subscription_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  value NUMERIC(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE subscription_pricing IS 'Global subscription pricing configuration';

-- Insert default pricing values
INSERT INTO subscription_pricing (config_key, value, description) VALUES
  ('base_price_monthly', 15, 'Base monthly price for subscription'),
  ('trial_days', 0, 'Number of trial days (stored as numeric)'),
  ('addon_slot_price', 5, 'Price per additional addon slot')
ON CONFLICT (config_key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE module_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies - public read for pricing data
CREATE POLICY "public_read_module_prices" ON module_prices FOR SELECT USING (true);
CREATE POLICY "public_read_subscription_pricing" ON subscription_pricing FOR SELECT USING (true);

-- Only admins can modify pricing
CREATE POLICY "admin_write_module_prices" ON module_prices FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_write_subscription_pricing" ON subscription_pricing FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

-- Function to get subscription pricing
CREATE OR REPLACE FUNCTION get_subscription_pricing()
RETURNS TABLE (
  config_key VARCHAR(100),
  value NUMERIC(10, 2)
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT sp.config_key, sp.value
  FROM subscription_pricing sp
  WHERE sp.is_active = true;
END;
$$;

-- Function to calculate module subscription price
CREATE OR REPLACE FUNCTION calculate_module_subscription_price(p_module_slugs TEXT[])
RETURNS TABLE (
  base_price NUMERIC(10, 2),
  modules_price NUMERIC(10, 2),
  total_price NUMERIC(10, 2)
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_base_price NUMERIC(10, 2);
  v_modules_price NUMERIC(10, 2) := 0;
  v_module_id UUID;
  v_module_price NUMERIC(10, 2);
BEGIN
  -- Get base price from subscription_pricing
  SELECT value INTO v_base_price
  FROM subscription_pricing
  WHERE config_key = 'base_price_monthly' AND is_active = true;

  IF v_base_price IS NULL THEN
    v_base_price := 15;
  END IF;

  -- Calculate modules price
  FOR v_module_id IN
    SELECT id FROM modules WHERE slug = ANY(p_module_slugs) AND is_available = true
  LOOP
    -- Get module price (prefer plan-specific price, then default price)
    SELECT COALESCE(
      (SELECT price_monthly FROM module_prices
        WHERE module_id = v_module_id
          AND is_active = true
          AND (valid_until IS NULL OR valid_until > NOW())
        ORDER BY plan_type DESC NULLS LAST
        LIMIT 1),
      0
    ) INTO v_module_price;

    v_modules_price := v_modules_price + v_module_price;
  END LOOP;

  RETURN QUERY SELECT v_base_price, v_modules_price, (v_base_price + v_modules_price);
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_module_prices_updated_at
BEFORE UPDATE ON module_prices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_pricing_updated_at
BEFORE UPDATE ON subscription_pricing
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
