/**
 * Weather & Climate Analytics Service
 * Integrates with Open-Meteo API for weather data and climate normals
 */

export interface DailyWeatherData {
  date: string;
  temperature_min: number;
  temperature_mean: number;
  temperature_max: number;
  precipitation: number;
  is_wet_day: boolean; // > 1mm
}

export interface MonthlyWeatherData {
  month: string; // "2024-01"
  precipitation_total: number;
  precipitation_ltn: number; // Long-term normal
  wet_days_count: number;
  wet_days_ltn: number;
  dry_days_count: number;
  dry_days_ltn: number;
  dry_spell_conditions_count: number; // 5 consecutive days with < 5mm
  dry_spell_conditions_ltn: number;
  short_dry_spells_count: number; // 1-3 consecutive dry days
  short_dry_spells_ltn: number;
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

export interface WeatherAnalyticsData {
  temperature_series: TemperatureTimeSeries[];
  monthly_precipitation: MonthlyWeatherData[];
  start_date: string;
  end_date: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface ClimateNormals {
  month: number; // 1-12
  day: number; // 1-31
  temperature_min: number;
  temperature_mean: number;
  temperature_max: number;
  precipitation_avg: number;
  wet_days_probability: number;
}

/**
 * Calculate the centroid of a polygon boundary
 */
function calculateCentroid(boundary: number[][]): { lat: number; lon: number } {
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
    lat: sumLat / boundary.length,
    lon: sumLon / boundary.length,
  };
}

/**
 * Detect if coordinates are in Web Mercator and convert to WGS84 if needed
 */
function ensureWGS84(boundary: number[][]): number[][] {
  const firstCoord = boundary[0];

  if (Math.abs(firstCoord[0]) > 180 || Math.abs(firstCoord[1]) > 90) {
    // Convert from Web Mercator to WGS84
    return boundary.map(([x, y]) => {
      const lon = (x / 20037508.34) * 180;
      const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
      return [lon, lat];
    });
  }

  return boundary;
}

class WeatherClimateService {
  private readonly archiveUrl = 'https://archive-api.open-meteo.com/v1';

