ALTER TABLE IF EXISTS public.weather_daily_data
  ADD COLUMN IF NOT EXISTS gdd_olivier NUMERIC,
  ADD COLUMN IF NOT EXISTS gdd_agrumes NUMERIC,
  ADD COLUMN IF NOT EXISTS gdd_avocatier NUMERIC,
  ADD COLUMN IF NOT EXISTS gdd_palmier_dattier NUMERIC,
  ADD COLUMN IF NOT EXISTS chill_hours NUMERIC;

CREATE INDEX IF NOT EXISTS idx_weather_daily_data_lat_lon_date
  ON public.weather_daily_data(latitude, longitude, date);
