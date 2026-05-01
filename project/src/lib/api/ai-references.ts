import { apiClient } from '../api-client';
import type {
  CropAIReference,
  AIReferenceVarietiesResponse,
  AIReferenceBbchResponse,
  AIReferenceAlertsResponse,
  AIReferenceNpkFormulasResponse,
} from '../../types/ai-references';

const BASE_URL = '/api/v1/ai/references';

export interface SupportedVariety {
  code: string;
  nom: string;
}

export interface SupportedCrop {
  code: string;
  label: string;
  varieties: SupportedVariety[];
  varietyGroups?: Record<string, SupportedVariety[]>;
}

export interface SupportedCropsResponse {
  crops: SupportedCrop[];
}

export const aiReferencesApi = {
  async getSupportedCrops(organizationId?: string): Promise<SupportedCropsResponse> {
    return apiClient.get<SupportedCropsResponse>(`${BASE_URL}/supported-crops`, {}, organizationId);
  },

  async getAIReference(cropType: string, organizationId?: string): Promise<CropAIReference> {
    return apiClient.get<CropAIReference>(`${BASE_URL}/${cropType}`, {}, organizationId);
  },

  async getAIReferenceVarieties(cropType: string, organizationId?: string): Promise<AIReferenceVarietiesResponse> {
    return apiClient.get<AIReferenceVarietiesResponse>(`${BASE_URL}/${cropType}/varieties`, {}, organizationId);
  },

  async getAIReferenceBbch(cropType: string, organizationId?: string): Promise<AIReferenceBbchResponse> {
    return apiClient.get<AIReferenceBbchResponse>(`${BASE_URL}/${cropType}/bbch`, {}, organizationId);
  },

  async getAIReferenceAlerts(cropType: string, organizationId?: string): Promise<AIReferenceAlertsResponse> {
    return apiClient.get<AIReferenceAlertsResponse>(`${BASE_URL}/${cropType}/alerts`, {}, organizationId);
  },

  async getAIReferenceNpkFormulas(cropType: string, organizationId?: string): Promise<AIReferenceNpkFormulasResponse> {
    return apiClient.get<AIReferenceNpkFormulasResponse>(`${BASE_URL}/${cropType}/npk-formulas`, {}, organizationId);
  },
};
