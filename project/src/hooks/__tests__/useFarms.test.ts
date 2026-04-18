import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFarms } from '../useParcelsQuery';
import { farmsService } from '../../services/farmsService';
import { parcelsService } from '../../services/parcelsService';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../../services/farmsService', () => ({
  farmsService: {
    listFarms: vi.fn(),
  },
}));

vi.mock('../../services/parcelsService', () => ({
  parcelsService: {
    listParcels: vi.fn(),
  },
}));

import { useQuery } from '@tanstack/react-query';

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean;
  staleTime?: number;
  retry?: number;
};

const mockedUseQuery = vi.mocked(useQuery);
const getQueryOptions = () => mockedUseQuery.mock.calls[0][0] as QueryOptions;

describe('useFarms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct queryKey and options', () => {
    useFarms('org-123');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['farms', 'organization', 'org-123'],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    });
  });

  it('sets enabled to false when organization is missing', () => {
    useFarms(undefined);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls farms and parcels services with organizationId', async () => {
    vi.mocked(farmsService.listFarms).mockResolvedValue([
      {
        id: 'farm-1',
        organization_id: 'org-123',
        name: 'Atlas Farm',
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);
    vi.mocked(parcelsService.listParcels).mockResolvedValue([
      {
        id: 'parcel-1',
        farm_id: 'farm-1',
        name: 'Block A',
        area: 12.345,
        area_unit: 'ha',
        is_active: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);

    useFarms('org-123');

    const result = await getQueryOptions().queryFn();

    expect(farmsService.listFarms).toHaveBeenCalledWith('org-123');
    expect(parcelsService.listParcels).toHaveBeenCalledWith(undefined, 'org-123');
    expect(result).toEqual([
      {
        id: 'farm-1',
        name: 'Atlas Farm',
        location: null,
        size: null,
        manager_name: null,
        total_area: 12.35,
      },
    ]);
  });

  it('returns an empty array when organization is missing', async () => {
    useFarms(undefined);

    const result = await getQueryOptions().queryFn();

    expect(result).toEqual([]);
  });
});
