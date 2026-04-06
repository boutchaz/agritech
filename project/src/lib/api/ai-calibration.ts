import { apiClient } from '../api-client';
import type { CalibrationReportResponse } from './calibration-output';
import type { CalibrationPercentilesResponse, CalibrationZonesResponse } from '../../types/calibration-output';

const BASE_URL = '/api/v1/parcels';

export interface AICalibration {
  id: string;
  parcel_id: string;
  status: 'pending' | 'provisioning' | 'in_progress' | 'awaiting_validation' | 'validated' | 'completed' | 'failed';
  confidence_score: number;
  zone_classification: 'optimal' | 'normal' | 'stressed' | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** Legacy list shape (unused by current diagnostics endpoint). */
export interface AIDiagnostic {
  id: string;
  parcel_id: string;
  diagnostic_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: string;
}

export type AiScenarioCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface AiDiagnosticsIndicators {
  reading_date: string;
  p50_ndvi: number;
  current_ndvi: number;
  ndvi_delta: number;
  ndvi_band: 'above_optimal' | 'optimal' | 'vigilance' | 'alert';
  ndvi_trend: 'improving' | 'stable' | 'declining';
  baseline_ndre: number | null;
  current_ndre: number | null;
  ndre_delta: number | null;
  ndre_status: 'high' | 'normal' | 'low';
  ndre_trend: 'improving' | 'stable' | 'declining';
  baseline_ndmi: number | null;
  current_ndmi: number | null;
  ndmi_delta: number | null;
  ndmi_trend: 'improving' | 'stable' | 'declining';
  water_balance: number | null;
  weather_anomaly: boolean;
}

export interface AiDiagnosticsResponse {
  scenario: string;
  scenario_code: AiScenarioCode;
  confidence: number;
  description: string;
  indicators: AiDiagnosticsIndicators;
  observation_only?: boolean;
}

export const aiCalibrationApi = {
  async startCalibration(parcelId: string, organizationId?: string): Promise<AICalibration> {
    return apiClient.post(`${BASE_URL}/${parcelId}/calibration/start`, {}, {}, organizationId);
  },

  async getCalibration(parcelId: string, organizationId?: string): Promise<AICalibration> {
    return apiClient.get(`${BASE_URL}/${parcelId}/calibration`, {}, organizationId);
  },

  async getCalibrationReport(parcelId: string, organizationId?: string): Promise<CalibrationReportResponse | null> {
    return apiClient.get<CalibrationReportResponse | null>(`${BASE_URL}/${parcelId}/calibration/report`, {}, organizationId);
  },

  async validateCalibration(parcelId: string, organizationId?: string): Promise<AICalibration> {
    return apiClient.post(`${BASE_URL}/${parcelId}/calibration/validate`, {}, {}, organizationId);
  },

  async getCalibrationPercentiles(parcelId: string, organizationId?: string): Promise<CalibrationPercentilesResponse> {
    return apiClient.get<CalibrationPercentilesResponse>(`${BASE_URL}/${parcelId}/calibration/percentiles`, {}, organizationId);
  },

  async getCalibrationZones(parcelId: string, organizationId?: string): Promise<CalibrationZonesResponse> {
    return apiClient.get<CalibrationZonesResponse>(`${BASE_URL}/${parcelId}/calibration/zones`, {}, organizationId);
  },

  async getAIDiagnostics(
    parcelId: string,
    organizationId?: string,
  ): Promise<AiDiagnosticsResponse> {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/diagnostics`, {}, organizationId);
  },
};
