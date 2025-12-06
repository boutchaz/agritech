# Phase 3: Harvests Integration - COMPLETE ✅

**Date**: December 1, 2025
**Status**: ✅ Implementation Complete
**Module**: Harvests → Journal Entries (Revenue Recognition)

---

## Overview

Phase 3 integrates harvest sales with the double-entry accounting system. When a harvest is sold, the system automatically creates a balanced journal entry recognizing revenue.

### Business Logic

When a harvest is marked as **sold**:
1. Harvest status updates to `'sold'`
2. System determines revenue account based on `intended_for` (market, export, direct_client, processing, storage)
3. System determines debit account based on payment terms:
   - **Cash sale** → Dr. Cash (1110)
   - **Credit sale** → Dr. Accounts Receivable (1200)
4. Journal entry created: Dr. Cash/AR, Cr. Revenue (4111)

---

## Implementation Details

### 1. Database Migration

**File**: [20251201000002_harvest_sales_account_mappings.sql](project/supabase/migrations/20251201000002_harvest_sales_account_mappings.sql)

Creates account mappings for harvest sales:

```sql
-- Function to create harvest sales mappings
CREATE OR REPLACE FUNCTION create_harvest_sales_mappings(
  p_organization_id UUID,
  p_country_code VARCHAR(2) DEFAULT 'MA'
)
RETURNS void AS $$
-- Maps: market, export, direct_client, processing, storage → Revenue Account (4111)
$$;

-- View for easy access
CREATE OR REPLACE VIEW v_harvest_sales_mappings AS
SELECT
  organization_id,
  source_key as sale_type,
  account_id as revenue_account_id,
  metadata->>'ar_account_id' as ar_account_id,
  metadata->>'cash_account_id' as cash_account_id
FROM account_mappings
WHERE mapping_type = 'harvest_sale';
```

**Supported Sale Types**:
- `market` - Local market sales
- `export` - Export sales
- `direct_client` - Direct client sales
- `processing` - Sales to processing facilities
- `storage` - Sales from storage

---

### 2. Backend Implementation

#### DTO: SellHarvestDto

**File**: [sell-harvest.dto.ts](agritech-api/src/modules/harvests/dto/sell-harvest.dto.ts)

```typescript
export class SellHarvestDto {
  sale_date: string;              // Date of sale
  quantity_sold: number;           // Quantity (must be <= harvest.quantity)
  price_per_unit: number;          // Actual price per unit
  customer_id?: string;            // Optional customer reference
  customer_name?: string;          // Customer name (if no ID)
  payment_terms: 'cash' | 'credit'; // Determines Dr. account
  invoice_number?: string;         // Auto-generated if not provided
  notes?: string;                  // Sale notes
}
```

#### Service Method: sellHarvest()

