import { apiClient } from '../api-client';
import type { CalibrationV2Output, NutritionOption } from '@/types/calibration-v2';

const BASE_URL = '/api/v1/parcels';

export type CalibrationPhase =
  | 'disabled'
  | 'calibrating'
  | 'awaiting_validation'
  | 'awaiting_nutrition_option'
  | 'active'
  | 'paused'
  | 'unknown';

export interface CalibrationStatusRecord {
  id: string;
  parcel_id: string;
  status: 'pending' | 'provisioning' | 'in_progress' | 'completed' | 'failed';
  calibration_version?: string | null;
  confidence_score?: number | null;
}

export interface NutritionSuggestionResponse {
  suggested_option: NutritionOption;
  rationale: Record<string, unknown>;
  alternatives: Array<{
    option: NutritionOption;
    eligible: boolean;
    reason: string;
  }>;
}

export interface NutritionConfirmationResponse {
  calibration_id: string;
  parcel_id: string;
  option: NutritionOption;
  ai_phase: 'active';
}

export interface CalibrationHistoryRecord {
  id: string;
  status: string;
  health_score: number | null;
  confidence_score: number | null;
  maturity_phase: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CalibrationReportResponse {
  calibration: CalibrationStatusRecord;
  report: {
    output?: CalibrationV2Output;
    [key: string]: unknown;
  } | null;
}

export const calibrationV2Api = {
  async startCalibrationV2(
    parcelId: string,
    organizationId?: string,
  ): Promise<CalibrationStatusRecord> {
    return apiClient.post<CalibrationStatusRecord>(
      `${BASE_URL}/${parcelId}/calibration/start-v2`,
      {},
      {},
      organizationId,
    );
  },

  async getCalibrationStatus(
    parcelId: string,
    organizationId?: string,
  ): Promise<CalibrationStatusRecord | null> {
    return apiClient.get<CalibrationStatusRecord | null>(
      `${BASE_URL}/${parcelId}/calibration`,
      {},
      organizationId,
    );
  },

  async getCalibrationReport(
    parcelId: string,
    organizationId?: string,
  ): Promise<CalibrationReportResponse | null> {
    return apiClient.get<CalibrationReportResponse | null>(
      `${BASE_URL}/${parcelId}/calibration/report`,
      {},
      organizationId,
    );
  },

  async validateCalibration(
    parcelId: string,
    calibrationId: string,
    organizationId?: string,
  ): Promise<CalibrationStatusRecord> {
    return apiClient.post<CalibrationStatusRecord>(
      `${BASE_URL}/${parcelId}/calibration/${calibrationId}/validate`,
      {},
      {},
      organizationId,
    );
  },

  async getNutritionSuggestion(
    parcelId: string,
    organizationId?: string,
  ): Promise<NutritionSuggestionResponse> {
    return apiClient.get<NutritionSuggestionResponse>(
      `${BASE_URL}/${parcelId}/calibration/nutrition-suggestion`,
      {},
      organizationId,
    );
  },

  async confirmNutritionOption(
    parcelId: string,
    calibrationId: string,
    option: NutritionOption,
    organizationId?: string,
  ): Promise<NutritionConfirmationResponse> {
    return apiClient.post<NutritionConfirmationResponse>(
      `${BASE_URL}/${parcelId}/calibration/${calibrationId}/nutrition-option`,
      { option },
      {},
      organizationId,
    );
  },

  async getCalibrationPhase(
    parcelId: string,
    organizationId?: string,
  ): Promise<CalibrationPhase> {
    const parcel = await apiClient.get<{ ai_phase?: string }>(
      `${BASE_URL}/${parcelId}`,
      {},
      organizationId,
    );
    const aiPhase = parcel?.ai_phase;
    if (!aiPhase) {
      return 'unknown';
    }
    return aiPhase as CalibrationPhase;
  },

  async getCalibrationHistory(
    parcelId: string,
    organizationId?: string,
  ): Promise<CalibrationHistoryRecord[]> {
    return apiClient.get<CalibrationHistoryRecord[]>(
      `${BASE_URL}/${parcelId}/calibration/history`,
      {},
      organizationId,
    );
  },
};
