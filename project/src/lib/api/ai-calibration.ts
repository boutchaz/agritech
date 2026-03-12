import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/parcels';

export interface AICalibration {
  id: string;
  parcel_id: string;
  status: 'pending' | 'provisioning' | 'in_progress' | 'completed' | 'failed';
  confidence_score: number;
  zone_classification: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AIDiagnostic {
  id: string;
  parcel_id: string;
  diagnostic_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: string;
}

export const aiCalibrationApi = {
  async startCalibration(parcelId: string, organizationId?: string): Promise<AICalibration> {
    return apiClient.post(`${BASE_URL}/${parcelId}/calibration/start`, {}, {}, organizationId);
  },

  async getCalibration(parcelId: string, organizationId?: string): Promise<AICalibration> {
    return apiClient.get(`${BASE_URL}/${parcelId}/calibration`, {}, organizationId);
  },

  async getCalibrationReport(parcelId: string, organizationId?: string): Promise<any> {
    return apiClient.get(`${BASE_URL}/${parcelId}/calibration/report`, {}, organizationId);
  },

  async validateCalibration(parcelId: string, organizationId?: string): Promise<AICalibration> {
    return apiClient.post(`${BASE_URL}/${parcelId}/calibration/validate`, {}, {}, organizationId);
  },

  async getCalibrationPercentiles(parcelId: string, organizationId?: string): Promise<any> {
    return apiClient.get(`${BASE_URL}/${parcelId}/calibration/percentiles`, {}, organizationId);
  },

  async getCalibrationZones(parcelId: string, organizationId?: string): Promise<any> {
    return apiClient.get(`${BASE_URL}/${parcelId}/calibration/zones`, {}, organizationId);
  },

  async getAIDiagnostics(parcelId: string, organizationId?: string): Promise<AIDiagnostic[]> {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/diagnostics`, {}, organizationId);
  },
};
