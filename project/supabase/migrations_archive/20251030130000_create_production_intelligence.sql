-- ============================================================================
-- Migration: Production Intelligence System
-- ============================================================================
-- Purpose: Add yield history, forecasts, benchmarks, and performance tracking
-- ============================================================================

-- ============================================================================
-- 1. Yield History Table (Actual Historical Performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.yield_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  harvest_id UUID REFERENCES public.harvests(id) ON DELETE SET NULL,

  -- Crop information
  crop_type TEXT NOT NULL,
  variety TEXT,

  -- Yield data
  harvest_date DATE NOT NULL,
  harvest_season TEXT, -- e.g., "Spring 2024", "Fall 2024"
  actual_yield_quantity NUMERIC(12, 2) NOT NULL, -- kg or tons
  actual_yield_per_hectare NUMERIC(12, 2), -- kg/ha or tons/ha
  unit_of_measure TEXT DEFAULT 'kg',
  quality_grade TEXT, -- e.g., "A", "B", "C", "Premium", "Standard"

  -- Performance metrics
  target_yield_quantity NUMERIC(12, 2), -- What was expected
  target_yield_per_hectare NUMERIC(12, 2),
  yield_variance_percent NUMERIC(5, 2), -- (actual - target) / target * 100
  performance_rating TEXT, -- "excellent", "good", "average", "below_average", "poor"

  -- Financial data
  revenue_amount NUMERIC(12, 2),
  cost_amount NUMERIC(12, 2),
  profit_amount NUMERIC(12, 2),
  profit_margin_percent NUMERIC(5, 2),
  price_per_unit NUMERIC(12, 2), -- Price per kg/ton
  currency_code TEXT DEFAULT 'MAD' REFERENCES public.currencies(code),

  -- Growing conditions (for analysis)
  growing_days INTEGER, -- Days from planting to harvest
  weather_conditions JSONB, -- Temperature, rainfall, etc.
  soil_conditions JSONB, -- pH, nutrients at time of harvest
  irrigation_total_m3 NUMERIC(12, 2), -- Total water used

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for yield history
CREATE INDEX idx_yield_history_org ON public.yield_history(organization_id);
CREATE INDEX idx_yield_history_farm ON public.yield_history(farm_id);
CREATE INDEX idx_yield_history_parcel ON public.yield_history(parcel_id);
CREATE INDEX idx_yield_history_harvest_id ON public.yield_history(harvest_id);
CREATE INDEX idx_yield_history_date ON public.yield_history(harvest_date DESC);
CREATE INDEX idx_yield_history_crop ON public.yield_history(crop_type);
CREATE INDEX idx_yield_history_season ON public.yield_history(harvest_season);

-- ============================================================================
-- 2. Harvest Forecasts Table (Predicted Future Harvests)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.harvest_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,

  -- Crop information
  crop_type TEXT NOT NULL,
  variety TEXT,
  planting_date DATE,

  -- Forecast window
  forecast_harvest_date_start DATE NOT NULL,
  forecast_harvest_date_end DATE NOT NULL,
  forecast_season TEXT, -- e.g., "Spring 2025"
  confidence_level TEXT, -- "high", "medium", "low"

  -- Predicted yield
  predicted_yield_quantity NUMERIC(12, 2) NOT NULL,
  predicted_yield_per_hectare NUMERIC(12, 2),
  unit_of_measure TEXT DEFAULT 'kg',
  predicted_quality_grade TEXT,

  -- Range estimates
  min_yield_quantity NUMERIC(12, 2), -- Pessimistic scenario
  max_yield_quantity NUMERIC(12, 2), -- Optimistic scenario

  -- Financial forecasts
  estimated_revenue NUMERIC(12, 2),
  estimated_cost NUMERIC(12, 2),
  estimated_profit NUMERIC(12, 2),
  estimated_price_per_unit NUMERIC(12, 2),
  currency_code TEXT DEFAULT 'MAD' REFERENCES public.currencies(code),

  -- Forecast basis
  forecast_method TEXT, -- "historical_average", "trend_analysis", "manual", "ai_model"
  based_on_historical_years INTEGER, -- How many years of data used
  adjustment_factors JSONB, -- Weather, soil improvements, etc.

  -- Status
  status TEXT DEFAULT 'pending', -- "pending", "confirmed", "adjusted", "realized", "cancelled"
  actual_harvest_id UUID REFERENCES public.harvests(id),
  actual_yield_quantity NUMERIC(12, 2), -- Filled when harvest happens
  forecast_accuracy_percent NUMERIC(5, 2), -- (actual - predicted) / predicted * 100

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for harvest forecasts
CREATE INDEX idx_harvest_forecasts_org ON public.harvest_forecasts(organization_id);
CREATE INDEX idx_harvest_forecasts_farm ON public.harvest_forecasts(farm_id);
CREATE INDEX idx_harvest_forecasts_parcel ON public.harvest_forecasts(parcel_id);
CREATE INDEX idx_harvest_forecasts_date_start ON public.harvest_forecasts(forecast_harvest_date_start);
CREATE INDEX idx_harvest_forecasts_date_end ON public.harvest_forecasts(forecast_harvest_date_end);
CREATE INDEX idx_harvest_forecasts_status ON public.harvest_forecasts(status);
CREATE INDEX idx_harvest_forecasts_crop ON public.harvest_forecasts(crop_type);

-- ============================================================================
-- 3. Yield Benchmarks Table (Target/Standard Yields)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.yield_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Scope (can be org-wide, farm-specific, or parcel-specific)
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,

  -- Crop information
  crop_type TEXT NOT NULL,
  variety TEXT,

  -- Benchmark values
  benchmark_type TEXT NOT NULL, -- "organization_target", "industry_standard", "historical_average", "best_practice"
  target_yield_per_hectare NUMERIC(12, 2) NOT NULL,
  unit_of_measure TEXT DEFAULT 'kg',

  -- Threshold ranges
  excellent_threshold_percent NUMERIC(5, 2) DEFAULT 110, -- >=110% of target
  good_threshold_percent NUMERIC(5, 2) DEFAULT 95,       -- 95-110%
  acceptable_threshold_percent NUMERIC(5, 2) DEFAULT 80, -- 80-95%
  -- Below 80% = underperforming

  -- Financial benchmarks
  target_revenue_per_hectare NUMERIC(12, 2),
  target_profit_margin_percent NUMERIC(5, 2),

  -- Context
  valid_from DATE,
  valid_until DATE,
  source TEXT, -- "internal_target", "industry_report", "research_study", "historical_data"
  notes TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure no overlapping active benchmarks for same crop/scope
  CONSTRAINT unique_active_benchmark UNIQUE (organization_id, crop_type, variety, farm_id, parcel_id, valid_from, is_active)
);

