import { Injectable, Logger } from '@nestjs/common';
import { StrapiService } from './strapi.service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable()
export class ReferenceDataService {
  private readonly logger = new Logger(ReferenceDataService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  constructor(private readonly strapiService: StrapiService) {}

  private getCacheKey(type: string, ...args: (string | undefined)[]): string {
    return `${type}:${args.filter(Boolean).join(':')}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchWithFallback<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    fallback: T,
  ): Promise<T> {
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    try {
      const data = await fetcher();
      // Use fallback if Strapi returns empty array but fallback has data
      if (
        Array.isArray(data) &&
        data.length === 0 &&
        Array.isArray(fallback) &&
        fallback.length > 0
      ) {
        this.logger.debug(
          `Empty response from Strapi for ${cacheKey}, using fallback data (${fallback.length} items)`,
        );
        this.setCache(cacheKey, fallback);
        return fallback;
      }
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      this.logger.warn(`Strapi unavailable for ${cacheKey}, using fallback: ${error.message}`);
      return fallback;
    }
  }

  async getTreeCategories(organizationId?: string) {
    const cacheKey = this.getCacheKey('tree-categories', organizationId);
    
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const params: any = { populate: 'trees', sort: 'sort_order:asc,name:asc' };
        if (organizationId) {
          params['filters[$or][0][organization_id][$eq]'] = organizationId;
          params['filters[$or][1][is_global][$eq]'] = true;
        }
        const response = await this.strapiService.get('/tree-categories', params);
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackTreeCategories(),
    );
  }

  async getTreeCategory(id: string, organizationId?: string) {
    const params: any = { populate: 'trees' };
    if (organizationId) params['filters[organization_id][$eq]'] = organizationId;
    const response = await this.strapiService.get(`/tree-categories/${id}`, params);
    return this.strapiService.transformSingleResponse(response);
  }

  async getTrees(categoryId?: string) {
    const cacheKey = this.getCacheKey('trees', categoryId);
    
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const params: any = { populate: 'tree_category', sort: 'sort_order:asc,name:asc' };
        if (categoryId) params['filters[tree_category][id][$eq]'] = categoryId;
        const response = await this.strapiService.get('/trees', params);
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackTrees(),
    );
  }

  async getPlantationTypes(organizationId?: string) {
    const cacheKey = this.getCacheKey('plantation-types', organizationId);
    
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const params: any = { sort: 'name:asc' };
        if (organizationId) params['filters[organization_id][$eq]'] = organizationId;
        const response = await this.strapiService.get('/plantation-types', params);
        return this.strapiService.transformResponse(response);
      },
      [],
    );
  }

  async getPlantationType(id: string, organizationId?: string) {
    const params: any = {};
    if (organizationId) params['filters[organization_id][$eq]'] = organizationId;
    const response = await this.strapiService.get(`/plantation-types/${id}`, params);
    return this.strapiService.transformSingleResponse(response);
  }

  async getTestTypes() {
    const cacheKey = this.getCacheKey('test-types');
    
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/test-types', { sort: 'name:asc' });
        return this.strapiService.transformResponse(response);
      },
      [],
    );
  }

  async getTestType(id: string) {
    const response = await this.strapiService.get(`/test-types/${id}`);
    return this.strapiService.transformSingleResponse(response);
  }

  async getProductCategories() {
    const cacheKey = this.getCacheKey('product-categories');
    
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/product-categories', {
          populate: 'product_subcategories',
          sort: 'name:asc',
        });
        return this.strapiService.transformResponse(response);
      },
      [],
    );
  }

  async getProductCategory(id: string) {
    const response = await this.strapiService.get(`/product-categories/${id}`, {
      populate: 'product_subcategories',
    });
    return this.strapiService.transformSingleResponse(response);
  }

  async getProductSubcategories(categoryId?: string) {
    const params: any = { populate: 'product_category', sort: 'name:asc' };
    if (categoryId) params['filters[product_category][id][$eq]'] = categoryId;
    const response = await this.strapiService.get('/product-subcategories', params);
    return this.strapiService.transformResponse(response);
  }

  async getSoilTypes() {
    const cacheKey = this.getCacheKey('soil-types');
    
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/soil-types', { sort: 'sort_order:asc,name:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackSoilTypes(),
    );
  }

  async getIrrigationTypes() {
    const cacheKey = this.getCacheKey('irrigation-types');
    
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/irrigation-types', { sort: 'sort_order:asc,name:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackIrrigationTypes(),
    );
  }

  async getCropCategories() {
    const cacheKey = this.getCacheKey('crop-categories');
    
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/crop-categories', {
          populate: 'crop_types',
          sort: 'sort_order:asc,name:asc',
        });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackCropCategories(),
    );
  }

  async getCropCategory(id: string) {
    const response = await this.strapiService.get(`/crop-categories/${id}`, {
      populate: 'crop_types',
    });
    return this.strapiService.transformSingleResponse(response);
  }

  async getCropTypes(categoryId?: string) {
    const cacheKey = this.getCacheKey('crop-types', categoryId);
    
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const params: any = { populate: 'crop_category,varieties', sort: 'sort_order:asc,name:asc' };
        if (categoryId) params['filters[crop_category][id][$eq]'] = categoryId;
        const response = await this.strapiService.get('/crop-types', params);
        return this.strapiService.transformResponse(response);
      },
      [],
    );
  }

  async getVarieties(cropTypeId?: string) {
    const cacheKey = this.getCacheKey('varieties', cropTypeId);
    
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const params: any = { populate: 'crop_type', sort: 'sort_order:asc,name:asc' };
        if (cropTypeId) params['filters[crop_type][id][$eq]'] = cropTypeId;
        const response = await this.strapiService.get('/varieties', params);
        return this.strapiService.transformResponse(response);
      },
      [],
    );
  }

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

  clearCache(): void {
    this.cache.clear();
    this.logger.log('Reference data cache cleared');
  }

  // =====================================================
  // NEW REFERENCE DATA TYPES
  // =====================================================

  async getUnitsOfMeasure() {
    const cacheKey = this.getCacheKey('units-of-measure');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/units-of-measure', { sort: 'sort_order:asc,name:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackUnitsOfMeasure(),
    );
  }

  async getQualityGrades() {
    const cacheKey = this.getCacheKey('quality-grades');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/quality-grades', { sort: 'rank:asc,sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackQualityGrades(),
    );
  }

  async getHarvestStatuses() {
    const cacheKey = this.getCacheKey('harvest-statuses');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/harvest-statuses', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackHarvestStatuses(),
    );
  }

  async getIntendedUses() {
    const cacheKey = this.getCacheKey('intended-uses');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/intended-uses', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackIntendedUses(),
    );
  }

  async getUtilityTypes() {
    const cacheKey = this.getCacheKey('utility-types');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/utility-types', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackUtilityTypes(),
    );
  }

  async getInfrastructureTypes() {
    const cacheKey = this.getCacheKey('infrastructure-types');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/infrastructure-types', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackInfrastructureTypes(),
    );
  }

  async getBasinShapes() {
    const cacheKey = this.getCacheKey('basin-shapes');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/basin-shapes', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackBasinShapes(),
    );
  }

  async getPaymentMethods() {
    const cacheKey = this.getCacheKey('payment-methods');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/payment-methods', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackPaymentMethods(),
    );
  }

  async getPaymentStatuses() {
    const cacheKey = this.getCacheKey('payment-statuses');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/payment-statuses', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackPaymentStatuses(),
    );
  }

  async getTaskPriorities() {
    const cacheKey = this.getCacheKey('task-priorities');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/task-priorities', { sort: 'level:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackTaskPriorities(),
    );
  }

  async getWorkerTypes() {
    const cacheKey = this.getCacheKey('worker-types');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/worker-types', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackWorkerTypes(),
    );
  }

  async getMetayageTypes() {
    const cacheKey = this.getCacheKey('metayage-types');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/metayage-types', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackMetayageTypes(),
    );
  }

  async getDocumentTypes() {
    const cacheKey = this.getCacheKey('document-types');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/document-types', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackDocumentTypes(),
    );
  }

  async getCurrencies() {
    const cacheKey = this.getCacheKey('currencies');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/currencies', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackCurrencies(),
    );
  }

  async getTimezones() {
    const cacheKey = this.getCacheKey('timezones');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/timezones', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackTimezones(),
    );
  }

  async getLanguages() {
    const cacheKey = this.getCacheKey('languages');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/languages', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackLanguages(),
    );
  }

  async getLabServiceCategories() {
    const cacheKey = this.getCacheKey('lab-service-categories');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/lab-service-categories', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackLabServiceCategories(),
    );
  }

  async getSoilTextures() {
    const cacheKey = this.getCacheKey('soil-textures');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/soil-textures', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackSoilTextures(),
    );
  }

  async getCostCategories() {
    const cacheKey = this.getCacheKey('cost-categories');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/cost-categories', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackCostCategories(),
    );
  }

  async getRevenueCategories() {
    const cacheKey = this.getCacheKey('revenue-categories');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/revenue-categories', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackRevenueCategories(),
    );
  }

  async getSaleTypes() {
    const cacheKey = this.getCacheKey('sale-types');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/sale-types', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackSaleTypes(),
    );
  }

  async getExperienceLevels() {
    const cacheKey = this.getCacheKey('experience-levels');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/experience-levels', { sort: 'level:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackExperienceLevels(),
    );
  }

  async getSeasonalities() {
    const cacheKey = this.getCacheKey('seasonalities');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/seasonalities', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackSeasonalities(),
    );
  }

  async getDeliveryTypes() {
    const cacheKey = this.getCacheKey('delivery-types');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/delivery-types', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackDeliveryTypes(),
    );
  }

  async getDeliveryStatuses() {
    const cacheKey = this.getCacheKey('delivery-statuses');
    return this.fetchWithFallback(
      cacheKey,
      async () => {
        const response = await this.strapiService.get('/delivery-statuses', { sort: 'sort_order:asc' });
        return this.strapiService.transformResponse(response);
      },
      this.getFallbackDeliveryStatuses(),
    );
  }

  // =====================================================
  // FALLBACK DATA - EXISTING
  // =====================================================

  private getFallbackSoilTypes() {
    return [
      { id: 'f-sandy', name: 'Sandy Soil', name_fr: 'Sol sableux', name_ar: 'تربة رملية', value: 'sandy', icon: '🏜️' },
      { id: 'f-clay', name: 'Clay Soil', name_fr: 'Sol argileux', name_ar: 'تربة طينية', value: 'clay', icon: '🧱' },
      { id: 'f-loam', name: 'Loam Soil', name_fr: 'Sol limoneux', name_ar: 'تربة طفالية', value: 'loam', icon: '🌱' },
      { id: 'f-silt', name: 'Silt Soil', name_fr: 'Sol limoneux fin', name_ar: 'تربة غرينية', value: 'silt', icon: '💧' },
      { id: 'f-chalky', name: 'Chalky Soil', name_fr: 'Sol calcaire', name_ar: 'تربة كلسية', value: 'chalky', icon: '⚪' },
      { id: 'f-peat', name: 'Peat Soil', name_fr: 'Sol tourbeux', name_ar: 'تربة خثية', value: 'peat', icon: '🟤' },
    ];
  }

  private getFallbackIrrigationTypes() {
    return [
      { id: 'f-drip', name: 'Drip Irrigation', name_fr: 'Irrigation goutte à goutte', name_ar: 'الري بالتنقيط', value: 'drip', icon: '💧' },
      { id: 'f-sprinkler', name: 'Sprinkler', name_fr: 'Aspersion', name_ar: 'الري بالرش', value: 'sprinkler', icon: '🌧️' },
      { id: 'f-flood', name: 'Flood Irrigation', name_fr: 'Submersion', name_ar: 'الري بالغمر', value: 'flood', icon: '🌊' },
      { id: 'f-furrow', name: 'Furrow', name_fr: 'Sillons', name_ar: 'الري بالأخاديد', value: 'furrow', icon: '〰️' },
      { id: 'f-manual', name: 'Manual', name_fr: 'Manuel', name_ar: 'يدوي', value: 'manual', icon: '🪣' },
    ];
  }

  private getFallbackTreeCategories() {
    return [
      { id: 'f-citrus', name: 'Citrus', name_fr: 'Agrumes', name_ar: 'الحمضيات', value: 'citrus', icon: '🍊' },
      { id: 'f-olives', name: 'Olives', name_fr: 'Oliviers', name_ar: 'الزيتون', value: 'olives', icon: '🫒' },
      { id: 'f-nuts', name: 'Nuts', name_fr: 'Fruits à coque', name_ar: 'المكسرات', value: 'nuts', icon: '🥜' },
      { id: 'f-stone', name: 'Stone Fruits', name_fr: 'Fruits à noyau', name_ar: 'الفواكه ذات النواة', value: 'stone_fruits', icon: '🍑' },
      { id: 'f-dates', name: 'Dates', name_fr: 'Palmiers dattiers', name_ar: 'النخيل', value: 'dates', icon: '🌴' },
    ];
  }

  private getFallbackTrees() {
    return [
      { id: 'f-orange', name: 'Orange', name_fr: 'Oranger', name_ar: 'برتقال', value: 'orange', icon: '🍊' },
      { id: 'f-olive', name: 'Olive', name_fr: 'Olivier', name_ar: 'زيتون', value: 'olive', icon: '🫒' },
      { id: 'f-almond', name: 'Almond', name_fr: 'Amandier', name_ar: 'لوز', value: 'almond', icon: '🥜' },
      { id: 'f-date', name: 'Date Palm', name_fr: 'Palmier dattier', name_ar: 'نخيل التمر', value: 'date_palm', icon: '🌴' },
      { id: 'f-argan', name: 'Argan', name_fr: 'Arganier', name_ar: 'أركان', value: 'argan', icon: '🌳' },
    ];
  }

  private getFallbackCropCategories() {
    return [
      { id: 'f-cereals', name: 'Cereals', name_fr: 'Céréales', name_ar: 'الحبوب', value: 'cereals', icon: '🌾' },
      { id: 'f-vegetables', name: 'Vegetables', name_fr: 'Légumes', name_ar: 'الخضروات', value: 'vegetables', icon: '🥬' },
      { id: 'f-legumes', name: 'Legumes', name_fr: 'Légumineuses', name_ar: 'البقوليات', value: 'legumes', icon: '🫘' },
      { id: 'f-oilseeds', name: 'Oilseeds', name_fr: 'Oléagineux', name_ar: 'البذور الزيتية', value: 'oilseeds', icon: '🌻' },
    ];
  }

  private getFallbackUnitsOfMeasure() {
    return [
      { id: 'f-kg', name: 'Kilograms', name_fr: 'Kilogrammes', value: 'kg', symbol: 'kg', category: 'weight' },
      { id: 'f-tons', name: 'Tons', name_fr: 'Tonnes', value: 'tons', symbol: 't', category: 'weight' },
      { id: 'f-units', name: 'Units', name_fr: 'Unités', value: 'units', symbol: 'u', category: 'count' },
      { id: 'f-boxes', name: 'Boxes', name_fr: 'Caisses', value: 'boxes', symbol: 'box', category: 'count' },
      { id: 'f-crates', name: 'Crates', name_fr: 'Cageots', value: 'crates', symbol: 'crt', category: 'count' },
      { id: 'f-liters', name: 'Liters', name_fr: 'Litres', value: 'liters', symbol: 'L', category: 'volume' },
    ];
  }

  private getFallbackQualityGrades() {
    return [
      { id: 'f-extra', name: 'Extra (Premium)', name_fr: 'Extra (Premium)', value: 'Extra', rank: 1, color: '#22c55e' },
      { id: 'f-a', name: 'Category A', name_fr: 'Catégorie A', value: 'A', rank: 2, color: '#3b82f6' },
      { id: 'f-first', name: 'First Choice', name_fr: 'Premier choix', value: 'First', rank: 3, color: '#3b82f6' },
      { id: 'f-b', name: 'Category B', name_fr: 'Catégorie B', value: 'B', rank: 4, color: '#f59e0b' },
      { id: 'f-second', name: 'Second Choice', name_fr: 'Deuxième choix', value: 'Second', rank: 5, color: '#f59e0b' },
      { id: 'f-c', name: 'Category C', name_fr: 'Catégorie C', value: 'C', rank: 6, color: '#ef4444' },
      { id: 'f-third', name: 'Third Choice', name_fr: 'Troisième choix', value: 'Third', rank: 7, color: '#ef4444' },
    ];
  }

  private getFallbackHarvestStatuses() {
    return [
      { id: 'f-stored', name: 'Stored', name_fr: 'Stockée', value: 'stored', color: '#3b82f6', is_final: false },
      { id: 'f-in_delivery', name: 'In Delivery', name_fr: 'En livraison', value: 'in_delivery', color: '#f59e0b', is_final: false },
      { id: 'f-delivered', name: 'Delivered', name_fr: 'Livrée', value: 'delivered', color: '#22c55e', is_final: false },
      { id: 'f-sold', name: 'Sold', name_fr: 'Vendue', value: 'sold', color: '#22c55e', is_final: true },
      { id: 'f-spoiled', name: 'Spoiled', name_fr: 'Avariée', value: 'spoiled', color: '#ef4444', is_final: true },
    ];
  }

  private getFallbackIntendedUses() {
    return [
      { id: 'f-market', name: 'Local Market', name_fr: 'Marché local', value: 'market', icon: '🏪' },
      { id: 'f-storage', name: 'Storage', name_fr: 'Stockage', value: 'storage', icon: '📦' },
      { id: 'f-processing', name: 'Processing', name_fr: 'Transformation', value: 'processing', icon: '🏭' },
      { id: 'f-export', name: 'Export', name_fr: 'Export', value: 'export', icon: '🚢' },
      { id: 'f-direct_client', name: 'Direct Client', name_fr: 'Client direct', value: 'direct_client', icon: '🤝' },
    ];
  }

  private getFallbackUtilityTypes() {
    return [
      { id: 'f-electricity', name: 'Electricity', name_fr: 'Électricité', value: 'electricity', icon: 'Zap', color: '#f59e0b' },
      { id: 'f-water', name: 'Water', name_fr: 'Eau', value: 'water', icon: 'Droplets', color: '#3b82f6' },
      { id: 'f-diesel', name: 'Diesel', name_fr: 'Diesel', value: 'diesel', icon: 'Fuel', color: '#6b7280' },
      { id: 'f-gas', name: 'Gas', name_fr: 'Gaz', value: 'gas', icon: 'Fuel', color: '#ef4444' },
      { id: 'f-internet', name: 'Internet', name_fr: 'Internet', value: 'internet', icon: 'Wifi', color: '#8b5cf6' },
      { id: 'f-phone', name: 'Phone', name_fr: 'Téléphone', value: 'phone', icon: 'Phone', color: '#22c55e' },
      { id: 'f-other', name: 'Other', name_fr: 'Autre', value: 'other', icon: 'Plus', color: '#6b7280' },
    ];
  }

  private getFallbackInfrastructureTypes() {
    return [
      { id: 'f-stable', name: 'Stable', name_fr: 'Écurie', value: 'stable', category: 'building' },
      { id: 'f-technical_room', name: 'Technical Room', name_fr: 'Local technique', value: 'technical_room', category: 'building' },
      { id: 'f-basin', name: 'Basin', name_fr: 'Bassin', value: 'basin', category: 'water' },
      { id: 'f-well', name: 'Well', name_fr: 'Puits', value: 'well', category: 'water' },
    ];
  }

  private getFallbackBasinShapes() {
    return [
      { id: 'f-trapezoidal', name: 'Trapezoidal', name_fr: 'Trapézoïdal', value: 'trapezoidal' },
      { id: 'f-rectangular', name: 'Rectangular', name_fr: 'Rectangulaire', value: 'rectangular' },
      { id: 'f-cubic', name: 'Cubic', name_fr: 'Cubique', value: 'cubic' },
      { id: 'f-circular', name: 'Circular', name_fr: 'Circulaire', value: 'circular' },
    ];
  }

  private getFallbackPaymentMethods() {
    return [
      { id: 'f-cash', name: 'Cash', name_fr: 'Espèces', value: 'cash', icon: '💵', requires_reference: false },
      { id: 'f-bank_transfer', name: 'Bank Transfer', name_fr: 'Virement bancaire', value: 'bank_transfer', icon: '🏦', requires_reference: true },
      { id: 'f-check', name: 'Check', name_fr: 'Chèque', value: 'check', icon: '📝', requires_reference: true },
      { id: 'f-mobile_money', name: 'Mobile Money', name_fr: 'Mobile Money', value: 'mobile_money', icon: '📱', requires_reference: true },
    ];
  }

  private getFallbackPaymentStatuses() {
    return [
      { id: 'f-pending', name: 'Pending', name_fr: 'En attente', value: 'pending', color: '#f59e0b', is_final: false },
      { id: 'f-approved', name: 'Approved', name_fr: 'Approuvé', value: 'approved', color: '#3b82f6', is_final: false },
      { id: 'f-paid', name: 'Paid', name_fr: 'Payé', value: 'paid', color: '#22c55e', is_final: true },
      { id: 'f-disputed', name: 'Disputed', name_fr: 'Contesté', value: 'disputed', color: '#ef4444', is_final: false },
      { id: 'f-cancelled', name: 'Cancelled', name_fr: 'Annulé', value: 'cancelled', color: '#6b7280', is_final: true },
    ];
  }

  private getFallbackTaskPriorities() {
    return [
      { id: 'f-low', name: 'Low', name_fr: 'Basse', value: 'low', level: 1, color: '#22c55e' },
      { id: 'f-medium', name: 'Medium', name_fr: 'Moyenne', value: 'medium', level: 2, color: '#3b82f6' },
      { id: 'f-high', name: 'High', name_fr: 'Haute', value: 'high', level: 3, color: '#f59e0b' },
      { id: 'f-urgent', name: 'Urgent', name_fr: 'Urgente', value: 'urgent', level: 4, color: '#ef4444' },
    ];
  }

  private getFallbackWorkerTypes() {
    return [
      { id: 'f-fixed_salary', name: 'Fixed Salary', name_fr: 'Salaire fixe', value: 'fixed_salary', payment_frequency: 'monthly' },
      { id: 'f-daily_worker', name: 'Daily Worker', name_fr: 'Journalier', value: 'daily_worker', payment_frequency: 'daily' },
      { id: 'f-metayage', name: 'Sharecropper', name_fr: 'Métayer', value: 'metayage', payment_frequency: 'harvest_share' },
    ];
  }

  private getFallbackMetayageTypes() {
    return [
      { id: 'f-khammass', name: 'Khammass (1/5)', name_fr: 'Khammass (1/5)', name_ar: 'خماس', value: 'khammass', worker_share_percentage: 20, owner_share_percentage: 80 },
      { id: 'f-rebaa', name: 'Rebaa (1/4)', name_fr: 'Rebaa (1/4)', name_ar: 'ربع', value: 'rebaa', worker_share_percentage: 25, owner_share_percentage: 75 },
      { id: 'f-tholth', name: 'Tholth (1/3)', name_fr: 'Tholth (1/3)', name_ar: 'ثلث', value: 'tholth', worker_share_percentage: 33.33, owner_share_percentage: 66.67 },
      { id: 'f-custom', name: 'Custom', name_fr: 'Personnalisé', name_ar: 'مخصص', value: 'custom', worker_share_percentage: null, owner_share_percentage: null },
    ];
  }

  private getFallbackDocumentTypes() {
    return [
      { id: 'f-invoice', name: 'Invoice', name_fr: 'Facture', value: 'invoice', prefix: 'INV', requires_numbering: true },
      { id: 'f-quote', name: 'Quote', name_fr: 'Devis', value: 'quote', prefix: 'QUO', requires_numbering: true },
      { id: 'f-sales_order', name: 'Sales Order', name_fr: 'Bon de commande', value: 'sales_order', prefix: 'SO', requires_numbering: true },
      { id: 'f-purchase_order', name: 'Purchase Order', name_fr: 'Bon de commande achat', value: 'purchase_order', prefix: 'PO', requires_numbering: true },
      { id: 'f-report', name: 'Report', name_fr: 'Rapport', value: 'report', prefix: 'RPT', requires_numbering: false },
      { id: 'f-general', name: 'General', name_fr: 'Général', value: 'general', prefix: 'DOC', requires_numbering: false },
    ];
  }

  private getFallbackCurrencies() {
    return [
      { id: 'f-mad', name: 'Moroccan Dirham', name_fr: 'Dirham Marocain', code: 'MAD', symbol: 'DH', symbol_position: 'after', decimal_places: 2, country_code: 'MA' },
      { id: 'f-eur', name: 'Euro', name_fr: 'Euro', code: 'EUR', symbol: '€', symbol_position: 'before', decimal_places: 2, country_code: 'EU' },
      { id: 'f-usd', name: 'US Dollar', name_fr: 'Dollar US', code: 'USD', symbol: '$', symbol_position: 'before', decimal_places: 2, country_code: 'US' },
      { id: 'f-gbp', name: 'British Pound', name_fr: 'Livre Sterling', code: 'GBP', symbol: '£', symbol_position: 'before', decimal_places: 2, country_code: 'GB' },
    ];
  }

  private getFallbackTimezones() {
    return [
      { id: 'f-casablanca', name: 'Morocco (Africa/Casablanca)', value: 'Africa/Casablanca', offset: '+01:00', region: 'Africa', country_code: 'MA' },
      { id: 'f-paris', name: 'Paris (Europe/Paris)', value: 'Europe/Paris', offset: '+01:00', region: 'Europe', country_code: 'FR' },
      { id: 'f-london', name: 'London (Europe/London)', value: 'Europe/London', offset: '+00:00', region: 'Europe', country_code: 'GB' },
      { id: 'f-new_york', name: 'New York (America/New_York)', value: 'America/New_York', offset: '-05:00', region: 'America', country_code: 'US' },
      { id: 'f-utc', name: 'UTC', value: 'UTC', offset: '+00:00', region: 'Global', country_code: null },
    ];
  }

  private getFallbackLanguages() {
    return [
      { id: 'f-fr', name: 'French', native_name: 'Français', code: 'fr', direction: 'ltr', is_default: true },
      { id: 'f-en', name: 'English', native_name: 'English', code: 'en', direction: 'ltr', is_default: false },
      { id: 'f-ar', name: 'Arabic', native_name: 'العربية', code: 'ar', direction: 'rtl', is_default: false },
      { id: 'f-es', name: 'Spanish', native_name: 'Español', code: 'es', direction: 'ltr', is_default: false },
    ];
  }

  private getFallbackLabServiceCategories() {
    return [
      { id: 'f-soil', name: 'Soil Analysis', name_fr: 'Analyses de Sol', value: 'soil', icon: '🌍' },
      { id: 'f-leaf', name: 'Foliar Analysis', name_fr: 'Analyses Foliaires', value: 'leaf', icon: '🍃' },
      { id: 'f-water', name: 'Water Analysis', name_fr: "Analyses d'Eau", value: 'water', icon: '💧' },
      { id: 'f-tissue', name: 'Tissue Analysis', name_fr: 'Analyses Tissulaires', value: 'tissue', icon: '🔬' },
      { id: 'f-other', name: 'Other', name_fr: 'Autres', value: 'other', icon: '📋' },
    ];
  }

  private getFallbackSoilTextures() {
    return [
      { id: 'f-sand', name: 'Sand', name_fr: 'Sable', value: 'sand' },
      { id: 'f-loamy_sand', name: 'Loamy Sand', name_fr: 'Sable limoneux', value: 'loamy_sand' },
      { id: 'f-sandy_loam', name: 'Sandy Loam', name_fr: 'Limon sableux', value: 'sandy_loam' },
      { id: 'f-loam', name: 'Loam', name_fr: 'Limon', value: 'loam' },
      { id: 'f-silt_loam', name: 'Silt Loam', name_fr: 'Limon argileux', value: 'silt_loam' },
      { id: 'f-silt', name: 'Silt', name_fr: 'Silt', value: 'silt' },
      { id: 'f-clay_loam', name: 'Clay Loam', name_fr: 'Argile limoneuse', value: 'clay_loam' },
      { id: 'f-silty_clay_loam', name: 'Silty Clay Loam', name_fr: 'Argile silteuse limoneuse', value: 'silty_clay_loam' },
      { id: 'f-sandy_clay', name: 'Sandy Clay', name_fr: 'Argile sableuse', value: 'sandy_clay' },
      { id: 'f-silty_clay', name: 'Silty Clay', name_fr: 'Argile silteuse', value: 'silty_clay' },
      { id: 'f-clay', name: 'Clay', name_fr: 'Argile', value: 'clay' },
    ];
  }

  private getFallbackCostCategories() {
    return [
      { id: 'f-planting', name: 'Planting', name_fr: 'Plantation', value: 'planting', icon: '🌱' },
      { id: 'f-harvesting', name: 'Harvesting', name_fr: 'Récolte', value: 'harvesting', icon: '🌾' },
      { id: 'f-irrigation', name: 'Irrigation', name_fr: 'Irrigation', value: 'irrigation', icon: '💧' },
      { id: 'f-fertilization', name: 'Fertilization', name_fr: 'Fertilisation', value: 'fertilization', icon: '🧪' },
      { id: 'f-pesticide', name: 'Pesticide Application', name_fr: 'Application pesticide', value: 'pesticide', icon: '🔫' },
      { id: 'f-pruning', name: 'Pruning', name_fr: 'Taille', value: 'pruning', icon: '✂️' },
      { id: 'f-maintenance', name: 'Maintenance', name_fr: 'Entretien', value: 'maintenance', icon: '🔧' },
      { id: 'f-transport', name: 'Transport', name_fr: 'Transport', value: 'transport', icon: '🚛' },
      { id: 'f-labor', name: 'Labor', name_fr: 'Main d\'oeuvre', value: 'labor', icon: '👷' },
      { id: 'f-materials', name: 'Materials', name_fr: 'Matériaux', value: 'materials', icon: '📦' },
      { id: 'f-utilities', name: 'Utilities', name_fr: 'Services publics', value: 'utilities', icon: '⚡' },
      { id: 'f-other', name: 'Other', name_fr: 'Autre', value: 'other', icon: '📋' },
    ];
  }

  private getFallbackRevenueCategories() {
    return [
      { id: 'f-product_sales', name: 'Product Sales', name_fr: 'Ventes de produits', value: 'product_sales', icon: '💰' },
      { id: 'f-service_income', name: 'Service Income', name_fr: 'Revenus de services', value: 'service_income', icon: '🛠️' },
      { id: 'f-other_income', name: 'Other Income', name_fr: 'Autres revenus', value: 'other_income', icon: '📊' },
    ];
  }

  private getFallbackSaleTypes() {
    return [
      { id: 'f-market', name: 'Market Sale', name_fr: 'Vente au marché', value: 'market', requires_client: false },
      { id: 'f-export', name: 'Export Sale', name_fr: 'Vente export', value: 'export', requires_client: true },
      { id: 'f-wholesale', name: 'Wholesale', name_fr: 'Vente en gros', value: 'wholesale', requires_client: true },
      { id: 'f-direct', name: 'Direct Sale', name_fr: 'Vente directe', value: 'direct', requires_client: true },
      { id: 'f-processing', name: 'Processing', name_fr: 'Transformation', value: 'processing', requires_client: false },
    ];
  }

  private getFallbackExperienceLevels() {
    return [
      { id: 'f-basic', name: 'Basic', name_fr: 'Débutant', value: 'basic', level: 1, wage_multiplier: 1.0 },
      { id: 'f-medium', name: 'Medium', name_fr: 'Intermédiaire', value: 'medium', level: 2, wage_multiplier: 1.15 },
      { id: 'f-expert', name: 'Expert', name_fr: 'Expert', value: 'expert', level: 3, wage_multiplier: 1.3 },
    ];
  }

  private getFallbackSeasonalities() {
    return [
      { id: 'f-spring', name: 'Spring', name_fr: 'Printemps', value: 'spring', start_month: 3, end_month: 5, color: '#22c55e' },
      { id: 'f-summer', name: 'Summer', name_fr: 'Été', value: 'summer', start_month: 6, end_month: 8, color: '#f59e0b' },
      { id: 'f-autumn', name: 'Autumn', name_fr: 'Automne', value: 'autumn', start_month: 9, end_month: 11, color: '#ef4444' },
      { id: 'f-winter', name: 'Winter', name_fr: 'Hiver', value: 'winter', start_month: 12, end_month: 2, color: '#3b82f6' },
      { id: 'f-year_round', name: 'Year Round', name_fr: 'Toute l\'année', value: 'year-round', start_month: null, end_month: null, color: '#6b7280' },
    ];
  }

  private getFallbackDeliveryTypes() {
    return [
      { id: 'f-market_sale', name: 'Market Sale', name_fr: 'Vente au marché', value: 'market_sale', requires_destination: true },
      { id: 'f-export', name: 'Export', name_fr: 'Export', value: 'export', requires_destination: true },
      { id: 'f-processor', name: 'Processor', name_fr: 'Transformateur', value: 'processor', requires_destination: true },
      { id: 'f-direct_client', name: 'Direct Client', name_fr: 'Client direct', value: 'direct_client', requires_destination: true },
      { id: 'f-wholesale', name: 'Wholesale', name_fr: 'Grossiste', value: 'wholesale', requires_destination: true },
    ];
  }

  private getFallbackDeliveryStatuses() {
    return [
      { id: 'f-pending', name: 'Pending', name_fr: 'En attente', value: 'pending', color: '#f59e0b', is_final: false },
      { id: 'f-prepared', name: 'Prepared', name_fr: 'Préparée', value: 'prepared', color: '#3b82f6', is_final: false },
      { id: 'f-in_transit', name: 'In Transit', name_fr: 'En transit', value: 'in_transit', color: '#8b5cf6', is_final: false },
      { id: 'f-delivered', name: 'Delivered', name_fr: 'Livrée', value: 'delivered', color: '#22c55e', is_final: true },
      { id: 'f-cancelled', name: 'Cancelled', name_fr: 'Annulée', value: 'cancelled', color: '#6b7280', is_final: true },
      { id: 'f-returned', name: 'Returned', name_fr: 'Retournée', value: 'returned', color: '#ef4444', is_final: true },
    ];
  }
}
