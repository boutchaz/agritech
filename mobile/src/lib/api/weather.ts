// Weather API Client for Mobile App
import { api } from '../api';
import type { WeatherData, ClimateNormals, TimeRange } from '@/types/weather';

const BASE_URL = '/weather';

export const weatherApi = {
  /**
   * Get current weather for a parcel
   */
  async getCurrentWeather(parcelId: string): Promise<WeatherData['current']> {
    return api.get<WeatherData['current']>(`${BASE_URL}/current?parcel_id=${parcelId}`);
  },

  /**
   * Get weather forecast for a parcel (7 days)
   */
  async getForecast(parcelId: string): Promise<WeatherData['forecast']> {
    return api.get<WeatherData['forecast']>(`${BASE_URL}/forecast?parcel_id=${parcelId}`);
  },

  /**
   * Get full weather data for a parcel
   */
  async getWeatherData(parcelId: string): Promise<WeatherData> {
    return api.get<WeatherData>(`${BASE_URL}/parcel/${parcelId}`);
  },

  /**
   * Get climate normals for a parcel
   */
  async getClimateNormals(parcelId: string): Promise<ClimateNormals[]> {
    return api.get<ClimateNormals[]>(`${BASE_URL}/climate-normals?parcel_id=${parcelId}`);
  },

  /**
   * Get monthly aggregates for a parcel
   */
  async getMonthlyMetrics(
    parcelId: string,
    timeRange: TimeRange = 'last-12-months',
  ): Promise<WeatherData['monthly']> {
    return api.get<WeatherData['monthly']>(
      `${BASE_URL}/monthly?parcel_id=${parcelId}&range=${timeRange}`,
    );
  },

  /**
   * Get weather alerts for a parcel
   */
  async getAlerts(parcelId: string): Promise<WeatherData['alerts']> {
    return api.get<WeatherData['alerts']>(`${BASE_URL}/alerts?parcel_id=${parcelId}`);
  },
};
