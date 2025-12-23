import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/marketplace';

export interface MarketplaceCategory {
  id: number;
  attributes: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    image?: {
      data?: {
        attributes: {
          url: string;
        };
      };
    };
    sort_order?: number;
    is_featured?: boolean;
    locale: string;
  };
}

export interface MarketplaceCategoryResponse {
  data: MarketplaceCategory[];
  meta?: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export const marketplaceCategoriesApi = {
  /**
   * Get all marketplace categories from Strapi CMS
   */
  async getAll(locale: string = 'fr', organizationId?: string): Promise<MarketplaceCategoryResponse> {
    const url = `${BASE_URL}/categories?locale=${locale}`;
    return apiClient.get<MarketplaceCategoryResponse>(url, {}, organizationId);
  },

  /**
   * Get featured marketplace categories
   */
  async getFeatured(locale: string = 'fr', organizationId?: string): Promise<MarketplaceCategoryResponse> {
    const url = `${BASE_URL}/categories/featured?locale=${locale}`;
    return apiClient.get<MarketplaceCategoryResponse>(url, {}, organizationId);
  },

  /**
   * Get a single category by slug
   */
  async getBySlug(slug: string, locale: string = 'fr', organizationId?: string): Promise<MarketplaceCategory> {
    const url = `${BASE_URL}/categories/${slug}?locale=${locale}`;
    return apiClient.get<MarketplaceCategory>(url, {}, organizationId);
  },
};
