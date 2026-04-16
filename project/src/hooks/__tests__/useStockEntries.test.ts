import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCreateStockEntry,
  usePostStockEntry,
  useStockEntries,
  useUpdateStockEntry,
} from '../useStockEntries';
import { stockEntriesApi } from '../../lib/api/stock';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api/stock', () => ({
  stockEntriesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    post: vi.fn(),
  },
}));

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import type { AuthContextType } from '../../contexts/AuthContext';

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean;
};

type MutationOptions<TArgs = unknown, TResult = unknown> = {
  mutationFn: (args: TArgs) => Promise<TResult>;
  onSuccess?: (data: TResult, variables: TArgs) => void;
};

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);
const mockedUseQueryClient = vi.mocked(useQueryClient);
const mockedUseAuth = vi.mocked(useAuth);

const getQueryOptions = () => mockedUseQuery.mock.calls[0][0] as QueryOptions;
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

describe('useStockEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct query key including organizationId', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    const filters = { status: 'Draft' as const, warehouse_id: 'warehouse-1' };
    useStockEntries(filters);

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['stock-entries', 'org-123', filters],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('sets enabled to false when organization is missing', () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useStockEntries();

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls stockEntriesApi.getAll with filters and organizationId', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    const filters = { status: 'Draft' as const };
    useStockEntries(filters);

    await getQueryOptions().queryFn();

    expect(stockEntriesApi.getAll).toHaveBeenCalledWith(filters, 'org-123');
  });

  it('queryFn throws when organization is missing', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useStockEntries();

    await expect(getQueryOptions().queryFn()).rejects.toThrow('No organization selected');
  });
});

describe('useCreateStockEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls stockEntriesApi.create with organizationId', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useCreateStockEntry();

    const mutation = getMutationOptions<
      { entry_type: 'Material Receipt'; warehouse_id: string },
      unknown
    >();
    await mutation.mutationFn({ entry_type: 'Material Receipt', warehouse_id: 'warehouse-1' });

    expect(stockEntriesApi.create).toHaveBeenCalledWith(
      { entry_type: 'Material Receipt', warehouse_id: 'warehouse-1' },
      'org-123',
    );
  });

  it('mutationFn throws when organization is missing', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useCreateStockEntry();

    const mutation = getMutationOptions<{ entry_type: 'Material Receipt' }, unknown>();
    await expect(mutation.mutationFn({ entry_type: 'Material Receipt' })).rejects.toThrow('No organization or user');
  });

  it('onSuccess invalidates stock entries for the current organization', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useCreateStockEntry();

    const mutation = getMutationOptions();
    mutation.onSuccess?.({}, {});

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['stock-entries', 'org-123'] });
  });
});

describe('useUpdateStockEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls stockEntriesApi.update with entryId and organizationId', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useUpdateStockEntry();

    const mutation = getMutationOptions<{ entryId: string; input: { reference_number: string } }, unknown>();
    await mutation.mutationFn({ entryId: 'entry-1', input: { reference_number: 'REF-001' } });

    expect(stockEntriesApi.update).toHaveBeenCalledWith('entry-1', { reference_number: 'REF-001' }, 'org-123');
  });
});

describe('usePostStockEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls stockEntriesApi.post with entryId and organizationId', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    usePostStockEntry();

    const mutation = getMutationOptions<string, unknown>();
    await mutation.mutationFn('entry-1');

    expect(stockEntriesApi.post).toHaveBeenCalledWith('entry-1', 'org-123');
  });

  it('onSuccess invalidates stock, inventory, and movement queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    usePostStockEntry();

    const mutation = getMutationOptions<string, unknown>();
    mutation.onSuccess?.({}, 'entry-1');

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['stock-entries', 'org-123'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['stock-entry', 'entry-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['inventory-items'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['stock-movements'] });
  });
});
