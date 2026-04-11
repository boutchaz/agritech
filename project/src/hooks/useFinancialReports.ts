import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { financialReportsApi } from '../lib/api/financial-reports';

// Re-export types for convenience
export type {
  TrialBalanceReport,
  BalanceSheetReport,
  ProfitLossReport,
  GeneralLedgerReport,
  AccountSummaryRow,
  AccountBalance,
  TrialBalanceRow,
  BalanceSheetRow,
  ProfitLossRow,
  GeneralLedgerRow,
  CashFlowReport,
  CashFlowOperating,
  CashFlowInvesting,
  CashFlowFinancing,
} from '../lib/api/financial-reports';

/**
 * Hook to fetch trial balance report
 */
export function useTrialBalance(asOfDate?: string, fiscalYearId?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'trial-balance', currentOrganization?.id, asOfDate, fiscalYearId],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return financialReportsApi.getTrialBalance(asOfDate, currentOrganization.id, fiscalYearId);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch balance sheet report
 */
export function useBalanceSheet(asOfDate?: string, fiscalYearId?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'balance-sheet', currentOrganization?.id, asOfDate, fiscalYearId],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return financialReportsApi.getBalanceSheet(asOfDate, currentOrganization.id, fiscalYearId);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch profit and loss statement
 */
export function useProfitLoss(startDate: string | undefined, endDate?: string, fiscalYearId?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'profit-loss', currentOrganization?.id, startDate, endDate, fiscalYearId],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return financialReportsApi.getProfitLoss(startDate, endDate, currentOrganization.id, fiscalYearId);
    },
    enabled: !!currentOrganization?.id && (!!startDate || !!fiscalYearId),
  });
}

/**
 * Hook to fetch general ledger for a specific account
 */
export function useGeneralLedger(
  accountId: string | undefined,
  startDate: string | undefined,
  endDate?: string,
  fiscalYearId?: string,
) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'general-ledger', currentOrganization?.id, accountId, startDate, endDate, fiscalYearId],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      if (!accountId) {
        throw new Error('Account ID is required');
      }
      return financialReportsApi.getGeneralLedger(accountId, startDate, endDate, currentOrganization.id, fiscalYearId);
    },
    enabled: !!currentOrganization?.id && !!accountId && (!!startDate || !!fiscalYearId),
  });
}

/**
 * Hook to fetch account summary by type
 */
export function useAccountSummary(asOfDate?: string, fiscalYearId?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'account-summary', currentOrganization?.id, asOfDate, fiscalYearId],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return financialReportsApi.getAccountSummary(asOfDate, currentOrganization.id, fiscalYearId);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch balance for a specific account
 */
export function useAccountBalance(accountId: string | undefined, asOfDate?: string, fiscalYearId?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'account-balance', currentOrganization?.id, accountId, asOfDate, fiscalYearId],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      if (!accountId) {
        throw new Error('Account ID is required');
      }
      return financialReportsApi.getAccountBalance(accountId, asOfDate, currentOrganization.id, fiscalYearId);
    },
    enabled: !!currentOrganization?.id && !!accountId,
  });
}

/**
 * Hook to fetch cash flow statement
 */
export function useCashFlow(startDate: string | undefined, endDate?: string, fiscalYearId?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'cash-flow', currentOrganization?.id, startDate, endDate, fiscalYearId],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return financialReportsApi.getCashFlow(startDate, endDate, currentOrganization.id, fiscalYearId);
    },
    enabled: !!currentOrganization?.id && (!!startDate || !!fiscalYearId),
  });
}
