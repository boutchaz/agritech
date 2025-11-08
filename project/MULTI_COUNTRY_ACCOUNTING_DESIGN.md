# Multi-Country Accounting System Design

## Overview

This document outlines the design for supporting multiple chart of accounts (COA) based on organization country/locale in the AgriTech platform.

## Current State

**Existing Implementation**:
- Single French PCG (Plan Comptable Général) seed function: `seed_french_chart_of_accounts()`
- Hard-coded account codes in ledger triggers (512, 601, 641, etc.)
- No country/locale field in organizations table
- Currency support exists but COA is France-only

**Location**: [project/supabase/migrations/00000000000000_schema.sql](project/supabase/migrations/00000000000000_schema.sql)
- Lines 6984-7155: French COA seed function
- Lines 7184-7329: Ledger integration triggers with hard-coded French accounts

## Design Goals

1. **Multi-Country Support**: Organizations can choose their accounting standard
2. **Template-Based**: Pre-configured COA templates for common countries
3. **Backward Compatible**: Existing French organizations continue to work
4. **Flexible Mapping**: Cost/revenue types map to country-specific accounts
5. **Easy Addition**: New countries can be added without code changes

## Architecture

### 1. Schema Changes

#### A. Add Country/Locale to Organizations

```sql
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),  -- ISO 3166-1 alpha-2 (MA, FR, TN, US, GB)
ADD COLUMN IF NOT EXISTS accounting_standard VARCHAR(50),  -- PCG, PCEC, IFRS, GAAP, etc.
ADD COLUMN IF NOT EXISTS default_currency_code VARCHAR(3) REFERENCES currencies(code);

-- Default existing orgs to France
UPDATE organizations
SET country_code = 'FR',
    accounting_standard = 'PCG',
    default_currency_code = 'EUR'
WHERE country_code IS NULL;
```

#### B. Create Account Templates Table

Stores pre-configured account templates for each country/standard:

```sql
CREATE TABLE IF NOT EXISTS account_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL,  -- ISO country code
  accounting_standard VARCHAR(50) NOT NULL,  -- PCG, PCEC, IFRS, GAAP
  template_name VARCHAR(255) NOT NULL,
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,  -- asset, liability, equity, revenue, expense
  account_subtype VARCHAR(50),
  parent_code VARCHAR(50),  -- References another account_code in same template
  description TEXT,
  is_group BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  metadata JSONB,  -- Flexible field for country-specific attributes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_code, accounting_standard, account_code)
);

CREATE INDEX idx_account_templates_country ON account_templates(country_code);
CREATE INDEX idx_account_templates_standard ON account_templates(accounting_standard);
CREATE INDEX idx_account_templates_code ON account_templates(country_code, accounting_standard, account_code);
```

#### C. Create Account Mapping Table

Maps generic business operations to country-specific account codes:

```sql
CREATE TABLE IF NOT EXISTS account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) NOT NULL,
  accounting_standard VARCHAR(50) NOT NULL,
  mapping_type VARCHAR(50) NOT NULL,  -- 'cost_type', 'revenue_type', 'payment_method', etc.
  mapping_key VARCHAR(100) NOT NULL,  -- 'labor', 'harvest', 'bank', etc.
  account_code VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_code, accounting_standard, mapping_type, mapping_key)
);

CREATE INDEX idx_account_mappings_lookup ON account_mappings(country_code, accounting_standard, mapping_type, mapping_key);
```

### 2. Country-Specific Templates

#### Morocco (PCEC - Plan Comptable des Établissements de Crédit)

**Standard**: PCEC (adapted for agriculture)
**Currency**: MAD (Moroccan Dirham)
**Key Accounts**:

```
Class 1: Financement permanent
  111 - Capital social
  112 - Réserves
  116 - Report à nouveau

Class 2: Actif immobilisé
  231 - Terrains
  232 - Constructions
  233 - Matériel et outillage agricole
  238 - Autres immobilisations corporelles

Class 3: Actif circulant (hors trésorerie)
  311 - Stocks de matières premières
  313 - Stocks de produits en cours
  315 - Stocks de produits finis
  342 - Clients et comptes rattachés

Class 4: Comptes de passif circulant
  441 - Fournisseurs et comptes rattachés
  443 - Organismes sociaux
  445 - État - Impôts et taxes

Class 5: Comptes de trésorerie
  511 - Caisse
  514 - Banques

Class 6: Charges
  611 - Achats de matières premières
  612 - Achats de fournitures
  613 - Achats de produits agricoles
  617 - Achats de matériel et outillage
  621 - Charges de personnel
  622 - Cotisations sociales
  631 - Impôts et taxes
  641 - Charges d'intérêts

Class 7: Produits
  711 - Ventes de produits agricoles
  712 - Ventes de produits transformés
  713 - Prestations de services
  718 - Autres produits d'exploitation
  751 - Subventions d'exploitation
```

