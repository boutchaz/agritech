import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  hrComplianceApi,
  type CompliancePresetKey,
  type HrComplianceSettings,
  type UpdateHrComplianceInput,
} from '@/lib/api/hr-compliance';

const settingsKey = (orgId: string | null) => ['hr-compliance', orgId];
const presetsKey = (orgId: string | null) => ['hr-compliance', 'presets', orgId];
const summaryKey = (orgId: string | null) => ['hr-compliance', 'summary', orgId];

export function useHrComplianceSettings(organizationId: string | null) {
  return useQuery({
    queryKey: settingsKey(organizationId),
    queryFn: () => hrComplianceApi.get(organizationId!),
    enabled: !!organizationId,
  });
}

export function useHrCompliancePresets(organizationId: string | null) {
  return useQuery({
    queryKey: presetsKey(organizationId),
    queryFn: () => hrComplianceApi.listPresets(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHrComplianceSummary(organizationId: string | null) {
  return useQuery({
    queryKey: summaryKey(organizationId),
    queryFn: () => hrComplianceApi.summary(organizationId!),
    enabled: !!organizationId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, orgId: string) {
  qc.invalidateQueries({ queryKey: settingsKey(orgId) });
  qc.invalidateQueries({ queryKey: summaryKey(orgId) });
}

export function useUpdateHrCompliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: UpdateHrComplianceInput;
    }) => hrComplianceApi.update(organizationId, data),
    onSuccess: (_data: HrComplianceSettings, variables) => {
      invalidate(qc, variables.organizationId);
    },
  });
}

export function useApplyCompliancePreset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      organizationId,
      preset,
    }: {
      organizationId: string;
      preset: CompliancePresetKey;
    }) => hrComplianceApi.applyPreset(organizationId, preset),
    onSuccess: (_data, variables) => {
      invalidate(qc, variables.organizationId);
    },
  });
}
