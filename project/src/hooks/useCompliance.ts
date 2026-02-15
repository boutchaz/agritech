import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  complianceApi,
  type CreateCertificationDto,
  type UpdateCertificationDto,
  type CertificationResponseDto,
  type CreateComplianceCheckDto,
  type UpdateComplianceCheckDto,
  type ComplianceCheckResponseDto,
  type CreateEvidenceDto,
  type EvidenceResponseDto,
  type ComplianceRequirementDto,
  type ComplianceDashboardStats,
  type CreateCorrectiveActionPlanDto,
  type UpdateCorrectiveActionPlanDto,
  type CorrectiveActionPlanResponseDto,
  type CorrectiveActionStats,
} from '../lib/api/compliance';

// =====================================================
// QUERY HOOKS - CERTIFICATIONS
// =====================================================

/**
 * Fetch all certifications for organization
 */
export function useCertifications(organizationId: string | null) {
  return useQuery({
    queryKey: ['compliance', 'certifications', organizationId],
    queryFn: async (): Promise<CertificationResponseDto[]> => {
      if (!organizationId) return [];
      return complianceApi.getCertifications(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch single certification by ID
 */
export function useCertification(organizationId: string | null, certificationId: string | null) {
  return useQuery({
    queryKey: ['compliance', 'certification', certificationId],
    queryFn: async (): Promise<CertificationResponseDto | null> => {
      if (!certificationId || !organizationId) return null;
      return complianceApi.getCertification(organizationId, certificationId);
    },
    enabled: !!certificationId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// QUERY HOOKS - COMPLIANCE CHECKS
// =====================================================

/**
 * Fetch all compliance checks for organization
 */
export function useComplianceChecks(organizationId: string | null) {
  return useQuery({
    queryKey: ['compliance', 'checks', organizationId],
    queryFn: async (): Promise<ComplianceCheckResponseDto[]> => {
      if (!organizationId) return [];
      return complianceApi.getComplianceChecks(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch single compliance check by ID
 */
export function useComplianceCheck(organizationId: string | null, checkId: string | null) {
  return useQuery({
    queryKey: ['compliance', 'check', checkId],
    queryFn: async (): Promise<ComplianceCheckResponseDto | null> => {
      if (!checkId || !organizationId) return null;
      return complianceApi.getComplianceCheck(organizationId, checkId);
    },
    enabled: !!checkId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// QUERY HOOKS - REQUIREMENTS & DASHBOARD
// =====================================================

/**
 * Fetch compliance requirements, optionally filtered by certification type
 */
export function useComplianceRequirements(certificationType?: string) {
  return useQuery({
    queryKey: ['compliance', 'requirements', certificationType],
    queryFn: async (): Promise<ComplianceRequirementDto[]> => {
      return complianceApi.getComplianceRequirements(certificationType);
    },
    staleTime: 10 * 60 * 1000, // Longer stale time for reference data
  });
}

/**
 * Fetch compliance dashboard statistics
 */
export function useComplianceDashboard(organizationId: string | null) {
  return useQuery({
    queryKey: ['compliance', 'dashboard', organizationId],
    queryFn: async (): Promise<ComplianceDashboardStats | null> => {
      if (!organizationId) return null;
      return complianceApi.getDashboardStats(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // Shorter stale time for dashboard stats
  });
}

// =====================================================
// MUTATION HOOKS - CERTIFICATIONS
// =====================================================

/**
 * Create new certification
 */
export function useCreateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: CreateCertificationDto;
    }): Promise<CertificationResponseDto> => {
      return complianceApi.createCertification(organizationId, data);
    },
    onSuccess: (_, variables) => {
      // Invalidate certifications list and dashboard
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'certifications', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', variables.organizationId],
      });
      toast.success('Certification created successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create certification';
      toast.error(message);
    },
  });
}

/**
 * Update certification
 */
export function useUpdateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      certificationId,
      data,
    }: {
      organizationId: string;
      certificationId: string;
      data: UpdateCertificationDto;
    }): Promise<CertificationResponseDto> => {
      return complianceApi.updateCertification(organizationId, certificationId, data);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific certification, certifications list, and dashboard
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'certification', variables.certificationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'certifications', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', variables.organizationId],
      });
      toast.success('Certification updated successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update certification';
      toast.error(message);
    },
  });
}

/**
 * Delete certification
 */
export function useDeleteCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      certificationId,
    }: {
      organizationId: string;
      certificationId: string;
    }): Promise<void> => {
      return complianceApi.deleteCertification(organizationId, certificationId);
    },
    onSuccess: (_, variables) => {
      // Invalidate certifications list, checks, and dashboard
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'certifications', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'checks', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', variables.organizationId],
      });
      toast.success('Certification deleted successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete certification';
      toast.error(message);
    },
  });
}

