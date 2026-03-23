import i18n from '@/i18n/config';
import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/parcels';

export interface AIPlan {
  id: string;
  parcel_id: string;
  organization_id: string;
  calibration_id: string | null;
  year: number;
  status: 'draft' | 'validated' | 'active' | 'archived';
  crop_type?: string;
  variety?: string | null;
  plan_data?: Record<string, unknown> | null;
  validated_at?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AIPlanIntervention {
  id: string;
  annual_plan_id: string;
  parcel_id: string;
  organization_id: string;
  month: number;
  week: number | null;
  intervention_type: string;
  description: string;
  product: string | null;
  dose: string | null;
  unit: string | null;
  status: 'planned' | 'executed' | 'skipped' | 'delayed';
  executed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
 }

export interface AIPlanSummary {
  plan_id: string;
  parcel_id: string;
  year: number;
  status: 'draft' | 'validated' | 'active' | 'archived';
  total_interventions: number;
  executed: number;
  planned: number;
  skipped: number;
}

function normalizePlanPayload(raw: unknown): AIPlan | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Partial<AIPlan>;
  if (typeof obj.id !== 'string' || obj.id.length === 0) {
    return null;
  }
  return raw as AIPlan;
}

export const aiPlanApi = {
  async getAIPlan(parcelId: string, organizationId?: string): Promise<AIPlan | null> {
    const raw = await apiClient.get<unknown>(
      `${BASE_URL}/${parcelId}/ai/plan`,
      {},
      organizationId,
    );
    return normalizePlanPayload(raw);
  },

  async ensureAIPlan(
    parcelId: string,
    organizationId?: string,
    year?: number,
  ): Promise<AIPlan> {
    const body = year !== undefined ? { year } : {};
    const raw = await apiClient.post<unknown>(
      `${BASE_URL}/${parcelId}/ai/plan/ensure`,
      body,
      {},
      organizationId,
    );
    const plan = normalizePlanPayload(raw);
    if (!plan) {
      throw new Error(i18n.t('errors.invalidPlanPayload', { ns: 'ai' }));
    }
    return plan;
  },

  async getAIPlanCalendar(parcelId: string, organizationId?: string): Promise<Record<string, unknown>> {
    return apiClient.get<Record<string, unknown>>(`${BASE_URL}/${parcelId}/ai/plan/calendar`, {}, organizationId);
  },

  async getAIPlanSummary(parcelId: string, organizationId?: string): Promise<AIPlanSummary> {
    return apiClient.get<AIPlanSummary>(`${BASE_URL}/${parcelId}/ai/plan/summary`, {}, organizationId);
  },

  async validateAIPlan(parcelId: string, organizationId?: string): Promise<AIPlan> {
    return apiClient.post<AIPlan>(`${BASE_URL}/${parcelId}/ai/plan/validate`, {}, {}, organizationId);
  },

  async getAIPlanInterventions(parcelId: string, organizationId?: string): Promise<AIPlanIntervention[]> {
    return apiClient.get(`${BASE_URL}/${parcelId}/ai/plan/interventions`, {}, organizationId);
  },

  async executeAIPlanIntervention(id: string, organizationId?: string): Promise<AIPlanIntervention> {
    return apiClient.patch(`/api/v1/ai/plan/interventions/${id}/execute`, {}, {}, organizationId);
  },

  async regenerateAIPlan(parcelId: string, organizationId?: string): Promise<AIPlan> {
    return apiClient.post(`${BASE_URL}/${parcelId}/ai/plan/regenerate`, {}, {}, organizationId);
  },

  async generateAIPlanReport(parcelId: string, organizationId?: string): Promise<unknown> {
    // Resolve the best available provider
    const providers = await apiClient.get<Array<{ provider: string; available: boolean }>>(
      '/api/v1/ai-reports/providers',
      {},
      organizationId,
    );
    const available = providers.find((p) => p.available);
    const provider = available?.provider ?? 'zai';

    return apiClient.post(
      '/api/v1/ai-reports/generate',
      {
        parcel_id: parcelId,
        provider,
        reportType: 'annual_plan',
      },
      {},
      organizationId,
    );
  },
};
