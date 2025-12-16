import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../components/MultiTenantAuthProvider';
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
} from '../lib/api/financial-reports';

/**
 * Hook to fetch trial balance report
 */
export function useTrialBalance(asOfDate?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'trial-balance', currentOrganization?.id, asOfDate],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return financialReportsApi.getTrialBalance(asOfDate);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch balance sheet report
 */
export function useBalanceSheet(asOfDate?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'balance-sheet', currentOrganization?.id, asOfDate],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return financialReportsApi.getBalanceSheet(asOfDate);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch profit and loss statement
 */
export function useProfitLoss(startDate: string | undefined, endDate?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'profit-loss', currentOrganization?.id, startDate, endDate],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      if (!startDate) {
        throw new Error('Start date is required');
      }
      return financialReportsApi.getProfitLoss(startDate, endDate);
    },
    enabled: !!currentOrganization?.id && !!startDate,
  });
}

/**
 * Hook to fetch general ledger for a specific account
 */
export function useGeneralLedger(
  accountId: string | undefined,
  startDate: string | undefined,
  endDate?: string
) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'general-ledger', currentOrganization?.id, accountId, startDate, endDate],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      if (!accountId || !startDate) {
        throw new Error('Account ID and start date are required');
      }
      return financialReportsApi.getGeneralLedger(accountId, startDate, endDate);
    },
    enabled: !!currentOrganization?.id && !!accountId && !!startDate,
  });
}

/**
 * Hook to fetch account summary by type
 */
export function useAccountSummary(asOfDate?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'account-summary', currentOrganization?.id, asOfDate],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return financialReportsApi.getAccountSummary(asOfDate);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch balance for a specific account
 */
export function useAccountBalance(accountId: string | undefined, asOfDate?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['financial-reports', 'account-balance', currentOrganization?.id, accountId, asOfDate],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      if (!accountId) {
        throw new Error('Account ID is required');
      }
      return financialReportsApi.getAccountBalance(accountId, asOfDate);
    },
    enabled: !!currentOrganization?.id && !!accountId,
  });
}
