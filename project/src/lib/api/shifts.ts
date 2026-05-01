import { apiClient } from '../api-client';

const BASE = (orgId: string) => `/api/v1/organizations/${orgId}`;

// ── Types ──────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  working_hours: number;
  enable_auto_attendance: boolean;
  mark_late_after_minutes: number | null;
  early_exit_before_minutes: number | null;
  is_active: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateShiftInput {
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  grace_period_minutes?: number;
  enable_auto_attendance?: boolean;
  mark_late_after_minutes?: number;
  early_exit_before_minutes?: number;
  is_active?: boolean;
  color?: string;
}
export type UpdateShiftInput = Partial<CreateShiftInput>;

export type AssignmentStatus = 'active' | 'inactive';

export interface ShiftAssignment {
  id: string;
  organization_id: string;
  worker_id: string;
  shift_id: string;
  effective_from: string;
  effective_to: string | null;
  is_recurring: boolean;
  recurring_days: number[];
  status: AssignmentStatus;
  assigned_by: string | null;
  created_at: string;
  worker?: { id: string; first_name: string; last_name: string; cin: string | null };
  shift?: { id: string; name: string; start_time: string; end_time: string; color: string };
}

export interface CreateAssignmentInput {
  worker_id: string;
  shift_id: string;
  effective_from: string;
  effective_to?: string;
  is_recurring?: boolean;
  recurring_days?: number[];
}

export type ShiftRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ShiftRequest {
  id: string;
  organization_id: string;
  worker_id: string;
  requested_shift_id: string;
  current_shift_id: string | null;
  date: string;
  reason: string | null;
  status: ShiftRequestStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  worker?: { id: string; first_name: string; last_name: string };
  requested_shift?: { id: string; name: string };
  current_shift?: { id: string; name: string } | null;
}

export interface CreateShiftRequestInput {
  worker_id: string;
  requested_shift_id: string;
  current_shift_id?: string;
  date: string;
  reason?: string;
}

// ── API ────────────────────────────────────────────────────────────

export const shiftsApi = {
  list: (orgId: string) =>
    apiClient.get<Shift[]>(`${BASE(orgId)}/shifts`, {}, orgId),
  create: (orgId: string, data: CreateShiftInput) =>
    apiClient.post<Shift>(`${BASE(orgId)}/shifts`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateShiftInput) =>
    apiClient.put<Shift>(`${BASE(orgId)}/shifts/${id}`, data, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/shifts/${id}`, {}, orgId),
};

export const shiftAssignmentsApi = {
  list: (
    orgId: string,
    filters: { worker_id?: string; shift_id?: string; status?: AssignmentStatus } = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    const q = qs.toString();
    return apiClient.get<ShiftAssignment[]>(
      `${BASE(orgId)}/shift-assignments${q ? `?${q}` : ''}`,
      {},
      orgId,
    );
  },
  create: (orgId: string, data: CreateAssignmentInput) =>
    apiClient.post<ShiftAssignment>(`${BASE(orgId)}/shift-assignments`, data, {}, orgId),
  deactivate: (orgId: string, id: string) =>
    apiClient.delete<ShiftAssignment>(`${BASE(orgId)}/shift-assignments/${id}`, {}, orgId),
};

export const shiftRequestsApi = {
  list: (
    orgId: string,
    filters: { worker_id?: string; status?: ShiftRequestStatus } = {},
  ) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    const q = qs.toString();
    return apiClient.get<ShiftRequest[]>(
      `${BASE(orgId)}/shift-requests${q ? `?${q}` : ''}`,
      {},
      orgId,
    );
  },
  create: (orgId: string, data: CreateShiftRequestInput) =>
    apiClient.post<ShiftRequest>(`${BASE(orgId)}/shift-requests`, data, {}, orgId),
  resolve: (orgId: string, id: string, status: 'approved' | 'rejected') =>
    apiClient.put<ShiftRequest>(`${BASE(orgId)}/shift-requests/${id}/resolve`, { status }, {}, orgId),
};