**Cost Type Mappings**:
```sql
labor -> 621 (Charges de personnel)
materials -> 611 (Achats de matières premières)
utilities -> 612 (Achats de fournitures)
equipment -> 617 (Achats de matériel et outillage)
product_application -> 612 (Achats de fournitures)
other -> 618 (Autres achats)
```

**Revenue Type Mappings**:
```sql
harvest -> 711 (Ventes de produits agricoles)
subsidy -> 751 (Subventions d'exploitation)
other -> 718 (Autres produits d'exploitation)
```

**Cash Account**: 514 (Banques)

#### Tunisia (PCN - Plan Comptable National)

**Standard**: PCN (Tunisian accounting standard)
**Currency**: TND (Tunisian Dinar)
**Key Accounts**:

```
Class 1: Capitaux propres
  101 - Capital social
  106 - Réserves
  110 - Report à nouveau

Class 2: Immobilisations
  221 - Terrains
  223 - Constructions
  228 - Autres immobilisations corporelles
  231 - Matériel agricole

Class 3: Stocks
  31 - Matières premières
  32 - Autres approvisionnements
  35 - Stocks de produits finis

Class 4: Tiers
  401 - Fournisseurs
  411 - Clients
  421 - Personnel
  431 - Sécurité sociale
  441 - État

Class 5: Financiers
  53 - Banques

Class 6: Charges
  601 - Achats de marchandises
  604 - Achats de fournitures
  621 - Frais de personnel
  635 - Impôts et taxes

Class 7: Produits
  701 - Ventes de produits finis
  708 - Autres produits
  74 - Subventions d'exploitation
```

**Cost Type Mappings**:
```sql
labor -> 621 (Frais de personnel)
materials -> 601 (Achats de marchandises)
utilities -> 604 (Achats de fournitures)
equipment -> 604 (Achats de fournitures)
product_application -> 604 (Achats de fournitures)
other -> 608 (Autres achats)
```

**Revenue Type Mappings**:
```sql
harvest -> 701 (Ventes de produits finis)
subsidy -> 74 (Subventions d'exploitation)
other -> 708 (Autres produits)
```

**Cash Account**: 53 (Banques)

#### France (PCG - Plan Comptable Général) - EXISTING

**Standard**: PCG 2014
**Currency**: EUR (Euro)
**Already implemented** - lines 6984-7155

#### USA (GAAP - Generally Accepted Accounting Principles)

**Standard**: GAAP
**Currency**: USD (US Dollar)
**Key Accounts**:

```
1000-1999: Assets
  1000 - Cash and Cash Equivalents
  1100 - Accounts Receivable
  1200 - Inventory - Raw Materials
  1210 - Inventory - Work in Progress
  1220 - Inventory - Finished Goods
  1500 - Land
  1510 - Buildings
  1520 - Equipment
  1600 - Accumulated Depreciation

2000-2999: Liabilities
  2000 - Accounts Payable
  2100 - Accrued Expenses
  2200 - Payroll Liabilities
  2500 - Long-term Debt

3000-3999: Equity
  3000 - Owner's Capital
  3100 - Retained Earnings

4000-4999: Revenue
  4000 - Sales Revenue - Agricultural Products
  4100 - Sales Revenue - Processed Products
  4200 - Service Revenue
  4900 - Other Revenue
  4950 - Government Subsidies

5000-5999: Cost of Goods Sold
  5000 - Cost of Goods Sold

6000-7999: Expenses
  6000 - Wages and Salaries
  6100 - Payroll Taxes
  6200 - Materials and Supplies
  6300 - Utilities
  6400 - Equipment Rental
  6500 - Repairs and Maintenance
  6900 - Other Operating Expenses
```

