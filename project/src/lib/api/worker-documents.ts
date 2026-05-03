import { apiClient } from '../api-client';

const BASE = (orgId: string) => `/api/v1/organizations/${orgId}/worker-documents`;

export type DocumentType =
  | 'cin' | 'passport' | 'work_permit' | 'contract' | 'cnss_card'
  | 'medical_certificate' | 'driving_license' | 'pesticide_certification'
  | 'training_certificate' | 'bank_details' | 'tax_document' | 'photo' | 'other';

export interface WorkerDocument {
  id: string;
  organization_id: string;
  worker_id: string;
  document_type: DocumentType;
  document_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  expiry_date: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkerDocumentInput {
  worker_id: string;
  document_type: DocumentType;
  document_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  expiry_date?: string;
  notes?: string;
}

export interface WorkerDocumentFilters {
  worker_id?: string;
  document_type?: string;
  expiring_within_days?: number;
}

export const workerDocumentsApi = {
  list: (orgId: string, filters: WorkerDocumentFilters = {}) => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const query = qs.toString();
    return apiClient.get<WorkerDocument[]>(
      `${BASE(orgId)}${query ? `?${query}` : ''}`,
      {},
      orgId,
    );
  },

  getOne: (orgId: string, id: string) =>
    apiClient.get<WorkerDocument>(`${BASE(orgId)}/${id}`, {}, orgId),

  create: (orgId: string, data: CreateWorkerDocumentInput) =>
    apiClient.post<WorkerDocument>(BASE(orgId), data, {}, orgId),

  update: (orgId: string, id: string, data: Partial<CreateWorkerDocumentInput>) =>
    apiClient.put<WorkerDocument>(`${BASE(orgId)}/${id}`, data, {}, orgId),

  verify: (orgId: string, id: string) =>
    apiClient.put<WorkerDocument>(`${BASE(orgId)}/${id}/verify`, {}, {}, orgId),

  delete: (orgId: string, id: string) =>
    apiClient.delete<void>(`${BASE(orgId)}/${id}`, {}, orgId),
};
