# Unit Management & Piece-Work Payment System

## Overview

The AgriTech platform now includes a comprehensive **unit management system** that enables piece-work payment tracking for day laborers. Workers can be paid based on **units completed** (trees planted, boxes harvested, kilograms picked, etc.) rather than just days or hours worked.

### Key Features

- **Flexible Work Units**: Define custom units (Arbre, Caisse, Kg, Litre, etc.)
- **Per-Unit Payment**: Track work by units completed instead of just time
- **Automatic Accounting**: Auto-create journal entries when payments are made
- **Quality Tracking**: Record quality ratings for completed work
- **Time Tracking**: Optional time tracking for productivity analysis
- **Multi-Language**: Support for English, French, and Arabic unit names

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Setup & Configuration](#setup--configuration)
3. [Managing Work Units](#managing-work-units)
4. [Configuring Workers for Piece-Work](#configuring-workers-for-piece-work)
5. [Recording Piece-Work](#recording-piece-work)
6. [Payment Processing](#payment-processing)
7. [Accounting Integration](#accounting-integration)
8. [API Reference](#api-reference)
9. [Examples](#examples)

---

## Database Schema

### New Tables

#### 1. `work_units` - Work Unit Definitions

Stores the units used for piece-work tracking (trees, boxes, kg, liters, etc.).

```sql
CREATE TABLE work_units (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  -- Unit Definition
  code VARCHAR(20) NOT NULL,              -- e.g., 'TREE', 'BOX', 'KG'
  name VARCHAR(100) NOT NULL,             -- e.g., 'Arbre', 'Caisse'
  name_ar VARCHAR(100),                   -- Arabic name
  name_fr VARCHAR(100),                   -- French name

  -- Unit Type
  unit_category VARCHAR(50),              -- 'count', 'weight', 'volume', 'area', 'length'

  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  allow_decimal BOOLEAN DEFAULT FALSE,

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,

  UNIQUE(organization_id, code)
);
```

#### 2. `piece_work_records` - Work Tracking

Records work completed by unit.

```sql
CREATE TABLE piece_work_records (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  farm_id UUID NOT NULL,

  -- Worker & Work Details
  worker_id UUID NOT NULL,
  work_date DATE NOT NULL,
  task_id UUID,                           -- Optional link to task
  parcel_id UUID,                         -- Optional link to parcel

  -- Unit-based tracking
  work_unit_id UUID NOT NULL,
  units_completed DECIMAL(10, 2) NOT NULL,
  rate_per_unit DECIMAL(10, 2) NOT NULL,

  -- Calculated
  total_amount DECIMAL(12, 2) GENERATED ALWAYS AS (units_completed * rate_per_unit) STORED,

  -- Quality & Verification
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  verified_by UUID,
  verified_at TIMESTAMPTZ,

  -- Payment linkage
  payment_record_id UUID,
  payment_status VARCHAR(20) DEFAULT 'pending',

  -- Time tracking (optional)
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  break_duration INTEGER DEFAULT 0,       -- in minutes

  notes TEXT,
  attachments JSONB
);
```

### Extended Tables

#### `workers` Table Extensions

```sql
ALTER TABLE workers ADD COLUMN default_work_unit_id UUID REFERENCES work_units(id);
ALTER TABLE workers ADD COLUMN rate_per_unit DECIMAL(10, 2);
-- payment_frequency enum now includes 'per_unit'
```

#### `payment_records` Table Extensions

```sql
ALTER TABLE payment_records ADD COLUMN units_completed DECIMAL(10, 2);
ALTER TABLE payment_records ADD COLUMN unit_rate DECIMAL(10, 2);
ALTER TABLE payment_records ADD COLUMN piece_work_ids UUID[];
```

---

## Setup & Configuration

### 1. Run Database Migration

Apply the migration file to create the new tables and functions:

```bash
cd project
npm run db:push  # Push to remote database

# Or for local development:
npm run db:reset  # Reset local database with new schema
```

### 2. Generate TypeScript Types

```bash
npm run db:generate-types-remote
```

### 3. Seed Default Work Units

For each organization, seed default work units:

```sql
SELECT seed_default_work_units('YOUR_ORGANIZATION_ID');
```

This creates common units:
- **Count**: Tree, Plant, Unit, Box, Crate, Bag
- **Weight**: Kilogram, Ton, Quintal
- **Volume**: Liter, Cubic meter
- **Area**: Hectare, Square meter
- **Length**: Meter, Kilometer

---

## Managing Work Units

### UI Component: Work Unit Management

Location: `src/components/settings/WorkUnitManagement.tsx`

**Access**: Settings → Work Units (Admin only)

### Creating a Work Unit

1. Navigate to **Settings → Work Units**
2. Click **"Add Unit"**
3. Fill in the form:
   - **Code**: Short code (e.g., "TREE", "KG")
   - **Name**: English name
   - **Name (French)**: Optional French translation
   - **Name (Arabic)**: Optional Arabic translation
   - **Category**: count, weight, volume, area, or length
   - **Allow Decimal**: Check if fractional units are allowed
   - **Active**: Check to make unit available

4. Click **"Create"**

### Loading Default Units

If starting fresh, click **"Load Default Units"** to auto-create common units.

### Example: Creating a Custom Unit

```typescript
// Via UI or API
{
  code: "BARREL",
  name: "Barrel",
  name_fr: "Baril",
  name_ar: "برميل",
  unit_category: "volume",
  allow_decimal: true,
  is_active: true
}
```

---

## Configuring Workers for Piece-Work

### UI Component: Worker Configuration

Location: `src/components/Workers/WorkerConfiguration.tsx`

### Steps to Configure

1. Navigate to **Workers**
2. Select a worker
3. Click **"Edit Payment Configuration"**
4. Choose configuration:

#### Option 1: Per-Unit Payment (Piece-Work)

- **Worker Type**: Daily Worker OR Permanent
- **Payment Frequency**: **Per Unit (Piece-work)**
- **Default Work Unit**: Select unit (e.g., "Tree")
- **Rate per Unit**: Enter rate (e.g., 5 MAD per tree)

#### Option 2: Daily Wage

- **Worker Type**: Daily Worker
- **Payment Frequency**: Daily
- **Daily Rate**: Enter daily rate (e.g., 150 MAD/day)

#### Option 3: Monthly Salary

- **Worker Type**: Permanent (Fixed Salary)
- **Payment Frequency**: Monthly
- **Monthly Salary**: Enter monthly salary (e.g., 4500 MAD/month)

#### Option 4: Metayage (Revenue Share)

- **Worker Type**: Metayage
- **Payment Frequency**: Harvest Share
- **Revenue Share Percentage**: Enter percentage (e.g., 30%)

### Example Configuration

**Scenario**: Worker paid 5 MAD per tree planted

```typescript
{
  worker_type: 'daily_worker',
  payment_frequency: 'per_unit',
  default_work_unit_id: 'uuid-of-tree-unit',
  rate_per_unit: 5.00
}
```

---

## Recording Piece-Work

### UI Component: Piece-Work Entry

Location: `src/components/Workers/PieceWorkEntry.tsx`

### Recording Work via UI

1. Navigate to **Workers** or **Tasks**
2. Click **"Record Piece Work"**
3. Fill in the form:
   - **Worker**: Select worker
   - **Date**: Select work date
   - **Task** (Optional): Link to task
   - **Parcel** (Optional): Link to parcel
   - **Unit**: Select work unit (e.g., "Tree")
   - **Units Completed**: Enter quantity (e.g., 100)
   - **Rate per Unit**: Auto-filled from worker config (editable)
   - **Quality Rating** (Optional): 1-5 stars
   - **Time Tracking** (Optional): Start time, end time, break duration
   - **Notes** (Optional): Additional notes

4. Review **Total Amount** (auto-calculated)
5. Click **"Save"**

### Recording Work via API

```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('piece_work_records')
  .insert({
    organization_id: 'org-uuid',
    farm_id: 'farm-uuid',
    worker_id: 'worker-uuid',
    work_date: '2025-10-31',
    work_unit_id: 'unit-uuid',
    units_completed: 100,
    rate_per_unit: 5.00,
    quality_rating: 5,
    notes: 'Planted 100 olive trees in parcel A3'
  });
```

### Example Scenarios

#### Scenario 1: Tree Planting
- **Worker**: Ahmed
- **Unit**: Tree (Arbre)
- **Units Completed**: 85 trees
- **Rate**: 5 MAD per tree
- **Total**: 425 MAD

#### Scenario 2: Harvest Picking
- **Worker**: Fatima
- **Unit**: Kilogram (Kg)
- **Units Completed**: 250 kg
- **Rate**: 2.50 MAD per kg
- **Total**: 625 MAD

#### Scenario 3: Box Packing
- **Worker**: Hassan
- **Unit**: Box (Caisse)
- **Units Completed**: 120 boxes
- **Rate**: 3 MAD per box
- **Total**: 360 MAD

---

## Payment Processing

### Payment Calculation

The system automatically calculates payments based on piece-work records.

#### Function: `calculate_piece_work_payment`

```sql
SELECT * FROM calculate_piece_work_payment(
  'worker-uuid',
  '2025-10-01'::DATE,  -- period start
  '2025-10-31'::DATE   -- period end
);
```

Returns:
- `base_amount`: Total earnings
- `units_completed`: Total units completed
- `piece_work_count`: Number of piece-work entries
- `piece_work_ids`: Array of piece-work record IDs

#### Unified Payment Calculation

For all payment types (daily, monthly, piece-work, metayage):

```sql
SELECT * FROM calculate_worker_payment(
  'worker-uuid',
  '2025-10-01'::DATE,
  '2025-10-31'::DATE
);
```

Returns comprehensive payment details including:
- Payment type
- Base amount
- Days/hours/units worked
- Tasks completed
- Overtime amount
- References to piece-work and task records

### Creating Payment Records

#### Via UI

1. Navigate to **Payments → Create Payment**
2. Select worker
3. Select period (start date, end date)
4. Click **"Calculate Payment"**
   - System automatically fetches piece-work records
   - Calculates total amount
5. Review breakdown
6. Add bonuses/deductions if needed
7. Click **"Create Payment"**

#### Via API

```typescript
// Step 1: Calculate payment
const { data: calculation } = await supabase
  .rpc('calculate_worker_payment', {
    p_worker_id: 'worker-uuid',
    p_period_start: '2025-10-01',
    p_period_end: '2025-10-31'
  });

// Step 2: Create payment record
const { data: payment } = await supabase
  .from('payment_records')
  .insert({
    organization_id: 'org-uuid',
    farm_id: 'farm-uuid',
    worker_id: 'worker-uuid',
    payment_type: calculation.payment_type,
    period_start: '2025-10-01',
    period_end: '2025-10-31',
    base_amount: calculation.base_amount,
    units_completed: calculation.units_completed,
    piece_work_ids: calculation.piece_work_ids,
    status: 'pending',
    payment_method: 'bank_transfer'
  });

// Step 3: Link piece-work records to payment
await supabase
  .from('piece_work_records')
  .update({ payment_record_id: payment.id })
  .in('id', calculation.piece_work_ids);
```

---

## Accounting Integration

### Automatic Journal Entry Creation

When a payment record is marked as **"paid"**, the system automatically creates a journal entry in the accounting module.

#### Trigger: `payment_record_journal_trigger`

Executes `create_payment_journal_entry()` function which:

1. **Identifies Accounts**:
   - Labor Expense Account (Debit)
   - Cash/Bank/Payable Account (Credit)

2. **Creates Journal Entry**:
   - Entry date: Payment date
   - Entry type: "payment"
   - Reference: Payment record ID
   - Source document: payment_record

3. **Creates Journal Items**:
   - **Debit**: Labor Expense Account
     - Amount: Net payment amount
     - Cost center: Farm
   - **Credit**: Cash/Bank Account
     - Amount: Net payment amount
     - Description: Payment method

### Example Journal Entry

**Payment Details**:
- Worker: Ahmed
- Net Amount: 425 MAD
- Payment Method: Bank Transfer
- Farm: Olive Farm A

**Journal Entry**:
```
Date: 2025-10-31
Reference: PAY-uuid
Description: Labor payment - piece_work

Debit:  Labor Expense (6200)         425 MAD  [Cost Center: Olive Farm A]
Credit: Bank Account (1020)          425 MAD  [Payment via bank transfer]
```

### Chart of Accounts Setup

Ensure your organization has these accounts configured:

1. **Labor Expense Account**
   - Type: Expense
   - Subtype: "Labor" or similar
   - Code: e.g., 6200

2. **Cash Account**
   - Type: Asset
   - Subtype: "Cash"
   - Code: e.g., 1010

3. **Bank Account**
   - Type: Asset
   - Subtype: "Bank"
   - Code: e.g., 1020

4. **Accounts Payable**
   - Type: Liability
   - Subtype: "Payable"
   - Code: e.g., 2100

---

## API Reference

### Work Units

#### List Work Units
```typescript
GET /rest/v1/work_units
  ?organization_id=eq.{org_id}
  &is_active=eq.true
  &order=name.asc
```

#### Create Work Unit
```typescript
POST /rest/v1/work_units
Body: {
  organization_id: string,
  code: string,
  name: string,
  unit_category: 'count' | 'weight' | 'volume' | 'area' | 'length',
  allow_decimal: boolean,
  is_active: boolean
}
```

### Piece-Work Records

#### List Piece-Work Records
```typescript
GET /rest/v1/piece_work_records
  ?farm_id=eq.{farm_id}
  &worker_id=eq.{worker_id}
  &work_date=gte.{start_date}
  &work_date=lte.{end_date}
  &payment_status=eq.pending
  &order=work_date.desc
```

#### Create Piece-Work Record
```typescript
POST /rest/v1/piece_work_records
Body: {
  organization_id: string,
  farm_id: string,
  worker_id: string,
  work_date: string,
  work_unit_id: string,
  units_completed: number,
  rate_per_unit: number,
  quality_rating?: number,
  task_id?: string,
  parcel_id?: string,
  notes?: string
}
```

### Payment Calculation Functions

#### Calculate Piece-Work Payment
```sql
SELECT * FROM calculate_piece_work_payment(
  p_worker_id UUID,
  p_period_start DATE,
  p_period_end DATE
);
```

#### Calculate Worker Payment (All Types)
```sql
SELECT * FROM calculate_worker_payment(
  p_worker_id UUID,
  p_period_start DATE,
  p_period_end DATE
);
```

#### Create Journal Entry from Payment
```sql
SELECT create_payment_journal_entry(p_payment_record_id UUID);
```

---

## Examples

### Complete Workflow Example

#### Step 1: Create Work Unit

```sql
INSERT INTO work_units (organization_id, code, name, name_fr, unit_category, allow_decimal)
VALUES ('org-uuid', 'TREE', 'Tree', 'Arbre', 'count', false);
```

#### Step 2: Configure Worker

```sql
UPDATE workers
SET
  payment_frequency = 'per_unit',
  default_work_unit_id = 'tree-unit-uuid',
  rate_per_unit = 5.00
WHERE id = 'worker-uuid';
```

#### Step 3: Record Work

```sql
INSERT INTO piece_work_records (
  organization_id, farm_id, worker_id, work_date,
  work_unit_id, units_completed, rate_per_unit, quality_rating
) VALUES (
  'org-uuid', 'farm-uuid', 'worker-uuid', '2025-10-31',
  'tree-unit-uuid', 100, 5.00, 5
);
-- Total: 500 MAD
```

#### Step 4: Calculate Payment

```sql
SELECT * FROM calculate_worker_payment(
  'worker-uuid',
  '2025-10-01'::DATE,
  '2025-10-31'::DATE
);

-- Returns:
-- payment_type: 'piece_work'
-- base_amount: 500.00
-- units_completed: 100
-- piece_work_count: 1
```

#### Step 5: Create Payment Record

```sql
INSERT INTO payment_records (
  organization_id, farm_id, worker_id,
  payment_type, period_start, period_end,
  base_amount, units_completed, unit_rate,
  status, payment_method
) VALUES (
  'org-uuid', 'farm-uuid', 'worker-uuid',
  'piece_work', '2025-10-01', '2025-10-31',
  500.00, 100, 5.00,
  'pending', 'bank_transfer'
);
```

#### Step 6: Mark Payment as Paid

```sql
UPDATE payment_records
SET status = 'paid', payment_date = CURRENT_DATE
WHERE id = 'payment-uuid';

-- Trigger automatically creates journal entry:
-- Debit:  Labor Expense    500 MAD
-- Credit: Bank Account     500 MAD
```

---

## Best Practices

### 1. Unit Standardization

- Use consistent unit codes across your organization
- Define clear naming conventions (e.g., TREE not Tree or tree)
- Include translations for multi-language teams

### 2. Quality Tracking

- Encourage quality ratings for completed work
- Use ratings to identify high-performing workers
- Track trends over time

### 3. Verification

- Have supervisors verify piece-work before payment
- Use the `verified_by` and `verified_at` fields
- Consider requiring verification for large amounts

### 4. Time Tracking

- Record start/end times for productivity analysis
- Calculate units per hour metrics
- Identify optimization opportunities

### 5. Payment Frequency

- Process payments regularly (weekly or bi-weekly)
- Clear pending piece-work records promptly
- Communicate payment schedules to workers

### 6. Cost Center Allocation

- Link piece-work to parcels for accurate cost tracking
- Use cost centers in journal entries
- Enable parcel-level profitability analysis

---

## Troubleshooting

### Issue: Work units not appearing in dropdown

**Solution**:
- Check that units are marked as `is_active = true`
- Verify organization_id matches current organization
- Run seed function if no units exist

### Issue: Payment calculation returns 0

**Solution**:
- Verify piece-work records have `payment_status = 'pending'`
- Check date range includes the work dates
- Ensure worker_id matches piece-work records

### Issue: Journal entry not created

**Solution**:
- Verify accounting accounts exist (Labor Expense, Cash/Bank)
- Check account types match expected (Expense, Asset/Liability)
- Review trigger execution logs for errors

### Issue: Total amount seems incorrect

**Solution**:
- Check `units_completed` and `rate_per_unit` values
- Verify calculation: total = units × rate
- Look for rounding issues with decimal units

---

## Support & Resources

### Related Documentation

- [CLAUDE.md](./CLAUDE.md) - Full project documentation
- [Database Migrations](./supabase/migrations/)
- [TypeScript Types](./project/src/types/work-units.ts)

### Database Migration File

- [20251031000001_unit_management_and_piecework.sql](./supabase/migrations/20251031000001_unit_management_and_piecework.sql)

### UI Components

- Work Unit Management: [src/components/settings/WorkUnitManagement.tsx](./project/src/components/settings/WorkUnitManagement.tsx)
- Piece-Work Entry: [src/components/Workers/PieceWorkEntry.tsx](./project/src/components/Workers/PieceWorkEntry.tsx)
- Worker Configuration: [src/components/Workers/WorkerConfiguration.tsx](./project/src/components/Workers/WorkerConfiguration.tsx)

---

## Future Enhancements

### Planned Features

1. **Mobile App**: Record piece-work from field via mobile app
2. **Barcode Scanning**: Scan worker badges to auto-fill worker_id
3. **Photo Attachments**: Upload photos of completed work
4. **GPS Tracking**: Auto-record location for piece-work entries
5. **Productivity Reports**: Analytics dashboard for piece-work performance
6. **Target Setting**: Set daily/weekly targets for workers
7. **Leaderboards**: Gamification for team motivation
8. **Payment Apps**: Integration with mobile money (Orange Money, etc.)

---

## Changelog

### Version 1.0.0 (2025-10-31)

- Initial release of unit management system
- Piece-work tracking and payment calculation
- Automatic accounting integration
- Multi-language support for work units
- Quality rating system
- Time tracking (optional)
- Payment status workflow

---

## License

Copyright 2025 AgriTech Platform. All rights reserved.
