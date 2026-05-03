import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  CALIBRATION_SATELLITE_INDICES,
} from "../satellite-indices/satellite-cache.service";
import { SatelliteProxyService } from "../satellite-indices/satellite-proxy.service";
import { WeatherProvider } from "../chat/providers/weather.provider";
import { StartCalibrationDto } from "./dto/start-calibration.dto";
import type { AiPhase } from "./calibration-state-machine";
import { getLocalCropReference } from "./crop-reference-loader";
import { detectPhaseAgeFromReferentiel } from "./phase-age-detector";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Max lookback days — must stay within FastAPI weather endpoint limit (365*3 = 1095 days).
 * We use 1090 to leave a small buffer.
 */
// 3 full cycles (Dec→Nov) + buffer = ~40 months ≈ 1280 days
export const MAX_LOOKBACK_DAYS = 1280;

export const NDVI_PERCENTILES = [10, 25, 50, 75, 90];

/** Minimum confidence score (0-100 scale) for active recommendations */
export const MINIMUM_CONFIDENCE_FOR_ACTIVE = 25;

/** Must match `calibrating` outgoing edges in `CalibrationStateMachine`. */
export const CALIBRATING_RECOVERY_TARGETS: ReadonlySet<string> = new Set([
  "calibrated",
  "awaiting_data",
  "ready_calibration",
  "awaiting_nutrition_option",
  "active",
]);

// Re-export for convenience
export { CALIBRATION_SATELLITE_INDICES };

// ═══════════════════════════════════════════════════════════════
// FREE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calibration lookback aligned to agronomic cycle start month.
 *
 * The state machine needs **complete cycles** (Dec→Nov for olive).
 * Lookback anchors to the cycle start month, not the run date, so
 * every returned date range contains N full cycles.
 *
 * | Phase              | Complete cycles needed |
 * |--------------------|-----------------------|
 * | juvenile           | 1                     |
 * | entree_production  | 2                     |
 * | pleine_production  | 3                     |
 * | senescence         | 3                     |
 * | unknown / default  | 2                     |
 *
 * Cycle start month is read from ``stades_bbch[0].mois[0]`` in the
 * referential (Dec for all current crops).
 */

const MONTH_ABBR_TO_NUM: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function getCycleStartMonth(ref: Record<string, unknown> | null): number {
  if (!ref) return 12; // default Dec
  const stades = ref.stades_bbch;
  if (!Array.isArray(stades) || stades.length === 0) return 12;
  const firstStade = stades[0] as Record<string, unknown>;
  const mois = firstStade?.mois;
  if (Array.isArray(mois) && mois.length > 0) {
    return MONTH_ABBR_TO_NUM[String(mois[0])] ?? 12;
  }
  return 12;
}

function cyclesNeededForPhase(phase: string): number {
  switch (phase) {
    case 'juvenile':
      return 1;
    case 'pleine_production':
    case 'senescence':
    case 'maturite_avancee':
      return 3;
    case 'entree_production':
    default:
      return 2;
  }
}

export function getCalibrationLookbackDate(
  plantingYear: number | null,
  cropType?: string | null,
  system?: string | null,
): string {
  const now = new Date();
  const ref = cropType ? getLocalCropReference(cropType) : null;
  const cycleStartMonth = getCycleStartMonth(ref);

  // Resolve maturity phase
  let phase = 'unknown';
  if (plantingYear != null && cropType) {
    const ageAns = now.getFullYear() - plantingYear;
    if (ref) {
      phase = detectPhaseAgeFromReferentiel(ageAns, system ?? 'intensif', ref);
    }
  }

  const cycles = cyclesNeededForPhase(phase);

  // Find the most recent cycle start month before today (UTC to avoid TZ drift)
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1; // 1-indexed
  const cycleYear = nowMonth >= cycleStartMonth ? nowYear : nowYear - 1;

  // Go back N full cycles from the most recent cycle start
  const startYear = cycleYear - cycles;
  const startStr = `${startYear}-${String(cycleStartMonth).padStart(2, "0")}-01`;

  // Clamp: never exceed MAX_LOOKBACK_DAYS from today
  const maxStart = new Date();
  maxStart.setDate(maxStart.getDate() - MAX_LOOKBACK_DAYS);
  const maxStartStr = maxStart.toISOString().split("T")[0];

  return startStr < maxStartStr ? maxStartStr : startStr;
}

export function resolveCalibratingRecoveryPhase(profileSnapshot: unknown): AiPhase {
  const snap = profileSnapshot as Record<string, unknown> | null | undefined;
  const recovery = snap?.recovery as Record<string, unknown> | undefined;
  const raw = recovery?.previous_ai_phase;
  if (typeof raw === "string" && CALIBRATING_RECOVERY_TARGETS.has(raw)) {
    return raw as AiPhase;
  }
  return "ready_calibration";
}