**Cost Type Mappings**:
```sql
labor -> 6000 (Wages and Salaries)
materials -> 6200 (Materials and Supplies)
utilities -> 6300 (Utilities)
equipment -> 6500 (Repairs and Maintenance)
product_application -> 6200 (Materials and Supplies)
other -> 6900 (Other Operating Expenses)
```

**Revenue Type Mappings**:
```sql
harvest -> 4000 (Sales Revenue - Agricultural Products)
subsidy -> 4950 (Government Subsidies)
other -> 4900 (Other Revenue)
```

**Cash Account**: 1000 (Cash and Cash Equivalents)

#### UK (FRS 102 - UK Generally Accepted Accounting Practice)

**Standard**: FRS 102
**Currency**: GBP (British Pound)
**Key Accounts**:

```
0000-0999: Non-current Assets
  0010 - Land and Buildings
  0020 - Plant and Machinery
  0030 - Motor Vehicles
  0040 - Office Equipment

1000-1999: Current Assets
  1000 - Stock - Raw Materials
  1010 - Stock - Work in Progress
  1020 - Stock - Finished Goods
  1100 - Trade Debtors
  1200 - Bank Current Account
  1210 - Bank Deposit Account
  1220 - Cash in Hand

2000-2999: Current Liabilities
  2100 - Trade Creditors
  2200 - PAYE and NI
  2210 - VAT
  2300 - Corporation Tax

3000-3999: Long-term Liabilities
  3000 - Bank Loans

4000-4999: Capital and Reserves
  4000 - Share Capital
  4100 - Retained Earnings

5000-5999: Sales
  5000 - Sales - Agricultural Products
  5100 - Sales - Processed Goods
  5200 - Other Income
  5900 - Government Grants

6000-6999: Direct Costs
  6000 - Purchases - Raw Materials
  6100 - Purchases - Consumables

7000-7999: Overheads
  7000 - Wages and Salaries
  7100 - Employer's NI
  7200 - Rent and Rates
  7300 - Light and Heat
  7400 - Motor Expenses
  7500 - Repairs and Renewals
  7900 - Sundry Expenses
```

**Cost Type Mappings**:
```sql
labor -> 7000 (Wages and Salaries)
materials -> 6000 (Purchases - Raw Materials)
utilities -> 7300 (Light and Heat)
equipment -> 7500 (Repairs and Renewals)
product_application -> 6100 (Purchases - Consumables)
other -> 7900 (Sundry Expenses)
```

**Revenue Type Mappings**:
```sql
harvest -> 5000 (Sales - Agricultural Products)
subsidy -> 5900 (Government Grants)
other -> 5200 (Other Income)
```

**Cash Account**: 1200 (Bank Current Account)

### 3. Updated Functions

#### A. Generic COA Seed Function

```sql
CREATE OR REPLACE FUNCTION seed_chart_of_accounts(
  p_org_id UUID,
  p_country_code VARCHAR(2) DEFAULT NULL,
  p_accounting_standard VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE(
  accounts_created INTEGER,
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  v_country_code VARCHAR(2);
  v_accounting_standard VARCHAR(50);
  v_accounts_created INTEGER := 0;
  v_template_rec RECORD;
  v_parent_id UUID;
BEGIN
  -- Get organization's country and standard if not provided
  IF p_country_code IS NULL OR p_accounting_standard IS NULL THEN
    SELECT country_code, accounting_standard
    INTO v_country_code, v_accounting_standard
    FROM organizations
    WHERE id = p_org_id;

    IF v_country_code IS NULL THEN
      RETURN QUERY SELECT 0, false, 'Organization country_code not set'::TEXT;
      RETURN;
    END IF;
  ELSE
    v_country_code := p_country_code;
    v_accounting_standard := p_accounting_standard;
  END IF;

  -- Check if template exists
  IF NOT EXISTS (
    SELECT 1 FROM account_templates
    WHERE country_code = v_country_code
    AND accounting_standard = v_accounting_standard
  ) THEN
    RETURN QUERY SELECT 0, false,
      ('No account template found for country: ' || v_country_code ||
       ' standard: ' || v_accounting_standard)::TEXT;
    RETURN;
  END IF;

  -- Clear existing accounts for this org
  DELETE FROM accounts WHERE organization_id = p_org_id;

  -- Insert accounts from template in correct order (parents first)
  FOR v_template_rec IN
    SELECT * FROM account_templates
    WHERE country_code = v_country_code
    AND accounting_standard = v_accounting_standard
    ORDER BY
      CASE WHEN parent_code IS NULL THEN 0 ELSE 1 END,  -- Parents first
      display_order NULLS LAST,
      account_code
  LOOP
    -- Find parent_id if parent_code exists
    v_parent_id := NULL;
    IF v_template_rec.parent_code IS NOT NULL THEN
      SELECT id INTO v_parent_id
      FROM accounts
      WHERE organization_id = p_org_id
      AND code = v_template_rec.parent_code;
    END IF;

    -- Insert account
    INSERT INTO accounts (
      organization_id,
      code,
      name,
      account_type,
      account_subtype,
      parent_id,
      description,
      is_group,
      is_active
    ) VALUES (
      p_org_id,
      v_template_rec.account_code,
      v_template_rec.account_name,
      v_template_rec.account_type,
      v_template_rec.account_subtype,
      v_parent_id,
      v_template_rec.description,
      v_template_rec.is_group,
      v_template_rec.is_active
    );

    v_accounts_created := v_accounts_created + 1;
  END LOOP;

  RETURN QUERY SELECT v_accounts_created, true,
    ('Successfully created ' || v_accounts_created || ' accounts for ' ||
     v_country_code || ' - ' || v_accounting_standard)::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0, false, SQLERRM::TEXT;
END;
$$;
```

