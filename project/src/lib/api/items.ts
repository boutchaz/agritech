import { createCrudApi } from './createCrudApi';
import { apiClient } from '../api-client';
import type {
  Item,
  ItemWithDetails,
  ItemGroup,
  ItemSelectionOption,
  CreateItemInput,
  UpdateItemInput,
  CreateItemGroupInput,
  UpdateItemGroupInput,
  CreateProductVariantInput,
  UpdateProductVariantInput,
  ProductVariant,
  ItemFilters,
  ItemGroupFilters,
} from '../../types/items';

const BASE_URL = '/api/v1/items';

const baseCrud = createCrudApi<Item, CreateItemInput, ItemFilters, UpdateItemInput>(BASE_URL);

export const itemsApi = {
  // =====================================================
  // ITEMS - Using createCrudApi
  // =====================================================
  ...baseCrud,

  /**
   * Get a single item with details (overrides baseCrud.getOne)
   */
  async getOne(id: string, organizationId?: string): Promise<ItemWithDetails> {
    return apiClient.get<ItemWithDetails>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  // =====================================================
  // ITEM GROUPS
  // =====================================================

  /**
   * Get all item groups with optional filters
   */
  async getAllGroups(filters?: ItemGroupFilters, organizationId?: string): Promise<ItemGroup[]> {
    const params = new URLSearchParams();

    if (filters?.parent_group_id !== undefined) {
      params.append('parent_group_id', filters.parent_group_id ?? '');
    }
    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }
    if (filters?.search) params.append('search', filters.search);

    const url = `${BASE_URL}/groups${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<ItemGroup[]>(url, {}, organizationId);
  },

  /**
   * Get a single item group
   */
  async getOneGroup(id: string, organizationId?: string): Promise<ItemGroup> {
    return apiClient.get<ItemGroup>(`${BASE_URL}/groups/${id}`, {}, organizationId);
  },

  /**
   * Create a new item group
   */
  async createGroup(data: CreateItemGroupInput, organizationId?: string): Promise<ItemGroup> {
    return apiClient.post<ItemGroup>(`${BASE_URL}/groups`, data, {}, organizationId);
  },

  /**
   * Update an item group
   */
  async updateGroup(id: string, data: UpdateItemGroupInput, organizationId?: string): Promise<ItemGroup> {
    return apiClient.patch<ItemGroup>(`${BASE_URL}/groups/${id}`, data, {}, organizationId);
  },

  /**
   * Delete an item group
   */
  async deleteGroup(id: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${BASE_URL}/groups/${id}`, {}, organizationId);
  },

  // =====================================================
  // CUSTOM ITEM METHODS
  // =====================================================

  /**
   * Get items for selection (lightweight for dropdowns)
   */
  async getForSelection(filters?: {
    is_sales_item?: boolean;
    is_purchase_item?: boolean;
    is_stock_item?: boolean;
    search?: string;
  }, organizationId?: string): Promise<ItemSelectionOption[]> {
    const params = new URLSearchParams();

    if (filters?.is_sales_item !== undefined) {
      params.append('is_sales_item', filters.is_sales_item.toString());
    }
    if (filters?.is_purchase_item !== undefined) {
      params.append('is_purchase_item', filters.is_purchase_item.toString());
    }
    if (filters?.is_stock_item !== undefined) {
      params.append('is_stock_item', filters.is_stock_item.toString());
    }
    if (filters?.search) params.append('search', filters.search);

    const url = `${BASE_URL}/selection${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<ItemSelectionOption[]>(url, {}, organizationId);
  },

  // =====================================================
  // STOCK LEVELS & FARM INTEGRATION
  // =====================================================

  /**
   * Get stock levels grouped by farm with warehouse relationships
   */
  async getFarmStockLevels(
    filters?: {
      farm_id?: string;
      item_id?: string;
      low_stock_only?: boolean;
    },
    organizationId?: string,
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.item_id) params.append('item_id', filters.item_id);
    if (filters?.low_stock_only) params.append('low_stock_only', 'true');

    const url = `${BASE_URL}/stock-levels/farm${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<any[]>(url, {}, organizationId);
  },

  /**
   * Get item usage by farm/parcel
   */
  async getItemFarmUsage(itemId: string, organizationId?: string): Promise<any> {
    return apiClient.get<any>(`${BASE_URL}/${itemId}/farm-usage`, {}, organizationId);
  },

  /**
   * Get stock levels for items with farm context
   */
  async getStockLevels(
    filters?: {
      farm_id?: string;
      item_id?: string;
    },
    organizationId?: string,
  ): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.item_id) params.append('item_id', filters.item_id);

    const url = `${BASE_URL}/stock-levels${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<any>(url, {}, organizationId);
  },

  // =====================================================
  // PRODUCT VARIANTS
  // =====================================================

  async getVariants(itemId: string, organizationId?: string): Promise<ProductVariant[]> {
    return apiClient.get<ProductVariant[]>(`${BASE_URL}/${itemId}/variants`, {}, organizationId);
  },

  async createVariant(
    itemId: string,
    data: CreateProductVariantInput,
    organizationId?: string,
  ): Promise<ProductVariant> {
    return apiClient.post<ProductVariant>(`${BASE_URL}/${itemId}/variants`, data, {}, organizationId);
  },

  async updateVariant(
    variantId: string,
    data: UpdateProductVariantInput,
    organizationId?: string,
  ): Promise<ProductVariant> {
    return apiClient.patch<ProductVariant>(`${BASE_URL}/variants/${variantId}`, data, {}, organizationId);
  },

  async deleteVariant(variantId: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${BASE_URL}/variants/${variantId}`, {}, organizationId);
  },

  // =====================================================
  // ITEM PRICES
  // =====================================================

  /**
   * Get all prices for a specific item
   */
  async getItemPrices(itemId: string, organizationId?: string): Promise<any[]> {
    return apiClient.get<any[]>(`${BASE_URL}/${itemId}/prices`, {}, organizationId);
  },
};
