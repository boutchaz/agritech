# Double-Entry Bookkeeping System - Verification Checklist

Use this checklist to verify your system is working correctly.

---

## ✅ Database Verification

### 1. Check Trigger Installation

```sql
-- Run this query in your Supabase SQL editor or psql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_recalculate_journal_totals';
```

**Expected Result**: Should return 1 row showing the trigger exists on `journal_items`

---

### 2. Test Trigger Functionality

```sql
-- Step 1: Create a test journal entry
INSERT INTO journal_entries (
  organization_id,
  entry_number,
  entry_date,
  total_debit,
  total_credit,
  status
) VALUES (
  '<your-org-id>',
  'TEST-TRIGGER-001',
  CURRENT_DATE,
  0,  -- Start with 0
  0,  -- Start with 0
  'draft'
) RETURNING id;

-- Note the returned ID, use it below

-- Step 2: Insert journal items
INSERT INTO journal_items (journal_entry_id, account_id, debit, credit, description)
VALUES
  ('<entry-id-from-above>', '<any-account-id>', 250.50, 0, 'Test debit'),
  ('<entry-id-from-above>', '<any-account-id>', 0, 250.50, 'Test credit');

-- Step 3: Verify totals were auto-calculated
SELECT
  entry_number,
  total_debit,
  total_credit,
  ABS(total_debit - total_credit) as difference
FROM journal_entries
WHERE id = '<entry-id-from-above>';

-- Expected: total_debit=250.50, total_credit=250.50, difference=0

-- Step 4: Cleanup
DELETE FROM journal_entries WHERE id = '<entry-id-from-above>';
```

✅ **PASS**: Totals calculated automatically
❌ **FAIL**: Totals remain 0 → Trigger not working, run migration again

---

### 3. Test Balance Constraint

```sql
-- This should FAIL (good - means constraint is working)
INSERT INTO journal_entries (
  organization_id,
  entry_number,
  entry_date,
  total_debit,
  total_credit,
  status
) VALUES (
  '<your-org-id>',
  'TEST-CONSTRAINT-001',
  CURRENT_DATE,
  100,    -- Unbalanced!
  200,    -- Unbalanced!
  'draft'
);

-- Expected error: "new row for relation "journal_entries" violates check constraint "journal_entry_balanced""
```

✅ **PASS**: Error thrown about constraint violation
❌ **FAIL**: Entry inserted → Constraint missing, check migration

---

## ✅ Backend API Verification

### 1. Check NestJS Server Running

```bash
cd agritech-api
npm run start:dev
```

**Expected**: Server starts on `http://localhost:3000`

Look for:
```
[Nest] INFO  [NestFactory] Starting Nest application...
[Nest] INFO  [InstanceLoader] InvoicesModule dependencies initialized
[Nest] INFO  [RoutesResolver] InvoicesController {/invoices}:
[Nest] INFO  [RouterExplorer] Mapped {/invoices/:id/post, POST} route
```

✅ **PASS**: Server starts, routes mapped
❌ **FAIL**: Compilation errors → Check dependencies

---

### 2. Test Invoice Posting Endpoint

Create a test invoice first (or use existing draft), then:

```bash
# Get your auth token from browser DevTools:
# Application → Local Storage → auth token

# Test the endpoint
curl -X POST http://localhost:3000/api/invoices/<invoice-id>/post \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "x-organization-id: <your-org-id>" \
  -H "Content-Type: application/json" \
  -d '{"posting_date": "2025-12-01"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Invoice posted successfully",
  "data": {
    "invoice_id": "...",
    "journal_entry_id": "..."
  }
}
```

✅ **PASS**: 200 OK, journal entry created
❌ **FAIL**: Check error message:
- 404: Endpoint not found → Controller not registered
- 400: Missing accounts → Create accounts with codes 1200, 2110, 2150, 1400
- 401: Authentication → Check token
- 500: Server error → Check NestJS logs

---

### 3. Verify Journal Entry Created

```sql
-- Check the journal entry was created
SELECT
  je.entry_number,
  je.entry_date,
  je.reference_type,
  je.reference_number,
  je.total_debit,
  je.total_credit,
  je.status,
  COUNT(ji.id) as line_count
FROM journal_entries je
LEFT JOIN journal_items ji ON je.id = ji.journal_entry_id
WHERE je.reference_number = '<your-invoice-number>'
GROUP BY je.id, je.entry_number, je.entry_date, je.reference_type, je.reference_number, je.total_debit, je.total_credit, je.status;

-- Expected:
-- - status = 'posted'
-- - total_debit = total_credit
-- - line_count > 0 (usually 2-4 lines)
```

✅ **PASS**: Entry exists, balanced, posted
❌ **FAIL**: No entry created → Check server logs

---

## ✅ Frontend Verification

### 1. Check Frontend Running

```bash
cd project
npm run dev
```

**Expected**: Dev server on `http://localhost:5173`

---

### 2. Test Invoice Posting UI

1. Navigate to invoices page
2. Create or select a draft invoice
3. Click "Post Invoice" button
4. Select posting date
5. Confirm

**Expected Behavior**:
- Loading indicator shows
- Success message appears
- Invoice status changes to "Submitted"
- Journal entry appears in accounting journal

✅ **PASS**: UI works, entry created
❌ **FAIL**: Check browser console for errors

---

### 3. Verify in Accounting Journal

1. Navigate to `/accounting-journal`
2. Find the entry by invoice number
3. Click "View" to see details

**Expected**:
- Entry appears in list
- Total Debit = Total Credit
- Status: "posted"
- Has multiple lines (Dr. and Cr.)

✅ **PASS**: Entry visible, balanced
❌ **FAIL**: Entry missing → Check API call in Network tab

---

