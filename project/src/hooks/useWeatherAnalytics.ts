import { useState, useEffect } from 'react';
import { weatherClimateService, WeatherAnalyticsData } from '../services/weatherClimateService';

export type TimeRange = 'last-3-months' | 'last-6-months' | 'last-12-months' | 'ytd' | 'custom';

interface UseWeatherAnalyticsOptions {
  parcelBoundary: number[][] | null;
  timeRange?: TimeRange;
  customStartDate?: string;
  customEndDate?: string;
}

export function useWeatherAnalytics({
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

      try {
        // Calculate date range based on selection
        const { startDate, endDate } = calculateDateRange(
          timeRange,
          customStartDate,
          customEndDate
        );

        const analyticsData = await weatherClimateService.getWeatherAnalytics(
          parcelBoundary,
          startDate,
          endDate
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
  }, [parcelBoundary, timeRange, customStartDate, customEndDate]);

  return { data, loading, error };
}

/**
 * Calculate start and end dates based on time range selection
 */
function calculateDateRange(
  timeRange: TimeRange,
  customStartDate?: string,
  customEndDate?: string
): { startDate: string; endDate: string } {
  const today = new Date();
  let startDate: Date;
  const endDate: Date = today;

  switch (timeRange) {
    case 'last-3-months':
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 3);
      break;

    case 'last-6-months':
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 6);
      break;

    case 'last-12-months':
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - 1);
      break;

    case 'ytd':
      startDate = new Date(today.getFullYear(), 0, 1);
      break;

    case 'custom':
      if (!customStartDate || !customEndDate) {
        throw new Error('Custom date range requires both start and end dates');
      }
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };

    default:
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - 1);
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
