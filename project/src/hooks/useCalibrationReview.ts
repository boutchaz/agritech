import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { calibrationApi } from "@/lib/api/calibration-output";
import { queryKeys } from "@/lib/query-keys";
import type { CalibrationBlocksReviewView } from "@/types/calibration-blocks-review";

export function useCalibrationReview(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery<CalibrationBlocksReviewView | null>({
    queryKey: queryKeys.calibration.review(parcelId,
    currentOrganization?.id,),
    queryFn: () =>
      calibrationApi.getCalibrationReview(
        parcelId,
        currentOrganization?.id,
      ),
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}
