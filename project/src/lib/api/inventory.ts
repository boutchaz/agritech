import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/product-applications';

export interface InventoryProductVariant {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  base_quantity: number;
}

export interface InventoryProduct {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  variants: InventoryProductVariant[];
}

export const inventoryApi = {
  /**
   * Get available products from inventory (quantity > 0)
   */
  async getAvailableProducts(organizationId?: string): Promise<InventoryProduct[]> {
    try {
      const response = await apiClient.get<{ success: boolean; products: InventoryProduct[]; total: number } | InventoryProduct[]>(
        `${BASE_URL}/available-products`,
        {},
        organizationId
      );

      // Check if response is wrapped in success object
      if (response && typeof response === 'object' && 'success' in response) {
        const wrappedResponse = response as { success: boolean; products: InventoryProduct[]; total: number };
        if (wrappedResponse.success && Array.isArray(wrappedResponse.products)) {
          return wrappedResponse.products;
        }
      }

      // Fallback: if response is already an array (backward compatibility)
      if (Array.isArray(response)) {
        return response;
      }

      return [];
    } catch (error) {
      console.error('Error fetching available products:', error);
      return [];
    }
  },
};
