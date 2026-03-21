// Weather API Client for Mobile App
// All weather data goes through NestJS satellite-proxy which integrates Open-Meteo
import { api } from '../api';
import type { WeatherData, ClimateNormals, MonthlyAggregate, WeatherAlert, TimeRange } from '@/types/weather';

// Weather endpoints are under /satellite-proxy/weather/
const BASE = '/satellite-proxy/weather';

export const weatherApi = {
  /**
   * Get full weather data for a parcel (current + forecast + daily).
   * Uses GET /satellite-proxy/weather/parcel/:parcelId
   */
  async getWeatherData(parcelId: string, startDate?: string, endDate?: string): Promise<WeatherData> {
    try {
      if (!parcelId) return { current: null, forecast: [], daily: [], monthly: [], alerts: [] };

      // Endpoint requires start_date and end_date
      const now = new Date();
      const start = startDate || new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0];
      const end = endDate || now.toISOString().split('T')[0];

      const params = new URLSearchParams({ start_date: start, end_date: end });
      const data = await api.get<any>(
        `${BASE}/parcel/${parcelId}?${params.toString()}`,
      );
      return {
        current: data?.current ?? null,
        forecast: data?.forecast ?? [],
        daily: data?.daily ?? [],
        monthly: data?.monthly ?? [],
        alerts: data?.alerts ?? [],
      };
    } catch {
      return { current: null, forecast: [], daily: [], monthly: [], alerts: [] };
    }
  },

  /**
   * Get current weather for a parcel
   */
  async getCurrentWeather(parcelId: string): Promise<WeatherData['current']> {
    const data = await weatherApi.getWeatherData(parcelId);
    return data.current;
  },

  /**
   * Get weather forecast for a parcel (7 days)
   */
  async getForecast(parcelId: string): Promise<WeatherData['forecast']> {
    try {
      const data = await api.get<any>(`${BASE}/forecast?parcel_id=${parcelId}`);
      return data?.forecast ?? data ?? [];
    } catch {
      const full = await weatherApi.getWeatherData(parcelId);
      return full.forecast;
    }
  },

  /**
   * Get historical weather data.
   * Uses GET /satellite-proxy/weather/historical
   */
  async getHistoricalWeather(
    parcelId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    try {
      return await api.get<any>(
        `${BASE}/historical?parcel_id=${parcelId}&start_date=${startDate}&end_date=${endDate}`,
      );
    } catch {
      return null;
    }
  },

  /**
   * Get derived weather calculations (GDD, chill hours).
   * Uses POST /satellite-proxy/weather/derived
   */
  async getDerivedWeather(
    parcelId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    try {
      return await api.post<any>(`${BASE}/derived`, {
        parcel_id: parcelId,
        start_date: startDate,
        end_date: endDate,
      });
    } catch {
      return null;
    }
  },

  /**
   * Get climate normals for a parcel.
   * Tries the parcel weather endpoint and extracts climate data,
   * or uses historical data to compute normals.
   */
  async getClimateNormals(parcelId: string): Promise<ClimateNormals[]> {
    try {
      const data = await weatherApi.getWeatherData(parcelId);
      // If the parcel endpoint returns climate normals, use them
      if ((data as any)?.climate_normals) return (data as any).climate_normals;
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Get monthly aggregates for a parcel.
   * Extracts from the full weather data response.
   */
  async getMonthlyMetrics(
    parcelId: string,
    timeRange: TimeRange = 'last-12-months',
  ): Promise<MonthlyAggregate[]> {
    try {
      const now = new Date();
      const months = timeRange === 'last-3-months' ? 3 : timeRange === 'last-6-months' ? 6 : 12;
      const start = new Date(now.getFullYear(), now.getMonth() - months, 1).toISOString().split('T')[0];
      const end = now.toISOString().split('T')[0];
      const data = await weatherApi.getWeatherData(parcelId, start, end);
      return data.monthly ?? [];
    } catch {
      return [];
    }
  },

  /**
   * Get weather alerts for a parcel.
   * Extracts from the full weather data response.
   */
  async getAlerts(parcelId: string): Promise<WeatherAlert[]> {
    try {
      const data = await weatherApi.getWeatherData(parcelId);
      return data.alerts ?? [];
    } catch {
      return [];
    }
  },
};
