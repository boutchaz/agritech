import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCertifications,
  useCertification,
  useComplianceChecks,
  useComplianceCheck,
  useComplianceRequirements,
  useComplianceDashboard,
  useCreateCertification,
  useUpdateCertification,
  useDeleteCertification,
  useCreateComplianceCheck,
  useUpdateComplianceCheck,
  useDeleteComplianceCheck,
  useCreateEvidence,
  useCorrectiveActions,
  useCorrectiveAction,
  useCorrectiveActionStats,
  useCreateCorrectiveAction,
  useUpdateCorrectiveAction,
  useDeleteCorrectiveAction,
} from '../useCompliance';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('../../lib/api/compliance', () => ({
  complianceApi: {
    getCertifications: vi.fn(),
    getCertification: vi.fn(),
    getComplianceChecks: vi.fn(),
    getComplianceCheck: vi.fn(),
    getComplianceRequirements: vi.fn(),
    getDashboardStats: vi.fn(),
    createCertification: vi.fn(),
    updateCertification: vi.fn(),
    deleteCertification: vi.fn(),
    createComplianceCheck: vi.fn(),
    updateComplianceCheck: vi.fn(),
    deleteComplianceCheck: vi.fn(),
    createEvidence: vi.fn(),
    getCorrectiveActions: vi.fn(),
    getCorrectiveAction: vi.fn(),
    getCorrectiveActionStats: vi.fn(),
    createCorrectiveAction: vi.fn(),
    updateCorrectiveAction: vi.fn(),
    deleteCorrectiveAction: vi.fn(),
  },
}));

const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);
const mockUseQueryClient = vi.mocked(useQueryClient);
const mockInvalidateQueries = vi.fn();

const getLatestQueryOptions = () => {
  const options = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1]?.[0];
  if (!options || Array.isArray(options) || typeof options.queryFn !== 'function') {
    throw new Error('Expected query options with queryFn');
  }
  return options as { queryKey: unknown[]; queryFn: (context: never) => Promise<unknown>; enabled: boolean };
};

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
});

