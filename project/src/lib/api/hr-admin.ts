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

// ── Expense Claims ─────────────────────────────────────────────────

export type ExpenseClaimStatus =
  | 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'paid' | 'cancelled';

export interface ExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ExpenseClaim {
  id: string;
  organization_id: string;
  worker_id: string;
  farm_id: string | null;
  title: string;
  description: string | null;
  expense_date: string;
  items: Array<Record<string, unknown>>;
  total_amount: number;
  total_tax: number;
  grand_total: number;
  advance_id: string | null;
  advance_amount_allocated: number;
  status: ExpenseClaimStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  approval_history: Array<Record<string, unknown>>;
  journal_entry_id: string | null;
  cost_center: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  worker?: { id: string; first_name: string; last_name: string; cin: string | null };
}

export interface CreateExpenseClaimInput {
  worker_id: string;
  farm_id?: string;
  title: string;
  description?: string;
  expense_date: string;
  items: Array<Record<string, unknown>>;
  total_amount: number;
  total_tax?: number;
  grand_total?: number;
  advance_id?: string;
  advance_amount_allocated?: number;
}

export const expenseCategoriesApi = {
  list: (orgId: string) =>
    apiClient.get<ExpenseCategory[]>(`${BASE(orgId)}/expense-categories`, {}, orgId),
  create: (orgId: string, data: { name: string; description?: string }) =>
    apiClient.post<ExpenseCategory>(`${BASE(orgId)}/expense-categories`, data, {}, orgId),
  update: (orgId: string, id: string, data: { name?: string; description?: string }) =>
    apiClient.put<ExpenseCategory>(`${BASE(orgId)}/expense-categories/${id}`, data, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/expense-categories/${id}`, {}, orgId),
};

export const expenseClaimsApi = {
  list: (
    orgId: string,
    filters: { worker_id?: string; status?: ExpenseClaimStatus; from?: string; to?: string } = {},
  ) => apiClient.get<ExpenseClaim[]>(`${BASE(orgId)}/expense-claims${qs(filters)}`, {}, orgId),
  create: (orgId: string, data: CreateExpenseClaimInput) =>
    apiClient.post<ExpenseClaim>(`${BASE(orgId)}/expense-claims`, data, {}, orgId),
  update: (orgId: string, id: string, data: Partial<CreateExpenseClaimInput> & { status?: ExpenseClaimStatus }) =>
    apiClient.put<ExpenseClaim>(`${BASE(orgId)}/expense-claims/${id}`, data, {}, orgId),
  approve: (orgId: string, id: string, notes?: string) =>
    apiClient.put<ExpenseClaim>(`${BASE(orgId)}/expense-claims/${id}/approve`, { notes }, {}, orgId),
  reject: (orgId: string, id: string, rejection_reason: string) =>
    apiClient.put<ExpenseClaim>(`${BASE(orgId)}/expense-claims/${id}/reject`, { rejection_reason }, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/expense-claims/${id}`, {}, orgId),
};

// ── Recruitment ─────────────────────────────────────────────────────

export type OpeningStatus = 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'seasonal';
export type ApplicantStatus =
  | 'applied' | 'screening' | 'interview_scheduled' | 'interviewed'
  | 'offered' | 'hired' | 'rejected' | 'withdrawn';
