import { apiClient } from '../api-client';

// Types
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
  compare_with?: 'previous_period' | 'previous_year';
  /** Phase 4c: 'accrual' (default) or 'cash'. */
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

export interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
  normal_balance: 'debit' | 'credit';
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

export interface ConsolidatedProfitLossRow extends ProfitLossRow {
  by_org?: Array<{ organization_id: string; organization_name: string; amount: number }>;
}

export interface ConsolidatedProfitLossReport {
  start_date: string;
  end_date: string;
  direct_income: ConsolidatedProfitLossRow[];
  other_income: ConsolidatedProfitLossRow[];
  cogs: ConsolidatedProfitLossRow[];
  indirect_expenses: ConsolidatedProfitLossRow[];
  other_expenses: ConsolidatedProfitLossRow[];
  totals: ProfitLossReport['totals'];
  group_id: string;
  group_name: string;
  group_base_currency: string;
  member_organizations: Array<{
    id: string;
    name: string;
    currency: string;
    rate_used: number;
  }>;
  eliminations: Array<{ account_code: string; amount: number }>;
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

// API Client
export interface AgedInvoice {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  party_id: string;
  party_name: string;
  grand_total: number;
  outstanding_amount: number;
  days_overdue: number;
  age_bucket: 'current' | '1-30' | '31-60' | '61-90' | 'over-90';
}

export interface AgedReport {
  as_of_date: string;
  invoices: AgedInvoice[];
  summary: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
    total: number;
  };
  by_party: Array<{
    party_id: string;
    party_name: string;
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
    total: number;
  }>;
}

