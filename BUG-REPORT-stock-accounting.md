# Concrete Bug Report: Stock & Accounting Modules

**Date**: 2025-04-24  
**Scope**: `agritech-api/src/modules/{stock-entries,accounts,account-mappings,bank-accounts}`  
**Methodology**: Full source code review of 2,935 + 548 + 618 + 196 + 264 + 531 = ~5,000 lines  

---

## 🔴 CRITICAL (Data Loss / Security / Multi-Tenancy)

### BUG-01: `stock_account_mappings` creation allows any organization_id via DTO  
**File**: `stock-entries/stock-entries.controller.ts` line 326  
**Impact**: A user can inject any `organization_id` in the DTO body. The controller sets `organizationId` from the header, but the `CreateStockAccountMappingDto` body is spread directly into the insert, potentially overwriting.  

**Evidence**:  
```typescript
// controller line 326-328
async createAccountMapping(@Req() req: any, @Body() createDto: CreateStockAccountMappingDto) {
  const organizationId = req.headers['x-organization-id'];
  return this.stockEntriesService.createStockAccountMapping(organizationId, createDto);
}
```

```typescript
// service line 2876-2881 — dto is spread WITH organization_id from header
.insert({
  organization_id: organizationId,
  ...dto,  // BUG: if dto has organization_id field, it overwrites the header value
})
```

The `...dto` spread after `organization_id: organizationId` means if `CreateStockAccountMappingDto` contains an `organization_id` field, it **overwrites** the header-derived value. Same issue exists in `bank-accounts` (line 82-96) and `account-mappings` (controller line 84-86 → service line 260-311).

**Fix**: Remove `organization_id` from DTOs or explicitly delete it before spreading: `const { organization_id, ...safeDto } = dto;`

---

### BUG-02: Missing `PoliciesGuard` on stock-entries controller — no CASL authorization  
**File**: `stock-entries/stock-entries.controller.ts` line 36  
**Impact**: Any authenticated user in any role (including `viewer`, `day_laborer`) can create, post, reverse, and delete stock entries. The `accounts` controller uses `PoliciesGuard` + `@CanManageAccounts()`, but stock-entries only uses `JwtAuthGuard + OrganizationGuard`.  

**Evidence**:  
```typescript
// stock-entries controller — NO PoliciesGuard
@UseGuards(JwtAuthGuard, OrganizationGuard)

// accounts controller — HAS PoliciesGuard
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
```

**Fix**: Add `PoliciesGuard` and appropriate `@CheckPolicies()` decorators to all stock-entries endpoints.

---

### BUG-03: `bank_accounts.current_balance` can be set directly by user input  
**File**: `bank-accounts/bank-accounts.service.ts` lines 90-91  
**Impact**: A user can pass `current_balance` in the create DTO to set any arbitrary balance. This should be system-computed from transactions, not user-supplied.  

**Evidence**:  
```typescript
opening_balance: dto.opening_balance || 0,
current_balance: dto.current_balance || dto.opening_balance || 0,  // User-controlled!
```

**Fix**: `current_balance` should be initialized to `opening_balance` only, never from user DTO input.

---

### BUG-04: `bank_accounts.current_balance` and `opening_balance` updatable by user  
**File**: `bank-accounts/bank-accounts.service.ts` lines 133-134  
**Impact**: Any user with access can update `current_balance` and `opening_balance` to arbitrary values, bypassing all accounting controls.  

**Evidence**:  
```typescript
if (dto.opening_balance !== undefined) updateData.opening_balance = dto.opening_balance;
if (dto.current_balance !== undefined) updateData.current_balance = dto.current_balance;
```

**Fix**: Remove `current_balance` and `opening_balance` from update DTO. Balance should only change through journal entries/payments.

---

## 🟠 HIGH (Logic Errors / Data Integrity)

### BUG-05: Reversal of Material Issue uses stale `cost_per_unit` from original entry  
**File**: `stock-entries/stock-accounting.service.ts` line 449  
**Impact**: Reversal journal entry uses `calculateTotalValue(items)` which uses the *original DTO cost_per_unit*. But for Material Issue, the original posting used FIFO/weighted-avg cost from the valuation engine. The reversal amount may not match the original journal entry, causing GL imbalance.  

**Evidence**:  
```typescript
// Original posting (line 83-85) — correctly uses computed FIFO cost:
const totalValue = stockEntry.entry_type === StockEntryType.MATERIAL_ISSUE
  ? await this.getComputedOutboundValue(client, stockEntry.id)
  : this.calculateTotalValue(items);

// Reversal (line 449) — INCORRECTLY uses DTO cost:
const totalValue = this.calculateTotalValue(items);  // Wrong for Material Issue!
```

**Fix**: Reversal should use `getComputedOutboundValue` for Material Issue, same as the original.

---

### BUG-06: `postOpeningStockBalance` creates stock_movement without `variant_id`  
**File**: `stock-entries/stock-entries.service.ts` lines 2751-2781  
**Impact**: The INSERT into `stock_movements` omits `variant_id`, but the `computeRunningBalance` call on line 2732-2738 passes `openingStock.variant_id`. This means the movement won't be counted in the balance for variant-specific queries.  

**Evidence**: The INSERT statement has no `variant_id` column, but the balance computation and stock_valuation insert (lines 2783-2806) do include it. This inconsistency will cause variant-aware stock levels to be wrong.

**Fix**: Add `variant_id: openingStock.variant_id || null` to the stock_movements INSERT.

---

### BUG-07: `postStockEntry` status update lacks `organization_id` filter  
**File**: `stock-entries/stock-entries.service.ts` line 399-403  
**Impact**: The status update to "Posted" doesn't include `AND organization_id = $X` in the WHERE clause. While the preceding SELECT already verified the org, a concurrent transaction could theoretically modify a different org's entry.  

