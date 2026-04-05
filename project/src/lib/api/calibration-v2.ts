import { apiClient } from "../api-client";
import type {
  CalibrationV2Output,
  NutritionOption,
} from "@/types/calibration-v2";
import type { CalibrationReviewView } from "@/types/calibration-review";

const BASE_URL = "/api/v1/parcels";

export type CalibrationPhase =
  | "awaiting_data"
  | "ready_calibration"
  | "calibrating"
  | "calibrated"
  | "awaiting_nutrition_option"
  | "active"
  | "archived"
  | "unknown";

export interface CalibrationStatusRecord {
  id: string;
  parcel_id: string;
  status: "in_progress" | "awaiting_validation" | "validated" | "insufficient" | "failed" | "archived";
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
  phase_age: string | null;
  type: string;
  mode_calibrage: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AnnualEligibilityResponse {
  eligible: boolean;
  trigger_reason: "harvest_completed" | "date_reached" | "manual";
  harvest_date?: string;
  days_since_harvest?: number;
}

export interface AnnualMissingTask {
  task_id: string;
  task_type: string;
  period: string;
  message: string;
  action: "quick_entry" | "confirm_not_done" | "ignore";
  current_resolution?: "completed" | "not_done" | "unconfirmed";
  resolution_date?: string;
  resolution_notes?: string;
}

export interface AnnualNewAnalysesResponse {
  new_soil: boolean;
  new_water: boolean;
  new_foliar: boolean;
  soil_date?: string;
  water_date?: string;
  foliar_date?: string;
}

export interface AnnualMissingTaskResolution {
  task_id: string;
  resolution: "completed" | "not_done" | "unconfirmed";
  execution_date?: string;
  notes?: string;
}

export interface AnnualCampaignBilanResponse {
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

interface ParcelPhaseResponse {
  ai_phase?: string | null;
  parcel?: {
    ai_phase?: string | null;
  } | null;
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
    const response = await apiClient.get<ParcelPhaseResponse>(
      `${BASE_URL}/${parcelId}`,
      {},
      organizationId,
    );
    const aiPhase = response?.ai_phase ?? response?.parcel?.ai_phase;
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

  // Partial Recalibration
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

  // Annual Recalibration
  async checkAnnualEligibility(
    parcelId: string,
    organizationId?: string,
  ): Promise<AnnualEligibilityResponse> {
    return apiClient.get<AnnualEligibilityResponse>(
      `${BASE_URL}/${parcelId}/calibration/annual/eligibility`,
      {},
      organizationId,
    );
  },

  async getAnnualMissingTasks(
    parcelId: string,
    organizationId?: string,
  ): Promise<AnnualMissingTask[]> {
    return apiClient.get<AnnualMissingTask[]>(
      `${BASE_URL}/${parcelId}/calibration/annual/missing-tasks`,
      {},
      organizationId,
    );
  },

  async resolveAnnualMissingTasks(
    parcelId: string,
    resolutions: AnnualMissingTaskResolution[],
    organizationId?: string,
  ): Promise<{
    reviewed_at: string;
    resolutions: AnnualMissingTaskResolution[];
  }> {
    return apiClient.post(
      `${BASE_URL}/${parcelId}/calibration/annual/missing-tasks/resolve`,
      { resolutions },
      {},
      organizationId,
    );
  },

  async checkAnnualNewAnalyses(
    parcelId: string,
    organizationId?: string,
  ): Promise<AnnualNewAnalysesResponse> {
    return apiClient.get<AnnualNewAnalysesResponse>(
      `${BASE_URL}/${parcelId}/calibration/annual/new-analyses`,
      {},
      organizationId,
    );
  },

  async getAnnualCampaignBilan(
    parcelId: string,
    organizationId?: string,
  ): Promise<AnnualCampaignBilanResponse> {
    return apiClient.get<AnnualCampaignBilanResponse>(
      `${BASE_URL}/${parcelId}/calibration/annual/campaign-bilan`,
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
      `${BASE_URL}/${parcelId}/calibration/annual/start`,
      dto,
      {},
      organizationId,
    );
  },

  async snoozeAnnualReminder(
    parcelId: string,
    days: number,
    organizationId?: string,
  ): Promise<{ snoozed_until: string }> {
    return apiClient.post(
      `${BASE_URL}/${parcelId}/calibration/annual/snooze`,
      { days },
      {},
      organizationId,
    );
  },

  // ═══════════════════════════════════════════════════════════════
  // WIZARD DRAFT
  // ═══════════════════════════════════════════════════════════════

  async getDraft(
    parcelId: string,
    organizationId?: string,
  ): Promise<CalibrationDraftResponse | null> {
    return apiClient.get<CalibrationDraftResponse | null>(
      `${BASE_URL}/${parcelId}/calibration/draft`,
      {},
      organizationId,
    );
  },

  async saveDraft(
    parcelId: string,
    dto: { current_step: number; form_data: Record<string, unknown> },
    organizationId?: string,
  ): Promise<CalibrationDraftResponse> {
    return apiClient.put<CalibrationDraftResponse>(
      `${BASE_URL}/${parcelId}/calibration/draft`,
      dto,
      {},
      organizationId,
    );
  },

  async deleteDraft(
    parcelId: string,
    organizationId?: string,
  ): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(
      `${BASE_URL}/${parcelId}/calibration/draft`,
      {},
      organizationId,
    );
  },

  async getCalibrationReview(
    parcelId: string,
    organizationId?: string,
  ): Promise<CalibrationReviewView | null> {
    return apiClient.get<CalibrationReviewView | null>(
      `${BASE_URL}/${parcelId}/calibration/review`,
      {},
      organizationId,
    );
  },

  async exportCalibration(
    calibrationId: string,
    format: "json" | "csv" | "zip",
    organizationId?: string,
  ): Promise<Blob> {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "/api/v1"}/calibrations/${calibrationId}/export?format=${format}`,
      {
        headers: {
          ...(organizationId
            ? { "x-organization-id": organizationId }
            : {}),
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }
    return response.blob();
  },
};

export interface CalibrationDraftResponse {
  id: string;
  parcel_id: string;
  current_step: number;
  form_data: Record<string, unknown>;
  updated_at: string;
}
