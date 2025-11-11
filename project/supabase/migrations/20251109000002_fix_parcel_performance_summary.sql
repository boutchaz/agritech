-- Fix column names in get_parcel_performance_summary function
-- Issue: Function references p.parcel_name, f.farm_name, p.area_hectares
-- Actual columns are: p.name, f.name, p.area (or p.calculated_area)

CREATE OR REPLACE FUNCTION get_parcel_performance_summary(
  p_organization_id UUID,
  p_farm_id UUID DEFAULT NULL,
  p_parcel_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
  parcel_id UUID,
  parcel_name TEXT,
  farm_name TEXT,
  crop_type TEXT,
  total_harvests BIGINT,
  avg_yield_per_hectare NUMERIC,
  avg_target_yield NUMERIC,
  avg_variance_percent NUMERIC,
  performance_rating TEXT,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  total_profit NUMERIC,
  avg_profit_margin NUMERIC,
  last_harvest_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH harvest_stats AS (
    SELECT
      hr.parcel_id,
      p.name as parcel_name,
      f.name as farm_name,
      hr.crop_type,
      COUNT(*) as total_harvests,
      AVG(CASE
        WHEN COALESCE(p.calculated_area, p.area, 0) > 0 THEN hr.actual_yield / COALESCE(p.calculated_area, p.area)
        ELSE NULL
      END) as avg_yield_per_hectare,
      AVG(hr.estimated_yield) as avg_target_yield,
      AVG(CASE
        WHEN hr.estimated_yield > 0
        THEN ((hr.actual_yield - hr.estimated_yield) / hr.estimated_yield * 100)
        ELSE NULL
      END) as avg_variance_percent,
      SUM(COALESCE(hr.revenue_amount, 0)) as total_revenue,
      SUM(COALESCE(hr.cost_amount, 0)) as total_cost,
      SUM(COALESCE(hr.profit_amount, 0)) as total_profit,
      MAX(hr.harvest_date) as last_harvest_date
    FROM harvest_records hr
    JOIN parcels p ON hr.parcel_id = p.id
    JOIN farms f ON p.farm_id = f.id
    WHERE hr.organization_id = p_organization_id
      AND (p_farm_id IS NULL OR p.farm_id = p_farm_id)
      AND (p_parcel_id IS NULL OR hr.parcel_id = p_parcel_id)
      AND (p_from_date IS NULL OR hr.harvest_date >= p_from_date)
      AND (p_to_date IS NULL OR hr.harvest_date <= p_to_date)
    GROUP BY hr.parcel_id, p.name, f.name, hr.crop_type
  )
  SELECT
    hs.parcel_id,
    hs.parcel_name,
    hs.farm_name,
    hs.crop_type,
    hs.total_harvests,
    hs.avg_yield_per_hectare,
    hs.avg_target_yield,
    hs.avg_variance_percent,
    CASE
      WHEN hs.avg_variance_percent >= 10 THEN 'Excellent'
      WHEN hs.avg_variance_percent >= 0 THEN 'Good'
      WHEN hs.avg_variance_percent >= -10 THEN 'Fair'
      ELSE 'Poor'
    END as performance_rating,
    hs.total_revenue,
    hs.total_cost,
    hs.total_profit,
    CASE
      WHEN hs.total_revenue > 0
      THEN (hs.total_profit / hs.total_revenue * 100)
      ELSE 0
    END as avg_profit_margin,
    hs.last_harvest_date
  FROM harvest_stats hs
  ORDER BY hs.parcel_name, hs.crop_type;
END;
$$;

GRANT EXECUTE ON FUNCTION get_parcel_performance_summary(UUID, UUID, UUID, DATE, DATE) TO authenticated;
COMMENT ON FUNCTION get_parcel_performance_summary IS 'Aggregates harvest performance data by parcel for analytics and reporting. Returns yield, financial metrics, and performance ratings. FIXED: Uses correct column names (p.name, f.name, p.calculated_area/p.area).';
