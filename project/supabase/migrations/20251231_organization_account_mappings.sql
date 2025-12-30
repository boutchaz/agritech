-- =====================================================
-- ORGANIZATION ACCOUNT MAPPINGS MIGRATION
-- Migration: 20251231_organization_account_mappings.sql
-- 
-- Extends the account_mappings table to support organization-level
-- mappings in addition to global country-level templates.
-- 
-- The original account_mappings table uses:
--   - country_code + accounting_standard + mapping_type + mapping_key
--   - account_code (string reference)
-- 
-- This migration adds:
--   - organization_id (for org-specific mappings)
--   - account_id (FK to accounts for validated references)
--   - source_key, is_active, metadata (for frontend compatibility)
-- =====================================================

-- =====================================================
-- 1. ADD NEW COLUMNS TO account_mappings
-- =====================================================

-- Add organization_id column (nullable for backward compatibility with global templates)
ALTER TABLE account_mappings 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add account_id column (FK to accounts, for org-level mappings)
ALTER TABLE account_mappings 
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Add source_key column (alias for mapping_key, used by frontend)
ALTER TABLE account_mappings 
  ADD COLUMN IF NOT EXISTS source_key VARCHAR(100);

-- Add is_active column for toggling mappings
ALTER TABLE account_mappings 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add metadata column for flexible storage
ALTER TABLE account_mappings 
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add updated_at column
ALTER TABLE account_mappings 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 2. CREATE INDEXES FOR ORGANIZATION QUERIES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_account_mappings_org 
  ON account_mappings(organization_id);

CREATE INDEX IF NOT EXISTS idx_account_mappings_org_type 
  ON account_mappings(organization_id, mapping_type);

CREATE INDEX IF NOT EXISTS idx_account_mappings_org_lookup 
  ON account_mappings(organization_id, mapping_type, mapping_key) 
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_mappings_account 
  ON account_mappings(account_id) 
  WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_mappings_active 
  ON account_mappings(organization_id, is_active) 
  WHERE organization_id IS NOT NULL;

-- =====================================================
-- 3. ADD UNIQUE CONSTRAINT FOR ORG-LEVEL MAPPINGS
-- =====================================================

