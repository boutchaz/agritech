import { apiClient } from '../api-client';

const BASE = (orgId: string) => `/api/v1/organizations/${orgId}`;

const qs = (filters: Record<string, string | number | undefined>) => {
  const u = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : '';
};

// ── Grievances ─────────────────────────────────────────────────────

export type GrievanceType =
  | 'workplace' | 'colleague' | 'department' | 'policy' | 'harassment' | 'safety' | 'other';
export type GrievancePriority = 'low' | 'medium' | 'high' | 'urgent';
export type GrievanceStatus =
  | 'submitted' | 'acknowledged' | 'investigating' | 'resolved' | 'escalated' | 'closed';

export interface Grievance {
  id: string;
  organization_id: string;
  raised_by_worker_id: string;
  against_worker_id: string | null;
  against_department: string | null;
  subject: string;
  description: string;
  grievance_type: GrievanceType;
  priority: GrievancePriority;
  is_anonymous: boolean;
  resolution: string | null;
  resolution_date: string | null;
  resolved_by: string | null;
  status: GrievanceStatus;
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
  raised_by?: { id: string; first_name: string; last_name: string };
  against?: { id: string; first_name: string; last_name: string } | null;
}

export interface CreateGrievanceInput {
  raised_by_worker_id: string;
  against_worker_id?: string;
  against_department?: string;
  subject: string;
  description: string;
  grievance_type: GrievanceType;
  priority?: GrievancePriority;
  is_anonymous?: boolean;
  attachments?: string[];
}

export interface UpdateGrievanceInput extends Partial<CreateGrievanceInput> {
  status?: GrievanceStatus;
  resolution?: string;
  resolution_date?: string;
}

export const grievancesApi = {
  list: (
    orgId: string,
    filters: { status?: GrievanceStatus; priority?: GrievancePriority; grievance_type?: GrievanceType } = {},
  ) => apiClient.get<Grievance[]>(`${BASE(orgId)}/grievances${qs(filters)}`, {}, orgId),
  create: (orgId: string, data: CreateGrievanceInput) =>
    apiClient.post<Grievance>(`${BASE(orgId)}/grievances`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateGrievanceInput) =>
    apiClient.put<Grievance>(`${BASE(orgId)}/grievances/${id}`, data, {}, orgId),
};

// ── Training ───────────────────────────────────────────────────────

export type TrainingType = 'safety' | 'technical' | 'certification' | 'onboarding' | 'other';
export type Recurrence = 'annual' | 'biannual' | 'one_time';
export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface TrainingProgram {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  training_type: TrainingType | null;
  provider: string | null;
  duration_hours: number | null;
  cost_per_participant: number | null;
  is_mandatory: boolean;
  recurrence: Recurrence | null;
  applicable_worker_types: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateProgramInput {
  name: string;
  description?: string;
  training_type?: TrainingType;
  provider?: string;
  duration_hours?: number;
  cost_per_participant?: number;
  is_mandatory?: boolean;
  recurrence?: Recurrence;
  applicable_worker_types?: string[];
}

export interface TrainingEnrollment {
  id: string;
  organization_id: string;
  program_id: string;
  worker_id: string;
  enrolled_date: string;
  completion_date: string | null;
  status: EnrollmentStatus;
  score: number | null;
  certificate_url: string | null;
  feedback: string | null;
  created_at: string;
  worker?: { id: string; first_name: string; last_name: string };
  program?: { id: string; name: string; training_type: TrainingType | null };
}

export interface UpdateEnrollmentInput {
  status?: EnrollmentStatus;
  completion_date?: string;
  score?: number;
  certificate_url?: string;
  feedback?: string;
}

export const trainingProgramsApi = {
  list: (orgId: string, includeInactive = false) =>
    apiClient.get<TrainingProgram[]>(
      `${BASE(orgId)}/training-programs${includeInactive ? '?includeInactive=true' : ''}`,
      {},
      orgId,
    ),
  create: (orgId: string, data: CreateProgramInput) =>
    apiClient.post<TrainingProgram>(`${BASE(orgId)}/training-programs`, data, {}, orgId),
  update: (orgId: string, id: string, data: Partial<CreateProgramInput> & { is_active?: boolean }) =>
    apiClient.put<TrainingProgram>(`${BASE(orgId)}/training-programs/${id}`, data, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/training-programs/${id}`, {}, orgId),
};

export const trainingEnrollmentsApi = {
  list: (
    orgId: string,
    filters: { program_id?: string; worker_id?: string; status?: EnrollmentStatus } = {},
  ) =>
    apiClient.get<TrainingEnrollment[]>(
      `${BASE(orgId)}/training-enrollments${qs(filters)}`,
      {},
      orgId,
    ),
  bulkEnroll: (orgId: string, program_id: string, worker_ids: string[], enrolled_date: string) =>
    apiClient.post<TrainingEnrollment[]>(
      `${BASE(orgId)}/training-enrollments/bulk`,
      { program_id, worker_ids, enrolled_date },
      {},
      orgId,
    ),
  update: (orgId: string, id: string, data: UpdateEnrollmentInput) =>
    apiClient.put<TrainingEnrollment>(`${BASE(orgId)}/training-enrollments/${id}`, data, {}, orgId),
};

// ── Analytics ──────────────────────────────────────────────────────

export interface WorkforceSummary {
  organization_id: string;
  farm_id: string | null;
  fixed_salary_count: number;
  daily_worker_count: number;
  metayage_count: number;
  female_count: number;
  cnss_covered_count: number;
  avg_daily_rate: number | null;
  avg_monthly_salary: number | null;
}

export interface LeaveBalanceRow {
  organization_id: string;
  worker_id: string;
  first_name: string;
  last_name: string;
  leave_type: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
  period_start: string;
  period_end: string;
}

export const hrAnalyticsApi = {
  workforce: (orgId: string) =>
    apiClient.get<WorkforceSummary[]>(`${BASE(orgId)}/hr-analytics/workforce`, {}, orgId),
  leaveBalances: (orgId: string) =>
    apiClient.get<LeaveBalanceRow[]>(`${BASE(orgId)}/hr-analytics/leave-balances`, {}, orgId),
};
