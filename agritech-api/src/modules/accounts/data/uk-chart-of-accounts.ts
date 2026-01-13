/**
 * UK Chart of Accounts for Agricultural Businesses
 * Based on FRS 102 (Financial Reporting Standard 102)
 * Optimized for farming/agricultural operations
 * Reference: FRS 102 The Financial Reporting Standard applicable in the UK and Republic of Ireland
 */

import {
  CountryChartOfAccounts,
  ChartAccount,
  AccountingStandard,
  AccountType,
  AgriculturalCategory
} from './types';

function acc(
  code: string,
  name: string,
  type: AccountType,
  subtype: string,
  isGroup: boolean,
  options?: {
    parent?: string;
    currency?: string;
    desc?: string;
    agriCategory?: AgriculturalCategory;
    depreciationRate?: number;
    taxDeductible?: boolean;
    contra?: boolean;
  }
): ChartAccount {
  return {
    code,
    name,
    account_type: type,
    account_subtype: subtype,
    is_group: isGroup,
    is_active: true,
    parent_code: options?.parent,
    currency_code: options?.currency || 'GBP',
    description: options?.desc,
    agricultural_category: options?.agriCategory,
    depreciation_rate: options?.depreciationRate,
    tax_deductible: options?.taxDeductible,
    contra_account: options?.contra,
  };
}

