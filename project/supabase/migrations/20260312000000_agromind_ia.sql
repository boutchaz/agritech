ALTER TABLE IF EXISTS public.parcels
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_phase TEXT DEFAULT 'disabled' CHECK (ai_phase IN ('disabled', 'calibration', 'active', 'paused')),
  ADD COLUMN IF NOT EXISTS ai_calibration_id UUID,
  ADD COLUMN IF NOT EXISTS ai_nutrition_option TEXT DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS ai_production_target TEXT;

ALTER TABLE IF EXISTS public.satellite_indices_data
  ADD COLUMN IF NOT EXISTS baseline_position TEXT,
  ADD COLUMN IF NOT EXISTS is_significant_deviation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trend_direction TEXT CHECK (trend_direction IN ('improving', 'stable', 'declining')),
  ADD COLUMN IF NOT EXISTS trend_duration_days INTEGER;

ALTER TABLE IF EXISTS public.performance_alerts
  ADD COLUMN IF NOT EXISTS alert_code TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS entry_threshold NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_threshold NUMERIC,
  ADD COLUMN IF NOT EXISTS trigger_data JSONB,
  ADD COLUMN IF NOT EXISTS satellite_reading_id UUID,
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS action_delay INTEGER DEFAULT 0;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'performance_alerts'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%alert_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.performance_alerts DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  ALTER TABLE public.performance_alerts
    ADD CONSTRAINT performance_alerts_alert_type_check
    CHECK (
      alert_type IN (
        'yield_underperformance',
        'forecast_variance',
        'quality_issue',
        'cost_overrun',
        'revenue_shortfall',
        'benchmark_deviation',
        'ai_drought_stress',
        'ai_frost_risk',
        'ai_heat_stress',
        'ai_pest_risk',
        'ai_nutrient_deficiency',
        'ai_yield_warning',
        'ai_phenology_alert',
        'ai_salinity_alert'
      )
    );
END $$;

ALTER TABLE IF EXISTS public.product_applications
  ADD COLUMN IF NOT EXISTS ai_recommendation_id UUID;

CREATE TABLE IF NOT EXISTS public.calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  baseline_ndvi NUMERIC,
  baseline_ndre NUMERIC,
  baseline_ndmi NUMERIC,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  zone_classification TEXT CHECK (zone_classification IN ('optimal', 'normal', 'stressed')),
  phenology_stage TEXT,
  calibration_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calibration_id UUID REFERENCES public.calibrations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected', 'executed', 'expired')),
  constat TEXT NOT NULL,
  diagnostic TEXT NOT NULL,
  action TEXT NOT NULL,
  conditions JSONB,
  suivi TEXT,
  crop_type TEXT NOT NULL,
  alert_code TEXT,
  priority INTEGER DEFAULT 3,
  valid_from DATE,
  valid_until DATE,
  executed_at TIMESTAMPTZ,
  execution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.annual_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  calibration_id UUID REFERENCES public.calibrations(id) ON DELETE SET NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'active', 'archived')),
  crop_type TEXT NOT NULL,
  variety TEXT,
  plan_data JSONB,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parcel_id, year)
);

