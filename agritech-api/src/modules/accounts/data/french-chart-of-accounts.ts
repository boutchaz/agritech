/**
 * French Chart of Accounts for Agricultural Businesses
 * Based on PCG 2014 (Plan Comptable Général)
 * Optimized for farming/agricultural operations
 * Reference: Réglement n° 2014-03 du 5 juin 2014
 */

import {
  CountryChartOfAccounts,
  ChartAccount,
  AccountingStandard,
  AccountType,
  AgriculturalCategory,
  AccountTranslations
} from './types';

// Helper function to create an account with minimal boilerplate
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
    translations?: AccountTranslations;
    agriCategory?: AgriculturalCategory;
    depreciationRate?: number;
    taxDeductible?: boolean;
    contra?: boolean;
  }
): ChartAccount {
  return {
    code,
    name,
    name_translations: options?.translations,
    account_type: type,
    account_subtype: subtype,
    is_group: isGroup,
    is_active: true,
    parent_code: options?.parent,
    currency_code: options?.currency || 'EUR',
    description: options?.desc,
    agricultural_category: options?.agriCategory,
    depreciation_rate: options?.depreciationRate,
    tax_deductible: options?.taxDeductible,
    contra_account: options?.contra,
  };
}

export const frenchChartOfAccounts: CountryChartOfAccounts = {
  metadata: {
    country_code: 'FR',
    country_name: 'France',
    country_name_native: 'France',
    accounting_standard: AccountingStandard.PCG,
    default_currency: 'EUR',
    fiscal_year_start_month: 1, // Calendar year
    version: '1.0.0',
    description: 'French PCG 2014 Chart of Accounts adapted for agricultural operations',
    supported_industries: ['agriculture', 'livestock', 'viticulture', 'organic_farming'],
    requires_vat_registration: true,
    standard_tax_rates: [
      { name: 'TVA Normal', rate: 20.0, applies_to: ['sales'], is_default: true },
      { name: 'TVA Intermédiaire', rate: 10.0, applies_to: ['sales'], is_default: false },
      { name: 'TVA Réduite', rate: 5.5, applies_to: ['sales'], is_default: false },
      { name: 'TVA Super-Réduite', rate: 2.1, applies_to: ['sales'], is_default: false },
    ],
  },
  accounts: [
    // =====================================================
    // CLASS 1: CAPITAL (CAPITAUX)
    // =====================================================

    acc('1', 'Capital', AccountType.EQUITY, 'Share Capital', true),
    acc('101', 'Capital social', AccountType.EQUITY, 'Share Capital', false, { parent: '1' }),
    acc('104', 'Primes d\'émission, de fusion, d\'apport', AccountType.EQUITY, 'Share Premium', false, { parent: '1' }),
    acc('105', 'Écarts de réévaluation', AccountType.EQUITY, 'Revaluation Reserve', false, { parent: '1' }),
    acc('106', 'Réserves', AccountType.EQUITY, 'Retained Earnings', false, { parent: '1' }),
    acc('1061', 'Réserve légale', AccountType.EQUITY, 'Legal Reserve', false, { parent: '106' }),
    acc('1063', 'Réserves statutaires ou contractuelles', AccountType.EQUITY, 'Statutory Reserves', false, { parent: '106' }),
    acc('1068', 'Autres réserves', AccountType.EQUITY, 'Other Reserves', false, { parent: '106' }),
    acc('108', 'Compte de l\'exploitant', AccountType.EQUITY, 'Owner\'s Drawings', false, { parent: '1', agriCategory: 'general' }),
    acc('12', 'Résultat de l\'exercice', AccountType.EQUITY, 'Current Year Earnings', true, { parent: '1' }),
    acc('120', 'Résultat de l\'exercice (bénéfice)', AccountType.EQUITY, 'Net Profit', false, { parent: '12' }),
    acc('129', 'Résultat de l\'exercice (perte)', AccountType.EQUITY, 'Net Loss', false, { parent: '12' }),
    acc('13', 'Subvention d\'investissement', AccountType.EQUITY, 'Investment Grants', true, { parent: '1' }),
    acc('131', 'Subventions d\'équipement', AccountType.EQUITY, 'Equipment Grants', false, { parent: '13', agriCategory: 'equipment' }),
    acc('138', 'Autres subventions d\'investissement', AccountType.EQUITY, 'Other Investment Grants', false, { parent: '13', agriCategory: 'general' }),
    acc('14', 'Provisions réglementées', AccountType.EQUITY, 'Regulatory Provisions', true, { parent: '1' }),
    acc('16', 'Emprunts et dettes assimilées', AccountType.LIABILITY, 'Long-Term Debt', true, { parent: '1' }),
    acc('168', 'Autres emprunts et dettes', AccountType.LIABILITY, 'Other Long-Term Debt', false, { parent: '16', agriCategory: 'general' }),

    // =====================================================
    // CLASS 2: FIXED ASSETS (IMMOBILISATIONS)
    // =====================================================

    acc('2', 'Immobilisations', AccountType.ASSET, 'Fixed Asset', true),
    acc('20', 'Immobilisations incorporelles', AccountType.ASSET, 'Intangible Fixed Asset', true, { parent: '2' }),
    acc('201', 'Frais d\'établissement', AccountType.ASSET, 'Organization Costs', false, { parent: '20' }),
    acc('206', 'Droit au bail', AccountType.ASSET, 'Leasehold Rights', false, { parent: '20' }),
    acc('207', 'Fonds commercial', AccountType.ASSET, 'Goodwill', false, { parent: '20' }),
    acc('208', 'Autres immobilisations incorporelles', AccountType.ASSET, 'Other Intangible Assets', false, { parent: '20' }),
    acc('21', 'Immobilisations corporelles', AccountType.ASSET, 'Tangible Fixed Asset', true, { parent: '2' }),
    acc('211', 'Terrains', AccountType.ASSET, 'Land', false, { parent: '21', agriCategory: 'land' }),
    acc('2111', 'Terrains agricoles', AccountType.ASSET, 'Agricultural Land', false, { parent: '211', agriCategory: 'land', desc: 'Terres agricoles, champs, pâtures, vignes, vergers' }),
    acc('2114', 'Terrains bâtis', AccountType.ASSET, 'Land with Buildings', false, { parent: '211', agriCategory: 'land' }),
    acc('2115', 'Terrains d\'exploitation', AccountType.ASSET, 'Farm Land', false, { parent: '211', agriCategory: 'land' }),
    acc('212', 'Agencements et aménagements de terrains', AccountType.ASSET, 'Land Improvements', false, { parent: '21', agriCategory: 'land', depreciationRate: 5 }),
    acc('213', 'Constructions', AccountType.ASSET, 'Buildings', false, { parent: '21', agriCategory: 'equipment', depreciationRate: 5 }),
    acc('2131', 'Bâtiments agricoles', AccountType.ASSET, 'Agricultural Buildings', false, { parent: '213', agriCategory: 'equipment', depreciationRate: 5, desc: 'Hangars, étables, serres, installations de stockage' }),
    acc('2135', 'Installations techniques', AccountType.ASSET, 'Technical Installations', false, { parent: '213', agriCategory: 'equipment', depreciationRate: 10 }),
    acc('214', 'Constructions sur sol d\'autrui', AccountType.ASSET, 'Leasehold Buildings', false, { parent: '21', agriCategory: 'equipment' }),
    acc('215', 'Matériel industriel', AccountType.ASSET, 'Industrial Equipment', true, { parent: '21', agriCategory: 'equipment' }),
    acc('2151', 'Installations complexes spécialisées', AccountType.ASSET, 'Specialized Installations', false, { parent: '215', agriCategory: 'equipment', depreciationRate: 10 }),
    acc('2154', 'Matériel industriel', AccountType.ASSET, 'Industrial Machinery', false, { parent: '215', agriCategory: 'equipment', depreciationRate: 10 }),
    acc('2155', 'Outillage industriel', AccountType.ASSET, 'Industrial Tools', false, { parent: '215', agriCategory: 'equipment', depreciationRate: 15 }),
    acc('218', 'Autres immobilisations corporelles', AccountType.ASSET, 'Other Tangible Assets', true, { parent: '21', agriCategory: 'general' }),
    acc('2181', 'Installations générales, agencements et aménagements', AccountType.ASSET, 'General Installations', false, { parent: '218', agriCategory: 'equipment', depreciationRate: 10 }),
    acc('2182', 'Matériel de transport', AccountType.ASSET, 'Transport Equipment', false, { parent: '218', agriCategory: 'equipment', depreciationRate: 20 }),
    acc('2183', 'Matériel de bureau et informatique', AccountType.ASSET, 'Office & IT Equipment', false, { parent: '218', agriCategory: 'equipment', depreciationRate: 20 }),
    acc('2184', 'Embouteillages', AccountType.ASSET, 'Packaging', false, { parent: '218', agriCategory: 'supplies' }),
    acc('2185', 'Matériel agricole', AccountType.ASSET, 'Agricultural Equipment', false, { parent: '218', agriCategory: 'equipment', depreciationRate: 12.5, desc: 'Tracteurs, moissonneuses, matériel d\'irrigation, matériel d\'élevage' }),
    acc('2186', 'Plantations', AccountType.ASSET, 'Plantations', false, { parent: '218', agriCategory: 'crop', depreciationRate: 4, desc: 'Vignes, vergers, cultures pérennes' }),
    acc('22', 'Immobilisations mises en concession', AccountType.ASSET, 'Conceded Assets', true, { parent: '2' }),
    acc('23', 'Immobilisations en cours', AccountType.ASSET, 'Assets in Progress', true, { parent: '2' }),
    acc('231', 'Immobilisations corporelles en cours', AccountType.ASSET, 'Tangible Assets in Progress', false, { parent: '23', agriCategory: 'equipment' }),
    acc('232', 'Immobilisations incorporelles en cours', AccountType.ASSET, 'Intangible Assets in Progress', false, { parent: '23' }),
    acc('238', 'Avances et acomptes versés sur immobilisations', AccountType.ASSET, 'Advances on Assets', false, { parent: '23' }),
    acc('25', 'Parts dans des entreprises liées', AccountType.ASSET, 'Investments in Related Companies', true, { parent: '2' }),
    acc('26', 'Participations', AccountType.ASSET, 'Investments', true, { parent: '2' }),
    acc('261', 'Titres de participation', AccountType.ASSET, 'Participating Shares', false, { parent: '26' }),
    acc('27', 'Autres immobilisations financières', AccountType.ASSET, 'Other Financial Assets', true, { parent: '2' }),
    acc('271', 'Titres immobilisés autres que les titres de participation', AccountType.ASSET, 'Other Investment Securities', false, { parent: '27' }),
    acc('274', 'Prêts', AccountType.ASSET, 'Loans', false, { parent: '27' }),
    acc('28', 'Amortissements des immobilisations', AccountType.ASSET, 'Accumulated Depreciation', true, { parent: '2', contra: true }),
    acc('280', 'Amortissements des immobilisations incorporelles', AccountType.ASSET, 'Amortization - Intangible Assets', false, { parent: '28', contra: true }),
    acc('281', 'Amortissements des immobilisations corporelles', AccountType.ASSET, 'Amortization - Tangible Assets', false, { parent: '28', contra: true }),
    acc('2812', 'Amortissements des agencements et aménagements', AccountType.ASSET, 'Amortization - Land Improvements', false, { parent: '281', contra: true }),
    acc('2813', 'Amortissements des constructions', AccountType.ASSET, 'Amortization - Buildings', false, { parent: '281', contra: true }),
    acc('2815', 'Amortissements du matériel industriel', AccountType.ASSET, 'Amortization - Industrial Equipment', false, { parent: '281', contra: true }),
    acc('2818', 'Amortissements des autres immobilisations', AccountType.ASSET, 'Amortization - Other Assets', false, { parent: '281', contra: true }),

    // =====================================================
    // CLASS 3: INVENTORY (STOCKS)
    // =====================================================

    acc('3', 'Stocks', AccountType.ASSET, 'Inventory', true),
    acc('31', 'Matières premières', AccountType.ASSET, 'Raw Materials', true, { parent: '3', agriCategory: 'supplies' }),
    acc('311', 'Semences et plants', AccountType.ASSET, 'Seeds and Seedlings', false, { parent: '31', agriCategory: 'supplies', desc: 'Semences, plants, bulbes, boutures' }),
    acc('312', 'Engrais et amendements', AccountType.ASSET, 'Fertilizers', false, { parent: '31', agriCategory: 'supplies', desc: 'Engrais NPK, amendements organiques, chaux' }),
    acc('313', 'Produits phytosanitaires', AccountType.ASSET, 'Phytosanitary Products', false, { parent: '31', agriCategory: 'supplies', desc: 'Pesticides, herbicides, fongicides' }),
    acc('314', 'Alimentation animale', AccountType.ASSET, 'Animal Feed', false, { parent: '31', agriCategory: 'livestock', desc: 'Fourrage, aliments complémentaires' }),
    acc('32', 'Autres approvisionnements', AccountType.ASSET, 'Other Supplies', true, { parent: '3', agriCategory: 'supplies' }),
    acc('321', 'Matières consommables', AccountType.ASSET, 'Consumable Materials', false, { parent: '32', agriCategory: 'supplies' }),
    acc('322', 'Fournitures consommables', AccountType.ASSET, 'Consumable Supplies', false, { parent: '32', agriCategory: 'supplies' }),
    acc('326', 'Emballages', AccountType.ASSET, 'Packaging', false, { parent: '32', agriCategory: 'supplies' }),
    acc('33', 'En-cours de production de biens', AccountType.ASSET, 'Work in Progress', true, { parent: '3' }),
    acc('331', 'Produits en cours', AccountType.ASSET, 'Goods in Process', false, { parent: '33', agriCategory: 'crop' }),
    acc('3311', 'Cultures en cours', AccountType.ASSET, 'Growing Crops', false, { parent: '331', agriCategory: 'crop', desc: 'Cultures annuelles en cours de croissance' }),
    acc('3312', 'Élevage en cours', AccountType.ASSET, 'Livestock in Process', false, { parent: '331', agriCategory: 'livestock', desc: 'Animaux en engraissement' }),
    acc('34', 'Produits intermédiaires', AccountType.ASSET, 'Semi-Finished Goods', true, { parent: '3' }),
    acc('35', 'Produits finis', AccountType.ASSET, 'Finished Goods', true, { parent: '3', agriCategory: 'crop' }),
    acc('351', 'Produits agricoles', AccountType.ASSET, 'Agricultural Products', false, { parent: '35', agriCategory: 'crop', desc: 'Récoltes, fruits, légumes' }),
    acc('3511', 'Céréales', AccountType.ASSET, 'Cereals', false, { parent: '351', agriCategory: 'crop' }),
    acc('3512', 'Fruits et légumes', AccountType.ASSET, 'Fruits and Vegetables', false, { parent: '351', agriCategory: 'crop' }),
    acc('3513', 'Vins', AccountType.ASSET, 'Wines', false, { parent: '351', agriCategory: 'crop' }),
    acc('352', 'Produits de l\'élevage', AccountType.ASSET, 'Livestock Products', false, { parent: '35', agriCategory: 'livestock' }),
    acc('3521', 'Animaux vivants', AccountType.ASSET, 'Live Animals', false, { parent: '352', agriCategory: 'livestock', desc: 'Cheptel destiné à la vente' }),
    acc('3522', 'Produits d\'origine animale', AccountType.ASSET, 'Animal Products', false, { parent: '352', agriCategory: 'livestock', desc: 'Lait, œufs, viande' }),
    acc('355', 'Produits transformés', AccountType.ASSET, 'Processed Products', false, { parent: '35', agriCategory: 'crop' }),
    acc('36', 'Produits résiduels', AccountType.ASSET, 'By-Products', true, { parent: '3' }),
    acc('37', 'Stocks de marchandises', AccountType.ASSET, 'Merchandise Inventory', true, { parent: '3' }),
    acc('39', 'Provisions pour dépréciation des stocks', AccountType.ASSET, 'Inventory Allowances', true, { parent: '3', contra: true }),

    // =====================================================
    // CLASS 4: THIRD PARTIES (TIERS)
    // =====================================================

    acc('4', 'Comptes de tiers', AccountType.ASSET, 'Third Parties', true),
    acc('40', 'Fournisseurs et comptes rattachés', AccountType.LIABILITY, 'Suppliers', true, { parent: '4' }),
    acc('401', 'Fournisseurs', AccountType.LIABILITY, 'Trade Payables', false, { parent: '40', agriCategory: 'general' }),
    acc('4011', 'Fournisseurs - Intrants agricoles', AccountType.LIABILITY, 'Agricultural Input Suppliers', false, { parent: '401', agriCategory: 'supplies' }),
    acc('4012', 'Fournisseurs - Équipements', AccountType.LIABILITY, 'Equipment Suppliers', false, { parent: '401', agriCategory: 'equipment' }),
    acc('403', 'Fournisseurs - Effets à payer', AccountType.LIABILITY, 'Bills Payable to Suppliers', false, { parent: '40' }),
    acc('404', 'Fournisseurs de travaux', AccountType.LIABILITY, 'Contractors', false, { parent: '40' }),
    acc('41', 'Clients et comptes rattachés', AccountType.ASSET, 'Customers', true, { parent: '4' }),
    acc('411', 'Clients', AccountType.ASSET, 'Trade Receivables', false, { parent: '411', agriCategory: 'general' }),
    acc('4111', 'Clients - Ventes agricoles', AccountType.ASSET, 'Agricultural Sales Customers', false, { parent: '411', agriCategory: 'crop' }),
    acc('4112', 'Clients - Exportations', AccountType.ASSET, 'Export Customers', false, { parent: '411', agriCategory: 'general' }),
    acc('413', 'Clients - Effets à recevoir', AccountType.ASSET, 'Bills Receivable', false, { parent: '41' }),
    acc('416', 'Clients douteux', AccountType.ASSET, 'Doubtful Accounts', false, { parent: '41' }),
    acc('418', 'Clients - Produits non encore facturés', AccountType.ASSET, 'Unbilled Revenue', false, { parent: '41' }),
    acc('42', 'Personnel et comptes rattachés', AccountType.ASSET, 'Personnel', true, { parent: '4', agriCategory: 'labor' }),
    acc('421', 'Personnel - Rémunérations dues', AccountType.LIABILITY, 'Wages Payable', false, { parent: '42', agriCategory: 'labor' }),
    acc('422', 'Personnel - Avances et acomptes', AccountType.ASSET, 'Advances to Employees', false, { parent: '42', agriCategory: 'labor' }),
    acc('428', 'Personnel - Charges à payer et produits à recevoir', AccountType.ASSET, 'Personnel Payable/Receivable', false, { parent: '42', agriCategory: 'labor' }),
    acc('43', 'Sécurité sociale et autres organismes', AccountType.LIABILITY, 'Social Security', true, { parent: '4' }),
    acc('431', 'Sécurité sociale', AccountType.LIABILITY, 'Social Security', false, { parent: '43', agriCategory: 'labor', desc: 'URSSAF, MSF, etc.' }),
    acc('437', 'Autres organismes sociaux', AccountType.LIABILITY, 'Other Social Organizations', false, { parent: '43', agriCategory: 'labor', desc: 'Caisses de retraite, mutuelles' }),
    acc('44', 'État et collectivités', AccountType.LIABILITY, 'State & Public Authorities', true, { parent: '4' }),
    acc('441', 'État - Subventions à recevoir', AccountType.ASSET, 'Government Grants Receivable', false, { parent: '44', agriCategory: 'general', desc: 'Subventions PAC, aides agricoles' }),
    acc('442', 'État - Impôts et taxes recouvrables', AccountType.ASSET, 'Taxes Receivable', false, { parent: '44', agriCategory: 'general' }),
    acc('443', 'État - Impôts et taxes dus', AccountType.LIABILITY, 'Taxes Payable', false, { parent: '44', agriCategory: 'general' }),
    acc('4431', 'Impôt sur les bénéfices', AccountType.LIABILITY, 'Corporate Income Tax', false, { parent: '443', agriCategory: 'general' }),
    acc('4435', 'Taxes sur le chiffre d\'affaires', AccountType.LIABILITY, 'VAT Payable', false, { parent: '443', agriCategory: 'general' }),
    acc('4456', 'TVA déductible', AccountType.ASSET, 'Deductible VAT', false, { parent: '442', agriCategory: 'general' }),
    acc('4437', 'TVA collectée', AccountType.LIABILITY, 'VAT Collected', false, { parent: '443', agriCategory: 'general' }),
    acc('445', 'État - Charges à payer', AccountType.LIABILITY, 'Taxes Payable', false, { parent: '44', agriCategory: 'general' }),
    acc('446', 'Associés', AccountType.LIABILITY, 'Shareholders', true, { parent: '4' }),
    acc('45', 'Associés - Comptes courants', AccountType.LIABILITY, 'Shareholder Current Accounts', false, { parent: '446' }),
    acc('46', 'Débiteurs divers et créditeurs divers', AccountType.ASSET, 'Miscellaneous Debtors/Creditors', true, { parent: '4' }),
    acc('467', 'Autres comptes débiteurs', AccountType.ASSET, 'Other Debtors', false, { parent: '46' }),
    acc('468', 'Autres comptes créditeurs', AccountType.LIABILITY, 'Other Creditors', false, { parent: '46' }),
    acc('48', 'Comptes de régularisation', AccountType.ASSET, 'Accruals & Deferrals', true, { parent: '4' }),
    acc('481', 'Charges à répartir', AccountType.ASSET, 'Deferred Charges', false, { parent: '48', agriCategory: 'general' }),
    acc('486', 'Charges constatées d\'avance', AccountType.ASSET, 'Prepaid Expenses', false, { parent: '48', agriCategory: 'general' }),
    acc('487', 'Produits constatés d\'avance', AccountType.LIABILITY, 'Deferred Revenue', false, { parent: '48', agriCategory: 'general' }),
    acc('49', 'Provisions pour dépréciation des comptes de tiers', AccountType.ASSET, 'Allowances for Third Parties', true, { parent: '4', contra: true }),
    acc('491', 'Provisions pour dépréciation des comptes de clients', AccountType.ASSET, 'Allowance for Doubtful Accounts', false, { parent: '49', contra: true }),

    // =====================================================
    // CLASS 5: FINANCIAL (TRESORERIE)
    // =====================================================

    acc('5', 'Trésorerie', AccountType.ASSET, 'Treasury', true),
    acc('50', 'Valeurs mobilières de placement', AccountType.ASSET, 'Short-Term Investments', true, { parent: '5' }),
    acc('51', 'Banques', AccountType.ASSET, 'Banks', true, { parent: '5' }),
    acc('511', 'Banques - Comptes en euros', AccountType.ASSET, 'Bank Accounts - EUR', false, { parent: '51' }),
    acc('512', 'Banques - Comptes en devises', AccountType.ASSET, 'Bank Accounts - Foreign Currency', false, { parent: '51' }),
    acc('53', 'Caisse', AccountType.ASSET, 'Cash on Hand', true, { parent: '5' }),
    acc('531', 'Caisse siège', AccountType.ASSET, 'Main Cash', false, { parent: '53', agriCategory: 'general' }),
    acc('54', 'Régies d\'avances et accréditifs', AccountType.ASSET, 'Petty Cash', true, { parent: '5' }),
    acc('58', 'Virements internes', AccountType.ASSET, 'Internal Transfers', false, { parent: '5' }),
    acc('59', 'Provisions pour dépréciation des comptes de trésorerie', AccountType.ASSET, 'Allowances for Treasury', false, { parent: '5', contra: true }),

    // =====================================================
    // CLASS 6: EXPENSES (CHARGES)
    // =====================================================

    acc('6', 'Charges', AccountType.EXPENSE, 'Expenses', true),
    acc('60', 'Achats', AccountType.EXPENSE, 'Purchases', true, { parent: '6', taxDeductible: true }),
    acc('601', 'Achats de semences et plants', AccountType.EXPENSE, 'Seeds and Plants', false, { parent: '60', agriCategory: 'supplies', taxDeductible: true }),
    acc('602', 'Achats d\'engrais', AccountType.EXPENSE, 'Fertilizers', false, { parent: '60', agriCategory: 'supplies', taxDeductible: true }),
    acc('603', 'Achats de produits phytosanitaires', AccountType.EXPENSE, 'Phytosanitary Products', false, { parent: '60', agriCategory: 'supplies', taxDeductible: true }),
    acc('604', 'Achats d\'alimentation animale', AccountType.EXPENSE, 'Animal Feed', false, { parent: '60', agriCategory: 'livestock', taxDeductible: true }),
    acc('605', 'Achats de matières consommables', AccountType.EXPENSE, 'Consumable Materials', false, { parent: '60', agriCategory: 'supplies', taxDeductible: true }),
    acc('606', 'Achats de fournitures', AccountType.EXPENSE, 'Supplies', false, { parent: '60', agriCategory: 'supplies', taxDeductible: true }),
    acc('61', 'Services extérieurs', AccountType.EXPENSE, 'External Services', true, { parent: '6', taxDeductible: true }),
    acc('611', 'Sous-traitance agricole', AccountType.EXPENSE, 'Agricultural Subcontracting', false, { parent: '61', agriCategory: 'labor', taxDeductible: true }),
    acc('612', 'Redevances de crédit-bail', AccountType.EXPENSE, 'Lease Payments', false, { parent: '61', agriCategory: 'equipment', taxDeductible: true }),
    acc('613', 'Locations', AccountType.EXPENSE, 'Rent', false, { parent: '61', agriCategory: 'land', taxDeductible: true }),
    acc('614', 'Charges de location', AccountType.EXPENSE, 'Rental Charges', false, { parent: '61', agriCategory: 'land', taxDeductible: true }),
    acc('615', 'Entretien et réparations', AccountType.EXPENSE, 'Maintenance and Repairs', false, { parent: '61', agriCategory: 'equipment', taxDeductible: true }),
    acc('6151', 'Entretien du matériel agricole', AccountType.EXPENSE, 'Agricultural Equipment Maintenance', false, { parent: '615', agriCategory: 'equipment', taxDeductible: true }),
    acc('616', 'Primes d\'assurance', AccountType.EXPENSE, 'Insurance Premiums', false, { parent: '61', agriCategory: 'general', taxDeductible: true }),
    acc('617', 'Études et recherches', AccountType.EXPENSE, 'Research and Development', false, { parent: '61', agriCategory: 'general', taxDeductible: true }),
    acc('618', 'Divers', AccountType.EXPENSE, 'Miscellaneous Services', false, { parent: '61', agriCategory: 'general', taxDeductible: true }),
    acc('62', 'Autres services extérieurs', AccountType.EXPENSE, 'Other External Services', true, { parent: '6', taxDeductible: true }),
    acc('622', 'Rémunérations d\'intermédiaires', AccountType.EXPENSE, 'Contractor Payments', false, { parent: '62', agriCategory: 'labor', taxDeductible: true }),
    acc('623', 'Honoraires', AccountType.EXPENSE, 'Professional Fees', false, { parent: '62', agriCategory: 'general', taxDeductible: true }),
    acc('624', 'Frais de transport', AccountType.EXPENSE, 'Transportation', false, { parent: '62', agriCategory: 'general', taxDeductible: true }),
    acc('63', 'Impôts et taxes', AccountType.EXPENSE, 'Taxes', true, { parent: '6' }),
    acc('635', 'Autres impôts et taxes', AccountType.EXPENSE, 'Other Taxes', false, { parent: '63', agriCategory: 'general' }),
    acc('64', 'Charges de personnel', AccountType.EXPENSE, 'Personnel Expenses', true, { parent: '6', taxDeductible: true }),
    acc('641', 'Rémunérations du personnel', AccountType.EXPENSE, 'Wages and Salaries', false, { parent: '64', agriCategory: 'labor', taxDeductible: true }),
    acc('6411', 'Salaires', AccountType.EXPENSE, 'Salaries', false, { parent: '641', agriCategory: 'labor', taxDeductible: true }),
    acc('6412', 'Appointements et commissions', AccountType.EXPENSE, 'Commissions', false, { parent: '641', agriCategory: 'labor', taxDeductible: true }),
    acc('6413', 'Congés payés', AccountType.EXPENSE, 'Paid Leave', false, { parent: '641', agriCategory: 'labor', taxDeductible: true }),
    acc('6414', 'Primes et gratifications', AccountType.EXPENSE, 'Bonuses', false, { parent: '641', agriCategory: 'labor', taxDeductible: true }),
    acc('642', 'Charges de sécurité sociale', AccountType.EXPENSE, 'Social Security Contributions', false, { parent: '64', agriCategory: 'labor', taxDeductible: true }),
    acc('643', 'Charges de retraite', AccountType.EXPENSE, 'Pension Contributions', false, { parent: '64', agriCategory: 'labor', taxDeductible: true }),
    acc('644', 'Charges de mutuelle', AccountType.EXPENSE, 'Health Insurance', false, { parent: '64', agriCategory: 'labor', taxDeductible: true }),
    acc('645', 'Charges de formation', AccountType.EXPENSE, 'Training Costs', false, { parent: '64', agriCategory: 'labor', taxDeductible: true }),
    acc('646', 'Cotisations syndicales', AccountType.EXPENSE, 'Union Dues', false, { parent: '64', agriCategory: 'labor', taxDeductible: true }),
    acc('647', 'Autres charges sociales', AccountType.EXPENSE, 'Other Social Charges', false, { parent: '64', agriCategory: 'labor', taxDeductible: true }),
    acc('648', 'Autres charges de personnel', AccountType.EXPENSE, 'Other Personnel Costs', false, { parent: '64', agriCategory: 'labor', taxDeductible: true }),
    acc('65', 'Autres charges de gestion courante', AccountType.EXPENSE, 'Other Operating Expenses', true, { parent: '6' }),
    acc('651', 'Redevances pour concessions, brevets, licences', AccountType.EXPENSE, 'Royalties', false, { parent: '65', agriCategory: 'general', taxDeductible: true }),
    acc('653', 'Jetés de produits', AccountType.EXPENSE, 'Waste Products', false, { parent: '65', agriCategory: 'general', taxDeductible: true }),
    acc('654', 'Pertes sur créances irrécouvrables', AccountType.EXPENSE, 'Bad Debts', false, { parent: '65', agriCategory: 'general', taxDeductible: true }),
    acc('655', 'Quote-part de résultat sur opérations faites en commun', AccountType.EXPENSE, 'Share of Joint Operations', false, { parent: '65', agriCategory: 'general' }),
    acc('657', 'Charges exceptionnelles', AccountType.EXPENSE, 'Exceptional Expenses', false, { parent: '65', agriCategory: 'general' }),
    acc('66', 'Charges financières', AccountType.EXPENSE, 'Financial Expenses', true, { parent: '6' }),
    acc('661', 'Intérêts sur emprunts', AccountType.EXPENSE, 'Interest Expense', false, { parent: '66', agriCategory: 'general', taxDeductible: true }),
    acc('665', 'Escomptes accordés', AccountType.EXPENSE, 'Discounts Given', false, { parent: '66', agriCategory: 'general' }),
    acc('667', 'Pertes de change', AccountType.EXPENSE, 'Exchange Losses', false, { parent: '66', agriCategory: 'general' }),
    acc('668', 'Charges nettes sur cessions de valeurs mobilières', AccountType.EXPENSE, 'Net Loss on Securities', false, { parent: '66', agriCategory: 'general' }),
    acc('68', 'Dotations aux amortissements et provisions', AccountType.EXPENSE, 'Depreciation & Provisions', true, { parent: '6', taxDeductible: true }),
    acc('681', 'Dotations aux amortissements', AccountType.EXPENSE, 'Depreciation Expense', false, { parent: '68', agriCategory: 'equipment', taxDeductible: true }),
    acc('6811', 'Amortissements des immobilisations incorporelles', AccountType.EXPENSE, 'Amortization - Intangible Assets', false, { parent: '681', taxDeductible: true }),
    acc('6812', 'Amortissements des immobilisations corporelles', AccountType.EXPENSE, 'Amortization - Tangible Assets', false, { parent: '681', agriCategory: 'equipment', taxDeductible: true }),
    acc('6815', 'Amortissements du matériel agricole', AccountType.EXPENSE, 'Amortization - Agricultural Equipment', false, { parent: '6812', agriCategory: 'equipment', taxDeductible: true }),
    acc('6816', 'Amortissements des plantations', AccountType.EXPENSE, 'Amortization - Plantations', false, { parent: '6812', agriCategory: 'crop', taxDeductible: true }),
    acc('687', 'Dotations aux provisions', AccountType.EXPENSE, 'Provision Expense', false, { parent: '68', taxDeductible: true }),
    acc('69', 'Participation des salariés, impôts sur les bénéfices', AccountType.EXPENSE, 'Profit Sharing & Taxes', true, { parent: '6' }),
    acc('691', 'Participation des salariés aux résultats', AccountType.EXPENSE, 'Employee Profit Sharing', false, { parent: '69' }),
    acc('695', 'Impôts sur les bénéfices', AccountType.EXPENSE, 'Income Tax Expense', false, { parent: '69' }),

    // =====================================================
    // CLASS 7: REVENUE (PRODUITS)
    // =====================================================

    acc('7', 'Produits', AccountType.REVENUE, 'Revenue', true),
    acc('70', 'Ventes de produits finis', AccountType.REVENUE, 'Sales of Finished Goods', true, { parent: '7' }),
    acc('701', 'Ventes de produits agricoles', AccountType.REVENUE, 'Agricultural Sales', false, { parent: '70', agriCategory: 'crop' }),
    acc('7011', 'Ventes de céréales', AccountType.REVENUE, 'Cereal Sales', false, { parent: '701', agriCategory: 'crop' }),
    acc('7012', 'Ventes de fruits et légumes', AccountType.REVENUE, 'Fruit & Vegetable Sales', false, { parent: '701', agriCategory: 'crop' }),
    acc('7013', 'Ventes de vins', AccountType.REVENUE, 'Wine Sales', false, { parent: '701', agriCategory: 'crop' }),
    acc('702', 'Ventes de produits de l\'élevage', AccountType.REVENUE, 'Livestock Sales', false, { parent: '70', agriCategory: 'livestock' }),
    acc('7021', 'Ventes d\'animaux vivants', AccountType.REVENUE, 'Live Animal Sales', false, { parent: '702', agriCategory: 'livestock' }),
    acc('7022', 'Ventes de produits d\'origine animale', AccountType.REVENUE, 'Animal Product Sales', false, { parent: '702', agriCategory: 'livestock' }),
    acc('703', 'Ventes de produits transformés', AccountType.REVENUE, 'Processed Product Sales', false, { parent: '70', agriCategory: 'crop' }),
    acc('708', 'Produits des activités annexes', AccountType.REVENUE, 'By-Product Sales', false, { parent: '70' }),
    acc('71', 'Production stockée', AccountType.REVENUE, 'Production Inventory', true, { parent: '7' }),
    acc('713', 'Variation des stocks (en-cours, produits finis)', AccountType.REVENUE, 'Change in Inventory', false, { parent: '71' }),
    acc('72', 'Production immobilisée', AccountType.REVENUE, 'Capitalized Production', true, { parent: '7' }),
    acc('74', 'Subventions d\'exploitation', AccountType.REVENUE, 'Operating Grants', false, { parent: '7', agriCategory: 'general', desc: 'PAC, aides agricoles' }),
    acc('75', 'Autres produits de gestion courante', AccountType.REVENUE, 'Other Operating Income', true, { parent: '7' }),
    acc('751', 'Jetés de produits', AccountType.REVENUE, 'Scrap Sales', false, { parent: '75', agriCategory: 'general' }),
    acc('752', 'Revenus sur créances irrécouvrables', AccountType.REVENUE, 'Recovery of Bad Debts', false, { parent: '75', agriCategory: 'general' }),
    acc('754', 'Quote-part de résultat sur opérations faites en commun', AccountType.REVENUE, 'Share of Joint Operations', false, { parent: '75', agriCategory: 'general' }),
    acc('755', 'Produits exceptionnels', AccountType.REVENUE, 'Exceptional Income', false, { parent: '75', agriCategory: 'general' }),
    acc('76', 'Produits financiers', AccountType.REVENUE, 'Financial Income', true, { parent: '7' }),
    acc('761', 'Intérêts sur prêts', AccountType.REVENUE, 'Interest Income', false, { parent: '76', agriCategory: 'general' }),
    acc('762', 'Dividendes', AccountType.REVENUE, 'Dividend Income', false, { parent: '76', agriCategory: 'general' }),
    acc('764', 'Revenus des valeurs mobilières', AccountType.REVENUE, 'Investment Income', false, { parent: '76', agriCategory: 'general' }),
    acc('765', 'Escomptes obtenus', AccountType.REVENUE, 'Discounts Received', false, { parent: '76', agriCategory: 'general' }),
    acc('766', 'Gains de change', AccountType.REVENUE, 'Exchange Gains', false, { parent: '76', agriCategory: 'general' }),
    acc('77', 'Reprises sur provisions', AccountType.REVENUE, 'Reversal of Provisions', true, { parent: '7' }),
    acc('78', 'Transferts de charges', AccountType.REVENUE, 'Transfer of Expenses', false, { parent: '7' }),
  ],
};
