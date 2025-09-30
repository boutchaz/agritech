import { useQuery } from '@tanstack/react-query';
import { getRecommendations } from '../lib/edge-functions-api';
import type { Module, SensorData } from '../types';

export interface Recommendation {
  type: 'warning' | 'info';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export function useRecommendations(module: Module | null, sensorData: SensorData[]) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['recommendations', module?.id, sensorData.length],
    queryFn: async () => {
      if (!module) {
        return { recommendations: [] };
      }

      return getRecommendations({
        moduleData: {
          id: module.id,
          type: module.type,
          status: module.status
        },
        sensorData: sensorData.map(sd => ({
          timestamp: sd.timestamp,
          temperature: sd.temperature,
          humidity: sd.humidity,
          soilMoisture: sd.soilMoisture
        }))
      });
    },
    enabled: !!module && sensorData.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    recommendations: data?.recommendations || [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Une erreur est survenue') : null
  };
}