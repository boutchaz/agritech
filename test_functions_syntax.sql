-- Test file to verify Phase 2/3 function syntax

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

SELECT 'create_task_cost_mappings function created successfully' AS status;
