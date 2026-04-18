import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useArchiveParcel,
  useParcelApplications,
  useParcelById,
  useParcelsByFarms,
  useParcelsByOrganization,
  useRestoreParcel,
  useUpdateParcel,
} from '../useParcelsQuery';
import { parcelsService } from '../../services/parcelsService';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock('../../services/parcelsService', () => ({
  parcelsService: {
    listParcels: vi.fn(),
    getParcelById: vi.fn(),
    getParcelApplications: vi.fn(),
    updateParcel: vi.fn(),
    archiveParcel: vi.fn(),
    restoreParcel: vi.fn(),
  },
}));

vi.mock('../../services/farmsService', () => ({
  farmsService: {
    listFarms: vi.fn(),
  },
}));

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean;
  staleTime?: number;
  retry?: number;
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

describe('useParcelsByFarms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the sorted farms query key and enabled flag', () => {
    useParcelsByFarms(['farm-b', 'farm-a'], 'org-123');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['parcels', 'farms', 'farm-a,farm-b'],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 2 * 60 * 1000,
      retry: 1,
    });
  });

  it('disables when farm list is empty or organization is missing', () => {
    useParcelsByFarms([], 'org-123');

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn filters and normalizes parcels from multiple farms', async () => {
    vi.mocked(parcelsService.listParcels).mockResolvedValue([
      {
        id: 'parcel-1',
        farm_id: 'farm-a',
        name: 'North Block',
        area: 12,
        area_unit: 'ha',
        description: undefined,
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      {
        id: 'parcel-2',
        farm_id: 'farm-c',
        name: 'Ignored Block',
        area: 4,
        area_unit: 'ha',
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);

    useParcelsByFarms(['farm-a', 'farm-b'], 'org-123');

    const result = await getQueryOptions().queryFn();

    expect(parcelsService.listParcels).toHaveBeenCalledWith(undefined, 'org-123');
    expect(result).toEqual([
      expect.objectContaining({
        id: 'parcel-1',
        farm_id: 'farm-a',
        description: null,
        area: 12,
        area_unit: 'ha',
      }),
    ]);
  });
});

describe('useParcelsByOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the organization query key and enabled flag', () => {
    useParcelsByOrganization('org-123', true);

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['parcels', 'organization', 'org-123', { includeArchived: true }],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 2 * 60 * 1000,
      retry: 1,
    });
  });

  it('disables when organization is missing', () => {
    useParcelsByOrganization(null, false);

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn calls parcelsService.listParcels with organizationId and includeArchived', async () => {
    vi.mocked(parcelsService.listParcels).mockResolvedValue([
      {
        id: 'parcel-1',
        farm_id: 'farm-a',
        name: 'North Block',
        area: 12,
        area_unit: 'ha',
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);

    useParcelsByOrganization('org-123', false);

    const result = await getQueryOptions().queryFn();

    expect(parcelsService.listParcels).toHaveBeenCalledWith(undefined, 'org-123', false);
    expect(result).toEqual([
      expect.objectContaining({
        id: 'parcel-1',
        description: null,
      }),
    ]);
  });
});

describe('useParcelById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the parcel query key and enabled flag', () => {
    useParcelById('parcel-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['parcel', 'parcel-1'],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 2 * 60 * 1000,
      retry: 1,
    });
  });

  it('disables when parcel id is missing', () => {
    useParcelById(null);

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn returns normalized parcel or null', async () => {
    vi.mocked(parcelsService.getParcelById).mockResolvedValue({
      id: 'parcel-1',
      farm_id: 'farm-a',
      name: 'North Block',
      area: 0,
      area_unit: 'ha',
      description: undefined,
      is_active: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });

    useParcelById('parcel-1');

    const result = await getQueryOptions().queryFn();

    expect(parcelsService.getParcelById).toHaveBeenCalledWith('parcel-1');
    expect(result).toEqual(
      expect.objectContaining({
        id: 'parcel-1',
        area: 0,
        area_unit: 'ha',
        description: null,
      }),
    );
  });
});

describe('useParcelApplications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the applications query key and enabled flag', () => {
    useParcelApplications('parcel-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['parcels', 'parcel-1', 'applications'],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 2 * 60 * 1000,
      retry: 1,
    });
  });

  it('disables when parcel id is missing', () => {
    useParcelApplications(undefined);

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn calls parcelsService.getParcelApplications', async () => {
    vi.mocked(parcelsService.getParcelApplications).mockResolvedValue({
      success: true,
      parcel_id: 'parcel-1',
      applications: [
        {
          id: 'app-1',
          product_id: 'product-1',
          application_date: '2026-01-01',
          quantity_used: 4,
          area_treated: 2,
          created_at: '2026-01-01',
          inventory: { name: 'Fungicide', unit: 'L' },
        },
      ],
      total: 1,
    });

    useParcelApplications('parcel-1');

    const result = await getQueryOptions().queryFn();

    expect(parcelsService.getParcelApplications).toHaveBeenCalledWith('parcel-1');
    expect(result).toEqual(
      expect.objectContaining({
        parcel_id: 'parcel-1',
        total: 1,
      }),
    );
  });
});

describe('useUpdateParcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn removes null fields before calling parcelsService.updateParcel', async () => {
    useUpdateParcel();

    const mutation = getMutationOptions<
      { id: string; updates: { description: string | null; area: number | null; name: string } },
      unknown
    >();

    await mutation.mutationFn({
      id: 'parcel-1',
      updates: {
        description: null,
        area: 14,
        name: 'North Block',
      },
    });

    expect(parcelsService.updateParcel).toHaveBeenCalledWith('parcel-1', {
      description: undefined,
      area: 14,
      name: 'North Block',
    });
  });

  it('onSuccess invalidates parcel and farm queries when farm_id is present', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useUpdateParcel();

    const mutation = getMutationOptions<unknown, { farm_id: string }>();
    mutation.onSuccess?.({ farm_id: 'farm-a' }, {});

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['parcels'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['parcels', 'farm-a', { includeArchived: undefined }] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['farms'] });
  });
});

describe('useArchiveParcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn archives the parcel and returns the id', async () => {
    useArchiveParcel();

    const mutation = getMutationOptions<string, string>();

    await expect(mutation.mutationFn('parcel-1')).resolves.toBe('parcel-1');

    expect(parcelsService.archiveParcel).toHaveBeenCalledWith('parcel-1');
  });

  it('onSuccess invalidates parcels and farms queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useArchiveParcel();

    const mutation = getMutationOptions<unknown, string>();
    mutation.onSuccess?.('parcel-1', undefined);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['parcels'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['farms'] });
  });
});

describe('useRestoreParcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn restores the parcel and returns the id', async () => {
    useRestoreParcel();

    const mutation = getMutationOptions<string, string>();

    await expect(mutation.mutationFn('parcel-1')).resolves.toBe('parcel-1');

    expect(parcelsService.restoreParcel).toHaveBeenCalledWith('parcel-1');
  });

  it('onSuccess invalidates parcels and farms queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useRestoreParcel();

    const mutation = getMutationOptions<unknown, string>();
    mutation.onSuccess?.('parcel-1', undefined);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['parcels'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['farms'] });
  });
});
