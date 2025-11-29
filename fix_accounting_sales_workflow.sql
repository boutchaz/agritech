-- =====================================================
-- ACCOUNTING & SALES PROCESS FIXES
-- =====================================================
-- This migration adds missing fields and triggers to enable
-- end-to-end accounting and sales workflow
-- =====================================================

-- =====================================================
-- PHASE 1: Add Missing Fields to Sales Orders
-- =====================================================

-- Add tracking fields for invoicing and payments
ALTER TABLE sales_orders 
  ADD COLUMN IF NOT EXISTS invoiced_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'MAD',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6) DEFAULT 1.0;

-- Initialize outstanding_amount for existing records
UPDATE sales_orders 
SET outstanding_amount = COALESCE(total_amount, 0) - COALESCE(invoiced_amount, 0)
WHERE outstanding_amount IS NULL;

-- Add constraint to ensure outstanding_amount is not negative
ALTER TABLE sales_orders 
  ADD CONSTRAINT sales_orders_outstanding_amount_check 
  CHECK (outstanding_amount >= 0);

-- =====================================================
-- PHASE 2: Add Missing Fields to Purchase Orders
-- =====================================================

-- Add tracking fields for billing and payments (for consistency)
ALTER TABLE purchase_orders 
  ADD COLUMN IF NOT EXISTS billed_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'MAD',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6) DEFAULT 1.0;

-- Initialize outstanding_amount for existing records
UPDATE purchase_orders 
SET outstanding_amount = COALESCE(total_amount, 0) - COALESCE(billed_amount, 0)
WHERE outstanding_amount IS NULL;

-- Add constraint to ensure outstanding_amount is not negative
ALTER TABLE purchase_orders 
  ADD CONSTRAINT purchase_orders_outstanding_amount_check 
  CHECK (outstanding_amount >= 0);

-- =====================================================
-- PHASE 3: Create Trigger to Update Invoice After Payment
-- =====================================================

-- Function to update invoice amounts and status after payment allocation
CREATE OR REPLACE FUNCTION update_invoice_after_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_paid NUMERIC;
  v_grand_total NUMERIC;
  v_new_status invoice_status;
BEGIN
  -- Determine which invoice to update
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Calculate total paid amount for this invoice
  SELECT COALESCE(SUM(allocated_amount), 0)
  INTO v_total_paid
  FROM payment_allocations
  WHERE invoice_id = v_invoice_id;

  -- Get invoice grand total
  SELECT grand_total
  INTO v_grand_total
  FROM invoices
  WHERE id = v_invoice_id;

  -- Determine new status
  IF v_total_paid >= v_grand_total THEN
    v_new_status := 'paid'::invoice_status;
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partially_paid'::invoice_status;
  ELSE
    -- Keep current status if no payments
    SELECT status INTO v_new_status FROM invoices WHERE id = v_invoice_id;
  END IF;

  -- Update invoice
  UPDATE invoices
  SET 
    paid_amount = v_total_paid,
    outstanding_amount = v_grand_total - v_total_paid,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = v_invoice_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_invoice_after_payment ON payment_allocations;
CREATE TRIGGER trg_update_invoice_after_payment
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_after_payment();

-- =====================================================
-- PHASE 4: Create Trigger to Update Sales Order After Invoice
-- =====================================================

-- Function to update sales order amounts and status after invoice changes
CREATE OR REPLACE FUNCTION update_sales_order_after_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_sales_order_id UUID;
  v_total_invoiced NUMERIC;
  v_total_paid NUMERIC;
  v_order_total NUMERIC;
  v_new_status sales_order_status;
BEGIN
  -- Determine which sales order to update
  IF TG_OP = 'DELETE' THEN
    v_sales_order_id := OLD.sales_order_id;
  ELSE
    v_sales_order_id := NEW.sales_order_id;
  END IF;

  -- Skip if no sales order reference
  IF v_sales_order_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate total invoiced amount (excluding cancelled invoices)
  SELECT COALESCE(SUM(grand_total), 0)
  INTO v_total_invoiced
  FROM invoices
  WHERE sales_order_id = v_sales_order_id
    AND status != 'cancelled';

  -- Calculate total paid amount
  SELECT COALESCE(SUM(paid_amount), 0)
  INTO v_total_paid
  FROM invoices
  WHERE sales_order_id = v_sales_order_id
    AND status != 'cancelled';

  -- Get sales order total
  SELECT total_amount
  INTO v_order_total
  FROM sales_orders
  WHERE id = v_sales_order_id;

  -- Determine new status
  -- Priority: invoiced status over delivered status
  IF v_total_invoiced >= v_order_total THEN
    v_new_status := 'invoiced'::sales_order_status;
  ELSIF v_total_invoiced > 0 THEN
    v_new_status := 'partially_invoiced'::sales_order_status;
  ELSE
    -- Keep current status if no invoices
    SELECT status INTO v_new_status FROM sales_orders WHERE id = v_sales_order_id;
  END IF;

  -- Update sales order
  UPDATE sales_orders
  SET
    invoiced_amount = v_total_invoiced,
    outstanding_amount = v_order_total - v_total_invoiced,
    paid_amount = v_total_paid,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = v_sales_order_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_sales_order_after_invoice ON invoices;
CREATE TRIGGER trg_update_sales_order_after_invoice
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_order_after_invoice();

-- =====================================================
-- PHASE 5: Create Trigger to Update Purchase Order After Invoice
-- =====================================================