#### B. Updated Ledger Integration Helper

```sql
-- Updated helper to use organization's country/standard
CREATE OR REPLACE FUNCTION get_account_id_by_mapping(
  p_org_id UUID,
  p_mapping_type VARCHAR(50),  -- 'cost_type', 'revenue_type', 'cash'
  p_mapping_key VARCHAR(100)   -- 'labor', 'harvest', 'bank', etc.
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
  v_account_code VARCHAR(50);
  v_country_code VARCHAR(2);
  v_accounting_standard VARCHAR(50);
BEGIN
  -- Get organization's country and standard
  SELECT country_code, accounting_standard
  INTO v_country_code, v_accounting_standard
  FROM organizations
  WHERE id = p_org_id;

  -- Get mapped account code
  SELECT account_code INTO v_account_code
  FROM account_mappings
  WHERE country_code = v_country_code
    AND accounting_standard = v_accounting_standard
    AND mapping_type = p_mapping_type
    AND mapping_key = p_mapping_key;

  -- If no mapping found, return NULL
  IF v_account_code IS NULL THEN
    RAISE NOTICE 'No account mapping found for org % type % key %',
      p_org_id, p_mapping_type, p_mapping_key;
    RETURN NULL;
  END IF;

  -- Get account ID
  SELECT id INTO v_account_id
  FROM accounts
  WHERE organization_id = p_org_id
    AND code = v_account_code
    AND is_active = true;

  RETURN v_account_id;
END;
$$;
```

#### C. Updated Cost Trigger Function

```sql
CREATE OR REPLACE FUNCTION create_cost_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journal_entry_id UUID;
  v_expense_account_id UUID;
  v_cash_account_id UUID;
  v_entry_number TEXT;
BEGIN
  -- Generate journal entry number
  SELECT 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0')
  INTO v_entry_number;

  -- Get expense account using mapping
  v_expense_account_id := get_account_id_by_mapping(
    NEW.organization_id,
    'cost_type',
    NEW.cost_type
  );

  -- Get cash account using mapping
  v_cash_account_id := get_account_id_by_mapping(
    NEW.organization_id,
    'cash',
    'bank'
  );

  -- Only create journal entry if both accounts exist
  IF v_expense_account_id IS NOT NULL AND v_cash_account_id IS NOT NULL THEN
    -- Create journal entry
    INSERT INTO journal_entries (
      organization_id,
      entry_number,
      entry_date,
      entry_type,
      description,
      reference_id,
      reference_type,
      total_debit,
      total_credit,
      status,
      created_by
    ) VALUES (
      NEW.organization_id,
      v_entry_number,
      NEW.date,
      'expense',
      COALESCE(NEW.description, 'Cost entry: ' || NEW.cost_type),
      NEW.id,
      'cost',
      NEW.amount,
      NEW.amount,
      'posted',
      NEW.created_by
    ) RETURNING id INTO v_journal_entry_id;

    -- Create journal items (debit expense, credit cash)
    INSERT INTO journal_items (journal_entry_id, account_id, debit, credit, description)
    VALUES
      (v_journal_entry_id, v_expense_account_id, NEW.amount, 0, NEW.description),
      (v_journal_entry_id, v_cash_account_id, 0, NEW.amount, 'Payment for ' || NEW.cost_type);
  ELSE
    RAISE NOTICE 'Skipping journal entry for cost % - missing account mappings', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
```

