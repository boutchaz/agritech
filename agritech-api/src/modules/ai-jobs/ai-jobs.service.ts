import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CreateAiAlertInput, AiAlertsService } from '../ai-alerts/ai-alerts.service';
import { CreateRecommendationDto } from '../ai-recommendations/dto/create-recommendation.dto';
import { AiRecommendationsService } from '../ai-recommendations/ai-recommendations.service';
import {
  AiDiagnosticsResponse,
  AiDiagnosticsService,
  AiScenarioCode,
} from '../ai-diagnostics/ai-diagnostics.service';
import { DatabaseService } from '../database/database.service';
import { WeatherProvider } from '../chat/providers/weather.provider';

const WEATHER_FETCH_LOOKBACK_DAYS = 7;
const RECENT_SATELLITE_LOOKBACK_DAYS = 14;
const FORECAST_DAYS = 7;
const STRESS_SCENARIO_CODES: AiScenarioCode[] = ['C', 'D', 'E', 'F'];
const SCENARIO_RECOMMENDATION_MAP: Record<string, {
  constat: string;
  diagnostic: string;
  action: string;
  priority: string;
}> = {
  C: {
    constat: 'Moderate vegetation stress detected - NDVI declining below vigilance threshold',
    diagnostic: 'Possible water deficit or nutrient deficiency causing reduced chlorophyll activity',
    action: 'Increase irrigation frequency and monitor vegetation indices over the next 7 days. Check soil moisture levels.',
    priority: 'medium',
  },
  D: {
    constat: 'Critical vegetation decline detected - NDVI below alert threshold with rapid deterioration',
    diagnostic: 'Severe stress condition indicating potential crop damage from prolonged water deficit, disease, or pest attack',
    action: 'Immediate irrigation intervention required. Inspect parcel for disease or pest damage. Consider emergency foliar treatment.',
    priority: 'high',
  },
  E: {
    constat: 'Water stress indicators abnormal - NDMI declining with negative water balance',
    diagnostic: 'Soil moisture deficit detected from evapotranspiration exceeding precipitation over sustained period',
    action: 'Assess soil moisture levels. Increase irrigation volume and reduce intervals between waterings. Monitor NDMI recovery.',
    priority: 'medium',
  },
  F: {
    constat: 'Heat and climate stress detected - weather anomaly combined with vegetation decline',
    diagnostic: 'Extreme temperature event causing thermal stress on vegetation, potentially reducing photosynthetic efficiency',
    action: 'Apply anti-stress treatments if available. Adjust irrigation to early morning and late evening. Consider shade measures for sensitive crops.',
    priority: 'high',
  },
};

export interface AiEnabledParcelJobRecord {
  id: string;
  organization_id: string;
  crop_type: string | null;
  boundary: number[][] | null;
  ai_observation_only: boolean;
}

export interface AiWeatherLocation {
  latitude: number;
  longitude: number;
}

export interface AiWeatherDailyPoint {
  date: string;
  temperature_min?: number | null;
  temperature_max?: number | null;
  temperature_mean?: number | null;
  relative_humidity_mean?: number | null;
  relative_humidity_max?: number | null;
  relative_humidity_min?: number | null;
  precipitation_sum?: number | null;
  wind_speed_max?: number | null;
  wind_gusts_max?: number | null;
  shortwave_radiation_sum?: number | null;
  et0_fao_evapotranspiration?: number | null;
  soil_temperature_0_7cm?: number | null;
  soil_temperature_7_28cm?: number | null;
  soil_moisture_0_7cm?: number | null;
  soil_moisture_7_28cm?: number | null;
}

export interface AiWeatherApiResponse {
  latitude: number;
  longitude: number;
  elevation?: number | null;
  source?: string;
  data: AiWeatherDailyPoint[];
}

