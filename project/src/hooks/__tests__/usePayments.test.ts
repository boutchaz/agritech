import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useApprovePayment,
  useCalculatePayment,
  useCreatePaymentRecord,
  usePaginatedPaymentRecords,
  usePayments,
  useProcessPayment,
  useRequestAdvance,
} from '../usePayments';
import { paymentRecordsApi } from '../../lib/api/payment-records';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  keepPreviousData: 'keepPreviousData',
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api/payment-records', () => ({
  paymentRecordsApi: {
    getAll: vi.fn(),
    getPaginated: vi.fn(),
    calculatePayment: vi.fn(),
    create: vi.fn(),
    approve: vi.fn(),
    process: vi.fn(),
    requestAdvance: vi.fn(),
  },
}));

describe('usePayments hooks', () => {
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

  const getLatestMutationOptions = () => {
    const options = mockUseMutation.mock.calls[mockUseMutation.mock.calls.length - 1]?.[0];
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
    mockUseQuery.mockReturnValue({ data: [] } as ReturnType<typeof useQuery>);
    mockUseMutation.mockReturnValue({} as ReturnType<typeof useMutation>);
    mockUseQueryClient.mockReturnValue(({ invalidateQueries: mockInvalidateQueries } as unknown) as ReturnType<typeof useQueryClient>);
    mockUseAuth.mockReturnValue({ currentOrganization: { id: 'org-123' } } as ReturnType<typeof useAuth>);
  });

  describe('query hooks', () => {
    it('uses organization id and filters in payments query key', () => {
      const filters = { status: ['approved' as const] };

      usePayments('org-123', filters);

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['payments', 'org-123', filters],
        queryFn: expect.any(Function),
        enabled: true,
      });
    });

    it('disables payments query when organization id is missing', () => {
      usePayments('', { status: ['pending' as const] });

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });

    it('calls getAll for payment list queries', async () => {
      vi.mocked(paymentRecordsApi.getAll).mockResolvedValue([]);

      usePayments('org-123', { worker_id: 'worker-1' });

      await getLatestQueryOptions().queryFn({} as never);

      expect(paymentRecordsApi.getAll).toHaveBeenCalledWith({ worker_id: 'worker-1' }, 'org-123');
    });

    it('serializes paginated queries into the query key', async () => {
      const query = { page: 2, pageSize: 25, status: 'approved' };
      vi.mocked(paymentRecordsApi.getPaginated).mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        pageSize: 25,
        totalPages: 0,
      });

      usePaginatedPaymentRecords('org-123', query);

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['payments', 'paginated', 'org-123', JSON.stringify(query)],
        }),
      );

      await getLatestQueryOptions().queryFn({} as never);

      expect(paymentRecordsApi.getPaginated).toHaveBeenCalledWith('org-123', query);
    });
  });

  describe('useCalculatePayment', () => {
    it('uses the current organization from auth for payment calculation', async () => {
      vi.mocked(paymentRecordsApi.calculatePayment).mockResolvedValue({ gross_amount: 1200 } as never);

      useCalculatePayment();

      const mutation = getLatestMutationOptions();
      const request = { worker_id: 'worker-1', period_start: '2026-01-01', period_end: '2026-01-31' };
      await mutation.mutationFn(request, {} as never);

      expect(paymentRecordsApi.calculatePayment).toHaveBeenCalledWith('org-123', request);
    });
  });

  describe('useCreatePaymentRecord', () => {
    it('creates payment records and invalidates payment plus worker queries', async () => {
      vi.mocked(paymentRecordsApi.create).mockResolvedValue({ id: 'pay-1', worker_id: 'worker-1' } as never);

      useCreatePaymentRecord();

      const mutation = getLatestMutationOptions();
      const variables = { worker_id: 'worker-1', period_start: '2026-01-01', period_end: '2026-01-31' };
      const data = await mutation.mutationFn(variables, {} as never);
      await mutation.onSuccess?.(data, variables, {} as never, {} as never);

      expect(paymentRecordsApi.create).toHaveBeenCalledWith('org-123', variables);
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['payments', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['payment-statistics', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['worker-payments', 'worker-1'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['worker-payment-history', 'worker-1'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['worker-stats', 'org-123', 'worker-1'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['worker-payments'] });
    });
  });

  describe('mutation invalidation flows', () => {
    it('approves a payment and refreshes detail, list, and statistics queries', async () => {
      vi.mocked(paymentRecordsApi.approve).mockResolvedValue({ id: 'pay-1' } as never);

      useApprovePayment();

      const mutation = getLatestMutationOptions();
      await mutation.mutationFn({ payment_id: 'pay-1', notes: 'Approved' }, {} as never);
      await mutation.onSuccess?.({ id: 'pay-1' }, { payment_id: 'pay-1', notes: 'Approved' }, {} as never, {} as never);

      expect(paymentRecordsApi.approve).toHaveBeenCalledWith('org-123', 'pay-1', { notes: 'Approved' });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['payment', 'pay-1'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['payments', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['payment-statistics', 'org-123'] });
    });

    it('processes a payment and invalidates related worker and advance data', async () => {
      vi.mocked(paymentRecordsApi.process).mockResolvedValue({ id: 'pay-1', worker_id: 'worker-1' } as never);

      useProcessPayment();

      const mutation = getLatestMutationOptions();
      const request = {
        payment_id: 'pay-1',
        payment_method: 'cash',
        paid_date: '2026-02-01',
      };
      const response = await mutation.mutationFn(request, {} as never);
      await mutation.onSuccess?.(response, request, {} as never, {} as never);

      expect(paymentRecordsApi.process).toHaveBeenCalledWith('org-123', 'pay-1', {
        payment_method: 'cash',
        paid_date: '2026-02-01',
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['payment', 'pay-1'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['payments', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['worker-payments', 'worker-1'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['payment-statistics', 'org-123'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['payment-advances', 'org-123'] });
    });

    it('requests an advance and invalidates advances for the organization', async () => {
      vi.mocked(paymentRecordsApi.requestAdvance).mockResolvedValue({ id: 'adv-1' } as never);

      useRequestAdvance();

      const mutation = getLatestMutationOptions();
      const request = { worker_id: 'worker-1', amount: 100, reason: 'Transport' };
      await mutation.mutationFn(request, {} as never);
      await mutation.onSuccess?.(undefined, request, {} as never, {} as never);

      expect(paymentRecordsApi.requestAdvance).toHaveBeenCalledWith('org-123', request);
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['payment-advances', 'org-123'] });
    });
  });
});
