import { Injectable } from '@nestjs/common';

export interface WeatherForecastDay {
  date: string;
  tmin: number | null;
  tmax: number | null;
  precipitation_mm: number | null;
  wind_kmh: number | null;
  humidity_pct: number | null;
}

export interface WeatherGateResult {
  can_proceed: boolean;
  blocked_reason?: string;
  suggested_window?: { date: string; conditions: string };
}

@Injectable()
export class WeatherGateService {
  checkWeatherCompatibility(
    interventionType: string,
    forecast: WeatherForecastDay[],
  ): WeatherGateResult {
    if (!forecast.length) {
      return {
        can_proceed: false,
        blocked_reason: 'No weather forecast available for the next 7 days',
      };
    }

    const normalizedInterventionType = interventionType.trim().toLowerCase();

    const currentDay = forecast[0];
    const currentCompatibility = this.checkDayCompatibility(
      normalizedInterventionType,
      currentDay,
      forecast,
      0,
    );

    if (currentCompatibility.canApply) {
      return { can_proceed: true };
    }

    for (let index = 1; index < forecast.length; index += 1) {
      const day = forecast[index];
      const compatibility = this.checkDayCompatibility(
        normalizedInterventionType,
        day,
        forecast,
        index,
      );

      if (compatibility.canApply) {
        return {
          can_proceed: false,
          blocked_reason: currentCompatibility.reason,
          suggested_window: {
            date: day.date,
            conditions: compatibility.reason,
          },
        };
      }
    }

    return {
      can_proceed: false,
      blocked_reason: currentCompatibility.reason,
    };
  }

  private checkDayCompatibility(
    interventionType: string,
    day: WeatherForecastDay,
    forecast: WeatherForecastDay[],
    dayIndex: number,
  ): { canApply: boolean; reason: string } {
    if (
      interventionType.includes('foliar') ||
      interventionType.includes('spray') ||
      interventionType.includes('phytosanitaire')
    ) {
      const hasRainSoon = this.hasRainInNextHoursEquivalent(forecast, dayIndex, 1, 2);
      const tmax = day.tmax ?? 0;
      const wind = day.wind_kmh ?? 0;
      const humidity = day.humidity_pct ?? 0;

      if (hasRainSoon) {
        return { canApply: false, reason: 'Rain is expected too soon after foliar application' };
      }

      if (tmax > 30) {
        return { canApply: false, reason: 'Temperature is too high for foliar application' };
      }

      if (wind >= 15) {
        return { canApply: false, reason: 'Wind speed is too high for foliar application' };
      }

      if (tmax < 15 || humidity < 60) {
        return { canApply: false, reason: 'Conditions are too dry/cool for optimal foliar absorption' };
      }

      return { canApply: true, reason: 'Temperature, humidity, and wind are suitable for foliar treatment' };
    }

    if (interventionType.includes('fertigation')) {
      const heavyRain = (day.precipitation_mm ?? 0) >= 15;
      if (heavyRain) {
        return { canApply: false, reason: 'Heavy rain forecast increases nutrient leaching risk' };
      }

      return { canApply: true, reason: 'No heavy rain expected; fertigation can proceed' };
    }

    if (interventionType.includes('pruning') || interventionType.includes('taille')) {
      const frostRisk = (day.tmin ?? 10) <= 0;
      const rain = (day.precipitation_mm ?? 0) > 1;

      if (frostRisk || rain) {
        return { canApply: false, reason: 'Pruning blocked by frost or wet weather risk' };
      }

      return { canApply: true, reason: 'Dry and stable weather is suitable for pruning' };
    }

    return { canApply: true, reason: 'No weather gate defined for this intervention type' };
  }

  private hasRainInNextHoursEquivalent(
    forecast: WeatherForecastDay[],
    dayIndex: number,
    currentDayRainThreshold: number,
    nextDayRainThreshold: number,
  ): boolean {
    const currentDay = forecast[dayIndex];
    const nextDay = forecast[dayIndex + 1];

    const currentDayRain = (currentDay?.precipitation_mm ?? 0) >= currentDayRainThreshold;
    const nextDayRain = (nextDay?.precipitation_mm ?? 0) >= nextDayRainThreshold;

    return currentDayRain || nextDayRain;
  }
}
