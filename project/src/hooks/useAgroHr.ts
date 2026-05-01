import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  qualificationsApi,
  safetyIncidentsApi,
  seasonalCampaignsApi,
  workerTransportApi,
  type CampaignStatus,
  type CreateIncidentInput,
  type CreateQualificationInput,
  type CreateSeasonalCampaignInput,
  type CreateTransportInput,
  type IncidentStatus,
  type QualificationType,
  type SeasonType,
  type Severity,
  type UpdateIncidentInput,
  type UpdateQualificationInput,
  type UpdateSeasonalCampaignInput,
  type UpdateTransportInput,
} from '@/lib/api/agro-hr';

const orgKey = (orgId: string | null, ...rest: unknown[]) => ['hr', orgId, ...rest];

// ── Seasonal Campaigns ──────────────────────────────────────────────

export function useSeasonalCampaigns(
  orgId: string | null,
  filters: { farm_id?: string; status?: CampaignStatus; season_type?: SeasonType } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'seasonal-campaigns', filters),
    queryFn: () => seasonalCampaignsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateSeasonalCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateSeasonalCampaignInput }) =>
      seasonalCampaignsApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'seasonal-campaigns') }),
  });
}

export function useUpdateSeasonalCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      id,
      data,
    }: {
      orgId: string;
      id: string;
      data: UpdateSeasonalCampaignInput;
    }) => seasonalCampaignsApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'seasonal-campaigns') }),
  });
}

export function useDeleteSeasonalCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      seasonalCampaignsApi.remove(orgId, id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'seasonal-campaigns') }),
  });
}

// ── Qualifications ──────────────────────────────────────────────────

export function useQualifications(
  orgId: string | null,
  filters: { worker_id?: string; expiring_within_days?: number; type?: QualificationType } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'qualifications', filters),
    queryFn: () => qualificationsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateQualificationInput }) =>
      qualificationsApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'qualifications') }),
  });
}

export function useUpdateQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateQualificationInput }) =>
      qualificationsApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'qualifications') }),
  });
}

export function useVerifyQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      qualificationsApi.verify(orgId, id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'qualifications') }),
  });
}

export function useDeleteQualification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      qualificationsApi.remove(orgId, id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'qualifications') }),
  });
}

// ── Safety Incidents ────────────────────────────────────────────────

export function useSafetyIncidents(
  orgId: string | null,
  filters: { farm_id?: string; status?: IncidentStatus; severity?: Severity; from?: string; to?: string } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'safety-incidents', filters),
    queryFn: () => safetyIncidentsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useSafetyIncident(orgId: string | null, id: string | null) {
  return useQuery({
    queryKey: orgKey(orgId, 'safety-incidents', id),
    queryFn: () => safetyIncidentsApi.get(orgId!, id!),
    enabled: !!orgId && !!id,
  });
}

export function useCreateSafetyIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateIncidentInput }) =>
      safetyIncidentsApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'safety-incidents') }),
  });
}

export function useUpdateSafetyIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateIncidentInput }) =>
      safetyIncidentsApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'safety-incidents') }),
  });
}

// ── Worker Transport ────────────────────────────────────────────────

export function useWorkerTransport(
  orgId: string | null,
  filters: { farm_id?: string; from?: string; to?: string } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'worker-transport', filters),
    queryFn: () => workerTransportApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateWorkerTransport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateTransportInput }) =>
      workerTransportApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'worker-transport') }),
  });
}

export function useUpdateWorkerTransport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateTransportInput }) =>
      workerTransportApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'worker-transport') }),
  });
}

export function useDeleteWorkerTransport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      workerTransportApi.remove(orgId, id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'worker-transport') }),
  });
}
