-- Create cost_categories table
CREATE TABLE IF NOT EXISTS public.cost_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('labor', 'materials', 'utilities', 'equipment', 'other')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Create costs table
CREATE TABLE IF NOT EXISTS public.costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.cost_categories(id) ON DELETE SET NULL,
    cost_type TEXT NOT NULL CHECK (cost_type IN ('labor', 'materials', 'utilities', 'equipment', 'product_application', 'other')),
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    date DATE NOT NULL,
    description TEXT,
    reference_id UUID, -- Links to product_applications, utilities, etc.
    reference_type TEXT, -- 'product_application', 'utility', 'employee_work', etc.
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create revenue tracking table
CREATE TABLE IF NOT EXISTS public.revenues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    revenue_type TEXT NOT NULL CHECK (revenue_type IN ('harvest', 'subsidy', 'other')),
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    date DATE NOT NULL,
    crop_type TEXT,
    quantity DECIMAL(10, 2),
    unit TEXT,
    price_per_unit DECIMAL(10, 2),
    description TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profitability snapshots table (for historical tracking)
CREATE TABLE IF NOT EXISTS public.profitability_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_costs DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    net_profit DECIMAL(12, 2) NOT NULL DEFAULT 0,
    profit_margin DECIMAL(5, 2),
    currency TEXT NOT NULL DEFAULT 'EUR',
    cost_breakdown JSONB,
    revenue_breakdown JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add parcel_id to product_applications if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_applications') THEN
        ALTER TABLE public.product_applications
        ADD COLUMN IF NOT EXISTS parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE;

        ALTER TABLE public.product_applications
        ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2);

        ALTER TABLE public.product_applications
        ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
    END IF;
END $$;

-- Add parcel_id and cost to utilities if not exists
ALTER TABLE public.utilities
ADD COLUMN IF NOT EXISTS parcel_id UUID REFERENCES public.parcels(id) ON DELETE SET NULL;

ALTER TABLE public.utilities
ADD COLUMN IF NOT EXISTS cost_per_parcel DECIMAL(10, 2);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cost_categories_organization ON public.cost_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_costs_organization ON public.costs(organization_id);
CREATE INDEX IF NOT EXISTS idx_costs_farm ON public.costs(farm_id);
CREATE INDEX IF NOT EXISTS idx_costs_parcel ON public.costs(parcel_id);
CREATE INDEX IF NOT EXISTS idx_costs_date ON public.costs(date);
CREATE INDEX IF NOT EXISTS idx_costs_reference ON public.costs(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_revenues_organization ON public.revenues(organization_id);
CREATE INDEX IF NOT EXISTS idx_revenues_parcel ON public.revenues(parcel_id);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON public.revenues(date);
CREATE INDEX IF NOT EXISTS idx_profitability_snapshots_organization ON public.profitability_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_profitability_snapshots_parcel ON public.profitability_snapshots(parcel_id);
CREATE INDEX IF NOT EXISTS idx_profitability_snapshots_period ON public.profitability_snapshots(period_start, period_end);

-- Enable RLS
ALTER TABLE public.cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profitability_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cost_categories
CREATE POLICY "Users can view cost categories for their organization" ON public.cost_categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = auth.uid() AND ou.organization_id = cost_categories.organization_id
        )
    );

CREATE POLICY "Admins can manage cost categories" ON public.cost_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid()
            AND ou.organization_id = cost_categories.organization_id
            AND r.level <= 2
        )
    );

-- RLS Policies for costs
CREATE POLICY "Users can view costs for their organization" ON public.costs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = auth.uid() AND ou.organization_id = costs.organization_id
        )
    );

CREATE POLICY "Users can create costs" ON public.costs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = auth.uid() AND ou.organization_id = costs.organization_id
        )
    );

CREATE POLICY "Users can update costs" ON public.costs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = auth.uid() AND ou.organization_id = costs.organization_id
        )
    );

CREATE POLICY "Users can delete costs" ON public.costs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = auth.uid() AND ou.organization_id = costs.organization_id
        )
    );

-- RLS Policies for revenues
CREATE POLICY "Users can view revenues for their organization" ON public.revenues
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = auth.uid() AND ou.organization_id = revenues.organization_id
        )
    );

CREATE POLICY "Users can manage revenues" ON public.revenues
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = auth.uid() AND ou.organization_id = revenues.organization_id
        )
    );

