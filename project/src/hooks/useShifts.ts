import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  shiftAssignmentsApi,
  shiftRequestsApi,
  shiftsApi,
  type AssignmentStatus,
  type CreateAssignmentInput,
  type CreateShiftInput,
  type CreateShiftRequestInput,
  type ShiftRequestStatus,
  type UpdateShiftInput,
} from '@/lib/api/shifts';

const orgKey = (orgId: string | null, ...rest: unknown[]) => ['hr', orgId, ...rest];

// ── Shifts ──────────────────────────────────────────────────────────

export function useShifts(orgId: string | null) {
  return useQuery({
    queryKey: orgKey(orgId, 'shifts'),
    queryFn: () => shiftsApi.list(orgId!),
    enabled: !!orgId,
  });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateShiftInput }) =>
      shiftsApi.create(orgId, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'shifts') }),
  });
}

export function useUpdateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateShiftInput }) =>
      shiftsApi.update(orgId, id, data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'shifts') }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) => shiftsApi.remove(orgId, id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'shifts') }),
  });
}

// ── Assignments ─────────────────────────────────────────────────────

export function useShiftAssignments(
  orgId: string | null,
  filters: { worker_id?: string; shift_id?: string; status?: AssignmentStatus } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'shift-assignments', filters),
    queryFn: () => shiftAssignmentsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateAssignmentInput }) =>
      shiftAssignmentsApi.create(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'shift-assignments') }),
  });
}

export function useDeactivateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      shiftAssignmentsApi.deactivate(orgId, id),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'shift-assignments') }),
  });
}

// ── Requests ────────────────────────────────────────────────────────

export function useShiftRequests(
  orgId: string | null,
  filters: { worker_id?: string; status?: ShiftRequestStatus } = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'shift-requests', filters),
    queryFn: () => shiftRequestsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateShiftRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateShiftRequestInput }) =>
      shiftRequestsApi.create(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'shift-requests') }),
  });
}

export function useResolveShiftRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      id,
      status,
    }: {
      orgId: string;
      id: string;
      status: 'approved' | 'rejected';
    }) => shiftRequestsApi.resolve(orgId, id, status),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'shift-requests') }),
  });
}
