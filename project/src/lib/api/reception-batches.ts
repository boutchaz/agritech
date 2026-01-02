import { apiClient } from '../api-client';
import type {
  ReceptionBatch,
  CreateReceptionBatchDto,
  UpdateQualityControlDto,
  MakeReceptionDecisionDto,
  ProcessReceptionPaymentDto,
  ProcessPaymentResponse,
  ReceptionBatchFilters,
} from '../../types/reception';

export const receptionBatchesApi = {
  /**
   * Get all reception batches with optional filters
   */
  async getAll(filters?: ReceptionBatchFilters, organizationId?: string): Promise<ReceptionBatch[]> {
    if (!organizationId) throw new Error('organizationId is required');
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

  /**
   * Get a single reception batch by ID
   */
  async getOne(id: string, organizationId?: string): Promise<ReceptionBatch> {
    if (!organizationId) throw new Error('organizationId is required');
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
    if (!organizationId) throw new Error('organizationId is required');
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