### 4. Seeding Process

#### Step 1: Seed Account Templates (One-time, global)

```sql
-- Morocco PCEC templates
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order) VALUES
  ('MA', 'PCEC', 'Financement permanent', '1', 'Financement permanent', 'equity', true, 10),
  ('MA', 'PCEC', 'Capital social', '111', 'Capital social', 'equity', false, 11),
  -- ... all Morocco accounts

-- Tunisia PCN templates
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order) VALUES
  ('TN', 'PCN', 'Capitaux propres', '1', 'Capitaux propres', 'equity', true, 10),
  -- ... all Tunisia accounts

-- USA GAAP templates
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order) VALUES
  ('US', 'GAAP', 'Assets', '1000', 'Cash and Cash Equivalents', 'asset', false, 10),
  -- ... all USA accounts

-- UK FRS 102 templates
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, is_group, display_order) VALUES
  ('GB', 'FRS102', 'Non-current Assets', '0010', 'Land and Buildings', 'asset', false, 10),
  -- ... all UK accounts
```

#### Step 2: Seed Account Mappings (One-time, global)

```sql
-- Morocco mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code) VALUES
  ('MA', 'PCEC', 'cost_type', 'labor', '621'),
  ('MA', 'PCEC', 'cost_type', 'materials', '611'),
  ('MA', 'PCEC', 'cost_type', 'utilities', '612'),
  ('MA', 'PCEC', 'cost_type', 'equipment', '617'),
  ('MA', 'PCEC', 'cost_type', 'product_application', '612'),
  ('MA', 'PCEC', 'cost_type', 'other', '618'),
  ('MA', 'PCEC', 'revenue_type', 'harvest', '711'),
  ('MA', 'PCEC', 'revenue_type', 'subsidy', '751'),
  ('MA', 'PCEC', 'revenue_type', 'other', '718'),
  ('MA', 'PCEC', 'cash', 'bank', '514'),

-- Tunisia mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code) VALUES
  ('TN', 'PCN', 'cost_type', 'labor', '621'),
  -- ... etc

-- USA mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code) VALUES
  ('US', 'GAAP', 'cost_type', 'labor', '6000'),
  ('US', 'GAAP', 'cost_type', 'materials', '6200'),
  -- ... etc

-- UK mappings
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code) VALUES
  ('GB', 'FRS102', 'cost_type', 'labor', '7000'),
  ('GB', 'FRS102', 'cost_type', 'materials', '6000'),
  -- ... etc

-- France mappings (migrate existing)
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code) VALUES
  ('FR', 'PCG', 'cost_type', 'labor', '641'),
  ('FR', 'PCG', 'cost_type', 'materials', '601'),
  ('FR', 'PCG', 'cost_type', 'utilities', '606'),
  ('FR', 'PCG', 'cost_type', 'equipment', '615'),
  ('FR', 'PCG', 'cost_type', 'product_application', '604'),
  ('FR', 'PCG', 'cost_type', 'other', '628'),
  ('FR', 'PCG', 'revenue_type', 'harvest', '701'),
  ('FR', 'PCG', 'revenue_type', 'subsidy', '74'),
  ('FR', 'PCG', 'revenue_type', 'other', '708'),
  ('FR', 'PCG', 'cash', 'bank', '512');
```

#### Step 3: Organization Onboarding

When creating a new organization:

```sql
-- 1. Create organization with country
INSERT INTO organizations (name, country_code, accounting_standard, default_currency_code)
VALUES ('My Farm Morocco', 'MA', 'PCEC', 'MAD');

-- 2. Seed COA for the organization
SELECT * FROM seed_chart_of_accounts('org-id');

-- 3. Done! Ledger integration will automatically use Morocco accounts
```

### 5. Migration for Existing Organizations

