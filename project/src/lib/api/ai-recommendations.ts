import { apiClient } from '../api-client';
import type { AIRecommendationEvaluation } from '../../types/ai-recommendations';

const BASE_URL = '/api/v1/parcels';

export interface AIRecommendation {
  id: string;
  parcel_id: string;
  constat: string;
  diagnostic: string;
  action: string;
  status: 'pending' | 'validated' | 'rejected' | 'executed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export const aiRecommendationsApi = {
  async getAIRecommendations(parcelId: string, organizationId?: string): Promise<AIRecommendation[]> {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/recommendations`, {}, organizationId);
  },

  async getAIRecommendation(id: string, organizationId?: string): Promise<AIRecommendation> {
    return apiClient.get(`/api/v1/ai/recommendations/${id}`, {}, organizationId);
  },

  async validateAIRecommendation(id: string, organizationId?: string): Promise<AIRecommendation> {
    return apiClient.patch(`/api/v1/ai/recommendations/${id}/validate`, {}, {}, organizationId);
  },

  async rejectAIRecommendation(id: string, organizationId?: string): Promise<AIRecommendation> {
    return apiClient.patch(`/api/v1/ai/recommendations/${id}/reject`, {}, {}, organizationId);
  },

  async executeAIRecommendation(id: string, notes?: string, organizationId?: string): Promise<AIRecommendation> {
    return apiClient.patch(`/api/v1/ai/recommendations/${id}/execute`, { notes }, {}, organizationId);
  },

  async getAIRecommendationEvaluation(id: string, organizationId?: string): Promise<AIRecommendationEvaluation> {
    return apiClient.get<AIRecommendationEvaluation>(`/api/v1/ai/recommendations/${id}/evaluation`, {}, organizationId);
  },
};
