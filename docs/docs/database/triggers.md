# Database Triggers

Database triggers for automatic data validation, calculation, and integrity in the AgriTech Platform.

## Overview

Triggers automatically execute functions before or after INSERT, UPDATE, or DELETE operations. They ensure data integrity, perform calculations, and maintain audit trails.

## Core Triggers

### 1. update_updated_at_column

Auto-update `updated_at` timestamp on record modification.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER trg_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Applied to:** All tables with `updated_at` column

---

### 2. validate_journal_balance

Auto-update journal entry totals when items change.

```sql
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE journal_entries
  SET
    total_debit = (
      SELECT COALESCE(SUM(debit), 0)
      FROM journal_items
      WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
    ),
    total_credit = (
      SELECT COALESCE(SUM(credit), 0)
      FROM journal_items
      WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_journal_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_items
FOR EACH ROW
EXECUTE FUNCTION validate_journal_balance();
```

**Purpose:** Ensures journal entries always show correct debit/credit totals

---

### 3. update_invoice_totals

Recalculate invoice amounts from line items.

```sql
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET
    subtotal = (
      SELECT COALESCE(SUM(amount - tax_amount), 0)
      FROM invoice_items
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    tax_total = (
      SELECT COALESCE(SUM(tax_amount), 0)
      FROM invoice_items
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    grand_total = (
      SELECT COALESCE(SUM(amount), 0)
      FROM invoice_items
      WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Update outstanding amount for draft invoices
  UPDATE invoices
  SET outstanding_amount = grand_total
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    AND status = 'draft';

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invoice_totals
AFTER INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION update_invoice_totals();
```

---

### 4. update_invoice_outstanding

Update outstanding balance when payments allocated.

```sql
CREATE OR REPLACE FUNCTION update_invoice_outstanding()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_allocated DECIMAL(15, 2);
  v_grand_total DECIMAL(15, 2);
  v_outstanding DECIMAL(15, 2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(allocated_amount), 0), i.grand_total
  INTO v_total_allocated, v_grand_total
  FROM payment_allocations pa
  JOIN invoices i ON i.id = v_invoice_id
  WHERE pa.invoice_id = v_invoice_id
  GROUP BY i.grand_total;

  v_outstanding := v_grand_total - COALESCE(v_total_allocated, 0);

  UPDATE invoices
  SET
    outstanding_amount = v_outstanding,
    status = CASE
      WHEN v_outstanding = 0 THEN 'paid'::invoice_status
      WHEN v_outstanding < v_grand_total THEN 'partially_paid'::invoice_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invoice_outstanding
AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
FOR EACH ROW
EXECUTE FUNCTION update_invoice_outstanding();
```

---

### 5. calculate_parcel_area_from_boundary

Auto-calculate parcel area from GeoJSON boundary.

```sql
CREATE OR REPLACE FUNCTION calculate_parcel_area_from_boundary()
RETURNS TRIGGER AS $$
DECLARE
  i integer;
  area_sum numeric := 0;
  x1 numeric;
  y1 numeric;
  x2 numeric;
  y2 numeric;
  points_count integer;
  first_coord_x numeric;
  first_coord_y numeric;
BEGIN
  IF NEW.boundary IS NOT NULL THEN
    points_count := jsonb_array_length(NEW.boundary);
    first_coord_x := (NEW.boundary->0->0)::numeric;
    first_coord_y := (NEW.boundary->0->1)::numeric;

    -- Shoelace formula for polygon area
    FOR i IN 0..(points_count - 2) LOOP
      x1 := (NEW.boundary->i->0)::numeric;
      y1 := (NEW.boundary->i->1)::numeric;
      x2 := (NEW.boundary->(i+1)->0)::numeric;
      y2 := (NEW.boundary->(i+1)->1)::numeric;
      area_sum := area_sum + (x1 * y2 - x2 * y1);
    END LOOP;

    -- Detect coordinate system and convert to hectares
    IF ABS(first_coord_x) > 20000 OR ABS(first_coord_y) > 20000 THEN
      -- EPSG:3857 (meters) - direct conversion
      NEW.calculated_area := ABS(area_sum / 2) / 10000;
    ELSE
      -- Geographic coordinates (degrees)
      NEW.calculated_area := ABS(area_sum / 2) * 111.32 * 111.32 / 10000;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_parcel_area
BEFORE INSERT OR UPDATE ON parcels
FOR EACH ROW
EXECUTE FUNCTION calculate_parcel_area_from_boundary();
```

---

### 6. handle_new_user

