-- Align parcels.ai_phase CHECK with CalibrationStateMachine (downloading, pret_calibrage).
-- Without these values, transitions used by older flows could fail at the database layer.

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
          'downloading',
          'pret_calibrage',
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
