-- Migration: Fix Accounting Schema Mismatches
-- Date: 2025-10-29
-- Description: Aligns the accounting schema with Edge Functions and UI expectations
-- Fixes column names, enums, missing columns, and creates necessary views/functions

-- ============================================================================
-- PART 1: Fix accounting_payments schema
-- ============================================================================

-- Fix payment_type enum values from 'receive'/'pay' to 'received'/'paid'
-- Note: New enum values added in part1 migration (must be separate transaction)

-- Update existing data to use new values
UPDATE public.accounting_payments
SET payment_type = 'received'::accounting_payment_type
WHERE payment_type = 'receive'::accounting_payment_type;

UPDATE public.accounting_payments
SET payment_type = 'paid'::accounting_payment_type
WHERE payment_type = 'pay'::accounting_payment_type;

-- Add GL account mapping for bank accounts if not exists
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS gl_account_id UUID REFERENCES public.accounts(id);

COMMENT ON COLUMN public.bank_accounts.gl_account_id IS 'Reference to the GL account representing this bank account';

-- ============================================================================
-- PART 2: Fix invoices schema
-- ============================================================================

-- Rename total_tax to tax_total if needed (check which column actually exists)
DO $$
BEGIN
  -- Only add tax_total if it doesn't exist and total_tax does
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'invoices'
                 AND column_name = 'tax_total')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'invoices'
                 AND column_name = 'total_tax')
  THEN
    ALTER TABLE public.invoices RENAME COLUMN total_tax TO tax_total;
  END IF;
END $$;

-- ============================================================================
-- PART 3: Fix invoice_items schema
-- ============================================================================

-- Add missing columns to invoice_items if they don't exist
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS rate DECIMAL(15,2);

-- Populate rate from amount/quantity if empty
UPDATE public.invoice_items
SET rate = CASE WHEN quantity > 0 THEN amount / quantity ELSE amount END
WHERE rate IS NULL;

-- Create computed column helpers or update existing
COMMENT ON COLUMN public.invoice_items.rate IS 'Unit price (same as amount/quantity)';

-- ============================================================================
-- PART 4: Fix journal_entries schema
-- ============================================================================

-- Add entry_number if missing
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS entry_number TEXT;

-- Generate entry numbers for existing entries
DO $$
DECLARE
  entry RECORD;
  counter INTEGER;
BEGIN
  FOR entry IN
    SELECT id, organization_id, entry_date
    FROM public.journal_entries
    WHERE entry_number IS NULL
    ORDER BY entry_date, created_at
  LOOP
    SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO counter
    FROM public.journal_entries
    WHERE organization_id = entry.organization_id
    AND entry_number IS NOT NULL;

    UPDATE public.journal_entries
    SET entry_number = 'JE-' || LPAD(counter::TEXT, 6, '0')
    WHERE id = entry.id;
  END LOOP;
END $$;

-- Make entry_number required going forward
ALTER TABLE public.journal_entries
  ALTER COLUMN entry_number SET NOT NULL;

-- Create unique constraint on entry_number per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_entry_number_org
  ON public.journal_entries(organization_id, entry_number);

-- Fix status enum to match expectations
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_status_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_status_check
  CHECK (status IN ('draft', 'posted', 'cancelled'));

-- Update 'submitted' to 'posted' for existing entries
UPDATE public.journal_entries
SET status = 'posted'
WHERE status = 'submitted';

-- ============================================================================
-- PART 5: Create journal_entry_lines view (alias for journal_items)
-- ============================================================================

-- Create view for backward compatibility
CREATE OR REPLACE VIEW public.journal_entry_lines AS
SELECT
  id,
  journal_entry_id,
  account_id,
  debit,
  credit,
  description,
  cost_center_id
FROM public.journal_items;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entry_lines TO authenticated;

COMMENT ON VIEW public.journal_entry_lines IS 'Compatibility view - maps to journal_items table';

-- ============================================================================
-- PART 6: Update vw_ledger view to include IDs
-- ============================================================================

DROP VIEW IF EXISTS public.vw_ledger CASCADE;

CREATE VIEW public.vw_ledger
WITH (security_invoker=true) AS
SELECT
  ji.id,
  ji.journal_entry_id,
  ji.account_id,
  ji.debit,
  ji.credit,
  ji.description,
  ji.cost_center_id,
  a.code as account_code,
  a.name as account_name,
  a.account_type,
  je.entry_date,
  je.entry_number,
  je.reference_type,
  je.reference_id,
  je.status as entry_status,
  je.organization_id,
  cc.name as cost_center_name,
  cc.farm_id,
  cc.parcel_id
FROM public.journal_items ji
INNER JOIN public.accounts a ON a.id = ji.account_id
INNER JOIN public.journal_entries je ON je.id = ji.journal_entry_id
LEFT JOIN public.cost_centers cc ON cc.id = ji.cost_center_id;

GRANT SELECT ON public.vw_ledger TO authenticated;

COMMENT ON VIEW public.vw_ledger IS 'Enhanced ledger view with IDs for filtering';

-- ============================================================================
-- PART 7: Create RPC functions for account balances
-- ============================================================================

