# Troubleshooting Stock Entry Errors

## Error: PGRST116 - Cannot coerce result to single JSON object

### Symptoms
```
Status Code: 406 Not Acceptable
Message: "Cannot coerce the result to a single JSON object"
Details: "The result contains 0 rows"
```

### Root Cause
This error occurs when trying to update, retrieve, or delete a stock entry that:
1. **Doesn't exist** in the database
2. **Belongs to a different organization** (access denied by RLS)
3. **Was already deleted** by another user/session

### Solution Applied

**File**: `src/hooks/useStockEntries.ts`

All query operations now use `.maybeSingle()` instead of `.single()` to handle missing records gracefully:

```typescript
// Before (throws 406 error)
const { data } = await supabase
  .from('stock_entries')
  .select('*')
  .eq('id', entryId)
  .single(); // ❌ Throws error if 0 rows

// After (handles gracefully)
const { data, error } = await supabase
  .from('stock_entries')
  .select('*')
  .eq('id', entryId)
  .maybeSingle(); // ✅ Returns null if 0 rows

if (error) throw error;
if (!data) throw new Error('Stock entry not found');
```

### How to Fix the Immediate Issue

1. **Hard Refresh Browser**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
   - Or: Clear cache and reload

2. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for console warnings:
     ```
     Stock entry {id} not found for organization {org_id}
     ```

3. **Verify the Stock Entry Exists**
   - Check if the entry is in the database
   - Verify it belongs to the current organization
   - Check if it was deleted by another user

### Debugging Steps

#### Step 1: Check Browser Console
Open DevTools (F12) and look for errors/warnings. You should see:
```
Stock entry 621b9ec9-... not found for organization 9a735597-...
```

#### Step 2: Verify Database State
Check if the stock entry exists:
```sql
SELECT id, entry_number, status, organization_id, created_at
FROM stock_entries
WHERE id = '621b9ec9-9754-4bf4-be6b-90e4a924852b';
```

#### Step 3: Check Organization Access
Verify the entry belongs to your organization:
```sql
SELECT id, entry_number, organization_id
FROM stock_entries
WHERE id = '621b9ec9-9754-4bf4-be6b-90e4a924852b'
  AND organization_id = '9a735597-c0a7-495c-b9f7-70842e34e3df';
```

### Common Scenarios

#### Scenario 1: Entry Was Deleted
- **Cause**: Another user deleted the entry while you had it open
- **Solution**: Refresh the stock entries list and select a different entry
- **Prevention**: Implement optimistic locking or real-time subscriptions

#### Scenario 2: Wrong Organization
- **Cause**: Switched organizations while viewing an entry
- **Solution**: Go back to stock entries list and select a new entry
- **Fix**: The app should clear selected entries when organization changes

#### Scenario 3: Stale Data
- **Cause**: Browser cached old data
- **Solution**: Hard refresh (Ctrl+Shift+R)
- **Prevention**: Configure proper cache headers

### Error Handling Improvements

The following improvements have been made:

1. **Better Error Messages**
   ```typescript
   // Old: Generic 406 error
   // New: Clear error messages
   - "Stock entry not found or access denied"
   - "Stock entry not found or already posted"
   - "Stock entry not found or cannot be cancelled"
   ```

2. **Console Logging**
   ```typescript
   console.warn(`Stock entry ${entryId} not found for organization ${orgId}`);
   ```

3. **Null Checks Before Operations**
   ```typescript
   if (!entry) {
     throw new Error('Stock entry not found or access denied');
   }
   ```

4. **Updated Timestamps**
   ```typescript
   updated_at: new Date().toISOString()
   ```

### Prevention

To prevent this error in the future:

1. **Implement Optimistic Locking**
   ```typescript
   // Add version field to stock_entries table
   // Check version before update
   ```

2. **Add Real-time Subscriptions**
   ```typescript
   // Subscribe to stock_entries changes
   // Notify user if entry is deleted
   ```

3. **Improve UI State Management**
   ```typescript
   // Clear selected entry when org changes
   // Refresh list after mutations
   ```

4. **Add Loading States**
   ```typescript
   // Show loading spinner while checking
   // Disable buttons during operations
   ```

### Testing

To test the fix:

1. Try to update a non-existent entry
2. Expected: Clear error message instead of 406
3. Check console for warning log
4. Verify error toast appears with helpful message

### Related Files

- `src/hooks/useStockEntries.ts` - All stock entry operations
- `src/components/Stock/StockEntryDetail.tsx` - Detail view component
- `src/components/Stock/StockEntryList.tsx` - List view component
- `src/components/Stock/StockEntryForm.tsx` - Create/edit form

### API Reference

**useStockEntry(entryId)**
- Returns: `{ data: StockEntry | null, error, isLoading }`
- Now handles missing entries gracefully

**useUpdateStockEntry()**
- Throws: "Stock entry not found or access denied"
- Validates: Entry exists and is in Draft status
- Logs: Warning to console if not found

**usePostStockEntry()**
- Throws: "Stock entry not found or already posted"
- Updates: Sets posted_at timestamp
- Validates: Entry exists and can be posted

**useCancelStockEntry()**
- Throws: "Stock entry not found or cannot be cancelled"
- Updates: Sets updated_at timestamp
- Validates: Entry exists and can be cancelled

### Support

If you continue to see this error after:
1. Hard refreshing the browser
2. Verifying the entry exists
3. Checking the browser console

Then there may be a deeper issue. Check:
- RLS policies on stock_entries table
- Organization membership
- Database permissions
