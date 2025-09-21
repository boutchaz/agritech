-- Create structures table for infrastructure management
-- This migration creates the structures table for farm infrastructure

-- Create structures table
CREATE TABLE IF NOT EXISTS public.structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('stable', 'technical_room', 'basin', 'well')),
    location JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}',
    installation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
    usage TEXT,
    structure_details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint to organizations
ALTER TABLE public.structures
ADD CONSTRAINT structures_organization_id_fkey
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_structures_organization_id ON public.structures(organization_id);
CREATE INDEX IF NOT EXISTS idx_structures_type ON public.structures(type);
CREATE INDEX IF NOT EXISTS idx_structures_condition ON public.structures(condition);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.structures
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.structures TO authenticated, service_role;
GRANT SELECT ON public.structures TO anon;

-- Insert sample data
INSERT INTO public.structures (organization_id, name, type, location, installation_date, condition, usage, structure_details) VALUES
    ('123e4567-e89b-12d3-a456-426614174000', 'Écurie Principale', 'stable', '{"lat": 36.8065, "lng": 10.1815}', '2023-01-15', 'good', 'Élevage bovin', '{"width": 20, "length": 15, "height": 4, "construction_type": "concrete"}'),
    ('123e4567-e89b-12d3-a456-426614174000', 'Local Technique', 'technical_room', '{"lat": 36.8067, "lng": 10.1817}', '2023-02-20', 'excellent', 'Stockage équipements', '{"width": 8, "length": 6, "height": 3, "equipment": ["Générateur", "Pompe à eau", "Outils agricoles"]}'),
    ('123e4567-e89b-12d3-a456-426614174000', 'Bassin de Stockage', 'basin', '{"lat": 36.8063, "lng": 10.1813}', '2023-03-10', 'good', 'Irrigation', '{"shape": "rectangular", "dimensions": {"width": 10, "length": 8, "height": 2}, "volume": 160}'),
    ('123e4567-e89b-12d3-a456-426614174000', 'Puits Artésien', 'well', '{"lat": 36.8061, "lng": 10.1811}', '2023-04-05', 'excellent', 'Approvisionnement eau', '{"depth": 45, "pump_type": "submersible", "pump_power": 5.5, "condition": "excellent"}')
ON CONFLICT (id) DO NOTHING;
