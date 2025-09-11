import { useState, useEffect } from 'react';
import type { Module, SensorData } from '../types';

export interface Recommendation {
  type: 'warning' | 'info';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export function useRecommendations(module: Module | null, sensorData: SensorData[]) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      if (!module) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recommendations`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              moduleData: module,
              sensorData,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des recommandations');
        }

        const data = await response.json();
        setRecommendations(data.recommendations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [module, sensorData]);

  return { recommendations, loading, error };
}