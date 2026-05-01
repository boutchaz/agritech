import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { AccountingAutomationService } from './accounting-automation.service';

/**
 * Account types are stored in PascalCase ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense').
 * See: src/modules/accounts/data/types.ts AccountType enum.
 * Comparisons here normalize via lower-case to be tolerant of historical lowercase data.
 */
const ASSET = 'asset';
const LIABILITY = 'liability';
const EQUITY = 'equity';
const REVENUE = 'revenue';
const EXPENSE = 'expense';

const norm = (v: string | null | undefined): string => (v || '').trim().toLowerCase();

export interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  parent_id: string | null;
  is_group: boolean;
  total_debit: number;
  total_credit: number;
  balance: number;
  debit_balance: number;
  credit_balance: number;
}

export interface BalanceSheetRow {
  section: 'assets' | 'liabilities' | 'equity';
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  balance: number;
  display_balance: number;
}

export type ProfitLossSection =
  | 'direct_income'
  | 'other_income'
  | 'cogs'
  | 'indirect_expense'
  | 'other_expense';

export interface ProfitLossRow {
  section: ProfitLossSection;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  total_debit: number;
  total_credit: number;
  balance: number;
  display_amount: number;
  budget_amount?: number | null;
  variance?: number | null;
  variance_percentage?: number | null;
  by_currency?: Array<{ currency: string; fc_amount: number; base_amount: number }>;
}

export interface ProfitLossFilters {
  cost_center_id?: string;
  farm_id?: string;
  parcel_id?: string;
  fiscal_year_id?: string;
  include_zero_balances?: boolean;
  include_budget?: boolean;
  include_by_currency?: boolean;
  /** Phase 4c: 'accrual' (default) uses entry_date; 'cash' uses cash_settlement_date. */
  basis?: 'accrual' | 'cash';
}

export interface GeneralLedgerRow {
  entry_date: string;
  entry_number: string;
  journal_entry_id: string;
  description: string;
  reference_type: string | null;
  reference_number: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface AccountSummaryRow {
  account_type: string;
  total_accounts: number;
  total_debit: number;
  total_credit: number;
  net_balance: number;
}

export interface TrialBalanceReport {
  as_of_date: string;
  accounts: TrialBalanceRow[];
  totals: {
    total_debit: number;
    total_credit: number;
    is_balanced: boolean;
  };
}

export interface BalanceSheetReport {
  as_of_date: string;
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totals: {
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    is_balanced: boolean;
  };
}

export interface ProfitLossReport {
  start_date: string;
  end_date: string;
  direct_income: ProfitLossRow[];
  other_income: ProfitLossRow[];
  cogs: ProfitLossRow[];
  indirect_expenses: ProfitLossRow[];
  other_expenses: ProfitLossRow[];
  totals: {
    total_direct_income: number;
    total_other_income: number;
    total_income: number;
    total_cogs: number;
    total_indirect_expenses: number;
    total_other_expenses: number;
    total_expenses: number;
    gross_profit: number;
    operating_profit: number;
    net_income: number;
    ebitda: number;
    total_budget?: number;
    total_variance?: number;
  };
}

export interface ProfitLossComparisonReport {
  current: ProfitLossReport;
  comparison: ProfitLossReport;
  compare_with: 'previous_period' | 'previous_year';
}

export interface GeneralLedgerReport {
  account_id: string;
  account_code: string;
  account_name: string;
  start_date: string;
  end_date: string;
  opening_balance: number;
  entries: GeneralLedgerRow[];
  closing_balance: number;
}

export interface CashFlowOperating {
  net_income: number;
  depreciation: number;
  changes_in_ar: number;
  changes_in_ap: number;
  changes_in_inventory: number;
  other_adjustments: number;
  total: number;
}

export interface CashFlowInvesting {
  fixed_asset_purchases: number;
  fixed_asset_sales: number;
  total: number;
}

export interface CashFlowFinancing {
  debt_proceeds: number;
  debt_repayments: number;
  equity_changes: number;
  dividends: number;
  total: number;
}

export interface CashFlowReport {
  start_date: string;
  end_date: string;
  operating: CashFlowOperating;
  investing: CashFlowInvesting;
  financing: CashFlowFinancing;
  net_change: number;
  opening_cash: number;
  closing_cash: number;
}

interface AccountBalance {
  accountId: string;
  totalDebit: number;
  totalCredit: number;
}

@Injectable()
export class FinancialReportsService {
  private readonly logger = new Logger(FinancialReportsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    private readonly fiscalYearsService: FiscalYearsService,
    private readonly accountingAutomationService: AccountingAutomationService,
  ) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /**
   * Helper: Get aggregated balances for all accounts up to a date
   * Optional dimension filters apply at the journal_items level.
   */
  private async getAccountBalances(
    organizationId: string,
    asOfDate: string,
    startDate?: string,
    filters?: {
      cost_center_id?: string;
      farm_id?: string;
      parcel_id?: string;
      fiscal_year_id?: string;
      basis?: 'accrual' | 'cash';
    },
  ): Promise<Map<string, AccountBalance>> {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('journal_items')
      .select('account_id, debit, credit, cash_settlement_date, journal_entries!inner(status, entry_date, organization_id)')
      .eq('journal_entries.organization_id', organizationId)
      .eq('journal_entries.status', 'posted');

    if (filters?.basis === 'cash') {
      // Cash basis: filter by cash_settlement_date on the item; items with NULL are excluded.
      query = query.lte('cash_settlement_date', asOfDate);
      if (startDate) {
        query = query.gte('cash_settlement_date', startDate);
      }
    } else {
      query = query.lte('journal_entries.entry_date', asOfDate);
      if (startDate) {
        query = query.gte('journal_entries.entry_date', startDate);
      }
    }

    if (filters?.cost_center_id) {
      query = query.eq('cost_center_id', filters.cost_center_id);
    }
    if (filters?.farm_id) {
      query = query.eq('farm_id', filters.farm_id);
    }
    if (filters?.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }
    if (filters?.fiscal_year_id) {
      query = query.eq('fiscal_year_id', filters.fiscal_year_id);
    }

    const { data: items, error } = await query;

    if (error) {
      this.logger.error('Error fetching journal items:', error);
      throw new BadRequestException(`Failed to fetch journal items: ${error.message}`);
    }

    const balanceMap = new Map<string, AccountBalance>();
    for (const item of items || []) {
      const curr = balanceMap.get(item.account_id) || { accountId: item.account_id, totalDebit: 0, totalCredit: 0 };
      balanceMap.set(item.account_id, {
        accountId: item.account_id,
        totalDebit: curr.totalDebit + Number(item.debit || 0),
        totalCredit: curr.totalCredit + Number(item.credit || 0),
      });
    }

    return balanceMap;
  }

