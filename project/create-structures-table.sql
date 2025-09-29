-- Create structures table for farm infrastructure management
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

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_structures_organization_id ON public.structures(organization_id);
CREATE INDEX IF NOT EXISTS idx_structures_farm_id ON public.structures(farm_id);
CREATE INDEX IF NOT EXISTS idx_structures_type ON public.structures(type);

-- Enable Row Level Security
ALTER TABLE public.structures ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy
CREATE POLICY "Users can manage structures from their organization" ON public.structures
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
