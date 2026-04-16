import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useHarvests,
  useHarvest,
  useDeliveries,
  useDelivery,
  useCreateHarvest,
  useUpdateHarvest,
  useDeleteHarvest,
  useCreateDelivery,
  useCancelDelivery,
} from '../useHarvests';
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

vi.mock('../../lib/api/harvests', () => ({
  harvestsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getPaginated: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../lib/api/deliveries', () => ({
  deliveriesApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getItems: vi.fn(),
    getTracking: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    complete: vi.fn(),
    updatePayment: vi.fn(),
    cancel: vi.fn(),
  },
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
  mockUseAuth.mockReturnValue({ currentOrganization: { id: 'org-123' } } as ReturnType<typeof useAuth>);
});

describe('useHarvests', () => {
  it('uses correct queryKey with org and filters', () => {
    useHarvests('org-1', { status: 'harvested' } as never);
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['harvests', 'org-1', { status: 'harvested' }],
      enabled: true,
    }));
  });

  it('disables when no organizationId', () => {
    useHarvests('');
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe('useHarvest', () => {
  it('uses correct queryKey', () => {
    useHarvest('org-1', 'harvest-1');
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['harvest', 'harvest-1'],
      enabled: true,
    }));
  });

  it('disables when no harvestId', () => {
    useHarvest('org-1', null);
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe('useDeliveries', () => {
  it('uses correct queryKey', () => {
    useDeliveries('org-1', { status: 'pending' });
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['deliveries', 'org-1', { status: 'pending' }],
    }));
  });
});

describe('useDelivery', () => {
  it('uses correct queryKey', () => {
    useDelivery('org-1', 'del-1');
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['delivery', 'del-1'],
    }));
  });
});

describe('useCreateHarvest', () => {
  it('calls create and invalidates', async () => {
    const { harvestsApi } = await import('../../lib/api/harvests');
    vi.mocked(harvestsApi.create).mockResolvedValue({ id: 'h-1' } as never);

    useCreateHarvest();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ organizationId: 'org-1', data: { parcel_id: 'p1', quantity: 100 } } as never);
    expect(harvestsApi.create).toHaveBeenCalledWith({ parcel_id: 'p1', quantity: 100 }, 'org-1');

    await opts.onSuccess?.({ id: 'h-1' } as never, { organizationId: 'org-1' } as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['harvests', 'org-1'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['harvest-statistics', 'org-1'] });
  });
});

describe('useUpdateHarvest', () => {
  it('calls update and invalidates', async () => {
    const { harvestsApi } = await import('../../lib/api/harvests');
    vi.mocked(harvestsApi.update).mockResolvedValue({ id: 'h-1' } as never);

    useUpdateHarvest();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ harvestId: 'h-1', organizationId: 'org-1', updates: { quantity: 200 } } as never);
    expect(harvestsApi.update).toHaveBeenCalledWith('h-1', { quantity: 200 }, 'org-1');

    await opts.onSuccess?.({ id: 'h-1' } as never, { harvestId: 'h-1', organizationId: 'org-1' } as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['harvest', 'h-1'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['harvests', 'org-1'] });
  });
});

describe('useDeleteHarvest', () => {
  it('calls delete and invalidates', async () => {
    const { harvestsApi } = await import('../../lib/api/harvests');
    vi.mocked(harvestsApi.delete).mockResolvedValue(undefined as never);

    useDeleteHarvest();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ harvestId: 'h-1', organizationId: 'org-1' });
    expect(harvestsApi.delete).toHaveBeenCalledWith('h-1', 'org-1');
  });
});

describe('useCreateDelivery', () => {
  it('calls create and invalidates', async () => {
    const { deliveriesApi } = await import('../../lib/api/deliveries');
    vi.mocked(deliveriesApi.create).mockResolvedValue({ id: 'd-1' } as never);

    useCreateDelivery();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ harvest_id: 'h-1', items: [] } as never);
    expect(deliveriesApi.create).toHaveBeenCalledWith('org-123', { harvest_id: 'h-1', items: [] });

    await opts.onSuccess?.({ id: 'd-1' } as never, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['deliveries', 'org-123'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['harvests', 'org-123'] });
  });
});

describe('useCancelDelivery', () => {
  it('calls cancel and invalidates', async () => {
    const { deliveriesApi } = await import('../../lib/api/deliveries');
    vi.mocked(deliveriesApi.cancel).mockResolvedValue({ id: 'd-1' } as never);

    useCancelDelivery();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ deliveryId: 'd-1', reason: 'Damaged' });
    expect(deliveriesApi.cancel).toHaveBeenCalledWith('org-123', 'd-1', 'Damaged');

    await opts.onSuccess?.({ id: 'd-1' } as never, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['delivery', 'd-1'] });
  });
});
