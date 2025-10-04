-- Create parcel_reports table
CREATE TABLE IF NOT EXISTS public.parcel_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    title TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    file_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parcel_reports_parcel_id ON public.parcel_reports(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_reports_generated_at ON public.parcel_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_parcel_reports_status ON public.parcel_reports(status);

-- Enable RLS
ALTER TABLE public.parcel_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view reports for their organization parcels" ON public.parcel_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.parcels p
            JOIN public.farms f ON f.id = p.farm_id
            JOIN public.organization_users ou ON ou.organization_id = f.organization_id
            WHERE p.id = parcel_reports.parcel_id
            AND ou.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create reports for their organization parcels" ON public.parcel_reports
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.parcels p
            JOIN public.farms f ON f.id = p.farm_id
            JOIN public.organization_users ou ON ou.organization_id = f.organization_id
            WHERE p.id = parcel_reports.parcel_id
            AND ou.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own reports" ON public.parcel_reports
    FOR UPDATE USING (
        generated_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.parcels p
            JOIN public.farms f ON f.id = p.farm_id
            JOIN public.organization_users ou ON ou.organization_id = f.organization_id
            JOIN public.roles r ON r.id = ou.role_id
            WHERE p.id = parcel_reports.parcel_id
            AND ou.user_id = auth.uid()
            AND r.level <= 2  -- System admin or org admin
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_parcel_reports
    BEFORE UPDATE ON public.parcel_reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload reports for their organization"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'reports' AND
    auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view reports for their organization"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'reports' AND
    auth.uid() IS NOT NULL
);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';