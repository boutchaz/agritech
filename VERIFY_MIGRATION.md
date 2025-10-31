# Verify Work Units Migration - Quick Checklist

You just pushed the migration to Supabase! Here's how to verify it worked:

## Step 1: Refresh Your App

1. Go to: http://localhost:5173/settings/work-units
2. **Hard refresh**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
3. The page should load without any 404 errors in the console

## Step 2: Load Default Units

1. Click the **"Load Default Units"** button
2. You should see a success notification
3. **9 work units** should appear organized in 4 categories:

### Expected Result:

```
┌─────────────────────────────────────────────────────┐
│ Work Units                                          │
│                                                     │
│ Total Units: 9    Active: 9    Categories: 4       │
│                                                     │
│ Count                                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │  TREE    │ │   BOX    │ │  UNIT    │            │
│ │  Arbre   │ │  Caisse  │ │  Unité   │            │
│ └──────────┘ └──────────┘ └──────────┘            │
│                                                     │
│ Weight                                              │
│ ┌──────────┐ ┌──────────┐                         │
│ │    KG    │ │   TON    │                         │
│ │   Kg     │ │  Tonne   │                         │
│ └──────────┘ └──────────┘                         │
│                                                     │
│ Volume                                              │
│ ┌──────────┐ ┌──────────┐                         │
│ │  LITER   │ │    M3    │                         │
│ │  Litre   │ │Mètre cube│                         │
│ └──────────┘ └──────────┘                         │
│                                                     │
│ Area                                                │
│ ┌──────────┐ ┌──────────┐                         │
│ │    M2    │ │ HECTARE  │                         │
│ │Mètre carré│ │ Hectare │                         │
│ └──────────┘ └──────────┘                         │
└─────────────────────────────────────────────────────┘
```

## Step 3: Test Creating a Custom Unit

1. Click **"Add Unit"** button
2. Fill in the form:
   ```
   Code: SACK
   Name: Sack
   Name (FR): Sac
   Name (AR): كيس
   Category: Weight
   Allow Decimal: No
   ```
3. Click **Save**
4. The new unit should appear in the "Weight" category
5. Total Units should now show **10**

## Step 4: Verify Database (Optional)

If you want to double-check in Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou
2. Click **Database** → **Tables**
3. You should see these new tables:
   - ✅ `work_units`
   - ✅ `piece_work_records`

4. Click **SQL Editor** → **New Query**
5. Run this query:
   ```sql
   SELECT code, name, unit_category
   FROM work_units
   WHERE organization_id = (
     SELECT id FROM organizations LIMIT 1
   )
   ORDER BY unit_category, name;
   ```
6. You should see 9 rows (or 10 if you added SACK)

## Step 5: Check Console (No More Errors)

1. Open browser console: `F12` → **Console** tab
2. Reload the page
3. You should **NOT** see:
   - ❌ `POST .../rpc/seed_default_work_units 404 (Not Found)`
4. Instead, everything should load cleanly with no errors

## Success Indicators

✅ Page loads without redirect
✅ No 404 errors in console
✅ "Load Default Units" button works
✅ 9 units appear in 4 categories
✅ Stats show: Total=9, Active=9, Categories=4
✅ Can create custom units
✅ Can edit existing units
✅ Can search and filter units

## If Something's Wrong

### Still getting 404 error?

**Check if migration was actually applied:**

1. Open Supabase Dashboard → SQL Editor
2. Run this query:
   ```sql
   SELECT EXISTS (
     SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public'
     AND table_name = 'work_units'
   ) as table_exists;
   ```
3. Should return `true`
4. If it returns `false`, the migration wasn't applied

**Fix:** Apply the migration manually:
1. Copy contents of `supabase/migrations/20251031000001_unit_management_and_piecework.sql`
2. Paste in SQL Editor
3. Run it
4. Refresh your app

### "Load Default Units" does nothing?

**Check if function exists:**

```sql
SELECT EXISTS (
  SELECT 1
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'seed_default_work_units'
) as function_exists;
```

Should return `true`. If `false`, the migration wasn't fully applied.

### Can't see units after loading?

**Check if units were created:**

```sql
SELECT COUNT(*) FROM work_units;
```

Should return `9` (or more if you added custom ones).

If `0`, there might be an error in the `seed_default_work_units` function. Check browser console for the actual error message.

## Next Steps After Verification

Once everything is working:

1. **Configure Workers for Piece-Work**
   - Go to: Workers page
   - Edit a worker
   - Set payment type to "Per unit"
   - Select work unit (e.g., TREE)
   - Set rate per unit (e.g., 5 MAD)

2. **Record Piece-Work**
   - Go to: Workers → Record Piece-Work
   - Select worker
   - Enter work date and units completed
   - Total payment calculated automatically

3. **View Reports**
   - Check payment records
   - Verify accounting journal entries
   - Track costs per parcel

## Documentation

Full documentation available in:
- **[WORK_UNITS_SETUP_COMPLETE.md](WORK_UNITS_SETUP_COMPLETE.md)** - Complete feature guide
- **[APPLY_MIGRATION_NOW.md](APPLY_MIGRATION_NOW.md)** - Migration instructions

---

**Quick Test Command (Copy & Paste):**

Open browser console and run:
```javascript
console.log('Testing Work Units...');
fetch('https://mvegjdkkbhlhbjpbhpou.supabase.co/rest/v1/work_units', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWdqZGtrYmhsaGJqcGJocG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2Njc4NzEsImV4cCI6MjA3NDI0Mzg3MX0.t5RMzdumbehxq5DRtHEbiNOAW4KstcysOFx2xg4Z67E'
  }
})
.then(r => r.json())
.then(data => console.log('✅ Work units table exists!', data.length, 'units found'))
.catch(e => console.error('❌ Error:', e.message));
```

If successful, you'll see: `✅ Work units table exists! X units found`

---

**Status: Ready to test!** 🎉
