import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useActiveWorkers,
  useCreateWorker,
  useCreateMetayageSettlement,
  useCreateWorkRecord,
  useCalculateMetayageShare,
  useDeactivateWorker,
  useDeleteWorker,
  useMetayageSettlements,
  usePaginatedWorkers,
  useUpdateWorkRecord,
  useUpdateWorker,
  useWorkRecords,
  useWorker,
  useWorkerStats,
  useWorkers,
} from '../useWorkers';
import { workersApi } from '../../lib/api/workers';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  keepPreviousData: Symbol('keepPreviousData'),
}));

vi.mock('../../lib/api/workers', () => ({
  workersApi: {
    getAll: vi.fn(),
    getPaginated: vi.fn(),
    getActive: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deactivate: vi.fn(),
    getWorkRecords: vi.fn(),
    createWorkRecord: vi.fn(),
    updateWorkRecord: vi.fn(),
    getMetayageSettlements: vi.fn(),
    createMetayageSettlement: vi.fn(),
    calculateMetayageShare: vi.fn(),
    getStats: vi.fn(),
  },
}));

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean;
  staleTime?: number;
  placeholderData?: unknown;
};

type MutationOptions<TArgs = unknown, TResult = unknown> = {
  mutationFn: (args: TArgs) => Promise<TResult>;
  onSuccess?: (data: TResult, variables: TArgs) => void;
};

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);
const mockedUseQueryClient = vi.mocked(useQueryClient);

const getQueryOptions = () => mockedUseQuery.mock.calls[0][0] as QueryOptions;
const getMutationOptions = <TArgs = unknown, TResult = unknown>() =>
  mockedUseMutation.mock.calls[0][0] as MutationOptions<TArgs, TResult>;

const createQueryClientMock = () =>
  ({ invalidateQueries: vi.fn() }) as unknown as ReturnType<typeof useQueryClient>;

describe('useWorkers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with organizationId and farmId in the queryKey', () => {
    useWorkers('org-123', 'farm-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['workers', 'org-123', 'farm-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('sets enabled to false when organization is missing', () => {
    useWorkers(null, 'farm-1');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls workersApi.getAll with farm filter and organizationId', async () => {
    useWorkers('org-123', 'farm-1');

    await getQueryOptions().queryFn();

    expect(workersApi.getAll).toHaveBeenCalledWith({ farmId: 'farm-1' }, 'org-123');
  });
});

describe('usePaginatedWorkers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets staleTime and placeholderData correctly', () => {
    const query = { page: 3, pageSize: 50, isActive: true };

    usePaginatedWorkers('org-123', query);

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['workers', 'paginated', 'org-123', JSON.stringify(query)],
      queryFn: expect.any(Function),
      enabled: true,
      placeholderData: keepPreviousData,
      staleTime: 30 * 1000,
    });
  });

  it('returns an empty paginated response when organization is missing', async () => {
    usePaginatedWorkers('', { page: 1, pageSize: 10 });

    const result = await getQueryOptions().queryFn();

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });
  });
});

describe('useCreateWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls workersApi.create with stripped organization_id', async () => {
    useCreateWorker();

    const mutation = getMutationOptions<
      {
        organization_id: string;
        first_name: string;
        last_name: string;
        hire_date: string;
        worker_type: 'daily_worker';
        is_cnss_declared: boolean;
      },
      unknown
    >();

    await mutation.mutationFn({
      organization_id: 'org-123',
      first_name: 'Fatima',
      last_name: 'El Idrissi',
      hire_date: '2026-01-01',
      worker_type: 'daily_worker',
      is_cnss_declared: false,
    });

    expect(workersApi.create).toHaveBeenCalledWith(
      {
        first_name: 'Fatima',
        last_name: 'El Idrissi',
        hire_date: '2026-01-01',
        worker_type: 'daily_worker',
        is_cnss_declared: false,
      },
      'org-123',
    );
  });

  it('onSuccess invalidates workers and active-workers queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useCreateWorker();

    const mutation = getMutationOptions<unknown, { id: string; organization_id: string }>();
    mutation.onSuccess?.({ id: 'worker-1', organization_id: 'org-123' }, {});

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workers'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['active-workers', 'org-123'] });
  });
});

