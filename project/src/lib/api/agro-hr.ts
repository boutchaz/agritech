import { apiClient } from '../api-client';

const BASE = (orgId: string) => `/api/v1/organizations/${orgId}`;

// ── Seasonal Campaigns ─────────────────────────────────────────────

export type SeasonType = 'planting' | 'harvest' | 'pruning' | 'treatment' | 'other';
export type CampaignStatus = 'planning' | 'recruiting' | 'active' | 'completed' | 'cancelled';

export interface SeasonalCampaign {
  id: string;
  organization_id: string;
  farm_id: string;
  name: string;
  season_type: SeasonType;
  crop_type: string | null;
  start_date: string;
  end_date: string;
  target_worker_count: number | null;
  estimated_labor_budget: number | null;
  actual_labor_cost: number;
  status: CampaignStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSeasonalCampaignInput {
  farm_id: string;
  name: string;
  season_type: SeasonType;
  crop_type?: string;
  start_date: string;
  end_date: string;
  target_worker_count?: number;
  estimated_labor_budget?: number;
  status?: CampaignStatus;
}
export interface UpdateSeasonalCampaignInput extends Partial<CreateSeasonalCampaignInput> {
  actual_labor_cost?: number;
}

// ── Worker Qualifications ──────────────────────────────────────────

export type QualificationType =
  | 'tractor_operation' | 'pesticide_handling' | 'first_aid' | 'forklift'
  | 'irrigation_system' | 'pruning' | 'harvesting_technique' | 'food_safety'
  | 'fire_safety' | 'electrical' | 'other';

export interface WorkerQualification {
  id: string;
  organization_id: string;
  worker_id: string;
  qualification_type: QualificationType;
  qualification_name: string;
  issued_date: string;
  expiry_date: string | null;
  issuing_authority: string | null;
  certificate_url: string | null;
  is_valid: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  worker?: { id: string; first_name: string; last_name: string; cin: string | null };
}

export interface CreateQualificationInput {
  worker_id: string;
  qualification_type: QualificationType;
  qualification_name: string;
  issued_date: string;
  expiry_date?: string;
  issuing_authority?: string;
  certificate_url?: string;
  notes?: string;
}
export interface UpdateQualificationInput extends Partial<CreateQualificationInput> {
  is_valid?: boolean;
}

// ── Safety Incidents ───────────────────────────────────────────────

export type IncidentType =
  | 'injury' | 'near_miss' | 'chemical_exposure' | 'equipment_damage' | 'fire' | 'environmental' | 'other';
export type Severity = 'minor' | 'moderate' | 'serious' | 'fatal';
export type IncidentStatus = 'reported' | 'investigating' | 'resolved' | 'closed';

export interface CorrectiveAction {
  action: string;
  responsible?: string;
  deadline?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface SafetyIncident {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id: string | null;
  incident_date: string;
  incident_type: IncidentType;
  severity: Severity;
  worker_ids: string[];
  supervisor_id: string | null;
  description: string;
  location_description: string | null;
  root_cause: string | null;
  corrective_actions: CorrectiveAction[];
  preventive_measures: string | null;
  reported_by: string | null;
  reported_at: string;
  cnss_declaration: boolean;
  cnss_declaration_date: string | null;
  cnss_declaration_reference: string | null;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateIncidentInput {
  farm_id: string;
  parcel_id?: string;
  incident_date: string;
  incident_type: IncidentType;
  severity: Severity;
  worker_ids: string[];
  supervisor_id?: string;
  description: string;
  location_description?: string;
  root_cause?: string;
  corrective_actions?: CorrectiveAction[];
  preventive_measures?: string;
}

export interface UpdateIncidentInput extends Partial<CreateIncidentInput> {
  status?: IncidentStatus;
  cnss_declaration?: boolean;
  cnss_declaration_date?: string;
  cnss_declaration_reference?: string;
}

// ── Worker Transport ───────────────────────────────────────────────

export interface WorkerTransport {
  id: string;
  organization_id: string;
  farm_id: string;
  date: string;
  vehicle_id: string | null;
  driver_worker_id: string | null;
  pickup_location: string;
  pickup_time: string;
  destination: string;
  worker_ids: string[];
  capacity: number | null;
  actual_count: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  driver?: { id: string; first_name: string; last_name: string } | null;
}

export interface CreateTransportInput {
  farm_id: string;
  date: string;
  vehicle_id?: string;
  driver_worker_id?: string;
  pickup_location: string;
  pickup_time: string;
  destination: string;
  worker_ids: string[];
  capacity?: number;
  actual_count?: number;
  notes?: string;
}
export type UpdateTransportInput = Partial<CreateTransportInput>;

// ── API ────────────────────────────────────────────────────────────

const qs = (filters: Record<string, string | number | undefined>) => {
  const u = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : '';
};

export const seasonalCampaignsApi = {
  list: (orgId: string, filters: { farm_id?: string; status?: CampaignStatus; season_type?: SeasonType } = {}) =>
    apiClient.get<SeasonalCampaign[]>(`${BASE(orgId)}/seasonal-campaigns${qs(filters)}`, {}, orgId),
  create: (orgId: string, data: CreateSeasonalCampaignInput) =>
    apiClient.post<SeasonalCampaign>(`${BASE(orgId)}/seasonal-campaigns`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateSeasonalCampaignInput) =>
    apiClient.put<SeasonalCampaign>(`${BASE(orgId)}/seasonal-campaigns/${id}`, data, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/seasonal-campaigns/${id}`, {}, orgId),
};

export const qualificationsApi = {
  list: (
    orgId: string,
    filters: { worker_id?: string; expiring_within_days?: number; type?: QualificationType } = {},
  ) => apiClient.get<WorkerQualification[]>(`${BASE(orgId)}/worker-qualifications${qs(filters)}`, {}, orgId),
  create: (orgId: string, data: CreateQualificationInput) =>
    apiClient.post<WorkerQualification>(`${BASE(orgId)}/worker-qualifications`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateQualificationInput) =>
    apiClient.put<WorkerQualification>(`${BASE(orgId)}/worker-qualifications/${id}`, data, {}, orgId),
  verify: (orgId: string, id: string) =>
    apiClient.put<WorkerQualification>(`${BASE(orgId)}/worker-qualifications/${id}/verify`, {}, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/worker-qualifications/${id}`, {}, orgId),
};

export const safetyIncidentsApi = {
  list: (
    orgId: string,
    filters: { farm_id?: string; status?: IncidentStatus; severity?: Severity; from?: string; to?: string } = {},
  ) => apiClient.get<SafetyIncident[]>(`${BASE(orgId)}/safety-incidents${qs(filters)}`, {}, orgId),
  get: (orgId: string, id: string) =>
    apiClient.get<SafetyIncident>(`${BASE(orgId)}/safety-incidents/${id}`, {}, orgId),
  create: (orgId: string, data: CreateIncidentInput) =>
    apiClient.post<SafetyIncident>(`${BASE(orgId)}/safety-incidents`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateIncidentInput) =>
    apiClient.put<SafetyIncident>(`${BASE(orgId)}/safety-incidents/${id}`, data, {}, orgId),
};

export const workerTransportApi = {
  list: (orgId: string, filters: { farm_id?: string; from?: string; to?: string } = {}) =>
    apiClient.get<WorkerTransport[]>(`${BASE(orgId)}/worker-transport${qs(filters)}`, {}, orgId),
  create: (orgId: string, data: CreateTransportInput) =>
    apiClient.post<WorkerTransport>(`${BASE(orgId)}/worker-transport`, data, {}, orgId),
  update: (orgId: string, id: string, data: UpdateTransportInput) =>
    apiClient.put<WorkerTransport>(`${BASE(orgId)}/worker-transport/${id}`, data, {}, orgId),
  remove: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/worker-transport/${id}`, {}, orgId),
};
