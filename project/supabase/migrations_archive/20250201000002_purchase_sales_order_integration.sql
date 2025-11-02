-- Purchase and Sales Order Integration with Stock Management
-- Auto-create stock entries from orders

-- =====================================================
-- 1. Add Stock Entry Reference to Purchase Orders
-- =====================================================
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS stock_entry_id UUID REFERENCES stock_entries(id) ON DELETE SET NULL;

ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS stock_received BOOLEAN DEFAULT FALSE;

ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS stock_received_date DATE;

CREATE INDEX IF NOT EXISTS idx_purchase_orders_stock_entry ON purchase_orders(stock_entry_id);

COMMENT ON COLUMN purchase_orders.stock_entry_id IS 'Reference to Material Receipt stock entry';
COMMENT ON COLUMN purchase_orders.stock_received IS 'Whether stock has been received';

-- =====================================================
-- 2. Add Stock Entry Reference to Sales Orders
-- =====================================================
ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS stock_entry_id UUID REFERENCES stock_entries(id) ON DELETE SET NULL;

ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS stock_issued BOOLEAN DEFAULT FALSE;

ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS stock_issued_date DATE;

CREATE INDEX IF NOT EXISTS idx_sales_orders_stock_entry ON sales_orders(stock_entry_id);

COMMENT ON COLUMN sales_orders.stock_entry_id IS 'Reference to Material Issue stock entry';
COMMENT ON COLUMN sales_orders.stock_issued IS 'Whether stock has been issued for delivery';

-- =====================================================
-- 3. Function: Create Material Receipt from Purchase Order
-- =====================================================
CREATE OR REPLACE FUNCTION create_material_receipt_from_po(
  p_purchase_order_id UUID,
  p_warehouse_id UUID,
  p_receipt_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_po RECORD;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_po_item RECORD;
BEGIN
  -- Get purchase order details
  SELECT * INTO v_po
  FROM purchase_orders
  WHERE id = p_purchase_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  -- Check if already received
  IF v_po.stock_received THEN
    RAISE EXCEPTION 'Stock already received for this purchase order';
  END IF;

  -- Generate entry number
  SELECT generate_stock_entry_number(v_po.organization_id) INTO v_entry_number;

  -- Create stock entry
  INSERT INTO stock_entries (
    organization_id,
    entry_number,
    entry_type,
    entry_date,
    to_warehouse_id,
    reference_type,
    reference_id,
    reference_number,
    purpose,
    status,
    created_by
  ) VALUES (
    v_po.organization_id,
    v_entry_number,
    'Material Receipt',
    p_receipt_date,
    p_warehouse_id,
    'Purchase Order',
    p_purchase_order_id,
    v_po.order_number,
    'Material receipt from Purchase Order ' || v_po.order_number,
    'Draft',
    auth.uid()
  )
  RETURNING id INTO v_entry_id;

  -- Create stock entry items from purchase order items
  FOR v_po_item IN
    SELECT * FROM purchase_order_items WHERE purchase_order_id = p_purchase_order_id
  LOOP
    INSERT INTO stock_entry_items (
      stock_entry_id,
      line_number,
      item_id,
      item_name,
      quantity,
      unit,
      target_warehouse_id,
      cost_per_unit,
      batch_number,
      notes
    ) VALUES (
      v_entry_id,
      v_po_item.line_number,
      v_po_item.item_id,
      v_po_item.item_name,
      v_po_item.quantity,
      v_po_item.unit_of_measure,
      p_warehouse_id,
      v_po_item.unit_price,
      NULL, -- Batch number to be added manually if needed
      'From PO line ' || v_po_item.line_number
    );
  END LOOP;

  -- Update purchase order
  UPDATE purchase_orders
  SET stock_entry_id = v_entry_id
  WHERE id = p_purchase_order_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Function: Create Material Issue from Sales Order
-- =====================================================
CREATE OR REPLACE FUNCTION create_material_issue_from_so(
  p_sales_order_id UUID,
  p_warehouse_id UUID,
  p_issue_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_so RECORD;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_so_item RECORD;
BEGIN
  -- Get sales order details
  SELECT * INTO v_so
  FROM sales_orders
  WHERE id = p_sales_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;

  -- Check if already issued
  IF v_so.stock_issued THEN
    RAISE EXCEPTION 'Stock already issued for this sales order';
  END IF;

  -- Generate entry number
  SELECT generate_stock_entry_number(v_so.organization_id) INTO v_entry_number;

  -- Create stock entry
  INSERT INTO stock_entries (
    organization_id,
    entry_number,
    entry_type,
    entry_date,
    from_warehouse_id,
    reference_type,
    reference_id,
    reference_number,
    purpose,
    status,
    created_by
  ) VALUES (
    v_so.organization_id,
    v_entry_number,
    'Material Issue',
    p_issue_date,
    p_warehouse_id,
    'Sales Order',
    p_sales_order_id,
    v_so.order_number,
    'Material issue for Sales Order ' || v_so.order_number,
    'Draft',
    auth.uid()
  )
  RETURNING id INTO v_entry_id;

  -- Create stock entry items from sales order items
  FOR v_so_item IN
    SELECT * FROM sales_order_items WHERE sales_order_id = p_sales_order_id
  LOOP
    INSERT INTO stock_entry_items (
      stock_entry_id,
      line_number,
      item_id,
      item_name,
      quantity,
      unit,
      source_warehouse_id,
      notes
    ) VALUES (
      v_entry_id,
      v_so_item.line_number,
      v_so_item.item_id,
      v_so_item.item_name,
      v_so_item.quantity,
      v_so_item.unit_of_measure,
      p_warehouse_id,
      'From SO line ' || v_so_item.line_number
    );
  END LOOP;

  -- Update sales order
  UPDATE sales_orders
  SET stock_entry_id = v_entry_id
  WHERE id = p_sales_order_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Trigger: Update PO when Material Receipt is Posted
-- =====================================================
CREATE OR REPLACE FUNCTION update_po_on_receipt_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Posted' AND NEW.entry_type = 'Material Receipt' AND NEW.reference_type = 'Purchase Order' THEN
    UPDATE purchase_orders
    SET
      stock_received = TRUE,
      stock_received_date = NEW.entry_date
    WHERE id = NEW.reference_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_po_on_receipt
  AFTER UPDATE ON stock_entries
  FOR EACH ROW
  WHEN (NEW.status = 'Posted' AND NEW.entry_type = 'Material Receipt')
  EXECUTE FUNCTION update_po_on_receipt_post();

-- =====================================================
-- 6. Trigger: Update SO when Material Issue is Posted
-- =====================================================
CREATE OR REPLACE FUNCTION update_so_on_issue_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Posted' AND NEW.entry_type = 'Material Issue' AND NEW.reference_type = 'Sales Order' THEN
    UPDATE sales_orders
    SET
      stock_issued = TRUE,
      stock_issued_date = NEW.entry_date
    WHERE id = NEW.reference_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_so_on_issue
  AFTER UPDATE ON stock_entries
  FOR EACH ROW
  WHEN (NEW.status = 'Posted' AND NEW.entry_type = 'Material Issue')
  EXECUTE FUNCTION update_so_on_issue_post();

-- =====================================================
-- 7. Comments
-- =====================================================
COMMENT ON FUNCTION create_material_receipt_from_po IS 'Create Material Receipt stock entry from Purchase Order';
COMMENT ON FUNCTION create_material_issue_from_so IS 'Create Material Issue stock entry from Sales Order';
