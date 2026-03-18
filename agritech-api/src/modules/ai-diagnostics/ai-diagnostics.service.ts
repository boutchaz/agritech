import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WeatherProvider } from '../chat/providers/weather.provider';

const DEFAULT_LOOKBACK_DAYS = 30;
const TRENDS_LOOKBACK_DAYS = 90;
const TREND_STABLE_THRESHOLD = 0.001;
const NDVI_STABLE_DELTA = 0.05;
const NDRE_HIGH_DELTA = 0.03;
const NDRE_LOW_DELTA = -0.03;

export type AiScenarioCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
export type AiTrendClassification = 'improving' | 'stable' | 'declining';
export type AiWaterBalanceStatus = 'surplus' | 'balanced' | 'deficit';
export type AiNdviBand = 'above_optimal' | 'optimal' | 'vigilance' | 'alert';
export type AiIndexStatus = 'high' | 'normal' | 'low';

export interface AiDiagnosticsIndicators {
  reading_date: string;
  baseline_ndvi: number;
  current_ndvi: number;
  ndvi_delta: number;
  ndvi_band: AiNdviBand;
  ndvi_trend: AiTrendClassification;
  baseline_ndre: number | null;
  current_ndre: number | null;
  ndre_delta: number | null;
  ndre_status: AiIndexStatus;
  ndre_trend: AiTrendClassification;
  baseline_ndmi: number | null;
  current_ndmi: number | null;
  ndmi_delta: number | null;
  ndmi_trend: AiTrendClassification;
  water_balance: number | null;
  weather_anomaly: boolean;
}

export interface AiDiagnosticsResponse {
  scenario: string;
  scenario_code: AiScenarioCode;
  confidence: number;
  description: string;
  indicators: AiDiagnosticsIndicators;
  observation_only?: boolean;
}

export interface AiPhenologyResponse {
  crop_type: string;
  month: number;
  stage: string;
  stage_code: string;
  description: string;
}

export interface AiWaterBalanceResponse {
  water_balance: number;
  status: AiWaterBalanceStatus;
  total_precip: number;
  total_et0: number;
}

export interface AiTrendsResponse {
  ndvi_trend: AiTrendClassification;
  slope: number;
  r_squared: number;
  period_days: number;
}

interface CalibrationRow {
  baseline_ndvi: number | string | null;
  baseline_ndre: number | string | null;
  baseline_ndmi: number | string | null;
  calibration_data: unknown;
}

interface AiParcelContext {
  id: string;
  cropType: string;
  boundary: unknown;
  aiPhase: string;
  aiObservationOnly: boolean;
}

interface AiSatelliteReadingRow {
  date: string;
  index_name: string;
  mean_value: number | string | null;
}

interface AiSatelliteReading {
  date: string;
  ndvi: number;
  ndre: number | null;
  ndmi: number | null;
}

interface AiWeatherReadingRow {
  date: string;
  precipitation_sum: number | string | null;
  et0_fao_evapotranspiration: number | string | null;
}

interface AiWeatherReading {
  date: string;
  precipitation_sum: number;
  et0_fao_evapotranspiration: number;
}

interface NdviThresholds {
  optimal: [number, number];
  vigilance: number;
  alert: number;
}

interface RegressionResult {
  slope: number;
  rSquared: number;
}

interface ScenarioDecision {
  code: AiScenarioCode;
  scenario: string;
  description: string;
  confidence: number;
}

interface PhenologyApiResponse {
  stage: string;
  stage_code: string;
  description: string;
}

