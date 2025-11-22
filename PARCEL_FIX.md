# Parcel Display Issue - Root Cause & Fix

## Problem
Farm cards showing "0 parcels • 0.00 ha" and /parcels page empty, even though parcels were successfully imported.

## Root Cause
The parcel import code was **NOT setting the `is_active` field** when inserting parcels ([farms.service.ts:487-505](agritech-api/src/modules/farms/farms.service.ts#L487-L505)), which meant all imported parcels had `is_active = null` or `false` by default.

However, the `listFarms` endpoint filters parcels by `is_active = true` ([farms.service.ts:85](agritech-api/src/modules/farms/farms.service.ts#L85)), so the imported parcels were **invisible** to the API.

```typescript
// ❌ BEFORE (line 487-505) - Missing is_active field
.insert({
  farm_id: newFarmId,
  name: parcel.name,
  description: parcel.description,
  area: parcel.area,
  // ... other fields ...
  // ❌ is_active was missing!
})

// ✅ AFTER (line 505) - Now includes is_active
.insert({
  farm_id: newFarmId,
  name: parcel.name,
  description: parcel.description,
  area: parcel.area,
  // ... other fields ...
  is_active: parcel.is_active !== false, // ✅ Ensure is_active is set (default true)
})
```

## Fix Applied

### 1. ✅ Fixed Parcel Import Code
**File**: [agritech-api/src/modules/farms/farms.service.ts](agritech-api/src/modules/farms/farms.service.ts#L505)

Added `is_active: parcel.is_active !== false` to the parcel insert statement. This ensures all future parcel imports will have `is_active = true` by default.

### 2. ✅ Added Comprehensive Logging
**Files**:
- [agritech-api/src/modules/farms/farms.service.ts:444-453](agritech-api/src/modules/farms/farms.service.ts#L444-L453) - Import logging
- [agritech-api/src/modules/farms/farms.service.ts:79-101](agritech-api/src/modules/farms/farms.service.ts#L79-L101) - ListFarms logging

Added detailed logging to help debug parcel import and retrieval:
- Log when importing parcels with farm ID mappings
- Log each parcel import attempt with lookup keys
- Log successful parcel imports with new IDs
- Log parcel query results in listFarms

## How to Fix Existing Data

Since the parcels were already imported with `is_active = null`, you have two options:

### Option 1: Re-import (Recommended)
1. Delete the existing farms
2. Re-import from your JSON export file
3. The new import will set `is_active = true` for all parcels

### Option 2: Manual Database Fix
Run this SQL query directly on your database to fix existing parcels:

```sql
UPDATE parcels SET is_active = true WHERE is_active IS NULL;
```

## Testing

After re-importing, you should see:
1. Farm cards showing correct parcel counts and total area
2. /parcels page populated with all parcels
3. Console logs showing successful parcel fetching

## Next Steps

1. ✅ Code fix applied (no deployment needed yet per your request)
2. ⏳ **Action Required**: Delete existing farms and re-import
3. ⏳ Verify parcels are now visible in farm cards
4. ⏳ Check /parcels page is populated
5. ⏳ Investigate /parcels page issue if it's still empty (separate issue from farm cards)

## Summary of Changes

- **agritech-api/src/modules/farms/farms.service.ts**
  - Line 505: Added `is_active` field to parcel insert
  - Lines 444-453: Added parcel import logging
  - Lines 79-101: Added parcel fetching logging in listFarms
  - Line 510: Added success log for each imported parcel

**Status**: ✅ Fix ready, awaiting user to re-import farms
