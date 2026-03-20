CREATE TABLE IF NOT EXISTS public.monitoring_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  spectral_result JSONB,
  phenology_result JSONB,
  diagnostic_scenario TEXT,
  coherence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parcel_id, analysis_date)
);

DO $$
BEGIN
  IF to_regclass('public.parcels') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'parcels_id_organization_id_key'
         AND conrelid = 'public.parcels'::regclass
     ) THEN
    ALTER TABLE public.parcels
      ADD CONSTRAINT parcels_id_organization_id_key UNIQUE (id, organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_monitoring_analyses_parcel_org'
      AND conrelid = 'public.monitoring_analyses'::regclass
  ) THEN
    ALTER TABLE public.monitoring_analyses
      ADD CONSTRAINT fk_monitoring_analyses_parcel_org
      FOREIGN KEY (parcel_id, organization_id)
      REFERENCES public.parcels(id, organization_id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.weather_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tmin REAL,
  tmax REAL,
  tmoy REAL,
  precipitation_mm REAL,
  etp_mm REAL,
  humidity_pct REAL,
  wind_kmh REAL,
  radiation_wm2 REAL,
  gdd REAL,
  gdd_cumulative REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parcel_id, date)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_weather_daily_parcel_org'
      AND conrelid = 'public.weather_daily'::regclass
  ) THEN
    ALTER TABLE public.weather_daily
      ADD CONSTRAINT fk_weather_daily_parcel_org
      FOREIGN KEY (parcel_id, organization_id)
      REFERENCES public.parcels(id, organization_id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.weather_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tmin REAL,
  tmax REAL,
  precipitation_mm REAL,
  wind_kmh REAL,
  humidity_pct REAL,
  UNIQUE (parcel_id, forecast_date)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_weather_forecast_parcel_org'
      AND conrelid = 'public.weather_forecast'::regclass
  ) THEN
    ALTER TABLE public.weather_forecast
      ADD CONSTRAINT fk_weather_forecast_parcel_org
      FOREIGN KEY (parcel_id, organization_id)
      REFERENCES public.parcels(id, organization_id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.yield_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  season_year INTEGER NOT NULL,
  moment TEXT NOT NULL,
  yield_min REAL,
  yield_max REAL,
  yield_central REAL,
  confidence_pct REAL,
  alternance_status TEXT,
  factors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_yield_forecasts_parcel_org'
      AND conrelid = 'public.yield_forecasts'::regclass
  ) THEN
    ALTER TABLE public.yield_forecasts
      ADD CONSTRAINT fk_yield_forecasts_parcel_org
      FOREIGN KEY (parcel_id, organization_id)
      REFERENCES public.parcels(id, organization_id)
      ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.ai_recommendations
  ADD COLUMN IF NOT EXISTS evaluation_window_days INTEGER,
  ADD COLUMN IF NOT EXISTS evaluation_indicator TEXT,
  ADD COLUMN IF NOT EXISTS expected_response TEXT,
  ADD COLUMN IF NOT EXISTS actual_response_pct REAL,
  ADD COLUMN IF NOT EXISTS efficacy TEXT;

ALTER TABLE IF EXISTS public.parcels
  ADD COLUMN IF NOT EXISTS last_satellite_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_weather_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_bbch TEXT,
  ADD COLUMN IF NOT EXISTS current_gdd_cumulative REAL;

CREATE INDEX IF NOT EXISTS idx_monitoring_analyses_parcel_date
  ON public.monitoring_analyses(parcel_id, analysis_date DESC);

CREATE INDEX IF NOT EXISTS idx_weather_daily_parcel_date
  ON public.weather_daily(parcel_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_weather_forecast_parcel_date
  ON public.weather_forecast(parcel_id, forecast_date);

CREATE INDEX IF NOT EXISTS idx_yield_forecasts_parcel_season
  ON public.yield_forecasts(parcel_id, season_year DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_executed_efficacy
  ON public.ai_recommendations(status, executed_at, efficacy);

ALTER TABLE IF EXISTS public.monitoring_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weather_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weather_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.yield_forecasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_monitoring_analyses" ON public.monitoring_analyses;
CREATE POLICY "org_read_monitoring_analyses" ON public.monitoring_analyses
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_monitoring_analyses" ON public.monitoring_analyses;
CREATE POLICY "org_write_monitoring_analyses" ON public.monitoring_analyses
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_monitoring_analyses" ON public.monitoring_analyses;
CREATE POLICY "org_update_monitoring_analyses" ON public.monitoring_analyses
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_monitoring_analyses" ON public.monitoring_analyses;
CREATE POLICY "org_delete_monitoring_analyses" ON public.monitoring_analyses
  FOR DELETE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_read_weather_daily" ON public.weather_daily;
CREATE POLICY "org_read_weather_daily" ON public.weather_daily
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_weather_daily" ON public.weather_daily;
CREATE POLICY "org_write_weather_daily" ON public.weather_daily
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_weather_daily" ON public.weather_daily;
CREATE POLICY "org_update_weather_daily" ON public.weather_daily
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_weather_daily" ON public.weather_daily;
CREATE POLICY "org_delete_weather_daily" ON public.weather_daily
  FOR DELETE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_read_weather_forecast" ON public.weather_forecast;
CREATE POLICY "org_read_weather_forecast" ON public.weather_forecast
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_weather_forecast" ON public.weather_forecast;
CREATE POLICY "org_write_weather_forecast" ON public.weather_forecast
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_weather_forecast" ON public.weather_forecast;
CREATE POLICY "org_update_weather_forecast" ON public.weather_forecast
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_weather_forecast" ON public.weather_forecast;
CREATE POLICY "org_delete_weather_forecast" ON public.weather_forecast
  FOR DELETE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_read_yield_forecasts" ON public.yield_forecasts;
CREATE POLICY "org_read_yield_forecasts" ON public.yield_forecasts
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_yield_forecasts" ON public.yield_forecasts;
CREATE POLICY "org_write_yield_forecasts" ON public.yield_forecasts
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_yield_forecasts" ON public.yield_forecasts;
CREATE POLICY "org_update_yield_forecasts" ON public.yield_forecasts
  FOR UPDATE USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_yield_forecasts" ON public.yield_forecasts;
CREATE POLICY "org_delete_yield_forecasts" ON public.yield_forecasts
  FOR DELETE USING (public.is_organization_member(organization_id));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoring_analyses;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.weather_daily;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.weather_forecast;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.yield_forecasts;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;
