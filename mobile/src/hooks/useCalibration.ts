// Calibration Hooks for Mobile App
// Adapted from web: project/src/hooks/useCalibrationReport.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calibrationApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type {
  NutritionOption,
  PartialRecalibrationDto,
} from '@/types/calibration';

// Query Keys
export const calibrationKeys = {
  all: ['calibration'] as const,
  status: (parcelId: string) => [...calibrationKeys.all, 'status', parcelId] as const,
  report: (parcelId: string) => [...calibrationKeys.all, 'report', parcelId] as const,
  phase: (parcelId: string) => [...calibrationKeys.all, 'phase', parcelId] as const,
  history: (parcelId: string) => [...calibrationKeys.all, 'history', parcelId] as const,
  readiness: (parcelId: string) => [...calibrationKeys.all, 'readiness', parcelId] as const,
  nutritionSuggestion: (parcelId: string) => [...calibrationKeys.all, 'nutrition', parcelId] as const,
};

// Get calibration status
export function useCalibrationStatus(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: calibrationKeys.status(parcelId),
    queryFn: () => calibrationApi.getCalibrationStatus(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Get calibration phase
export function useCalibrationPhase(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: calibrationKeys.phase(parcelId),
    queryFn: () => calibrationApi.getCalibrationPhase(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Get calibration report
export function useCalibrationReport(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: calibrationKeys.report(parcelId),
    queryFn: () => calibrationApi.getCalibrationReport(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get calibration history
export function useCalibrationHistory(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: calibrationKeys.history(parcelId),
    queryFn: () => calibrationApi.getCalibrationHistory(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Check calibration readiness
export function useCalibrationReadiness(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: calibrationKeys.readiness(parcelId),
    queryFn: () => calibrationApi.checkReadiness(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 60 * 1000,
  });
}

// Get nutrition suggestion
export function useNutritionSuggestion(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: calibrationKeys.nutritionSuggestion(parcelId),
    queryFn: () => calibrationApi.getNutritionSuggestion(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Start calibration mutation
export function useStartCalibration(parcelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Record<string, unknown> = {}) =>
      calibrationApi.startCalibration(parcelId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calibrationKeys.status(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.report(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.phase(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.nutritionSuggestion(parcelId) });
    },
  });
}

// Validate calibration mutation
export function useValidateCalibration(parcelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (calibrationId: string) =>
      calibrationApi.validateCalibration(parcelId, calibrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calibrationKeys.status(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.report(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.phase(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.nutritionSuggestion(parcelId) });
    },
  });
}

// Confirm nutrition option mutation
export function useConfirmNutritionOption(parcelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      calibrationId,
      option,
    }: {
      calibrationId: string;
      option: NutritionOption;
    }) => calibrationApi.confirmNutritionOption(parcelId, calibrationId, option),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calibrationKeys.status(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.report(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.phase(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.nutritionSuggestion(parcelId) });
    },
  });
}

// Partial recalibration mutation
export function useStartPartialRecalibration(parcelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: PartialRecalibrationDto) =>
      calibrationApi.startPartialRecalibration(parcelId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calibrationKeys.status(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.report(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.phase(parcelId) });
      queryClient.invalidateQueries({ queryKey: calibrationKeys.history(parcelId) });
    },
  });
}
