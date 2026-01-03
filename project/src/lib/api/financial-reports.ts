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
  async getTrialBalance(asOfDate?: string): Promise<TrialBalanceReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    const query = params.toString();
    return apiClient.get<TrialBalanceReport>(
      `/api/v1/financial-reports/trial-balance${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get balance sheet report
   */
  async getBalanceSheet(asOfDate?: string): Promise<BalanceSheetReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    const query = params.toString();
    return apiClient.get<BalanceSheetReport>(
      `/api/v1/financial-reports/balance-sheet${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get profit and loss statement
   */
  async getProfitLoss(startDate: string, endDate?: string): Promise<ProfitLossReport> {
    const params = new URLSearchParams({ start_date: startDate });
    if (endDate) params.append('end_date', endDate);
    return apiClient.get<ProfitLossReport>(
      `/api/v1/financial-reports/profit-loss?${params.toString()}`
    );
  },

  /**
   * Get general ledger for a specific account
   */
  async getGeneralLedger(
    accountId: string,
    startDate: string,
    endDate?: string
  ): Promise<GeneralLedgerReport> {
    const params = new URLSearchParams({ start_date: startDate });
    if (endDate) params.append('end_date', endDate);
    return apiClient.get<GeneralLedgerReport>(
      `/api/v1/financial-reports/general-ledger/${accountId}?${params.toString()}`
    );
  },

  /**
   * Get account summary by type
   */
  async getAccountSummary(asOfDate?: string): Promise<AccountSummaryRow[]> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    const query = params.toString();
    return apiClient.get<AccountSummaryRow[]>(
      `/api/v1/financial-reports/account-summary${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get balance for a specific account
   */
  async getAccountBalance(accountId: string, asOfDate?: string): Promise<AccountBalance | null> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    const query = params.toString();
    return apiClient.get<AccountBalance | null>(
      `/api/v1/financial-reports/account-balance/${accountId}${query ? `?${query}` : ''}`
    );
  },

  async getAgedReceivables(asOfDate?: string): Promise<AgedReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    const query = params.toString();
    return apiClient.get<AgedReport>(
      `/api/v1/financial-reports/aged-receivables${query ? `?${query}` : ''}`
    );
  },

  async getAgedPayables(asOfDate?: string): Promise<AgedReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append('as_of_date', asOfDate);
    const query = params.toString();
    return apiClient.get<AgedReport>(
      `/api/v1/financial-reports/aged-payables${query ? `?${query}` : ''}`
    );
  },
};
