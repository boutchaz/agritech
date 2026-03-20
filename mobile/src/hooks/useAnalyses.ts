// Analyses Hooks for Mobile App
// Uses TanStack Query for data fetching and mutations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { AnalysisFilters, CreateAnalysisInput, UpdateAnalysisInput } from '@/types/analysis';

// Query Keys
export const analysisKeys = {
  all: ['analyses'] as const,
  lists: () => [...analysisKeys.all, 'list'] as const,
  list: (filters: AnalysisFilters) => [...analysisKeys.lists(), filters] as const,
  details: () => [...analysisKeys.all, 'detail'] as const,
  detail: (id: string) => [...analysisKeys.details(), id] as const,
  recommendations: (analysisId: string) => [...analysisKeys.all, 'recommendations', analysisId] as const,
};

/**
 * Get all analyses with optional filters
 */
export function useAnalyses(filters?: AnalysisFilters) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: analysisKeys.list(filters || {}),
    queryFn: () => analysesApi.getAll(filters),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get a single analysis by ID
 */
export function useAnalysis(analysisId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: analysisKeys.detail(analysisId),
    queryFn: () => analysesApi.getOne(analysisId),
    enabled: !!analysisId && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get recommendations for an analysis
 */
export function useAnalysisRecommendations(analysisId: string) {
  return useQuery({
    queryKey: analysisKeys.recommendations(analysisId),
    queryFn: () => analysesApi.getRecommendations(analysisId),
    enabled: !!analysisId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new analysis
 */
export function useCreateAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnalysisInput) => analysesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analysisKeys.lists() });
    },
  });
}

/**
 * Update an analysis
 */
export function useUpdateAnalysis(analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAnalysisInput) => analysesApi.update(analysisId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analysisKeys.detail(analysisId) });
      queryClient.invalidateQueries({ queryKey: analysisKeys.lists() });
    },
  });
}

/**
 * Delete an analysis
 */
export function useDeleteAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (analysisId: string) => analysesApi.deleteAnalysis(analysisId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analysisKeys.lists() });
    },
  });
}

/**
 * Create a recommendation for an analysis
 */
export function useCreateAnalysisRecommendation(analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<import('@/types/analysis').AnalysisRecommendation, 'id' | 'analysis_id' | 'created_at'>) =>
      analysesApi.createRecommendation(analysisId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analysisKeys.recommendations(analysisId) });
    },
  });
}
