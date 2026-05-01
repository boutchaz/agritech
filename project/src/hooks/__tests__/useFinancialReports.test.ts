import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useTrialBalance,
  useBalanceSheet,
  useProfitLoss,
  useGeneralLedger,
  useAccountSummary,
  useAccountBalance,
  useCashFlow,
} from '../useFinancialReports';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api/financial-reports', () => ({
  financialReportsApi: {
    getTrialBalance: vi.fn(),
    getBalanceSheet: vi.fn(),
    getProfitLoss: vi.fn(),
    getGeneralLedger: vi.fn(),
    getAccountSummary: vi.fn(),
    getAccountBalance: vi.fn(),
    getCashFlow: vi.fn(),
  },
}));

const mockUseQuery = vi.mocked(useQuery);
const mockUseAuth = vi.mocked(useAuth);

const getLatestQueryOptions = () => {
  const options = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1]?.[0];
  if (!options || Array.isArray(options) || typeof options.queryFn !== 'function') {
    throw new Error('Expected query options with queryFn');
  }
  return options as { queryKey: unknown[]; queryFn: (context: never) => Promise<unknown>; enabled: boolean };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQuery.mockReturnValue({ data: null } as ReturnType<typeof useQuery>);
  mockUseAuth.mockReturnValue({ currentOrganization: { id: 'org-123' } } as ReturnType<typeof useAuth>);
});

describe('useFinancialReports', () => {
  describe('useTrialBalance', () => {
    it('uses correct queryKey with org id and date', () => {
      useTrialBalance('2024-01-31', 'fy-1');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['financial-reports', 'trial-balance', 'org-123', '2024-01-31', 'fy-1'],
        enabled: true,
      }));
    });

    it('disables query when no organization', () => {
      mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
      useTrialBalance();
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });

  describe('useBalanceSheet', () => {
    it('uses correct queryKey', () => {
      useBalanceSheet('2024-01-31');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['financial-reports', 'balance-sheet', 'org-123', '2024-01-31', undefined],
      }));
    });
  });

  describe('useProfitLoss', () => {
    it('uses correct queryKey with date range', () => {
      useProfitLoss('2024-01-01', '2024-01-31', 'fy-1');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['financial-reports', 'profit-loss', 'org-123', '2024-01-01', '2024-01-31', 'fy-1', undefined],
        enabled: true,
      }));
    });

    it('disables when no start date and no fiscal year', () => {
      useProfitLoss(undefined);
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });

  describe('useGeneralLedger', () => {
    it('uses correct queryKey with accountId', () => {
      useGeneralLedger('acc-1', '2024-01-01');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['financial-reports', 'general-ledger', 'org-123', 'acc-1', '2024-01-01', undefined, undefined],
        enabled: true,
      }));
    });

    it('disables when no accountId', () => {
      useGeneralLedger(undefined, '2024-01-01');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });

  describe('useAccountSummary', () => {
    it('uses correct queryKey', () => {
      useAccountSummary('2024-01-31');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['financial-reports', 'account-summary', 'org-123', '2024-01-31', undefined],
      }));
    });
  });

  describe('useAccountBalance', () => {
    it('uses correct queryKey with accountId', () => {
      useAccountBalance('acc-1', '2024-01-31');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['financial-reports', 'account-balance', 'org-123', 'acc-1', '2024-01-31', undefined],
      }));
    });

    it('disables when no accountId', () => {
      useAccountBalance(undefined);
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });

  describe('useCashFlow', () => {
    it('uses correct queryKey', () => {
      useCashFlow('2024-01-01', '2024-01-31');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['financial-reports', 'cash-flow', 'org-123', '2024-01-01', '2024-01-31', undefined],
      }));
    });

    it('disables when no start date and no fiscal year', () => {
      useCashFlow(undefined);
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });
});
