import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/ai/references';

export const aiReferencesApi = {
  async getAIReference(cropType: string, organizationId?: string): Promise<any> {
    return apiClient.get(`${BASE_URL}/${cropType}`, {}, organizationId);
  },

  async getAIReferenceVarieties(cropType: string, organizationId?: string): Promise<any> {
    return apiClient.get(`${BASE_URL}/${cropType}/varieties`, {}, organizationId);
  },

  async getAIReferenceBbch(cropType: string, organizationId?: string): Promise<any> {
    return apiClient.get(`${BASE_URL}/${cropType}/bbch`, {}, organizationId);
  },

  async getAIReferenceAlerts(cropType: string, organizationId?: string): Promise<any> {
    return apiClient.get(`${BASE_URL}/${cropType}/alerts`, {}, organizationId);
  },

  async getAIReferenceNpkFormulas(cropType: string, organizationId?: string): Promise<any> {
    return apiClient.get(`${BASE_URL}/${cropType}/npk-formulas`, {}, organizationId);
  },
};