  /**
   * Get trial balance for all accounts
   */
  async getTrialBalance(organizationId: string, asOfDate?: string): Promise<TrialBalanceReport> {
    const client = this.databaseService.getAdminClient();
    const date = asOfDate || new Date().toISOString().split('T')[0];

    try {
      const { data: accounts, error: accountsError } = await client
        .from('accounts')
        .select('id, code, name, account_type, account_subtype, parent_id, is_group')
        .eq('organization_id', organizationId)
        .order('code');

      if (accountsError) {
        this.logger.error('Error fetching accounts:', accountsError);
        throw new BadRequestException(`Failed to fetch accounts: ${accountsError.message}`);
      }

      const balanceMap = await this.getAccountBalances(organizationId, date);

      const rows: TrialBalanceRow[] = (accounts || [])
        .filter(acc => !acc.is_group)
        .map(acc => {
          const bal = balanceMap.get(acc.id) || { totalDebit: 0, totalCredit: 0 };
          const balance = bal.totalDebit - bal.totalCredit;
          return {
            account_id: acc.id,
            account_code: acc.code,
            account_name: acc.name,
            account_type: acc.account_type,
            account_subtype: acc.account_subtype,
            parent_id: acc.parent_id,
            is_group: acc.is_group,
            total_debit: bal.totalDebit,
            total_credit: bal.totalCredit,
            balance,
            debit_balance: balance > 0 ? balance : 0,
            credit_balance: balance < 0 ? Math.abs(balance) : 0,
          };
        });

      const totalDebit = rows.reduce((sum, r) => sum + r.debit_balance, 0);
      const totalCredit = rows.reduce((sum, r) => sum + r.credit_balance, 0);

      return {
        as_of_date: date,
        accounts: rows,
        totals: {
          total_debit: totalDebit,
          total_credit: totalCredit,
          is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
        },
      };
    } catch (error) {
      this.logger.error('Error in getTrialBalance:', error);
      throw error;
    }
  }

  /**
   * Get balance sheet report
   */
  async getBalanceSheet(organizationId: string, asOfDate?: string): Promise<BalanceSheetReport> {
    const client = this.databaseService.getAdminClient();
    const date = asOfDate || new Date().toISOString().split('T')[0];

    try {
      // Match both PascalCase ('Asset') and lowercase ('asset') to be resilient to historical data.
      const { data: accounts, error: accountsError } = await client
        .from('accounts')
        .select('id, code, name, account_type, account_subtype')
        .eq('organization_id', organizationId)
        .eq('is_group', false)
        .in('account_type', ['Asset', 'Liability', 'Equity', 'asset', 'liability', 'equity'])
        .order('code');

      if (accountsError) {
        this.logger.error('Error fetching accounts:', accountsError);
        throw new BadRequestException(`Failed to fetch accounts: ${accountsError.message}`);
      }

      const balanceMap = await this.getAccountBalances(organizationId, date);

      const mapToSection = (type: string): 'assets' | 'liabilities' | 'equity' => {
        const t = norm(type);
        if (t === ASSET) return 'assets';
        if (t === LIABILITY) return 'liabilities';
        return 'equity';
      };

      const rows: BalanceSheetRow[] = (accounts || []).map(acc => {
        const bal = balanceMap.get(acc.id) || { totalDebit: 0, totalCredit: 0 };
        const balance = bal.totalDebit - bal.totalCredit;
        const section = mapToSection(acc.account_type);
        const displayBalance = section === 'assets' ? balance : -balance;
        return {
          section,
          account_id: acc.id,
          account_code: acc.code,
          account_name: acc.name,
          account_type: acc.account_type,
          account_subtype: acc.account_subtype,
          balance,
          display_balance: displayBalance,
        };
      });

      const assets = rows.filter(r => r.section === 'assets');
      const liabilities = rows.filter(r => r.section === 'liabilities');
      const equity = rows.filter(r => r.section === 'equity');

      const totalAssets = assets.reduce((sum, acc) => sum + acc.display_balance, 0);
      const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.display_balance, 0);
      const totalEquity = equity.reduce((sum, acc) => sum + acc.display_balance, 0);

      return {
        as_of_date: date,
        assets,
        liabilities,
        equity,
        totals: {
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          total_equity: totalEquity,
          is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
        },
      };
    } catch (error) {
      this.logger.error('Error in getBalanceSheet:', error);
      throw error;
    }
  }