export const financialReportsApi = {
  /**
   * Get trial balance report
   */
  async getTrialBalance(asOfDate?: string, organizationId?: string, fiscalYearId?: string): Promise<TrialBalanceReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    if (fiscalYearId) params.append('fiscal_year_id', fiscalYearId);
    const query = params.toString();
    return apiClient.get<TrialBalanceReport>(
      `/api/v1/financial-reports/trial-balance${query ? `?${query}` : ''}`,
      {},
      organizationId
    );
  },

  /**
   * Get balance sheet report
   */
  async getBalanceSheet(asOfDate?: string, organizationId?: string, fiscalYearId?: string): Promise<BalanceSheetReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    if (fiscalYearId) params.append('fiscal_year_id', fiscalYearId);
    const query = params.toString();
    return apiClient.get<BalanceSheetReport>(
      `/api/v1/financial-reports/balance-sheet${query ? `?${query}` : ''}`,
      {},
      organizationId
    );
  },

  /**
   * Get profit and loss statement (no comparison).
   */
  async getProfitLoss(
    startDate?: string,
    endDate?: string,
    organizationId?: string,
    fiscalYearId?: string,
    filters?: Omit<ProfitLossFilters, 'compare_with' | 'fiscal_year_id'>,
  ): Promise<ProfitLossReport> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (fiscalYearId) params.append('fiscal_year_id', fiscalYearId);
    if (filters?.cost_center_id) params.append('cost_center_id', filters.cost_center_id);
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.parcel_id) params.append('parcel_id', filters.parcel_id);
    if (filters?.include_zero_balances) params.append('include_zero_balances', 'true');
    if (filters?.include_budget) params.append('include_budget', 'true');
    if (filters?.include_by_currency) params.append('include_by_currency', 'true');
    if (filters?.basis) params.append('basis', filters.basis);
    return apiClient.get<ProfitLossReport>(
      `/api/v1/financial-reports/profit-loss?${params.toString()}`,
      {},
      organizationId
    );
  },

  /**
   * Get profit and loss statement with a comparison period.
   */
  async getProfitLossComparison(
    startDate: string,
    endDate: string,
    compareWith: 'previous_period' | 'previous_year',
    organizationId?: string,
    fiscalYearId?: string,
    filters?: Omit<ProfitLossFilters, 'compare_with' | 'fiscal_year_id'>,
  ): Promise<ProfitLossComparisonReport> {
    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    params.append('compare_with', compareWith);
    if (fiscalYearId) params.append('fiscal_year_id', fiscalYearId);
    if (filters?.cost_center_id) params.append('cost_center_id', filters.cost_center_id);
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.parcel_id) params.append('parcel_id', filters.parcel_id);
    if (filters?.include_zero_balances) params.append('include_zero_balances', 'true');
    if (filters?.basis) params.append('basis', filters.basis);
    return apiClient.get<ProfitLossComparisonReport>(
      `/api/v1/financial-reports/profit-loss?${params.toString()}`,
      {},
      organizationId
    );
  },

  /**
   * Get general ledger for a specific account
   */
  async getGeneralLedger(
    accountId: string,
    startDate?: string,
    endDate?: string,
    organizationId?: string,
    fiscalYearId?: string,
  ): Promise<GeneralLedgerReport> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (fiscalYearId) params.append('fiscal_year_id', fiscalYearId);
    return apiClient.get<GeneralLedgerReport>(
      `/api/v1/financial-reports/general-ledger/${accountId}?${params.toString()}`,
      {},
      organizationId
    );
  },

  /**
   * Get account summary by type
   */
  async getAccountSummary(asOfDate?: string, organizationId?: string, fiscalYearId?: string): Promise<AccountSummaryRow[]> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    if (fiscalYearId) params.append('fiscal_year_id', fiscalYearId);
    const query = params.toString();
    return apiClient.get<AccountSummaryRow[]>(
      `/api/v1/financial-reports/account-summary${query ? `?${query}` : ''}`,
      {},
      organizationId
    );
  },

  /**
   * Get balance for a specific account
   */
  async getAccountBalance(accountId: string, asOfDate?: string, organizationId?: string, fiscalYearId?: string): Promise<AccountBalance | null> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    if (fiscalYearId) params.append('fiscal_year_id', fiscalYearId);
    const query = params.toString();
    return apiClient.get<AccountBalance | null>(
      `/api/v1/financial-reports/account-balance/${accountId}${query ? `?${query}` : ''}`,
      {},
      organizationId
    );
  },

  async getAgedReceivables(asOfDate?: string, organizationId?: string): Promise<AgedReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    const query = params.toString();
    return apiClient.get<AgedReport>(
      `/api/v1/financial-reports/aged-receivables${query ? `?${query}` : ''}`,
      {},
      organizationId
    );
  },

  async getAgedPayables(asOfDate?: string, organizationId?: string): Promise<AgedReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    const query = params.toString();
    return apiClient.get<AgedReport>(
      `/api/v1/financial-reports/aged-payables${query ? `?${query}` : ''}`,
      {},
      organizationId
    );
  },

  async closeFiscalYear(
    body: {
      fiscal_year_id: string;
      retained_earnings_account_id: string;
      closing_date?: string;
      remarks?: string;
    },
    organizationId?: string,
  ): Promise<{ journalEntryId: string; entryNumber: string; netIncome: number }> {
    return apiClient.post(
      `/api/v1/financial-reports/close-fiscal-year`,
      body,
      {},
      organizationId,
    );
  },

  async reopenFiscalYear(
    fiscalYearId: string,
    organizationId?: string,
  ): Promise<{ reversalEntryId: string; reversalNumber: string }> {
    return apiClient.post(
      `/api/v1/financial-reports/reopen-fiscal-year`,
      { fiscal_year_id: fiscalYearId },
      {},
      organizationId,
    );
  },

  async fxRevaluate(
    body: { as_of_date: string; remarks?: string; base_currency?: string },
    organizationId?: string,
  ): Promise<{
    journalEntryId: string;
    entryNumber: string;
    netGainLoss: number;
    revaluedAccounts: number;
  }> {
    return apiClient.post(
      `/api/v1/financial-reports/fx-revaluate`,
      body,
      {},
      organizationId,
    );
  },

  async fxRevaluateReverse(
    body: { as_of_date: string; reason?: string },
    organizationId?: string,
  ): Promise<{ reversalEntryId: string; reversalNumber: string }> {
    return apiClient.post(
      `/api/v1/financial-reports/fx-revaluate/reverse`,
      body,
      {},
      organizationId,
    );
  },

  /**
   * Phase 4f: consolidated P&L across an organization group.
   */
  async getConsolidatedProfitLoss(
    params: {
      groupId: string;
      start: string;
      end: string;
      basis?: 'accrual' | 'cash';
      include_zero_balances?: boolean;
      include_eliminations?: boolean;
    },
    organizationId?: string,
  ): Promise<ConsolidatedProfitLossReport> {
    const qs = new URLSearchParams();
    qs.append('group_id', params.groupId);
    qs.append('start', params.start);
    qs.append('end', params.end);
    if (params.basis) qs.append('basis', params.basis);
    if (params.include_zero_balances) qs.append('include_zero_balances', 'true');
    if (params.include_eliminations === false) qs.append('include_eliminations', 'false');
    return apiClient.get<ConsolidatedProfitLossReport>(
      `/api/v1/financial-reports/consolidated-profit-loss?${qs.toString()}`,
      {},
      organizationId,
    );
  },

  /**
   * Get cash flow statement
   */
  async getCashFlow(startDate?: string, endDate?: string, organizationId?: string, fiscalYearId?: string): Promise<CashFlowReport> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (fiscalYearId) params.append('fiscal_year_id', fiscalYearId);
    return apiClient.get<CashFlowReport>(
      `/api/v1/financial-reports/cash-flow?${params.toString()}`,
      {},
      organizationId
    );
  },
};