export interface AiParcelJobSummary {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

export interface AiPlanReminderRecord {
  id: string;
  organization_id: string;
  parcel_id: string;
  month: number;
  status: string;
  description: string;
}

export interface AiPlanReminderSummary {
  month: number;
  reminders: number;
}

export interface PendingAiRecommendationRecord {
  id: string;
  organization_id: string;
  parcel_id: string;
  status: string;
  valid_until: string | null;
}

export interface AiRecommendationVerificationSummary {
  processed: number;
  expired: number;
  failed: number;
}

@Injectable()
export class AiJobsService {
  private readonly logger = new Logger(AiJobsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly aiDiagnosticsService: AiDiagnosticsService,
    private readonly aiAlertsService: AiAlertsService,
    private readonly aiRecommendationsService: AiRecommendationsService,
  ) {}

  @Cron('0 6 * * *', { name: 'ai-jobs-daily-weather-fetch', timeZone: 'UTC' })
  async runDailyWeatherFetch(): Promise<AiParcelJobSummary> {
    this.logger.log('Starting daily AI weather fetch job');

    const parcels = await this.fetchAiEnabledParcels();
    const summary: AiParcelJobSummary = {
      processed: parcels.length,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    };
    const endDate = this.toIsoDate(new Date());
    const startDate = this.getLookbackDate(WEATHER_FETCH_LOOKBACK_DAYS);

    for (const parcel of parcels) {
      try {
        const location = this.resolveParcelLocation(parcel);
        const response = await this.fetchWeatherHistorical(
          location,
          startDate,
          endDate,
          parcel.organization_id,
        );
        await this.persistHistoricalWeather(response);
        summary.succeeded += 1;
      } catch (error) {
        summary.failed += 1;
        this.logger.error(
          `Daily weather fetch failed for parcel ${parcel.id}: ${this.getErrorMessage(error)}`,
        );
      }
    }

    this.logger.log(
      `Completed daily AI weather fetch job: processed=${summary.processed}, succeeded=${summary.succeeded}, failed=${summary.failed}`,
    );

    return summary;
  }

  @Cron('0 8 * * *', { name: 'ai-jobs-daily-pipeline-trigger', timeZone: 'UTC' })
  async runDailyAiPipelineTrigger(): Promise<AiParcelJobSummary> {
    this.logger.log('Starting daily AI pipeline trigger job');

    const parcels = await this.fetchAiEnabledParcels();
    const summary: AiParcelJobSummary = {
      processed: parcels.length,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    };

    for (const parcel of parcels) {
      try {
        const hasRecentData = await this.hasRecentSatelliteData(
          parcel.id,
          parcel.organization_id,
        );

        if (!hasRecentData) {
          summary.skipped += 1;
          this.logger.debug(`Skipping parcel ${parcel.id}: no recent satellite data`);
          continue;
        }

        const diagnostics = await this.aiDiagnosticsService.getDiagnostics(
          parcel.id,
          parcel.organization_id,
        );

        if (parcel.ai_observation_only) {
          this.logger.debug(
            `Parcel ${parcel.id} is observation-only — diagnostics computed, skipping alerts/recommendations`,
          );
          summary.succeeded += 1;
          continue;
        }

        const alertInput = this.buildStressAlert(parcel, diagnostics);

        if (alertInput) {
          const alertExists = await this.hasUnresolvedAlert(
            parcel.id,
            parcel.organization_id,
            alertInput.alert_code!,
          );
          if (!alertExists) {
            await this.aiAlertsService.createAiAlert(alertInput);
          }
        }

        const recommendationInput = this.buildStressRecommendation(parcel, diagnostics);
        if (recommendationInput) {
          const recoExists = await this.hasPendingRecommendation(
            parcel.id,
            parcel.organization_id,
            recommendationInput.alert_code!,
          );
          if (!recoExists) {
            await this.aiRecommendationsService.createRecommendation(
              recommendationInput,
              parcel.organization_id,
            );
          }
        }

        summary.succeeded += 1;
      } catch (error) {
        summary.failed += 1;
        this.logger.error(
          `Daily AI pipeline failed for parcel ${parcel.id}: ${this.getErrorMessage(error)}`,
        );
      }
    }

    this.logger.log(
      `Completed daily AI pipeline trigger job: processed=${summary.processed}, succeeded=${summary.succeeded}, failed=${summary.failed}, skipped=${summary.skipped}`,
    );

    return summary;
  }