**File**: [harvests.service.ts](agritech-api/src/modules/harvests/harvests.service.ts#L149-L367)

```typescript
async sellHarvest(
  userId: string,
  organizationId: string,
  harvestId: string,
  sellDto: SellHarvestDto
)
```

**Process**:
1. ✅ Validate harvest exists and is not already sold/spoiled
2. ✅ Validate quantity_sold <= available quantity
3. ✅ Calculate total revenue = quantity_sold × price_per_unit
4. ✅ Update harvest status to 'sold'
5. ✅ Retrieve account mappings for harvest sale type
6. ✅ Generate journal entry number (JE-YYYY-#####)
7. ✅ Create journal entry header
8. ✅ Create journal items (Dr. Cash/AR, Cr. Revenue)
9. ✅ Validate double-entry balance (trigger auto-calculates totals)
10. ✅ Return success with journal_entry_id

**Error Handling**:
- Harvest not found → 404 Not Found
- Already sold → 400 Bad Request
- Quantity exceeds available → 400 Bad Request
- Account mappings not set up → Warning logged, sale succeeds without journal entry
- Journal entry creation fails → Error logged, sale succeeds with error flag

---

#### Controller Endpoint

**File**: [harvests.controller.ts](agritech-api/src/modules/harvests/harvests.controller.ts#L75-L89)

```typescript
@Post(':harvestId/sell')
async sellHarvest(
  @Request() req,
  @Param('organizationId') organizationId: string,
  @Param('harvestId') harvestId: string,
  @Body() sellHarvestDto: SellHarvestDto,
)
```

**Endpoint**:
`POST /api/v1/organizations/:organizationId/harvests/:harvestId/sell`

---

### 3. Module Configuration

**File**: [harvests.module.ts](agritech-api/src/modules/harvests/harvests.module.ts)

```typescript
@Module({
  imports: [JournalEntriesModule], // ✅ Added
  controllers: [HarvestsController],
  providers: [HarvestsService],
  exports: [HarvestsService],
})
export class HarvestsModule {}
```

---

## Journal Entry Structure

### Example: Cash Sale

**Scenario**: Sell 500 kg of tomatoes at 12.50 MAD/kg to local market (cash)

**Journal Entry**:
```
Entry Number: JE-2025-00042
Date: 2025-12-01
Reference: harvest_sale (harvest_id)
Description: Harvest sale: Tomatoes - 500 kg @ 12.5/kg

Journal Items:
+----------------------------------------------------------------+
| Account Code | Account Name        | Debit   | Credit  |
|--------------|---------------------|---------|---------|
| 1110         | Cash                | 6,250.00|    0.00 |
| 4111         | Sales Revenue       |    0.00 | 6,250.00|
+----------------------------------------------------------------+
                            Totals:   6,250.00  6,250.00 ✅
```

### Example: Credit Sale

**Scenario**: Sell 1000 kg of oranges at 8.00 MAD/kg for export (credit)

**Journal Entry**:
```
Entry Number: JE-2025-00043
Date: 2025-12-01
Reference: harvest_sale (harvest_id)
Description: Harvest sale: Oranges - 1000 kg @ 8.0/kg

Journal Items:
+----------------------------------------------------------------+
| Account Code | Account Name               | Debit   | Credit  |
|--------------|----------------------------|---------|---------|
| 1200         | Accounts Receivable        | 8,000.00|    0.00 |
| 4111         | Sales Revenue              |    0.00 | 8,000.00|
+----------------------------------------------------------------+
                                   Totals:   8,000.00  8,000.00 ✅
```

---

## Setup Instructions

### 1. Run Database Migration

```bash
cd project/supabase
# Migration will be applied automatically on next deploy
```

### 2. Create Account Mappings

For each organization that uses harvest sales:

```sql
-- Example for organization
SELECT create_harvest_sales_mappings('your-org-id-here', 'MA');
```

This creates mappings for all sale types (market, export, direct_client, processing, storage).

### 3. Verify Mappings

```sql
SELECT * FROM v_harvest_sales_mappings
WHERE organization_id = 'your-org-id';
```

**Expected Output**:
```
sale_type       | revenue_account_code | revenue_account_name | ar_account_id | cash_account_id
----------------|---------------------|---------------------|---------------|----------------
market          | 4111                | Sales Revenue       | uuid...       | uuid...
export          | 4111                | Sales Revenue       | uuid...       | uuid...
direct_client   | 4111                | Sales Revenue       | uuid...       | uuid...
processing      | 4111                | Sales Revenue       | uuid...       | uuid...
storage         | 4111                | Sales Revenue       | uuid...       | uuid...
```

---

## API Usage

### Sell Harvest Endpoint

**Request**:
```http
POST /api/v1/organizations/:organizationId/harvests/:harvestId/sell
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "sale_date": "2025-12-01",
  "quantity_sold": 500,
  "price_per_unit": 12.50,
  "customer_name": "Marché Central",
  "payment_terms": "cash",
  "notes": "Sold to local market, Grade A quality"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Harvest sold successfully with journal entry",
  "data": {
    "harvest_id": "abc123...",
    "journal_entry_id": "def456...",
    "invoice_number": "HSL-2025-1733097600000",
    "total_revenue": 6250.00,
    "payment_terms": "cash"
  }
}
```

**Response (No Mappings)**:
```json
{
  "success": true,
  "message": "Harvest sold successfully (no journal entry created - mappings not set up)",
  "data": {
    "harvest_id": "abc123...",
    "invoice_number": "HSL-2025-1733097600000",
    "total_revenue": 6250.00
  }
}
```

---

## Testing Checklist

### 1. Unit Tests

- [ ] Validate harvest sale DTO
- [ ] Validate quantity constraints
- [ ] Validate harvest status constraints
- [ ] Test journal entry creation
- [ ] Test double-entry validation
- [ ] Test error handling

### 2. Integration Tests

```bash
# 1. Create a harvest
POST /api/v1/organizations/:orgId/harvests
{
  "farm_id": "...",
  "parcel_id": "...",
  "crop_id": "Tomatoes",
  "harvest_date": "2025-12-01",
  "quantity": 1000,
  "unit": "kg",
  "intended_for": "market",
  "expected_price_per_unit": 10.00
}

# 2. Sell the harvest (cash sale)
POST /api/v1/organizations/:orgId/harvests/:harvestId/sell
{
  "sale_date": "2025-12-01",
  "quantity_sold": 500,
  "price_per_unit": 12.50,
  "payment_terms": "cash",
  "customer_name": "Local Market"
}

# 3. Verify journal entry
GET /api/v1/journal-entries?reference_id=:harvestId

# Expected: Journal entry with balanced debits/credits
```

### 3. Database Validation

```sql
-- Verify harvest status updated
SELECT id, status, quantity FROM harvest_records WHERE id = 'harvest-id';
-- Expected: status = 'sold'

-- Verify journal entry created
SELECT * FROM journal_entries WHERE reference_id = 'harvest-id';
-- Expected: entry_number, total_debit = total_credit

-- Verify journal items
SELECT
  a.account_code,
  a.account_name,
  ji.debit,
  ji.credit
FROM journal_items ji
JOIN accounts a ON a.id = ji.account_id
WHERE ji.journal_entry_id = 'journal-entry-id';
-- Expected: 2 lines, Dr. Cash/AR = Cr. Revenue
```

---

## Related Files

### Backend
- [harvests.service.ts](agritech-api/src/modules/harvests/harvests.service.ts) - Service with sellHarvest method
- [harvests.controller.ts](agritech-api/src/modules/harvests/harvests.controller.ts) - Controller with /sell endpoint
- [harvests.module.ts](agritech-api/src/modules/harvests/harvests.module.ts) - Module configuration
- [sell-harvest.dto.ts](agritech-api/src/modules/harvests/dto/sell-harvest.dto.ts) - DTO for sell request

### Database
- [20251201000002_harvest_sales_account_mappings.sql](project/supabase/migrations/20251201000002_harvest_sales_account_mappings.sql) - Account mappings migration

### Documentation
- [PHASE3_HARVESTS_INTEGRATION_COMPLETE.md](PHASE3_HARVESTS_INTEGRATION_COMPLETE.md) - This file

---

## Double-Entry Validation

The system enforces three-layer validation:

1. **Application Layer** ([harvests.service.ts:298-314](agritech-api/src/modules/harvests/harvests.service.ts#L298-L314))
   ```typescript
   const totalDebit = journalLines.reduce((sum, line) => sum + line.debit, 0);
   const totalCredit = journalLines.reduce((sum, line) => sum + line.credit, 0);

   if (Math.abs(totalDebit - totalCredit) >= 0.01) {
     throw new BadRequestException('Journal entry is not balanced');
   }
   ```

2. **Database Trigger** (Auto-calculates totals from journal_items)
   - See: [20251201000000_fix_journal_entry_totals.sql](project/supabase/migrations/20251201000000_fix_journal_entry_totals.sql)

3. **Database Constraint** (CHECK constraint on journal_entries)
   ```sql
   CHECK (ABS(total_debit - total_credit) < 0.01)
   ```

---

## Common Scenarios

### Scenario 1: Sell Entire Harvest for Cash

```json
{
  "sale_date": "2025-12-01",
  "quantity_sold": 1000,
  "price_per_unit": 10.00,
  "payment_terms": "cash",
  "customer_name": "Market Vendor"
}
```

**Result**: Dr. Cash 10,000 / Cr. Revenue 10,000

### Scenario 2: Sell Partial Harvest on Credit

```json
{
  "sale_date": "2025-12-01",
  "quantity_sold": 500,
  "price_per_unit": 15.00,
  "payment_terms": "credit",
  "customer_id": "customer-uuid",
  "invoice_number": "INV-2025-001"
}
```

**Result**: Dr. AR 7,500 / Cr. Revenue 7,500

### Scenario 3: Export Sale (Different Revenue Recognition)

```json
{
  "sale_date": "2025-12-01",
  "quantity_sold": 2000,
  "price_per_unit": 20.00,
  "payment_terms": "credit",
  "customer_name": "Export Company XYZ",
  "notes": "Grade Extra, Export to EU"
}
```

**Result**: Dr. AR 40,000 / Cr. Revenue 40,000
(Uses export account mapping from `intended_for='export'`)

---

## Error Handling

| Error | HTTP Status | Message | Solution |
|-------|------------|---------|----------|
| Harvest not found | 404 | Harvest not found | Check harvest ID |
| Already sold | 400 | This harvest has already been sold | Cannot sell twice |
| Spoiled harvest | 400 | Cannot sell spoiled harvest | Update harvest status first |
| Quantity too high | 400 | Cannot sell X units, only Y available | Reduce quantity_sold |
| No mappings | 200 (Warning) | Harvest sold successfully (no journal entry created) | Run create_harvest_sales_mappings() |
| Journal creation fails | 200 (Partial success) | Harvest sold but journal entry creation failed | Check logs, create entry manually |

---

## Performance Considerations

- **Transaction Safety**: Harvest update and journal entry creation happen in separate operations (not atomic)
- **Rollback on Journal Failure**: If journal entry creation fails, error is logged but harvest status remains 'sold'
- **Account Lookup**: Uses single query to fetch account mappings (indexed by organization_id, mapping_type, source_key)

---

## Next Steps (Phase 4 - Optional)

Phase 4 would integrate **Stock Entries** (inventory management):
- Purchases → Dr. Inventory / Cr. AP
- Issues → Dr. COGS / Cr. Inventory
- FIFO/LIFO/Average costing methods

**Note**: Phase 4 is optional and not required for basic harvest sales revenue recognition.

---

## Success Criteria

- [x] Database migration created and documented
- [x] Account mappings function created (create_harvest_sales_mappings)
- [x] View created for easy mapping lookup (v_harvest_sales_mappings)
- [x] DTO created with validation
- [x] Service method implemented with double-entry logic
- [x] Controller endpoint created and documented
- [x] Module configured with JournalEntriesModule import
- [x] Error handling implemented
- [x] Three-layer validation enforced
- [x] Documentation created

**Status**: ✅ **PHASE 3 COMPLETE - READY FOR TESTING**

---

## Support

For issues or questions:
1. Check [DOUBLE_ENTRY_QUICK_REFERENCE.md](DOUBLE_ENTRY_QUICK_REFERENCE.md) for troubleshooting
2. Verify account mappings exist for your organization
3. Check application logs for detailed error messages
4. Review [DATABASE_CONNECTION_FIX.md](DATABASE_CONNECTION_FIX.md) if experiencing connection issues
