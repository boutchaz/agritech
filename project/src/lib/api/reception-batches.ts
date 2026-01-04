import { apiClient } from '../api-client';
import { buildQueryUrl, requireOrganizationId } from './createCrudApi';
import type { PaginatedQuery, PaginatedResponse } from './types';
import type {
  ReceptionBatch,
  CreateReceptionBatchDto,
  UpdateQualityControlDto,
  MakeReceptionDecisionDto,
  ProcessReceptionPaymentDto,
  ProcessPaymentResponse,
  ReceptionBatchFilters,
  ReceptionBatchStatus,
  ReceptionDecision,
  QualityGrade,
} from '../../types/reception';

export interface PaginatedReceptionBatchQuery extends PaginatedQuery {
  warehouse_id?: string;
  parcel_id?: string;
  status?: ReceptionBatchStatus;
  decision?: ReceptionDecision;
  quality_grade?: QualityGrade;
  crop_id?: string;
  harvest_id?: string;
}

export const receptionBatchesApi = {
  /**
   * Get all reception batches with optional filters
   */
  async getAll(filters?: ReceptionBatchFilters, organizationId?: string): Promise<ReceptionBatch[]> {
    requireOrganizationId(organizationId, 'receptionBatchesApi.getAll');
    const params = new URLSearchParams();

    if (filters?.warehouse_id) {
      params.append('warehouse_id', filters.warehouse_id);
    }

    if (filters?.parcel_id) {
      params.append('parcel_id', filters.parcel_id);
    }

    if (filters?.crop_id) {
      params.append('crop_id', filters.crop_id);
    }

    if (filters?.status) {
      params.append('status', filters.status);
    }

    if (filters?.decision) {
      params.append('decision', filters.decision);
    }

    if (filters?.quality_grade) {
      params.append('quality_grade', filters.quality_grade);
    }

    if (filters?.from_date) {
      params.append('date_from', filters.from_date);
    }

    if (filters?.to_date) {
      params.append('date_to', filters.to_date);
    }

    if (filters?.harvest_id) {
      params.append('harvest_id', filters.harvest_id);
    }

    const queryString = params.toString();
    return apiClient.get<ReceptionBatch[]>(
      `/api/v1/organizations/${organizationId}/reception-batches${queryString ? `?${queryString}` : ''}`
    );
  },

  async getPaginated(organizationId: string, query: PaginatedReceptionBatchQuery): Promise<PaginatedResponse<ReceptionBatch>> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.pageSize) params.append('pageSize', String(query.pageSize));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);
    if (query.search) params.append('search', query.search);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);
    if (query.warehouse_id) params.append('warehouse_id', query.warehouse_id);
    if (query.parcel_id) params.append('parcel_id', query.parcel_id);
    if (query.status) params.append('status', query.status);
    if (query.decision) params.append('decision', query.decision);
    if (query.quality_grade) params.append('quality_grade', query.quality_grade);
    if (query.crop_id) params.append('crop_id', query.crop_id);
    if (query.harvest_id) params.append('harvest_id', query.harvest_id);
    const queryString = params.toString();
    return apiClient.get<PaginatedResponse<ReceptionBatch>>(
      `/api/v1/organizations/${organizationId}/reception-batches${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get a single reception batch by ID
   */
  async getOne(id: string, organizationId?: string): Promise<ReceptionBatch> {
    requireOrganizationId(organizationId, 'receptionBatchesApi.getOne');
    return apiClient.get<ReceptionBatch>(
      `/api/v1/organizations/${organizationId}/reception-batches/${id}`
    );
  },

  // Alias for backwards compatibility
  async getById(organizationId: string, batchId: string): Promise<ReceptionBatch> {
    return this.getOne(batchId, organizationId);
  },

  /**
   * Step 1: Create initial reception batch
   */
  async create(data: CreateReceptionBatchDto, organizationId?: string): Promise<ReceptionBatch> {
    requireOrganizationId(organizationId, 'receptionBatchesApi.create');
    return apiClient.post<ReceptionBatch>(
      `/api/v1/organizations/${organizationId}/reception-batches`,
      data
    );
  },

  /**
   * Update a reception batch (general update)
   */
  async update(
    organizationId: string,
    batchId: string,
    data: Partial<CreateReceptionBatchDto>
  ): Promise<ReceptionBatch> {
    return apiClient.patch<ReceptionBatch>(
      `/api/v1/organizations/${organizationId}/reception-batches/${batchId}`,
      data
    );
  },

  /**
   * Step 2: Update quality control information
   */
  async updateQualityControl(
    organizationId: string,
    batchId: string,
    data: UpdateQualityControlDto
  ): Promise<ReceptionBatch> {
    return apiClient.patch<ReceptionBatch>(
      `/api/v1/organizations/${organizationId}/reception-batches/${batchId}/quality-control`,
      data
    );
  },

  /**
   * Step 3: Make reception decision
   */
  async makeDecision(
    organizationId: string,
    batchId: string,
    data: MakeReceptionDecisionDto
  ): Promise<ReceptionBatch> {
    return apiClient.patch<ReceptionBatch>(
      `/api/v1/organizations/${organizationId}/reception-batches/${batchId}/decision`,
      data
    );
  },

  /**
   * Step 4: Process payment and create journal entries
   */
  async processPayment(
    organizationId: string,
    batchId: string,
    data: ProcessReceptionPaymentDto
  ): Promise<ProcessPaymentResponse> {
    return apiClient.post<ProcessPaymentResponse>(
      `/api/v1/organizations/${organizationId}/reception-batches/${batchId}/process-payment`,
      data
    );
  },

  /**
   * Cancel a reception batch
   */
  async cancel(organizationId: string, batchId: string): Promise<ReceptionBatch> {
    return apiClient.delete<ReceptionBatch>(
      `/api/v1/organizations/${organizationId}/reception-batches/${batchId}`
    );
  },
};
