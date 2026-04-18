import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

// ─── Interfaces ──────────────────────────────────────────────

export interface DailyWeatherData {
  date: string;
  temperature_min: number;
  temperature_mean: number;
  temperature_max: number;
  precipitation: number;
  et0: number;
  humidity: number;
  wind_speed: number;
  is_wet_day: boolean;
}

export interface CurrentWeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_direction: number;
  description: string;
  icon: string;
  uvi: number;
  clouds: number;
  visibility: number;
}

export interface ForecastDay {
  date: string;
  temp: { day: number; min: number; max: number };
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  precipitation: number;
}

export interface MonthlyAggregate {
  month: string;
  precipitation_total: number;
  precipitation_ltn: number;
  avg_temp: number;
  gdd_total: number;
  wet_days_count: number;
  dry_days_count: number;
}

export interface TemperatureTimeSeries {
  date: string;
  current_min: number;
  current_mean: number;
  current_max: number;
  ltn_min: number;
  ltn_mean: number;
  ltn_max: number;
}

export interface ClimateNormalsEntry {
  month: number;
  day: number;
  temperature_min: number;
  temperature_mean: number;
  temperature_max: number;
  precipitation_avg: number;
  wet_days_probability: number;
}

export interface WeatherAnalyticsResponse {
  current: CurrentWeatherData | null;
  forecast: ForecastDay[];
  daily: DailyWeatherData[];
  monthly: MonthlyAggregate[];
  temperature_series: TemperatureTimeSeries[];
  alerts: any[];
  location: { latitude: number; longitude: number };
  start_date: string;
  end_date: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function toWGS84(coord: number[]): [number, number] {
  const [x, y] = coord;
  if (Math.abs(x) > 180 || Math.abs(y) > 90) {
    const lon = (x / 20037508.34) * 180;
    const lat =
      (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360) / Math.PI - 90;
    return [lon, lat];
  }
  return [x, y];
}

function ensureWGS84(boundary: number[][]): number[][] {
  return boundary.map(toWGS84);
}

function calculateCentroid(boundary: number[][]): {
  lat: number;
  lon: number;
} {
  const wgs = ensureWGS84(boundary);
  let sLat = 0;
  let sLon = 0;
  for (const [lon, lat] of wgs) {
    sLat += lat;
    sLon += lon;
  }
  return { lat: sLat / wgs.length, lon: sLon / wgs.length };
}

function wmoToIcon(code: number): string {
  if (code <= 1) return '01d';
  if (code <= 3) return '02d';
  if (code <= 48) return '50d';
  if (code <= 55) return '09d';
  if (code <= 65) return '10d';
  if (code <= 77) return '13d';
  if (code <= 82) return '09d';
  if (code <= 99) return '11d';
  return '03d';
}

function wmoToDesc(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 55) return 'Drizzle';
  if (code <= 65) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

// ─── Service ─────────────────────────────────────────────────

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly archiveUrl =
    'https://archive-api.open-meteo.com/v1/archive';
  private readonly forecastUrl =
    'https://api.open-meteo.com/v1/forecast';

  constructor(private readonly db: DatabaseService) {}

  /**
   * Main endpoint: get full weather analytics for a parcel.
   * This is the single source of truth used by both web and mobile.
   */
  async getParcelWeather(
    parcelId: string,
    organizationId: string,
    startDate: string,
    endDate: string,
  ): Promise<WeatherAnalyticsResponse> {
    // 1. Get parcel boundary from database
    const boundary = await this.getParcelBoundary(parcelId, organizationId);
    if (!boundary || boundary.length < 3) {
      this.logger.warn(`No boundary for parcel ${parcelId}`);
      return this.emptyResponse(startDate, endDate);
    }

    const { lat, lon } = calculateCentroid(boundary);

    // 2. Fetch all data in parallel
    const [daily, forecastData, normals] = await Promise.all([
      this.fetchArchiveData(lat, lon, startDate, endDate),
      this.fetchForecast(lat, lon),
      this.fetchClimateNormals(lat, lon),
    ]);

    // 3. Compute derived metrics
    const monthly = this.computeMonthlyAggregates(daily, normals);
    const temperature_series = this.buildTemperatureSeries(daily, normals);

    return {
      current: forecastData.current,
      forecast: forecastData.forecast,
      daily,
      monthly,
      temperature_series,
      alerts: [],
      location: { latitude: lat, longitude: lon },
      start_date: startDate,
      end_date: endDate,
    };
  }

