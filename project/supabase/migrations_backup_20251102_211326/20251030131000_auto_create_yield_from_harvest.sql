-- ============================================================================
-- Migration: Auto-create yield history from harvests
-- ============================================================================
-- Purpose: Automatically populate yield_history when a harvest is recorded
-- ============================================================================

-- Function to auto-create yield history from harvest
CREATE OR REPLACE FUNCTION auto_create_yield_from_harvest()
RETURNS TRIGGER AS $$
DECLARE
  v_parcel RECORD;
  v_benchmark RECORD;
  v_currency TEXT;
BEGIN
  -- Get parcel details
  SELECT p.*, f.organization_id, f.id as farm_id
  INTO v_parcel
  FROM parcels p
  JOIN farms f ON p.farm_id = f.id
  WHERE p.id = NEW.parcel_id;

  -- Get organization currency
  SELECT currency INTO v_currency
  FROM organizations
  WHERE id = v_parcel.organization_id;

  -- Get active benchmark for this crop if exists
  SELECT * INTO v_benchmark
  FROM yield_benchmarks
  WHERE organization_id = v_parcel.organization_id
    AND crop_type = NEW.crop_type
    AND is_active = true
    AND (parcel_id IS NULL OR parcel_id = NEW.parcel_id)
    AND (farm_id IS NULL OR farm_id = v_parcel.farm_id)
  ORDER BY
    CASE
      WHEN parcel_id = NEW.parcel_id THEN 1
      WHEN farm_id = v_parcel.farm_id THEN 2
      ELSE 3
    END
  LIMIT 1;

  -- Create yield history record
  INSERT INTO yield_history (
    organization_id,
    farm_id,
    parcel_id,
    harvest_id,
    crop_type,
    variety,
    harvest_date,
    harvest_season,
    actual_yield_quantity,
    actual_yield_per_hectare,
    unit_of_measure,
    quality_grade,
    target_yield_quantity,
    target_yield_per_hectare,
    revenue_amount,
    cost_amount,
    profit_amount,
    price_per_unit,
    currency_code,
    notes
  ) VALUES (
    v_parcel.organization_id,
    v_parcel.farm_id,
    NEW.parcel_id,
    NEW.id,
    NEW.crop_type,
    NEW.variety,
    NEW.harvest_date,
    CASE
      WHEN EXTRACT(MONTH FROM NEW.harvest_date) IN (3, 4, 5) THEN 'Spring ' || EXTRACT(YEAR FROM NEW.harvest_date)
      WHEN EXTRACT(MONTH FROM NEW.harvest_date) IN (6, 7, 8) THEN 'Summer ' || EXTRACT(YEAR FROM NEW.harvest_date)
      WHEN EXTRACT(MONTH FROM NEW.harvest_date) IN (9, 10, 11) THEN 'Fall ' || EXTRACT(YEAR FROM NEW.harvest_date)
      ELSE 'Winter ' || EXTRACT(YEAR FROM NEW.harvest_date)
    END,
    NEW.quantity,
    CASE
      WHEN v_parcel.area > 0 THEN NEW.quantity / v_parcel.area
      ELSE NULL
    END,
    COALESCE(NEW.unit_of_measure, 'kg'),
    NEW.quality,
    -- Use benchmark if available
    CASE
      WHEN v_benchmark.id IS NOT NULL AND v_parcel.area > 0
      THEN v_benchmark.target_yield_per_hectare * v_parcel.area
      ELSE NULL
    END,
    v_benchmark.target_yield_per_hectare,
    -- Financial data from harvest
    NEW.revenue,
    NEW.total_cost,
    COALESCE(NEW.revenue, 0) - COALESCE(NEW.total_cost, 0),
    CASE
      WHEN NEW.quantity > 0 THEN NEW.revenue / NEW.quantity
      ELSE NULL
    END,
    COALESCE(v_currency, 'MAD'),
    'Auto-created from harvest #' || NEW.id
  );

  -- Check if yield is underperforming and create alert
  IF v_benchmark.id IS NOT NULL THEN
    DECLARE
      v_yield_per_ha NUMERIC;
      v_variance_percent NUMERIC;
    BEGIN
      -- Calculate yield per hectare
      v_yield_per_ha := CASE
        WHEN v_parcel.area > 0 THEN NEW.quantity / v_parcel.area
        ELSE 0
      END;

      -- Calculate variance
      IF v_benchmark.target_yield_per_hectare > 0 THEN
        v_variance_percent := ((v_yield_per_ha - v_benchmark.target_yield_per_hectare)
                               / v_benchmark.target_yield_per_hectare * 100);

        -- Create alert if underperforming (below -20%)
        IF v_variance_percent < -20 THEN
          INSERT INTO performance_alerts (
            organization_id,
            farm_id,
            parcel_id,
            alert_type,
            severity,
            title,
            message,
            harvest_id,
            metric_name,
            actual_value,
            target_value,
            variance_percent,
            status
          ) VALUES (
            v_parcel.organization_id,
            v_parcel.farm_id,
            NEW.parcel_id,
            'underperforming_yield',
            CASE
              WHEN v_variance_percent < -35 THEN 'critical'
              ELSE 'warning'
            END,
            'Underperforming Parcel: ' || v_parcel.name,
            'Parcel "' || v_parcel.name || '" yielded ' || v_yield_per_ha::TEXT || ' kg/ha, ' ||
            ABS(v_variance_percent)::TEXT || '% below target of ' ||
            v_benchmark.target_yield_per_hectare::TEXT || ' kg/ha for ' || NEW.crop_type || '.',
            NEW.id,
            'yield_per_hectare',
            v_yield_per_ha,
            v_benchmark.target_yield_per_hectare,
            v_variance_percent,
            'active'
          );
        END IF;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create yield history from harvests
DROP TRIGGER IF EXISTS trigger_auto_create_yield_from_harvest ON public.harvests;

CREATE TRIGGER trigger_auto_create_yield_from_harvest
  AFTER INSERT ON public.harvests
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_yield_from_harvest();

-- Backfill: Create yield history for existing harvests
DO $$
DECLARE
  v_harvest RECORD;
BEGIN
  FOR v_harvest IN
    SELECT * FROM harvests
    WHERE NOT EXISTS (
      SELECT 1 FROM yield_history WHERE harvest_id = harvests.id
    )
  LOOP
    -- Temporarily disable trigger to avoid recursion
    ALTER TABLE harvests DISABLE TRIGGER trigger_auto_create_yield_from_harvest;

    -- Manually call the function
    PERFORM auto_create_yield_from_harvest() FROM harvests WHERE id = v_harvest.id;

    -- Re-enable trigger
    ALTER TABLE harvests ENABLE TRIGGER trigger_auto_create_yield_from_harvest;
  END LOOP;
END $$;

COMMENT ON FUNCTION auto_create_yield_from_harvest() IS
  'Automatically creates yield_history and performance_alerts when a harvest is recorded';
