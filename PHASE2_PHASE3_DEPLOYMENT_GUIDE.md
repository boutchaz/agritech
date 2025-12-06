# Phase 2 & Phase 3 Deployment Guide

**Issue**: When merging Phase 2/3 additions into the main schema.sql file, Supabase reports syntax errors due to how it processes large SQL files.

**Solution**: Deploy Phase 2 & 3 as separate migration files instead of merging into schema.sql.

---

## Deployment Strategy

### Option 1: Run Separate Migration Files (RECOMMENDED)

This is the safest and most manageable approach:

#### Step 1: Apply Schema Updates to account_mappings

Run this SQL in Supabase SQL Editor:

```sql
-- Add new columns to account_mappings table
ALTER TABLE account_mappings
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS source_key VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Unique constraint for global mappings (backward compatible)
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_mappings_global_type_key
ON account_mappings(country_code, accounting_standard, mapping_type, mapping_key)
WHERE organization_id IS NULL;

-- Unique constraint for organization-specific mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_mappings_org_type_key
ON account_mappings(organization_id, mapping_type, source_key)
WHERE organization_id IS NOT NULL;

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_account_mappings_org_lookup
ON account_mappings(organization_id, mapping_type, source_key)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_account_mappings_account
ON account_mappings(account_id)
WHERE is_active = true;

COMMENT ON COLUMN account_mappings.organization_id IS 'Organization ID for org-specific mappings. NULL for global/template mappings.';
COMMENT ON COLUMN account_mappings.source_key IS 'The business event key (e.g., task_type, sale_type). Replaces mapping_key for org-specific mappings.';
COMMENT ON COLUMN account_mappings.account_id IS 'Direct reference to the GL account. Replaces account_code for org-specific mappings.';
COMMENT ON COLUMN account_mappings.is_active IS 'Whether this mapping is currently active. Allows soft-delete.';
COMMENT ON COLUMN account_mappings.metadata IS 'Additional configuration (e.g., related account IDs for compound entries)';
```

#### Step 2: Apply Journal Entry Trigger

Run this SQL in Supabase SQL Editor:

```sql
-- Trigger to automatically calculate total_debit and total_credit
CREATE OR REPLACE FUNCTION recalculate_journal_entry_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit DECIMAL(15, 2);
  v_total_credit DECIMAL(15, 2);
  v_entry_id UUID;
BEGIN
  -- Determine which journal entry ID to use
  IF TG_OP = 'DELETE' THEN
    v_entry_id := OLD.journal_entry_id;
  ELSE
    v_entry_id := NEW.journal_entry_id;
  END IF;

  -- Calculate totals from all journal items for this entry
  SELECT
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_items
  WHERE journal_entry_id = v_entry_id;

  -- Update the journal entry totals
  UPDATE journal_entries
  SET
    total_debit = v_total_debit,
    total_credit = v_total_credit
  WHERE id = v_entry_id;

  -- Return the appropriate row
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on journal_items table
DROP TRIGGER IF EXISTS trg_recalculate_journal_totals ON journal_items;
CREATE TRIGGER trg_recalculate_journal_totals
  AFTER INSERT OR UPDATE OR DELETE ON journal_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_journal_entry_totals();

COMMENT ON FUNCTION recalculate_journal_entry_totals() IS
  'Automatically calculates total_debit and total_credit for journal entries when journal items are modified. Ensures three-layer validation for double-entry bookkeeping.';
```

#### Step 3: Apply Phase 2 & 3 Functions and Views

Run the SQL from [phase2_phase3_standalone.sql](phase2_phase3_standalone.sql) in Supabase SQL Editor.

---

### Option 2: Use the Standalone Migration File

Simply run [phase2_phase3_standalone.sql](phase2_phase3_standalone.sql) after completing Steps 1 and 2 above.

---

## Verification

After deployment, verify everything works:

### 1. Check Table Structure
```sql
\d account_mappings
-- Should show the new columns
```

### 2. Check Functions Exist
```sql
SELECT proname
FROM pg_proc
WHERE proname IN (
  'recalculate_journal_entry_totals',
  'create_task_cost_mappings',
  'create_harvest_sales_mappings'
);
-- Should return all 3 functions
```

### 3. Check Views Exist
```sql
SELECT viewname
FROM pg_views
WHERE viewname IN (
  'v_task_cost_mappings',
  'v_harvest_sales_mappings'
);
-- Should return both views
```

### 4. Test Account Mapping Creation

Get your organization ID:
```sql
SELECT id, name FROM organizations LIMIT 1;
```

Create task cost mappings:
```sql
SELECT create_task_cost_mappings('YOUR-ORG-ID-HERE', 'MA');
```

Create harvest sales mappings:
```sql
SELECT create_harvest_sales_mappings('YOUR-ORG-ID-HERE', 'MA');
```

Verify the mappings:
```sql
SELECT * FROM v_task_cost_mappings WHERE organization_id = 'YOUR-ORG-ID-HERE';
SELECT * FROM v_harvest_sales_mappings WHERE organization_id = 'YOUR-ORG-ID-HERE';
```

---

## Why This Approach?

1. **Incremental**: Easier to debug if something goes wrong
2. **Reversible**: Each step can be rolled back independently
3. **Tested**: Each migration is small and verifiable
4. **Supabase-friendly**: Avoids issues with large SQL file processing

---

## What About schema.sql?

The consolidated schema.sql file is still useful for:
- Fresh database setups
- Development environments
- Documentation purposes

However, for production Supabase deployments, use the incremental migration approach above.

---

## Already Merged into schema.sql?

If you already merged the changes into schema.sql and want to deploy it:

1. **DON'T** run the entire schema.sql file on an existing database
2. Instead, extract just the Phase 2/3 sections and run them separately as shown above
3. The schema.sql is best used for fresh database initialization

---

## Next Steps

After successful deployment:

1. ✅ Test task completion with cost journal entries
2. ✅ Test harvest sales with revenue journal entries
3. ✅ Verify double-entry balance is enforced
4. ✅ Check that totals are automatically calculated

See:
- [PHASE3_HARVESTS_INTEGRATION_COMPLETE.md](PHASE3_HARVESTS_INTEGRATION_COMPLETE.md) for API usage examples
- [DOUBLE_ENTRY_QUICK_REFERENCE.md](DOUBLE_ENTRY_QUICK_REFERENCE.md) for accounting concepts

---

**Status**: Use incremental migration approach for production deployment
