import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/parcels';

export interface AIPlan {
  id: string;
  parcel_id: string;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface AIPlanIntervention {
  id: string;
  plan_id: string;
  month: number;
  intervention_type: string;
  description: string;
  status: 'pending' | 'executed' | 'skipped';
  created_at: string;
  updated_at: string;
}

export const aiPlanApi = {
  async getAIPlan(parcelId: string, organizationId?: string): Promise<AIPlan> {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/plan`, {}, organizationId);
  },

  async getAIPlanCalendar(parcelId: string, organizationId?: string): Promise<any> {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/plan/calendar`, {}, organizationId);
  },

  async getAIPlanSummary(parcelId: string, organizationId?: string): Promise<any> {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/plan/summary`, {}, organizationId);
  },

  async validateAIPlan(parcelId: string, organizationId?: string): Promise<AIPlan> {
    return apiClient.post(`${BASE_URL}/${parcelId}/ai/plan/validate`, {}, {}, organizationId);
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
