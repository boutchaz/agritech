import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { calibrationV2Api } from "@/lib/api/calibration-v2";
import { queryKeys } from "@/lib/query-keys";
import type { CalibrationReviewView } from "@/types/calibration-review";

export function useCalibrationReview(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery<CalibrationReviewView | null>({
    queryKey: queryKeys.calibrationV2.review(
      parcelId,
      currentOrganization?.id,
    ),
    queryFn: () =>
      calibrationV2Api.getCalibrationReview(
        parcelId,
        currentOrganization?.id,
      ),
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}
