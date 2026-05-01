import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  onboardingRecordsApi,
  onboardingTemplatesApi,
  separationsApi,
  type CreateOnboardingTemplateInput,
  type CreateSeparationInput,
  type OnboardingStatus,
  type SeparationStatus,
  type StartOnboardingInput,
  type UpdateFnfInput,
  type UpdateOnboardingRecordInput,
  type UpdateOnboardingTemplateInput,
  type UpdateSeparationInput,
} from '@/lib/api/employee-lifecycle';

const orgKey = (orgId: string | null, ...rest: unknown[]) => ['hr', orgId, ...rest];

// ── Onboarding Templates ────────────────────────────────────────────

export function useOnboardingTemplates(orgId: string | null) {
  return useQuery({
    queryKey: orgKey(orgId, 'onboarding-templates'),
    queryFn: () => onboardingTemplatesApi.list(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateOnboardingTemplateInput }) =>
      onboardingTemplatesApi.create(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'onboarding-templates') }),
  });
}

export function useUpdateOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      id,
      data,
    }: {
      orgId: string;
      id: string;
      data: UpdateOnboardingTemplateInput;
    }) => onboardingTemplatesApi.update(orgId, id, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'onboarding-templates') }),
  });
}

export function useDeleteOnboardingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      onboardingTemplatesApi.remove(orgId, id),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'onboarding-templates') }),
  });
}

// ── Onboarding Records ──────────────────────────────────────────────

export function useOnboardingRecords(
  orgId: string | null,
  filters: { worker_id?: string; status?: OnboardingStatus } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'onboarding-records', filters),
    queryFn: () => onboardingRecordsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useStartOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: StartOnboardingInput }) =>
      onboardingRecordsApi.start(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'onboarding-records') }),
  });
}

export function useUpdateOnboardingRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      id,
      data,
    }: {
      orgId: string;
      id: string;
      data: UpdateOnboardingRecordInput;
    }) => onboardingRecordsApi.update(orgId, id, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'onboarding-records') }),
  });
}

// ── Separations ─────────────────────────────────────────────────────

export function useSeparations(
  orgId: string | null,
  filters: { status?: SeparationStatus; worker_id?: string } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'separations', filters),
    queryFn: () => separationsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useSeparation(orgId: string | null, id: string | null) {
  return useQuery({
    queryKey: orgKey(orgId, 'separations', id),
    queryFn: () => separationsApi.get(orgId!, id!),
    enabled: !!orgId && !!id,
  });
}

export function useCreateSeparation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateSeparationInput }) =>
      separationsApi.create(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'separations') }),
  });
}

export function useUpdateSeparation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateSeparationInput }) =>
      separationsApi.update(orgId, id, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'separations') }),
  });
}

export function useUpdateFnf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateFnfInput }) =>
      separationsApi.updateFnf(orgId, id, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'separations') }),
  });
}
