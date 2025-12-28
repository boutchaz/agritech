import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/reference-data';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface TreeCategory {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_global?: boolean;
  organization_id?: string;
  trees?: Tree[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Tree {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  scientific_name?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  icon?: string;
  origin?: string;
  water_requirements?: 'low' | 'medium' | 'high';
  growth_rate?: 'slow' | 'medium' | 'fast';
  mature_height_m?: number;
  lifespan_years?: number;
  spacing_m?: number;
  characteristics?: Record<string, unknown>;
  varieties?: Record<string, unknown>[];
  sort_order?: number;
  is_global?: boolean;
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
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  icon?: string;
  color?: string;
  drainage_rating?: 'poor' | 'moderate' | 'good' | 'excellent';
  water_retention?: 'low' | 'medium' | 'high';
  suitable_crops?: string[];
  sort_order?: number;
  is_global?: boolean;
  organization_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IrrigationType {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  icon?: string;
  color?: string;
  water_efficiency?: 'low' | 'medium' | 'high' | 'very_high';
  initial_cost?: 'low' | 'medium' | 'high';
  maintenance_level?: 'low' | 'medium' | 'high';
  suitable_for?: string[];
  sort_order?: number;
  is_global?: boolean;
  organization_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CropCategory {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_global?: boolean;
  organization_id?: string;
  crop_types?: CropType[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CropType {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  scientific_name?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  icon?: string;
  water_requirements?: 'low' | 'medium' | 'high';
  growth_cycle_days?: number;
  sort_order?: number;
  is_global?: boolean;
  organization_id?: string;
  crop_category?: CropCategory;
  varieties?: Variety[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Variety {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  origin?: string;
  main_use?: string;
  maturity_days?: number;
  yield_potential?: 'low' | 'medium' | 'high' | 'very_high';
  sort_order?: number;
  is_global?: boolean;
  organization_id?: string;
  crop_type?: CropType;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitOfMeasure {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  symbol?: string;
  category?: 'weight' | 'volume' | 'count' | 'area' | 'length';
  base_unit?: string;
  conversion_factor?: number;
  icon?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface QualityGrade {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  rank?: number;
  sort_order?: number;
  is_global?: boolean;
}

export interface HarvestStatus {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  is_final?: boolean;
  sort_order?: number;
  is_global?: boolean;
}

export interface IntendedUse {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface UtilityType {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  default_unit?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface InfrastructureType {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: 'building' | 'water' | 'storage' | 'equipment' | 'other';
  sort_order?: number;
  is_global?: boolean;
}

export interface BasinShape {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  volume_formula?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  requires_reference?: boolean;
  sort_order?: number;
  is_global?: boolean;
}

export interface PaymentStatus {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  is_final?: boolean;
  sort_order?: number;
  is_global?: boolean;
}

export interface TaskPriority {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  level?: number;
  sort_order?: number;
  is_global?: boolean;
}

export interface WorkerType {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  icon?: string;
  color?: string;
  payment_frequency?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface MetayageType {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  worker_share_percentage?: number;
  owner_share_percentage?: number;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface DocumentType {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  prefix?: string;
  requires_numbering?: boolean;
  sort_order?: number;
  is_global?: boolean;
}

export interface Currency {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  code: string;
  symbol: string;
  symbol_position?: 'before' | 'after';
  decimal_places?: number;
  decimal_separator?: string;
  thousands_separator?: string;
  icon?: string;
  country_code?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface Timezone {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  offset?: string;
  offset_minutes?: number;
  region?: string;
  country_code?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface Language {
  id: string;
  name: string;
  native_name?: string;
  code: string;
  locale?: string;
  direction?: 'ltr' | 'rtl';
  flag_icon?: string;
  is_default?: boolean;
  sort_order?: number;
  is_global?: boolean;
}

export interface LabServiceCategory {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface SoilTexture {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  description_fr?: string;
  description_ar?: string;
  sand_percentage_min?: number;
  sand_percentage_max?: number;
  clay_percentage_min?: number;
  clay_percentage_max?: number;
  silt_percentage_min?: number;
  silt_percentage_max?: number;
  icon?: string;
  color?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface CostCategory {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category?: string;
  default_account_code?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface RevenueCategory {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  default_account_code?: string;
  sort_order?: number;
  is_global?: boolean;
}

export interface SaleType {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  requires_client?: boolean;
  sort_order?: number;
  is_global?: boolean;
}

export interface ExperienceLevel {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  level?: number;
  wage_multiplier?: number;
  sort_order?: number;
  is_global?: boolean;
}

export interface Seasonality {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  start_month?: number;
  end_month?: number;
  sort_order?: number;
  is_global?: boolean;
}

export interface DeliveryType {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  requires_destination?: boolean;
  sort_order?: number;
  is_global?: boolean;
}

export interface DeliveryStatus {
  id: string;
  name: string;
  name_fr?: string;
  name_ar?: string;
  value: string;
  description?: string;
  icon?: string;
  color?: string;
  is_final?: boolean;
  sort_order?: number;
  is_global?: boolean;
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

  async getVarieties(cropTypeId?: string, organizationId?: string): Promise<Variety[]> {
    const params = cropTypeId ? `?crop_type_id=${cropTypeId}` : '';
    return apiClient.get<Variety[]>(`${BASE_URL}/varieties${params}`, {}, organizationId);
  },

  async getUnitsOfMeasure(organizationId?: string): Promise<UnitOfMeasure[]> {
    return apiClient.get<UnitOfMeasure[]>(`${BASE_URL}/units-of-measure`, {}, organizationId);
  },

  async getQualityGrades(organizationId?: string): Promise<QualityGrade[]> {
    return apiClient.get<QualityGrade[]>(`${BASE_URL}/quality-grades`, {}, organizationId);
  },

  async getHarvestStatuses(organizationId?: string): Promise<HarvestStatus[]> {
    return apiClient.get<HarvestStatus[]>(`${BASE_URL}/harvest-statuses`, {}, organizationId);
  },

  async getIntendedUses(organizationId?: string): Promise<IntendedUse[]> {
    return apiClient.get<IntendedUse[]>(`${BASE_URL}/intended-uses`, {}, organizationId);
  },

  async getUtilityTypes(organizationId?: string): Promise<UtilityType[]> {
    return apiClient.get<UtilityType[]>(`${BASE_URL}/utility-types`, {}, organizationId);
  },

  async getInfrastructureTypes(organizationId?: string): Promise<InfrastructureType[]> {
    return apiClient.get<InfrastructureType[]>(`${BASE_URL}/infrastructure-types`, {}, organizationId);
  },

  async getBasinShapes(organizationId?: string): Promise<BasinShape[]> {
    return apiClient.get<BasinShape[]>(`${BASE_URL}/basin-shapes`, {}, organizationId);
  },

  async getPaymentMethods(organizationId?: string): Promise<PaymentMethod[]> {
    return apiClient.get<PaymentMethod[]>(`${BASE_URL}/payment-methods`, {}, organizationId);
  },

  async getPaymentStatuses(organizationId?: string): Promise<PaymentStatus[]> {
    return apiClient.get<PaymentStatus[]>(`${BASE_URL}/payment-statuses`, {}, organizationId);
  },

  async getTaskPriorities(organizationId?: string): Promise<TaskPriority[]> {
    return apiClient.get<TaskPriority[]>(`${BASE_URL}/task-priorities`, {}, organizationId);
  },

  async getWorkerTypes(organizationId?: string): Promise<WorkerType[]> {
    return apiClient.get<WorkerType[]>(`${BASE_URL}/worker-types`, {}, organizationId);
  },

  async getMetayageTypes(organizationId?: string): Promise<MetayageType[]> {
    return apiClient.get<MetayageType[]>(`${BASE_URL}/metayage-types`, {}, organizationId);
  },

  async getDocumentTypes(organizationId?: string): Promise<DocumentType[]> {
    return apiClient.get<DocumentType[]>(`${BASE_URL}/document-types`, {}, organizationId);
  },

  async getCurrencies(organizationId?: string): Promise<Currency[]> {
    return apiClient.get<Currency[]>(`${BASE_URL}/currencies`, {}, organizationId);
  },

  async getTimezones(organizationId?: string): Promise<Timezone[]> {
    return apiClient.get<Timezone[]>(`${BASE_URL}/timezones`, {}, organizationId);
  },

  async getLanguages(organizationId?: string): Promise<Language[]> {
    return apiClient.get<Language[]>(`${BASE_URL}/languages`, {}, organizationId);
  },

  async getLabServiceCategories(organizationId?: string): Promise<LabServiceCategory[]> {
    return apiClient.get<LabServiceCategory[]>(`${BASE_URL}/lab-service-categories`, {}, organizationId);
  },

  async getSoilTextures(organizationId?: string): Promise<SoilTexture[]> {
    return apiClient.get<SoilTexture[]>(`${BASE_URL}/soil-textures`, {}, organizationId);
  },

  async getCostCategories(organizationId?: string): Promise<CostCategory[]> {
    return apiClient.get<CostCategory[]>(`${BASE_URL}/cost-categories`, {}, organizationId);
  },

  async getRevenueCategories(organizationId?: string): Promise<RevenueCategory[]> {
    return apiClient.get<RevenueCategory[]>(`${BASE_URL}/revenue-categories`, {}, organizationId);
  },

  async getSaleTypes(organizationId?: string): Promise<SaleType[]> {
    return apiClient.get<SaleType[]>(`${BASE_URL}/sale-types`, {}, organizationId);
  },

  async getExperienceLevels(organizationId?: string): Promise<ExperienceLevel[]> {
    return apiClient.get<ExperienceLevel[]>(`${BASE_URL}/experience-levels`, {}, organizationId);
  },

  async getSeasonalities(organizationId?: string): Promise<Seasonality[]> {
    return apiClient.get<Seasonality[]>(`${BASE_URL}/seasonalities`, {}, organizationId);
  },

  async getDeliveryTypes(organizationId?: string): Promise<DeliveryType[]> {
    return apiClient.get<DeliveryType[]>(`${BASE_URL}/delivery-types`, {}, organizationId);
  },

  async getDeliveryStatuses(organizationId?: string): Promise<DeliveryStatus[]> {
    return apiClient.get<DeliveryStatus[]>(`${BASE_URL}/delivery-statuses`, {}, organizationId);
  },
};
