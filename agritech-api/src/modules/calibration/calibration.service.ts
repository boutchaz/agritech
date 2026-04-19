import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
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
import {
  CalibrationReviewAdapter,
} from "./calibration-review.adapter";
import type {
  CalibrationReviewView,
  CalibrationSnapshotInput,
} from "./dto/calibration-review.dto";
import {
  CALIBRATION_HISTORY_DEFAULT_LIMIT,
  CALIBRATION_HISTORY_MAX_LIMIT,
} from "./calibration.constants";
import { CalibrationDraftService } from "./calibration-draft.service";
import {
  CalibrationDataService,
  getCalibrationLookbackDate,
  resolveCalibratingRecoveryPhase,
  resolveVarietyForCalibration,
  CALIBRATION_SATELLITE_INDICES,
  MINIMUM_CONFIDENCE_FOR_ACTIVE,
  NDVI_PERCENTILES,
} from "./calibration-data.service";
import { checkVegetation } from "./vegetation-check";
import type {
  ParcelContext,
  ParcelAiPhase,
  CalibrationRecord,
  CalibrationResponse,
  NdviThresholds,
  ZoneClassification,
  WeatherDailyRow,
  JsonObject,
  CalibrationType,
  RecalibrationMotif,
  PercentilesResponse,
  ZonesResponse,
  NutritionOptionConfirmation,
} from "./calibration-data.service";

