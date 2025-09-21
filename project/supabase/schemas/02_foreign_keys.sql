-- Foreign key constraints
-- This file defines all foreign key relationships

-- Farms foreign keys
ALTER TABLE public.farms
ADD CONSTRAINT farms_organization_id_fkey
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Parcels foreign keys
ALTER TABLE public.parcels
ADD CONSTRAINT parcels_farm_id_fkey
FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;

-- Soil analyses foreign keys
ALTER TABLE public.soil_analyses
ADD CONSTRAINT soil_analyses_parcel_id_fkey
FOREIGN KEY (parcel_id) REFERENCES public.parcels(id) ON DELETE CASCADE;

ALTER TABLE public.soil_analyses
ADD CONSTRAINT soil_analyses_test_type_id_fkey
FOREIGN KEY (test_type_id) REFERENCES public.test_types(id) ON DELETE SET NULL;

-- Structures foreign keys
ALTER TABLE public.structures
ADD CONSTRAINT structures_organization_id_fkey
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
