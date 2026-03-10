-- Subscription alignment with AGROGINA SaaS contract v1
-- Canonical formulas: starter, standard, premium, enterprise
-- Canonical billing cycles: monthly, semiannual, annual

-- Normalize and extend subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS formula VARCHAR(30),
  ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contracted_hectares NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS included_users INTEGER,
  ADD COLUMN IF NOT EXISTS price_ht_per_ha_year NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,4) DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS amount_ht NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS amount_tva NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS amount_ttc NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'MAD',
  ADD COLUMN IF NOT EXISTS contract_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renewal_notice_days INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_formula VARCHAR(30),
  ADD COLUMN IF NOT EXISTS pending_billing_cycle VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pending_pricing_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS migration_effective_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_notice_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overdue_grace_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS suspension_notice_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS export_window_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS late_penalty_rate NUMERIC(8,6) DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS fixed_recovery_fee NUMERIC(12,2) DEFAULT 40.00;

-- Canonical formula backfill from legacy plan_type values
UPDATE subscriptions
SET formula = CASE
  WHEN COALESCE(formula, '') <> '' THEN formula
  WHEN plan_type IN ('core', 'essential', 'starter') THEN 'starter'
  WHEN plan_type IN ('professional', 'standard') THEN 'standard'
  WHEN plan_type = 'premium' THEN 'premium'
  WHEN plan_type = 'enterprise' THEN 'enterprise'
  ELSE 'standard'
END;

-- Canonical billing cycle backfill from legacy billing_interval values
UPDATE subscriptions
SET billing_cycle = CASE
  WHEN COALESCE(billing_cycle, '') <> '' THEN billing_cycle
  WHEN billing_interval IN ('month', 'monthly') THEN 'monthly'
  WHEN billing_interval IN ('year', 'yearly', 'annual') THEN 'annual'
  WHEN billing_interval IN ('semiannual', 'semestrial') THEN 'semiannual'
  ELSE 'monthly'
END;

-- Normalize legacy billing_interval textual values for compatibility reads
UPDATE subscriptions
SET billing_interval = CASE
  WHEN billing_interval IN ('month', 'monthly') THEN 'monthly'
  WHEN billing_interval IN ('year', 'yearly', 'annual') THEN 'annual'
  WHEN billing_interval IN ('semiannual', 'semestrial') THEN 'semiannual'
  ELSE COALESCE(billing_interval, 'monthly')
END;

UPDATE polar_subscriptions
SET billing_interval = CASE
  WHEN billing_interval IN ('month', 'monthly') THEN 'monthly'
  WHEN billing_interval IN ('year', 'yearly', 'annual') THEN 'annual'
  WHEN billing_interval IN ('semiannual', 'semestrial') THEN 'semiannual'
  ELSE COALESCE(billing_interval, 'monthly')
END
WHERE billing_interval IS DISTINCT FROM CASE
  WHEN billing_interval IN ('month', 'monthly') THEN 'monthly'
  WHEN billing_interval IN ('year', 'yearly', 'annual') THEN 'annual'
  WHEN billing_interval IN ('semiannual', 'semestrial') THEN 'semiannual'
  ELSE COALESCE(billing_interval, 'monthly')
END;

-- Included users default by formula when missing
UPDATE subscriptions
SET included_users = CASE
  WHEN formula = 'starter' THEN 3
  WHEN formula = 'standard' THEN 10
  WHEN formula = 'premium' THEN 25
  WHEN formula = 'enterprise' THEN NULL
  ELSE 10
END
WHERE included_users IS NULL;

-- Default contracted hectares by formula when missing
UPDATE subscriptions
SET contracted_hectares = CASE
  WHEN formula = 'starter' THEN 50
  WHEN formula = 'standard' THEN 200
  WHEN formula = 'premium' THEN 500
  WHEN formula = 'enterprise' THEN 501
  ELSE 200
END
WHERE contracted_hectares IS NULL;

-- Keep legacy plan_type synchronized during transition
UPDATE subscriptions
SET plan_type = CASE
  WHEN formula = 'starter' THEN 'essential'
  WHEN formula = 'standard' THEN 'professional'
  WHEN formula = 'premium' THEN 'enterprise'
  WHEN formula = 'enterprise' THEN 'enterprise'
  ELSE plan_type
END
WHERE formula IS NOT NULL;

