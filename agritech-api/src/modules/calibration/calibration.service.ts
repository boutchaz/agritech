import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WeatherProvider } from '../chat/providers/weather.provider';
import { StartCalibrationDto } from './dto/start-calibration.dto';
import { CalibrationStateMachine } from './calibration-state-machine';
import {
  NutritionOptionService,
  NutritionOptionSuggestion,
} from './nutrition-option.service';

const CALIBRATION_LOOKBACK_DAYS = 730;
const NDVI_PERCENTILES = [10, 25, 50, 75, 90];
const PROVISION_POLL_INTERVAL_MS = 10_000;
const PROVISION_MAX_ATTEMPTS = 60;
const WEATHER_LOOKBACK_DAYS = 730;
const SATELLITE_SYNC_INDICES = [
  'NIRv', 'EVI', 'NDRE', 'NDMI', 'NDVI', 'GCI', 'SAVI',
  'MSAVI2', 'OSAVI', 'MSI', 'MNDWI', 'MCARI', 'TCARI',
];

type ZoneClassification = 'optimal' | 'normal' | 'stressed';
type ParcelAiPhase =
  | 'disabled'
  | 'calibrating'
  | 'awaiting_validation'
  | 'awaiting_nutrition_option'
  | 'active'
  | 'paused'
  | 'calibration'
  | string;
type JsonObject = Record<string, unknown>;

interface NdviThresholds {
  optimal: [number, number];
  vigilance: number;
  alerte: number;
}

interface CalibrationSatelliteReading {
  date: string;
  ndvi: number;
  ndre: number;
  ndmi: number;
  gci: number;
  evi: number;
  savi: number;
}

interface CalibrationWeatherReading {
  date: string;
  temp_min: number;
  temp_max: number;
  precip: number;
  et0: number;
}

interface CalibrationComputationResponse {
  baseline_ndvi: number;
  baseline_ndre: number;
  baseline_ndmi: number;
  confidence_score: number;
  zone_classification: ZoneClassification;
  phenology_stage: string;
  anomaly_count: number;
  processing_time_ms: number;
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
  aiPhase: ParcelAiPhase;
}

interface CropReferenceRow {
  reference_data?: unknown;
}

interface SatelliteIndexRow {
  date: string;
  index_name: string;
  mean_value: number | string | null;
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
}

interface CalibrationV2Response {
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
  option: 'A' | 'B' | 'C';
  ai_phase: 'active';
}

@Injectable()
export class CalibrationService {
  private readonly logger = new Logger(CalibrationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly stateMachine: CalibrationStateMachine,
    private readonly nutritionOptionService: NutritionOptionService,
  ) {}

  async startCalibration(
    parcelId: string,
    organizationId: string,
    dto: StartCalibrationDto,
  ): Promise<CalibrationRecord> {
    const parcel = await this.getParcelContext(parcelId, organizationId);

    const [satelliteReadings, weatherReadings] = await Promise.all([
      this.fetchSatelliteReadings(parcelId, organizationId),
      this.fetchWeatherReadings(parcel),
    ]);

    const needsSatelliteProvisioning =
      !satelliteReadings.length ||
      this.hasInsufficientCoverage(satelliteReadings, CALIBRATION_LOOKBACK_DAYS);
    const needsWeatherProvisioning =
      !weatherReadings.length ||
      this.hasInsufficientCoverage(weatherReadings, WEATHER_LOOKBACK_DAYS);

    if (needsSatelliteProvisioning || needsWeatherProvisioning) {
      return this.startProvisioningCalibration(
        parcelId,
        organizationId,
        parcel,
        dto,
        needsSatelliteProvisioning,
        needsWeatherProvisioning,
      );
    }

    return this.runCalibrationComputation(parcelId, organizationId, parcel, dto, satelliteReadings, weatherReadings);
  }

