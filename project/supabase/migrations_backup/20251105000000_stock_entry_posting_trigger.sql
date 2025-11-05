-- Function to process stock entry posting
-- This creates stock movements and updates inventory when a stock entry is posted

CREATE OR REPLACE FUNCTION process_stock_entry_posting()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry_item RECORD;
  movement_type TEXT;
BEGIN
  -- Only process when status changes to 'Posted'
  IF NEW.status = 'Posted' AND (OLD.status IS NULL OR OLD.status != 'Posted') THEN

    -- Set posted timestamp
    NEW.posted_at = NOW();

    -- Determine movement type based on entry type
    CASE NEW.entry_type
      WHEN 'Material Receipt' THEN
        movement_type := 'IN';
      WHEN 'Material Issue' THEN
        movement_type := 'OUT';
      WHEN 'Stock Transfer' THEN
        movement_type := 'TRANSFER';
      WHEN 'Stock Reconciliation' THEN
        movement_type := 'RECONCILIATION';
      ELSE
        movement_type := 'OTHER';
    END CASE;

    -- Create stock movements for each item
    FOR entry_item IN
      SELECT * FROM stock_entry_items WHERE stock_entry_id = NEW.id
    LOOP
      -- For Material Receipt: add to target warehouse
      IF NEW.entry_type = 'Material Receipt' AND NEW.to_warehouse_id IS NOT NULL THEN
        INSERT INTO stock_movements (
          organization_id,
          item_id,
          warehouse_id,
          movement_type,
          movement_date,
          quantity,
          unit,
          balance_quantity,
          cost_per_unit,
          total_cost,
          stock_entry_id,
          stock_entry_item_id,
          batch_number,
          serial_number
        ) VALUES (
          NEW.organization_id,
          entry_item.item_id,
          NEW.to_warehouse_id,
          'IN',
          NEW.entry_date,
          entry_item.quantity,
          entry_item.unit,
          entry_item.quantity, -- balance_quantity starts same as quantity
          entry_item.cost_per_unit,
          entry_item.quantity * COALESCE(entry_item.cost_per_unit, 0),
          NEW.id,
          entry_item.id,
          entry_item.batch_number,
          entry_item.serial_number
        );

        -- Add to stock valuation
        INSERT INTO stock_valuation (
          organization_id,
          item_id,
          warehouse_id,
          quantity,
          cost_per_unit,
          stock_entry_id,
          batch_number,
          serial_number,
          remaining_quantity
        ) VALUES (
          NEW.organization_id,
          entry_item.item_id,
          NEW.to_warehouse_id,
          entry_item.quantity,
          COALESCE(entry_item.cost_per_unit, 0),
          NEW.id,
          entry_item.batch_number,
          entry_item.serial_number,
          entry_item.quantity
        );
      END IF;

      -- For Material Issue: remove from source warehouse
      IF NEW.entry_type = 'Material Issue' AND NEW.from_warehouse_id IS NOT NULL THEN
        INSERT INTO stock_movements (
          organization_id,
          item_id,
          warehouse_id,
          movement_type,
          movement_date,
          quantity,
          unit,
          balance_quantity,
          cost_per_unit,
          total_cost,
          stock_entry_id,
          stock_entry_item_id,
          batch_number,
          serial_number
        ) VALUES (
          NEW.organization_id,
          entry_item.item_id,
          NEW.from_warehouse_id,
          'OUT',
          NEW.entry_date,
          -entry_item.quantity, -- Negative for OUT movement
          entry_item.unit,
          -entry_item.quantity, -- balance_quantity is negative for OUT
          entry_item.cost_per_unit,
          -entry_item.quantity * COALESCE(entry_item.cost_per_unit, 0),
          NEW.id,
          entry_item.id,
          entry_item.batch_number,
          entry_item.serial_number
        );

        -- TODO: Consume from stock valuation (FIFO/LIFO logic)
      END IF;

      -- For Stock Transfer: OUT from source, IN to target
      IF NEW.entry_type = 'Stock Transfer' AND NEW.from_warehouse_id IS NOT NULL AND NEW.to_warehouse_id IS NOT NULL THEN
        -- OUT from source
        INSERT INTO stock_movements (
          organization_id,
          item_id,
          warehouse_id,
          movement_type,
          movement_date,
          quantity,
          unit,
          balance_quantity,
          cost_per_unit,
          total_cost,
          stock_entry_id,
          stock_entry_item_id,
          batch_number,
          serial_number
        ) VALUES (
          NEW.organization_id,
          entry_item.item_id,
          NEW.from_warehouse_id,
          'TRANSFER',
          NEW.entry_date,
          -entry_item.quantity,
          entry_item.unit,
          -entry_item.quantity,
          entry_item.cost_per_unit,
          -entry_item.quantity * COALESCE(entry_item.cost_per_unit, 0),
          NEW.id,
          entry_item.id,
          entry_item.batch_number,
          entry_item.serial_number
        );

        -- IN to target
        INSERT INTO stock_movements (
          organization_id,
          item_id,
          warehouse_id,
          movement_type,
          movement_date,
          quantity,
          unit,
          balance_quantity,
          cost_per_unit,
          total_cost,
          stock_entry_id,
          stock_entry_item_id,
          batch_number,
          serial_number
        ) VALUES (
          NEW.organization_id,
          entry_item.item_id,
          NEW.to_warehouse_id,
          'TRANSFER',
          NEW.entry_date,
          entry_item.quantity,
          entry_item.unit,
          entry_item.quantity,
          entry_item.cost_per_unit,
          entry_item.quantity * COALESCE(entry_item.cost_per_unit, 0),
          NEW.id,
          entry_item.id,
          entry_item.batch_number,
          entry_item.serial_number
        );
      END IF;

    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on stock_entries
DROP TRIGGER IF EXISTS stock_entry_posting_trigger ON stock_entries;

CREATE TRIGGER stock_entry_posting_trigger
  BEFORE UPDATE ON stock_entries
  FOR EACH ROW
  EXECUTE FUNCTION process_stock_entry_posting();

-- Add comment
COMMENT ON FUNCTION process_stock_entry_posting() IS
  'Automatically creates stock movements and updates inventory when a stock entry is posted';
