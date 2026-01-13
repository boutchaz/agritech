/**
 * Standardized Types for Multi-Country Charts of Accounts
 *
 * Provides a consistent interface for all country-specific charts of accounts
 * while supporting agricultural accounting requirements and multi-language translations.
 */

/**
 * Accounting standards supported by the system
 */
export enum AccountingStandard {
  CGNC = 'CGNC',          // Morocco: Code Général de Normalisation Comptable
  PCG = 'PCG',            // France: Plan Comptable Général
  PCN = 'PCN',            // Tunisia: Plan Comptable National
  US_GAAP = 'US_GAAP',    // USA: Generally Accepted Accounting Principles
  FRS102 = 'FRS102',      // UK: Financial Reporting Standard 102
  HGB = 'HGB',            // Germany: Handelsgesetzbuch
  IFRS = 'IFRS',          // International Financial Reporting Standards
  OHADA = 'OHADA',        // West Africa: Organisation for the Harmonization of Business Law in Africa
}

/**
 * Core account types (basic accounting equation)
 */
export enum AccountType {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  REVENUE = 'Revenue',
  EXPENSE = 'Expense',
}

/**
 * Agricultural categories for specialized reporting and analysis
 */
export type AgriculturalCategory =
  | 'crop'           // Crops, plants, harvests
  | 'livestock'      // Animals, breeding, dairy
  | 'equipment'      // Machinery, tools, irrigation
  | 'land'           // Agricultural land, pastures
  | 'supplies'       // Seeds, fertilizers, feed, chemicals
  | 'labor'          // Wages, seasonal workers, contractors
  | 'general';       // Non-specific or overhead

/**
 * Inventory valuation methods for agricultural products
 */
export type InventoryValuationMethod =
  | 'FIFO'            // First In, First Out
  | 'LIFO'            // Last In, First Out
  | 'WEIGHTED_AVERAGE'; // Average cost method

/**
 * Language codes for translations (ISO 639-1)
 */
export type LanguageCode = 'en' | 'fr' | 'es' | 'ar' | 'de' | 'it' | 'pt';

/**
 * Translation map for account names and descriptions
 */
export interface AccountTranslations {
  en?: string;  // English
  fr?: string;  // French
  es?: string;  // Spanish
  ar?: string;  // Arabic
  de?: string;  // German
  it?: string;  // Italian
  pt?: string;  // Portuguese
}

/**
 * Tax rate configuration for a country
 */
export interface TaxRate {
  name: string;
  rate: number;  // Percentage (e.g., 20.0 for 20%)
  applies_to: ('sales' | 'purchases' | 'imports' | 'exports' | 'services')[];
  is_default: boolean;
  description?: string;
}

/**
 * Metadata about a country's chart of accounts
 */
export interface ChartMetadata {
  country_code: string;           // ISO 3166-1 alpha-2 (MA, FR, US, GB, DE)
  country_name: string;            // English name (e.g., "France")
  country_name_native: string;     // Native name (e.g., "France")
  accounting_standard: AccountingStandard;
  default_currency: string;        // ISO 4217 currency code (EUR, USD, MAD)
  fiscal_year_start_month: number; // Month (1-12) when fiscal year starts
  version: string;                 // Chart version (e.g., "1.0.0")
  description: string;             // Description of the chart
  supported_industries: string[];  // Agricultural industries supported
  requires_vat_registration: boolean;  // Is VAT registration required?
  standard_tax_rates: TaxRate[];   // Default tax rates for this country
}

/**
 * Individual account in the chart of accounts
 * Extends the basic AccountData interface with agricultural-specific fields
 */
export interface ChartAccount {
  code: string;                    // Account code (e.g., "701", "2331")
  name: string;                    // Primary account name (usually in local language)
  name_translations?: AccountTranslations;  // Multi-language names
  account_type: AccountType;       // Asset, Liability, Equity, Revenue, Expense
  account_subtype: string;         // Subtype for detailed classification
  is_group: boolean;               // True if this is a header/group account
  is_active: boolean;              // True if account is active for use
  parent_code?: string;            // Parent account code for hierarchy
  currency_code?: string;          // Optional: specific currency for this account
  description?: string;            // Description of the account
  description_translations?: AccountTranslations;  // Multi-language descriptions

