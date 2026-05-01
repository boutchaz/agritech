import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  grievancesApi,
  hrAnalyticsApi,
  trainingEnrollmentsApi,
  trainingProgramsApi,
  type CreateGrievanceInput,
  type CreateProgramInput,
  type EnrollmentStatus,
  type GrievancePriority,
  type GrievanceStatus,
  type GrievanceType,
  type UpdateEnrollmentInput,
  type UpdateGrievanceInput,
} from '@/lib/api/hr-advanced';

const orgKey = (orgId: string | null, ...rest: unknown[]) => ['hr', orgId, ...rest];

// ── Grievances ──────────────────────────────────────────────────────

export function useGrievances(
  orgId: string | null,
  filters: { status?: GrievanceStatus; priority?: GrievancePriority; grievance_type?: GrievanceType } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'grievances', filters),
    queryFn: () => grievancesApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateGrievance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateGrievanceInput }) =>
      grievancesApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'grievances') }),
  });
}

export function useUpdateGrievance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateGrievanceInput }) =>
      grievancesApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'grievances') }),
  });
}

// ── Training Programs ───────────────────────────────────────────────

export function useTrainingPrograms(orgId: string | null, includeInactive = false) {
  return useQuery({
    queryKey: orgKey(orgId, 'training-programs', includeInactive),
    queryFn: () => trainingProgramsApi.list(orgId!, includeInactive),
    enabled: !!orgId,
  });
}

export function useCreateTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateProgramInput }) =>
      trainingProgramsApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'training-programs') }),
  });
}

export function useUpdateTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      id,
      data,
    }: {
      orgId: string;
      id: string;
      data: Partial<CreateProgramInput> & { is_active?: boolean };
    }) => trainingProgramsApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'training-programs') }),
  });
}

export function useDeleteTrainingProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      trainingProgramsApi.remove(orgId, id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'training-programs') }),
  });
}

// ── Training Enrollments ────────────────────────────────────────────

export function useTrainingEnrollments(
  orgId: string | null,
  filters: { program_id?: string; worker_id?: string; status?: EnrollmentStatus } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'training-enrollments', filters),
    queryFn: () => trainingEnrollmentsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useBulkEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      program_id,
      worker_ids,
      enrolled_date,
    }: {
      orgId: string;
      program_id: string;
      worker_ids: string[];
      enrolled_date: string;
    }) => trainingEnrollmentsApi.bulkEnroll(orgId, program_id, worker_ids, enrolled_date),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'training-enrollments') }),
  });
}

export function useUpdateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateEnrollmentInput }) =>
      trainingEnrollmentsApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'training-enrollments') }),
  });
}

// ── Tasks Bridge ────────────────────────────────────────────────────

import { hrCalendarApi, hrTasksBridgeApi, myHrApi, type HrEventType } from '@/lib/api/hr-advanced';

export function useMyHrSummary(orgId: string | null) {
  return useQuery({
    queryKey: orgKey(orgId, 'my-hr-summary'),
    queryFn: () => myHrApi.summary(orgId!),
    enabled: !!orgId,
  });
}

export function useSyncOnboardingTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, recordId }: { orgId: string; recordId: string }) =>
      hrTasksBridgeApi.syncOnboarding(orgId, recordId),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'onboarding-records') });
    },
  });
}

export function useSyncSafetyTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, incidentId }: { orgId: string; incidentId: string }) =>
      hrTasksBridgeApi.syncSafetyIncident(orgId, incidentId),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'safety-incidents') });
    },
  });
}

// ── Calendar ────────────────────────────────────────────────────────

export function useHrCalendar(
  orgId: string | null,
  from: string,
  to: string,
  types?: HrEventType[],
) {
  return useQuery({
    queryKey: orgKey(orgId, 'hr-calendar', from, to, types),
    queryFn: () => hrCalendarApi.list(orgId!, from, to, types),
    enabled: !!orgId && !!from && !!to,
  });
}

// ── Analytics ───────────────────────────────────────────────────────

export function useWorkforceSummary(orgId: string | null) {
  return useQuery({
    queryKey: orgKey(orgId, 'analytics', 'workforce'),
    queryFn: () => hrAnalyticsApi.workforce(orgId!),
    enabled: !!orgId,
  });
}

export function useLeaveBalanceSummary(orgId: string | null) {
  return useQuery({
    queryKey: orgKey(orgId, 'analytics', 'leave-balances'),
    queryFn: () => hrAnalyticsApi.leaveBalances(orgId!),
    enabled: !!orgId,
  });
}