-- RLS Policies for profitability_snapshots
CREATE POLICY "Users can view profitability snapshots" ON public.profitability_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = auth.uid() AND ou.organization_id = profitability_snapshots.organization_id
        )
    );

CREATE POLICY "Admins can manage profitability snapshots" ON public.profitability_snapshots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid()
            AND ou.organization_id = profitability_snapshots.organization_id
            AND r.level <= 2
        )
    );

-- Create triggers
CREATE TRIGGER handle_updated_at_cost_categories
    BEFORE UPDATE ON public.cost_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_costs
    BEFORE UPDATE ON public.costs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_revenues
    BEFORE UPDATE ON public.revenues
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_profitability_snapshots
    BEFORE UPDATE ON public.profitability_snapshots
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to calculate profitability
CREATE OR REPLACE FUNCTION public.calculate_profitability(
    p_organization_id UUID,
    p_parcel_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    parcel_id UUID,
    parcel_name TEXT,
    total_costs DECIMAL,
    total_revenue DECIMAL,
    net_profit DECIMAL,
    profit_margin DECIMAL,
    cost_breakdown JSONB,
    revenue_breakdown JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH cost_summary AS (
        SELECT
            c.parcel_id,
            SUM(c.amount) as total_cost,
            jsonb_object_agg(c.cost_type, SUM(c.amount)) as costs_by_type
        FROM public.costs c
        WHERE c.organization_id = p_organization_id
        AND (p_parcel_id IS NULL OR c.parcel_id = p_parcel_id)
        AND (p_start_date IS NULL OR c.date >= p_start_date)
        AND (p_end_date IS NULL OR c.date <= p_end_date)
        GROUP BY c.parcel_id
    ),
    revenue_summary AS (
        SELECT
            r.parcel_id,
            SUM(r.amount) as total_rev,
            jsonb_object_agg(r.revenue_type, SUM(r.amount)) as revenue_by_type
        FROM public.revenues r
        WHERE r.organization_id = p_organization_id
        AND (p_parcel_id IS NULL OR r.parcel_id = p_parcel_id)
        AND (p_start_date IS NULL OR r.date >= p_start_date)
        AND (p_end_date IS NULL OR r.date <= p_end_date)
        GROUP BY r.parcel_id
    )
    SELECT
        COALESCE(cs.parcel_id, rs.parcel_id) as parcel_id,
        p.name as parcel_name,
        COALESCE(cs.total_cost, 0) as total_costs,
        COALESCE(rs.total_rev, 0) as total_revenue,
        COALESCE(rs.total_rev, 0) - COALESCE(cs.total_cost, 0) as net_profit,
        CASE
            WHEN COALESCE(rs.total_rev, 0) > 0
            THEN ((COALESCE(rs.total_rev, 0) - COALESCE(cs.total_cost, 0)) / rs.total_rev * 100)
            ELSE NULL
        END as profit_margin,
        COALESCE(cs.costs_by_type, '{}'::jsonb) as cost_breakdown,
        COALESCE(rs.revenue_by_type, '{}'::jsonb) as revenue_breakdown
    FROM cost_summary cs
    FULL OUTER JOIN revenue_summary rs ON cs.parcel_id = rs.parcel_id
    LEFT JOIN public.parcels p ON p.id = COALESCE(cs.parcel_id, rs.parcel_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default cost categories
INSERT INTO public.cost_categories (organization_id, name, type, description)
SELECT
    o.id,
    category.name,
    category.type,
    category.description
FROM public.organizations o
CROSS JOIN (VALUES
    ('Seeds & Planting Material', 'materials', 'Cost of seeds, seedlings, and planting materials'),
    ('Fertilizers', 'materials', 'Cost of fertilizers and soil amendments'),
    ('Pesticides & Herbicides', 'materials', 'Cost of pest and weed control products'),
    ('Water & Irrigation', 'utilities', 'Water consumption and irrigation costs'),
    ('Electricity', 'utilities', 'Electrical power costs'),
    ('Fuel', 'utilities', 'Fuel costs for machinery and equipment'),
    ('Labor - Regular', 'labor', 'Regular employee wages'),
    ('Labor - Seasonal', 'labor', 'Seasonal and temporary worker costs'),
    ('Equipment Rental', 'equipment', 'Cost of rented machinery and equipment'),
    ('Equipment Maintenance', 'equipment', 'Maintenance and repair costs'),
    ('Transportation', 'other', 'Transport and logistics costs'),
    ('Storage', 'other', 'Storage and warehousing costs')
) AS category(name, type, description)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';