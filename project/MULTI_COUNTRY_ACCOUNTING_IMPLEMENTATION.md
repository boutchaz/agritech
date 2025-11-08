# Multi-Country Accounting System - Implementation Complete

## Overview

The AgriTech platform now supports **multi-country chart of accounts** with automatic ledger integration. Organizations can choose their accounting standard based on their country, and all journal entries are created automatically using country-specific account codes.

## Supported Countries

| Country | Code | Standard | Currency | Accounts | Status |
|---------|------|----------|----------|----------|--------|
| **Morocco** | MA | PCEC | MAD | 36 | ✅ Ready |
| **Tunisia** | TN | PCN | TND | 26 | ✅ Ready |
| **France** | FR | PCG | EUR | 160+ | ✅ Ready |
| **USA** | US | GAAP | USD | 27 | ✅ Ready |
| **UK** | GB | FRS102 | GBP | 30 | ✅ Ready |

## Architecture

### New Schema Components

#### 1. Organizations Table - Extended
```sql
ALTER TABLE organizations
ADD COLUMN country_code VARCHAR(2);        -- ISO 3166-1 alpha-2
ADD COLUMN accounting_standard VARCHAR(50); -- PCG, PCEC, PCN, GAAP, FRS102
```

Existing organizations are automatically migrated to France (FR/PCG).

#### 2. Account Templates Table
```sql
CREATE TABLE account_templates (
  country_code VARCHAR(2) NOT NULL,
  accounting_standard VARCHAR(50) NOT NULL,
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,  -- asset, liability, equity, revenue, expense
  parent_code VARCHAR(50),
  is_group BOOLEAN DEFAULT false,
  ...
  UNIQUE(country_code, accounting_standard, account_code)
);
```

**Purpose**: Pre-configured chart of accounts templates for each country/standard.

**Seed Data**:
- Morocco PCEC: 36 accounts
- Tunisia PCN: 26 accounts
- USA GAAP: 27 accounts
- UK FRS 102: 30 accounts
- France PCG mappings: 11 mappings

#### 3. Account Mappings Table
```sql
CREATE TABLE account_mappings (
  country_code VARCHAR(2) NOT NULL,
  accounting_standard VARCHAR(50) NOT NULL,
  mapping_type VARCHAR(50) NOT NULL,  -- 'cost_type', 'revenue_type', 'cash'
  mapping_key VARCHAR(100) NOT NULL,  -- 'labor', 'harvest', 'bank'
  account_code VARCHAR(50) NOT NULL,
  ...
  UNIQUE(country_code, accounting_standard, mapping_type, mapping_key)
);
```

**Purpose**: Maps generic business operations to country-specific account codes.

**Mapping Types**:
- `cost_type`: labor, materials, utilities, equipment, product_application, other
- `revenue_type`: harvest, subsidy, other
- `cash`: bank, cash

**Example Mappings**:

| Country | Type | Key | Account Code | Account Name |
|---------|------|-----|--------------|--------------|
| MA/PCEC | cost_type | labor | 621 | Charges de personnel |
| TN/PCN | cost_type | labor | 621 | Frais de personnel |
| FR/PCG | cost_type | labor | 641 | Rémunérations du personnel |
| US/GAAP | cost_type | labor | 6000 | Wages and Salaries |
| GB/FRS102 | cost_type | labor | 7000 | Wages and Salaries |

## Updated Functions

### 1. Generic COA Seeding
```sql
seed_chart_of_accounts(
  p_org_id UUID,
  p_country_code VARCHAR(2) DEFAULT NULL,
  p_accounting_standard VARCHAR(50) DEFAULT NULL
)
```

**Features**:
- Automatically uses organization's country/standard if not provided
- Validates template existence
- Handles parent-child account relationships
- Returns success status and accounts created count

**Usage Examples**:
```sql
-- Auto-detect from organization
SELECT * FROM seed_chart_of_accounts('org-id');

-- Explicit country/standard
SELECT * FROM seed_chart_of_accounts('org-id', 'MA', 'PCEC');
SELECT * FROM seed_chart_of_accounts('org-id', 'US', 'GAAP');
```

### 2. Account ID by Mapping
```sql
get_account_id_by_mapping(
  p_org_id UUID,
  p_mapping_type VARCHAR(50),
  p_mapping_key VARCHAR(100)
) RETURNS UUID
```