Auto-create user profile and organization on signup.

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (
    id, first_name, last_name, language, onboarding_completed
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'language', 'en'),
    FALSE
  );

  -- Create default organization
  v_org_id := create_organization_with_owner(
    COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
    NEW.id,
    'MAD'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
```

---

## Trigger Patterns

### Before vs After Triggers

**BEFORE Triggers:** Modify NEW record before saving
```sql
CREATE TRIGGER trg_before_example
BEFORE INSERT OR UPDATE ON table_name
FOR EACH ROW
EXECUTE FUNCTION function_name();
```

**AFTER Triggers:** React to changes, update related records
```sql
CREATE TRIGGER trg_after_example
AFTER INSERT OR UPDATE ON table_name
FOR EACH ROW
EXECUTE FUNCTION function_name();
```

### Row vs Statement Triggers

**FOR EACH ROW:** Executes once per affected row
```sql
CREATE TRIGGER trg_row_example
AFTER INSERT ON table_name
FOR EACH ROW
EXECUTE FUNCTION function_name();
```

**FOR EACH STATEMENT:** Executes once per statement
```sql
CREATE TRIGGER trg_statement_example
AFTER INSERT ON table_name
FOR EACH STATEMENT
EXECUTE FUNCTION function_name();
```

---

## Testing Triggers

### Verify Trigger Execution

```sql
-- Test updated_at trigger
INSERT INTO farms (organization_id, name) VALUES ('org-uuid', 'Test Farm');
SELECT updated_at FROM farms WHERE name = 'Test Farm';

-- Wait and update
UPDATE farms SET name = 'Updated Farm' WHERE name = 'Test Farm';
SELECT updated_at FROM farms WHERE name = 'Updated Farm';
-- Should show different timestamp
```

### Test Invoice Total Calculation

```sql
BEGIN;

-- Create invoice
INSERT INTO invoices (organization_id, invoice_number, invoice_type, party_name, invoice_date, due_date)
VALUES ('org-uuid', 'INV-TEST-001', 'sales', 'Test Customer', CURRENT_DATE, CURRENT_DATE + 30)
RETURNING id;

-- Add line items
INSERT INTO invoice_items (invoice_id, item_name, quantity, unit_price, amount)
VALUES
  ('invoice-uuid', 'Product A', 10, 100.00, 1000.00),
  ('invoice-uuid', 'Product B', 5, 200.00, 1000.00);

-- Check totals (should auto-update)
SELECT subtotal, tax_total, grand_total FROM invoices WHERE id = 'invoice-uuid';
-- Should show: subtotal=2000, tax_total=0, grand_total=2000

ROLLBACK;
```

---

## Performance Considerations

### 1. Avoid Recursive Triggers

```sql
-- BAD: Can cause infinite loop
CREATE TRIGGER trg_bad_update
AFTER UPDATE ON table_a
FOR EACH ROW
EXECUTE FUNCTION update_table_a(); -- Updates same table!

-- GOOD: Use flag to prevent recursion
CREATE OR REPLACE FUNCTION safe_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.column = NEW.column THEN
    RETURN NEW; -- Skip if no change
  END IF;
  -- Perform update
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2. Minimize Trigger Logic

Keep triggers simple - complex logic should be in application layer:

```sql
-- GOOD: Simple calculation
CREATE OR REPLACE FUNCTION calculate_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total := NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AVOID: Complex business logic in triggers
```

### 3. Use Conditional Execution

```sql
CREATE OR REPLACE FUNCTION conditional_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only execute if specific conditions met
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Perform operation
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Debugging Triggers

### List All Triggers

```sql
SELECT
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### Temporarily Disable Trigger

```sql
-- Disable
ALTER TABLE table_name DISABLE TRIGGER trigger_name;

-- Re-enable
ALTER TABLE table_name ENABLE TRIGGER trigger_name;

-- Disable all triggers on table
ALTER TABLE table_name DISABLE TRIGGER ALL;
```

### Add Logging to Trigger

```sql
CREATE OR REPLACE FUNCTION debug_trigger()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'Trigger fired: %, Operation: %, OLD: %, NEW: %',
    TG_NAME, TG_OP, OLD, NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Common Trigger Use Cases

### Audit Trail

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT,
  operation TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, operation, old_data, new_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_farms
AFTER INSERT OR UPDATE OR DELETE ON farms
FOR EACH ROW
EXECUTE FUNCTION audit_changes();
```

### Soft Delete

```sql
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE table_name
    SET deleted_at = NOW(), is_active = FALSE
    WHERE id = OLD.id;
    RETURN NULL; -- Prevent actual DELETE
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_soft_delete
BEFORE DELETE ON table_name
FOR EACH ROW
EXECUTE FUNCTION soft_delete();
```

---

## Next Steps

- [Functions](./functions.md) - PostgreSQL functions
- [RLS Policies](./rls-policies.md) - Row Level Security
- [Schema](./schema.md) - Complete schema reference
