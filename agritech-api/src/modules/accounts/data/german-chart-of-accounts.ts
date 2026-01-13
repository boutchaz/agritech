/**
 * German Chart of Accounts (HGB - Handelsgesetzbuch)
 *
 * German Commercial Code accounting standard with agricultural-specific accounts
 *
 * Key Features:
 * - 4-digit account codes (0000-9999)
 * - Class 0: Assets (Vermögen)
 * - Class 1-2: Liabilities (Schulden)
 * - Class 3-4: Income/Earnings (Erträge)
 * - Class 5-6: Expenses (Aufwendungen)
 * - Class 7-8: Statistics (Statistik)
 * - Class 9: Closing accounts (Abschlusskonten)
 *
 * VAT Rates:
 * - Standard: 19% (Mehrwertsteuer)
 * - Reduced: 7% (ermäßigt)
 */

import {
  CountryChartOfAccounts,
  ChartAccount,
  ChartMetadata,
  AccountType,
  AgriculturalCategory,
  AccountingStandard,
} from './types';

/**
 * Helper function to create a chart account with default values
 */
function acc(
  code: string,
  name: string,
  type: AccountType,
  subtype: string,
  isGroup: boolean,
  options?: {
    parent?: string;
    agriCategory?: AgriculturalCategory;
    description?: string;
    deName?: string;
    enName?: string;
    depreciationRate?: number;
    taxDeductible?: boolean;
    contraAccount?: boolean;
  }
): ChartAccount {
  const account: ChartAccount = {
    code,
    name,
    account_type: type,
    account_subtype: subtype,
    is_group: isGroup,
    is_active: true,
    parent_code: options?.parent,
    agricultural_category: options?.agriCategory,
    description: options?.description,
    depreciation_rate: options?.depreciationRate,
    tax_deductible: options?.taxDeductible,
    contra_account: options?.contraAccount,
    name_translations: {
      de: options?.deName || name,
      en: options?.enName || name,
      fr: undefined,
      es: undefined,
      ar: undefined,
    },
  };

  return account;
}

/**
 * German Chart of Accounts Metadata
 */
export const germanChartMetadata: ChartMetadata = {
  country_code: 'DE',
  country_name: 'Germany',
  country_name_native: 'Deutschland',
  accounting_standard: AccountingStandard.HGB,
  default_currency: 'EUR',
  fiscal_year_start_month: 1,
  version: '1.0.0',
  description: 'German Chart of Accounts (HGB) with agricultural-specific accounts for farming, livestock, and crop production',
  supported_industries: ['agriculture', 'livestock', 'dairy', 'viticulture', 'horticulture', 'forestry'],
  requires_vat_registration: true,
  standard_tax_rates: [
    {
      name: 'Mehrwertsteuer Normal',
      rate: 19.0,
      applies_to: ['sales', 'purchases', 'services'],
      is_default: true,
      description: 'Standard VAT rate in Germany',
    },
    {
      name: 'Mehrwertsteuer Ermäßigt',
      rate: 7.0,
      applies_to: ['sales', 'purchases'],
      is_default: false,
      description: 'Reduced VAT rate for food, books, transport',
    },
  ],
};

/**
 * German Chart of Accounts (HGB)
 * Agricultural-focused with comprehensive coverage
 */
