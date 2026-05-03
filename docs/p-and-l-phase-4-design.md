# P&L Phase 4 — Deferred Features Design Doc

The four features below are intentionally **not implemented** in this phase. Each
**requires CEO scope approval per CLAUDE.md (architecture change)** because it
touches schema structure, multi-currency, or cross-organization data access.

This document sketches what implementation would look like so the work can be
scoped quickly when approval is granted.

---

## 1. Cash vs Accrual basis P&L

**What it adds.** A toggle on the P&L page that re-computes the report on a cash
basis (only revenue/expense recognized when cash actually moves) instead of the
default accrual basis (recognized at invoice/posting time).

**Schema migrations needed.**
- `journal_items.cash_settlement_date DATE NULL` — when the matching cash leg
  posted; null = unsettled.
- Trigger `set_cash_settlement_date()` on payment posting that updates the AR/AP
  pair's settlement date when both legs are matched.
- Index `idx_journal_items_cash_settled` on `(organization_id, cash_settlement_date)`.

**Service contract sketch.**
```ts
// financial-reports.service.ts
async getProfitLoss(orgId, startDate, endDate, filters?: {
  ...,
  basis?: 'accrual' | 'cash',  // default 'accrual'
}): Promise<ProfitLossReport>
```
When `basis='cash'`: filter `journal_items` by `cash_settlement_date BETWEEN start AND end`
instead of `journal_entries.entry_date`. Unsettled items are excluded entirely.

**Caveat.** Cash basis requires every accrual entry to have a paired cash leg.
Cost entries created via `AccountingAutomationService` need to be audited for
this — many are auto-cash today, but invoice flows are not. Migration must
backfill `cash_settlement_date` for historical settled pairs.

Requires CEO scope approval per CLAUDE.md (architecture change).

---

## 2. Multi-currency FX (transaction currency support)

**What it adds.** Journal items can be denominated in a non-base currency.
P&L still reports in base currency but exposes a "by transaction currency"
drilldown.

**Schema migrations needed.**
- `journal_items.currency CHAR(3) NULL` (defaults to org base currency).
- `journal_items.exchange_rate DECIMAL(18,8) NULL` — rate at posting time.
- `journal_items.fc_debit DECIMAL(15,2)` / `fc_credit DECIMAL(15,2)` —
  foreign-currency amounts. Existing `debit`/`credit` remain in base currency.
- Reference table `exchange_rates(date, from_ccy, to_ccy, rate)` with daily seeds.

**Service contract sketch.**
```ts
interface ProfitLossRow {
  ...,
  by_currency?: Array<{ currency: string; fc_amount: number; base_amount: number }>;
}
```
P&L still sums `display_amount` (base). New rollup queries `journal_items` GROUP
BY `currency` for the drilldown. New endpoint
`GET /financial-reports/profit-loss/by-currency` returns the disaggregated view.

**Caveat.** All existing accounting automation (invoices, payments, cost entries)
must be updated to record `currency`/`exchange_rate` at posting. This is invasive.

Requires CEO scope approval per CLAUDE.md (architecture change).

---

## 3. Unrealized FX (revaluation of foreign-currency balances)

**What it adds.** A period-end revaluation routine that marks open foreign
currency AR/AP balances to current exchange rates and posts unrealized gain/loss.

**Schema migrations needed.**
- New JE `entry_type = 'fx_revaluation'`.
- `accounts.is_fx_revaluable BOOLEAN DEFAULT false` — opt-in flag for AR/AP/cash.
- Two new system accounts (auto-created):
  `Unrealized FX Gain` (Revenue), `Unrealized FX Loss` (Expense).

**Service contract sketch.**
```ts
async revalueForeignCurrency(params: {
  organizationId: string;
  userId: string;
  asOfDate: string;
  currencies?: string[];   // default: all
}): Promise<{ journalEntryId: string; entryNumber: string; pnlImpact: number }>
```
Algorithm: for each FX-revaluable account with non-zero `fc_balance`, compute
`current_rate * fc_balance - existing_base_balance = adjustment`. Post one JE
debiting/crediting the account against Unrealized FX Gain/Loss. Idempotency
key: `(organizationId, asOfDate, 'fx_revaluation')`.

**Caveat.** Reversed automatically on the next period start (standard practice)
to avoid double-counting realized FX. Depends on Feature #2 having shipped.

Requires CEO scope approval per CLAUDE.md (architecture change).

---

## 4. Inter-organization consolidation

**What it adds.** A consolidated P&L across multiple organizations (parent +
subsidiaries) with elimination of inter-company transactions.

**Schema migrations needed.**
- New table `organization_groups(id, name, base_currency)`.
- `organizations.group_id UUID NULL REFERENCES organization_groups(id)`.
- `organizations.parent_org_id UUID NULL` for hierarchy.
- `journal_items.intercompany_partner_org_id UUID NULL` — flags inter-co lines
  to be eliminated on consolidation.
- New view `consolidated_journal_items` that unions across group orgs and
  filters out matched intercompany pairs.

**Service contract sketch.**
```ts
async getConsolidatedProfitLoss(params: {
  groupId: string;
  startDate: string;
  endDate: string;
  baseCurrency?: string;
}): Promise<ProfitLossReport & { eliminations: number; per_org: ProfitLossReport[] }>
```
New controller bypasses `OrganizationGuard` (since it crosses orgs) and uses a
new `GroupGuard` that checks the requesting user has admin rights on every org
in the group. RLS policies on `journal_*` tables must be extended with a
`is_group_member()` helper. Currency translation (subsidiaries with different
base currencies) needs Feature #2.

**Caveat.** This is the most invasive change — guard stack rewrite, new RLS
policies, new authorization model. Multi-tenancy invariants need a careful
audit since the whole codebase assumes a single `organization_id` per query.

Requires CEO scope approval per CLAUDE.md (architecture change).