describe('useUpdateWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls workersApi.update with id, data, and organizationId', async () => {
    useUpdateWorker();

    const mutation = getMutationOptions<
      { id: string; organizationId: string; data: { phone: string } },
      unknown
    >();

    await mutation.mutationFn({
      id: 'worker-1',
      organizationId: 'org-123',
      data: { phone: '+212600000000' },
    });

    expect(workersApi.update).toHaveBeenCalledWith('worker-1', { phone: '+212600000000' }, 'org-123');
  });

  it('onSuccess invalidates worker detail and active worker queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useUpdateWorker();

    const mutation = getMutationOptions<unknown, { id: string; organization_id: string }>();
    mutation.onSuccess?.({ id: 'worker-1', organization_id: 'org-123' }, {});

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workers'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['worker', 'org-123', 'worker-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['active-workers', 'org-123'] });
  });
});

describe('useActiveWorkers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the active-workers query key and enabled flag', () => {
    useActiveWorkers('org-123');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['active-workers', 'org-123'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables when organization is missing', () => {
    useActiveWorkers(null);

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn calls workersApi.getActive with organizationId', async () => {
    useActiveWorkers('org-123');

    await getQueryOptions().queryFn();

    expect(workersApi.getActive).toHaveBeenCalledWith('org-123');
  });
});

describe('useWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the worker query key and enabled flag', () => {
    useWorker('org-123', 'worker-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['worker', 'org-123', 'worker-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables when organization or worker id is missing', () => {
    useWorker(null, 'worker-1');

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn calls workersApi.getById with organizationId and workerId', async () => {
    useWorker('org-123', 'worker-1');

    await getQueryOptions().queryFn();

    expect(workersApi.getById).toHaveBeenCalledWith('org-123', 'worker-1');
  });
});

describe('useDeleteWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls workersApi.delete with workerId and organizationId', async () => {
    useDeleteWorker();

    const mutation = getMutationOptions<{ workerId: string; organizationId: string }, unknown>();

    await mutation.mutationFn({ workerId: 'worker-1', organizationId: 'org-123' });

    expect(workersApi.delete).toHaveBeenCalledWith('worker-1', 'org-123');
  });

  it('onSuccess invalidates workers and active-workers queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useDeleteWorker();

    const mutation = getMutationOptions<unknown, unknown>();
    mutation.onSuccess?.({}, { workerId: 'worker-1', organizationId: 'org-123' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workers'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['active-workers', 'org-123'] });
  });
});

describe('useDeactivateWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls workersApi.deactivate with endDate', async () => {
    useDeactivateWorker();

    const mutation = getMutationOptions<
      { workerId: string; organizationId: string; endDate?: string },
      unknown
    >();

    await mutation.mutationFn({ workerId: 'worker-1', organizationId: 'org-123', endDate: '2026-12-31' });

    expect(workersApi.deactivate).toHaveBeenCalledWith('org-123', 'worker-1', '2026-12-31');
  });

  it('onSuccess invalidates worker and active-workers queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useDeactivateWorker();

    const mutation = getMutationOptions<unknown, { id: string; organization_id: string }>();
    mutation.onSuccess?.({ id: 'worker-1', organization_id: 'org-123' }, {});

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workers'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['worker', 'org-123', 'worker-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['active-workers', 'org-123'] });
  });
});

describe('useWorkRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the work-records query key and enabled flag', () => {
    useWorkRecords('org-123', 'worker-1', '2026-01-01', '2026-02-01');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['work-records', 'org-123', 'worker-1', '2026-01-01', '2026-02-01'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables when organization or worker id is missing', () => {
    useWorkRecords(null, 'worker-1');

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn calls workersApi.getWorkRecords with filters', async () => {
    useWorkRecords('org-123', 'worker-1', '2026-01-01', '2026-02-01');

    await getQueryOptions().queryFn();

    expect(workersApi.getWorkRecords).toHaveBeenCalledWith('org-123', 'worker-1', '2026-01-01', '2026-02-01');
  });
});

