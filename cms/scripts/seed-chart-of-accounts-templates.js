const API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337/api';
const API_TOKEN = process.env.STRAPI_API_TOKEN || '';

if (!API_TOKEN) {
  console.error('STRAPI_API_TOKEN environment variable is required');
  console.error('Generate a token in Strapi Admin: Settings > API Tokens > Create new API Token');
  process.exit(1);
}

async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  };

  if (data) {
    options.body = JSON.stringify({ data });
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok) {
    console.error(`Error ${method} ${endpoint}:`, result);
    throw new Error(result.error?.message || 'API request failed');
  }

  return result;
}

const moroccanChartOfAccounts = [
  { code: '2100', name: 'Immobilisations en non-valeurs', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: true, is_active: true, currency_code: 'MAD', description_fr: 'Frais préliminaires et charges à répartir', description_ar: 'أصول غير ملموسة' },
  { code: '2200', name: 'Immobilisations incorporelles', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: true, is_active: true, currency_code: 'MAD', description_fr: 'Brevets, marques, fonds commercial', description_ar: 'أصول غير ملموسة' },
  { code: '2300', name: 'Immobilisations corporelles', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: true, is_active: true, currency_code: 'MAD', description_fr: 'Terrains, constructions, matériel', description_ar: 'أصول ملموسة' },
  { code: '2400', name: 'Immobilisations financières', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: true, is_active: true, currency_code: 'MAD', description_fr: 'Titres de participation, prêts', description_ar: 'استثمارات مالية' },
  { code: '2310', name: 'Terrains agricoles', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2311', name: 'Terrains bâtis', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2321', name: 'Bâtiments agricoles', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2323', name: 'Installations agricoles', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2330', name: 'Matériel et outillage', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2331', name: 'Tracteurs et machines agricoles', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2332', name: "Système d'irrigation", account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2340', name: 'Matériel de transport', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2350', name: 'Mobilier, matériel de bureau', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2355', name: 'Matériel informatique', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2361', name: "Cheptel (animaux d'élevage)", account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2362', name: 'Plantations permanentes', account_type: 'Asset', account_subtype: 'Fixed Asset', is_group: false, is_active: true, parent_code: '2300', currency_code: 'MAD' },
  { code: '2800', name: 'Amortissements', account_type: 'Asset', account_subtype: 'Accumulated Depreciation', is_group: true, is_active: true, currency_code: 'MAD' },
  { code: '2832', name: 'Amortissements bâtiments', account_type: 'Asset', account_subtype: 'Accumulated Depreciation', is_group: false, is_active: true, parent_code: '2800', currency_code: 'MAD' },
  { code: '2833', name: 'Amortissements installations', account_type: 'Asset', account_subtype: 'Accumulated Depreciation', is_group: false, is_active: true, parent_code: '2800', currency_code: 'MAD' },
  { code: '2834', name: 'Amortissements matériel', account_type: 'Asset', account_subtype: 'Accumulated Depreciation', is_group: false, is_active: true, parent_code: '2800', currency_code: 'MAD' },
  { code: '2835', name: 'Amortissements transport', account_type: 'Asset', account_subtype: 'Accumulated Depreciation', is_group: false, is_active: true, parent_code: '2800', currency_code: 'MAD' },
  { code: '3100', name: 'Stocks matières premières', account_type: 'Asset', account_subtype: 'Inventory', is_group: true, is_active: true, currency_code: 'MAD' },
  { code: '3110', name: 'Semences et plants', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3111', name: 'Engrais et amendements', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3112', name: 'Produits phytosanitaires', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3113', name: 'Aliments pour bétail', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3114', name: 'Carburants et lubrifiants', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3115', name: 'Emballages', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3130', name: 'Produits en cours', account_type: 'Asset', account_subtype: 'Inventory', is_group: true, is_active: true, currency_code: 'MAD' },
  { code: '3131', name: 'Cultures en cours', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3132', name: 'Élevage en cours', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3500', name: 'Produits finis', account_type: 'Asset', account_subtype: 'Inventory', is_group: true, is_active: true, currency_code: 'MAD' },
  { code: '3510', name: 'Récoltes', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3511', name: 'Fruits et légumes', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3512', name: 'Céréales', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3513', name: "Produits d'origine animale", account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3514', name: 'Produits transformés', account_type: 'Asset', account_subtype: 'Inventory', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4410', name: 'Fournisseurs', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4411', name: 'Fournisseurs - intrants agricoles', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4412', name: 'Fournisseurs - équipements', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4415', name: 'Fournisseurs - effets à payer', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4417', name: 'Fournisseurs - retenues de garantie', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3420', name: 'Clients', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3421', name: 'Clients - ventes agricoles', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3422', name: 'Clients - exportations', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3425', name: 'Clients - effets à recevoir', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3427', name: 'Clients - retenues de garantie', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3428', name: 'Clients douteux', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '3490', name: 'Avances aux employés', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4430', name: 'Sécurité sociale (CNSS)', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4432', name: 'Retraite (RCAR/CMR)', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4433', name: 'Assurance maladie (AMO)', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4441', name: 'État - Impôt sur les sociétés (IS)', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4443', name: 'Retenue à la source', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4455', name: 'TVA due', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4456', name: 'TVA déductible', account_type: 'Asset', account_subtype: 'Receivable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4457', name: 'TVA collectée', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '4438', name: 'Rémunérations dues au personnel', account_type: 'Liability', account_subtype: 'Payable', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '5141', name: 'Banque - Compte courant', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '5142', name: 'Banque - Compte USD', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'USD' },
  { code: '5143', name: 'Banque - Compte EUR', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'EUR' },
  { code: '5146', name: 'Chèques postaux', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '5161', name: 'Caisse principale', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '5162', name: 'Caisse ferme', account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '5165', name: "Régies d'avances", account_type: 'Asset', account_subtype: 'Cash', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6000', name: "Charges d'exploitation", account_type: 'Expense', account_subtype: 'Operating Expense', is_group: true, is_active: true, currency_code: 'MAD' },
  { code: '6110', name: 'Achats de semences et plants', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6111', name: "Achats d'engrais", account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6112', name: 'Achats de produits phytosanitaires', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6113', name: "Achats d'aliments pour bétail", account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6114', name: "Achats d'animaux", account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6115', name: "Achats d'emballages", account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6121', name: "Eau d'irrigation", account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6124', name: 'Carburants et lubrifiants', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6125', name: 'Entretien et réparations', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6126', name: 'Pièces de rechange', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6131', name: 'Locations machines agricoles', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6132', name: 'Redevances de crédit-bail', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6133', name: 'Entretien et réparations', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6134', name: "Primes d'assurances", account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6141', name: 'Services agricoles externes', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6142', name: 'Services vétérinaires', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6143', name: 'Analyses de laboratoire', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6144', name: 'Transport sur achats', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6145', name: 'Transport sur ventes', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6167', name: 'Électricité', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6061', name: 'Eau', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6065', name: 'Gaz', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6227', name: 'Téléphone', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6228', name: 'Internet', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6171', name: 'Salaires permanents', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6172', name: 'Salaires journaliers', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6173', name: 'Salaires saisonniers', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6174', name: 'Primes et gratifications', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6175', name: 'Indemnités', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6176', name: 'Charges sociales - CNSS', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6177', name: 'Charges sociales - AMO', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6178', name: 'Formation du personnel', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6161', name: 'Impôts et taxes agricoles', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6165', name: 'Taxes locales', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6311', name: 'Intérêts des emprunts', account_type: 'Expense', account_subtype: 'Financial Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6313', name: 'Frais bancaires', account_type: 'Expense', account_subtype: 'Financial Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6193', name: 'Dotations aux amortissements', account_type: 'Expense', account_subtype: 'Depreciation', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '6196', name: 'Dotations aux provisions', account_type: 'Expense', account_subtype: 'Operating Expense', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7000', name: "Produits d'exploitation", account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: true, is_active: true, currency_code: 'MAD' },
  { code: '7111', name: 'Ventes fruits et légumes', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7112', name: 'Ventes céréales', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7113', name: 'Ventes plantes aromatiques', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7114', name: "Ventes produits d'élevage", account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7115', name: 'Ventes lait et produits laitiers', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7116', name: 'Ventes oeufs', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7117', name: 'Ventes animaux', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7118', name: 'Ventes produits transformés', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7119', name: 'Ventes exportations', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7121', name: 'Prestations de services agricoles', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7122', name: 'Location de matériel', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7130', name: "Subventions d'exploitation", account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7131', name: 'Subventions agricoles', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7132', name: "Aides de l'État", account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7133', name: 'Fonds de développement agricole', account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7180', name: "Autres produits d'exploitation", account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7181', name: "Indemnités d'assurances", account_type: 'Revenue', account_subtype: 'Operating Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7381', name: 'Intérêts et produits assimilés', account_type: 'Revenue', account_subtype: 'Financial Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
  { code: '7385', name: 'Gains de change', account_type: 'Revenue', account_subtype: 'Financial Revenue', is_group: false, is_active: true, currency_code: 'MAD' },
];

const moroccanAccountMappings = {
  transaction_types: {
    SALE: { debit_account: '3420', credit_account: '7111' },
    PURCHASE: { debit_account: '6110', credit_account: '4410' },
    PAYMENT_RECEIVED: { debit_account: '5141', credit_account: '3420' },
    PAYMENT_MADE: { debit_account: '4410', credit_account: '5141' },
    SALARY: { debit_account: '6171', credit_account: '4438' },
    TAX_PAYMENT: { debit_account: '4455', credit_account: '5141' },
    DEPRECIATION: { debit_account: '6193', credit_account: '2832' },
  },
  categories: {
    seeds: { expense_account: '6110', inventory_account: '3110' },
    fertilizers: { expense_account: '6111', inventory_account: '3111' },
    pesticides: { expense_account: '6112', inventory_account: '3112' },
    feed: { expense_account: '6113', inventory_account: '3113' },
    fuel: { expense_account: '6124', inventory_account: '3114' },
    packaging: { expense_account: '6115', inventory_account: '3115' },
  },
  product_types: {
    fruits_vegetables: { revenue_account: '7111', inventory_account: '3511' },
    cereals: { revenue_account: '7112', inventory_account: '3512' },
    aromatic_plants: { revenue_account: '7113', inventory_account: '3511' },
    livestock: { revenue_account: '7114', inventory_account: '3513' },
    dairy: { revenue_account: '7115', inventory_account: '3513' },
    eggs: { revenue_account: '7116', inventory_account: '3513' },
    animals: { revenue_account: '7117', inventory_account: '3513' },
    processed: { revenue_account: '7118', inventory_account: '3514' },
    exports: { revenue_account: '7119', inventory_account: '3510' },
  },
};

const moroccanCostCenters = [
  { code: 'ADMIN', name: 'Administration', description: 'Frais administratifs généraux', parent_code: null },
  { code: 'PROD', name: 'Production', description: 'Coûts de production agricole', parent_code: null },
  { code: 'PROD-CULT', name: 'Cultures', description: 'Production de cultures', parent_code: 'PROD' },
  { code: 'PROD-ELEV', name: 'Élevage', description: 'Production animale', parent_code: 'PROD' },
  { code: 'PROD-TRANS', name: 'Transformation', description: 'Transformation des produits', parent_code: 'PROD' },
  { code: 'VENTE', name: 'Ventes', description: 'Activités commerciales', parent_code: null },
  { code: 'VENTE-LOCAL', name: 'Ventes locales', description: 'Ventes sur le marché local', parent_code: 'VENTE' },
  { code: 'VENTE-EXPORT', name: 'Exportations', description: 'Ventes à l\'exportation', parent_code: 'VENTE' },
  { code: 'MAINT', name: 'Maintenance', description: 'Entretien des équipements et infrastructures', parent_code: null },
  { code: 'IRRIG', name: 'Irrigation', description: 'Gestion de l\'eau et irrigation', parent_code: null },
  { code: 'STOCK', name: 'Stockage', description: 'Gestion des stocks et entreposage', parent_code: null },
  { code: 'TRANSP', name: 'Transport', description: 'Logistique et transport', parent_code: null },
];

async function seedChartOfAccountTemplates() {
  console.log('Starting chart of accounts template seeding...\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Token: ${API_TOKEN.substring(0, 10)}...\n`);

  try {
    console.log('1. Creating Cost Center Template for Morocco...');
    let costCenterTemplateId = null;
    try {
      const existingCostCenter = await apiRequest('/cost-center-templates?filters[country_code][$eq]=MAR');
      if (existingCostCenter.data && existingCostCenter.data.length > 0) {
        console.log('   Cost center template already exists, skipping...');
        costCenterTemplateId = existingCostCenter.data[0].id;
      } else {
        const costCenterResult = await apiRequest('/cost-center-templates', 'POST', {
          country_code: 'MAR',
          version: '1.0.0',
          cost_centers: moroccanCostCenters,
          hierarchy_type: 'hierarchical',
          default_allocation_method: 'direct',
          publishedAt: new Date().toISOString(),
        });
        costCenterTemplateId = costCenterResult.data?.id;
        console.log(`   Created cost center template (ID: ${costCenterTemplateId})`);
      }
    } catch (error) {
      console.error('   Failed to create cost center template:', error.message);
    }

    console.log('2. Creating Account Mapping Template for Morocco...');
    let accountMappingTemplateId = null;
    try {
      const existingMapping = await apiRequest('/account-mapping-templates?filters[country_code][$eq]=MAR');
      if (existingMapping.data && existingMapping.data.length > 0) {
        console.log('   Account mapping template already exists, skipping...');
        accountMappingTemplateId = existingMapping.data[0].id;
      } else {
        const mappingResult = await apiRequest('/account-mapping-templates', 'POST', {
          country_code: 'MAR',
          version: '1.0.0',
          mappings: moroccanAccountMappings.transaction_types,
          category_mappings: moroccanAccountMappings.categories,
          transaction_type_mappings: moroccanAccountMappings.product_types,
          publishedAt: new Date().toISOString(),
        });
        accountMappingTemplateId = mappingResult.data?.id;
        console.log(`   Created account mapping template (ID: ${accountMappingTemplateId})`);
      }
    } catch (error) {
      console.error('   Failed to create account mapping template:', error.message);
    }

    console.log('3. Creating Chart of Accounts Template for Morocco...');
    try {
      const existingChart = await apiRequest('/chart-of-account-templates?filters[country_code][$eq]=MAR');
      if (existingChart.data && existingChart.data.length > 0) {
        console.log('   Chart of accounts template already exists, skipping...');
      } else {
        const templateData = {
          country_code: 'MAR',
          country_name: 'Morocco',
          country_name_native: 'المغرب',
          accounting_standard: 'CGNC',
          default_currency: 'MAD',
          version: '1.0.0',
          description: 'Moroccan Chart of Accounts based on CGNC (Code Général de Normalisation Comptable), optimized for agricultural businesses',
          description_native: 'مخطط حسابات مغربي مبني على المعايير المحاسبية العامة المغربية، مخصص للأنشطة الزراعية',
          accounts: moroccanChartOfAccounts,
          is_default: true,
          supported_industries: ['agriculture', 'farming', 'livestock', 'agribusiness'],
          tax_settings: {
            vat_rates: [{ name: 'Standard', rate: 20 }, { name: 'Reduced', rate: 10 }, { name: 'Super Reduced', rate: 7 }, { name: 'Zero', rate: 0 }],
            corporate_tax_rate: 31,
            agricultural_exemptions: true,
          },
          fiscal_year_start_month: 1,
          publishedAt: new Date().toISOString(),
        };

        if (accountMappingTemplateId) {
          templateData.account_mapping_template = accountMappingTemplateId;
        }
        if (costCenterTemplateId) {
          templateData.cost_center_template = costCenterTemplateId;
        }

        const chartResult = await apiRequest('/chart-of-account-templates', 'POST', templateData);
        console.log(`   Created chart of accounts template (ID: ${chartResult.data?.id})`);
      }
    } catch (error) {
      console.error('   Failed to create chart of accounts template:', error.message);
    }

    console.log('\nSeeding completed!');
    console.log('\nNext steps:');
    console.log('1. Go to Strapi Admin: http://localhost:1337/admin');
    console.log('2. Navigate to Content Manager > Chart Of Account Templates');
    console.log('3. Verify Morocco template was created correctly');
    console.log('4. Add templates for other countries (FRA, USA, GBR, DEU)');

  } catch (error) {
    console.error('\nSeeding failed:', error.message);
    process.exit(1);
  }
}

seedChartOfAccountTemplates();