describe('useCompliance', () => {
  describe('useCertifications', () => {
    it('uses correct queryKey with organizationId', () => {
      useCertifications('org-123');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['compliance', 'certifications', 'org-123'],
        enabled: true,
      }));
    });

    it('disables query when organizationId is null', () => {
      useCertifications(null);
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        enabled: false,
      }));
    });

    it('queryFn calls complianceApi.getCertifications', async () => {
      const { complianceApi } = await import('../../lib/api/compliance');
      vi.mocked(complianceApi.getCertifications).mockResolvedValue([]);
      useCertifications('org-123');
      const opts = getLatestQueryOptions();
      await opts.queryFn({} as never);
      expect(complianceApi.getCertifications).toHaveBeenCalledWith('org-123');
    });
  });

  describe('useCertification', () => {
    it('uses correct queryKey with certificationId', () => {
      useCertification('org-123', 'cert-456');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['compliance', 'certification', 'cert-456'],
        enabled: true,
      }));
    });

    it('disables query when certificationId is null', () => {
      useCertification('org-123', null);
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        enabled: false,
      }));
    });
  });

  describe('useComplianceChecks', () => {
    it('uses correct queryKey', () => {
      useComplianceChecks('org-123');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['compliance', 'checks', 'org-123'],
        enabled: true,
      }));
    });

    it('disables query when organizationId is null', () => {
      useComplianceChecks(null);
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });

  describe('useComplianceDashboard', () => {
    it('uses correct queryKey', () => {
      useComplianceDashboard('org-123');
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['compliance', 'dashboard', 'org-123'],
      }));
    });
  });

  describe('useCreateCertification', () => {
    it('calls createCertification and invalidates queries', async () => {
      const { complianceApi } = await import('../../lib/api/compliance');
      vi.mocked(complianceApi.createCertification).mockResolvedValue({ id: 'cert-1' } as never);

      useCreateCertification();
      const opts = getLatestMutationOptions();

      await opts.mutationFn({ organizationId: 'org-123', data: { name: 'Test' } as never });

      expect(complianceApi.createCertification).toHaveBeenCalledWith('org-123', { name: 'Test' });
      await opts.onSuccess?.({ id: 'cert-1' }, { organizationId: 'org-123', data: { name: 'Test' } } as never, {} as never, {} as never);
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
    });
  });

  describe('useUpdateCertification', () => {
    it('calls updateCertification and invalidates queries', async () => {
      const { complianceApi } = await import('../../lib/api/compliance');
      vi.mocked(complianceApi.updateCertification).mockResolvedValue({ id: 'cert-1' } as never);

      useUpdateCertification();
      const opts = getLatestMutationOptions();

      await opts.mutationFn({ organizationId: 'org-123', certificationId: 'cert-1', data: { name: 'Updated' } as never });

      expect(complianceApi.updateCertification).toHaveBeenCalledWith('org-123', 'cert-1', { name: 'Updated' });
      await opts.onSuccess?.({ id: 'cert-1' }, { organizationId: 'org-123', certificationId: 'cert-1', data: {} } as never, {} as never, {} as never);
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
    });
  });

  describe('useDeleteCertification', () => {
    it('calls deleteCertification and invalidates queries', async () => {
      const { complianceApi } = await import('../../lib/api/compliance');
      vi.mocked(complianceApi.deleteCertification).mockResolvedValue(undefined as never);

      useDeleteCertification();
      const opts = getLatestMutationOptions();

      await opts.mutationFn({ organizationId: 'org-123', certificationId: 'cert-1' });

      expect(complianceApi.deleteCertification).toHaveBeenCalledWith('org-123', 'cert-1');
      await opts.onSuccess?.(undefined, { organizationId: 'org-123', certificationId: 'cert-1' } as never, {} as never, {} as never);
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
    });
  });

  describe('useCreateComplianceCheck', () => {
    it('calls createComplianceCheck and invalidates', async () => {
      const { complianceApi } = await import('../../lib/api/compliance');
      vi.mocked(complianceApi.createComplianceCheck).mockResolvedValue({ id: 'check-1' } as never);

      useCreateComplianceCheck();
      const opts = getLatestMutationOptions();

      await opts.mutationFn({ organizationId: 'org-123', data: { title: 'Check' } as never });
      expect(complianceApi.createComplianceCheck).toHaveBeenCalledWith('org-123', { title: 'Check' });
    });
  });

  describe('useCreateEvidence', () => {
    it('calls createEvidence and invalidates', async () => {
      const { complianceApi } = await import('../../lib/api/compliance');
      vi.mocked(complianceApi.createEvidence).mockResolvedValue({ id: 'ev-1' } as never);

      useCreateEvidence();
      const opts = getLatestMutationOptions();

      await opts.mutationFn({ organizationId: 'org-123', data: { compliance_check_id: 'check-1' } as never });
      expect(complianceApi.createEvidence).toHaveBeenCalledWith('org-123', { compliance_check_id: 'check-1' });
    });
  });

  describe('useCorrectiveActions', () => {
    it('uses correct queryKey with filters', () => {
      useCorrectiveActions('org-123', { status: 'open' });
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
        queryKey: ['compliance', 'corrective-actions', 'org-123', { status: 'open' }],
        enabled: true,
      }));
    });

    it('disables query when organizationId is null', () => {
      useCorrectiveActions(null);
      expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    });
  });

  describe('useCreateCorrectiveAction', () => {
    it('calls createCorrectiveAction and invalidates', async () => {
      const { complianceApi } = await import('../../lib/api/compliance');
      vi.mocked(complianceApi.createCorrectiveAction).mockResolvedValue({ id: 'action-1' } as never);

      useCreateCorrectiveAction();
      const opts = getLatestMutationOptions();

      await opts.mutationFn({ organizationId: 'org-123', data: { title: 'Action' } as never });
      expect(complianceApi.createCorrectiveAction).toHaveBeenCalledWith('org-123', { title: 'Action' });

      await opts.onSuccess?.({ id: 'action-1' }, { organizationId: 'org-123', data: {} } as never, {} as never, {} as never);
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
    });
  });
});
