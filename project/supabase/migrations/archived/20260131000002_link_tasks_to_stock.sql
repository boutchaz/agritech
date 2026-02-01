-- Link tasks to stock for automatic updates
-- Migration: 20260131000002_link_tasks_to_stock.sql

-- Task Stock Consumption table
-- Tracks which items/variants are planned/required for a task
CREATE TABLE IF NOT EXISTS task_stock_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity_consumed NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT task_stock_consumption_unique UNIQUE (task_id, variant_id, item_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_stock_consumption_task ON task_stock_consumption(task_id);
CREATE INDEX IF NOT EXISTS idx_task_stock_consumption_variant ON task_stock_consumption(variant_id);
CREATE INDEX IF NOT EXISTS idx_task_stock_consumption_item ON task_stock_consumption(item_id);
CREATE INDEX IF NOT EXISTS idx_task_stock_consumption_org ON task_stock_consumption(organization_id);

-- Add comments for documentation
COMMENT ON TABLE task_stock_consumption IS 'Links tasks to stock items for automatic inventory updates when tasks are completed';
COMMENT ON COLUMN task_stock_consumption.variant_id IS 'Product variant (if item has variants like different sizes)';
COMMENT ON COLUMN task_stock_consumption.item_id IS 'Base item reference';
COMMENT ON COLUMN task_stock_consumption.quantity_consumed IS 'Quantity of this item/variant consumed when task is completed';

-- Function to update stock when task is completed
CREATE OR REPLACE FUNCTION update_stock_on_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_consumed NUMERIC;
  v_current_quantity NUMERIC;
  v_variant_name TEXT;
  v_item_name TEXT;
BEGIN
  -- Only proceed if status changed to 'completed'
  IF OLD.status = 'completed' OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Update all stock consumption records for this task
  FOR consumption_record IN
    SELECT variant_id, item_id, quantity_consumed
    FROM task_stock_consumption
    WHERE task_id = NEW.id
  LOOP
    -- If variant_id is null (no variants), we could skip or handle at item level
    IF consumption_record.variant_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Get current quantity
    SELECT quantity, variant_name, item_name INTO v_current_quantity, v_variant_name, v_item_name
    FROM product_variants
    WHERE id = consumption_record.variant_id;

    -- If variant doesn't exist, log and continue
    IF NOT FOUND THEN
      RAISE LOG 'Variant % not found, skipping stock update', consumption_record.variant_id;
      CONTINUE;
    END IF;

    v_consumed := consumption_record.quantity_consumed;

    -- Check if sufficient stock
    IF v_current_quantity < v_consumed THEN
      RAISE EXCEPTION 'Insufficient stock for variant % (item: %). Required: %, Available: %',
        consumption_record.variant_id,
        v_item_name,
        v_consumed,
        v_current_quantity
      USING ERRCODE 'INSUFFICIENT_STOCK';
    END IF;

    -- Update variant quantity
    UPDATE product_variants
    SET quantity = quantity - v_consumed,
        updated_at = NOW()
    WHERE id = consumption_record.variant_id;

    -- Log the stock update
    RAISE LOG 'Stock updated for task %: variant % (item: %) deducted % units (remaining: %)',
      NEW.id,
      consumption_record.variant_id,
      v_item_name,
      v_consumed,
      v_current_quantity - v_consumed;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN INSUFFICIENT_STOCK THEN
    -- Re-raise with more context
    RAISE EXCEPTION 'Cannot complete task: Insufficient stock. Please check stock levels and try again.';
  WHEN OTHERS THEN
    -- Log error but don't fail the task update
    RAISE LOG 'Error updating stock for task %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update stock when task status changes to completed
CREATE TRIGGER task_stock_update_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_task_completion();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON task_stock_consumption TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE task_stock_consumption_id_seq TO authenticated;

-- Helper function to add stock consumption to a task
CREATE OR REPLACE FUNCTION add_task_stock_consumption(
  p_task_id UUID,
  p_variant_id UUID,
  p_item_id UUID,
  p_quantity NUMERIC,
  p_unit TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization_id from task
  SELECT organization_id INTO v_org_id
  FROM tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Insert or update consumption record
  INSERT INTO task_stock_consumption (
    organization_id,
    task_id,
    variant_id,
    item_id,
    quantity_consumed,
    unit,
    notes
  )
  VALUES (
    v_org_id,
    p_task_id,
    p_variant_id,
    p_item_id,
    p_quantity,
    p_unit,
    p_notes
  )
  ON CONFLICT (task_id, variant_id, item_id)
  DO UPDATE SET
    quantity_consumed = EXCLUDED.quantity_consumed + p_quantity,
    updated_at = NOW();

  RETURN (SELECT id FROM task_stock_consumption
          WHERE task_id = p_task_id
            AND variant_id = p_variant_id
            AND item_id = p_item_id);
END;
$$;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION add_task_stock_consumption TO authenticated;