export type ApplicantSource = 'direct' | 'referral' | 'website' | 'agency' | 'other';
export type InterviewType = 'phone' | 'video' | 'in_person';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface JobOpening {
  id: string;
  organization_id: string;
  farm_id: string | null;
  title: string;
  description: string;
  designation: string | null;
  department: string | null;
  employment_type: EmploymentType | null;
  worker_type: string | null;
  vacancies: number;
  salary_range_min: number | null;
  salary_range_max: number | null;
  currency: string;
  publish_date: string | null;
  closing_date: string | null;
  status: OpeningStatus;
  is_published: boolean;
  application_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOpeningInput {
  farm_id?: string;
  title: string;
  description: string;
  designation?: string;
  department?: string;
  employment_type?: EmploymentType;
  worker_type?: string;
  vacancies?: number;
  salary_range_min?: number;
  salary_range_max?: number;
  currency?: string;
  publish_date?: string;
  closing_date?: string;
  status?: OpeningStatus;
  is_published?: boolean;
}

export interface JobApplicant {
  id: string;
  organization_id: string;
  job_opening_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  cin: string | null;
  resume_url: string | null;
  cover_letter_url: string | null;
  source: ApplicantSource;
  referred_by_worker_id: string | null;
  status: ApplicantStatus;
  rating: number | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  opening?: { id: string; title: string };
}

export interface CreateApplicantInput {
  job_opening_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  cin?: string;
  resume_url?: string;
  cover_letter_url?: string;
  source?: ApplicantSource;
  referred_by_worker_id?: string;
  notes?: string;
  tags?: string[];
}

export interface InterviewFeedbackEntry {
  interviewer_id: string;
  rating?: number;
  notes?: string;
  recommendation?: 'hire' | 'no_hire' | 'maybe';
}

export interface Interview {
  id: string;
  organization_id: string;
  applicant_id: string;
  job_opening_id: string;
  round: number;
  interview_type: InterviewType;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  interviewer_ids: string[];
  feedback: InterviewFeedbackEntry[];
  average_rating: number | null;
  status: InterviewStatus;
  created_at: string;
}

export interface CreateInterviewInput {
  applicant_id: string;
  job_opening_id: string;
  round?: number;
  interview_type?: InterviewType;
  scheduled_at: string;
  duration_minutes?: number;
  location?: string;
  interviewer_ids?: string[];
}

export const jobOpeningsApi = {
  list: (orgId: string, filters: { status?: OpeningStatus; farm_id?: string } = {}) =>
    apiClient.get<JobOpening[]>(`${BASE(orgId)}/job-openings${qs(filters)}`, {}, orgId),
  create: (orgId: string, data: CreateOpeningInput) =>
    apiClient.post<JobOpening>(`${BASE(orgId)}/job-openings`, data, {}, orgId),
  update: (orgId: string, id: string, data: Partial<CreateOpeningInput>) =>
    apiClient.put<JobOpening>(`${BASE(orgId)}/job-openings/${id}`, data, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/job-openings/${id}`, {}, orgId),
};

export const jobApplicantsApi = {
  list: (orgId: string, filters: { job_opening_id?: string; status?: ApplicantStatus } = {}) =>
    apiClient.get<JobApplicant[]>(`${BASE(orgId)}/job-applicants${qs(filters)}`, {}, orgId),
  create: (orgId: string, data: CreateApplicantInput) =>
    apiClient.post<JobApplicant>(`${BASE(orgId)}/job-applicants`, data, {}, orgId),
  update: (
    orgId: string,
    id: string,
    data: Partial<CreateApplicantInput> & { status?: ApplicantStatus; rating?: number },
  ) => apiClient.put<JobApplicant>(`${BASE(orgId)}/job-applicants/${id}`, data, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/job-applicants/${id}`, {}, orgId),
};

export const interviewsApi = {
  list: (orgId: string, applicantId?: string) =>
    apiClient.get<Interview[]>(
      `${BASE(orgId)}/interviews${applicantId ? `?applicant_id=${applicantId}` : ''}`,
      {},
      orgId,
    ),
  create: (orgId: string, data: CreateInterviewInput) =>
    apiClient.post<Interview>(`${BASE(orgId)}/interviews`, data, {}, orgId),
  update: (
    orgId: string,
    id: string,
    data: Partial<CreateInterviewInput> & { status?: InterviewStatus; feedback?: InterviewFeedbackEntry[] },
  ) => apiClient.put<Interview>(`${BASE(orgId)}/interviews/${id}`, data, {}, orgId),
};

// ── Performance ─────────────────────────────────────────────────────

export type CycleStatus = 'draft' | 'self_assessment' | 'manager_review' | 'calibration' | 'completed';
export type AppraisalStatus = 'pending' | 'self_assessment' | 'manager_review' | 'completed';
export type FeedbackType = 'peer' | 'manager' | 'subordinate' | 'external';

export interface AppraisalCycle {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  self_assessment_deadline: string | null;
  manager_assessment_deadline: string | null;
  status: CycleStatus;
  applicable_worker_types: string[];
  applicable_farm_ids: string[] | null;
  created_at: string;
}

export interface CreateCycleInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  self_assessment_deadline?: string;
  manager_assessment_deadline?: string;
  applicable_worker_types?: string[];
  applicable_farm_ids?: string[];
}

