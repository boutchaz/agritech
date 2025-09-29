-- Complete structures table setup for farm infrastructure management
-- Run this in your Supabase Dashboard SQL Editor

-- Step 1: Create the structures table
CREATE TABLE IF NOT EXISTS public.structures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('stable', 'technical_room', 'basin', 'well')),
    location JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}',
    installation_date DATE NOT NULL,
    condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_repair')),
    usage TEXT,
    structure_details JSONB DEFAULT '{}',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_structures_organization_id ON public.structures(organization_id);
CREATE INDEX IF NOT EXISTS idx_structures_farm_id ON public.structures(farm_id);
CREATE INDEX IF NOT EXISTS idx_structures_type ON public.structures(type);
CREATE INDEX IF NOT EXISTS idx_structures_condition ON public.structures(condition);
CREATE INDEX IF NOT EXISTS idx_structures_installation_date ON public.structures(installation_date);
CREATE INDEX IF NOT EXISTS idx_structures_is_active ON public.structures(is_active);
CREATE INDEX IF NOT EXISTS idx_structures_org_farm ON public.structures(organization_id, farm_id);
CREATE INDEX IF NOT EXISTS idx_structures_farm_type ON public.structures(farm_id, type);

-- Step 3: Enable Row Level Security
ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
CREATE POLICY "Users can view structures from their organization's farms" ON public.structures
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can insert structures to their organization's farms" ON public.structures
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update structures from their organization's farms" ON public.structures
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can delete structures from their organization's farms" ON public.structures
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Step 5: Create trigger for updated_at timestamp
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='handle_updated_at_structures'
  ) THEN
    CREATE TRIGGER handle_updated_at_structures
      BEFORE UPDATE ON public.structures
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Step 6: Create helper functions
CREATE OR REPLACE FUNCTION public.get_farm_structures(farm_uuid uuid)
RETURNS TABLE(
    structure_id uuid,
    structure_name text,
    structure_type text,
    location jsonb,
    installation_date date,
    condition text,
    usage text,
    structure_details jsonb,
    notes text,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as structure_id,
        s.name as structure_name,
        s.type as structure_type,
        s.location,
        s.installation_date,
        s.condition,
        s.usage,
        s.structure_details,
        s.notes,
        s.is_active,
        s.created_at,
        s.updated_at
    FROM public.structures s
    WHERE s.farm_id = farm_uuid
        AND s.is_active = true
    ORDER BY s.type, s.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_organization_structures(org_uuid uuid)
RETURNS TABLE(
    structure_id uuid,
    structure_name text,
    structure_type text,
    farm_id uuid,
    farm_name text,
    location jsonb,
    installation_date date,
    condition text,
    usage text,
    structure_details jsonb,
    notes text,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as structure_id,
        s.name as structure_name,
        s.type as structure_type,
        f.id as farm_id,
        f.name as farm_name,
        s.location,
        s.installation_date,
        s.condition,
        s.usage,
        s.structure_details,
        s.notes,
        s.is_active,
        s.created_at,
        s.updated_at
    FROM public.structures s
    JOIN public.farms f ON s.farm_id = f.id
    WHERE s.organization_id = org_uuid
        AND s.is_active = true
        AND f.is_active = true
    ORDER BY f.name, s.type, s.name;
END;
$$;

-- Step 7: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_farm_structures(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_structures(uuid) TO authenticated;

-- Step 8: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Structures table created successfully! ✅' as status;