@Injectable()
export class AiDiagnosticsService {
  private readonly logger = new Logger(AiDiagnosticsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async getDiagnostics(parcelId: string, organizationId: string): Promise<AiDiagnosticsResponse> {
    const parcelContext = await this.getParcelContext(parcelId, organizationId);

    if (parcelContext.aiPhase !== 'active') {
      throw new BadRequestException(
        `Diagnostics are only available for parcels in active AI phase (current: ${parcelContext.aiPhase})`,
      );
    }

    const [calibration, satelliteReadings, weatherReadings] = await Promise.all([
      this.getLatestCalibration(parcelId, organizationId),
      this.fetchSatelliteReadings(parcelId, organizationId, DEFAULT_LOOKBACK_DAYS),
      this.fetchWeatherReadings(parcelContext, DEFAULT_LOOKBACK_DAYS),
    ]);

    if (!satelliteReadings.length) {
      throw new NotFoundException('No satellite readings found for parcel');
    }

    const currentReading = satelliteReadings[satelliteReadings.length - 1];
    const firstReading = satelliteReadings[0];
    const thresholds = this.extractThresholds(
      calibration?.calibration_data ?? null,
      (calibration ? this.toNumber(calibration.baseline_ndvi) : null) ?? firstReading.ndvi,
    );
    const baselineNdvi = (calibration ? this.toNumber(calibration.baseline_ndvi) : null) ?? firstReading.ndvi;
    const baselineNdre = calibration ? this.toNumber(calibration.baseline_ndre) : (firstReading.ndre ?? null);
    const baselineNdmi = calibration ? this.toNumber(calibration.baseline_ndmi) : (firstReading.ndmi ?? null);
    const ndviRegression = this.calculateRegression(satelliteReadings.map((reading) => reading.ndvi));
    const ndreRegression = this.calculateRegression(
      satelliteReadings
        .map((reading) => reading.ndre)
        .filter((value): value is number => value !== null),
    );
    const ndmiRegression = this.calculateRegression(
      satelliteReadings
        .map((reading) => reading.ndmi)
        .filter((value): value is number => value !== null),
    );
    const currentNdre = this.getLatestMetric(satelliteReadings, 'ndre');
    const currentNdmi = this.getLatestMetric(satelliteReadings, 'ndmi');
    const waterBalance = weatherReadings.length
      ? this.computeWaterBalance(weatherReadings).water_balance
      : null;
    const ndviDelta = this.round(currentReading.ndvi - baselineNdvi);
    const ndreDelta = baselineNdre !== null && currentNdre !== null
      ? this.round(currentNdre - baselineNdre)
      : null;
    const ndmiDelta = baselineNdmi !== null && currentNdmi !== null
      ? this.round(currentNdmi - baselineNdmi)
      : null;
    const ndviTrend = this.classifyTrend(ndviRegression.slope);
    const ndreTrend = this.classifyTrend(ndreRegression.slope);
    const ndmiTrend = this.classifyTrend(ndmiRegression.slope);
    const ndviBand = this.classifyNdviBand(currentReading.ndvi, thresholds);
    const ndreStatus = this.classifyIndexStatus(ndreDelta);
    const ndmiStatus = this.classifyIndexStatus(ndmiDelta);
    const weatherAnomaly = waterBalance !== null && waterBalance < -20;
    const recentMinimumNdvi = satelliteReadings.reduce(
      (minimum, reading) => Math.min(minimum, reading.ndvi),
      currentReading.ndvi,
    );
    const stableNdvi =
      ndviTrend === 'stable' && Math.abs(currentReading.ndvi - baselineNdvi) <= NDVI_STABLE_DELTA;
    const allIndicesNormal =
      ndreStatus === 'normal' &&
      ndmiStatus === 'normal' &&
      ndreTrend !== 'declining' &&
      ndmiTrend !== 'declining' &&
      currentReading.ndvi >= thresholds.vigilance;

    const scenario = this.determineScenario({
      currentNdvi: currentReading.ndvi,
      ndviBand,
      ndviTrend,
      ndreTrend,
      ndmiTrend,
      ndreStatus,
      ndmiStatus,
      stableNdvi,
      allIndicesNormal,
      weatherAnomaly,
      recentMinimumNdvi,
      thresholds,
    });

    return {
      scenario: scenario.scenario,
      scenario_code: scenario.code,
      confidence: scenario.confidence,
      description: scenario.description,
      indicators: {
        reading_date: currentReading.date,
        baseline_ndvi: this.round(baselineNdvi),
        current_ndvi: this.round(currentReading.ndvi),
        ndvi_delta: ndviDelta,
        ndvi_band: ndviBand,
        ndvi_trend: ndviTrend,
        baseline_ndre: baselineNdre === null ? null : this.round(baselineNdre),
        current_ndre: currentNdre === null ? null : this.round(currentNdre),
        ndre_delta: ndreDelta,
        ndre_status: ndreStatus,
        ndre_trend: ndreTrend,
        baseline_ndmi: baselineNdmi === null ? null : this.round(baselineNdmi),
        current_ndmi: currentNdmi === null ? null : this.round(currentNdmi),
        ndmi_delta: ndmiDelta,
        ndmi_trend: ndmiTrend,
        water_balance: waterBalance,
        weather_anomaly: weatherAnomaly,
      },
      ...(parcelContext.aiObservationOnly ? { observation_only: true } : {}),
    };
  }

  async getPhenology(parcelId: string, organizationId: string): Promise<AiPhenologyResponse> {
    const parcel = await this.getParcelContext(parcelId, organizationId);
    const satelliteReadings = await this.fetchSatelliteReadings(
      parcelId,
      organizationId,
      DEFAULT_LOOKBACK_DAYS,
    );
    const currentReading = satelliteReadings[satelliteReadings.length - 1] ?? null;
    const month = new Date().getMonth() + 1;
    const response = await this.postCalibrationApi<PhenologyApiResponse>(
      '/api/calibration/phenology',
      {
        crop_type: parcel.cropType,
        month,
        ndvi: currentReading?.ndvi ?? 0,
        ndre: currentReading?.ndre ?? 0,
      },
      organizationId,
    );

    return {
      crop_type: parcel.cropType,
      month,
      stage: response.stage,
      stage_code: response.stage_code,
      description: response.description,
    };
  }

  async getWaterBalance(
    parcelId: string,
    organizationId: string,
  ): Promise<AiWaterBalanceResponse> {
    const parcelContext = await this.getParcelContext(parcelId, organizationId);
    const weatherReadings = await this.fetchWeatherReadings(parcelContext, DEFAULT_LOOKBACK_DAYS);

    if (!weatherReadings.length) {
      throw new NotFoundException('No weather readings found for parcel');
    }

    return this.computeWaterBalance(weatherReadings);
  }

  async getTrends(parcelId: string, organizationId: string): Promise<AiTrendsResponse> {
    await this.getParcelContext(parcelId, organizationId);
    const satelliteReadings = await this.fetchSatelliteReadings(
      parcelId,
      organizationId,
      TRENDS_LOOKBACK_DAYS,
    );

    if (satelliteReadings.length < 2) {
      throw new NotFoundException('At least two satellite readings are required for trend analysis');
    }

    const regression = this.calculateRegression(satelliteReadings.map((reading) => reading.ndvi));

    return {
      ndvi_trend: this.classifyTrend(regression.slope),
      slope: this.round(regression.slope, 6),
      r_squared: this.round(regression.rSquared, 4),
      period_days: this.calculatePeriodDays(satelliteReadings),
    };
  }

  private async getParcelContext(
    parcelId: string,
    organizationId: string,
  ): Promise<AiParcelContext> {
    const supabase = this.databaseService.getAdminClient();
    const { data: parcel, error } = await supabase
      .from('parcels')
      .select('id, crop_type, boundary, organization_id, ai_phase, ai_observation_only, farms(organization_id)')
      .eq('id', parcelId)
      .single();

    if (error || !parcel) {
      throw new NotFoundException('Parcel not found');
    }

    const belongsToOrganization =
      this.matchesOrganization(parcel.organization_id, organizationId) ||
      this.matchesOrganization(
        this.extractFarmOrganizationId(parcel.farms),
        organizationId,
      );

    if (!belongsToOrganization) {
      throw new NotFoundException('Parcel not found');
    }

    if (!parcel.crop_type) {
      throw new BadRequestException('Parcel crop type is required');
    }

    return {
      id: parcel.id,
      cropType: parcel.crop_type,
      boundary: parcel.boundary,
      aiPhase: typeof parcel.ai_phase === 'string' ? parcel.ai_phase : 'disabled',
      aiObservationOnly: parcel.ai_observation_only === true,
    };
  }

  private async getLatestCalibration(
    parcelId: string,
    organizationId: string,
  ): Promise<CalibrationRow | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('calibrations')
      .select('baseline_ndvi, baseline_ndre, baseline_ndmi, calibration_data')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to fetch latest calibration for parcel ${parcelId}: ${error.message}`,
      );
      throw new BadRequestException(`Failed to fetch calibration: ${error.message}`);
    }

    return (data as CalibrationRow) ?? null;
  }

  private async fetchSatelliteReadings(
    parcelId: string,
    organizationId: string,
    lookbackDays: number,
  ): Promise<AiSatelliteReading[]> {
    const supabase = this.databaseService.getAdminClient();
    const sinceDate = this.getLookbackDate(lookbackDays);
    const { data, error } = await supabase
      .from('satellite_indices_data')
      .select('date, index_name, mean_value')
      .eq('organization_id', organizationId)
      .eq('parcel_id', parcelId)
      .in('index_name', ['NDVI', 'NDRE', 'NDMI'])
      .gte('date', sinceDate)
      .order('date', { ascending: true })
      .order('index_name', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch satellite diagnostics data for parcel ${parcelId}: ${error.message}`,
      );
      throw new BadRequestException(`Failed to fetch satellite readings: ${error.message}`);
    }

    return this.pivotSatelliteReadings(data as AiSatelliteReadingRow[]);
  }

  private async fetchWeatherReadings(
    parcel: AiParcelContext,
    lookbackDays: number,
  ): Promise<AiWeatherReading[]> {
    const boundary = this.parseBoundary(parcel.boundary);
    if (!boundary.length) {
      return [];
    }

    const supabase = this.databaseService.getAdminClient();
    const { latitude, longitude } = WeatherProvider.calculateCentroid(
      WeatherProvider.ensureWGS84(boundary),
    );
    const roundedLat = Math.round(latitude * 100) / 100;
    const roundedLon = Math.round(longitude * 100) / 100;
    const sinceDate = this.getLookbackDate(lookbackDays);
    const { data, error } = await supabase
      .from('weather_daily_data')
      .select('date, precipitation_sum, et0_fao_evapotranspiration')
      .eq('latitude', roundedLat)
      .eq('longitude', roundedLon)
      .gte('date', sinceDate)
      .order('date', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch weather diagnostics data for parcel ${parcel.id}: ${error.message}`,
      );
      throw new BadRequestException(`Failed to fetch weather readings: ${error.message}`);
    }

    return (data as AiWeatherReadingRow[])
      .map((row) => ({
        date: row.date,
        precipitation_sum: this.toNumber(row.precipitation_sum),
        et0_fao_evapotranspiration: this.toNumber(row.et0_fao_evapotranspiration),
      }))
      .filter(
        (reading): reading is AiWeatherReading =>
          typeof reading.date === 'string' &&
          typeof reading.precipitation_sum === 'number' &&
          typeof reading.et0_fao_evapotranspiration === 'number',
      );
  }

  private pivotSatelliteReadings(rows: AiSatelliteReadingRow[]): AiSatelliteReading[] {
    const readingsByDate = new Map<
      string,
      { date: string; ndvi: number | null; ndre: number | null; ndmi: number | null }
    >();

    for (const row of rows) {
      const reading = readingsByDate.get(row.date) ?? {
        date: row.date,
        ndvi: null,
        ndre: null,
        ndmi: null,
      };

      const value = this.toNumber(row.mean_value);
      const indexName = row.index_name.toUpperCase();
      if (indexName === 'NDVI') {
        reading.ndvi = value;
      } else if (indexName === 'NDRE') {
        reading.ndre = value;
      } else if (indexName === 'NDMI') {
        reading.ndmi = value;
      }

      readingsByDate.set(row.date, reading);
    }

    return Array.from(readingsByDate.values())
      .filter(
        (
          reading,
        ): reading is { date: string; ndvi: number; ndre: number | null; ndmi: number | null } =>
          typeof reading.date === 'string' && typeof reading.ndvi === 'number',
      )
      .map((reading) => ({
        date: reading.date,
        ndvi: reading.ndvi,
        ndre: reading.ndre,
        ndmi: reading.ndmi,
      }));
  }

  private computeWaterBalance(weatherReadings: AiWeatherReading[]): AiWaterBalanceResponse {
    const totalPrecip = weatherReadings.reduce(
      (sum, reading) => sum + reading.precipitation_sum,
      0,
    );
    const totalEt0 = weatherReadings.reduce(
      (sum, reading) => sum + reading.et0_fao_evapotranspiration,
      0,
    );
    const waterBalance = this.round(totalPrecip - totalEt0, 2);

    return {
      water_balance: waterBalance,
      status: this.classifyWaterBalance(waterBalance),
      total_precip: this.round(totalPrecip, 2),
      total_et0: this.round(totalEt0, 2),
    };
  }

  private determineScenario(input: {
    currentNdvi: number;
    ndviBand: AiNdviBand;
    ndviTrend: AiTrendClassification;
    ndreTrend: AiTrendClassification;
    ndmiTrend: AiTrendClassification;
    ndreStatus: AiIndexStatus;
    ndmiStatus: AiIndexStatus;
    stableNdvi: boolean;
    allIndicesNormal: boolean;
    weatherAnomaly: boolean;
    recentMinimumNdvi: number;
    thresholds: NdviThresholds;
  }): ScenarioDecision {
    if (input.ndviBand === 'alert' && input.ndreStatus === 'low') {
      return {
        code: 'D',
        scenario: 'Severe stress detected',
        description: 'NDVI is below the alert threshold and NDRE confirms a severe vegetation stress pattern.',
        confidence: 0.85,
      };
    }

    if (input.ndviBand === 'above_optimal' && input.ndreStatus === 'high') {
      return {
        code: 'A',
        scenario: 'Excellent vegetative state',
        description: 'Current NDVI exceeds the optimal ceiling while NDRE remains high, indicating exceptional canopy vigor.',
        confidence: 0.9,
      };
    }

    if (input.stableNdvi && input.ndmiTrend === 'declining') {
      return {
        code: 'E',
        scenario: 'Water stress developing',
        description: 'NDVI stays stable, but NDMI is declining and points to emerging water limitation.',
        confidence: 0.8,
      };
    }

    if (input.ndviTrend === 'declining' && input.weatherAnomaly) {
      return {
        code: 'F',
        scenario: 'Climate-induced stress',
        description: 'NDVI is trending downward while recent weather balance is anomalous, suggesting climate-driven stress.',
        confidence: 0.7,
      };
    }

    if (
      input.ndviTrend === 'improving' &&
      input.recentMinimumNdvi < input.thresholds.vigilance
    ) {
      return {
        code: 'G',
        scenario: 'Recovery phase',
        description: 'NDVI is improving after a stressed period, which indicates a recovery trajectory.',
        confidence: 0.75,
      };
    }

    if (input.ndviBand === 'vigilance' && input.ndreTrend === 'declining') {
      return {
        code: 'C',
        scenario: 'Moderate stress detected',
        description: 'NDVI is in the vigilance zone and NDRE is declining, pointing to moderate crop stress.',
        confidence: 0.75,
      };
    }

    if (input.stableNdvi && input.allIndicesNormal) {
      return {
        code: 'H',
        scenario: 'Normal state',
        description: 'NDVI is stable near baseline and the supporting indices remain within expected bounds.',
        confidence: 0.85,
      };
    }

    if (input.ndviBand === 'optimal' && input.ndreStatus === 'normal') {
      return {
        code: 'B',
        scenario: 'Good vegetative state',
        description: 'NDVI sits in the optimal range and NDRE remains normal, indicating good overall vegetation status.',
        confidence: 0.8,
      };
    }

    return {
      code: 'H',
      scenario: 'Normal state',
      description: 'Indicators remain broadly consistent with the parcel baseline and no major stress signature is detected.',
      confidence: 0.85,
    };
  }

  private classifyNdviBand(value: number, thresholds: NdviThresholds): AiNdviBand {
    if (value > thresholds.optimal[1]) {
      return 'above_optimal';
    }

    if (value >= thresholds.optimal[0]) {
      return 'optimal';
    }

    if (value >= thresholds.vigilance) {
      return 'vigilance';
    }

    return 'alert';
  }

  private classifyIndexStatus(delta: number | null): AiIndexStatus {
    if (delta === null) {
      return 'normal';
    }

    if (delta >= NDRE_HIGH_DELTA) {
      return 'high';
    }

    if (delta <= NDRE_LOW_DELTA) {
      return 'low';
    }

    return 'normal';
  }

  private classifyWaterBalance(balance: number): AiWaterBalanceStatus {
    if (balance > 0) {
      return 'surplus';
    }

    if (balance >= -20) {
      return 'balanced';
    }

    return 'deficit';
  }

  private classifyTrend(slope: number): AiTrendClassification {
    if (slope > TREND_STABLE_THRESHOLD) {
      return 'improving';
    }

    if (slope < -TREND_STABLE_THRESHOLD) {
      return 'declining';
    }

    return 'stable';
  }

  private calculateRegression(values: number[]): RegressionResult {
    if (values.length < 2) {
      return { slope: 0, rSquared: 1 };
    }

    const xMean = (values.length - 1) / 2;
    const yMean = values.reduce((sum, value) => sum + value, 0) / values.length;

    let numerator = 0;
    let denominator = 0;
    for (let index = 0; index < values.length; index += 1) {
      const xDelta = index - xMean;
      const yDelta = values[index] - yMean;
      numerator += xDelta * yDelta;
      denominator += xDelta * xDelta;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;
    const totalSumSquares = values.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
    const residualSumSquares = values.reduce((sum, value, index) => {
      const predicted = intercept + slope * index;
      return sum + (value - predicted) ** 2;
    }, 0);
    const rSquared = totalSumSquares === 0 ? 1 : 1 - residualSumSquares / totalSumSquares;

    return {
      slope,
      rSquared,
    };
  }

  private calculatePeriodDays(readings: AiSatelliteReading[]): number {
    if (!readings.length) {
      return 0;
    }

    const firstDate = new Date(readings[0].date).getTime();
    const lastDate = new Date(readings[readings.length - 1].date).getTime();
    if (Number.isNaN(firstDate) || Number.isNaN(lastDate)) {
      return readings.length;
    }

    const diffDays = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }

  private extractThresholds(calibrationData: unknown, baselineNdvi: number): NdviThresholds {
    const json = this.toJsonObject(calibrationData);
    const thresholds = this.toJsonObject(json.thresholds);
    const optimal = thresholds.optimal;
    const vigilance = this.toNumber(thresholds.vigilance);
    const alert = this.toNumber(thresholds.alerte ?? thresholds.alert);

    if (
      Array.isArray(optimal) &&
      optimal.length === 2 &&
      vigilance !== null &&
      alert !== null
    ) {
      const optimalMin = this.toNumber(optimal[0]);
      const optimalMax = this.toNumber(optimal[1]);
      if (optimalMin !== null && optimalMax !== null) {
        return {
          optimal: [optimalMin, optimalMax],
          vigilance,
          alert,
        };
      }
    }

    return {
      optimal: [this.round(baselineNdvi - 0.05), this.round(baselineNdvi + 0.05)],
      vigilance: this.round(baselineNdvi - 0.1),
      alert: this.round(baselineNdvi - 0.15),
    };
  }

  private getLatestMetric(
    readings: AiSatelliteReading[],
    key: 'ndre' | 'ndmi',
  ): number | null {
    for (let index = readings.length - 1; index >= 0; index -= 1) {
      const value = readings[index][key];
      if (typeof value === 'number') {
        return value;
      }
    }

    return null;
  }

  private async postCalibrationApi<T>(
    path: string,
    payload: unknown,
    organizationId: string,
  ): Promise<T> {
    const url = `${this.getSatelliteServiceUrl()}${path}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const message = errorText || `Diagnostics service request failed with status ${response.status}`;
        throw response.status >= 500
          ? new BadGatewayException(message)
          : new BadRequestException(message);
      }

      const responseBody: T = await response.json();
      return responseBody;
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof BadRequestException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown diagnostics service error';
      this.logger.error(`Diagnostics API call failed for ${url}: ${message}`);
      throw new BadGatewayException(`Diagnostics service unavailable: ${message}`);
    }
  }

  private getSatelliteServiceUrl(): string {
    const baseUrl = process.env.SATELLITE_SERVICE_URL || 'http://localhost:8001';
    return baseUrl.replace(/\/+$/, '');
  }

  private getLookbackDate(days: number): string {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - days);
    return lookbackDate.toISOString().split('T')[0];
  }

  private extractFarmOrganizationId(farms: unknown): string | null {
    if (Array.isArray(farms)) {
      const firstFarm = farms[0];
      if (this.isJsonObject(firstFarm) && typeof firstFarm.organization_id === 'string') {
        return firstFarm.organization_id;
      }

      return null;
    }

    if (this.isJsonObject(farms) && typeof farms.organization_id === 'string') {
      return farms.organization_id;
    }

    return null;
  }

  private matchesOrganization(
    candidateOrganizationId: string | null,
    organizationId: string,
  ): boolean {
    return (
      typeof candidateOrganizationId === 'string' &&
      candidateOrganizationId.trim().toLowerCase() ===
        organizationId.trim().toLowerCase()
    );
  }

  private parseBoundary(boundary: unknown): number[][] {
    if (!Array.isArray(boundary)) {
      return [];
    }

    return boundary;
  }

  private isJsonObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private toJsonObject(value: unknown): Record<string, unknown> {
    return this.isJsonObject(value) ? value : {};
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private round(value: number, digits = 4): number {
    return Number(value.toFixed(digits));
  }
}
