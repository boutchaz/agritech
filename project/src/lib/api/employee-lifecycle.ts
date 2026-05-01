import { apiClient } from '../api-client';

const BASE = (orgId: string) => `/api/v1/organizations/${orgId}`;

// ── Onboarding ─────────────────────────────────────────────────────

export interface OnboardingActivity {
  title: string;
  description?: string;
  role?: string;
  user_id?: string;
  begin_on_days?: number;
  duration_days?: number;
}

export interface OnboardingTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  department: string | null;
  designation: string | null;
  activities: OnboardingActivity[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateOnboardingTemplateInput {
  name: string;
  description?: string;
  department?: string;
  designation?: string;
  activities?: OnboardingActivity[];
  is_active?: boolean;
}
export type UpdateOnboardingTemplateInput = Partial<CreateOnboardingTemplateInput>;

export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface OnboardingRecordActivity {
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  due_date?: string;
  completed_date?: string;
}

export interface OnboardingRecord {
  id: string;
  organization_id: string;
  worker_id: string;
  template_id: string;
  status: OnboardingStatus;
  activities: OnboardingRecordActivity[];
  started_at: string;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  worker?: { id: string; first_name: string; last_name: string };
  template?: { id: string; name: string };
}

export interface StartOnboardingInput {
  worker_id: string;
  template_id: string;
}

export interface UpdateOnboardingRecordInput {
  status?: OnboardingStatus;
  activities?: OnboardingRecordActivity[];
}

// ── Separations ─────────────────────────────────────────────────────

export type SeparationType =
  | 'resignation'
  | 'termination'
  | 'end_of_contract'
  | 'retirement'
  | 'death'
  | 'dismissal';

export type SeparationStatus = 'pending' | 'notice_period' | 'relieved' | 'settled';
export type FnfStatus = 'pending' | 'processing' | 'settled';

export interface FnfLineItem {
  label: string;
  amount: number;
  notes?: string;
}

export interface FnfAsset {
  asset: string;
  status: 'pending' | 'returned' | 'damaged';
  notes?: string;
}

export interface Separation {
  id: string;
  organization_id: string;
  worker_id: string;
  separation_type: SeparationType;
  notice_date: string;
  relieving_date: string;
  exit_interview_conducted: boolean;
  exit_interview_notes: string | null;
  exit_feedback: Record<string, unknown> | null;
  fnf_status: FnfStatus;
  fnf_payables: FnfLineItem[];
  fnf_receivables: FnfLineItem[];
  fnf_assets: FnfAsset[];
  fnf_total_payable: number;
  fnf_total_receivable: number;
  fnf_net_amount: number;
  fnf_settled_at: string | null;
  status: SeparationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  worker?: { id: string; first_name: string; last_name: string; cin: string | null };
}

export interface CreateSeparationInput {
  worker_id: string;
  separation_type: SeparationType;
  notice_date: string;
  relieving_date: string;
  exit_interview_notes?: string;
  exit_feedback?: Record<string, unknown>;
}

export interface UpdateSeparationInput extends Partial<CreateSeparationInput> {
  status?: SeparationStatus;
  exit_interview_conducted?: boolean;
}

export interface UpdateFnfInput {
  fnf_payables?: FnfLineItem[];
  fnf_receivables?: FnfLineItem[];
  fnf_assets?: FnfAsset[];
  fnf_total_payable?: number;
  fnf_total_receivable?: number;
  fnf_status?: FnfStatus;
}

// ── API ────────────────────────────────────────────────────────────

export const onboardingTemplatesApi = {
  list: (orgId: string) =>
    apiClient.get<OnboardingTemplate[]>(`${BASE(orgId)}/onboarding-templates`, {}, orgId),
  create: (orgId: string, data: CreateOnboardingTemplateInput) =>
    apiClient.post<OnboardingTemplate>(`${BASE(orgId)}/onboarding-templates`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateOnboardingTemplateInput) =>
    apiClient.put<OnboardingTemplate>(
      `${BASE(orgId)}/onboarding-templates/${id}`,
      data,
      {},
      orgId,
    ),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/onboarding-templates/${id}`, {}, orgId),
};

export const onboardingRecordsApi = {
  list: (orgId: string, filters: { worker_id?: string; status?: OnboardingStatus } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    const q = qs.toString();
    return apiClient.get<OnboardingRecord[]>(
      `${BASE(orgId)}/onboarding-records${q ? `?${q}` : ''}`,
      {},
      orgId,
    );
  },
  start: (orgId: string, data: StartOnboardingInput) =>
    apiClient.post<OnboardingRecord>(`${BASE(orgId)}/onboarding-records`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateOnboardingRecordInput) =>
    apiClient.put<OnboardingRecord>(`${BASE(orgId)}/onboarding-records/${id}`, data, {}, orgId),
};

export const separationsApi = {
  list: (orgId: string, filters: { status?: SeparationStatus; worker_id?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    const q = qs.toString();
    return apiClient.get<Separation[]>(
      `${BASE(orgId)}/separations${q ? `?${q}` : ''}`,
      {},
      orgId,
    );
  },
  get: (orgId: string, id: string) =>
    apiClient.get<Separation>(`${BASE(orgId)}/separations/${id}`, {}, orgId),
  create: (orgId: string, data: CreateSeparationInput) =>
    apiClient.post<Separation>(`${BASE(orgId)}/separations`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateSeparationInput) =>
    apiClient.put<Separation>(`${BASE(orgId)}/separations/${id}`, data, {}, orgId),
  updateFnf: (orgId: string, id: string, data: UpdateFnfInput) =>
    apiClient.put<Separation>(`${BASE(orgId)}/separations/${id}/fnf`, data, {}, orgId),
};
