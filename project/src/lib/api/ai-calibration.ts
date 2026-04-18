import { apiClient } from '../api-client';
import { type CalibrationPercentilesResponse, type CalibrationZonesResponse } from '../../types/calibration-output';

export type { AICalibration, AiScenarioCode, AiDiagnosticsIndicators, AiDiagnosticsResponse } from './calibration-output';

const BASE_URL = '/api/v1/parcels';

export interface AIDiagnostic {
  id: string;
  parcel_id: string;
  diagnostic_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: string;
}

export const aiCalibrationApi = {
  async startCalibration(parcelId: string, organizationId?: string) {
    return apiClient.post(`${BASE_URL}/${parcelId}/calibration/start`, {}, {}, organizationId);
  },

  async getCalibration(parcelId: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${parcelId}/calibration`, {}, organizationId);
  },

  async getCalibrationPercentiles(parcelId: string, organizationId?: string): Promise<CalibrationPercentilesResponse> {
    return apiClient.get<CalibrationPercentilesResponse>(`${BASE_URL}/${parcelId}/calibration/percentiles`, {}, organizationId);
  },

  async getCalibrationZones(parcelId: string, organizationId?: string): Promise<CalibrationZonesResponse> {
    return apiClient.get<CalibrationZonesResponse>(`${BASE_URL}/${parcelId}/calibration/zones`, {}, organizationId);
  },

  async getAIDiagnostics(parcelId: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/diagnostics`, {}, organizationId);
  },
};
