import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/parcels';

export interface AIPlan {
  id: string;
  parcel_id: string;
  organization_id: string;
  calibration_id: string | null;
  year: number;
  status: 'draft' | 'validated' | 'active' | 'archived';
  crop_type?: string;
  variety?: string | null;
  plan_data?: Record<string, unknown> | null;
  validated_at?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AIPlanIntervention {
  id: string;
  annual_plan_id: string;
  parcel_id: string;
  organization_id: string;
  month: number;
  week: number | null;
  intervention_type: string;
  description: string;
  product: string | null;
  dose: string | null;
  unit: string | null;
  status: 'planned' | 'executed' | 'skipped' | 'delayed';
  executed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
 }

export interface AIPlanSummary {
  plan_id: string;
  parcel_id: string;
  year: number;
  status: 'draft' | 'validated' | 'active' | 'archived';
  total_interventions: number;
  executed: number;
  planned: number;
  skipped: number;
}

export const aiPlanApi = {
  async getAIPlan(parcelId: string, organizationId?: string): Promise<AIPlan | null> {
    return apiClient.get<AIPlan | null>(`${BASE_URL}/${parcelId}/ai/plan`, {}, organizationId);
  },

  async getAIPlanCalendar(parcelId: string, organizationId?: string): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>(`${BASE_URL}/${parcelId}/ai/plan/calendar`, {}, organizationId);
  },

  async getAIPlanSummary(parcelId: string, organizationId?: string): Promise<AIPlanSummary> {
    return apiClient.get<AIPlanSummary>(`${BASE_URL}/${parcelId}/ai/plan/summary`, {}, organizationId);
  },

  async validateAIPlan(parcelId: string, organizationId?: string): Promise<AIPlan> {
    return apiClient.post<AIPlan>(`${BASE_URL}/${parcelId}/ai/plan/validate`, {}, {}, organizationId);
  },

  async getAIPlanInterventions(parcelId: string, organizationId?: string): Promise<AIPlanIntervention[]> {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/plan/interventions`, {}, organizationId);
  },

  async executeAIPlanIntervention(id: string, organizationId?: string): Promise<AIPlanIntervention> {
    return apiClient.patch(`/api/v1/ai/plan/interventions/${id}/execute`, {}, {}, organizationId);
  },

  async regenerateAIPlan(parcelId: string, organizationId?: string): Promise<AIPlan> {
    return apiClient.post(`${BASE_URL}/${parcelId}/ai/plan/regenerate`, {}, {}, organizationId);
  },
};
