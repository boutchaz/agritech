import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSubscription, useSubscriptionUsage } from '../useSubscription';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../services/subscriptionsService', () => ({
  subscriptionsService: {
    getCurrentSubscription: vi.fn(),
    getUsage: vi.fn(),
  },
}));

const mockUseQuery = vi.mocked(useQuery);
const mockUseAuth = vi.mocked(useAuth);

const getLatestQueryOptions = () => {
  const options = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1]?.[0];
  if (!options || Array.isArray(options) || typeof options.queryFn !== 'function') {
    throw new Error('Expected query options with queryFn');
  }
  return options as { queryKey: unknown[]; queryFn: (context: never) => Promise<unknown>; enabled?: boolean; staleTime?: number };
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQuery.mockReturnValue({ data: null } as ReturnType<typeof useQuery>);
  mockUseAuth.mockReturnValue({ currentOrganization: { id: 'org-123' } } as ReturnType<typeof useAuth>);
});

describe('useSubscription', () => {
  it('uses correct queryKey with org id', () => {
    useSubscription();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['subscription', 'org-123'],
    }));
  });

  it('queryFn calls getCurrentSubscription', async () => {
    const { subscriptionsService } = await import('../../services/subscriptionsService');
    vi.mocked(subscriptionsService.getCurrentSubscription).mockResolvedValue({ id: 'sub-1' } as never);

    useSubscription();
    const opts = getLatestQueryOptions();
    const result = await opts.queryFn({} as never);

    expect(subscriptionsService.getCurrentSubscription).toHaveBeenCalledWith('org-123');
    expect(result).toEqual({ id: 'sub-1' });
  });

  it('returns null for no org', async () => {
    mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
    useSubscription();
    const opts = getLatestQueryOptions();
    const result = await opts.queryFn({} as never);
    expect(result).toBeNull();
  });

  it('accepts organization override', () => {
    useSubscription({ id: 'override-org', name: 'Override' });
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['subscription', 'override-org'],
    }));
  });

  it('returns null on 404 error', async () => {
    const { subscriptionsService } = await import('../../services/subscriptionsService');
    vi.mocked(subscriptionsService.getCurrentSubscription).mockRejectedValue(new Error('404 Not Found'));

    useSubscription();
    const opts = getLatestQueryOptions();
    const result = await opts.queryFn({} as never);
    expect(result).toBeNull();
  });
});

describe('useSubscriptionUsage', () => {
  it('uses correct queryKey', () => {
    useSubscriptionUsage();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['subscription-usage', 'org-123'],
      enabled: true,
    }));
  });

  it('disables when no organization', () => {
    mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
    useSubscriptionUsage();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('queryFn calls getUsage', async () => {
    const { subscriptionsService } = await import('../../services/subscriptionsService');
    vi.mocked(subscriptionsService.getUsage).mockResolvedValue({ farms: 5, workers: 20 } as never);

    useSubscriptionUsage();
    const opts = getLatestQueryOptions();
    const result = await opts.queryFn({} as never);

    expect(subscriptionsService.getUsage).toHaveBeenCalledWith('org-123');
    expect(result).toEqual({ farms: 5, workers: 20 });
  });
});
