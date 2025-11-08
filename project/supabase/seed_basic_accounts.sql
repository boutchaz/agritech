-- =====================================================
-- SEED BASIC ACCOUNTS FOR UTILITIES INTEGRATION
-- =====================================================
-- This script creates the minimum required accounts for
-- utilities management and ledger integration to work
-- =====================================================

-- IMPORTANT: Replace 'YOUR_ORGANIZATION_ID' with your actual organization ID
-- You can find it by running:
-- SELECT id, name FROM organizations WHERE slug = 'your-org-slug';

DO $$
DECLARE
  v_org_id UUID := 'YOUR_ORGANIZATION_ID'; -- REPLACE THIS!
BEGIN
  -- Check if organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_org_id) THEN
    RAISE EXCEPTION 'Organization % does not exist. Please update v_org_id variable.', v_org_id;
  END IF;

  RAISE NOTICE 'Creating accounts for organization: %', v_org_id;

  -- =====================================================
  -- EXPENSE ACCOUNTS (Class 6 - Charges)
  -- =====================================================

  -- Operating Expenses Group
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '6000', 'Charges d''exploitation', 'Expense', 'Operating Expense',
    true, true, NULL, 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- Utilities (Generic)
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '6060', 'Utilities', 'Expense', 'Operating Expense',
    false, true, '6000', 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- Electricity
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '6167', 'Électricité', 'Expense', 'Operating Expense',
    false, true, '6000', 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- Water
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '6061', 'Eau', 'Expense', 'Operating Expense',
    false, true, '6000', 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- Telephone
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '6227', 'Téléphone', 'Expense', 'Operating Expense',
    false, true, '6000', 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- Internet
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '6228', 'Internet', 'Expense', 'Operating Expense',
    false, true, '6000', 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- Gas
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '6065', 'Gaz', 'Expense', 'Operating Expense',
    false, true, '6000', 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- Diesel/Fuel
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '6241', 'Carburant', 'Expense', 'Operating Expense',
    false, true, '6000', 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- ASSET ACCOUNTS (Class 5 - Financial Accounts)
  -- =====================================================

  -- Cash
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '5161', 'Caisse', 'Asset', 'Cash',
    false, true, NULL, 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- Bank Account
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '5141', 'Banque - Compte courant', 'Asset', 'Cash',
    false, true, NULL, 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- LIABILITY ACCOUNTS (Class 4 - Third-Party Accounts)
  -- =====================================================

  -- Accounts Payable / Suppliers
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '4010', 'Fournisseurs', 'Liability', 'Payable',
    false, true, NULL, 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  -- Utility Suppliers (specific)
  INSERT INTO accounts (
    organization_id, code, name, account_type, account_subtype,
    is_group, is_active, parent_code, currency_code
  ) VALUES (
    v_org_id, '4017', 'Fournisseurs - Services publics', 'Liability', 'Payable',
    false, true, '4010', 'MAD'
  ) ON CONFLICT (organization_id, code) DO NOTHING;

  RAISE NOTICE 'Successfully created basic accounts!';
  RAISE NOTICE 'You can now add utilities and the ledger integration will work automatically.';

END $$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify accounts were created:

-- SELECT
--   code,
--   name,
--   account_type,
--   account_subtype,
--   is_group,
--   is_active
-- FROM accounts
-- WHERE organization_id = 'YOUR_ORGANIZATION_ID'
-- ORDER BY code;