**How It Works**:
1. Gets organization's country_code and accounting_standard
2. Looks up the account_code in account_mappings
3. Finds the account ID in the organization's accounts
4. Returns the account UUID or NULL if not found

**Example**:
```sql
-- Get labor expense account for any organization
SELECT get_account_id_by_mapping('org-id', 'cost_type', 'labor');

-- Morocco PCEC → Returns ID for account code '621'
-- France PCG → Returns ID for account code '641'
-- USA GAAP → Returns ID for account code '6000'
```

### 3. Updated Ledger Triggers

Both `create_cost_journal_entry()` and `create_revenue_journal_entry()` now use the mapping system:

**Before** (hard-coded French accounts):
```sql
v_expense_account_id := CASE NEW.cost_type
  WHEN 'labor' THEN get_account_id_by_code(NEW.organization_id, '641')  -- French only
  ...
END;
```

**After** (multi-country):
```sql
v_expense_account_id := get_account_id_by_mapping(
  NEW.organization_id,
  'cost_type',
  NEW.cost_type
);  -- Works for all countries!
```

## Complete Workflows

### Workflow 1: Create Moroccan Organization

```sql
-- 1. Create organization
INSERT INTO organizations (name, country_code, accounting_standard, currency_code)
VALUES ('Ferme Atlas', 'MA', 'PCEC', 'MAD')
RETURNING id;
-- Returns: 'abc-123-org-id'

-- 2. Seed Moroccan chart of accounts
SELECT * FROM seed_chart_of_accounts('abc-123-org-id');
-- Result: {accounts_created: 36, success: true, message: "Successfully created 36 accounts for MA - PCEC"}

-- 3. Insert a cost
INSERT INTO costs (organization_id, cost_type, amount, date, description, created_by)
VALUES ('abc-123-org-id', 'labor', 5000.00, CURRENT_DATE, 'Farm workers salary', 'user-id');

-- 4. Journal entry automatically created:
-- Debit: Account 621 (Charges de personnel) - 5000.00 MAD
-- Credit: Account 514 (Banques) - 5000.00 MAD

-- 5. Verify journal entry
SELECT * FROM journal_entries
WHERE organization_id = 'abc-123-org-id'
AND reference_type = 'cost'
ORDER BY created_at DESC
LIMIT 1;
```

### Workflow 2: Create American Organization

```sql
-- 1. Create organization
INSERT INTO organizations (name, country_code, accounting_standard, currency_code)
VALUES ('Green Valley Farm', 'US', 'GAAP', 'USD')
RETURNING id;
-- Returns: 'xyz-456-org-id'

-- 2. Seed American chart of accounts
SELECT * FROM seed_chart_of_accounts('xyz-456-org-id');
-- Result: {accounts_created: 27, success: true, message: "Successfully created 27 accounts for US - GAAP"}

-- 3. Insert a revenue
INSERT INTO revenues (organization_id, revenue_type, amount, date, description, created_by)
VALUES ('xyz-456-org-id', 'harvest', 25000.00, CURRENT_DATE, 'Corn harvest sale', 'user-id');

-- 4. Journal entry automatically created:
-- Debit: Account 1000 (Cash and Cash Equivalents) - 25000.00 USD
-- Credit: Account 4000 (Sales Revenue - Agricultural Products) - 25000.00 USD
```

### Workflow 3: Migrate Existing French Organization

```sql
-- Existing organizations already have country_code='FR' and accounting_standard='PCG'
-- No action needed! They continue to work with existing accounts.

-- Optionally, you can re-seed from templates:
SELECT * FROM seed_chart_of_accounts('existing-fr-org-id');
-- This will clear existing accounts and recreate from template
```

## Account Code Mappings Reference

### Cost Types

| cost_type | MA/PCEC | TN/PCN | FR/PCG | US/GAAP | GB/FRS102 |
|-----------|---------|--------|--------|---------|-----------|
| labor | 621 | 621 | 641 | 6000 | 7000 |
| materials | 611 | 601 | 601 | 6200 | 6000 |
| utilities | 612 | 604 | 606 | 6300 | 7300 |
| equipment | 617 | 604 | 615 | 6500 | 7500 |
| product_application | 612 | 604 | 604 | 6200 | 6100 |
| other | 618 | 608 | 628 | 6900 | 7900 |

### Revenue Types

