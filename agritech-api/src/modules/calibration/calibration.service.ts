import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { AIReportsService } from "../ai-reports/ai-reports.service";
import { AgromindReportType } from "../ai-reports/interfaces";
import {
  AnnualPlanService,
  AnnualPlanWithInterventions,
} from "../annual-plan/annual-plan.service";
import { DatabaseService } from "../database/database.service";
import {
  CALIBRATION_SATELLITE_INDICES,
  SatelliteCacheService,
} from "../satellite-indices/satellite-cache.service";
import { SatelliteProxyService } from "../satellite-indices/satellite-proxy.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { NotificationType } from "../notifications/dto/notification.dto";
import { WeatherProvider } from "../chat/providers/weather.provider";
import { StartCalibrationDto } from "./dto/start-calibration.dto";
import { CalibrationStateMachine, type AiPhase } from "./calibration-state-machine";
import {
  NutritionOptionService,
  NutritionOptionSuggestion,
} from "./nutrition-option.service";
import { getLocalCropReference } from "./crop-reference-loader";
import {
  CalibrationReviewAdapter,
  type CalibrationReviewView,
  type CalibrationSnapshotInput,
} from "./calibration-review.adapter";

/**
 * Calibration satellite lookback depth depends on tree age, per spec.
 *
 * | Parcel Age        | Lookback                  |
 * |-------------------|---------------------------|
 * | ≥ 3 years         | 36 months                 |
 * | 2–3 years         | 24 months                 |
 * | < 2 years         | Jan 1 of planting year    |
 * | No planting year  | 24 months (default)       |
 *
 * @see docs/docs/features/satellite-analysis.md — Delta Sync Helper
 * @see docs/docs/features/cron-jobs.md — Delta Sync Strategy
 */
/**
 * Max lookback days — must stay within FastAPI weather endpoint limit (365*3 = 1095 days).
 * We use 1090 to leave a small buffer.
 */
const MAX_LOOKBACK_DAYS = 1090;

function getCalibrationLookbackDate(plantingYear: number | null): string {
  const now = new Date();

  let start: Date;

  if (plantingYear != null) {
    const parcelAge = now.getFullYear() - plantingYear;

    if (parcelAge >= 3) {
      // 36 months, clamped to MAX_LOOKBACK_DAYS
      start = new Date();
      start.setMonth(start.getMonth() - 36);
    } else if (parcelAge < 2) {
      start = new Date(`${plantingYear}-01-01`);
    } else {
      // 2–3 years: 24 months
      start = new Date();
      start.setMonth(start.getMonth() - 24);
    }
  } else {
    // No planting year: default 24 months
    start = new Date();
    start.setMonth(start.getMonth() - 24);
  }

  // Clamp: never exceed MAX_LOOKBACK_DAYS from today
  const maxStart = new Date();
  maxStart.setDate(maxStart.getDate() - MAX_LOOKBACK_DAYS);
  if (start < maxStart) {
    start = maxStart;
  }

  return start.toISOString().split("T")[0];
}

const NDVI_PERCENTILES = [10, 25, 50, 75, 90];
/** Minimum confidence score (0-100 scale) for active recommendations */
const MINIMUM_CONFIDENCE_FOR_ACTIVE = 25;

type ZoneClassification = "optimal" | "normal" | "stressed";
type ParcelAiPhase =
  | "awaiting_data"
  | "calibrating"
  | "calibrated"
  | "awaiting_nutrition_option"
  | "active"
  
  | "ready_calibration"
  | string;
type JsonObject = Record<string, unknown>;
type CalibrationType = "initial" | "F2_partial" | "F3_complete";
type RecalibrationMotif =
  | "water_source_change"
  | "irrigation_change"
  | "new_soil_analysis"
  | "new_water_analysis"
  | "new_foliar_analysis"
  | "parcel_restructure"
  | "other";

interface NdviThresholds {
  optimal: [number, number];
  vigilance: number;
  alerte: number;
}

export interface PercentilesResponse {
  percentiles: Record<string, number>;
}

export interface ZonesResponse {
  zones: string[];
  distribution: Record<string, number>;
}

interface ParcelContext {
  id: string;
  cropType: string;
  system: string;
  boundary: number[][];
  organizationId: string | null;
  variety: string | null;
  plantingYear: number | null;
  plantCount: number | null;
  area: number | null;
  areaUnit: string | null;
  densityPerHectare: number | null;
  irrigationType: string | null;
  waterSource: string | null;
  irrigationFrequency: string | null;
  waterQuantityPerSession: number | null;
  langue: string;
  aiPhase: ParcelAiPhase;
}

interface CropReferenceRow {
  reference_data?: unknown;
}

interface SatelliteIndexRow {
  date: string;
  index_name: string;
  mean_value: number | string | null;
  cloud_coverage_percentage: number | null;
}

interface WeatherDailyRow {
  date: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  temperature_min: number | string | null;
  temperature_max: number | string | null;
  temperature_mean?: number | string | null;
  relative_humidity_mean?: number | string | null;
  wind_speed_max?: number | string | null;
  shortwave_radiation_sum?: number | string | null;
  precipitation_sum: number | string | null;
  et0_fao_evapotranspiration: number | string | null;
  gdd_olivier?: number | string | null;
  gdd_agrumes?: number | string | null;
  gdd_avocatier?: number | string | null;
  gdd_palmier_dattier?: number | string | null;
  chill_hours?: number | string | null;
}

interface AnalysisRow {
  analysis_type: string;
  analysis_date: string;
  data: unknown;
}

interface HarvestRow {
  harvest_date: string | null;
  quantity: number | string | null;
  unit: string | null;
  quality_grade: string | null;
  quality_score: number | null;
}

interface CalibrationResponse {
  parcel_id: string;
  phase_age: string;
  step3?: {
    global_percentiles?: Record<string, { p50?: number }>;
  };
  step4?: {
    mean_dates?: Record<string, string>;
  };
  step5?: {
    anomalies?: unknown[];
  };
  step6?: {
    yield_potential?: {
      minimum?: number;
      maximum?: number;
    };
  };
  step7?: {
    zone_summary?: Array<{ class_name?: string; surface_percent?: number }>;
    spatial_pattern_type?: string;
  };
  step8?: {
    health_score?: {
      total?: number;
    };
  };
  confidence?: {
    total_score?: number;
    normalized_score?: number;
  };
}

export interface CalibrationRecord {
  id: string;
  parcel_id: string;
  organization_id: string;
  type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  mode_calibrage: string | null;
  phase_age: string | null;
  p50_ndvi: number | string | null;
  p50_nirv: number | string | null;
  p50_ndmi: number | string | null;
  p50_ndre: number | string | null;
  p10_ndvi: number | string | null;
  p10_ndmi: number | string | null;
  confidence_score: number | string | null;
  health_score: number | string | null;
  yield_potential_min: number | string | null;
  yield_potential_max: number | string | null;
  coefficient_etat_parcelle: number | string | null;
  anomaly_count: number;
  baseline_data: unknown;
  diagnostic_data: unknown;
  anomalies_data: unknown;
  scores_detail: unknown;
  profile_snapshot: unknown;
  recalibration_motif: string | null;
  previous_baseline: unknown;
  campaign_bilan: unknown;
  rapport_fr: string | null;
  rapport_ar: string | null;
  validated_by_user: boolean;
  validated_at: string | null;
  calibration_version: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionOptionConfirmation {
  calibration_id: string;
  parcel_id: string;
  option: "A" | "B" | "C";
  ai_phase: "active";
}

@Injectable()
export class CalibrationService {
  private readonly logger = new Logger(CalibrationService.name);

  @Inject(forwardRef(() => AIReportsService))
  private readonly aiReportsService: AIReportsService;

  @Inject(forwardRef(() => NotificationsGateway))
  private readonly notificationsGateway: NotificationsGateway;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stateMachine: CalibrationStateMachine,
    private readonly nutritionOptionService: NutritionOptionService,
    private readonly annualPlanService: AnnualPlanService,
    private readonly satelliteCacheService: SatelliteCacheService,
    private readonly satelliteProxy: SatelliteProxyService,
    private readonly notificationsService: NotificationsService,
    private readonly calibrationReviewAdapter: CalibrationReviewAdapter,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // WIZARD DRAFT PERSISTENCE
  // ═══════════════════════════════════════════════════════════════

  async getDraft(
    parcelId: string,
    organizationId: string,
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('calibration_wizard_drafts')
      .select('id, parcel_id, current_step, form_data, updated_at')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to get wizard draft: ${error.message}`);
      throw new BadRequestException(`Failed to get wizard draft: ${error.message}`);
    }

    return data; // null if not found
  }

  async saveDraft(
    parcelId: string,
    organizationId: string,
    userId: string,
    dto: { current_step: number; form_data: Record<string, unknown> },
  ) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('calibration_wizard_drafts')
      .upsert(
        {
          parcel_id: parcelId,
          organization_id: organizationId,
          user_id: userId,
          current_step: dto.current_step,
          form_data: dto.form_data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'parcel_id,organization_id,user_id' },
      )
      .select('id, parcel_id, current_step, form_data, updated_at')
      .single();

    if (error) {
      this.logger.error(`Failed to save wizard draft: ${error.message}`);
      throw new BadRequestException(`Failed to save wizard draft: ${error.message}`);
    }

    return data;
  }

  async deleteDraft(
    parcelId: string,
    organizationId: string,
    userId: string,
  ) {
    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('calibration_wizard_drafts')
      .delete()
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to delete wizard draft: ${error.message}`);
      throw new BadRequestException(`Failed to delete wizard draft: ${error.message}`);
    }

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════

  private emitCalibrationProgress(
    organizationId: string,
    parcelId: string,
    calibrationId: string,
    step: number,
    totalSteps: number,
    stepKey: string,
    message: string,
  ): void {
    this.notificationsGateway.emitToOrganization(
      organizationId,
      "calibration:progress",
      {
        parcel_id: parcelId,
        calibration_id: calibrationId,
        step,
        total_steps: totalSteps,
        step_key: stepKey,
        message,
        percent: Math.round((step / totalSteps) * 100),
      },
    );
  }

  async startCalibration(
    parcelId: string,
    organizationId: string,
    dto: StartCalibrationDto,
    options?: { skipReadinessCheck?: boolean; authToken?: string },
  ): Promise<CalibrationRecord> {
    const parcel = await this.getParcelContext(parcelId, organizationId);
    const previousPhase = parcel.aiPhase as
      | "awaiting_data"
      | "ready_calibration"
      | "active"
      | "calibrated"
      | "awaiting_nutrition_option";

    if (parcel.aiPhase === "calibrating") {
      throw new BadRequestException(
        "Parcel calibration is already in progress",
      );
    }

    const allowedStartPhases = [
      "awaiting_data",
      "ready_calibration",
      "active",
      "calibrated",
      "awaiting_nutrition_option",
    ];
    if (!allowedStartPhases.includes(parcel.aiPhase)) {
      throw new BadRequestException(
        `Calibration can only start from awaiting_data, ready_calibration, active, calibrated, or awaiting_nutrition_option phase (current: ${parcel.aiPhase})`,
      );
    }

    if (!options?.skipReadinessCheck) {
      const readiness = await this.checkCalibrationReadiness(
        parcelId,
        organizationId,
        dto,
      );
      if (!readiness.ready) {
        const failedChecks = readiness.checks
          .filter((c) => c.status === "fail")
          .map((c) => c.message);
        throw new BadRequestException(
          `Calibration cannot start: ${failedChecks.join("; ")}`,
        );
      }
    }

    const supabase = this.databaseService.getAdminClient();
    const startedAt = new Date().toISOString();

    // Lifecycle: transition through intermediate states if needed
    await this.transitionToCalibrating(parcelId, previousPhase, organizationId);

    const { data: calibration, error: insertError } = await supabase
      .from("calibrations")
      .insert({
        parcel_id: parcelId,
        organization_id: organizationId,
        type: "initial",
        status: "in_progress",
        started_at: startedAt,
        calibration_version: "v3",
        profile_snapshot: {
          request: { ...dto, lookback_start_date: getCalibrationLookbackDate(parcel.plantingYear) },
          parcel: {
            id: parcel.id,
            crop_type: parcel.cropType,
            planting_year: parcel.plantingYear,
            variety: parcel.variety,
            planting_system: parcel.system,
          },
          recovery: {
            previous_ai_phase: previousPhase,
          },
        },
      })
      .select("*")
      .single();

    if (insertError || !calibration) {
      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrating",
        previousPhase,
        organizationId,
      );

      throw new BadRequestException(
        `Failed to create calibration: ${insertError?.message ?? "unknown error"}`,
      );
    }

