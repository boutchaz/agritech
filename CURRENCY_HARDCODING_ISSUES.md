# Currency Hardcoding Issues - Analysis & Fix

## Problem

Even after changing organization currency in settings, many components still show EUR (€) or DH (Moroccan Dirham) instead of using the organization's configured currency dynamically.

## Root Cause

Multiple components have **hardcoded currency symbols and codes** instead of using the `useCurrency()` hook.

## Affected Components (9 files, 43 occurrences)

### 1. ✅ ProfitabilityDashboard.tsx
**Status:** ALREADY CORRECT
```typescript
const { format: formatCurrency } = useCurrency();
// Uses formatCurrency() throughout ✅
```

### 2. ❌ Reports.tsx (5 hardcoded "DH")
**Issues:**
```typescript
Line 118: `${(item.quantity * item.price_per_unit).toFixed(2)} DH`
Line 157: `${p.total_price.toFixed(2)} DH`
Line 164: `${(a.quantity_used * a.inventory.price_per_unit).toFixed(2)} DH`
Line 229: `${employee.salary.toFixed(2)} DH`
Line 248: `${laborer.daily_rate.toFixed(2)} DH`
```

**Fix needed:** Import and use `useCurrency()` hook

### 3. ❌ OrganizationSettings.tsx (1 hardcoded EUR)
**Issue:**
```typescript
Line 388: value={orgData.currency || 'EUR'}
```

**Fix needed:** Should default to organization's current currency or MAD for Morocco

### 4. ❌ ProductApplications.tsx (1 hardcoded EUR)
**Issue:**
```typescript
Line 43: const currency = currentOrganization?.currency || 'EUR';
```

**Impact:** Uses currency code but should use `useCurrency()` for formatting

### 5. ❌ DayLaborerManagement.tsx (1 hardcoded EUR)
**Issue:**
```typescript
Line 33: const currency = currentOrganization?.currency || 'EUR';
```

**Impact:** Uses currency code but should use `useCurrency()` for symbol

### 6. ❌ EmployeeManagement.tsx (1 hardcoded EUR)
**Issue:**
```typescript
Line 47: const currency = currentOrganization?.currency || 'EUR';
```

**Impact:** Uses currency code but should use `useCurrency()` for symbol

### 7. ❌ Workers/WorkerForm.tsx (2 hardcoded "DH")
**Issues:**
```typescript
Line 433: Salaire mensuel (DH) *
Line 452: Taux journalier (DH) *
```

**Fix needed:** Use currency symbol from `useCurrency()`

### 8. ❌ Workers/MetayageCalculator.tsx (7 hardcoded "DH")
**Issues:**
```typescript
Line 193: Revenu brut (DH) *
Line 210: Charges totales (DH)
Line 277: {grossRevenueNum.toFixed(2)} DH
Line 283: -{totalChargesNum.toFixed(2)} DH
Line 289: {netRevenue.toFixed(2)} DH
Line 298: {baseAmount.toFixed(2)} DH
Line 310: {workerShare.toFixed(2)} DH
```

**Fix needed:** Use `useCurrency()` hook for formatting

### 9. ⚠️ Database Default Values
**Tables with EUR default:**
- `organizations.currency` → DEFAULT 'EUR'
- `costs.currency` → DEFAULT 'EUR'
- `revenues.currency` → DEFAULT 'EUR'
- `profitability_snapshots.currency` → DEFAULT 'EUR'

**Recommendation:** Change defaults to 'MAD' for Moroccan context

## Solution Strategy

### Approach 1: Use useCurrency() Hook (Recommended)

```typescript
import { useCurrency } from '../hooks/useCurrency';

const MyComponent = () => {
  const { format, symbol, currencyCode } = useCurrency();
  
  // For labels
  <label>Salaire mensuel ({symbol}) *</label>
  
  // For formatting values
  <span>{format(1250)}</span>  // → "1 250,00 DH" or "€1,250.00"
  
  // For currency code only
  <input placeholder={`Amount in ${currencyCode}`} />
};
```

### Approach 2: Direct Currency from Context

```typescript
const { currentOrganization } = useAuth();
const symbol = currentOrganization?.currency_symbol || 'DH';
const code = currentOrganization?.currency || 'MAD';
```

**Cons:** No formatting, manual implementation

### Approach 3: Database Default Fix

```sql
-- Change default currency for new organizations
ALTER TABLE organizations 
  ALTER COLUMN currency SET DEFAULT 'MAD';

ALTER TABLE organizations
  ALTER COLUMN currency_symbol SET DEFAULT 'DH';
```

## Recommended Fixes

### Priority 1: High-Impact Components

#### 1. Reports.tsx
Add `useCurrency()` and replace all `.toFixed(2) DH` with `format()`:

```typescript
import { useCurrency } from '../hooks/useCurrency';

const Reports = () => {
  const { format } = useCurrency();
  
  // Replace:
  'Valeur': `${(item.quantity * item.price_per_unit).toFixed(2)} DH`
  
  // With:
  'Valeur': format(item.quantity * item.price_per_unit)
};
```

#### 2. Workers/WorkerForm.tsx
Use dynamic currency symbol in labels:

```typescript
const { symbol } = useCurrency();

// Replace:
<label>Salaire mensuel (DH) *</label>
<label>Taux journalier (DH) *</label>

// With:
<label>Salaire mensuel ({symbol}) *</label>
<label>Taux journalier ({symbol}) *</label>
```

