import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  Analysis,
  AnalysisType,
  SoilAnalysisData,
  PlantAnalysisData,
  WaterAnalysisData,
} from '../types/analysis';

type AnalysisData = SoilAnalysisData | PlantAnalysisData | WaterAnalysisData;

// Query keys
export const analysesKeys = {
  all: ['analyses'] as const,
  byParcel: (parcelId: string, type?: AnalysisType) =>
    type ? ['analyses', 'parcel', parcelId, type] as const : ['analyses', 'parcel', parcelId] as const,
  byFarm: (farmId: string, type?: AnalysisType) =>
    type ? ['analyses', 'farm', farmId, type] as const : ['analyses', 'farm', farmId] as const,
};

export const parcelsKeys = {
  all: ['parcels'] as const,
  byFarm: (farmId: string) => ['parcels', 'farm', farmId] as const,
};

// Hook to fetch parcels by farm (needed for farm-level queries)
export function useParcels(farmId: string | undefined) {
  return useQuery({
    queryKey: parcelsKeys.byFarm(farmId || ''),
    queryFn: async () => {
      if (!farmId) return [];

      const { data, error } = await supabase
        .from('parcels')
        .select('id, name, farm_id, area, area_unit, soil_type')
        .eq('farm_id', farmId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!farmId,
  });
}

// Hook to fetch analyses by parcel ID
export function useAnalysesByParcel(parcelId: string | undefined, analysisType?: AnalysisType) {
  return useQuery({
    queryKey: analysesKeys.byParcel(parcelId || '', analysisType),
    queryFn: async () => {
      if (!parcelId) return [];

      let query = supabase
        .from('analyses')
        .select('*')
        .eq('parcel_id', parcelId)
        .order('analysis_date', { ascending: false });

      if (analysisType) {
        query = query.eq('analysis_type', analysisType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Analysis[];
    },
    enabled: !!parcelId,
  });
}

// Hook to fetch analyses by farm ID (all parcels in farm)
export function useAnalysesByFarm(farmId: string | undefined, analysisType?: AnalysisType) {
  const { data: parcels = [] } = useParcels(farmId);
  const parcelIds = parcels.map(p => p.id);

  return useQuery({
    queryKey: analysesKeys.byFarm(farmId || '', analysisType),
    queryFn: async () => {
      if (!farmId || parcelIds.length === 0) return [];

      let query = supabase
        .from('analyses')
        .select('*')
        .in('parcel_id', parcelIds)
        .order('analysis_date', { ascending: false });

      if (analysisType) {
        query = query.eq('analysis_type', analysisType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Analysis[];
    },
    enabled: !!farmId && parcelIds.length > 0,
  });
}

// Hook to add a new analysis
export function useAddAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parcelId,
      analysisType,
      analysisDate,
      data,
      laboratory,
      notes,
    }: {
      parcelId: string;
      analysisType: AnalysisType;
      analysisDate: string;
      data: AnalysisData;
      laboratory?: string;
      notes?: string;
    }) => {
      const dbData = {
        parcel_id: parcelId,
        analysis_type: analysisType,
        analysis_date: analysisDate,
        laboratory,
        data,
        notes,
      };

      const { data: newAnalysis, error } = await supabase
        .from('analyses')
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      return newAnalysis as Analysis;
    },
    onSuccess: (newAnalysis) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: analysesKeys.all });
      queryClient.invalidateQueries({
        queryKey: analysesKeys.byParcel(newAnalysis.parcel_id)
      });
      queryClient.invalidateQueries({
        queryKey: analysesKeys.byParcel(newAnalysis.parcel_id, newAnalysis.analysis_type)
      });
    },
  });
}

// Hook to update an analysis
export function useUpdateAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        analysis_date?: string;
        laboratory?: string;
        data?: AnalysisData;
        notes?: string;
      };
    }) => {
      const { data: updatedAnalysis, error } = await supabase
        .from('analyses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedAnalysis as Analysis;
    },
    onSuccess: (updatedAnalysis) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: analysesKeys.all });
      queryClient.invalidateQueries({
        queryKey: analysesKeys.byParcel(updatedAnalysis.parcel_id)
      });
      queryClient.invalidateQueries({
        queryKey: analysesKeys.byParcel(updatedAnalysis.parcel_id, updatedAnalysis.analysis_type)
      });
    },
  });
}

// Hook to delete an analysis
export function useDeleteAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the analysis to know which queries to invalidate
      const { data: analysis } = await supabase
        .from('analyses')
        .select('parcel_id, analysis_type')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return analysis;
    },
    onSuccess: (analysis) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: analysesKeys.all });
      if (analysis) {
        queryClient.invalidateQueries({
          queryKey: analysesKeys.byParcel(analysis.parcel_id)
        });
        queryClient.invalidateQueries({
          queryKey: analysesKeys.byParcel(analysis.parcel_id, analysis.analysis_type)
        });
      }
    },
  });
}