    this.runCalibrationInBackground(
      calibration.id as string,
      parcelId,
      organizationId,
      parcel,
      dto,
      options?.authToken,
    ).catch((error) => {
      this.logger.error(
        `Background calibration failed for calibration ${calibration.id}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    });

    return calibration as CalibrationRecord;
  }

  async startPartialRecalibration(
    parcelId: string,
    organizationId: string,
    dto: StartCalibrationDto,
    options?: { authToken?: string },
  ): Promise<CalibrationRecord> {
    const mode = dto.mode_calibrage ?? "partial";
    if (mode !== "partial") {
      throw new BadRequestException(
        "Partial recalibration endpoint only accepts mode_calibrage=partial",
      );
    }

    const motif = dto.recalibration_motif as RecalibrationMotif | undefined;
    if (!motif) {
      throw new BadRequestException(
        "recalibration_motif is required for partial recalibration",
      );
    }

    const allowedMotifs: RecalibrationMotif[] = [
      "water_source_change",
      "irrigation_change",
      "new_soil_analysis",
      "new_water_analysis",
      "new_foliar_analysis",
      "parcel_restructure",
      "other",
    ];
    if (!allowedMotifs.includes(motif)) {
      throw new BadRequestException(
        `Invalid recalibration_motif: ${motif}`,
      );
    }

    if (motif === "other" && !dto.recalibration_motif_detail?.trim()) {
      throw new BadRequestException(
        "recalibration_motif_detail is required when recalibration_motif=other",
      );
    }

    if (motif === "parcel_restructure") {
      const fullCalibrationDto = {
        ...dto,
        mode_calibrage: "full",
      } as unknown as StartCalibrationDto;
      return this.startCalibration(
        parcelId,
        organizationId,
        fullCalibrationDto,
        { skipReadinessCheck: true, authToken: options?.authToken },
      );
    }

    const parcel = await this.getParcelContext(parcelId, organizationId);
    const previousPhase = parcel.aiPhase as
      | "awaiting_data"
      | "ready_calibration"
      | "active"
      | "calibrated"
      | "awaiting_nutrition_option";

    if (parcel.aiPhase === "calibrating") {
      throw new BadRequestException(
        "Parcel calibration is already in progress",
      );
    }

    const allowedStartPhases = [
      "awaiting_data",
      "ready_calibration",
      "active",
      "calibrated",
      "awaiting_nutrition_option",
    ];

    if (!allowedStartPhases.includes(parcel.aiPhase)) {
      throw new BadRequestException(
        `Partial recalibration can only start from awaiting_data, ready_calibration, active, calibrated, or awaiting_nutrition_option phase (current: ${parcel.aiPhase})`,
      );
    }

    const baselineCalibration = await this.getLatestCompletedCalibration(
      parcelId,
      organizationId,
    );

    if (!baselineCalibration) {
      throw new BadRequestException(
        "A completed baseline calibration is required before partial recalibration",
      );
    }

    const affectedBlocks = this.getAffectedBlocksForMotif(motif);
    const updatedBlocks = await this.buildUpdatedBlocksForMotif(
      motif,
      parcelId,
      parcel,
      dto,
    );
    const previousBaseline = this.extractPreviousBaseline(baselineCalibration);

    const supabase = this.databaseService.getAdminClient();
    const startedAt = new Date().toISOString();

    // Lifecycle: transition through intermediate states if needed
    await this.transitionToCalibrating(parcelId, previousPhase, organizationId);

    const { data: calibration, error: insertError } = await supabase
      .from("calibrations")
      .insert({
        parcel_id: parcelId,
        organization_id: organizationId,
        type: "F2_partial",
        status: "in_progress",
        started_at: startedAt,
        recalibration_motif: motif,
        previous_baseline: previousBaseline,
        calibration_version: "v3",
        profile_snapshot: {
          request: { ...dto, lookback_start_date: getCalibrationLookbackDate(parcel.plantingYear) },
          recalibration: {
            motif,
            motif_detail: dto.recalibration_motif_detail ?? null,
            affected_blocks: affectedBlocks,
          },
          parcel: {
            id: parcel.id,
            crop_type: parcel.cropType,
            planting_year: parcel.plantingYear,
            variety: parcel.variety,
            planting_system: parcel.system,
          },
          baseline_reference: {
            calibration_id: baselineCalibration.id,
            completed_at: baselineCalibration.completed_at,
          },
          updated_blocks: updatedBlocks,
          recovery: {
            previous_ai_phase: previousPhase,
          },
        },
      })
      .select("*")
      .single();

    if (insertError || !calibration) {
      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrating",
        previousPhase,
        organizationId,
      );

      throw new BadRequestException(
        `Failed to create partial recalibration: ${insertError?.message ?? "unknown error"}`,
      );
    }

    this.runPartialRecalibrationInBackground(
      calibration.id as string,
      parcelId,
      organizationId,
      parcel,
      dto,
      motif,
      affectedBlocks,
      updatedBlocks,
      previousBaseline,
      options?.authToken,
    ).catch((error) => {
      this.logger.error(
        `Background partial recalibration failed for calibration ${calibration.id}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    });

    return calibration as CalibrationRecord;
  }

  private isRecoverableCalibrationPhase(value: string): value is AiPhase {
    return (
      value === "awaiting_data" ||
      value === "ready_calibration" ||
      value === "active" ||
      value === "calibrated" ||
      value === "awaiting_nutrition_option"
    );
  }

  private async markCalibrationRunFailedUnlessAlreadyTerminal(
    calibrationId: string,
    organizationId: string,
    message: string,
  ): Promise<boolean> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .eq("status", "in_progress")
      .select("id");

    if (error) {
      this.logger.error(
        `Failed to mark calibration ${calibrationId} as failed: ${error.message}`,
      );
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  }

