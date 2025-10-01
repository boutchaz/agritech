import { useState, useEffect } from 'react';
import type { SoilAnalysis } from '../types';
import { supabase } from '../lib/supabase';

interface PhysicalProperties {
  ph: number;
  texture: string;
  moisture: number;
}

interface ChemicalProperties {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
}

interface BiologicalProperties {
  earthworm_count: number;
  microbial_activity: string;
}

interface SoilAnalysisRecord {
  id: string;
  parcel_id: string;
  test_type_id: string;
  analysis_date: string;
  physical: PhysicalProperties;
  chemical: ChemicalProperties;
  biological: BiologicalProperties;
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

      // Then get soil analyses for those parcels
      const parcelIds = parcels.map(p => p.id);
      const { data, error: supabaseError } = await supabase
        .from('soil_analyses')
        .select('*')
        .in('parcel_id', parcelIds)
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
    testTypeId: string | null,
    data: SoilAnalysis,
    notes?: string
  ) => {
    try {
      console.log('addAnalysis called with parcelId:', parcelId); // Debug log
      // Map form data to database structure
      const dbData = {
        parcel_id: parcelId,
        test_type_id: testTypeId,
        analysis_date: new Date().toISOString(),
        physical: {
          ph: data.physical.ph,
          texture: data.physical.texture,
          moisture: data.physical.organicMatter // Map organicMatter to moisture for now
        },
        chemical: {
          nitrogen: data.chemical.nitrogen,
          phosphorus: data.chemical.phosphorus,
          potassium: data.chemical.potassium
        },
        biological: {
          earthworm_count: data.biological.earthwormCount,
          microbial_activity: data.biological.microbialActivity
        },
        notes
      };

      const { data: newAnalysis, error: supabaseError } = await supabase
        .from('soil_analyses')
        .insert([dbData])
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