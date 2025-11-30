import { apiClient } from '../api-client';
import type {
  Delivery,
  DeliverySummary,
  DeliveryFilters,
  CreateDeliveryRequest,
  UpdateDeliveryStatusRequest,
  CompleteDeliveryRequest,
  DeliveryItem,
  DeliveryTracking,
} from '../../types/harvests';

export interface DeliveryApiFilters {
  status?: string; // comma-separated
  payment_status?: string; // comma-separated
  delivery_type?: string; // comma-separated
  farm_id?: string;
  driver_id?: string;
  date_from?: string;
  date_to?: string;
  customer_name?: string;
}

export const deliveriesApi = {
  /**
   * Get all deliveries for an organization
   */
  async getAll(organizationId: string, filters?: DeliveryFilters): Promise<DeliverySummary[]> {
    const params = new URLSearchParams();

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      params.append('status', statuses.join(','));
    }

    if (filters?.payment_status) {
      const statuses = Array.isArray(filters.payment_status) ? filters.payment_status : [filters.payment_status];
      params.append('payment_status', statuses.join(','));
    }

    if (filters?.delivery_type) {
      const types = Array.isArray(filters.delivery_type) ? filters.delivery_type : [filters.delivery_type];
      params.append('delivery_type', types.join(','));
    }

    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.driver_id) params.append('driver_id', filters.driver_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.customer_name) params.append('customer_name', filters.customer_name);

    const queryString = params.toString();
    const url = `/api/v1/organizations/${organizationId}/deliveries${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<DeliverySummary[]>(url);
  },

  /**
   * Get a single delivery by ID with items and tracking
   */
  async getById(organizationId: string, deliveryId: string): Promise<DeliverySummary & { tracking: DeliveryTracking[] }> {
    return apiClient.get<DeliverySummary & { tracking: DeliveryTracking[] }>(
      `/api/v1/organizations/${organizationId}/deliveries/${deliveryId}`
    );
  },

  /**
   * Get delivery items for a specific delivery
   */
  async getItems(organizationId: string, deliveryId: string): Promise<DeliveryItem[]> {
    return apiClient.get<DeliveryItem[]>(
      `/api/v1/organizations/${organizationId}/deliveries/${deliveryId}/items`
    );
  },

  /**
   * Get delivery tracking records for a specific delivery
   */
  async getTracking(organizationId: string, deliveryId: string): Promise<DeliveryTracking[]> {
    return apiClient.get<DeliveryTracking[]>(
      `/api/v1/organizations/${organizationId}/deliveries/${deliveryId}/tracking`
    );
  },

  /**
   * Create a new delivery
   */
  async create(organizationId: string, data: CreateDeliveryRequest): Promise<Delivery> {
    return apiClient.post<Delivery>(
      `/api/v1/organizations/${organizationId}/deliveries`,
      data
    );
  },

  /**
   * Update delivery status
   */
  async updateStatus(organizationId: string, deliveryId: string, data: Omit<UpdateDeliveryStatusRequest, 'delivery_id'>): Promise<Delivery> {
    return apiClient.patch<Delivery>(
      `/api/v1/organizations/${organizationId}/deliveries/${deliveryId}/status`,
      data
    );
  },

  /**
   * Complete a delivery
   */
  async complete(organizationId: string, deliveryId: string, data: Omit<CompleteDeliveryRequest, 'delivery_id'>): Promise<Delivery> {
    return apiClient.patch<Delivery>(
      `/api/v1/organizations/${organizationId}/deliveries/${deliveryId}/complete`,
      data
    );
  },

  /**
   * Update delivery payment
   */
  async updatePayment(
    organizationId: string,
    deliveryId: string,
    data: {
      payment_received: number;
      payment_date?: string;
      payment_status?: 'pending' | 'partial' | 'paid';
    }
  ): Promise<Delivery> {
    return apiClient.patch<Delivery>(
      `/api/v1/organizations/${organizationId}/deliveries/${deliveryId}/payment`,
      data
    );
  },

  /**
   * Cancel a delivery
   */
  async cancel(organizationId: string, deliveryId: string, reason?: string): Promise<Delivery> {
    return apiClient.patch<Delivery>(
      `/api/v1/organizations/${organizationId}/deliveries/${deliveryId}/cancel`,
      { reason }
    );
  },
};
