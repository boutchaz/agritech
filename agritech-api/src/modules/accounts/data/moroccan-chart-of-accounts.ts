/**
 * Moroccan Chart of Accounts for Agricultural Businesses
 * Based on Moroccan CGNC (Code Général de Normalisation Comptable)
 * Optimized for farming/agricultural operations
 */

interface AccountData {
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

export const moroccanChartOfAccounts: AccountData[] = [
  // =====================================================
  // CLASS 2: FIXED ASSETS (IMMOBILISATIONS)
  // =====================================================

  // Main Groups
  {
    code: '2100',
    name: 'Immobilisations en non-valeurs',
    account_type: 'Asset',
    account_subtype: 'Fixed Asset',
    is_group: true,
    is_active: true,
    currency_code: 'MAD',
    description_fr: 'Frais préliminaires et charges à répartir',
    description_ar: 'أصول غير ملموسة',
  },
  {
    code: '2200',
    name: 'Immobilisations incorporelles',
    account_type: 'Asset',
    account_subtype: 'Fixed Asset',
    is_group: true,
    is_active: true,
    currency_code: 'MAD',
    description_fr: 'Brevets, marques, fonds commercial',
    description_ar: 'أصول غير ملموسة',
  },
  {
    code: '2300',
    name: 'Immobilisations corporelles',
    account_type: 'Asset',
    account_subtype: 'Fixed Asset',
    is_group: true,
    is_active: true,
    currency_code: 'MAD',
    description_fr: 'Terrains, constructions, matériel',
    description_ar: 'أصول ملموسة',
  },
  {
    code: '2400',
    name: 'Immobilisations financières',
    account_type: 'Asset',
    account_subtype: 'Fixed Asset',
    is_group: true,
    is_active: true,
    currency_code: 'MAD',
    description_fr: 'Titres de participation, prêts',
    description_ar: 'استثمارات مالية',
  },

  // Fixed Assets Detail
  { code: '2310', name: 'Terrains agricoles', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2311', name: 'Terrains bâtis', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2321', name: 'Bâtiments agricoles', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2323', name: 'Installations agricoles', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2330', name: 'Matériel et outillage', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2331', name: 'Tracteurs et machines agricoles', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2332', name: 'Système d\'irrigation', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2340', name: 'Matériel de transport', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2350', name: 'Mobilier, matériel de bureau', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2355', name: 'Matériel informatique', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2361', name: 'Cheptel (animaux d\'élevage)', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2362', name: 'Plantations permanentes', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },

  // Depreciation Accounts
  { code: '2800', name: 'Amortissements', account_type: 'Asset', account_subtype: 'Accumulated Depreciation', is_group: true, is_active: true, currency_code: 'MAD' },
  { code: '2832', name: 'Amortissements bâtiments', account_type: 'Asset', account_subtype: 'Accumulated Depreciation', is_group: false, is_active: true, parent_code: '2800', currency_code: 'MAD' },
  { code: '2833', name: 'Amortissements installations', account_type: 'Asset', account_subtype: 'Accumulated Depreciation', is_group: false, is_active: true, parent_code: '2800', currency_code: 'MAD' },
  { code: '2834', name: 'Amortissements matériel', account_type: 'Asset', account_subtype: 'Accumulated Depreciation', is_group: false, is_active: true, parent_code: '2800', currency_code: 'MAD' },
  { code: '2835', name: 'Amortissements transport', account_type: 'Asset', account_subtype: 'Accumulated Depreciation', is_group: false, is_active: true, parent_code: '2800', currency_code: 'MAD' },

  // =====================================================
  // CLASS 3: CURRENT ASSETS (STOCKS)
  // =====================================================

  // Inventory Groups
  { code: '3100', name: 'Stocks matières premières', account_type: 'Asset', account_subtype: 'Inventory', is_group: true, is_active: true, currency_code: 'MAD' },
  { code: '3110', name: 'Semences et plants', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3111', name: 'Engrais et amendements', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3112', name: 'Produits phytosanitaires', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3113', name: 'Aliments pour bétail', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3114', name: 'Carburants et lubrifiants', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3115', name: 'Emballages', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },

  // Work in Progress
  { code: '3130', name: 'Produits en cours', account_type: 'Asset', account_subtype: 'Inventory', is_group: true, is_active: true, currency_code: 'MAD' },
  { code: '3131', name: 'Cultures en cours', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3132', name: 'Élevage en cours', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },

  // Finished Goods
  { code: '3500', name: 'Produits finis', account_type: 'Asset', account_subtype: 'Inventory', is_group: true, is_active: true, currency_code: 'MAD' },
  { code: '3510', name: 'Récoltes', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3511', name: 'Fruits et légumes', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3512', name: 'Céréales', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3513', name: 'Produits d\'origine animale', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3514', name: 'Produits transformés', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },

  // =====================================================
  // CLASS 4: THIRD-PARTY ACCOUNTS (CRÉANCES ET DETTES)
  // =====================================================

  // Suppliers
  { code: '4410', name: 'Fournisseurs', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4411', name: 'Fournisseurs - intrants agricoles', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4412', name: 'Fournisseurs - équipements', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4415', name: 'Fournisseurs - effets à payer', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4417', name: 'Fournisseurs - retenues de garantie', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },

  // Customers
  { code: '3420', name: 'Clients', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3421', name: 'Clients - ventes agricoles', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3422', name: 'Clients - exportations', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3425', name: 'Clients - effets à recevoir', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3427', name: 'Clients - retenues de garantie', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3428', name: 'Clients douteux', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },

  // Advances
  { code: '3490', name: 'Avances aux employés', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },

  // Social Security and Taxes
  { code: '4430', name: 'Sécurité sociale (CNSS)', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4432', name: 'Retraite (RCAR/CMR)', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4433', name: 'Assurance maladie (AMO)', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4441', name: 'État - Impôt sur les sociétés (IS)', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4443', name: 'Retenue à la source', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4455', name: 'TVA due', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4456', name: 'TVA déductible', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4457', name: 'TVA collectée', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },

  // Personnel
  { code: '4431', name: 'Rémunérations dues au personnel', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },

  // =====================================================
  // CLASS 5: FINANCIAL ACCOUNTS (TRÉSORERIE)
  // =====================================================

  { code: '5141', name: 'Banque - Compte courant', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '5142', name: 'Banque - Compte USD', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'USD' },
  { code: '5143', name: 'Banque - Compte EUR', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'EUR' },
  { code: '5146', name: 'Chèques postaux', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '5161', name: 'Caisse principale', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '5162', name: 'Caisse ferme', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '5165', name: 'Régies d\'avances', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'MAD' },

  // =====================================================
  // CLASS 6: EXPENSES (CHARGES)
  // =====================================================

  // Operating Expenses
  { code: '6000', name: 'Charges d\'exploitation', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: true, is_active: true, currency_code: 'MAD' },

  // Agricultural Supplies
  { code: '6110', name: 'Achats de semences et plants', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6111', name: 'Achats d\'engrais', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6112', name: 'Achats de produits phytosanitaires', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6113', name: 'Achats d\'aliments pour bétail', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6114', name: 'Achats d\'animaux', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6115', name: 'Achats d\'emballages', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },

  // Consumables
  { code: '6121', name: 'Eau d\'irrigation', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6124', name: 'Carburants et lubrifiants', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6125', name: 'Entretien et réparations', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6126', name: 'Pièces de rechange', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },

  // Services
  { code: '6131', name: 'Locations machines agricoles', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6132', name: 'Redevances de crédit-bail', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6133', name: 'Entretien et réparations', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6134', name: 'Primes d\'assurances', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6141', name: 'Services agricoles externes', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6142', name: 'Services vétérinaires', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6143', name: 'Analyses de laboratoire', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6144', name: 'Transport sur achats', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6145', name: 'Transport sur ventes', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },

  // Utilities
  { code: '6167', name: 'Électricité', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6061', name: 'Eau', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6065', name: 'Gaz', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6227', name: 'Téléphone', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6228', name: 'Internet', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },

  // Personnel Costs
  { code: '6171', name: 'Salaires permanents', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6172', name: 'Salaires journaliers', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6173', name: 'Salaires saisonniers', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6174', name: 'Primes et gratifications', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6175', name: 'Indemnités', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6176', name: 'Charges sociales - CNSS', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6177', name: 'Charges sociales - AMO', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6178', name: 'Formation du personnel', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },

  // Taxes and Fees
  { code: '6161', name: 'Impôts et taxes agricoles', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6165', name: 'Taxes locales', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },

  // Financial Expenses
  { code: '6311', name: 'Intérêts des emprunts', account_type: 'Expense', account_subtype: 'Financial Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6313', name: 'Frais bancaires', account_type: 'Expense', account_subtype: 'Financial Expense', is_group: false, is_active: true, currency_code: 'MAD' },

  // Depreciation
  { code: '6193', name: 'Dotations aux amortissements', account_type: 'Expense', account_subtype: 'Depreciation', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6196', name: 'Dotations aux provisions', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },

  // =====================================================
  // CLASS 7: REVENUES (PRODUITS)
  // =====================================================

  { code: '7000', name: 'Produits d\'exploitation', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: true, is_active: true, currency_code: 'MAD' },

  // Sales of Agricultural Products
  { code: '7111', name: 'Ventes fruits et légumes', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7112', name: 'Ventes céréales', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7113', name: 'Ventes plantes aromatiques', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7114', name: 'Ventes produits d\'élevage', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7115', name: 'Ventes lait et produits laitiers', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7116', name: 'Ventes œufs', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7117', name: 'Ventes animaux', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7118', name: 'Ventes produits transformés', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7119', name: 'Ventes exportations', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },

  // Services
  { code: '7121', name: 'Prestations de services agricoles', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7122', name: 'Location de matériel', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },

  // Subsidies and Grants
  { code: '7130', name: 'Subventions d\'exploitation', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7131', name: 'Subventions agricoles', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7132', name: 'Aides de l\'État', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7133', name: 'Fonds de développement agricole', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },

  // Other Operating Revenue
  { code: '7180', name: 'Autres produits d\'exploitation', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7181', name: 'Indemnités d\'assurances', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },

  // Financial Revenue
  { code: '7381', name: 'Intérêts et produits assimilés', account_type: 'Revenue', account_subtype: 'Financial Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7385', name: 'Gains de change', account_type: 'Revenue', account_subtype: 'Financial Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
];
