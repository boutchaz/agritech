/**
 * Localization utilities for reference data from Strapi
 *
 * Strapi reference data content types store translations in the same record
 * with fields like: name, name_fr, name_ar, description, description_fr, description_ar
 *
 * This helper selects the correct field based on the current locale.
 */

type LocaleCode = 'en' | 'fr' | 'ar';

/**
 * Get the localized value of a field from a reference data object
 * Falls back to the default (English) value if translation is not available
 *
 * @param item - The reference data object
 * @param field - The base field name (e.g., 'name', 'description')
 * @param locale - The current locale ('en', 'fr', 'ar')
 * @returns The localized value or the default value
 *
 * @example
 * const soilType = { name: 'Sandy', name_fr: 'Sableux', name_ar: 'رملي' };
 * getLocalizedField(soilType, 'name', 'fr'); // Returns 'Sableux'
 * getLocalizedField(soilType, 'name', 'en'); // Returns 'Sandy'
 */
export function getLocalizedField<T extends Record<string, unknown>>(
  item: T,
  field: string,
  locale: string
): string {
  if (!item) return '';

  const normalizedLocale = locale as LocaleCode;

  // For English, use the base field
  if (normalizedLocale === 'en') {
    return (item[field] as string) || '';
  }

  // For other locales, try the localized field first, fall back to base
  const localizedFieldName = `${field}_${normalizedLocale}`;
  const localizedValue = item[localizedFieldName] as string;

  // Return localized value if available, otherwise fall back to base field
  return localizedValue || (item[field] as string) || '';
}

/**
 * Get the localized name from a reference data object
 * Shorthand for getLocalizedField(item, 'name', locale)
 */
export function getLocalizedName<T extends Record<string, unknown>>(
  item: T,
  locale: string
): string {
  return getLocalizedField(item, 'name', locale);
}

/**
 * Get the localized description from a reference data object
 * Shorthand for getLocalizedField(item, 'description', locale)
 */
export function getLocalizedDescription<T extends Record<string, unknown>>(
  item: T,
  locale: string
): string {
  return getLocalizedField(item, 'description', locale);
}

/**
 * Transform a reference data object to use localized values as the main fields
 * This creates a new object with 'name' and 'description' set to the correct locale
 *
 * @param item - The reference data object
 * @param locale - The current locale
 * @returns A new object with localized values
 *
 * @example
 * const soilType = { id: '1', name: 'Sandy', name_fr: 'Sableux', description: 'Sandy soil' };
 * localizeItem(soilType, 'fr');
 * // Returns: { id: '1', name: 'Sableux', name_fr: 'Sableux', description: 'Sandy soil', ... }
 */
export function localizeItem<T extends Record<string, unknown>>(
  item: T,
  locale: string
): T {
  if (!item) return item;

  const result = { ...item };

  // Localize common translatable fields
  const translatableFields = ['name', 'description'];

  for (const field of translatableFields) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = getLocalizedField(item, field, locale);
    }
  }

  return result;
}

/**
 * Transform an array of reference data objects to use localized values
 *
 * @param items - Array of reference data objects
 * @param locale - The current locale
 * @returns Array of objects with localized values
 */
export function localizeItems<T extends Record<string, unknown>>(
  items: T[],
  locale: string
): T[] {
  if (!items || !Array.isArray(items)) return items;
  return items.map(item => localizeItem(item, locale));
}
