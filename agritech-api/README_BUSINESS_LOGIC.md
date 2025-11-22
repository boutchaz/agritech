# Business Logic Services - Developer Guide

## Overview

Business logic has been moved from database triggers to NestJS services for better maintainability, testability, and observability.

## Architecture Pattern

### Before (Database Triggers)
```
Frontend → Supabase → INSERT → Trigger → Business Logic (PL/pgSQL)
                              ↓
                      Auto-create related records
```

**Problems:**
- ❌ Hard to debug (database logs only)
- ❌ No unit tests
- ❌ Silent failures (RAISE NOTICE)
- ❌ High database CPU usage

### After (NestJS Services)
```
Frontend → NestJS API → Service Layer → Supabase
                          ↓
                   Validation, logging, error handling
                          ↓
                   Business logic in TypeScript
                          ↓
                   Create related records in transaction
```

**Benefits:**
- ✅ Easy debugging (breakpoints, logs)
- ✅ Unit testable
- ✅ Explicit error handling
- ✅ Reduced database load

## Services

### 1. StockEntriesService

**Purpose:** Handle all stock entry operations (receipt, issue, transfer, reconciliation)

**Location:** `src/modules/stock-entries/stock-entries.service.ts`

**Key Methods:**

#### `createStockEntry(dto: CreateStockEntryDto)`
Creates a stock entry with items. If status is "Posted", also creates stock movements and valuations.

```typescript
// Example usage
const stockEntry = await stockEntriesService.createStockEntry({
  organization_id: '...',
  entry_type: StockEntryType.MATERIAL_RECEIPT,
  entry_number: 'SE-001',
  entry_date: new Date(),
  to_warehouse_id: '...',
  status: StockEntryStatus.POSTED,
  items: [
    {
      item_id: '...',
      quantity: 10,
      unit: 'kg',
      cost_per_unit: 5.5,
    }
  ],
  created_by: userId,
});
```

#### `postStockEntry(stockEntryId: string, userId: string)`
Posts a draft stock entry, creating all related movements.

```typescript
// Example usage
await stockEntriesService.postStockEntry(stockEntryId, userId);
```

**Business Rules:**

1. **Material Receipt**
   - Requires `to_warehouse_id`
   - Creates IN movement
   - Adds to stock valuation

2. **Material Issue**
   - Requires `from_warehouse_id`
   - Validates stock availability
   - Creates OUT movement
   - TODO: Consumes from stock valuation (FIFO/LIFO)

3. **Stock Transfer**
   - Requires both `from_warehouse_id` and `to_warehouse_id`
   - Must be different warehouses
   - Validates stock availability
   - Creates OUT from source and IN to target

4. **Stock Reconciliation**
   - TODO: Not yet implemented

**Validation:**
- Quantity must be > 0
- Warehouse requirements based on entry type
- Stock availability check for issues/transfers

### 2. AccountingAutomationService

**Purpose:** Automatically create journal entries from costs and revenues

**Location:** `src/modules/journal-entries/accounting-automation.service.ts`

**Key Methods:**

#### `createJournalEntryFromCost(...)`
Creates a journal entry from a cost record.

```typescript
// Example usage
const journalEntry = await accountingAutomationService.createJournalEntryFromCost(
  organizationId,
  costId,
  'labor', // cost_type
  1000,    // amount
  new Date(),
  'Labor cost for harvest',
  userId
);
```

**Journal Entry Created:**
```
Debit: Expense Account (based on cost_type mapping)
Credit: Cash/Bank Account
```

#### `createJournalEntryFromRevenue(...)`
Creates a journal entry from a revenue record.

```typescript
// Example usage
const journalEntry = await accountingAutomationService.createJournalEntryFromRevenue(
  organizationId,
  revenueId,
  'harvest_sale', // revenue_type
  5000,           // amount
  new Date(),
  'Sale of harvest',
  userId
);
```

**Journal Entry Created:**
```
Debit: Cash/Bank Account
Credit: Revenue Account (based on revenue_type mapping)
```

**CRITICAL: Fail-Fast Behavior**

Unlike the old database triggers, these services **throw exceptions** if account mappings are missing:

```typescript
// Old behavior (database trigger)
RAISE NOTICE 'Skipping journal entry...'; // Silent failure!

// New behavior (NestJS service)
throw new BadRequestException(
  'Account mapping missing for cost_type: labor'
); // Transaction fails!
```

This ensures **ACID compliance** and prevents operational data from drifting away from accounting data.

**Account Mapping Setup:**

Before creating costs/revenues, ensure account mappings exist:

```sql
INSERT INTO account_mappings (
  organization_id,
  mapping_type,
  mapping_key,
  account_id,
  is_active
) VALUES (
  '...',
  'cost_type',
  'labor',
  '...', -- expense account ID
  true
);
```

## API Endpoints

### Stock Entries

```
POST   /api/v1/stock-entries           Create stock entry
PATCH  /api/v1/stock-entries/:id/post  Post a draft entry
```

### Accounting

```
POST   /api/v1/accounting/costs/:id/journal-entry     Create journal entry from cost
POST   /api/v1/accounting/revenues/:id/journal-entry  Create journal entry from revenue
```

## Testing

