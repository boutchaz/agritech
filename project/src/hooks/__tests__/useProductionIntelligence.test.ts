import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useYieldHistory,
  useCreateYieldHistory,
  useHarvestForecasts,
  useCreateHarvestForecast,
  useUpdateHarvestForecast,
  useYieldBenchmarks,
  useCreateYieldBenchmark,
  usePerformanceAlerts,
  useAcknowledgeAlert,
  useResolveAlert,
  useParcelPerformanceSummary,
} from '../useProductionIntelligence';
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

vi.mock('../../lib/api/production-intelligence', () => ({
  productionIntelligenceApi: {
    getYieldHistory: vi.fn(),
    createYieldHistory: vi.fn(),
    getForecasts: vi.fn(),
    createForecast: vi.fn(),
    updateForecast: vi.fn(),
    getBenchmarks: vi.fn(),
    createBenchmark: vi.fn(),
    getAlerts: vi.fn(),
    acknowledgeAlert: vi.fn(),
    resolveAlert: vi.fn(),
    getParcelPerformance: vi.fn(),
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

describe('useYieldHistory', () => {
  it('uses correct queryKey with filters', () => {
    useYieldHistory({ farmId: 'farm-1', cropType: 'wheat' });
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['yield_history', 'org-123', JSON.stringify({ farmId: 'farm-1', cropType: 'wheat' })],
      enabled: true,
    }));
  });

  it('disables when no organization', () => {
    mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
    useYieldHistory();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});

describe('useCreateYieldHistory', () => {
  it('calls createYieldHistory and invalidates', async () => {
    const { productionIntelligenceApi } = await import('../../lib/api/production-intelligence');
    vi.mocked(productionIntelligenceApi.createYieldHistory).mockResolvedValue({ id: 'yh-1' } as never);

    useCreateYieldHistory();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ parcel_id: 'p1', yield_amount: 50 } as never);
    expect(productionIntelligenceApi.createYieldHistory).toHaveBeenCalled();

    await opts.onSuccess?.({ id: 'yh-1' } as never, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['yield_history'] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['parcel_performance'] });
  });
});

describe('useHarvestForecasts', () => {
  it('uses correct queryKey', () => {
    useHarvestForecasts({ farmId: 'farm-1' });
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['harvest_forecasts', 'org-123', JSON.stringify({ farmId: 'farm-1' })],
    }));
  });
});

describe('useUpdateHarvestForecast', () => {
  it('calls updateForecast and invalidates', async () => {
    const { productionIntelligenceApi } = await import('../../lib/api/production-intelligence');
    vi.mocked(productionIntelligenceApi.updateForecast).mockResolvedValue({ id: 'hf-1' } as never);

    useUpdateHarvestForecast();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ id: 'hf-1', updates: { status: 'confirmed' } } as never);
    expect(productionIntelligenceApi.updateForecast).toHaveBeenCalledWith('hf-1', { status: 'confirmed' }, 'org-123');

    await opts.onSuccess?.({ id: 'hf-1' } as never, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['harvest_forecasts'] });
  });
});

describe('useYieldBenchmarks', () => {
  it('uses correct queryKey', () => {
    useYieldBenchmarks({ cropType: 'wheat', isActive: true });
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['yield_benchmarks', 'org-123', JSON.stringify({ cropType: 'wheat', isActive: true })],
    }));
  });
});

describe('usePerformanceAlerts', () => {
  it('uses correct queryKey', () => {
    usePerformanceAlerts({ severity: 'high' });
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['performance_alerts', 'org-123', JSON.stringify({ severity: 'high' })],
    }));
  });
});

describe('useAcknowledgeAlert', () => {
  it('calls acknowledgeAlert and invalidates', async () => {
    const { productionIntelligenceApi } = await import('../../lib/api/production-intelligence');
    vi.mocked(productionIntelligenceApi.acknowledgeAlert).mockResolvedValue({ id: 'pa-1' } as never);

    useAcknowledgeAlert();
    const opts = getLatestMutationOptions();

    await opts.mutationFn('pa-1');
    expect(productionIntelligenceApi.acknowledgeAlert).toHaveBeenCalledWith('pa-1', 'org-123');

    await opts.onSuccess?.({ id: 'pa-1' } as never, {} as never, {} as never, {} as never);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['performance_alerts'] });
  });
});

describe('useResolveAlert', () => {
  it('calls resolveAlert and invalidates', async () => {
    const { productionIntelligenceApi } = await import('../../lib/api/production-intelligence');
    vi.mocked(productionIntelligenceApi.resolveAlert).mockResolvedValue({ id: 'pa-1' } as never);

    useResolveAlert();
    const opts = getLatestMutationOptions();

    await opts.mutationFn({ alertId: 'pa-1', notes: 'Fixed' });
    expect(productionIntelligenceApi.resolveAlert).toHaveBeenCalledWith('pa-1', 'Fixed', 'org-123');
  });
});

describe('useParcelPerformanceSummary', () => {
  it('uses correct queryKey', () => {
    useParcelPerformanceSummary({ farmId: 'farm-1' });
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['parcel_performance', 'org-123', JSON.stringify({ farmId: 'farm-1' })],
    }));
  });

  it('disables when no organization', () => {
    mockUseAuth.mockReturnValue({ currentOrganization: null } as ReturnType<typeof useAuth>);
    useParcelPerformanceSummary();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });
});
