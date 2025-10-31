# Quick Start: Unit Management & Piece-Work Payment

## 5-Minute Setup Guide

Get started with piece-work payment tracking in 5 minutes!

---

## Step 1: Deploy Database Changes (2 minutes)

### Option A: Remote Database

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Push migration to remote database
npm run db:push

# Generate TypeScript types
npm run db:generate-types-remote
```

### Option B: Local Development

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Reset local database with new schema
npm run db:reset

# Generate types
npm run db:generate-types
```

---

## Step 2: Seed Default Units (1 minute)

### Via Supabase SQL Editor

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run this query (replace with your org ID):

```sql
-- Get your organization ID first
SELECT id, name FROM organizations;

-- Seed units for your organization
SELECT seed_default_work_units('YOUR_ORG_ID_HERE');

-- Verify units were created
SELECT * FROM work_units WHERE organization_id = 'YOUR_ORG_ID_HERE';
```

This creates 15 default units:
- Trees, Plants, Boxes, Bags (count)
- Kg, Tons, Quintals (weight)
- Liters, m³ (volume)
- Hectares, m² (area)
- Meters, Km (length)

---

## Step 3: Configure a Worker (1 minute)

### Via UI (Recommended)

1. Navigate to **Workers**
2. Select or create a worker
3. Click **"Edit Payment Configuration"**
4. Select:
   - **Payment Frequency**: "Per Unit (Piece-work)"
   - **Default Work Unit**: Choose unit (e.g., "Tree")
   - **Rate per Unit**: Enter rate (e.g., 5 MAD)
5. Click **"Save"**

### Via SQL (Alternative)

```sql
UPDATE workers
SET
  payment_frequency = 'per_unit',
  default_work_unit_id = (
    SELECT id FROM work_units
    WHERE code = 'TREE' AND organization_id = 'YOUR_ORG_ID'
    LIMIT 1
  ),
  rate_per_unit = 5.00
WHERE id = 'WORKER_ID';
```

---

## Step 4: Record Piece-Work (1 minute)

### Via UI (Recommended)

1. Navigate to **Workers** or **Tasks**
2. Click **"Record Piece Work"**
3. Fill in:
   - **Worker**: Select worker
   - **Date**: Today (pre-filled)
   - **Unit**: Auto-filled from worker config
   - **Units Completed**: e.g., 100
   - **Rate**: Auto-filled (e.g., 5 MAD)
4. Review **Total**: 500 MAD (auto-calculated)
5. Optional: Add quality rating, notes
6. Click **"Save"**

### Via SQL (Alternative)

```sql
INSERT INTO piece_work_records (
  organization_id,
  farm_id,
  worker_id,
  work_date,
  work_unit_id,
  units_completed,
  rate_per_unit
) VALUES (
  'YOUR_ORG_ID',
  'YOUR_FARM_ID',
  'WORKER_ID',
  CURRENT_DATE,
  (SELECT id FROM work_units WHERE code = 'TREE' LIMIT 1),
  100,
  5.00
);
```

---

## Step 5: Test Payment Calculation (30 seconds)

### Via SQL

```sql
-- Calculate worker payment for this month
SELECT * FROM calculate_worker_payment(
  'WORKER_ID',
  date_trunc('month', CURRENT_DATE)::DATE,
  CURRENT_DATE
);
```

**Expected Result**:
```
payment_type: 'piece_work'
base_amount: 500.00
units_completed: 100.00
piece_work_count: 1
```

---

## Done! 🎉

You now have:
- ✅ Unit management system deployed
- ✅ Default work units created
- ✅ Worker configured for piece-work
- ✅ Sample work recorded
- ✅ Payment calculation working

---

## What's Next?

### Create More Units

Navigate to **Settings → Work Units** to:
- Create custom units
- Edit existing units
- View usage statistics

### Record More Work

Use the **"Record Piece Work"** button to:
- Track daily worker productivity
- Link work to tasks/parcels
- Add quality ratings
- Include time tracking

### Process Payments

1. Navigate to **Payments → Create Payment**
2. Select worker and period
3. System auto-calculates from piece-work
4. Add bonuses/deductions if needed
5. Mark as paid
6. **Journal entry auto-created!**

### View Reports

Check these views:
- **Worker Payment Summary**: `SELECT * FROM worker_payment_summary`
- **Piece-Work Records**: Navigate to Workers → View piece-work history
- **Accounting**: Journal entries auto-created when paid