```sql
-- Migrate existing French organizations
UPDATE organizations
SET country_code = 'FR',
    accounting_standard = 'PCG',
    default_currency_code = 'EUR'
WHERE country_code IS NULL;

-- No need to recreate accounts - they already exist
-- Just need to ensure account_mappings are created for France
```

## Benefits

1. **Country-Agnostic**: Support any accounting standard
2. **Template-Based**: Easy to add new countries
3. **Centralized Mapping**: Cost/revenue types map automatically
4. **No Code Changes**: Adding a country is just data seeding
5. **Backward Compatible**: Existing French orgs work unchanged
6. **Flexible**: Organizations can customize their COA after seeding

## Implementation Plan

### Phase 1: Schema Updates
- [ ] Add country_code, accounting_standard to organizations
- [ ] Create account_templates table
- [ ] Create account_mappings table
- [ ] Update organizations with default FR values

### Phase 2: Template Seeding
- [ ] Migrate French COA to account_templates
- [ ] Create Morocco PCEC templates
- [ ] Create Tunisia PCN templates
- [ ] Create USA GAAP templates
- [ ] Create UK FRS 102 templates
- [ ] Seed all account_mappings

### Phase 3: Function Updates
- [ ] Create seed_chart_of_accounts() generic function
- [ ] Update get_account_id_by_mapping() function
- [ ] Update create_cost_journal_entry() trigger
- [ ] Update create_revenue_journal_entry() trigger
- [ ] Deprecate seed_french_chart_of_accounts() (keep for compatibility)

### Phase 4: Frontend Updates
- [ ] Add country selector to organization creation
- [ ] Show accounting standard in organization settings
- [ ] Add "Seed Chart of Accounts" button in settings
- [ ] Display organization's COA with country-specific grouping

### Phase 5: Testing & Documentation
- [ ] Test seeding for each country
- [ ] Test ledger integration for each country
- [ ] Create user documentation
- [ ] Create developer documentation for adding new countries

## Adding a New Country

To add support for a new country (example: Spain):

### 1. Define Account Templates

```sql
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, description) VALUES
  ('ES', 'PGC', 'Patrimonio neto', '100', 'Capital social', 'equity', 'Share capital'),
  ('ES', 'PGC', 'Inmovilizado', '210', 'Terrenos', 'asset', 'Land'),
  -- ... all Spanish PGC accounts
```

### 2. Define Account Mappings

```sql
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code) VALUES
  ('ES', 'PGC', 'cost_type', 'labor', '640'),  -- Wages expense
  ('ES', 'PGC', 'cost_type', 'materials', '600'),  -- Purchases
  ('ES', 'PGC', 'revenue_type', 'harvest', '700'),  -- Sales
  ('ES', 'PGC', 'cash', 'bank', '572');  -- Banks
```

### 3. Done!

Organizations can now choose Spain (ES) with PGC standard, and everything works automatically.

## API Examples

### Frontend: Create Organization with Country

```typescript
const { data: org } = await supabase
  .from('organizations')
  .insert({
    name: 'My Moroccan Farm',
    country_code: 'MA',
    accounting_standard: 'PCEC',
    default_currency_code: 'MAD'
  })
  .select()
  .single();

// Seed COA
const { data: result } = await supabase
  .rpc('seed_chart_of_accounts', { p_org_id: org.id });

console.log(result.message);
// "Successfully created 87 accounts for MA - PCEC"
```

### Backend: Query Accounts with Country Context

```sql
-- Get all expense accounts for a Moroccan organization
SELECT a.*
FROM accounts a
JOIN organizations o ON o.id = a.organization_id
WHERE a.organization_id = 'org-id'
  AND a.account_type = 'expense'
  AND o.country_code = 'MA'
ORDER BY a.code;
```

## References

- French PCG: https://www.plan-comptable.com/
- Morocco PCEC: https://www.finances.gov.ma/
- Tunisia PCN: http://www.iort.gov.tn/
- USA GAAP: https://www.fasb.org/
- UK FRS 102: https://www.frc.org.uk/

## Next Steps

After reviewing this design, we can proceed with implementation. The changes are:

1. **Backward compatible** - existing French orgs continue working
2. **Template-driven** - new countries are just data, not code
3. **Flexible** - organizations can customize after seeding
4. **Scalable** - supports unlimited countries/standards

Would you like me to proceed with implementing this design in the schema?