-- Indexes for yield benchmarks
CREATE INDEX idx_yield_benchmarks_org ON public.yield_benchmarks(organization_id);
CREATE INDEX idx_yield_benchmarks_farm ON public.yield_benchmarks(farm_id);
CREATE INDEX idx_yield_benchmarks_parcel ON public.yield_benchmarks(parcel_id);
CREATE INDEX idx_yield_benchmarks_crop ON public.yield_benchmarks(crop_type);
CREATE INDEX idx_yield_benchmarks_active ON public.yield_benchmarks(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 4. Performance Alerts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,

  -- Alert details
  alert_type TEXT NOT NULL, -- "underperforming_yield", "missed_forecast", "quality_decline", "revenue_shortfall"
  severity TEXT NOT NULL, -- "critical", "warning", "info"
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Related entities
  yield_history_id UUID REFERENCES public.yield_history(id),
  forecast_id UUID REFERENCES public.harvest_forecasts(id),
  harvest_id UUID REFERENCES public.harvests(id),

  -- Metrics
  metric_name TEXT, -- "yield_per_hectare", "profit_margin", "quality_grade"
  actual_value NUMERIC(12, 2),
  target_value NUMERIC(12, 2),
  variance_percent NUMERIC(5, 2),

  -- Status
  status TEXT DEFAULT 'active', -- "active", "acknowledged", "resolved", "dismissed"
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance alerts
CREATE INDEX idx_performance_alerts_org ON public.performance_alerts(organization_id);
CREATE INDEX idx_performance_alerts_farm ON public.performance_alerts(farm_id);
CREATE INDEX idx_performance_alerts_parcel ON public.performance_alerts(parcel_id);
CREATE INDEX idx_performance_alerts_status ON public.performance_alerts(status);
CREATE INDEX idx_performance_alerts_type ON public.performance_alerts(alert_type);
CREATE INDEX idx_performance_alerts_severity ON public.performance_alerts(severity);
CREATE INDEX idx_performance_alerts_created ON public.performance_alerts(created_at DESC);

-- ============================================================================
-- 5. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.yield_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;

-- Yield History RLS Policies
CREATE POLICY "Users can view yield history in their organizations"
  ON public.yield_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert yield history in their organizations"
  ON public.yield_history FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update yield history in their organizations"
  ON public.yield_history FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Harvest Forecasts RLS Policies
CREATE POLICY "Users can view harvest forecasts in their organizations"
  ON public.harvest_forecasts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert harvest forecasts in their organizations"
  ON public.harvest_forecasts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update harvest forecasts in their organizations"
  ON public.harvest_forecasts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Yield Benchmarks RLS Policies
CREATE POLICY "Users can view yield benchmarks in their organizations"
  ON public.yield_benchmarks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert yield benchmarks in their organizations"
  ON public.yield_benchmarks FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update yield benchmarks in their organizations"
  ON public.yield_benchmarks FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Performance Alerts RLS Policies
CREATE POLICY "Users can view performance alerts in their organizations"
  ON public.performance_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update performance alerts in their organizations"
  ON public.performance_alerts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Function to calculate performance rating based on variance
CREATE OR REPLACE FUNCTION calculate_performance_rating(variance_percent NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF variance_percent >= 10 THEN
    RETURN 'excellent';
  ELSIF variance_percent >= -5 THEN
    RETURN 'good';
  ELSIF variance_percent >= -20 THEN
    RETURN 'average';
  ELSIF variance_percent >= -35 THEN
    RETURN 'below_average';
  ELSE
    RETURN 'poor';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to auto-calculate yield variance when inserting/updating yield history
CREATE OR REPLACE FUNCTION update_yield_variance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate variance if both actual and target are provided
  IF NEW.actual_yield_per_hectare IS NOT NULL AND NEW.target_yield_per_hectare IS NOT NULL AND NEW.target_yield_per_hectare > 0 THEN
    NEW.yield_variance_percent := ROUND(
      ((NEW.actual_yield_per_hectare - NEW.target_yield_per_hectare) / NEW.target_yield_per_hectare * 100)::NUMERIC,
      2
    );
    NEW.performance_rating := calculate_performance_rating(NEW.yield_variance_percent);
  END IF;

  -- Calculate profit if revenue and cost are provided
  IF NEW.revenue_amount IS NOT NULL AND NEW.cost_amount IS NOT NULL THEN
    NEW.profit_amount := NEW.revenue_amount - NEW.cost_amount;
    IF NEW.revenue_amount > 0 THEN
      NEW.profit_margin_percent := ROUND(
        (NEW.profit_amount / NEW.revenue_amount * 100)::NUMERIC,
        2
      );
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_yield_variance
  BEFORE INSERT OR UPDATE ON public.yield_history
  FOR EACH ROW
  EXECUTE FUNCTION update_yield_variance();

-- Function to get parcel performance summary
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS parcel_id,
    p.name AS parcel_name,
    f.name AS farm_name,
    yh.crop_type,
    COUNT(yh.id) AS total_harvests,
    ROUND(AVG(yh.actual_yield_per_hectare)::NUMERIC, 2) AS avg_yield_per_hectare,
    ROUND(AVG(yh.target_yield_per_hectare)::NUMERIC, 2) AS avg_target_yield,
    ROUND(AVG(yh.yield_variance_percent)::NUMERIC, 2) AS avg_variance_percent,
    calculate_performance_rating(ROUND(AVG(yh.yield_variance_percent)::NUMERIC, 2)) AS performance_rating,
    ROUND(SUM(yh.revenue_amount)::NUMERIC, 2) AS total_revenue,
    ROUND(SUM(yh.cost_amount)::NUMERIC, 2) AS total_cost,
    ROUND(SUM(yh.profit_amount)::NUMERIC, 2) AS total_profit,
    ROUND(AVG(yh.profit_margin_percent)::NUMERIC, 2) AS avg_profit_margin,
    MAX(yh.harvest_date) AS last_harvest_date
  FROM public.yield_history yh
  JOIN public.parcels p ON yh.parcel_id = p.id
  JOIN public.farms f ON yh.farm_id = f.id
  WHERE yh.organization_id = p_organization_id
    AND (p_farm_id IS NULL OR yh.farm_id = p_farm_id)
    AND (p_parcel_id IS NULL OR yh.parcel_id = p_parcel_id)
    AND (p_from_date IS NULL OR yh.harvest_date >= p_from_date)
    AND (p_to_date IS NULL OR yh.harvest_date <= p_to_date)
  GROUP BY p.id, p.name, f.name, yh.crop_type
  ORDER BY avg_variance_percent ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_performance_rating(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION get_parcel_performance_summary(UUID, UUID, UUID, DATE, DATE) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.yield_history IS 'Historical yield records with actual vs target performance tracking';
COMMENT ON TABLE public.harvest_forecasts IS 'Future harvest predictions with confidence ranges and financial estimates';
COMMENT ON TABLE public.yield_benchmarks IS 'Target yields and performance thresholds for crops';
COMMENT ON TABLE public.performance_alerts IS 'Automated alerts for underperforming parcels and yield issues';

COMMENT ON FUNCTION get_parcel_performance_summary IS 'Aggregates parcel performance metrics for dashboards and reporting';
