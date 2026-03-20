DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'parcels'
      AND c.contype = 'c'
    GROUP BY c.oid, c.conname
    HAVING bool_or(a.attname = 'ai_phase')
  LOOP
    EXECUTE format('ALTER TABLE public.parcels DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parcels_ai_phase_check'
      AND conrelid = 'public.parcels'::regclass
  ) THEN
    ALTER TABLE public.parcels
      ADD CONSTRAINT parcels_ai_phase_check
      CHECK (
        ai_phase IN (
          'disabled',
          'calibration',
          'calibrating',
          'awaiting_validation',
          'awaiting_nutrition_option',
          'active',
          'paused'
        )
      );
  END IF;
END $$;

ALTER TABLE IF EXISTS public.calibrations
  ADD COLUMN IF NOT EXISTS health_score NUMERIC CHECK (health_score >= 0 AND health_score <= 100),
  ADD COLUMN IF NOT EXISTS yield_potential_min NUMERIC,
  ADD COLUMN IF NOT EXISTS yield_potential_max NUMERIC,
  ADD COLUMN IF NOT EXISTS data_completeness_score NUMERIC CHECK (data_completeness_score >= 0 AND data_completeness_score <= 100),
  ADD COLUMN IF NOT EXISTS maturity_phase TEXT CHECK (maturity_phase IN ('juvenile', 'entree_production', 'pleine_production', 'maturite_avancee', 'senescence', 'unknown')),
  ADD COLUMN IF NOT EXISTS anomaly_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calibration_version TEXT DEFAULT 'v2';
