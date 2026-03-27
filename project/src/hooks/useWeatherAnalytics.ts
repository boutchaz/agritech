import { useState, useEffect } from 'react';
import { weatherClimateService, WeatherAnalyticsData, MonthlyWeatherData, TemperatureTimeSeries, EvapotranspirationTimeSeries, MonthlyEvapotranspirationData } from '../services/weatherClimateService';
import { apiRequest } from '../lib/api-client';

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
 * Tries NestJS GET /weather/parcel/:id first (single source of truth).
 * Falls back to client-side Open-Meteo if NestJS is unavailable.
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
          const result = await apiRequest<any>(
            `/api/v1/weather/parcel/${parcelId}?start_date=${startDate}&end_date=${endDate}`,
          );

          if (result && (result.temperature_series?.length || result.daily?.length)) {
            setData({
              temperature_series: result.temperature_series ?? mapDailyToTempSeries(result.daily),
              monthly_precipitation: result.monthly?.map(mapMonthlyToWeatherData) ?? [],
              evapotranspiration_series: result.evapotranspiration_series ?? mapDailyToETSeries(result.daily),
              monthly_evapotranspiration: result.monthly_evapotranspiration ?? [],
              start_date: startDate,
              end_date: endDate,
              location: result.location ?? { latitude: 0, longitude: 0 },
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

function mapDailyToETSeries(daily: any[]): EvapotranspirationTimeSeries[] {
  if (!daily) return [];
  return daily
    .filter((d: any) => d.et0_fao_evapotranspiration != null || d.et0 != null)
    .map((d: any) => ({
      date: d.date,
      et0: d.et0_fao_evapotranspiration ?? d.et0 ?? 0,
    }));
}

function mapDailyToTempSeries(daily: any[]): TemperatureTimeSeries[] {
  if (!daily) return [];
  return daily.map((d: any) => ({
    date: d.date,
    current_min: d.temperature_min ?? d.temp_min ?? 0,
    current_mean: d.temperature_mean ?? ((d.temp_max ?? 0) + (d.temp_min ?? 0)) / 2,
    current_max: d.temperature_max ?? d.temp_max ?? 0,
    ltn_min: d.ltn_min ?? d.temperature_min ?? d.temp_min ?? 0,
    ltn_mean: d.ltn_mean ?? d.temperature_mean ?? ((d.temp_max ?? 0) + (d.temp_min ?? 0)) / 2,
    ltn_max: d.ltn_max ?? d.temperature_max ?? d.temp_max ?? 0,
  }));
}

function mapMonthlyToWeatherData(m: any): MonthlyWeatherData {
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