export const ukChartOfAccounts: CountryChartOfAccounts = {
  metadata: {
    country_code: 'GB',
    country_name: 'United Kingdom',
    country_name_native: 'United Kingdom',
    accounting_standard: AccountingStandard.FRS102,
    default_currency: 'GBP',
    fiscal_year_start_month: 4, // April (UK tax year starts 6 April)
    version: '1.0.0',
    description: 'UK FRS 102 Chart of Accounts adapted for agricultural operations',
    supported_industries: ['agriculture', 'livestock', 'dairy', 'arable', 'mixed_farming'],
    requires_vat_registration: true,
    standard_tax_rates: [
      { name: 'Standard VAT', rate: 20.0, applies_to: ['sales'], is_default: true },
      { name: 'Reduced VAT', rate: 5.0, applies_to: ['sales'], is_default: false },
      { name: 'Zero Rated VAT', rate: 0.0, applies_to: ['sales', 'purchases'], is_default: false },
    ],
  },
  accounts: [
    // =====================================================
    // ASSET ACCOUNTS (000-299)
    // =====================================================

    acc('000', 'Non-Current Assets', AccountType.ASSET, 'Non-Current Asset', true),
    acc('100', 'Intangible Assets', AccountType.ASSET, 'Intangible Fixed Asset', true, { parent: '000' }),
    acc('110', 'Research and Development', AccountType.ASSET, 'R&D', false, { parent: '100', agriCategory: 'general' }),
    acc('120', 'Development Costs', AccountType.ASSET, 'Development Costs', false, { parent: '100', agriCategory: 'general' }),
    acc('126', 'Goodwill', AccountType.ASSET, 'Goodwill', false, { parent: '100', agriCategory: 'general' }),

    acc('125', 'Tangible Assets', AccountType.ASSET, 'Tangible Fixed Asset', true, { parent: '000' }),
    acc('130', 'Land and Buildings', AccountType.ASSET, 'Land and Buildings', true, { parent: '125' }),
    acc('131', 'Land', AccountType.ASSET, 'Land', false, { parent: '130', agriCategory: 'land', desc: 'Agricultural land, farm buildings' }),
    acc('1311', 'Agricultural Land', AccountType.ASSET, 'Agricultural Land', false, { parent: '131', agriCategory: 'land' }),
    acc('1312', 'Farm Buildings', AccountType.ASSET, 'Farm Buildings', false, { parent: '131', agriCategory: 'equipment', depreciationRate: 4 }),
    acc('132', 'Plantation and Trees', AccountType.ASSET, 'Plantations', false, { parent: '125', agriCategory: 'crop', depreciationRate: 4, desc: 'Vineyards, orchards, fruit trees' }),
    acc('133', 'Farm Equipment', AccountType.ASSET, 'Farm Equipment', true, { parent: '125', agriCategory: 'equipment' }),
    acc('1331', 'Tractors and Machinery', AccountType.ASSET, 'Tractors and Machinery', false, { parent: '133', agriCategory: 'equipment', depreciationRate: 10 }),
    acc('1332', 'Harvesting Equipment', AccountType.ASSET, 'Harvesting Equipment', false, { parent: '133', agriCategory: 'equipment', depreciationRate: 10 }),
    acc('1333', 'Irrigation Systems', AccountType.ASSET, 'Irrigation Systems', false, { parent: '133', agriCategory: 'equipment', depreciationRate: 10 }),
    acc('1334', 'Livestock Equipment', AccountType.ASSET, 'Livestock Equipment', false, { parent: '133', agriCategory: 'livestock', depreciationRate: 10 }),
    acc('134', 'Motor Vehicles', AccountType.ASSET, 'Motor Vehicles', false, { parent: '125', agriCategory: 'equipment', depreciationRate: 20 }),
    acc('135', 'Fixtures and Fittings', AccountType.ASSET, 'Fixtures and Fittings', false, { parent: '125', agriCategory: 'equipment', depreciationRate: 8 }),
    acc('138', 'Assets in Course of Construction', AccountType.ASSET, 'Assets in Progress', false, { parent: '125', agriCategory: 'equipment' }),
    acc('139', 'Investment Properties', AccountType.ASSET, 'Investment Properties', false, { parent: '125', agriCategory: 'land' }),

    acc('150', 'Investments', AccountType.ASSET, 'Investments', true, { parent: '000' }),
    acc('151', 'Investments in Subsidiaries', AccountType.ASSET, 'Subsidiaries', false, { parent: '150' }),
    acc('152', 'Investments in Associated Companies', AccountType.ASSET, 'Associates', false, { parent: '150' }),
    acc('153', 'Other Investments', AccountType.ASSET, 'Other Investments', false, { parent: '150' }),

    acc('200', 'Current Assets', AccountType.ASSET, 'Current Asset', true),
    acc('210', 'Inventories', AccountType.ASSET, 'Inventory', true, { parent: '200', agriCategory: 'supplies' }),
    acc('211', 'Raw Materials', AccountType.ASSET, 'Raw Materials', false, { parent: '210', agriCategory: 'supplies' }),
    acc('2111', 'Seeds and Plants', AccountType.ASSET, 'Seeds and Plants', false, { parent: '211', agriCategory: 'supplies' }),
    acc('2112', 'Fertilizers', AccountType.ASSET, 'Fertilizers', false, { parent: '211', agriCategory: 'supplies' }),
    acc('2113', 'Crop Protection', AccountType.ASSET, 'Crop Protection', false, { parent: '211', agriCategory: 'supplies' }),
    acc('2114', 'Animal Feed', AccountType.ASSET, 'Animal Feed', false, { parent: '211', agriCategory: 'livestock' }),
    acc('212', 'Work in Progress', AccountType.ASSET, 'Work in Progress', false, { parent: '210', agriCategory: 'crop', desc: 'Crops in the ground, livestock in process' }),
    acc('213', 'Finished Goods', AccountType.ASSET, 'Finished Goods', false, { parent: '210', agriCategory: 'crop' }),
    acc('2131', 'Harvested Crops', AccountType.ASSET, 'Harvested Crops', false, { parent: '213', agriCategory: 'crop' }),
    acc('2132', 'Livestock Products', AccountType.ASSET, 'Livestock Products', false, { parent: '213', agriCategory: 'livestock' }),

    acc('220', 'Trade Receivables', AccountType.ASSET, 'Trade Receivables', true, { parent: '200' }),
    acc('221', 'Trade Debtors', AccountType.ASSET, 'Trade Debtors', false, { parent: '220', agriCategory: 'general' }),
    acc('222', 'Agricultural Debtors', AccountType.ASSET, 'Agricultural Debtors', false, { parent: '220', agriCategory: 'general' }),
    acc('224', 'Other Receivables', AccountType.ASSET, 'Other Receivables', false, { parent: '200', agriCategory: 'general' }),
    acc('225', 'Prepayments', AccountType.ASSET, 'Prepayments', false, { parent: '200', agriCategory: 'general' }),
    acc('226', 'Amounts Owning by Group Companies', AccountType.ASSET, 'Intercompany Receivables', false, { parent: '200' }),

    acc('230', 'Cash and Cash Equivalents', AccountType.ASSET, 'Cash', true, { parent: '200' }),
    acc('231', 'Cash in Hand', AccountType.ASSET, 'Cash in Hand', false, { parent: '230' }),
    acc('232', 'Cash at Bank', AccountType.ASSET, 'Cash at Bank', false, { parent: '230' }),

    acc('250', 'Other Current Assets', AccountType.ASSET, 'Other Current Assets', false, { parent: '200' }),

    acc('260', 'Current Asset Investments', AccountType.ASSET, 'Current Investments', false, { parent: '200' }),

    // =====================================================
    // LIABILITY ACCOUNTS (300-399)
    // =====================================================

    acc('300', 'Non-Current Liabilities', AccountType.LIABILITY, 'Non-Current Liability', true),
    acc('310', 'Interest-Bearing Borrowings', AccountType.LIABILITY, 'Long-Term Debt', true, { parent: '300' }),
    acc('311', 'Bank Loans', AccountType.LIABILITY, 'Bank Loans', false, { parent: '310' }),
    acc('312', 'Finance Leases', AccountType.LIABILITY, 'Finance Leases', false, { parent: '310', agriCategory: 'equipment' }),
    acc('313', 'Other Borrowings', AccountType.LIABILITY, 'Other Borrowings', false, { parent: '310' }),

    acc('320', 'Provisions', AccountType.LIABILITY, 'Provisions', true, { parent: '300' }),
    acc('321', 'Restructuring Provisions', AccountType.LIABILITY, 'Restructuring Provisions', false, { parent: '320' }),
    acc('322', 'Environmental Provisions', AccountType.LIABILITY, 'Environmental Provisions', false, { parent: '320', agriCategory: 'general' }),

    acc('330', 'Deferred Tax', AccountType.LIABILITY, 'Deferred Tax', false, { parent: '300' }),
    acc('331', 'Deferred Tax Liabilities', AccountType.LIABILITY, 'Deferred Tax Liabilities', false, { parent: '330' }),

    acc('340', 'Non-Current Trade and Other Payables', AccountType.LIABILITY, 'Non-Current Payables', false, { parent: '300' }),
    acc('341', 'Trade Creditors due after One Year', AccountType.LIABILITY, 'Long-Term Creditors', false, { parent: '340' }),

    acc('350', 'Current Liabilities', AccountType.LIABILITY, 'Current Liability', true),
    acc('360', 'Trade and Other Payables', AccountType.LIABILITY, 'Trade Payables', true, { parent: '350' }),
    acc('361', 'Trade Creditors', AccountType.LIABILITY, 'Trade Creditors', false, { parent: '360', agriCategory: 'general' }),
    acc('362', 'Agricultural Suppliers', AccountType.LIABILITY, 'Agricultural Suppliers', false, { parent: '361', agriCategory: 'supplies' }),
    acc('363', 'VAT Payable', AccountType.LIABILITY, 'VAT Payable', false, { parent: '360', agriCategory: 'general' }),

    acc('370', 'Current Tax Liabilities', AccountType.LIABILITY, 'Current Tax', false, { parent: '350' }),
    acc('371', 'Corporation Tax', AccountType.LIABILITY, 'Corporation Tax', false, { parent: '370' }),
    acc('372', 'PAYE and NIC Payable', AccountType.LIABILITY, 'PAYE/Payable', false, { parent: '370', agriCategory: 'labor' }),

    acc('380', 'Other Current Liabilities', AccountType.LIABILITY, 'Other Current Liabilities', false, { parent: '350' }),
    acc('381', 'Accruals', AccountType.LIABILITY, 'Accruals', false, { parent: '380', agriCategory: 'general' }),
    acc('382', 'Deferred Income', AccountType.LIABILITY, 'Deferred Income', false, { parent: '380', agriCategory: 'general' }),
    acc('383', 'Dividends Payable', AccountType.LIABILITY, 'Dividends Payable', false, { parent: '380' }),

    acc('390', 'Net Current Liabilities', AccountType.LIABILITY, 'Net Current Liabilities', false, { parent: '350' }),

    // =====================================================
    // EQUITY ACCOUNTS (400-499)
    // =====================================================

    acc('400', 'Capital and Reserves', AccountType.EQUITY, 'Capital and Reserves', true),
    acc('410', 'Called Up Share Capital', AccountType.EQUITY, 'Share Capital', false, { parent: '400' }),
    acc('420', 'Share Premium Account', AccountType.EQUITY, 'Share Premium', false, { parent: '400' }),
    acc('430', 'Other Reserves', AccountType.EQUITY, 'Reserves', false, { parent: '400' }),
    acc('440', 'Retained Earnings', AccountType.EQUITY, 'Retained Earnings', false, { parent: '400' }),
    acc('450', 'Non-Controlling Interests', AccountType.EQUITY, 'Minority Interests', false, { parent: '400' }),
    acc('460', 'Equity Share of Net Assets of Joint Ventures', AccountType.EQUITY, 'Joint Ventures', false, { parent: '400' }),
    acc('470', 'Revaluation Reserve', AccountType.EQUITY, 'Revaluation Reserve', false, { parent: '400' }),
    acc('480', 'Other Equity Reserves', AccountType.EQUITY, 'Other Reserves', false, { parent: '400' }),

    // =====================================================
    // REVENUE ACCOUNTS (500-599)
    // =====================================================

    acc('500', 'Revenue', AccountType.REVENUE, 'Revenue', true),
    acc('510', 'Turnover', AccountType.REVENUE, 'Turnover', true, { parent: '500' }),
    acc('511', 'Agricultural Sales', AccountType.REVENUE, 'Agricultural Sales', false, { parent: '510', agriCategory: 'crop' }),
    acc('5111', 'Cereal Sales', AccountType.REVENUE, 'Cereal Sales', false, { parent: '511', agriCategory: 'crop' }),
    acc('5112', 'Vegetable Sales', AccountType.REVENUE, 'Vegetable Sales', false, { parent: '511', agriCategory: 'crop' }),
    acc('5113', 'Fruit Sales', AccountType.REVENUE, 'Fruit Sales', false, { parent: '511', agriCategory: 'crop' }),
    acc('5114', 'Potato Sales', AccountType.REVENUE, 'Potato Sales', false, { parent: '511', agriCategory: 'crop' }),
    acc('5115', 'Horticultural Sales', AccountType.REVENUE, 'Horticulture Sales', false, { parent: '511', agriCategory: 'crop' }),
    acc('512', 'Livestock Sales', AccountType.REVENUE, 'Livestock Sales', false, { parent: '510', agriCategory: 'livestock' }),
    acc('5121', 'Cattle Sales', AccountType.REVENUE, 'Cattle Sales', false, { parent: '512', agriCategory: 'livestock' }),
    acc('5122', 'Sheep Sales', AccountType.REVENUE, 'Sheep Sales', false, { parent: '512', agriCategory: 'livestock' }),
    acc('5123', 'Pig Sales', AccountType.REVENUE, 'Pig Sales', false, { parent: '512', agriCategory: 'livestock' }),
    acc('5124', 'Poultry Sales', AccountType.REVENUE, 'Poultry Sales', false, { parent: '512', agriCategory: 'livestock' }),
    acc('5125', 'Dairy Sales', AccountType.REVENUE, 'Dairy Sales', false, { parent: '512', agriCategory: 'livestock' }),
    acc('513', 'Products from Own Processing', AccountType.REVENUE, 'Processed Products', false, { parent: '510', agriCategory: 'crop' }),
    acc('520', 'Changes in Inventories', AccountType.REVENUE, 'Inventory Changes', false, { parent: '500' }),

    acc('530', 'Other Operating Income', AccountType.REVENUE, 'Other Operating Income', true, { parent: '500' }),
    acc('531', 'Government Grants', AccountType.REVENUE, 'Government Grants', false, { parent: '530', agriCategory: 'general', desc: 'Basic Payment Scheme, Countryside Stewardship' }),
    acc('532', 'Custom Work', AccountType.REVENUE, 'Custom Work', false, { parent: '530', agriCategory: 'general' }),
    acc('533', 'Subsidies', AccountType.REVENUE, 'Subsidies', false, { parent: '530', agriCategory: 'general' }),

    acc('540', 'Royalties', AccountType.REVENUE, 'Royalties', false, { parent: '500' }),

    acc('550', 'Investment Income', AccountType.REVENUE, 'Investment Income', false, { parent: '500' }),
    acc('560', 'Surplus on Disposal of Assets', AccountType.REVENUE, 'Gain on Disposals', false, { parent: '500' }),
    acc('570', 'Reversals of Provisions', AccountType.REVENUE, 'Provision Reversals', false, { parent: '500' }),
    acc('580', 'Other Income', AccountType.REVENUE, 'Other Income', false, { parent: '500' }),

    // =====================================================
    // EXPENSE ACCOUNTS (600-699)
    // =====================================================

    acc('600', 'Cost of Sales', AccountType.EXPENSE, 'Cost of Sales', true, { parent: '500' }),
    acc('610', 'Raw Materials and Consumables', AccountType.EXPENSE, 'Materials', true, { parent: '600', agriCategory: 'supplies', taxDeductible: true }),
    acc('611', 'Seeds and Plants', AccountType.EXPENSE, 'Seeds and Plants', false, { parent: '610', agriCategory: 'supplies', taxDeductible: true }),
    acc('612', 'Fertilizers', AccountType.EXPENSE, 'Fertilizers', false, { parent: '610', agriCategory: 'supplies', taxDeductible: true }),
    acc('613', 'Crop Protection', AccountType.EXPENSE, 'Crop Protection', false, { parent: '610', agriCategory: 'supplies', taxDeductible: true }),
    acc('614', 'Animal Feed', AccountType.EXPENSE, 'Animal Feed', false, { parent: '610', agriCategory: 'livestock', taxDeductible: true }),
    acc('620', 'Staff Costs', AccountType.EXPENSE, 'Staff Costs', false, { parent: '600', agriCategory: 'labor', taxDeductible: true }),
    acc('621', 'Wages and Salaries', AccountType.EXPENSE, 'Wages and Salaries', false, { parent: '620', agriCategory: 'labor', taxDeductible: true }),
    acc('622', 'Social Security Costs', AccountType.EXPENSE, 'NIC', false, { parent: '620', agriCategory: 'labor', taxDeductible: true }),
    acc('623', 'Pension Costs', AccountType.EXPENSE, 'Pensions', false, { parent: '620', agriCategory: 'labor', taxDeductible: true }),

    acc('630', 'Other External Expenses', AccountType.EXPENSE, 'External Expenses', true, { parent: '600' }),
    acc('631', 'Rent and Rates', AccountType.EXPENSE, 'Rent', false, { parent: '630', agriCategory: 'land', taxDeductible: true }),
    acc('632', 'Repairs and Maintenance', AccountType.EXPENSE, 'Repairs and Maintenance', false, { parent: '630', agriCategory: 'equipment', taxDeductible: true }),
    acc('633', 'Professional Fees', AccountType.EXPENSE, 'Professional Fees', false, { parent: '630', agriCategory: 'general', taxDeductible: true }),
    acc('634', 'Contract Services', AccountType.EXPENSE, 'Contract Services', false, { parent: '630', agriCategory: 'labor', taxDeductible: true }),
    acc('635', 'Subcontracted Labor', AccountType.EXPENSE, 'Subcontracted Labor', false, { parent: '630', agriCategory: 'labor', taxDeductible: true }),
    acc('636', 'Fuel and Energy', AccountType.EXPENSE, 'Fuel and Energy', false, { parent: '630', agriCategory: 'supplies', taxDeductible: true }),

    acc('640', 'Depreciation and Amortisation', AccountType.EXPENSE, 'Depreciation', false, { parent: '600', agriCategory: 'equipment', taxDeductible: true }),
    acc('650', 'Other Administrative Expenses', AccountType.EXPENSE, 'Administrative', false, { parent: '600', agriCategory: 'general', taxDeductible: true }),
    acc('660', 'Distribution Costs', AccountType.EXPENSE, 'Distribution', false, { parent: '600', agriCategory: 'general', taxDeductible: true }),
    acc('670', 'Other Operating Expenses', AccountType.EXPENSE, 'Other Operating', false, { parent: '600', agriCategory: 'general', taxDeductible: true }),

    acc('680', 'Finance Costs', AccountType.EXPENSE, 'Finance Costs', false, { parent: '500' }),
    acc('681', 'Interest Expense', AccountType.EXPENSE, 'Interest', false, { parent: '680', taxDeductible: true }),
    acc('682', 'Bank Charges', AccountType.EXPENSE, 'Bank Charges', false, { parent: '680', taxDeductible: true }),

    acc('690', ' taxation', AccountType.EXPENSE, 'Taxation', false, { parent: '500' }),
    acc('691', 'Corporation Tax', AccountType.EXPENSE, 'Corporation Tax', false, { parent: '690' }),
    acc('692', 'Deferred Tax', AccountType.EXPENSE, 'Deferred Tax Charge', false, { parent: '690' }),

    acc('695', 'Profit/Loss on Disposals', AccountType.EXPENSE, 'Loss on Disposals', false, { parent: '500' }),
  ],
};
