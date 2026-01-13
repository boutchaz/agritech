/**
 * Tunisian Chart of Accounts (PCN - Plan Comptable National)
 *
 * Tunisian National Accounting Plan with agricultural-specific accounts
 *
 * Key Features:
 * - 3-digit account codes (000-999)
 * - Class 1: Capital (Capitaux)
 * - Class 2: Fixed Assets (Immobilisations)
 * - Class 3: Inventory (Stocks)
 * - Class 4: Third Parties (Tiers)
 * - Class 5: Financial (Financier)
 * - Class 6: Expenses (Charges)
 * - Class 7: Revenue (Produits)
 *
 * VAT Rates:
 * - Standard: 19%
 * - Reduced: 13%
 * - Higher: 29% (for luxury goods)
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
    frName?: string;
    arName?: string;
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
      fr: options?.frName || name,
      ar: options?.arName || name,
      en: options?.enName || name,
    },
  };

  return account;
}

/**
 * Tunisian Chart of Accounts Metadata
 */
export const tunisianChartMetadata: ChartMetadata = {
  country_code: 'TN',
  country_name: 'Tunisia',
  country_name_native: 'تونس',
  accounting_standard: AccountingStandard.PCN,
  default_currency: 'TND',
  fiscal_year_start_month: 1,
  version: '1.0.0',
  description: 'Tunisian National Chart of Accounts (PCN) with agricultural-specific accounts for farming, olive cultivation, and livestock',
  supported_industries: ['agriculture', 'olive', 'livestock', 'dairy', 'cereals', 'date_palms', 'citrus', 'viticulture'],
  requires_vat_registration: true,
  standard_tax_rates: [
    {
      name: 'TVA Normal 19%',
      rate: 19.0,
      applies_to: ['sales', 'purchases', 'services'],
      is_default: true,
      description: 'Standard VAT rate in Tunisia',
    },
    {
      name: 'TVA Réduite 13%',
      rate: 13.0,
      applies_to: ['sales', 'services'],
      is_default: false,
      description: 'Reduced VAT rate for certain sectors',
    },
    {
      name: 'TVA Majorée 29%',
      rate: 29.0,
      applies_to: ['sales'],
      is_default: false,
      description: 'Higher VAT rate for luxury goods',
    },
  ],
};

/**
 * Tunisian Chart of Accounts (PCN)
 * Agricultural-focused with comprehensive coverage
 */
