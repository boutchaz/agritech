import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccount, useAccounts, useCreateAccount } from '../useAccounts';
import { accountingApi } from '../../lib/accounting-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/accounting-api', () => ({
  accountingApi: {
    getAccounts: vi.fn(),
    getAccount: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

describe('useAccounts hooks', () => {
  const mockUseQuery = vi.mocked(useQuery);
  const mockUseMutation = vi.mocked(useMutation);
  const mockUseQueryClient = vi.mocked(useQueryClient);
  const mockUseAuth = vi.mocked(useAuth);
  const mockInvalidateQueries = vi.fn();

  const getLatestQueryOptions = () => {
    const options = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1]?.[0];
    if (!options || Array.isArray(options) || typeof options.queryFn !== 'function') {
      throw new Error('Expected query options with queryFn');
    }
    return options as { queryFn: (context: never) => Promise<unknown> };
  };

  const getMutationOptionsAt = (index: number) => {
    const options = mockUseMutation.mock.calls[index]?.[0];
    if (!options) {
      throw new Error('Expected mutation options');
    }
    return options as unknown as {
      mutationFn: (variables: unknown, context?: never) => Promise<unknown>;
      onSuccess?: (data: unknown, variables: unknown, context: never, mutationContext: never) => unknown;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null } as ReturnType<typeof useQuery>);
    mockUseMutation.mockReturnValue({} as ReturnType<typeof useMutation>);
    mockUseQueryClient.mockReturnValue(({ invalidateQueries: mockInvalidateQueries } as unknown) as ReturnType<typeof useQueryClient>);
    mockUseAuth.mockReturnValue({
      currentOrganization: { id: 'org-123' },
      user: { id: 'user-1' },
    } as ReturnType<typeof useAuth>);
  });

  describe('useAccounts', () => {
    it('queries accounts for the current organization', async () => {
      vi.mocked(accountingApi.getAccounts).mockResolvedValue([{ id: 'acc-1' }]);

      useAccounts();

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['accounts', 'org-123'],
        queryFn: expect.any(Function),
        enabled: true,
        staleTime: 60 * 1000,
      });

      await getLatestQueryOptions().queryFn({} as never);

      expect(accountingApi.getAccounts).toHaveBeenCalledWith('org-123');
    });

    it('disables the accounts query when no organization is selected', () => {
      mockUseAuth.mockReturnValue({ currentOrganization: null, user: { id: 'user-1' } } as ReturnType<typeof useAuth>);

      useAccounts();

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('creates accounts with organization and user ids then invalidates the list', async () => {
      vi.mocked(accountingApi.createAccount).mockResolvedValue({ id: 'acc-1' });

      useAccounts();
      const createMutation = getMutationOptionsAt(0);
      await createMutation.mutationFn({
        code: '1000',
        name: 'Cash',
        account_type: 'asset',
        account_subtype: 'current_asset',
        is_group: false,
        is_active: true,
        currency_code: 'MAD',
      }, {} as never);
      await createMutation.onSuccess?.(undefined, undefined, {} as never, {} as never);

      expect(accountingApi.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({ code: '1000', name: 'Cash' }),
        'org-123',
        'user-1',
      );
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['accounts', 'org-123'] });
    });

    it('updates and deletes accounts then invalidates the same list query', async () => {
      vi.mocked(accountingApi.updateAccount).mockResolvedValue({ id: 'acc-1' });
      vi.mocked(accountingApi.deleteAccount).mockResolvedValue(undefined);

      useAccounts();
      const updateMutation = getMutationOptionsAt(1);
      const deleteMutation = getMutationOptionsAt(2);

      await updateMutation.mutationFn({ id: 'acc-1', name: 'Updated' }, {} as never);
      await updateMutation.onSuccess?.(undefined, undefined, {} as never, {} as never);
      await deleteMutation.mutationFn('acc-1', {} as never);
      await deleteMutation.onSuccess?.(undefined, 'acc-1', {} as never, {} as never);

      expect(accountingApi.updateAccount).toHaveBeenCalledWith({ id: 'acc-1', name: 'Updated' });
      expect(accountingApi.deleteAccount).toHaveBeenCalledWith('acc-1');
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
      expect(mockInvalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['accounts', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['accounts', 'org-123'] });
    });
  });

  describe('useAccount', () => {
    it('queries a single account by id', async () => {
      vi.mocked(accountingApi.getAccount).mockResolvedValue({ id: 'acc-1' });

      useAccount('acc-1');

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['account', 'acc-1'],
        queryFn: expect.any(Function),
        enabled: true,
      });

      await getLatestQueryOptions().queryFn({} as never);

      expect(accountingApi.getAccount).toHaveBeenCalledWith('acc-1');
    });
  });

  describe('useCreateAccount', () => {
    it('creates accounts and invalidates the accounts query', async () => {
      vi.mocked(accountingApi.createAccount).mockResolvedValue({ id: 'acc-2' });

      useCreateAccount();

      const mutation = getMutationOptionsAt(0);
      await mutation.mutationFn({
        code: '2000',
        name: 'Suppliers',
        account_type: 'liability',
        account_subtype: 'current_liability',
        is_group: false,
        is_active: true,
        currency_code: 'MAD',
      }, {} as never);
      await mutation.onSuccess?.(undefined, undefined, {} as never, {} as never);

      expect(accountingApi.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({ code: '2000', name: 'Suppliers' }),
        'org-123',
        'user-1',
      );
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['accounts', 'org-123'] });
    });
  });
});