CREATE TABLE IF NOT EXISTS public.plan_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_plan_id UUID NOT NULL REFERENCES public.annual_plans(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  week INTEGER CHECK (week >= 1 AND week <= 5),
  intervention_type TEXT NOT NULL,
  description TEXT NOT NULL,
  product TEXT,
  dose TEXT,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'executed', 'skipped', 'delayed')),
  executed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crop_ai_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL UNIQUE CHECK (crop_type IN ('olivier', 'agrumes', 'avocatier', 'palmier_dattier')),
  version TEXT NOT NULL,
  reference_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_parcels_ai_calibration'
      AND conrelid = 'public.parcels'::regclass
  ) THEN
    ALTER TABLE public.parcels
      ADD CONSTRAINT fk_parcels_ai_calibration
      FOREIGN KEY (ai_calibration_id) REFERENCES public.calibrations(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_product_applications_ai_recommendation'
      AND conrelid = 'public.product_applications'::regclass
  ) THEN
    ALTER TABLE public.product_applications
      ADD CONSTRAINT fk_product_applications_ai_recommendation
      FOREIGN KEY (ai_recommendation_id) REFERENCES public.ai_recommendations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_calibrations_parcel_id ON public.calibrations(parcel_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_organization_id ON public.calibrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_status ON public.calibrations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_parcel_id ON public.ai_recommendations(parcel_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_organization_id ON public.ai_recommendations(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON public.ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_annual_plans_parcel_id ON public.annual_plans(parcel_id);
CREATE INDEX IF NOT EXISTS idx_annual_plans_organization_id ON public.annual_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_plan_interventions_annual_plan_id ON public.plan_interventions(annual_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_interventions_parcel_id ON public.plan_interventions(parcel_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_is_ai_generated ON public.performance_alerts(is_ai_generated);

DROP TRIGGER IF EXISTS trg_calibrations_updated_at ON public.calibrations;
CREATE TRIGGER trg_calibrations_updated_at
  BEFORE UPDATE ON public.calibrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_recommendations_updated_at ON public.ai_recommendations;
CREATE TRIGGER trg_ai_recommendations_updated_at
  BEFORE UPDATE ON public.ai_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_annual_plans_updated_at ON public.annual_plans;
CREATE TRIGGER trg_annual_plans_updated_at
  BEFORE UPDATE ON public.annual_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_plan_interventions_updated_at ON public.plan_interventions;
CREATE TRIGGER trg_plan_interventions_updated_at
  BEFORE UPDATE ON public.plan_interventions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crop_ai_references_updated_at ON public.crop_ai_references;
CREATE TRIGGER trg_crop_ai_references_updated_at
  BEFORE UPDATE ON public.crop_ai_references
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE IF EXISTS public.calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.annual_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crop_ai_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_read_calibrations" ON public.calibrations;
CREATE POLICY "org_read_calibrations" ON public.calibrations
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_calibrations" ON public.calibrations;
CREATE POLICY "org_write_calibrations" ON public.calibrations
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_calibrations" ON public.calibrations;
CREATE POLICY "org_update_calibrations" ON public.calibrations
  FOR UPDATE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_calibrations" ON public.calibrations;
CREATE POLICY "org_delete_calibrations" ON public.calibrations
  FOR DELETE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_read_ai_recommendations" ON public.ai_recommendations;
CREATE POLICY "org_read_ai_recommendations" ON public.ai_recommendations
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_ai_recommendations" ON public.ai_recommendations;
CREATE POLICY "org_write_ai_recommendations" ON public.ai_recommendations
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_ai_recommendations" ON public.ai_recommendations;
CREATE POLICY "org_update_ai_recommendations" ON public.ai_recommendations
  FOR UPDATE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_ai_recommendations" ON public.ai_recommendations;
CREATE POLICY "org_delete_ai_recommendations" ON public.ai_recommendations
  FOR DELETE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_read_annual_plans" ON public.annual_plans;
CREATE POLICY "org_read_annual_plans" ON public.annual_plans
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_annual_plans" ON public.annual_plans;
CREATE POLICY "org_write_annual_plans" ON public.annual_plans
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_annual_plans" ON public.annual_plans;
CREATE POLICY "org_update_annual_plans" ON public.annual_plans
  FOR UPDATE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_annual_plans" ON public.annual_plans;
CREATE POLICY "org_delete_annual_plans" ON public.annual_plans
  FOR DELETE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_read_plan_interventions" ON public.plan_interventions;
CREATE POLICY "org_read_plan_interventions" ON public.plan_interventions
  FOR SELECT USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_write_plan_interventions" ON public.plan_interventions;
CREATE POLICY "org_write_plan_interventions" ON public.plan_interventions
  FOR INSERT WITH CHECK (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_update_plan_interventions" ON public.plan_interventions;
CREATE POLICY "org_update_plan_interventions" ON public.plan_interventions
  FOR UPDATE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "org_delete_plan_interventions" ON public.plan_interventions;
CREATE POLICY "org_delete_plan_interventions" ON public.plan_interventions
  FOR DELETE USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "read_crop_ai_references" ON public.crop_ai_references;
CREATE POLICY "read_crop_ai_references" ON public.crop_ai_references
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "write_crop_ai_references" ON public.crop_ai_references;
CREATE POLICY "write_crop_ai_references" ON public.crop_ai_references
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "update_crop_ai_references" ON public.crop_ai_references;
CREATE POLICY "update_crop_ai_references" ON public.crop_ai_references
  FOR UPDATE USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "delete_crop_ai_references" ON public.crop_ai_references;
CREATE POLICY "delete_crop_ai_references" ON public.crop_ai_references
  FOR DELETE USING (auth.role() = 'service_role');

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calibrations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_alerts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_recommendations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_interventions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
