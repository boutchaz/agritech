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

const CALIBRATION_LOOKBACK_DAYS = 90;
const NDVI_PERCENTILES = [10, 25, 50, 75, 90];
const PROVISION_POLL_INTERVAL_MS = 10_000;
const PROVISION_MAX_ATTEMPTS = 60;
const WEATHER_LOOKBACK_DAYS = 90;
const SATELLITE_SYNC_INDICES = ['NDVI', 'NDRE', 'NDMI', 'GCI', 'EVI', 'SAVI'];

type ZoneClassification = 'optimal' | 'normal' | 'stressed';
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
  temperature_min: number | string | null;
  temperature_max: number | string | null;
  precipitation_sum: number | string | null;
  et0_fao_evapotranspiration: number | string | null;
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

@Injectable()
export class CalibrationService {
  private readonly logger = new Logger(CalibrationService.name);

  constructor(private readonly databaseService: DatabaseService) {}

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

    const needsSatelliteProvisioning = !satelliteReadings.length;
    const needsWeatherProvisioning = !weatherReadings.length;

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
        .update({ ai_calibration_id: calibrationId })
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
      .update({ ai_calibration_id: calibration.id })
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

    return updatedCalibration as CalibrationRecord;
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
      .select('id, crop_type, planting_system, boundary, organization_id, farms(organization_id)')
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
      throw new BadRequestException(
        `Failed to fetch crop AI references: ${error.message}`,
      );
    }

    const referenceData = this.toJsonObject((data as CropReferenceRow | null)?.reference_data);
    const satelliteThresholds = this.toJsonObject(referenceData.seuils_satellite);
    const systemThresholds = this.toJsonObject(satelliteThresholds[system]);
    const ndviThresholds = this.toJsonObject(systemThresholds.NDVI);
    const optimal = ndviThresholds.optimal;

    if (!Array.isArray(optimal) || optimal.length !== 2) {
      throw new NotFoundException(
        `NDVI thresholds not found for crop type ${cropType} and system ${system}`,
      );
    }

    const optimalMin = this.toNumber(optimal[0]);
    const optimalMax = this.toNumber(optimal[1]);
    const vigilance = this.toNumber(ndviThresholds.vigilance);
    const alerte = this.toNumber(ndviThresholds.alerte);

    if (
      optimalMin === null ||
      optimalMax === null ||
      vigilance === null ||
      alerte === null
    ) {
      throw new NotFoundException(
        `NDVI thresholds not found for crop type ${cropType} and system ${system}`,
      );
    }

    return {
      optimal: [optimalMin, optimalMax],
      vigilance,
      alerte,
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
