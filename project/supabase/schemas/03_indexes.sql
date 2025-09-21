-- Database indexes for performance
-- This file creates indexes for better query performance

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);

-- Farms indexes
CREATE INDEX IF NOT EXISTS idx_farms_organization_id ON public.farms(organization_id);
CREATE INDEX IF NOT EXISTS idx_farms_name ON public.farms(name);

-- Parcels indexes
CREATE INDEX IF NOT EXISTS idx_parcels_farm_id ON public.parcels(farm_id);
CREATE INDEX IF NOT EXISTS idx_parcels_name ON public.parcels(name);

-- Test types indexes
CREATE INDEX IF NOT EXISTS idx_test_types_name ON public.test_types(name);

-- Soil analyses indexes
CREATE INDEX IF NOT EXISTS idx_soil_analyses_parcel_id ON public.soil_analyses(parcel_id);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_analysis_date ON public.soil_analyses(analysis_date);
CREATE INDEX IF NOT EXISTS idx_soil_analyses_test_type_id ON public.soil_analyses(test_type_id);

-- Structures indexes
CREATE INDEX IF NOT EXISTS idx_structures_organization_id ON public.structures(organization_id);
CREATE INDEX IF NOT EXISTS idx_structures_type ON public.structures(type);
CREATE INDEX IF NOT EXISTS idx_structures_condition ON public.structures(condition);
