import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCreateItemGroup,
  useCreateItemVariant,
  useCreateItem,
  useDeleteItem,
  useDeleteItemGroup,
  useDeleteItemVariant,
  useGetItemPrice,
  useItem,
  useItemGroup,
  useItemGroups,
  useItemPrices,
  useItemSelection,
  useItemVariants,
  useItems,
  usePaginatedItems,
  useUpdateItemGroup,
  useUpdateItemVariant,
  useUpdateItem,
} from '../useItems';
import { itemsApi } from '../../lib/api/items';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  keepPreviousData: Symbol('keepPreviousData'),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api/items', () => ({
  itemsApi: {
    getAll: vi.fn(),
    getPaginated: vi.fn(),
    getAllGroups: vi.fn(),
    getOneGroup: vi.fn(),
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(),
    getOne: vi.fn(),
    getForSelection: vi.fn(),
    getVariants: vi.fn(),
    createVariant: vi.fn(),
    updateVariant: vi.fn(),
    deleteVariant: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getItemPrices: vi.fn(),
  },
}));

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import type { AuthContextType } from '../../contexts/AuthContext';

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
const mockedUseAuth = vi.mocked(useAuth);
const mockedItemsApi = vi.mocked(itemsApi);

const getQueryOptions = () => mockedUseQuery.mock.calls[0][0] as QueryOptions;
const getQueryOptionsAt = (index: number) => mockedUseQuery.mock.calls[index][0] as QueryOptions;
const getMutationOptions = <TArgs = unknown, TResult = unknown>() =>
  mockedUseMutation.mock.calls[0][0] as MutationOptions<TArgs, TResult>;

const createAuthContext = (organizationId: string | null): AuthContextType => ({
  user: null,
  profile: null,
  organizations: [],
  currentOrganization: organizationId
    ? {
        id: organizationId,
        name: 'Org',
        slug: 'org',
        role: 'organization_admin',
        is_active: true,
      }
    : null,
  farms: [],
  currentFarm: null,
  userRole: null,
  loading: false,
  needsOnboarding: false,
  needsImport: false,
  setCurrentOrganization: vi.fn(),
  setCurrentFarm: vi.fn(),
  signOut: vi.fn(),
  refreshUserData: vi.fn(),
  hasRole: vi.fn(),
  isAtLeastRole: vi.fn(),
});

const createQueryClientMock = () =>
  ({ invalidateQueries: vi.fn() }) as unknown as ReturnType<typeof useQueryClient>;

describe('useItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct query key including organizationId', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    const filters = { is_stock_item: true, search: 'fertilizer' };
    useItems(filters);

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['items', 'org-123', filters],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('sets enabled to false when organization is missing', () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useItems();

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls itemsApi.getAll with filters and organizationId', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    const filters = { is_stock_item: true };
    useItems(filters);

    await getQueryOptions().queryFn();

    expect(itemsApi.getAll).toHaveBeenCalledWith(filters, 'org-123');
  });

  it('queryFn throws when organization is missing', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useItems();

    await expect(getQueryOptions().queryFn()).rejects.toThrow('No organization selected');
  });
});

describe('usePaginatedItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets staleTime and placeholderData correctly', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    const query = { page: 1, pageSize: 20, is_sales_item: true };
    usePaginatedItems(query);

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['items', 'paginated', 'org-123', JSON.stringify(query)],
      queryFn: expect.any(Function),
      enabled: true,
      placeholderData: keepPreviousData,
      staleTime: 30 * 1000,
    });
  });
});

describe('useCreateItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls itemsApi.create with organizationId', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useCreateItem();

    const mutation = getMutationOptions<{ name: string; item_type: 'product' }, unknown>();
    await mutation.mutationFn({ name: 'NPK 20-20-20', item_type: 'product' });

    expect(itemsApi.create).toHaveBeenCalledWith({ name: 'NPK 20-20-20', item_type: 'product' }, 'org-123');
  });

  it('mutationFn throws when organization is missing', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useCreateItem();

    const mutation = getMutationOptions<{ name: string }, unknown>();
    await expect(mutation.mutationFn({ name: 'NPK 20-20-20' })).rejects.toThrow('No organization selected');
  });

  it('onSuccess invalidates item list and selection queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useCreateItem();

    const mutation = getMutationOptions();
    mutation.onSuccess?.({}, {});

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['items'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-selection'] });
  });
});

describe('useUpdateItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls itemsApi.update with itemId and organizationId', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useUpdateItem();

    const mutation = getMutationOptions<{ itemId: string; input: { name: string } }, unknown>();
    await mutation.mutationFn({ itemId: 'item-1', input: { name: 'Updated item' } });

    expect(itemsApi.update).toHaveBeenCalledWith('item-1', { name: 'Updated item' }, 'org-123');
  });

  it('onSuccess invalidates correct item queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useUpdateItem();

    const mutation = getMutationOptions<{ itemId: string; input: { name: string } }, unknown>();
    mutation.onSuccess?.({}, { itemId: 'item-1', input: { name: 'Updated item' } });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['items'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item', 'item-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-selection'] });
  });
});

