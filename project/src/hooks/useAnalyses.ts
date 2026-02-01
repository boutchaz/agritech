import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { analysesApi } from '../lib/api/analyses';
import type {
  Analysis,
  AnalysisType,
  SoilAnalysisData,
  PlantAnalysisData,
  WaterAnalysisData,
  AnalysisRecommendation
} from '../types/analysis';

type AnalysisData = SoilAnalysisData | PlantAnalysisData | WaterAnalysisData;

export function useAnalyses(
  parcelIdOrFarmId: string,
  analysisType?: AnalysisType,
  queryType: 'parcel' | 'farm' = 'parcel',
  organizationId?: string
) {
  const queryClient = useQueryClient();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parcelIdOrFarmId) {
      fetchAnalyses();
    }
  }, [parcelIdOrFarmId, analysisType, queryType, organizationId]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = queryType === 'farm'
        ? { farm_id: parcelIdOrFarmId, analysis_type: analysisType }
        : { parcel_id: parcelIdOrFarmId, analysis_type: analysisType };

      const response = await analysesApi.getAll(filters, organizationId);
      setAnalyses(response.data || []);
    } catch (err) {
      console.error('Error fetching analyses:', err);
      setError(err instanceof Error ? err.message : 'Error fetching analyses');
    } finally {
      setLoading(false);
    }
  };

  const addAnalysis = async (
    parcelId: string,
    analysisType: AnalysisType,
    analysisDate: string,
    data: AnalysisData,
    laboratory?: string,
    notes?: string
  ) => {
    try {
      const newAnalysis = await analysesApi.create({
        parcel_id: parcelId,
        analysis_type: analysisType,
        analysis_date: analysisDate,
        data,
        laboratory,
        notes
      }, organizationId);

      setAnalyses(prev => [newAnalysis, ...prev]);

      // Invalidate calibration status after adding analysis
      queryClient.invalidateQueries({
        queryKey: ['calibration-status', parcelId],
      });

      return newAnalysis;
    } catch (err) {
      console.error('Error adding analysis:', err);
      setError(err instanceof Error ? err.message : 'Error adding analysis');
      throw err;
    }
  };

  const updateAnalysis = async (
    id: string,
    updates: {
      analysis_date?: string;
      laboratory?: string;
      data?: AnalysisData;
      notes?: string;
    }
  ) => {
    try {
      const updatedAnalysis = await analysesApi.update(id, updates, organizationId);

      setAnalyses(prev =>
        prev.map(analysis =>
          analysis.id === id ? updatedAnalysis : analysis
        )
      );
      return updatedAnalysis;
    } catch (err) {
      console.error('Error updating analysis:', err);
      setError(err instanceof Error ? err.message : 'Error updating analysis');
      throw err;
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      await analysesApi.delete(id, organizationId);
      setAnalyses(prev => prev.filter(analysis => analysis.id !== id));
    } catch (err) {
      console.error('Error deleting analysis:', err);
      setError(err instanceof Error ? err.message : 'Error deleting analysis');
      throw err;
    }
  };

  return {
    analyses,
    loading,
    error,
    addAnalysis,
    updateAnalysis,
    deleteAnalysis,
    refresh: fetchAnalyses
  };
}

export function useAnalysisRecommendations(analysisId: string | null, organizationId?: string) {
  const [recommendations, setRecommendations] = useState<AnalysisRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (analysisId) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
      setLoading(false);
    }
  }, [analysisId, organizationId]);

  const fetchRecommendations = async () => {
    if (!analysisId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await analysesApi.getRecommendations(analysisId, organizationId);
      setRecommendations(data || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'Error fetching recommendations');
    } finally {
      setLoading(false);
    }
  };

  const addRecommendation = async (
    recommendation: Omit<AnalysisRecommendation, 'id' | 'created_at'>
  ) => {
    if (!analysisId) throw new Error('Analysis ID is required');

    try {
      const { analysis_id: _analysisId, ...rest } = recommendation;
      const newRecommendation = await analysesApi.createRecommendation(analysisId, rest, organizationId);

      setRecommendations(prev => [...prev, newRecommendation]);
      return newRecommendation;
    } catch (err) {
      console.error('Error adding recommendation:', err);
      setError(err instanceof Error ? err.message : 'Error adding recommendation');
      throw err;
    }
  };

  const updateRecommendation = async (
    id: string,
    updates: Partial<Omit<AnalysisRecommendation, 'id' | 'analysis_id' | 'created_at'>>
  ) => {
    try {
      const updatedRecommendation = await analysesApi.updateRecommendation(id, updates, organizationId);

      setRecommendations(prev =>
        prev.map(rec => rec.id === id ? updatedRecommendation : rec)
      );
      return updatedRecommendation;
    } catch (err) {
      console.error('Error updating recommendation:', err);
      setError(err instanceof Error ? err.message : 'Error updating recommendation');
      throw err;
    }
  };

  const deleteRecommendation = async (id: string) => {
    try {
      await analysesApi.deleteRecommendation(id, organizationId);
      setRecommendations(prev => prev.filter(rec => rec.id !== id));
    } catch (err) {
      console.error('Error deleting recommendation:', err);
      setError(err instanceof Error ? err.message : 'Error deleting recommendation');
      throw err;
    }
  };

  return {
    recommendations,
    loading,
    error,
    addRecommendation,
    updateRecommendation,
    deleteRecommendation,
    refresh: fetchRecommendations
  };
}
