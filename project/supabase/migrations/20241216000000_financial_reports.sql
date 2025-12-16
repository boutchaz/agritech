-- =====================================================
-- FINANCIAL REPORTING FUNCTIONS
-- Account balance calculation and financial reports
-- =====================================================

-- Function to calculate account balance up to a specific date
-- Only considers POSTED journal entries
CREATE OR REPLACE FUNCTION get_account_balance(
  p_organization_id UUID,
  p_account_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code VARCHAR(50),
  account_name VARCHAR(255),
  account_type VARCHAR(50),
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  balance DECIMAL(15,2),
  normal_balance VARCHAR(10)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.account_type,
    COALESCE(SUM(ji.debit), 0)::DECIMAL(15,2) AS total_debit,
    COALESCE(SUM(ji.credit), 0)::DECIMAL(15,2) AS total_credit,
    (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2) AS balance,
    CASE
      WHEN a.account_type IN ('Asset', 'Expense') THEN 'debit'::VARCHAR(10)
      ELSE 'credit'::VARCHAR(10)
    END AS normal_balance
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
  WHERE a.id = p_account_id
    AND a.organization_id = p_organization_id
    AND a.is_active = true
  GROUP BY a.id, a.code, a.name, a.account_type;
END;
$$;

GRANT EXECUTE ON FUNCTION get_account_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_balance TO service_role;

COMMENT ON FUNCTION get_account_balance IS
'Calculates the balance for a single account as of a specific date, considering only posted journal entries';

-- Function to get trial balance for all accounts
CREATE OR REPLACE FUNCTION get_trial_balance(
  p_organization_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code VARCHAR(50),
  account_name VARCHAR(255),
  account_type VARCHAR(50),
  account_subtype VARCHAR(100),
  parent_id UUID,
  is_group BOOLEAN,
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  balance DECIMAL(15,2),
  debit_balance DECIMAL(15,2),
  credit_balance DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.account_type,
    a.account_subtype,
    a.parent_id,
    a.is_group,
    COALESCE(SUM(ji.debit), 0)::DECIMAL(15,2) AS total_debit,
    COALESCE(SUM(ji.credit), 0)::DECIMAL(15,2) AS total_credit,
    (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2) AS balance,
    -- Debit balance: positive for debit accounts (Asset, Expense)
    CASE
      WHEN (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0)) > 0
      THEN (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2)
      ELSE 0::DECIMAL(15,2)
    END AS debit_balance,
    -- Credit balance: positive for credit accounts (Liability, Equity, Revenue)
    CASE
      WHEN (COALESCE(SUM(ji.credit), 0) - COALESCE(SUM(ji.debit), 0)) > 0
      THEN (COALESCE(SUM(ji.credit), 0) - COALESCE(SUM(ji.debit), 0))::DECIMAL(15,2)
      ELSE 0::DECIMAL(15,2)
    END AS credit_balance
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
  WHERE a.organization_id = p_organization_id
    AND a.is_active = true
    AND a.is_group = false  -- Only non-group accounts have balances
  GROUP BY a.id, a.code, a.name, a.account_type, a.account_subtype, a.parent_id, a.is_group
  HAVING COALESCE(SUM(ji.debit), 0) > 0 OR COALESCE(SUM(ji.credit), 0) > 0
  ORDER BY a.code;
END;
$$;

GRANT EXECUTE ON FUNCTION get_trial_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_balance TO service_role;

COMMENT ON FUNCTION get_trial_balance IS
'Returns trial balance for all accounts with transactions as of a specific date';

-- Function to get balance sheet data
CREATE OR REPLACE FUNCTION get_balance_sheet(
  p_organization_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  section VARCHAR(50),
  account_id UUID,
  account_code VARCHAR(50),
  account_name VARCHAR(255),
  account_type VARCHAR(50),
  account_subtype VARCHAR(100),
  balance DECIMAL(15,2),
  display_balance DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN a.account_type = 'Asset' THEN 'assets'::VARCHAR(50)
      WHEN a.account_type = 'Liability' THEN 'liabilities'::VARCHAR(50)
      WHEN a.account_type = 'Equity' THEN 'equity'::VARCHAR(50)
    END AS section,
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.account_type,
    a.account_subtype,
    (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2) AS balance,
    -- Display balance: Assets show debit balance positive, Liabilities/Equity show credit balance positive
    CASE
      WHEN a.account_type = 'Asset'
        THEN (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2)
      ELSE (COALESCE(SUM(ji.credit), 0) - COALESCE(SUM(ji.debit), 0))::DECIMAL(15,2)
    END AS display_balance
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
  WHERE a.organization_id = p_organization_id
    AND a.is_active = true
    AND a.is_group = false
    AND a.account_type IN ('Asset', 'Liability', 'Equity')
  GROUP BY a.id, a.code, a.name, a.account_type, a.account_subtype
  HAVING COALESCE(SUM(ji.debit), 0) > 0 OR COALESCE(SUM(ji.credit), 0) > 0
  ORDER BY
    CASE a.account_type
      WHEN 'Asset' THEN 1
      WHEN 'Liability' THEN 2
      WHEN 'Equity' THEN 3
    END,
    a.code;
END;
$$;

GRANT EXECUTE ON FUNCTION get_balance_sheet TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_sheet TO service_role;

COMMENT ON FUNCTION get_balance_sheet IS
'Returns balance sheet data grouped by Assets, Liabilities, and Equity as of a specific date';

-- Function to get profit and loss statement
CREATE OR REPLACE FUNCTION get_profit_loss(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  section VARCHAR(50),
  account_id UUID,
  account_code VARCHAR(50),
  account_name VARCHAR(255),
  account_type VARCHAR(50),
  account_subtype VARCHAR(100),
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  balance DECIMAL(15,2),
  display_amount DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN a.account_type = 'Revenue' THEN 'revenue'::VARCHAR(50)
      WHEN a.account_type = 'Expense' THEN 'expenses'::VARCHAR(50)
    END AS section,
    a.id AS account_id,
    a.code AS account_code,
    a.name AS account_name,
    a.account_type,
    a.account_subtype,
    COALESCE(SUM(ji.debit), 0)::DECIMAL(15,2) AS total_debit,
    COALESCE(SUM(ji.credit), 0)::DECIMAL(15,2) AS total_credit,
    (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2) AS balance,
    -- Display amount: Revenue shows credit balance positive, Expenses show debit balance positive
    CASE
      WHEN a.account_type = 'Revenue'
        THEN (COALESCE(SUM(ji.credit), 0) - COALESCE(SUM(ji.debit), 0))::DECIMAL(15,2)
      ELSE (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2)
    END AS display_amount
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date >= p_start_date
    AND je.entry_date <= p_end_date
  WHERE a.organization_id = p_organization_id
    AND a.is_active = true
    AND a.is_group = false
    AND a.account_type IN ('Revenue', 'Expense')
  GROUP BY a.id, a.code, a.name, a.account_type, a.account_subtype
  HAVING COALESCE(SUM(ji.debit), 0) > 0 OR COALESCE(SUM(ji.credit), 0) > 0
  ORDER BY
    CASE a.account_type
      WHEN 'Revenue' THEN 1
      WHEN 'Expense' THEN 2
    END,
    a.code;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profit_loss TO authenticated;
GRANT EXECUTE ON FUNCTION get_profit_loss TO service_role;

COMMENT ON FUNCTION get_profit_loss IS
'Returns profit and loss statement data for a date range';

-- Function to get general ledger for a specific account
CREATE OR REPLACE FUNCTION get_general_ledger(
  p_organization_id UUID,
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  entry_date DATE,
  entry_number VARCHAR(50),
  journal_entry_id UUID,
  description TEXT,
  reference_type VARCHAR(50),
  reference_number VARCHAR(100),
  debit DECIMAL(15,2),
  credit DECIMAL(15,2),
  running_balance DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opening_balance DECIMAL(15,2);
BEGIN
  -- Calculate opening balance (all posted entries before start date)
  SELECT COALESCE(SUM(ji.debit) - SUM(ji.credit), 0)
  INTO v_opening_balance
  FROM journal_items ji
  JOIN journal_entries je ON je.id = ji.journal_entry_id
  WHERE ji.account_id = p_account_id
    AND je.organization_id = p_organization_id
    AND je.status = 'posted'
    AND je.entry_date < p_start_date;

  RETURN QUERY
  WITH ledger_entries AS (
    SELECT
      je.entry_date,
      je.entry_number,
      je.id AS journal_entry_id,
      COALESCE(ji.description, je.remarks, '') AS description,
      je.reference_type,
      je.reference_number,
      ji.debit,
      ji.credit,
      ROW_NUMBER() OVER (ORDER BY je.entry_date, je.entry_number) AS rn
    FROM journal_items ji
    JOIN journal_entries je ON je.id = ji.journal_entry_id
    WHERE ji.account_id = p_account_id
      AND je.organization_id = p_organization_id
      AND je.status = 'posted'
      AND je.entry_date >= p_start_date
      AND je.entry_date <= p_end_date
    ORDER BY je.entry_date, je.entry_number
  )
  SELECT
    le.entry_date,
    le.entry_number,
    le.journal_entry_id,
    le.description,
    le.reference_type,
    le.reference_number,
    le.debit,
    le.credit,
    (v_opening_balance + SUM(le.debit - le.credit) OVER (ORDER BY le.rn))::DECIMAL(15,2) AS running_balance
  FROM ledger_entries le;
END;
$$;

GRANT EXECUTE ON FUNCTION get_general_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION get_general_ledger TO service_role;

COMMENT ON FUNCTION get_general_ledger IS
'Returns general ledger entries for a specific account with running balance';

-- Function to get account balance summary by type
CREATE OR REPLACE FUNCTION get_account_summary(
  p_organization_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  account_type VARCHAR(50),
  total_accounts BIGINT,
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  net_balance DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.account_type,
    COUNT(DISTINCT a.id) AS total_accounts,
    COALESCE(SUM(ji.debit), 0)::DECIMAL(15,2) AS total_debit,
    COALESCE(SUM(ji.credit), 0)::DECIMAL(15,2) AS total_credit,
    (COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0))::DECIMAL(15,2) AS net_balance
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date <= p_as_of_date
  WHERE a.organization_id = p_organization_id
    AND a.is_active = true
    AND a.is_group = false
  GROUP BY a.account_type
  ORDER BY
    CASE a.account_type
      WHEN 'Asset' THEN 1
      WHEN 'Liability' THEN 2
      WHEN 'Equity' THEN 3
      WHEN 'Revenue' THEN 4
      WHEN 'Expense' THEN 5
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_account_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_summary TO service_role;

COMMENT ON FUNCTION get_account_summary IS
'Returns summary of account balances grouped by account type';
