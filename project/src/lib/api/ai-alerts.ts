import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/parcels';

export interface AIAlert {
  id: string;
  parcel_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  updated_at: string;
}

export const aiAlertsApi = {
  async getAIAlerts(parcelId: string, organizationId?: string): Promise<AIAlert[]> {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/alerts`, {}, organizationId);
  },

  async getActiveAIAlerts(parcelId: string, organizationId?: string): Promise<AIAlert[]> {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/alerts/active`, {}, organizationId);
  },

  async acknowledgeAIAlert(alertId: string, organizationId?: string): Promise<AIAlert> {
    return apiClient.post(`/api/v1/ai/alerts/${alertId}/acknowledge`, {}, {}, organizationId);
  },

  async resolveAIAlert(alertId: string, organizationId?: string): Promise<AIAlert> {
    return apiClient.post(`/api/v1/ai/alerts/${alertId}/resolve`, {}, {}, organizationId);
  },
};