// =====================================================
// MUTATION HOOKS - COMPLIANCE CHECKS
// =====================================================

/**
 * Create new compliance check
 */
export function useCreateComplianceCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: CreateComplianceCheckDto;
    }): Promise<ComplianceCheckResponseDto> => {
      return complianceApi.createComplianceCheck(organizationId, data);
    },
    onSuccess: (_, variables) => {
      // Invalidate checks list and dashboard
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'checks', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', variables.organizationId],
      });
      toast.success('Compliance check created successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create compliance check';
      toast.error(message);
    },
  });
}

/**
 * Update compliance check
 */
export function useUpdateComplianceCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      checkId,
      data,
    }: {
      organizationId: string;
      checkId: string;
      data: UpdateComplianceCheckDto;
    }): Promise<ComplianceCheckResponseDto> => {
      return complianceApi.updateComplianceCheck(organizationId, checkId, data);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific check, checks list, and dashboard
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'check', variables.checkId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'checks', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', variables.organizationId],
      });
      toast.success('Compliance check updated successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update compliance check';
      toast.error(message);
    },
  });
}

/**
 * Delete compliance check
 */
export function useDeleteComplianceCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      checkId,
    }: {
      organizationId: string;
      checkId: string;
    }): Promise<void> => {
      return complianceApi.deleteComplianceCheck(organizationId, checkId);
    },
    onSuccess: (_, variables) => {
      // Invalidate checks list and dashboard
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'checks', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', variables.organizationId],
      });
      toast.success('Compliance check deleted successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete compliance check';
      toast.error(message);
    },
  });
}

// =====================================================
// MUTATION HOOKS - EVIDENCE
// =====================================================

/**
 * Upload compliance evidence
 */
export function useCreateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: CreateEvidenceDto;
    }): Promise<EvidenceResponseDto> => {
      return complianceApi.createEvidence(organizationId, data);
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific check that this evidence supports
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'check', variables.data.compliance_check_id],
      });
      // Invalidate checks list and dashboard
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'checks', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', variables.organizationId],
      });
      toast.success('Evidence uploaded successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to upload evidence';
      toast.error(message);
    },
  });
}

// =====================================================
// QUERY HOOKS - CORRECTIVE ACTIONS
// =====================================================

export function useCorrectiveActions(
  organizationId: string | null,
  filters?: { certification_id?: string; status?: string; priority?: string }
) {
  return useQuery({
    queryKey: ['compliance', 'corrective-actions', organizationId, filters],
    queryFn: async (): Promise<CorrectiveActionPlanResponseDto[]> => {
      if (!organizationId) return [];
      return complianceApi.getCorrectiveActions(organizationId, filters);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCorrectiveAction(organizationId: string | null, actionId: string | null) {
  return useQuery({
    queryKey: ['compliance', 'corrective-action', actionId],
    queryFn: async (): Promise<CorrectiveActionPlanResponseDto | null> => {
      if (!actionId || !organizationId) return null;
      return complianceApi.getCorrectiveAction(organizationId, actionId);
    },
    enabled: !!actionId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCorrectiveActionStats(organizationId: string | null) {
  return useQuery({
    queryKey: ['compliance', 'corrective-action-stats', organizationId],
    queryFn: async (): Promise<CorrectiveActionStats | null> => {
      if (!organizationId) return null;
      return complianceApi.getCorrectiveActionStats(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

// =====================================================
// MUTATION HOOKS - CORRECTIVE ACTIONS
// =====================================================

export function useCreateCorrectiveAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: CreateCorrectiveActionPlanDto;
    }): Promise<CorrectiveActionPlanResponseDto> => {
      return complianceApi.createCorrectiveAction(organizationId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'corrective-actions', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'corrective-action-stats', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', variables.organizationId],
      });
      toast.success('Action corrective créée avec succès');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Échec de la création';
      toast.error(message);
    },
  });
}

export function useUpdateCorrectiveAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      actionId,
      data,
    }: {
      organizationId: string;
      actionId: string;
      data: UpdateCorrectiveActionPlanDto;
    }): Promise<CorrectiveActionPlanResponseDto> => {
      return complianceApi.updateCorrectiveAction(organizationId, actionId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'corrective-action', variables.actionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'corrective-actions', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'corrective-action-stats', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', variables.organizationId],
      });
      toast.success('Action corrective mise à jour');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Échec de la mise à jour';
      toast.error(message);
    },
  });
}

export function useDeleteCorrectiveAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      actionId,
    }: {
      organizationId: string;
      actionId: string;
    }): Promise<void> => {
      return complianceApi.deleteCorrectiveAction(organizationId, actionId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'corrective-actions', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'corrective-action-stats', variables.organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', variables.organizationId],
      });
      toast.success('Action corrective supprimée');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Échec de la suppression';
      toast.error(message);
    },
  });
}
