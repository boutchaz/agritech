import { useState, useEffect } from 'react';
import type { SoilAnalysis } from '../types';
import { supabase } from '../lib/supabase';

interface SoilAnalysisRecord {
  id: string;
  parcel_id: string;
  test_type_id: string;
  analysis_date: string;
  physical: any;
  chemical: any;
  biological: any;
  notes: string | null;
  created_at: string;
}

export function useSoilAnalyses(farmId: string) {
  const [analyses, setAnalyses] = useState<SoilAnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (farmId) {
      fetchAnalyses();
    }
  }, [farmId]);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('soil_analyses')
        .select('*, parcels!inner(*, crops!inner(farm_id))')
        .eq('parcels.crops.farm_id', farmId)
        .order('analysis_date', { ascending: false });

      if (supabaseError) throw supabaseError;

      setAnalyses(data || []);
    } catch (err) {
      console.error('Error fetching soil analyses:', err);
      setError(err instanceof Error ? err.message : 'Error fetching soil analyses');
    } finally {
      setLoading(false);
    }
  };

  const addAnalysis = async (
    parcelId: string,
    testTypeId: string,
    data: SoilAnalysis,
    notes?: string
  ) => {
    try {
      const { data: newAnalysis, error: supabaseError } = await supabase
        .from('soil_analyses')
        .insert([
          {
            parcel_id: parcelId,
            test_type_id: testTypeId,
            analysis_date: new Date().toISOString(),
            physical: data.physical,
            chemical: data.chemical,
            biological: data.biological,
            notes
          }
        ])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      setAnalyses(prev => [newAnalysis, ...prev]);
      return newAnalysis;
    } catch (err) {
      console.error('Error adding soil analysis:', err);
      setError(err instanceof Error ? err.message : 'Error adding soil analysis');
      throw err;
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      const { error: supabaseError } = await supabase
        .from('soil_analyses')
        .delete()
        .eq('id', id);

      if (supabaseError) throw supabaseError;

      setAnalyses(prev => prev.filter(analysis => analysis.id !== id));
    } catch (err) {
      console.error('Error deleting soil analysis:', err);
      setError(err instanceof Error ? err.message : 'Error deleting soil analysis');
      throw err;
    }
  };

  return {
    analyses,
    loading,
    error,
    addAnalysis,
    deleteAnalysis,
    refresh: fetchAnalyses
  };
}