  @Cron('0 9 1 * *', { name: 'ai-jobs-monthly-plan-reminder', timeZone: 'UTC' })
  async runMonthlyPlanReminder(): Promise<AiPlanReminderSummary> {
    this.logger.log('Starting monthly AI plan reminder job');

    const currentMonth = new Date().getUTCMonth() + 1;
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('plan_interventions')
      .select('id, organization_id, parcel_id, month, status, description')
      .eq('month', currentMonth)
      .eq('status', 'planned');

    if (error) {
      throw new Error(`Failed to fetch plan interventions: ${error.message}`);
    }

    const interventions = (data ?? []) as AiPlanReminderRecord[];
    for (const intervention of interventions) {
      this.logger.log(
        `Plan reminder for parcel ${intervention.parcel_id} (${intervention.organization_id}): ${intervention.description}`,
      );
    }

    this.logger.log(
      `Completed monthly AI plan reminder job: month=${currentMonth}, reminders=${interventions.length}`,
    );

    return {
      month: currentMonth,
      reminders: interventions.length,
    };
  }

  @Cron('0 7 * * 1', { name: 'ai-jobs-weekly-forecast-update', timeZone: 'UTC' })
  async runWeeklyForecastUpdate(): Promise<AiParcelJobSummary> {
    this.logger.log('Starting weekly AI forecast update job');

    const parcels = await this.fetchAiEnabledParcels();
    const summary: AiParcelJobSummary = {
      processed: parcels.length,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    };

    for (const parcel of parcels) {
      try {
        const location = this.resolveParcelLocation(parcel);
        const response = await this.fetchWeatherForecast(
          location,
          FORECAST_DAYS,
          parcel.organization_id,
        );
        await this.persistForecastWeather(response);
        summary.succeeded += 1;
      } catch (error) {
        summary.failed += 1;
        this.logger.error(
          `Weekly forecast update failed for parcel ${parcel.id}: ${this.getErrorMessage(error)}`,
        );
      }
    }

    this.logger.log(
      `Completed weekly AI forecast update job: processed=${summary.processed}, succeeded=${summary.succeeded}, failed=${summary.failed}`,
    );

    return summary;
  }

  @Cron('0 10 * * *', {
    name: 'ai-jobs-daily-recommendation-weather-verification',
    timeZone: 'UTC',
  })
  async runDailyRecommendationWeatherVerification(): Promise<AiRecommendationVerificationSummary> {
    this.logger.log('Starting daily recommendation weather verification job');

    const recommendations = await this.fetchExpiredPendingRecommendations();
    const summary: AiRecommendationVerificationSummary = {
      processed: recommendations.length,
      expired: 0,
      failed: 0,
    };

    for (const recommendation of recommendations) {
      try {
        await this.markRecommendationAsExpired(recommendation);
        summary.expired += 1;
      } catch (error) {
        summary.failed += 1;
        this.logger.error(
          `Recommendation verification failed for recommendation ${recommendation.id}: ${this.getErrorMessage(error)}`,
        );
      }
    }

    this.logger.log(
      `Completed daily recommendation weather verification job: processed=${summary.processed}, expired=${summary.expired}, failed=${summary.failed}`,
    );

    return summary;
  }

  private async fetchAiEnabledParcels(): Promise<AiEnabledParcelJobRecord[]> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('parcels')
      .select('id, organization_id, crop_type, boundary, ai_observation_only')
      .eq('ai_enabled', true)
      .eq('ai_phase', 'active');

