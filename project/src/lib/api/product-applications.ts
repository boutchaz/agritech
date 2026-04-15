import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/product-applications';

export interface ProductApplication {
  id: string;
  product_id: string;
  farm_id: string;
  parcel_id: string | null;
  application_date: string;
  quantity_used: number;
  area_treated: number;
  cost: number | null;
  currency: string | null;
  notes: string | null;
  task_id: string | null;
  images: string[] | null;
  created_at: string;
  inventory: {
    name: string;
    unit: string;
  };
  farm: { name: string } | null;
  parcel: { name: string } | null;
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
  task_id?: string;
  images?: string[];
}

export const productApplicationsApi = {
  async getAll(organizationId?: string): Promise<ProductApplication[]> {
    const response = await apiClient.get<{ success: boolean; applications: ProductApplication[]; total: number } | ProductApplication[]>(
      BASE_URL,
      {},
      organizationId
    );

    if (response && typeof response === 'object' && 'success' in response) {
      const wrappedResponse = response as { success: boolean; applications: ProductApplication[]; total: number };
      if (wrappedResponse.success && Array.isArray(wrappedResponse.applications)) {
        return wrappedResponse.applications;
      }
      throw new Error('Failed to load product applications');
    }

    if (Array.isArray(response)) {
      return response;
    }

    throw new Error('Unexpected response format from product applications API');
  },

  async create(data: CreateProductApplicationDto, organizationId?: string): Promise<{ success: boolean; application: ProductApplication }> {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },
};
