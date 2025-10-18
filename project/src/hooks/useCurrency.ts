import { useMemo } from 'react';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { formatCurrency, getCurrency } from '../utils/currencies';

/**
 * Custom hook for currency formatting synced with organization settings
 * Provides consistent currency formatting across the entire application
 */
export function useCurrency() {
  const { currentOrganization } = useAuth();

  // Get organization currency or default to EUR
  const currencyCode = currentOrganization?.currency || 'EUR';
  const currency = getCurrency(currencyCode);

  // Memoized formatter function
  const format = useMemo(() => {
    return (amount: number): string => {
      return formatCurrency(amount, currencyCode);
    };
  }, [currencyCode]);

  // Format with custom options
  const formatWithOptions = useMemo(() => {
    return (
      amount: number,
      options?: Intl.NumberFormatOptions
    ): string => {
      if (!currency) {
        return `${amount} ${currencyCode}`;
      }

      try {
        return new Intl.NumberFormat(currency.locale, {
          style: 'currency',
          currency: currency.code,
          ...options,
        }).format(amount);
      } catch (_error) {
        return `${currency.symbol}${amount.toFixed(2)}`;
      }
    };
  }, [currency, currencyCode]);

  return {
    /** Current currency code (e.g., 'EUR', 'USD') */
    currencyCode,
    /** Currency object with code, name, symbol, locale */
    currency,
    /** Format amount with current organization currency */
    format,
    /** Format amount with custom Intl.NumberFormat options */
    formatWithOptions,
    /** Currency symbol (e.g., '€', '$') */
    symbol: currency?.symbol || currencyCode,
  };
}
