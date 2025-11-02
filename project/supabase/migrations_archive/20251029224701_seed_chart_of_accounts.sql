-- Migration: Seed Chart of Accounts
-- Date: 2025-10-29
-- Description: Creates a standard chart of accounts for all organizations
-- This will be run as a function that can be called for any organization

-- ============================================================================
-- Function to create standard chart of accounts for an organization
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_chart_of_accounts(org_id UUID, currency_code TEXT DEFAULT 'MAD')
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  -- Asset accounts
  v_assets_id UUID;
  v_current_assets_id UUID;
  v_fixed_assets_id UUID;

  -- Liability accounts
  v_liabilities_id UUID;
  v_current_liabilities_id UUID;

  -- Equity accounts
  v_equity_id UUID;

  -- Revenue accounts
  v_revenue_id UUID;

  -- Expense accounts
  v_expenses_id UUID;
  v_direct_expenses_id UUID;
  v_indirect_expenses_id UUID;
BEGIN
  -- Check if accounts already exist for this organization
  IF EXISTS (SELECT 1 FROM public.accounts WHERE organization_id = org_id LIMIT 1) THEN
    RAISE NOTICE 'Accounts already exist for organization %, skipping seed', org_id;
    RETURN;
  END IF;

  -- ============================================================================
  -- ASSETS
  -- ============================================================================

  -- Main Assets Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '1000', 'Assets', 'Asset', true, true, currency_code, false)
  RETURNING id INTO v_assets_id;

  -- Current Assets Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '1100', 'Current Assets', 'Asset', 'Current Asset', v_assets_id, true, true, currency_code, false)
  RETURNING id INTO v_current_assets_id;

  -- Cash and Bank Accounts
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '1110', 'Cash', 'Asset', 'Cash', v_current_assets_id, false, true, currency_code, true, 'Cash in hand'),
    (org_id, '1120', 'Bank Accounts', 'Asset', 'Bank', v_current_assets_id, false, true, currency_code, true, 'Bank checking and savings accounts'),
    (org_id, '1130', 'Petty Cash', 'Asset', 'Cash', v_current_assets_id, false, true, currency_code, true, 'Small cash for minor expenses');

  -- Accounts Receivable
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '1200', 'Accounts Receivable', 'Asset', 'Receivable', v_current_assets_id, false, true, currency_code, true, 'Money owed by customers'),
    (org_id, '1210', 'Allowance for Doubtful Accounts', 'Asset', 'Receivable', v_current_assets_id, false, true, currency_code, false, 'Estimated uncollectible receivables');

  -- Inventory
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '1300', 'Inventory - Raw Materials', 'Asset', 'Inventory', v_current_assets_id, false, true, currency_code, true, 'Fertilizers, seeds, chemicals'),
    (org_id, '1310', 'Inventory - Finished Goods', 'Asset', 'Inventory', v_current_assets_id, false, true, currency_code, true, 'Harvested crops ready for sale'),
    (org_id, '1320', 'Inventory - Supplies', 'Asset', 'Inventory', v_current_assets_id, false, true, currency_code, true, 'General farm supplies');

  -- Prepaid Expenses
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '1400', 'Prepaid Expenses', 'Asset', 'Prepaid Expense', v_current_assets_id, false, true, currency_code, false, 'Expenses paid in advance');

  -- Fixed Assets Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '1500', 'Fixed Assets', 'Asset', 'Fixed Asset', v_assets_id, true, true, currency_code, false)
  RETURNING id INTO v_fixed_assets_id;

  -- Fixed Assets Accounts
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '1510', 'Land', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, true, 'Agricultural land'),
    (org_id, '1520', 'Buildings', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, true, 'Farm buildings and structures'),
    (org_id, '1530', 'Equipment', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, true, 'Tractors, machinery, tools'),
    (org_id, '1540', 'Vehicles', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, true, 'Farm vehicles'),
    (org_id, '1550', 'Irrigation Systems', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, true, 'Irrigation infrastructure'),
    (org_id, '1560', 'Accumulated Depreciation - Equipment', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, false, 'Depreciation on equipment'),
    (org_id, '1565', 'Accumulated Depreciation - Buildings', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, false, 'Depreciation on buildings'),
    (org_id, '1570', 'Accumulated Depreciation - Vehicles', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, false, 'Depreciation on vehicles');

  -- ============================================================================
  -- LIABILITIES
  -- ============================================================================

  -- Main Liabilities Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '2000', 'Liabilities', 'Liability', true, true, currency_code, false)
  RETURNING id INTO v_liabilities_id;

  -- Current Liabilities Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '2100', 'Current Liabilities', 'Liability', 'Current Liability', v_liabilities_id, true, true, currency_code, false)
  RETURNING id INTO v_current_liabilities_id;

  -- Current Liabilities Accounts
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '2110', 'Accounts Payable', 'Liability', 'Payable', v_current_liabilities_id, false, true, currency_code, true, 'Money owed to suppliers'),
    (org_id, '2120', 'Short-term Loans', 'Liability', 'Loan', v_current_liabilities_id, false, true, currency_code, false, 'Loans due within one year'),
    (org_id, '2130', 'Accrued Expenses', 'Liability', 'Payable', v_current_liabilities_id, false, true, currency_code, false, 'Expenses incurred but not yet paid'),
    (org_id, '2140', 'Wages Payable', 'Liability', 'Payable', v_current_liabilities_id, false, true, currency_code, true, 'Unpaid worker wages'),
    (org_id, '2150', 'Taxes Payable', 'Liability', 'Payable', v_current_liabilities_id, false, true, currency_code, false, 'Unpaid taxes'),
    (org_id, '2160', 'Interest Payable', 'Liability', 'Payable', v_current_liabilities_id, false, true, currency_code, false, 'Unpaid interest on loans');

  -- Long-term Liabilities
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '2200', 'Long-term Loans', 'Liability', 'Long-term Liability', v_liabilities_id, false, true, currency_code, false, 'Loans due after one year'),
    (org_id, '2210', 'Mortgages Payable', 'Liability', 'Long-term Liability', v_liabilities_id, false, true, currency_code, true, 'Property mortgages');

  -- ============================================================================
  -- EQUITY
  -- ============================================================================

  -- Main Equity Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '3000', 'Equity', 'Equity', true, true, currency_code, false)
  RETURNING id INTO v_equity_id;

  -- Equity Accounts
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '3100', 'Owner''s Capital', 'Equity', 'Capital', v_equity_id, false, true, currency_code, false, 'Owner investment in business'),
    (org_id, '3200', 'Retained Earnings', 'Equity', 'Retained Earnings', v_equity_id, false, true, currency_code, false, 'Accumulated profits'),
    (org_id, '3300', 'Owner''s Drawings', 'Equity', 'Drawings', v_equity_id, false, true, currency_code, false, 'Owner withdrawals'),
    (org_id, '3400', 'Current Year Earnings', 'Equity', 'Earnings', v_equity_id, false, true, currency_code, false, 'Profit/loss for current year');

  -- ============================================================================
  -- REVENUE
  -- ============================================================================

  -- Main Revenue Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '4000', 'Revenue', 'Revenue', true, true, currency_code, false)
  RETURNING id INTO v_revenue_id;

  -- Revenue Accounts
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '4100', 'Sales - Crops', 'Revenue', 'Sales Revenue', v_revenue_id, false, true, currency_code, true, 'Revenue from crop sales'),
    (org_id, '4110', 'Sales - Fruits', 'Revenue', 'Sales Revenue', v_revenue_id, false, true, currency_code, true, 'Revenue from fruit sales'),
    (org_id, '4120', 'Sales - Vegetables', 'Revenue', 'Sales Revenue', v_revenue_id, false, true, currency_code, true, 'Revenue from vegetable sales'),
    (org_id, '4200', 'Service Revenue', 'Revenue', 'Service Revenue', v_revenue_id, false, true, currency_code, true, 'Revenue from services'),
    (org_id, '4300', 'Other Income', 'Revenue', 'Other Income', v_revenue_id, false, true, currency_code, false, 'Miscellaneous income'),
    (org_id, '4400', 'Interest Income', 'Revenue', 'Interest Income', v_revenue_id, false, true, currency_code, false, 'Interest earned');

  -- ============================================================================
  -- EXPENSES
  -- ============================================================================

  -- Main Expenses Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '5000', 'Expenses', 'Expense', true, true, currency_code, false)
  RETURNING id INTO v_expenses_id;

  -- Direct Expenses (Cost of Goods Sold)
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '5100', 'Cost of Goods Sold', 'Expense', 'Cost of Goods Sold', v_expenses_id, true, true, currency_code, false)
  RETURNING id INTO v_direct_expenses_id;

  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '5110', 'Seeds and Planting Material', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Cost of seeds'),
    (org_id, '5120', 'Fertilizers', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Fertilizer expenses'),
    (org_id, '5130', 'Pesticides and Herbicides', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Crop protection chemicals'),
    (org_id, '5140', 'Water and Irrigation', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Water costs'),
    (org_id, '5150', 'Labor - Direct', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Direct farm labor'),
    (org_id, '5160', 'Harvest Costs', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Harvesting expenses'),
    (org_id, '5170', 'Packaging Materials', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Packaging costs');

  -- Operating Expenses
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '5200', 'Operating Expenses', 'Expense', 'Operating Expense', v_expenses_id, true, true, currency_code, false)
  RETURNING id INTO v_indirect_expenses_id;

  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '5210', 'Salaries and Wages - Admin', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Administrative salaries'),
    (org_id, '5220', 'Rent Expense', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Rent for land/facilities'),
    (org_id, '5230', 'Utilities', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Electricity, water, gas'),
    (org_id, '5240', 'Fuel and Oil', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Fuel for equipment'),
    (org_id, '5250', 'Repairs and Maintenance', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Equipment/building repairs'),
    (org_id, '5260', 'Insurance', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Business insurance'),
    (org_id, '5270', 'Professional Fees', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Legal, accounting fees'),
    (org_id, '5280', 'Office Supplies', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Office materials'),
    (org_id, '5290', 'Transportation', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Transport costs'),
    (org_id, '5300', 'Marketing and Advertising', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Marketing expenses'),
    (org_id, '5310', 'Depreciation Expense', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Depreciation charges'),
    (org_id, '5320', 'Interest Expense', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Interest on loans'),
    (org_id, '5330', 'Bank Charges', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Banking fees'),
    (org_id, '5340', 'Licenses and Permits', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Government licenses'),
    (org_id, '5350', 'Taxes and Fees', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Business taxes'),
    (org_id, '5360', 'Miscellaneous Expenses', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Other expenses');

  RAISE NOTICE 'Successfully seeded chart of accounts for organization %', org_id;
END;
$$;

-- ============================================================================
-- Seed accounts for all existing organizations
-- ============================================================================

DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id, currency FROM public.organizations
  LOOP
    PERFORM seed_chart_of_accounts(org.id, COALESCE(org.currency, 'MAD'));
  END LOOP;
END $$;

-- ============================================================================
-- Create trigger to auto-seed accounts for new organizations
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_seed_chart_of_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Seed chart of accounts for the new organization
  PERFORM seed_chart_of_accounts(NEW.id, COALESCE(NEW.currency, 'MAD'));
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_seed_chart_of_accounts ON public.organizations;

-- Create trigger
CREATE TRIGGER trigger_auto_seed_chart_of_accounts
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION auto_seed_chart_of_accounts();

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION seed_chart_of_accounts(UUID, TEXT) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION seed_chart_of_accounts(UUID, TEXT) IS 'Seeds a standard chart of accounts for an organization. Can be called manually or automatically via trigger.';
COMMENT ON FUNCTION auto_seed_chart_of_accounts() IS 'Trigger function that automatically seeds chart of accounts when a new organization is created.';
