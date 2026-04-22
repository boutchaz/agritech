import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "@/i18n/config";
import { useAuth } from "./useAuth";
import { calibrationApi,
type CalibrationHistoryRecord,
type CalibrationPhase,
type CalibrationReportResponse,
type CalibrationStatusRecord,
type NutritionConfirmationResponse,
type NutritionSuggestionResponse,
type PartialRecalibrationDto,
type CalibrationPercentilesResponse,
type CalibrationZonesResponse,
type IrrigationRecommendationResponse, } from "@/lib/api/calibration-output";
import { queryKeys } from "@/lib/query-keys";
import type { NutritionOption } from "@/types/calibration-output";
import { useCalibrationSocket } from "./useCalibrationSocket";
import { parcelsKeys } from "./useParcelsQuery";

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
      return calibrationApi.startCalibration(
        parcelId,
        dto,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.status(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.report(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.phase(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.nutritionSuggestion(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({ queryKey: ["ai-calibration", parcelId] });
      queryClient.invalidateQueries({
        queryKey: parcelsKeys.byId(parcelId),
      });
      queryClient.invalidateQueries({
        queryKey: parcelsKeys.all,
      });
      toast.success("Calcul de suivi démarré");
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
      return calibrationApi.startPartialRecalibration(
        parcelId,
        dto,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.status(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.report(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.phase(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.history(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: parcelsKeys.byId(parcelId),
      });
      queryClient.invalidateQueries({
        queryKey: parcelsKeys.all,
      });
      toast.success(i18n.t("toasts.partialRecalibrationStarted", { ns: "ai" }));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : i18n.t("toasts.partialRecalibrationError", { ns: "ai" }),
      );
    },
  });
}

export function useCalibrationReport(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.calibration.report(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<CalibrationReportResponse | null> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationApi.getCalibrationReport(
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
    queryKey: queryKeys.calibration.status(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<CalibrationStatusRecord | null> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationApi.getCalibrationStatus(
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
      return calibrationApi.validateCalibration(
        parcelId,
        calibrationId,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.status(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.report(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.phase(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.nutritionSuggestion(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-calibration', parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: parcelsKeys.byId(parcelId),
      });
      queryClient.invalidateQueries({
        queryKey: parcelsKeys.all,
      });
      toast.success(i18n.t("toasts.calibrationValidated", { ns: "ai" }));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : i18n.t("toasts.calibrationValidateError", { ns: "ai" }),
      );
    },
  });
}

export function useNutritionSuggestion(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.calibration.nutritionSuggestion(parcelId,
    currentOrganization?.id,),
    queryFn: async (): Promise<NutritionSuggestionResponse> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationApi.getNutritionSuggestion(
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
      return calibrationApi.confirmNutritionOption(
        parcelId,
        calibrationId,
        option,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.status(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.report(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.phase(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.history(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.nutritionSuggestion(parcelId,
        currentOrganization?.id,),
      });
      queryClient.invalidateQueries({
        queryKey: parcelsKeys.byId(parcelId),
      });
      queryClient.invalidateQueries({
        queryKey: parcelsKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: ["ai-calibration", parcelId],
      });
      toast.success(i18n.t("toasts.nutritionConfirmed", { ns: "ai" }));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : i18n.t("toasts.nutritionConfirmError", { ns: "ai" }),
      );
    },
  });
}

export function useTargetYieldSuggestion(parcelId: string, calibrationId: string | null | undefined) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: [
      'target-yield-suggestion',
      parcelId,
      calibrationId,
      currentOrganization?.id,
    ],
    queryFn: async () => {
      if (!currentOrganization?.id || !calibrationId) {
        throw new Error('No organization or calibration selected');
      }
      return calibrationApi.getTargetYieldSuggestion(
        parcelId,
        calibrationId,
        currentOrganization.id,
      );
    },
    enabled: !!parcelId && !!calibrationId && !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useConfirmTargetYield(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      calibrationId,
      target_yield_t_ha,
      source,
    }: {
      calibrationId: string;
      target_yield_t_ha: number;
      source: 'suggested' | 'user_override';
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationApi.confirmTargetYield(
        parcelId,
        calibrationId,
        { target_yield_t_ha, source },
        currentOrganization.id,
      );
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ['target-yield-suggestion', parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-plan', parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.report(
          parcelId,
          currentOrganization?.id,
        ),
      });
      toast.success(
        result.drift_marked
          ? i18n.t('toasts.targetYieldConfirmedWithDrift', { ns: 'ai' })
          : i18n.t('toasts.targetYieldConfirmed', { ns: 'ai' }),
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : i18n.t('toasts.targetYieldConfirmError', { ns: 'ai' }),
      );
    },
  });
}

export function useCalibrationHistory(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.calibration.history(parcelId,
    currentOrganization?.id,),
    queryFn: async (): Promise<CalibrationHistoryRecord[]> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationApi.getCalibrationHistory(
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
    queryKey: queryKeys.calibration.phase(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<CalibrationPhase> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationApi.getCalibrationPhase(
        parcelId,
        currentOrganization.id,
      );
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 30 * 1000,
  });
}

export function useCalibrationPercentiles(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.calibration.percentiles(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<CalibrationPercentilesResponse> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationApi.getCalibrationPercentiles(
        parcelId,
        currentOrganization.id,
      );
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCalibrationZones(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.calibration.zones(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<CalibrationZonesResponse> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationApi.getCalibrationZones(
        parcelId,
        currentOrganization.id,
      );
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIrrigationRecommendation(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.calibration.irrigation(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<IrrigationRecommendationResponse> => {
      if (!currentOrganization?.id) {
        throw new Error("No organization selected");
      }
      return calibrationApi.getIrrigationRecommendation(
        parcelId,
        currentOrganization.id,
      );
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 30 * 60 * 1000,
  });
}