    if (error) {
      throw new Error(`Failed to fetch AI-enabled parcels: ${error.message}`);
    }

    return (data ?? []) as AiEnabledParcelJobRecord[];
  }

  private resolveParcelLocation(parcel: AiEnabledParcelJobRecord): AiWeatherLocation {
    if (!parcel.boundary || parcel.boundary.length < 3) {
      throw new Error('Parcel boundary is required to resolve weather location');
    }

    const wgs84Boundary = WeatherProvider.ensureWGS84(parcel.boundary);
    const { latitude, longitude } = WeatherProvider.calculateCentroid(wgs84Boundary);

    return {
      latitude: this.roundCoordinate(latitude),
      longitude: this.roundCoordinate(longitude),
    };
  }

  private async fetchWeatherHistorical(
    location: AiWeatherLocation,
    startDate: string,
    endDate: string,
    organizationId: string,
  ): Promise<AiWeatherApiResponse> {
    return this.fetchWeatherApi<AiWeatherApiResponse>(
      '/api/weather/historical',
      {
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        start_date: startDate,
        end_date: endDate,
      },
      organizationId,
    );
  }

  private async fetchWeatherForecast(
    location: AiWeatherLocation,
    days: number,
    organizationId: string,
  ): Promise<AiWeatherApiResponse> {
    return this.fetchWeatherApi<AiWeatherApiResponse>(
      '/api/weather/forecast',
      {
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        days: String(days),
      },
      organizationId,
    );
  }

  private async fetchWeatherApi<T>(
    path: string,
    query: Record<string, string>,
    organizationId: string,
  ): Promise<T> {
    const url = new URL(`${this.getSatelliteServiceUrl()}${path}`);
    url.search = new URLSearchParams(query).toString();

    const headers: Record<string, string> = {
      'x-organization-id': organizationId,
    };
    const internalToken = (process.env.INTERNAL_SERVICE_TOKEN || '').trim();
    if (internalToken) {
      headers['authorization'] = `Bearer ${internalToken}`;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        errorText || `Weather API request failed with status ${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private async persistHistoricalWeather(response: AiWeatherApiResponse): Promise<void> {
    if (!response.data.length) {
      return;
    }

    const client = this.databaseService.getAdminClient();
    const rows = response.data.map((entry) => ({
      latitude: this.roundCoordinate(response.latitude),
      longitude: this.roundCoordinate(response.longitude),
      date: entry.date,
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
      source: response.source ?? 'open-meteo-archive',
    }));

    const { error } = await client
      .from('weather_daily_data')
      .upsert(rows, { onConflict: 'latitude,longitude,date' });

    if (error) {
      throw new Error(`Failed to persist historical weather: ${error.message}`);
    }
  }

  private async persistForecastWeather(response: AiWeatherApiResponse): Promise<void> {
    if (!response.data.length) {
      return;
    }

    const client = this.databaseService.getAdminClient();
    const forecastDate = this.toIsoDate(new Date());
    const rows = response.data.map((entry) => ({
      latitude: this.roundCoordinate(response.latitude),
      longitude: this.roundCoordinate(response.longitude),
      forecast_date: forecastDate,
      target_date: entry.date,
      temperature_min: entry.temperature_min ?? null,
      temperature_max: entry.temperature_max ?? null,
      temperature_mean: entry.temperature_mean ?? null,
      relative_humidity_mean: entry.relative_humidity_mean ?? null,
      precipitation_sum: entry.precipitation_sum ?? null,
      wind_speed_max: entry.wind_speed_max ?? null,
      et0_fao_evapotranspiration: entry.et0_fao_evapotranspiration ?? null,
      source: response.source ?? 'open-meteo-forecast',
    }));

    const { error } = await client
      .from('weather_forecasts')
      .upsert(rows, { onConflict: 'latitude,longitude,forecast_date,target_date' });

    if (error) {
      throw new Error(`Failed to persist forecast weather: ${error.message}`);
    }
  }

  private async hasRecentSatelliteData(
    parcelId: string,
    organizationId: string,
  ): Promise<boolean> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('satellite_indices_data')
      .select('date')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .gte('date', this.getLookbackDate(RECENT_SATELLITE_LOOKBACK_DAYS))
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch recent satellite data: ${error.message}`);
    }

