import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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

export interface ProfitLossRow {
  section: 'revenue' | 'expenses';
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  total_debit: number;
  total_credit: number;
  balance: number;
  display_amount: number;
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
  revenue: ProfitLossRow[];
  expenses: ProfitLossRow[];
  totals: {
    total_revenue: number;
    total_expenses: number;
    net_income: number;
  };
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

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Helper: Get aggregated balances for all accounts up to a date
   */
  private async getAccountBalances(
    organizationId: string,
    asOfDate: string,
    startDate?: string,
  ): Promise<Map<string, AccountBalance>> {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('journal_items')
      .select('account_id, debit, credit, journal_entries!inner(status, entry_date, organization_id)')
      .eq('journal_entries.organization_id', organizationId)
      .eq('journal_entries.status', 'posted')
      .lte('journal_entries.entry_date', asOfDate);

    if (startDate) {
      query = query.gte('journal_entries.entry_date', startDate);
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
      const { data: accounts, error: accountsError } = await client
        .from('accounts')
        .select('id, code, name, account_type, account_subtype')
        .eq('organization_id', organizationId)
        .eq('is_group', false)
        .in('account_type', ['asset', 'liability', 'equity'])
        .order('code');

      if (accountsError) {
        this.logger.error('Error fetching accounts:', accountsError);
        throw new BadRequestException(`Failed to fetch accounts: ${accountsError.message}`);
      }

      const balanceMap = await this.getAccountBalances(organizationId, date);

      const mapToSection = (type: string): 'assets' | 'liabilities' | 'equity' => {
        if (type === 'asset') return 'assets';
        if (type === 'liability') return 'liabilities';
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
   * Get profit and loss statement
   */
  async getProfitLoss(
    organizationId: string,
    startDate: string,
    endDate?: string,
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
        .in('account_type', ['revenue', 'expense'])
        .order('code');

      if (accountsError) {
        this.logger.error('Error fetching accounts:', accountsError);
        throw new BadRequestException(`Failed to fetch accounts: ${accountsError.message}`);
      }

      const balanceMap = await this.getAccountBalances(organizationId, end, startDate);

      const rows: ProfitLossRow[] = (accounts || []).map(acc => {
        const bal = balanceMap.get(acc.id) || { totalDebit: 0, totalCredit: 0 };
        const balance = bal.totalDebit - bal.totalCredit;
        const section: 'revenue' | 'expenses' = acc.account_type === 'revenue' ? 'revenue' : 'expenses';
        const displayAmount = section === 'revenue' ? -balance : balance;
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

      const revenue = rows.filter(r => r.section === 'revenue');
      const expenses = rows.filter(r => r.section === 'expenses');

      const totalRevenue = revenue.reduce((sum, acc) => sum + acc.display_amount, 0);
      const totalExpenses = expenses.reduce((sum, acc) => sum + acc.display_amount, 0);

      return {
        start_date: startDate,
        end_date: end,
        revenue,
        expenses,
        totals: {
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          net_income: totalRevenue - totalExpenses,
        },
      };
    } catch (error) {
      this.logger.error('Error in getProfitLoss:', error);
      throw error;
    }
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
        return rows
          .filter(r => types.includes(r.account_type))
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

      // Cash balances
      const cashSubtypes = ['cash', 'bank', 'cash_equivalent', 'money_market'];
      const openingCash = getAccountBalanceBySubtype(bsStart.assets, cashSubtypes) ||
        getAccountBalanceByType(bsStart.assets, ['asset']) * 0.1; // Fallback estimate
      const closingCash = getAccountBalanceBySubtype(bsEnd.assets, cashSubtypes) ||
        getAccountBalanceByType(bsEnd.assets, ['asset']) * 0.1; // Fallback estimate

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
}
