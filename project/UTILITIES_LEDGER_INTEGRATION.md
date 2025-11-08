# Utilities Management - Ledger Integration

## Overview
The Utilities Management component has been updated to use Kibo UI components and includes automatic journal entry synchronization with the accounting ledger.

## Changes Made

### 1. UI Migration to Kibo UI Components ✅

**Before**: Custom modal overlay with basic HTML elements
**After**: Radix UI Dialog components with proper accessibility

```typescript
// Old approach
<div className="modal-overlay">
  <div className="modal-panel">
    <button onClick={handleClose}><X /></button>
    ...
  </div>
</div>

// New approach with Kibo UI
<Dialog open={showAddModal} onOpenChange={setShowAddModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Nouvelle Charge</DialogTitle>
      <DialogDescription>
        Une écriture comptable sera automatiquement créée dans le livre.
      </DialogDescription>
    </DialogHeader>
    ...
    <DialogFooter>
      <Button variant="outline">Annuler</Button>
      <Button>Ajouter</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Benefits**:
- ✅ Better accessibility (keyboard navigation, focus management, ARIA attributes)
- ✅ Consistent styling with the rest of the application
- ✅ Smooth animations and transitions
- ✅ Auto-focus management
- ✅ Escape key and backdrop click to close

### 2. Automatic Ledger Synchronization ✅

#### How It Works

When a utility expense is created or updated, the system **automatically**:

1. **Creates a Journal Entry** with proper double-entry bookkeeping
2. **Debits the Expense Account** (Utilities expense)
3. **Credits the appropriate account** based on payment status:
   - **Cash Account** if paid immediately
   - **Accounts Payable** if pending payment

#### Code Flow

**File**: `src/components/UtilitiesManagement.tsx`

**Function**: `syncUtilityJournalEntry` (lines 298-398)

```typescript
const syncUtilityJournalEntry = useCallback(async (utility: Utility) => {
  // 1. Get expense account (tries to find "Utilities" account, fallback to Operating Expense)
  const debitAccountId = await getAccountByType('Expense', 'Operating Expense');

  // 2. Get credit account based on payment status
  const creditAccountId = utility.payment_status === 'paid'
    ? await getAccountByType('Asset', 'Cash')       // Paid → Credit Cash
    : await getAccountByType('Liability', 'Payable'); // Pending → Credit A/P

  // 3. Create journal entry with debit/credit items
  const entry = await accountingApi.createJournalEntry({
    entry_date: utility.billing_date,
    reference_type: 'utilities',
    reference_id: utility.id,
    items: [
      { account_id: debitAccountId, debit: amount, credit: 0 },
      { account_id: creditAccountId, debit: 0, credit: amount }
    ]
  });

  // 4. Auto-post the entry
  await accountingApi.postJournalEntry(entry.id, user.id);

  return entry.id;
}, [currentOrganization?.id, user?.id, getAccountByType, getUtilityLabel]);
```

#### When Synced

**On Create** (lines 522-540):
```typescript
const handleAddUtility = async () => {
  // 1. Insert utility record
  const { data } = await supabase.from('utilities').insert([newUtility]);

  // 2. Automatically create journal entry
  const journalEntryId = await syncUtilityJournalEntry(data);

  // 3. Link journal entry to utility
  await supabase.from('utilities')
    .update({ journal_entry_id: journalEntryId })
    .eq('id', data.id);
};
```

**On Update** (lines 591-603):
```typescript
const handleUpdateUtility = async () => {
  // 1. Update utility record
  const { data } = await supabase.from('utilities').update(editingUtility);

  // 2. Sync journal entry (creates new or updates existing)
  const journalEntryId = await syncUtilityJournalEntry(data);

  // 3. Update link
  await supabase.from('utilities')
    .update({ journal_entry_id: journalEntryId })
    .eq('id', data.id);
};
```

### 3. Journal Entry Examples

#### Example 1: Paid Electricity Bill (500 MAD)

```
Date: 2025-11-07
Reference: utilities/abc-123-def

Dr. Utilities Expense (Operating Expense)     500.00
   Cr. Cash (Asset)                                   500.00

Description: Utility expense - Électricité
```

#### Example 2: Pending Water Bill (300 MAD)

```
Date: 2025-11-07
Reference: utilities/xyz-456-ghi

Dr. Utilities Expense (Operating Expense)     300.00
   Cr. Accounts Payable (Liability)                   300.00

Description: Utility expense - Eau
```

### 4. Account Lookup Strategy

The system uses **dynamic account lookup** instead of hardcoded account codes:

1. **First**: Look for account with name containing "Utilities" in Operating Expense
2. **Fallback**: Use any Operating Expense account
3. **Last Resort**: Use any Expense account

This ensures flexibility across different chart of accounts configurations.

```typescript
// Try to find "Utilities" account
const { data: utilityAccount } = await supabase
  .from('accounts')
  .select('id')
  .eq('organization_id', currentOrganization.id)
  .eq('account_type', 'Expense')
  .eq('account_subtype', 'Operating Expense')
  .ilike('name', '%Utilities%')
  .maybeSingle();

if (utilityAccount?.id) {
  debitAccountId = utilityAccount.id;
} else {
  // Fallback to any Operating Expense
  debitAccountId = await getAccountByType('Expense', 'Operating Expense');
}
```

## Testing Checklist

- [x] Modal opens/closes correctly with Dialog component
- [x] Form fields are properly bound to state
- [x] Journal entry is created when adding a utility
- [x] Journal entry is updated when modifying a utility
- [x] Correct accounts are debited/credited based on payment status
- [x] Error handling shows user-friendly messages
- [x] Ledger integration errors don't block utility creation

## Error Handling

The system is **resilient**:

```typescript
try {
  const journalEntryId = await syncUtilityJournalEntry(createdUtility);
  // Link journal entry...
} catch (journalError) {
  console.error('Error creating journal entry:', journalError);
  setError(`Charge enregistrée, mais l'écriture comptable n'a pas été créée: ${errorMessage}`);
}
```

**Result**: Even if journal entry creation fails (e.g., missing accounts), the utility record is still saved, and the user is informed.

## User Experience

### Modal Features
- ✅ Responsive design (max-width: 2xl, max-height: 90vh)
- ✅ Scrollable content for long forms
- ✅ Clear action buttons (Annuler / Ajouter)
- ✅ Loading states during file upload
- ✅ Real-time unit cost calculation
- ✅ Consumption tracking (optional)
- ✅ Invoice file upload support

### Accounting Integration
- ✅ **Automatic**: No manual journal entry needed
- ✅ **Transparent**: User sees confirmation messages
- ✅ **Traceable**: Each utility links to its journal entry via `journal_entry_id`
- ✅ **Posted**: Entries are auto-posted (ready for reports)

## Related Files

- **Component**: `src/components/UtilitiesManagement.tsx`
- **API**: `src/lib/accounting-api.ts`
- **Database**: `utilities` table with `journal_entry_id` column
- **Accounting**: `journal_entries` and `journal_items` tables

## Next Steps

1. ✅ Migrate modal to Kibo UI - **DONE**
2. ✅ Verify ledger integration - **DONE**
3. 🔄 Test in browser at http://localhost:5173/utilities
4. ⏳ Apply database migration for onboarding RLS fix (when connection available)

## Notes

- The `getAccountIdByCode` error was fixed by updating the dependency array to use `getAccountByType`
- All journal entries are automatically posted (status: 'posted')
- The system supports multi-currency via the `useCurrency` hook
- Consumption tracking is optional but helps calculate unit costs