    return !!data;
  }

  private async hasUnresolvedAlert(
    parcelId: string,
    organizationId: string,
    alertCode: string,
  ): Promise<boolean> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('performance_alerts')
      .select('id')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('alert_code', alertCode)
      .eq('is_ai_generated', true)
      .is('resolved_at', null)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check existing alerts: ${error.message}`);
    }

    return !!data;
  }

  private async hasPendingRecommendation(
    parcelId: string,
    organizationId: string,
    alertCode: string,
  ): Promise<boolean> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('ai_recommendations')
      .select('id')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('alert_code', alertCode)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check existing recommendations: ${error.message}`);
    }

    return !!data;
  }

  private buildStressAlert(
    parcel: AiEnabledParcelJobRecord,
    diagnostics: AiDiagnosticsResponse,
  ): CreateAiAlertInput | null {
    if (!STRESS_SCENARIO_CODES.includes(diagnostics.scenario_code)) {
      return null;
    }

    const severity = diagnostics.scenario_code === 'D' ? 'critical' : 'warning';
    const alertType = diagnostics.scenario_code === 'F'
      ? 'ai_heat_stress'
      : 'ai_drought_stress';

    return {
      parcel_id: parcel.id,
      organization_id: parcel.organization_id,
      alert_type: alertType,
      severity,
      title: `AI: ${diagnostics.scenario}`,
      description: diagnostics.description,
      alert_code: `AI-SCENARIO-${diagnostics.scenario_code}`,
      category: 'ai_pipeline',
      priority: severity === 'critical' ? 'high' : 'medium',
      trigger_data: diagnostics,
    };
  }

  private buildStressRecommendation(
    parcel: AiEnabledParcelJobRecord,
    diagnostics: AiDiagnosticsResponse,
  ): CreateRecommendationDto | null {
    const mapping = SCENARIO_RECOMMENDATION_MAP[diagnostics.scenario_code];
    if (!mapping) {
      return null;
    }

    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setUTCDate(validUntil.getUTCDate() + 14);

    return {
      parcel_id: parcel.id,
      constat: mapping.constat,
      diagnostic: `${mapping.diagnostic}. ${diagnostics.description}`,
      action: mapping.action,
      alert_code: `AI-SCENARIO-${diagnostics.scenario_code}`,
      priority: mapping.priority,
      crop_type: parcel.crop_type ?? undefined,
      valid_from: this.toIsoDate(now),
      valid_until: this.toIsoDate(validUntil),
    };
  }

  private async fetchExpiredPendingRecommendations(): Promise<PendingAiRecommendationRecord[]> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('ai_recommendations')
      .select('id, organization_id, parcel_id, status, valid_until')
      .eq('status', 'pending')
      .lt('valid_until', new Date().toISOString());

    if (error) {
      throw new Error(`Failed to fetch pending recommendations: ${error.message}`);
    }

    return (data ?? []) as PendingAiRecommendationRecord[];
  }

  private async markRecommendationAsExpired(
    recommendation: PendingAiRecommendationRecord,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('ai_recommendations')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendation.id)
      .eq('organization_id', recommendation.organization_id);

    if (error) {
      throw new Error(`Failed to expire recommendation: ${error.message}`);
    }
  }

  private getSatelliteServiceUrl(): string {
    const baseUrl = process.env.SATELLITE_SERVICE_URL || 'http://localhost:8001';
    return baseUrl.replace(/\/+$/, '');
  }

  private getLookbackDate(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return this.toIsoDate(date);
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private roundCoordinate(value: number): number {
    return Number(value.toFixed(2));
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