// Re-export types for external consumers that import from calibration.service
export type {
  CalibrationRecord,
  NutritionOptionConfirmation,
  PercentilesResponse,
  ZonesResponse,
} from "./calibration-data.service";

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
    private readonly draftService: CalibrationDraftService,
    private readonly dataService: CalibrationDataService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // WIZARD DRAFT PERSISTENCE (delegated to CalibrationDraftService)
  // ═══════════════════════════════════════════════════════════════

  async getDraft(parcelId: string, organizationId: string, userId: string) {
    return this.draftService.getDraft(parcelId, organizationId, userId);
  }

  async saveDraft(
    parcelId: string,
    organizationId: string,
    userId: string,
    dto: { current_step: number; form_data: Record<string, unknown> },
  ) {
    return this.draftService.saveDraft(parcelId, organizationId, userId, dto);
  }

  async deleteDraft(parcelId: string, organizationId: string, userId: string) {
    return this.draftService.deleteDraft(parcelId, organizationId, userId);
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
    const percent = Math.round((step / totalSteps) * 100);

    // Persist so page reload / socket gap still shows current state.
    // Fire-and-forget — socket event is authoritative while connected.
    void this.databaseService.getAdminClient()
      .from("calibrations")
      .update({
        progress_step: step,
        progress_total_steps: totalSteps,
        progress_step_key: stepKey,
        progress_message: message,
        progress_percent: percent,
        progress_updated_at: new Date().toISOString(),
      })
      .eq("id", calibrationId)
      .then(({ error }) => {
        if (error) {
          this.logger.warn(
            `Failed to persist calibration progress for ${calibrationId}: ${error.message}`,
          );
        }
      });

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
        percent,
      },
    );
  }

  /**
   * Clears stuck `calibrating` state: marks all `in_progress` calibration rows failed
   * and moves the parcel back to the phase captured at last start (or `ready_calibration`).
   */
  private async recoverFromStuckCalibratingIfNeeded(
    parcelId: string,
    organizationId: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const { data: stuckRows, error: listError } = await supabase
      .from("calibrations")
      .select("profile_snapshot, started_at")
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false });

    if (listError) {
      this.logger.warn(
        `[recoverFromStuckCalibratingIfNeeded] list in_progress failed: ${listError.message}`,
      );
    }

    const stuckList = stuckRows ?? [];
    const targetPhase = resolveCalibratingRecoveryPhase(
      stuckList[0]?.profile_snapshot,
    );

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("calibrations")
      .update({
        status: "failed",
        completed_at: nowIso,
        updated_at: nowIso,
        error_message:
          "Abandoned: superseded by a new calibration start (stuck or duplicate run)",
      })
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .eq("status", "in_progress");

    if (updateError) {
      this.logger.warn(
        `[recoverFromStuckCalibratingIfNeeded] expire in_progress failed: ${updateError.message}`,
      );
    }

    try {
      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrating",
        targetPhase,
        organizationId,
      );
    } catch (err) {
      const msg = err instanceof BadRequestException ? err.message : "";
      if (msg.includes('not in "calibrating"')) {
        this.logger.warn(
          `[recoverFromStuckCalibratingIfNeeded] parcel ${parcelId}: phase already left calibrating (concurrent update)`,
        );
        return;
      }
      throw err;
    }

    this.logger.warn(
      `[recoverFromStuckCalibratingIfNeeded] parcel ${parcelId}: calibrating -> ${targetPhase}; ${stuckList.length} stale run(s) marked failed`,
    );
  }

  async startCalibration(
    parcelId: string,
    organizationId: string,
    dto: StartCalibrationDto,
    options?: { skipReadinessCheck?: boolean; authToken?: string },
  ): Promise<CalibrationRecord> {
    let parcel = await this.dataService.getParcelContext(parcelId, organizationId);

    if (parcel.aiPhase === "calibrating") {
      await this.recoverFromStuckCalibratingIfNeeded(parcelId, organizationId);
      parcel = await this.dataService.getParcelContext(parcelId, organizationId);
    }

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

    // Phase 0.5: vegetation pre-check using historical summer NDVI
    const summerNdvi = await this.dataService.fetchSummerNdvi(parcelId, organizationId);
    const vegetationResult = checkVegetation(parcel.plantingYear, summerNdvi);

    if (!vegetationResult.continueCalibration) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: "Végétation insuffisante détectée",
        error: "Unprocessable Entity",
        vegetation_status: vegetationResult.status,
        user_message: {
          title: "Végétation insuffisante détectée",
          body: "L'analyse satellitaire de votre parcelle sur les 3 dernières saisons estivales indique l'absence de végétation ligneuse établie. Une parcelle sans arbres adultes ne peut pas être calibrée. Vérifiez que : (1) votre parcelle est correctement délimitée (2) vos arbres sont plantés et établis depuis au moins 4 ans. Si votre plantation est récente (moins de 4 ans), renseignez l'âge réel de vos arbres et relancez.",
          action: "correct_parcel",
        },
        ndvi_stats: vegetationResult.ndviStats,
      });
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
          request: { ...dto, lookback_start_date: getCalibrationLookbackDate(parcel.plantingYear, parcel.cropType, parcel.system) },
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
          ...(vegetationResult.status === "ZONE_GRISE" && {
            vegetation_check_status: "ZONE_GRISE",
          }),
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

    let parcel = await this.dataService.getParcelContext(parcelId, organizationId);

    if (parcel.aiPhase === "calibrating") {
      await this.recoverFromStuckCalibratingIfNeeded(parcelId, organizationId);
      parcel = await this.dataService.getParcelContext(parcelId, organizationId);
    }

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

    const baselineCalibration = await this.dataService.getLatestCompletedCalibration(
      parcelId,
      organizationId,
    );

    if (!baselineCalibration) {
      throw new BadRequestException(
        "A completed baseline calibration is required before partial recalibration",
      );
    }

    const affectedBlocks = this.dataService.getAffectedBlocksForMotif(motif);
    const updatedBlocks = await this.dataService.buildUpdatedBlocksForMotif(
      motif,
      parcelId,
      parcel,
      dto,
    );
    const previousBaseline = this.dataService.extractPreviousBaseline(baselineCalibration);

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
          request: { ...dto, lookback_start_date: getCalibrationLookbackDate(parcel.plantingYear, parcel.cropType, parcel.system) },
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

    const persistedCalibrationData = this.dataService.toJsonObject(row?.profile_snapshot);
    const recovery = this.dataService.toJsonObject(persistedCalibrationData.recovery);
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
    const calibrationDataStart = getCalibrationLookbackDate(parcel.plantingYear, parcel.cropType, parcel.system);
    const emitProgress = (step: number, stepKey: string, message: string) =>
      this.emitCalibrationProgress(organizationId, parcelId, calibrationId, step, totalSteps, stepKey, message);

    emitProgress(1, "data_collection", "Collecte des données satellite, météo et analyses...");

    const [satelliteImages, initialWeatherRows, analyses, harvestRecords, referenceData] = await Promise.all([
      this.dataService.fetchSatelliteImages(parcelId, organizationId, calibrationDataStart),
      this.dataService.fetchWeatherRows(parcel, calibrationDataStart),
      this.dataService.fetchAnalyses(parcelId),
      this.dataService.fetchHarvestRecords(parcelId),
      this.dataService.fetchCropReferenceData(parcel.cropType),
    ]);

    let weatherRows = initialWeatherRows;

    if (weatherRows.length === 0) {
      emitProgress(1, "weather_sync", "Synchronisation des données météo...");
      await this.dataService.syncWeatherData(parcel, organizationId, authToken, calibrationDataStart);
      weatherRows = await this.dataService.fetchWeatherRows(parcel, calibrationDataStart);
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
      area_hectares: this.dataService.toHectares(parcel.area, parcel.areaUnit),
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
    const existingPartialData = this.dataService.toJsonObject(
      existingPartialSnapshot?.profile_snapshot,
    );

    const zoneClassification = this.dataService.deriveZoneClassification(v2Output);
    const rawConfidence = this.dataService.toNumber(v2Output.confidence?.normalized_score);
    const confidenceScore = rawConfidence !== null
      ? (rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence))
      : null;
    const observationMode = this.buildObservationModeContext(confidenceScore);
    const calibrationData = {
      ...existingPartialData,
      version: "v2",
      request: { ...dto, mode_calibrage: "partial", lookback_start_date: getCalibrationLookbackDate(parcel.plantingYear, parcel.cropType, parcel.system) },
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
          mode_calibrage: this.dataService.extractModeCalibrage(v2Output),
          phase_age: this.dataService.extractPhaseAge(v2Output, parcel),
          recalibration_motif: motif,
          previous_baseline: previousBaseline,
          p50_ndvi: this.dataService.extractIndexP50(v2Output, "NDVI"),
          p50_nirv: this.dataService.extractIndexP50(v2Output, "NIRv"),
          p50_ndmi: this.dataService.extractIndexP50(v2Output, "NDMI"),
          p50_ndre: this.dataService.extractIndexP50(v2Output, "NDRE"),
          p10_ndvi: this.dataService.extractIndexPercentile(v2Output, "NDVI", "p10"),
          p10_ndmi: this.dataService.extractIndexPercentile(v2Output, "NDMI", "p10"),
          confidence_score: confidenceScore,
          health_score: this.dataService.toInteger(v2Output.step8?.health_score?.total),
          yield_potential_min: this.dataService.toNumber(
            v2Output.step6?.yield_potential?.minimum,
          ),
          yield_potential_max: this.dataService.toNumber(
            v2Output.step6?.yield_potential?.maximum,
          ),
          coefficient_etat_parcelle: this.dataService.extractCoefficientEtat(v2Output),
          anomaly_count: Array.isArray(v2Output.step5?.anomalies)
            ? v2Output.step5?.anomalies.length
            : 0,
          baseline_data: this.dataService.extractBaselineData(v2Output),
          diagnostic_data: this.dataService.extractDiagnosticData(v2Output),
          anomalies_data: v2Output.step5?.anomalies ?? null,
          scores_detail: this.dataService.extractScoresDetail(v2Output),
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
        .in("status", ["awaiting_validation", "validated"]);

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
    const calibrationDataStart = getCalibrationLookbackDate(parcel.plantingYear, parcel.cropType, parcel.system);
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
      this.dataService.fetchSatelliteImages(parcelId, organizationId, calibrationDataStart),
      this.dataService.fetchWeatherRows(parcel, calibrationDataStart),
      this.dataService.fetchAnalyses(parcelId),
      this.dataService.fetchHarvestRecords(parcelId),
      this.dataService.fetchCropReferenceData(parcel.cropType),
    ]);

    let satelliteImages = initialSatelliteImages;

    const missingSatelliteIndices =
      await this.dataService.getMissingSatelliteIndexNames(
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

      satelliteImages = await this.dataService.fetchSatelliteImages(
        parcelId,
        organizationId,
        calibrationDataStart,
      );
    }

    let weatherRows = initialWeatherRows;

    if (weatherRows.length === 0) {
      emitProgress(2, "weather_sync", "Synchronisation des données météo...");
      await this.dataService.syncWeatherData(parcel, organizationId, authToken, calibrationDataStart);
      weatherRows = await this.dataService.fetchWeatherRows(parcel, calibrationDataStart);
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

      const sinceDate = getCalibrationLookbackDate(parcel.plantingYear, parcel.cropType, parcel.system);
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
      this.dataService.hasMissingGdd(weatherRows, parcel.cropType)
    ) {
      const wgs84ForGdd = WeatherProvider.ensureWGS84(parcel.boundary);
      const gddCentroid = WeatherProvider.calculateCentroid(wgs84ForGdd);
      const gddLatitude = this.dataService.roundCoordinate(gddCentroid.latitude, 2);
      const gddLongitude = this.dataService.roundCoordinate(gddCentroid.longitude, 2);

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
            .ilike("name", resolveVarietyForCalibration(parcel.variety) ?? parcel.variety)
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
            variety: resolveVarietyForCalibration(parcel.variety),
            chill_threshold: chillThreshold,
            nirv_series: nirvSeries,
            reference_data: referenceData ?? undefined,
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
      area_hectares: this.dataService.toHectares(parcel.area, parcel.areaUnit),
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
    const existingCalibrationData = this.dataService.toJsonObject(
      existingCalibrationSnapshot?.profile_snapshot,
    );
    const zoneClassification = this.dataService.deriveZoneClassification(v2Output);
    const rawConfidenceFull = this.dataService.toNumber(v2Output.confidence?.normalized_score);
    const confidenceScore = rawConfidenceFull !== null
      ? (rawConfidenceFull <= 1 ? Math.round(rawConfidenceFull * 100) : Math.round(rawConfidenceFull))
      : null;
    const observationMode = this.buildObservationModeContext(confidenceScore);
    const calibrationData = {
      ...existingCalibrationData,
      version: "v2",
      request: {
        ...this.dataService.toJsonObject(existingCalibrationData.request),
        ...dto,
        lookback_start_date: getCalibrationLookbackDate(parcel.plantingYear, parcel.cropType, parcel.system),
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
          mode_calibrage: this.dataService.extractModeCalibrage(v2Output),
          phase_age: this.dataService.extractPhaseAge(v2Output, parcel),
          p50_ndvi: this.dataService.extractIndexP50(v2Output, "NDVI"),
          p50_nirv: this.dataService.extractIndexP50(v2Output, "NIRv"),
          p50_ndmi: this.dataService.extractIndexP50(v2Output, "NDMI"),
          p50_ndre: this.dataService.extractIndexP50(v2Output, "NDRE"),
          p10_ndvi: this.dataService.extractIndexPercentile(v2Output, "NDVI", "p10"),
          p10_ndmi: this.dataService.extractIndexPercentile(v2Output, "NDMI", "p10"),
          confidence_score: confidenceScore,
          health_score: this.dataService.toInteger(v2Output.step8?.health_score?.total),
          yield_potential_min: this.dataService.toNumber(
            v2Output.step6?.yield_potential?.minimum,
          ),
          yield_potential_max: this.dataService.toNumber(
            v2Output.step6?.yield_potential?.maximum,
          ),
          coefficient_etat_parcelle: this.dataService.extractCoefficientEtat(v2Output),
          anomaly_count: Array.isArray(v2Output.step5?.anomalies)
            ? v2Output.step5?.anomalies.length
            : 0,
          baseline_data: this.dataService.extractBaselineData(v2Output),
          diagnostic_data: this.dataService.extractDiagnosticData(v2Output),
          anomalies_data: v2Output.step5?.anomalies ?? null,
          scores_detail: this.dataService.extractScoresDetail(v2Output),
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
        .in("status", ["awaiting_validation", "validated"]);

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
    limit: number = CALIBRATION_HISTORY_DEFAULT_LIMIT,
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
    const safeLimit = Math.min(
      CALIBRATION_HISTORY_MAX_LIMIT,
      Math.max(1, Math.floor(Number(limit)) || CALIBRATION_HISTORY_DEFAULT_LIMIT),
    );
    const { data, error } = await supabase
      .from("calibrations")
      .select(
        "id, type, status, health_score, confidence_score, phase_age, mode_calibrage, error_message, recalibration_motif, profile_snapshot, created_at, completed_at",
      )
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      this.logger.error(
        `Failed to fetch calibration history for parcel ${parcelId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch calibration history: ${error.message}`,
      );
    }

    return this.dataService.mapCalibrationHistoryRows(data ?? []);
  }

  /**
   * Returns the latest in_progress calibration's persisted progress so
   * the UI can restore the stepper + percent after a page reload. Also
   * runs the stale guard: any in_progress run with no progress update
   * for STALE_THRESHOLD_MS is force-failed and phase is recovered. That
   * unblocks parcels whose calibration process died mid-run (server
   * restart, crashed worker, etc.).
   */
  async getCurrentCalibrationProgress(
    parcelId: string,
    organizationId: string,
  ): Promise<{
    calibration_id: string;
    status: string;
    started_at: string | null;
    progress: {
      step: number;
      total_steps: number;
      step_key: string | null;
      message: string | null;
      percent: number;
      updated_at: string;
    } | null;
    stale: boolean;
  } | null> {
    const STALE_THRESHOLD_MS = 5 * 60 * 1000;
    const supabase = this.databaseService.getAdminClient();

    const { data: run, error } = await supabase
      .from("calibrations")
      .select(
        "id, status, started_at, progress_step, progress_total_steps, progress_step_key, progress_message, progress_percent, progress_updated_at, profile_snapshot",
      )
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `Failed to read current calibration progress for parcel ${parcelId}: ${error.message}`,
      );
      return null;
    }

    if (!run) return null;

    const lastTick = run.progress_updated_at
      ? new Date(run.progress_updated_at as string).getTime()
      : run.started_at
        ? new Date(run.started_at as string).getTime()
        : Date.now();
    const ageMs = Date.now() - lastTick;
    const stale = ageMs > STALE_THRESHOLD_MS;

    if (stale) {
      // Zombie run: mark failed, emit phase recovery, let caller see it.
      const { data: failed } = await supabase
        .from("calibrations")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "Run timed out with no progress update (worker likely died).",
        })
        .eq("id", run.id)
        .eq("status", "in_progress")
        .select("id")
        .maybeSingle();

      if (failed) {
        this.notificationsGateway.emitToOrganization(
          organizationId,
          "calibration:failed",
          {
            parcel_id: parcelId,
            calibration_id: run.id,
            error_message: "Run timed out",
          },
        );
        await this.restoreParcelPhaseAfterCalibrationFailure(
          run.id as string,
          parcelId,
          organizationId,
        ).catch((err: unknown) => {
          this.logger.warn(
            `Stale-run phase recovery failed for ${run.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
        return {
          calibration_id: run.id as string,
          status: "failed",
          started_at: (run.started_at as string | null) ?? null,
          progress: null,
          stale: true,
        };
      }
    }

    const step = (run.progress_step as number | null) ?? 0;
    const totalSteps = (run.progress_total_steps as number | null) ?? 0;

    return {
      calibration_id: run.id as string,
      status: run.status as string,
      started_at: (run.started_at as string | null) ?? null,
      progress:
        run.progress_updated_at != null && totalSteps > 0
          ? {
              step,
              total_steps: totalSteps,
              step_key: (run.progress_step_key as string | null) ?? null,
              message: (run.progress_message as string | null) ?? null,
              percent: (run.progress_percent as number | null) ?? 0,
              updated_at: run.progress_updated_at as string,
            }
          : null,
      stale: false,
    };
  }

  async getRecalibrationHistory(
    parcelId: string,
    organizationId: string,
    limit: number = CALIBRATION_HISTORY_DEFAULT_LIMIT,
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
    const safeLimit = Math.min(
      CALIBRATION_HISTORY_MAX_LIMIT,
      Math.max(1, Math.floor(Number(limit)) || CALIBRATION_HISTORY_DEFAULT_LIMIT),
    );
    const { data, error } = await supabase
      .from("calibrations")
      .select(
        "id, type, status, health_score, confidence_score, phase_age, mode_calibrage, error_message, recalibration_motif, profile_snapshot, created_at, completed_at",
      )
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .in("type", ["F2_partial"])
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      this.logger.error(
        `Failed to fetch recalibration history for parcel ${parcelId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch recalibration history: ${error.message}`,
      );
    }

    return this.dataService.mapCalibrationHistoryRows(data ?? []);
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
    const baselineData = this.dataService.toJsonObject(calibration.baseline_data);
    const diagnosticData = this.dataService.toJsonObject(calibration.diagnostic_data);
    const scoresDetail = this.dataService.toJsonObject(calibration.scores_detail);
    const profileSnapshot = this.dataService.toJsonObject(calibration.profile_snapshot);
    const snapshotOutput = this.dataService.toJsonObject(profileSnapshot?.output);

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
          minimum: this.dataService.toNumber(calibration.yield_potential_min),
          maximum: this.dataService.toNumber(calibration.yield_potential_max),
        },
      },
      step7: baselineData.zones ?? null,
      step8: {
        health_score: {
          total: this.dataService.toNumber(calibration.health_score),
          ...(this.dataService.toJsonObject(scoresDetail.health)),
        },
      },
      confidence: {
        total_score: this.dataService.toNumber(calibration.confidence_score),
        normalized_score: this.dataService.toNumber(calibration.confidence_score),
        ...(this.dataService.toJsonObject(scoresDetail.confidence)),
      },
      diagnostic_explicatif: diagnosticData,
      coefficient_etat_parcelle: this.dataService.toNumber(calibration.coefficient_etat_parcelle),
      metadata: {
        version: calibration.calibration_version ?? "v3",
        generated_at: calibration.completed_at ?? calibration.created_at,
        data_quality_flags: this.dataService.buildDataQualityFlags(calibration),
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
    userId?: string,
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
    const profileOutput = this.dataService.toJsonObject(
      (this.dataService.toJsonObject(record.profile_snapshot) as Record<string, unknown>)?.output,
    );
    const output = {
      ...profileOutput,
      ...this.dataService.toJsonObject(record.baseline_data),
      ...this.dataService.toJsonObject(record.diagnostic_data),
      anomalies: record.anomalies_data,
      scores: this.dataService.toJsonObject(record.scores_detail),
    };
    const history = await this.getCalibrationHistory(
      parcelId,
      organizationId,
      CALIBRATION_HISTORY_DEFAULT_LIMIT,
    );

    const { data: parcelRow, error: parcelError } = await supabase
      .from("parcels")
      .select("planting_year, crop_type, variety, boundary")
      .eq("id", parcelId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (parcelError) {
      this.logger.warn(
        `Failed to fetch parcel data for review: ${parcelError.message}`,
      );
    }

    const plantingYear =
      parcelRow && typeof (parcelRow as { planting_year?: unknown }).planting_year === "number"
        ? (parcelRow as { planting_year: number }).planting_year
        : null;
    const cropType =
      parcelRow && typeof (parcelRow as { crop_type?: unknown }).crop_type === "string"
        ? (parcelRow as { crop_type: string }).crop_type
        : null;
    const variety =
      parcelRow && typeof (parcelRow as { variety?: unknown }).variety === "string"
        ? (parcelRow as { variety: string }).variety
        : null;

    // Recalculate GDD for phase transitions from actual weather data
    const outputAny = output as Record<string, unknown>;
    if (cropType && outputAny.step4 && typeof outputAny.step4 === 'object') {
      try {
        const boundary = this.dataService.parseBoundary(
          (parcelRow as Record<string, unknown>)?.boundary,
        );
        if (boundary.length > 0) {
          const { latitude, longitude } = WeatherProvider.calculateCentroid(
            WeatherProvider.ensureWGS84(boundary),
          );
          outputAny.step4 = await this.dataService.recalculatePhaseGdd(
            outputAny.step4 as Record<string, unknown>,
            latitude,
            longitude,
            cropType,
            record.id,
            organizationId,
          );
        }
      } catch (err) {
        this.logger.warn(`GDD recalculation failed: ${(err as Error).message}`);
      }
    }

    const snapshotInput: CalibrationSnapshotInput = {
      calibration_id: record.id,
      parcel_id: record.parcel_id,
      generated_at: record.completed_at ?? record.updated_at ?? record.created_at,
      output,
      inputs: this.dataService.toJsonObject(record.profile_snapshot),
      confidence_score: this.dataService.toNumber(record.confidence_score),
      status: record.status,
      parcel_phase: record.phase_age ?? "unknown",
      organization_id: record.organization_id,
      crop_type: cropType,
      planting_year: plantingYear,
      variety,
      calibration_history: history.map((item) => ({
        id: item.id,
        date: item.completed_at ?? item.created_at,
        health_score: item.health_score,
        confidence_score: item.confidence_score,
        phase_age: item.phase_age ?? "unknown",
        status: item.status,
      })),
    };

    const review = this.calibrationReviewAdapter.transform(snapshotInput);

    // Enrich block_a with AI-generated narrative (falls back to deterministic text)
    if (userId) {
      try {
        const aiNarrative = await this.aiReportsService.generateCalibrationSummary(
          organizationId,
          userId,
          review.block_a,
        );
        if (aiNarrative) {
          review.block_a.summary_narrative = aiNarrative;
        }
      } catch (err) {
        this.logger.warn(`AI summary enrichment failed, using fallback: ${(err as Error).message}`);
      }
    }

    // Enrich phenology dashboard with AI (imputed stages, narratives, reasons).
    // Gated on degraded status OR missing stages — don't burn quota on clean outputs.
    if (userId && review.block_b.phenology_dashboard) {
      const dashboard = review.block_b.phenology_dashboard;
      const needsEnrichment =
        dashboard.status === 'degraded' || dashboard.missing_stages.length > 0;
      if (needsEnrichment) {
        try {
          const step4Raw =
            outputAny.step4 && typeof outputAny.step4 === 'object' && !Array.isArray(outputAny.step4)
              ? (outputAny.step4 as Record<string, unknown>)
              : {};
          const context = this.calibrationReviewAdapter.buildPhenologyEnrichmentContext(
            step4Raw,
            cropType,
          );
          if (context) {
            const enrichment = await this.aiReportsService.generatePhenologyEnrichment(
              organizationId,
              userId,
              context,
            );
            if (enrichment) {
              dashboard.ai_enrichment = enrichment;
            }
          }
        } catch (err) {
          this.logger.warn(
            `Phenology AI enrichment failed: ${(err as Error).message}`,
          );
        }
      }
    }

    return review;
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

    const parcel = await this.dataService.getParcelContext(parcelId, organizationId);

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

    const satelliteImages = await this.dataService.fetchSatelliteImages(
      parcelId,
      organizationId,
      getCalibrationLookbackDate(parcel.plantingYear, parcel.cropType, parcel.system),
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

    const analyses = await this.dataService.fetchAnalyses(parcelId);
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

    const harvestRecords = await this.dataService.fetchHarvestRecords(parcelId);
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

    const parcel = await this.dataService.getParcelContext(
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

    const confidenceScoreAtValidation = this.dataService.toNumber(
      existingCalibration.confidence_score,
    );
    const validatedAt = new Date().toISOString();
    const calibrationData = {
      ...this.dataService.toJsonObject(existingCalibration.profile_snapshot),
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
      const currentData = this.dataService.toJsonObject(updatedCalibration.profile_snapshot);
      const prevValidation = this.dataService.toJsonObject(currentData.validation);

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
    await this.dataService.getParcelContext(parcelId, organizationId);
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

    const parcel = await this.dataService.getParcelContext(
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
      .select("ai_phase, ai_enabled, ai_observation_only, planting_year, crop_type, planting_system")
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
    const dataStart = getCalibrationLookbackDate(parcelAiRow?.planting_year ?? null, parcelAiRow?.crop_type, parcelAiRow?.planting_system);

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
    const ndviValues = await this.dataService.fetchNdviValues(parcelId, organizationId);

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
    const parcel = await this.dataService.getParcelContext(parcelId, organizationId);
    const [ndviValues, thresholds] = await Promise.all([
      this.dataService.fetchNdviValues(parcelId, organizationId),
      this.dataService.fetchNdviThresholds(parcel.cropType, parcel.system),
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

  async getIrrigationRecommendation(parcelId: string, organizationId: string) {
    return this.dataService.getIrrigationRecommendation(parcelId, organizationId);
  }
}