  private async restoreParcelPhaseAfterCalibrationFailure(
    parcelId: string,
    organizationId: string,
    calibrationId: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { data: row, error } = await supabase
      .from("calibrations")
      .select("profile_snapshot")
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `Could not load calibration ${calibrationId} for phase recovery: ${error.message}`,
      );
    }

    const persistedCalibrationData = this.toJsonObject(row?.profile_snapshot);
    const recovery = this.toJsonObject(persistedCalibrationData.recovery);
    const rawPrevious =
      typeof recovery.previous_ai_phase === "string"
        ? recovery.previous_ai_phase
        : null;
    const targetPhase: AiPhase =
      rawPrevious && this.isRecoverableCalibrationPhase(rawPrevious)
        ? rawPrevious
        : "awaiting_data";

    try {
      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrating",
        targetPhase,
        organizationId,
      );
    } catch (phaseError) {
      this.logger.warn(
        `Phase recovery to ${targetPhase} after calibration failure failed for parcel ${parcelId}: ${phaseError instanceof Error ? phaseError.message : String(phaseError)}`,
      );
    }
  }

  private async assertCalibrationStillInProgressForRun(
    calibrationId: string,
    organizationId: string,
  ): Promise<boolean> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select("status")
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return data.status === "in_progress";
  }

  private async runCalibrationInBackground(
    calibrationId: string,
    parcelId: string,
    organizationId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
    authToken?: string,
  ): Promise<void> {
    try {
      await Promise.race([
        this.executeCalibration(
          calibrationId,
          parcelId,
          organizationId,
          parcel,
          dto,
          authToken,
        ),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => {
              reject(new Error("Calibration timed out after 10 minutes"));
            },
            10 * 60 * 1000,
          );
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`Calibration ${calibrationId} failed: ${message}`);

      const markedFailed = await this.markCalibrationRunFailedUnlessAlreadyTerminal(
        calibrationId,
        organizationId,
        message,
      );

      if (markedFailed) {
        await this.restoreParcelPhaseAfterCalibrationFailure(
          parcelId,
          organizationId,
          calibrationId,
        );
      } else {
        this.logger.warn(
          `Calibration ${calibrationId} failure handler skipped marking failed (run already completed or not in progress)`,
        );
      }

      if (markedFailed) {
        this.notificationsGateway.emitToOrganization(
          organizationId,
          "calibration:failed",
          {
            parcel_id: parcelId,
            calibration_id: calibrationId,
            error_message: message,
          },
        );

        this.notifyOrganizationUsers(
          organizationId,
          NotificationType.CALIBRATION_FAILED,
          "Calibration échouée",
          "La calibration de la parcelle a échoué.",
          {
            parcel_id: parcelId,
            calibration_id: calibrationId,
            error_message: message,
          },
        ).catch((err) =>
          this.logger.warn(`Failed to send calibration failure notification: ${err}`),
        );
      }
    }
  }

  private async runPartialRecalibrationInBackground(
    calibrationId: string,
    parcelId: string,
    organizationId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
    motif: RecalibrationMotif,
    affectedBlocks: string[],
    updatedBlocks: Record<string, unknown>,
    previousBaseline: JsonObject,
    authToken?: string,
  ): Promise<void> {
    try {
      await Promise.race([
        this.executePartialRecalibration(
          calibrationId,
          parcelId,
          organizationId,
          parcel,
          dto,
          motif,
          affectedBlocks,
          updatedBlocks,
          previousBaseline,
          authToken,
        ),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => {
              reject(new Error("Partial recalibration timed out after 10 minutes"));
            },
            10 * 60 * 1000,
          );
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`Partial recalibration ${calibrationId} failed: ${message}`);

      const markedFailed = await this.markCalibrationRunFailedUnlessAlreadyTerminal(
        calibrationId,
        organizationId,
        message,
      );

      if (markedFailed) {
        await this.restoreParcelPhaseAfterCalibrationFailure(
          parcelId,
          organizationId,
          calibrationId,
        );
      } else {
        this.logger.warn(
          `Partial recalibration ${calibrationId} failure handler skipped marking failed (run already completed or not in progress)`,
        );
      }

      if (markedFailed) {
        this.notificationsGateway.emitToOrganization(
          organizationId,
          "calibration:failed",
          {
            parcel_id: parcelId,
            calibration_id: calibrationId,
            error_message: message,
          },
        );

        this.notifyOrganizationUsers(
          organizationId,
          NotificationType.CALIBRATION_FAILED,
          "Recalibrage partiel échoué",
          "Le recalibrage partiel de la parcelle a échoué.",
          {
            parcel_id: parcelId,
            calibration_id: calibrationId,
            error_message: message,
            mode_calibrage: "partial",
            recalibration_motif: motif,
          },
        ).catch((err) =>
          this.logger.warn(
            `Failed to send partial recalibration failure notification: ${err}`,
          ),
        );
      }
    }
  }

  private async executePartialRecalibration(
    calibrationId: string,
    parcelId: string,
    organizationId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
    motif: RecalibrationMotif,
    affectedBlocks: string[],
    updatedBlocks: Record<string, unknown>,
    previousBaseline: JsonObject,
    authToken?: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const totalSteps = 5;
    const completedAt = new Date().toISOString();
    const calibrationDataStart = getCalibrationLookbackDate(parcel.plantingYear);
    const emitProgress = (step: number, stepKey: string, message: string) =>
      this.emitCalibrationProgress(organizationId, parcelId, calibrationId, step, totalSteps, stepKey, message);

    emitProgress(1, "data_collection", "Collecte des données satellite, météo et analyses...");

    const [satelliteImages, initialWeatherRows, analyses, harvestRecords, referenceData] = await Promise.all([
      this.fetchSatelliteImages(parcelId, organizationId, calibrationDataStart),
      this.fetchWeatherRows(parcel),
      this.fetchAnalyses(parcelId),
      this.fetchHarvestRecords(parcelId),
      this.fetchCropReferenceData(parcel.cropType),
    ]);

    let weatherRows = initialWeatherRows;

    if (weatherRows.length === 0) {
      emitProgress(1, "weather_sync", "Synchronisation des données météo...");
      await this.syncWeatherData(parcel, organizationId, authToken);
      weatherRows = await this.fetchWeatherRows(parcel);
      this.logger.log(
        `Weather auto-sync completed for parcel ${parcelId}: ${weatherRows.length} rows`,
      );
    }

    const calibrationInput = {
      parcel_id: parcelId,
      organization_id: organizationId,
      crop_type: parcel.cropType,
      variety: parcel.variety,
      planting_year: parcel.plantingYear,
      planting_system: parcel.system,
      plant_count: parcel.plantCount,
      area_hectares: this.toHectares(parcel.area, parcel.areaUnit),
      density_per_hectare: parcel.densityPerHectare,
      irrigation_frequency:
        dto.irrigation_frequency ?? parcel.irrigationFrequency,
      volume_per_tree_liters: dto.volume_per_tree_liters ?? null,
      water_source: dto.water_source ?? parcel.waterSource,
      harvest_regularity: dto.harvest_regularity ?? null,
      cultural_history: {
        pruning_type: dto.pruning_type ?? null,
        last_pruning_date: dto.last_pruning_date ?? null,
        pruning_intensity: dto.pruning_intensity ?? null,
        past_fertilization: dto.past_fertilization ?? null,
        fertilization_type: dto.fertilization_type ?? null,
        biostimulants_used: dto.biostimulants_used ?? null,
        stress_events: dto.stress_events ?? [],
        observations: dto.observations ?? null,
        water_source_changed: dto.water_source_changed ?? null,
        water_source_change_date: dto.water_source_change_date ?? null,
        previous_water_source: dto.previous_water_source ?? null,
        irrigation_regime_changed: dto.irrigation_regime_changed ?? null,
        irrigation_change_date: dto.irrigation_change_date ?? null,
        previous_irrigation_frequency:
          dto.previous_irrigation_frequency ?? null,
        previous_volume_per_tree_liters:
          dto.previous_volume_per_tree_liters ?? null,
      },
      analyses,
      harvest_records: harvestRecords,
      reference_data: referenceData,
      mode_calibrage: "F2_partial" as CalibrationType,
      recalibration_motif: motif,
      baseline_calibration: previousBaseline,
      updated_blocks: updatedBlocks,
    };

    emitProgress(2, "calibration_engine", "Exécution du moteur de calibration V2...");

    const v2Output = await this.satelliteProxy.proxy("POST", "/calibration/v2/run", {
      body: {
        calibration_input: calibrationInput,
        satellite_images: satelliteImages,
        weather_rows: weatherRows,
      },
      organizationId,
      authToken,
    }) as CalibrationResponse;

    emitProgress(3, "saving_results", "Sauvegarde des résultats de calibration...");

    const stillInProgressPartial = await this.assertCalibrationStillInProgressForRun(
      calibrationId,
      organizationId,
    );
    if (!stillInProgressPartial) {
      this.logger.warn(
        `Partial recalibration ${calibrationId} aborted before save (calibration no longer in_progress)`,
      );
      return;
    }

    const { data: existingPartialSnapshot } = await supabase
      .from("calibrations")
      .select("profile_snapshot")
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    const existingPartialData = this.toJsonObject(
      existingPartialSnapshot?.profile_snapshot,
    );

    const zoneClassification = this.deriveZoneClassification(v2Output);
    const rawConfidence = this.toNumber(v2Output.confidence?.normalized_score);
    const confidenceScore = rawConfidence !== null
      ? (rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence))
      : null;
    const observationMode = this.buildObservationModeContext(confidenceScore);
    const calibrationData = {
      ...existingPartialData,
      version: "v2",
      request: { ...dto, mode_calibrage: "partial", lookback_start_date: getCalibrationLookbackDate(parcel.plantingYear) },
      recalibration: {
        motif,
        motif_detail: dto.recalibration_motif_detail ?? null,
        affected_blocks: affectedBlocks,
      },
      parcel: {
        id: parcel.id,
        crop_type: parcel.cropType,
        planting_system: parcel.system,
        planting_year: parcel.plantingYear,
        variety: parcel.variety,
      },
      previous_baseline: previousBaseline,
      updated_blocks: updatedBlocks,
      output: v2Output,
      validation: {
        validated: true,
        validated_at: completedAt,
      },
      ...(observationMode.observationOnly
        ? {
            observation_only: true,
            observation_reason: observationMode.observationReason,
          }
        : {}),
    };

    const { data: partialCompletedRows, error: updateCalibrationError } =
      await supabase
        .from("calibrations")
        .update({
          status: "validated",
          completed_at: completedAt,
          mode_calibrage: this.extractModeCalibrage(v2Output),
          phase_age: this.extractPhaseAge(v2Output, parcel),
          recalibration_motif: motif,
          previous_baseline: previousBaseline,
          p50_ndvi: this.extractIndexP50(v2Output, "NDVI"),
          p50_nirv: this.extractIndexP50(v2Output, "NIRv"),
          p50_ndmi: this.extractIndexP50(v2Output, "NDMI"),
          p50_ndre: this.extractIndexP50(v2Output, "NDRE"),
          p10_ndvi: this.extractIndexPercentile(v2Output, "NDVI", "p10"),
          p10_ndmi: this.extractIndexPercentile(v2Output, "NDMI", "p10"),
          confidence_score: confidenceScore,
          health_score: this.toInteger(v2Output.step8?.health_score?.total),
          yield_potential_min: this.toNumber(
            v2Output.step6?.yield_potential?.minimum,
          ),
          yield_potential_max: this.toNumber(
            v2Output.step6?.yield_potential?.maximum,
          ),
          coefficient_etat_parcelle: this.extractCoefficientEtat(v2Output),
          anomaly_count: Array.isArray(v2Output.step5?.anomalies)
            ? v2Output.step5?.anomalies.length
            : 0,
          baseline_data: this.extractBaselineData(v2Output),
          diagnostic_data: this.extractDiagnosticData(v2Output),
          anomalies_data: v2Output.step5?.anomalies ?? null,
          scores_detail: this.extractScoresDetail(v2Output),
          profile_snapshot: calibrationData,
          calibration_version: "v3",
        })
        .eq("id", calibrationId)
        .eq("organization_id", organizationId)
        .eq("status", "in_progress")
        .select("id");

    if (updateCalibrationError) {
      throw new Error(
        `Failed to update partial recalibration: ${updateCalibrationError.message}`,
      );
    }

    if (!partialCompletedRows?.length) {
      this.logger.warn(
        `Partial recalibration ${calibrationId} completion skipped (calibration no longer in_progress; likely timed out or failed concurrently)`,
      );
      return;
    }

    emitProgress(4, "ai_reports", "Génération des rapports d'analyse IA...");

    const primaryLanguage = parcel.langue || "fr";
    const secondaryLanguage = primaryLanguage === "fr" ? "ar" : "fr";

    const [primaryReport, secondaryReport] = await Promise.all([
      this.runCalibrationAI(
        calibrationId,
        parcelId,
        organizationId,
        v2Output,
        primaryLanguage,
        calibrationDataStart,
      ),
      this.runCalibrationAI(
        calibrationId,
        parcelId,
        organizationId,
        v2Output,
        secondaryLanguage,
        calibrationDataStart,
      ),
    ]);

    const bilingualUpdate: Record<string, unknown> = {};
    if (primaryReport || secondaryReport) {
      bilingualUpdate.profile_snapshot = {
        ...calibrationData,
        ai_analysis: primaryReport ?? secondaryReport,
      };
    }

    if (primaryLanguage === "fr") {
      if (primaryReport)
        bilingualUpdate.rapport_fr = JSON.stringify(primaryReport);
      if (secondaryReport)
        bilingualUpdate.rapport_ar = JSON.stringify(secondaryReport);
    } else {
      if (primaryReport)
        bilingualUpdate.rapport_ar = JSON.stringify(primaryReport);
      if (secondaryReport)
        bilingualUpdate.rapport_fr = JSON.stringify(secondaryReport);
    }

    if (Object.keys(bilingualUpdate).length > 0) {
      const { error: aiUpdateError } = await supabase
        .from("calibrations")
        .update(bilingualUpdate)
        .eq("id", calibrationId)
        .eq("organization_id", organizationId)
        .eq("status", "completed");

      if (aiUpdateError) {
        this.logger.warn(
          `Failed to store bilingual partial recalibration reports: ${aiUpdateError.message}`,
        );
      }
    }

    emitProgress(5, "finalizing", "Activation de la nouvelle baseline...");

    const { error: updateParcelError } = await supabase
      .from("parcels")
      .update({
        ai_calibration_id: calibrationId,
        ai_enabled: true,
        ai_observation_only: observationMode.observationOnly,
      })
      .eq("id", parcelId)
      .eq("organization_id", organizationId);

    if (updateParcelError) {
      throw new Error(
        `Failed to update parcel AI state: ${updateParcelError.message}`,
      );
    }

    try {
      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrating",
        "calibrated",
        organizationId,
      );
      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrated",
        "active",
        organizationId,
      );

      await this.runPostActivationFlows(calibrationId, parcelId, organizationId);
    } catch (phaseError) {
      this.logger.warn(
        `Partial recalibration ${calibrationId} phase transition or post-activation failed: ${phaseError instanceof Error ? phaseError.message : String(phaseError)}`,
      );
    }

    this.notifyOrganizationUsers(
      organizationId,
      NotificationType.CALIBRATION_COMPLETE,
      "Calibration terminée",
      observationMode.observationOnly
        ? "Le recalibrage partiel est terminé. La nouvelle baseline est active en mode observation."
        : "Le recalibrage partiel est terminé et la nouvelle baseline est active.",
      {
        parcel_id: parcelId,
        calibration_id: calibrationId,
        mode_calibrage: "partial",
        recalibration_motif: motif,
      },
    ).catch((err) =>
      this.logger.warn(
        `Failed to send partial recalibration notification: ${err}`,
      ),
    );
  }

  private async executeCalibration(
    calibrationId: string,
    parcelId: string,
    organizationId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
    authToken?: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const totalSteps = 7;
    const completedAt = new Date().toISOString();
    const calibrationDataStart = getCalibrationLookbackDate(parcel.plantingYear);
    const emitProgress = (step: number, stepKey: string, message: string) =>
      this.emitCalibrationProgress(organizationId, parcelId, calibrationId, step, totalSteps, stepKey, message);

    emitProgress(1, "data_collection", "Collecte des données satellite, météo et analyses...");

    const [
      initialSatelliteImages,
      initialWeatherRows,
      analyses,
      harvestRecords,
      referenceData,
    ] = await Promise.all([
      this.fetchSatelliteImages(parcelId, organizationId, calibrationDataStart),
      this.fetchWeatherRows(parcel),
      this.fetchAnalyses(parcelId),
      this.fetchHarvestRecords(parcelId),
      this.fetchCropReferenceData(parcel.cropType),
    ]);

    let satelliteImages = initialSatelliteImages;

    const missingSatelliteIndices =
      await this.getMissingSatelliteIndexNames(
        parcelId,
        organizationId,
        calibrationDataStart,
        CALIBRATION_SATELLITE_INDICES,
      );

    const needsSatelliteSync =
      satelliteImages.length === 0 || missingSatelliteIndices.length > 0;

    if (needsSatelliteSync) {
      emitProgress(2, "satellite_sync", "Synchronisation des images satellite...");
      const indicesToSync =
        satelliteImages.length === 0
          ? [...CALIBRATION_SATELLITE_INDICES]
          : missingSatelliteIndices;

      this.logger.log(
        satelliteImages.length === 0
          ? `No satellite rows for parcel ${parcelId}, syncing ${indicesToSync.length} indices from GEE`
          : `Parcel ${parcelId} missing ${missingSatelliteIndices.length} index series (${missingSatelliteIndices.join(", ")}), syncing from GEE`,
      );

      const syncResult =
        await this.satelliteCacheService.syncParcelSatelliteData(
          parcelId,
          organizationId,
          undefined,
          {
            startDate: calibrationDataStart,
            endDate: new Date().toISOString().split("T")[0],
            indices: indicesToSync,
            authToken,
          },
        );

      this.logger.log(
        `Satellite sync for parcel ${parcelId}: ${syncResult.totalPoints} total points persisted`,
      );

      satelliteImages = await this.fetchSatelliteImages(
        parcelId,
        organizationId,
        calibrationDataStart,
      );
    }

    let weatherRows = initialWeatherRows;

    if (weatherRows.length === 0) {
      emitProgress(2, "weather_sync", "Synchronisation des données météo...");
      await this.syncWeatherData(parcel, organizationId, authToken);
      weatherRows = await this.fetchWeatherRows(parcel);
      this.logger.log(
        `Weather auto-sync completed for parcel ${parcelId}: ${weatherRows.length} rows`,
      );
    }

    emitProgress(3, "raster_extraction", "Extraction des pixels NDVI par zone...");

    let ndviRasterPixels: Array<{
      lon: number;
      lat: number;
      value: number;
    }> | null = null;
    try {
      const wgs84Boundary = parcel.boundary.map((coord: number[]) => {
        if (Math.abs(coord[0]) > 180 || Math.abs(coord[1]) > 90) {
          const lon = (coord[0] / 20037508.34) * 180;
          const lat =
            (Math.atan(Math.exp((coord[1] / 20037508.34) * Math.PI)) * 360) /
              Math.PI -
            90;
          return [lon, lat];
        }
        return coord;
      });

      const sinceDate = getCalibrationLookbackDate(parcel.plantingYear);
      const today = new Date().toISOString().split("T")[0];

      const rasterResult = await this.satelliteProxy.proxy("POST", "/calibration/v2/extract-raster", {
        body: {
          geometry: wgs84Boundary,
          start_date: sinceDate,
          end_date: today,
          scale: 10,
        },
        organizationId,
        timeout: 120000,
        authToken,
      }) as { pixels: Array<{ lon: number; lat: number; value: number }>; count: number };

      if (rasterResult.count > 1) {
        ndviRasterPixels = rasterResult.pixels;
        this.logger.log(
          `Extracted ${rasterResult.count} NDVI pixels for parcel ${parcelId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Per-pixel raster extraction failed for parcel ${parcelId}, falling back to parcel-level: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    emitProgress(4, "gdd_precompute", "Calcul des degrés-jours de croissance...");

    if (
      weatherRows.length &&
      this.hasMissingGdd(weatherRows, parcel.cropType)
    ) {
      const wgs84ForGdd = WeatherProvider.ensureWGS84(parcel.boundary);
      const gddCentroid = WeatherProvider.calculateCentroid(wgs84ForGdd);
      const gddLatitude = this.roundCoordinate(gddCentroid.latitude, 2);
      const gddLongitude = this.roundCoordinate(gddCentroid.longitude, 2);

      // Build NIRv time-series from satellite images for the two-phase model.
      const nirvSeries: Array<{ date: string; value: number }> = [];
      for (const img of satelliteImages) {
        const indices = img.indices as Record<string, number> | undefined;
        const nirvVal = indices?.NIRv ?? indices?.nirv;
        if (img.date && nirvVal != null) {
          nirvSeries.push({ date: String(img.date), value: Number(nirvVal) });
        }
      }

      // Fetch variety-specific chill threshold for olive two-phase model.
      let chillThreshold: number | null = null;
      if (parcel.cropType === "olivier" && parcel.variety) {
        try {
          const supabase = this.databaseService.getAdminClient();
          const { data: varietyData } = await supabase
            .from("crop_varieties")
            .select("chill_hours_requirement")
            .ilike("name", parcel.variety)
            .maybeSingle();
          if (varietyData?.chill_hours_requirement) {
            chillThreshold = Number(varietyData.chill_hours_requirement);
          }
        } catch {
          this.logger.warn(
            `Could not fetch chill threshold for variety "${parcel.variety}", using default`,
          );
        }
      }

      const precomputeGdd = (await this.satelliteProxy.proxy(
        "POST",
        "/calibration/v2/precompute-gdd",
        {
          body: {
            latitude: gddLatitude,
            longitude: gddLongitude,
            crop_type: parcel.cropType,
            variety: parcel.variety,
            chill_threshold: chillThreshold,
            nirv_series: nirvSeries,
            rows: weatherRows.map((row) => ({ ...row })),
          },
          organizationId,
          timeout: 120000,
          authToken,
        },
      )) as {
        crop_type?: string;
        updated_rows?: number;
        rows?: WeatherDailyRow[];
      };

      if (
        Array.isArray(precomputeGdd.rows) &&
        precomputeGdd.rows.length === weatherRows.length
      ) {
        weatherRows = precomputeGdd.rows;
      }
    }

    emitProgress(5, "calibration_engine", "Exécution du moteur de calibration V2...");

    const calibrationInput = {
      parcel_id: parcelId,
      organization_id: organizationId,
      crop_type: parcel.cropType,
      variety: parcel.variety,
      planting_year: parcel.plantingYear,
      planting_system: parcel.system,
      plant_count: parcel.plantCount,
      area_hectares: this.toHectares(parcel.area, parcel.areaUnit),
      density_per_hectare: parcel.densityPerHectare,
      irrigation_frequency:
        dto.irrigation_frequency ?? parcel.irrigationFrequency,
      volume_per_tree_liters: dto.volume_per_tree_liters ?? null,
      water_source: dto.water_source ?? parcel.waterSource,
      harvest_regularity: dto.harvest_regularity ?? null,
      cultural_history: {
        pruning_type: dto.pruning_type ?? null,
        last_pruning_date: dto.last_pruning_date ?? null,
        pruning_intensity: dto.pruning_intensity ?? null,
        past_fertilization: dto.past_fertilization ?? null,
        fertilization_type: dto.fertilization_type ?? null,
        biostimulants_used: dto.biostimulants_used ?? null,
        stress_events: dto.stress_events ?? [],
        observations: dto.observations ?? null,
        water_source_changed: dto.water_source_changed ?? null,
        water_source_change_date: dto.water_source_change_date ?? null,
        previous_water_source: dto.previous_water_source ?? null,
        irrigation_regime_changed: dto.irrigation_regime_changed ?? null,
        irrigation_change_date: dto.irrigation_change_date ?? null,
        previous_irrigation_frequency:
          dto.previous_irrigation_frequency ?? null,
        previous_volume_per_tree_liters:
          dto.previous_volume_per_tree_liters ?? null,
      },
      analyses,
      harvest_records: harvestRecords,
      reference_data: referenceData,
    };

    const v2Output = await this.satelliteProxy.proxy("POST", "/calibration/v2/run", {
      body: {
        calibration_input: calibrationInput,
        satellite_images: satelliteImages,
        weather_rows: weatherRows,
        ndvi_raster_pixels: ndviRasterPixels,
      },
      organizationId,
      authToken,
    }) as CalibrationResponse;

    emitProgress(6, "saving_results", "Sauvegarde des résultats de calibration...");

    const stillInProgress = await this.assertCalibrationStillInProgressForRun(
      calibrationId,
      organizationId,
    );
    if (!stillInProgress) {
      this.logger.warn(
        `Calibration ${calibrationId} aborted before save (calibration no longer in_progress)`,
      );
      return;
    }

    const mode = this.normalizeCalibrationType(dto.mode_calibrage);
    const autoActivate = this.shouldAutoActivateAfterCompletion(
      parcel.aiPhase,
      mode,
    );
    const { data: existingCalibrationSnapshot } = await supabase
      .from("calibrations")
      .select("profile_snapshot")
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    const existingCalibrationData = this.toJsonObject(
      existingCalibrationSnapshot?.profile_snapshot,
    );
    const zoneClassification = this.deriveZoneClassification(v2Output);
    const rawConfidenceFull = this.toNumber(v2Output.confidence?.normalized_score);
    const confidenceScore = rawConfidenceFull !== null
      ? (rawConfidenceFull <= 1 ? Math.round(rawConfidenceFull * 100) : Math.round(rawConfidenceFull))
      : null;
    const observationMode = this.buildObservationModeContext(confidenceScore);
    const calibrationData = {
      ...existingCalibrationData,
      version: "v2",
      request: {
        ...this.toJsonObject(existingCalibrationData.request),
        ...dto,
        lookback_start_date: getCalibrationLookbackDate(parcel.plantingYear),
      },
      parcel: {
        id: parcel.id,
        crop_type: parcel.cropType,
        planting_system: parcel.system,
        planting_year: parcel.plantingYear,
        variety: parcel.variety,
      },
      inputs: {
        satellite_images: satelliteImages,
        weather_rows: weatherRows,
        analyses,
        harvest_records: harvestRecords,
        reference_data: referenceData,
      },
      output: v2Output,
      validation: {
        validated: autoActivate,
        validated_at: autoActivate ? completedAt : null,
      },
      ...(observationMode.observationOnly
        ? {
            observation_only: true,
            observation_reason: observationMode.observationReason,
          }
        : {}),
    };

    const { data: completedRows, error: updateCalibrationError } =
      await supabase
        .from("calibrations")
        .update({
          status: "awaiting_validation",
          completed_at: completedAt,
          mode_calibrage: this.extractModeCalibrage(v2Output),
          phase_age: this.extractPhaseAge(v2Output, parcel),
          p50_ndvi: this.extractIndexP50(v2Output, "NDVI"),
          p50_nirv: this.extractIndexP50(v2Output, "NIRv"),
          p50_ndmi: this.extractIndexP50(v2Output, "NDMI"),
          p50_ndre: this.extractIndexP50(v2Output, "NDRE"),
          p10_ndvi: this.extractIndexPercentile(v2Output, "NDVI", "p10"),
          p10_ndmi: this.extractIndexPercentile(v2Output, "NDMI", "p10"),
          confidence_score: confidenceScore,
          health_score: this.toInteger(v2Output.step8?.health_score?.total),
          yield_potential_min: this.toNumber(
            v2Output.step6?.yield_potential?.minimum,
          ),
          yield_potential_max: this.toNumber(
            v2Output.step6?.yield_potential?.maximum,
          ),
          coefficient_etat_parcelle: this.extractCoefficientEtat(v2Output),
          anomaly_count: Array.isArray(v2Output.step5?.anomalies)
            ? v2Output.step5?.anomalies.length
            : 0,
          baseline_data: this.extractBaselineData(v2Output),
          diagnostic_data: this.extractDiagnosticData(v2Output),
          anomalies_data: v2Output.step5?.anomalies ?? null,
          scores_detail: this.extractScoresDetail(v2Output),
          profile_snapshot: calibrationData,
          calibration_version: "v3",
        })
        .eq("id", calibrationId)
        .eq("organization_id", organizationId)
        .eq("status", "in_progress")
        .select("id");

    if (updateCalibrationError) {
      throw new Error(
        `Failed to update calibration: ${updateCalibrationError.message}`,
      );
    }

    if (!completedRows?.length) {
      this.logger.warn(
        `Calibration ${calibrationId} completion skipped (calibration no longer in_progress; likely timed out or failed concurrently)`,
      );
      return;
    }

    emitProgress(7, "ai_reports", "Génération des rapports d'analyse IA...");

    const primaryLanguage = parcel.langue || "fr";
    const secondaryLanguage = primaryLanguage === "fr" ? "ar" : "fr";

    const [primaryReport, secondaryReport] = await Promise.all([
      this.runCalibrationAI(
        calibrationId,
        parcelId,
        organizationId,
        v2Output,
        primaryLanguage,
        calibrationDataStart,
      ),
      this.runCalibrationAI(
        calibrationId,
        parcelId,
        organizationId,
        v2Output,
        secondaryLanguage,
        calibrationDataStart,
      ),
    ]);

    const bilingualUpdate: Record<string, unknown> = {};
    if (primaryReport || secondaryReport) {
      bilingualUpdate.profile_snapshot = {
        ...calibrationData,
        ai_analysis: primaryReport ?? secondaryReport,
      };
    }

    if (primaryLanguage === "fr") {
      if (primaryReport)
        bilingualUpdate.rapport_fr = JSON.stringify(primaryReport);
      if (secondaryReport)
        bilingualUpdate.rapport_ar = JSON.stringify(secondaryReport);
    } else {
      if (primaryReport)
        bilingualUpdate.rapport_ar = JSON.stringify(primaryReport);
      if (secondaryReport)
        bilingualUpdate.rapport_fr = JSON.stringify(secondaryReport);
    }

    if (Object.keys(bilingualUpdate).length > 0) {
      const { error: aiUpdateError } = await supabase
        .from("calibrations")
        .update(bilingualUpdate)
        .eq("id", calibrationId)
        .eq("organization_id", organizationId)
        .eq("status", "completed");

      if (aiUpdateError) {
        this.logger.warn(
          `Failed to store bilingual AI reports: ${aiUpdateError.message}`,
        );
      }
    }

    const parcelUpdate: Record<string, unknown> = {
      ai_calibration_id: calibrationId,
    };
    if (autoActivate) {
      parcelUpdate.ai_enabled = true;
      parcelUpdate.ai_observation_only = observationMode.observationOnly;
    }

    const { error: updateParcelError } = await supabase
      .from("parcels")
      .update(parcelUpdate)
      .eq("id", parcelId)
      .eq("organization_id", organizationId);

    if (updateParcelError) {
      throw new Error(
        `Failed to update parcel AI state: ${updateParcelError.message}`,
      );
    }

    try {
      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrating",
        "calibrated",
        organizationId,
      );

      if (autoActivate) {
        await this.stateMachine.transitionPhase(
          parcelId,
          "calibrated",
          "active",
          organizationId,
        );
        await this.runPostActivationFlows(calibrationId, parcelId, organizationId);
      }
    } catch (phaseError) {
      this.logger.warn(
        `Calibration ${calibrationId} phase transition or post-activation failed: ${phaseError instanceof Error ? phaseError.message : String(phaseError)}`,
      );
    }

    this.notifyOrganizationUsers(
      organizationId,
      NotificationType.CALIBRATION_COMPLETE,
      "Calibration terminée",
      autoActivate
        ? observationMode.observationOnly
          ? "Le recalibrage est terminé. La nouvelle baseline est active en mode observation."
          : "Le recalibrage est terminé et la nouvelle baseline est active."
        : `Le calibrage de la parcelle est terminé et en attente de validation.`,
      {
        parcel_id: parcelId,
        calibration_id: calibrationId,
        mode_calibrage: mode,
      },
    ).catch((err) =>
      this.logger.warn(`Failed to send calibration notification: ${err}`),
    );
  }

  private async notifyOrganizationUsers(
    organizationId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, unknown>,
    excludeUserId?: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { data: orgUsers } = await supabase
      .from("organization_users")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (!orgUsers?.length) return;

    const seen = new Set<string>();

    for (const orgUser of orgUsers) {
      const uid = orgUser.user_id as string;
      if (seen.has(uid) || uid === excludeUserId) continue;
      seen.add(uid);

      await this.notificationsService
        .createNotification({
          userId: uid,
          organizationId,
          type,
          title,
          message,
          data,
        })
        .catch(() => {});
    }
  }

  private async runCalibrationAI(
    calibrationId: string,
    parcelId: string,
    organizationId: string,
    calibrationOutput: CalibrationResponse,
    language: string = "fr",
    dataStartDate?: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      this.logger.log(
        `Starting AI calibration analysis (${language}) for calibration ${calibrationId} parcel ${parcelId}`,
      );

      const resolved = await this.aiReportsService.resolveProvider(organizationId);
      const result = await this.aiReportsService.generateReport(
        organizationId,
        "system",
        {
          parcel_id: parcelId,
          provider: resolved.provider,
          model: resolved.model,
          reportType: AgromindReportType.CALIBRATION,
          language,
          data_start_date: dataStartDate ?? new Date().toISOString().split("T")[0],
          data_end_date: new Date().toISOString().split("T")[0],
        },
      );

      if (result?.sections) {
        this.logger.log(
          `AI calibration analysis completed for parcel ${parcelId}`,
        );
        return result.sections as Record<string, unknown>;
      }

      return null;
    } catch (error) {
      this.logger.warn(
        `AI calibration analysis failed for parcel ${parcelId}, continuing without AI report: ${error instanceof Error ? error.message : "unknown"}`,
      );
      return null;
    }
  }

  async getLatestCalibration(
    parcelId: string,
    organizationId: string,
  ): Promise<CalibrationRecord | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select("*")
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to fetch latest calibration for parcel ${parcelId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch calibration: ${error.message}`,
      );
    }

    return data as CalibrationRecord | null;
  }

  async getCalibrationHistory(
    parcelId: string,
    organizationId: string,
    limit: number = 5,
  ): Promise<
    Array<{
      id: string;
      status: string;
      health_score: number | null;
      confidence_score: number | null;
      phase_age: string | null;
      error_message: string | null;
      type: string;
      mode_calibrage: string | null;
      recalibration_motif: string | null;
      created_at: string;
      completed_at: string | null;
    }>
  > {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select(
        "id, type, status, health_score, confidence_score, phase_age, mode_calibrage, error_message, recalibration_motif, profile_snapshot, created_at, completed_at",
      )
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error(
        `Failed to fetch calibration history for parcel ${parcelId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch calibration history: ${error.message}`,
      );
    }

    return this.mapCalibrationHistoryRows(data ?? []);
  }

  async getRecalibrationHistory(
    parcelId: string,
    organizationId: string,
    limit: number = 5,
  ): Promise<
    Array<{
      id: string;
      status: string;
      health_score: number | null;
      confidence_score: number | null;
      phase_age: string | null;
      error_message: string | null;
      type: string;
      mode_calibrage: string | null;
      recalibration_motif: string | null;
      created_at: string;
      completed_at: string | null;
    }>
  > {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select(
        "id, type, status, health_score, confidence_score, phase_age, mode_calibrage, error_message, recalibration_motif, profile_snapshot, created_at, completed_at",
      )
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .in("type", ["F2_partial"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error(
        `Failed to fetch recalibration history for parcel ${parcelId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch recalibration history: ${error.message}`,
      );
    }

    return this.mapCalibrationHistoryRows(data ?? []);
  }

  async getCalibrationReport(parcelId: string, organizationId: string) {
    const calibration = await this.getLatestCalibration(
      parcelId,
      organizationId,
    );

    if (!calibration) {
      return null;
    }

    // Reconstruct output from split JSONB columns for frontend compatibility
    const baselineData = this.toJsonObject(calibration.baseline_data);
    const diagnosticData = this.toJsonObject(calibration.diagnostic_data);
    const scoresDetail = this.toJsonObject(calibration.scores_detail);
    const profileSnapshot = this.toJsonObject(calibration.profile_snapshot);
    const snapshotOutput = this.toJsonObject(profileSnapshot?.output);

    const output = {
      parcel_id: calibration.parcel_id,
      phase_age: calibration.phase_age,
      mode_calibrage: calibration.mode_calibrage,
      step1: snapshotOutput.step1 ?? null,
      step2: snapshotOutput.step2 ?? null,
      step3: {
        global_percentiles: baselineData.percentiles ?? null,
      },
      step4: baselineData.phenology ?? null,
      step5: {
        anomalies: calibration.anomalies_data ?? [],
      },
      step6: snapshotOutput.step6 ?? {
        yield_potential: {
          minimum: this.toNumber(calibration.yield_potential_min),
          maximum: this.toNumber(calibration.yield_potential_max),
        },
      },
      step7: baselineData.zones ?? null,
      step8: {
        health_score: {
          total: this.toNumber(calibration.health_score),
          ...(this.toJsonObject(scoresDetail.health)),
        },
      },
      confidence: {
        total_score: this.toNumber(calibration.confidence_score),
        normalized_score: this.toNumber(calibration.confidence_score),
        ...(this.toJsonObject(scoresDetail.confidence)),
      },
      diagnostic_explicatif: diagnosticData,
      coefficient_etat_parcelle: this.toNumber(calibration.coefficient_etat_parcelle),
      metadata: {
        version: calibration.calibration_version ?? "v3",
        generated_at: calibration.completed_at ?? calibration.created_at,
        data_quality_flags: this.buildDataQualityFlags(calibration),
      },
    };

    return {
      calibration,
      report: {
        ...profileSnapshot,
        output,
      },
    };
  }

  async getCalibrationReview(
    parcelId: string,
    organizationId: string,
  ): Promise<CalibrationReviewView> {
    const ALLOWED_STATUSES = [
      "completed",
      "calibrated",
      "awaiting_validation",
      "awaiting_nutrition_option",
      "active",
    ];

    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select("*")
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .in("status", ALLOWED_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to fetch calibration for review: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch calibration: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException(
        `No completed calibration found for parcel ${parcelId}`,
      );
    }

    const record = data as CalibrationRecord;
    const profileOutput = this.toJsonObject(
      (this.toJsonObject(record.profile_snapshot) as Record<string, unknown>)?.output,
    );
    const output = {
      ...profileOutput,
      ...this.toJsonObject(record.baseline_data),
      ...this.toJsonObject(record.diagnostic_data),
      anomalies: record.anomalies_data,
      scores: this.toJsonObject(record.scores_detail),
    };
    const history = await this.getCalibrationHistory(parcelId, organizationId, 5);

    const snapshotInput: CalibrationSnapshotInput = {
      calibration_id: record.id,
      parcel_id: record.parcel_id,
      generated_at: record.completed_at ?? record.updated_at ?? record.created_at,
      output,
      inputs: this.toJsonObject(record.profile_snapshot),
      confidence_score: this.toNumber(record.confidence_score),
      status: record.status,
      parcel_phase: record.phase_age ?? "unknown",
      organization_id: record.organization_id,
      calibration_history: history.map((item) => ({
        id: item.id,
        date: item.completed_at ?? item.created_at,
        health_score: item.health_score,
        confidence_score: item.confidence_score,
        phase_age: item.phase_age ?? "unknown",
        status: item.status,
      })),
    };

    return this.calibrationReviewAdapter.transform(snapshotInput);
  }

  async checkCalibrationReadiness(
    parcelId: string,
    organizationId: string,
    dto?: Pick<StartCalibrationDto, "irrigation_frequency" | "water_source">,
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
    const checks: Array<{
      check: string;
      status: "pass" | "fail" | "warning";
      message: string;
    }> = [];
    const improvements: string[] = [];

    const parcel = await this.getParcelContext(parcelId, organizationId);

    checks.push(
      parcel.cropType
        ? { check: "crop_type", status: "pass", message: "Culture renseignée" }
        : {
            check: "crop_type",
            status: "fail",
            message: "Culture obligatoire",
          },
    );

    checks.push(
      parcel.plantingYear
        ? {
            check: "planting_year",
            status: "pass",
            message: "Année de plantation renseignée",
          }
        : {
            check: "planting_year",
            status: "fail",
            message: "Année de plantation obligatoire",
          },
    );

    checks.push(
      parcel.variety
        ? { check: "variety", status: "pass", message: "Variété renseignée" }
        : {
            check: "variety",
            status: "warning",
            message: "Variété recommandée pour améliorer la précision",
          },
    );

    const effectiveIrrigationFrequency =
      dto?.irrigation_frequency ?? parcel.irrigationFrequency;
    const hasIrrigationFrequency = Boolean(effectiveIrrigationFrequency);

    checks.push(
      hasIrrigationFrequency
        ? {
            check: "irrigation_frequency",
            status: "pass",
            message: "Fréquence d'irrigation renseignée",
          }
        : {
            check: "irrigation_frequency",
            status: "warning",
            message:
              "Fréquence d'irrigation recommandée pour améliorer la précision",
          },
    );

    checks.push(
      parcel.irrigationType
        ? {
            check: "irrigation_type",
            status: "pass",
            message: "Type d'irrigation renseigné",
          }
        : {
            check: "irrigation_type",
            status: "warning",
            message: "Type d'irrigation recommandé pour améliorer la précision",
          },
    );

    if (!parcel.waterSource) {
      improvements.push(
        "Ajouter la source d'eau pour contextualiser l'historique satellite",
      );
    }

    const satelliteImages = await this.fetchSatelliteImages(
      parcelId,
      organizationId,
      getCalibrationLookbackDate(parcel.plantingYear),
    );
    const hasMinSatellite = satelliteImages.length >= 10;
    checks.push(
      hasMinSatellite
        ? {
            check: "satellite_data",
            status: "pass",
            message: `${satelliteImages.length} images satellite disponibles`,
          }
        : {
            check: "satellite_data",
            status: "warning",
            message: `${satelliteImages.length}/10 images satellite en cache. Le calibrage peut démarrer et la synchronisation satellite se fera en arrière-plan.`,
          },
    );

    const analyses = await this.fetchAnalyses(parcelId);
    const hasSoil = analyses.some((a) => a.analysis_type === "soil");
    const hasWater = analyses.some((a) => a.analysis_type === "water");
    const hasFoliar = analyses.some((a) => a.analysis_type === "plant");

    checks.push(
      hasSoil
        ? {
            check: "soil_analysis",
            status: "pass",
            message: "Analyse de sol disponible",
          }
        : {
            check: "soil_analysis",
            status: "warning",
            message: "Analyse de sol recommandée (confiance -20 pts)",
          },
    );

    if (!hasSoil) improvements.push("Ajouter une analyse de sol (+20 pts)");
    if (!hasWater) improvements.push("Ajouter une analyse d'eau (+15 pts)");
    if (!hasFoliar) improvements.push("Ajouter une analyse foliaire (+10 pts)");

    const harvestRecords = await this.fetchHarvestRecords(parcelId);
    checks.push(
      harvestRecords.length >= 3
        ? {
            check: "harvest_history",
            status: "pass",
            message: `${harvestRecords.length} années de récolte`,
          }
        : {
            check: "harvest_history",
            status: "warning",
            message: `${harvestRecords.length}/3 années de récolte (3+ recommandées)`,
          },
    );

    if (harvestRecords.length < 3) {
      improvements.push(
        "Ajouter l'historique de récolte (3+ ans) pour améliorer l'estimation du rendement",
      );
    }

    let confidencePreview = 0;
    confidencePreview +=
      satelliteImages.length >= 36
        ? 30
        : satelliteImages.length >= 24
          ? 20
          : satelliteImages.length >= 12
            ? 10
            : 5;
    confidencePreview += hasSoil ? 20 : 0;
    confidencePreview += hasWater ? 15 : 0;
    confidencePreview +=
      harvestRecords.length >= 5
        ? 20
        : harvestRecords.length >= 3
          ? 15
          : harvestRecords.length >= 1
            ? 8
            : 0;
    confidencePreview += parcel.cropType ? 2 : 0;
    confidencePreview += parcel.variety ? 2 : 0;
    confidencePreview += parcel.plantingYear ? 2 : 0;
    confidencePreview += parcel.system ? 2 : 0;
    confidencePreview += parcel.boundary.length >= 3 ? 2 : 0;

    const hasCriticalFail = checks.some((c) => c.status === "fail");

    return {
      ready: !hasCriticalFail,
      confidence_preview: Math.min(confidencePreview, 100),
      checks,
      improvements,
    };
  }

  async validateCalibration(
    calibrationId: string,
    organizationId: string,
  ): Promise<CalibrationRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data: existingCalibration, error: existingError } = await supabase
      .from("calibrations")
      .select("*")
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existingError) {
      this.logger.error(
        `Failed to fetch calibration ${calibrationId} for validation: ${existingError.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch calibration: ${existingError.message}`,
      );
    }

    if (!existingCalibration) {
      throw new NotFoundException("Calibration not found");
    }

    if (typeof existingCalibration.parcel_id !== "string") {
      throw new BadRequestException("Calibration is missing parcel_id");
    }

    const parcel = await this.getParcelContext(
      existingCalibration.parcel_id,
      organizationId,
    );
    const VALIDATABLE_PHASES = new Set(["calibrated", "active", "awaiting_nutrition_option", "awaiting_data", "ready_calibration", "calibrating"]);
    if (!VALIDATABLE_PHASES.has(parcel.aiPhase)) {
      throw new BadRequestException(
        `Calibration can only be validated when calibration data exists (current: ${parcel.aiPhase})`,
      );
    }

    if (existingCalibration.status === "failed" || existingCalibration.status === "in_progress" || existingCalibration.status === "provisioning") {
      throw new BadRequestException(
        `Calibration cannot be validated in ${existingCalibration.status} status`,
      );
    }

    const confidenceScoreAtValidation = this.toNumber(
      existingCalibration.confidence_score,
    );
    const validatedAt = new Date().toISOString();
    const calibrationData = {
      ...this.toJsonObject(existingCalibration.profile_snapshot),
      validation: {
        validated: true,
        validated_at: validatedAt,
        activation_mode:
          confidenceScoreAtValidation !== null &&
          confidenceScoreAtValidation < MINIMUM_CONFIDENCE_FOR_ACTIVE
            ? "observation_only"
            : "pending_nutrition",
      },
    };

    const updatePayload: Record<string, unknown> = {
      status: "validated",
      validated_by_user: true,
      validated_at: validatedAt,
      profile_snapshot: calibrationData,
    };

    if (!existingCalibration.completed_at) {
      updatePayload.completed_at = validatedAt;
    }

    const { data: updatedCalibration, error: updateError } = await supabase
      .from("calibrations")
      .update(updatePayload)
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (updateError || !updatedCalibration) {
      this.logger.error(
        `Failed to validate calibration ${calibrationId}: ${updateError?.message}`,
      );
      throw new BadRequestException(
        `Failed to validate calibration: ${updateError?.message ?? "unknown error"}`,
      );
    }

    if (
      confidenceScoreAtValidation !== null &&
      confidenceScoreAtValidation < MINIMUM_CONFIDENCE_FOR_ACTIVE
    ) {
      this.logger.warn(
        `Calibration ${calibrationId} confidence ${confidenceScoreAtValidation} below threshold ${MINIMUM_CONFIDENCE_FOR_ACTIVE} — parcel stays in observation-only mode`,
      );

      const ensuredPhase = await this.ensureCalibratedPhase(
        existingCalibration.parcel_id,
        parcel.aiPhase as AiPhase,
        organizationId,
      );
      if (ensuredPhase !== "active") {
        await this.stateMachine.transitionPhase(
          existingCalibration.parcel_id,
          "calibrated",
          "active",
          organizationId,
        );
      }

      await supabase
        .from("parcels")
        .update({ ai_enabled: true, ai_observation_only: true })
        .eq("id", existingCalibration.parcel_id)
        .eq("organization_id", organizationId);

      const observationReason = `Confidence score (${confidenceScoreAtValidation}%) below minimum threshold (${MINIMUM_CONFIDENCE_FOR_ACTIVE}%) for active recommendations`;
      const currentData = this.toJsonObject(updatedCalibration.profile_snapshot);
      const prevValidation = this.toJsonObject(currentData.validation);

      await supabase
        .from("calibrations")
        .update({
          profile_snapshot: {
            ...currentData,
            observation_only: true,
            observation_reason: observationReason,
            validation: {
              ...prevValidation,
              validated: true,
              activation_mode: "observation_only",
            },
          },
        })
        .eq("id", calibrationId)
        .eq("organization_id", organizationId);

      return {
        ...(updatedCalibration as CalibrationRecord),
        observation_only: true,
        observation_reason: observationReason,
      } as CalibrationRecord;
    }

    const ensuredPhase = await this.ensureCalibratedPhase(
      existingCalibration.parcel_id,
      parcel.aiPhase as AiPhase,
      organizationId,
    );
    if (ensuredPhase === "calibrated") {
      await this.stateMachine.transitionPhase(
        existingCalibration.parcel_id,
        "calibrated",
        "awaiting_nutrition_option",
        organizationId,
      );
    }

    return updatedCalibration as CalibrationRecord;
  }

  async getNutritionSuggestion(
    parcelId: string,
    organizationId: string,
  ): Promise<NutritionOptionSuggestion> {
    await this.getParcelContext(parcelId, organizationId);
    return this.nutritionOptionService.suggestNutritionOption(
      parcelId,
      organizationId,
    );
  }

  async confirmNutritionOption(
    calibrationId: string,
    organizationId: string,
    option: "A" | "B" | "C",
  ): Promise<NutritionOptionConfirmation> {
    const supabase = this.databaseService.getAdminClient();
    const { data: calibration, error } = await supabase
      .from("calibrations")
      .select("id, parcel_id, organization_id")
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch calibration: ${error.message}`,
      );
    }

    if (!calibration || typeof calibration.parcel_id !== "string") {
      throw new NotFoundException("Calibration not found");
    }

    const parcel = await this.getParcelContext(
      calibration.parcel_id,
      organizationId,
    );
    if (parcel.aiPhase === "active") {
      // Already active — just update the nutrition option, skip phase transitions
    } else if (parcel.aiPhase === "calibrated") {
      await this.stateMachine.transitionPhase(
        calibration.parcel_id,
        "calibrated",
        "awaiting_nutrition_option",
        organizationId,
      );
    } else if (parcel.aiPhase === "calibrating") {
      // Calibration completed but phase stuck at calibrating — advance through
      await this.stateMachine.transitionPhase(
        calibration.parcel_id,
        "calibrating",
        "calibrated",
        organizationId,
      );
      await this.stateMachine.transitionPhase(
        calibration.parcel_id,
        "calibrated",
        "awaiting_nutrition_option",
        organizationId,
      );
    } else if (parcel.aiPhase === "awaiting_data" || parcel.aiPhase === "ready_calibration") {
      await this.transitionToCalibrating(
        calibration.parcel_id,
        parcel.aiPhase,
        organizationId,
      );
      await this.stateMachine.transitionPhase(
        calibration.parcel_id,
        "calibrating",
        "calibrated",
        organizationId,
      );
      await this.stateMachine.transitionPhase(
        calibration.parcel_id,
        "calibrated",
        "awaiting_nutrition_option",
        organizationId,
      );
    } else if (parcel.aiPhase !== "awaiting_nutrition_option") {
      throw new BadRequestException(
        `Nutrition option can only be confirmed when calibration data exists (current: ${parcel.aiPhase})`,
      );
    }

    const { error: updateParcelError } = await supabase
      .from("parcels")
      .update({ ai_nutrition_option: option, ai_enabled: true, ai_observation_only: false })
      .eq("id", calibration.parcel_id)
      .eq("organization_id", organizationId);

    if (updateParcelError) {
      throw new BadRequestException(
        `Failed to persist nutrition option: ${updateParcelError.message}`,
      );
    }

    if (parcel.aiPhase !== "active") {
      await this.stateMachine.transitionPhase(
        calibration.parcel_id,
        "awaiting_nutrition_option",
        "active",
        organizationId,
      );
    }

    setImmediate(() => {
      this.generateAnnualPlan(
        calibrationId,
        calibration.parcel_id,
        organizationId,
      ).catch((err) =>
        this.logger.error(
          `Annual plan generation failed for parcel ${calibration.parcel_id}: ${err instanceof Error ? err.message : "unknown"}`,
        ),
      );
    });

    return {
      calibration_id: calibrationId,
      parcel_id: calibration.parcel_id,
      option,
      ai_phase: "active",
    };
  }

  private async generateAnnualPlan(
    _calibrationId: string,
    parcelId: string,
    organizationId: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { data: parcelAiRow } = await supabase
      .from("parcels")
      .select("ai_phase, ai_enabled, ai_observation_only, planting_year")
      .eq("id", parcelId)
      .maybeSingle();

    const operationalRecommendationsEligible =
      parcelAiRow?.ai_phase === "active" &&
      parcelAiRow?.ai_enabled === true &&
      parcelAiRow?.ai_observation_only !== true;

    this.logger.log(
      `Generating annual plan + narrative reports for parcel ${parcelId} (operational reco narrative: ${operationalRecommendationsEligible})`,
    );

    const annualPlan = await this.annualPlanService.ensurePlan(
      parcelId,
      organizationId,
    );

    const dataEnd = new Date().toISOString().split("T")[0];
    const dataStart = getCalibrationLookbackDate(parcelAiRow?.planting_year ?? null);

    // Resolve provider: org-configured first, then system fallback
    const { provider, model } = await this.aiReportsService.resolveProvider(organizationId);

    let enrichedPlan = annualPlan;

    try {
      const aiResult = await this.aiReportsService.generateReport(organizationId, "system", {
        parcel_id: parcelId,
        provider,
        model,
        reportType: AgromindReportType.ANNUAL_PLAN,
        data_start_date: dataStart,
        data_end_date: dataEnd,
      });

      // Enrich plan_interventions with AI-computed doses and products
      if (aiResult?.sections && typeof aiResult.sections === "object") {
        try {
          enrichedPlan = await this.annualPlanService.enrichPlanFromAI(
            annualPlan.id,
            parcelId,
            organizationId,
            aiResult.sections as Record<string, unknown>,
          );
        } catch (enrichError) {
          this.logger.warn(
            `AI plan enrichment failed for parcel ${parcelId}, keeping template: ${enrichError instanceof Error ? enrichError.message : "unknown error"}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Narrative annual plan report generation failed for parcel ${parcelId}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }

    this.logger.log(`Annual plan generated for parcel ${parcelId}`);

    await this.annualPlanService.syncWorkforceTasksFromPlan(
      enrichedPlan,
      parcelId,
      organizationId,
    );

    if (operationalRecommendationsEligible) {
      try {
        await this.aiReportsService.generateReport(organizationId, "system", {
          parcel_id: parcelId,
          provider,
          model,
          reportType: AgromindReportType.RECOMMENDATIONS,
          data_start_date: dataStart,
          data_end_date: dataEnd,
        });
      } catch (error) {
        this.logger.warn(
          `Operational recommendations narrative report failed for parcel ${parcelId}: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }
  }

  /**
   * When agronomic profile fields change on an already-active parcel, refresh the template plan
   * and re-run annual + operational narrative reports (spec: major change → plan refresh).
   */
  scheduleAnnualPlanRefreshAfterMajorParcelEdit(
    parcelId: string,
    organizationId: string,
  ): void {
    setImmediate(() => {
      void this.runAnnualPlanRefreshAfterMajorParcelEdit(parcelId, organizationId);
    });
  }

  private async runAnnualPlanRefreshAfterMajorParcelEdit(
    parcelId: string,
    organizationId: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { data: row, error } = await supabase
      .from("parcels")
      .select("ai_phase, ai_enabled, ai_observation_only, ai_calibration_id")
      .eq("id", parcelId)
      .maybeSingle();

    if (error || !row) {
      this.logger.warn(
        `Skipping annual plan refresh after parcel edit: parcel ${parcelId} not loaded (${error?.message ?? "unknown"})`,
      );
      return;
    }

    if (
      row.ai_phase !== "active" ||
      row.ai_enabled !== true ||
      row.ai_observation_only === true ||
      typeof row.ai_calibration_id !== "string" ||
      !row.ai_calibration_id
    ) {
      return;
    }

    try {
      await this.generateAnnualPlan(row.ai_calibration_id, parcelId, organizationId);
    } catch (err) {
      this.logger.warn(
        `Annual plan refresh after major parcel edit failed for ${parcelId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private normalizeCalibrationType(mode?: string): CalibrationType {
    const TYPE_MAP: Record<string, CalibrationType> = {
      F2_partial: "F2_partial",
      F3_complete: "F3_complete",
      initial: "initial",
      // Legacy values
      full: "initial",
      partial: "F2_partial",
      annual: "F3_complete",
    };
    return TYPE_MAP[mode ?? ""] ?? "initial";
  }

  private shouldAutoActivateAfterCompletion(
    previousPhase: ParcelAiPhase,
    type: CalibrationType,
  ): boolean {
    if (type === "F3_complete" || type === "F2_partial") {
      return true;
    }

    return previousPhase === "active";
  }

  /**
    * Lifecycle: transitions a parcel to 'calibrating', going through
   * intermediate states if needed (awaiting_data → ready_calibration → calibrating).
   */
  private async transitionToCalibrating(
    parcelId: string,
    currentPhase: AiPhase,
    organizationId: string,
  ): Promise<void> {
    if (currentPhase === "calibrating") return;
    let phase: AiPhase = currentPhase;
    if (phase === "awaiting_data") {
      await this.stateMachine.transitionPhase(parcelId, "awaiting_data", "ready_calibration", organizationId);
      phase = "ready_calibration" as AiPhase;
    }
    await this.stateMachine.transitionPhase(parcelId, phase, "calibrating", organizationId);
  }

  private async ensureCalibratedPhase(
    parcelId: string,
    currentPhase: AiPhase,
    organizationId: string,
  ): Promise<AiPhase> {
    if (currentPhase === "calibrated") return "calibrated";
    if (currentPhase === "awaiting_nutrition_option") return currentPhase;
    if (currentPhase === "active") return currentPhase;

    await this.transitionToCalibrating(parcelId, currentPhase, organizationId);
    await this.stateMachine.transitionPhase(parcelId, "calibrating", "calibrated", organizationId);
    return "calibrated";
  }

  private buildObservationModeContext(confidenceScore: number | null): {
    observationOnly: boolean;
    observationReason: string | null;
  } {
    if (
      confidenceScore === null ||
      confidenceScore !== null && confidenceScore >= MINIMUM_CONFIDENCE_FOR_ACTIVE
    ) {
      return {
        observationOnly: false,
        observationReason: null,
      };
    }

    return {
      observationOnly: true,
      observationReason: `Confidence score (${confidenceScore}%) below minimum threshold (${MINIMUM_CONFIDENCE_FOR_ACTIVE}%) for active recommendations`,
    };
  }

  private async runPostActivationFlows(
    calibrationId: string,
    parcelId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      await this.generateAnnualPlan(calibrationId, parcelId, organizationId);
    } catch (error) {
      this.logger.error(
        `Post-activation annual plan generation failed for parcel ${parcelId}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  async getPercentiles(
    parcelId: string,
    organizationId: string,
    authToken?: string,
  ): Promise<PercentilesResponse> {
    const ndviValues = await this.fetchNdviValues(parcelId, organizationId);

    if (!ndviValues.length) {
      throw new NotFoundException("No NDVI readings found for parcel");
    }

    return (await this.satelliteProxy.proxy("POST", "/calibration/percentiles", {
      body: {
        values: ndviValues,
        percentiles: NDVI_PERCENTILES,
      },
      organizationId,
      authToken,
    })) as PercentilesResponse;
  }

  async getZones(
    parcelId: string,
    organizationId: string,
    authToken?: string,
  ): Promise<ZonesResponse> {
    const parcel = await this.getParcelContext(parcelId, organizationId);
    const [ndviValues, thresholds] = await Promise.all([
      this.fetchNdviValues(parcelId, organizationId),
      this.fetchNdviThresholds(parcel.cropType, parcel.system),
    ]);

    if (!ndviValues.length) {
      throw new NotFoundException("No NDVI readings found for parcel");
    }

    return (await this.satelliteProxy.proxy("POST", "/calibration/classify-zones", {
      body: {
        ndvi_values: ndviValues,
        thresholds,
      },
      organizationId,
      authToken,
    })) as ZonesResponse;
  }

  private async getParcelContext(
    parcelId: string,
    organizationId: string,
  ): Promise<ParcelContext> {
    const supabase = this.databaseService.getAdminClient();
    const { data: parcel, error } = await supabase
      .from("parcels")
      .select(
        "id, crop_type, planting_system, planting_year, variety, ai_phase, boundary, organization_id, plant_count, irrigation_type, water_source, irrigation_frequency, water_quantity_per_session, langue, area, area_unit, density_per_hectare, farms(organization_id)",
      )
      .eq("id", parcelId)
      .single();

    if (error || !parcel) {
      throw new NotFoundException("Parcel not found");
    }

    const belongsToOrganization =
      this.matchesOrganization(parcel.organization_id, organizationId) ||
      this.matchesOrganization(
        this.extractFarmOrganizationId(parcel.farms),
        organizationId,
      );

    if (!belongsToOrganization) {
      throw new NotFoundException("Parcel not found");
    }

    if (!parcel.crop_type) {
      throw new BadRequestException(
        "Parcel crop type is required for calibration",
      );
    }

    return {
      id: parcel.id,
      cropType: parcel.crop_type,
      system: parcel.planting_system ?? "traditionnel",
      boundary: this.parseBoundary(parcel.boundary),
      organizationId:
        typeof parcel.organization_id === "string"
          ? parcel.organization_id
          : null,
      variety: typeof parcel.variety === "string" ? parcel.variety : null,
      plantingYear:
        typeof parcel.planting_year === "number" ? parcel.planting_year : null,
      plantCount: this.toNumber(parcel.plant_count),
      area: this.toNumber(parcel.area),
      areaUnit:
        typeof parcel.area_unit === "string" ? parcel.area_unit : null,
      densityPerHectare: this.toNumber(parcel.density_per_hectare),
      irrigationType:
        typeof parcel.irrigation_type === "string"
          ? parcel.irrigation_type
          : null,
      waterSource:
        typeof parcel.water_source === "string" ? parcel.water_source : null,
      irrigationFrequency:
        typeof parcel.irrigation_frequency === "string"
          ? parcel.irrigation_frequency
          : null,
      waterQuantityPerSession: this.toNumber(parcel.water_quantity_per_session),
      langue: typeof parcel.langue === "string" ? parcel.langue : "fr",
      aiPhase:
        typeof parcel.ai_phase === "string" ? parcel.ai_phase : "awaiting_data",
    };
  }

  private async fetchNdviThresholds(
    cropType: string,
    system: string,
  ): Promise<NdviThresholds> {
    const supabase = this.databaseService.getAdminClient();

    // 1. Try crop_index_thresholds table first (flat, queryable)
    const { data: dbThreshold, error: dbError } = await supabase
      .from("crop_index_thresholds")
      .select("healthy_min, healthy_max, stress_low, critical_low")
      .eq("crop_type_name", cropType)
      .eq("index_name", "NDVI")
      .eq("plantation_system_type", system)
      .maybeSingle();

    if (!dbError && dbThreshold) {
      const healthyMin = this.toNumber(dbThreshold.healthy_min);
      const healthyMax = this.toNumber(dbThreshold.healthy_max);
      const stressLow = this.toNumber(dbThreshold.stress_low);
      const criticalLow = this.toNumber(dbThreshold.critical_low);

      if (
        healthyMin !== null &&
        healthyMax !== null &&
        stressLow !== null &&
        criticalLow !== null
      ) {
        return {
          optimal: [healthyMin, healthyMax],
          vigilance: stressLow,
          alerte: criticalLow,
        };
      }
    }

    if (dbError) {
      this.logger.warn(
        `Failed to query crop_index_thresholds for ${cropType}/${system}: ${dbError.message}`,
      );
    }

    // 2. Fallback to crop_ai_references JSON path
    const { data, error } = await supabase
      .from("crop_ai_references")
      .select("reference_data")
      .eq("crop_type", cropType)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to fetch crop AI references for ${cropType}: ${error.message}`,
      );
    }

    const referenceData = this.toJsonObject(
      (data as CropReferenceRow | null)?.reference_data,
    );
    const satelliteThresholds = this.toJsonObject(
      referenceData.seuils_satellite,
    );
    const systemThresholds = this.toJsonObject(satelliteThresholds[system]);
    const ndviThresholds = this.toJsonObject(systemThresholds.NDVI);
    const optimal = ndviThresholds.optimal;

    if (Array.isArray(optimal) && optimal.length === 2) {
      const optimalMin = this.toNumber(optimal[0]);
      const optimalMax = this.toNumber(optimal[1]);
      const vigilance = this.toNumber(ndviThresholds.vigilance);
      const alerte = this.toNumber(ndviThresholds.alerte);

      if (
        optimalMin !== null &&
        optimalMax !== null &&
        vigilance !== null &&
        alerte !== null
      ) {
        return { optimal: [optimalMin, optimalMax], vigilance, alerte };
      }
    }

    // 3. Hardcoded defaults
    this.logger.warn(
      `No NDVI thresholds for crop "${cropType}" system "${system}", using generic defaults`,
    );
    return {
      optimal: [0.6, 0.8],
      vigilance: 0.5,
      alerte: 0.4,
    };
  }

  private async fetchNdviValues(
    parcelId: string,
    organizationId: string,
    sinceDate?: string,
  ): Promise<number[]> {
    const supabase = this.databaseService.getAdminClient();
    const effectiveSince = sinceDate ?? getCalibrationLookbackDate(null);
    const { data, error } = await supabase
      .from("satellite_indices_data")
      .select("mean_value")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .eq("index_name", "NDVI")
      .gte("date", effectiveSince)
      .order("date", { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch NDVI values for parcel ${parcelId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch NDVI values: ${error.message}`,
      );
    }

    return (data as Array<{ mean_value: number | string | null }>).reduce<
      number[]
    >((values, row) => {
      const value = this.toNumber(row.mean_value);
      if (value !== null) {
        values.push(value);
      }
      return values;
    }, []);
  }

  /**
   * Returns index names that have no rows in satellite_indices_data for this parcel
   * in the calibration window (so GEE was never synced for them).
   */
  private async getMissingSatelliteIndexNames(
    parcelId: string,
    organizationId: string,
    sinceDate: string,
    required: readonly string[],
  ): Promise<string[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("satellite_indices_data")
      .select("index_name")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .gte("date", sinceDate);

    if (error) {
      this.logger.warn(
        `getMissingSatelliteIndexNames query failed for ${parcelId}: ${error.message}; will sync all indices`,
      );
      return [...required];
    }

    if (!data?.length) {
      return [...required];
    }

    const present = new Set(
      data
        .map((row: { index_name: string }) => row.index_name)
        .filter(Boolean),
    );
    return required.filter((name) => !present.has(name));
  }

  private async fetchSatelliteImages(
    parcelId: string,
    organizationId: string,
    sinceDate?: string,
  ): Promise<Array<Record<string, unknown>>> {
    const supabase = this.databaseService.getAdminClient();
    const effectiveSince = sinceDate ?? getCalibrationLookbackDate(null);
    const { data, error } = await supabase
      .from("satellite_indices_data")
      .select("date, index_name, mean_value, cloud_coverage_percentage")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .gte("date", effectiveSince)
      .order("date", { ascending: true })
      .order("index_name", { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch satellite images: ${error.message}`,
      );
    }

    const byDate = new Map<
      string,
      { indices: Record<string, number>; cloudCoverage: number }
    >();
    for (const row of data as SatelliteIndexRow[]) {
      const value = this.toNumber(row.mean_value);
      if (value === null) {
        continue;
      }
      const existing = byDate.get(row.date) ?? {
        indices: {},
        cloudCoverage: 0,
      };
      existing.indices[row.index_name] = value;
      if (
        row.cloud_coverage_percentage !== null &&
        row.cloud_coverage_percentage > existing.cloudCoverage
      ) {
        existing.cloudCoverage = row.cloud_coverage_percentage;
      }
      byDate.set(row.date, existing);
    }

    return Array.from(byDate.entries()).map(
      ([date, { indices, cloudCoverage }]) => ({
        date,
        cloud_coverage: cloudCoverage,
        indices,
      }),
    );
  }

  private async fetchWeatherRows(
    parcel: ParcelContext,
  ): Promise<WeatherDailyRow[]> {
    if (!parcel.boundary.length) {
      throw new BadRequestException(
        "Parcel boundary is required to fetch weather rows",
      );
    }

    const supabase = this.databaseService.getAdminClient();
    const wgs84Boundary = WeatherProvider.ensureWGS84(parcel.boundary);
    const { latitude, longitude } =
      WeatherProvider.calculateCentroid(wgs84Boundary);
    const roundedLatitude = this.roundCoordinate(latitude, 2);
    const roundedLongitude = this.roundCoordinate(longitude, 2);
    const sinceDate = getCalibrationLookbackDate(parcel.plantingYear);

    const { data, error } = await supabase
      .from("weather_daily_data")
      .select(
        "date, latitude, longitude, temperature_min, temperature_max, temperature_mean, relative_humidity_mean, wind_speed_max, shortwave_radiation_sum, precipitation_sum, et0_fao_evapotranspiration, gdd_olivier, gdd_agrumes, gdd_avocatier, gdd_palmier_dattier, chill_hours",
      )
      .eq("latitude", roundedLatitude)
      .eq("longitude", roundedLongitude)
      .gte("date", sinceDate)
      .order("date", { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch weather rows: ${error.message}`,
      );
    }

    return data as WeatherDailyRow[];
  }

  private async syncWeatherData(
    parcel: ParcelContext,
    organizationId: string,
    authToken?: string,
  ): Promise<void> {
    if (!parcel.boundary.length) {
      return;
    }

    const wgs84Boundary = WeatherProvider.ensureWGS84(parcel.boundary);
    const { latitude, longitude } =
      WeatherProvider.calculateCentroid(wgs84Boundary);
    const roundedLatitude = this.roundCoordinate(latitude, 2);
    const roundedLongitude = this.roundCoordinate(longitude, 2);
    const startDate = getCalibrationLookbackDate(parcel.plantingYear);
    const endDate = new Date().toISOString().split("T")[0];

    const body = await this.satelliteProxy.proxy("GET", "/weather/historical", {
      query: {
        latitude: String(roundedLatitude),
        longitude: String(roundedLongitude),
        start_date: startDate,
        end_date: endDate,
      },
      organizationId,
      authToken,
    }) as {
      latitude: number;
      longitude: number;
      source?: string;
      data: Array<Record<string, unknown>>;
    };

    if (!body.data?.length) {
      return;
    }

    const supabase = this.databaseService.getAdminClient();
    const rows = body.data.map((entry) => ({
      latitude: roundedLatitude,
      longitude: roundedLongitude,
      date: entry.date as string,
      temperature_min: entry.temperature_min ?? null,
      temperature_max: entry.temperature_max ?? null,
      temperature_mean: entry.temperature_mean ?? null,
      relative_humidity_mean: entry.relative_humidity_mean ?? null,
      precipitation_sum: entry.precipitation_sum ?? null,
      wind_speed_max: entry.wind_speed_max ?? null,
      shortwave_radiation_sum: entry.shortwave_radiation_sum ?? null,
      et0_fao_evapotranspiration: entry.et0_fao_evapotranspiration ?? null,
      source: body.source ?? "open-meteo-archive",
    }));

    const { error } = await supabase
      .from("weather_daily_data")
      .upsert(rows, { onConflict: "latitude,longitude,date" });

    if (error) {
      this.logger.warn(
        `Weather auto-sync persist failed for parcel ${parcel.id}: ${error.message}`,
      );
    }
  }

  private async fetchAnalyses(
    parcelId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("analyses")
      .select("analysis_type, analysis_date, data")
      .eq("parcel_id", parcelId)
      .in("analysis_type", ["soil", "water", "plant"])
      .order("analysis_date", { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch analyses: ${error.message}`,
      );
    }

    return (data as AnalysisRow[]).map((row) => ({
      analysis_type: row.analysis_type,
      analysis_date: row.analysis_date,
      data: this.toJsonObject(row.data),
    }));
  }

  private async fetchHarvestRecords(
    parcelId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("harvest_records")
      .select(
        "harvest_date, quantity, unit, quality_grade, quality_score",
      )
      .eq("parcel_id", parcelId)
      .order("harvest_date", { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch harvest records: ${error.message}`,
      );
    }

    return (data as HarvestRow[]).map((row) => ({
      harvest_date: row.harvest_date,
      quantity: this.toNumber(row.quantity),
      unit: row.unit,
      quality_grade: row.quality_grade,
      quality_score: row.quality_score,
    }));
  }

  private async fetchCropReferenceData(
    cropType: string,
  ): Promise<Record<string, unknown>> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("crop_ai_references")
      .select("reference_data")
      .eq("crop_type", cropType)
      .maybeSingle();

    if (!error && data) {
      return this.toJsonObject(
        (data as CropReferenceRow).reference_data,
      );
    }

    if (error) {
      this.logger.warn(
        `DB crop reference lookup failed for "${cropType}": ${error.message}, falling back to local JSON`,
      );
    }

    const localRef = getLocalCropReference(cropType);
    if (localRef) {
      this.logger.log(
        `Using bundled JSON reference for "${cropType}"`,
      );
      return localRef;
    }

    this.logger.warn(
      `No crop reference found for "${cropType}" (DB or local)`,
    );
    return {};
  }

  private async getLatestCompletedCalibration(
    parcelId: string,
    organizationId: string,
  ): Promise<CalibrationRecord | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select("*")
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to fetch latest completed calibration for parcel ${parcelId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch latest completed calibration: ${error.message}`,
      );
    }

    return data as CalibrationRecord | null;
  }

  private getAffectedBlocksForMotif(motif: RecalibrationMotif): string[] {
    switch (motif) {
      case "water_source_change":
        return ["water_analysis", "irrigation_params"];
      case "irrigation_change":
        return ["irrigation_params"];
      case "new_soil_analysis":
        return ["soil_analysis"];
      case "new_water_analysis":
        return ["water_analysis"];
      case "new_foliar_analysis":
        return ["foliar_analysis"];
      case "other":
        return ["user_defined"];
      case "parcel_restructure":
        return ["full_recalibration"];
      default:
        return ["user_defined"];
    }
  }

  private async buildUpdatedBlocksForMotif(
    motif: RecalibrationMotif,
    parcelId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
  ): Promise<Record<string, unknown>> {
    const irrigationParams = {
      irrigation_frequency:
        dto.irrigation_frequency ?? parcel.irrigationFrequency ?? null,
      volume_per_tree_liters:
        dto.volume_per_tree_liters ?? parcel.waterQuantityPerSession ?? null,
      irrigation_regime_changed: dto.irrigation_regime_changed ?? null,
      irrigation_change_date: dto.irrigation_change_date ?? null,
      previous_irrigation_frequency:
        dto.previous_irrigation_frequency ?? null,
      previous_volume_per_tree_liters:
        dto.previous_volume_per_tree_liters ?? null,
      water_source: dto.water_source ?? parcel.waterSource ?? null,
      water_source_changed: dto.water_source_changed ?? null,
      water_source_change_date: dto.water_source_change_date ?? null,
      previous_water_source: dto.previous_water_source ?? null,
    };

    const latestAnalyses = await this.fetchLatestAnalysesByTypes(parcelId, [
      "soil",
      "water",
      "plant",
    ]);

    switch (motif) {
      case "water_source_change":
        return {
          water_analysis: latestAnalyses.water ?? null,
          irrigation_params: irrigationParams,
        };
      case "irrigation_change":
        return {
          irrigation_params: irrigationParams,
        };
      case "new_soil_analysis":
        return {
          soil_analysis: latestAnalyses.soil ?? null,
        };
      case "new_water_analysis":
        return {
          water_analysis: latestAnalyses.water ?? null,
        };
      case "new_foliar_analysis":
        return {
          foliar_analysis: latestAnalyses.plant ?? null,
        };
      case "other":
        return {
          user_defined: {
            detail: dto.recalibration_motif_detail ?? null,
            request_overrides: this.toJsonObject(dto),
          },
        };
      case "parcel_restructure":
        return {
          full_recalibration: true,
        };
      default:
        return {
          user_defined: {
            detail: dto.recalibration_motif_detail ?? null,
            request_overrides: this.toJsonObject(dto),
          },
        };
    }
  }

  private async fetchLatestAnalysesByTypes(
    parcelId: string,
    types: string[],
  ): Promise<Record<string, Record<string, unknown>>> {
    const analyses = await this.fetchAnalyses(parcelId);
    const typeSet = new Set(types);
    const latestByType: Record<string, Record<string, unknown>> = {};

    for (const analysis of analyses) {
      const analysisType =
        typeof analysis.analysis_type === "string" ? analysis.analysis_type : "";
      if (typeSet.has(analysisType)) {
        latestByType[analysisType] = analysis;
      }
    }

    return latestByType;
  }

  private extractPreviousBaseline(calibration: CalibrationRecord): JsonObject {
    const calibrationData = this.toJsonObject(calibration.profile_snapshot);
    const output = this.toJsonObject(calibrationData.output);

    if (Object.keys(output).length > 0) {
      return output;
    }

    return calibrationData;
  }

  private mapCalibrationHistoryRows(
    rows: Array<Record<string, unknown>>,
  ): Array<{
    id: string;
    status: string;
    health_score: number | null;
    confidence_score: number | null;
    phase_age: string | null;
    error_message: string | null;
    type: string;
    mode_calibrage: string | null;
    recalibration_motif: string | null;
    created_at: string;
    completed_at: string | null;
  }> {
    return rows.map((row) => {
      return {
        id: row.id as string,
        status: row.status as string,
        health_score: this.toNumber(row.health_score),
        confidence_score: this.toNumber(row.confidence_score),
        phase_age:
          typeof row.phase_age === "string" ? row.phase_age : null,
        error_message:
          typeof row.error_message === "string" ? row.error_message : null,
        type: typeof row.type === "string" ? row.type : "initial",
        mode_calibrage:
          typeof row.mode_calibrage === "string" ? row.mode_calibrage : null,
        recalibration_motif:
          typeof row.recalibration_motif === "string" ? row.recalibration_motif : null,
        created_at: row.created_at as string,
        completed_at:
          typeof row.completed_at === "string" ? row.completed_at : null,
      };
    });
  }

  private hasMissingGdd(rows: WeatherDailyRow[], cropType: string): boolean {
    const gddColumnByCrop: Record<string, keyof WeatherDailyRow> = {
      olivier: "gdd_olivier",
      agrumes: "gdd_agrumes",
      avocatier: "gdd_avocatier",
      palmier_dattier: "gdd_palmier_dattier",
    };

    const column = gddColumnByCrop[cropType];
    if (!column) {
      return false;
    }

    return rows.some((row) => this.toNumber(row[column]) === null);
  }

  private deriveZoneClassification(
    output: CalibrationResponse,
  ): ZoneClassification {
    const summary = output.step7?.zone_summary;
    if (!Array.isArray(summary) || summary.length === 0) {
      return "normal";
    }

    const sorted = [...summary].sort(
      (left, right) =>
        (right.surface_percent ?? 0) - (left.surface_percent ?? 0),
    );
    const dominant = sorted[0]?.class_name;

    if (dominant === "A" || dominant === "B") {
      return "optimal";
    }
    if (dominant === "D" || dominant === "E") {
      return "stressed";
    }
    return "normal";
  }

  private extractIndexP50(
    output: CalibrationResponse,
    indexName: string,
  ): number | null {
    const percentile = output.step3?.global_percentiles?.[indexName]?.p50;
    return this.toNumber(percentile);
  }

  private extractPhenologyStage(output: CalibrationResponse): string | null {
    const meanDates = output.step4?.mean_dates;
    if (!meanDates) {
      return null;
    }

    const keys = Object.keys(meanDates);
    return keys.length > 0 ? keys[0] : null;
  }

  // ═══════════════════════════════════════════════════════════════
  // EXTRACTION HELPERS
  // ═══════════════════════════════════════════════════════════════

  private extractIndexPercentile(
    output: CalibrationResponse,
    indexName: string,
    percentile: string,
  ): number | null {
    const value = output.step3?.global_percentiles?.[indexName]?.[percentile];
    return this.toNumber(value);
  }

  private extractModeCalibrage(output: CalibrationResponse): string | null {
    const raw = (output as unknown as Record<string, unknown>).mode_calibrage;
    return typeof raw === "string" ? raw : null;
  }

  private extractPhaseAge(
    output: CalibrationResponse,
    parcel: ParcelContext,
  ): string | null {
    // Try from engine output first
    const fromOutput = (output as unknown as Record<string, unknown>).phase_age;
    if (typeof fromOutput === "string") return fromOutput;
    const nested = (fromOutput as Record<string, unknown>)?.phase;
    if (typeof nested === "string") return nested;

    // Fallback: compute from referentiel
    if (parcel.plantingYear != null) {
      const age = new Date().getFullYear() - parcel.plantingYear;
      try {
        const { detectPhaseAgeFromReferentiel } = require('./phase-age-detector');
        const ref = getLocalCropReference(parcel.cropType);
        if (ref) {
          return detectPhaseAgeFromReferentiel(age, parcel.system, ref);
        }
      } catch {
        // phase-age-detector not available, return null
      }
    }
    return null;
  }

  private extractCoefficientEtat(output: CalibrationResponse): number | null {
    const raw = (output as unknown as Record<string, unknown>).coefficient_etat_parcelle;
    return this.toNumber(raw);
  }

  private extractBaselineData(output: CalibrationResponse): Record<string, unknown> {
    return {
      percentiles: output.step3?.global_percentiles ?? null,
      phenology: output.step4 ?? null,
      zones: output.step7 ?? null,
    };
  }

  private extractDiagnosticData(output: CalibrationResponse): Record<string, unknown> | null {
    const diagnostic = (output as unknown as Record<string, unknown>).diagnostic_explicatif;
    if (this.isJsonObject(diagnostic)) return diagnostic;
    return null;
  }

  private extractScoresDetail(output: CalibrationResponse): Record<string, unknown> {
    return {
      health: output.step8 ?? null,
      confidence: output.confidence ?? null,
    };
  }

  private extractFarmOrganizationId(farms: unknown): string | null {
    if (Array.isArray(farms)) {
      const firstFarm = farms[0];
      if (
        this.isJsonObject(firstFarm) &&
        typeof firstFarm.organization_id === "string"
      ) {
        return firstFarm.organization_id;
      }
      return null;
    }

    if (this.isJsonObject(farms) && typeof farms.organization_id === "string") {
      return farms.organization_id;
    }

    return null;
  }

  private matchesOrganization(
    candidateOrganizationId: string | null,
    organizationId: string,
  ): boolean {
    return (
      typeof candidateOrganizationId === "string" &&
      candidateOrganizationId.trim().toLowerCase() ===
        organizationId.trim().toLowerCase()
    );
  }

  private parseBoundary(boundary: unknown): number[][] {
    if (!Array.isArray(boundary)) {
      return [];
    }

    return boundary.reduce<number[][]>((coordinates, point) => {
      if (
        Array.isArray(point) &&
        point.length >= 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number"
      ) {
        coordinates.push([point[0], point[1]]);
      }

      return coordinates;
    }, []);
  }

  private roundCoordinate(value: number, precision: number): number {
    return Number(value.toFixed(precision));
  }

  private isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private toJsonObject(value: unknown): JsonObject {
    return this.isJsonObject(value) ? value : {};
  }

  private buildDataQualityFlags(calibration: CalibrationRecord): string[] {
    const flags: string[] = [];
    const confidence = this.toNumber(calibration.confidence_score);
    if (confidence !== null && confidence < 50) flags.push('low_confidence');
    if (confidence !== null && confidence < 25) flags.push('insufficient_satellite_data');
    if (calibration.phase_age === 'juvenile') flags.push('juvenile_plantation');
    if (calibration.phase_age === 'senescence') flags.push('senescence_detected');
    if (calibration.mode_calibrage === 'lecture_pure') flags.push('observation_mode_only');
    if ((this.toNumber(calibration.anomaly_count) ?? 0) > 3) flags.push('high_anomaly_count');
    return flags;
  }

  /** Convert to integer (for INTEGER columns like confidence_score, health_score) */
  private toInteger(value: unknown): number | null {
    const num = this.toNumber(value);
    return num !== null ? Math.round(num) : null;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toHectares(
    area: number | null,
    areaUnit: string | null,
  ): number | null {
    const value = this.toNumber(area);
    if (value === null || value <= 0) {
      return null;
    }
    const unit = (areaUnit ?? "").toLowerCase();
    if (unit === "m2" || unit === "m²" || unit === "sqm" || unit === "square meters") {
      return value / 10_000;
    }
    return value;
  }

  async getIrrigationRecommendation(
    parcelId: string,
    organizationId: string,
  ): Promise<{
    kc: number;
    kc_min: number | null;
    kc_max: number | null;
    et0: number;
    etc: number;
    recommended_volume_m3_per_ha: number;
    crop_type: string;
    phenological_stage: string;
  }> {
    const supabase = this.databaseService.getAdminClient();

    // 1. Fetch parcel to get crop_type and phenological stage
    const { data: parcel, error: parcelError } = await supabase
      .from("parcels")
      .select(
        "id, crop_type, phenological_stage, farm_id, farms(organization_id)",
      )
      .eq("id", parcelId)
      .single();

    if (parcelError || !parcel) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const farmOrg = this.extractFarmOrganizationId(parcel.farms);
    if (!this.matchesOrganization(farmOrg, organizationId)) {
      throw new NotFoundException(`Parcel ${parcelId} not found`);
    }

    const cropType = parcel.crop_type ?? "olive";
    const stage = parcel.phenological_stage ?? "Fruit growth";

    // 2. Query crop_kc_coefficients
    const { data: kcRow, error: kcError } = await supabase
      .from("crop_kc_coefficients")
      .select("kc_value, kc_min, kc_max")
      .eq("crop_type_name", cropType)
      .eq("phenological_stage_name", stage)
      .maybeSingle();

    if (kcError) {
      this.logger.error(
        `Failed to fetch Kc for ${cropType}/${stage}: ${kcError.message}`,
      );
    }

    const kc = this.toNumber(kcRow?.kc_value) ?? 0.65;
    const kcMin = this.toNumber(kcRow?.kc_min);
    const kcMax = this.toNumber(kcRow?.kc_max);

    // 3. Fetch latest ET0 from weather_daily_data
    const { data: weatherRow, error: weatherError } = await supabase
      .from("weather_daily_data")
      .select("et0_fao_evapotranspiration")
      .eq("parcel_id", parcelId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (weatherError) {
      this.logger.error(
        `Failed to fetch weather for parcel ${parcelId}: ${weatherError.message}`,
      );
    }

    const et0 = this.toNumber(weatherRow?.et0_fao_evapotranspiration) ?? 5.0;

    // 4. Compute ETc and recommended volume
    const etc = kc * et0;
    // Convert mm/day to m³/ha/day (1 mm = 10 m³/ha)
    const recommendedVolume = Math.round(etc * 10 * 100) / 100;

    return {
      kc,
      kc_min: kcMin,
      kc_max: kcMax,
      et0,
      etc: Math.round(etc * 100) / 100,
      recommended_volume_m3_per_ha: recommendedVolume,
      crop_type: cropType,
      phenological_stage: stage,
    };
  }
}
