-- =====================================================
-- FRENCH CHART OF ACCOUNTS (Plan Comptable Général - PCG)
-- =====================================================
-- Currency: EUR (Euro)
-- Standard: Plan Comptable Général (PCG 2014)
-- Suitable for: Agricultural businesses in France
-- =====================================================

CREATE OR REPLACE FUNCTION seed_french_chart_of_accounts(p_org_id UUID)
RETURNS TABLE(
  accounts_created INTEGER,
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN QUERY SELECT 0, false, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- CLASS 1: CAPITAL (CAPITAUX PROPRES)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '101', 'Capital social', 'Equity', 'Capital', false, true, 'EUR'),
    (p_org_id, '106', 'Réserves', 'Equity', 'Retained Earnings', false, true, 'EUR'),
    (p_org_id, '120', 'Résultat de l''exercice', 'Equity', 'Current Year Earnings', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 2: FIXED ASSETS (IMMOBILISATIONS)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '211', 'Terrains agricoles', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '213', 'Constructions agricoles', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '215', 'Installations techniques', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '2154', 'Matériel agricole', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '2155', 'Tracteurs et véhicules', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '218', 'Autres immobilisations corporelles', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '2181', 'Cheptel reproducteur', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '2182', 'Plantations pérennes', 'Asset', 'Fixed Asset', false, true, 'EUR'),
    (p_org_id, '2813', 'Amortissements constructions', 'Asset', 'Accumulated Depreciation', false, true, 'EUR'),
    (p_org_id, '2815', 'Amortissements matériel', 'Asset', 'Accumulated Depreciation', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 3: INVENTORY (STOCKS)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '311', 'Semences et plants', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '312', 'Engrais et amendements', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '313', 'Produits phytosanitaires', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '314', 'Aliments pour le bétail', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '315', 'Combustibles et carburants', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '321', 'Cultures en cours', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '322', 'Élevage en cours', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '355', 'Produits agricoles finis', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '3551', 'Céréales', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '3552', 'Fruits et légumes', 'Asset', 'Inventory', false, true, 'EUR'),
    (p_org_id, '3553', 'Vin et produits viticoles', 'Asset', 'Inventory', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 4: THIRD PARTIES (TIERS)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '401', 'Fournisseurs', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '4011', 'Fournisseurs - intrants', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '4081', 'Fournisseurs - factures non parvenues', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '411', 'Clients', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '4111', 'Clients - ventes agricoles', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '416', 'Clients douteux', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '4181', 'Clients - factures à établir', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '421', 'Personnel - rémunérations dues', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '431', 'Sécurité sociale', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '437', 'Autres organismes sociaux', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '4424', 'Impôt sur les sociétés', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '443', 'Opérations avec l''État', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '4431', 'Subventions à recevoir', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '44551', 'TVA à décaisser', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '44562', 'TVA déductible sur immobilisations', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '44566', 'TVA déductible sur autres biens', 'Asset', 'Receivable', false, true, 'EUR'),
    (p_org_id, '44571', 'TVA collectée', 'Liability', 'Payable', false, true, 'EUR'),
    (p_org_id, '467', 'Autres comptes débiteurs ou créditeurs', 'Asset', 'Receivable', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 5: FINANCIAL ACCOUNTS (COMPTES FINANCIERS)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '512', 'Banque', 'Asset', 'Cash', false, true, 'EUR'),
    (p_org_id, '5121', 'Banque - Compte principal', 'Asset', 'Cash', false, true, 'EUR'),
    (p_org_id, '5124', 'Banque - Compte agricole', 'Asset', 'Cash', false, true, 'EUR'),
    (p_org_id, '531', 'Caisse', 'Asset', 'Cash', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 6: EXPENSES (CHARGES)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '601', 'Achats stockés - Matières premières', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6011', 'Achats semences et plants', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6012', 'Achats engrais', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6013', 'Achats produits phytosanitaires', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6014', 'Achats aliments pour bétail', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6015', 'Achats animaux', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '602', 'Achats stockés - Autres approvisionnements', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6021', 'Achats combustibles', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6022', 'Achats produits d''entretien', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '606', 'Achats non stockés', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6061', 'Fournitures non stockables (eau)', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '611', 'Sous-traitance générale', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6111', 'Travaux agricoles', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '613', 'Locations', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6132', 'Locations matériel agricole', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '615', 'Entretien et réparations', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6151', 'Entretien bâtiments', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6155', 'Entretien matériel', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '616', 'Primes d''assurances', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6161', 'Assurances multirisque', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '622', 'Rémunérations d''intermédiaires', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6226', 'Honoraires', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6227', 'Frais vétérinaires', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '624', 'Transports de biens', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6241', 'Transports sur achats', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6242', 'Transports sur ventes', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '625', 'Déplacements, missions', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '626', 'Frais postaux et télécommunications', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6261', 'Téléphone', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6262', 'Internet', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '606', 'Eau et électricité', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6061', 'Eau', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6063', 'Électricité', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '641', 'Rémunérations du personnel', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6411', 'Salaires permanents', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6412', 'Salaires saisonniers', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6413', 'Primes et gratifications', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '645', 'Charges de sécurité sociale', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6451', 'Cotisations URSSAF', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '6452', 'Cotisations MSA', 'Expense', 'Operating Expense', false, true, 'EUR'),
    (p_org_id, '661', 'Charges d''intérêts', 'Expense', 'Financial Expense', false, true, 'EUR'),
    (p_org_id, '6611', 'Intérêts emprunts bancaires', 'Expense', 'Financial Expense', false, true, 'EUR'),
    (p_org_id, '666', 'Pertes de change', 'Expense', 'Financial Expense', false, true, 'EUR'),
    (p_org_id, '6811', 'Dotations aux amortissements', 'Expense', 'Depreciation', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  -- CLASS 7: REVENUES (PRODUITS)
  INSERT INTO accounts (organization_id, code, name, account_type, account_subtype, is_group, is_active, currency_code)
  VALUES
    (p_org_id, '701', 'Ventes de produits finis', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7011', 'Ventes céréales', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7012', 'Ventes fruits et légumes', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7013', 'Ventes vin', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7014', 'Ventes lait', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7015', 'Ventes viande', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7016', 'Ventes animaux vivants', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7017', 'Ventes œufs', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '706', 'Prestations de services', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7061', 'Travaux agricoles', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '74', 'Subventions d''exploitation', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '741', 'Aides PAC', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7411', 'Aides aux surfaces', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7412', 'Aides animales', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7413', 'Aides découplées', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '748', 'Autres subventions', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '758', 'Produits divers de gestion courante', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '7581', 'Indemnités d''assurance', 'Revenue', 'Operating Revenue', false, true, 'EUR'),
    (p_org_id, '763', 'Revenus des créances', 'Revenue', 'Financial Revenue', false, true, 'EUR'),
    (p_org_id, '766', 'Gains de change', 'Revenue', 'Financial Revenue', false, true, 'EUR')
  ON CONFLICT (organization_id, code) DO NOTHING;

  SELECT COUNT(*)::INTEGER INTO v_count FROM accounts WHERE organization_id = p_org_id;
  RETURN QUERY SELECT v_count, true, 'French chart of accounts created successfully'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0, false, SQLERRM::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION seed_french_chart_of_accounts TO authenticated;

COMMENT ON FUNCTION seed_french_chart_of_accounts IS
'Seeds complete French chart of accounts (PCG) for an organization';
