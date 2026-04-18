// Weather API Client for Mobile App
// Single source of truth: NestJS /weather/parcel/:id endpoint
import { api } from '../api';
import type { WeatherData, MonthlyAggregate, WeatherAlert, TimeRange } from '@/types/weather';

const BASE = '/weather';

export const weatherApi = {
  /**
   * Get full weather analytics for a parcel.
   * Calls GET /weather/parcel/:parcelId?start_date=...&end_date=...
   * NestJS fetches from Open-Meteo, computes monthly aggregates, LTN, etc.
   */
  async getWeatherData(parcelId: string, startDate?: string, endDate?: string): Promise<WeatherData> {
    if (!parcelId) return emptyData();

    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];
    const end = endDate || new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    try {
      const data = await api.get<any>(
        `${BASE}/parcel/${parcelId}?start_date=${start}&end_date=${end}`,
      );
      return {
        current: data?.current ?? null,
        forecast: data?.forecast ?? [],
        daily: data?.daily ?? [],
        monthly: data?.monthly ?? [],
        alerts: data?.alerts ?? [],
      };
    } catch {
      return emptyData();
    }
  },

  async getCurrentWeather(parcelId: string): Promise<WeatherData['current']> {
    const data = await weatherApi.getWeatherData(parcelId);
    return data.current;
  },

  async getForecast(parcelId: string): Promise<WeatherData['forecast']> {
    const data = await weatherApi.getWeatherData(parcelId);
    return data.forecast;
  },

  async getClimateNormals(_parcelId: string): Promise<any[]> {
    return [];
  },

  async getMonthlyMetrics(parcelId: string, timeRange: TimeRange = 'last-12-months'): Promise<MonthlyAggregate[]> {
    const now = new Date();
    const months = timeRange === 'last-3-months' ? 3 : timeRange === 'last-6-months' ? 6 : 12;
    const start = new Date(now.getFullYear(), now.getMonth() - months, 1).toISOString().split('T')[0];
    const end = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    const data = await weatherApi.getWeatherData(parcelId, start, end);
    return data.monthly ?? [];
  },

  async getAlerts(_parcelId: string): Promise<WeatherAlert[]> {
    return [];
  },
};

function emptyData(): WeatherData {
  return { current: null, forecast: [], daily: [], monthly: [], alerts: [] };
}