  // Agricultural-specific fields
  agricultural_category?: AgriculturalCategory;  // Type of agricultural account
  inventory_valuation_method?: InventoryValuationMethod;  // For inventory accounts
  tax_deductible?: boolean;        // True if expenses are tax-deductible
  depreciation_rate?: number;      // Annual depreciation rate percentage (for fixed assets)
  contra_account?: boolean;        // True if this is a contra account (accumulated depreciation, etc.)
}

/**
 * Complete chart of accounts for a country
 */
export interface CountryChartOfAccounts {
  metadata: ChartMetadata;
  accounts: ChartAccount[];
}

/**
 * Legacy AccountData interface (for backward compatibility with existing Morocco chart)
 * Used by the moroccan-chart-of-accounts.ts file
 */
export interface AccountData {
  code: string;
  name: string;
  account_type: string;
  account_subtype: string;
  is_group: boolean;
  is_active: boolean;
  parent_code?: string;
  currency_code: string;
  description_fr?: string;
  description_ar?: string;
}

/**
 * Mapping of ISO country codes (alpha-2) to accounting standards
 */
export const COUNTRY_TO_STANDARD: Record<string, AccountingStandard> = {
  MA: AccountingStandard.CGNC,    // Morocco
  FR: AccountingStandard.PCG,     // France
  TN: AccountingStandard.PCN,     // Tunisia
  US: AccountingStandard.US_GAAP, // United States
  GB: AccountingStandard.FRS102,  // United Kingdom
  DE: AccountingStandard.HGB,     // Germany
};

/**
 * Mapping of country codes to default currencies
 */
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  MA: 'MAD',  // Moroccan Dirham
  FR: 'EUR',  // Euro
  TN: 'TND',  // Tunisian Dinar
  US: 'USD',  // US Dollar
  GB: 'GBP',  // British Pound
  DE: 'EUR',  // Euro
};

/**
 * Fiscal year start months by country
 */
export const COUNTRY_FISCAL_YEAR_START: Record<string, number> = {
  MA: 1,  // January (Morocco)
  FR: 1,  // January (France)
  TN: 1,  // January (Tunisia)
  US: 1,  // January (USA - varies by business)
  GB: 4,  // April (UK tax year)
  DE: 1,  // January (Germany)
};

/**
 * Helper function to convert AccountData to ChartAccount
 * For backward compatibility with existing Morocco chart
 */
export function toChartAccount(data: AccountData, currency: string = 'MAD'): ChartAccount {
  return {
    code: data.code,
    name: data.name,
    account_type: data.account_type as AccountType,
    account_subtype: data.account_subtype,
    is_group: data.is_group,
    is_active: data.is_active,
    parent_code: data.parent_code,
    currency_code: data.currency_code || currency,
    description: data.description_fr,
    name_translations: {
      fr: data.name,
      en: undefined,
      ar: data.description_ar,
    },
    description_translations: {
      fr: data.description_fr,
      ar: data.description_ar,
    },
  };
}

/**
 * Helper function to get all supported countries
 */
export function getSupportedCountries(): Array<{
  code: string;
  name: string;
  standard: AccountingStandard;
  currency: string;
}> {
  return [
    { code: 'MA', name: 'Morocco', standard: AccountingStandard.CGNC, currency: 'MAD' },
    { code: 'FR', name: 'France', standard: AccountingStandard.PCG, currency: 'EUR' },
    { code: 'TN', name: 'Tunisia', standard: AccountingStandard.PCN, currency: 'TND' },
    { code: 'US', name: 'United States', standard: AccountingStandard.US_GAAP, currency: 'USD' },
    { code: 'GB', name: 'United Kingdom', standard: AccountingStandard.FRS102, currency: 'GBP' },
    { code: 'DE', name: 'Germany', standard: AccountingStandard.HGB, currency: 'EUR' },
  ];
}
