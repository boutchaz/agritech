-- =====================================================
-- ENSURE FARMS TABLE EXISTS
-- =====================================================
-- Run this script to create the farms table if it doesn't exist

-- Create farms table if not exists
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    coordinates JSONB, -- {lat: number, lng: number}
    size DECIMAL(10,2),
    size_unit TEXT DEFAULT 'hectares' CHECK (size_unit IN ('hectares', 'acres', 'square_meters')),
    manager_name TEXT,
    manager_phone TEXT,
    manager_email TEXT,
    soil_type TEXT,
    climate_zone TEXT,
    irrigation_type TEXT,
    certification_status TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    established_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for organization lookup
CREATE INDEX IF NOT EXISTS idx_farms_organization_id ON public.farms(organization_id);

-- Enable Row Level Security
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view farms of their organizations" ON public.farms;
DROP POLICY IF EXISTS "Users can create farms for their organizations" ON public.farms;
DROP POLICY IF EXISTS "Admins can update organization farms" ON public.farms;
DROP POLICY IF EXISTS "Admins can delete organization farms" ON public.farms;

-- RLS Policies for farms
CREATE POLICY "Users can view farms of their organizations"
ON public.farms FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.organization_users
        WHERE user_id = auth.uid()
        AND is_active = true
    )
);

CREATE POLICY "Users can create farms for their organizations"
ON public.farms FOR INSERT
TO authenticated
WITH CHECK (
    organization_id IN (
        SELECT organization_id
        FROM public.organization_users
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
);

CREATE POLICY "Admins can update organization farms"
ON public.farms FOR UPDATE
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.organization_users
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
);

CREATE POLICY "Admins can delete organization farms"
ON public.farms FOR DELETE
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.organization_users
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
);

-- Grant permissions
GRANT ALL ON public.farms TO authenticated;
GRANT SELECT ON public.farms TO anon;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_farms_updated_at ON public.farms;
CREATE TRIGGER update_farms_updated_at
BEFORE UPDATE ON public.farms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();