#### 3. Workers/MetayageCalculator.tsx
Use `format()` for all amounts:

```typescript
const { format } = useCurrency();

// Replace all instances like:
{grossRevenueNum.toFixed(2)} DH

// With:
{format(grossRevenueNum)}
```

### Priority 2: Default Currency Values

#### ProductApplications.tsx, DayLaborerManagement.tsx, EmployeeManagement.tsx

Replace:
```typescript
const currency = currentOrganization?.currency || 'EUR';
```

With:
```typescript
const { symbol, currencyCode, format } = useCurrency();
// Then use symbol/format instead of manual currency handling
```

### Priority 3: Database Defaults

For new Moroccan organizations, update defaults:

```sql
-- Migration: update_default_currency_to_mad.sql
ALTER TABLE organizations 
  ALTER COLUMN currency SET DEFAULT 'MAD',
  ALTER COLUMN currency_symbol SET DEFAULT 'DH';

-- Update existing EUR organizations if they're Moroccan
UPDATE organizations
SET 
  currency = 'MAD',
  currency_symbol = 'DH'
WHERE currency = 'EUR' 
  AND (country = 'Morocco' OR country = 'Maroc');
```

## Testing Plan

### 1. Change Organization Currency
```sql
UPDATE organizations
SET currency = 'MAD', currency_symbol = 'DH'
WHERE id = '6f93edb9-ff83-4934-a54c-7c45f031a2d0';
```

### 2. Reload Frontend
- Clear browser cache
- Reload page
- Check all components display "DH" not "€"

### 3. Test Components
- [ ] ProfitabilityDashboard → Should show DH ✅ (already correct)
- [ ] Reports → Should show DH (needs fix)
- [ ] Workers forms → Should show DH (needs fix)
- [ ] Métayage calculator → Should show DH (needs fix)
- [ ] Stock management → Check if uses currency

## Implementation Checklist

### Phase 1: Add useCurrency() Hook
- [ ] Reports.tsx
- [ ] Workers/WorkerForm.tsx  
- [ ] Workers/MetayageCalculator.tsx
- [ ] ProductApplications.tsx (if displaying amounts)
- [ ] DayLaborerManagement.tsx (if displaying amounts)
- [ ] EmployeeManagement.tsx (if displaying amounts)

### Phase 2: Replace Hardcoded Values
- [ ] All `.toFixed(2) DH` → `format(amount)`
- [ ] All `(DH)` labels → `({symbol})`
- [ ] All `'EUR'` defaults → remove (use hook)

### Phase 3: Test & Verify
- [ ] Build successful
- [ ] TypeScript errors resolved
- [ ] Test with EUR currency
- [ ] Test with MAD currency
- [ ] Test with USD currency

### Phase 4: Database Defaults (Optional)
- [ ] Create migration for MAD defaults
- [ ] Update existing organizations if needed

## Expected Behavior After Fix

### With EUR Currency
```
Salaire mensuel (€) *
Revenu brut: €1,250.00
Total: €15,000.00
```

### With MAD Currency
```
Salaire mensuel (DH) *
Revenu brut: 1 250,00 DH
Total: 15 000,00 DH
```

### With USD Currency
```
Salaire mensuel ($) *
Revenu brut: $1,250.00
Total: $15,000.00
```

## Context Refresh Issue

If changing currency doesn't update immediately, check:

### 1. MultiTenantAuthProvider
Does it invalidate queries when organization updates?

```typescript
// After organization update:
queryClient.invalidateQueries({ queryKey: ['organizations'] });
queryClient.invalidateQueries({ queryKey: ['current-organization'] });
```

### 2. React Query Stale Time
```typescript
// In useUserOrganizations
staleTime: 5 * 60 * 1000, // 5 minutes - might be too long?
```

### 3. Component Remounting
Some components might cache currency on mount. Ensure they re-render when currency changes.

## Files to Modify

| File | Lines | Type | Priority |
|------|-------|------|----------|
| Reports.tsx | 5 | Hardcoded DH | High |
| Workers/WorkerForm.tsx | 2 | Label DH | High |
| Workers/MetayageCalculator.tsx | 7 | Hardcoded DH | High |
| ProductApplications.tsx | 1 | Default EUR | Medium |
| DayLaborerManagement.tsx | 1 | Default EUR | Medium |
| EmployeeManagement.tsx | 1 | Default EUR | Medium |
| OrganizationSettings.tsx | 1 | Default EUR | Low |

Total: **18 instances** to fix across 7 files

## Utility Functions Available

From `src/utils/currencies.ts`:
```typescript
export function formatCurrency(amount: number, currencyCode: string): string
export function getCurrency(code: string): Currency | undefined
```

From `useCurrency()` hook:
```typescript
{
  currencyCode: string,      // 'EUR', 'MAD', 'USD'
  currency: Currency,        // Full currency object
  format: (amount) => string, // Auto-formatted
  formatWithOptions: (...) => string,
  symbol: string            // '€', 'DH', '$'
}
```

---

**Issue:** Currency hardcoded in multiple components  
**Impact:** Organization currency setting ignored  
**Files affected:** 7 components  
**Instances:** 18 hardcoded values  
**Solution:** Use useCurrency() hook consistently  
**Status:** ⚠️ Needs implementation  
**Date:** October 18, 2025

