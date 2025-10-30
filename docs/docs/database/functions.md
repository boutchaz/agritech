# Database Functions

PostgreSQL functions and RPC endpoints for business logic in the AgriTech Platform.

## Overview

Database functions encapsulate complex business logic, provide reusable code, and enable secure operations through `SECURITY DEFINER`.

## Key Functions

### Authentication & Authorization

#### has_valid_subscription
Check if organization has an active subscription.

```sql
CREATE OR REPLACE FUNCTION has_valid_subscription(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  sub_record RECORD;
BEGIN
  SELECT * INTO sub_record
  FROM subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  IF sub_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check status and dates
  RETURN sub_record.status IN ('active', 'trialing')
    AND (
      sub_record.current_period_end IS NULL
      OR sub_record.current_period_end >= CURRENT_DATE
    );
END;
$$;
```

**Usage:**
```sql
SELECT has_valid_subscription('org-uuid');
```

---

#### can_create_farm / can_create_parcel / can_add_user
Validate operations against subscription limits.

```sql
CREATE OR REPLACE FUNCTION can_create_farm(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  sub_record RECORD;
  current_count INTEGER;
BEGIN
  IF NOT has_valid_subscription(org_id) THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO sub_record FROM subscriptions
  WHERE organization_id = org_id LIMIT 1;

  SELECT COUNT(*) INTO current_count FROM farms
  WHERE organization_id = org_id;

  RETURN current_count < sub_record.max_farms;
END;
$$;
```

---

### Accounting Functions

#### generate_invoice_number
Auto-generate invoice numbers with year and sequence.

```sql
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_organization_id UUID,
  p_invoice_type invoice_type
)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_sequence INT;
  v_year VARCHAR(4);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  v_prefix := CASE WHEN p_invoice_type = 'sales'
    THEN 'INV' ELSE 'BILL' END;

  SELECT COALESCE(MAX(CAST(
    SUBSTRING(invoice_number FROM LENGTH(v_prefix || '-' || v_year || '-') + 1)
    AS INT)), 0) + 1
  INTO v_sequence
  FROM invoices
  WHERE organization_id = p_organization_id
    AND invoice_type = p_invoice_type
    AND invoice_number LIKE v_prefix || '-' || v_year || '-%';

  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_sequence::VARCHAR, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

**Example output:** `INV-2025-00001`, `BILL-2025-00042`

---

#### generate_payment_number
Similar to invoice numbers for payments.

```sql
CREATE OR REPLACE FUNCTION generate_payment_number(
  p_organization_id UUID,
  p_payment_type accounting_payment_type
)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_sequence INT;
  v_year VARCHAR(4);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  v_prefix := CASE WHEN p_payment_type = 'receive'
    THEN 'PAY-IN' ELSE 'PAY-OUT' END;

  SELECT COALESCE(MAX(CAST(
    SUBSTRING(payment_number FROM LENGTH(v_prefix || '-' || v_year || '-') + 1)
    AS INT)), 0) + 1
  INTO v_sequence
  FROM accounting_payments
  WHERE organization_id = p_organization_id
    AND payment_type = p_payment_type
    AND payment_number LIKE v_prefix || '-' || v_year || '-%';

  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_sequence::VARCHAR, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

---

#### get_account_balance
Get current balance for an account.

```sql
CREATE OR REPLACE FUNCTION get_account_balance(
  p_account_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_account RECORD;
  v_balance DECIMAL(15, 2);
BEGIN
  SELECT * INTO v_account FROM accounts WHERE id = p_account_id;

  SELECT
    CASE
      WHEN v_account.account_type IN ('Asset', 'Expense')
      THEN COALESCE(SUM(ji.debit - ji.credit), 0)
      ELSE COALESCE(SUM(ji.credit - ji.debit), 0)
    END
  INTO v_balance
  FROM journal_items ji
  JOIN journal_entries je ON ji.journal_entry_id = je.id
  WHERE ji.account_id = p_account_id
    AND je.status = 'posted'
    AND je.posting_date <= p_as_of_date;

  RETURN COALESCE(v_balance, 0);
END;
$$;
```

**Usage:**
```sql
-- Current balance
SELECT get_account_balance('account-uuid');

-- Balance as of specific date
SELECT get_account_balance('account-uuid', '2025-01-01');
```

---

### Worker Management

#### calculate_metayage_share
Calculate sharecropper payment based on harvest revenue.

```sql
CREATE OR REPLACE FUNCTION calculate_metayage_share(
  p_worker_id UUID,
  p_gross_revenue DECIMAL,
  p_total_charges DECIMAL DEFAULT 0
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_worker RECORD;
  v_base_amount DECIMAL;
  v_share DECIMAL;
BEGIN
  SELECT * INTO v_worker FROM workers WHERE id = p_worker_id;

  IF v_worker.worker_type != 'metayage' THEN
    RAISE EXCEPTION 'Worker is not a métayage worker';
  END IF;

  -- Calculate base amount
  IF v_worker.calculation_basis = 'gross_revenue' THEN
    v_base_amount := p_gross_revenue;
  ELSE
    v_base_amount := p_gross_revenue - p_total_charges;
  END IF;

  v_share := v_base_amount * (v_worker.metayage_percentage / 100.0);

  RETURN v_share;
END;
$$;
```

**Usage:**
```sql
-- Calculate share: 100,000 MAD revenue, 20,000 MAD costs
SELECT calculate_metayage_share(
  'worker-uuid',
  100000.00,
  20000.00
);
```

---

### Organization Management