---

## Quick Reference

### Important Files

- **Migration**: `supabase/migrations/20251031000001_unit_management_and_piecework.sql`
- **Types**: `project/src/types/work-units.ts`
- **UI Components**:
  - Work Units: `project/src/components/settings/WorkUnitManagement.tsx`
  - Piece-Work: `project/src/components/Workers/PieceWorkEntry.tsx`
  - Worker Config: `project/src/components/Workers/WorkerConfiguration.tsx`

### Key Functions

```sql
-- Seed default units
SELECT seed_default_work_units('org-id');

-- Calculate piece-work payment
SELECT * FROM calculate_piece_work_payment('worker-id', 'start-date', 'end-date');

-- Calculate all payment types
SELECT * FROM calculate_worker_payment('worker-id', 'start-date', 'end-date');

-- Create journal entry from payment
SELECT create_payment_journal_entry('payment-record-id');
```

### Payment Types Supported

1. **Per-Unit (Piece-work)** ← NEW!
   - Pay by units completed
   - Trees, boxes, kg, etc.

2. **Daily Wage**
   - Fixed rate per day

3. **Monthly Salary**
   - Fixed monthly amount

4. **Metayage**
   - Revenue share percentage

---

## Troubleshooting

### "Work units not appearing"

```sql
-- Check if units exist
SELECT * FROM work_units WHERE organization_id = 'YOUR_ORG_ID';

-- If empty, seed them
SELECT seed_default_work_units('YOUR_ORG_ID');
```

### "Payment calculation returns 0"

```sql
-- Check piece-work records exist and are pending
SELECT * FROM piece_work_records
WHERE worker_id = 'WORKER_ID'
  AND payment_status = 'pending';
```

### "Journal entry not created"

```sql
-- Check if accounting accounts exist
SELECT * FROM accounts
WHERE organization_id = 'YOUR_ORG_ID'
  AND account_type IN ('Expense', 'Asset');

-- If missing, create them via Settings → Accounting
```

---

## Example Scenarios

### Scenario 1: Tree Planting

```sql
-- Worker: Ahmed
-- Unit: Tree (Arbre)
-- Rate: 5 MAD per tree
-- Completed: 85 trees
-- Total: 425 MAD

INSERT INTO piece_work_records (
  organization_id, farm_id, worker_id, work_date,
  work_unit_id, units_completed, rate_per_unit
) VALUES (
  'org-id', 'farm-id', 'ahmed-id', CURRENT_DATE,
  (SELECT id FROM work_units WHERE code = 'TREE' LIMIT 1),
  85, 5.00
);
```

### Scenario 2: Harvest Picking

```sql
-- Worker: Fatima
-- Unit: Kilogram
-- Rate: 2.50 MAD per kg
-- Completed: 250 kg
-- Total: 625 MAD

INSERT INTO piece_work_records (
  organization_id, farm_id, worker_id, work_date,
  work_unit_id, units_completed, rate_per_unit, quality_rating
) VALUES (
  'org-id', 'farm-id', 'fatima-id', CURRENT_DATE,
  (SELECT id FROM work_units WHERE code = 'KG' LIMIT 1),
  250, 2.50, 5
);
```

### Scenario 3: Box Packing

```sql
-- Worker: Hassan
-- Unit: Box (Caisse)
-- Rate: 3 MAD per box
-- Completed: 120 boxes
-- Total: 360 MAD

INSERT INTO piece_work_records (
  organization_id, farm_id, worker_id, work_date,
  work_unit_id, units_completed, rate_per_unit
) VALUES (
  'org-id', 'farm-id', 'hassan-id', CURRENT_DATE,
  (SELECT id FROM work_units WHERE code = 'BOX' LIMIT 1),
  120, 3.00
);
```

---

## Full Documentation

For complete details, see:
- **[UNIT_MANAGEMENT_GUIDE.md](./UNIT_MANAGEMENT_GUIDE.md)** - Comprehensive guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[CLAUDE.md](./CLAUDE.md)** - Full project documentation

---

## Need Help?

1. Check troubleshooting section above
2. Review full documentation
3. Inspect database schema in migration file
4. Test with sample data first

---

**Quick Start Version**: 1.0.0
**Last Updated**: October 31, 2025
**Estimated Setup Time**: 5 minutes
