export interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'fr-FR' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH', locale: 'ar-MA' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', locale: 'ar-TN' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', locale: 'ar-DZ' },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', locale: 'fr-FR' },
  { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA', locale: 'fr-FR' },
];

export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES.find(c => c.code === code);
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = getCurrency(currencyCode);
  if (!currency) {
    return `${amount} ${currencyCode}`;
  }

  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback if Intl.NumberFormat fails
    return `${currency.symbol}${amount.toFixed(2)}`;
  }
}

export function formatAmount(amount: number, currencySymbol: string): string {
  return `${amount.toFixed(2)} ${currencySymbol}`;
}