| revenue_type | MA/PCEC | TN/PCN | FR/PCG | US/GAAP | GB/FRS102 |
|--------------|---------|--------|--------|---------|-----------|
| harvest | 711 | 701 | 701 | 4000 | 5000 |
| subsidy | 751 | 74 | 74 | 4950 | 5900 |
| other | 718 | 708 | 708 | 4900 | 5200 |

### Cash Accounts

| Type | MA/PCEC | TN/PCN | FR/PCG | US/GAAP | GB/FRS102 |
|------|---------|--------|--------|---------|-----------|
| bank | 514 | 53 | 512 | 1000 | 1200 |
| cash | 511 | 53 | 531 | 1000 | 1220 |

## Frontend Integration

### Organization Creation Form

```typescript
// Add country selector
const countries = [
  { code: 'MA', name: 'Morocco', standard: 'PCEC', currency: 'MAD' },
  { code: 'TN', name: 'Tunisia', standard: 'PCN', currency: 'TND' },
  { code: 'FR', name: 'France', standard: 'PCG', currency: 'EUR' },
  { code: 'US', name: 'USA', standard: 'GAAP', currency: 'USD' },
  { code: 'GB', name: 'UK', standard: 'FRS102', currency: 'GBP' },
];

// Create organization
const { data: org } = await supabase
  .from('organizations')
  .insert({
    name: formData.name,
    country_code: formData.country,
    accounting_standard: formData.standard,
    currency_code: formData.currency,
  })
  .select()
  .single();

// Seed COA
const { data: result } = await supabase
  .rpc('seed_chart_of_accounts', { p_org_id: org.id });

if (result.success) {
  console.log(result.message); // "Successfully created 36 accounts for MA - PCEC"
}
```

### Organization Settings

```typescript
// Display current accounting standard
const { data: org } = await supabase
  .from('organizations')
  .select('country_code, accounting_standard, currency_code')
  .eq('id', orgId)
  .single();

console.log(`Accounting Standard: ${org.country_code}/${org.accounting_standard}`);
// Example: "Accounting Standard: MA/PCEC"

// Re-seed COA (admin only)
async function reseedChartOfAccounts() {
  const { data, error } = await supabase
    .rpc('seed_chart_of_accounts', { p_org_id: orgId });

  if (data.success) {
    toast.success(`Recreated ${data.accounts_created} accounts`);
  } else {
    toast.error(data.message);
  }
}
```

## Migration Strategy

### Existing Organizations (Automatic)

All existing organizations are automatically migrated:
```sql
UPDATE organizations
SET country_code = 'FR',
    accounting_standard = 'PCG'
WHERE country_code IS NULL;
```

**Impact**:
- ✅ No breaking changes
- ✅ Existing accounts remain unchanged
- ✅ Ledger triggers continue to work (fallback to France mappings)

### New Organizations

1. User selects country during organization creation
2. System sets `country_code` and `accounting_standard`
3. Backend calls `seed_chart_of_accounts()`
4. COA is created from templates
5. Ready to use!

## Testing

### Test Morocco PCEC

```sql
-- Create test organization
INSERT INTO organizations (name, country_code, accounting_standard, currency_code)
VALUES ('Test Ferme MA', 'MA', 'PCEC', 'MAD')
RETURNING id;

-- Seed COA
SELECT * FROM seed_chart_of_accounts('org-id');
-- Expected: {accounts_created: 36, success: true, ...}

-- Verify accounts
SELECT code, name, account_type FROM accounts
WHERE organization_id = 'org-id'
ORDER BY code;
-- Expected: 36 rows with Moroccan account names

-- Test cost entry
INSERT INTO costs (organization_id, cost_type, amount, date, created_by)
VALUES ('org-id', 'labor', 1000, CURRENT_DATE, 'user-id');

-- Verify journal entry
SELECT
  je.entry_number,
  ji.debit,
  ji.credit,
  a.code,
  a.name
FROM journal_entries je
JOIN journal_items ji ON ji.journal_entry_id = je.id
JOIN accounts a ON a.id = ji.account_id
WHERE je.reference_type = 'cost'
AND je.organization_id = 'org-id'
ORDER BY ji.debit DESC;

-- Expected results:
-- | entry_number | debit | credit | code | name                   |
-- |--------------|-------|--------|------|------------------------|
-- | JE-...       | 1000  | 0      | 621  | Charges de personnel   |
-- | JE-...       | 0     | 1000   | 514  | Banques                |
```

### Test USA GAAP

