import { Injectable, Logger } from '@nestjs/common';
import { StrapiService } from './strapi.service';

/**
 * Reference Data Service
 *
 * Business logic for fetching reference data from Strapi CMS
 * Handles multi-tenancy filtering and data transformation
 */
@Injectable()
export class ReferenceDataService {
  private readonly logger = new Logger(ReferenceDataService.name);

  constructor(private readonly strapiService: StrapiService) {}

  // =====================================================
  // TREE CATEGORIES & TREES
  // =====================================================

  /**
   * Get all tree categories (filtered by organization)
   */
  async getTreeCategories(organizationId?: string) {
    const params: any = {
      populate: 'trees',
      sort: 'name:asc',
    };

    // Filter by organization if provided
    if (organizationId) {
      params['filters[organization_id][$eq]'] = organizationId;
    }

    const response = await this.strapiService.get('/tree-categories', params);
    return this.strapiService.transformResponse(response);
  }

  /**
   * Get a single tree category by ID
   */
  async getTreeCategory(id: string, organizationId?: string) {
    const params: any = {
      populate: 'trees',
    };

    // Verify organization access
    if (organizationId) {
      params['filters[organization_id][$eq]'] = organizationId;
    }

    const response = await this.strapiService.get(`/tree-categories/${id}`, params);
    return this.strapiService.transformSingleResponse(response);
  }

  /**
   * Get all trees (optionally filtered by category)
   */
  async getTrees(categoryId?: string) {
    const params: any = {
      populate: 'tree_category',
      sort: 'name:asc',
    };

    if (categoryId) {
      params['filters[tree_category][id][$eq]'] = categoryId;
    }

    const response = await this.strapiService.get('/trees', params);
    return this.strapiService.transformResponse(response);
  }

  // =====================================================
  // PLANTATION TYPES
  // =====================================================

  /**
   * Get all plantation types (filtered by organization)
   */
  async getPlantationTypes(organizationId?: string) {
    const params: any = {
      sort: 'name:asc',
    };

    if (organizationId) {
      params['filters[organization_id][$eq]'] = organizationId;
    }

    const response = await this.strapiService.get('/plantation-types', params);
    return this.strapiService.transformResponse(response);
  }

  /**
   * Get a single plantation type by ID
   */
  async getPlantationType(id: string, organizationId?: string) {
    const params: any = {};

    if (organizationId) {
      params['filters[organization_id][$eq]'] = organizationId;
    }

    const response = await this.strapiService.get(`/plantation-types/${id}`, params);
    return this.strapiService.transformSingleResponse(response);
  }

  // =====================================================
  // TEST TYPES (GLOBAL)
  // =====================================================

  /**
   * Get all test types (global reference data)
   */
  async getTestTypes() {
    const params = {
      sort: 'name:asc',
    };

    const response = await this.strapiService.get('/test-types', params);
    return this.strapiService.transformResponse(response);
  }

  /**
   * Get a single test type by ID
   */
  async getTestType(id: string) {
    const response = await this.strapiService.get(`/test-types/${id}`);
    return this.strapiService.transformSingleResponse(response);
  }

  // =====================================================
  // PRODUCT CATEGORIES (GLOBAL)
  // =====================================================

  /**
   * Get all product categories with subcategories
   */
  async getProductCategories() {
    const params = {
      populate: 'product_subcategories',
      sort: 'name:asc',
    };

    const response = await this.strapiService.get('/product-categories', params);
    return this.strapiService.transformResponse(response);
  }

  /**
   * Get a single product category by ID
   */
  async getProductCategory(id: string) {
    const params = {
      populate: 'product_subcategories',
    };

    const response = await this.strapiService.get(`/product-categories/${id}`, params);
    return this.strapiService.transformSingleResponse(response);
  }

  /**
   * Get all product subcategories (optionally filtered by category)
   */
  async getProductSubcategories(categoryId?: string) {
    const params: any = {
      populate: 'product_category',
      sort: 'name:asc',
    };

    if (categoryId) {
      params['filters[product_category][id][$eq]'] = categoryId;
    }

    const response = await this.strapiService.get('/product-subcategories', params);
    return this.strapiService.transformResponse(response);
  }

  // =====================================================
  // SOIL TYPES (GLOBAL)
  // =====================================================

  /**
   * Get all soil types (global reference data)
   */
  async getSoilTypes() {
    const params = {
      sort: 'name:asc',
    };

    const response = await this.strapiService.get('/soil-types', params);
    return this.strapiService.transformResponse(response);
  }

  // =====================================================
  // IRRIGATION TYPES (GLOBAL)
  // =====================================================

  /**
   * Get all irrigation types (global reference data)
   */
  async getIrrigationTypes() {
    const params = {
      sort: 'name:asc',
    };

    const response = await this.strapiService.get('/irrigation-types', params);
    return this.strapiService.transformResponse(response);
  }

  // =====================================================
  // CROP CATEGORIES (GLOBAL)
  // =====================================================

  /**
   * Get all crop categories (global reference data)
   */
  async getCropCategories() {
    const params = {
      populate: 'crop_types',
      sort: 'name:asc',
    };

    const response = await this.strapiService.get('/crop-categories', params);
    return this.strapiService.transformResponse(response);
  }

  /**
   * Get a single crop category by ID
   */
  async getCropCategory(id: string) {
    const params = {
      populate: 'crop_types',
    };

    const response = await this.strapiService.get(`/crop-categories/${id}`, params);
    return this.strapiService.transformSingleResponse(response);
  }

  // =====================================================
  // CROP TYPES
  // =====================================================

  /**
   * Get all crop types (optionally filtered by category)
   */
  async getCropTypes(categoryId?: string) {
    const params: any = {
      populate: 'crop_category,varieties',
      sort: 'name:asc',
    };

    if (categoryId) {
      params['filters[crop_category][id][$eq]'] = categoryId;
    }

    const response = await this.strapiService.get('/crop-types', params);
    return this.strapiService.transformResponse(response);
  }

  // =====================================================
  // VARIETIES
  // =====================================================

  /**
   * Get all varieties (optionally filtered by crop type)
   */
  async getVarieties(cropTypeId?: string) {
    const params: any = {
      populate: 'crop_type',
      sort: 'name:asc',
    };

    if (cropTypeId) {
      params['filters[crop_type][id][$eq]'] = cropTypeId;
    }

    const response = await this.strapiService.get('/varieties', params);
    return this.strapiService.transformResponse(response);
  }

  // =====================================================
  // COMBINED / UTILITY METHODS
  // =====================================================

  /**
   * Get all reference data for an organization
   * Useful for initial app load
   */
  async getAllReferenceData(organizationId: string) {
    const [
      treeCategories,
      plantationTypes,
      testTypes,
      productCategories,
      soilTypes,
      irrigationTypes,
      cropCategories,
    ] = await Promise.all([
      this.getTreeCategories(organizationId),
      this.getPlantationTypes(organizationId),
      this.getTestTypes(),
      this.getProductCategories(),
      this.getSoilTypes(),
      this.getIrrigationTypes(),
      this.getCropCategories(),
    ]);

    return {
      treeCategories,
      plantationTypes,
      testTypes,
      productCategories,
      soilTypes,
      irrigationTypes,
      cropCategories,
    };
  }
}