describe('useItemGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    const filters = { is_active: true, search: 'fert' };

    useItemGroups(filters);

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['item-groups', 'org-123', filters],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no organization', () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useItemGroups();

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls itemsApi.getAllGroups', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    const filters = { is_active: true };
    mockedItemsApi.getAllGroups.mockResolvedValue([{ id: 'group-1', name: 'Inputs' }] as never);

    useItemGroups(filters);

    const result = await getQueryOptions().queryFn();

    expect(itemsApi.getAllGroups).toHaveBeenCalledWith(filters, 'org-123');
    expect(result).toEqual([{ id: 'group-1', name: 'Inputs' }]);
  });
});

describe('useItemGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useItemGroup('group-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['item-group', 'group-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no group id', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useItemGroup(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls itemsApi.getOneGroup', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedItemsApi.getOneGroup.mockResolvedValue({ id: 'group-1', name: 'Inputs' } as never);

    useItemGroup('group-1');

    const result = await getQueryOptions().queryFn();

    expect(itemsApi.getOneGroup).toHaveBeenCalledWith('group-1', 'org-123');
    expect(result).toEqual({ id: 'group-1', name: 'Inputs' });
  });
});

describe('useItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useItem('item-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['item', 'item-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no item id', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useItem(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls itemsApi.getOne', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedItemsApi.getOne.mockResolvedValue({ id: 'item-1', name: 'Seed' } as never);

    useItem('item-1');

    const result = await getQueryOptions().queryFn();

    expect(itemsApi.getOne).toHaveBeenCalledWith('item-1', 'org-123');
    expect(result).toEqual({ id: 'item-1', name: 'Seed' });
  });
});

describe('useItemSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    const filters = { is_stock_item: true, search: 'fertilizer' };

    useItemSelection(filters);

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['item-selection', 'org-123', filters],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no organization', () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useItemSelection();

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls itemsApi.getForSelection', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    const filters = { is_sales_item: true };
    mockedItemsApi.getForSelection.mockResolvedValue([{ id: 'item-1', label: 'Seed' }] as never);

    useItemSelection(filters);

    const result = await getQueryOptions().queryFn();

    expect(itemsApi.getForSelection).toHaveBeenCalledWith(filters, 'org-123');
    expect(result).toEqual([{ id: 'item-1', label: 'Seed' }]);
  });
});

describe('useItemVariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useItemVariants('item-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['item-variants', 'item-1', 'org-123'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no item', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useItemVariants(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls itemsApi.getVariants', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedItemsApi.getVariants.mockResolvedValue([{ id: 'variant-1', name: '5kg' }] as never);

    useItemVariants('item-1');

    const result = await getQueryOptions().queryFn();

    expect(itemsApi.getVariants).toHaveBeenCalledWith('item-1', 'org-123');
    expect(result).toEqual([{ id: 'variant-1', name: '5kg' }]);
  });
});

describe('useCreateItemGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls itemsApi.createGroup', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useCreateItemGroup();

    const mutation = getMutationOptions<{ name: string; code: string }, unknown>();
    await mutation.mutationFn({ name: 'Inputs', code: 'INP' });

    expect(itemsApi.createGroup).toHaveBeenCalledWith({ name: 'Inputs', code: 'INP' }, 'org-123');
  });

  it('onSuccess invalidates group queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useCreateItemGroup();

    const mutation = getMutationOptions();
    mutation.onSuccess?.({}, {});

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-groups'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-group-tree'] });
  });
});

describe('useUpdateItemGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls itemsApi.updateGroup', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useUpdateItemGroup();

    const mutation = getMutationOptions<{ groupId: string; input: { name: string } }, unknown>();
    await mutation.mutationFn({ groupId: 'group-1', input: { name: 'Updated group' } });

    expect(itemsApi.updateGroup).toHaveBeenCalledWith('group-1', { name: 'Updated group' }, 'org-123');
  });

  it('onSuccess invalidates group queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useUpdateItemGroup();

    const mutation = getMutationOptions<{ groupId: string; input: { name: string } }, unknown>();
    mutation.onSuccess?.({}, { groupId: 'group-1', input: { name: 'Updated group' } });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-groups'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-group', 'group-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-group-tree'] });
  });
});

