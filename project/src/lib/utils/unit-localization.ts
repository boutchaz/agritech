import { DEFAULT_WORK_UNITS } from '@/types/work-units';

/**
 * Returns a localized unit label for the given unit code and language.
 * Falls back to lowercased code if the unit is not found in DEFAULT_WORK_UNITS.
 */
export function localizeUnit(code: string | undefined, lang: string): string {
  if (!code) return '';
  const found = DEFAULT_WORK_UNITS.find((u) => u.code === code.toUpperCase());
  if (!found) return code.toLowerCase();
  const l = lang.slice(0, 2);
  if (l === 'fr') return found.name_fr ?? code.toLowerCase();
  if (l === 'ar') return found.name_ar ?? code.toLowerCase();
  return found.name;
}
