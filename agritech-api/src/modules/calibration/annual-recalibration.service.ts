import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  CalibrationRecord,
  CalibrationService,
} from "./calibration.service";
import { StartCalibrationDto } from "./dto/start-calibration.dto";
import { DatabaseService } from "../database/database.service";

type JsonObject = Record<string, unknown>;

interface ParcelStateRow {
  id: string;
  crop_type: string | null;
  ai_phase: string | null;
  annual_trigger_config?: unknown;
}

interface CalibrationRow {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  health_score: number | string | null;
  yield_potential_min: number | string | null;
  yield_potential_max: number | string | null;
  calibration_data: unknown;
}

interface HarvestRow {
  harvest_date: string;
  quantity: number | string | null;
  status: string | null;
}

interface TaskRow {
  id: string;
  task_type: string;
  title: string | null;
  status: string;
  due_date: string | null;
  scheduled_start: string | null;
  created_at: string;
}

interface AnalysisRow {
  analysis_type: string;
}

interface AlertRow {
  alert_type: string;
}

interface SeasonRange {
  start: string;
  end: string;
}

interface TriggerConfig {
  month?: number;
  day?: number;
  snoozed_until?: string;
  missing_task_review?: {
    reviewed_at?: string;
    resolutions?: MissingTaskResolution[];
  };
}

export type MissingTaskResolutionStatus =
  | "completed"
  | "not_done"
  | "unconfirmed";

export interface MissingTaskResolution {
  task_id: string;
  resolution: MissingTaskResolutionStatus;
  execution_date?: string;
  notes?: string;
}

@Injectable()
export class AnnualRecalibrationService {
  private readonly logger = new Logger(AnnualRecalibrationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly calibrationService: CalibrationService,
  ) {}

  async checkEligibility(
    parcelId: string,
    organizationId: string,
  ): Promise<{
    eligible: boolean;
    trigger_reason: "harvest_completed" | "date_reached" | "manual";
    harvest_date?: string;
    days_since_harvest?: number;
  }> {
    const parcel = await this.getParcelState(parcelId, organizationId);
    const hasValidatedBaseline = await this.hasValidatedBaseline(
      parcelId,
      organizationId,
    );

    if (parcel.ai_phase !== "active" || !hasValidatedBaseline) {
      return {
        eligible: false,
        trigger_reason: "manual",
      };
    }

    const seasonRange = await this.getCurrentSeasonRange(parcelId, organizationId);
    const latestHarvest = await this.getLatestHarvestForSeason(
      parcelId,
      organizationId,
      seasonRange,
    );

    if (latestHarvest?.harvest_date) {
      const harvestDate = new Date(latestHarvest.harvest_date);
      const now = new Date();
      const daysSinceHarvest = Math.max(
        0,
        Math.floor((now.getTime() - harvestDate.getTime()) / 86_400_000),
      );

      return {
        eligible: true,
        trigger_reason: "harvest_completed",
        harvest_date: latestHarvest.harvest_date,
        days_since_harvest: daysSinceHarvest,
      };
    }

    if (this.hasDateTriggerReached(parcel.crop_type, parcel.annual_trigger_config)) {
      return {
        eligible: true,
        trigger_reason: "date_reached",
      };
    }

    return {
      eligible: false,
      trigger_reason: "manual",
    };
  }