  async startCalibrationV2(
    parcelId: string,
    organizationId: string,
    dto: StartCalibrationDto,
  ): Promise<CalibrationRecord> {
    const parcel = await this.getParcelContext(parcelId, organizationId);

    if (parcel.aiPhase === 'calibrating') {
      throw new BadRequestException('Parcel calibration is already in progress');
    }

    if (parcel.aiPhase !== 'disabled' && parcel.aiPhase !== 'active') {
      throw new BadRequestException(
        `V2 calibration can only start from disabled or active phase (current: ${parcel.aiPhase})`,
      );
    }

    if (!parcel.plantingYear) {
      throw new BadRequestException('Parcel planting_year is required for calibration V2');
    }

    const supabase = this.databaseService.getAdminClient();
    const startedAt = new Date().toISOString();

    await this.stateMachine.transitionPhase(
      parcelId,
      parcel.aiPhase as 'disabled' | 'active',
      'calibrating',
      organizationId,
    );

    const { data: calibration, error: insertError } = await supabase
      .from('calibrations')
      .insert({
        parcel_id: parcelId,
        organization_id: organizationId,
        status: 'in_progress',
        started_at: startedAt,
        calibration_version: 'v2',
        calibration_data: {
          version: 'v2',
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
      .select('*')
      .single();

    if (insertError || !calibration) {
      await this.stateMachine.transitionPhase(
        parcelId,
        'calibrating',
        'disabled',
        organizationId,
      );

      throw new BadRequestException(
        `Failed to create V2 calibration: ${insertError?.message ?? 'unknown error'}`,
      );
    }

    this.runCalibrationV2InBackground(
      calibration.id as string,
      parcelId,
      organizationId,
      parcel,
      dto,
    ).catch((error) => {
      this.logger.error(
        `Background V2 calibration failed for calibration ${calibration.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    });

    return calibration as CalibrationRecord;
  }

  private async startProvisioningCalibration(
    parcelId: string,
    organizationId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
    needsSatellite: boolean,
    needsWeather: boolean,
  ): Promise<CalibrationRecord> {
    const supabase = this.databaseService.getAdminClient();
    const startedAt = new Date().toISOString();

    const { data: calibration, error: insertError } = await supabase
      .from('calibrations')
      .insert({
        parcel_id: parcelId,
        organization_id: organizationId,
        status: 'in_progress',
        started_at: startedAt,
        calibration_data: {
          request: { ...dto, lookback_days: CALIBRATION_LOOKBACK_DAYS },
          parcel: { id: parcel.id, crop_type: parcel.cropType, system: parcel.system },
          provisioning: {
            satellite: needsSatellite,
            weather: needsWeather,
            started_at: startedAt,
          },
        },
      })
      .select('*')
      .single();

    if (insertError || !calibration) {
      this.logger.error(
        `Failed to create provisioning calibration for parcel ${parcelId}: ${insertError?.message}`,
      );
      throw new BadRequestException(
        `Failed to create calibration: ${insertError?.message ?? 'unknown error'}`,
      );
    }

    this.provisionAndCalibrateInBackground(
      calibration.id as string,
      parcelId,
      organizationId,
      parcel,
      dto,
      needsSatellite,
      needsWeather,
    ).catch((error) => {
      this.logger.error(
        `Background provisioning failed for calibration ${calibration.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    });

    return calibration as CalibrationRecord;
  }

  private async provisionAndCalibrateInBackground(
    calibrationId: string,
    parcelId: string,
    organizationId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
    needsSatellite: boolean,
    needsWeather: boolean,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    try {
      if (needsSatellite) {
        this.logger.log(`Provisioning satellite data for parcel ${parcelId}`);
        await this.triggerSatelliteSync(parcelId, organizationId, parcel.boundary);
        await this.waitForSatelliteSync(parcelId, organizationId);
      }

      if (needsWeather) {
        this.logger.log(`Provisioning weather data for parcel ${parcelId}`);
        await this.provisionWeatherData(parcel, organizationId);
      }

      const [satelliteReadings, weatherReadings] = await Promise.all([
        this.fetchSatelliteReadings(parcelId, organizationId),
        this.fetchWeatherReadings(parcel),
      ]);

      if (!satelliteReadings.length || !weatherReadings.length) {
        const missing = !satelliteReadings.length ? 'satellite' : 'weather';
        throw new Error(`${missing} data still unavailable after provisioning`);
      }

      const ndviThresholds = await this.fetchNdviThresholds(parcel.cropType, parcel.system);
      const computation = await this.postCalibrationApi<CalibrationComputationResponse>(
        '/api/calibration/run',
        {
          parcel_id: parcelId,
          crop_type: parcel.cropType,
          system: parcel.system,
          satellite_readings: satelliteReadings,
          weather_readings: weatherReadings,
          ndvi_thresholds: ndviThresholds,
        },
        organizationId,
      );

      const completedAt = new Date().toISOString();
      const calibrationData = {
        request: { ...dto, lookback_days: CALIBRATION_LOOKBACK_DAYS },
        parcel: { id: parcel.id, crop_type: parcel.cropType, system: parcel.system },
        thresholds: ndviThresholds,
        inputs: { satellite_readings: satelliteReadings, weather_readings: weatherReadings },
        computation,
        validation: { validated: false, validated_at: null },
      };

      const { error: updateError } = await supabase
        .from('calibrations')
        .update({
          status: 'completed',
          completed_at: completedAt,
          baseline_ndvi: computation.baseline_ndvi,
          baseline_ndre: computation.baseline_ndre,
          baseline_ndmi: computation.baseline_ndmi,
          confidence_score: computation.confidence_score,
          zone_classification: computation.zone_classification,
          phenology_stage: computation.phenology_stage,
          calibration_data: calibrationData,
        })
        .eq('id', calibrationId);

      if (updateError) {
        throw new Error(`Failed to update calibration: ${updateError.message}`);
      }

      const { error: updateParcelError } = await supabase
        .from('parcels')
        .update({ ai_calibration_id: calibrationId, ai_enabled: true, ai_phase: 'active' })
        .eq('id', parcelId);

      if (updateParcelError) {
        this.logger.error(
          `Failed to link calibration ${calibrationId} to parcel ${parcelId}: ${updateParcelError.message}`,
        );
      }

      this.logger.log(`Calibration ${calibrationId} completed successfully for parcel ${parcelId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Provisioning calibration ${calibrationId} failed: ${message}`);

      await supabase
        .from('calibrations')
        .update({
          status: 'failed',
          error_message: message,
        })
        .eq('id', calibrationId);
    }
  }

  private async runCalibrationV2InBackground(
    calibrationId: string,
    parcelId: string,
    organizationId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    try {
      await Promise.race([
        this.executeCalibrationV2(calibrationId, parcelId, organizationId, parcel, dto),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('V2 calibration timed out after 10 minutes'));
          }, 10 * 60 * 1000);
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`V2 calibration ${calibrationId} failed: ${message}`);

      await supabase
        .from('calibrations')
        .update({
          status: 'failed',
          error_message: message,
        })
        .eq('id', calibrationId);

      await this.stateMachine.transitionPhase(
        parcelId,
        'calibrating',
        'disabled',
        organizationId,
      );
    }
  }

  private async executeCalibrationV2(
    calibrationId: string,
    parcelId: string,
    organizationId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    const [satelliteReadings, satelliteImages, weatherRows, analyses, harvestRecords, referenceData] =
      await Promise.all([
        this.fetchSatelliteReadings(parcelId, organizationId),
        this.fetchSatelliteImagesForV2(parcelId, organizationId),
        this.fetchWeatherRowsForV2(parcel),
        this.fetchAnalysesForV2(parcelId),
        this.fetchHarvestRecordsForV2(parcelId),
        this.fetchCropReferenceData(parcel.cropType),
      ]);

    if (weatherRows.length && this.hasMissingGdd(weatherRows, parcel.cropType)) {
      const firstRow = weatherRows[0];
      const latitude = this.toNumber(firstRow?.latitude) ?? 0;
      const longitude = this.toNumber(firstRow?.longitude) ?? 0;

      await this.postCalibrationApi<{ crop_type: string; updated_rows: number }>(
        '/api/calibration/v2/precompute-gdd',
        {
          latitude,
          longitude,
          crop_type: parcel.cropType,
          rows: weatherRows,
        },
        organizationId,
      );
    }

    const weatherDaily = this.normalizeWeatherReadings(weatherRows);
    const calibrationInput = {
      parcel_id: parcelId,
      organization_id: organizationId,
      crop_type: parcel.cropType,
      variety: parcel.variety,
      planting_year: parcel.plantingYear,
      planting_system: parcel.system,
      satellite_series: {
        NDVI: satelliteReadings.slice(0, 1).map((reading) => ({
          date: reading.date,
          value: reading.ndvi,
        })),
      },
      weather_daily: weatherDaily,
      analyses,
      harvest_records: harvestRecords,
      reference_data: referenceData,
    };

    const v2Output = await this.postCalibrationApi<CalibrationV2Response>(
      '/api/calibration/v2/run',
      {
        calibration_input: calibrationInput,
        satellite_images: satelliteImages,
        weather_rows: weatherRows,
      },
      organizationId,
    );

    const zoneClassification = this.deriveZoneClassification(v2Output);
    const calibrationData = {
      version: 'v2',
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
      .from('calibrations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        baseline_ndvi: this.extractIndexP50(v2Output, 'NDVI'),
        baseline_ndre: this.extractIndexP50(v2Output, 'NDRE'),
        baseline_ndmi: this.extractIndexP50(v2Output, 'NDMI'),
        confidence_score: this.toNumber(v2Output.confidence?.normalized_score),
        zone_classification: zoneClassification,
        phenology_stage: this.extractPhenologyStage(v2Output),
        health_score: this.toNumber(v2Output.step8?.health_score?.total),
        yield_potential_min: this.toNumber(v2Output.step6?.yield_potential?.minimum),
        yield_potential_max: this.toNumber(v2Output.step6?.yield_potential?.maximum),
        data_completeness_score: this.toNumber(v2Output.confidence?.total_score),
        maturity_phase: v2Output.maturity_phase,
        anomaly_count: Array.isArray(v2Output.step5?.anomalies)
          ? v2Output.step5?.anomalies.length
          : 0,
        calibration_version: 'v2',
        calibration_data: calibrationData,
      })
      .eq('id', calibrationId);

    if (updateCalibrationError) {
      throw new Error(`Failed to update V2 calibration: ${updateCalibrationError.message}`);
    }

    const { error: updateParcelError } = await supabase
      .from('parcels')
      .update({
        ai_calibration_id: calibrationId,
        ai_enabled: true,
      })
      .eq('id', parcelId);

    if (updateParcelError) {
      throw new Error(`Failed to update parcel AI state: ${updateParcelError.message}`);
    }

    await this.stateMachine.transitionPhase(
      parcelId,
      'calibrating',
      'awaiting_validation',
      organizationId,
    );
  }

  private async triggerSatelliteSync(
    parcelId: string,
    organizationId: string,
    boundary: number[][],
  ): Promise<void> {
    const url = `${this.getSatelliteServiceUrl()}/api/sync/parcel`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': organizationId,
      },
      body: JSON.stringify({
        parcel_id: parcelId,
        organization_id: organizationId,
        boundary,
        indices: SATELLITE_SYNC_INDICES,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to trigger satellite sync: ${errorText || response.statusText}`);
    }
  }

  private async waitForSatelliteSync(
    parcelId: string,
    organizationId: string,
  ): Promise<void> {
    for (let attempt = 0; attempt < PROVISION_MAX_ATTEMPTS; attempt += 1) {
      await this.delay(PROVISION_POLL_INTERVAL_MS);

      const status = await this.getSatelliteSyncStatus(parcelId, organizationId);
      if (status === 'synced' || status === 'partial') {
        this.logger.log(`Satellite sync completed for parcel ${parcelId}: ${status}`);
        return;
      }
    }

    throw new Error('Satellite data provisioning timed out');
  }

  private async getSatelliteSyncStatus(
    parcelId: string,
    _organizationId: string,
  ): Promise<string> {
    const url = `${this.getSatelliteServiceUrl()}/api/sync/parcel/${parcelId}/status`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return 'no_data';
    }

    const data = await response.json() as { status: string };
    return data.status;
  }

  private async provisionWeatherData(
    parcel: ParcelContext,
    organizationId: string,
  ): Promise<void> {
    if (!parcel.boundary.length) {
      throw new Error('Parcel boundary is required to provision weather data');
    }

    const wgs84Boundary = WeatherProvider.ensureWGS84(parcel.boundary);
    const { latitude, longitude } = WeatherProvider.calculateCentroid(wgs84Boundary);
    const roundedLat = this.roundCoordinate(latitude, 2);
    const roundedLon = this.roundCoordinate(longitude, 2);

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = this.getLookbackDate(WEATHER_LOOKBACK_DAYS);

    const params = new URLSearchParams({
      latitude: String(roundedLat),
      longitude: String(roundedLon),
      start_date: startDate,
      end_date: endDate,
    });

    const url = `${this.getSatelliteServiceUrl()}/api/weather/historical?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'x-organization-id': organizationId },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch weather data: ${errorText || response.statusText}`);
    }

    const weatherResponse = await response.json() as {
      latitude: number;
      longitude: number;
      source?: string;
      data: Array<Record<string, unknown>>;
    };

    if (!weatherResponse.data?.length) {
      this.logger.warn(`No weather data returned for parcel at ${roundedLat},${roundedLon}`);
      return;
    }

    const supabase = this.databaseService.getAdminClient();
    const rows = weatherResponse.data.map((entry) => ({
      latitude: this.roundCoordinate(weatherResponse.latitude, 2),
      longitude: this.roundCoordinate(weatherResponse.longitude, 2),
      date: entry.date as string,
      temperature_min: entry.temperature_min ?? null,
      temperature_max: entry.temperature_max ?? null,
      temperature_mean: entry.temperature_mean ?? null,
      relative_humidity_mean: entry.relative_humidity_mean ?? null,
      relative_humidity_max: entry.relative_humidity_max ?? null,
      relative_humidity_min: entry.relative_humidity_min ?? null,
      precipitation_sum: entry.precipitation_sum ?? null,
      wind_speed_max: entry.wind_speed_max ?? null,
      wind_gusts_max: entry.wind_gusts_max ?? null,
      shortwave_radiation_sum: entry.shortwave_radiation_sum ?? null,
      et0_fao_evapotranspiration: entry.et0_fao_evapotranspiration ?? null,
      soil_temperature_0_7cm: entry.soil_temperature_0_7cm ?? null,
      soil_temperature_7_28cm: entry.soil_temperature_7_28cm ?? null,
      soil_moisture_0_7cm: entry.soil_moisture_0_7cm ?? null,
      soil_moisture_7_28cm: entry.soil_moisture_7_28cm ?? null,
      source: weatherResponse.source ?? 'open-meteo-archive',
    }));

    const { error } = await supabase
      .from('weather_daily_data')
      .upsert(rows, { onConflict: 'latitude,longitude,date' });

    if (error) {
      throw new Error(`Failed to persist weather data: ${error.message}`);
    }

    this.logger.log(`Provisioned ${rows.length} weather data points for parcel`);
  }

  private hasInsufficientCoverage(
    readings: { date: string }[],
    lookbackDays: number,
  ): boolean {
    if (!readings.length) {
      return true;
    }

    const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
    const earliestDate = new Date(sorted[0].date);
    const requiredStart = new Date();
    requiredStart.setDate(requiredStart.getDate() - lookbackDays);

    const coverageThreshold = new Date(
      requiredStart.getTime() + lookbackDays * 0.3 * 86_400_000,
    );

    if (earliestDate > coverageThreshold) {
      this.logger.log(
        `Insufficient data coverage: earliest=${sorted[0].date}, ` +
          `required=${requiredStart.toISOString().split('T')[0]}, ` +
          `threshold=${coverageThreshold.toISOString().split('T')[0]}`,
      );
      return true;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private async runCalibrationComputation(
    parcelId: string,
    organizationId: string,
    parcel: ParcelContext,
    dto: StartCalibrationDto,
    satelliteReadings: CalibrationSatelliteReading[],
    weatherReadings: CalibrationWeatherReading[],
  ): Promise<CalibrationRecord> {
    const supabase = this.databaseService.getAdminClient();
    const ndviThresholds = await this.fetchNdviThresholds(parcel.cropType, parcel.system);

    const startedAt = new Date().toISOString();
    const computation = await this.postCalibrationApi<CalibrationComputationResponse>(
      '/api/calibration/run',
      {
        parcel_id: parcelId,
        crop_type: parcel.cropType,
        system: parcel.system,
        satellite_readings: satelliteReadings,
        weather_readings: weatherReadings,
        ndvi_thresholds: ndviThresholds,
      },
      organizationId,
    );
    const completedAt = new Date().toISOString();

    const calibrationData = {
      request: {
        ...dto,
        lookback_days: CALIBRATION_LOOKBACK_DAYS,
      },
      parcel: {
        id: parcel.id,
        crop_type: parcel.cropType,
        system: parcel.system,
      },
      thresholds: ndviThresholds,
      inputs: {
        satellite_readings: satelliteReadings,
        weather_readings: weatherReadings,
      },
      computation,
      validation: {
        validated: false,
        validated_at: null,
      },
    };

    const { data: calibration, error: insertError } = await supabase
      .from('calibrations')
      .insert({
        parcel_id: parcelId,
        organization_id: organizationId,
        status: 'completed',
        started_at: startedAt,
        completed_at: completedAt,
        baseline_ndvi: computation.baseline_ndvi,
        baseline_ndre: computation.baseline_ndre,
        baseline_ndmi: computation.baseline_ndmi,
        confidence_score: computation.confidence_score,
        zone_classification: computation.zone_classification,
        phenology_stage: computation.phenology_stage,
        calibration_data: calibrationData,
      })
      .select('*')
      .single();

    if (insertError || !calibration) {
      this.logger.error(
        `Failed to persist calibration for parcel ${parcelId}: ${insertError?.message}`,
      );
      throw new BadRequestException(
        `Failed to persist calibration: ${insertError?.message ?? 'unknown error'}`,
      );
    }

    const { error: updateParcelError } = await supabase
      .from('parcels')
      .update({ ai_calibration_id: calibration.id, ai_enabled: true, ai_phase: 'active' })
      .eq('id', parcelId);

    if (updateParcelError) {
      this.logger.error(
        `Failed to link calibration ${calibration.id} to parcel ${parcelId}: ${updateParcelError.message}`,
      );
      throw new BadRequestException(
        `Failed to update parcel calibration reference: ${updateParcelError.message}`,
      );
    }

    return calibration as CalibrationRecord;
  }

  async getLatestCalibration(
    parcelId: string,
    organizationId: string,
  ): Promise<CalibrationRecord | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('calibrations')
      .select('*')
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

    return data as CalibrationRecord | null;
  }

  async getCalibrationReport(parcelId: string, organizationId: string) {
    const calibration = await this.getLatestCalibration(parcelId, organizationId);

    if (!calibration) {
      return null;
    }

    return {
      calibration,
      report: this.toJsonObject(calibration.calibration_data),
    };
  }

  async validateCalibration(
    calibrationId: string,
    organizationId: string,
  ): Promise<CalibrationRecord> {
    const supabase = this.databaseService.getAdminClient();
    const { data: existingCalibration, error: existingError } = await supabase
      .from('calibrations')
      .select('*')
      .eq('id', calibrationId)
      .eq('organization_id', organizationId)
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
      throw new NotFoundException('Calibration not found');
    }

    if (typeof existingCalibration.parcel_id !== 'string') {
      throw new BadRequestException('Calibration is missing parcel_id');
    }

    const parcel = await this.getParcelContext(existingCalibration.parcel_id, organizationId);
    if (parcel.aiPhase !== 'awaiting_validation') {
      throw new BadRequestException(
        `Calibration can only be validated in awaiting_validation phase (current: ${parcel.aiPhase})`,
      );
    }

    if (existingCalibration.status !== 'completed') {
      throw new BadRequestException('Only completed calibrations can be validated');
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
      status: 'completed',
      calibration_data: calibrationData,
    };

    if (!existingCalibration.completed_at) {
      updatePayload.completed_at = validatedAt;
    }

    const { data: updatedCalibration, error: updateError } = await supabase
      .from('calibrations')
      .update(updatePayload)
      .eq('id', calibrationId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (updateError || !updatedCalibration) {
      this.logger.error(
        `Failed to validate calibration ${calibrationId}: ${updateError?.message}`,
      );
      throw new BadRequestException(
        `Failed to validate calibration: ${updateError?.message ?? 'unknown error'}`,
      );
    }

    await this.stateMachine.transitionPhase(
      existingCalibration.parcel_id,
      'awaiting_validation',
      'awaiting_nutrition_option',
      organizationId,
    );

    return updatedCalibration as CalibrationRecord;
  }

  async getNutritionSuggestion(
    parcelId: string,
    organizationId: string,
  ): Promise<NutritionOptionSuggestion> {
    await this.getParcelContext(parcelId, organizationId);
    return this.nutritionOptionService.suggestNutritionOption(parcelId, organizationId);
  }

  async confirmNutritionOption(
    calibrationId: string,
    organizationId: string,
    option: 'A' | 'B' | 'C',
  ): Promise<NutritionOptionConfirmation> {
    const supabase = this.databaseService.getAdminClient();
    const { data: calibration, error } = await supabase
      .from('calibrations')
      .select('id, parcel_id, organization_id')
      .eq('id', calibrationId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch calibration: ${error.message}`);
    }

    if (!calibration || typeof calibration.parcel_id !== 'string') {
      throw new NotFoundException('Calibration not found');
    }

    const parcel = await this.getParcelContext(calibration.parcel_id, organizationId);
    if (parcel.aiPhase !== 'awaiting_nutrition_option') {
      throw new BadRequestException(
        `Nutrition option can only be confirmed in awaiting_nutrition_option phase (current: ${parcel.aiPhase})`,
      );
    }

    const { error: updateParcelError } = await supabase
      .from('parcels')
      .update({ ai_nutrition_option: option })
      .eq('id', calibration.parcel_id);

    if (updateParcelError) {
      throw new BadRequestException(
        `Failed to persist nutrition option: ${updateParcelError.message}`,
      );
    }

    await this.stateMachine.transitionPhase(
      calibration.parcel_id,
      'awaiting_nutrition_option',
      'active',
      organizationId,
    );

    return {
      calibration_id: calibrationId,
      parcel_id: calibration.parcel_id,
      option,
      ai_phase: 'active',
    };
  }

  async getPercentiles(parcelId: string, organizationId: string): Promise<PercentilesResponse> {
    const ndviValues = await this.fetchNdviValues(parcelId, organizationId);

    if (!ndviValues.length) {
      throw new NotFoundException('No NDVI readings found for parcel');
    }

    return this.postCalibrationApi<PercentilesResponse>(
      '/api/calibration/percentiles',
      {
        values: ndviValues,
        percentiles: NDVI_PERCENTILES,
      },
      organizationId,
    );
  }

  async getZones(parcelId: string, organizationId: string): Promise<ZonesResponse> {
    const parcel = await this.getParcelContext(parcelId, organizationId);
    const [ndviValues, thresholds] = await Promise.all([
      this.fetchNdviValues(parcelId, organizationId),
      this.fetchNdviThresholds(parcel.cropType, parcel.system),
    ]);

    if (!ndviValues.length) {
      throw new NotFoundException('No NDVI readings found for parcel');
    }

    return this.postCalibrationApi<ZonesResponse>(
      '/api/calibration/classify-zones',
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
      .from('parcels')
      .select(
        'id, crop_type, planting_system, planting_year, variety, ai_phase, boundary, organization_id, farms(organization_id)',
      )
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
      throw new BadRequestException('Parcel crop type is required for calibration');
    }

    return {
      id: parcel.id,
      cropType: parcel.crop_type,
      system: parcel.planting_system ?? 'unknown',
      boundary: this.parseBoundary(parcel.boundary),
      organizationId:
        typeof parcel.organization_id === 'string' ? parcel.organization_id : null,
      variety: typeof parcel.variety === 'string' ? parcel.variety : null,
      plantingYear:
        typeof parcel.planting_year === 'number' ? parcel.planting_year : null,
      aiPhase: typeof parcel.ai_phase === 'string' ? parcel.ai_phase : 'disabled',
    };
  }

  private async fetchSatelliteReadings(
    parcelId: string,
    organizationId: string,
  ): Promise<CalibrationSatelliteReading[]> {
    const supabase = this.databaseService.getAdminClient();
    const sinceDate = this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS);
    const { data, error } = await supabase
      .from('satellite_indices_data')
      .select('date, index_name, mean_value')
      .eq('organization_id', organizationId)
      .eq('parcel_id', parcelId)
      .in('index_name', ['NDVI', 'NDRE', 'NDMI', 'GCI', 'EVI', 'SAVI'])
      .gte('date', sinceDate)
      .order('date', { ascending: true })
      .order('index_name', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch satellite readings for parcel ${parcelId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch satellite readings: ${error.message}`,
      );
    }

    return this.normalizeSatelliteReadings(data as SatelliteIndexRow[]);
  }

  private async fetchWeatherReadings(parcel: ParcelContext): Promise<CalibrationWeatherReading[]> {
    if (!parcel.boundary.length) {
      throw new BadRequestException('Parcel boundary is required to fetch weather readings');
    }

    const supabase = this.databaseService.getAdminClient();
    const wgs84Boundary = WeatherProvider.ensureWGS84(parcel.boundary);
    const { latitude, longitude } = WeatherProvider.calculateCentroid(wgs84Boundary);
    const roundedLatitude = this.roundCoordinate(latitude, 2);
    const roundedLongitude = this.roundCoordinate(longitude, 2);
    const sinceDate = this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS);

    const { data, error } = await supabase
      .from('weather_daily_data')
      .select(
        'date, temperature_min, temperature_max, precipitation_sum, et0_fao_evapotranspiration',
      )
      .eq('latitude', roundedLatitude)
      .eq('longitude', roundedLongitude)
      .gte('date', sinceDate)
      .order('date', { ascending: true });

    if (error) {
      this.logger.error(
        `Failed to fetch weather readings for parcel ${parcel.id}: ${error.message}`,
      );
      throw new BadRequestException(`Failed to fetch weather readings: ${error.message}`);
    }

    return this.normalizeWeatherReadings(data as WeatherDailyRow[]);
  }

  private async fetchNdviThresholds(
    cropType: string,
    system: string,
  ): Promise<NdviThresholds> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('crop_ai_references')
      .select('reference_data')
      .eq('crop_type', cropType)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `Failed to fetch crop AI references for ${cropType}: ${error.message}`,
      );
    }

    const referenceData = this.toJsonObject((data as CropReferenceRow | null)?.reference_data);
    const satelliteThresholds = this.toJsonObject(referenceData.seuils_satellite);
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
      .from('satellite_indices_data')
      .select('mean_value')
      .eq('organization_id', organizationId)
      .eq('parcel_id', parcelId)
      .eq('index_name', 'NDVI')
      .gte('date', sinceDate)
      .order('date', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch NDVI values for parcel ${parcelId}: ${error.message}`);
      throw new BadRequestException(`Failed to fetch NDVI values: ${error.message}`);
    }

    return (data as Array<{ mean_value: number | string | null }>).reduce<number[]>(
      (values, row) => {
        const value = this.toNumber(row.mean_value);
        if (value !== null) {
          values.push(value);
        }
        return values;
      },
      [],
    );
  }