/**
 * Résout les variétés combinées vers une variété référentielle unique.
 * "Menara/Haouzia" → "Menara" (paramètres INRA Maroc, fallback conservateur).
 */
export function resolveVarietyForCalibration(
  variety: string | null | undefined,
): string | null | undefined {
  if (!variety) return variety;
  if (variety.toLowerCase() === "menara/haouzia") return "Menara";
  return variety;
}

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export type ZoneClassification = "optimal" | "normal" | "stressed";
export type ParcelAiPhase =
  | "awaiting_data"
  | "calibrating"
  | "calibrated"
  | "awaiting_nutrition_option"
  | "active"
  | "ready_calibration"
  | string;
export type JsonObject = Record<string, unknown>;
export type CalibrationType = "initial" | "F2_partial" | "F3_complete";
export type RecalibrationMotif =
  | "water_source_change"
  | "irrigation_change"
  | "new_soil_analysis"
  | "new_water_analysis"
  | "new_foliar_analysis"
  | "parcel_restructure"
  | "other";

export interface NdviThresholds {
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

export interface ParcelContext {
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

export interface CropReferenceRow {
  reference_data?: unknown;
}

export interface SatelliteIndexRow {
  date: string;
  index_name: string;
  mean_value: number | string | null;
  cloud_coverage_percentage: number | null;
}

export interface WeatherDailyRow {
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
  chill_hours?: number | string | null;
  /** Generic GDD access — use gddColumn() to get the right key */
  [key: `gdd_${string}`]: number | string | null | undefined;
}

export interface AnalysisRow {
  analysis_type: string;
  analysis_date: string;
  data: unknown;
}

export interface HarvestRow {
  harvest_date: string | null;
  quantity: number | string | null;
  unit: string | null;
  quality_grade: string | null;
  quality_score: number | null;
}

export interface CalibrationResponse {
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

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class CalibrationDataService {
  private readonly logger = new Logger(CalibrationDataService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly satelliteProxy: SatelliteProxyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING METHODS
  // ═══════════════════════════════════════════════════════════════

  async getParcelContext(
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
      this.logger.warn(
        `[getParcelContext] Parcel not found in DB — parcelId: ${parcelId}, supabaseError: ${error?.message}`,
      );
      throw new NotFoundException("Parcel not found");
    }

    this.logger.log(
      `[getParcelContext] Parcel found — parcel.org: ${parcel.organization_id}, received org: ${organizationId}`,
    );

    const belongsToOrganization =
      this.matchesOrganization(parcel.organization_id, organizationId) ||
      this.matchesOrganization(
        this.extractFarmOrganizationId(parcel.farms),
        organizationId,
      );

    if (!belongsToOrganization) {
      this.logger.warn(
        `[getParcelContext] Org mismatch — parcel.org: ${parcel.organization_id}, received: ${organizationId}`,
      );
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

  async fetchNdviThresholds(
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

  async fetchNdviValues(
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
  async getMissingSatelliteIndexNames(
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

  /**
   * Fetch all July-August NDVI mean values for vegetation pre-check.
   * Returns raw numeric array — caller applies thresholds.
   */
  async fetchSummerNdvi(
    parcelId: string,
    organizationId: string,
  ): Promise<number[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("satellite_indices_data")
      .select("date, mean_value")
      .eq("organization_id", organizationId)
      .eq("parcel_id", parcelId)
      .eq("index_name", "NDVI");

    if (error) {
      this.logger.warn(
        `[fetchSummerNdvi] Failed to fetch NDVI for parcel ${parcelId}: ${error.message}`,
      );
      return [];
    }

    const summerValues: number[] = [];
    for (const row of data ?? []) {
      const dateStr = row.date as string;
      if (!dateStr) continue;
      const month = new Date(dateStr).getMonth() + 1; // 1-indexed
      if (month !== 7 && month !== 8) continue;
      const value = this.toNumber(row.mean_value);
      if (value !== null) {
        summerValues.push(value);
      }
    }

    return summerValues;
  }

  async fetchSatelliteImages(
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
      .in("index_name", [...CALIBRATION_SATELLITE_INDICES])
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

  async fetchWeatherRows(
    parcel: ParcelContext,
    sinceDate?: string,
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
    const effectiveSince = sinceDate ?? getCalibrationLookbackDate(parcel.plantingYear, parcel.cropType, parcel.system);

    const { data, error } = await supabase
      .from("weather_daily_data")
      .select("*")
      .eq("latitude", roundedLatitude)
      .eq("longitude", roundedLongitude)
      .gte("date", effectiveSince)
      .order("date", { ascending: true });

    if (error) {
      throw new BadRequestException(
        `Failed to fetch weather rows: ${error.message}`,
      );
    }

    const rows = (data ?? []) as WeatherDailyRow[];
    this.logger.log(
      `[weather] fetchWeatherRows parcel=${parcel.id} orgGrid=(lat=${roundedLatitude}, lon=${roundedLongitude}) since=${effectiveSince} rowCount=${rows.length}`,
    );
    return rows;
  }

  async syncWeatherData(
    parcel: ParcelContext,
    organizationId: string,
    authToken?: string,
    sinceDate?: string,
  ): Promise<void> {
    if (!parcel.boundary.length) {
      return;
    }

    const wgs84Boundary = WeatherProvider.ensureWGS84(parcel.boundary);
    const { latitude, longitude } =
      WeatherProvider.calculateCentroid(wgs84Boundary);
    const roundedLatitude = this.roundCoordinate(latitude, 2);
    const roundedLongitude = this.roundCoordinate(longitude, 2);
    const startDate = sinceDate ?? getCalibrationLookbackDate(parcel.plantingYear, parcel.cropType, parcel.system);
    const endDate = new Date().toISOString().split("T")[0];

    this.logger.log(
      `[weather] syncWeatherData parcel=${parcel.id} → satellite GET /weather/historical grid=(lat=${roundedLatitude}, lon=${roundedLongitude}) range=${startDate}..${endDate}`,
    );

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

    // FastAPI /weather/historical now uses cache-aside (fetch_with_db_cache) and
    // persists weather to weather_daily_data with pre-computed GDD columns.
    // No secondary upsert needed here — that would overwrite GDD columns with NULL.
    if (!body.data?.length) {
      this.logger.warn(
        `[weather] sync returned 0 rows parcel=${parcel.id} grid=(lat=${roundedLatitude}, lon=${roundedLongitude}) range=${startDate}..${endDate} — satellite/Open-Meteo/Supabase cache path; parcel /weather page uses Nest→Open-Meteo and may still show charts`,
      );
    } else {
      this.logger.log(
        `Weather sync triggered for parcel ${parcel.id}: ${body.data.length} rows from satellite historical`,
      );
    }
  }

  async fetchAnalyses(
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

  async fetchHarvestRecords(
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

  async fetchCropReferenceData(
    cropType: string,
  ): Promise<Record<string, unknown>> {
    // Disk first — JSON files are the source of truth for referentials.
    // Edits to DATA_*.json take effect immediately without DB sync.
    const localRef = getLocalCropReference(cropType);
    if (localRef) {
      return localRef;
    }

    // Fallback to DB (production without bundled files, or Docker)
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
        `DB crop reference lookup failed for "${cropType}": ${error.message}`,
      );
    }

    this.logger.warn(
      `No crop reference found for "${cropType}" (disk or DB)`,
    );
    return {};
  }

  async getLatestCompletedCalibration(
    parcelId: string,
    organizationId: string,
  ): Promise<CalibrationRecord | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from("calibrations")
      .select("*")
      .eq("parcel_id", parcelId)
      .eq("organization_id", organizationId)
      .in("status", ["validated", "awaiting_validation"])
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

  getAffectedBlocksForMotif(motif: RecalibrationMotif): string[] {
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

  async buildUpdatedBlocksForMotif(
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

  async fetchLatestAnalysesByTypes(
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

  // ═══════════════════════════════════════════════════════════════
  // EXTRACTION & UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  extractPreviousBaseline(calibration: CalibrationRecord): JsonObject {
    const calibrationData = this.toJsonObject(calibration.profile_snapshot);
    const output = this.toJsonObject(calibrationData.output);

    if (Object.keys(output).length > 0) {
      return output;
    }

    return calibrationData;
  }

  mapCalibrationHistoryRows(
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

  hasMissingGdd(rows: WeatherDailyRow[], cropType: string): boolean {
    const column = `gdd_${cropType}` as keyof WeatherDailyRow;
    return rows.some((row) => this.toNumber(row[column]) === null);
  }

  deriveZoneClassification(
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

  extractIndexP50(
    output: CalibrationResponse,
    indexName: string,
  ): number | null {
    const percentile = output.step3?.global_percentiles?.[indexName]?.p50;
    return this.toNumber(percentile);
  }

  extractPhenologyStage(output: CalibrationResponse): string | null {
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

  extractIndexPercentile(
    output: CalibrationResponse,
    indexName: string,
    percentile: string,
  ): number | null {
    const value = output.step3?.global_percentiles?.[indexName]?.[percentile];
    return this.toNumber(value);
  }

  extractModeCalibrage(output: CalibrationResponse): string | null {
    const raw = (output as unknown as Record<string, unknown>).mode_calibrage;
    return typeof raw === "string" ? raw : null;
  }

  extractPhaseAge(
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

  extractCoefficientEtat(output: CalibrationResponse): number | null {
    const raw = (output as unknown as Record<string, unknown>).coefficient_etat_parcelle;
    return this.toNumber(raw);
  }

  /**
   * Recalculate gdd_at_entry for phase transitions using pre-computed GDD
   * stored in weather_gdd_daily. Just SUMs between date ranges — no formula.
   * Persists corrected values back to calibrations.baseline_data.
   */
  async recalculatePhaseGdd(
    phenology: Record<string, unknown>,
    latitude: number,
    longitude: number,
    cropType: string,
    calibrationId?: string,
    organizationId?: string,
  ): Promise<Record<string, unknown>> {
    const phaseTimeline = phenology.phase_timeline as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(phaseTimeline) || phaseTimeline.length === 0) {
      return phenology;
    }

    const supabase = this.databaseService.getAdminClient();
    const roundedLat = this.roundCoordinate(latitude, 2);
    const roundedLon = this.roundCoordinate(longitude, 2);
    const resetPhases = new Set(['repos', 'DORMANCE']);

    const updatedTimeline = await Promise.all(
      phaseTimeline.map(async (tl) => {
        const transitions = tl.transitions as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(transitions)) return tl;

        // Find cycle start = first non-repos transition
        let cycleStartDate: string | null = null;
        for (const t of transitions) {
          if (!resetPhases.has(t.phase as string)) {
            cycleStartDate = t.start_date as string;
            break;
          }
        }

        const updatedTransitions = await Promise.all(
          transitions.map(async (t) => {
            const phase = t.phase as string;
            const startDate = t.start_date as string;

            if (resetPhases.has(phase)) {
              return { ...t, gdd_at_entry: 0 };
            }
            if (!cycleStartDate || !startDate) return t;

            // SUM(gdd_daily) from cycle start to this transition
            const { data: rows } = await supabase
              .from('weather_gdd_daily')
              .select('gdd_daily')
              .eq('latitude', roundedLat)
              .eq('longitude', roundedLon)
              .eq('crop_type', cropType.toLowerCase())
              .gte('date', cycleStartDate)
              .lt('date', startDate);

            const gddSum = (rows ?? []).reduce(
              (s: number, r: { gdd_daily: number | null }) => s + (Number(r.gdd_daily) || 0),
              0,
            );
            return { ...t, gdd_at_entry: Math.round(gddSum * 100) / 100 };
          }),
        );

        return { ...tl, transitions: updatedTransitions };
      }),
    );

    const updatedPhenology = { ...phenology, phase_timeline: updatedTimeline };

    // Persist corrected values back to DB
    if (calibrationId && organizationId) {
      const { data: cal } = await supabase
        .from('calibrations')
        .select('baseline_data')
        .eq('id', calibrationId)
        .eq('organization_id', organizationId)
        .single();

      if (cal?.baseline_data) {
        const baseline = typeof cal.baseline_data === 'object'
          ? { ...cal.baseline_data as Record<string, unknown> }
          : {};
        baseline.phenology = updatedPhenology;
        await supabase
          .from('calibrations')
          .update({ baseline_data: baseline })
          .eq('id', calibrationId)
          .eq('organization_id', organizationId);
        this.logger.log(`Persisted recalculated GDD for calibration ${calibrationId}`);
      }
    }

    return updatedPhenology;
  }

  extractBaselineData(output: CalibrationResponse): Record<string, unknown> {
    return {
      percentiles: output.step3?.global_percentiles ?? null,
      phenology: output.step4 ?? null,
      zones: output.step7 ?? null,
    };
  }

  extractDiagnosticData(output: CalibrationResponse): Record<string, unknown> | null {
    const diagnostic = (output as unknown as Record<string, unknown>).diagnostic_explicatif;
    if (this.isJsonObject(diagnostic)) return diagnostic;
    return null;
  }

  extractScoresDetail(output: CalibrationResponse): Record<string, unknown> {
    return {
      health: output.step8 ?? null,
      confidence: output.confidence ?? null,
    };
  }

  extractFarmOrganizationId(farms: unknown): string | null {
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

  matchesOrganization(
    candidateOrganizationId: string | null,
    organizationId: string,
  ): boolean {
    return (
      typeof candidateOrganizationId === "string" &&
      candidateOrganizationId.trim().toLowerCase() ===
        organizationId.trim().toLowerCase()
    );
  }

  parseBoundary(boundary: unknown): number[][] {
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

  roundCoordinate(value: number, precision: number): number {
    return Number(value.toFixed(precision));
  }

  isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  toJsonObject(value: unknown): JsonObject {
    return this.isJsonObject(value) ? value : {};
  }

  buildDataQualityFlags(calibration: CalibrationRecord): string[] {
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
  toInteger(value: unknown): number | null {
    const num = this.toNumber(value);
    return num !== null ? Math.round(num) : null;
  }

  toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  toHectares(
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
