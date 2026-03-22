import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { AIReportsService } from "../ai-reports/ai-reports.service";
import { AIProvider, AgromindReportType } from "../ai-reports/interfaces";
import {
  AnnualPlanService,
  AnnualPlanWithInterventions,
  PlanInterventionRecord,
} from "../annual-plan/annual-plan.service";
import { DatabaseService } from "../database/database.service";
import { SatelliteCacheService } from "../satellite-indices/satellite-cache.service";
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

const CALIBRATION_LOOKBACK_DAYS = 730;
const NDVI_PERCENTILES = [10, 25, 50, 75, 90];
const MINIMUM_CONFIDENCE_FOR_ACTIVE = 0.25;

type ZoneClassification = "optimal" | "normal" | "stressed";
type ParcelAiPhase =
  | "disabled"
  | "calibrating"
  | "awaiting_validation"
  | "awaiting_nutrition_option"
  | "active"
  | "paused"
  | "calibration"
  | string;
type JsonObject = Record<string, unknown>;
type CalibrationMode = "full" | "partial" | "annual";
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
  maturity_phase: string;
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
  status: string;
  started_at: string | null;
  completed_at: string | null;
  baseline_ndvi: number | string | null;
  baseline_ndre: number | string | null;
  baseline_ndmi: number | string | null;
  confidence_score: number | string | null;
  zone_classification: ZoneClassification | null;
  phenology_stage: string | null;
  calibration_data: unknown;
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

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stateMachine: CalibrationStateMachine,
    private readonly nutritionOptionService: NutritionOptionService,
    private readonly annualPlanService: AnnualPlanService,
    private readonly satelliteCacheService: SatelliteCacheService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

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
    options?: { skipReadinessCheck?: boolean },
  ): Promise<CalibrationRecord> {
    const parcel = await this.getParcelContext(parcelId, organizationId);
    const previousPhase = parcel.aiPhase as
      | "disabled"
      | "pret_calibrage"
      | "active"
      | "awaiting_validation"
      | "awaiting_nutrition_option";

    if (parcel.aiPhase === "calibrating") {
      throw new BadRequestException(
        "Parcel calibration is already in progress",
      );
    }

    const allowedStartPhases = [
      "disabled",
      "pret_calibrage",
      "active",
      "awaiting_validation",
      "awaiting_nutrition_option",
    ];
    if (!allowedStartPhases.includes(parcel.aiPhase)) {
      throw new BadRequestException(
        `Calibration can only start from pret_calibrage, disabled, active, awaiting_validation, or awaiting_nutrition_option phase (current: ${parcel.aiPhase})`,
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

    await this.stateMachine.transitionPhase(
      parcelId,
      previousPhase,
      "calibrating",
      organizationId,
    );

    const { data: calibration, error: insertError } = await supabase
      .from("calibrations")
      .insert({
        parcel_id: parcelId,
        organization_id: organizationId,
        status: "in_progress",
        started_at: startedAt,
        mode_calibrage: dto.mode_calibrage ?? "full",
        calibration_version: "v2",
        calibration_data: {
          version: "v2",
          request: { ...dto, lookback_days: CALIBRATION_LOOKBACK_DAYS },
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
        { skipReadinessCheck: true },
      );
    }

    const parcel = await this.getParcelContext(parcelId, organizationId);
    const previousPhase = parcel.aiPhase as
      | "disabled"
      | "pret_calibrage"
      | "active"
      | "awaiting_validation"
      | "awaiting_nutrition_option";

    if (parcel.aiPhase === "calibrating") {
      throw new BadRequestException(
        "Parcel calibration is already in progress",
      );
    }

    const allowedStartPhases = [
      "disabled",
      "pret_calibrage",
      "active",
      "awaiting_validation",
      "awaiting_nutrition_option",
    ];

    if (!allowedStartPhases.includes(parcel.aiPhase)) {
      throw new BadRequestException(
        `Partial recalibration can only start from pret_calibrage, disabled, active, awaiting_validation, or awaiting_nutrition_option phase (current: ${parcel.aiPhase})`,
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

    await this.stateMachine.transitionPhase(
      parcelId,
      previousPhase,
      "calibrating",
      organizationId,
    );

    const { data: calibration, error: insertError } = await supabase
      .from("calibrations")
      .insert({
        parcel_id: parcelId,
        organization_id: organizationId,
        status: "in_progress",
        started_at: startedAt,
        mode_calibrage: "partial",
        recalibration_motif: motif,
        previous_baseline: previousBaseline,
        calibration_version: "v2",
        calibration_data: {
          version: "v2",
          request: { ...dto, mode_calibrage: "partial", lookback_days: CALIBRATION_LOOKBACK_DAYS },
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
    ).catch((error) => {
      this.logger.error(
        `Background partial recalibration failed for calibration ${calibration.id}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    });

    return calibration as CalibrationRecord;
  }

  private isRecoverableCalibrationPhase(value: string): value is AiPhase {
    return (
      value === "disabled" ||
      value === "pret_calibrage" ||
      value === "active" ||
      value === "awaiting_validation" ||
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
      .select("calibration_data")
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `Could not load calibration ${calibrationId} for phase recovery: ${error.message}`,
      );
    }

    const persistedCalibrationData = this.toJsonObject(row?.calibration_data);
    const recovery = this.toJsonObject(persistedCalibrationData.recovery);
    const rawPrevious =
      typeof recovery.previous_ai_phase === "string"
        ? recovery.previous_ai_phase
        : null;
    const targetPhase: AiPhase =
      rawPrevious && this.isRecoverableCalibrationPhase(rawPrevious)
        ? rawPrevious
        : "disabled";

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
  ): Promise<void> {
    try {
      await Promise.race([
        this.executeCalibration(
          calibrationId,
          parcelId,
          organizationId,
          parcel,
          dto,
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
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const totalSteps = 5;
    const completedAt = new Date().toISOString();
    const emitProgress = (step: number, stepKey: string, message: string) =>
      this.emitCalibrationProgress(organizationId, parcelId, calibrationId, step, totalSteps, stepKey, message);

    emitProgress(1, "data_collection", "Collecte des données satellite, météo et analyses...");

    const [satelliteImages, initialWeatherRows, analyses, harvestRecords, referenceData] = await Promise.all([
      this.fetchSatelliteImages(parcelId, organizationId),
      this.fetchWeatherRows(parcel),
      this.fetchAnalyses(parcelId),
      this.fetchHarvestRecords(parcelId),
      this.fetchCropReferenceData(parcel.cropType),
    ]);

    let weatherRows = initialWeatherRows;

    if (weatherRows.length === 0) {
      emitProgress(1, "weather_sync", "Synchronisation des données météo...");
      await this.syncWeatherData(parcel, organizationId);
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
      mode_calibrage: "partial" as CalibrationMode,
      recalibration_motif: motif,
      baseline_calibration: previousBaseline,
      updated_blocks: updatedBlocks,
    };

    emitProgress(2, "calibration_engine", "Exécution du moteur de calibration V2...");

    const v2Output = await this.postCalibrationApi<CalibrationResponse>(
      "/api/calibration/v2/run",
      {
        calibration_input: calibrationInput,
        satellite_images: satelliteImages,
        weather_rows: weatherRows,
      },
      organizationId,
    );

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
      .select("calibration_data")
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    const existingPartialData = this.toJsonObject(
      existingPartialSnapshot?.calibration_data,
    );

    const zoneClassification = this.deriveZoneClassification(v2Output);
    const confidenceScore = this.toNumber(v2Output.confidence?.normalized_score);
    const observationMode = this.buildObservationModeContext(confidenceScore);
    const calibrationData = {
      ...existingPartialData,
      version: "v2",
      request: { ...dto, mode_calibrage: "partial", lookback_days: CALIBRATION_LOOKBACK_DAYS },
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
          status: "completed",
          completed_at: completedAt,
          mode_calibrage: "partial",
          recalibration_motif: motif,
          previous_baseline: previousBaseline,
          baseline_ndvi: this.extractIndexP50(v2Output, "NDVI"),
          baseline_ndre: this.extractIndexP50(v2Output, "NDRE"),
          baseline_ndmi: this.extractIndexP50(v2Output, "NDMI"),
          confidence_score: confidenceScore,
          zone_classification: zoneClassification,
          phenology_stage: this.extractPhenologyStage(v2Output),
          health_score: this.toNumber(v2Output.step8?.health_score?.total),
          yield_potential_min: this.toNumber(
            v2Output.step6?.yield_potential?.minimum,
          ),
          yield_potential_max: this.toNumber(
            v2Output.step6?.yield_potential?.maximum,
          ),
          data_completeness_score: this.toNumber(
            v2Output.confidence?.total_score,
          ),
          maturity_phase: v2Output.maturity_phase,
          anomaly_count: Array.isArray(v2Output.step5?.anomalies)
            ? v2Output.step5?.anomalies.length
            : 0,
          calibration_version: "v2",
          calibration_data: calibrationData,
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
      ),
      this.runCalibrationAI(
        calibrationId,
        parcelId,
        organizationId,
        v2Output,
        secondaryLanguage,
      ),
    ]);

    const bilingualUpdate: Record<string, unknown> = {};
    if (primaryReport || secondaryReport) {
      bilingualUpdate.calibration_data = {
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
        "awaiting_validation",
        organizationId,
      );
      await this.stateMachine.transitionPhase(
        parcelId,
        "awaiting_validation",
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
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const totalSteps = 7;
    const completedAt = new Date().toISOString();
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
      this.fetchSatelliteImages(parcelId, organizationId),
      this.fetchWeatherRows(parcel),
      this.fetchAnalyses(parcelId),
      this.fetchHarvestRecords(parcelId),
      this.fetchCropReferenceData(parcel.cropType),
    ]);

    let satelliteImages = initialSatelliteImages;

    if (satelliteImages.length === 0) {
      emitProgress(2, "satellite_sync", "Synchronisation des images satellite...");
      this.logger.log(
        `No satellite data for parcel ${parcelId}, auto-syncing from satellite service`,
      );

      const syncResult =
        await this.satelliteCacheService.syncParcelSatelliteData(
          parcelId,
          organizationId,
          undefined,
          {
            startDate: this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS),
            endDate: new Date().toISOString().split("T")[0],
            indices: ["NDVI", "NDRE", "NDMI", "EVI", "NIRv"],
          },
        );

      this.logger.log(
        `Auto-sync completed for parcel ${parcelId}: ${syncResult.totalPoints} total points`,
      );

      satelliteImages = await this.fetchSatelliteImages(
        parcelId,
        organizationId,
      );
    }

    let weatherRows = initialWeatherRows;

    if (weatherRows.length === 0) {
      emitProgress(2, "weather_sync", "Synchronisation des données météo...");
      await this.syncWeatherData(parcel, organizationId);
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

      const sinceDate = this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS);
      const today = new Date().toISOString().split("T")[0];

      const rasterResult = await this.postCalibrationApi<{
        pixels: Array<{ lon: number; lat: number; value: number }>;
        count: number;
      }>(
        "/api/calibration/v2/extract-raster",
        {
          geometry: wgs84Boundary,
          start_date: sinceDate,
          end_date: today,
          scale: 10,
        },
        organizationId,
        1,
      );

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
      const firstRow = weatherRows[0];
      const latitude = this.toNumber(firstRow?.latitude) ?? 0;
      const longitude = this.toNumber(firstRow?.longitude) ?? 0;

      await this.postCalibrationApi<{
        crop_type: string;
        updated_rows: number;
      }>(
        "/api/calibration/v2/precompute-gdd",
        {
          latitude,
          longitude,
          crop_type: parcel.cropType,
          rows: weatherRows,
        },
        organizationId,
      );
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

    const v2Output = await this.postCalibrationApi<CalibrationResponse>(
      "/api/calibration/v2/run",
      {
        calibration_input: calibrationInput,
        satellite_images: satelliteImages,
        weather_rows: weatherRows,
        ndvi_raster_pixels: ndviRasterPixels,
      },
      organizationId,
    );

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

    const mode = this.normalizeCalibrationMode(dto.mode_calibrage);
    const autoActivate = this.shouldAutoActivateAfterCompletion(
      parcel.aiPhase,
      mode,
    );
    const { data: existingCalibrationSnapshot } = await supabase
      .from("calibrations")
      .select("calibration_data")
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    const existingCalibrationData = this.toJsonObject(
      existingCalibrationSnapshot?.calibration_data,
    );
    const zoneClassification = this.deriveZoneClassification(v2Output);
    const confidenceScore = this.toNumber(v2Output.confidence?.normalized_score);
    const observationMode = this.buildObservationModeContext(confidenceScore);
    const calibrationData = {
      ...existingCalibrationData,
      version: "v2",
      request: {
        ...this.toJsonObject(existingCalibrationData.request),
        ...dto,
        lookback_days: CALIBRATION_LOOKBACK_DAYS,
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
          status: "completed",
          completed_at: completedAt,
          baseline_ndvi: this.extractIndexP50(v2Output, "NDVI"),
          baseline_ndre: this.extractIndexP50(v2Output, "NDRE"),
          baseline_ndmi: this.extractIndexP50(v2Output, "NDMI"),
          confidence_score: confidenceScore,
          zone_classification: zoneClassification,
          phenology_stage: this.extractPhenologyStage(v2Output),
          health_score: this.toNumber(v2Output.step8?.health_score?.total),
          yield_potential_min: this.toNumber(
            v2Output.step6?.yield_potential?.minimum,
          ),
          yield_potential_max: this.toNumber(
            v2Output.step6?.yield_potential?.maximum,
          ),
          data_completeness_score: this.toNumber(
            v2Output.confidence?.total_score,
          ),
          maturity_phase: v2Output.maturity_phase,
          anomaly_count: Array.isArray(v2Output.step5?.anomalies)
            ? v2Output.step5?.anomalies.length
            : 0,
          calibration_version: "v2",
          calibration_data: calibrationData,
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
      ),
      this.runCalibrationAI(
        calibrationId,
        parcelId,
        organizationId,
        v2Output,
        secondaryLanguage,
      ),
    ]);

    const bilingualUpdate: Record<string, unknown> = {};
    if (primaryReport || secondaryReport) {
      bilingualUpdate.calibration_data = {
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
        "awaiting_validation",
        organizationId,
      );

      if (autoActivate) {
        await this.stateMachine.transitionPhase(
          parcelId,
          "awaiting_validation",
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
    v2Output: CalibrationResponse,
    language: string = "fr",
  ): Promise<Record<string, unknown> | null> {
    try {
      this.logger.log(
        `Starting AI calibration analysis (${language}) for calibration ${calibrationId} parcel ${parcelId}`,
      );

      const result = await this.aiReportsService.generateReport(
        organizationId,
        "system",
        {
          parcel_id: parcelId,
          provider: AIProvider.GEMINI,
          model: "gemini-2.5-flash",
          reportType: AgromindReportType.CALIBRATION,
          language,
          data_start_date: this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS),
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
      maturity_phase: string | null;
      error_message: string | null;
      mode_calibrage: CalibrationMode;
      recalibration_motif: string | null;
      created_at: string;
      completed_at: string | null;
    }>
  > {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select(
        "id, status, health_score, confidence_score, maturity_phase, error_message, mode_calibrage, recalibration_motif, calibration_data, created_at, completed_at",
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
      maturity_phase: string | null;
      error_message: string | null;
      mode_calibrage: CalibrationMode;
      recalibration_motif: string | null;
      created_at: string;
      completed_at: string | null;
    }>
  > {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select(
        "id, status, health_score, confidence_score, maturity_phase, error_message, mode_calibrage, recalibration_motif, calibration_data, created_at, completed_at",
      )
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .in("mode_calibrage", ["F2", "partial"])
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

    return {
      calibration,
      report: this.toJsonObject(calibration.calibration_data),
    };
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
    if (parcel.aiPhase !== "awaiting_validation") {
      throw new BadRequestException(
        `Calibration can only be validated in awaiting_validation phase (current: ${parcel.aiPhase})`,
      );
    }

    if (existingCalibration.status !== "completed") {
      throw new BadRequestException(
        "Only completed calibrations can be validated",
      );
    }

    const confidenceScoreAtValidation = this.toNumber(
      existingCalibration.confidence_score,
    );
    const validatedAt = new Date().toISOString();
    const calibrationData = {
      ...this.toJsonObject(existingCalibration.calibration_data),
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
      status: "completed",
      calibration_data: calibrationData,
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

      await this.stateMachine.transitionPhase(
        existingCalibration.parcel_id,
        "awaiting_validation",
        "active",
        organizationId,
      );

      await supabase
        .from("parcels")
        .update({ ai_enabled: true, ai_observation_only: true })
        .eq("id", existingCalibration.parcel_id)
        .eq("organization_id", organizationId);

      const observationReason = `Confidence score (${Math.round(confidenceScoreAtValidation * 100)}%) below minimum threshold (${Math.round(MINIMUM_CONFIDENCE_FOR_ACTIVE * 100)}%) for active recommendations`;
      const currentData = this.toJsonObject(updatedCalibration.calibration_data);
      const prevValidation = this.toJsonObject(currentData.validation);

      await supabase
        .from("calibrations")
        .update({
          calibration_data: {
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

    await this.stateMachine.transitionPhase(
      existingCalibration.parcel_id,
      "awaiting_validation",
      "awaiting_nutrition_option",
      organizationId,
    );

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
    if (parcel.aiPhase !== "awaiting_nutrition_option") {
      throw new BadRequestException(
        `Nutrition option can only be confirmed in awaiting_nutrition_option phase (current: ${parcel.aiPhase})`,
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

    await this.stateMachine.transitionPhase(
      calibration.parcel_id,
      "awaiting_nutrition_option",
      "active",
      organizationId,
    );

    setImmediate(() => {
      this.generateAnnualPlan(
        calibrationId,
        calibration.parcel_id,
        organizationId,
      ).catch((err) =>
        this.logger.warn(
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
    this.logger.log(
      `Generating annual plan for parcel ${parcelId} after nutrition option confirmation`,
    );

    const annualPlan = await this.annualPlanService.ensurePlan(
      parcelId,
      organizationId,
    );

    try {
      await this.aiReportsService.generateReport(organizationId, "system", {
        parcel_id: parcelId,
        provider: AIProvider.GEMINI,
        model: "gemini-2.5-flash",
        reportType: AgromindReportType.ANNUAL_PLAN,
        data_start_date: this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS),
        data_end_date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      this.logger.warn(
        `Narrative annual plan report generation failed for parcel ${parcelId}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }

    this.logger.log(`Annual plan generated for parcel ${parcelId}`);

    await this.generateTasksFromAnnualPlan(annualPlan, parcelId, organizationId);
  }

  private normalizeCalibrationMode(mode?: string): CalibrationMode {
    if (mode === "partial" || mode === "annual") {
      return mode;
    }

    return "full";
  }

  private shouldAutoActivateAfterCompletion(
    previousPhase: ParcelAiPhase,
    mode: CalibrationMode,
  ): boolean {
    if (mode === "annual" || mode === "partial") {
      return true;
    }

    return previousPhase === "active";
  }

  private buildObservationModeContext(confidenceScore: number | null): {
    observationOnly: boolean;
    observationReason: string | null;
  } {
    if (
      confidenceScore === null ||
      confidenceScore >= MINIMUM_CONFIDENCE_FOR_ACTIVE
    ) {
      return {
        observationOnly: false,
        observationReason: null,
      };
    }

    return {
      observationOnly: true,
      observationReason: `Confidence score (${Math.round(confidenceScore * 100)}%) below minimum threshold (${Math.round(MINIMUM_CONFIDENCE_FOR_ACTIVE * 100)}%) for active recommendations`,
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
      this.logger.warn(
        `Post-activation annual plan generation failed for parcel ${parcelId}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  private async generateTasksFromAnnualPlan(
    annualPlan: AnnualPlanWithInterventions,
    parcelId: string,
    organizationId: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    if (annualPlan.interventions.length === 0) {
      this.logger.log(
        `Annual plan ${annualPlan.id} has no interventions to generate tasks for`,
      );
      return;
    }

    const { data: parcel } = await supabase
      .from("parcels")
      .select("farm_id")
      .eq("id", parcelId)
      .single();

    if (!parcel?.farm_id) {
      return;
    }

    const { data: existingTasks, error: existingTasksError } = await supabase
      .from("tasks")
      .select("id, metadata")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId);

    if (existingTasksError) {
      this.logger.warn(
        `Failed to load existing annual plan tasks for parcel ${parcelId}: ${existingTasksError.message}`,
      );
      return;
    }

    const existingInterventionIds = new Set(
      ((existingTasks ?? []) as Array<{ metadata?: unknown }>)
        .map((task) => this.toJsonObject(task.metadata).annual_plan_intervention_id)
        .filter((value): value is string => typeof value === "string"),
    );

    const taskRows = annualPlan.interventions
      .filter((intervention) => !existingInterventionIds.has(intervention.id))
      .map((intervention) => {
        const title = this.formatAnnualPlanTaskTitle(intervention);

        return {
          farm_id: parcel.farm_id,
          parcel_id: parcelId,
          organization_id: organizationId,
          title,
          description: this.formatAnnualPlanTaskDescription(intervention),
          task_type: this.mapAnnualPlanInterventionToTaskType(intervention),
          priority: this.mapAnnualPlanInterventionPriority(intervention),
          status: "pending",
          due_date: this.buildAnnualPlanTaskDueDate(
            annualPlan.year,
            intervention.month,
            intervention.week,
          ),
          metadata: {
            source: "annual_plan",
            annual_plan_id: annualPlan.id,
            annual_plan_intervention_id: intervention.id,
            plan_year: annualPlan.year,
            month: intervention.month,
            week: intervention.week,
            intervention_type: intervention.intervention_type,
            product: intervention.product,
            dose: intervention.dose,
            unit: intervention.unit,
          },
        };
      })
      .filter((row) => row.title.length > 0);

    if (taskRows.length === 0) {
      return;
    }

    const { error: insertError } = await supabase
      .from("tasks")
      .insert(taskRows);

    if (insertError) {
      this.logger.warn(
        `Failed to create tasks from annual plan for parcel ${parcelId}: ${insertError.message}`,
      );
      return;
    }

    this.logger.log(
      `Created ${taskRows.length} tasks from annual plan ${annualPlan.id} for parcel ${parcelId}`,
    );
  }

  private formatAnnualPlanTaskTitle(intervention: PlanInterventionRecord): string {
    const interventionLabel = intervention.intervention_type
      .split("+")
      .map((part) => part.replace(/_/g, " ").trim())
      .filter((part) => part.length > 0)
      .join(" / ");

    return interventionLabel.length > 0
      ? interventionLabel
      : `Intervention mois ${intervention.month}`;
  }

  private formatAnnualPlanTaskDescription(
    intervention: PlanInterventionRecord,
  ): string | null {
    const details = [
      intervention.description,
      intervention.product ? `Produit: ${intervention.product}` : null,
      intervention.dose ? `Dose: ${intervention.dose}` : null,
      intervention.unit ? `Unite: ${intervention.unit}` : null,
      intervention.notes ? `Reference: ${intervention.notes}` : null,
    ].filter((value): value is string => typeof value === "string" && value.length > 0);

    return details.length > 0 ? details.join(" | ") : null;
  }

  private mapAnnualPlanInterventionToTaskType(
    intervention: PlanInterventionRecord,
  ): string {
    const normalized = `${intervention.intervention_type} ${intervention.description}`.toLowerCase();

    if (normalized.includes("irrig")) {
      return "irrigation";
    }
    if (
      normalized.includes("ferti") ||
      normalized.includes("nutrition") ||
      normalized.includes("amend")
    ) {
      return "fertilization";
    }
    if (normalized.includes("taille") || normalized.includes("prun")) {
      return "pruning";
    }
    if (
      normalized.includes("phyto") ||
      normalized.includes("ravage") ||
      normalized.includes("pest") ||
      normalized.includes("maladie")
    ) {
      return "pest_control";
    }
    if (
      normalized.includes("sol") ||
      normalized.includes("labour") ||
      normalized.includes("preparation")
    ) {
      return "soil_preparation";
    }
    if (normalized.includes("recolte") || normalized.includes("harvest")) {
      return "harvesting";
    }

    return "maintenance";
  }

  private mapAnnualPlanInterventionPriority(
    intervention: PlanInterventionRecord,
  ): "low" | "medium" | "high" | "urgent" {
    const normalized = `${intervention.intervention_type} ${intervention.description}`.toLowerCase();

    if (
      normalized.includes("stress") ||
      normalized.includes("urgent") ||
      normalized.includes("maladie") ||
      normalized.includes("irrig")
    ) {
      return "high";
    }

    return "medium";
  }

  private buildAnnualPlanTaskDueDate(
    year: number,
    month: number,
    week: number | null,
  ): string | null {
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return null;
    }

    const day = week && week > 0 ? Math.min(28, week * 7) : 1;
    return new Date(Date.UTC(year, month - 1, day)).toISOString().split("T")[0];
  }

  async getPercentiles(
    parcelId: string,
    organizationId: string,
  ): Promise<PercentilesResponse> {
    const ndviValues = await this.fetchNdviValues(parcelId, organizationId);

    if (!ndviValues.length) {
      throw new NotFoundException("No NDVI readings found for parcel");
    }

    return this.postCalibrationApi<PercentilesResponse>(
      "/api/calibration/percentiles",
      {
        values: ndviValues,
        percentiles: NDVI_PERCENTILES,
      },
      organizationId,
    );
  }

  async getZones(
    parcelId: string,
    organizationId: string,
  ): Promise<ZonesResponse> {
    const parcel = await this.getParcelContext(parcelId, organizationId);
    const [ndviValues, thresholds] = await Promise.all([
      this.fetchNdviValues(parcelId, organizationId),
      this.fetchNdviThresholds(parcel.cropType, parcel.system),
    ]);

    if (!ndviValues.length) {
      throw new NotFoundException("No NDVI readings found for parcel");
    }

    return this.postCalibrationApi<ZonesResponse>(
      "/api/calibration/classify-zones",
      {
        ndvi_values: ndviValues,
        thresholds,
      },
      organizationId,
    );
  }

  private async getParcelContext(
    parcelId: string,
    organizationId: string,
  ): Promise<ParcelContext> {
    const supabase = this.databaseService.getAdminClient();
    const { data: parcel, error } = await supabase
      .from("parcels")
      .select(
        "id, crop_type, planting_system, planting_year, variety, ai_phase, boundary, organization_id, plant_count, irrigation_type, water_source, irrigation_frequency, water_quantity_per_session, langue, farms(organization_id)",
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
        typeof parcel.ai_phase === "string" ? parcel.ai_phase : "disabled",
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
  ): Promise<number[]> {
    const supabase = this.databaseService.getAdminClient();
    const sinceDate = this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS);
    const { data, error } = await supabase
      .from("satellite_indices_data")
      .select("mean_value")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .eq("index_name", "NDVI")
      .gte("date", sinceDate)
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

  private async fetchSatelliteImages(
    parcelId: string,
    organizationId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const supabase = this.databaseService.getAdminClient();
    const sinceDate = this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS);
    const { data, error } = await supabase
      .from("satellite_indices_data")
      .select("date, index_name, mean_value, cloud_coverage_percentage")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .gte("date", sinceDate)
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
    const sinceDate = this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS);

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
  ): Promise<void> {
    if (!parcel.boundary.length) {
      return;
    }

    const wgs84Boundary = WeatherProvider.ensureWGS84(parcel.boundary);
    const { latitude, longitude } =
      WeatherProvider.calculateCentroid(wgs84Boundary);
    const roundedLatitude = this.roundCoordinate(latitude, 2);
    const roundedLongitude = this.roundCoordinate(longitude, 2);
    const startDate = this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS);
    const endDate = new Date().toISOString().split("T")[0];

    const url = new URL(
      `${this.getSatelliteServiceUrl()}/api/weather/historical`,
    );
    url.searchParams.set("latitude", String(roundedLatitude));
    url.searchParams.set("longitude", String(roundedLongitude));
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "x-organization-id": organizationId },
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      this.logger.warn(
        `Weather auto-sync failed for parcel ${parcel.id}: HTTP ${response.status}`,
      );
      return;
    }

    const body = (await response.json()) as {
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
    const calibrationData = this.toJsonObject(calibration.calibration_data);
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
    maturity_phase: string | null;
    error_message: string | null;
    mode_calibrage: CalibrationMode;
    recalibration_motif: string | null;
    created_at: string;
    completed_at: string | null;
  }> {
    return rows.map((row) => {
      const calibrationData = this.toJsonObject(row.calibration_data);
      const recalibrationData = this.toJsonObject(calibrationData.recalibration);
      const requestData = this.toJsonObject(calibrationData.request);

      const modeFromColumn =
        typeof row.mode_calibrage === "string" ? row.mode_calibrage : null;
      const modeFromRequest =
        typeof requestData.mode_calibrage === "string"
          ? requestData.mode_calibrage
          : null;
      const CALIBRATION_MODE_MAP: Record<string, CalibrationMode> = {
        F1: "full",
        F2: "partial",
        F3: "annual",
        full: "full",
        partial: "partial",
        annual: "annual",
      };
      const mode: CalibrationMode =
        CALIBRATION_MODE_MAP[modeFromColumn ?? ""] ??
        CALIBRATION_MODE_MAP[modeFromRequest ?? ""] ??
        "full";

      const motifFromColumn =
        typeof row.recalibration_motif === "string"
          ? row.recalibration_motif
          : null;
      const motifFromData =
        typeof calibrationData.recalibration_motif === "string"
          ? calibrationData.recalibration_motif
          : typeof recalibrationData.motif === "string"
            ? recalibrationData.motif
            : null;

      return {
        id: row.id as string,
        status: row.status as string,
        health_score: this.toNumber(row.health_score),
        confidence_score: this.toNumber(row.confidence_score),
        maturity_phase:
          typeof row.maturity_phase === "string" ? row.maturity_phase : null,
        error_message:
          typeof row.error_message === "string" ? row.error_message : null,
        mode_calibrage: mode,
        recalibration_motif: motifFromColumn ?? motifFromData,
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

  private async postCalibrationApi<T>(
    path: string,
    payload: unknown,
    organizationId: string,
    maxRetries: number = 3,
  ): Promise<T> {
    const url = `${this.getSatelliteServiceUrl()}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": organizationId,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5 * 60 * 1000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const message =
            errorText ||
            `Calibration service request failed with status ${response.status}`;

          if (response.status >= 500 && attempt < maxRetries) {
            lastError = new BadGatewayException(message);
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            this.logger.warn(
              `Calibration API ${path} returned ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw response.status >= 500
            ? new BadGatewayException(message)
            : new BadRequestException(message);
        }

        const responseBody: T = await response.json();
        return responseBody;
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }

        const isRetryable =
          error instanceof BadGatewayException ||
          (error instanceof Error &&
            (error.name === "AbortError" ||
              error.name === "TimeoutError" ||
              error.message.includes("fetch failed")));

        if (isRetryable && attempt < maxRetries) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          this.logger.warn(
            `Calibration API ${path} failed (${lastError.message}), retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (error instanceof BadGatewayException) {
          throw error;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unknown calibration service error";
        this.logger.error(`Calibration API call failed for ${url}: ${message}`);
        throw new BadGatewayException(
          `Calibration service unavailable: ${message}`,
        );
      }
    }

    throw (
      lastError ??
      new BadGatewayException("Calibration service unavailable after retries")
    );
  }

  private getSatelliteServiceUrl(): string {
    const baseUrl =
      process.env.SATELLITE_SERVICE_URL || "http://localhost:8001";
    return baseUrl.replace(/\/+$/, "");
  }

  private getLookbackDate(days: number): string {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - days);
    return lookbackDate.toISOString().split("T")[0];
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
