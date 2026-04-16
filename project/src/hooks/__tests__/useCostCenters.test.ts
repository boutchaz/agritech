import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCostCenters, useCostCenter, useCreateCostCenter, useUpdateCostCenter, useDeleteCostCenter } from '../useCostCenters';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api/cost-centers', () => ({
  costCentersApi: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

describe('useCostCenters', () => {
  it('uses correct queryKey with filters', () => {
    useCostCenters({ is_active: true });
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['cost-centers', 'org-123', { is_active: true }],
      enabled: true,
    }));
  });

  it('disables query when no organization', () => {
    mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
    useCostCenters();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn calls costCentersApi.getAll', async () => {
    const { costCentersApi } = await import('../../lib/api/cost-centers');
    vi.mocked(costCentersApi.getAll).mockResolvedValue([{ id: 'cc-1', code: 'CC001', name: 'General' }]);

    useCostCenters();
    const opts = mockUseQuery.mock.calls[0]?.[0];
    if (opts && typeof opts === 'object' && 'queryFn' in opts && typeof opts.queryFn === 'function') {
      const result = await opts.queryFn({} as never);
      expect(costCentersApi.getAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([{ id: 'cc-1', code: 'CC001', name: 'General' }]);
    }
  });
});

describe('useCostCenter', () => {
  it('uses correct queryKey', () => {
    useCostCenter('cc-1');
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['cost-center', 'cc-1'],
      enabled: true,
    }));
  });

  it('disables when no costCenterId', () => {
    useCostCenter(null);
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe('useCreateCostCenter', () => {
  it('calls create and invalidates', async () => {
    const { costCentersApi } = await import('../../lib/api/cost-centers');
    vi.mocked(costCentersApi.create).mockResolvedValue({ id: 'cc-1' } as never);

    useCreateCostCenter();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ code: 'CC001', name: 'General' } as never);
    expect(costCentersApi.create).toHaveBeenCalledWith({ code: 'CC001', name: 'General' });

    await opts.onSuccess?.({ id: 'cc-1' } as never, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['cost-centers', 'org-123'] });
  });
});

describe('useUpdateCostCenter', () => {
  it('calls update and invalidates', async () => {
    const { costCentersApi } = await import('../../lib/api/cost-centers');
    vi.mocked(costCentersApi.update).mockResolvedValue({ id: 'cc-1' } as never);

    useUpdateCostCenter();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ id: 'cc-1', data: { name: 'Updated' } } as never);
    expect(costCentersApi.update).toHaveBeenCalledWith('cc-1', { name: 'Updated' });

    await opts.onSuccess?.({ id: 'cc-1' } as never, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['cost-centers', 'org-123'] });
  });
});

describe('useDeleteCostCenter', () => {
  it('calls delete and invalidates', async () => {
    const { costCentersApi } = await import('../../lib/api/cost-centers');
    vi.mocked(costCentersApi.delete).mockResolvedValue(undefined as never);

    useDeleteCostCenter();
    const opts = getLatestMutationOptions();

    await opts.mutationFn('cc-1');
    expect(costCentersApi.delete).toHaveBeenCalledWith('cc-1');

    await opts.onSuccess?.(undefined, 'cc-1' as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['cost-centers', 'org-123'] });
  });
});
