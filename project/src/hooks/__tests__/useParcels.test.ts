import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddParcel, useParcelsByFarm } from '../useParcelsQuery';
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
    createParcel: vi.fn(),
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

describe('useParcelsByFarm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct queryKey and options', () => {
    useParcelsByFarm('farm-1', 'org-123', true);

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['parcels', 'farm-1', { includeArchived: true }],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 2 * 60 * 1000,
      retry: 1,
    });
  });

  it('sets enabled to false when organization is missing', () => {
    useParcelsByFarm('farm-1', null, false);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls parcelsService.listParcels with correct arguments', async () => {
    vi.mocked(parcelsService.listParcels).mockResolvedValue([
      {
        id: 'parcel-1',
        farm_id: 'farm-1',
        name: 'North Block',
        area: 12,
        area_unit: 'ha',
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);

    useParcelsByFarm('farm-1', 'org-123', true);

    await getQueryOptions().queryFn();

    expect(parcelsService.listParcels).toHaveBeenCalledWith('farm-1', 'org-123', true);
  });
});

describe('useAddParcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls parcelsService.createParcel with normalized payload', async () => {
    useAddParcel();

    const mutation = getMutationOptions<
      { farm_id: string; name: string; area?: number; description?: string },
      unknown
    >();

    await mutation.mutationFn({
      farm_id: 'farm-1',
      name: 'North Block',
      description: 'High yield section',
    });

    expect(parcelsService.createParcel).toHaveBeenCalledWith({
      farm_id: 'farm-1',
      name: 'North Block',
      area: 0,
      description: 'High yield section',
    });
  });

  it('onSuccess invalidates parcel and farm queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useAddParcel();

    const mutation = getMutationOptions<unknown, { farm_id: string }>();
    mutation.onSuccess?.({ farm_id: 'farm-1' }, {});

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['parcels'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['parcels', 'farm-1', { includeArchived: undefined }] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['farms'] });
  });
});
