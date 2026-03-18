import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import {
  calibrationV2Api,
  type CalibrationHistoryRecord,
  type CalibrationPhase,
  type CalibrationReportResponse,
  type CalibrationStatusRecord,
  type NutritionConfirmationResponse,
  type NutritionSuggestionResponse,
  type PartialRecalibrationDto,
} from "@/lib/api/calibration-v2";
import { queryKeys } from "@/lib/query-keys";
import type { NutritionOption } from "@/types/calibration-v2";
import { useCalibrationSocket } from "./useCalibrationSocket";

export function useStartCalibration(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      dto: Record<string, unknown> = {},
    ): Promise<CalibrationStatusRecord> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationV2Api.startCalibration(
        parcelId,
        dto,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.status(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.report(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.phase(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.nutritionSuggestion(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({ queryKey: ["ai-calibration", parcelId] });
      toast.success("Calibration lancée");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Échec du lancement de la calibration",
      );
    },
  });
}

export { useStartCalibration as useStartCalibrationV2 };

export function useStartPartialRecalibration(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      dto: PartialRecalibrationDto,
    ): Promise<CalibrationStatusRecord> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationV2Api.startPartialRecalibration(
        parcelId,
        dto,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.status(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.report(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.phase(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.history(
          parcelId,
          currentOrganization?.id,
        ),
      });
      toast.success("Recalibrage partiel lance");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Echec du recalibrage partiel",
      );
    },
  });
}

export function useCalibrationReport(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.calibrationV2.report(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<CalibrationReportResponse | null> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationV2Api.getCalibrationReport(
        parcelId,
        currentOrganization.id,
      );
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCalibrationStatus(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.calibrationV2.status(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<CalibrationStatusRecord | null> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationV2Api.getCalibrationStatus(
        parcelId,
        currentOrganization.id,
      );
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 60 * 1000,
  });
}

export function useValidateCalibration(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      calibrationId: string,
    ): Promise<CalibrationStatusRecord> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationV2Api.validateCalibration(
        parcelId,
        calibrationId,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.status(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.report(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.phase(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.nutritionSuggestion(
          parcelId,
          currentOrganization?.id,
        ),
      });
      toast.success("Calibration baseline validated");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to validate calibration",
      );
    },
  });
}

export function useNutritionSuggestion(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.calibrationV2.nutritionSuggestion(
      parcelId,
      currentOrganization?.id,
    ),
    queryFn: async (): Promise<NutritionSuggestionResponse> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationV2Api.getNutritionSuggestion(
        parcelId,
        currentOrganization.id,
      );
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useConfirmNutritionOption(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      calibrationId,
      option,
    }: {
      calibrationId: string;
      option: NutritionOption;
    }): Promise<NutritionConfirmationResponse> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationV2Api.confirmNutritionOption(
        parcelId,
        calibrationId,
        option,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.status(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.report(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.phase(
          parcelId,
          currentOrganization?.id,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.nutritionSuggestion(
          parcelId,
          currentOrganization?.id,
        ),
      });
      toast.success("Nutrition option confirmed");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to confirm nutrition option",
      );
    },
  });
}

export function useCalibrationHistory(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.calibrationV2.history(
      parcelId,
      currentOrganization?.id,
    ),
    queryFn: async (): Promise<CalibrationHistoryRecord[]> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationV2Api.getCalibrationHistory(
        parcelId,
        currentOrganization.id,
      );
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCalibrationPhase(parcelId: string) {
  const { currentOrganization } = useAuth();
  useCalibrationSocket(parcelId);

  return useQuery({
    queryKey: queryKeys.calibrationV2.phase(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<CalibrationPhase> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationV2Api.getCalibrationPhase(
        parcelId,
        currentOrganization.id,
      );
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 30 * 1000,
  });
}
