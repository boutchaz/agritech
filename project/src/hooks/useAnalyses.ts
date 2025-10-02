import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type {
  Analysis,
  AnalysisType,
  SoilAnalysisData,
  PlantAnalysisData,
  WaterAnalysisData,
  AnalysisRecommendation
} from '../types/analysis';

type AnalysisData = SoilAnalysisData | PlantAnalysisData | WaterAnalysisData;

export function useAnalyses(farmId: string, analysisType?: AnalysisType) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (farmId) {
      fetchAnalyses();
    }
  }, [farmId, analysisType]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get all parcels for this farm
      const { data: parcels, error: parcelsError } = await supabase
        .from('parcels')
        .select('id')
        .eq('farm_id', farmId);

      if (parcelsError) throw parcelsError;

      if (!parcels || parcels.length === 0) {
        setAnalyses([]);
        return;
      }

      // Then get analyses for those parcels
      const parcelIds = parcels.map(p => p.id);
      let query = supabase
        .from('analyses')
        .select('*')
        .in('parcel_id', parcelIds)
        .order('analysis_date', { ascending: false });

      // Filter by analysis type if specified
      if (analysisType) {
        query = query.eq('analysis_type', analysisType);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;

      setAnalyses(data || []);
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
      const dbData = {
        parcel_id: parcelId,
        analysis_type: analysisType,
        analysis_date: analysisDate,
        laboratory,
        data,
        notes
      };

      const { data: newAnalysis, error: supabaseError } = await supabase
        .from('analyses')
        .insert([dbData])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      setAnalyses(prev => [newAnalysis, ...prev]);
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
      const { data: updatedAnalysis, error: supabaseError } = await supabase
        .from('analyses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) throw supabaseError;

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
      const { error: supabaseError } = await supabase
        .from('analyses')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;

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

export function useAnalysisRecommendations(analysisId: string | null) {
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
  }, [analysisId]);

  const fetchRecommendations = async () => {
    if (!analysisId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('analysis_recommendations')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('priority', { ascending: false });

      if (supabaseError) throw supabaseError;

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
    try {
      const { data: newRecommendation, error: supabaseError } = await supabase
        .from('analysis_recommendations')
        .insert([recommendation])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

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
      const { data: updatedRecommendation, error: supabaseError } = await supabase
        .from('analysis_recommendations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) throw supabaseError;

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
      const { error: supabaseError } = await supabase
        .from('analysis_recommendations')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;

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
