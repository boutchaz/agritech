-- Polar Payment Integration for Modules
-- Migration Date: 2026-01-29
-- Description: Aligns modules with Polar product IDs for subscription management

-- Add Polar product columns to modules
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS product_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS product_price_id VARCHAR(100);

COMMENT ON COLUMN modules.product_id IS 'Polar product ID for this module subscription';
COMMENT ON COLUMN modules.product_price_id IS 'Polar price ID for this module';

-- Create polar_subscriptions table for tracking Polar subscriptions
CREATE TABLE IF NOT EXISTS polar_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  polar_subscription_id VARCHAR(100) NOT NULL UNIQUE,
  polar_customer_id VARCHAR(100),
  polar_product_id VARCHAR(100),
  status VARCHAR(50) NOT NULL, -- active, trialing, canceled, past_due, incomplete
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE polar_subscriptions IS 'Polar subscription tracking for organizations';

-- Create polar_webhooks table for webhook event logging
CREATE TABLE IF NOT EXISTS polar_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(100) UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

COMMENT ON TABLE polar_webhooks IS 'Polar webhook event log for idempotency and debugging';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_polar_subscriptions_org ON polar_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_polar_subscriptions_status ON polar_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_polar_subscriptions_polar_id ON polar_subscriptions(polar_subscription_id);
CREATE INDEX IF NOT EXISTS idx_polar_webhooks_event_id ON polar_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_polar_webhooks_event_type ON polar_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_polar_webhooks_processed ON polar_webhooks(processed);

-- Enable Row Level Security
ALTER TABLE polar_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE polar_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polar_subscriptions
CREATE POLICY "org_read_polar_subscriptions"
ON polar_subscriptions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "admin_write_polar_subscriptions"
ON polar_subscriptions FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

-- RLS Policies for polar_webhooks (admin only)
CREATE POLICY "admin_read_polar_webhooks"
ON polar_webhooks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_write_polar_webhooks"
ON polar_webhooks FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

-- Function: create_or_update_polar_subscription
CREATE OR REPLACE FUNCTION create_or_update_polar_subscription(
  p_organization_id UUID,
  p_polar_subscription_id VARCHAR(100),
  p_polar_customer_id VARCHAR,
  p_polar_product_id VARCHAR,
  p_status VARCHAR,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  INSERT INTO polar_subscriptions (
    organization_id,
    polar_subscription_id,
    polar_customer_id,
    polar_product_id,
    status,
    current_period_start,
    current_period_end,
    metadata
  ) VALUES (
    p_organization_id,
    p_polar_subscription_id,
    p_polar_customer_id,
    p_polar_product_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    p_metadata
  )
  ON CONFLICT (polar_subscription_id) DO UPDATE
  SET status = EXCLUDED.status,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$;

-- Function: log_polar_webhook
CREATE OR REPLACE FUNCTION log_polar_webhook(
  p_event_id VARCHAR,
  p_event_type VARCHAR,
  p_payload JSONB
)
RETURNS UUID LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_webhook_id UUID;
BEGIN
  INSERT INTO polar_webhooks (event_id, event_type, payload)
  VALUES (p_event_id, p_event_type, p_payload)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id INTO v_webhook_id;

  RETURN v_webhook_id;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_polar_subscriptions_updated_at
BEFORE UPDATE ON polar_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
