-- Data Reconciliation Script
-- Validates that stock_movements balances match stock_valuation remaining quantities
-- Reference: TECHNICAL_DEBT.md Issue #2

-- Step 1: Compare movements vs valuations and identify discrepancies
WITH movement_summary AS (
  SELECT
    organization_id,
    item_id,
    warehouse_id,
    SUM(CASE WHEN movement_type = 'IN' THEN quantity
             WHEN movement_type = 'OUT' THEN quantity
             WHEN movement_type = 'TRANSFER' THEN quantity
             ELSE 0 END) as net_quantity
  FROM stock_movements
  GROUP BY organization_id, item_id, warehouse_id
),
valuation_summary AS (
  SELECT
    organization_id,
    item_id,
    warehouse_id,
    SUM(remaining_quantity) as total_remaining,
    COUNT(*) as batch_count,
    SUM(remaining_quantity * cost_per_unit) as total_value
  FROM stock_valuation
  GROUP BY organization_id, item_id, warehouse_id
),
discrepancy_report AS (
  SELECT
    COALESCE(m.organization_id, v.organization_id) as organization_id,
    COALESCE(m.item_id, v.item_id) as item_id,
    COALESCE(m.warehouse_id, v.warehouse_id) as warehouse_id,
    COALESCE(m.net_quantity, 0) as movement_balance,
    COALESCE(v.total_remaining, 0) as valuation_balance,
    COALESCE(v.batch_count, 0) as valuation_batches,
    COALESCE(v.total_value, 0) as valuation_total_value,
    (COALESCE(m.net_quantity, 0) - COALESCE(v.total_remaining, 0)) as discrepancy
  FROM movement_summary m
  FULL OUTER JOIN valuation_summary v
    ON m.organization_id = v.organization_id
    AND m.item_id = v.item_id
    AND m.warehouse_id = v.warehouse_id
  WHERE ABS(COALESCE(m.net_quantity, 0) - COALESCE(v.total_remaining, 0)) > 0.001
)
SELECT
  d.*,
  i.item_code,
  i.item_name,
  w.name as warehouse_name,
  CASE
    WHEN d.discrepancy > 0 THEN 'Movements > Valuations (Missing valuation entries)'
    WHEN d.discrepancy < 0 THEN 'Valuations > Movements (Over-valued inventory)'
    ELSE 'Balanced'
  END as status,
  CASE
    WHEN d.discrepancy > 0 THEN 'Need to create valuation entries for ' || ABS(d.discrepancy) || ' units'
    WHEN d.discrepancy < 0 THEN 'Need to consume/adjust valuation by ' || ABS(d.discrepancy) || ' units'
    ELSE 'No action needed'
  END as recommended_action
FROM discrepancy_report d
LEFT JOIN items i ON d.item_id = i.id
LEFT JOIN warehouses w ON d.warehouse_id = w.id
ORDER BY ABS(d.discrepancy) DESC, d.organization_id, d.item_id;

-- Step 2: Summary statistics
SELECT
  COUNT(*) as total_discrepancies,
  SUM(CASE WHEN discrepancy > 0 THEN 1 ELSE 0 END) as missing_valuations,
  SUM(CASE WHEN discrepancy < 0 THEN 1 ELSE 0 END) as over_valuations,
  SUM(ABS(discrepancy)) as total_units_discrepancy
FROM (
  SELECT
    COALESCE(m.organization_id, v.organization_id) as organization_id,
    COALESCE(m.item_id, v.item_id) as item_id,
    COALESCE(m.warehouse_id, v.warehouse_id) as warehouse_id,
    (COALESCE(m.net_quantity, 0) - COALESCE(v.total_remaining, 0)) as discrepancy
  FROM (
    SELECT organization_id, item_id, warehouse_id, SUM(quantity) as net_quantity
    FROM stock_movements
    GROUP BY organization_id, item_id, warehouse_id
  ) m
  FULL OUTER JOIN (
    SELECT organization_id, item_id, warehouse_id, SUM(remaining_quantity) as total_remaining
    FROM stock_valuation
    GROUP BY organization_id, item_id, warehouse_id
  ) v ON m.organization_id = v.organization_id AND m.item_id = v.item_id AND m.warehouse_id = v.warehouse_id
  WHERE ABS(COALESCE(m.net_quantity, 0) - COALESCE(v.total_remaining, 0)) > 0.001
) discrepancies;