-- Queue migration switch at renewal date for currently active subscribers.
UPDATE subscriptions
SET pending_formula = COALESCE(pending_formula, formula),
    pending_billing_cycle = COALESCE(pending_billing_cycle, billing_cycle),
    migration_effective_at = COALESCE(migration_effective_at, current_period_end)
WHERE status = 'active'
  AND current_period_end IS NOT NULL;

-- Constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_formula_check'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_formula_check
      CHECK (formula IN ('starter', 'standard', 'premium', 'enterprise'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_billing_cycle_check'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_billing_cycle_check
      CHECK (billing_cycle IN ('monthly', 'semiannual', 'annual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_pending_formula_check'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_pending_formula_check
      CHECK (pending_formula IS NULL OR pending_formula IN ('starter', 'standard', 'premium', 'enterprise'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_pending_billing_cycle_check'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_pending_billing_cycle_check
      CHECK (pending_billing_cycle IS NULL OR pending_billing_cycle IN ('monthly', 'semiannual', 'annual'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_formula ON subscriptions(formula);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_cycle ON subscriptions(billing_cycle);
CREATE INDEX IF NOT EXISTS idx_subscriptions_contract_end ON subscriptions(contract_end_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_migration_effective ON subscriptions(migration_effective_at);

-- Subscription contracts
CREATE TABLE IF NOT EXISTS subscription_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  contract_reference VARCHAR(120),
  signed_at TIMESTAMPTZ,
  effective_at TIMESTAMPTZ,
  term_months INTEGER DEFAULT 12,
  notice_period_days INTEGER DEFAULT 60,
  auto_renew BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_contracts_org ON subscription_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_contracts_subscription ON subscription_contracts(subscription_id);

-- Subscription lifecycle events
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  actor_type VARCHAR(50),
  actor_id VARCHAR(120),
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_org ON subscription_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);

-- Billing documents (invoice/credit-note like records)
CREATE TABLE IF NOT EXISTS billing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_number VARCHAR(80),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  amount_ht NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_tva NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_ttc NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'MAD',
  status VARCHAR(30) NOT NULL DEFAULT 'issued',
  paid_at TIMESTAMPTZ,
  late_fee_amount NUMERIC(14,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_documents_org ON billing_documents(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_documents_due ON billing_documents(due_at);
CREATE INDEX IF NOT EXISTS idx_billing_documents_status ON billing_documents(status);

-- Enable RLS
ALTER TABLE subscription_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_documents ENABLE ROW LEVEL SECURITY;

-- Organization read policies
DROP POLICY IF EXISTS "org_read_subscription_contracts" ON subscription_contracts;
CREATE POLICY "org_read_subscription_contracts" ON subscription_contracts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_read_subscription_events" ON subscription_events;
CREATE POLICY "org_read_subscription_events" ON subscription_events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "org_read_billing_documents" ON billing_documents;
CREATE POLICY "org_read_billing_documents" ON billing_documents
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Admin write policies
DROP POLICY IF EXISTS "admin_write_subscription_contracts" ON subscription_contracts;
CREATE POLICY "admin_write_subscription_contracts" ON subscription_contracts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = subscription_contracts.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = subscription_contracts.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  );

DROP POLICY IF EXISTS "admin_write_subscription_events" ON subscription_events;
CREATE POLICY "admin_write_subscription_events" ON subscription_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = subscription_events.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = subscription_events.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  );

DROP POLICY IF EXISTS "admin_write_billing_documents" ON billing_documents;
CREATE POLICY "admin_write_billing_documents" ON billing_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = billing_documents.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.organization_id = billing_documents.organization_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  );

-- Compatibility view exposing canonical + legacy pointers
CREATE OR REPLACE VIEW subscription_legacy_compat AS
SELECT
  s.id,
  s.organization_id,
  s.formula,
  CASE
    WHEN s.formula = 'starter' THEN 'essential'
    WHEN s.formula = 'standard' THEN 'professional'
    WHEN s.formula = 'premium' THEN 'enterprise'
    WHEN s.formula = 'enterprise' THEN 'enterprise'
    ELSE s.plan_type
  END AS legacy_plan_type,
  s.billing_cycle,
  s.billing_interval,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.migration_effective_at,
  s.pending_formula,
  s.pending_billing_cycle
FROM subscriptions s;
