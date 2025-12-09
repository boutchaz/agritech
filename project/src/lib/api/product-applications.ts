import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/product-applications';

export interface ProductApplication {
  id: string;
  product_id: string;
  application_date: string;
  quantity_used: number;
  area_treated: number;
  notes: string;
  created_at: string;
  inventory: {
    name: string;
    unit: string;
  };
}

export interface CreateProductApplicationDto {
  product_id: string;
  application_date: string;
  quantity_used: number;
  area_treated: number;
  notes?: string;
  parcel_id?: string;
  cost?: number;
  farm_id: string;
  currency?: string;
}

export const productApplicationsApi = {
  /**
   * Get all product applications for an organization
   */
  async getAll(organizationId?: string): Promise<ProductApplication[]> {
    try {
      const response = await apiClient.get<{ success: boolean; applications: ProductApplication[]; total: number } | ProductApplication[]>(
        BASE_URL,
        {},
        organizationId
      );

      // Check if response is wrapped in success object
      if (response && typeof response === 'object' && 'success' in response) {
        const wrappedResponse = response as { success: boolean; applications: ProductApplication[]; total: number };
        if (wrappedResponse.success && Array.isArray(wrappedResponse.applications)) {
          return wrappedResponse.applications;
        }
      }

      // Fallback: if response is already an array (backward compatibility)
      if (Array.isArray(response)) {
        return response;
      }

      return [];
    } catch (error) {
      console.error('Error fetching product applications:', error);
      return [];
    }
  },

  /**
   * Create a new product application
   */
  async create(data: CreateProductApplicationDto, organizationId?: string): Promise<{ success: boolean; application: ProductApplication }> {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },
};