  /**
   * Classify a P&L account into one of five sections based on type, subtype, and name.
   * Mirrors ERPNext's direct_income / other_income / cogs / indirect_expense / other_expense buckets.
   */
  private classifyPLAccount(
    accountType: string,
    accountSubtype: string | null,
    accountName: string,
  ): ProfitLossSection {
    const t = norm(accountType);
    const sub = norm(accountSubtype);
    const name = norm(accountName);
    const hay = `${sub} ${name}`;

    if (t === REVENUE) {
      const otherSignals = ['other', 'financial', 'interest income', 'dividend'];
      if (otherSignals.some(s => hay.includes(s))) return 'other_income';
      return 'direct_income';
    }

    // Expense default classification
    const cogsSignals = ['cogs', 'cost of goods', 'direct expense', 'direct cost', 'production cost'];
    if (cogsSignals.some(s => hay.includes(s))) return 'cogs';

    const otherExpSignals = [
      'interest expense',
      'tax',
      'depreciation',
      'amortization',
      'financial expense',
    ];
    if (otherExpSignals.some(s => hay.includes(s))) return 'other_expense';
    if (sub.includes('other') || name.includes('other expense')) return 'other_expense';

    return 'indirect_expense';
  }

  /**
   * Get profit and loss statement (ERPNext-style five-section structure)
   */
  async getProfitLoss(
    organizationId: string,
    startDate: string,
    endDate?: string,
    filters?: ProfitLossFilters,
  ): Promise<ProfitLossReport> {
    const client = this.databaseService.getAdminClient();
    const end = endDate || new Date().toISOString().split('T')[0];

    if (!startDate) {
      throw new BadRequestException('Start date is required for profit and loss report');
    }

    try {
      const { data: accounts, error: accountsError } = await client
        .from('accounts')
        .select('id, code, name, account_type, account_subtype')
        .eq('organization_id', organizationId)
        .eq('is_group', false)
        .in('account_type', ['Revenue', 'Expense', 'revenue', 'expense'])
        .order('code');

      if (accountsError) {
        this.logger.error('Error fetching accounts:', accountsError);
        throw new BadRequestException(`Failed to fetch accounts: ${accountsError.message}`);
      }

      const balanceMap = await this.getAccountBalances(organizationId, end, startDate, {
        cost_center_id: filters?.cost_center_id,
        farm_id: filters?.farm_id,
        parcel_id: filters?.parcel_id,
        fiscal_year_id: filters?.fiscal_year_id,
        basis: filters?.basis,
      });

      const includeZero = filters?.include_zero_balances === true;

      const rows: ProfitLossRow[] = (accounts || []).map(acc => {
        const bal = balanceMap.get(acc.id) || { totalDebit: 0, totalCredit: 0 };
        const balance = bal.totalDebit - bal.totalCredit;
        const isRevenue = norm(acc.account_type) === REVENUE;
        const displayAmount = isRevenue ? -balance : balance;
        const section = this.classifyPLAccount(acc.account_type, acc.account_subtype, acc.name);
        return {
          section,
          account_id: acc.id,
          account_code: acc.code,
          account_name: acc.name,
          account_type: acc.account_type,
          account_subtype: acc.account_subtype,
          total_debit: bal.totalDebit,
          total_credit: bal.totalCredit,
          balance,
          display_amount: displayAmount,
        };
      });

      const filtered = includeZero
        ? rows
        : rows.filter(r => Math.abs(r.display_amount) >= 0.005);

      // Optional: by-currency breakdown per account
      if (filters?.include_by_currency && filtered.length > 0) {
        const accountIds = filtered.map((r) => r.account_id);
        let bcq = client
          .from('journal_items')
          .select('account_id, currency, debit, credit, fc_debit, fc_credit, cash_settlement_date, journal_entries!inner(status, entry_date, organization_id)')
          .in('account_id', accountIds)
          .eq('journal_entries.organization_id', organizationId)
          .eq('journal_entries.status', 'posted');
        if (filters?.basis === 'cash') {
          bcq = bcq.gte('cash_settlement_date', startDate).lte('cash_settlement_date', end);
        } else {
          bcq = bcq
            .gte('journal_entries.entry_date', startDate)
            .lte('journal_entries.entry_date', end);
        }
        if (filters.cost_center_id) bcq = bcq.eq('cost_center_id', filters.cost_center_id);
        if (filters.farm_id) bcq = bcq.eq('farm_id', filters.farm_id);
        if (filters.parcel_id) bcq = bcq.eq('parcel_id', filters.parcel_id);
        if (filters.fiscal_year_id) bcq = bcq.eq('fiscal_year_id', filters.fiscal_year_id);
        const { data: bcItems, error: bcErr } = await bcq;
        if (bcErr) {
          this.logger.warn(`by-currency aggregation failed: ${bcErr.message}`);
        } else {
          const agg = new Map<string, Map<string, { fc: number; base: number }>>();
          for (const it of bcItems || []) {
            const acc = it.account_id as string;
            const ccy = ((it.currency as string) || 'UNK').toUpperCase();
            const bucket = agg.get(acc) || new Map();
            const cur = bucket.get(ccy) || { fc: 0, base: 0 };
            cur.fc += Number(it.fc_debit || 0) - Number(it.fc_credit || 0);
            cur.base += Number(it.debit || 0) - Number(it.credit || 0);
            bucket.set(ccy, cur);
            agg.set(acc, bucket);
          }
          for (const r of filtered) {
            const isRev = norm(r.account_type) === REVENUE;
            const bucket = agg.get(r.account_id);
            if (!bucket) continue;
            const breakdown: Array<{ currency: string; fc_amount: number; base_amount: number }> = [];
            bucket.forEach((v, ccy) => {
              breakdown.push({
                currency: ccy,
                fc_amount: this.round2(isRev ? -v.fc : v.fc),
                base_amount: this.round2(isRev ? -v.base : v.base),
              });
            });
            r.by_currency = breakdown.sort((a, b) => a.currency.localeCompare(b.currency));
          }
        }
      }

      // Optional: merge in budget data per account from cost_center_budgets
      let totalBudget: number | undefined;
      if (filters?.include_budget && filters?.fiscal_year_id) {
        try {
          const fy = await this.fiscalYearsService.findOne(filters.fiscal_year_id, organizationId);
          if (fy?.start_date) {
            const calYear = new Date(fy.start_date).getFullYear();
            let bq = client
              .from('cost_center_budgets')
              .select('account_id, budget_amount, cost_center_id')
              .eq('fiscal_year', calYear);
            if (filters.cost_center_id) {
              bq = bq.eq('cost_center_id', filters.cost_center_id);
            }
            const { data: budgets, error: budgetsError } = await bq;
            if (budgetsError) {
              this.logger.warn(`Failed to fetch budgets: ${budgetsError.message}`);
            } else {
              const budgetByAccount = new Map<string, number>();
              for (const b of budgets || []) {
                if (!b.account_id) continue;
                budgetByAccount.set(
                  b.account_id,
                  (budgetByAccount.get(b.account_id) || 0) + Number(b.budget_amount || 0),
                );
              }
              for (const r of filtered) {
                const budget = budgetByAccount.get(r.account_id);
                if (budget !== undefined) {
                  r.budget_amount = this.round2(budget);
                  const variance = this.round2(r.display_amount - budget);
                  r.variance = variance;
                  r.variance_percentage = Math.abs(budget) < 0.005
                    ? null
                    : this.round2((variance / Math.abs(budget)) * 100);
                } else {
                  r.budget_amount = null;
                  r.variance = null;
                  r.variance_percentage = null;
                }
              }
              totalBudget = this.round2(
                filtered.reduce((s, r) => s + (r.budget_amount || 0), 0),
              );
            }
          }
        } catch (e) {
          this.logger.warn(`Budget merge skipped: ${(e as Error).message}`);
        }
      }

      const directIncome = filtered.filter(r => r.section === 'direct_income');
      const otherIncome = filtered.filter(r => r.section === 'other_income');
      const cogs = filtered.filter(r => r.section === 'cogs');
      const indirectExpenses = filtered.filter(r => r.section === 'indirect_expense');
      const otherExpenses = filtered.filter(r => r.section === 'other_expense');

      const sumOf = (arr: ProfitLossRow[]) => arr.reduce((s, r) => s + r.display_amount, 0);

      const totalDirectIncome = sumOf(directIncome);
      const totalOtherIncome = sumOf(otherIncome);
      const totalIncome = totalDirectIncome + totalOtherIncome;
      const totalCogs = sumOf(cogs);
      const totalIndirectExpenses = sumOf(indirectExpenses);
      const totalOtherExpenses = sumOf(otherExpenses);
      const totalExpenses = totalCogs + totalIndirectExpenses + totalOtherExpenses;
      const grossProfit = totalDirectIncome - totalCogs;
      const operatingProfit = grossProfit - totalIndirectExpenses;
      const netIncome = operatingProfit + totalOtherIncome - totalOtherExpenses;

      // EBITDA = operating profit + depreciation/amortization (best-effort via name/subtype)
      const depAmortFromExpenses = (cogs.concat(indirectExpenses, otherExpenses))
        .filter(r => {
          const hay = `${norm(r.account_subtype)} ${norm(r.account_name)}`;
          return hay.includes('depreciation') || hay.includes('amortization');
        })
        .reduce((s, r) => s + r.display_amount, 0);
      const ebitda = operatingProfit + depAmortFromExpenses;

      return {
        start_date: startDate,
        end_date: end,
        direct_income: directIncome,
        other_income: otherIncome,
        cogs,
        indirect_expenses: indirectExpenses,
        other_expenses: otherExpenses,
        totals: {
          total_direct_income: totalDirectIncome,
          total_other_income: totalOtherIncome,
          total_income: totalIncome,
          total_cogs: totalCogs,
          total_indirect_expenses: totalIndirectExpenses,
          total_other_expenses: totalOtherExpenses,
          total_expenses: totalExpenses,
          gross_profit: grossProfit,
          operating_profit: operatingProfit,
          net_income: netIncome,
          ebitda,
          ...(totalBudget !== undefined
            ? {
                total_budget: totalBudget,
                total_variance: this.round2(netIncome - totalBudget),
              }
            : {}),
        },
      };
    } catch (error) {
      this.logger.error('Error in getProfitLoss:', error);
      throw error;
    }
  }

