// Annual recalibration hooks for Mobile App
// Adapted from web: project/src/hooks/useAnnualRecalibration.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calibrationApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { calibrationKeys } from './useCalibration';

// Query Keys for Annual Recalibration
export const annualCalibrationKeys = {
  all: ['annual-calibration'] as const,
  eligibility: (parcelId: string) => [...annualCalibrationKeys.all, 'eligibility', parcelId] as const,
  missingTasks: (parcelId: string) => [...annualCalibrationKeys.all, 'missing-tasks', parcelId] as const,
  newAnalyses: (parcelId: string) => [...annualCalibrationKeys.all, 'new-analyses', parcelId] as const,
  campaignBilan: (parcelId: string) => [...annualCalibrationKeys.all, 'campaign-bilan', parcelId] as const,
};

// Check annual recalibration eligibility
export function useAnnualEligibility(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: annualCalibrationKeys.eligibility(parcelId),
    queryFn: () => calibrationApi.checkAnnualEligibility(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export const useF3Eligibility = useAnnualEligibility;

// Get missing tasks for annual recalibration
export function useAnnualMissingTasks(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: annualCalibrationKeys.missingTasks(parcelId),
    queryFn: () => calibrationApi.getAnnualMissingTasks(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Check for new analyses
export function useAnnualNewAnalyses(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: annualCalibrationKeys.newAnalyses(parcelId),
    queryFn: () => calibrationApi.checkAnnualNewAnalyses(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Get campaign bilan
export function useAnnualCampaignBilan(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: annualCalibrationKeys.campaignBilan(parcelId),
    queryFn: () => calibrationApi.getAnnualCampaignBilan(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Start annual recalibration mutation
export function useStartAnnualRecalibration(parcelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Record<string, unknown> = {}) =>
      calibrationApi.startAnnualRecalibration(parcelId, dto),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: calibrationKeys.status(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.report(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.phase(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.history(parcelId) });
      queryClient.invalidateQueries({ queryKey: annualCalibrationKeys.eligibility(parcelId) });
      queryClient.invalidateQueries({ queryKey: annualCalibrationKeys.campaignBilan(parcelId) });
    },
  });
}

export const useStartF3Recalibration = useStartAnnualRecalibration;
