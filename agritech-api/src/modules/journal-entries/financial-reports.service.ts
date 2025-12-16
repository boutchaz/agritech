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

@Injectable()
export class FinancialReportsService {
  private readonly logger = new Logger(FinancialReportsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get trial balance for all accounts
   */
  async getTrialBalance(organizationId: string, asOfDate?: string): Promise<TrialBalanceReport> {
    const supabaseClient = this.databaseService.getAdminClient();
    const date = asOfDate || new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabaseClient.rpc('get_trial_balance', {
        p_organization_id: organizationId,
        p_as_of_date: date,
      });

      if (error) {
        this.logger.error('Error fetching trial balance:', error);
        throw new BadRequestException(`Failed to fetch trial balance: ${error.message}`);
      }

      const accounts = (data || []) as TrialBalanceRow[];

      const totalDebit = accounts.reduce((sum, acc) => sum + Number(acc.debit_balance), 0);
      const totalCredit = accounts.reduce((sum, acc) => sum + Number(acc.credit_balance), 0);

      return {
        as_of_date: date,
        accounts,
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
    const supabaseClient = this.databaseService.getAdminClient();
    const date = asOfDate || new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabaseClient.rpc('get_balance_sheet', {
        p_organization_id: organizationId,
        p_as_of_date: date,
      });

      if (error) {
        this.logger.error('Error fetching balance sheet:', error);
        throw new BadRequestException(`Failed to fetch balance sheet: ${error.message}`);
      }

      const rows = (data || []) as BalanceSheetRow[];

      const assets = rows.filter(r => r.section === 'assets');
      const liabilities = rows.filter(r => r.section === 'liabilities');
      const equity = rows.filter(r => r.section === 'equity');

      const totalAssets = assets.reduce((sum, acc) => sum + Number(acc.display_balance), 0);
      const totalLiabilities = liabilities.reduce((sum, acc) => sum + Number(acc.display_balance), 0);
      const totalEquity = equity.reduce((sum, acc) => sum + Number(acc.display_balance), 0);

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
    const supabaseClient = this.databaseService.getAdminClient();
    const end = endDate || new Date().toISOString().split('T')[0];

    if (!startDate) {
      throw new BadRequestException('Start date is required for profit and loss report');
    }

    try {
      const { data, error } = await supabaseClient.rpc('get_profit_loss', {
        p_organization_id: organizationId,
        p_start_date: startDate,
        p_end_date: end,
      });

      if (error) {
        this.logger.error('Error fetching profit/loss:', error);
        throw new BadRequestException(`Failed to fetch profit/loss: ${error.message}`);
      }

      const rows = (data || []) as ProfitLossRow[];

      const revenue = rows.filter(r => r.section === 'revenue');
      const expenses = rows.filter(r => r.section === 'expenses');

      const totalRevenue = revenue.reduce((sum, acc) => sum + Number(acc.display_amount), 0);
      const totalExpenses = expenses.reduce((sum, acc) => sum + Number(acc.display_amount), 0);

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
    const supabaseClient = this.databaseService.getAdminClient();
    const end = endDate || new Date().toISOString().split('T')[0];

    if (!startDate) {
      throw new BadRequestException('Start date is required for general ledger');
    }

    try {
      // First get account info
      const { data: account, error: accountError } = await supabaseClient
        .from('accounts')
        .select('id, code, name')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();

      if (accountError || !account) {
        throw new BadRequestException(`Account not found: ${accountId}`);
      }

      // Get ledger entries
      const { data, error } = await supabaseClient.rpc('get_general_ledger', {
        p_organization_id: organizationId,
        p_account_id: accountId,
        p_start_date: startDate,
        p_end_date: end,
      });

      if (error) {
        this.logger.error('Error fetching general ledger:', error);
        throw new BadRequestException(`Failed to fetch general ledger: ${error.message}`);
      }

      const entries = (data || []) as GeneralLedgerRow[];

      // Calculate opening balance (balance before start date)
      const { data: openingData } = await supabaseClient.rpc('get_account_balance', {
        p_organization_id: organizationId,
        p_account_id: accountId,
        p_as_of_date: new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0],
      });

      const openingBalance = openingData?.[0]?.balance || 0;
      const closingBalance = entries.length > 0
        ? entries[entries.length - 1].running_balance
        : openingBalance;

      return {
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        start_date: startDate,
        end_date: end,
        opening_balance: Number(openingBalance),
        entries,
        closing_balance: Number(closingBalance),
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
    const supabaseClient = this.databaseService.getAdminClient();
    const date = asOfDate || new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabaseClient.rpc('get_account_summary', {
        p_organization_id: organizationId,
        p_as_of_date: date,
      });

      if (error) {
        this.logger.error('Error fetching account summary:', error);
        throw new BadRequestException(`Failed to fetch account summary: ${error.message}`);
      }

      return (data || []) as AccountSummaryRow[];
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
    const supabaseClient = this.databaseService.getAdminClient();
    const date = asOfDate || new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabaseClient.rpc('get_account_balance', {
        p_organization_id: organizationId,
        p_account_id: accountId,
        p_as_of_date: date,
      });

      if (error) {
        this.logger.error('Error fetching account balance:', error);
        throw new BadRequestException(`Failed to fetch account balance: ${error.message}`);
      }

      return data?.[0] || null;
    } catch (error) {
      this.logger.error('Error in getAccountBalance:', error);
      throw error;
    }
  }
}