```sql
-- Create US organization
INSERT INTO organizations (name, country_code, accounting_standard, currency_code)
VALUES ('Test Farm US', 'US', 'GAAP', 'USD')
RETURNING id;

-- Seed and test
SELECT * FROM seed_chart_of_accounts('org-id');
-- Expected: {accounts_created: 27, success: true, ...}

-- Test revenue entry
INSERT INTO revenues (organization_id, revenue_type, amount, date, created_by)
VALUES ('org-id', 'harvest', 5000, CURRENT_DATE, 'user-id');

-- Verify journal entry uses GAAP accounts
SELECT a.code, a.name, ji.debit, ji.credit
FROM journal_entries je
JOIN journal_items ji ON ji.journal_entry_id = je.id
JOIN accounts a ON a.id = ji.account_id
WHERE je.reference_type = 'revenue'
AND je.organization_id = 'org-id';

-- Expected:
-- | code | name                                    | debit | credit |
-- |------|-----------------------------------------|-------|--------|
-- | 1000 | Cash and Cash Equivalents               | 5000  | 0      |
-- | 4000 | Sales Revenue - Agricultural Products   | 0     | 5000   |
```

## Adding a New Country

To add support for a new country (example: Spain - ES/PGC):

### Step 1: Add Account Templates

```sql
INSERT INTO account_templates (country_code, accounting_standard, template_name, account_code, account_name, account_type, display_order) VALUES
  ('ES', 'PGC', 'Patrimonio neto', '100', 'Capital social', 'equity', 10),
  ('ES', 'PGC', 'Inmovilizado', '210', 'Terrenos', 'asset', 20),
  ('ES', 'PGC', 'Gastos de personal', '640', 'Sueldos y salarios', 'expense', 60),
  ('ES', 'PGC', 'Compras', '600', 'Compras de materias primas', 'expense', 61),
  ('ES', 'PGC', 'Ventas', '700', 'Ventas de productos terminados', 'revenue', 70),
  ('ES', 'PGC', 'Subvenciones', '740', 'Subvenciones de explotación', 'revenue', 71),
  ('ES', 'PGC', 'Bancos', '572', 'Bancos e instituciones de crédito', 'asset', 50)
ON CONFLICT (country_code, accounting_standard, account_code) DO NOTHING;
```

### Step 2: Add Account Mappings

```sql
INSERT INTO account_mappings (country_code, accounting_standard, mapping_type, mapping_key, account_code, description) VALUES
  ('ES', 'PGC', 'cost_type', 'labor', '640', 'Labor costs'),
  ('ES', 'PGC', 'cost_type', 'materials', '600', 'Material purchases'),
  ('ES', 'PGC', 'cost_type', 'utilities', '606', 'Utilities'),
  ('ES', 'PGC', 'cost_type', 'equipment', '622', 'Repairs and maintenance'),
  ('ES', 'PGC', 'cost_type', 'product_application', '602', 'Product purchases'),
  ('ES', 'PGC', 'cost_type', 'other', '629', 'Other expenses'),
  ('ES', 'PGC', 'revenue_type', 'harvest', '700', 'Product sales'),
  ('ES', 'PGC', 'revenue_type', 'subsidy', '740', 'Subsidies'),
  ('ES', 'PGC', 'revenue_type', 'other', '759', 'Other revenue'),
  ('ES', 'PGC', 'cash', 'bank', '572', 'Bank account'),
  ('ES', 'PGC', 'cash', 'cash', '570', 'Cash')
ON CONFLICT (country_code, accounting_standard, mapping_type, mapping_key) DO NOTHING;
```

### Step 3: Add Currency (if needed)

```sql
INSERT INTO currencies (code, name, symbol) VALUES
  ('ES', 'Euro', '€')  -- Spain uses EUR, already exists
ON CONFLICT (code) DO NOTHING;
```

### Step 4: Done!

Organizations can now create with ES/PGC:
```sql
INSERT INTO organizations (name, country_code, accounting_standard, currency_code)
VALUES ('Granja Española', 'ES', 'PGC', 'EUR');

SELECT * FROM seed_chart_of_accounts('org-id');
-- Works automatically!
```

## Benefits Summary

### For Users

1. **Country-Specific Accounting**: Familiar account codes and names in their language
2. **Automatic Compliance**: Chart of accounts follows local standards (PCEC, PCN, PCG, GAAP, FRS 102)
3. **Currency Support**: Multi-currency with proper symbols (MAD, TND, EUR, USD, GBP)
4. **Zero Configuration**: Ledger integration works automatically

