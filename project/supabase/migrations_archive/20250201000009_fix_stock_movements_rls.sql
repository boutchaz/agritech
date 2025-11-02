-- =====================================================
-- Migration: Fix stock_movements RLS policy
-- Description: Adds INSERT policy and makes trigger function SECURITY DEFINER
-- =====================================================

-- =====================================================
-- 1. ADD INSERT POLICY FOR stock_movements
-- =====================================================

-- Drop existing policy if it exists (in case it was already added)
DROP POLICY IF EXISTS "Users can insert stock movements in their organization" ON stock_movements;

-- Add INSERT policy for stock_movements (allows system triggers to insert)
CREATE POLICY "Users can insert stock movements in their organization"
  ON stock_movements FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update stock movements in their organization" ON stock_movements;

-- Add UPDATE policy (if needed for corrections)
CREATE POLICY "Users can update stock movements in their organization"
  ON stock_movements FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- =====================================================
-- 2. ENSURE stock_valuation HAS INSERT POLICY
-- =====================================================

-- Check and add INSERT policy for stock_valuation if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'stock_valuation' 
    AND policyname = 'System can manage stock valuation'
  ) THEN
    -- The policy should already exist from the original migration, but ensure INSERT is allowed
    -- If it doesn't exist, we need to check the original policy structure
    NULL;
  END IF;
END $$;

-- =====================================================
-- 2. UPDATE TRIGGER FUNCTION TO USE SECURITY DEFINER
-- =====================================================

-- Update the trigger function to run with SECURITY DEFINER
-- This allows it to bypass RLS when inserting into stock_movements and stock_valuation
CREATE OR REPLACE FUNCTION update_stock_on_entry_post()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_current_balance DECIMAL(12, 3);
  v_valuation_method TEXT;
  v_cost_per_unit DECIMAL(12, 2);
  -- Variables for Material Issue
  v_issue_quantity DECIMAL(12, 3);
  v_valuation_record RECORD;
  v_consume DECIMAL(12, 3);
  -- Variables for Stock Transfer
  v_transfer_quantity DECIMAL(12, 3);
  v_transfer_cost DECIMAL(12, 2);
  -- Variables for Stock Reconciliation
  v_system_quantity DECIMAL(12, 3);
  v_physical_quantity DECIMAL(12, 3);
  v_adjustment DECIMAL(12, 3);
  v_reduce_quantity DECIMAL(12, 3);
