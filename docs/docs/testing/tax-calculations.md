# Tax Calculations Testing Guide

This guide provides comprehensive test scenarios for validating the tax calculation system in the AgriTech Platform accounting module.

## Overview

The tax calculation system handles:
- Per-line tax computation with proper rounding
- Multiple tax rates on different items
- Tax type validation (sales/purchase/both)
- Tax aggregation and breakdown
- Invoice totals calculation

## Tax Calculation Rules

1. **Line Amount**: `quantity × rate` (rounded to 2 decimals)
2. **Line Tax**: `line_amount × (tax_rate / 100)` (rounded to 2 decimals)
3. **Subtotal**: Sum of all line amounts (already rounded)
4. **Tax Total**: Sum of all line tax amounts (already rounded)
5. **Grand Total**: `subtotal + tax_total` (rounded to 2 decimals)

## Test Scenarios

### Scenario 1: Single Item with Single Tax

**Setup**:
- Create a sales invoice
- Add 1 item: 10 units @ 100.00 MAD/unit
- Apply 20% VAT

**Expected Results**:
```
Line Amount:    10 × 100.00 = 1,000.00 MAD
Line Tax:       1,000.00 × 0.20 = 200.00 MAD
Line Total:     1,200.00 MAD

Invoice:
Subtotal:       1,000.00 MAD
Tax (VAT 20%):  200.00 MAD
Grand Total:    1,200.00 MAD
```

**Validation**:
- ✓ Line amount equals 1,000.00
- ✓ Line tax amount equals 200.00
- ✓ Subtotal equals 1,000.00
- ✓ Tax total equals 200.00
- ✓ Grand total equals 1,200.00

### Scenario 2: Multiple Items with Same Tax

**Setup**:
- Create a sales invoice
- Add 3 items with 20% VAT:
  - Item A: 5 units @ 50.00 MAD/unit
  - Item B: 10 units @ 30.00 MAD/unit
  - Item C: 2 units @ 125.50 MAD/unit

**Expected Results**:
```
Item A: 5 × 50.00 = 250.00 MAD, Tax: 50.00 MAD
Item B: 10 × 30.00 = 300.00 MAD, Tax: 60.00 MAD
Item C: 2 × 125.50 = 251.00 MAD, Tax: 50.20 MAD

Invoice:
Subtotal:       801.00 MAD
Tax (VAT 20%):  160.20 MAD
Grand Total:    961.20 MAD
```

**Validation**:
- ✓ Each line amount is correctly calculated and rounded
- ✓ Each line tax is correctly calculated and rounded
- ✓ Subtotal equals sum of line amounts (801.00)
- ✓ Tax total equals sum of line taxes (160.20)
- ✓ Grand total equals subtotal + tax total (961.20)

### Scenario 3: Multiple Items with Different Taxes

**Setup**:
- Create a sales invoice
- Add items with different tax rates:
  - Item A: 100 units @ 10.00 MAD/unit (20% VAT)
  - Item B: 50 units @ 20.00 MAD/unit (10% Reduced VAT)
  - Item C: 25 units @ 40.00 MAD/unit (No tax)

**Expected Results**:
```
Item A: 100 × 10.00 = 1,000.00 MAD, Tax (20%): 200.00 MAD
Item B: 50 × 20.00 = 1,000.00 MAD, Tax (10%): 100.00 MAD
Item C: 25 × 40.00 = 1,000.00 MAD, Tax: 0.00 MAD

Invoice:
Subtotal:           3,000.00 MAD
Tax Breakdown:
  - VAT 20%:        200.00 MAD (on 1,000.00 MAD)
  - Reduced VAT 10%: 100.00 MAD (on 1,000.00 MAD)
Tax Total:          300.00 MAD
Grand Total:        3,300.00 MAD
```

**Validation**:
- ✓ Each tax is calculated independently
- ✓ Tax breakdown shows correct amounts per tax
- ✓ Taxable amounts are correctly summed per tax
- ✓ Total tax equals sum of all tax breakdowns
- ✓ Grand total is correct

### Scenario 4: Rounding Edge Cases

**Setup**:
- Create a sales invoice
- Add items that produce rounding scenarios:
  - Item A: 3 units @ 10.33 MAD/unit (20% VAT)
  - Item B: 7 units @ 15.47 MAD/unit (20% VAT)
  - Item C: 11 units @ 22.22 MAD/unit (14% VAT)

