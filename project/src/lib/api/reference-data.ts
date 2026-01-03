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
// HELPER FUNCTIONS
// =====================================================

function buildUrl(base: string, params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value);
  });
  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
}

// =====================================================
// API CLIENT
// =====================================================

export const referenceDataApi = {
  /**
   * Get all reference data at once (useful for app initialization)
   */
  async getAll(organizationId?: string, locale?: string): Promise<AllReferenceData> {
    const url = buildUrl(`${BASE_URL}/all`, { locale });
    return apiClient.get<AllReferenceData>(url, {}, organizationId);
  },

  // =====================================================
  // TREE CATEGORIES & TREES
  // =====================================================

  /**
   * Get all tree categories
   */
  async getTreeCategories(organizationId?: string, locale?: string): Promise<TreeCategory[]> {
    const url = buildUrl(`${BASE_URL}/tree-categories`, { locale });
    return apiClient.get<TreeCategory[]>(url, {}, organizationId);
  },

  /**
   * Get a single tree category by ID
   */
  async getTreeCategory(id: string, organizationId?: string, locale?: string): Promise<TreeCategory> {
    const url = buildUrl(`${BASE_URL}/tree-categories/${id}`, { locale });
    return apiClient.get<TreeCategory>(url, {}, organizationId);
  },

  /**
   * Get all trees (optionally filtered by category)
   */
  async getTrees(categoryId?: string, organizationId?: string, locale?: string): Promise<Tree[]> {
    const url = buildUrl(`${BASE_URL}/trees`, { category_id: categoryId, locale });
    return apiClient.get<Tree[]>(url, {}, organizationId);
  },

  // =====================================================
  // PLANTATION TYPES
  // =====================================================

  /**
   * Get all plantation types
   */
  async getPlantationTypes(organizationId?: string, locale?: string): Promise<PlantationType[]> {
    const url = buildUrl(`${BASE_URL}/plantation-types`, { locale });
    return apiClient.get<PlantationType[]>(url, {}, organizationId);
  },

  /**
   * Get a single plantation type by ID
   */
  async getPlantationType(id: string, organizationId?: string, locale?: string): Promise<PlantationType> {
    const url = buildUrl(`${BASE_URL}/plantation-types/${id}`, { locale });
    return apiClient.get<PlantationType>(url, {}, organizationId);
  },

  // =====================================================
  // TEST TYPES (GLOBAL)
  // =====================================================

  /**
   * Get all test types (global reference data)
   */
  async getTestTypes(organizationId?: string, locale?: string): Promise<TestType[]> {
    const url = buildUrl(`${BASE_URL}/test-types`, { locale });
    return apiClient.get<TestType[]>(url, {}, organizationId);
  },

  /**
   * Get a single test type by ID
   */
  async getTestType(id: string, organizationId?: string, locale?: string): Promise<TestType> {
    const url = buildUrl(`${BASE_URL}/test-types/${id}`, { locale });
    return apiClient.get<TestType>(url, {}, organizationId);
  },

  // =====================================================
  // PRODUCT CATEGORIES (GLOBAL)
  // =====================================================

  /**
   * Get all product categories with subcategories
   */
  async getProductCategories(organizationId?: string, locale?: string): Promise<ProductCategory[]> {
    const url = buildUrl(`${BASE_URL}/product-categories`, { locale });
    return apiClient.get<ProductCategory[]>(url, {}, organizationId);
  },

  /**
   * Get a single product category by ID
   */
  async getProductCategory(id: string, organizationId?: string, locale?: string): Promise<ProductCategory> {
    const url = buildUrl(`${BASE_URL}/product-categories/${id}`, { locale });
    return apiClient.get<ProductCategory>(url, {}, organizationId);
  },

  /**
   * Get all product subcategories (optionally filtered by category)
   */
  async getProductSubcategories(categoryId?: string, organizationId?: string, locale?: string): Promise<ProductSubcategory[]> {
    const url = buildUrl(`${BASE_URL}/product-subcategories`, { category_id: categoryId, locale });
    return apiClient.get<ProductSubcategory[]>(url, {}, organizationId);
  },

  // =====================================================
  // SOIL TYPES (GLOBAL)
  // =====================================================

  /**
   * Get all soil types (global reference data)
   */
  async getSoilTypes(organizationId?: string, locale?: string): Promise<SoilType[]> {
    const url = buildUrl(`${BASE_URL}/soil-types`, { locale });
    return apiClient.get<SoilType[]>(url, {}, organizationId);
  },

  // =====================================================
  // IRRIGATION TYPES (GLOBAL)
  // =====================================================

  /**
   * Get all irrigation types (global reference data)
   */
  async getIrrigationTypes(organizationId?: string, locale?: string): Promise<IrrigationType[]> {
    const url = buildUrl(`${BASE_URL}/irrigation-types`, { locale });
    return apiClient.get<IrrigationType[]>(url, {}, organizationId);
  },

  // =====================================================
  // CROP CATEGORIES (GLOBAL)
  // =====================================================

  /**
   * Get all crop categories (global reference data)
   */
  async getCropCategories(organizationId?: string, locale?: string): Promise<CropCategory[]> {
    const url = buildUrl(`${BASE_URL}/crop-categories`, { locale });
    return apiClient.get<CropCategory[]>(url, {}, organizationId);
  },

  /**
   * Get a single crop category by ID
   */
  async getCropCategory(id: string, organizationId?: string, locale?: string): Promise<CropCategory> {
    const url = buildUrl(`${BASE_URL}/crop-categories/${id}`, { locale });
    return apiClient.get<CropCategory>(url, {}, organizationId);
  },

  // =====================================================
  // CROP TYPES
  // =====================================================

  /**
   * Get all crop types (optionally filtered by category)
   */
  async getCropTypes(categoryId?: string, organizationId?: string, locale?: string): Promise<CropType[]> {
    const url = buildUrl(`${BASE_URL}/crop-types`, { category_id: categoryId, locale });
    return apiClient.get<CropType[]>(url, {}, organizationId);
  },

  // =====================================================
  // VARIETIES
  // =====================================================

  async getVarieties(cropTypeId?: string, organizationId?: string, locale?: string): Promise<Variety[]> {
    const url = buildUrl(`${BASE_URL}/varieties`, { crop_type_id: cropTypeId, locale });
    return apiClient.get<Variety[]>(url, {}, organizationId);
  },

  async getUnitsOfMeasure(organizationId?: string, locale?: string): Promise<UnitOfMeasure[]> {
    const url = buildUrl(`${BASE_URL}/units-of-measure`, { locale });
    return apiClient.get<UnitOfMeasure[]>(url, {}, organizationId);
  },

  async getQualityGrades(organizationId?: string, locale?: string): Promise<QualityGrade[]> {
    const url = buildUrl(`${BASE_URL}/quality-grades`, { locale });
    return apiClient.get<QualityGrade[]>(url, {}, organizationId);
  },

  async getHarvestStatuses(organizationId?: string, locale?: string): Promise<HarvestStatus[]> {
    const url = buildUrl(`${BASE_URL}/harvest-statuses`, { locale });
    return apiClient.get<HarvestStatus[]>(url, {}, organizationId);
  },

  async getIntendedUses(organizationId?: string, locale?: string): Promise<IntendedUse[]> {
    const url = buildUrl(`${BASE_URL}/intended-uses`, { locale });
    return apiClient.get<IntendedUse[]>(url, {}, organizationId);
  },

  async getUtilityTypes(organizationId?: string, locale?: string): Promise<UtilityType[]> {
    const url = buildUrl(`${BASE_URL}/utility-types`, { locale });
    return apiClient.get<UtilityType[]>(url, {}, organizationId);
  },

  async getInfrastructureTypes(organizationId?: string, locale?: string): Promise<InfrastructureType[]> {
    const url = buildUrl(`${BASE_URL}/infrastructure-types`, { locale });
    return apiClient.get<InfrastructureType[]>(url, {}, organizationId);
  },

  async getBasinShapes(organizationId?: string, locale?: string): Promise<BasinShape[]> {
    const url = buildUrl(`${BASE_URL}/basin-shapes`, { locale });
    return apiClient.get<BasinShape[]>(url, {}, organizationId);
  },

  async getPaymentMethods(organizationId?: string, locale?: string): Promise<PaymentMethod[]> {
    const url = buildUrl(`${BASE_URL}/payment-methods`, { locale });
    return apiClient.get<PaymentMethod[]>(url, {}, organizationId);
  },

  async getPaymentStatuses(organizationId?: string, locale?: string): Promise<PaymentStatus[]> {
    const url = buildUrl(`${BASE_URL}/payment-statuses`, { locale });
    return apiClient.get<PaymentStatus[]>(url, {}, organizationId);
  },

  async getTaskPriorities(organizationId?: string, locale?: string): Promise<TaskPriority[]> {
    const url = buildUrl(`${BASE_URL}/task-priorities`, { locale });
    return apiClient.get<TaskPriority[]>(url, {}, organizationId);
  },

  async getWorkerTypes(organizationId?: string, locale?: string): Promise<WorkerType[]> {
    const url = buildUrl(`${BASE_URL}/worker-types`, { locale });
    return apiClient.get<WorkerType[]>(url, {}, organizationId);
  },

  async getMetayageTypes(organizationId?: string, locale?: string): Promise<MetayageType[]> {
    const url = buildUrl(`${BASE_URL}/metayage-types`, { locale });
    return apiClient.get<MetayageType[]>(url, {}, organizationId);
  },

  async getDocumentTypes(organizationId?: string, locale?: string): Promise<DocumentType[]> {
    const url = buildUrl(`${BASE_URL}/document-types`, { locale });
    return apiClient.get<DocumentType[]>(url, {}, organizationId);
  },

  async getCurrencies(organizationId?: string, locale?: string): Promise<Currency[]> {
    const url = buildUrl(`${BASE_URL}/currencies`, { locale });
    return apiClient.get<Currency[]>(url, {}, organizationId);
  },

  async getTimezones(organizationId?: string, locale?: string): Promise<Timezone[]> {
    const url = buildUrl(`${BASE_URL}/timezones`, { locale });
    return apiClient.get<Timezone[]>(url, {}, organizationId);
  },

  async getLanguages(organizationId?: string, locale?: string): Promise<Language[]> {
    const url = buildUrl(`${BASE_URL}/languages`, { locale });
    return apiClient.get<Language[]>(url, {}, organizationId);
  },

  async getLabServiceCategories(organizationId?: string, locale?: string): Promise<LabServiceCategory[]> {
    const url = buildUrl(`${BASE_URL}/lab-service-categories`, { locale });
    return apiClient.get<LabServiceCategory[]>(url, {}, organizationId);
  },

  async getSoilTextures(organizationId?: string, locale?: string): Promise<SoilTexture[]> {
    const url = buildUrl(`${BASE_URL}/soil-textures`, { locale });
    return apiClient.get<SoilTexture[]>(url, {}, organizationId);
  },

  async getCostCategories(organizationId?: string, locale?: string): Promise<CostCategory[]> {
    const url = buildUrl(`${BASE_URL}/cost-categories`, { locale });
    return apiClient.get<CostCategory[]>(url, {}, organizationId);
  },

  async getRevenueCategories(organizationId?: string, locale?: string): Promise<RevenueCategory[]> {
    const url = buildUrl(`${BASE_URL}/revenue-categories`, { locale });
    return apiClient.get<RevenueCategory[]>(url, {}, organizationId);
  },

  async getSaleTypes(organizationId?: string, locale?: string): Promise<SaleType[]> {
    const url = buildUrl(`${BASE_URL}/sale-types`, { locale });
    return apiClient.get<SaleType[]>(url, {}, organizationId);
  },

  async getExperienceLevels(organizationId?: string, locale?: string): Promise<ExperienceLevel[]> {
    const url = buildUrl(`${BASE_URL}/experience-levels`, { locale });
    return apiClient.get<ExperienceLevel[]>(url, {}, organizationId);
  },

  async getSeasonalities(organizationId?: string, locale?: string): Promise<Seasonality[]> {
    const url = buildUrl(`${BASE_URL}/seasonalities`, { locale });
    return apiClient.get<Seasonality[]>(url, {}, organizationId);
  },

  async getDeliveryTypes(organizationId?: string, locale?: string): Promise<DeliveryType[]> {
    const url = buildUrl(`${BASE_URL}/delivery-types`, { locale });
    return apiClient.get<DeliveryType[]>(url, {}, organizationId);
  },

  async getDeliveryStatuses(organizationId?: string, locale?: string): Promise<DeliveryStatus[]> {
    const url = buildUrl(`${BASE_URL}/delivery-statuses`, { locale });
    return apiClient.get<DeliveryStatus[]>(url, {}, organizationId);
  },
};