export interface KraScore {
  kra_name: string;
  weight: number;
  score: number;
  weighted_score?: number;
}

export interface AppraisalGoal {
  title: string;
  progress?: number;
  target?: number;
  achieved?: boolean;
}

export interface Appraisal {
  id: string;
  organization_id: string;
  worker_id: string;
  cycle_id: string;
  self_rating: number | null;
  self_reflections: string | null;
  manager_id: string | null;
  manager_rating: number | null;
  manager_feedback: string | null;
  kra_scores: KraScore[];
  goals: AppraisalGoal[];
  final_score: number | null;
  final_feedback: string | null;
  status: AppraisalStatus;
  created_at: string;
  updated_at: string;
  worker?: { id: string; first_name: string; last_name: string };
  manager?: { id: string; first_name: string; last_name: string } | null;
  cycle?: { id: string; name: string; status: CycleStatus };
}

export interface UpdateAppraisalInput {
  self_rating?: number;
  self_reflections?: string;
  manager_id?: string;
  manager_rating?: number;
  manager_feedback?: string;
  kra_scores?: KraScore[];
  goals?: AppraisalGoal[];
  final_score?: number;
  final_feedback?: string;
  status?: AppraisalStatus;
}

export interface PerformanceFeedback {
  id: string;
  organization_id: string;
  worker_id: string;
  reviewer_id: string;
  feedback_type: FeedbackType;
  review_period: string | null;
  rating: number | null;
  strengths: string | null;
  improvements: string | null;
  notes: string | null;
  created_at: string;
  worker?: { id: string; first_name: string; last_name: string };
  reviewer?: { id: string; first_name: string; last_name: string };
}

export interface CreateFeedbackInput {
  worker_id: string;
  reviewer_id: string;
  feedback_type: FeedbackType;
  review_period?: string;
  rating?: number;
  strengths?: string;
  improvements?: string;
  notes?: string;
}

export const appraisalCyclesApi = {
  list: (orgId: string) => apiClient.get<AppraisalCycle[]>(`${BASE(orgId)}/appraisal-cycles`, {}, orgId),
  create: (orgId: string, data: CreateCycleInput) =>
    apiClient.post<AppraisalCycle>(`${BASE(orgId)}/appraisal-cycles`, data, {}, orgId),
  update: (orgId: string, id: string, data: Partial<CreateCycleInput> & { status?: CycleStatus }) =>
    apiClient.put<AppraisalCycle>(`${BASE(orgId)}/appraisal-cycles/${id}`, data, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/appraisal-cycles/${id}`, {}, orgId),
  bulkCreate: (orgId: string, cycleId: string, worker_ids: string[]) =>
    apiClient.post<Appraisal[]>(`${BASE(orgId)}/appraisal-cycles/${cycleId}/bulk-appraisals`, { worker_ids }, {}, orgId),
};

export const appraisalsApi = {
  list: (orgId: string, filters: { cycle_id?: string; worker_id?: string; status?: AppraisalStatus } = {}) =>
    apiClient.get<Appraisal[]>(`${BASE(orgId)}/appraisals${qs(filters)}`, {}, orgId),
  create: (orgId: string, data: { worker_id: string; cycle_id: string; manager_id?: string }) =>
    apiClient.post<Appraisal>(`${BASE(orgId)}/appraisals`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateAppraisalInput) =>
    apiClient.put<Appraisal>(`${BASE(orgId)}/appraisals/${id}`, data, {}, orgId),
};

export const feedbackApi = {
  list: (orgId: string, workerId?: string) =>
    apiClient.get<PerformanceFeedback[]>(
      `${BASE(orgId)}/performance-feedback${workerId ? `?worker_id=${workerId}` : ''}`,
      {},
      orgId,
    ),
  create: (orgId: string, data: CreateFeedbackInput) =>
    apiClient.post<PerformanceFeedback>(`${BASE(orgId)}/performance-feedback`, data, {}, orgId),
};