**Evidence**:  
```typescript
await client.query(
  `UPDATE stock_entries SET status = $1, posted_at = $2 WHERE id = $3`,
  [StockEntryStatus.POSTED, new Date(), stockEntryId],
);
```

**Fix**: Add `AND organization_id = $4` with the organizationId parameter.

---

### BUG-08: `accounts.delete()` — hard delete with no transaction check  
**File**: `accounts/accounts.service.ts` lines 147-160  
**Impact**: Hard-deletes an account without checking if it's referenced by journal_items, account_mappings, bank_accounts, or stock_account_mappings. Will cause foreign key violations or orphaned data.  

**Evidence**:  
```typescript
async delete(accountId: string, organizationId: string): Promise<void> {
  const supabase = this.databaseService.getAdminClient();
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId)
    .eq('organization_id', organizationId);
  // No checks for journal_items, mappings, etc.
}
```

**Fix**: Add existence checks for all referencing tables before deleting, or soft-delete via `is_active = false`.

---

### BUG-09: `cancelOpeningStockBalance` doesn't validate status  
**File**: `stock-entries/stock-entries.service.ts` lines 2817-2833  
**Impact**: Allows cancelling an already-posted opening stock balance. The Supabase query filters by `id` and `organization_id` but NOT by status. A posted opening balance can be cancelled without reversing its stock movements and valuations.  

**Evidence**:  
```typescript
const { data, error } = await supabase
  .from('opening_stock_balances')
  .update({ status: 'Cancelled' })
  .eq('id', id)
  .eq('organization_id', organizationId)
  // Missing: .neq('status', 'Posted')  or .eq('status', 'Draft')
  .select()
  .single();
```

**Fix**: Add `.eq('status', 'Draft')` or `.neq('status', 'Posted')` to prevent cancelling posted entries.

---

### BUG-10: `requiresApproval` never called — approval bypass for non-submitted entries  
**File**: `stock-entries/stock-entry-approvals.service.ts` line 188  
**Impact**: The `requiresApproval()` method exists but is **never called** in `createStockEntry` or `postStockEntry`. A `day_laborer` or `farm_worker` can create and post entries directly without approval. The approval flow only triggers if the entry is in `Submitted` status, but nothing forces entries into that status.  

**Evidence**: Searching the entire codebase, `requiresApproval` is defined but never invoked.

**Fix**: Call `requiresApproval()` in `createStockEntry()`. If approval is required, force `status = Submitted` and create an approval request automatically.

---

## 🟡 MEDIUM (Race Conditions / Edge Cases)

### BUG-11: `getExpiryAlerts` raw PG client acquired but not released on error  
**File**: `stock-entries/stock-entries.service.ts` lines 1218-1275  
**Impact**: If `client.query()` throws before the `finally` block, the client IS released (finally always runs). BUT the `pool.connect()` pattern without a timeout could leak connections under heavy load.  

**Severity**: Low — the `finally` clause handles this correctly. Not a real bug, but worth noting for connection pool monitoring.

---

### BUG-12: `getPendingApprovals` uses raw PG client without transaction  
**File**: `stock-entry-approvals.service.ts` lines 134-186  
**Impact**: Uses `pool.connect()` + `client.release()` pattern for a read-only query. No transaction needed, but the manual client management is error-prone compared to using `databaseService.executeInPgTransaction`.  

**Severity**: Low — functional but inconsistent with the rest of the codebase.

---

### BUG-13: `findAll` in `stock-entries.service.ts` — `filters` parameter typed as `any`  
**File**: `stock-entries/stock-entries.service.ts` line 35  
**Impact**: No type safety on filters. Invalid filter keys are silently ignored. Could hide bugs where frontend sends wrong parameter names.  

**Evidence**: `async findAll(organizationId: string, filters?: any)` — the `any` type bypasses all TypeScript checking.

**Fix**: Create a typed `StockEntryFiltersDto` interface.

---

### BUG-14: `seedMoroccanChartOfAccounts` uses legacy code path — hardcoded Moroccan chart  
**File**: `accounts/accounts.service.ts` lines 165-262  
**Impact**: The `seedMoroccanChartOfAccounts` method duplicates logic from `applyTemplate`. If a new country is added to the chart data, this method won't pick it up.  

**Severity**: Low — legacy endpoint, likely unused after `applyTemplate` was introduced.

---

### BUG-15: `findOne` in accounts throws `BadRequestException` instead of `NotFoundException`  
**File**: `accounts/accounts.service.ts` lines 87-89  
**Impact**: Returns HTTP 400 instead of 404 when account not found. Frontend may handle this differently.  

**Evidence**:  
```typescript
if (!data) {
  throw new BadRequestException('Account not found');  // Should be NotFoundException
}
```

**Fix**: Change to `NotFoundException('Account not found')`.

---

## Summary

| Severity | Count | Categories |
|----------|-------|-----------|
| 🔴 Critical | 4 | Multi-tenancy bypass, missing authorization, balance manipulation |
| 🟠 High | 6 | Cost mismatch, missing org filters, missing validation, approval bypass |
| 🟡 Medium | 5 | Type safety, inconsistent patterns, wrong HTTP status |

**Top Priority Fixes** (do these first):
1. BUG-01: DTO spread overwrites organization_id (all modules)
2. BUG-02: Missing PoliciesGuard on stock-entries
3. BUG-05: Reversal cost mismatch for Material Issue
4. BUG-10: Approval bypass — `requiresApproval()` never called
5. BUG-09: Cancel posted opening stock balance without reversal
