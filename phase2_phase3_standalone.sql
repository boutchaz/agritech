-- =====================================================
-- PHASE 2 & 3: STANDALONE TEST
-- =====================================================
-- This file contains ONLY the Phase 2/3 additions
-- to test them in isolation
--
-- Prerequisites:
-- - account_mappings table must exist with new columns
-- - accounts table must exist
-- - organizations table must exist

-- Task Cost Account Mappings (Phase 2)
CREATE OR REPLACE FUNCTION create_task_cost_mappings(
  p_organization_id UUID,
  p_country_code VARCHAR(2) DEFAULT 'MA'
)
RETURNS void AS $$
DECLARE
  v_expense_account_id UUID;
  v_cash_account_id UUID;
  v_ap_account_id UUID;
BEGIN
  -- Get the main expense account for agricultural operations (6125 for Morocco)
  SELECT id INTO v_expense_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND code = '6125'
    AND is_active = true
  LIMIT 1;

  -- Get Cash account (1110)
  SELECT id INTO v_cash_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND code = '1110'
    AND is_active = true
  LIMIT 1;

  -- Get Accounts Payable (2110)
  SELECT id INTO v_ap_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND code = '2110'
    AND is_active = true
  LIMIT 1;

  IF v_expense_account_id IS NULL THEN
    RAISE EXCEPTION 'Expense account (6125) not found for organization %', p_organization_id;
  END IF;

  IF v_cash_account_id IS NULL THEN
    RAISE EXCEPTION 'Cash account (1110) not found for organization %', p_organization_id;
  END IF;

  IF v_ap_account_id IS NULL THEN
    RAISE EXCEPTION 'Accounts Payable (2110) not found for organization %', p_organization_id;
  END IF;

  -- Insert mappings for each task type
  INSERT INTO account_mappings (organization_id, mapping_type, source_key, account_id, metadata)
  VALUES
    (p_organization_id, 'cost_type', 'planting', v_expense_account_id, jsonb_build_object('description', 'Planting tasks expense', 'account_code', '6125')),
    (p_organization_id, 'cost_type', 'harvesting', v_expense_account_id, jsonb_build_object('description', 'Harvesting tasks expense', 'account_code', '6125')),
    (p_organization_id, 'cost_type', 'irrigation', v_expense_account_id, jsonb_build_object('description', 'Irrigation tasks expense', 'account_code', '6125')),
    (p_organization_id, 'cost_type', 'fertilization', v_expense_account_id, jsonb_build_object('description', 'Fertilization tasks expense', 'account_code', '6125')),
    (p_organization_id, 'cost_type', 'pest_control', v_expense_account_id, jsonb_build_object('description', 'Pest control tasks expense', 'account_code', '6125')),
    (p_organization_id, 'cost_type', 'pruning', v_expense_account_id, jsonb_build_object('description', 'Pruning tasks expense', 'account_code', '6125')),
    (p_organization_id, 'cost_type', 'soil_preparation', v_expense_account_id, jsonb_build_object('description', 'Soil preparation tasks expense', 'account_code', '6125')),
    (p_organization_id, 'cost_type', 'maintenance', v_expense_account_id, jsonb_build_object('description', 'Maintenance tasks expense', 'account_code', '6125')),
    (p_organization_id, 'cost_type', 'general', v_expense_account_id, jsonb_build_object('description', 'General tasks expense', 'account_code', '6125')),
    (p_organization_id, 'cash', 'default', v_cash_account_id, jsonb_build_object('description', 'Default cash account', 'account_code', '1110', 'ap_account_id', v_ap_account_id))
  ON CONFLICT (organization_id, mapping_type, source_key)
  DO UPDATE SET
    account_id = EXCLUDED.account_id,
    metadata = EXCLUDED.metadata;

  RAISE NOTICE 'Task cost account mappings created for organization %', p_organization_id;
END;
$$ LANGUAGE plpgsql;

-- Harvest Sales Account Mappings (Phase 3)
CREATE OR REPLACE FUNCTION create_harvest_sales_mappings(
  p_organization_id UUID,
  p_country_code VARCHAR(2) DEFAULT 'MA'
)
RETURNS void AS $$
DECLARE
  v_revenue_account_id UUID;
  v_ar_account_id UUID;
  v_cash_account_id UUID;