**Expected Results**:
```
Item A: 3 × 10.33 = 30.99 MAD, Tax: 6.20 MAD (30.99 × 0.20 = 6.198)
Item B: 7 × 15.47 = 108.29 MAD, Tax: 21.66 MAD (108.29 × 0.20 = 21.658)
Item C: 11 × 22.22 = 244.42 MAD, Tax: 34.22 MAD (244.42 × 0.14 = 34.2188)

Invoice:
Subtotal:       383.70 MAD (30.99 + 108.29 + 244.42)
Tax Breakdown:
  - VAT 20%:    27.86 MAD (6.20 + 21.66)
  - VAT 14%:    34.22 MAD
Tax Total:      62.08 MAD
Grand Total:    445.78 MAD (383.70 + 62.08)
```

**Validation**:
- ✓ Line amounts are correctly rounded per line
- ✓ Line taxes are correctly rounded per line (not accumulated then rounded)
- ✓ Subtotal equals sum of rounded line amounts
- ✓ Tax total equals sum of rounded line taxes
- ✓ Grand total is rounded to 2 decimals

### Scenario 5: Tax Type Validation (Sales Tax on Purchase Invoice)

**Setup**:
- Create a **purchase** invoice
- Attempt to add item with **sales-only** tax
- Add item with **both** type tax

**Expected Results**:
```
Item A (sales-only tax): Tax NOT applied (warning logged)
Item B (both type tax):  Tax APPLIED correctly
```

**Validation**:
- ✓ Sales-only tax is skipped for purchase invoice
- ✓ Console warning is logged for mismatched tax type
- ✓ "Both" type tax is applied correctly
- ✓ Invoice totals exclude the invalid tax

### Scenario 6: Zero-Rated Items

**Setup**:
- Create a sales invoice
- Add items with 0% tax:
  - Item A: 100 units @ 50.00 MAD/unit (0% Export Tax)

**Expected Results**:
```
Item A: 100 × 50.00 = 5,000.00 MAD, Tax (0%): 0.00 MAD

Invoice:
Subtotal:        5,000.00 MAD
Tax (Export 0%): 0.00 MAD
Grand Total:     5,000.00 MAD
```

**Validation**:
- ✓ Line amount is calculated correctly
- ✓ Tax amount is 0.00
- ✓ Tax appears in breakdown with 0% rate
- ✓ Grand total equals subtotal

### Scenario 7: High Volume Invoice

**Setup**:
- Create a sales invoice with 100 line items
- Each item: 1 unit @ random price between 1.00 and 1,000.00 MAD
- All items have 20% VAT

**Expected Results**:
```
- All line amounts are correctly calculated and rounded
- All line taxes are correctly calculated and rounded
- Subtotal equals sum of all line amounts
- Tax total equals sum of all line taxes
- Grand total equals subtotal + tax total
- No accumulated rounding errors
```

**Validation**:
- ✓ No performance degradation
- ✓ All calculations are accurate
- ✓ Tax breakdown shows correct aggregation
- ✓ No rounding drift (verify: sum(line_taxes) = tax_total)

### Scenario 8: Decimal Quantity Edge Case

**Setup**:
- Create a sales invoice
- Add items with decimal quantities:
  - Item A: 2.5 units @ 123.45 MAD/unit (20% VAT)
  - Item B: 0.75 units @ 999.99 MAD/unit (20% VAT)

**Expected Results**:
```
Item A: 2.5 × 123.45 = 308.63 MAD, Tax: 61.73 MAD
Item B: 0.75 × 999.99 = 749.99 MAD, Tax: 150.00 MAD

Invoice:
Subtotal:    1,058.62 MAD
Tax (20%):   211.73 MAD
Grand Total: 1,270.35 MAD
```

**Validation**:
- ✓ Decimal quantities are handled correctly
- ✓ Rounding is applied properly
- ✓ Totals are accurate

## Integration Tests

### Test 1: Create Invoice and Verify Database

**Steps**:
1. Create invoice via UI with multiple items and taxes
2. Query database for invoice record
3. Query database for invoice_items records
4. Verify all amounts match calculated values

