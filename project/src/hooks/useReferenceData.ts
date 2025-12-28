import { useQuery } from '@tanstack/react-query';
import { referenceDataApi } from '../lib/api/reference-data';
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

export function useAllReferenceData() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['reference-data-all', currentOrganization?.id],
    queryFn: () => referenceDataApi.getAll(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useUnitsOfMeasure() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['units-of-measure', currentOrganization?.id],
    queryFn: () => referenceDataApi.getUnitsOfMeasure(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useQualityGrades() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['quality-grades', currentOrganization?.id],
    queryFn: () => referenceDataApi.getQualityGrades(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useHarvestStatuses() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['harvest-statuses', currentOrganization?.id],
    queryFn: () => referenceDataApi.getHarvestStatuses(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useIntendedUses() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['intended-uses', currentOrganization?.id],
    queryFn: () => referenceDataApi.getIntendedUses(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useUtilityTypes() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['utility-types', currentOrganization?.id],
    queryFn: () => referenceDataApi.getUtilityTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useInfrastructureTypes() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['infrastructure-types', currentOrganization?.id],
    queryFn: () => referenceDataApi.getInfrastructureTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useBasinShapes() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['basin-shapes', currentOrganization?.id],
    queryFn: () => referenceDataApi.getBasinShapes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function usePaymentMethods() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['payment-methods', currentOrganization?.id],
    queryFn: () => referenceDataApi.getPaymentMethods(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function usePaymentStatuses() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['payment-statuses', currentOrganization?.id],
    queryFn: () => referenceDataApi.getPaymentStatuses(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useTaskPriorities() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['task-priorities', currentOrganization?.id],
    queryFn: () => referenceDataApi.getTaskPriorities(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useWorkerTypes() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['worker-types', currentOrganization?.id],
    queryFn: () => referenceDataApi.getWorkerTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useMetayageTypes() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['metayage-types', currentOrganization?.id],
    queryFn: () => referenceDataApi.getMetayageTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useDocumentTypes() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['document-types', currentOrganization?.id],
    queryFn: () => referenceDataApi.getDocumentTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useCurrencies() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['currencies', currentOrganization?.id],
    queryFn: () => referenceDataApi.getCurrencies(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useTimezones() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['timezones', currentOrganization?.id],
    queryFn: () => referenceDataApi.getTimezones(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useLanguages() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['languages', currentOrganization?.id],
    queryFn: () => referenceDataApi.getLanguages(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useLabServiceCategories() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['lab-service-categories', currentOrganization?.id],
    queryFn: () => referenceDataApi.getLabServiceCategories(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useSoilTextures() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['soil-textures', currentOrganization?.id],
    queryFn: () => referenceDataApi.getSoilTextures(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useCostCategories() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['cost-categories', currentOrganization?.id],
    queryFn: () => referenceDataApi.getCostCategories(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useRevenueCategories() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['revenue-categories', currentOrganization?.id],
    queryFn: () => referenceDataApi.getRevenueCategories(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useSaleTypes() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['sale-types', currentOrganization?.id],
    queryFn: () => referenceDataApi.getSaleTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useExperienceLevels() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['experience-levels', currentOrganization?.id],
    queryFn: () => referenceDataApi.getExperienceLevels(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useSeasonalities() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['seasonalities', currentOrganization?.id],
    queryFn: () => referenceDataApi.getSeasonalities(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useDeliveryTypes() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['delivery-types', currentOrganization?.id],
    queryFn: () => referenceDataApi.getDeliveryTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}

export function useDeliveryStatuses() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['delivery-statuses', currentOrganization?.id],
    queryFn: () => referenceDataApi.getDeliveryStatuses(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
  });
}
