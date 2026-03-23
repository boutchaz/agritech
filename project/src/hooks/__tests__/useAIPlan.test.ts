import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAIPlan, useAIPlanInterventions, useExecuteAIPlanIntervention, useRegenerateAIPlan } from '../useAIPlan';
import { aiPlanApi } from '../../lib/api/ai-plan';

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

vi.mock('../../lib/api/ai-plan', () => ({
  aiPlanApi: {
    getAIPlan: vi.fn(),
    getAIPlanInterventions: vi.fn(),
    executeAIPlanIntervention: vi.fn(),
    regenerateAIPlan: vi.fn(),
  },
}));

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

describe('useAIPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct parameters when org and parcelId are present', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAIPlan('parcel-123');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['ai-plan', 'parcel-123', 'org-123'],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 5 * 60 * 1000,
    });
  });

  it('sets enabled to false when parcelId is missing', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAIPlan('');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('sets enabled to false when organization is missing', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useAIPlan('parcel-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('queryFn calls aiPlanApi.getAIPlan', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAIPlan('parcel-123');

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await queryFn();

    expect(aiPlanApi.getAIPlan).toHaveBeenCalledWith('parcel-123', 'org-123');
  });

  it('queryFn throws error if no organization', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useAIPlan('parcel-123');

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await expect(queryFn()).rejects.toThrow('No organization selected');
  });
});

describe('useAIPlanInterventions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct parameters when org and parcelId are present', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAIPlanInterventions('parcel-123');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['ai-plan-interventions', 'parcel-123', 'org-123'],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 5 * 60 * 1000,
    });
  });

  it('sets enabled to false when parcelId is missing', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAIPlanInterventions('');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('sets enabled to false when organization is missing', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useAIPlanInterventions('parcel-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('queryFn calls aiPlanApi.getAIPlanInterventions', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAIPlanInterventions('parcel-123');

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await queryFn();

    expect(aiPlanApi.getAIPlanInterventions).toHaveBeenCalledWith('parcel-123', 'org-123');
  });

  it('queryFn throws error if no organization', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useAIPlanInterventions('parcel-123');

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await expect(queryFn()).rejects.toThrow('No organization selected');
  });
});

describe('useExecuteAIPlanIntervention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useMutation with correct parameters', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useExecuteAIPlanIntervention();

    expect(useMutation).toHaveBeenCalledWith({
      mutationFn: expect.any(Function),
      onSuccess: expect.any(Function),
    });
  });

  it('mutationFn calls aiPlanApi.executeAIPlanIntervention', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useExecuteAIPlanIntervention();

    const mutationFn = (useMutation as any).mock.calls[0][0].mutationFn;
    await mutationFn('intervention-123');

    expect(aiPlanApi.executeAIPlanIntervention).toHaveBeenCalledWith('intervention-123', 'org-123');
  });

  it('mutationFn throws error if no organization', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useExecuteAIPlanIntervention();

    const mutationFn = (useMutation as any).mock.calls[0][0].mutationFn;
    await expect(mutationFn('intervention-123')).rejects.toThrow('No organization selected');
  });

  it('onSuccess invalidates queries', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    const mockInvalidateQueries = vi.fn();
    (useQueryClient as any).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    useExecuteAIPlanIntervention();

    const onSuccess = (useMutation as any).mock.calls[0][0].onSuccess;
    onSuccess({ parcel_id: 'parcel-123' });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-plan-interventions', 'parcel-123', 'org-123'],
    });
  });
});

describe('useRegenerateAIPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useMutation with correct parameters', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useRegenerateAIPlan();

    expect(useMutation).toHaveBeenCalledWith({
      mutationFn: expect.any(Function),
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    });
  });

  it('mutationFn calls aiPlanApi.regenerateAIPlan', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useRegenerateAIPlan();

    const mutationFn = (useMutation as any).mock.calls[0][0].mutationFn;
    await mutationFn('parcel-123');

    expect(aiPlanApi.regenerateAIPlan).toHaveBeenCalledWith('parcel-123', 'org-123');
  });

  it('mutationFn throws error if no organization', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useRegenerateAIPlan();

    const mutationFn = (useMutation as any).mock.calls[0][0].mutationFn;
    await expect(mutationFn('parcel-123')).rejects.toThrow('No organization selected');
  });

  it('onSuccess invalidates queries', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    const mockInvalidateQueries = vi.fn();
    (useQueryClient as any).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    useRegenerateAIPlan();

    const onSuccess = (useMutation as any).mock.calls[0][0].onSuccess;
    onSuccess(null, 'parcel-123');

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-plan', 'parcel-123', 'org-123'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-plan-summary', 'parcel-123', 'org-123'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-plan-interventions', 'parcel-123', 'org-123'],
    });
  });
});