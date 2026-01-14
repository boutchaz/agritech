import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface WeatherForecast {
  date: string;
  temp: {
    day: number;
    min: number;
    max: number;
  };
  humidity: number;
  windSpeed: number;
  description: string;
  precipitation: number;
  rainProbability?: number;
}

export interface WeatherForecastResponse {
  forecasts: WeatherForecast[];
  location: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Weather Provider Service
 * Fetches weather forecast data from OpenWeatherMap API
 */
@Injectable()
export class WeatherProvider {
  private readonly logger = new Logger(WeatherProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENWEATHER_API_KEY', '');
  }

  /**
   * Validate that the API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Get weather forecast for a location
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @param days Number of days to forecast (default: 5)
   */
  async getForecast(
    latitude: number,
    longitude: number,
    days: number = 5,
  ): Promise<WeatherForecastResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenWeatherMap API key is not configured');
    }

    this.logger.log(
      `Fetching ${days}-day weather forecast for lat: ${latitude}, lon: ${longitude}`,
    );

    try {
      const response = await axios.get(
        `${this.baseUrl}/forecast/daily`,
        {
          params: {
            lat: latitude,
            lon: longitude,
            cnt: days,
            units: 'metric',
            appid: this.apiKey,
          },
          timeout: 10000, // 10 second timeout
        },
      );

      const forecasts: WeatherForecast[] = response.data.list.map(
        (day: any) => ({
          date: new Date(day.dt * 1000).toISOString().split('T')[0],
          temp: {
            day: Math.round(day.temp.day),
            min: Math.round(day.temp.min),
            max: Math.round(day.temp.max),
          },
          humidity: day.humidity,
          windSpeed: Math.round(day.speed * 3.6), // Convert m/s to km/h
          description: day.weather[0].description,
          precipitation: day.rain || day.snow || 0,
          rainProbability: day.pop ? Math.round(day.pop * 100) : undefined,
        }),
      );

      this.logger.log(
        `Successfully fetched ${forecasts.length} days of forecast data`,
      );

      return {
        forecasts,
        location: {
          latitude,
          longitude,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          (error as AxiosError).response?.data ||
          error.message;
        this.logger.error(`Weather API error: ${errorMessage}`);
        throw new Error(
          `Failed to fetch weather forecast: ${errorMessage}`,
        );
      }
      throw error;
    }
  }

  /**
   * Calculate centroid from parcel boundary coordinates
   */
  static calculateCentroid(
    boundary: number[][],
  ): { latitude: number; longitude: number } {
    if (!boundary || boundary.length === 0) {
      throw new Error('Invalid boundary: empty array');
    }

    let sumLat = 0;
    let sumLon = 0;

    boundary.forEach(([lon, lat]) => {
      sumLat += lat;
      sumLon += lon;
    });

    return {
      latitude: sumLat / boundary.length,
      longitude: sumLon / boundary.length,
    };
  }

  /**
   * Detect if coordinates are in Web Mercator and convert to WGS84 if needed
   */
  static ensureWGS84(boundary: number[][]): number[][] {
    const firstCoord = boundary[0];

    // Web Mercator coordinates are much larger than WGS84
    if (Math.abs(firstCoord[0]) > 180 || Math.abs(firstCoord[1]) > 90) {
      // Convert from Web Mercator to WGS84
      return boundary.map(([x, y]) => {
        const lon = (x / 20037508.34) * 180;
        const lat =
          Math.atan(Math.exp((y / 20037508.34) * Math.PI)) *
            (360 / Math.PI) -
          90;
        return [lon, lat];
      });
    }

    return boundary;
  }
}