  async detectMissingTasks(
    parcelId: string,
    organizationId: string,
  ): Promise<
    Array<{
      task_id: string;
      task_type: string;
      period: string;
      message: string;
      action: "quick_entry" | "confirm_not_done" | "ignore";
      current_resolution?: MissingTaskResolutionStatus;
      resolution_date?: string;
      resolution_notes?: string;
    }>
  > {
    const supabase = this.databaseService.getAdminClient();
    const seasonRange = await this.getCurrentSeasonRange(parcelId, organizationId);
    const parcel = await this.getParcelState(parcelId, organizationId);
    const reviewMap = new Map(
      this.getStoredMissingTaskReview(parcel.annual_trigger_config).map(
        (resolution) => [resolution.task_id, resolution],
      ),
    );
    const { data, error } = await supabase
      .from("tasks")
      .select("id, task_type, title, status, due_date, scheduled_start, created_at")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .gte("created_at", seasonRange.start)
      .lte("created_at", seasonRange.end);

    if (error) {
      throw new BadRequestException(
        `Failed to detect missing tasks: ${error.message}`,
      );
    }

    const plannedStatuses = new Set([
      "pending",
      "assigned",
      "in_progress",
      "paused",
      "overdue",
    ]);

    const missingRows = ((data ?? []) as TaskRow[]).filter((row) =>
      plannedStatuses.has(row.status),
    );

    return missingRows.map((row) => {
      const period = this.deriveTaskPeriod(row);
      const taskType = row.task_type;

      if (taskType === "fertilization") {
        return {
          task_id: row.id,
          task_type: taskType,
          period,
          message: `Avez-vous realise une application de fertilisants en ${period}?`,
          action: "quick_entry" as const,
          current_resolution: reviewMap.get(row.id)?.resolution,
          resolution_date: reviewMap.get(row.id)?.execution_date,
          resolution_notes: reviewMap.get(row.id)?.notes,
        };
      }

      if (taskType === "pest_control") {
        const target = this.extractPestTarget(row.title);
        return {
          task_id: row.id,
          task_type: taskType,
          period,
          message: `Avez-vous traite contre ${target} cette saison?`,
          action: "quick_entry" as const,
          current_resolution: reviewMap.get(row.id)?.resolution,
          resolution_date: reviewMap.get(row.id)?.execution_date,
          resolution_notes: reviewMap.get(row.id)?.notes,
        };
      }

      if (taskType === "irrigation") {
        return {
          task_id: row.id,
          task_type: taskType,
          period,
          message: `Aucune donnee d'irrigation en ${period}. Arret saisonnier?`,
          action: "confirm_not_done" as const,
          current_resolution: reviewMap.get(row.id)?.resolution,
          resolution_date: reviewMap.get(row.id)?.execution_date,
          resolution_notes: reviewMap.get(row.id)?.notes,
        };
      }

      if (taskType === "pruning") {
        return {
          task_id: row.id,
          task_type: taskType,
          period,
          message: "Avez-vous realise une taille cette saison?",
          action: "quick_entry" as const,
          current_resolution: reviewMap.get(row.id)?.resolution,
          resolution_date: reviewMap.get(row.id)?.execution_date,
          resolution_notes: reviewMap.get(row.id)?.notes,
        };
      }

      return {
        task_id: row.id,
        task_type: taskType,
        period,
        message: "Intervention planifiee non confirmee cette saison.",
        action: "ignore" as const,
        current_resolution: reviewMap.get(row.id)?.resolution,
        resolution_date: reviewMap.get(row.id)?.execution_date,
        resolution_notes: reviewMap.get(row.id)?.notes,
      };
    });
  }

  async checkNewAnalyses(
    parcelId: string,
    organizationId: string,
    lastCalibrationDate: string,
  ): Promise<{
    new_soil: boolean;
    new_water: boolean;
    new_foliar: boolean;
    soil_date?: string;
    water_date?: string;
    foliar_date?: string;
  }> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("analyses")
      .select("analysis_type, analysis_date")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .gt("analysis_date", lastCalibrationDate);

    if (error) {
      throw new BadRequestException(
        `Failed to check new analyses: ${error.message}`,
      );
    }

    const analyses = (data ?? []) as Array<AnalysisRow & { analysis_date?: string }>;
    const latestDates = analyses.reduce<Record<string, string>>((accumulator, row) => {
      if (!row.analysis_date) {
        return accumulator;
      }

      const current = accumulator[row.analysis_type];
      if (!current || row.analysis_date > current) {
        accumulator[row.analysis_type] = row.analysis_date;
      }

      return accumulator;
    }, {});

    const analysisTypes = new Set(analyses.map((row) => row.analysis_type));