describe('useDeleteItemGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls itemsApi.deleteGroup', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useDeleteItemGroup();

    const mutation = getMutationOptions<string, unknown>();
    await mutation.mutationFn('group-1');

    expect(itemsApi.deleteGroup).toHaveBeenCalledWith('group-1', 'org-123');
  });

  it('onSuccess invalidates group queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useDeleteItemGroup();

    const mutation = getMutationOptions<string, unknown>();
    mutation.onSuccess?.({}, 'group-1');

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-groups'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-group-tree'] });
  });
});

describe('useCreateItemVariant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls itemsApi.createVariant', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useCreateItemVariant();

    const mutation = getMutationOptions<{ itemId: string; input: { name: string } }, unknown>();
    await mutation.mutationFn({ itemId: 'item-1', input: { name: '5kg' } });

    expect(itemsApi.createVariant).toHaveBeenCalledWith('item-1', { name: '5kg' }, 'org-123');
  });

  it('onSuccess invalidates item variant queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useCreateItemVariant();

    const mutation = getMutationOptions<{ itemId: string; input: { name: string } }, unknown>();
    mutation.onSuccess?.({}, { itemId: 'item-1', input: { name: '5kg' } });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-variants', 'item-1'] });
  });
});

describe('useUpdateItemVariant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls itemsApi.updateVariant', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useUpdateItemVariant();

    const mutation = getMutationOptions<{ variantId: string; input: { name: string } }, unknown>();
    await mutation.mutationFn({ variantId: 'variant-1', input: { name: '10kg' } });

    expect(itemsApi.updateVariant).toHaveBeenCalledWith('variant-1', { name: '10kg' }, 'org-123');
  });

  it('onSuccess invalidates variant queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useUpdateItemVariant();

    const mutation = getMutationOptions<{ variantId: string; input: { name: string } }, unknown>();
    mutation.onSuccess?.({}, { variantId: 'variant-1', input: { name: '10kg' } });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-variants'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-variant', 'variant-1'] });
  });
});

describe('useDeleteItemVariant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls itemsApi.deleteVariant', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useDeleteItemVariant();

    const mutation = getMutationOptions<string, unknown>();
    await mutation.mutationFn('variant-1');

    expect(itemsApi.deleteVariant).toHaveBeenCalledWith('variant-1', 'org-123');
  });

  it('onSuccess invalidates variant queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useDeleteItemVariant();

    const mutation = getMutationOptions<string, unknown>();
    mutation.onSuccess?.({}, 'variant-1');

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-variants'] });
  });
});

describe('useDeleteItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls itemsApi.delete', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useDeleteItem();

    const mutation = getMutationOptions<string, unknown>();
    await mutation.mutationFn('item-1');

    expect(itemsApi.delete).toHaveBeenCalledWith('item-1', 'org-123');
  });

  it('onSuccess invalidates item queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useDeleteItem();

    const mutation = getMutationOptions<string, unknown>();
    mutation.onSuccess?.({}, 'item-1');

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['items'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['item-selection'] });
  });
});

describe('useItemPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useItemPrices('item-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['item-prices', 'item-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no item id', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useItemPrices(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls itemsApi.getItemPrices', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedItemsApi.getItemPrices.mockResolvedValue([{ id: 'price-1', amount: 10 }] as never);

    useItemPrices('item-1');

    const result = await getQueryOptions().queryFn();

    expect(itemsApi.getItemPrices).toHaveBeenCalledWith('item-1', 'org-123');
    expect(result).toEqual([{ id: 'price-1', amount: 10 }]);
  });
});

describe('useGetItemPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key for the derived price query', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedUseQuery.mockReturnValueOnce({ data: [] } as never);

    const options = { price_list_name: 'retail', unit: 'kg' };
    useGetItemPrice('item-1', options);

    expect(getQueryOptionsAt(1)).toEqual(
      expect.objectContaining({
        queryKey: ['item-price', 'item-1', options],
        enabled: true,
      }),
    );
  });

  it('returns the matching active price', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedUseQuery
      .mockReturnValueOnce({
        data: [
          {
            id: 'price-1',
            price_list_name: 'retail',
            customer_id: null,
            unit: 'kg',
            valid_from: '2024-01-01',
            valid_upto: '2099-12-31',
          },
        ],
      } as never)
      .mockReturnValueOnce({} as never);

    useGetItemPrice('item-1', { price_list_name: 'retail', unit: 'kg' });

    const result = await getQueryOptionsAt(1).queryFn();

    expect(result).toEqual({
      id: 'price-1',
      price_list_name: 'retail',
      customer_id: null,
      unit: 'kg',
      valid_from: '2024-01-01',
      valid_upto: '2099-12-31',
    });
  });

  it('returns null when no prices are available', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedUseQuery.mockReturnValueOnce({ data: [] } as never).mockReturnValueOnce({} as never);

    useGetItemPrice('item-1', { unit: 'kg' });

    await expect(getQueryOptionsAt(1).queryFn()).resolves.toBeNull();
  });
});
