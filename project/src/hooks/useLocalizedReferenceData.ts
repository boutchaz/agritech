import { useTranslation } from 'react-i18next';
import { useMemo, useCallback } from 'react';
import { getLocalizedField, getLocalizedName, localizeItems } from '@/lib/utils/localization';

/**
 * Hook to get localization helpers for reference data
 *
 * @example
 * const { locale, getLocalizedName, localizeItems } = useLocalizedReferenceData();
 *
 * // In a select dropdown:
 * const options = localizeItems(soilTypes).map(st => ({
 *   value: st.id,
 *   label: st.name // Already localized
 * }));
 *
 * // Or access directly:
 * const label = getLocalizedName(soilType);
 */
export function useLocalizedReferenceData() {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  const getField = useCallback(
    <T extends Record<string, unknown>>(item: T, field: string): string => {
      return getLocalizedField(item, field, locale);
    },
    [locale]
  );

  const getName = useCallback(
    <T extends Record<string, unknown>>(item: T): string => {
      return getLocalizedName(item, locale);
    },
    [locale]
  );

  const localize = useCallback(
    <T extends Record<string, unknown>>(items: T[]): T[] => {
      return localizeItems(items, locale);
    },
    [locale]
  );

  return useMemo(
    () => ({
      locale,
      getLocalizedField: getField,
      getLocalizedName: getName,
      localizeItems: localize,
    }),
    [locale, getField, getName, localize]
  );
}

export default useLocalizedReferenceData;