-- Drop existing unique constraint if any (we'll recreate more flexible one)
-- The original constraint was: UNIQUE(country_code, accounting_standard, mapping_type, mapping_key)
-- We need to allow:
--   1. Global templates: country_code + accounting_standard + mapping_type + mapping_key
--   2. Org-specific: organization_id + mapping_type + mapping_key

-- Create a unique index for organization-level mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_mappings_org_unique 
  ON account_mappings(organization_id, mapping_type, mapping_key) 
  WHERE organization_id IS NOT NULL;

-- =====================================================
-- 4. ENABLE RLS AND CREATE POLICIES
-- =====================================================

ALTER TABLE account_mappings ENABLE ROW LEVEL SECURITY;

-- Policy: Read global templates (country-level, no org_id) or own org's mappings
DROP POLICY IF EXISTS "read_account_mappings" ON account_mappings;
CREATE POLICY "read_account_mappings" ON account_mappings
  FOR SELECT USING (
    -- Global templates are readable by all authenticated users
    organization_id IS NULL
    OR
    -- Org-specific mappings require membership
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Insert org-specific mappings (admins only)
DROP POLICY IF EXISTS "insert_account_mappings" ON account_mappings;
CREATE POLICY "insert_account_mappings" ON account_mappings
  FOR INSERT WITH CHECK (
    -- Only allow inserting org-specific mappings
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = account_mappings.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

-- Policy: Update org-specific mappings (admins only)
DROP POLICY IF EXISTS "update_account_mappings" ON account_mappings;
CREATE POLICY "update_account_mappings" ON account_mappings
  FOR UPDATE USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = account_mappings.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

-- Policy: Delete org-specific mappings (admins only)
DROP POLICY IF EXISTS "delete_account_mappings" ON account_mappings;
CREATE POLICY "delete_account_mappings" ON account_mappings
  FOR DELETE USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = account_mappings.organization_id
        AND r.name IN ('organization_admin', 'system_admin')
        AND ou.is_active = true
    )
  );

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get account mapping for a specific org
-- Falls back to global template if org-specific mapping doesn't exist
CREATE OR REPLACE FUNCTION get_account_mapping(
  p_organization_id UUID,
  p_mapping_type VARCHAR,
  p_mapping_key VARCHAR
) RETURNS TABLE (
  id UUID,
  account_id UUID,
  account_code VARCHAR,
  description TEXT,
  is_org_specific BOOLEAN
) AS $$
BEGIN
  -- First try org-specific mapping
  RETURN QUERY
  SELECT 
    am.id,
    am.account_id,
    COALESCE(am.account_code, a.code) AS account_code,
    am.description,
    TRUE AS is_org_specific
  FROM account_mappings am
  LEFT JOIN accounts a ON a.id = am.account_id
  WHERE am.organization_id = p_organization_id
    AND am.mapping_type = p_mapping_type
    AND (am.mapping_key = p_mapping_key OR am.source_key = p_mapping_key)
    AND am.is_active = TRUE
  LIMIT 1;
  
  -- If found, return
  IF FOUND THEN
    RETURN;
  END IF;
  
  -- Fall back to global template based on org's country
  RETURN QUERY
  SELECT 
    am.id,
    NULL::UUID AS account_id,
    am.account_code,
    am.description,
    FALSE AS is_org_specific
  FROM account_mappings am
  JOIN organizations o ON o.id = p_organization_id
  WHERE am.organization_id IS NULL
    AND am.country_code = o.country_code
    AND am.mapping_type = p_mapping_type
    AND am.mapping_key = p_mapping_key
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize default mappings for an organization from global templates
CREATE OR REPLACE FUNCTION initialize_org_account_mappings(
  p_organization_id UUID,
  p_country_code VARCHAR DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_country_code VARCHAR;
  v_count INTEGER := 0;
  v_mapping RECORD;
  v_account_id UUID;
BEGIN
  -- Get country code from org if not provided
  IF p_country_code IS NULL THEN
    SELECT country_code INTO v_country_code
    FROM organizations
    WHERE id = p_organization_id;
  ELSE
    v_country_code := p_country_code;
  END IF;
  
  -- Skip if org already has mappings
  IF EXISTS (
    SELECT 1 FROM account_mappings 
    WHERE organization_id = p_organization_id 
    LIMIT 1
  ) THEN
    RETURN 0;
  END IF;
  
  -- Copy global templates to org-specific mappings
  FOR v_mapping IN 
    SELECT am.*, at.account_code AS template_account_code
    FROM account_mappings am
    LEFT JOIN account_templates at ON at.country_code = am.country_code 
      AND at.accounting_standard = am.accounting_standard
      AND at.account_code = am.account_code
    WHERE am.organization_id IS NULL
      AND am.country_code = v_country_code
  LOOP
    -- Find matching account in org by code
    SELECT id INTO v_account_id
    FROM accounts
    WHERE organization_id = p_organization_id
      AND code = v_mapping.account_code
    LIMIT 1;
    
    -- Insert org-specific mapping
    INSERT INTO account_mappings (
      organization_id,
      mapping_type,
      mapping_key,
      source_key,
      account_id,
      account_code,
      description,
      is_active,
      metadata
    ) VALUES (
      p_organization_id,
      v_mapping.mapping_type,
      v_mapping.mapping_key,
      v_mapping.mapping_key,
      v_account_id,
      v_mapping.account_code,
      v_mapping.description,
      TRUE,
      '{}'::JSONB
    )
    ON CONFLICT (organization_id, mapping_type, mapping_key) 
    WHERE organization_id IS NOT NULL
    DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. CREATE TASK COST MAPPINGS FUNCTION
-- Called by NestJS initializeDefaultMappings
-- =====================================================

CREATE OR REPLACE FUNCTION create_task_cost_mappings(
  p_organization_id UUID,
  p_country_code VARCHAR DEFAULT 'MA'
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_expense_account_id UUID;
BEGIN
  -- Find a suitable expense account (class 6 for most standards)
  SELECT id INTO v_expense_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND (code LIKE '6%' OR code LIKE '60%' OR code LIKE '61%')
    AND is_active = TRUE
  ORDER BY code
  LIMIT 1;
  
  -- If no expense account found, skip
  IF v_expense_account_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Create mappings for common task types
  INSERT INTO account_mappings (
    organization_id, mapping_type, mapping_key, source_key, account_id, description, is_active
  ) VALUES
    (p_organization_id, 'cost_type', 'planting', 'planting', v_expense_account_id, 'Planting costs', TRUE),
    (p_organization_id, 'cost_type', 'harvesting', 'harvesting', v_expense_account_id, 'Harvesting costs', TRUE),
    (p_organization_id, 'cost_type', 'irrigation', 'irrigation', v_expense_account_id, 'Irrigation costs', TRUE),
    (p_organization_id, 'cost_type', 'fertilization', 'fertilization', v_expense_account_id, 'Fertilization costs', TRUE),
    (p_organization_id, 'cost_type', 'pesticide', 'pesticide', v_expense_account_id, 'Pesticide application costs', TRUE),
    (p_organization_id, 'cost_type', 'pruning', 'pruning', v_expense_account_id, 'Pruning costs', TRUE),
    (p_organization_id, 'cost_type', 'maintenance', 'maintenance', v_expense_account_id, 'Maintenance costs', TRUE),
    (p_organization_id, 'cost_type', 'transport', 'transport', v_expense_account_id, 'Transport costs', TRUE),
    (p_organization_id, 'cost_type', 'labor', 'labor', v_expense_account_id, 'Labor costs', TRUE),
    (p_organization_id, 'cost_type', 'materials', 'materials', v_expense_account_id, 'Materials costs', TRUE),
    (p_organization_id, 'cost_type', 'other', 'other', v_expense_account_id, 'Other costs', TRUE)
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CREATE HARVEST SALES MAPPINGS FUNCTION
-- Called by NestJS initializeDefaultMappings
-- =====================================================

CREATE OR REPLACE FUNCTION create_harvest_sales_mappings(
  p_organization_id UUID,
  p_country_code VARCHAR DEFAULT 'MA'
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_revenue_account_id UUID;
  v_cash_account_id UUID;
BEGIN
  -- Find a suitable revenue account (class 7 for most standards)
  SELECT id INTO v_revenue_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND (code LIKE '7%' OR code LIKE '70%' OR code LIKE '71%')
    AND is_active = TRUE
  ORDER BY code
  LIMIT 1;
  
  -- Find a suitable cash/bank account (class 5 for most standards)
  SELECT id INTO v_cash_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND (code LIKE '5%' OR code LIKE '51%' OR code LIKE '52%')
    AND is_active = TRUE
  ORDER BY code
  LIMIT 1;
  
  -- Create revenue type mappings
  IF v_revenue_account_id IS NOT NULL THEN
    INSERT INTO account_mappings (
      organization_id, mapping_type, mapping_key, source_key, account_id, description, is_active
    ) VALUES
      (p_organization_id, 'revenue_type', 'product_sales', 'product_sales', v_revenue_account_id, 'Product sales revenue', TRUE),
      (p_organization_id, 'revenue_type', 'service_income', 'service_income', v_revenue_account_id, 'Service income', TRUE),
      (p_organization_id, 'revenue_type', 'other_income', 'other_income', v_revenue_account_id, 'Other income', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Create harvest sale type mappings
  IF v_revenue_account_id IS NOT NULL THEN
    INSERT INTO account_mappings (
      organization_id, mapping_type, mapping_key, source_key, account_id, description, is_active
    ) VALUES
      (p_organization_id, 'harvest_sale', 'market', 'market', v_revenue_account_id, 'Market sales', TRUE),
      (p_organization_id, 'harvest_sale', 'export', 'export', v_revenue_account_id, 'Export sales', TRUE),
      (p_organization_id, 'harvest_sale', 'wholesale', 'wholesale', v_revenue_account_id, 'Wholesale sales', TRUE),
      (p_organization_id, 'harvest_sale', 'direct', 'direct', v_revenue_account_id, 'Direct sales', TRUE),
      (p_organization_id, 'harvest_sale', 'processing', 'processing', v_revenue_account_id, 'Processing sales', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Create cash account mappings
  IF v_cash_account_id IS NOT NULL THEN
    INSERT INTO account_mappings (
      organization_id, mapping_type, mapping_key, source_key, account_id, description, is_active
    ) VALUES
      (p_organization_id, 'cash', 'bank', 'bank', v_cash_account_id, 'Bank account', TRUE),
      (p_organization_id, 'cash', 'cash', 'cash', v_cash_account_id, 'Cash account', TRUE),
      (p_organization_id, 'cash', 'petty_cash', 'petty_cash', v_cash_account_id, 'Petty cash', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. UPDATE TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_account_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_account_mappings_updated_at ON account_mappings;
CREATE TRIGGER trg_account_mappings_updated_at
  BEFORE UPDATE ON account_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_account_mappings_updated_at();

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON COLUMN account_mappings.organization_id IS 'NULL for global templates, set for org-specific mappings';
COMMENT ON COLUMN account_mappings.account_id IS 'FK to accounts table for validated org-level mappings';
COMMENT ON COLUMN account_mappings.source_key IS 'Alias for mapping_key, used by frontend';
COMMENT ON COLUMN account_mappings.is_active IS 'Toggle to enable/disable mapping without deleting';
COMMENT ON COLUMN account_mappings.metadata IS 'Flexible JSON storage for additional mapping attributes';

COMMENT ON FUNCTION get_account_mapping IS 'Get account mapping for org, falling back to global template';
COMMENT ON FUNCTION initialize_org_account_mappings IS 'Copy global template mappings to organization';
COMMENT ON FUNCTION create_task_cost_mappings IS 'Create default task cost type mappings for organization';
COMMENT ON FUNCTION create_harvest_sales_mappings IS 'Create default revenue and cash mappings for organization';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