  // ─── Data Fetching ───────────────────────────────────────

  private async getParcelBoundary(
    parcelId: string,
    organizationId: string,
  ): Promise<number[][] | null> {
    try {
      const client = this.db.getAdminClient();
      const { data } = await client
        .from('parcels')
        .select('boundary, farms!inner(organization_id)')
        .eq('id', parcelId)
        .eq('farms.organization_id', organizationId)
        .maybeSingle();
      return data?.boundary as number[][] | null;
    } catch (err) {
      this.logger.error(`Failed to get boundary for ${parcelId}`, err);
      return null;
    }
  }

  private async fetchArchiveData(
    lat: number,
    lon: number,
    startDate: string,
    endDate: string,
  ): Promise<DailyWeatherData[]> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        start_date: startDate,
        end_date: endDate,
        daily:
          'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,et0_fao_evapotranspiration,relative_humidity_2m_mean,wind_speed_10m_max',
        timezone: 'auto',
      });

      const res = await fetch(`${this.archiveUrl}?${params}`);
      if (!res.ok) {
        this.logger.warn(`Open-Meteo archive error: ${res.status}`);
        return [];
      }

      const json = await res.json();
      const d = json.daily;
      if (!d?.time) return [];

      return d.time.map((date: string, i: number) => ({
        date,
        temperature_min: d.temperature_2m_min?.[i] ?? 0,
        temperature_mean: d.temperature_2m_mean?.[i] ?? 0,
        temperature_max: d.temperature_2m_max?.[i] ?? 0,
        precipitation: d.precipitation_sum?.[i] ?? 0,
        et0: d.et0_fao_evapotranspiration?.[i] ?? 0,
        humidity: d.relative_humidity_2m_mean?.[i] ?? 0,
        wind_speed: d.wind_speed_10m_max?.[i] ?? 0,
        is_wet_day: (d.precipitation_sum?.[i] ?? 0) > 1,
      }));
    } catch (err) {
      this.logger.error('Failed to fetch archive data', err);
      return [];
    }
  }

  private async fetchForecast(
    lat: number,
    lon: number,
  ): Promise<{ current: CurrentWeatherData | null; forecast: ForecastDay[] }> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current:
          'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m',
        daily:
          'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max',
        timezone: 'auto',
        forecast_days: '16',
      });

      const res = await fetch(`${this.forecastUrl}?${params}`);
      if (!res.ok) return { current: null, forecast: [] };

      const json = await res.json();

      let current: CurrentWeatherData | null = null;
      if (json.current) {
        const c = json.current;
        current = {
          temp: c.temperature_2m ?? 0,
          feels_like: c.apparent_temperature ?? c.temperature_2m ?? 0,
          humidity: c.relative_humidity_2m ?? 0,
          pressure: c.pressure_msl ?? 0,
          wind_speed: Math.round((c.wind_speed_10m ?? 0) * 3.6),
          wind_direction: c.wind_direction_10m ?? 0,
          description: wmoToDesc(c.weather_code ?? 0),
          icon: wmoToIcon(c.weather_code ?? 0),
          uvi: 0,
          clouds: c.cloud_cover ?? 0,
          visibility: 10000,
        };
      }

      const forecast: ForecastDay[] = [];
      if (json.daily?.time) {
        const d = json.daily;
        for (let i = 0; i < d.time.length; i++) {
          forecast.push({
            date: d.time[i],
            temp: {
              day: ((d.temperature_2m_max?.[i] ?? 0) + (d.temperature_2m_min?.[i] ?? 0)) / 2,
              min: d.temperature_2m_min?.[i] ?? 0,
              max: d.temperature_2m_max?.[i] ?? 0,
            },
            humidity: 0,
            windSpeed: Math.round((d.wind_speed_10m_max?.[i] ?? 0) * 3.6),
            description: wmoToDesc(d.weather_code?.[i] ?? 0),
            icon: wmoToIcon(d.weather_code?.[i] ?? 0),
            precipitation: d.precipitation_sum?.[i] ?? 0,
          });
        }
      }

      return { current, forecast };
    } catch (err) {
      this.logger.error('Failed to fetch forecast', err);
      return { current: null, forecast: [] };
    }
  }

  private async fetchClimateNormals(
    lat: number,
    lon: number,
  ): Promise<Record<string, ClimateNormalsEntry>> {
    try {
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear - 10}-01-01`;
      const endDate = `${currentYear - 1}-12-31`;

      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        start_date: startDate,
        end_date: endDate,
        daily:
          'temperature_2m_min,temperature_2m_mean,temperature_2m_max,precipitation_sum',
        timezone: 'auto',
      });

      const res = await fetch(`${this.archiveUrl}?${params}`);
      if (!res.ok) return {};

      const json = await res.json();
      const d = json.daily;
      if (!d?.time) return {};

      const dayStats: Record<
        string,
        {
          mins: number[];
          means: number[];
          maxs: number[];
          precips: number[];
          wetDays: number;
          totalDays: number;
        }
      > = {};

      d.time.forEach((dateStr: string, i: number) => {
        const date = new Date(dateStr);
        const key = `${date.getMonth() + 1}-${date.getDate()}`;

        if (!dayStats[key]) {
          dayStats[key] = { mins: [], means: [], maxs: [], precips: [], wetDays: 0, totalDays: 0 };
        }

        dayStats[key].mins.push(d.temperature_2m_min[i]);
        dayStats[key].means.push(d.temperature_2m_mean[i]);
        dayStats[key].maxs.push(d.temperature_2m_max[i]);
        dayStats[key].precips.push(d.precipitation_sum[i]);
        if (d.precipitation_sum[i] > 1) dayStats[key].wetDays++;
        dayStats[key].totalDays++;
      });

      const normals: Record<string, ClimateNormalsEntry> = {};
      for (const [key, s] of Object.entries(dayStats)) {
        const [month, day] = key.split('-').map(Number);
        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
        normals[key] = {
          month,
          day,
          temperature_min: avg(s.mins),
          temperature_mean: avg(s.means),
          temperature_max: avg(s.maxs),
          precipitation_avg: avg(s.precips),
          wet_days_probability: s.wetDays / s.totalDays,
        };
      }

      return normals;
    } catch (err) {
      this.logger.error('Failed to fetch climate normals', err);
      return {};
    }
  }

  // ─── Derived Metrics ─────────────────────────────────────

  private computeMonthlyAggregates(
    daily: DailyWeatherData[],
    normals: Record<string, ClimateNormalsEntry>,
  ): MonthlyAggregate[] {
    const map = new Map<
      string,
      { precip: number; temps: number[]; gdd: number; wet: number; dry: number }
    >();

    for (const d of daily) {
      const month = d.date.substring(0, 7);
      const entry = map.get(month) ?? { precip: 0, temps: [], gdd: 0, wet: 0, dry: 0 };
      entry.precip += d.precipitation;
      const avg = (d.temperature_max + d.temperature_min) / 2;
      entry.temps.push(avg);
      if (avg > 10) entry.gdd += avg - 10;
      d.is_wet_day ? entry.wet++ : entry.dry++;
      map.set(month, entry);
    }

    return Array.from(map.entries())
      .map(([month, v]) => {
        const [, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(parseInt(month), monthNum, 0).getDate();
        const monthNormals = Object.values(normals).filter((n) => n.month === monthNum);
        const avgPrecip = monthNormals.length
          ? monthNormals.reduce((s, n) => s + n.precipitation_avg, 0) / monthNormals.length
          : 0;

        return {
          month,
          precipitation_total: v.precip,
          precipitation_ltn: avgPrecip * daysInMonth,
          avg_temp: v.temps.reduce((s, t) => s + t, 0) / v.temps.length,
          gdd_total: v.gdd,
          wet_days_count: v.wet,
          dry_days_count: v.dry,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private buildTemperatureSeries(
    daily: DailyWeatherData[],
    normals: Record<string, ClimateNormalsEntry>,
  ): TemperatureTimeSeries[] {
    return daily.map((d) => {
      const date = new Date(d.date);
      const key = `${date.getMonth() + 1}-${date.getDate()}`;
      const n = normals[key];
      return {
        date: d.date,
        current_min: d.temperature_min,
        current_mean: d.temperature_mean,
        current_max: d.temperature_max,
        ltn_min: n?.temperature_min ?? d.temperature_min,
        ltn_mean: n?.temperature_mean ?? d.temperature_mean,
        ltn_max: n?.temperature_max ?? d.temperature_max,
      };
    });
  }

  private emptyResponse(
    startDate: string,
    endDate: string,
  ): WeatherAnalyticsResponse {
    return {
      current: null,
      forecast: [],
      daily: [],
      monthly: [],
      temperature_series: [],
      alerts: [],
      location: { latitude: 0, longitude: 0 },
      start_date: startDate,
      end_date: endDate,
    };
  }
}
