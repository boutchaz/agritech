-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Polar.sh integration
  polar_subscription_id TEXT UNIQUE,
  polar_customer_id TEXT,
  polar_product_id TEXT,

  -- Subscription details
  plan_type TEXT NOT NULL CHECK (plan_type IN ('essential', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),

  -- Billing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,

  -- Usage limits based on plan
  max_farms INTEGER NOT NULL DEFAULT 2,
  max_parcels INTEGER NOT NULL DEFAULT 25,
  max_users INTEGER NOT NULL DEFAULT 5,
  max_satellite_reports INTEGER DEFAULT 0,

  -- Feature flags
  has_analytics BOOLEAN DEFAULT false,
  has_sensor_integration BOOLEAN DEFAULT false,
  has_ai_recommendations BOOLEAN DEFAULT false,
  has_advanced_reporting BOOLEAN DEFAULT false,
  has_api_access BOOLEAN DEFAULT false,
  has_priority_support BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_polar_id ON public.subscriptions(polar_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Current usage
  farms_count INTEGER DEFAULT 0,
  parcels_count INTEGER DEFAULT 0,
  users_count INTEGER DEFAULT 0,
  satellite_reports_count INTEGER DEFAULT 0,

  -- Reset tracking
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_subscription ON public.subscription_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_organization ON public.subscription_usage(organization_id);

-- Function to initialize default subscription for new organizations
CREATE OR REPLACE FUNCTION public.initialize_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a trial Essential subscription for new organizations
  INSERT INTO public.subscriptions (
    organization_id,
    plan_type,
    status,
    max_farms,
    max_parcels,
    max_users,
    max_satellite_reports,
    has_analytics,
    has_sensor_integration,
    has_ai_recommendations,
    has_advanced_reporting,
    has_api_access,
    has_priority_support,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'essential',
    'trialing',
    2,
    25,
    5,
    0,
    false,
    false,
    false,
    false,
    false,
    false,
    NOW(),
    NOW() + INTERVAL '14 days' -- 14-day trial
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default subscription
DROP TRIGGER IF EXISTS on_organization_created_subscription ON public.organizations;
CREATE TRIGGER on_organization_created_subscription
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_default_subscription();

-- Function to update subscription limits based on plan
CREATE OR REPLACE FUNCTION public.update_subscription_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Set limits based on plan type
  CASE NEW.plan_type
    WHEN 'essential' THEN
      NEW.max_farms := 2;
      NEW.max_parcels := 25;
      NEW.max_users := 5;
      NEW.max_satellite_reports := 0;
      NEW.has_analytics := false;
      NEW.has_sensor_integration := false;
      NEW.has_ai_recommendations := false;
      NEW.has_advanced_reporting := false;
      NEW.has_api_access := false;
      NEW.has_priority_support := false;

    WHEN 'professional' THEN
      NEW.max_farms := 10;
      NEW.max_parcels := 200;
      NEW.max_users := 25;
      NEW.max_satellite_reports := 10;
      NEW.has_analytics := true;
      NEW.has_sensor_integration := true;
      NEW.has_ai_recommendations := true;
      NEW.has_advanced_reporting := true;
      NEW.has_api_access := false;
      NEW.has_priority_support := false;

    WHEN 'enterprise' THEN
      NEW.max_farms := 999999; -- Unlimited
      NEW.max_parcels := 999999; -- Unlimited
      NEW.max_users := 999999; -- Unlimited
      NEW.max_satellite_reports := 999999; -- Unlimited
      NEW.has_analytics := true;
      NEW.has_sensor_integration := true;
      NEW.has_ai_recommendations := true;
      NEW.has_advanced_reporting := true;
      NEW.has_api_access := true;
      NEW.has_priority_support := true;
  END CASE;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update limits when plan changes
DROP TRIGGER IF EXISTS on_subscription_plan_change ON public.subscriptions;
CREATE TRIGGER on_subscription_plan_change
  BEFORE INSERT OR UPDATE OF plan_type ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_limits();

-- RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their organization's subscription
CREATE POLICY "Users can view their organization subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Only admins can update subscriptions (via service role normally)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their organization's usage
CREATE POLICY "Users can view their organization usage"
  ON public.subscription_usage
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Service role can manage usage
CREATE POLICY "Service role can manage usage"
  ON public.subscription_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
GRANT SELECT ON public.subscription_usage TO authenticated;
GRANT ALL ON public.subscription_usage TO service_role;