## ✅ Integration Tests

### Test 1: Sales Invoice with Tax

```
Invoice:
- Amount: 1,000 MAD
- Tax (20%): 200 MAD
- Total: 1,200 MAD

Expected Journal Entry:
Dr. Accounts Receivable (1200)     1,200
   Cr. Sales Revenue (4xxx)                1,000
   Cr. Tax Payable (2150)                    200
```

**Verify**:
```sql
SELECT
  a.code,
  a.name,
  ji.debit,
  ji.credit
FROM journal_items ji
JOIN accounts a ON ji.account_id = a.id
WHERE ji.journal_entry_id = '<entry-id>'
ORDER BY ji.debit DESC, ji.credit DESC;
```

✅ **PASS**: 3 lines, debits=credits=1200
❌ **FAIL**: Check account mappings

---

### Test 2: Purchase Invoice

```
Invoice:
- Amount: 500 MAD
- Tax (20%): 100 MAD
- Total: 600 MAD

Expected Journal Entry:
Dr. Expense Account (5xxx)         500
Dr. Tax Receivable (1400)          100
   Cr. Accounts Payable (2110)             600
```

✅ **PASS**: 3 lines, debits=credits=600
❌ **FAIL**: Check expense account on items

---

### Test 3: Payment Received

```
Payment: 1,200 MAD for invoice

Expected Journal Entry:
Dr. Cash (1110)                  1,200
   Cr. Accounts Receivable (1200)        1,200
```

✅ **PASS**: 2 lines, balanced
❌ **FAIL**: Check payment allocation logic

---

## ✅ Error Handling Tests

### Test 1: Unbalanced Entry (Should Fail)

Try to manually create:
```sql
-- This should be blocked by application
INSERT INTO journal_entries (...) VALUES (...);
INSERT INTO journal_items (journal_entry_id, account_id, debit, credit)
VALUES
  ('<id>', '<account1>', 100, 0),
  ('<id>', '<account2>', 0, 90);  -- Unbalanced!
```

✅ **PASS**: Error thrown by constraint
❌ **FAIL**: Entry created → Constraint not working

---

### Test 2: Missing GL Accounts

Try to post invoice when account 1200 doesn't exist.

✅ **PASS**: Clear error "Missing accounts receivable account"
❌ **FAIL**: Generic error → Check account validation

---

### Test 3: Post Non-Draft Invoice

Try to post an already-submitted invoice.

✅ **PASS**: Error "Only draft invoices can be posted"
❌ **FAIL**: Duplicate entry created → Check status validation

---

## ✅ Performance Checks

### 1. Trigger Performance

```sql
EXPLAIN ANALYZE
SELECT * FROM journal_items WHERE journal_entry_id = '<any-id>';

-- Should use index: idx_journal_items_entry
```

✅ **PASS**: Index used
❌ **FAIL**: Sequential scan → Index missing

---

### 2. API Response Time

Post invoice and check:
- Expected: < 1 second
- Acceptable: < 3 seconds
- Slow: > 5 seconds

If slow, check:
- Database connection pool
- Missing indexes
- N+1 query issues

---

## ✅ Final Checks

### Required GL Accounts Exist

```sql
SELECT code, name, type
FROM accounts
WHERE organization_id = '<your-org-id>'
AND code IN ('1110', '1200', '1400', '2110', '2150')
ORDER BY code;

-- Expected: 5 rows
-- 1110: Cash/Bank (asset)
-- 1200: Accounts Receivable (asset)
-- 1400: Tax Receivable (asset)
-- 2110: Accounts Payable (liability)
-- 2150: Tax Payable (liability)
```

✅ **PASS**: All 5 accounts exist
❌ **FAIL**: Create missing accounts

---

### Account Mappings Configured

```sql
SELECT
  mapping_type,
  mapping_key,
  a.code,
  a.name
FROM account_mappings am
JOIN accounts a ON am.account_id = a.id
WHERE am.organization_id = '<your-org-id>'
AND am.is_active = true;

-- Expected: Multiple rows for cost_type, revenue_type, cash
```

✅ **PASS**: Mappings exist
❌ **FAIL**: Create mappings for automated journal creation

---

## 🎯 Overall System Health

Mark your status:

- [ ] Database trigger installed and working
- [ ] Balance constraint active
- [ ] NestJS API endpoint working
- [ ] Frontend calls NestJS API (not Edge Function)
- [ ] Journal entries create successfully
- [ ] Entries are balanced (debits = credits)
- [ ] Required GL accounts exist
- [ ] Error handling works
- [ ] Performance is acceptable
- [ ] Documentation reviewed

---

## 🆘 Troubleshooting

If any check fails, refer to:

1. [DOUBLE_ENTRY_FIX_SUMMARY.md](DOUBLE_ENTRY_FIX_SUMMARY.md) - Implementation details
2. [DOUBLE_ENTRY_QUICK_REFERENCE.md](DOUBLE_ENTRY_QUICK_REFERENCE.md) - Quick fixes
3. [.claude/accounting.md](.claude/accounting.md) - Full documentation

Common issues:
- **Trigger not working**: Run migration: `supabase db push`
- **API 404**: Check controller registered in module
- **Balance violation**: Check application validation logic
- **Missing accounts**: Create Chart of Accounts first
- **Frontend error**: Check API base URL in environment

---

## ✅ Sign Off

When all checks pass:

**Tested by**: _________________
**Date**: _________________
**Status**: ✅ Production Ready

**Notes**:
```
[Add any observations or issues encountered]
```

---

**Next Steps After Verification**:
1. Deploy to production
2. Train users on invoice posting
3. Monitor journal entries for first week
4. Set up alerting for constraint violations
5. Plan payment allocation migration (optional)