-- Function to get account balance
CREATE OR REPLACE FUNCTION get_account_balance(
  p_account_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE,
  p_organization_id UUID DEFAULT NULL
)
RETURNS DECIMAL(15,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL(15,2);
  v_account_type TEXT;
BEGIN
  -- Get account type
  SELECT account_type INTO v_account_type
  FROM public.accounts
  WHERE id = p_account_id;

  -- Calculate balance based on account type
  -- Debit balance accounts: Asset, Expense (debit increases balance)
  -- Credit balance accounts: Liability, Equity, Revenue (credit increases balance)

  IF v_account_type IN ('Asset', 'Expense') THEN
    SELECT COALESCE(SUM(ji.debit - ji.credit), 0)
    INTO v_balance
    FROM public.journal_items ji
    INNER JOIN public.journal_entries je ON je.id = ji.journal_entry_id
    WHERE ji.account_id = p_account_id
      AND je.entry_date <= p_as_of_date
      AND je.status = 'posted'
      AND (p_organization_id IS NULL OR je.organization_id = p_organization_id);
  ELSE
    -- Liability, Equity, Revenue
    SELECT COALESCE(SUM(ji.credit - ji.debit), 0)
    INTO v_balance
    FROM public.journal_items ji
    INNER JOIN public.journal_entries je ON je.id = ji.journal_entry_id
    WHERE ji.account_id = p_account_id
      AND je.entry_date <= p_as_of_date
      AND je.status = 'posted'
      AND (p_organization_id IS NULL OR je.organization_id = p_organization_id);
  END IF;

  RETURN v_balance;
END;
$$;

-- Function to get account balance for date range
CREATE OR REPLACE FUNCTION get_account_balance_period(
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_organization_id UUID DEFAULT NULL
)
RETURNS DECIMAL(15,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance DECIMAL(15,2);
  v_account_type TEXT;
BEGIN
  SELECT account_type INTO v_account_type
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_account_type IN ('Asset', 'Expense') THEN
    SELECT COALESCE(SUM(ji.debit - ji.credit), 0)
    INTO v_balance
    FROM public.journal_items ji
    INNER JOIN public.journal_entries je ON je.id = ji.journal_entry_id
    WHERE ji.account_id = p_account_id
      AND je.entry_date BETWEEN p_start_date AND p_end_date
      AND je.status = 'posted'
      AND (p_organization_id IS NULL OR je.organization_id = p_organization_id);
  ELSE
    SELECT COALESCE(SUM(ji.credit - ji.debit), 0)
    INTO v_balance
    FROM public.journal_items ji
    INNER JOIN public.journal_entries je ON je.id = ji.journal_entry_id
    WHERE ji.account_id = p_account_id
      AND je.entry_date BETWEEN p_start_date AND p_end_date
      AND je.status = 'posted'
      AND (p_organization_id IS NULL OR je.organization_id = p_organization_id);
  END IF;

  RETURN v_balance;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_account_balance(UUID, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_balance_period(UUID, DATE, DATE, UUID) TO authenticated;

-- ============================================================================
-- PART 8: Create function to generate journal entry numbers
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_journal_entry_number(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_number INTEGER;
  v_entry_number TEXT;
BEGIN
  -- Get next number
  SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_next_number
  FROM public.journal_entries
  WHERE organization_id = p_organization_id
  AND entry_number LIKE 'JE-%';

  -- Format as JE-XXXXXX
  v_entry_number := 'JE-' || LPAD(v_next_number::TEXT, 6, '0');

  RETURN v_entry_number;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_journal_entry_number(UUID) TO authenticated;

-- ============================================================================
-- PART 9: Fix payments view
-- ============================================================================

DROP VIEW IF EXISTS public.payment_summary CASCADE;

CREATE VIEW public.payment_summary
WITH (security_invoker=true) AS
SELECT
  p.id,
  p.organization_id,
  p.payment_number,
  p.payment_type,
  p.payment_date,
  p.amount,
  p.payment_method,
  p.reference_number,
  p.party_type,
  p.party_id,
  p.party_name,
  p.remarks,
  p.bank_account_id,
  p.created_at,
  p.updated_at,
  p.created_by,
  ba.account_name as bank_account_name,
  ba.gl_account_id as bank_gl_account_id,
  COALESCE(
    (SELECT SUM(pa.allocated_amount)
     FROM public.payment_allocations pa
     WHERE pa.payment_id = p.id),
    0
  ) as allocated_amount,
  p.amount - COALESCE(
    (SELECT SUM(pa.allocated_amount)
     FROM public.payment_allocations pa
     WHERE pa.payment_id = p.id),
    0
  ) as unallocated_amount
FROM public.accounting_payments p
LEFT JOIN public.bank_accounts ba ON ba.id = p.bank_account_id;

GRANT SELECT ON public.payment_summary TO authenticated;

-- ============================================================================
-- PART 10: Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_journal_items_account_id ON public.journal_items(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_items_cost_center_id ON public.journal_items(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON public.journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_income_account ON public.invoice_items(income_account_id) WHERE income_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_expense_account ON public.invoice_items(expense_account_id) WHERE expense_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounting_payments_payment_type ON public.accounting_payments(payment_type);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION get_account_balance(UUID, DATE, UUID) IS 'Returns the account balance as of a specific date, respecting debit/credit nature';
COMMENT ON FUNCTION get_account_balance_period(UUID, DATE, DATE, UUID) IS 'Returns the account balance for a specific date range';
COMMENT ON FUNCTION generate_journal_entry_number(UUID) IS 'Generates the next sequential journal entry number for an organization';
COMMENT ON VIEW public.journal_entry_lines IS 'Compatibility alias for journal_items - allows Edge Functions to use old naming';
