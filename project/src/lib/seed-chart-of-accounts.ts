/**
 * Chart of Accounts Seeding Utility
 *
 * Automatically seeds the appropriate chart of accounts based on
 * organization's country and currency.
 */

import { supabase } from './supabase';

export type SupportedCountry = 'MAR' | 'FRA' | 'USA' | 'GBR' | 'DEU';
export type SupportedCurrency = 'MAD' | 'EUR' | 'USD' | 'GBP';

interface SeedResult {
  accountsCreated: number;
  success: boolean;
  message: string;
}

/**
 * Country to currency mapping
 */
const COUNTRY_CURRENCY_MAP: Record<SupportedCountry, SupportedCurrency> = {
  MAR: 'MAD', // Morocco → Moroccan Dirham
  FRA: 'EUR', // France → Euro
  USA: 'USD', // USA → US Dollar
  GBR: 'GBP', // UK → British Pound
  DEU: 'EUR', // Germany → Euro
};

/**
 * Country to seeding function mapping
 */
const SEED_FUNCTIONS: Record<SupportedCountry, string> = {
  MAR: 'seed_moroccan_chart_of_accounts',
  FRA: 'seed_french_chart_of_accounts',
  USA: 'seed_us_chart_of_accounts',
  GBR: 'seed_uk_chart_of_accounts',
  DEU: 'seed_german_chart_of_accounts',
};

/**
 * Get the default currency for a country
 */
export function getDefaultCurrency(countryCode: SupportedCountry): SupportedCurrency {
  return COUNTRY_CURRENCY_MAP[countryCode] || 'EUR';
}

/**
 * Check if a country is supported for chart of accounts seeding
 */
export function isCountrySupported(countryCode: string): countryCode is SupportedCountry {
  return Object.keys(SEED_FUNCTIONS).includes(countryCode);
}

/**
 * Seed chart of accounts for an organization
 *
 * @param organizationId - The organization UUID
 * @param countryCode - ISO 3166-1 alpha-3 country code
 * @param currency - Optional currency code (defaults to country's currency)
 * @returns Result object with accounts created count and success status
 */
export async function seedChartOfAccounts(
  organizationId: string,
  countryCode: SupportedCountry,
  currency?: SupportedCurrency
): Promise<SeedResult> {
  try {
    // Validate country support
    if (!isCountrySupported(countryCode)) {
      return {
        accountsCreated: 0,
        success: false,
        message: `Country ${countryCode} is not supported yet. Supported countries: ${Object.keys(SEED_FUNCTIONS).join(', ')}`,
      };
    }

    // Get the appropriate seeding function
    const seedFunction = SEED_FUNCTIONS[countryCode];

    // Call the database function
    const { data, error } = await supabase.rpc(seedFunction, {
      p_org_id: organizationId,
    });

    if (error) {
      console.error(`Error seeding chart of accounts for ${countryCode}:`, error);
      return {
        accountsCreated: 0,
        success: false,
        message: error.message,
      };
    }

    // The RPC returns a single row with our result
    const result = Array.isArray(data) ? data[0] : data;

    return {
      accountsCreated: result.accounts_created || 0,
      success: result.success || false,
      message: result.message || 'Chart of accounts seeded successfully',
    };
  } catch (error) {
    console.error('Error in seedChartOfAccounts:', error);
    return {
      accountsCreated: 0,
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if an organization already has accounts
 */
export async function hasExistingAccounts(organizationId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .limit(1);

    if (error) {
      console.error('Error checking for existing accounts:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error('Error in hasExistingAccounts:', error);
    return false;
  }
}

/**
 * Automatically seed chart of accounts for a new organization
 *
 * This should be called after organization creation, typically in onboarding
 */
export async function autoSeedChartOfAccounts(
  organizationId: string,
  countryCode: string,
  currencyCode?: string
): Promise<SeedResult> {
  try {
    // Check if accounts already exist
    const hasAccounts = await hasExistingAccounts(organizationId);
    if (hasAccounts) {
      return {
        accountsCreated: 0,
        success: true,
        message: 'Organization already has accounts configured',
      };
    }

    // Normalize country code to ISO 3166-1 alpha-3
    const normalizedCountry = normalizeCountryCode(countryCode);

    if (!normalizedCountry || !isCountrySupported(normalizedCountry)) {
      // If country not supported, use Morocco as default
      console.warn(`Country ${countryCode} not supported, using Morocco as default`);
      return await seedChartOfAccounts(organizationId, 'MAR', currencyCode as SupportedCurrency);
    }

    // Use the appropriate chart for the country
    const currency = (currencyCode as SupportedCurrency) || getDefaultCurrency(normalizedCountry);
    return await seedChartOfAccounts(organizationId, normalizedCountry, currency);
  } catch (error) {
    console.error('Error in autoSeedChartOfAccounts:', error);
    return {
      accountsCreated: 0,
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Normalize country code to ISO 3166-1 alpha-3
 */
function normalizeCountryCode(code: string): SupportedCountry | null {
  const normalized = code.toUpperCase();

  // Direct match
  if (isCountrySupported(normalized)) {
    return normalized as SupportedCountry;
  }

  // Convert alpha-2 to alpha-3
  const ALPHA2_TO_ALPHA3: Record<string, SupportedCountry> = {
    MA: 'MAR',
    FR: 'FRA',
    US: 'USA',
    GB: 'GBR',
    DE: 'DEU',
  };

  return ALPHA2_TO_ALPHA3[normalized] || null;
}

/**
 * Get human-readable name for a country code
 */
export function getCountryName(countryCode: SupportedCountry): string {
  const COUNTRY_NAMES: Record<SupportedCountry, string> = {
    MAR: 'Morocco',
    FRA: 'France',
    USA: 'United States',
    GBR: 'United Kingdom',
    DEU: 'Germany',
  };

  return COUNTRY_NAMES[countryCode] || countryCode;
}

/**
 * Get the chart of accounts name for a country
 */
export function getChartName(countryCode: SupportedCountry): string {
  const CHART_NAMES: Record<SupportedCountry, string> = {
    MAR: 'Plan Comptable Marocain (CGNC)',
    FRA: 'Plan Comptable Général (PCG)',
    USA: 'GAAP Standard Chart of Accounts',
    GBR: 'UK GAAP Chart of Accounts',
    DEU: 'HGB Chart of Accounts',
  };

  return CHART_NAMES[countryCode] || 'Standard Chart of Accounts';
}