#### create_organization_with_owner
Create organization and assign owner role.

```sql
CREATE OR REPLACE FUNCTION create_organization_with_owner(
  p_name VARCHAR(255),
  p_user_id UUID,
  p_currency VARCHAR(3) DEFAULT 'MAD'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, currency, created_by)
  VALUES (p_name, p_currency, p_user_id)
  RETURNING id INTO v_org_id;

  -- Assign owner role
  INSERT INTO organization_users (
    organization_id, user_id, role, is_active
  ) VALUES (
    v_org_id, p_user_id, 'organization_admin', TRUE
  );

  -- Create trial subscription
  INSERT INTO subscriptions (
    organization_id,
    plan_type,
    status,
    max_farms,
    max_parcels,
    max_users,
    current_period_start,
    current_period_end
  ) VALUES (
    v_org_id,
    'trial',
    'active',
    1,
    10,
    3,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days'
  );

  -- Seed chart of accounts
  PERFORM seed_chart_of_accounts(v_org_id, p_currency);

  RETURN v_org_id;
END;
$$;
```

---

#### get_user_organizations
Get all organizations for a user with roles.

```sql
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name VARCHAR(255),
  role VARCHAR(50),
  is_active BOOLEAN,
  joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    ou.role,
    ou.is_active,
    ou.joined_at
  FROM organization_users ou
  JOIN organizations o ON ou.organization_id = o.id
  WHERE ou.user_id = p_user_id
  ORDER BY ou.joined_at DESC;
END;
$$;
```

---

### Accounting Automation

#### seed_chart_of_accounts
Auto-create standard chart of accounts for new organizations.

```sql
CREATE OR REPLACE FUNCTION seed_chart_of_accounts(
  org_id UUID,
  currency_code TEXT DEFAULT 'MAD'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Assets
  INSERT INTO accounts (organization_id, code, name, account_type, is_group, currency_code)
  VALUES
    (org_id, '1000', 'Assets', 'Asset', TRUE, currency_code),
    (org_id, '1100', 'Current Assets', 'Asset', TRUE, currency_code),
    (org_id, '1110', 'Cash', 'Asset', FALSE, currency_code),
    (org_id, '1120', 'Bank Accounts', 'Asset', FALSE, currency_code),
    (org_id, '1130', 'Accounts Receivable', 'Asset', FALSE, currency_code),
    (org_id, '1140', 'Inventory', 'Asset', FALSE, currency_code);

  -- Liabilities
  INSERT INTO accounts (organization_id, code, name, account_type, is_group, currency_code)
  VALUES
    (org_id, '2000', 'Liabilities', 'Liability', TRUE, currency_code),
    (org_id, '2100', 'Current Liabilities', 'Liability', TRUE, currency_code),
    (org_id, '2110', 'Accounts Payable', 'Liability', FALSE, currency_code),
    (org_id, '2120', 'Accrued Expenses', 'Liability', FALSE, currency_code);

  -- Equity
  INSERT INTO accounts (organization_id, code, name, account_type, is_group, currency_code)
  VALUES
    (org_id, '3000', 'Equity', 'Equity', TRUE, currency_code),
    (org_id, '3100', 'Owner\'s Capital', 'Equity', FALSE, currency_code),
    (org_id, '3200', 'Retained Earnings', 'Equity', FALSE, currency_code);

  -- Revenue
  INSERT INTO accounts (organization_id, code, name, account_type, is_group, currency_code)
  VALUES
    (org_id, '4000', 'Revenue', 'Revenue', TRUE, currency_code),
    (org_id, '4100', 'Sales Revenue', 'Revenue', FALSE, currency_code),
    (org_id, '4200', 'Service Revenue', 'Revenue', FALSE, currency_code);

  -- Expenses
  INSERT INTO accounts (organization_id, code, name, account_type, is_group, currency_code)
  VALUES
    (org_id, '5000', 'Expenses', 'Expense', TRUE, currency_code),
    (org_id, '5100', 'Cost of Goods Sold', 'Expense', FALSE, currency_code),
    (org_id, '5200', 'Operating Expenses', 'Expense', TRUE, currency_code),
    (org_id, '5210', 'Salaries and Wages', 'Expense', FALSE, currency_code),
    (org_id, '5220', 'Supplies', 'Expense', FALSE, currency_code),
    (org_id, '5230', 'Utilities', 'Expense', FALSE, currency_code),
    (org_id, '5240', 'Maintenance', 'Expense', FALSE, currency_code);
END;
$$;
```

---

## Calling Functions from Frontend

### Direct RPC Call

```typescript
import { supabase } from '@/lib/supabase';

// Call function
const { data, error } = await supabase.rpc('has_valid_subscription', {
  org_id: 'org-uuid'
});

// Generate invoice number
const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', {
  p_organization_id: orgId,
  p_invoice_type: 'sales'
});
```

### With TanStack Query

```typescript
export const useHasValidSubscription = (orgId: string) => {
  return useQuery({
    queryKey: ['subscription', 'valid', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('has_valid_subscription', {
        org_id: orgId
      });
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};
```

---

## Performance Considerations

- **STABLE vs VOLATILE**: Use `STABLE` for functions that don't modify data
- **SECURITY DEFINER**: Use cautiously, as it bypasses RLS
- **Indexing**: Ensure referenced columns are indexed
- **Caching**: Cache function results in application layer

## Next Steps

- [Triggers](./triggers.md) - Database triggers
- [Schema](./schema.md) - Complete schema reference
- [RLS Policies](./rls-policies.md) - Row Level Security
