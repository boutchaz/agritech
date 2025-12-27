import { useQuery } from '@tanstack/react-query';
import { referenceDataApi, type SoilType, type IrrigationType, type CropCategory, type CropType, type Variety } from '../lib/api/reference-data';
import { useAuth } from '../components/MultiTenantAuthProvider';

/**
 * Hook to fetch soil types from Strapi CMS
 */
export function useSoilTypes() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['soil-types', currentOrganization?.id],
    queryFn: () => referenceDataApi.getSoilTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: !!currentOrganization,
  });
}

/**
 * Hook to fetch irrigation types from Strapi CMS
 */
export function useIrrigationTypes() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['irrigation-types', currentOrganization?.id],
    queryFn: () => referenceDataApi.getIrrigationTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: !!currentOrganization,
  });
}

/**
 * Hook to fetch crop categories from Strapi CMS
 */
export function useCropCategories() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['crop-categories', currentOrganization?.id],
    queryFn: () => referenceDataApi.getCropCategories(currentOrganization?.id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: !!currentOrganization,
  });
}

/**
 * Hook to fetch crop types from Strapi CMS
 * @param categoryId - Optional category ID to filter by
 */
export function useCropTypes(categoryId?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['crop-types', categoryId, currentOrganization?.id],
    queryFn: () => referenceDataApi.getCropTypes(categoryId, currentOrganization?.id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: !!currentOrganization,
  });
}

/**
 * Hook to fetch varieties from Strapi CMS
 * @param cropTypeId - Optional crop type ID to filter by
 */
export function useVarieties(cropTypeId?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['varieties', cropTypeId, currentOrganization?.id],
    queryFn: () => referenceDataApi.getVarieties(cropTypeId, currentOrganization?.id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: !!currentOrganization,
  });
}

/**
 * Hook to fetch all reference data at once
 */
export function useAllReferenceData() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['reference-data-all', currentOrganization?.id],
    queryFn: () => referenceDataApi.getAll(currentOrganization?.id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: !!currentOrganization,
  });
}
