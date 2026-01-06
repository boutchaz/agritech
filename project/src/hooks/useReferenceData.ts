import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { referenceDataApi } from '../lib/api/reference-data';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { localizeItems } from '../lib/utils/localization';

/**
 * Hook to fetch soil types from Strapi CMS
 * Data is automatically localized based on current i18n language
 */
export function useSoilTypes() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return useQuery({
    queryKey: ['soil-types', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getSoilTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

/**
 * Hook to fetch irrigation types from Strapi CMS
 * Data is automatically localized based on current i18n language
 */
export function useIrrigationTypes() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return useQuery({
    queryKey: ['irrigation-types', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getIrrigationTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

/**
 * Hook to fetch crop categories from Strapi CMS
 * Data is automatically localized based on current i18n language
 */
export function useCropCategories() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return useQuery({
    queryKey: ['crop-categories', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getCropCategories(currentOrganization?.id),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes (reduced to allow faster updates after CMS changes)
    enabled: !!currentOrganization,
    select: (data) => {
      const localized = localizeItems(data as unknown as Record<string, unknown>[], locale);
      // Deduplicate by value to prevent duplicates even if they exist in CMS
      // This ensures that even if CMS has duplicate entries with same value but different IDs,
      // we only show one in the frontend
      const deduplicationMap: Record<string, typeof localized[0]> = {};
      localized.forEach(cat => {
        const catValue = (cat as { value?: string }).value || '';
        if (catValue && !deduplicationMap[catValue]) {
          deduplicationMap[catValue] = cat;
        }
      });
      return Object.values(deduplicationMap) as unknown as typeof data;
    },
  });
}

/**
 * Hook to fetch crop types from Strapi CMS
 * Data is automatically localized based on current i18n language
 * @param categoryId - Optional category ID to filter by
 */
export function useCropTypes(categoryId?: string) {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return useQuery({
    queryKey: ['crop-types', categoryId, currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getCropTypes(categoryId, currentOrganization?.id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

/**
 * Hook to fetch varieties from Strapi CMS
 * Data is automatically localized based on current i18n language
 * @param cropTypeId - Optional crop type ID to filter by
 */
export function useVarieties(cropTypeId?: string) {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return useQuery({
    queryKey: ['varieties', cropTypeId, currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getVarieties(cropTypeId, currentOrganization?.id),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

/**
 * Hook to fetch all reference data from Strapi CMS
 * Data is automatically localized based on current i18n language
 */
export function useAllReferenceData() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;

  return useQuery({
    queryKey: ['reference-data-all', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getAll(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => {
      // Localize each category of reference data
      const result: Record<string, unknown[]> = {};
      for (const [key, items] of Object.entries(data)) {
        if (Array.isArray(items)) {
          result[key] = localizeItems(items as Record<string, unknown>[], locale);
        } else {
          result[key] = items;
        }
      }
      return result;
    },
  });
}

export function useUnitsOfMeasure() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['units-of-measure', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getUnitsOfMeasure(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useQualityGrades() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['quality-grades', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getQualityGrades(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useHarvestStatuses() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['harvest-statuses', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getHarvestStatuses(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useIntendedUses() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['intended-uses', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getIntendedUses(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useUtilityTypes() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['utility-types', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getUtilityTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useInfrastructureTypes() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['infrastructure-types', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getInfrastructureTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useBasinShapes() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['basin-shapes', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getBasinShapes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function usePaymentMethods() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['payment-methods', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getPaymentMethods(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function usePaymentStatuses() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['payment-statuses', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getPaymentStatuses(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useTaskPriorities() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['task-priorities', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getTaskPriorities(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useWorkerTypes() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['worker-types', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getWorkerTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useMetayageTypes() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['metayage-types', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getMetayageTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useDocumentTypes() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['document-types', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getDocumentTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useCurrencies() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['currencies', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getCurrencies(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useTimezones() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['timezones', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getTimezones(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useLanguages() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['languages', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getLanguages(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useLabServiceCategories() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['lab-service-categories', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getLabServiceCategories(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useSoilTextures() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['soil-textures', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getSoilTextures(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useCostCategories() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['cost-categories', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getCostCategories(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useRevenueCategories() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['revenue-categories', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getRevenueCategories(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useSaleTypes() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['sale-types', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getSaleTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useExperienceLevels() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['experience-levels', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getExperienceLevels(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useSeasonalities() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['seasonalities', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getSeasonalities(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useDeliveryTypes() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['delivery-types', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getDeliveryTypes(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}

export function useDeliveryStatuses() {
  const { currentOrganization } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useQuery({
    queryKey: ['delivery-statuses', currentOrganization?.id, locale],
    queryFn: () => referenceDataApi.getDeliveryStatuses(currentOrganization?.id),
    staleTime: 1000 * 60 * 60,
    enabled: !!currentOrganization,
    select: (data) => localizeItems(data, locale),
  });
}