-- Function to update purchase order amounts and status after invoice changes
CREATE OR REPLACE FUNCTION update_purchase_order_after_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_purchase_order_id UUID;
  v_total_billed NUMERIC;
  v_total_paid NUMERIC;
  v_order_total NUMERIC;
  v_new_status purchase_order_status;
BEGIN
  -- Determine which purchase order to update
  IF TG_OP = 'DELETE' THEN
    v_purchase_order_id := OLD.purchase_order_id;
  ELSE
    v_purchase_order_id := NEW.purchase_order_id;
  END IF;

  -- Skip if no purchase order reference
  IF v_purchase_order_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate total billed amount (excluding cancelled invoices)
  SELECT COALESCE(SUM(grand_total), 0)
  INTO v_total_billed
  FROM invoices
  WHERE purchase_order_id = v_purchase_order_id
    AND status != 'cancelled';

  -- Calculate total paid amount
  SELECT COALESCE(SUM(paid_amount), 0)
  INTO v_total_paid
  FROM invoices
  WHERE purchase_order_id = v_purchase_order_id
    AND status != 'cancelled';

  -- Get purchase order total
  SELECT total_amount
  INTO v_order_total
  FROM purchase_orders
  WHERE id = v_purchase_order_id;

  -- Determine new status
  IF v_total_billed >= v_order_total THEN
    v_new_status := 'billed'::purchase_order_status;
  ELSIF v_total_billed > 0 THEN
    v_new_status := 'partially_billed'::purchase_order_status;
  ELSE
    -- Keep current status if no invoices
    SELECT status INTO v_new_status FROM purchase_orders WHERE id = v_purchase_order_id;
  END IF;

  -- Update purchase order
  UPDATE purchase_orders
  SET
    billed_amount = v_total_billed,
    outstanding_amount = v_order_total - v_total_billed,
    paid_amount = v_total_paid,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = v_purchase_order_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_purchase_order_after_invoice ON invoices;
CREATE TRIGGER trg_update_purchase_order_after_invoice
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_after_invoice();

-- =====================================================
-- PHASE 6: Backfill Existing Data
-- =====================================================

-- Update existing sales orders with calculated values
UPDATE sales_orders so
SET
  invoiced_amount = COALESCE((
    SELECT SUM(grand_total)
    FROM invoices
    WHERE sales_order_id = so.id
      AND status != 'cancelled'
  ), 0),
  paid_amount = COALESCE((
    SELECT SUM(paid_amount)
    FROM invoices
    WHERE sales_order_id = so.id
      AND status != 'cancelled'
  ), 0)
WHERE EXISTS (
  SELECT 1 FROM invoices WHERE sales_order_id = so.id
);

-- Recalculate outstanding amounts
UPDATE sales_orders
SET outstanding_amount = COALESCE(total_amount, 0) - COALESCE(invoiced_amount, 0);

-- Update existing purchase orders with calculated values
UPDATE purchase_orders po
SET
  billed_amount = COALESCE((
    SELECT SUM(grand_total)
    FROM invoices
    WHERE purchase_order_id = po.id
      AND status != 'cancelled'
  ), 0),
  paid_amount = COALESCE((
    SELECT SUM(paid_amount)
    FROM invoices
    WHERE purchase_order_id = po.id
      AND status != 'cancelled'
  ), 0)
WHERE EXISTS (
  SELECT 1 FROM invoices WHERE purchase_order_id = po.id
);

-- Recalculate outstanding amounts
UPDATE purchase_orders
SET outstanding_amount = COALESCE(total_amount, 0) - COALESCE(billed_amount, 0);

-- Update existing invoices with calculated paid amounts
UPDATE invoices i
SET
  paid_amount = COALESCE((
    SELECT SUM(allocated_amount)
    FROM payment_allocations
    WHERE invoice_id = i.id
  ), 0)
WHERE EXISTS (
  SELECT 1 FROM payment_allocations WHERE invoice_id = i.id
);

-- Recalculate outstanding amounts and update status
UPDATE invoices
SET 
  outstanding_amount = grand_total - COALESCE(paid_amount, 0),
  status = CASE
    WHEN COALESCE(paid_amount, 0) >= grand_total THEN 'paid'::invoice_status
    WHEN COALESCE(paid_amount, 0) > 0 THEN 'partially_paid'::invoice_status
    ELSE status
  END
WHERE paid_amount > 0;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these queries to verify the migration worked correctly

-- Check sales orders have correct amounts
-- SELECT 
--   order_number,
--   total_amount,
--   invoiced_amount,
--   outstanding_amount,
--   paid_amount,
--   status
-- FROM sales_orders
-- WHERE invoiced_amount > 0 OR paid_amount > 0
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Check invoices have correct amounts
-- SELECT 
--   invoice_number,
--   invoice_type,
--   grand_total,
--   paid_amount,
--   outstanding_amount,
--   status
-- FROM invoices
-- WHERE paid_amount > 0
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Check payment allocations are working
-- SELECT 
--   p.payment_number,
--   p.amount as payment_amount,
--   i.invoice_number,
--   pa.allocated_amount,
--   i.paid_amount as invoice_paid,
--   i.status as invoice_status
-- FROM payment_allocations pa
-- JOIN accounting_payments p ON pa.payment_id = p.id
-- JOIN invoices i ON pa.invoice_id = i.id
-- ORDER BY pa.created_at DESC
-- LIMIT 10;
