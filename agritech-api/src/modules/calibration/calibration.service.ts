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
import { DatabaseService } from "../database/database.service";
import { SatelliteCacheService } from "../satellite-indices/satellite-cache.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/dto/notification.dto";
import { WeatherProvider } from "../chat/providers/weather.provider";
import { StartCalibrationDto } from "./dto/start-calibration.dto";
import { CalibrationStateMachine } from "./calibration-state-machine";
import {
  NutritionOptionService,
  NutritionOptionSuggestion,
} from "./nutrition-option.service";
import { getLocalCropReference } from "./crop-reference-loader";

const CALIBRATION_LOOKBACK_DAYS = 730;
const NDVI_PERCENTILES = [10, 25, 50, 75, 90];

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
type CalibrationMode = "F1" | "F2" | "F3";
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
    private readonly satelliteCacheService: SatelliteCacheService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async startCalibration(
    parcelId: string,
    organizationId: string,
    dto: StartCalibrationDto,
    options?: { skipReadinessCheck?: boolean },
  ): Promise<CalibrationRecord> {
    const parcel = await this.getParcelContext(parcelId, organizationId);

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
      parcel.aiPhase as
        | "disabled"
        | "active"
        | "awaiting_validation"
        | "awaiting_nutrition_option",
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
        mode_calibrage: dto.mode_calibrage ?? "F1",
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
        },
      })
      .select("*")
      .single();

    if (insertError || !calibration) {
      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrating",
        "disabled",
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
    const mode = dto.mode_calibrage ?? "F2";
    if (mode !== "F2") {
      throw new BadRequestException(
        "Partial recalibration endpoint only accepts mode_calibrage=F2",
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
      return this.startCalibration(
        parcelId,
        organizationId,
        {
          ...dto,
          mode_calibrage: "F1",
        },
        { skipReadinessCheck: true },
      );
    }

    const parcel = await this.getParcelContext(parcelId, organizationId);

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
      parcel.aiPhase as
        | "disabled"
        | "active"
        | "awaiting_validation"
        | "awaiting_nutrition_option",
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
        mode_calibrage: "F2",
        recalibration_motif: motif,
        previous_baseline: previousBaseline,
        calibration_version: "v2",
        calibration_data: {
          version: "v2",
          request: { ...dto, mode_calibrage: "F2", lookback_days: CALIBRATION_LOOKBACK_DAYS },
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
        },
      })
      .select("*")
      .single();

    if (insertError || !calibration) {
      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrating",
        "disabled",
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

  private async runCalibrationInBackground(
    calibrationId: string,
    parcelId: string,
    organizationId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

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

      await supabase
        .from("calibrations")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", calibrationId);

      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrating",
        "disabled",
        organizationId,
      );
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
    const supabase = this.databaseService.getAdminClient();

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

      await supabase
        .from("calibrations")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", calibrationId);

      await this.stateMachine.transitionPhase(
        parcelId,
        "calibrating",
        "disabled",
        organizationId,
      );
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

    const calibrationInput = {
      parcel_id: parcelId,
      organization_id: organizationId,
      crop_type: parcel.cropType,
      variety: parcel.variety,
      planting_year: parcel.plantingYear,
      planting_system: parcel.system,
      mode_calibrage: "F2" as CalibrationMode,
      recalibration_motif: motif,
      baseline_calibration: previousBaseline,
      updated_blocks: updatedBlocks,
    };

    const v2Output = await this.postCalibrationApi<CalibrationResponse>(
      "/api/calibration/v2/run",
      {
        calibration_input: calibrationInput,
        satellite_images: [],
        weather_rows: [],
      },
      organizationId,
    );

    const zoneClassification = this.deriveZoneClassification(v2Output);
    const calibrationData = {
      version: "v2",
      request: { ...dto, mode_calibrage: "F2", lookback_days: CALIBRATION_LOOKBACK_DAYS },
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
        validated: false,
        validated_at: null,
      },
    };

    const { error: updateCalibrationError } = await supabase
      .from("calibrations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        mode_calibrage: "F2",
        recalibration_motif: motif,
        previous_baseline: previousBaseline,
        baseline_ndvi: this.extractIndexP50(v2Output, "NDVI"),
        baseline_ndre: this.extractIndexP50(v2Output, "NDRE"),
        baseline_ndmi: this.extractIndexP50(v2Output, "NDMI"),
        confidence_score: this.toNumber(v2Output.confidence?.normalized_score),
        zone_classification: zoneClassification,
        phenology_stage: this.extractPhenologyStage(v2Output),
        health_score: this.toNumber(v2Output.step8?.health_score?.total),
        yield_potential_min: this.toNumber(
          v2Output.step6?.yield_potential?.minimum,
        ),
        yield_potential_max: this.toNumber(
          v2Output.step6?.yield_potential?.maximum,
        ),
        data_completeness_score: this.toNumber(v2Output.confidence?.total_score),
        maturity_phase: v2Output.maturity_phase,
        anomaly_count: Array.isArray(v2Output.step5?.anomalies)
          ? v2Output.step5?.anomalies.length
          : 0,
        calibration_version: "v2",
        calibration_data: calibrationData,
      })
      .eq("id", calibrationId);

    if (updateCalibrationError) {
      throw new Error(
        `Failed to update partial recalibration: ${updateCalibrationError.message}`,
      );
    }

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
        .eq("id", calibrationId);

      if (aiUpdateError) {
        this.logger.warn(
          `Failed to store bilingual partial recalibration reports: ${aiUpdateError.message}`,
        );
      }
    }

    const { error: updateParcelError } = await supabase
      .from("parcels")
      .update({
        ai_calibration_id: calibrationId,
        ai_enabled: true,
      })
      .eq("id", parcelId);

    if (updateParcelError) {
      throw new Error(
        `Failed to update parcel AI state: ${updateParcelError.message}`,
      );
    }

    await this.stateMachine.transitionPhase(
      parcelId,
      "calibrating",
      "awaiting_validation",
      organizationId,
    );

    this.notifyOrganizationUsers(
      organizationId,
      NotificationType.CALIBRATION_COMPLETE,
      "Calibration terminée",
      "Le recalibrage partiel de la parcelle est terminé et en attente de validation.",
      {
        parcel_id: parcelId,
        calibration_id: calibrationId,
        mode_calibrage: "F2",
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

    const [
      initialSatelliteImages,
      weatherRows,
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

    // Parcel crop_type and variety are used for calibration: reference_data is loaded by crop_type;
    // variety is matched against reference_data.varietes[].nom or .code for yield curves and maturity.
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

    const zoneClassification = this.deriveZoneClassification(v2Output);
    const calibrationData = {
      version: "v2",
      request: { ...dto, lookback_days: CALIBRATION_LOOKBACK_DAYS },
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
        validated: false,
        validated_at: null,
      },
    };

    const { error: updateCalibrationError } = await supabase
      .from("calibrations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        baseline_ndvi: this.extractIndexP50(v2Output, "NDVI"),
        baseline_ndre: this.extractIndexP50(v2Output, "NDRE"),
        baseline_ndmi: this.extractIndexP50(v2Output, "NDMI"),
        confidence_score: this.toNumber(v2Output.confidence?.normalized_score),
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
      .eq("id", calibrationId);

    if (updateCalibrationError) {
      throw new Error(
        `Failed to update calibration: ${updateCalibrationError.message}`,
      );
    }

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
        .eq("id", calibrationId);

      if (aiUpdateError) {
        this.logger.warn(
          `Failed to store bilingual calibration reports: ${aiUpdateError.message}`,
        );
      }
    }

    const { error: updateParcelError } = await supabase
      .from("parcels")
      .update({
        ai_calibration_id: calibrationId,
        ai_enabled: true,
      })
      .eq("id", parcelId);

    if (updateParcelError) {
      throw new Error(
        `Failed to update parcel AI state: ${updateParcelError.message}`,
      );
    }

    await this.stateMachine.transitionPhase(
      parcelId,
      "calibrating",
      "awaiting_validation",
      organizationId,
    );

    this.notifyOrganizationUsers(
      organizationId,
      NotificationType.CALIBRATION_COMPLETE,
      "Calibration terminée",
      `Le calibrage de la parcelle est terminé et en attente de validation.`,
      { parcel_id: parcelId, calibration_id: calibrationId },
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
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { data: orgUsers } = await supabase
      .from("organization_users")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (!orgUsers?.length) return;

    for (const orgUser of orgUsers) {
      await this.notificationsService
        .createNotification({
          userId: orgUser.user_id as string,
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
      .eq("mode_calibrage", "F2")
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
            status: satelliteImages.length >= 1 ? "warning" : "fail",
            message: `${satelliteImages.length}/10 images satellite (minimum 10 recommandées)`,
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

    const validatedAt = new Date().toISOString();
    const calibrationData = {
      ...this.toJsonObject(existingCalibration.calibration_data),
      validation: {
        validated: true,
        validated_at: validatedAt,
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

    const confidenceScore = this.toNumber(updatedCalibration.confidence_score);
    const MINIMUM_CONFIDENCE_FOR_ACTIVE = 0.25;

    if (
      confidenceScore !== null &&
      confidenceScore < MINIMUM_CONFIDENCE_FOR_ACTIVE
    ) {
      this.logger.warn(
        `Calibration ${calibrationId} confidence ${confidenceScore} below threshold ${MINIMUM_CONFIDENCE_FOR_ACTIVE} — parcel stays in observation-only mode`,
      );

      await this.stateMachine.transitionPhase(
        existingCalibration.parcel_id,
        "awaiting_validation",
        "active",
        organizationId,
      );

      await supabase
        .from("parcels")
        .update({ ai_observation_only: true })
        .eq("id", existingCalibration.parcel_id);

      return {
        ...(updatedCalibration as CalibrationRecord),
        observation_only: true,
        observation_reason: `Confidence score (${Math.round(confidenceScore * 100)}%) below minimum threshold (${Math.round(MINIMUM_CONFIDENCE_FOR_ACTIVE * 100)}%) for active recommendations`,
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
      .update({ ai_nutrition_option: option })
      .eq("id", calibration.parcel_id);

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

    await this.aiReportsService.generateReport(organizationId, "system", {
      parcel_id: parcelId,
      provider: AIProvider.GEMINI,
      model: "gemini-2.5-flash",
      reportType: AgromindReportType.ANNUAL_PLAN,
      data_start_date: this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS),
      data_end_date: new Date().toISOString().split("T")[0],
    });

    this.logger.log(`Annual plan generated for parcel ${parcelId}`);

    await this.generateTasksFromAnnualPlan(parcelId, organizationId);
  }

  private async generateTasksFromAnnualPlan(
    parcelId: string,
    organizationId: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const { data: latestReport } = await supabase
      .from("ai_reports")
      .select("id, report_data")
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .eq("report_type", "annual_plan")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestReport?.report_data) {
      this.logger.warn(
        `No annual plan report found for parcel ${parcelId}, skipping task generation`,
      );
      return;
    }

    const reportData = this.toJsonObject(latestReport.report_data);
    const calendar =
      (reportData as Record<string, unknown>)?.calendrier_mensuel ??
      (reportData as Record<string, unknown>)?.monthly_calendar ??
      (reportData as Record<string, unknown>)?.tasks;

    if (!Array.isArray(calendar) || calendar.length === 0) {
      this.logger.log(
        `Annual plan for parcel ${parcelId} has no calendar tasks to generate`,
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

    const validTaskTypes = new Set([
      "planting",
      "harvesting",
      "irrigation",
      "fertilization",
      "maintenance",
      "general",
      "pest_control",
      "pruning",
      "soil_preparation",
    ]);

    const taskRows = calendar
      .filter(
        (item: unknown): item is Record<string, unknown> =>
          typeof item === "object" && item !== null,
      )
      .map((item) => {
        const rawType = String(item.type ?? item.task_type ?? "general");
        const taskType = validTaskTypes.has(rawType) ? rawType : "general";

        return {
          farm_id: parcel.farm_id,
          parcel_id: parcelId,
          organization_id: organizationId,
          title: String(item.title ?? item.description ?? item.action ?? ""),
          description: item.description
            ? String(item.description)
            : item.details
              ? String(item.details)
              : null,
          task_type: taskType,
          priority: String(item.priority ?? "medium"),
          status: "planned",
          due_date: item.date_prevue ?? item.due_date ?? item.date ?? null,
          metadata: {
            source: "annual_plan",
            ai_report_id: latestReport.id,
            month: item.mois ?? item.month ?? null,
            dose: item.dose ?? null,
          },
        };
      })
      .filter((row: { title: string }) => row.title && row.title.length > 0);

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
      `Created ${taskRows.length} tasks from annual plan for parcel ${parcelId}`,
    );
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
      const mode: CalibrationMode =
        modeFromColumn === "F1" ||
        modeFromColumn === "F2" ||
        modeFromColumn === "F3"
          ? modeFromColumn
          : modeFromRequest === "F1" ||
              modeFromRequest === "F2" ||
              modeFromRequest === "F3"
            ? modeFromRequest
            : "F1";

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
}
