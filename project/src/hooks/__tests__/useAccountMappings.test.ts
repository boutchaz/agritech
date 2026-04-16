import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccountMappings, useAccountMapping, useAccountMappingTypes, useAccountMappingOptions, useCreateAccountMapping, useUpdateAccountMapping, useDeleteAccountMapping, useInitializeAccountMappings } from '../useAccountMappings';
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

vi.mock('../../lib/api/account-mappings', () => ({
  accountMappingsApi: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    getMappingTypes: vi.fn(),
    getMappingOptions: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    initializeDefaults: vi.fn(),
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

describe('useAccountMappings', () => {
  it('uses correct queryKey with filters', () => {
    useAccountMappings({ mapping_type: 'sales' });
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['account-mappings', 'org-123', { mapping_type: 'sales' }],
      enabled: true,
    }));
  });

  it('disables query when no organization', () => {
    mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
    useAccountMappings();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe('useAccountMapping', () => {
  it('uses correct queryKey', () => {
    useAccountMapping('mapping-1');
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['account-mapping', 'mapping-1'],
      enabled: true,
    }));
  });

  it('disables when no mappingId', () => {
    useAccountMapping(null);
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe('useAccountMappingTypes', () => {
  it('uses correct queryKey', () => {
    useAccountMappingTypes();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['account-mapping-types', 'org-123'],
    }));
  });
});

describe('useCreateAccountMapping', () => {
  it('calls create and invalidates', async () => {
    const { accountMappingsApi } = await import('../../lib/api/account-mappings');
    vi.mocked(accountMappingsApi.create).mockResolvedValue({ id: 'am-1' } as never);

    useCreateAccountMapping();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ mapping_type: 'sales', account_id: 'acc-1' } as never);
    expect(accountMappingsApi.create).toHaveBeenCalled();

    await opts.onSuccess?.({ id: 'am-1' } as never, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
  });
});

describe('useUpdateAccountMapping', () => {
  it('calls update and invalidates', async () => {
    const { accountMappingsApi } = await import('../../lib/api/account-mappings');
    vi.mocked(accountMappingsApi.update).mockResolvedValue({ id: 'am-1' } as never);

    useUpdateAccountMapping();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ id: 'am-1', data: { account_id: 'acc-2' } } as never);
    expect(accountMappingsApi.update).toHaveBeenCalledWith('am-1', { account_id: 'acc-2' }, 'org-123');

    await opts.onSuccess?.({ id: 'am-1' } as never, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });
});

describe('useDeleteAccountMapping', () => {
  it('calls delete and invalidates', async () => {
    const { accountMappingsApi } = await import('../../lib/api/account-mappings');
    vi.mocked(accountMappingsApi.delete).mockResolvedValue(undefined as never);

    useDeleteAccountMapping();
    const opts = getLatestMutationOptions();

    await opts.mutationFn('am-1');
    expect(accountMappingsApi.delete).toHaveBeenCalledWith('am-1', 'org-123');

    await opts.onSuccess?.(undefined, 'am-1' as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
  });
});

describe('useInitializeAccountMappings', () => {
  it('calls initializeDefaults and invalidates', async () => {
    const { accountMappingsApi } = await import('../../lib/api/account-mappings');
    vi.mocked(accountMappingsApi.initializeDefaults).mockResolvedValue([] as never);

    useInitializeAccountMappings();
    const opts = getLatestMutationOptions();

    await opts.mutationFn('MA');
    expect(accountMappingsApi.initializeDefaults).toHaveBeenCalledWith('MA', 'org-123');

    await opts.onSuccess?.([] as never, 'MA' as never, {} as never, {} as never);
    expect(mockInvalidateQueries.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
