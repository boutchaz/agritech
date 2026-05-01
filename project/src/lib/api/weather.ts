/**
 * Weather API client — wraps NestJS endpoints under /weather/*.
 *
 * Phenological counters route the call backend → NestJS → FastAPI; the FastAPI
 * service computes hour counts from real-hourly Open-Meteo data using stage
 * thresholds defined in each crop's referentiel (DATA_*.json).
 */
import { apiClient } from '@/lib/api-client';

export interface PhenologicalCounter {
  key: string;
  label_fr?: string | null;
  label_en?: string | null;
  value: number;
  threshold: number;
  upper?: number | null;
  compare: 'below' | 'above' | 'between';
  unit: string;
  icon?: string | null;
}

export interface PhenologicalStage {
  key: string;
  name_fr?: string | null;
  name_en?: string | null;
  name_ar?: string | null;
  months: number[];
  counters: PhenologicalCounter[];
}

export interface PhenologicalCountersResponse {
  crop_type: string;
  year: number;
  computed_at: string;
  stages: PhenologicalStage[];
}

export const fetchPhenologicalCounters = async (params: {
  parcelId: string;
  organizationId: string;
  year: number;
}): Promise<PhenologicalCountersResponse> => {
  return apiClient.get<PhenologicalCountersResponse>(
    `/api/v1/weather/parcel/${params.parcelId}/phenological-counters?year=${params.year}`,
    {},
    params.organizationId,
  );
};