BEGIN
  -- Get the main revenue account (4111 - Sales Revenue)
  SELECT id INTO v_revenue_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND code = '4111'
    AND is_active = true
  LIMIT 1;

  -- Get Accounts Receivable (1200)
  SELECT id INTO v_ar_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND code = '1200'
    AND is_active = true
  LIMIT 1;

  -- Get Cash account (1110)
  SELECT id INTO v_cash_account_id
  FROM accounts
  WHERE organization_id = p_organization_id
    AND code = '1110'
    AND is_active = true
  LIMIT 1;

  IF v_revenue_account_id IS NULL THEN
    RAISE EXCEPTION 'Revenue account (4111) not found for organization %', p_organization_id;
  END IF;

  IF v_ar_account_id IS NULL THEN
    RAISE EXCEPTION 'Accounts Receivable (1200) not found for organization %', p_organization_id;
  END IF;

  IF v_cash_account_id IS NULL THEN
    RAISE EXCEPTION 'Cash account (1110) not found for organization %', p_organization_id;
  END IF;

  -- Map harvest sales to revenue accounts based on intended_for
  INSERT INTO account_mappings (organization_id, mapping_type, source_key, account_id, metadata)
  VALUES
    (p_organization_id, 'harvest_sale', 'market', v_revenue_account_id, jsonb_build_object('description', 'Revenue from market sales', 'account_code', '4111', 'ar_account_id', v_ar_account_id, 'cash_account_id', v_cash_account_id)),
    (p_organization_id, 'harvest_sale', 'export', v_revenue_account_id, jsonb_build_object('description', 'Revenue from export sales', 'account_code', '4111', 'ar_account_id', v_ar_account_id, 'cash_account_id', v_cash_account_id)),
    (p_organization_id, 'harvest_sale', 'direct_client', v_revenue_account_id, jsonb_build_object('description', 'Revenue from direct client sales', 'account_code', '4111', 'ar_account_id', v_ar_account_id, 'cash_account_id', v_cash_account_id)),
    (p_organization_id, 'harvest_sale', 'processing', v_revenue_account_id, jsonb_build_object('description', 'Revenue from processing facility sales', 'account_code', '4111', 'ar_account_id', v_ar_account_id, 'cash_account_id', v_cash_account_id)),
    (p_organization_id, 'harvest_sale', 'storage', v_revenue_account_id, jsonb_build_object('description', 'Revenue from storage sales', 'account_code', '4111', 'ar_account_id', v_ar_account_id, 'cash_account_id', v_cash_account_id))
  ON CONFLICT (organization_id, mapping_type, source_key)
  DO UPDATE SET
    account_id = EXCLUDED.account_id,
    metadata = EXCLUDED.metadata;

  RAISE NOTICE 'Harvest sales account mappings created for organization %', p_organization_id;
END;
$$ LANGUAGE plpgsql;

-- Create helpful views for easy reference
CREATE OR REPLACE VIEW v_task_cost_mappings AS
SELECT
  o.name as organization_name,
  am.organization_id,
  am.mapping_type,
  am.source_key as task_type,
  a.code as account_code,
  a.name as account_name,
  a.account_type,
  am.is_active
FROM account_mappings am
LEFT JOIN organizations o ON am.organization_id = o.id
LEFT JOIN accounts a ON am.account_id = a.id
WHERE am.mapping_type IN ('cost_type', 'cash')
ORDER BY o.name, am.source_key;

CREATE OR REPLACE VIEW v_harvest_sales_mappings AS
SELECT
  am.organization_id,
  am.source_key as sale_type,
  am.account_id as revenue_account_id,
  a.code as revenue_account_code,
  a.name as revenue_account_name,
  (am.metadata->>'ar_account_id')::uuid as ar_account_id,
  (am.metadata->>'cash_account_id')::uuid as cash_account_id,
  am.metadata->>'description' as description
FROM account_mappings am
JOIN accounts a ON a.id = am.account_id
WHERE am.mapping_type = 'harvest_sale'
  AND am.is_active = true
ORDER BY am.organization_id, am.source_key;

COMMENT ON FUNCTION create_task_cost_mappings IS 'Creates account mappings for task cost transactions (Phase 2). Maps task types to expense accounts.';
COMMENT ON FUNCTION create_harvest_sales_mappings IS 'Creates account mappings for harvest sales transactions (Phase 3). Maps sale types to revenue accounts.';
COMMENT ON VIEW v_task_cost_mappings IS 'Shows all task cost to account mappings for easy reference';
COMMENT ON VIEW v_harvest_sales_mappings IS 'Provides easy access to harvest sales account mappings for journal entry creation';

SELECT 'Phase 2 & 3 functions and views created successfully!' AS status;
