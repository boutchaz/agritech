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
}