**Verification**:
```sql
-- Check invoice totals
SELECT subtotal, tax_total, grand_total
FROM invoices
WHERE id = '<invoice_id>';

-- Check line items
SELECT
  item_name,
  quantity,
  unit_price,
  amount,
  tax_amount,
  (quantity * unit_price) as calculated_amount,
  amount + tax_amount as line_total
FROM invoice_items
WHERE invoice_id = '<invoice_id>';

-- Verify totals match
SELECT
  (SELECT SUM(amount) FROM invoice_items WHERE invoice_id = '<invoice_id>') as items_subtotal,
  (SELECT SUM(tax_amount) FROM invoice_items WHERE invoice_id = '<invoice_id>') as items_tax_total,
  i.subtotal,
  i.tax_total,
  i.grand_total
FROM invoices i
WHERE i.id = '<invoice_id>';
```

### Test 2: Tax Breakdown Display

**Steps**:
1. Create invoice with multiple different taxes
2. View invoice detail
3. Verify tax breakdown shows all taxes
4. Verify amounts match calculations

**Verification**:
- Tax breakdown component displays all taxes
- Each tax shows: name, rate, taxable amount, tax amount
- Totals in breakdown sum to tax_total
- UI formatting is correct

## Automated Test Suite

### Unit Tests (Vitest)

**File**: `src/lib/taxCalculations.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  roundToDecimals,
  calculateLineAmount,
  calculateLineTaxAmount,
  calculateInvoiceTotals,
} from './taxCalculations';

describe('Tax Calculations', () => {
  describe('roundToDecimals', () => {
    it('should round to 2 decimals by default', () => {
      expect(roundToDecimals(10.123)).toBe(10.12);
      expect(roundToDecimals(10.125)).toBe(10.13);
      expect(roundToDecimals(10.999)).toBe(11.00);
    });
  });

  describe('calculateLineAmount', () => {
    it('should calculate and round line amount', () => {
      expect(calculateLineAmount(3, 10.33)).toBe(30.99);
      expect(calculateLineAmount(2.5, 123.45)).toBe(308.63);
    });
  });

  describe('calculateLineTaxAmount', () => {
    it('should calculate and round tax amount', () => {
      expect(calculateLineTaxAmount(1000, 20)).toBe(200.00);
      expect(calculateLineTaxAmount(30.99, 20)).toBe(6.20);
      expect(calculateLineTaxAmount(244.42, 14)).toBe(34.22);
    });
  });

  // Add more tests for calculateInvoiceTotals with mocked supabase
});
```

## Performance Benchmarks

**Target**: All calculations should complete in < 100ms for invoices with up to 100 line items

**Benchmark Test**:
```typescript
const items = Array.from({ length: 100 }, (_, i) => ({
  item_name: `Item ${i}`,
  quantity: Math.random() * 100,
  rate: Math.random() * 1000,
  account_id: 'test-account',
  tax_id: 'test-tax-20',
}));

const start = performance.now();
const totals = await calculateInvoiceTotals(items, 'sales');
const duration = performance.now() - start;

console.log(`Calculation time for 100 items: ${duration.toFixed(2)}ms`);
```

## Manual Testing Checklist

- [ ] Scenario 1: Single item with tax
- [ ] Scenario 2: Multiple items with same tax
- [ ] Scenario 3: Multiple items with different taxes
- [ ] Scenario 4: Rounding edge cases
- [ ] Scenario 5: Tax type validation
- [ ] Scenario 6: Zero-rated items
- [ ] Scenario 7: High volume invoice (100+ items)
- [ ] Scenario 8: Decimal quantities
- [ ] Create invoice and verify database values
- [ ] Tax breakdown display is correct
- [ ] Invoice totals match database totals
- [ ] PDF/Print output shows correct totals
- [ ] Journal entry creation uses correct amounts

## Troubleshooting

### Issue: Totals don't match sum of line items

**Possible Causes**:
1. Rounding applied at wrong stage
2. Accumulated floating-point errors

**Solution**: Ensure rounding is applied per-line, not on accumulated totals

### Issue: Tax appears in wrong invoice type

**Possible Causes**:
1. Tax type not validated before application
2. Tax type misconfigured in database

**Solution**: Check tax.tax_type and validate in `calculateInvoiceTotals`

### Issue: Grand total has unexpected decimal places

**Possible Causes**:
1. Missing final rounding on grand_total

**Solution**: Ensure `roundToDecimals()` is called on grand_total

## References

- Tax Calculation Implementation: `src/lib/taxCalculations.ts`
- Invoice Creation Hook: `src/hooks/useInvoices.ts`
- Tax Display Components: `src/components/Accounting/TaxBreakdown.tsx`
- Database Schema: `supabase/migrations/20251029220048_create_accounting_module_safe.sql`
