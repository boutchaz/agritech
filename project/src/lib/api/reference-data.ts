import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/reference-data';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface TreeCategory {
  id: string;
  name: string;
  description?: string;
  organization_id?: string;
  trees?: Tree[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Tree {
  id: string;
  name: string;
  characteristics?: any;
  tree_category?: TreeCategory;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlantationType {
  id: string;
  name: string;
  description?: string;
  spacing?: string;
  trees_per_ha?: number;
  configuration?: any;
  organization_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestType {
  id: string;
  name: string;
  description?: string;
  parameters?: {
    min_value?: number;
    max_value?: number;
    unit?: string;
    method?: string;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  product_subcategories?: ProductSubcategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSubcategory {
  id: string;
  name: string;
  description?: string;
  product_category?: ProductCategory;
  createdAt?: string;
  updatedAt?: string;
}

export interface SoilType {
  id: string;
  name: string;
  value: string;
  description?: string;
  organization_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IrrigationType {
  id: string;
  name: string;
  value: string;
  description?: string;
  organization_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CropCategory {
  id: string;
  name: string;
  value: string;
  description?: string;
  organization_id?: string;
  crop_types?: CropType[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CropType {
  id: string;
  name: string;
  value: string;
  description?: string;
  organization_id?: string;
  crop_category?: CropCategory;
  varieties?: Variety[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Variety {
  id: string;
  name: string;
  value: string;
  description?: string;
  origin?: string;
  main_use?: string;
  organization_id?: string;
  crop_type?: CropType;
  createdAt?: string;
  updatedAt?: string;
}

export interface AllReferenceData {
  treeCategories: TreeCategory[];
  plantationTypes: PlantationType[];
  testTypes: TestType[];
  productCategories: ProductCategory[];
  soilTypes: SoilType[];
  irrigationTypes: IrrigationType[];
  cropCategories: CropCategory[];
}

// =====================================================
// API CLIENT
// =====================================================

export const referenceDataApi = {
  /**
   * Get all reference data at once (useful for app initialization)
   */
  async getAll(organizationId?: string): Promise<AllReferenceData> {
    return apiClient.get<AllReferenceData>(`${BASE_URL}/all`, {}, organizationId);
  },

  // =====================================================
  // TREE CATEGORIES & TREES
  // =====================================================

  /**
   * Get all tree categories
   */
  async getTreeCategories(organizationId?: string): Promise<TreeCategory[]> {
    return apiClient.get<TreeCategory[]>(`${BASE_URL}/tree-categories`, {}, organizationId);
  },

  /**
   * Get a single tree category by ID
   */
  async getTreeCategory(id: string, organizationId?: string): Promise<TreeCategory> {
    return apiClient.get<TreeCategory>(`${BASE_URL}/tree-categories/${id}`, {}, organizationId);
  },

  /**
   * Get all trees (optionally filtered by category)
   */
  async getTrees(categoryId?: string, organizationId?: string): Promise<Tree[]> {
    const params = categoryId ? `?category_id=${categoryId}` : '';
    return apiClient.get<Tree[]>(`${BASE_URL}/trees${params}`, {}, organizationId);
  },

  // =====================================================
  // PLANTATION TYPES
  // =====================================================

  /**
   * Get all plantation types
   */
  async getPlantationTypes(organizationId?: string): Promise<PlantationType[]> {
    return apiClient.get<PlantationType[]>(`${BASE_URL}/plantation-types`, {}, organizationId);
  },

  /**
   * Get a single plantation type by ID
   */
  async getPlantationType(id: string, organizationId?: string): Promise<PlantationType> {
    return apiClient.get<PlantationType>(`${BASE_URL}/plantation-types/${id}`, {}, organizationId);
  },

  // =====================================================
  // TEST TYPES (GLOBAL)
  // =====================================================

  /**
   * Get all test types (global reference data)
   */
  async getTestTypes(organizationId?: string): Promise<TestType[]> {
    return apiClient.get<TestType[]>(`${BASE_URL}/test-types`, {}, organizationId);
  },

  /**
   * Get a single test type by ID
   */
  async getTestType(id: string, organizationId?: string): Promise<TestType> {
    return apiClient.get<TestType>(`${BASE_URL}/test-types/${id}`, {}, organizationId);
  },

  // =====================================================
  // PRODUCT CATEGORIES (GLOBAL)
  // =====================================================

  /**
   * Get all product categories with subcategories
   */
  async getProductCategories(organizationId?: string): Promise<ProductCategory[]> {
    return apiClient.get<ProductCategory[]>(`${BASE_URL}/product-categories`, {}, organizationId);
  },

  /**
   * Get a single product category by ID
   */
  async getProductCategory(id: string, organizationId?: string): Promise<ProductCategory> {
    return apiClient.get<ProductCategory>(`${BASE_URL}/product-categories/${id}`, {}, organizationId);
  },

  /**
   * Get all product subcategories (optionally filtered by category)
   */
  async getProductSubcategories(categoryId?: string, organizationId?: string): Promise<ProductSubcategory[]> {
    const params = categoryId ? `?category_id=${categoryId}` : '';
    return apiClient.get<ProductSubcategory[]>(`${BASE_URL}/product-subcategories${params}`, {}, organizationId);
  },

  // =====================================================
  // SOIL TYPES (GLOBAL)
  // =====================================================

  /**
   * Get all soil types (global reference data)
   */
  async getSoilTypes(organizationId?: string): Promise<SoilType[]> {
    return apiClient.get<SoilType[]>(`${BASE_URL}/soil-types`, {}, organizationId);
  },

  // =====================================================
  // IRRIGATION TYPES (GLOBAL)
  // =====================================================

  /**
   * Get all irrigation types (global reference data)
   */
  async getIrrigationTypes(organizationId?: string): Promise<IrrigationType[]> {
    return apiClient.get<IrrigationType[]>(`${BASE_URL}/irrigation-types`, {}, organizationId);
  },

  // =====================================================
  // CROP CATEGORIES (GLOBAL)
  // =====================================================

  /**
   * Get all crop categories (global reference data)
   */
  async getCropCategories(organizationId?: string): Promise<CropCategory[]> {
    return apiClient.get<CropCategory[]>(`${BASE_URL}/crop-categories`, {}, organizationId);
  },

  /**
   * Get a single crop category by ID
   */
  async getCropCategory(id: string, organizationId?: string): Promise<CropCategory> {
    return apiClient.get<CropCategory>(`${BASE_URL}/crop-categories/${id}`, {}, organizationId);
  },

  // =====================================================
  // CROP TYPES
  // =====================================================

  /**
   * Get all crop types (optionally filtered by category)
   */
  async getCropTypes(categoryId?: string, organizationId?: string): Promise<CropType[]> {
    const params = categoryId ? `?category_id=${categoryId}` : '';
    return apiClient.get<CropType[]>(`${BASE_URL}/crop-types${params}`, {}, organizationId);
  },

  // =====================================================
  // VARIETIES
  // =====================================================

  /**
   * Get all varieties (optionally filtered by crop type)
   */
  async getVarieties(cropTypeId?: string, organizationId?: string): Promise<Variety[]> {
    const params = cropTypeId ? `?crop_type_id=${cropTypeId}` : '';
    return apiClient.get<Variety[]>(`${BASE_URL}/varieties${params}`, {}, organizationId);
  },
};