-- Step 3: Detailed analysis by organization
SELECT
  o.name as organization,
  COUNT(DISTINCT d.item_id) as affected_items,
  COUNT(DISTINCT d.warehouse_id) as affected_warehouses,
  SUM(CASE WHEN d.discrepancy > 0 THEN ABS(d.discrepancy) ELSE 0 END) as missing_valuation_units,
  SUM(CASE WHEN d.discrepancy < 0 THEN ABS(d.discrepancy) ELSE 0 END) as over_valuation_units
FROM (
  SELECT
    COALESCE(m.organization_id, v.organization_id) as organization_id,
    COALESCE(m.item_id, v.item_id) as item_id,
    COALESCE(m.warehouse_id, v.warehouse_id) as warehouse_id,
    (COALESCE(m.net_quantity, 0) - COALESCE(v.total_remaining, 0)) as discrepancy
  FROM (
    SELECT organization_id, item_id, warehouse_id, SUM(quantity) as net_quantity
    FROM stock_movements
    GROUP BY organization_id, item_id, warehouse_id
  ) m
  FULL OUTER JOIN (
    SELECT organization_id, item_id, warehouse_id, SUM(remaining_quantity) as total_remaining
    FROM stock_valuation
    GROUP BY organization_id, item_id, warehouse_id
  ) v ON m.organization_id = v.organization_id AND m.item_id = v.item_id AND m.warehouse_id = v.warehouse_id
  WHERE ABS(COALESCE(m.net_quantity, 0) - COALESCE(v.total_remaining, 0)) > 0.001
) d
LEFT JOIN organizations o ON d.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY missing_valuation_units + over_valuation_units DESC;

-- Optional Step 4: Create adjustment entries (COMMENTED OUT - Review before executing)
-- WARNING: This will create reconciliation entries to fix discrepancies
-- Only run after reviewing the discrepancy report above

/*
DO $$
DECLARE
  rec RECORD;
  new_entry_id UUID;
  new_entry_number TEXT;
BEGIN
  FOR rec IN (
    SELECT
      COALESCE(m.organization_id, v.organization_id) as organization_id,
      COALESCE(m.item_id, v.item_id) as item_id,
      COALESCE(m.warehouse_id, v.warehouse_id) as warehouse_id,
      COALESCE(m.net_quantity, 0) as movement_balance,
      COALESCE(v.total_remaining, 0) as valuation_balance,
      (COALESCE(m.net_quantity, 0) - COALESCE(v.total_remaining, 0)) as discrepancy
    FROM movement_summary m
    FULL OUTER JOIN valuation_summary v
      ON m.organization_id = v.organization_id
      AND m.item_id = v.item_id
      AND m.warehouse_id = v.warehouse_id
    WHERE ABS(COALESCE(m.net_quantity, 0) - COALESCE(v.total_remaining, 0)) > 0.001
  ) LOOP
    -- Generate entry number
    SELECT generate_stock_entry_number(rec.organization_id) INTO new_entry_number;

    -- Create stock entry for reconciliation
    INSERT INTO stock_entries (
      organization_id, entry_type, entry_number, entry_date,
      to_warehouse_id, purpose, notes, status, posted_at, created_by
    ) VALUES (
      rec.organization_id,
      'Stock Reconciliation',
      new_entry_number,
      CURRENT_DATE,
      rec.warehouse_id,
      'Data Reconciliation - Automated',
      'Automated reconciliation to align movements with valuations. Discrepancy: ' || rec.discrepancy,
      'Posted',
      NOW(),
      '00000000-0000-0000-0000-000000000000' -- System user
    ) RETURNING id INTO new_entry_id;

    -- Create stock entry item
    INSERT INTO stock_entry_items (
      stock_entry_id, line_number, item_id, quantity, unit,
      system_quantity, physical_quantity, notes
    ) VALUES (
      new_entry_id,
      1,
      rec.item_id,
      ABS(rec.discrepancy),
      'units',
      rec.valuation_balance,
      rec.movement_balance,
      'Auto-reconciliation'
    );

    RAISE NOTICE 'Created reconciliation entry % for item % with discrepancy %',
      new_entry_number, rec.item_id, rec.discrepancy;
  END LOOP;
END $$;
*/