  private normalizeSatelliteReadings(
    rows: SatelliteIndexRow[],
  ): CalibrationSatelliteReading[] {
    const readingsByDate = new Map<string, Partial<CalibrationSatelliteReading>>();

    for (const row of rows) {
      const value = this.toNumber(row.mean_value);
      if (value === null) {
        continue;
      }

      const currentReading = readingsByDate.get(row.date) ?? { date: row.date };

      switch (row.index_name) {
        case 'NDVI':
          currentReading.ndvi = value;
          break;
        case 'NDRE':
          currentReading.ndre = value;
          break;
        case 'NDMI':
          currentReading.ndmi = value;
          break;
        case 'GCI':
          currentReading.gci = value;
          break;
        case 'EVI':
          currentReading.evi = value;
          break;
        case 'SAVI':
          currentReading.savi = value;
          break;
        default:
          break;
      }

      readingsByDate.set(row.date, currentReading);
    }

    return Array.from(readingsByDate.values())
      .filter((reading): reading is CalibrationSatelliteReading =>
        this.isCompleteSatelliteReading(reading),
      )
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  private normalizeWeatherReadings(rows: WeatherDailyRow[]): CalibrationWeatherReading[] {
    return rows
      .map((row) => ({
        date: row.date,
        temp_min: this.toNumber(row.temperature_min),
        temp_max: this.toNumber(row.temperature_max),
        precip: this.toNumber(row.precipitation_sum),
        et0: this.toNumber(row.et0_fao_evapotranspiration),
      }))
      .filter(
        (
          reading,
        ): reading is {
          date: string;
          temp_min: number;
          temp_max: number;
          precip: number;
          et0: number;
        } =>
          reading.temp_min !== null &&
          reading.temp_max !== null &&
          reading.precip !== null &&
          reading.et0 !== null,
      )
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  private isCompleteSatelliteReading(
    reading: Partial<CalibrationSatelliteReading>,
  ): reading is CalibrationSatelliteReading {
    return (
      typeof reading.date === 'string' &&
      typeof reading.ndvi === 'number' &&
      typeof reading.ndre === 'number' &&
      typeof reading.ndmi === 'number' &&
      typeof reading.gci === 'number' &&
      typeof reading.evi === 'number' &&
      typeof reading.savi === 'number'
    );
  }

  private async fetchSatelliteImagesForV2(
    parcelId: string,
    organizationId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const supabase = this.databaseService.getAdminClient();
    const sinceDate = this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS);
    const { data, error } = await supabase
      .from('satellite_indices_data')
      .select('date, index_name, mean_value')
      .eq('organization_id', organizationId)
      .eq('parcel_id', parcelId)
      .gte('date', sinceDate)
      .order('date', { ascending: true })
      .order('index_name', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch satellite images: ${error.message}`);
    }

    const byDate = new Map<string, Record<string, number>>();
    for (const row of data as SatelliteIndexRow[]) {
      const value = this.toNumber(row.mean_value);
      if (value === null) {
        continue;
      }
      const current = byDate.get(row.date) ?? {};
      current[row.index_name] = value;
      byDate.set(row.date, current);
    }

    return Array.from(byDate.entries()).map(([date, indices]) => ({
      date,
      cloud_coverage: 0,
      indices,
    }));
  }

  private async fetchWeatherRowsForV2(parcel: ParcelContext): Promise<WeatherDailyRow[]> {
    if (!parcel.boundary.length) {
      throw new BadRequestException('Parcel boundary is required to fetch weather rows');
    }

    const supabase = this.databaseService.getAdminClient();
    const wgs84Boundary = WeatherProvider.ensureWGS84(parcel.boundary);
    const { latitude, longitude } = WeatherProvider.calculateCentroid(wgs84Boundary);
    const roundedLatitude = this.roundCoordinate(latitude, 2);
    const roundedLongitude = this.roundCoordinate(longitude, 2);
    const sinceDate = this.getLookbackDate(CALIBRATION_LOOKBACK_DAYS);

    const { data, error } = await supabase
      .from('weather_daily_data')
      .select(
        'date, latitude, longitude, temperature_min, temperature_max, temperature_mean, relative_humidity_mean, wind_speed_max, shortwave_radiation_sum, precipitation_sum, et0_fao_evapotranspiration, gdd_olivier, gdd_agrumes, gdd_avocatier, gdd_palmier_dattier, chill_hours',
      )
      .eq('latitude', roundedLatitude)
      .eq('longitude', roundedLongitude)
      .gte('date', sinceDate)
      .order('date', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch weather rows: ${error.message}`);
    }

    return data as WeatherDailyRow[];
  }

