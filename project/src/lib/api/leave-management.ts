import { apiClient } from '../api-client';

const BASE = (orgId: string) => `/api/v1/organizations/${orgId}`;

// ── Types ──────────────────────────────────────────────────────────

export interface LeaveType {
  id: string;
  organization_id: string;
  name: string;
  name_fr: string | null;
  name_ar: string | null;
  description: string | null;
  annual_allocation: number;
  is_carry_forward: boolean;
  maximum_carry_forward_days: number;
  carry_forward_expiry_months: number;
  is_encashable: boolean;
  encashment_amount_per_day: number | null;
  applicable_worker_types: string[];
  is_paid: boolean;
  requires_approval: boolean;
  maximum_consecutive_days: number | null;
  minimum_advance_notice_days: number;
  is_earned_leave: boolean;
  earned_leave_frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual' | null;
  earned_leave_days_per_period: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateLeaveTypeInput = Partial<Omit<LeaveType, 'id' | 'organization_id' | 'created_at' | 'updated_at'>> & {
  name: string;
};
export type UpdateLeaveTypeInput = Partial<CreateLeaveTypeInput>;

export interface LeaveAllocation {
  id: string;
  organization_id: string;
  worker_id: string;
  leave_type_id: string;
  total_days: number;
  used_days: number;
  expired_days: number;
  carry_forwarded_days: number;
  encashed_days: number;
  remaining_days: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
  worker?: { id: string; first_name: string; last_name: string; cin: string | null };
  leave_type?: { id: string; name: string };
}

export interface CreateAllocationInput {
  worker_id: string;
  leave_type_id: string;
  total_days: number;
  period_start: string;
  period_end: string;
  carry_forwarded_days?: number;
}

export interface BulkAllocateInput {
  leave_type_id: string;
  worker_ids: string[];
  total_days: number;
  period_start: string;
  period_end: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveApplication {
  id: string;
  organization_id: string;
  worker_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  total_days: number;
  half_day: boolean;
  half_day_period: 'first_half' | 'second_half' | null;
  reason: string;
  attachment_urls: string[] | null;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  is_block_day: boolean;
  created_at: string;
  updated_at: string;
  worker?: {
    id: string; first_name: string; last_name: string;
    cin: string | null; user_id: string | null;
  };
  leave_type?: { id: string; name: string };
}

export interface CreateApplicationInput {
  worker_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  half_day?: boolean;
  half_day_period?: 'first_half' | 'second_half';
  reason: string;
  attachment_urls?: string[];
}

export interface HolidayList {
  id: string;
  organization_id: string;
  name: string;
  year: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  holidays?: Holiday[];
}

export interface Holiday {
  id: string;
  holiday_list_id: string;
  date: string;
  name: string;
  name_fr: string | null;
  name_ar: string | null;
  holiday_type: 'public' | 'optional' | 'weekly_off';
  description: string | null;
}

export interface AddHolidaysInput {
  holidays: Array<{
    date: string;
    name: string;
    name_fr?: string;
    name_ar?: string;
    holiday_type?: 'public' | 'optional' | 'weekly_off';
    description?: string;
  }>;
}

// ── API ────────────────────────────────────────────────────────────

export const leaveTypesApi = {
  list: (orgId: string, includeInactive = false) =>
    apiClient.get<LeaveType[]>(
      `${BASE(orgId)}/leave-types${includeInactive ? '?includeInactive=true' : ''}`,
      {},
      orgId,
    ),
  create: (orgId: string, dto: CreateLeaveTypeInput) =>
    apiClient.post<LeaveType>(`${BASE(orgId)}/leave-types`, dto, {}, orgId),
  update: (orgId: string, id: string, dto: UpdateLeaveTypeInput) =>
    apiClient.put<LeaveType>(`${BASE(orgId)}/leave-types/${id}`, dto, {}, orgId),
  deactivate: (orgId: string, id: string) =>
    apiClient.delete<LeaveType>(`${BASE(orgId)}/leave-types/${id}`, {}, orgId),
};

export const leaveAllocationsApi = {
  list: (orgId: string, filters: { worker_id?: string; leave_type_id?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    const q = qs.toString();
    return apiClient.get<LeaveAllocation[]>(
      `${BASE(orgId)}/leave-allocations${q ? `?${q}` : ''}`,
      {},
      orgId,
    );
  },
  forWorker: (orgId: string, workerId: string) =>
    apiClient.get<LeaveAllocation[]>(
      `${BASE(orgId)}/leave-allocations/worker/${workerId}`,
      {},
      orgId,
    ),
  create: (orgId: string, dto: CreateAllocationInput) =>
    apiClient.post<LeaveAllocation>(`${BASE(orgId)}/leave-allocations`, dto, {}, orgId),
  bulk: (orgId: string, dto: BulkAllocateInput) =>
    apiClient.post<LeaveAllocation[]>(`${BASE(orgId)}/leave-allocations/bulk`, dto, {}, orgId),
};

export const leaveApplicationsApi = {
  list: (
    orgId: string,
    filters: { worker_id?: string; status?: LeaveStatus; from?: string; to?: string } = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    const q = qs.toString();
    return apiClient.get<LeaveApplication[]>(
      `${BASE(orgId)}/leave-applications${q ? `?${q}` : ''}`,
      {},
      orgId,
    );
  },
  calendar: (orgId: string, from: string, to: string) =>
    apiClient.get<LeaveApplication[]>(
      `${BASE(orgId)}/leave-applications/calendar?from=${from}&to=${to}`,
      {},
      orgId,
    ),
  create: (orgId: string, dto: CreateApplicationInput) =>
    apiClient.post<LeaveApplication>(`${BASE(orgId)}/leave-applications`, dto, {}, orgId),
  approve: (orgId: string, id: string) =>
    apiClient.put<LeaveApplication>(`${BASE(orgId)}/leave-applications/${id}/approve`, {}, {}, orgId),
  reject: (orgId: string, id: string, rejection_reason: string) =>
    apiClient.put<LeaveApplication>(
      `${BASE(orgId)}/leave-applications/${id}/reject`,
      { rejection_reason },
      {},
      orgId,
    ),
  cancel: (orgId: string, id: string) =>
    apiClient.put<LeaveApplication>(`${BASE(orgId)}/leave-applications/${id}/cancel`, {}, {}, orgId),
};

export const holidaysApi = {
  listLists: (orgId: string, year?: number) =>
    apiClient.get<HolidayList[]>(
      `${BASE(orgId)}/holidays/lists${year ? `?year=${year}` : ''}`,
      {},
      orgId,
    ),
  createList: (orgId: string, dto: { name: string; year: number; description?: string }) =>
    apiClient.post<HolidayList>(`${BASE(orgId)}/holidays/lists`, dto, {}, orgId),
  addHolidays: (orgId: string, listId: string, dto: AddHolidaysInput) =>
    apiClient.post<Holiday[]>(`${BASE(orgId)}/holidays/lists/${listId}/holidays`, dto, {}, orgId),
  pullRegional: (orgId: string, listId: string, year: number) =>
    apiClient.post<Holiday[]>(
      `${BASE(orgId)}/holidays/lists/${listId}/pull-regional?year=${year}`,
      {},
      {},
      orgId,
    ),
  deleteList: (orgId: string, listId: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/holidays/lists/${listId}`, {}, orgId),
};