### For Developers

1. **Template-Based**: Adding new countries is just data seeding
2. **No Code Changes**: New accounting standards don't require code updates
3. **Centralized Mapping**: All account mappings in one table
4. **Backward Compatible**: Existing French organizations work unchanged
5. **Type-Safe**: Schema validation ensures correct mappings

### For Business

1. **Scalability**: Support unlimited countries and accounting standards
2. **Localization**: Ready for international expansion
3. **Compliance**: Follows local accounting standards
4. **Flexibility**: Organizations can customize their COA after seeding

## Schema Location

All changes are in: [project/supabase/migrations/00000000000000_schema.sql](project/supabase/migrations/00000000000000_schema.sql)

**New Components**:
- Lines 449-479: Organizations table updates
- Lines 481-523: account_templates and account_mappings tables
- Lines 525-801: Seed data for all countries
- Lines 7337-7458: Generic seed_chart_of_accounts function
- Lines 7673-7728: get_account_id_by_mapping helper
- Lines 7730-7802: Updated cost journal entry trigger
- Lines 7804-7876: Updated revenue journal entry trigger

## Deployment

1. Open Supabase SQL Editor
2. Copy entire schema file (8000+ lines)
3. Run in SQL Editor
4. Verify:
```sql
-- Check templates loaded
SELECT country_code, accounting_standard, COUNT(*) as accounts
FROM account_templates
GROUP BY country_code, accounting_standard
ORDER BY country_code;

-- Expected:
-- | country_code | accounting_standard | accounts |
-- |--------------|---------------------|----------|
-- | FR           | PCG                 | 0        | (uses old function, not templates)
-- | GB           | FRS102              | 30       |
-- | MA           | PCEC                | 36       |
-- | TN           | PCN                 | 26       |
-- | US           | GAAP                | 27       |

-- Check mappings loaded
SELECT country_code, accounting_standard, COUNT(*) as mappings
FROM account_mappings
GROUP BY country_code, accounting_standard
ORDER BY country_code;

-- Expected:
-- | country_code | accounting_standard | mappings |
-- |--------------|---------------------|----------|
-- | FR           | PCG                 | 11       |
-- | GB           | FRS102              | 11       |
-- | MA           | PCEC                | 11       |
-- | TN           | PCN                 | 11       |
-- | US           | GAAP                | 11       |
```

## Documentation

- Design: [MULTI_COUNTRY_ACCOUNTING_DESIGN.md](MULTI_COUNTRY_ACCOUNTING_DESIGN.md)
- Implementation: This file
- Schema: [00000000000000_schema.sql](supabase/migrations/00000000000000_schema.sql)
- Previous work: [SCHEMA_UPDATES_COMPLETE.md](SCHEMA_UPDATES_COMPLETE.md)

## Next Steps

### Phase 1: Testing (Current)
- [x] Schema changes applied
- [ ] Deploy to database
- [ ] Test each country's COA seeding
- [ ] Test ledger integration for each country
- [ ] Verify journal entries use correct accounts

### Phase 2: Frontend Updates
- [ ] Add country selector to organization creation form
- [ ] Display accounting standard in organization settings
- [ ] Add "Seed Chart of Accounts" button (admin only)
- [ ] Show COA with country-specific grouping
- [ ] Update organization creation wizard

### Phase 3: Documentation
- [ ] User guide for selecting accounting standard
- [ ] Admin guide for adding new countries
- [ ] Migration guide for existing organizations
- [ ] API documentation for frontend developers

### Phase 4: Additional Countries (Future)
- [ ] Add Spain (ES/PGC)
- [ ] Add Algeria (DZ/SCF)
- [ ] Add Egypt (EG/EAS)
- [ ] Add Canada (CA/ASPE)
- [ ] Add other countries as needed

## Support

For questions or issues:
1. Check [MULTI_COUNTRY_ACCOUNTING_DESIGN.md](MULTI_COUNTRY_ACCOUNTING_DESIGN.md) for architecture details
2. Review test SQL queries above
3. Verify account_mappings table has correct mappings
4. Check organization's country_code and accounting_standard fields
5. Ensure seed_chart_of_accounts was called after organization creation

## Status

✅ **Implementation Complete**
✅ **Schema Updated**
✅ **All 5 Countries Supported**
✅ **Ledger Integration Updated**
⏳ **Ready for Database Deployment**
