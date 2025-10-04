-- Create dashboard_settings table
CREATE TABLE IF NOT EXISTS public.dashboard_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    show_soil_data BOOLEAN DEFAULT TRUE,
    show_climate_data BOOLEAN DEFAULT TRUE,
    show_irrigation_data BOOLEAN DEFAULT TRUE,
    show_maintenance_data BOOLEAN DEFAULT TRUE,
    show_production_data BOOLEAN DEFAULT TRUE,
    show_financial_data BOOLEAN DEFAULT TRUE,
    show_stock_alerts BOOLEAN DEFAULT TRUE,
    show_task_alerts BOOLEAN DEFAULT TRUE,
    layout JSONB DEFAULT '{"topRow": ["soil", "climate", "irrigation", "maintenance"], "middleRow": ["production", "financial"], "bottomRow": ["alerts", "tasks"]}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_user_id ON public.dashboard_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_organization_id ON public.dashboard_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_user_org ON public.dashboard_settings(user_id, organization_id);

-- Enable RLS
ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own dashboard settings" ON public.dashboard_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard settings" ON public.dashboard_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard settings" ON public.dashboard_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard settings" ON public.dashboard_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_dashboard_settings
    BEFORE UPDATE ON public.dashboard_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';