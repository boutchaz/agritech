import { apiClient } from './api-client';

export interface PruningRecord {
  id: string;
  organization_id: string;
  crop_id: string;
  pruning_date: string;
  pruning_type: string;
  method: string | null;
  pruned_by: string | null;
  branches_removed: number | null;
  height_reduced_cm: number | null;
  notes: string | null;
  next_pruning_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePruningRecordDto {
  cropId: string;
  pruningDate: string;
  pruningType: string;
  method?: string;
  prunedBy?: string;
  branchesRemoved?: number;
  heightReducedCm?: number;
  notes?: string;
  nextPruningDate?: string;
}

const BASE_URL = (organizationId: string) =>
  `/organizations/${organizationId}/pruning`;

export const pruningApi = {
  async list(organizationId: string, cropId?: string): Promise<PruningRecord[]> {
    const url = cropId
      ? `${BASE_URL(organizationId)}?cropId=${cropId}`
      : BASE_URL(organizationId);
    return apiClient.get<PruningRecord[]>(url);
  },

  async get(organizationId: string, recordId: string): Promise<PruningRecord> {
    return apiClient.get<PruningRecord>(`${BASE_URL(organizationId)}/${recordId}`);
  },

  async getUpcoming(organizationId: string, daysAhead: number = 30): Promise<PruningRecord[]> {
    return apiClient.get<PruningRecord[]>(`${BASE_URL(organizationId)}/upcoming?daysAhead=${daysAhead}`);
  },

  async create(organizationId: string, data: CreatePruningRecordDto): Promise<PruningRecord> {
    return apiClient.post<PruningRecord>(BASE_URL(organizationId), data);
  },

  async update(
    organizationId: string,
    recordId: string,
    data: Partial<CreatePruningRecordDto>
  ): Promise<PruningRecord> {
    return apiClient.patch<PruningRecord>(`${BASE_URL(organizationId)}/${recordId}`, data);
  },

  async delete(organizationId: string, recordId: string): Promise<void> {
    return apiClient.delete(`${BASE_URL(organizationId)}/${recordId}`);
  },
};