  /**
   * Fetch current weather data for a date range
   */
  async getCurrentWeatherData(
    latitude: number,
    longitude: number,
    startDate: string,
    endDate: string
  ): Promise<DailyWeatherData[]> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      start_date: startDate,
      end_date: endDate,
      daily: 'temperature_2m_min,temperature_2m_mean,temperature_2m_max,precipitation_sum',
      timezone: 'auto',
    });

    const url = `${this.archiveUrl}/archive?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();

    return data.daily.time.map((date: string, i: number) => ({
      date,
      temperature_min: data.daily.temperature_2m_min[i],
      temperature_mean: data.daily.temperature_2m_mean[i],
      temperature_max: data.daily.temperature_2m_max[i],
      precipitation: data.daily.precipitation_sum[i],
      is_wet_day: data.daily.precipitation_sum[i] > 1,
    }));
  }

  /**
   * Generate climate normals based on historical averages
   * Uses Open-Meteo's 30-year climate data
   */
  async getClimateNormals(
    latitude: number,
    longitude: number
  ): Promise<Record<string, ClimateNormals>> {
    // Get historical data for past 30 years (or as much as available)
    const currentYear = new Date().getFullYear();
    const historicalYears = 10; // Open-Meteo archive typically has ~10 years free

    const endDate = `${currentYear - 1}-12-31`;
    const startDate = `${currentYear - historicalYears}-01-01`;

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      start_date: startDate,
      end_date: endDate,
      daily: 'temperature_2m_min,temperature_2m_mean,temperature_2m_max,precipitation_sum',
      timezone: 'auto',
    });

    const url = `${this.archiveUrl}/archive?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Climate normals API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Calculate averages by day-of-year
    const dayStats: Record<string, {
      temps_min: number[];
      temps_mean: number[];
      temps_max: number[];
      precips: number[];
      wet_days: number;
      total_days: number;
    }> = {};

    data.daily.time.forEach((dateStr: string, i: number) => {
      const date = new Date(dateStr);
      const monthDay = `${date.getMonth() + 1}-${date.getDate()}`;

      if (!dayStats[monthDay]) {
        dayStats[monthDay] = {
          temps_min: [],
          temps_mean: [],
          temps_max: [],
          precips: [],
          wet_days: 0,
          total_days: 0,
        };
      }

      dayStats[monthDay].temps_min.push(data.daily.temperature_2m_min[i]);
      dayStats[monthDay].temps_mean.push(data.daily.temperature_2m_mean[i]);
      dayStats[monthDay].temps_max.push(data.daily.temperature_2m_max[i]);
      dayStats[monthDay].precips.push(data.daily.precipitation_sum[i]);

      if (data.daily.precipitation_sum[i] > 1) {
        dayStats[monthDay].wet_days++;
      }
      dayStats[monthDay].total_days++;
    });

    // Convert to climate normals
    const normals: Record<string, ClimateNormals> = {};

    Object.entries(dayStats).forEach(([monthDay, stats]) => {
      const [month, day] = monthDay.split('-').map(Number);

      normals[monthDay] = {
        month,
        day,
        temperature_min: stats.temps_min.reduce((a, b) => a + b, 0) / stats.temps_min.length,
        temperature_mean: stats.temps_mean.reduce((a, b) => a + b, 0) / stats.temps_mean.length,
        temperature_max: stats.temps_max.reduce((a, b) => a + b, 0) / stats.temps_max.length,
        precipitation_avg: stats.precips.reduce((a, b) => a + b, 0) / stats.precips.length,
        wet_days_probability: stats.wet_days / stats.total_days,
      };
    });

    return normals;
  }

  /**
   * Calculate derived monthly metrics
   */
  private calculateMonthlyMetrics(
    dailyData: DailyWeatherData[],
    normals: Record<string, ClimateNormals>
  ): MonthlyWeatherData[] {
    const monthlyMap = new Map<string, {
      precipitation: number[];
      wet_days: number;
      dry_days: number;
      dry_spell_events: number;
      short_dry_spell_events: number;
    }>();

    // Group by month
    dailyData.forEach((day) => {
      const monthKey = day.date.substring(0, 7); // "YYYY-MM"

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          precipitation: [],
          wet_days: 0,
          dry_days: 0,
          dry_spell_events: 0,
          short_dry_spell_events: 0,
        });
      }

      const monthData = monthlyMap.get(monthKey);
      if (!monthData) return;

      monthData.precipitation.push(day.precipitation);

      if (day.is_wet_day) {
        monthData.wet_days++;
      } else {
        monthData.dry_days++;
      }
    });

    // Calculate dry spell conditions (5 consecutive days with < 5mm total)
    this.calculateDrySpells(dailyData, monthlyMap);

    // Calculate short dry spells (1-3 consecutive dry days)
    this.calculateShortDrySpells(dailyData, monthlyMap);

    // Convert to array with LTN comparisons
    return Array.from(monthlyMap.entries()).map(([month, data]) => {
      const [year, monthNum] = month.split('-').map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();

      // Calculate LTN for this month
      const monthNormals = Object.values(normals).filter(n => n.month === monthNum);
      const avgWetDaysProbability = monthNormals.reduce((sum, n) => sum + n.wet_days_probability, 0) / monthNormals.length;
      const avgPrecipitation = monthNormals.reduce((sum, n) => sum + n.precipitation_avg, 0) / monthNormals.length;

      return {
        month,
        precipitation_total: data.precipitation.reduce((a, b) => a + b, 0),
        precipitation_ltn: avgPrecipitation * daysInMonth,
        wet_days_count: data.wet_days,
        wet_days_ltn: avgWetDaysProbability * daysInMonth,
        dry_days_count: data.dry_days,
        dry_days_ltn: (1 - avgWetDaysProbability) * daysInMonth,
        dry_spell_conditions_count: data.dry_spell_events,
        dry_spell_conditions_ltn: 1.5, // Estimated average
        short_dry_spells_count: data.short_dry_spell_events,
        short_dry_spells_ltn: 4, // Estimated average
      };
    });
  }

  /**
   * Calculate dry spell conditions: 5 consecutive days with < 5mm total
   */
  private calculateDrySpells(
    dailyData: DailyWeatherData[],
    monthlyMap: Map<string, {
      precipitation: number[];
      wet_days: number;
      dry_days: number;
      dry_spell_events: number;
      short_dry_spell_events: number;
    }>
  ): void {
    for (let i = 0; i <= dailyData.length - 5; i++) {
      const fiveDayPrecip = dailyData.slice(i, i + 5)
        .reduce((sum, day) => sum + day.precipitation, 0);

      if (fiveDayPrecip < 5) {
        const monthKey = dailyData[i].date.substring(0, 7);
        const monthData = monthlyMap.get(monthKey);
        if (monthData) {
          monthData.dry_spell_events++;
        }
      }
    }
  }

  /**
   * Calculate short dry spells: 1-3 consecutive dry days
   */
  private calculateShortDrySpells(
    dailyData: DailyWeatherData[],
    monthlyMap: Map<string, {
      precipitation: number[];
      wet_days: number;
      dry_days: number;
      dry_spell_events: number;
      short_dry_spell_events: number;
    }>
  ): void {
    let consecutiveDryDays = 0;

    dailyData.forEach((day) => {
      if (!day.is_wet_day) {
        consecutiveDryDays++;
      } else {
        if (consecutiveDryDays >= 1 && consecutiveDryDays <= 3) {
          const monthKey = day.date.substring(0, 7);
          const monthData = monthlyMap.get(monthKey);
          if (monthData) {
            monthData.short_dry_spell_events++;
          }
        }
        consecutiveDryDays = 0;
      }
    });
  }

  /**
   * Main method to get complete weather analytics for a parcel
   */
  async getWeatherAnalytics(
    parcelBoundary: number[][],
    startDate: string,
    endDate: string
  ): Promise<WeatherAnalyticsData> {
    // Ensure coordinates are in WGS84
    const wgs84Boundary = ensureWGS84(parcelBoundary);

    // Calculate centroid
    const { lat, lon } = calculateCentroid(wgs84Boundary);

    // Fetch current weather data
    const dailyData = await this.getCurrentWeatherData(lat, lon, startDate, endDate);

    // Fetch climate normals
    const normals = await this.getClimateNormals(lat, lon);

    // Build temperature time series with LTN comparison
    const temperature_series: TemperatureTimeSeries[] = dailyData.map((day) => {
      const date = new Date(day.date);
      const monthDay = `${date.getMonth() + 1}-${date.getDate()}`;
      const normal = normals[monthDay] || {
        temperature_min: day.temperature_min,
        temperature_mean: day.temperature_mean,
        temperature_max: day.temperature_max,
      };

      return {
        date: day.date,
        current_min: day.temperature_min,
        current_mean: day.temperature_mean,
        current_max: day.temperature_max,
        ltn_min: normal.temperature_min,
        ltn_mean: normal.temperature_mean,
        ltn_max: normal.temperature_max,
      };
    });

    // Calculate monthly precipitation and derived metrics
    const monthly_precipitation = this.calculateMonthlyMetrics(dailyData, normals);

    return {
      temperature_series,
      monthly_precipitation,
      start_date: startDate,
      end_date: endDate,
      location: {
        latitude: lat,
        longitude: lon,
      },
    };
  }
}

export const weatherClimateService = new WeatherClimateService();
