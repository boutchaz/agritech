import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAIAlerts, useActiveAIAlerts, useAcknowledgeAIAlert, useResolveAIAlert } from '../useAIAlerts';
import { aiAlertsApi } from '../../lib/api/ai-alerts';

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

vi.mock('../../lib/api/ai-alerts', () => ({
  aiAlertsApi: {
    getAIAlerts: vi.fn(),
    getActiveAIAlerts: vi.fn(),
    acknowledgeAIAlert: vi.fn(),
    resolveAIAlert: vi.fn(),
  },
}));

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

describe('useAIAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct parameters when org and parcelId are present', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAIAlerts('parcel-123');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['ai-alerts', 'parcel-123', 'org-123'],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 5 * 60 * 1000,
    });
  });

  it('sets enabled to false when parcelId is missing', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAIAlerts('');

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

    useAIAlerts('parcel-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('queryFn calls aiAlertsApi.getAIAlerts', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAIAlerts('parcel-123');

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await queryFn();

    expect(aiAlertsApi.getAIAlerts).toHaveBeenCalledWith('parcel-123', 'org-123');
  });

  it('queryFn throws error if no organization', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useAIAlerts('parcel-123');

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await expect(queryFn()).rejects.toThrow('No organization selected');
  });
});

describe('useActiveAIAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct parameters when org and parcelId are present', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useActiveAIAlerts('parcel-123');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['ai-alerts-active', 'parcel-123', 'org-123'],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 5 * 60 * 1000,
    });
  });

  it('sets enabled to false when parcelId is missing', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useActiveAIAlerts('');

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

    useActiveAIAlerts('parcel-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('queryFn calls aiAlertsApi.getActiveAIAlerts', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useActiveAIAlerts('parcel-123');

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await queryFn();

    expect(aiAlertsApi.getActiveAIAlerts).toHaveBeenCalledWith('parcel-123', 'org-123');
  });

  it('queryFn throws error if no organization', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useActiveAIAlerts('parcel-123');

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await expect(queryFn()).rejects.toThrow('No organization selected');
  });
});

describe('useAcknowledgeAIAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useMutation with correct parameters', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAcknowledgeAIAlert();

    expect(useMutation).toHaveBeenCalledWith({
      mutationFn: expect.any(Function),
      onSuccess: expect.any(Function),
    });
  });

  it('mutationFn calls aiAlertsApi.acknowledgeAIAlert', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAcknowledgeAIAlert();

    const mutationFn = (useMutation as any).mock.calls[0][0].mutationFn;
    await mutationFn('alert-123');

    expect(aiAlertsApi.acknowledgeAIAlert).toHaveBeenCalledWith('alert-123', 'org-123');
  });

  it('mutationFn throws error if no organization', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useAcknowledgeAIAlert();

    const mutationFn = (useMutation as any).mock.calls[0][0].mutationFn;
    await expect(mutationFn('alert-123')).rejects.toThrow('No organization selected');
  });

  it('onSuccess invalidates queries', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    const mockInvalidateQueries = vi.fn();
    (useQueryClient as any).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    useAcknowledgeAIAlert();

    const onSuccess = (useMutation as any).mock.calls[0][0].onSuccess;
    onSuccess({ parcel_id: 'parcel-123' });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-alerts', 'parcel-123'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-alerts-active', 'parcel-123'],
    });
  });
});

describe('useResolveAIAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useMutation with correct parameters', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useResolveAIAlert();

    expect(useMutation).toHaveBeenCalledWith({
      mutationFn: expect.any(Function),
      onSuccess: expect.any(Function),
    });
  });

  it('mutationFn calls aiAlertsApi.resolveAIAlert', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useResolveAIAlert();

    const mutationFn = (useMutation as any).mock.calls[0][0].mutationFn;
    await mutationFn('alert-123');

    expect(aiAlertsApi.resolveAIAlert).toHaveBeenCalledWith('alert-123', 'org-123');
  });

  it('mutationFn throws error if no organization', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useResolveAIAlert();

    const mutationFn = (useMutation as any).mock.calls[0][0].mutationFn;
    await expect(mutationFn('alert-123')).rejects.toThrow('No organization selected');
  });

  it('onSuccess invalidates queries', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    const mockInvalidateQueries = vi.fn();
    (useQueryClient as any).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    useResolveAIAlert();

    const onSuccess = (useMutation as any).mock.calls[0][0].onSuccess;
    onSuccess({ parcel_id: 'parcel-123' });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-alerts', 'parcel-123'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-alerts-active', 'parcel-123'],
    });
  });
});
