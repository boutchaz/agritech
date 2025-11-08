-- =====================================================
-- MOROCCAN CHART OF ACCOUNTS (Plan Comptable Marocain - CGNC)
-- =====================================================
-- Currency: MAD (Moroccan Dirham)
-- Standard: Code Général de Normalisation Comptable (CGNC)
-- Suitable for: Agricultural businesses in Morocco
-- =====================================================

-- This function creates the complete Moroccan chart of accounts for an organization
CREATE OR REPLACE FUNCTION seed_moroccan_chart_of_accounts(p_org_id UUID)
RETURNS TABLE(
  accounts_created INTEGER,
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Verify organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN QUERY SELECT 0, false, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- =====================================================
  -- CLASS 1: FIXED ASSETS (IMMOBILISATIONS)
  -- =====================================================

  -- Main Groups
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code, description_fr, description_ar)
  VALUES
    (p_org_id, '2100', 'Immobilisations en non-valeurs', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Frais préliminaires et charges à répartir', 'أصول غير ملموسة'),
    (p_org_id, '2200', 'Immobilisations incorporelles', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Brevets, marques, fonds commercial', 'أصول غير ملموسة'),
    (p_org_id, '2300', 'Immobilisations corporelles', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Terrains, constructions, matériel', 'أصول ملموسة'),
    (p_org_id, '2400', 'Immobilisations financières', 'Asset', 'Fixed Asset', true, true, 'MAD', 'Titres de participation, prêts', 'استثمارات مالية')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Fixed Assets Detail
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, parent_code, currency_code)
  VALUES
    -- Land and Buildings
    (p_org_id, '2310', 'Terrains agricoles', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2311', 'Terrains bâtis', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2321', 'Bâtiments agricoles', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2323', 'Installations agricoles', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),

    -- Equipment and Machinery
    (p_org_id, '2330', 'Matériel et outillage', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2331', 'Tracteurs et machines agricoles', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2332', 'Système d''irrigation', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2340', 'Matériel de transport', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2350', 'Mobilier, matériel de bureau', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2355', 'Matériel informatique', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),

    -- Biological Assets
    (p_org_id, '2361', 'Cheptel (animaux d''élevage)', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD'),
    (p_org_id, '2362', 'Plantations permanentes', 'Asset', 'Fixed Asset', false, true, '2300', 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Depreciation Accounts
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, parent_code, currency_code)
  VALUES
    (p_org_id, '2800', 'Amortissements', 'Asset', 'Accumulated Depreciation', true, true, NULL, 'MAD'),
    (p_org_id, '2832', 'Amortissements bâtiments', 'Asset', 'Accumulated Depreciation', false, true, '2800', 'MAD'),
    (p_org_id, '2833', 'Amortissements installations', 'Asset', 'Accumulated Depreciation', false, true, '2800', 'MAD'),
    (p_org_id, '2834', 'Amortissements matériel', 'Asset', 'Accumulated Depreciation', false, true, '2800', 'MAD'),
    (p_org_id, '2835', 'Amortissements transport', 'Asset', 'Accumulated Depreciation', false, true, '2800', 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- CLASS 3: CURRENT ASSETS (STOCKS)
  -- =====================================================

  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    -- Inventory Groups
    (p_org_id, '3100', 'Stocks matières premières', 'Asset', 'Inventory', true, true, 'MAD'),
    (p_org_id, '3110', 'Semences et plants', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3111', 'Engrais et amendements', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3112', 'Produits phytosanitaires', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3113', 'Aliments pour bétail', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3114', 'Carburants et lubrifiants', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3115', 'Emballages', 'Asset', 'Inventory', false, true, 'MAD'),

    -- Work in Progress
    (p_org_id, '3130', 'Produits en cours', 'Asset', 'Inventory', true, true, 'MAD'),
    (p_org_id, '3131', 'Cultures en cours', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3132', 'Élevage en cours', 'Asset', 'Inventory', false, true, 'MAD'),

    -- Finished Goods
    (p_org_id, '3500', 'Produits finis', 'Asset', 'Inventory', true, true, 'MAD'),
    (p_org_id, '3510', 'Récoltes', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3511', 'Fruits et légumes', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3512', 'Céréales', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3513', 'Produits d''origine animale', 'Asset', 'Inventory', false, true, 'MAD'),
    (p_org_id, '3514', 'Produits transformés', 'Asset', 'Inventory', false, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- CLASS 4: THIRD-PARTY ACCOUNTS (CRÉANCES ET DETTES)
  -- =====================================================

  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    -- Suppliers
    (p_org_id, '4410', 'Fournisseurs', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4411', 'Fournisseurs - intrants agricoles', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4412', 'Fournisseurs - équipements', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4415', 'Fournisseurs - effets à payer', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4417', 'Fournisseurs - retenues de garantie', 'Liability', 'Payable', false, true, 'MAD'),

    -- Customers
    (p_org_id, '3420', 'Clients', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3421', 'Clients - ventes agricoles', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3422', 'Clients - exportations', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3425', 'Clients - effets à recevoir', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3427', 'Clients - retenues de garantie', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '3428', 'Clients douteux', 'Asset', 'Receivable', false, true, 'MAD'),

    -- Advances
    (p_org_id, '3490', 'Avances aux employés', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '4410', 'Avances aux fournisseurs', 'Asset', 'Receivable', false, true, 'MAD'),

    -- Social Security and Taxes
    (p_org_id, '4430', 'Sécurité sociale (CNSS)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4432', 'Retraite (RCAR/CMR)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4433', 'Assurance maladie (AMO)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4441', 'État - Impôt sur les sociétés (IS)', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4443', 'Retenue à la source', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4455', 'TVA due', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4456', 'TVA déductible', 'Asset', 'Receivable', false, true, 'MAD'),
    (p_org_id, '4457', 'TVA collectée', 'Liability', 'Payable', false, true, 'MAD'),

    -- Personnel
    (p_org_id, '4430', 'Rémunérations dues au personnel', 'Liability', 'Payable', false, true, 'MAD'),
    (p_org_id, '4432', 'Saisies et oppositions', 'Liability', 'Payable', false, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- CLASS 5: FINANCIAL ACCOUNTS (TRÉSORERIE)
  -- =====================================================

  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '5141', 'Banque - Compte courant', 'Asset', 'Cash', false, true, 'MAD'),
    (p_org_id, '5142', 'Banque - Compte USD', 'Asset', 'Cash', false, true, 'USD'),
    (p_org_id, '5143', 'Banque - Compte EUR', 'Asset', 'Cash', false, true, 'EUR'),
    (p_org_id, '5146', 'Chèques postaux', 'Asset', 'Cash', false, true, 'MAD'),
    (p_org_id, '5161', 'Caisse principale', 'Asset', 'Cash', false, true, 'MAD'),
    (p_org_id, '5162', 'Caisse ferme', 'Asset', 'Cash', false, true, 'MAD'),
    (p_org_id, '5165', 'Régies d''avances', 'Asset', 'Cash', false, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- CLASS 6: EXPENSES (CHARGES)
  -- =====================================================

  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    -- Operating Expenses
    (p_org_id, '6000', 'Charges d''exploitation', 'Expense', 'Operating Expense', true, true, 'MAD'),

    -- Agricultural Supplies
    (p_org_id, '6110', 'Achats de semences et plants', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6111', 'Achats d''engrais', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6112', 'Achats de produits phytosanitaires', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6113', 'Achats d''aliments pour bétail', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6114', 'Achats d''animaux', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6115', 'Achats d''emballages', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Consumables
    (p_org_id, '6121', 'Eau d''irrigation', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6124', 'Carburants et lubrifiants', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6125', 'Entretien et réparations', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6126', 'Pièces de rechange', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Services
    (p_org_id, '6131', 'Locations machines agricoles', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6132', 'Redevances de crédit-bail', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6133', 'Entretien et réparations', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6134', 'Primes d''assurances', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6141', 'Services agricoles externes', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6142', 'Services vétérinaires', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6143', 'Analyses de laboratoire', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6144', 'Transport sur achats', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6145', 'Transport sur ventes', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Utilities (Services publics)
    (p_org_id, '6167', 'Électricité', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6061', 'Eau', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6065', 'Gaz', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6227', 'Téléphone', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6228', 'Internet', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Personnel Costs
    (p_org_id, '6171', 'Salaires permanents', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6172', 'Salaires journaliers', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6173', 'Salaires saisonniers', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6174', 'Primes et gratifications', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6175', 'Indemnités', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6176', 'Charges sociales - CNSS', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6177', 'Charges sociales - AMO', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6178', 'Formation du personnel', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Taxes and Fees
    (p_org_id, '6161', 'Impôts et taxes agricoles', 'Expense', 'Operating Expense', false, true, 'MAD'),
    (p_org_id, '6165', 'Taxes locales', 'Expense', 'Operating Expense', false, true, 'MAD'),

    -- Financial Expenses
    (p_org_id, '6311', 'Intérêts des emprunts', 'Expense', 'Financial Expense', false, true, 'MAD'),
    (p_org_id, '6313', 'Frais bancaires', 'Expense', 'Financial Expense', false, true, 'MAD'),

    -- Depreciation
    (p_org_id, '6193', 'Dotations aux amortissements', 'Expense', 'Depreciation', false, true, 'MAD'),
    (p_org_id, '6196', 'Dotations aux provisions', 'Expense', 'Operating Expense', false, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- =====================================================
  -- CLASS 7: REVENUES (PRODUITS)
  -- =====================================================

  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '7000', 'Produits d''exploitation', 'Revenue', 'Operating Revenue', true, true, 'MAD'),

    -- Sales of Agricultural Products
    (p_org_id, '7111', 'Ventes fruits et légumes', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7112', 'Ventes céréales', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7113', 'Ventes plantes aromatiques', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7114', 'Ventes produits d''élevage', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7115', 'Ventes lait et produits laitiers', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7116', 'Ventes œufs', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7117', 'Ventes animaux', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7118', 'Ventes produits transformés', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7119', 'Ventes exportations', 'Revenue', 'Operating Revenue', false, true, 'MAD'),

    -- Services
    (p_org_id, '7121', 'Prestations de services agricoles', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7122', 'Location de matériel', 'Revenue', 'Operating Revenue', false, true, 'MAD'),

    -- Subsidies and Grants
    (p_org_id, '7130', 'Subventions d''exploitation', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7131', 'Subventions agricoles', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7132', 'Aides de l''État', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7133', 'Fonds de développement agricole', 'Revenue', 'Operating Revenue', false, true, 'MAD'),

    -- Other Operating Revenue
    (p_org_id, '7180', 'Autres produits d''exploitation', 'Revenue', 'Operating Revenue', false, true, 'MAD'),
    (p_org_id, '7181', 'Indemnités d''assurances', 'Revenue', 'Operating Revenue', false, true, 'MAD'),

    -- Financial Revenue
    (p_org_id, '7381', 'Intérêts et produits assimilés', 'Revenue', 'Financial Revenue', false, true, 'MAD'),
    (p_org_id, '7385', 'Gains de change', 'Revenue', 'Financial Revenue', false, true, 'MAD')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- Get count of created accounts
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM accounts
  WHERE organization_id = p_org_id;

  RETURN QUERY SELECT v_count, true, 'Chart of accounts created successfully'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0, false, SQLERRM::TEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION seed_moroccan_chart_of_accounts TO authenticated;

COMMENT ON FUNCTION seed_moroccan_chart_of_accounts IS
'Seeds complete Moroccan chart of accounts (CGNC) for an organization. Returns count of accounts created.';
