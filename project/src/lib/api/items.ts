import { createCrudApi, requireOrganizationId } from './createCrudApi';
import { apiClient } from '../api-client';
import type { PaginatedQuery, PaginatedResponse } from './types';
import type {
  Item,
  ItemWithDetails,
  ItemGroup,
  ItemSelectionOption,
  ItemPrice,
  CreateItemInput,
  UpdateItemInput,
  CreateItemGroupInput,
  UpdateItemGroupInput,
  CreateProductVariantInput,
  UpdateProductVariantInput,
  ProductVariant,
  ItemFilters,
  ItemGroupFilters,
  FarmStockLevelsByItem,
  ItemUsageSummary,
  ItemStockLevelsResponse,
  ItemSelectionFilters,
  FarmStockLevelFilters,
  StockLevelFilters,
  ItemGroupListResponse,
  MessageResponse,
  SeedResultResponse,
} from '../../types/items';

const BASE_URL = '/api/v1/items';

export interface PaginatedItemQuery extends PaginatedQuery {
  is_sales_item?: boolean;
  is_active?: boolean;
  item_group_id?: string;
}

export type {
  ItemStockLevelWarehouse,
  ItemStockLevelSummary,
  ItemStockLevelsResponse,
} from '../../types/items';

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

  async getPaginated(
    organizationId: string,
    query: PaginatedItemQuery,
  ): Promise<PaginatedResponse<Item>> {
    requireOrganizationId(organizationId, 'itemsApi.getPaginated');

    const params = new URLSearchParams();

    if (query.page) params.append('page', String(query.page));
    if (query.pageSize) params.append('pageSize', String(query.pageSize));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);
    if (query.search) params.append('search', query.search);
    if (query.is_sales_item !== undefined) params.append('is_sales_item', String(query.is_sales_item));
    if (query.is_active !== undefined) params.append('is_active', String(query.is_active));
    if (query.item_group_id) params.append('item_group_id', query.item_group_id);

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

    return apiClient.get<PaginatedResponse<Item>>(url, {}, organizationId);
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
    const res = await apiClient.get<ItemGroupListResponse>(url, {}, organizationId);
    return res?.data || [];
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
  async deleteGroup(id: string, organizationId?: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(`${BASE_URL}/groups/${id}`, {}, organizationId);
  },

  /**
   * Seed predefined item groups and subcategories (idempotent)
   */
  async seedPredefinedGroups(organizationId?: string): Promise<SeedResultResponse> {
    return apiClient.post<SeedResultResponse>(
      `${BASE_URL}/groups/seed-predefined`,
      {},
      {},
      organizationId
    );
  },

  // =====================================================
  // CUSTOM ITEM METHODS
  // =====================================================

  /**
   * Get items for selection (lightweight for dropdowns)
   */
  async getForSelection(filters?: ItemSelectionFilters, organizationId?: string): Promise<ItemSelectionOption[]> {
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
    filters?: FarmStockLevelFilters,
    organizationId?: string,
  ): Promise<FarmStockLevelsByItem[]> {
    const params = new URLSearchParams();
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.item_id) params.append('item_id', filters.item_id);
    if (filters?.low_stock_only) params.append('low_stock_only', 'true');

    const url = `${BASE_URL}/stock-levels/farm${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<FarmStockLevelsByItem[]>(url, {}, organizationId);
  },

  /**
   * Get item usage by farm/parcel
   */
  async getItemFarmUsage(itemId: string, organizationId?: string): Promise<ItemUsageSummary> {
    return apiClient.get<ItemUsageSummary>(`${BASE_URL}/${itemId}/farm-usage`, {}, organizationId);
  },

  /**
   * Get stock levels for items with farm context
   */
  async getStockLevels(
    filters?: StockLevelFilters,
    organizationId?: string,
  ): Promise<ItemStockLevelsResponse> {
    const params = new URLSearchParams();
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.item_id) params.append('item_id', filters.item_id);

    const url = `${BASE_URL}/stock-levels${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<ItemStockLevelsResponse>(url, {}, organizationId);
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

  async deleteVariant(variantId: string, organizationId?: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(`${BASE_URL}/variants/${variantId}`, {}, organizationId);
  },

  // =====================================================
  // ITEM PRICES
  // =====================================================

  /**
   * Get all prices for a specific item
   */
  async getItemPrices(itemId: string, organizationId?: string): Promise<ItemPrice[]> {
    return apiClient.get<ItemPrice[]>(`${BASE_URL}/${itemId}/prices`, {}, organizationId);
  },

  async getByBarcode(barcode: string, organizationId?: string): Promise<ItemWithDetails & { variantId?: string }> {
    type BarcodeResponse = { type: 'item'; item: ItemWithDetails } | { type: 'variant'; item: ItemWithDetails; variant: { id: string } };
    const response = await apiClient.get<BarcodeResponse>(
      `${BASE_URL}/by-barcode/${barcode}`,
      {},
      organizationId,
    );
    if (response.type === 'variant' && response.variant) {
      return { ...response.item, variantId: response.variant.id };
    }
    return response.item;
  },
};
