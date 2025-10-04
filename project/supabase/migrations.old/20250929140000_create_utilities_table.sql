-- Idempotent creation (will be skipped if already exists)
CREATE TABLE IF NOT EXISTS public.utilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('electricity', 'water', 'diesel', 'gas', 'internet', 'phone', 'other')),
    provider TEXT,
    account_number TEXT,
    amount DECIMAL(10,2) NOT NULL,
    consumption_value DECIMAL(10,2), -- New field for consumption amount (e.g., 500 kWh, 200 m³)
    consumption_unit TEXT, -- New field for consumption unit (e.g., kWh, m³, L, GB)
    billing_date DATE NOT NULL,
    due_date DATE,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
    invoice_url TEXT, -- New field for invoice attachments
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_utilities_farm_id ON public.utilities(farm_id);
CREATE INDEX IF NOT EXISTS idx_utilities_type ON public.utilities(type);
CREATE INDEX IF NOT EXISTS idx_utilities_billing_date ON public.utilities(billing_date);
CREATE INDEX IF NOT EXISTS idx_utilities_payment_status ON public.utilities(payment_status);

-- Enable RLS
ALTER TABLE public.utilities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='utilities' AND policyname='Users can view utilities from their organization''s farms'
  ) THEN
    CREATE POLICY "Users can view utilities from their organization's farms" ON public.utilities
        FOR SELECT USING (
            farm_id IN (
                SELECT f.id FROM public.farms f
                JOIN public.organizations o ON f.organization_id = o.id
                JOIN public.organization_users uo ON o.id = uo.organization_id
                WHERE uo.user_id = auth.uid()
            )
        );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='utilities' AND policyname='Users can insert utilities to their organization''s farms'
  ) THEN
    CREATE POLICY "Users can insert utilities to their organization's farms" ON public.utilities
        FOR INSERT WITH CHECK (
            farm_id IN (
                SELECT f.id FROM public.farms f
                JOIN public.organizations o ON f.organization_id = o.id
                JOIN public.organization_users uo ON o.id = uo.organization_id
                WHERE uo.user_id = auth.uid()
            )
        );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='utilities' AND policyname='Users can update utilities from their organization''s farms'
  ) THEN
    CREATE POLICY "Users can update utilities from their organization's farms" ON public.utilities
        FOR UPDATE USING (
            farm_id IN (
                SELECT f.id FROM public.farms f
                JOIN public.organizations o ON f.organization_id = o.id
                JOIN public.organization_users uo ON o.id = uo.organization_id
                WHERE uo.user_id = auth.uid()
            )
        );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='utilities' AND policyname='Users can delete utilities from their organization''s farms'
  ) THEN
    CREATE POLICY "Users can delete utilities from their organization's farms" ON public.utilities
        FOR DELETE USING (
            farm_id IN (
                SELECT f.id FROM public.farms f
                JOIN public.organizations o ON f.organization_id = o.id
                JOIN public.organization_users uo ON o.id = uo.organization_id
                WHERE uo.user_id = auth.uid()
            )
        );
  END IF;
END $$;

-- Create trigger for updated_at (requires public.handle_updated_at)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='handle_updated_at_utilities'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE p.proname='handle_updated_at' AND n.nspname='public'
    ) THEN
      CREATE OR REPLACE FUNCTION public.handle_updated_at()
      RETURNS trigger LANGUAGE plpgsql AS $func$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $func$;
    END IF;
    CREATE TRIGGER handle_updated_at_utilities
      BEFORE UPDATE ON public.utilities
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';