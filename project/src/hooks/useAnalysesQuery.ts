import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysesApi } from '../lib/api/analyses';
import { parcelsApi } from '../lib/api/parcels';
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
  byOrganization: (organizationId: string, type?: AnalysisType) =>
    type ? ['analyses', 'organization', organizationId, type] as const : ['analyses', 'organization', organizationId] as const,
};

export const parcelsKeys = {
  all: ['parcels'] as const,
  byFarm: (farmId: string) => ['parcels', 'farm', farmId] as const,
};

export function useParcels(farmId: string | undefined, organizationId?: string | undefined) {
  return useQuery({
    queryKey: farmId 
      ? [...parcelsKeys.byFarm(farmId), organizationId] 
      : ['parcels', 'organization', organizationId || ''],
    queryFn: async () => {
      if (farmId && organizationId) {
        const parcels = await parcelsApi.getAll({ farm_id: farmId }, organizationId);
        return parcels || [];
      }
      if (organizationId) {
        const parcels = await parcelsApi.getAll({ organization_id: organizationId }, organizationId);
        return parcels || [];
      }
      return [];
    },
    enabled: !!organizationId,
  });
}

// Hook to fetch analyses by parcel ID
export function useAnalysesByParcel(parcelId: string | undefined, analysisType?: AnalysisType) {
  return useQuery({
    queryKey: analysesKeys.byParcel(parcelId || '', analysisType),
    queryFn: async () => {
      if (!parcelId) return [];

      const response = await analysesApi.getAll({
        parcel_id: parcelId,
        analysis_type: analysisType
      });
      return response.data || [];
    },
    enabled: !!parcelId,
  });
}

// Hook to fetch analyses by farm ID (all parcels in farm) or by organization if no farm selected
export function useAnalysesByFarm(farmId: string | undefined, analysisType?: AnalysisType, organizationId?: string | undefined) {
  return useQuery({
    queryKey: farmId 
      ? analysesKeys.byFarm(farmId, analysisType) 
      : analysesKeys.byOrganization(organizationId || '', analysisType),
    queryFn: async () => {
      if (farmId) {
        const response = await analysesApi.getAll({
          farm_id: farmId,
          analysis_type: analysisType
        });
        return response.data || [];
      }
      if (organizationId) {
        // Fetch all analyses for the organization (no farm filter)
        const response = await analysesApi.getAll({
          analysis_type: analysisType
        }, organizationId);
        return response.data || [];
      }
      return [];
    },
    enabled: !!farmId || !!organizationId,
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
      return await analysesApi.create({
        parcel_id: parcelId,
        analysis_type: analysisType,
        analysis_date: analysisDate,
        data,
        laboratory,
        notes,
      });
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
      return await analysesApi.update(id, updates);
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
      const analysis = await analysesApi.getOne(id);
      await analysesApi.delete(id);
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
