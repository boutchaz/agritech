import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAccountingPayments,
  usePaymentsByType,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useAllocatePayment,
} from '../useAccountingPayments';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

vi.mock('../../lib/api/payments', () => ({
  paymentsApi: {
    getAll: vi.fn(),
    getPaginated: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    allocate: vi.fn(),
  },
}));

vi.mock('../../lib/ledger-integration', () => ({
  syncPaymentToLedger: vi.fn().mockResolvedValue({ success: true, journalEntryId: 'je-1' }),
  linkJournalEntry: vi.fn().mockResolvedValue(undefined),
}));

const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);
const mockUseQueryClient = vi.mocked(useQueryClient);
const mockUseAuth = vi.mocked(useAuth);
const mockInvalidateQueries = vi.fn();

const getLatestMutationOptions = () => {
  const options = mockUseMutation.mock.calls[mockUseMutation.mock.calls.length - 1]?.[0];
  if (!options) throw new Error('Expected mutation options');
  return options as unknown as {
    mutationFn: (variables: unknown) => Promise<unknown>;
    onSuccess?: (data: unknown, variables: unknown, context: never, mutationContext: never) => unknown;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQuery.mockReturnValue({ data: [] } as ReturnType<typeof useQuery>);
  mockUseMutation.mockReturnValue({} as ReturnType<typeof useMutation>);
  mockUseQueryClient.mockReturnValue(({ invalidateQueries: mockInvalidateQueries } as unknown) as ReturnType<typeof useQueryClient>);
  mockUseAuth.mockReturnValue({ currentOrganization: { id: 'org-123' }, user: { id: 'user-1' } } as ReturnType<typeof useAuth>);
});

describe('useAccountingPayments', () => {
  it('uses correct queryKey', () => {
    useAccountingPayments();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['accounting_payments', 'org-123'],
      enabled: true,
    }));
  });

  it('disables when no organization', () => {
    mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
    useAccountingPayments();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe('usePaymentsByType', () => {
  it('uses correct queryKey with type', () => {
    usePaymentsByType('received');
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['accounting_payments', 'org-123', 'received'],
    }));
  });
});

describe('useCreatePayment', () => {
  it('calls create and invalidates', async () => {
    const { paymentsApi } = await import('../../lib/api/payments');
    vi.mocked(paymentsApi.create).mockResolvedValue({ id: 'pay-1', payment_number: 'PAY-001' } as never);

    useCreatePayment();
    const opts = getLatestMutationOptions();

    const input = {
      payment_type: 'receive' as const,
      party_name: 'Customer 1',
      payment_date: '2024-01-01',
      amount: 100,
      payment_method: 'cash' as const,
    };
    await opts.mutationFn(input);
    expect(paymentsApi.create).toHaveBeenCalled();

    await opts.onSuccess?.({ id: 'pay-1' } as never, input as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });
});

describe('useUpdatePayment', () => {
  it('calls updateStatus when status provided', async () => {
    const { paymentsApi } = await import('../../lib/api/payments');
    vi.mocked(paymentsApi.updateStatus).mockResolvedValue({ id: 'pay-1' } as never);

    useUpdatePayment();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ id: 'pay-1', status: 'submitted' });
    expect(paymentsApi.updateStatus).toHaveBeenCalledWith('pay-1', { status: 'submitted' }, 'org-123');
  });
});

describe('useDeletePayment', () => {
  it('calls delete and invalidates', async () => {
    const { paymentsApi } = await import('../../lib/api/payments');
    vi.mocked(paymentsApi.delete).mockResolvedValue(undefined as never);

    useDeletePayment();
    const opts = getLatestMutationOptions();

    await opts.mutationFn('pay-1');
    expect(paymentsApi.delete).toHaveBeenCalledWith('pay-1', 'org-123');

    await opts.onSuccess?.(undefined, 'pay-1' as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });
});

describe('useAllocatePayment', () => {
  it('calls allocate and invalidates', async () => {
    const { paymentsApi } = await import('../../lib/api/payments');
    vi.mocked(paymentsApi.allocate).mockResolvedValue({ id: 'pay-1' } as never);

    useAllocatePayment();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({
      payment_id: 'pay-1',
      allocations: [{ invoice_id: 'inv-1', allocated_amount: 50 }],
    });

    expect(paymentsApi.allocate).toHaveBeenCalledWith(
      'pay-1',
      { allocations: [{ invoice_id: 'inv-1', amount: 50 }] },
      'org-123',
    );

    await opts.onSuccess?.({} as never, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });
});