  /**
   * Get a P&L report alongside a comparison period (previous_period or previous_year).
   */
  async getProfitLossComparison(
    organizationId: string,
    startDate: string,
    endDate: string,
    compareWith: 'previous_period' | 'previous_year',
    filters?: ProfitLossFilters,
  ): Promise<ProfitLossComparisonReport> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Both start_date and end_date are required for comparison');
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayMs = 86400000;

    let cmpStart: Date;
    let cmpEnd: Date;
    if (compareWith === 'previous_year') {
      cmpStart = new Date(start);
      cmpStart.setFullYear(cmpStart.getFullYear() - 1);
      cmpEnd = new Date(end);
      cmpEnd.setFullYear(cmpEnd.getFullYear() - 1);
    } else {
      // previous_period: same length immediately preceding
      const lengthMs = end.getTime() - start.getTime();
      cmpEnd = new Date(start.getTime() - dayMs);
      cmpStart = new Date(cmpEnd.getTime() - lengthMs);
    }
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const [current, comparison] = await Promise.all([
      this.getProfitLoss(organizationId, startDate, endDate, filters),
      this.getProfitLoss(organizationId, fmt(cmpStart), fmt(cmpEnd), filters),
    ]);

    return { current, comparison, compare_with: compareWith };
  }

  /**
   * Get general ledger for a specific account
   */
  async getGeneralLedger(
    organizationId: string,
    accountId: string,
    startDate: string,
    endDate?: string,
  ): Promise<GeneralLedgerReport> {
    const client = this.databaseService.getAdminClient();
    const end = endDate || new Date().toISOString().split('T')[0];

    if (!startDate) {
      throw new BadRequestException('Start date is required for general ledger');
    }

    try {
      const { data: account, error: accountError } = await client
        .from('accounts')
        .select('id, code, name')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();

      if (accountError || !account) {
        throw new BadRequestException(`Account not found: ${accountId}`);
      }

      const { data: items, error: itemsError } = await client
        .from('journal_items')
        .select(`
          debit,
          credit,
          description,
          journal_entries!inner(
            id,
            entry_number,
            entry_date,
            remarks,
            reference_type,
            reference_number,
            status,
            organization_id
          )
        `)
        .eq('account_id', accountId)
        .eq('journal_entries.organization_id', organizationId)
        .eq('journal_entries.status', 'posted')
        .gte('journal_entries.entry_date', startDate)
        .lte('journal_entries.entry_date', end)
        .order('journal_entries(entry_date)', { ascending: true });

      if (itemsError) {
        this.logger.error('Error fetching ledger entries:', itemsError);
        throw new BadRequestException(`Failed to fetch ledger entries: ${itemsError.message}`);
      }

      const openingBalanceDate = new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0];
      const openingBalanceMap = await this.getAccountBalances(organizationId, openingBalanceDate);
      const openingBal = openingBalanceMap.get(accountId) || { totalDebit: 0, totalCredit: 0 };
      const openingBalance = openingBal.totalDebit - openingBal.totalCredit;

      let runningBalance = openingBalance;
      const entries: GeneralLedgerRow[] = (items || []).map(item => {
        const jeData = item.journal_entries;
        const je = Array.isArray(jeData) ? jeData[0] : jeData;
        const debit = Number(item.debit || 0);
        const credit = Number(item.credit || 0);
        runningBalance += debit - credit;
        return {
          entry_date: je?.entry_date || '',
          entry_number: je?.entry_number || '',
          journal_entry_id: je?.id || '',
          description: item.description || je?.remarks || '',
          reference_type: je?.reference_type || null,
          reference_number: je?.reference_number || null,
          debit,
          credit,
          running_balance: runningBalance,
        };
      });

      const closingBalance = entries.length > 0 ? entries[entries.length - 1].running_balance : openingBalance;

      return {
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        start_date: startDate,
        end_date: end,
        opening_balance: openingBalance,
        entries,
        closing_balance: closingBalance,
      };
    } catch (error) {
      this.logger.error('Error in getGeneralLedger:', error);
      throw error;
    }
  }

  /**
   * Get account summary by type
   */
  async getAccountSummary(organizationId: string, asOfDate?: string): Promise<AccountSummaryRow[]> {
    const client = this.databaseService.getAdminClient();
    const date = asOfDate || new Date().toISOString().split('T')[0];

    try {
      const { data: accounts, error: accountsError } = await client
        .from('accounts')
        .select('id, account_type')
        .eq('organization_id', organizationId)
        .eq('is_group', false);

      if (accountsError) {
        this.logger.error('Error fetching accounts:', accountsError);
        throw new BadRequestException(`Failed to fetch accounts: ${accountsError.message}`);
      }

      const balanceMap = await this.getAccountBalances(organizationId, date);

      const summaryMap = new Map<string, { count: number; debit: number; credit: number }>();
      for (const acc of accounts || []) {
        const bal = balanceMap.get(acc.id) || { totalDebit: 0, totalCredit: 0 };
        const curr = summaryMap.get(acc.account_type) || { count: 0, debit: 0, credit: 0 };
        summaryMap.set(acc.account_type, {
          count: curr.count + 1,
          debit: curr.debit + bal.totalDebit,
          credit: curr.credit + bal.totalCredit,
        });
      }

      const result: AccountSummaryRow[] = [];
      summaryMap.forEach((val, key) => {
        result.push({
          account_type: key,
          total_accounts: val.count,
          total_debit: val.debit,
          total_credit: val.credit,
          net_balance: val.debit - val.credit,
        });
      });

      return result.sort((a, b) => a.account_type.localeCompare(b.account_type));
    } catch (error) {
      this.logger.error('Error in getAccountSummary:', error);
      throw error;
    }
  }

  /**
   * Get single account balance
   */
  async getAccountBalance(
    organizationId: string,
    accountId: string,
    asOfDate?: string,
  ) {
    const client = this.databaseService.getAdminClient();
    const date = asOfDate || new Date().toISOString().split('T')[0];

    try {
      const { data: account, error: accountError } = await client
        .from('accounts')
        .select('id, code, name, account_type')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();

      if (accountError || !account) {
        return null;
      }

      const balanceMap = await this.getAccountBalances(organizationId, date);
      const bal = balanceMap.get(accountId) || { totalDebit: 0, totalCredit: 0 };

      return {
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        account_type: account.account_type,
        total_debit: bal.totalDebit,
        total_credit: bal.totalCredit,
        balance: bal.totalDebit - bal.totalCredit,
      };
    } catch (error) {
      this.logger.error('Error in getAccountBalance:', error);
      throw error;
    }
  }

  /**
   * Get Cash Flow Statement
   * Uses the indirect method: start with net income, adjust for non-cash items and working capital changes
   */
  async getCashFlow(
    organizationId: string,
    startDate: string,
    endDate?: string,
  ): Promise<CashFlowReport> {
    const end = endDate || new Date().toISOString().split('T')[0];

    if (!startDate) {
      throw new BadRequestException('Start date is required for cash flow statement');
    }

    try {
      // Get P&L for the period to get net income
      const plReport = await this.getProfitLoss(organizationId, startDate, end);
      const netIncome = plReport.totals.net_income;

      // Calculate period lengths for comparison
      const startDateObj = new Date(startDate);
      const priorEndDate = new Date(startDateObj.getTime() - 86400000); // day before start
      const priorEndStr = priorEndDate.toISOString().split('T')[0];

      // Get balance sheet at end of period
      const bsEnd = await this.getBalanceSheet(organizationId, end);

      // Get balance sheet at start of period (prior period end)
      const bsStart = await this.getBalanceSheet(organizationId, priorEndStr);

      // Calculate changes in working capital accounts
      const getAccountBalanceBySubtype = (
        rows: BalanceSheetRow[],
        subtypes: string[]
      ): number => {
        return rows
          .filter(r => subtypes.includes(r.account_subtype || ''))
          .reduce((sum, r) => sum + r.display_balance, 0);
      };

      const getAccountBalanceByType = (
        rows: BalanceSheetRow[],
        types: string[]
      ): number => {
        const wanted = types.map(norm);
        return rows
          .filter(r => wanted.includes(norm(r.account_type)))
          .reduce((sum, r) => sum + r.display_balance, 0);
      };

      // Working capital changes (negative change = cash inflow for assets, positive = cash inflow for liabilities)
      const arSubtypes = ['accounts_receivable', 'trade_receivable'];
      const apSubtypes = ['accounts_payable', 'trade_payable'];
      const inventorySubtypes = ['inventory', 'stock'];

      const arEnd = getAccountBalanceBySubtype(bsEnd.assets, arSubtypes);
      const arStart = getAccountBalanceBySubtype(bsStart.assets, arSubtypes);
      const changesInAR = -(arEnd - arStart); // Decrease in AR = cash inflow

      const apEnd = getAccountBalanceBySubtype(bsEnd.liabilities, apSubtypes);
      const apStart = getAccountBalanceBySubtype(bsStart.liabilities, apSubtypes);
      const changesInAP = apEnd - apStart; // Increase in AP = cash inflow

      const invEnd = getAccountBalanceBySubtype(bsEnd.assets, inventorySubtypes);
      const invStart = getAccountBalanceBySubtype(bsStart.assets, inventorySubtypes);
      const changesInInventory = -(invEnd - invStart); // Decrease in inventory = cash inflow

      // Depreciation is a non-cash expense - look for accumulated depreciation
      const depreciationEnd = getAccountBalanceBySubtype(bsEnd.assets, ['accumulated_depreciation']);
      const depreciationStart = getAccountBalanceBySubtype(bsStart.assets, ['accumulated_depreciation']);
      const depreciation = Math.abs(depreciationEnd - depreciationStart);

      // Operating activities
      const operating: CashFlowOperating = {
        net_income: netIncome,
        depreciation,
        changes_in_ar: changesInAR,
        changes_in_ap: changesInAP,
        changes_in_inventory: changesInInventory,
        other_adjustments: 0,
        total: netIncome + depreciation + changesInAR + changesInAP + changesInInventory,
      };

      // Investing activities - changes in fixed assets
      const fixedAssetSubtypes = ['fixed_asset', 'property_plant_equipment', 'long_term_asset'];
      const fixedAssetsEnd = getAccountBalanceBySubtype(bsEnd.assets, fixedAssetSubtypes);
      const fixedAssetsStart = getAccountBalanceBySubtype(bsStart.assets, fixedAssetSubtypes);
      const fixedAssetChange = fixedAssetsEnd - fixedAssetsStart;

      const investing: CashFlowInvesting = {
        fixed_asset_purchases: fixedAssetChange > 0 ? -fixedAssetChange : 0,
        fixed_asset_sales: fixedAssetChange < 0 ? Math.abs(fixedAssetChange) : 0,
        total: -fixedAssetChange,
      };

      // Financing activities - changes in debt and equity
      const longTermDebtSubtypes = ['long_term_debt', 'term_loan', 'bonds_payable'];
      const debtEnd = getAccountBalanceBySubtype(bsEnd.liabilities, longTermDebtSubtypes);
      const debtStart = getAccountBalanceBySubtype(bsStart.liabilities, longTermDebtSubtypes);
      const debtChange = debtEnd - debtStart;

      const equityEnd = bsEnd.totals.total_equity;
      const equityStart = bsStart.totals.total_equity;
      const equityChange = equityEnd - equityStart - netIncome; // Exclude retained earnings from net income

      const financing: CashFlowFinancing = {
        debt_proceeds: debtChange > 0 ? debtChange : 0,
        debt_repayments: debtChange < 0 ? Math.abs(debtChange) : 0,
        equity_changes: equityChange,
        dividends: 0, // Would need separate tracking
        total: debtChange + equityChange,
      };

      const netChange = operating.total + investing.total + financing.total;

      // Cash balances — derive from accounts whose name/subtype indicates cash or bank.
      // Previous fallback (total_assets * 0.1) was fabricated; if no cash accounts exist, return 0.
      const cashSubtypes = ['cash', 'bank', 'cash_equivalent', 'money_market', 'Cash', 'Bank'];
      const isCashAccount = (r: BalanceSheetRow): boolean => {
        const sub = norm(r.account_subtype);
        const name = norm(r.account_name);
        return cashSubtypes.some(c => norm(c) === sub) ||
          name.includes('cash') || name.includes('bank') || name.includes('caisse') || name.includes('banque');
      };
      const openingCash = bsStart.assets.filter(isCashAccount).reduce((s, r) => s + r.display_balance, 0);
      const closingCash = bsEnd.assets.filter(isCashAccount).reduce((s, r) => s + r.display_balance, 0);

      return {
        start_date: startDate,
        end_date: end,
        operating,
        investing,
        financing,
        net_change: netChange,
        opening_cash: openingCash,
        closing_cash: closingCash,
      };
    } catch (error) {
      this.logger.error('Error in getCashFlow:', error);
      throw error;
    }
  }

  /**
   * Period Closing Voucher: post a year-end JE that zeroes out Income/Expense
   * accounts into the chosen Retained Earnings (Equity) account, and mark the
   * fiscal year status='closed'. Idempotent: refuses to re-close.
   */
  async closeFiscalYear(params: {
    organizationId: string;
    userId: string;
    fiscalYearId: string;
    retainedEarningsAccountId: string;
    closingDate?: string;
    remarks?: string;
  }): Promise<{ journalEntryId: string; entryNumber: string; netIncome: number }> {
    const { organizationId, userId, fiscalYearId, retainedEarningsAccountId, closingDate, remarks } = params;
    const supabase = this.databaseService.getAdminClient();

    // 1. Load fiscal year
    const fy = await this.fiscalYearsService.findOne(fiscalYearId, organizationId);
    if (!fy) {
      throw new BadRequestException('Fiscal year not found');
    }
    if (fy.status === 'closed') {
      throw new BadRequestException(`Fiscal year "${fy.name}" is already closed`);
    }

    // 2. Idempotency: existing closing entry?
    const { data: existingClosing, error: existingErr } = await supabase
      .from('journal_entries')
      .select('id, entry_number')
      .eq('organization_id', organizationId)
      .eq('entry_type', 'period_closing')
      .eq('reference_id', fiscalYearId)
      .maybeSingle();
    if (existingErr) {
      this.logger.warn(`Failed to check existing closing entry: ${existingErr.message}`);
    }
    if (existingClosing) {
      throw new BadRequestException(
        `Fiscal year already closed (entry: ${existingClosing.entry_number})`,
      );
    }

    // 3. Validate retained earnings account
    const { data: reAccount, error: reErr } = await supabase
      .from('accounts')
      .select('id, code, name, account_type, is_group')
      .eq('id', retainedEarningsAccountId)
      .eq('organization_id', organizationId)
      .single();
    if (reErr || !reAccount) {
      throw new BadRequestException('Retained Earnings account not found');
    }
    if (reAccount.is_group) {
      throw new BadRequestException('Retained Earnings account cannot be a group account');
    }
    if (norm(reAccount.account_type) !== EQUITY) {
      throw new BadRequestException('Retained Earnings account must be of type Equity');
    }

    // 4. Compute P&L for the fiscal year
    const pl = await this.getProfitLoss(organizationId, fy.start_date, fy.end_date, {
      fiscal_year_id: fiscalYearId,
    });
    const netIncome = this.round2(pl.totals.net_income);

    // 5. Build closing JE items.
    // For each Revenue account: debit balance = total_credit - total_debit
    // For each Expense account: credit balance = total_debit - total_credit
    const allPLRows = [
      ...pl.direct_income,
      ...pl.other_income,
      ...pl.cogs,
      ...pl.indirect_expenses,
      ...pl.other_expenses,
    ];

    const items: Array<{ account_id: string; debit: number; credit: number; description?: string }> = [];
    let sumDebit = 0;
    let sumCredit = 0;
    for (const row of allPLRows) {
      const isRevenue = norm(row.account_type) === REVENUE;
      const balance = this.round2(row.total_debit - row.total_credit);
      if (Math.abs(balance) < 0.005) continue;
      if (isRevenue) {
        // Normal credit balance => debit to close
        const amount = this.round2(row.total_credit - row.total_debit);
        if (Math.abs(amount) < 0.005) continue;
        if (amount > 0) {
          items.push({ account_id: row.account_id, debit: amount, credit: 0, description: `Close ${row.account_code}` });
          sumDebit += amount;
        } else {
          items.push({ account_id: row.account_id, debit: 0, credit: -amount, description: `Close ${row.account_code}` });
          sumCredit += -amount;
        }
      } else {
        // Expense — normal debit balance => credit to close
        const amount = this.round2(row.total_debit - row.total_credit);
        if (Math.abs(amount) < 0.005) continue;
        if (amount > 0) {
          items.push({ account_id: row.account_id, debit: 0, credit: amount, description: `Close ${row.account_code}` });
          sumCredit += amount;
        } else {
          items.push({ account_id: row.account_id, debit: -amount, credit: 0, description: `Close ${row.account_code}` });
          sumDebit += -amount;
        }
      }
    }

    // 6. Offsetting line on Retained Earnings to balance
    const diff = this.round2(sumDebit - sumCredit);
    if (Math.abs(diff) >= 0.005) {
      if (diff > 0) {
        items.push({
          account_id: retainedEarningsAccountId,
          debit: 0,
          credit: diff,
          description: 'Net income to retained earnings',
        });
        sumCredit += diff;
      } else {
        items.push({
          account_id: retainedEarningsAccountId,
          debit: -diff,
          credit: 0,
          description: 'Net loss to retained earnings',
        });
        sumDebit += -diff;
      }
    }

    if (items.length === 0) {
      throw new BadRequestException('No income or expense activity to close for this fiscal year');
    }

    const totalDebit = this.round2(sumDebit);
    const totalCredit = this.round2(sumCredit);
    if (Math.abs(totalDebit - totalCredit) >= 0.01) {
      throw new BadRequestException(
        `Closing entry not balanced: debits=${totalDebit}, credits=${totalCredit}`,
      );
    }

    const effectiveDate = closingDate || fy.end_date;
    const entryNumber = await this.sequencesService.generateJournalEntryNumber(organizationId);
    const now = new Date().toISOString();
    const description = `Period closing: ${fy.name}`;
    const remark = remarks || `Year-end closing voucher for fiscal year ${fy.name}. Net income: ${netIncome}`;

    const result = await this.databaseService.executeInPgTransaction(async (pgClient) => {
      // Lock fiscal year row
      const fyLock = await pgClient.query(
        `SELECT status FROM fiscal_years WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
        [fiscalYearId, organizationId],
      );
      if (fyLock.rowCount === 0) {
        throw new BadRequestException('Fiscal year not found');
      }
      if (fyLock.rows[0].status === 'closed') {
        throw new BadRequestException('Fiscal year already closed');
      }

      // Re-check no closing entry was created concurrently
      const dup = await pgClient.query(
        `SELECT id FROM journal_entries WHERE organization_id = $1 AND entry_type = 'period_closing' AND reference_id = $2 LIMIT 1`,
        [organizationId, fiscalYearId],
      );
      if ((dup.rowCount ?? 0) > 0) {
        throw new BadRequestException('Fiscal year already closed');
      }

      const jeRes = await pgClient.query(
        `INSERT INTO journal_entries (organization_id, entry_number, entry_date, entry_type, description, reference_type, reference_id, remarks, total_debit, total_credit, status, created_by, posted_by, posted_at, fiscal_year_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'posted', $11, $11, $12, $13) RETURNING id`,
        [
          organizationId,
          entryNumber,
          effectiveDate,
          'period_closing',
          description,
          'fiscal_year',
          fiscalYearId,
          remark,
          totalDebit,
          totalCredit,
          userId,
          now,
          fiscalYearId,
        ],
      );
      const journalEntryId = jeRes.rows[0].id;

      for (const it of items) {
        await pgClient.query(
          `INSERT INTO journal_items (journal_entry_id, account_id, debit, credit, description, fiscal_year_id, currency, exchange_rate, fc_debit, fc_credit)
           VALUES ($1, $2, $3, $4, $5, $6,
                   (SELECT currency_code FROM organizations WHERE id = $7),
                   1, $3, $4)`,
          [journalEntryId, it.account_id, it.debit, it.credit, it.description || null, fiscalYearId, organizationId],
        );
      }

      await pgClient.query(
        `UPDATE fiscal_years SET status = 'closed', is_current = false, closed_at = $1, closed_by = $2, closing_notes = COALESCE(closing_notes, $3), updated_at = $1 WHERE id = $4 AND organization_id = $5`,
        [now, userId, remark, fiscalYearId, organizationId],
      );

      return { journalEntryId };
    });

    this.logger.log(`Closed fiscal year ${fy.name} via JE ${entryNumber} (net income: ${netIncome})`);
    return { journalEntryId: result.journalEntryId, entryNumber, netIncome };
  }

  /**
   * Reverse a previous period closing voucher and reopen the fiscal year.
   */
  async reverseFiscalYearClose(
    organizationId: string,
    userId: string,
    fiscalYearId: string,
  ): Promise<{ reversalEntryId: string; reversalNumber: string }> {
    const supabase = this.databaseService.getAdminClient();

    const fy = await this.fiscalYearsService.findOne(fiscalYearId, organizationId);
    if (!fy) {
      throw new BadRequestException('Fiscal year not found');
    }
    if (fy.status !== 'closed') {
      throw new BadRequestException('Fiscal year is not closed');
    }

    const { data: closingEntry, error: closingErr } = await supabase
      .from('journal_entries')
      .select('id, entry_number, status')
      .eq('organization_id', organizationId)
      .eq('entry_type', 'period_closing')
      .eq('reference_id', fiscalYearId)
      .maybeSingle();

    if (closingErr || !closingEntry) {
      throw new BadRequestException('Closing journal entry not found for this fiscal year');
    }

    const reversal = await this.accountingAutomationService.createReversalEntry(
      organizationId,
      closingEntry.id,
      userId,
      `Reopen fiscal year ${fy.name}`,
    );

    // Reopen fiscal year
    const { error: updErr } = await supabase
      .from('fiscal_years')
      .update({
        status: 'open',
        closed_at: null,
        closed_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fiscalYearId)
      .eq('organization_id', organizationId);

    if (updErr) {
      throw new BadRequestException(`Failed to reopen fiscal year: ${updErr.message}`);
    }

    this.logger.log(`Reopened fiscal year ${fy.name} via reversal ${reversal.reversalNumber}`);
    return reversal;
  }
}