### Unit Tests (TODO)

```typescript
describe('StockEntriesService', () => {
  it('should create material receipt with stock movements', async () => {
    const dto: CreateStockEntryDto = {
      // ...test data
    };

    const result = await service.createStockEntry(dto);

    expect(result.items).toHaveLength(1);
    // Verify stock_movements were created
    // Verify stock_valuation was updated
  });

  it('should throw error for insufficient stock', async () => {
    const dto: CreateStockEntryDto = {
      // ...material issue with quantity > available
    };

    await expect(service.createStockEntry(dto)).rejects.toThrow(
      'Insufficient stock'
    );
  });
});
```

### Integration Tests

```typescript
describe('Stock Entries API', () => {
  it('should create and post stock entry', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/stock-entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        // ...test data
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('Posted');
  });
});
```

## Error Handling

### Common Errors

**1. Insufficient Stock**
```json
{
  "statusCode": 400,
  "message": "Insufficient stock: available 5, required 10",
  "error": "Bad Request"
}
```

**Solution:** Check stock balance before issuing.

**2. Account Mapping Missing**
```json
{
  "statusCode": 400,
  "message": "Account mapping missing for cost_type: labor. Please configure account mappings before creating cost entries.",
  "error": "Bad Request"
}
```

**Solution:** Configure account mapping in accounting settings.

**3. Warehouse Validation**
```json
{
  "statusCode": 400,
  "message": "Material Receipt requires a target warehouse",
  "error": "Bad Request"
}
```

**Solution:** Add `to_warehouse_id` to the request.

## Logging

All services include comprehensive logging:

```typescript
// Success
this.logger.log(`Material receipt processed: 10 kg of item ${itemId}`);

// Warnings
this.logger.warn('Stock valuation consumption (FIFO/LIFO) not yet implemented');

// Errors
this.logger.error(`Failed to create stock movement: ${error.message}`, error.stack);
```

**Log Levels:**
- `LOG`: Successful operations
- `WARN`: Missing features or potential issues
- `ERROR`: Failed operations with stack traces

## Database Schema

### Key Tables

**Stock Management:**
- `stock_entries` - Header record
- `stock_entry_items` - Line items
- `stock_movements` - Individual movements (IN/OUT/TRANSFER)
- `stock_valuation` - FIFO/LIFO valuation batches

**Accounting:**
- `journal_entries` - Header record
- `journal_items` - Debit/credit lines
- `account_mappings` - Maps cost/revenue types to accounts

### Constraints

```sql
-- Warehouse validation
ALTER TABLE stock_entries ADD CONSTRAINT stock_entry_warehouse_validation
  CHECK (
    (entry_type = 'Material Receipt' AND to_warehouse_id IS NOT NULL) OR
    (entry_type = 'Material Issue' AND from_warehouse_id IS NOT NULL) OR
    (entry_type = 'Stock Transfer' AND from_warehouse_id IS NOT NULL AND to_warehouse_id IS NOT NULL)
  );

-- Journal balance validation
ALTER TABLE journal_entries ADD CONSTRAINT journal_entry_balanced
  CHECK (ABS(total_debit - total_credit) < 0.01);
```

## Future Enhancements

### 1. FIFO/LIFO Stock Consumption

Currently marked as TODO:

```typescript
// TODO: Implement FIFO/LIFO consumption from stock_valuation
this.logger.warn('Stock valuation consumption not yet implemented');
```

**Implementation:**
1. Query `stock_valuation` ordered by date
2. Deduct from oldest (FIFO) or newest (LIFO) batches
3. Update `remaining_quantity`

### 2. True Database Transactions

Current implementation uses Supabase client (limited transaction support).

**Improvement:**
```typescript
import { Pool } from 'pg';

async executeInTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await this.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 3. Batch Operations

Add endpoints for bulk processing:

```typescript
POST /api/v1/stock-entries/batch  // Create multiple entries
POST /api/v1/stock-entries/batch/post  // Post multiple entries
```

## Troubleshooting

### Service not injecting

**Error:** `Nest can't resolve dependencies of StockEntriesService (?)`

**Solution:** Ensure `DatabaseModule` is imported in the module:

```typescript
@Module({
  imports: [DatabaseModule], // Required!
  providers: [StockEntriesService],
})
```

### Transaction not rolling back

**Issue:** Supabase client doesn't support native transactions.

**Workaround:** Use `pg` library directly or implement compensation logic.

### Performance issues

**Issue:** Multiple sequential database queries.

**Solution:** Use batch inserts and consider connection pooling:

```typescript
// Instead of
for (const item of items) {
  await client.from('stock_movements').insert(item);
}

// Do
await client.from('stock_movements').insert(items);
```

## Migration Checklist

- [x] Create NestJS services
- [x] Create controllers
- [x] Update modules
- [x] Create DTOs
- [x] Add validation
- [x] Add logging
- [x] Create migration to disable triggers
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Deploy to staging
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Remove deprecated database functions

## Support

For questions or issues:
1. Check service logs: `docker logs agritech-api`
2. Review migration guide: `MIGRATION_GUIDE.md`
3. Check architecture docs: `ARCHITECTURE_IMPROVEMENTS.md`

---

**Last Updated:** November 22, 2025
