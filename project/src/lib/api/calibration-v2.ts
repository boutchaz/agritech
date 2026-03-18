import { apiClient } from "../api-client";
import type {
  CalibrationV2Output,
  NutritionOption,
} from "@/types/calibration-v2";

const BASE_URL = "/api/v1/parcels";

export type CalibrationPhase =
  | "disabled"
  | "pret_calibrage"
  | "calibrating"
  | "awaiting_validation"
  | "awaiting_nutrition_option"
  | "active"
  | "paused"
  | "unknown";

export interface CalibrationStatusRecord {
  id: string;
  parcel_id: string;
  status: "pending" | "provisioning" | "in_progress" | "completed" | "failed";
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
  ai_phase: "active";
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

export interface F3EligibilityResponse {
  eligible: boolean;
  trigger_reason: "harvest_completed" | "date_reached" | "manual";
  harvest_date?: string;
  days_since_harvest?: number;
}

export interface F3MissingTask {
  task_type: string;
  period: string;
  message: string;
  action: "quick_entry" | "confirm_not_done" | "ignore";
}

export interface F3NewAnalysesResponse {
  new_soil: boolean;
  new_water: boolean;
  new_foliar: boolean;
}

export interface F3CampaignBilanResponse {
  predicted_yield: { min: number; max: number };
  actual_yield: number | null;
  yield_deviation_pct: number | null;
  alternance_status_next: string;
  alerts_summary: Array<{ code: string; count: number }>;
  interventions_planned: number;
  interventions_executed: number;
  health_score_evolution: { start: number; end: number };
}

export interface CalibrationReportResponse {
  calibration: CalibrationStatusRecord;
  report: {
    output?: CalibrationV2Output;
    [key: string]: unknown;
  } | null;
}

export interface PartialRecalibrationDto {
  recalibration_motif: string;
  recalibration_motif_detail?: string;
  updates: Record<string, unknown>;
  impact_preview?: {
    modified_parameters?: Array<{
      path: string;
      label: string;
      oldValue: string;
      newValue: string;
    }>;
    modules_to_recalculate?: string[];
    confidence_preview?: number;
    ai_recommendation?: 'partial' | 'full';
  };
}

export const calibrationV2Api = {
  async startCalibration(
    parcelId: string,
    dto: Record<string, unknown> = {},
    organizationId?: string,
  ): Promise<CalibrationStatusRecord> {
    return apiClient.post<CalibrationStatusRecord>(
      `${BASE_URL}/${parcelId}/calibration/start`,
      dto,
      {},
      organizationId,
    );
  },

  async checkReadiness(
    parcelId: string,
    organizationId?: string,
  ): Promise<{
    ready: boolean;
    confidence_preview: number;
    checks: Array<{
      check: string;
      status: "pass" | "fail" | "warning";
      message: string;
    }>;
    improvements: string[];
  }> {
    return apiClient.get(
      `${BASE_URL}/${parcelId}/calibration/readiness`,
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
      return "unknown";
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

  // F2 — Partial Recalibration
  async startPartialRecalibration(
    parcelId: string,
    dto: PartialRecalibrationDto,
    organizationId?: string,
  ): Promise<CalibrationStatusRecord> {
    return apiClient.post<CalibrationStatusRecord>(
      `${BASE_URL}/${parcelId}/calibration/partial`,
      dto,
      {},
      organizationId,
    );
  },

  // F3 — Annual Recalibration
  async checkF3Eligibility(
    parcelId: string,
    organizationId?: string,
  ): Promise<F3EligibilityResponse> {
    return apiClient.get<F3EligibilityResponse>(
      `${BASE_URL}/${parcelId}/calibration/f3/eligibility`,
      {},
      organizationId,
    );
  },

  async getF3MissingTasks(
    parcelId: string,
    organizationId?: string,
  ): Promise<F3MissingTask[]> {
    return apiClient.get<F3MissingTask[]>(
      `${BASE_URL}/${parcelId}/calibration/f3/missing-tasks`,
      {},
      organizationId,
    );
  },

  async checkF3NewAnalyses(
    parcelId: string,
    organizationId?: string,
  ): Promise<F3NewAnalysesResponse> {
    return apiClient.get<F3NewAnalysesResponse>(
      `${BASE_URL}/${parcelId}/calibration/f3/new-analyses`,
      {},
      organizationId,
    );
  },

  async getF3CampaignBilan(
    parcelId: string,
    organizationId?: string,
  ): Promise<F3CampaignBilanResponse> {
    return apiClient.get<F3CampaignBilanResponse>(
      `${BASE_URL}/${parcelId}/calibration/f3/campaign-bilan`,
      {},
      organizationId,
    );
  },

  async startAnnualRecalibration(
    parcelId: string,
    dto: Record<string, unknown>,
    organizationId?: string,
  ): Promise<CalibrationStatusRecord> {
    return apiClient.post<CalibrationStatusRecord>(
      `${BASE_URL}/${parcelId}/calibration/f3/start`,
      dto,
      {},
      organizationId,
    );
  },
};
