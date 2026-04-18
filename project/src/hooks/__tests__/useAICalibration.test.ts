import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAICalibration, useStartAICalibration } from '../useAICalibration';
import { aiCalibrationApi } from '../../lib/api/ai-calibration';

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

vi.mock('../../lib/api/ai-calibration', () => ({
  aiCalibrationApi: {
    getCalibration: vi.fn(),
    startCalibration: vi.fn(),
  },
}));

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

describe('useAICalibration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct parameters when org and parcelId are present', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAICalibration('parcel-123');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['ai-calibration', 'parcel-123', 'org-123'],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 5 * 60 * 1000,
    });
  });

  it('sets enabled to false when parcelId is missing', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAICalibration('');

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

    useAICalibration('parcel-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('queryFn calls aiCalibrationApi.getCalibration', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useAICalibration('parcel-123');

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await queryFn();

    expect(aiCalibrationApi.getCalibration).toHaveBeenCalledWith('parcel-123', 'org-123');
  });

  it('queryFn throws error if no organization', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useAICalibration('parcel-123');

    const queryFn = (useQuery as any).mock.calls[0][0].queryFn;
    await expect(queryFn()).rejects.toThrow('No organization selected');
  });
});

describe('useStartAICalibration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useMutation with correct parameters', () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useStartAICalibration();

    expect(useMutation).toHaveBeenCalledWith({
      mutationFn: expect.any(Function),
      onSuccess: expect.any(Function),
    });
  });

  it('mutationFn calls aiCalibrationApi.startCalibration', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: { id: 'org-123' },
    });

    useStartAICalibration();

    const mutationFn = (useMutation as any).mock.calls[0][0].mutationFn;
    await mutationFn('parcel-123');

    expect(aiCalibrationApi.startCalibration).toHaveBeenCalledWith('parcel-123', 'org-123');
  });

  it('mutationFn throws error if no organization', async () => {
    (useAuth as any).mockReturnValue({
      currentOrganization: null,
    });

    useStartAICalibration();

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

    useStartAICalibration();

    const onSuccess = (useMutation as any).mock.calls[0][0].onSuccess;
    onSuccess(null, 'parcel-123');

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-calibration', 'parcel-123'],
    });
  });
});