export const tunisianChartOfAccounts: CountryChartOfAccounts = {
  metadata: tunisianChartMetadata,
  accounts: [
    // ============================================================
    // CLASS 1: CAPITAL (CAPITAUX)
    // ============================================================

    acc('1', 'Capitaux', AccountType.LIABILITY, 'Capital', true, {
      frName: 'Capitaux',
      arName: 'رؤوس الأموال',
      enName: 'Capital',
    }),
    acc('10', 'Capital', AccountType.EQUITY, 'Share Capital', true, {
      parent: '1',
      frName: 'Capital',
      arName: 'رأس المال',
      enName: 'Share Capital',
    }),
    acc('101', 'Capital social', AccountType.EQUITY, 'Share Capital', false, {
      parent: '10',
      frName: 'Capital social',
      arName: 'رأس المال الاجتماعي',
      enName: 'Share Capital',
    }),
    acc('11', 'Réserves', AccountType.EQUITY, 'Reserves', true, {
      parent: '1',
      frName: 'Réserves',
      arName: 'الاحتياطيات',
      enName: 'Reserves',
    }),
    acc('111', 'Réserve légale', AccountType.EQUITY, 'Legal Reserve', false, {
      parent: '11',
      frName: 'Réserve légale',
      arName: 'الاحتياطي القانوني',
      enName: 'Legal Reserve',
    }),
    acc('12', 'Résultat', AccountType.EQUITY, 'Profit/Loss', true, {
      parent: '1',
      frName: 'Résultat',
      arName: 'النتيجة',
      enName: 'Profit/Loss',
    }),
    acc('121', 'Résultat de l\'exercice', AccountType.EQUITY, 'Net Profit', false, {
      parent: '12',
      frName: 'Résultat de l\'exercice',
      arName: 'نتيجة السنة المالية',
      enName: 'Net Profit',
    }),
    acc('13', 'Subventions d\'investissement', AccountType.EQUITY, 'Investment Grants', true, {
      parent: '1',
      agriCategory: 'general',
      frName: 'Subventions d\'investissement',
      arName: 'منح الاستثمار',
      enName: 'Investment Grants',
    }),
    acc('131', 'Subventions d\'équipement', AccountType.EQUITY, 'Equipment Grants', false, {
      parent: '13',
      agriCategory: 'equipment',
      frName: 'Subventions d\'équipement',
      arName: 'منح المعدات',
      enName: 'Equipment Grants',
    }),
    acc('16', 'Emprunts et dettes', AccountType.LIABILITY, 'Loans', true, {
      parent: '1',
      frName: 'Emprunts et dettes',
      arName: 'القروض والديون',
      enName: 'Loans and Debts',
    }),
    acc('161', 'Emprunts bancaires', AccountType.LIABILITY, 'Bank Loans', false, {
      parent: '16',
      frName: 'Emprunts bancaires',
      arName: 'القروض البنكية',
      enName: 'Bank Loans',
    }),

    // ============================================================
    // CLASS 2: FIXED ASSETS (IMMOBILISATIONS)
    // ============================================================

    acc('2', 'Immobilisations', AccountType.ASSET, 'Fixed Assets', true, {
      frName: 'Immobilisations',
      arName: 'الأصول الثابتة',
      enName: 'Fixed Assets',
    }),

    // Intangible Assets
    acc('20', 'Immobilisations incorporelles', AccountType.ASSET, 'Intangible Assets', true, {
      parent: '2',
      frName: 'Immobilisations incorporelles',
      arName: 'الأصول غير الملموسة',
      enName: 'Intangible Assets',
    }),
    acc('203', 'Fonds commercial', AccountType.ASSET, 'Goodwill', false, {
      parent: '20',
      frName: 'Fonds commercial',
      arName: 'السمعة التجارية',
      enName: 'Goodwill',
    }),

    // Tangible Assets
    acc('21', 'Immobilisations corporelles', AccountType.ASSET, 'Tangible Assets', true, {
      parent: '2',
      frName: 'Immobilisations corporelles',
      arName: 'الأصول الملموسة',
      enName: 'Tangible Assets',
    }),
    acc('211', 'Terrains', AccountType.ASSET, 'Land', false, {
      parent: '21',
      agriCategory: 'land',
      frName: 'Terrains',
      arName: 'الأراضي',
      enName: 'Land',
    }),
    acc('212', 'Exploitations agricoles', AccountType.ASSET, 'Agricultural Land', true, {
      parent: '211',
      agriCategory: 'land',
      frName: 'Exploitations agricoles',
      arName: 'الأراضي الزراعية',
      enName: 'Agricultural Land',
    }),
    acc('2121', 'Terres labourables', AccountType.ASSET, 'Arable Land', false, {
      parent: '212',
      agriCategory: 'land',
      frName: 'Terres labourables',
      arName: 'الأراضي القابلة للحرث',
      enName: 'Arable Land',
    }),
    acc('2122', 'Vergers', AccountType.ASSET, 'Orchards', false, {
      parent: '212',
      agriCategory: 'land',
      frName: 'Vergers',
      arName: 'البساتين',
      enName: 'Orchards',
    }),
    acc('2123', 'Oliveraies', AccountType.ASSET, 'Olive Groves', false, {
      parent: '212',
      agriCategory: 'land',
      frName: 'Oliveraies',
      arName: 'مزارع الزيتون',
      enName: 'Olive Groves',
    }),
    acc('2124', 'Palmeraies', AccountType.ASSET, 'Palm Groves', false, {
      parent: '212',
      agriCategory: 'land',
      frName: 'Palmeraies',
      arName: 'مزارع النخيل',
      enName: 'Date Palm Groves',
    }),
    acc('2125', 'Vignes', AccountType.ASSET, 'Vineyards', false, {
      parent: '212',
      agriCategory: 'land',
      frName: 'Vignes',
      arName: 'الكروم',
      enName: 'Vineyards',
    }),
    acc('2126', 'Pâturages', AccountType.ASSET, 'Pastures', false, {
      parent: '212',
      agriCategory: 'land',
      frName: 'Pâturages',
      arName: 'المراعي',
      enName: 'Pastures',
    }),
    acc('213', 'Constructions', AccountType.ASSET, 'Buildings', true, {
      parent: '21',
      agriCategory: 'equipment',
      frName: 'Constructions',
      arName: 'المباني',
      enName: 'Buildings',
      depreciationRate: 5.0,
    }),
    acc('2131', 'Bâtiments agricoles', AccountType.ASSET, 'Agricultural Buildings', false, {
      parent: '213',
      agriCategory: 'equipment',
      frName: 'Bâtiments agricoles',
      arName: 'المباني الزراعية',
      enName: 'Agricultural Buildings',
      depreciationRate: 5.0,
    }),
    acc('2132', 'Hangars', AccountType.ASSET, 'Sheds', false, {
      parent: '213',
      agriCategory: 'equipment',
      frName: 'Hangars',
      arName: 'الأسقف',
      enName: 'Storage Sheds',
      depreciationRate: 5.0,
    }),
    acc('2133', 'Étables', AccountType.ASSET, 'Stables', false, {
      parent: '213',
      agriCategory: 'equipment',
      frName: 'Étables',
      arName: 'الإسطبلات',
      enName: 'Livestock Sheds',
      depreciationRate: 5.0,
    }),
    acc('2134', 'Serres', AccountType.ASSET, 'Greenhouses', false, {
      parent: '213',
      agriCategory: 'equipment',
      frName: 'Serres',
      arName: 'البيوت البلاستيكية',
      enName: 'Greenhouses',
      depreciationRate: 10.0,
    }),
    acc('214', 'Installations techniques', AccountType.ASSET, 'Technical Installations', true, {
      parent: '21',
      agriCategory: 'equipment',
      frName: 'Installations techniques',
      arName: 'التركيبات التقنية',
      enName: 'Technical Installations',
      depreciationRate: 10.0,
    }),
    acc('2141', 'Systèmes d\'irrigation', AccountType.ASSET, 'Irrigation Systems', false, {
      parent: '214',
      agriCategory: 'equipment',
      frName: 'Systèmes d\'irrigation',
      arName: 'أنظمة الري',
      enName: 'Irrigation Systems',
      depreciationRate: 10.0,
    }),
    acc('2142', 'Installations de pompage', AccountType.ASSET, 'Pumping Stations', false, {
      parent: '214',
      agriCategory: 'equipment',
      frName: 'Installations de pompage',
      arName: 'محطات الضخ',
      enName: 'Pumping Stations',
      depreciationRate: 10.0,
    }),
    acc('215', 'Matériel et outillage', AccountType.ASSET, 'Machinery and Tools', true, {
      parent: '21',
      agriCategory: 'equipment',
      frName: 'Matériel et outillage',
      arName: 'المعدات والأدوات',
      enName: 'Machinery and Tools',
      depreciationRate: 15.0,
    }),
    acc('2151', 'Tracteurs', AccountType.ASSET, 'Tractors', false, {
      parent: '215',
      agriCategory: 'equipment',
      frName: 'Tracteurs',
      arName: 'الجرارات',
      enName: 'Tractors',
      depreciationRate: 15.0,
    }),
    acc('2152', 'Moissonneuses', AccountType.ASSET, 'Harvesters', false, {
      parent: '215',
      agriCategory: 'equipment',
      frName: 'Moissonneuses',
      arName: 'الحاصدات',
      enName: 'Combine Harvesters',
      depreciationRate: 15.0,
    }),
    acc('2153', 'Charrues et herses', AccountType.ASSET, 'Plows and Harrows', false, {
      parent: '215',
      agriCategory: 'equipment',
      frName: 'Charrues et herses',
      arName: 'المحاريث والهراسات',
      enName: 'Plows and Harrows',
      depreciationRate: 20.0,
    }),
    acc('2154', 'Semoirs', AccountType.ASSET, 'Seeders', false, {
      parent: '215',
      agriCategory: 'equipment',
      frName: 'Semoirs',
      arName: 'البذارات',
      enName: 'Seeders',
      depreciationRate: 15.0,
    }),
    acc('2155', 'Materiel de traitement', AccountType.ASSET, 'Spraying Equipment', false, {
      parent: '215',
      agriCategory: 'equipment',
      frName: 'Matériel de traitement phytosanitaire',
      arName: 'معدات الرش',
      enName: 'Spraying Equipment',
      depreciationRate: 15.0,
    }),
    acc('2156', 'Matériel d\'élevage', AccountType.ASSET, 'Livestock Equipment', false, {
      parent: '215',
      agriCategory: 'equipment',
      frName: 'Matériel d\'élevage',
      arName: 'معدات تربية الماشية',
      enName: 'Livestock Equipment',
      depreciationRate: 15.0,
    }),
    acc('2157', 'Matériel de traite', AccountType.ASSET, 'Milking Equipment', false, {
      parent: '215',
      agriCategory: 'equipment',
      frName: 'Matériel de traite',
      arName: 'معدات الحلب',
      enName: 'Milking Equipment',
      depreciationRate: 12.0,
    }),
    acc('28', 'Amortissements', AccountType.ASSET, 'Accumulated Depreciation', true, {
      parent: '2',
      frName: 'Amortissements',
      arName: 'إهلاكات متراكمة',
      enName: 'Accumulated Depreciation',
      contraAccount: true,
    }),
    acc('281', 'Amortissements des immobilisations incorporelles', AccountType.ASSET, 'Depreciation - Intangible', false, {
      parent: '28',
      frName: 'Amortissements des immobilisations incorporelles',
      arName: 'إهلاكات الأصول غير الملموسة',
      enName: 'Depreciation - Intangible Assets',
      contraAccount: true,
    }),
    acc('282', 'Amortissements des immobilisations corporelles', AccountType.ASSET, 'Depreciation - Tangible', false, {
      parent: '28',
      frName: 'Amortissements des immobilisations corporelles',
      arName: 'إهلاكات الأصول الملموسة',
      enName: 'Depreciation - Tangible Assets',
      contraAccount: true,
    }),

    // ============================================================
    // CLASS 3: INVENTORY (STOCKS)
    // ============================================================

    acc('3', 'Stocks', AccountType.ASSET, 'Inventory', true, {
      frName: 'Stocks',
      arName: 'المخزون',
      enName: 'Inventory',
    }),

    // Agricultural Supplies Inventory
    acc('31', 'Matières premières', AccountType.ASSET, 'Raw Materials', true, {
      parent: '3',
      agriCategory: 'supplies',
      frName: 'Matières premières',
      arName: 'المواد الخام',
      enName: 'Raw Materials',
    }),
    acc('311', 'Semences', AccountType.ASSET, 'Seeds', true, {
      parent: '31',
      agriCategory: 'supplies',
      frName: 'Semences',
      arName: 'البذور',
      enName: 'Seeds',
    }),
    acc('3111', 'Semences de blé', AccountType.ASSET, 'Wheat Seed Stock', false, {
      parent: '311',
      agriCategory: 'crop',
      frName: 'Semences de blé',
      arName: 'بذور القمح',
      enName: 'Wheat Seed Stock',
    }),
    acc('3112', 'Semences d\'orge', AccountType.ASSET, 'Barley Seed Stock', false, {
      parent: '311',
      agriCategory: 'crop',
      frName: 'Semences d\'orge',
      arName: 'بذور الشعير',
      enName: 'Barley Seed Stock',
    }),
    acc('3113', 'Plants d\'olivier', AccountType.ASSET, 'Olive Seedlings', false, {
      parent: '311',
      agriCategory: 'crop',
      frName: 'Plants d\'olivier',
      arName: 'شتلات الزيتون',
      enName: 'Olive Seedlings Stock',
    }),
    acc('3114', 'Draps de palmier', AccountType.ASSET, 'Palm Seedlings', false, {
      parent: '311',
      agriCategory: 'crop',
      frName: 'Draps de palmier',
      arName: 'فصوص النخيل',
      enName: 'Palm Seedlings Stock',
    }),
    acc('312', 'Engrais', AccountType.ASSET, 'Fertilizers', true, {
      parent: '31',
      agriCategory: 'supplies',
      frName: 'Engrais',
      arName: 'الأسمدة',
      enName: 'Fertilizers',
    }),
    acc('3121', 'Engrais azotés', AccountType.ASSET, 'Nitrogen Fertilizer Stock', false, {
      parent: '312',
      agriCategory: 'supplies',
      frName: 'Engrais azotés',
      arName: 'الأسمدة النيتروجينية',
      enName: 'Nitrogen Fertilizer Stock',
    }),
    acc('3122', 'Engrais phosphatés', AccountType.ASSET, 'Phosphate Fertilizer Stock', false, {
      parent: '312',
      agriCategory: 'supplies',
      frName: 'Engrais phosphatés',
      arName: 'الأسمدة الفوسفاتية',
      enName: 'Phosphate Fertilizer Stock',
    }),
    acc('3123', 'Engrais potassiques', AccountType.ASSET, 'Potash Fertilizer Stock', false, {
      parent: '312',
      agriCategory: 'supplies',
      frName: 'Engrais potassiques',
      arName: 'الأسمدة البوتاسية',
      enName: 'Potash Fertilizer Stock',
    }),
    acc('3124', 'Engrais organiques', AccountType.ASSET, 'Organic Fertilizer Stock', false, {
      parent: '312',
      agriCategory: 'supplies',
      frName: 'Engrais organiques',
      arName: 'الأسمدة العضوية',
      enName: 'Organic Fertilizer Stock',
    }),
    acc('313', 'Produits phytosanitaires', AccountType.ASSET, 'Crop Protection', true, {
      parent: '31',
      agriCategory: 'supplies',
      frName: 'Produits phytosanitaires',
      arName: 'منتجات وقاية النبات',
      enName: 'Crop Protection Products',
    }),
    acc('3131', 'Herbicides', AccountType.ASSET, 'Herbicides', false, {
      parent: '313',
      agriCategory: 'supplies',
      frName: 'Herbicides',
      arName: 'مبيدات الأعشاب',
      enName: 'Herbicide Stock',
    }),
    acc('3132', 'Insecticides', AccountType.ASSET, 'Insecticides', false, {
      parent: '313',
      agriCategory: 'supplies',
      frName: 'Insecticides',
      arName: 'مبيدات الحشرات',
      enName: 'Insecticide Stock',
    }),
    acc('3133', 'Fongicides', AccountType.ASSET, 'Fungicides', false, {
      parent: '313',
      agriCategory: 'supplies',
      frName: 'Fongicides',
      arName: 'مبيدات الفطريات',
      enName: 'Fungicide Stock',
    }),

    // Feed Inventory
    acc('32', 'Autres approvisionnements', AccountType.ASSET, 'Other Supplies', true, {
      parent: '3',
      agriCategory: 'livestock',
      frName: 'Autres approvisionnements',
      arName: 'مستلزمات أخرى',
      enName: 'Other Supplies',
    }),
    acc('321', 'Aliments pour bétail', AccountType.ASSET, 'Animal Feed', true, {
      parent: '32',
      agriCategory: 'livestock',
      frName: 'Aliments pour bétail',
      arName: 'أعلاف الماشية',
      enName: 'Animal Feed',
    }),
    acc('3211', 'Fourrage', AccountType.ASSET, 'Fodder', false, {
      parent: '321',
      agriCategory: 'livestock',
      frName: 'Fourrage',
      arName: 'العلف',
      enName: 'Fodder Stock',
    }),
    acc('3212', 'Concentrés', AccountType.ASSET, 'Concentrates', false, {
      parent: '321',
      agriCategory: 'livestock',
      frName: 'Aliments concentrés',
      arName: 'الأعلاف المركزة',
      enName: 'Concentrate Feed Stock',
    }),
    acc('3213', 'Paille et foin', AccountType.ASSET, 'Straw and Hay', false, {
      parent: '321',
      agriCategory: 'livestock',
      frName: 'Paille et foin',
      arName: 'التبن والقش',
      enName: 'Straw and Hay Stock',
    }),

    // Harvest/Crop Inventory
    acc('33', 'Produits en cours', AccountType.ASSET, 'Work in Progress', true, {
      parent: '3',
      agriCategory: 'crop',
      frName: 'Produits en cours',
      arName: 'الإنتاج تحت التنفيذ',
      enName: 'Work in Progress',
    }),
    acc('331', 'Cultures en cours', AccountType.ASSET, 'Growing Crops', false, {
      parent: '33',
      agriCategory: 'crop',
      frName: 'Cultures en cours',
      arName: 'المحاصيل قيد النمو',
      enName: 'Growing Crops',
    }),

    acc('34', 'Produits finis', AccountType.ASSET, 'Finished Goods', true, {
      parent: '3',
      agriCategory: 'crop',
      frName: 'Produits finis',
      arName: 'المنتجات التامة',
      enName: 'Finished Goods',
    }),
    acc('341', 'Céréales', AccountType.ASSET, 'Cereals', true, {
      parent: '34',
      agriCategory: 'crop',
      frName: 'Céréales',
      arName: 'الحبوب',
      enName: 'Cereals',
    }),
    acc('3411', 'Blé', AccountType.ASSET, 'Wheat', false, {
      parent: '341',
      agriCategory: 'crop',
      frName: 'Blé',
      arName: 'القمح',
      enName: 'Wheat Stock',
    }),
    acc('3412', 'Orge', AccountType.ASSET, 'Barley', false, {
      parent: '341',
      agriCategory: 'crop',
      frName: 'Orge',
      arName: 'الشعير',
      enName: 'Barley Stock',
    }),
    acc('3413', 'Avoine', AccountType.ASSET, 'Oats', false, {
      parent: '341',
      agriCategory: 'crop',
      frName: 'Avoine',
      arName: 'الشوفان',
      enName: 'Oats Stock',
    }),
    acc('342', 'Légumes', AccountType.ASSET, 'Vegetables', true, {
      parent: '34',
      agriCategory: 'crop',
      frName: 'Légumes',
      arName: 'الخضروات',
      enName: 'Vegetables',
    }),
    acc('3421', 'Tomates', AccountType.ASSET, 'Tomatoes', false, {
      parent: '342',
      agriCategory: 'crop',
      frName: 'Tomates',
      arName: 'الطماطم',
      enName: 'Tomatoes Stock',
    }),
    acc('3422', 'Poivrons', AccountType.ASSET, 'Peppers', false, {
      parent: '342',
      agriCategory: 'crop',
      frName: 'Poivrons',
      arName: 'الفلفل',
      enName: 'Peppers Stock',
    }),
    acc('3423', 'Pommes de terre', AccountType.ASSET, 'Potatoes', false, {
      parent: '342',
      agriCategory: 'crop',
      frName: 'Pommes de terre',
      arName: 'البطاطس',
      enName: 'Potatoes Stock',
    }),
    acc('343', 'Fruits', AccountType.ASSET, 'Fruits', true, {
      parent: '34',
      agriCategory: 'crop',
      frName: 'Fruits',
      arName: 'الفواكه',
      enName: 'Fruits',
    }),
    acc('3431', 'Agrumes', AccountType.ASSET, 'Citrus', true, {
      parent: '343',
      agriCategory: 'crop',
      frName: 'Agrumes',
      arName: 'الحمضيات',
      enName: 'Citrus Fruits',
    }),
    acc('34311', 'Oranges', AccountType.ASSET, 'Oranges', false, {
      parent: '3431',
      agriCategory: 'crop',
      frName: 'Oranges',
      arName: 'البرتقال',
      enName: 'Oranges Stock',
    }),
    acc('34312', 'Citrons', AccountType.ASSET, 'Lemons', false, {
      parent: '3431',
      agriCategory: 'crop',
      frName: 'Citrons',
      arName: 'الليمون',
      enName: 'Lemons Stock',
    }),
    acc('3432', 'Olivettes', AccountType.ASSET, 'Olives', false, {
      parent: '343',
      agriCategory: 'crop',
      frName: 'Olivettes',
      arName: 'الزيتون',
      enName: 'Olives Stock',
    }),
    acc('3433', 'Dattes', AccountType.ASSET, 'Dates', false, {
      parent: '343',
      agriCategory: 'crop',
      frName: 'Dattes',
      arName: 'التمر',
      enName: 'Dates Stock',
    }),
    acc('3434', 'Raisins', AccountType.ASSET, 'Grapes', false, {
      parent: '343',
      agriCategory: 'crop',
      frName: 'Raisins',
      arName: 'العنب',
      enName: 'Grapes Stock',
    }),
    acc('344', 'Huile d\'olive', AccountType.ASSET, 'Olive Oil', false, {
      parent: '34',
      agriCategory: 'crop',
      frName: 'Huile d\'olive',
      arName: 'زيت الزيتون',
      enName: 'Olive Oil Stock',
    }),

    // Livestock Inventory
    acc('35', 'Animaux', AccountType.ASSET, 'Animals', true, {
      parent: '3',
      agriCategory: 'livestock',
      frName: 'Animaux',
      arName: 'الحيوانات',
      enName: 'Livestock',
    }),
    acc('351', 'Bovins', AccountType.ASSET, 'Cattle', true, {
      parent: '35',
      agriCategory: 'livestock',
      frName: 'Bovins',
      arName: 'الأبقار',
      enName: 'Cattle',
    }),
    acc('3511', 'Vaches laitières', AccountType.ASSET, 'Dairy Cows', false, {
      parent: '351',
      agriCategory: 'livestock',
      frName: 'Vaches laitières',
      arName: 'الأبقار الحلوبة',
      enName: 'Dairy Cows',
    }),
    acc('3512', 'Bœufs à l\'engrais', AccountType.ASSET, 'Fattening Cattle', false, {
      parent: '351',
      agriCategory: 'livestock',
      frName: 'Bœufs à l\'engrais',
      arName: 'الأبقار للتسمين',
      enName: 'Fattening Cattle',
    }),
    acc('352', 'Ovins', AccountType.ASSET, 'Sheep', true, {
      parent: '35',
      agriCategory: 'livestock',
      frName: 'Ovins',
      arName: 'الأغنام',
      enName: 'Sheep',
    }),
    acc('3521', 'Brebis', AccountType.ASSET, 'Ewes', false, {
      parent: '352',
      agriCategory: 'livestock',
      frName: 'Brebis',
      arName: 'النعاج',
      enName: 'Ewes',
    }),
    acc('3522', 'Béliers', AccountType.ASSET, 'Rams', false, {
      parent: '352',
      agriCategory: 'livestock',
      frName: 'Béliers',
      arName: 'الكباش',
      enName: 'Rams',
    }),
    acc('3523', 'Agneaux', AccountType.ASSET, 'Lambs', false, {
      parent: '352',
      agriCategory: 'livestock',
      frName: 'Agneaux',
      arName: 'الحملان',
      enName: 'Lambs',
    }),
    acc('353', 'Caprins', AccountType.ASSET, 'Goats', true, {
      parent: '35',
      agriCategory: 'livestock',
      frName: 'Caprins',
      arName: 'الماعز',
      enName: 'Goats',
    }),
    acc('354', 'Camelins', AccountType.ASSET, 'Camels', true, {
      parent: '35',
      agriCategory: 'livestock',
      frName: 'Camelins',
      arName: 'الجمال',
      enName: 'Camels',
    }),
    acc('355', 'Volaille', AccountType.ASSET, 'Poultry', true, {
      parent: '35',
      agriCategory: 'livestock',
      frName: 'Volaille',
      arName: 'الدواجن',
      enName: 'Poultry',
    }),
    acc('3551', 'Poules pondeuses', AccountType.ASSET, 'Laying Hens', false, {
      parent: '355',
      agriCategory: 'livestock',
      frName: 'Poules pondeuses',
      arName: 'الدجاج البياض',
      enName: 'Laying Hens',
    }),
    acc('3552', 'Poulets de chair', AccountType.ASSET, 'Broiler Chickens', false, {
      parent: '355',
      agriCategory: 'livestock',
      frName: 'Poulets de chair',
      arName: 'دجاج اللحم',
      enName: 'Broiler Chickens',
    }),

    // ============================================================
    // CLASS 4: THIRD PARTIES (TIERS)
    // ============================================================

    acc('4', 'Tiers', AccountType.ASSET, 'Third Parties', true, {
      frName: 'Tiers',
      arName: 'الأطراف الثالثة',
      enName: 'Third Parties',
    }),

    // Accounts Receivable
    acc('41', 'Clients', AccountType.ASSET, 'Customers', true, {
      parent: '4',
      frName: 'Clients',
      arName: 'العملاء',
      enName: 'Accounts Receivable',
    }),
    acc('411', 'Clients', AccountType.ASSET, 'Trade Receivables', false, {
      parent: '41',
      frName: 'Clients',
      arName: 'العملاء',
      enName: 'Trade Receivables',
    }),
    acc('416', 'Clients douteux', AccountType.ASSET, 'Doubtful Accounts', false, {
      parent: '41',
      frName: 'Clients douteux',
      arName: 'العملاء المشكوك فيهم',
      enName: 'Doubtful Accounts',
    }),

    // Accounts Payable
    acc('40', 'Fournisseurs', AccountType.LIABILITY, 'Suppliers', true, {
      parent: '4',
      frName: 'Fournisseurs',
      arName: 'الموردون',
      enName: 'Accounts Payable',
    }),
    acc('401', 'Fournisseurs', AccountType.LIABILITY, 'Trade Payables', false, {
      parent: '40',
      frName: 'Fournisseurs',
      arName: 'الموردون',
      enName: 'Trade Payables',
    }),

    // Tax Related
    acc('43', 'État', AccountType.ASSET, 'State', true, {
      parent: '4',
      frName: 'État',
      arName: 'الدولة',
      enName: 'Tax Authorities',
    }),
    acc('431', 'TVA à payer', AccountType.LIABILITY, 'VAT Payable', false, {
      parent: '43',
      frName: 'TVA à payer',
      arName: 'الضريبة على القيمة المضافة المستحقة',
      enName: 'VAT Payable',
    }),
    acc('432', 'Autres impôts', AccountType.LIABILITY, 'Other Taxes', false, {
      parent: '43',
      frName: 'Autres impôts',
      arName: 'ضرائب أخرى',
      enName: 'Other Taxes Payable',
    }),

    // Employees
    acc('42', 'Personnel', AccountType.LIABILITY, 'Personnel', true, {
      parent: '4',
      agriCategory: 'labor',
      frName: 'Personnel',
      arName: 'الموظفون',
      enName: 'Personnel',
    }),
    acc('421', 'Rémunérations dues', AccountType.LIABILITY, 'Wages Payable', false, {
      parent: '42',
      agriCategory: 'labor',
      frName: 'Rémunérations dues',
      arName: 'الأجور المستحقة',
      enName: 'Wages Payable',
    }),
    acc('422', 'CNSS', AccountType.LIABILITY, 'Social Security', false, {
      parent: '42',
      agriCategory: 'labor',
      frName: 'CNSS',
      arName: 'الضمان الاجتماعي',
      enName: 'Social Security Payable',
    }),

    // ============================================================
    // CLASS 5: FINANCIAL (FINANCIER)
    // ============================================================

    acc('5', 'Financier', AccountType.ASSET, 'Financial', true, {
      frName: 'Financier',
      arName: 'مالي',
      enName: 'Financial',
    }),
    acc('51', 'Trésorerie', AccountType.ASSET, 'Cash', true, {
      parent: '5',
      frName: 'Trésorerie',
      arName: 'الخزينة',
      enName: 'Cash',
    }),
    acc('511', 'Caisse', AccountType.ASSET, 'Cash on Hand', false, {
      parent: '51',
      frName: 'Caisse',
      arName: 'الصندوق',
      enName: 'Cash on Hand',
    }),
    acc('52', 'Banques', AccountType.ASSET, 'Banks', true, {
      parent: '5',
      frName: 'Banques',
      arName: 'البنوك',
      enName: 'Bank Accounts',
    }),
    acc('521', 'Banques', AccountType.ASSET, 'Bank Account', false, {
      parent: '52',
      frName: 'Banques',
      arName: 'البنوك',
      enName: 'Bank Account',
    }),

    // ============================================================
    // CLASS 6: EXPENSES (CHARGES)
    // ============================================================

    acc('6', 'Charges', AccountType.EXPENSE, 'Expenses', true, {
      frName: 'Charges',
      arName: 'المصروفات',
      enName: 'Expenses',
    }),

    // Cost of Goods Sold
    acc('60', 'Achats consommés', AccountType.EXPENSE, 'Cost of Goods Sold', true, {
      parent: '6',
      agriCategory: 'supplies',
      frName: 'Achats consommés',
      arName: 'المشتريات المستهلكة',
      enName: 'Cost of Goods Sold',
    }),
    acc('601', 'Achats de matières premières', AccountType.EXPENSE, 'Raw Materials', true, {
      parent: '60',
      agriCategory: 'supplies',
      frName: 'Achats de matières premières',
      arName: 'شراء المواد الخام',
      enName: 'Raw Material Purchases',
    }),
    acc('6011', 'Semences et plants', AccountType.EXPENSE, 'Seeds and Plants', false, {
      parent: '601',
      agriCategory: 'supplies',
      frName: 'Semences et plants',
      arName: 'البذور والشتلات',
      enName: 'Seeds and Plants',
      taxDeductible: true,
    }),
    acc('6012', 'Engrais', AccountType.EXPENSE, 'Fertilizers', false, {
      parent: '601',
      agriCategory: 'supplies',
      frName: 'Engrais',
      arName: 'الأسمدة',
      enName: 'Fertilizers',
      taxDeductible: true,
    }),
    acc('6013', 'Produits phytosanitaires', AccountType.EXPENSE, 'Crop Protection', false, {
      parent: '601',
      agriCategory: 'supplies',
      frName: 'Produits phytosanitaires',
      arName: 'منتجات وقاية النبات',
      enName: 'Crop Protection Products',
      taxDeductible: true,
    }),
    acc('602', 'Autres approvisionnements', AccountType.EXPENSE, 'Other Supplies', true, {
      parent: '60',
      agriCategory: 'livestock',
      frName: 'Autres approvisionnements',
      arName: 'مستلزمات أخرى',
      enName: 'Other Supplies',
    }),
    acc('6021', 'Aliments pour bétail', AccountType.EXPENSE, 'Animal Feed', false, {
      parent: '602',
      agriCategory: 'livestock',
      frName: 'Aliments pour bétail',
      arName: 'أعلاف الماشية',
      enName: 'Animal Feed',
      taxDeductible: true,
    }),

    // Services
    acc('61', 'Services extérieurs', AccountType.EXPENSE, 'External Services', true, {
      parent: '6',
      frName: 'Services extérieurs',
      arName: 'الخدمات الخارجية',
      enName: 'External Services',
    }),
    acc('611', 'Travaux agricoles', AccountType.EXPENSE, 'Agricultural Work', false, {
      parent: '61',
      agriCategory: 'labor',
      frName: 'Travaux agricoles',
      arName: 'الأعمال الزراعية',
      enName: 'Contract Agricultural Work',
    }),
    acc('612', 'Location matériel agricole', AccountType.EXPENSE, 'Equipment Rental', false, {
      parent: '61',
      agriCategory: 'equipment',
      frName: 'Location de matériel agricole',
      arName: 'إيجار المعدات الزراعية',
      enName: 'Agricultural Equipment Rental',
    }),
    acc('613', 'Services vétérinaires', AccountType.EXPENSE, 'Veterinary Services', false, {
      parent: '61',
      agriCategory: 'livestock',
      frName: 'Services vétérinaires',
      arName: 'الخدمات البيطرية',
      enName: 'Veterinary Services',
    }),
    acc('614', 'Transports', AccountType.EXPENSE, 'Transport', false, {
      parent: '61',
      frName: 'Transports',
      arName: 'النقل',
      enName: 'Transport Costs',
    }),

    // Labor Costs
    acc('62', 'Services des personnel', AccountType.EXPENSE, 'Personnel Services', true, {
      parent: '6',
      agriCategory: 'labor',
      frName: 'Services du personnel',
      arName: 'خدمات الموظفين',
      enName: 'Personnel Services',
    }),
    acc('621', 'Salaires et traitements', AccountType.EXPENSE, 'Salaries', false, {
      parent: '62',
      agriCategory: 'labor',
      frName: 'Salaires et traitements',
      arName: 'الرواتب والأجور',
      enName: 'Salaries and Wages',
      taxDeductible: true,
    }),
    acc('622', 'Charges sociales', AccountType.EXPENSE, 'Social Charges', false, {
      parent: '62',
      agriCategory: 'labor',
      frName: 'Charges sociales',
      arName: 'الاعباء الاجتماعية',
      enName: 'Social Security Contributions',
      taxDeductible: true,
    }),
    acc('623', 'Saisonniers', AccountType.EXPENSE, 'Seasonal Workers', false, {
      parent: '62',
      agriCategory: 'labor',
      frName: 'Travailleurs saisonniers',
      arName: 'العمال الموسميين',
      enName: 'Seasonal Labor',
      taxDeductible: true,
    }),

    // Depreciation
    acc('63', 'Dotations aux amortissements', AccountType.EXPENSE, 'Depreciation', true, {
      parent: '6',
      frName: 'Dotations aux amortissements',
      arName: 'مخصصات الإهلاك',
      enName: 'Depreciation Expense',
    }),
    acc('631', 'Amortissements immobilisations corporelles', AccountType.EXPENSE, 'Fixed Asset Depreciation', false, {
      parent: '63',
      frName: 'Amortissements immobilisations corporelles',
      arName: 'إهلاك الأصول الملموسة',
      enName: 'Fixed Asset Depreciation',
      taxDeductible: true,
    }),

    // Operating Expenses
    acc('64', 'Charges opérationnelles', AccountType.EXPENSE, 'Operating Expenses', true, {
      parent: '6',
      frName: 'Charges opérationnelles',
      arName: 'المصروفات التشغيلية',
      enName: 'Operating Expenses',
    }),
    acc('641', 'Carburants', AccountType.EXPENSE, 'Fuel', true, {
      parent: '64',
      agriCategory: 'equipment',
      frName: 'Carburants',
      arName: 'الوقود',
      enName: 'Fuel',
      taxDeductible: true,
    }),
    acc('6411', 'Gasoil', AccountType.EXPENSE, 'Diesel', false, {
      parent: '641',
      agriCategory: 'equipment',
      frName: 'Gasoil',
      arName: 'الغازويل',
      enName: 'Diesel',
      taxDeductible: true,
    }),
    acc('642', 'Réparations et entretien', AccountType.EXPENSE, 'Repairs', false, {
      parent: '64',
      agriCategory: 'equipment',
      frName: 'Réparations et entretien',
      arName: 'الإصلاحات والصيانة',
      enName: 'Repairs and Maintenance',
      taxDeductible: true,
    }),
    acc('643', 'Électricité et eau', AccountType.EXPENSE, 'Utilities', false, {
      parent: '64',
      agriCategory: 'equipment',
      frName: 'Électricité et eau',
      arName: 'الكهرباء والماء',
      enName: 'Electricity and Water',
      taxDeductible: true,
    }),
    acc('644', 'Assurances', AccountType.EXPENSE, 'Insurance', false, {
      parent: '64',
      frName: 'Assurances',
      arName: 'التأمينات',
      enName: 'Insurance',
      taxDeductible: true,
    }),
    acc('645', 'Frais de déplacement', AccountType.EXPENSE, 'Travel Expenses', false, {
      parent: '64',
      frName: 'Frais de déplacement',
      arName: 'مصاريف التنقل',
      enName: 'Travel Expenses',
      taxDeductible: true,
    }),

    // Financial Expenses
    acc('65', 'Charges financières', AccountType.EXPENSE, 'Financial Expenses', true, {
      parent: '6',
      frName: 'Charges financières',
      arName: 'المصروفات المالية',
      enName: 'Financial Expenses',
    }),
    acc('651', 'Intérêts sur emprunts', AccountType.EXPENSE, 'Interest Expense', false, {
      parent: '65',
      frName: 'Intérêts sur emprunts',
      arName: 'فوائد القروض',
      enName: 'Loan Interest',
      taxDeductible: true,
    }),
    acc('652', 'Pertes de change', AccountType.EXPENSE, 'Exchange Losses', false, {
      parent: '65',
      frName: 'Pertes de change',
      arName: 'خسائر العملة',
      enName: 'Foreign Exchange Losses',
    }),

    // Taxes
    acc('66', 'Impôts et taxes', AccountType.EXPENSE, 'Taxes', true, {
      parent: '6',
      frName: 'Impôts et taxes',
      arName: 'الضرائب والرسوم',
      enName: 'Taxes',
    }),
    acc('661', 'Impôts locaux', AccountType.EXPENSE, 'Local Taxes', false, {
      parent: '66',
      frName: 'Impôts locaux',
      arName: 'الضرائب المحلية',
      enName: 'Local Taxes',
      taxDeductible: true,
    }),
    acc('662', 'Taxe professionnelle', AccountType.EXPENSE, 'Professional Tax', false, {
      parent: '66',
      frName: 'Taxe professionnelle',
      arName: 'الضريبة المهنية',
      enName: 'Professional Tax',
      taxDeductible: true,
    }),

    // ============================================================
    // CLASS 7: REVENUE (PRODUITS)
    // ============================================================

    acc('7', 'Produits', AccountType.REVENUE, 'Revenue', true, {
      frName: 'Produits',
      arName: 'الإيرادات',
      enName: 'Revenue',
    }),

    // Sales Revenue
    acc('70', 'Ventes de produits finis', AccountType.REVENUE, 'Sales', true, {
      parent: '7',
      agriCategory: 'crop',
      frName: 'Ventes de produits finis',
      arName: 'مبيعات المنتجات التامة',
      enName: 'Finished Goods Sales',
    }),
    acc('701', 'Ventes de céréales', AccountType.REVENUE, 'Cereal Sales', true, {
      parent: '70',
      agriCategory: 'crop',
      frName: 'Ventes de céréales',
      arName: 'مبيعات الحبوب',
      enName: 'Cereal Sales',
    }),
    acc('7011', 'Ventes de blé', AccountType.REVENUE, 'Wheat Sales', false, {
      parent: '701',
      agriCategory: 'crop',
      frName: 'Ventes de blé',
      arName: 'مبيعات القمح',
      enName: 'Wheat Sales',
    }),
    acc('7012', 'Ventes d\'orge', AccountType.REVENUE, 'Barley Sales', false, {
      parent: '701',
      agriCategory: 'crop',
      frName: 'Ventes d\'orge',
      arName: 'مبيعات الشعير',
      enName: 'Barley Sales',
    }),
    acc('702', 'Ventes de légumes', AccountType.REVENUE, 'Vegetable Sales', true, {
      parent: '70',
      agriCategory: 'crop',
      frName: 'Ventes de légumes',
      arName: 'مبيعات الخضروات',
      enName: 'Vegetable Sales',
    }),
    acc('7021', 'Ventes de tomates', AccountType.REVENUE, 'Tomato Sales', false, {
      parent: '702',
      agriCategory: 'crop',
      frName: 'Ventes de tomates',
      arName: 'مبيعات الطماطم',
      enName: 'Tomato Sales',
    }),
    acc('7022', 'Ventes de pommes de terre', AccountType.REVENUE, 'Potato Sales', false, {
      parent: '702',
      agriCategory: 'crop',
      frName: 'Ventes de pommes de terre',
      arName: 'مبيعات البطاطس',
      enName: 'Potato Sales',
    }),
    acc('703', 'Ventes de fruits', AccountType.REVENUE, 'Fruit Sales', true, {
      parent: '70',
      agriCategory: 'crop',
      frName: 'Ventes de fruits',
      arName: 'مبيعات الفواكه',
      enName: 'Fruit Sales',
    }),
    acc('7031', 'Ventes d\'agrumes', AccountType.REVENUE, 'Citrus Sales', true, {
      parent: '703',
      agriCategory: 'crop',
      frName: 'Ventes d\'agrumes',
      arName: 'مبيعات الحمضيات',
      enName: 'Citrus Sales',
    }),
    acc('70311', 'Ventes d\'oranges', AccountType.REVENUE, 'Orange Sales', false, {
      parent: '7031',
      agriCategory: 'crop',
      frName: 'Ventes d\'oranges',
      arName: 'مبيعات البرتقال',
      enName: 'Orange Sales',
    }),
    acc('70312', 'Ventes de citrons', AccountType.REVENUE, 'Lemon Sales', false, {
      parent: '7031',
      agriCategory: 'crop',
      frName: 'Ventes de citrons',
      arName: 'مبيعات الليمون',
      enName: 'Lemon Sales',
    }),
    acc('7032', 'Ventes d\'olivettes', AccountType.REVENUE, 'Olive Sales', false, {
      parent: '703',
      agriCategory: 'crop',
      frName: 'Ventes d\'olivettes',
      arName: 'مبيعات الزيتون',
      enName: 'Olive Sales',
    }),
    acc('7033', 'Ventes de dattes', AccountType.REVENUE, 'Date Sales', false, {
      parent: '703',
      agriCategory: 'crop',
      frName: 'Ventes de dattes',
      arName: 'مبيعات التمر',
      enName: 'Date Sales',
    }),
    acc('7034', 'Ventes de raisins', AccountType.REVENUE, 'Grape Sales', false, {
      parent: '703',
      agriCategory: 'crop',
      frName: 'Ventes de raisins',
      arName: 'مبيعات العنب',
      enName: 'Grape Sales',
    }),
    acc('704', 'Ventes d\'huile d\'olive', AccountType.REVENUE, 'Olive Oil Sales', false, {
      parent: '70',
      agriCategory: 'crop',
      frName: 'Ventes d\'huile d\'olive',
      arName: 'مبيعات زيت الزيتون',
      enName: 'Olive Oil Sales',
    }),

    // Livestock Sales
    acc('71', 'Ventes d\'animaux', AccountType.REVENUE, 'Livestock Sales', true, {
      parent: '7',
      agriCategory: 'livestock',
      frName: 'Ventes d\'animaux',
      arName: 'مبيعات الحيوانات',
      enName: 'Livestock Sales',
    }),
    acc('711', 'Ventes de bovins', AccountType.REVENUE, 'Cattle Sales', true, {
      parent: '71',
      agriCategory: 'livestock',
      frName: 'Ventes de bovins',
      arName: 'مبيعات الأبقار',
      enName: 'Cattle Sales',
    }),
    acc('7111', 'Ventes de vaches laitières', AccountType.REVENUE, 'Dairy Cow Sales', false, {
      parent: '711',
      agriCategory: 'livestock',
      frName: 'Ventes de vaches laitières',
      arName: 'مبيعات الأبقار الحلوبة',
      enName: 'Dairy Cow Sales',
    }),
    acc('7112', 'Ventes de bœufs à l\'engrais', AccountType.REVENUE, 'Fattening Cattle Sales', false, {
      parent: '711',
      agriCategory: 'livestock',
      frName: 'Ventes de bœufs à l\'engrais',
      arName: 'مبيعات الأبقار للتسمين',
      enName: 'Fattening Cattle Sales',
    }),
    acc('712', 'Ventes d\'ovins', AccountType.REVENUE, 'Sheep Sales', true, {
      parent: '71',
      agriCategory: 'livestock',
      frName: 'Ventes d\'ovins',
      arName: 'مبيعات الأغنام',
      enName: 'Sheep Sales',
    }),
    acc('7121', 'Ventes de brebis', AccountType.REVENUE, 'Ewe Sales', false, {
      parent: '712',
      agriCategory: 'livestock',
      frName: 'Ventes de brebis',
      arName: 'مبيعات النعاج',
      enName: 'Ewe Sales',
    }),
    acc('7122', 'Ventes d\'agneaux', AccountType.REVENUE, 'Lamb Sales', false, {
      parent: '712',
      agriCategory: 'livestock',
      frName: 'Ventes d\'agneaux',
      arName: 'مبيعات الحملان',
      enName: 'Lamb Sales',
    }),
    acc('713', 'Ventes de caprins', AccountType.REVENUE, 'Goat Sales', false, {
      parent: '71',
      agriCategory: 'livestock',
      frName: 'Ventes de caprins',
      arName: 'مبيعات الماعز',
      enName: 'Goat Sales',
    }),
    acc('714', 'Ventes de volaille', AccountType.REVENUE, 'Poultry Sales', false, {
      parent: '71',
      agriCategory: 'livestock',
      frName: 'Ventes de volaille',
      arName: 'مبيعات الدواجن',
      enName: 'Poultry Sales',
    }),

    // Dairy Products
    acc('72', 'Ventes de produits laitiers', AccountType.REVENUE, 'Dairy Sales', true, {
      parent: '7',
      agriCategory: 'livestock',
      frName: 'Ventes de produits laitiers',
      arName: 'مبيعات المنتجات اللبنية',
      enName: 'Dairy Product Sales',
    }),
    acc('721', 'Ventes de lait', AccountType.REVENUE, 'Milk Sales', true, {
      parent: '72',
      agriCategory: 'livestock',
      frName: 'Ventes de lait',
      arName: 'مبيعات الحليب',
      enName: 'Milk Sales',
    }),
    acc('7211', 'Ventes de lait de vache', AccountType.REVENUE, 'Cow Milk Sales', false, {
      parent: '721',
      agriCategory: 'livestock',
      frName: 'Ventes de lait de vache',
      arName: 'مبيعات حليب البقر',
      enName: 'Cow Milk Sales',
    }),
    acc('7212', 'Ventes de lait de chèvre', AccountType.REVENUE, 'Goat Milk Sales', false, {
      parent: '721',
      agriCategory: 'livestock',
      frName: 'Ventes de lait de chèvre',
      arName: 'مبيعات حليب الماعز',
      enName: 'Goat Milk Sales',
    }),
    acc('7213', 'Ventes de lait de brebis', AccountType.REVENUE, 'Sheep Milk Sales', false, {
      parent: '721',
      agriCategory: 'livestock',
      frName: 'Ventes de lait de brebis',
      arName: 'مبيعات حليب الأغنام',
      enName: 'Sheep Milk Sales',
    }),
    acc('722', 'Ventes d\'œufs', AccountType.REVENUE, 'Egg Sales', false, {
      parent: '72',
      agriCategory: 'livestock',
      frName: 'Ventes d\'œufs',
      arName: 'مبيعات البيض',
      enName: 'Egg Sales',
    }),

    // Subsidies and Grants
    acc('73', 'Subventions', AccountType.REVENUE, 'Subsidies', true, {
      parent: '7',
      agriCategory: 'general',
      frName: 'Subventions',
      arName: 'الدعم والمنح',
      enName: 'Subsidies and Grants',
    }),
    acc('731', 'Subventions d\'exploitation', AccountType.REVENUE, 'Operating Grants', false, {
      parent: '73',
      agriCategory: 'general',
      frName: 'Subventions d\'exploitation',
      arName: 'منح التشغيل',
      enName: 'Operating Grants',
    }),
    acc('732', 'Subventions d\'investissement', AccountType.REVENUE, 'Investment Grants', false, {
      parent: '73',
      agriCategory: 'general',
      frName: 'Subventions d\'investissement',
      arName: 'منح الاستثمار',
      enName: 'Investment Grants',
    }),
    acc('733', 'Subventions de l\'État', AccountType.REVENUE, 'State Grants', false, {
      parent: '73',
      agriCategory: 'general',
      frName: 'Subventions de l\'État',
      arName: 'منح الدولة',
      enName: 'State Grants',
    }),

    // Other Revenue
    acc('74', 'Autres produits', AccountType.REVENUE, 'Other Income', true, {
      parent: '7',
      frName: 'Autres produits',
      arName: 'إيرادات أخرى',
      enName: 'Other Income',
    }),
    acc('741', 'Revenus locatifs', AccountType.REVENUE, 'Rental Income', false, {
      parent: '74',
      frName: 'Revenus locatifs',
      arName: 'دخل الإيجار',
      enName: 'Rental Income',
    }),
    acc('742', 'Bonis', AccountType.REVENUE, 'Premiums', false, {
      parent: '74',
      frName: 'Bonis',
      arName: 'المكافآت',
      enName: 'Quality Premiums',
    }),

    // Inventory Gains
    acc('75', 'Variation des stocks', AccountType.REVENUE, 'Inventory Change', true, {
      parent: '7',
      frName: 'Variation des stocks',
      arName: 'تغير المخزون',
      enName: 'Inventory Change',
    }),
    acc('751', 'Variation stocks matières premières', AccountType.REVENUE, 'Raw Material Inventory Change', false, {
      parent: '75',
      frName: 'Variation stocks matières premières',
      arName: 'تغير مخزون المواد الخام',
      enName: 'Raw Material Inventory Change',
    }),
    acc('752', 'Variation stocks produits finis', AccountType.REVENUE, 'Finished Goods Inventory Change', false, {
      parent: '75',
      frName: 'Variation stocks produits finis',
      arName: 'تغير مخزون المنتجات التامة',
      enName: 'Finished Goods Inventory Change',
    }),
  ],
};
