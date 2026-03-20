// Calibration API Client for Mobile App
// Adapted from web: project/src/lib/api/calibration-v2.ts

import { api } from '../api';
import type {
  CalibrationPhase,
  CalibrationStatusRecord,
  CalibrationReportResponse,
  CalibrationHistoryRecord,
  CalibrationReadinessResponse,
  NutritionSuggestionResponse,
  NutritionConfirmationResponse,
  AnnualEligibilityResponse,
  AnnualMissingTask,
  AnnualNewAnalysesResponse,
  AnnualCampaignBilanResponse,
  PartialRecalibrationDto,
  NutritionOption,
} from '@/types/calibration';

const BASE_URL = '/parcels';

export const calibrationApi = {
  // Start initial calibration
  async startCalibration(
    parcelId: string,
    dto: Record<string, unknown> = {},
  ): Promise<CalibrationStatusRecord> {
    return api.post<CalibrationStatusRecord>(
      `${BASE_URL}/${parcelId}/calibration/start`,
      dto,
    );
  },

  // Check calibration readiness
  async checkReadiness(parcelId: string): Promise<CalibrationReadinessResponse> {
    return api.get<CalibrationReadinessResponse>(
      `${BASE_URL}/${parcelId}/calibration/readiness`,
    );
  },

  // Get current calibration status
  async getCalibrationStatus(parcelId: string): Promise<CalibrationStatusRecord | null> {
    return api.get<CalibrationStatusRecord | null>(
      `${BASE_URL}/${parcelId}/calibration`,
    );
  },

  // Get calibration report with full output
  async getCalibrationReport(parcelId: string): Promise<CalibrationReportResponse | null> {
    return api.get<CalibrationReportResponse | null>(
      `${BASE_URL}/${parcelId}/calibration/report`,
    );
  },

  // Validate calibration (accept baseline)
  async validateCalibration(
    parcelId: string,
    calibrationId: string,
  ): Promise<CalibrationStatusRecord> {
    return api.post<CalibrationStatusRecord>(
      `${BASE_URL}/${parcelId}/calibration/${calibrationId}/validate`,
      {},
    );
  },

  // Get nutrition suggestion
  async getNutritionSuggestion(parcelId: string): Promise<NutritionSuggestionResponse> {
    return api.get<NutritionSuggestionResponse>(
      `${BASE_URL}/${parcelId}/calibration/nutrition-suggestion`,
    );
  },

  // Confirm nutrition option
  async confirmNutritionOption(
    parcelId: string,
    calibrationId: string,
    option: NutritionOption,
  ): Promise<NutritionConfirmationResponse> {
    return api.post<NutritionConfirmationResponse>(
      `${BASE_URL}/${parcelId}/calibration/${calibrationId}/nutrition-option`,
      { option },
    );
  },

  // Get calibration phase
  async getCalibrationPhase(parcelId: string): Promise<CalibrationPhase> {
    const parcel = await api.get<{ ai_phase?: string }>(
      `${BASE_URL}/${parcelId}`,
    );
    const aiPhase = parcel?.ai_phase;
    if (!aiPhase) {
      return 'unknown';
    }
    return aiPhase as CalibrationPhase;
  },

  // Get calibration history
  async getCalibrationHistory(parcelId: string): Promise<CalibrationHistoryRecord[]> {
    return api.get<CalibrationHistoryRecord[]>(
      `${BASE_URL}/${parcelId}/calibration/history`,
    );
  },

  // Partial Recalibration
  async startPartialRecalibration(
    parcelId: string,
    dto: PartialRecalibrationDto,
  ): Promise<CalibrationStatusRecord> {
    return api.post<CalibrationStatusRecord>(
      `${BASE_URL}/${parcelId}/calibration/partial`,
      dto,
    );
  },

  // Annual Recalibration - Check eligibility
  async checkAnnualEligibility(parcelId: string): Promise<AnnualEligibilityResponse> {
    return api.get<AnnualEligibilityResponse>(
      `${BASE_URL}/${parcelId}/calibration/annual/eligibility`,
    );
  },

  // Annual Recalibration - Get missing tasks
  async getAnnualMissingTasks(parcelId: string): Promise<AnnualMissingTask[]> {
    return api.get<AnnualMissingTask[]>(
      `${BASE_URL}/${parcelId}/calibration/annual/missing-tasks`,
    );
  },

  // Annual Recalibration - Check new analyses
  async checkAnnualNewAnalyses(parcelId: string): Promise<AnnualNewAnalysesResponse> {
    return api.get<AnnualNewAnalysesResponse>(
      `${BASE_URL}/${parcelId}/calibration/annual/new-analyses`,
    );
  },

  // Annual Recalibration - Get campaign bilan
  async getAnnualCampaignBilan(parcelId: string): Promise<AnnualCampaignBilanResponse> {
    return api.get<AnnualCampaignBilanResponse>(
      `${BASE_URL}/${parcelId}/calibration/annual/campaign-bilan`,
    );
  },

  // Annual Recalibration - Start
  async startAnnualRecalibration(
    parcelId: string,
    dto: Record<string, unknown>,
  ): Promise<CalibrationStatusRecord> {
    return api.post<CalibrationStatusRecord>(
      `${BASE_URL}/${parcelId}/calibration/annual/start`,
      dto,
    );
  },
};
