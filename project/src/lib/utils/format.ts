/**
 * Shared formatting utilities
 */

/**
 * Format a number as currency with proper locale support
 * @param amount - The numeric amount to format
 * @param symbol - Currency symbol (default: 'MAD')
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  symbol: string = 'MAD',
  locale: string = 'fr-FR'
): string => {
  return `${symbol} ${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Format a date to locale string
 * @param date - Date string or Date object
 * @param locale - Locale string (default: 'fr-FR')
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date,
  locale: string = 'fr-FR'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale);
};

/**
 * Format a number with thousands separators
 * @param value - The numeric value to format
 * @param locale - Locale string (default: 'fr-FR')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  locale: string = 'fr-FR',
  decimals: number = 2
): string => {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Format a percentage value
 * @param value - The numeric value (e.g., 0.123 for 12.3%)
 * @param locale - Locale string (default: 'fr-FR')
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercent = (
  value: number,
  locale: string = 'fr-FR',
  decimals: number = 1
): string => {
  return (value * 100).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }) + '%';
};
