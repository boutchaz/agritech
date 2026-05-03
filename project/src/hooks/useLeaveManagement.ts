import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  holidaysApi,
  leaveAllocationsApi,
  leaveApplicationsApi,
  leaveBlockDatesApi,
  leaveEncashmentsApi,
  leaveTypesApi,
  type AddHolidaysInput,
  type BulkAllocateInput,
  type CreateAllocationInput,
  type CreateApplicationInput,
  type CreateLeaveBlockDateInput,
  type CreateLeaveEncashmentInput,
  type CreateLeaveTypeInput,
  type LeaveStatus,
  type PaginationParams,
  type UpdateLeaveTypeInput,
} from '@/lib/api/leave-management';

const orgKey = (orgId: string | null, ...rest: unknown[]) => ['hr', orgId, ...rest];

// ── Leave Types ─────────────────────────────────────────────────────

export function useLeaveTypes(
  orgId: string | null,
  includeInactive = false,
  pagination: PaginationParams = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'leave-types', includeInactive, pagination),
    queryFn: () => leaveTypesApi.list(orgId!, includeInactive, pagination),
    enabled: !!orgId,
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateLeaveTypeInput }) =>
      leaveTypesApi.create(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-types') }),
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: UpdateLeaveTypeInput }) =>
      leaveTypesApi.update(orgId, id, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-types') }),
  });
}

export function useDeactivateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      leaveTypesApi.deactivate(orgId, id),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-types') }),
  });
}

// ── Leave Allocations ───────────────────────────────────────────────

export function useLeaveAllocations(
  orgId: string | null,
  filters: { worker_id?: string; leave_type_id?: string } & PaginationParams = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'leave-allocations', filters),
    queryFn: () => leaveAllocationsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateAllocationInput }) =>
      leaveAllocationsApi.create(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-allocations') }),
  });
}

export function useBulkAllocate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: BulkAllocateInput }) =>
      leaveAllocationsApi.bulk(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-allocations') }),
  });
}

// ── Leave Applications ──────────────────────────────────────────────

export function useLeaveApplications(
  orgId: string | null,
  filters: {
    worker_id?: string;
    status?: LeaveStatus;
    from?: string;
    to?: string;
  } & PaginationParams = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'leave-applications', filters),
    queryFn: () => leaveApplicationsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateApplicationInput }) =>
      leaveApplicationsApi.create(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-applications') }),
  });
}

export function useApproveApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      leaveApplicationsApi.approve(orgId, id),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-applications') });
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-allocations') });
    },
  });
}

export function useRejectApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, reason }: { orgId: string; id: string; reason: string }) =>
      leaveApplicationsApi.reject(orgId, id, reason),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-applications') }),
  });
}

export function useCancelApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      leaveApplicationsApi.cancel(orgId, id),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-applications') });
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-allocations') });
    },
  });
}

// ── Holidays ────────────────────────────────────────────────────────

export function useHolidayLists(orgId: string | null, year?: number) {
  return useQuery({
    queryKey: orgKey(orgId, 'holiday-lists', year),
    queryFn: () => holidaysApi.listLists(orgId!, year),
    enabled: !!orgId,
  });
}

export function useCreateHolidayList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      data,
    }: {
      orgId: string;
      data: { name: string; year: number; description?: string };
    }) => holidaysApi.createList(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'holiday-lists') }),
  });
}

export function useAddHolidays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      listId,
      data,
    }: {
      orgId: string;
      listId: string;
      data: AddHolidaysInput;
    }) => holidaysApi.addHolidays(orgId, listId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'holiday-lists') }),
  });
}

export function usePullRegionalHolidays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orgId,
      listId,
      year,
    }: {
      orgId: string;
      listId: string;
      year: number;
    }) => holidaysApi.pullRegional(orgId, listId, year),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'holiday-lists') }),
  });
}

export function useDeleteHolidayList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, listId }: { orgId: string; listId: string }) =>
      holidaysApi.deleteList(orgId, listId),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'holiday-lists') }),
  });
}

// ── Leave Block Dates ───────────────────────────────────────────────

export function useLeaveBlockDates(
  orgId: string | null,
  filters: {
    from?: string;
    to?: string;
    leave_type_id?: string;
  } & PaginationParams = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'leave-block-dates', filters),
    queryFn: () => leaveBlockDatesApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateLeaveBlockDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateLeaveBlockDateInput }) =>
      leaveBlockDatesApi.create(orgId, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-block-dates') }),
  });
}

export function useUpdateLeaveBlockDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id, data }: { orgId: string; id: string; data: Partial<CreateLeaveBlockDateInput> }) =>
      leaveBlockDatesApi.update(orgId, id, data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-block-dates') }),
  });
}

export function useDeleteLeaveBlockDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      leaveBlockDatesApi.delete(orgId, id),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-block-dates') }),
  });
}

// ── Leave Encashments ───────────────────────────────────────────────

export function useLeaveEncashments(
  orgId: string | null,
  filters: { worker_id?: string; status?: string } & PaginationParams = {},
) {
  return useQuery({
    queryKey: orgKey(orgId, 'leave-encashments', filters),
    queryFn: () => leaveEncashmentsApi.list(orgId!, filters),
    enabled: !!orgId,
  });
}

export function useCreateLeaveEncashment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, data }: { orgId: string; data: CreateLeaveEncashmentInput }) =>
      leaveEncashmentsApi.create(orgId, data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-encashments') });
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-allocations') });
    },
  });
}

export function useApproveLeaveEncashment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      leaveEncashmentsApi.approve(orgId, id),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-encashments') }),
  });
}

export function useMarkPaidLeaveEncashment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      leaveEncashmentsApi.markPaid(orgId, id),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-encashments') }),
  });
}

export function useCancelLeaveEncashment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, id }: { orgId: string; id: string }) =>
      leaveEncashmentsApi.cancel(orgId, id),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-encashments') });
      qc.invalidateQueries({ queryKey: orgKey(v.orgId, 'leave-allocations') });
    },
  });
}