  private async fetchAnalysesForV2(parcelId: string): Promise<Array<Record<string, unknown>>> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('analyses')
      .select('analysis_type, analysis_date, data')
      .eq('parcel_id', parcelId)
      .in('analysis_type', ['soil', 'water'])
      .order('analysis_date', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch analyses: ${error.message}`);
    }

    return (data as AnalysisRow[]).map((row) => ({
      analysis_type: row.analysis_type,
      analysis_date: row.analysis_date,
      data: this.toJsonObject(row.data),
    }));
  }

  private async fetchHarvestRecordsForV2(parcelId: string): Promise<Array<Record<string, unknown>>> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('harvest_records')
      .select('harvest_date, quantity, unit')
      .eq('parcel_id', parcelId)
      .order('harvest_date', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch harvest records: ${error.message}`);
    }

    return (data as HarvestRow[]).map((row) => ({
      harvest_date: row.harvest_date,
      quantity: this.toNumber(row.quantity),
      unit: row.unit,
    }));
  }

  private async fetchCropReferenceData(cropType: string): Promise<Record<string, unknown>> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('crop_ai_references')
      .select('reference_data')
      .eq('crop_type', cropType)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch crop reference: ${error.message}`);
    }

    return this.toJsonObject((data as CropReferenceRow | null)?.reference_data);
  }

  private hasMissingGdd(rows: WeatherDailyRow[], cropType: string): boolean {
    const gddColumnByCrop: Record<string, keyof WeatherDailyRow> = {
      olivier: 'gdd_olivier',
      agrumes: 'gdd_agrumes',
      avocatier: 'gdd_avocatier',
      palmier_dattier: 'gdd_palmier_dattier',
    };

    const column = gddColumnByCrop[cropType];
    if (!column) {
      return false;
    }

    return rows.some((row) => this.toNumber(row[column]) === null);
  }

  private deriveZoneClassification(output: CalibrationV2Response): ZoneClassification {
    const summary = output.step7?.zone_summary;
    if (!Array.isArray(summary) || summary.length === 0) {
      return 'normal';
    }

    const sorted = [...summary].sort(
      (left, right) => (right.surface_percent ?? 0) - (left.surface_percent ?? 0),
    );
    const dominant = sorted[0]?.class_name;

    if (dominant === 'A' || dominant === 'B') {
      return 'optimal';
    }
    if (dominant === 'D' || dominant === 'E') {
      return 'stressed';
    }
    return 'normal';
  }

  private extractIndexP50(output: CalibrationV2Response, indexName: string): number | null {
    const percentile = output.step3?.global_percentiles?.[indexName]?.p50;
    return this.toNumber(percentile);
  }

  private extractPhenologyStage(output: CalibrationV2Response): string | null {
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
        const message = errorText || `Calibration service request failed with status ${response.status}`;
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

      const message = error instanceof Error ? error.message : 'Unknown calibration service error';
      this.logger.error(`Calibration API call failed for ${url}: ${message}`);
      throw new BadGatewayException(`Calibration service unavailable: ${message}`);
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

    return boundary.reduce<number[][]>((coordinates, point) => {
      if (
        Array.isArray(point) &&
        point.length >= 2 &&
        typeof point[0] === 'number' &&
        typeof point[1] === 'number'
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
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private toJsonObject(value: unknown): JsonObject {
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
}