    return {
      new_soil: analysisTypes.has("soil"),
      new_water: analysisTypes.has("water"),
      new_foliar: analysisTypes.has("plant") || analysisTypes.has("foliar"),
      soil_date: latestDates.soil,
      water_date: latestDates.water,
      foliar_date: latestDates.plant ?? latestDates.foliar,
    };
  }

  async saveMissingTaskReview(
    parcelId: string,
    organizationId: string,
    resolutions: MissingTaskResolution[],
  ): Promise<{ reviewed_at: string; resolutions: MissingTaskResolution[] }> {
    const normalizedResolutions = this.normalizeMissingTaskResolutions(resolutions);
    const parcel = await this.getParcelState(parcelId, organizationId);
    const rawTriggerConfig = this.getRawTriggerConfig(parcel.annual_trigger_config);
    const reviewedAt = new Date().toISOString();

    await this.applyMissingTaskResolutionUpdates(
      parcelId,
      organizationId,
      normalizedResolutions,
    );

    const supabase = this.databaseService.getAdminClient();
    const { error } = await supabase
      .from("parcels")
      .update({
        annual_trigger_config: {
          ...rawTriggerConfig,
          missing_task_review: {
            reviewed_at: reviewedAt,
            resolutions: normalizedResolutions,
          },
        },
      })
      .eq("id", parcelId)
      .eq("organization_id", organizationId);

    if (error) {
      if (this.isMissingAnnualTriggerConfigColumn(error)) {
        this.logger.warn(
          `Skipping annual missing task review persistence for parcel ${parcelId}: annual_trigger_config column is unavailable`,
        );
        return {
          reviewed_at: reviewedAt,
          resolutions: normalizedResolutions,
        };
      }

      throw new BadRequestException(
        `Failed to save annual missing task review: ${error.message}`,
      );
    }

    return {
      reviewed_at: reviewedAt,
      resolutions: normalizedResolutions,
    };
  }

  async snoozeAnnualReminder(
    parcelId: string,
    organizationId: string,
    days: number,
  ): Promise<{ snoozed_until: string }> {
    const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 7;
    const parcel = await this.getParcelState(parcelId, organizationId);
    const rawTriggerConfig = this.getRawTriggerConfig(parcel.annual_trigger_config);
    const snoozedUntilDate = new Date();
    snoozedUntilDate.setDate(snoozedUntilDate.getDate() + safeDays);
    const snoozedUntil = snoozedUntilDate.toISOString();

    const { error } = await this.databaseService
      .getAdminClient()
      .from("parcels")
      .update({
        annual_trigger_config: {
          ...rawTriggerConfig,
          snoozed_until: snoozedUntil,
        },
      })
      .eq("id", parcelId)
      .eq("organization_id", organizationId);

    if (error) {
      if (this.isMissingAnnualTriggerConfigColumn(error)) {
        this.logger.warn(
          `Skipping annual reminder snooze persistence for parcel ${parcelId}: annual_trigger_config column is unavailable`,
        );
        return { snoozed_until: snoozedUntil };
      }

      throw new BadRequestException(
        `Failed to snooze annual reminder: ${error.message}`,
      );
    }

    return { snoozed_until: snoozedUntil };
  }

  async generateCampaignBilan(
    parcelId: string,
    organizationId: string,
  ): Promise<{
    predicted_yield: { min: number; max: number };
    actual_yield: number | null;
    yield_deviation_pct: number | null;
    alternance_status_next: string;
    alerts_summary: Array<{ code: string; count: number }>;
    interventions_planned: number;
    interventions_executed: number;
    health_score_evolution: { start: number; end: number };
  }> {
    const supabase = this.databaseService.getAdminClient();
    const seasonRange = await this.getCurrentSeasonRange(parcelId, organizationId);

    const latestCompletedCalibration = await this.getLatestCompletedCalibration(
      parcelId,
      organizationId,
    );

    const predicted = this.getPredictedYield(latestCompletedCalibration);

    const { data: harvestRows, error: harvestError } = await supabase
      .from("harvest_records")
      .select("harvest_date, quantity, status")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .gte("harvest_date", seasonRange.start)
      .lte("harvest_date", seasonRange.end)
      .neq("status", "spoiled");

    if (harvestError) {
      throw new BadRequestException(
        `Failed to compute campaign bilan (harvest): ${harvestError.message}`,
      );
    }

    const actualYield = ((harvestRows ?? []) as HarvestRow[]).reduce(
      (acc, row) => acc + (this.toNumber(row.quantity) ?? 0),
      0,
    );
    const normalizedActualYield = actualYield > 0 ? actualYield : null;

    const predictedCenter =
      predicted.min > 0 || predicted.max > 0
        ? (predicted.min + predicted.max) / 2
        : 0;

    const yieldDeviationPct =
      normalizedActualYield !== null && predictedCenter > 0
        ? Number((((normalizedActualYield - predictedCenter) / predictedCenter) * 100).toFixed(2))
        : null;

    const alternanceStatusNext = this.extractAlternanceStatus(
      latestCompletedCalibration,
    );

    const { data: alertRows, error: alertsError } = await supabase
      .from("performance_alerts")
      .select("alert_type")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .gte("created_at", seasonRange.start)
      .lte("created_at", seasonRange.end);

    if (alertsError) {
      throw new BadRequestException(
        `Failed to compute campaign bilan (alerts): ${alertsError.message}`,
      );
    }

    const alertCounts = new Map<string, number>();
    for (const row of (alertRows ?? []) as AlertRow[]) {
      const key = row.alert_type;
      alertCounts.set(key, (alertCounts.get(key) ?? 0) + 1);
    }

    const alertsSummary = Array.from(alertCounts.entries()).map(
      ([code, count]) => ({ code, count }),
    );

    const { data: taskRows, error: tasksError } = await supabase
      .from("tasks")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .gte("created_at", seasonRange.start)
      .lte("created_at", seasonRange.end);

    if (tasksError) {
      throw new BadRequestException(
        `Failed to compute campaign bilan (tasks): ${tasksError.message}`,
      );
    }

    const interventionsPlanned = (taskRows ?? []).length;
    const interventionsExecuted = (taskRows ?? []).filter(
      (row) => row.status === "completed",
    ).length;

    const { start: healthStart, end: healthEnd } =
      await this.getHealthScoreEvolution(parcelId, organizationId);

    return {
      predicted_yield: predicted,
      actual_yield: normalizedActualYield,
      yield_deviation_pct: yieldDeviationPct,
      alternance_status_next: alternanceStatusNext,
      alerts_summary: alertsSummary,
      interventions_planned: interventionsPlanned,
      interventions_executed: interventionsExecuted,
      health_score_evolution: {
        start: healthStart,
        end: healthEnd,
      },
    };
  }

  async startAnnualRecalibration(
    parcelId: string,
    organizationId: string,
    dto: StartCalibrationDto,
  ): Promise<CalibrationRecord> {
    const eligibility = await this.checkEligibility(parcelId, organizationId);

    if (!eligibility.eligible) {
      throw new BadRequestException(
        "Annual recalibration is not eligible yet: record a harvest for the current season or wait until the annual date trigger.",
      );
    }

    const hasValidatedBaseline = await this.hasValidatedBaseline(
      parcelId,
      organizationId,
    );

    if (!hasValidatedBaseline) {
      throw new BadRequestException(
        "A validated baseline is required before annual recalibration",
      );
    }

    const latestCompletedCalibration = await this.getLatestCompletedCalibration(
      parcelId,
      organizationId,
    );

    const previousBaseline = this.extractPreviousBaseline(latestCompletedCalibration);
    const campaignBilan = await this.generateCampaignBilan(parcelId, organizationId);
    const missingTaskReview = this.getStoredMissingTaskReview(
      (await this.getParcelState(parcelId, organizationId)).annual_trigger_config,
    );

    const calibration = await this.calibrationService.startCalibration(
      parcelId,
      organizationId,
      {
        ...dto,
        mode_calibrage: "annual",
        recalibration_motif: "post_campaign",
      },
      { skipReadinessCheck: true },
    );

    const supabase = this.databaseService.getAdminClient();
    const { data: latestCalibrationRow, error: latestCalibrationError } =
      await supabase
        .from("calibrations")
        .select("calibration_data")
        .eq("id", calibration.id)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (latestCalibrationError) {
      throw new BadRequestException(
        `Failed to load calibration for annual context merge: ${latestCalibrationError.message}`,
      );
    }

    const currentCalibrationData = this.toJsonObject(
      latestCalibrationRow?.calibration_data ?? calibration.calibration_data,
    );
    const existingRecalibration = this.toJsonObject(
      currentCalibrationData.recalibration,
    );
    const persistedCalibrationData = {
      ...currentCalibrationData,
      recalibration: {
        ...existingRecalibration,
        motif: "post_campaign",
        trigger_reason: eligibility.trigger_reason,
        missing_task_review: missingTaskReview,
      },
      previous_baseline: previousBaseline,
      campaign_bilan: campaignBilan,
    };

    const { data: updatedCalibration, error: updateError } = await supabase
      .from("calibrations")
      .update({
        mode_calibrage: "annual",
        recalibration_motif: "post_campaign",
        previous_baseline: previousBaseline,
        campaign_bilan: campaignBilan,
        calibration_data: persistedCalibrationData,
      })
      .eq("id", calibration.id)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (updateError || !updatedCalibration) {
      throw new BadRequestException(
        `Failed to persist annual recalibration context: ${updateError?.message ?? "unknown error"}`,
      );
    }

    await this.updateAlternanceHistory(
      parcelId,
      organizationId,
      campaignBilan.alternance_status_next,
    );

    if (
      campaignBilan.yield_deviation_pct !== null &&
      Math.abs(campaignBilan.yield_deviation_pct) > 20
    ) {
      await this.markCoefficientAdjustmentRequired(
        calibration.id,
        organizationId,
        campaignBilan.yield_deviation_pct,
      );
    }

    return updatedCalibration as CalibrationRecord;
  }

  private async getParcelState(
    parcelId: string,
    organizationId: string,
  ): Promise<ParcelStateRow> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("parcels")
      .select("id, crop_type, ai_phase, annual_trigger_config")
      .eq("id", parcelId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (this.isMissingAnnualTriggerConfigColumn(error)) {
      const fallbackResult = await supabase
        .from("parcels")
        .select("id, crop_type, ai_phase")
        .eq("id", parcelId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (fallbackResult.error) {
        throw new BadRequestException(
          `Failed to fetch parcel: ${fallbackResult.error.message}`,
        );
      }

      if (!fallbackResult.data) {
        throw new NotFoundException("Parcel not found");
      }

      return {
        ...(fallbackResult.data as Omit<ParcelStateRow, "annual_trigger_config">),
        annual_trigger_config: undefined,
      };
    }

    if (error) {
      throw new BadRequestException(`Failed to fetch parcel: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException("Parcel not found");
    }

    return data as ParcelStateRow;
  }

  private isMissingAnnualTriggerConfigColumn(
    error: { message?: string; code?: string } | null | undefined,
  ): boolean {
    return (
      error?.code === "42703" ||
      error?.message?.includes("annual_trigger_config") === true
    );
  }

  private async hasValidatedBaseline(
    parcelId: string,
    organizationId: string,
  ): Promise<boolean> {
    const baseline = await this.getLatestCompletedCalibration(
      parcelId,
      organizationId,
    );
    if (!baseline) {
      return false;
    }

    const calibrationData = this.toJsonObject(baseline.calibration_data);
    const validation = this.toJsonObject(calibrationData.validation);
    return validation.validated === true;
  }

  private async getLatestCompletedCalibration(
    parcelId: string,
    organizationId: string,
  ): Promise<CalibrationRow | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select(
        "id, status, created_at, completed_at, health_score, yield_potential_min, yield_potential_max, calibration_data",
      )
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch latest completed calibration: ${error.message}`,
      );
    }

    return data ? (data as CalibrationRow) : null;
  }

  private getPredictedYield(calibration: CalibrationRow | null): {
    min: number;
    max: number;
  } {
    if (!calibration) {
      return { min: 0, max: 0 };
    }

    const minFromColumn = this.toNumber(calibration.yield_potential_min);
    const maxFromColumn = this.toNumber(calibration.yield_potential_max);
    if (minFromColumn !== null || maxFromColumn !== null) {
      return {
        min: minFromColumn ?? 0,
        max: maxFromColumn ?? minFromColumn ?? 0,
      };
    }

    const calibrationData = this.toJsonObject(calibration.calibration_data);
    const output = this.toJsonObject(calibrationData.output);
    const step6 = this.toJsonObject(output.step6);
    const yieldPotential = this.toJsonObject(step6.yield_potential);

    return {
      min: this.toNumber(yieldPotential.minimum) ?? 0,
      max:
        this.toNumber(yieldPotential.maximum) ??
        this.toNumber(yieldPotential.minimum) ??
        0,
    };
  }

  private extractAlternanceStatus(calibration: CalibrationRow | null): string {
    if (!calibration) {
      return "indetermine";
    }

    const calibrationData = this.toJsonObject(calibration.calibration_data);
    const output = this.toJsonObject(calibrationData.output);
    const step6 = this.toJsonObject(output.step6);
    const alternanceInfo = this.toJsonObject(step6.alternance_info);

    if (typeof alternanceInfo.status === "string") {
      return alternanceInfo.status;
    }
    if (typeof step6.alternanceStatus === "string") {
      return step6.alternanceStatus;
    }

    return "indetermine";
  }

  private async getHealthScoreEvolution(
    parcelId: string,
    organizationId: string,
  ): Promise<{ start: number; end: number }> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select("health_score")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch health score evolution: ${error.message}`,
      );
    }

    const scores = (data ?? [])
      .map((row) => this.toNumber(row.health_score))
      .filter((score): score is number => score !== null);

    if (scores.length === 0) {
      return { start: 0, end: 0 };
    }

    return {
      start: scores[0],
      end: scores[scores.length - 1],
    };
  }

  private async getCurrentSeasonRange(
    parcelId: string,
    organizationId: string,
  ): Promise<SeasonRange> {
    const supabase = this.databaseService.getAdminClient();
    const { data } = await supabase
      .from("suivis_saison")
      .select("saison")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    const fallbackStart = new Date(now);
    fallbackStart.setDate(now.getDate() - 365);

    if (!data || typeof data.saison !== "string") {
      return {
        start: fallbackStart.toISOString(),
        end: now.toISOString(),
      };
    }

    const years = data.saison.match(/(\d{4})\s*-\s*(\d{4})/);
    if (!years) {
      return {
        start: fallbackStart.toISOString(),
        end: now.toISOString(),
      };
    }

    const startYear = Number(years[1]);
    const endYear = Number(years[2]);
    return {
      start: new Date(Date.UTC(startYear, 0, 1)).toISOString(),
      end: new Date(Date.UTC(endYear, 11, 31, 23, 59, 59)).toISOString(),
    };
  }

  private async getLatestHarvestForSeason(
    parcelId: string,
    organizationId: string,
    seasonRange: SeasonRange,
  ): Promise<HarvestRow | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("harvest_records")
      .select("harvest_date, quantity, status")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .gte("harvest_date", seasonRange.start)
      .lte("harvest_date", seasonRange.end)
      .neq("status", "spoiled")
      .order("harvest_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `Failed to fetch harvest completion state: ${error.message}`,
      );
    }

    return data ? (data as HarvestRow) : null;
  }

  private hasDateTriggerReached(
    cropType: string | null,
    configInput: unknown,
  ): boolean {
    const now = new Date();
    const config = this.parseTriggerConfig(configInput);

    if (config.snoozed_until) {
      const snoozeDate = new Date(config.snoozed_until);
      if (Number.isFinite(snoozeDate.getTime()) && now < snoozeDate) {
        return false;
      }
    }

    const defaults: Record<string, { month: number; day: number }> = {
      olivier: { month: 1, day: 15 },
      agrumes: { month: 2, day: 1 },
      avocatier: { month: 2, day: 15 },
      palmier_dattier: { month: 3, day: 1 },
    };

    const fallback = defaults[cropType ?? ""] ?? { month: 1, day: 15 };
    const month = this.isMonth(config.month) ? config.month : fallback.month;
    const day = this.isDay(config.day) ? config.day : fallback.day;

    const triggerDate = new Date(now.getFullYear(), month - 1, day, 0, 0, 0);
    return now >= triggerDate;
  }

  private parseTriggerConfig(value: unknown): TriggerConfig {
    if (!this.isJsonObject(value)) {
      return {};
    }

    return {
      month: this.toNumber(value.month) ?? undefined,
      day: this.toNumber(value.day) ?? undefined,
      snoozed_until:
        typeof value.snoozed_until === "string" ? value.snoozed_until : undefined,
      missing_task_review:
        this.isJsonObject(value.missing_task_review) &&
        Array.isArray(value.missing_task_review.resolutions)
          ? {
              reviewed_at:
                typeof value.missing_task_review.reviewed_at === "string"
                  ? value.missing_task_review.reviewed_at
                  : undefined,
              resolutions: this.normalizeMissingTaskResolutions(
                value.missing_task_review.resolutions as MissingTaskResolution[],
              ),
            }
          : undefined,
    };
  }

  private getRawTriggerConfig(value: unknown): Record<string, unknown> {
    return this.isJsonObject(value) ? { ...value } : {};
  }

  private getStoredMissingTaskReview(value: unknown): MissingTaskResolution[] {
    return this.parseTriggerConfig(value).missing_task_review?.resolutions ?? [];
  }

  private normalizeMissingTaskResolutions(
    resolutions: MissingTaskResolution[],
  ): MissingTaskResolution[] {
    const normalized = new Map<string, MissingTaskResolution>();

    for (const resolution of resolutions) {
      if (
        !resolution ||
        typeof resolution.task_id !== "string" ||
        !resolution.task_id.trim() ||
        !this.isMissingTaskResolutionStatus(resolution.resolution)
      ) {
        continue;
      }

      normalized.set(resolution.task_id, {
        task_id: resolution.task_id,
        resolution: resolution.resolution,
        execution_date:
          typeof resolution.execution_date === "string" &&
          resolution.execution_date.trim().length > 0
            ? resolution.execution_date
            : undefined,
        notes:
          typeof resolution.notes === "string" && resolution.notes.trim().length > 0
            ? resolution.notes.trim()
            : undefined,
      });
    }

    return Array.from(normalized.values());
  }

  private isMissingTaskResolutionStatus(
    value: unknown,
  ): value is MissingTaskResolutionStatus {
    return value === "completed" || value === "not_done" || value === "unconfirmed";
  }

  private async applyMissingTaskResolutionUpdates(
    parcelId: string,
    organizationId: string,
    resolutions: MissingTaskResolution[],
  ): Promise<void> {
    const actionableResolutions = resolutions.filter(
      (resolution) =>
        resolution.resolution === "completed" ||
        resolution.resolution === "not_done",
    );

    if (actionableResolutions.length === 0) {
      return;
    }

    const supabase = this.databaseService.getAdminClient();
    const { data: tasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, notes")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .in(
        "id",
        actionableResolutions.map((resolution) => resolution.task_id),
      );

    if (fetchError) {
      throw new BadRequestException(
        `Failed to load annual missing tasks for review: ${fetchError.message}`,
      );
    }

    const taskNotesById = new Map(
      ((tasks ?? []) as Array<{ id: string; notes: string | null }>).map((task) => [
        task.id,
        task.notes,
      ]),
    );

    for (const resolution of actionableResolutions) {
      const existingNotes = taskNotesById.get(resolution.task_id) ?? null;
      const reviewNote = this.buildMissingTaskReviewNote(resolution, existingNotes);
      const completedDate =
        resolution.execution_date ?? new Date().toISOString().split("T")[0];

      const updatePayload =
        resolution.resolution === "completed"
          ? {
              status: "completed",
              completion_percentage: 100,
              completed_date: completedDate,
              actual_end: `${completedDate}T00:00:00.000Z`,
              notes: reviewNote,
            }
          : {
              status: "cancelled",
              notes: reviewNote,
            };

      const { error: updateError } = await supabase
        .from("tasks")
        .update(updatePayload)
        .eq("id", resolution.task_id)
        .eq("organization_id", organizationId)
        .eq("parcel_id", parcelId);

      if (updateError) {
        throw new BadRequestException(
          `Failed to persist missing task review for task ${resolution.task_id}: ${updateError.message}`,
        );
      }
    }
  }

  private buildMissingTaskReviewNote(
    resolution: MissingTaskResolution,
    existingNotes: string | null,
  ): string {
    const summary =
      resolution.resolution === "completed"
        ? `Annual review: completed on ${resolution.execution_date ?? new Date().toISOString().split("T")[0]}`
        : "Annual review: marked as not done";

    const noteParts = [
      existingNotes?.trim() || null,
      summary,
      resolution.notes ? `Notes: ${resolution.notes}` : null,
    ].filter((value): value is string => typeof value === "string" && value.length > 0);

    return noteParts.join("\n");
  }

  private deriveTaskPeriod(task: TaskRow): string {
    const dateCandidate = task.due_date ?? task.scheduled_start ?? task.created_at;
    const parsedDate = new Date(dateCandidate);
    if (!Number.isFinite(parsedDate.getTime())) {
      return "cette periode";
    }

    const month = parsedDate.toLocaleString("fr-FR", {
      month: "long",
      timeZone: "UTC",
    });

    return month;
  }

  private extractPestTarget(title: string | null): string {
    if (!title || !title.trim()) {
      return "les ravageurs";
    }

    const againstMatch = title.match(/contre\s+(.+)$/i);
    if (againstMatch && againstMatch[1]) {
      return againstMatch[1].trim();
    }

    return title.trim();
  }

  private extractPreviousBaseline(
    calibration: CalibrationRow | null,
  ): Record<string, unknown> {
    if (!calibration) {
      return {};
    }

    const calibrationData = this.toJsonObject(calibration.calibration_data);
    const output = this.toJsonObject(calibrationData.output);

    return {
      calibration_id: calibration.id,
      completed_at: calibration.completed_at,
      health_score: this.toNumber(calibration.health_score),
      yield_potential: this.getPredictedYield(calibration),
      output,
    };
  }

  private async updateAlternanceHistory(
    parcelId: string,
    organizationId: string,
    alternanceStatus: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const nowIso = new Date().toISOString();

    const { data: season } = await supabase
      .from("suivis_saison")
      .select("id, evenements")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!season) {
      return;
    }

    const rawEvents = Array.isArray(season.evenements)
      ? season.evenements
      : [];
    const nextEvents = [
      ...rawEvents,
      {
        type: "annual_alternance_projection",
        date: nowIso,
        alternance_status_next: alternanceStatus,
      },
    ];

    await supabase
      .from("suivis_saison")
      .update({ evenements: nextEvents })
      .eq("id", season.id)
      .eq("organization_id", organizationId);
  }

  private async markCoefficientAdjustmentRequired(
    calibrationId: string,
    organizationId: string,
    deviationPct: number,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { data } = await supabase
      .from("calibrations")
      .select("calibration_data")
      .eq("id", calibrationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!data) {
      return;
    }

    const calibrationData = this.toJsonObject(data.calibration_data);
    const annualData = this.toJsonObject(calibrationData.annual);

    await supabase
      .from("calibrations")
      .update({
        calibration_data: {
          ...calibrationData,
          annual: {
            ...annualData,
            model_adjustment: {
              required: true,
              deviation_pct: deviationPct,
              threshold_pct: 20,
            },
          },
        },
      })
      .eq("id", calibrationId)
      .eq("organization_id", organizationId);
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

  private isMonth(value: number | undefined): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12;
  }

  private isDay(value: number | undefined): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 31;
  }
}