export const germanChartOfAccounts: CountryChartOfAccounts = {
  metadata: germanChartMetadata,
  accounts: [
    // ============================================================
    // CLASS 0: ASSETS (VERMÖGEN)
    // ============================================================

    // 0xxx: Current Assets (Umlaufvermögen)
    acc('0100', 'Umlaufvermögen', AccountType.ASSET, 'Current Assets', true, {
      deName: 'Umlaufvermögen',
      enName: 'Current Assets',
    }),

    // Cash and Cash Equivalents
    acc('1000', 'Kasse', AccountType.ASSET, 'Cash', true, {
      parent: '0100',
      deName: 'Kasse',
      enName: 'Cash on Hand',
    }),
    acc('1001', 'Kassengeld', AccountType.ASSET, 'Petty Cash', false, {
      parent: '1000',
      deName: 'Kassengeld',
      enName: 'Petty Cash',
    }),
    acc('1200', 'Bankkonten', AccountType.ASSET, 'Bank Accounts', true, {
      parent: '0100',
      deName: 'Bankkonten',
      enName: 'Bank Accounts',
    }),
    acc('1201', 'Geschäftsbankkonto', AccountType.ASSET, 'Business Checking', false, {
      parent: '1200',
      deName: 'Geschäftskonto',
      enName: 'Business Checking Account',
    }),
    acc('1202', 'Sparkonto', AccountType.ASSET, 'Savings Account', false, {
      parent: '1200',
      deName: 'Sparkonto',
      enName: 'Savings Account',
    }),

    // Accounts Receivable
    acc('1300', 'Forderungen', AccountType.ASSET, 'Receivables', true, {
      parent: '0100',
      deName: 'Forderungen',
      enName: 'Receivables',
    }),
    acc('1301', 'Forderungen aus Landwirtschaft', AccountType.ASSET, 'Agricultural Receivables', false, {
      parent: '1300',
      agriCategory: 'crop',
      deName: 'Forderungen aus Landwirtschaft',
      enName: 'Agricultural Receivables',
    }),
    acc('1400', 'Forderungen aus Lieferungen und Leistungen', AccountType.ASSET, 'Trade Receivables', true, {
      parent: '1300',
      deName: 'Forderungen aus Lieferungen und Leistungen',
      enName: 'Trade Receivables',
    }),
    acc('1401', 'Forderungen aus Landverkäufen', AccountType.ASSET, 'Land Sale Receivables', false, {
      parent: '1400',
      agriCategory: 'land',
      deName: 'Forderungen aus Landverkäufen',
      enName: 'Land Sale Receivables',
    }),

    // Inventory (Vorräte)
    acc('1500', 'Vorräte', AccountType.ASSET, 'Inventory', true, {
      parent: '0100',
      deName: 'Vorräte',
      enName: 'Inventory',
    }),
    acc('1501', 'Landwirtschaftliche Vorräte', AccountType.ASSET, 'Agricultural Inventory', false, {
      parent: '1500',
      agriCategory: 'supplies',
      deName: 'Landwirtschaftliche Vorräte',
      enName: 'Agricultural Inventory',
    }),
    acc('1600', 'Vorräte an Saatgut', AccountType.ASSET, 'Seed Inventory', true, {
      parent: '1500',
      agriCategory: 'supplies',
      deName: 'Saatgutvorräte',
      enName: 'Seed Inventory',
    }),
    acc('1601', 'Getreidesaatgut', AccountType.ASSET, 'Cereal Seed Stock', false, {
      parent: '1600',
      agriCategory: 'crop',
      deName: 'Getreidesaatgut',
      enName: 'Cereal Seed Stock',
    }),
    acc('1602', 'Maissaatgut', AccountType.ASSET, 'Corn Seed Stock', false, {
      parent: '1600',
      agriCategory: 'crop',
      deName: 'Maissaatgut',
      enName: 'Corn Seed Stock',
    }),
    acc('1700', 'Vorräte an Düngemitteln', AccountType.ASSET, 'Fertilizer Inventory', true, {
      parent: '1500',
      agriCategory: 'supplies',
      deName: 'Düngemittelvorräte',
      enName: 'Fertilizer Inventory',
    }),
    acc('1701', 'Stickstoffdünger', AccountType.ASSET, 'Nitrogen Fertilizer Stock', false, {
      parent: '1700',
      agriCategory: 'supplies',
      deName: 'Stickstoffdünger',
      enName: 'Nitrogen Fertilizer Stock',
    }),
    acc('1702', 'Organische Düngemittel', AccountType.ASSET, 'Organic Fertilizer Stock', false, {
      parent: '1700',
      agriCategory: 'supplies',
      deName: 'Organische Düngemittel',
      enName: 'Organic Fertilizer Stock',
    }),
    acc('1800', 'Vorräte an Pflanzenschutzmitteln', AccountType.ASSET, 'Crop Protection Inventory', true, {
      parent: '1500',
      agriCategory: 'supplies',
      deName: 'Pflanzenschutzmittelvorräte',
      enName: 'Crop Protection Inventory',
    }),
    acc('1801', 'Herbizide', AccountType.ASSET, 'Herbicide Stock', false, {
      parent: '1800',
      agriCategory: 'supplies',
      deName: 'Herbizidvorräte',
      enName: 'Herbicide Stock',
    }),
    acc('1802', 'Insektizide', AccountType.ASSET, 'Insecticide Stock', false, {
      parent: '1800',
      agriCategory: 'supplies',
      deName: 'Insektizidvorräte',
      enName: 'Insecticide Stock',
    }),
    acc('1900', 'Futtermittelvorräte', AccountType.ASSET, 'Feed Inventory', true, {
      parent: '1500',
      agriCategory: 'livestock',
      deName: 'Futtermittelvorräte',
      enName: 'Feed Inventory',
    }),
    acc('1901', 'Kraftfutter', AccountType.ASSET, 'Concentrate Feed Stock', false, {
      parent: '1900',
      agriCategory: 'livestock',
      deName: 'Kraftfuttervorräte',
      enName: 'Concentrate Feed Stock',
    }),
    acc('1902', 'Raufutter', AccountType.ASSET, 'Roughage Stock', false, {
      parent: '1900',
      agriCategory: 'livestock',
      deName: 'Raufuttervorräte',
      enName: 'Roughage Stock',
    }),

    // Crop Inventory (Erntevorräte)
    acc('2000', 'Erntevorräte', AccountType.ASSET, 'Harvest Inventory', true, {
      parent: '0100',
      agriCategory: 'crop',
      deName: 'Erntevorräte',
      enName: 'Harvest Inventory',
    }),
    acc('2001', 'Getreidevorräte', AccountType.ASSET, 'Cereal Stock', false, {
      parent: '2000',
      agriCategory: 'crop',
      deName: 'Getreidevorräte',
      enName: 'Cereal Stock',
    }),
    acc('2002', 'Weizenlager', AccountType.ASSET, 'Wheat Storage', false, {
      parent: '2001',
      agriCategory: 'crop',
      deName: 'Weizenlager',
      enName: 'Wheat Storage',
    }),
    acc('2003', 'Gerstenlager', AccountType.ASSET, 'Barley Storage', false, {
      parent: '2001',
      agriCategory: 'crop',
      deName: 'Gerstenlager',
      enName: 'Barley Storage',
    }),
    acc('2010', 'Maisvorräte', AccountType.ASSET, 'Corn Stock', false, {
      parent: '2000',
      agriCategory: 'crop',
      deName: 'Maisvorräte',
      enName: 'Corn Stock',
    }),
    acc('2020', 'Kartoffellager', AccountType.ASSET, 'Potato Storage', false, {
      parent: '2000',
      agriCategory: 'crop',
      deName: 'Kartoffellager',
      enName: 'Potato Storage',
    }),
    acc('2030', 'Rübenlager', AccountType.ASSET, 'Beet Storage', false, {
      parent: '2000',
      agriCategory: 'crop',
      deName: 'Rübenlager',
      enName: 'Sugar Beet Storage',
    }),
    acc('2040', 'Gemüsevorräte', AccountType.ASSET, 'Vegetable Stock', false, {
      parent: '2000',
      agriCategory: 'crop',
      deName: 'Gemüsevorräte',
      enName: 'Vegetable Stock',
    }),
    acc('2050', 'Obstvorräte', AccountType.ASSET, 'Fruit Stock', false, {
      parent: '2000',
      agriCategory: 'crop',
      deName: 'Obstvorräte',
      enName: 'Fruit Stock',
    }),

    // Livestock Inventory (Tierbestand)
    acc('2100', 'Tierbestand', AccountType.ASSET, 'Livestock Inventory', true, {
      parent: '0100',
      agriCategory: 'livestock',
      deName: 'Tierbestand',
      enName: 'Livestock Inventory',
    }),
    acc('2101', 'Rinderbestand', AccountType.ASSET, 'Cattle Herd', false, {
      parent: '2100',
      agriCategory: 'livestock',
      deName: 'Rinderbestand',
      enName: 'Cattle Herd',
    }),
    acc('2102', 'Milchkühe', AccountType.ASSET, 'Dairy Cows', false, {
      parent: '2101',
      agriCategory: 'livestock',
      deName: 'Milchkühe',
      enName: 'Dairy Cows',
    }),
    acc('2103', 'Mastbullen', AccountType.ASSET, 'Fattening Bulls', false, {
      parent: '2101',
      agriCategory: 'livestock',
      deName: 'Mastbullen',
      enName: 'Fattening Bulls',
    }),
    acc('2110', 'Schweinebestand', AccountType.ASSET, 'Swine Herd', false, {
      parent: '2100',
      agriCategory: 'livestock',
      deName: 'Schweinebestand',
      enName: 'Swine Herd',
    }),
    acc('2111', 'Mastschweine', AccountType.ASSET, 'Fattening Pigs', false, {
      parent: '2110',
      agriCategory: 'livestock',
      deName: 'Mastschweine',
      enName: 'Fattening Pigs',
    }),
    acc('2120', 'Geflügelbestand', AccountType.ASSET, 'Poultry Flock', false, {
      parent: '2100',
      agriCategory: 'livestock',
      deName: 'Geflügelbestand',
      enName: 'Poultry Flock',
    }),
    acc('2121', 'Legehennen', AccountType.ASSET, 'Laying Hens', false, {
      parent: '2120',
      agriCategory: 'livestock',
      deName: 'Legehennen',
      enName: 'Laying Hens',
    }),
    acc('2122', 'Masthähnchen', AccountType.ASSET, 'Broiler Chickens', false, {
      parent: '2120',
      agriCategory: 'livestock',
      deName: 'Masthähnchen',
      enName: 'Broiler Chickens',
    }),
    acc('2130', 'Schafbestand', AccountType.ASSET, 'Sheep Flock', false, {
      parent: '2100',
      agriCategory: 'livestock',
      deName: 'Schafbestand',
      enName: 'Sheep Flock',
    }),
    acc('2140', 'Zuchttiere', AccountType.ASSET, 'Breeding Livestock', false, {
      parent: '2100',
      agriCategory: 'livestock',
      deName: 'Zuchttiere',
      enName: 'Breeding Livestock',
    }),
    acc('2150', 'Jungrinder', AccountType.ASSET, 'Young Cattle', false, {
      parent: '2100',
      agriCategory: 'livestock',
      deName: 'Jungrinder',
      enName: 'Young Cattle',
    }),

    // Fixed Assets (Anlagevermögen)
    acc('2200', 'Anlagevermögen', AccountType.ASSET, 'Fixed Assets', true, {
      deName: 'Anlagevermögen',
      enName: 'Fixed Assets',
    }),
    acc('2300', 'Landwirtschaftliche Grundstücke', AccountType.ASSET, 'Agricultural Land', true, {
      parent: '2200',
      agriCategory: 'land',
      deName: 'Landwirtschaftliche Grundstücke',
      enName: 'Agricultural Land',
    }),
    acc('2301', 'Ackerland', AccountType.ASSET, 'Arable Land', false, {
      parent: '2300',
      agriCategory: 'land',
      deName: 'Ackerland',
      enName: 'Arable Land',
    }),
    acc('2302', 'Grünland', AccountType.ASSET, 'Grassland', false, {
      parent: '2300',
      agriCategory: 'land',
      deName: 'Grünland',
      enName: 'Grassland',
    }),
    acc('2303', 'Weideland', AccountType.ASSET, 'Pasture Land', false, {
      parent: '2300',
      agriCategory: 'land',
      deName: 'Weideland',
      enName: 'Pasture Land',
    }),
    acc('2304', 'Weinberge', AccountType.ASSET, 'Vineyards', false, {
      parent: '2300',
      agriCategory: 'land',
      deName: 'Weinberge',
      enName: 'Vineyards',
    }),
    acc('2305', 'Obstplantagen', AccountType.ASSET, 'Orchards', false, {
      parent: '2300',
      agriCategory: 'land',
      deName: 'Obstplantagen',
      enName: 'Orchards',
    }),
    acc('2400', 'Landwirtschaftliche Gebäude', AccountType.ASSET, 'Agricultural Buildings', true, {
      parent: '2200',
      agriCategory: 'equipment',
      deName: 'Landwirtschaftliche Gebäude',
      enName: 'Agricultural Buildings',
      depreciationRate: 3.0,
    }),
    acc('2401', 'Stallungen', AccountType.ASSET, 'Livestock Sheds', false, {
      parent: '2400',
      agriCategory: 'equipment',
      deName: 'Stallungen',
      enName: 'Livestock Sheds',
      depreciationRate: 3.0,
    }),
    acc('2402', 'Scheunen', AccountType.ASSET, 'Barns', false, {
      parent: '2400',
      agriCategory: 'equipment',
      deName: 'Scheunen',
      enName: 'Barns',
      depreciationRate: 3.0,
    }),
    acc('2403', 'Gewächshäuser', AccountType.ASSET, 'Greenhouses', false, {
      parent: '2400',
      agriCategory: 'equipment',
      deName: 'Gewächshäuser',
      enName: 'Greenhouses',
      depreciationRate: 8.0,
    }),
    acc('2404', 'Lagerhallen', AccountType.ASSET, 'Storage Facilities', false, {
      parent: '2400',
      agriCategory: 'equipment',
      deName: 'Lagerhallen',
      enName: 'Storage Facilities',
      depreciationRate: 5.0,
    }),
    acc('2500', 'Landwirtschaftliche Maschinen', AccountType.ASSET, 'Agricultural Machinery', true, {
      parent: '2200',
      agriCategory: 'equipment',
      deName: 'Landwirtschaftliche Maschinen',
      enName: 'Agricultural Machinery',
      depreciationRate: 10.0,
    }),
    acc('2501', 'Traktoren', AccountType.ASSET, 'Tractors', false, {
      parent: '2500',
      agriCategory: 'equipment',
      deName: 'Traktoren',
      enName: 'Tractors',
      depreciationRate: 10.0,
    }),
    acc('2502', 'Mähdrescher', AccountType.ASSET, 'Combine Harvesters', false, {
      parent: '2500',
      agriCategory: 'equipment',
      deName: 'Mähdrescher',
      enName: 'Combine Harvesters',
      depreciationRate: 12.0,
    }),
    acc('2503', 'Pflügen und Eggen', AccountType.ASSET, 'Plows and Harrows', false, {
      parent: '2500',
      agriCategory: 'equipment',
      deName: 'Pflügen und Eggen',
      enName: 'Plows and Harrows',
      depreciationRate: 15.0,
    }),
    acc('2504', 'Sämaschinen', AccountType.ASSET, 'Seeders', false, {
      parent: '2500',
      agriCategory: 'equipment',
      deName: 'Sämaschinen',
      enName: 'Seeders',
      depreciationRate: 12.0,
    }),
    acc('2505', 'Dreschmaschinen', AccountType.ASSET, 'Threshers', false, {
      parent: '2500',
      agriCategory: 'equipment',
      deName: 'Dreschmaschinen',
      enName: 'Threshers',
      depreciationRate: 12.0,
    }),
    acc('2600', 'Bewässerungssysteme', AccountType.ASSET, 'Irrigation Systems', true, {
      parent: '2200',
      agriCategory: 'equipment',
      deName: 'Bewässerungssysteme',
      enName: 'Irrigation Systems',
      depreciationRate: 8.0,
    }),
    acc('2601', 'Tropfbewässerung', AccountType.ASSET, 'Drip Irrigation', false, {
      parent: '2600',
      agriCategory: 'equipment',
      deName: 'Tropfbewässerung',
      enName: 'Drip Irrigation',
      depreciationRate: 10.0,
    }),
    acc('2602', 'Sprinkleranlagen', AccountType.ASSET, 'Sprinkler Systems', false, {
      parent: '2600',
      agriCategory: 'equipment',
      deName: 'Sprinkleranlagen',
      enName: 'Sprinkler Systems',
      depreciationRate: 10.0,
    }),
    acc('2700', 'Melkanlagen', AccountType.ASSET, 'Milking Equipment', true, {
      parent: '2200',
      agriCategory: 'equipment',
      deName: 'Melkanlagen',
      enName: 'Milking Equipment',
      depreciationRate: 10.0,
    }),
    acc('2701', 'Melkmaschinen', AccountType.ASSET, 'Milking Machines', false, {
      parent: '2700',
      agriCategory: 'equipment',
      deName: 'Melkmaschinen',
      enName: 'Milking Machines',
      depreciationRate: 10.0,
    }),
    acc('2702', 'Kühltanks', AccountType.ASSET, 'Milk Cooling Tanks', false, {
      parent: '2700',
      agriCategory: 'equipment',
      deName: 'Milchkühltanks',
      enName: 'Milk Cooling Tanks',
      depreciationRate: 10.0,
    }),
    acc('2800', 'Abschreibungen', AccountType.ASSET, 'Accumulated Depreciation', true, {
      parent: '2200',
      deName: 'Sammelabschreibungen',
      enName: 'Accumulated Depreciation',
      contraAccount: true,
    }),
    acc('2801', 'AfA auf Gebäude', AccountType.ASSET, 'Depreciation - Buildings', false, {
      parent: '2800',
      deName: 'AfA auf Gebäude',
      enName: 'Depreciation - Buildings',
      contraAccount: true,
    }),
    acc('2802', 'AfA auf Maschinen', AccountType.ASSET, 'Depreciation - Machinery', false, {
      parent: '2800',
      deName: 'AfA auf Maschinen',
      enName: 'Depreciation - Machinery',
      contraAccount: true,
    }),

    // ============================================================
    // CLASS 1: LIABILITIES (SCHULDEN)
    // ============================================================

    acc('3000', 'Verbindlichkeiten', AccountType.LIABILITY, 'Liabilities', true, {
      deName: 'Verbindlichkeiten',
      enName: 'Liabilities',
    }),
    acc('3100', 'Verbindlichkeiten aus Lieferungen und Leistungen', AccountType.LIABILITY, 'Accounts Payable', true, {
      parent: '3000',
      deName: 'Verbindlichkeiten aus Lieferungen und Leistungen',
      enName: 'Accounts Payable',
    }),
    acc('3101', 'Verbindlichkeiten aus Landwirtschaft', AccountType.LIABILITY, 'Agricultural Payables', false, {
      parent: '3100',
      agriCategory: 'general',
      deName: 'Verbindlichkeiten aus Landwirtschaft',
      enName: 'Agricultural Payables',
    }),
    acc('3200', 'Verbindlichkeiten gegenüber Kreditinstituten', AccountType.LIABILITY, 'Bank Loans', true, {
      parent: '3000',
      deName: 'Verbindlichkeiten gegenüber Kreditinstituten',
      enName: 'Bank Loans',
    }),
    acc('3201', 'Landwirtschaftliche Darlehen', AccountType.LIABILITY, 'Agricultural Loans', false, {
      parent: '3200',
      agriCategory: 'land',
      deName: 'Landwirtschaftliche Darlehen',
      enName: 'Agricultural Loans',
    }),
    acc('3300', 'Steuern', AccountType.LIABILITY, 'Taxes', true, {
      parent: '3000',
      deName: 'Steuern',
      enName: 'Taxes',
    }),
    acc('3301', 'Umsatzsteuer', AccountType.LIABILITY, 'VAT Payable', false, {
      parent: '3300',
      deName: 'Umsatzsteuer',
      enName: 'VAT Payable',
    }),
    acc('3400', 'Sonstige Verbindlichkeiten', AccountType.LIABILITY, 'Other Liabilities', true, {
      parent: '3000',
      deName: 'Sonstige Verbindlichkeiten',
      enName: 'Other Liabilities',
    }),
    acc('3401', 'Verbindlichkeiten aus Löhnen und Gehältern', AccountType.LIABILITY, 'Wages Payable', false, {
      parent: '3400',
      agriCategory: 'labor',
      deName: 'Verbindlichkeiten aus Löhnen und Gehältern',
      enName: 'Wages Payable',
    }),
    acc('3402', 'Sozialversicherungsbeiträge', AccountType.LIABILITY, 'Social Security Payable', false, {
      parent: '3400',
      agriCategory: 'labor',
      deName: 'Sozialversicherungsbeiträge',
      enName: 'Social Security Payable',
    }),

    // ============================================================
    // CLASS 2: EQUITY (EIGENKAPITAL)
    // ============================================================

    acc('4000', 'Eigenkapital', AccountType.EQUITY, 'Equity', true, {
      deName: 'Eigenkapital',
      enName: 'Equity',
    }),
    acc('4100', 'Gezeichnetes Kapital', AccountType.EQUITY, 'Share Capital', true, {
      parent: '4000',
      deName: 'Gezeichnetes Kapital',
      enName: 'Share Capital',
    }),
    acc('4200', 'Rücklagen', AccountType.EQUITY, 'Reserves', true, {
      parent: '4000',
      deName: 'Rücklagen',
      enName: 'Reserves',
    }),
    acc('4300', 'Jahresüberschuss', AccountType.EQUITY, 'Retained Earnings', true, {
      parent: '4000',
      deName: 'Jahresüberschuss',
      enName: 'Retained Earnings',
    }),
    acc('4400', 'Jahresfehlbetrag', AccountType.EQUITY, 'Annual Loss', true, {
      parent: '4000',
      deName: 'Jahresfehlbetrag',
      enName: 'Annual Loss',
    }),

    // ============================================================
    // CLASS 3-4: INCOME/REVENUE (ERTRÄGE)
    // ============================================================

    acc('5000', 'Erträge', AccountType.REVENUE, 'Revenue', true, {
      deName: 'Erträge',
      enName: 'Revenue',
    }),

    // Agricultural Sales Revenue
    acc('5100', 'Landwirtschaftliche Erlöse', AccountType.REVENUE, 'Agricultural Sales', true, {
      parent: '5000',
      agriCategory: 'crop',
      deName: 'Landwirtschaftliche Erlöse',
      enName: 'Agricultural Sales',
    }),
    acc('5110', 'Getreideverkäufe', AccountType.REVENUE, 'Cereal Sales', true, {
      parent: '5100',
      agriCategory: 'crop',
      deName: 'Getreideverkäufe',
      enName: 'Cereal Sales',
    }),
    acc('5111', 'Weizenverkäufe', AccountType.REVENUE, 'Wheat Sales', false, {
      parent: '5110',
      agriCategory: 'crop',
      deName: 'Weizenverkäufe',
      enName: 'Wheat Sales',
    }),
    acc('5112', 'Gerstenverkäufe', AccountType.REVENUE, 'Barley Sales', false, {
      parent: '5110',
      agriCategory: 'crop',
      deName: 'Gerstenverkäufe',
      enName: 'Barley Sales',
    }),
    acc('5113', 'Roggenverkäufe', AccountType.REVENUE, 'Rye Sales', false, {
      parent: '5110',
      agriCategory: 'crop',
      deName: 'Roggenverkäufe',
      enName: 'Rye Sales',
    }),
    acc('5120', 'Maisverkäufe', AccountType.REVENUE, 'Corn Sales', false, {
      parent: '5100',
      agriCategory: 'crop',
      deName: 'Maisverkäufe',
      enName: 'Corn Sales',
    }),
    acc('5130', 'Kartoffelverkäufe', AccountType.REVENUE, 'Potato Sales', false, {
      parent: '5100',
      agriCategory: 'crop',
      deName: 'Kartoffelverkäufe',
      enName: 'Potato Sales',
    }),
    acc('5140', 'Rübenverkäufe', AccountType.REVENUE, 'Beet Sales', false, {
      parent: '5100',
      agriCategory: 'crop',
      deName: 'Rübenverkäufe',
      enName: 'Sugar Beet Sales',
    }),
    acc('5150', 'Gemüseverkäufe', AccountType.REVENUE, 'Vegetable Sales', true, {
      parent: '5100',
      agriCategory: 'crop',
      deName: 'Gemüseverkäufe',
      enName: 'Vegetable Sales',
    }),
    acc('5151', 'Kohlverkäufe', AccountType.REVENUE, 'Cabbage Sales', false, {
      parent: '5150',
      agriCategory: 'crop',
      deName: 'Kohlverkäufe',
      enName: 'Cabbage Sales',
    }),
    acc('5152', 'Karottenverkäufe', AccountType.REVENUE, 'Carrot Sales', false, {
      parent: '5150',
      agriCategory: 'crop',
      deName: 'Karottenverkäufe',
      enName: 'Carrot Sales',
    }),
    acc('5160', 'Obstverkäufe', AccountType.REVENUE, 'Fruit Sales', true, {
      parent: '5100',
      agriCategory: 'crop',
      deName: 'Obstverkäufe',
      enName: 'Fruit Sales',
    }),
    acc('5161', 'Apfelverkäufe', AccountType.REVENUE, 'Apple Sales', false, {
      parent: '5160',
      agriCategory: 'crop',
      deName: 'Apfelverkäufe',
      enName: 'Apple Sales',
    }),
    acc('5162', 'Traubenverkäufe', AccountType.REVENUE, 'Grape Sales', false, {
      parent: '5160',
      agriCategory: 'crop',
      deName: 'Traubenverkäufe',
      enName: 'Grape Sales',
    }),

    // Livestock Sales
    acc('5200', 'Viehverkäufe', AccountType.REVENUE, 'Livestock Sales', true, {
      parent: '5000',
      agriCategory: 'livestock',
      deName: 'Viehverkäufe',
      enName: 'Livestock Sales',
    }),
    acc('5210', 'Rinderverkäufe', AccountType.REVENUE, 'Cattle Sales', true, {
      parent: '5200',
      agriCategory: 'livestock',
      deName: 'Rinderverkäufe',
      enName: 'Cattle Sales',
    }),
    acc('5211', 'Milchkuhverkäufe', AccountType.REVENUE, 'Dairy Cow Sales', false, {
      parent: '5210',
      agriCategory: 'livestock',
      deName: 'Milchkuhverkäufe',
      enName: 'Dairy Cow Sales',
    }),
    acc('5212', 'Mastbulleverkäufe', AccountType.REVENUE, 'Fattening Bull Sales', false, {
      parent: '5210',
      agriCategory: 'livestock',
      deName: 'Mastbulleverkäufe',
      enName: 'Fattening Bull Sales',
    }),
    acc('5220', 'Schweineverkäufe', AccountType.REVENUE, 'Swine Sales', false, {
      parent: '5200',
      agriCategory: 'livestock',
      deName: 'Schweineverkäufe',
      enName: 'Swine Sales',
    }),
    acc('5230', 'Geflügelverkäufe', AccountType.REVENUE, 'Poultry Sales', false, {
      parent: '5200',
      agriCategory: 'livestock',
      deName: 'Geflügelverkäufe',
      enName: 'Poultry Sales',
    }),
    acc('5240', 'Schafverkäufe', AccountType.REVENUE, 'Sheep Sales', false, {
      parent: '5200',
      agriCategory: 'livestock',
      deName: 'Schafverkäufe',
      enName: 'Sheep Sales',
    }),

    // Dairy Products
    acc('5300', 'Milchverkäufe', AccountType.REVENUE, 'Milk Sales', true, {
      parent: '5000',
      agriCategory: 'livestock',
      deName: 'Milchverkäufe',
      enName: 'Milk Sales',
    }),
    acc('5301', 'Kuhmilchverkäufe', AccountType.REVENUE, 'Cow Milk Sales', false, {
      parent: '5300',
      agriCategory: 'livestock',
      deName: 'Kuhmilchverkäufe',
      enName: 'Cow Milk Sales',
    }),
    acc('5302', 'Ziegenmilchverkäufe', AccountType.REVENUE, 'Goat Milk Sales', false, {
      parent: '5300',
      agriCategory: 'livestock',
      deName: 'Ziegenmilchverkäufe',
      enName: 'Goat Milk Sales',
    }),
    acc('5303', 'Schafmilchverkäufe', AccountType.REVENUE, 'Sheep Milk Sales', false, {
      parent: '5300',
      agriCategory: 'livestock',
      deName: 'Schafmilchverkäufe',
      enName: 'Sheep Milk Sales',
    }),
    acc('5310', 'Käseverkäufe', AccountType.REVENUE, 'Cheese Sales', false, {
      parent: '5300',
      agriCategory: 'livestock',
      deName: 'Käseverkäufe',
      enName: 'Cheese Sales',
    }),
    acc('5320', 'Eiverkäufe', AccountType.REVENUE, 'Egg Sales', false, {
      parent: '5000',
      agriCategory: 'livestock',
      deName: 'Eiverkäufe',
      enName: 'Egg Sales',
    }),

    // Other Agricultural Products
    acc('5400', 'Sonstige landwirtschaftliche Erträge', AccountType.REVENUE, 'Other Agricultural Income', true, {
      parent: '5000',
      agriCategory: 'general',
      deName: 'Sonstige landwirtschaftliche Erträge',
      enName: 'Other Agricultural Income',
    }),
    acc('5410', 'Honigverkäufe', AccountType.REVENUE, 'Honey Sales', false, {
      parent: '5400',
      agriCategory: 'general',
      deName: 'Honigverkäufe',
      enName: 'Honey Sales',
    }),
    acc('5420', 'Wolverkäufe', AccountType.REVENUE, 'Wool Sales', false, {
      parent: '5400',
      agriCategory: 'livestock',
      deName: 'Wolverkäufe',
      enName: 'Wool Sales',
    }),
    acc('5430', 'Weinverkäufe', AccountType.REVENUE, 'Wine Sales', false, {
      parent: '5400',
      agriCategory: 'crop',
      deName: 'Weinverkäufe',
      enName: 'Wine Sales',
    }),
    acc('5440', 'Setzlingsverkäufe', AccountType.REVENUE, 'Seedling Sales', false, {
      parent: '5400',
      agriCategory: 'crop',
      deName: 'Setzlingsverkäufe',
      enName: 'Seedling Sales',
    }),

    // Subsidies and Grants
    acc('5500', 'Subventionen und Beihilfen', AccountType.REVENUE, 'Subsidies and Grants', true, {
      parent: '5000',
      agriCategory: 'general',
      deName: 'Subventionen und Beihilfen',
      enName: 'Subsidies and Grants',
    }),
    acc('5510', 'EU-Agrarsubventionen', AccountType.REVENUE, 'EU Agricultural Subsidies', false, {
      parent: '5500',
      agriCategory: 'general',
      deName: 'EU-Agrarsubventionen',
      enName: 'EU Agricultural Subsidies',
    }),
    acc('5511', 'Direktzahlungen', AccountType.REVENUE, 'Direct Payments', false, {
      parent: '5510',
      agriCategory: 'general',
      deName: 'Direktzahlungen',
      enName: 'Direct Payments',
    }),
    acc('5512', 'Fördergelder für umweltfreundliche Landwirtschaft', AccountType.REVENUE, 'Agri-Environment Payments', false, {
      parent: '5510',
      agriCategory: 'general',
      deName: 'Fördergelder für umweltfreundliche Landwirtschaft',
      enName: 'Agri-Environment Payments',
    }),
    acc('5520', 'Bundessubventionen', AccountType.REVENUE, 'Federal Subsidies', false, {
      parent: '5500',
      agriCategory: 'general',
      deName: 'Bundessubventionen',
      enName: 'Federal Subsidies',
    }),
    acc('5530', 'Ländersubventionen', AccountType.REVENUE, 'State Subsidies', false, {
      parent: '5500',
      agriCategory: 'general',
      deName: 'Ländersubventionen',
      enName: 'State Subsidies',
    }),

    // Services Revenue
    acc('5600', 'Dienstleistungserträge', AccountType.REVENUE, 'Service Revenue', true, {
      parent: '5000',
      deName: 'Dienstleistungserträge',
      enName: 'Service Revenue',
    }),
    acc('5610', 'Lohnarbeiten', AccountType.REVENUE, 'Contract Work', false, {
      parent: '5600',
      agriCategory: 'labor',
      deName: 'Lohnarbeiten',
      enName: 'Contract Work',
    }),
    acc('5620', 'Maschinenvermietung', AccountType.REVENUE, 'Machinery Rental', false, {
      parent: '5600',
      agriCategory: 'equipment',
      deName: 'Maschinenvermietung',
      enName: 'Machinery Rental',
    }),

    // Other Operating Income
    acc('5700', 'Sonstige betriebliche Erträge', AccountType.REVENUE, 'Other Operating Income', true, {
      parent: '5000',
      deName: 'Sonstige betriebliche Erträge',
      enName: 'Other Operating Income',
    }),
    acc('5710', 'Mieterträge', AccountType.REVENUE, 'Rental Income', false, {
      parent: '5700',
      deName: 'Mieterträge',
      enName: 'Rental Income',
    }),

    // ============================================================
    // CLASS 5-6: EXPENSES (AUFWENDUNGEN)
    // ============================================================

    acc('6000', 'Aufwendungen', AccountType.EXPENSE, 'Expenses', true, {
      deName: 'Aufwendungen',
      enName: 'Expenses',
    }),

    // Cost of Goods Sold
    acc('6100', 'Aufwand für Roh-, Hilfs- und Betriebsstoffe', AccountType.EXPENSE, 'Cost of Materials', true, {
      parent: '6000',
      agriCategory: 'supplies',
      deName: 'Aufwand für Roh-, Hilfs- und Betriebsstoffe',
      enName: 'Cost of Materials',
    }),

    // Seeds and Planting Materials
    acc('6110', 'Saatgut', AccountType.EXPENSE, 'Seed Cost', true, {
      parent: '6100',
      agriCategory: 'supplies',
      deName: 'Saatgut',
      enName: 'Seed Cost',
    }),
    acc('6111', 'Getreidesaatgut', AccountType.EXPENSE, 'Cereal Seed Cost', false, {
      parent: '6110',
      agriCategory: 'crop',
      deName: 'Getreidesaatgut',
      enName: 'Cereal Seed Cost',
    }),
    acc('6112', 'Maissaatgut', AccountType.EXPENSE, 'Corn Seed Cost', false, {
      parent: '6110',
      agriCategory: 'crop',
      deName: 'Maissaatgut',
      enName: 'Corn Seed Cost',
    }),
    acc('6113', 'Gemüsesaatgut', AccountType.EXPENSE, 'Vegetable Seed Cost', false, {
      parent: '6110',
      agriCategory: 'crop',
      deName: 'Gemüsesaatgut',
      enName: 'Vegetable Seed Cost',
    }),
    acc('6114', 'Kartoffelpflanzgut', AccountType.EXPENSE, 'Seed Potato Cost', false, {
      parent: '6110',
      agriCategory: 'crop',
      deName: 'Kartoffelpflanzgut',
      enName: 'Seed Potato Cost',
    }),

    // Fertilizers
    acc('6120', 'Düngemittel', AccountType.EXPENSE, 'Fertilizer Cost', true, {
      parent: '6100',
      agriCategory: 'supplies',
      deName: 'Düngemittel',
      enName: 'Fertilizer Cost',
      taxDeductible: true,
    }),
    acc('6121', 'Stickstoffdünger', AccountType.EXPENSE, 'Nitrogen Fertilizer', false, {
      parent: '6120',
      agriCategory: 'supplies',
      deName: 'Stickstoffdünger',
      enName: 'Nitrogen Fertilizer',
      taxDeductible: true,
    }),
    acc('6122', 'Phosphatdünger', AccountType.EXPENSE, 'Phosphate Fertilizer', false, {
      parent: '6120',
      agriCategory: 'supplies',
      deName: 'Phosphatdünger',
      enName: 'Phosphate Fertilizer',
      taxDeductible: true,
    }),
    acc('6123', 'Kalidünger', AccountType.EXPENSE, 'Potash Fertilizer', false, {
      parent: '6120',
      agriCategory: 'supplies',
      deName: 'Kalidünger',
      enName: 'Potash Fertilizer',
      taxDeductible: true,
    }),
    acc('6124', 'Organische Düngemittel', AccountType.EXPENSE, 'Organic Fertilizer', false, {
      parent: '6120',
      agriCategory: 'supplies',
      deName: 'Organische Düngemittel',
      enName: 'Organic Fertilizer',
      taxDeductible: true,
    }),
    acc('6125', 'Gülle', AccountType.EXPENSE, 'Manure', false, {
      parent: '6120',
      agriCategory: 'supplies',
      deName: 'Gülle',
      enName: 'Manure',
      taxDeductible: true,
    }),

    // Crop Protection
    acc('6130', 'Pflanzenschutzmittel', AccountType.EXPENSE, 'Crop Protection Cost', true, {
      parent: '6100',
      agriCategory: 'supplies',
      deName: 'Pflanzenschutzmittel',
      enName: 'Crop Protection Cost',
      taxDeductible: true,
    }),
    acc('6131', 'Herbizide', AccountType.EXPENSE, 'Herbicides', false, {
      parent: '6130',
      agriCategory: 'supplies',
      deName: 'Herbizide',
      enName: 'Herbicides',
      taxDeductible: true,
    }),
    acc('6132', 'Insektizide', AccountType.EXPENSE, 'Insecticides', false, {
      parent: '6130',
      agriCategory: 'supplies',
      deName: 'Insektizide',
      enName: 'Insecticides',
      taxDeductible: true,
    }),
    acc('6133', 'Fungizide', AccountType.EXPENSE, 'Fungicides', false, {
      parent: '6130',
      agriCategory: 'supplies',
      deName: 'Fungizide',
      enName: 'Fungicides',
      taxDeductible: true,
    }),

    // Feed
    acc('6140', 'Futtermittel', AccountType.EXPENSE, 'Feed Cost', true, {
      parent: '6100',
      agriCategory: 'livestock',
      deName: 'Futtermittel',
      enName: 'Feed Cost',
      taxDeductible: true,
    }),
    acc('6141', 'Kraftfutter', AccountType.EXPENSE, 'Concentrate Feed', false, {
      parent: '6140',
      agriCategory: 'livestock',
      deName: 'Kraftfutter',
      enName: 'Concentrate Feed',
      taxDeductible: true,
    }),
    acc('6142', 'Raufutter', AccountType.EXPENSE, 'Roughage', false, {
      parent: '6140',
      agriCategory: 'livestock',
      deName: 'Raufutter',
      enName: 'Roughage',
      taxDeductible: true,
    }),
    acc('6143', 'Ergänzungsfutter', AccountType.EXPENSE, 'Supplementary Feed', false, {
      parent: '6140',
      agriCategory: 'livestock',
      deName: 'Ergänzungsfutter',
      enName: 'Supplementary Feed',
      taxDeductible: true,
    }),
    acc('6144', 'Milchersatzfutter', AccountType.EXPENSE, 'Milk Replacer', false, {
      parent: '6140',
      agriCategory: 'livestock',
      deName: 'Milchersatzfutter',
      enName: 'Milk Replacer',
      taxDeductible: true,
    }),

    // Other Supplies
    acc('6150', 'Sonstige Materialkosten', AccountType.EXPENSE, 'Other Material Costs', false, {
      parent: '6100',
      agriCategory: 'supplies',
      deName: 'Sonstige Materialkosten',
      enName: 'Other Material Costs',
    }),

    // Labor Costs
    acc('6200', 'Löhne und Gehälter', AccountType.EXPENSE, 'Wages and Salaries', true, {
      parent: '6000',
      agriCategory: 'labor',
      deName: 'Löhne und Gehälter',
      enName: 'Wages and Salaries',
      taxDeductible: true,
    }),
    acc('6210', 'Arbeiterlöhne', AccountType.EXPENSE, 'Worker Wages', false, {
      parent: '6200',
      agriCategory: 'labor',
      deName: 'Arbeiterlöhne',
      enName: 'Worker Wages',
      taxDeductible: true,
    }),
    acc('6220', 'Saisonale Arbeitskräfte', AccountType.EXPENSE, 'Seasonal Labor', false, {
      parent: '6200',
      agriCategory: 'labor',
      deName: 'Saisonale Arbeitskräfte',
      enName: 'Seasonal Labor',
      taxDeductible: true,
    }),
    acc('6230', 'Angestellte Gehälter', AccountType.EXPENSE, 'Salaried Staff', false, {
      parent: '6200',
      agriCategory: 'labor',
      deName: 'Angestelltengehälter',
      enName: 'Salaried Staff',
      taxDeductible: true,
    }),
    acc('6240', 'Sozialabgaben', AccountType.EXPENSE, 'Social Security', false, {
      parent: '6200',
      agriCategory: 'labor',
      deName: 'Sozialabgaben',
      enName: 'Social Security Contributions',
      taxDeductible: true,
    }),

    // Contract Work and Services
    acc('6300', 'Bezogene Leistungen', AccountType.EXPENSE, 'Contract Services', true, {
      parent: '6000',
      deName: 'Bezogene Leistungen',
      enName: 'Contract Services',
    }),
    acc('6310', 'Lohnarbeiten', AccountType.EXPENSE, 'Contract Labor', false, {
      parent: '6300',
      agriCategory: 'labor',
      deName: 'Lohnarbeiten',
      enName: 'Contract Labor',
    }),
    acc('6320', 'Pflanzenschutzleistungen', AccountType.EXPENSE, 'Crop Spraying Services', false, {
      parent: '6300',
      agriCategory: 'supplies',
      deName: 'Pflanzenschutzleistungen',
      enName: 'Crop Spraying Services',
    }),
    acc('6330', 'Erntedienstleistungen', AccountType.EXPENSE, 'Harvesting Services', false, {
      parent: '6300',
      agriCategory: 'crop',
      deName: 'Erntedienstleistungen',
      enName: 'Harvesting Services',
    }),
    acc('6340', 'Tierarztkosten', AccountType.EXPENSE, 'Veterinary Services', false, {
      parent: '6300',
      agriCategory: 'livestock',
      deName: 'Tierarztkosten',
      enName: 'Veterinary Services',
    }),
    acc('6350', 'Kunststoffberatung', AccountType.EXPENSE, 'Consulting Services', false, {
      parent: '6300',
      deName: 'Beratungskosten',
      enName: 'Consulting Services',
    }),

    // Machinery and Equipment Costs
    acc('6400', 'Maschinen und Gerätekosten', AccountType.EXPENSE, 'Machinery Costs', true, {
      parent: '6000',
      agriCategory: 'equipment',
      deName: 'Maschinen und Gerätekosten',
      enName: 'Machinery Costs',
      taxDeductible: true,
    }),
    acc('6410', 'Kraftstoffe', AccountType.EXPENSE, 'Fuel', true, {
      parent: '6400',
      agriCategory: 'equipment',
      deName: 'Kraftstoffe',
      enName: 'Fuel',
      taxDeductible: true,
    }),
    acc('6411', 'Diesel', AccountType.EXPENSE, 'Diesel', false, {
      parent: '6410',
      agriCategory: 'equipment',
      deName: 'Diesel',
      enName: 'Diesel',
      taxDeductible: true,
    }),
    acc('6412', 'Benzin', AccountType.EXPENSE, 'Petrol', false, {
      parent: '6410',
      agriCategory: 'equipment',
      deName: 'Benzin',
      enName: 'Petrol',
      taxDeductible: true,
    }),
    acc('6420', 'Reparaturen und Wartung', AccountType.EXPENSE, 'Repairs and Maintenance', false, {
      parent: '6400',
      agriCategory: 'equipment',
      deName: 'Reparaturen und Wartung',
      enName: 'Repairs and Maintenance',
      taxDeductible: true,
    }),
    acc('6430', 'Ersatzteile', AccountType.EXPENSE, 'Spare Parts', false, {
      parent: '6400',
      agriCategory: 'equipment',
      deName: 'Ersatzteile',
      enName: 'Spare Parts',
      taxDeductible: true,
    }),
    acc('6440', 'Maschinenmiete', AccountType.EXPENSE, 'Machinery Rental', false, {
      parent: '6400',
      agriCategory: 'equipment',
      deName: 'Maschinenmiete',
      enName: 'Machinery Rental',
      taxDeductible: true,
    }),
    acc('6450', 'AfA Maschinen', AccountType.EXPENSE, 'Depreciation - Machinery', false, {
      parent: '6400',
      agriCategory: 'equipment',
      deName: 'AfA auf Maschinen',
      enName: 'Depreciation - Machinery',
      taxDeductible: true,
    }),

    // Building Costs
    acc('6500', 'Gebäudekosten', AccountType.EXPENSE, 'Building Costs', true, {
      parent: '6000',
      agriCategory: 'equipment',
      deName: 'Gebäudekosten',
      enName: 'Building Costs',
      taxDeductible: true,
    }),
    acc('6510', 'AfA auf Gebäude', AccountType.EXPENSE, 'Depreciation - Buildings', false, {
      parent: '6500',
      agriCategory: 'equipment',
      deName: 'AfA auf Gebäude',
      enName: 'Depreciation - Buildings',
      taxDeductible: true,
    }),
    acc('6520', 'Gebäudeinstandhaltung', AccountType.EXPENSE, 'Building Maintenance', false, {
      parent: '6500',
      agriCategory: 'equipment',
      deName: 'Gebäudeinstandhaltung',
      enName: 'Building Maintenance',
      taxDeductible: true,
    }),

    // Land Costs
    acc('6600', 'Landkosten', AccountType.EXPENSE, 'Land Costs', true, {
      parent: '6000',
      agriCategory: 'land',
      deName: 'Landkosten',
      enName: 'Land Costs',
    }),
    acc('6610', 'Pacht', AccountType.EXPENSE, 'Land Rent', false, {
      parent: '6600',
      agriCategory: 'land',
      deName: 'Pacht',
      enName: 'Land Rent',
      taxDeductible: true,
    }),
    acc('6620', 'Grundsteuer', AccountType.EXPENSE, 'Property Tax', false, {
      parent: '6600',
      agriCategory: 'land',
      deName: 'Grundsteuer',
      enName: 'Property Tax',
      taxDeductible: true,
    }),

    // Energy and Utilities
    acc('6700', 'Energie und Wasser', AccountType.EXPENSE, 'Energy and Utilities', true, {
      parent: '6000',
      agriCategory: 'equipment',
      deName: 'Energie und Wasser',
      enName: 'Energy and Utilities',
      taxDeductible: true,
    }),
    acc('6710', 'Strom', AccountType.EXPENSE, 'Electricity', false, {
      parent: '6700',
      agriCategory: 'equipment',
      deName: 'Strom',
      enName: 'Electricity',
      taxDeductible: true,
    }),
    acc('6720', 'Heizung', AccountType.EXPENSE, 'Heating', false, {
      parent: '6700',
      agriCategory: 'equipment',
      deName: 'Heizung',
      enName: 'Heating',
      taxDeductible: true,
    }),
    acc('6730', 'Wasserkosten', AccountType.EXPENSE, 'Water', false, {
      parent: '6700',
      agriCategory: 'equipment',
      deName: 'Wasserkosten',
      enName: 'Water Costs',
      taxDeductible: true,
    }),
    acc('6740', 'Bewässerungswasser', AccountType.EXPENSE, 'Irrigation Water', false, {
      parent: '6700',
      agriCategory: 'equipment',
      deName: 'Bewässerungswasser',
      enName: 'Irrigation Water',
      taxDeductible: true,
    }),

    // Transportation
    acc('6800', 'Transportkosten', AccountType.EXPENSE, 'Transport Costs', true, {
      parent: '6000',
      agriCategory: 'general',
      deName: 'Transportkosten',
      enName: 'Transport Costs',
      taxDeductible: true,
    }),
    acc('6810', 'Frachtkosten', AccountType.EXPENSE, 'Freight', false, {
      parent: '6800',
      agriCategory: 'general',
      deName: 'Frachtkosten',
      enName: 'Freight Costs',
      taxDeductible: true,
    }),
    acc('6820', 'Fahrzeugkosten', AccountType.EXPENSE, 'Vehicle Expenses', false, {
      parent: '6800',
      agriCategory: 'equipment',
      deName: 'Fahrzeugkosten',
      enName: 'Vehicle Expenses',
      taxDeductible: true,
    }),

    // Marketing and Selling
    acc('6900', 'Vertriebskosten', AccountType.EXPENSE, 'Selling Expenses', true, {
      parent: '6000',
      deName: 'Vertriebskosten',
      enName: 'Selling Expenses',
      taxDeductible: true,
    }),
    acc('6910', 'Vermarktung', AccountType.EXPENSE, 'Marketing', false, {
      parent: '6900',
      deName: 'Vermarktungskosten',
      enName: 'Marketing Costs',
      taxDeductible: true,
    }),
    acc('6920', 'Transport zu Kunden', AccountType.EXPENSE, 'Delivery to Customers', false, {
      parent: '6900',
      deName: 'Transport zu Kunden',
      enName: 'Delivery to Customers',
      taxDeductible: true,
    }),
    acc('6930', 'Verpackungsmaterial', AccountType.EXPENSE, 'Packaging Materials', false, {
      parent: '6900',
      deName: 'Verpackungsmaterial',
      enName: 'Packaging Materials',
      taxDeductible: true,
    }),

    // Administrative Expenses
    acc('7000', 'Verwaltungskosten', AccountType.EXPENSE, 'Administrative Expenses', true, {
      parent: '6000',
      deName: 'Verwaltungskosten',
      enName: 'Administrative Expenses',
      taxDeductible: true,
    }),
    acc('7010', 'Büromaterial', AccountType.EXPENSE, 'Office Supplies', false, {
      parent: '7000',
      deName: 'Büromaterial',
      enName: 'Office Supplies',
      taxDeductible: true,
    }),
    acc('7020', 'Rechnungswesen', AccountType.EXPENSE, 'Accounting Fees', false, {
      parent: '7000',
      deName: 'Rechnungswesen',
      enName: 'Accounting Fees',
      taxDeductible: true,
    }),
    acc('7030', 'Rechtsberatung', AccountType.EXPENSE, 'Legal Fees', false, {
      parent: '7000',
      deName: 'Rechtsberatung',
      enName: 'Legal Fees',
      taxDeductible: true,
    }),
    acc('7040', 'Versicherungen', AccountType.EXPENSE, 'Insurance', false, {
      parent: '7000',
      deName: 'Versicherungen',
      enName: 'Insurance',
      taxDeductible: true,
    }),
    acc('7041', 'Krankenversicherung', AccountType.EXPENSE, 'Health Insurance', false, {
      parent: '7040',
      agriCategory: 'labor',
      deName: 'Krankenversicherung',
      enName: 'Health Insurance',
      taxDeductible: true,
    }),
    acc('7042', 'Betriebshaftpflicht', AccountType.EXPENSE, 'Business Liability', false, {
      parent: '7040',
      agriCategory: 'general',
      deName: 'Betriebshaftpflicht',
      enName: 'Business Liability Insurance',
      taxDeductible: true,
    }),
    acc('7043', 'Ernteversicherung', AccountType.EXPENSE, 'Crop Insurance', false, {
      parent: '7040',
      agriCategory: 'crop',
      deName: 'Ernteversicherung',
      enName: 'Crop Insurance',
      taxDeductible: true,
    }),
    acc('7044', 'Tierversicherung', AccountType.EXPENSE, 'Livestock Insurance', false, {
      parent: '7040',
      agriCategory: 'livestock',
      deName: 'Tierversicherung',
      enName: 'Livestock Insurance',
      taxDeductible: true,
    }),

    // Financial Expenses
    acc('7100', 'Finanzkosten', AccountType.EXPENSE, 'Financial Expenses', true, {
      parent: '6000',
      deName: 'Finanzkosten',
      enName: 'Financial Expenses',
      taxDeductible: true,
    }),
    acc('7110', 'Zinsaufwendungen', AccountType.EXPENSE, 'Interest Expense', false, {
      parent: '7100',
      deName: 'Zinsaufwendungen',
      enName: 'Interest Expense',
      taxDeductible: true,
    }),
    acc('7120', 'Bankgebühren', AccountType.EXPENSE, 'Bank Fees', false, {
      parent: '7100',
      deName: 'Bankgebühren',
      enName: 'Bank Fees',
      taxDeductible: true,
    }),

    // Taxes and Duties
    acc('7200', 'Steuern', AccountType.EXPENSE, 'Taxes', true, {
      parent: '6000',
      deName: 'Steuern',
      enName: 'Taxes',
    }),
    acc('7210', 'Gewerbesteuer', AccountType.EXPENSE, 'Business Tax', false, {
      parent: '7200',
      deName: 'Gewerbesteuer',
      enName: 'Business Tax',
      taxDeductible: true,
    }),
    acc('7220', 'Kraftfahrzeugsteuer', AccountType.EXPENSE, 'Vehicle Tax', false, {
      parent: '7200',
      deName: 'Kraftfahrzeugsteuer',
      enName: 'Vehicle Tax',
      taxDeductible: true,
    }),
    acc('7230', 'Kfz-Steuer', AccountType.EXPENSE, 'Vehicle Tax', false, {
      parent: '7200',
      deName: 'Kfz-Steuer',
      enName: 'Vehicle Tax',
      taxDeductible: true,
    }),

    // Other Expenses
    acc('7300', 'Sonstige Aufwendungen', AccountType.EXPENSE, 'Other Expenses', true, {
      parent: '6000',
      deName: 'Sonstige Aufwendungen',
      enName: 'Other Expenses',
    }),
    acc('7310', 'Abgaben', AccountType.EXPENSE, 'Dues and Levies', false, {
      parent: '7300',
      deName: 'Abgaben',
      enName: 'Dues and Levies',
      taxDeductible: true,
    }),
  ],
};
