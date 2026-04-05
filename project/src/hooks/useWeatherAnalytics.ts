import { useState, useEffect } from 'react';
import {
  weatherClimateService,
  type WeatherAnalyticsData,
  type MonthlyWeatherData,
  type TemperatureTimeSeries,
  type EvapotranspirationTimeSeries,
  type MonthlyEvapotranspirationData,
  type ParcelForecastDay,
} from '../services/weatherClimateService';
import { apiRequest } from '../lib/api-client';

interface WeatherApiForecastDay {
  date?: string;
  temp?: {
    day?: number;
    min?: number;
    max?: number;
  };
  humidity?: number;
  windSpeed?: number;
  description?: string;
  icon?: string;
  precipitation?: number;
}

interface WeatherApiDailyPoint {
  date: string;
  et0_fao_evapotranspiration?: number | null;
  et0?: number | null;
  temperature_min?: number | null;
  temp_min?: number | null;
  temperature_mean?: number | null;
  temperature_max?: number | null;
  temp_max?: number | null;
  ltn_min?: number | null;
  ltn_mean?: number | null;
  ltn_max?: number | null;
}

interface WeatherApiMonthlyPoint {
  month: string;
  precipitation_total?: number;
  precipitation_ltn?: number;
  wet_days_count?: number;
  dry_days_count?: number;
}

interface WeatherApiResponse {
  forecast?: WeatherApiForecastDay[];
  temperature_series?: TemperatureTimeSeries[];
  daily?: WeatherApiDailyPoint[];
  monthly?: WeatherApiMonthlyPoint[];
  evapotranspiration_series?: EvapotranspirationTimeSeries[];
  monthly_evapotranspiration?: MonthlyEvapotranspirationData[];
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

export type TimeRange = 'last-3-months' | 'last-6-months' | 'last-12-months' | 'ytd' | 'custom';

interface UseWeatherAnalyticsOptions {
  parcelId?: string;
  parcelBoundary: number[][] | null;
  timeRange?: TimeRange;
  customStartDate?: string;
  customEndDate?: string;
}

/**
 * Weather analytics hook.
 * Tries NestJS GET /weather/parcel/:id first (Open-Meteo on server; optional OpenWeather only for chat context on API).
 * Falls back to client-side Open-Meteo if NestJS is unavailable — no weather API key in the browser.
 */
export function useWeatherAnalytics({
  parcelId,
  parcelBoundary,
  timeRange = 'last-12-months',
  customStartDate,
  customEndDate,
}: UseWeatherAnalyticsOptions) {
  const [data, setData] = useState<WeatherAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parcelBoundary || parcelBoundary.length === 0) {
      setData(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = calculateDateRange(timeRange, customStartDate, customEndDate);

      // Try NestJS first if parcelId is available
      if (parcelId) {
        try {
          const result = await apiRequest<WeatherApiResponse>(
            `/api/v1/weather/parcel/${parcelId}?start_date=${startDate}&end_date=${endDate}`,
          );

          if (
            result &&
            (result.forecast?.length ||
              result.temperature_series?.length ||
              result.daily?.length)
          ) {
            setData({
              temperature_series: result.temperature_series ?? mapDailyToTempSeries(result.daily),
              monthly_precipitation: result.monthly?.map(mapMonthlyToWeatherData) ?? [],
              evapotranspiration_series: result.evapotranspiration_series ?? mapDailyToETSeries(result.daily),
              monthly_evapotranspiration: result.monthly_evapotranspiration ?? [],
              start_date: startDate,
              end_date: endDate,
              location: result.location ?? { latitude: 0, longitude: 0 },
              forecast: normalizeApiForecast(result.forecast),
            });
            setLoading(false);
            return;
          }
        } catch {
          // NestJS not available — fall through to client-side
        }
      }

      // Fallback: client-side Open-Meteo (original approach)
      try {
        const analyticsData = await weatherClimateService.getWeatherAnalytics(
          parcelBoundary,
          startDate,
          endDate,
        );
        setData(analyticsData);
      } catch (err) {
        console.error('Error fetching weather analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch weather analytics');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [parcelId, parcelBoundary, timeRange, customStartDate, customEndDate]);

  return { data, loading, error };
}

function normalizeApiForecast(raw: unknown): ParcelForecastDay[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((day: WeatherApiForecastDay) => ({
    date: typeof day.date === 'string' ? day.date : String(day.date ?? ''),
    temp: {
      day: Number(day.temp?.day ?? 0),
      min: Number(day.temp?.min ?? 0),
      max: Number(day.temp?.max ?? 0),
    },
    humidity: Number(day.humidity ?? 0),
    windSpeed: Number(day.windSpeed ?? 0),
    description: String(day.description ?? ''),
    icon: String(day.icon ?? '03d'),
    precipitation: Number(day.precipitation ?? 0),
  }));
}

function mapDailyToETSeries(daily: WeatherApiDailyPoint[]): EvapotranspirationTimeSeries[] {
  if (!daily) return [];
  return daily
    .filter((d) => d.et0_fao_evapotranspiration != null || d.et0 != null)
    .map((d) => ({
      date: d.date,
      et0: d.et0_fao_evapotranspiration ?? d.et0 ?? 0,
    }));
}

function mapDailyToTempSeries(daily: WeatherApiDailyPoint[]): TemperatureTimeSeries[] {
  if (!daily) return [];
  return daily.map((d) => ({
    date: d.date,
    current_min: d.temperature_min ?? d.temp_min ?? 0,
    current_mean: d.temperature_mean ?? ((d.temp_max ?? 0) + (d.temp_min ?? 0)) / 2,
    current_max: d.temperature_max ?? d.temp_max ?? 0,
    ltn_min: d.ltn_min ?? d.temperature_min ?? d.temp_min ?? 0,
    ltn_mean: d.ltn_mean ?? d.temperature_mean ?? ((d.temp_max ?? 0) + (d.temp_min ?? 0)) / 2,
    ltn_max: d.ltn_max ?? d.temperature_max ?? d.temp_max ?? 0,
  }));
}

function mapMonthlyToWeatherData(m: WeatherApiMonthlyPoint): MonthlyWeatherData {
  return {
    month: m.month,
    precipitation_total: m.precipitation_total ?? 0,
    precipitation_ltn: m.precipitation_ltn ?? 0,
    wet_days_count: m.wet_days_count ?? 0,
    wet_days_ltn: 0,
    dry_days_count: m.dry_days_count ?? 0,
    dry_days_ltn: 0,
    dry_spell_conditions_count: 0,
    dry_spell_conditions_ltn: 1.5,
    short_dry_spells_count: 0,
    short_dry_spells_ltn: 4,
  };
}

function calculateDateRange(
  timeRange: TimeRange,
  customStartDate?: string,
  customEndDate?: string,
): { startDate: string; endDate: string } {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  let startDate: Date;

  switch (timeRange) {
    case 'last-3-months':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'last-6-months':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'last-12-months':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (!customStartDate || !customEndDate) {
        throw new Error('Custom date range requires both start and end dates');
      }
      return { startDate: customStartDate, endDate: customEndDate };
    default:
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(yesterday),
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
