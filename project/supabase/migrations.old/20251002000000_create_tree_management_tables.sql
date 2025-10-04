-- Create tree_categories table
CREATE TABLE public.tree_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, category)
);

-- Create trees table (individual trees within categories)
CREATE TABLE public.trees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id uuid NOT NULL REFERENCES public.tree_categories(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(category_id, name)
);

-- Create plantation_types table
CREATE TABLE public.plantation_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type text NOT NULL,
    spacing text NOT NULL,
    trees_per_ha integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(organization_id, type, spacing)
);

-- Create indexes for better query performance
CREATE INDEX idx_tree_categories_org_id ON public.tree_categories(organization_id);
CREATE INDEX idx_trees_category_id ON public.trees(category_id);
CREATE INDEX idx_plantation_types_org_id ON public.plantation_types(organization_id);

-- Enable Row Level Security
ALTER TABLE public.tree_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantation_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tree_categories
CREATE POLICY "Users can view tree categories in their organization"
    ON public.tree_categories FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Admins and managers can insert tree categories"
    ON public.tree_categories FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
            AND is_active = true
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can update tree categories"
    ON public.tree_categories FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
            AND is_active = true
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can delete tree categories"
    ON public.tree_categories FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
            AND is_active = true
            AND role IN ('admin', 'manager')
        )
    );

-- RLS Policies for trees
CREATE POLICY "Users can view trees in their organization"
    ON public.trees FOR SELECT
    USING (
        category_id IN (
            SELECT id FROM public.tree_categories
            WHERE organization_id IN (
                SELECT organization_id
                FROM public.organization_users
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

CREATE POLICY "Admins and managers can insert trees"
    ON public.trees FOR INSERT
    WITH CHECK (
        category_id IN (
            SELECT id FROM public.tree_categories
            WHERE organization_id IN (
                SELECT organization_id
                FROM public.organization_users
                WHERE user_id = auth.uid()
                AND is_active = true
                AND role IN ('admin', 'manager')
            )
        )
    );

CREATE POLICY "Admins and managers can update trees"
    ON public.trees FOR UPDATE
    USING (
        category_id IN (
            SELECT id FROM public.tree_categories
            WHERE organization_id IN (
                SELECT organization_id
                FROM public.organization_users
                WHERE user_id = auth.uid()
                AND is_active = true
                AND role IN ('admin', 'manager')
            )
        )
    );

CREATE POLICY "Admins and managers can delete trees"
    ON public.trees FOR DELETE
    USING (
        category_id IN (
            SELECT id FROM public.tree_categories
            WHERE organization_id IN (
                SELECT organization_id
                FROM public.organization_users
                WHERE user_id = auth.uid()
                AND is_active = true
                AND role IN ('admin', 'manager')
            )
        )
    );

-- RLS Policies for plantation_types
CREATE POLICY "Users can view plantation types in their organization"
    ON public.plantation_types FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Admins and managers can insert plantation types"
    ON public.plantation_types FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
            AND is_active = true
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can update plantation types"
    ON public.plantation_types FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
            AND is_active = true
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can delete plantation types"
    ON public.plantation_types FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
            AND is_active = true
            AND role IN ('admin', 'manager')
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tree_categories_updated_at
    BEFORE UPDATE ON public.tree_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trees_updated_at
    BEFORE UPDATE ON public.trees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plantation_types_updated_at
    BEFORE UPDATE ON public.plantation_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
