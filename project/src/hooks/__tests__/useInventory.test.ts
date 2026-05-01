import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInventory } from '../useInventory';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api/items', () => ({
  itemsApi: {
    getFarmStockLevels: vi.fn(),
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
  mockUseQuery.mockReturnValue({ data: [] } as ReturnType<typeof useQuery>);
  mockUseAuth.mockReturnValue({ currentOrganization: { id: 'org-123' } } as ReturnType<typeof useAuth>);
});

describe('useInventory', () => {
  it('uses correct queryKey with organization id', () => {
    useInventory();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['inventory', 'org-123'],
      enabled: true,
    }));
  });

  it('disables query when no organization', () => {
    mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
    useInventory();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn calls itemsApi.getFarmStockLevels', async () => {
    const { itemsApi } = await import('../../lib/api/items');
    vi.mocked(itemsApi.getFarmStockLevels).mockResolvedValue([
      { item_id: 'item-1', item_name: 'Fertilizer', total_quantity: 100, default_unit: 'kg' },
    ]);

    useInventory();
    const opts = getLatestQueryOptions();
    const result = await opts.queryFn({} as never);

    expect(itemsApi.getFarmStockLevels).toHaveBeenCalledWith({}, 'org-123');
    expect(result).toEqual([
      expect.objectContaining({
        item_id: 'item-1',
        name: 'Fertilizer',
        quantity: 100,
        unit: 'kg',
      }),
    ]);
  });

  it('returns empty array when no organization in queryFn', async () => {
    mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
    useInventory();
    const opts = getLatestQueryOptions();
    const result = await opts.queryFn({} as never);
    expect(result).toEqual([]);
  });
});