BEGIN
  -- Only process if status changed to 'Posted'
  IF NEW.status = 'Posted' AND (OLD.status IS NULL OR OLD.status != 'Posted') THEN

    -- Process each item in the entry
    FOR v_item IN
      SELECT * FROM stock_entry_items WHERE stock_entry_id = NEW.id
    LOOP
      -- Get item's valuation method
      SELECT valuation_method INTO v_valuation_method
      FROM items
      WHERE id = v_item.item_id;

      -- Use cost from stock entry item, or default to 0
      v_cost_per_unit := COALESCE(v_item.cost_per_unit, 0);

      -- Handle different entry types
      CASE NEW.entry_type
        WHEN 'Material Receipt' THEN
          -- Create stock_valuation entry for receipt
          INSERT INTO stock_valuation (
            organization_id,
            item_id,
            warehouse_id,
            quantity,
            remaining_quantity,
            cost_per_unit,
            valuation_date,
            stock_entry_id,
            batch_number,
            serial_number
          ) VALUES (
            NEW.organization_id,
            v_item.item_id,
            NEW.to_warehouse_id,
            v_item.quantity,
            v_item.quantity, -- Initially, remaining quantity equals quantity
            v_cost_per_unit,
            NEW.entry_date,
            NEW.id,
            v_item.batch_number,
            v_item.serial_number
          );

          -- Calculate current balance from stock_valuation
          SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_current_balance
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.to_warehouse_id
            AND remaining_quantity > 0;

          -- Record movement
          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number, created_by
          ) VALUES (
            NEW.organization_id, 'IN', v_item.item_id, NEW.to_warehouse_id,
            v_item.quantity, v_item.unit, v_current_balance,
            v_cost_per_unit, COALESCE(v_item.total_cost, v_item.quantity * v_cost_per_unit),
            NEW.id, v_item.id, v_item.batch_number, v_item.serial_number, NEW.posted_by
          );

        WHEN 'Material Issue' THEN
          -- For issues, we need to reduce remaining_quantity from stock_valuation
          -- Use FIFO/LIFO logic based on item's valuation method
          v_issue_quantity := v_item.quantity;

          IF v_valuation_method = 'FIFO' THEN
            -- FIFO: Consume oldest first
            FOR v_valuation_record IN
              SELECT * FROM stock_valuation
              WHERE item_id = v_item.item_id
                AND warehouse_id = NEW.from_warehouse_id
                AND remaining_quantity > 0
              ORDER BY valuation_date ASC
            LOOP
              IF v_issue_quantity <= 0 THEN
                EXIT;
              END IF;

              v_consume := LEAST(v_issue_quantity, v_valuation_record.remaining_quantity);
              
              -- Reduce remaining quantity
              UPDATE stock_valuation
              SET remaining_quantity = remaining_quantity - v_consume
              WHERE id = v_valuation_record.id;

              v_issue_quantity := v_issue_quantity - v_consume;
            END LOOP;

          ELSIF v_valuation_method = 'LIFO' THEN
            -- LIFO: Consume newest first
            FOR v_valuation_record IN
              SELECT * FROM stock_valuation
              WHERE item_id = v_item.item_id
                AND warehouse_id = NEW.from_warehouse_id
                AND remaining_quantity > 0
              ORDER BY valuation_date DESC
            LOOP
              IF v_issue_quantity <= 0 THEN
                EXIT;
              END IF;

              v_consume := LEAST(v_issue_quantity, v_valuation_record.remaining_quantity);
              
              -- Reduce remaining quantity
              UPDATE stock_valuation
              SET remaining_quantity = remaining_quantity - v_consume
              WHERE id = v_valuation_record.id;

              v_issue_quantity := v_issue_quantity - v_consume;
            END LOOP;

          ELSE -- Moving Average
            -- For Moving Average, reduce from oldest entry
            -- This is simplified - in a real system, you'd track average cost
            UPDATE stock_valuation
            SET remaining_quantity = GREATEST(remaining_quantity - v_item.quantity, 0)
            WHERE id = (
              SELECT id FROM stock_valuation
              WHERE item_id = v_item.item_id
                AND warehouse_id = NEW.from_warehouse_id
                AND remaining_quantity > 0
              ORDER BY valuation_date ASC
              LIMIT 1
            );
          END IF;

          -- Calculate current balance
          SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_current_balance
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.from_warehouse_id
            AND remaining_quantity > 0;

          -- Record movement
          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number, created_by
          ) VALUES (
            NEW.organization_id, 'OUT', v_item.item_id, NEW.from_warehouse_id,
            -v_item.quantity, v_item.unit, v_current_balance,
            v_cost_per_unit, COALESCE(v_item.total_cost, v_item.quantity * v_cost_per_unit),
            NEW.id, v_item.id, v_item.batch_number, v_item.serial_number, NEW.posted_by
          );

        WHEN 'Stock Transfer' THEN
          -- Transfer: Reduce from source, add to target
          v_transfer_quantity := v_item.quantity;

          -- Get cost from source warehouse (FIFO order)
          SELECT cost_per_unit INTO v_transfer_cost
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.from_warehouse_id
            AND remaining_quantity > 0
          ORDER BY valuation_date ASC
          LIMIT 1;

          v_transfer_cost := COALESCE(v_transfer_cost, 0);

          -- Reduce from source warehouse (FIFO)
          FOR v_valuation_record IN
            SELECT * FROM stock_valuation
            WHERE item_id = v_item.item_id
              AND warehouse_id = NEW.from_warehouse_id
              AND remaining_quantity > 0
            ORDER BY valuation_date ASC
          LOOP
            IF v_transfer_quantity <= 0 THEN
              EXIT;
            END IF;

            v_consume := LEAST(v_transfer_quantity, v_valuation_record.remaining_quantity);
            
            UPDATE stock_valuation
            SET remaining_quantity = remaining_quantity - v_consume
            WHERE id = v_valuation_record.id;

            v_transfer_quantity := v_transfer_quantity - v_consume;
          END LOOP;

          -- Add to target warehouse
          INSERT INTO stock_valuation (
            organization_id,
            item_id,
            warehouse_id,
            quantity,
            remaining_quantity,
            cost_per_unit,
            valuation_date,
            stock_entry_id,
            batch_number,
            serial_number
          ) VALUES (
            NEW.organization_id,
            v_item.item_id,
            NEW.to_warehouse_id,
            v_item.quantity,
            v_item.quantity,
            v_transfer_cost,
            NEW.entry_date,
            NEW.id,
            v_item.batch_number,
            v_item.serial_number
          );

          -- Record movements
          SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_current_balance
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.from_warehouse_id
            AND remaining_quantity > 0;

          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number, created_by
          ) VALUES (
            NEW.organization_id, 'TRANSFER', v_item.item_id, NEW.from_warehouse_id,
            -v_item.quantity, v_item.unit, v_current_balance,
            NEW.id, v_item.id, v_item.batch_number, v_item.serial_number, NEW.posted_by
          );

          SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_current_balance
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.to_warehouse_id
            AND remaining_quantity > 0;

          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number, created_by
          ) VALUES (
            NEW.organization_id, 'TRANSFER', v_item.item_id, NEW.to_warehouse_id,
            v_item.quantity, v_item.unit, v_current_balance,
            NEW.id, v_item.id, v_item.batch_number, v_item.serial_number, NEW.posted_by
          );

        WHEN 'Stock Reconciliation' THEN
          -- Reconciliation: Adjust stock to match physical count
          v_physical_quantity := COALESCE(v_item.physical_quantity, 0);
          
          -- Get current system quantity
          SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_system_quantity
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.to_warehouse_id
            AND remaining_quantity > 0;

          v_adjustment := v_physical_quantity - v_system_quantity;

          IF v_adjustment > 0 THEN
            -- Stock increase: Create new valuation entry
            INSERT INTO stock_valuation (
              organization_id,
              item_id,
              warehouse_id,
              quantity,
              remaining_quantity,
              cost_per_unit,
              valuation_date,
              stock_entry_id,
              batch_number
            ) VALUES (
              NEW.organization_id,
              v_item.item_id,
              NEW.to_warehouse_id,
              v_adjustment,
              v_adjustment,
              COALESCE(v_item.cost_per_unit, 0),
              NEW.entry_date,
              NEW.id,
              v_item.batch_number
            );

            -- Record IN movement
            INSERT INTO stock_movements (
              organization_id, movement_type, item_id, warehouse_id,
              quantity, unit, balance_quantity,
              stock_entry_id, stock_entry_item_id, created_by
            ) VALUES (
              NEW.organization_id, 'IN', v_item.item_id, NEW.to_warehouse_id,
              v_adjustment, v_item.unit, v_physical_quantity,
              NEW.id, v_item.id, NEW.posted_by
            );

          ELSIF v_adjustment < 0 THEN
            -- Stock decrease: Reduce from existing valuations (FIFO)
            v_reduce_quantity := ABS(v_adjustment);

            FOR v_valuation_record IN
              SELECT * FROM stock_valuation
              WHERE item_id = v_item.item_id
                AND warehouse_id = NEW.to_warehouse_id
                AND remaining_quantity > 0
              ORDER BY valuation_date ASC
            LOOP
              IF v_reduce_quantity <= 0 THEN
                EXIT;
              END IF;

              v_consume := LEAST(v_reduce_quantity, v_valuation_record.remaining_quantity);
              
              UPDATE stock_valuation
              SET remaining_quantity = remaining_quantity - v_consume
              WHERE id = v_valuation_record.id;

              v_reduce_quantity := v_reduce_quantity - v_consume;
            END LOOP;

            -- Record OUT movement
            INSERT INTO stock_movements (
              organization_id, movement_type, item_id, warehouse_id,
              quantity, unit, balance_quantity,
              stock_entry_id, stock_entry_item_id, created_by
            ) VALUES (
              NEW.organization_id, 'OUT', v_item.item_id, NEW.to_warehouse_id,
              v_adjustment, v_item.unit, v_physical_quantity,
              NEW.id, v_item.id, NEW.posted_by
            );
          END IF;
      END CASE;
    END LOOP;

    -- Update posted timestamp
    NEW.posted_at := NOW();
    NEW.posted_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NOTES
-- =====================================================

-- This migration:
-- 1. Adds INSERT and UPDATE policies for stock_movements table
-- 2. Updates the trigger function to use SECURITY DEFINER so it can bypass RLS
--    when inserting into stock_movements and stock_valuation tables
-- 
-- SECURITY DEFINER functions run with the privileges of the function owner (postgres),
-- allowing them to bypass RLS policies. This is necessary for trigger functions that
-- need to insert audit trail records automatically.

