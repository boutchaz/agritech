# Apply Work Units Migration - Simple Steps

## The Error You're Seeing

```
POST https://mvegjdkkbhlhbjpbhpou.supabase.co/rest/v1/rpc/seed_default_work_units 404 (Not Found)
```

This means the database function `seed_default_work_units` doesn't exist yet because the migration hasn't been applied.

## How to Fix It (2 Simple Options)

### Option 1: Supabase SQL Editor (Easiest - 2 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou
   - Login if needed

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy the Migration**
   - Open this file: `/supabase/migrations/20251031000001_unit_management_and_piecework.sql`
   - Copy ALL the contents (Cmd+A, Cmd+C)

4. **Paste and Run**
   - Paste into the SQL Editor (Cmd+V)
   - Click **Run** button (or press Cmd+Enter)
   - Wait for "Success. No rows returned"

5. **Refresh Your App**
   - Go back to: http://localhost:5173/settings/work-units
   - Hard refresh: Cmd+Shift+R
   - Click "Load Default Units"
   - ✅ You should see 9 units appear!

### Option 2: Using Supabase CLI (If you prefer command line)

**Step 1: Link your project** (one-time setup)
```bash
npx supabase link --project-ref mvegjdkkbhlhbjpbhpou
```

It will ask for your database password: `chn6ldl4lnfgsafgmihqvxebojnyz6ut`

**Step 2: Push migrations**
```bash
npm run db:push
```

This will apply ALL pending migrations including the work units one.

**Step 3: Verify**
```bash
npx supabase db remote commit
```

## What the Migration Does

When you run it, it will create:

### 1. Tables
- ✅ `work_units` - Store unit definitions (Arbre, Caisse, Kg, Litre)
- ✅ `piece_work_records` - Track work completed by units

### 2. Functions
- ✅ `seed_default_work_units()` - Load 9 default units
- ✅ `calculate_piece_work_payment()` - Calculate worker payments
- ✅ `create_payment_journal_entry()` - Auto-create accounting entries

### 3. Triggers
- ✅ Auto-update journal entries when payments are made
- ✅ Increment usage_count when units are used
- ✅ Update timestamps on changes

### 4. Row Level Security (RLS)
- ✅ Users can only see units in their organization
- ✅ Only admins can create/edit/delete units
- ✅ Workers can read units for piece-work entry

### 5. Default Units (After clicking "Load Default Units")

**Count-based:**
- TREE (Arbre / شجرة)
- BOX (Caisse / صندوق)
- UNIT (Unité / وحدة)

**Weight-based:**
- KG (Kilogramme / كيلوغرام)
- TON (Tonne / طن)

**Volume-based:**
- LITER (Litre / لتر)
- M3 (Mètre cube / متر مكعب)

**Area-based:**
- M2 (Mètre carré / متر مربع)
- HECTARE (Hectare / هكتار)

## After Migration is Applied

The Work Units page will transform from:

**Before:**
```
┌─────────────────────────────────────┐
│ Work Units                          │
│                                     │
│ Load Default Units  [Add Unit]      │
│                                     │
│ Total Units: 0                      │
│ Active: 0                           │
│ Categories: 0                       │
│                                     │
│ No work units found. Click "Load   │
│ Default Units" to get started.      │
└─────────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────┐
│ Work Units                          │
│                                     │
│ Load Default Units  [Add Unit]      │
│                                     │
│ Total Units: 9                      │
│ Active: 9                           │
│ Categories: 4                       │
│                                     │
│ Count                               │
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │TREE │ │ BOX │ │UNIT │            │
│ └─────┘ └─────┘ └─────┘            │
│                                     │
│ Weight                              │
│ ┌─────┐ ┌─────┐                    │
│ │ KG  │ │ TON │                    │
│ └─────┘ └─────┘                    │
│                                     │
│ Volume                              │
│ ┌─────┐ ┌─────┐                    │
│ │LITER│ │ M3  │                    │
│ └─────┘ └─────┘                    │
│                                     │
│ Area                                │
│ ┌─────┐ ┌─────┐                    │
│ │ M2  │ │ HA  │                    │
│ └─────┘ └─────┘                    │
└─────────────────────────────────────┘
```

## Troubleshooting

### Error: "relation 'work_units' does not exist"
**Solution:** The migration hasn't been applied yet. Follow Option 1 or 2 above.

### Error: "function seed_default_work_units does not exist"
**Solution:** Same as above - migration not applied.

### Error: "permission denied for table work_units"
**Solution:** The RLS policies might not be set up. Re-run the migration OR check that your user has the `organization_admin` role.

### Units appear but can't click "Add Unit"
**Solution:** Check that you have `organization_admin` or `system_admin` role:
```sql
SELECT role
FROM organization_users
WHERE user_id = auth.uid()
AND organization_id = 'YOUR_ORG_ID';
```

### Can't load default units - button does nothing
**Solution:**
1. Open browser console (F12)
2. Look for the actual error message
3. Likely the `seed_default_work_units` function is missing - apply migration

## Verification Checklist

After applying the migration, verify:

- [ ] Go to http://localhost:5173/settings/work-units
- [ ] Page loads without redirect
- [ ] Shows "No work units found" message
- [ ] Click "Load Default Units" button
- [ ] Success notification appears
- [ ] 9 units appear in 4 categories
- [ ] Stats show: Total=9, Active=9, Categories=4
- [ ] Can click "Add Unit" to create custom unit
- [ ] Can edit existing units
- [ ] Can search and filter units

## Quick Test

After migration, test the full flow:

### 1. Load Default Units
```
Settings → Work Units → Load Default Units
✅ See 9 units appear
```

### 2. Create Custom Unit
```
Click "Add Unit"
- Code: SACK
- Name: Sack
- Category: Weight
- Save
✅ See new unit in list
```

### 3. Configure Worker
```
Workers → Edit a worker
- Payment Type: Per unit
- Work Unit: TREE
- Rate: 5 MAD
- Save
✅ Worker configured
```

### 4. Record Piece-Work
```
Workers → Record Piece-Work
- Worker: [Select worker]
- Date: Today
- Unit: TREE
- Completed: 100
- Rate: 5 MAD (auto-filled)
✅ Total: 500 MAD calculated
```

### 5. Verify Payment
```
Check payment_records table:
✅ Record created with correct amount
✅ Journal entry auto-created (if accounting enabled)
```

## Need Help?

If you encounter issues:

1. **Check the browser console** (F12 → Console)
2. **Check Supabase logs** (Dashboard → Logs → API)
3. **Verify migration file**: Make sure the SQL file is complete (should be ~22KB)
4. **Check database**: Verify tables exist in Database → Tables

## Success Indicators

You'll know it worked when:
- ✅ No more 404 errors in console
- ✅ "Load Default Units" button creates 9 units
- ✅ You can create, edit, and delete custom units
- ✅ Stats display correctly
- ✅ Workers can be configured with piece-work payment
- ✅ Piece-work records can be created

---

**Recommended: Use Option 1 (SQL Editor) - It's the fastest!**