describe('useCreateWorkRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls workersApi.createWorkRecord with organization and worker ids', async () => {
    useCreateWorkRecord();

    const mutation = getMutationOptions<
      {
        organizationId: string;
        workerId: string;
        data: { activity: string; hours: number };
      },
      unknown
    >();

    await mutation.mutationFn({
      organizationId: 'org-123',
      workerId: 'worker-1',
      data: { activity: 'Harvest', hours: 5 },
    });

    expect(workersApi.createWorkRecord).toHaveBeenCalledWith('org-123', 'worker-1', { activity: 'Harvest', hours: 5 });
  });

  it('onSuccess invalidates work-records and worker queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useCreateWorkRecord();

    const mutation = getMutationOptions<unknown, unknown>();
    mutation.onSuccess?.({}, { organizationId: 'org-123', workerId: 'worker-1', data: { activity: 'Harvest', hours: 5 } });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['work-records', 'org-123', 'worker-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['worker', 'org-123', 'worker-1'] });
  });
});

describe('useUpdateWorkRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls workersApi.updateWorkRecord with ids and data', async () => {
    useUpdateWorkRecord();

    const mutation = getMutationOptions<
      {
        organizationId: string;
        workerId: string;
        recordId: string;
        data: { hours: number };
      },
      unknown
    >();

    await mutation.mutationFn({
      organizationId: 'org-123',
      workerId: 'worker-1',
      recordId: 'record-1',
      data: { hours: 6 },
    });

    expect(workersApi.updateWorkRecord).toHaveBeenCalledWith('org-123', 'worker-1', 'record-1', { hours: 6 });
  });

  it('onSuccess invalidates work-records query', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useUpdateWorkRecord();

    const mutation = getMutationOptions<unknown, unknown>();
    mutation.onSuccess?.({}, { organizationId: 'org-123', workerId: 'worker-1', recordId: 'record-1', data: { hours: 6 } });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['work-records', 'org-123', 'worker-1'] });
  });
});

describe('useMetayageSettlements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the metayage-settlements query key and enabled flag', () => {
    useMetayageSettlements('org-123', 'worker-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['metayage-settlements', 'org-123', 'worker-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables when organization or worker id is missing', () => {
    useMetayageSettlements('org-123', null);

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn calls workersApi.getMetayageSettlements', async () => {
    useMetayageSettlements('org-123', 'worker-1');

    await getQueryOptions().queryFn();

    expect(workersApi.getMetayageSettlements).toHaveBeenCalledWith('org-123', 'worker-1');
  });
});

describe('useCreateMetayageSettlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls workersApi.createMetayageSettlement with ids and data', async () => {
    useCreateMetayageSettlement();

    const mutation = getMutationOptions<
      {
        organizationId: string;
        workerId: string;
        data: { revenue_share: number };
      },
      unknown
    >();

    await mutation.mutationFn({
      organizationId: 'org-123',
      workerId: 'worker-1',
      data: { revenue_share: 2500 },
    });

    expect(workersApi.createMetayageSettlement).toHaveBeenCalledWith('org-123', 'worker-1', { revenue_share: 2500 });
  });

  it('onSuccess invalidates metayage settlements query', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useCreateMetayageSettlement();

    const mutation = getMutationOptions<unknown, unknown>();
    mutation.onSuccess?.({}, { organizationId: 'org-123', workerId: 'worker-1', data: { revenue_share: 2500 } });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['metayage-settlements', 'org-123', 'worker-1'] });
  });
});

describe('useCalculateMetayageShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls workersApi.calculateMetayageShare and returns share', async () => {
    vi.mocked(workersApi.calculateMetayageShare).mockResolvedValue({ share: 1200 });

    useCalculateMetayageShare();

    const mutation = getMutationOptions<
      {
        organizationId: string;
        workerId: string;
        grossRevenue: number;
        totalCharges?: number;
      },
      number
    >();

    await expect(mutation.mutationFn({
      organizationId: 'org-123',
      workerId: 'worker-1',
      grossRevenue: 5000,
      totalCharges: 1000,
    })).resolves.toBe(1200);

    expect(workersApi.calculateMetayageShare).toHaveBeenCalledWith('org-123', 'worker-1', 5000, 1000);
  });
});

describe('useWorkerStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the worker-stats query key and enabled flag', () => {
    useWorkerStats('org-123', 'worker-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['worker-stats', 'org-123', 'worker-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables when organization or worker id is missing', () => {
    useWorkerStats('org-123', null);

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn calls workersApi.getStats with organizationId and workerId', async () => {
    useWorkerStats('org-123', 'worker-1');

    await getQueryOptions().queryFn();

    expect(workersApi.getStats).toHaveBeenCalledWith('org-123', 'worker-1');
  });
});
