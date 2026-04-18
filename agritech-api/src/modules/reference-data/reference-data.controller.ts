import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { ReferenceDataService } from './reference-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('reference-data')
@Controller('reference-data')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  // =====================================================
  // COMBINED ENDPOINTS
  // =====================================================

  @Get('all')
  @ApiOperation({ summary: 'Get all reference data for an organization' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'All reference data retrieved successfully' })
  async getAllReferenceData(@Req() req: any, @Query('locale') locale?: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.referenceDataService.getAllReferenceData(organizationId, locale);
  }

  // =====================================================
  // TREE CATEGORIES & TREES
  // =====================================================

  @Get('tree-categories')
  @ApiOperation({ summary: 'Get all tree categories for an organization' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Tree categories retrieved successfully' })
  async getTreeCategories(@Req() req: any, @Query('locale') locale?: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.referenceDataService.getTreeCategories(organizationId, locale);
  }

  @Get('tree-categories/:id')
  @ApiOperation({ summary: 'Get a single tree category' })
  @ApiParam({ name: 'id', description: 'Tree category ID' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Tree category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tree category not found' })
  async getTreeCategory(@Param('id') id: string, @Req() req: any, @Query('locale') locale?: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.referenceDataService.getTreeCategory(id, organizationId, locale);
  }

  @Get('trees')
  @ApiOperation({ summary: 'Get all trees' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category ID' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Trees retrieved successfully' })
  async getTrees(@Query('category_id') categoryId?: string, @Query('locale') locale?: string) {
    return this.referenceDataService.getTrees(categoryId, locale);
  }

  // =====================================================
  // PLANTATION TYPES
  // =====================================================

  @Get('plantation-types')
  @ApiOperation({ summary: 'Get all plantation types for an organization' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Plantation types retrieved successfully' })
  async getPlantationTypes(@Req() req: any, @Query('locale') locale?: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.referenceDataService.getPlantationTypes(organizationId, locale);
  }

  @Get('plantation-types/:id')
  @ApiOperation({ summary: 'Get a single plantation type' })
  @ApiParam({ name: 'id', description: 'Plantation type ID' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Plantation type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Plantation type not found' })
  async getPlantationType(@Param('id') id: string, @Req() req: any, @Query('locale') locale?: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.referenceDataService.getPlantationType(id, organizationId, locale);
  }

  // =====================================================
  // TEST TYPES (GLOBAL)
  // =====================================================

  @Get('test-types')
  @ApiOperation({ summary: 'Get all test types (global)' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Test types retrieved successfully' })
  async getTestTypes(@Query('locale') locale?: string) {
    return this.referenceDataService.getTestTypes(locale);
  }

  @Get('test-types/:id')
  @ApiOperation({ summary: 'Get a single test type' })
  @ApiParam({ name: 'id', description: 'Test type ID' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Test type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Test type not found' })
  async getTestType(@Param('id') id: string, @Query('locale') locale?: string) {
    return this.referenceDataService.getTestType(id, locale);
  }

  // =====================================================
  // PRODUCT CATEGORIES (GLOBAL)
  // =====================================================

  @Get('product-categories')
  @ApiOperation({ summary: 'Get all product categories (global)' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Product categories retrieved successfully' })
  async getProductCategories(@Query('locale') locale?: string) {
    return this.referenceDataService.getProductCategories(locale);
  }

  @Get('product-categories/:id')
  @ApiOperation({ summary: 'Get a single product category' })
  @ApiParam({ name: 'id', description: 'Product category ID' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Product category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product category not found' })
  async getProductCategory(@Param('id') id: string, @Query('locale') locale?: string) {
    return this.referenceDataService.getProductCategory(id, locale);
  }

  @Get('product-subcategories')
  @ApiOperation({ summary: 'Get all product subcategories' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category ID' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Product subcategories retrieved successfully' })
  async getProductSubcategories(@Query('category_id') categoryId?: string, @Query('locale') locale?: string) {
    return this.referenceDataService.getProductSubcategories(categoryId, locale);
  }

  // =====================================================
  // SOIL TYPES (GLOBAL)
  // =====================================================

  @Get('soil-types')
  @ApiOperation({ summary: 'Get all soil types (global)' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Soil types retrieved successfully' })
  async getSoilTypes(@Query('locale') locale?: string) {
    return this.referenceDataService.getSoilTypes(locale);
  }

  // =====================================================
  // IRRIGATION TYPES (GLOBAL)
  // =====================================================

  @Get('irrigation-types')
  @ApiOperation({ summary: 'Get all irrigation types (global)' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Irrigation types retrieved successfully' })
  async getIrrigationTypes(@Query('locale') locale?: string) {
    return this.referenceDataService.getIrrigationTypes(locale);
  }

  // =====================================================
  // CROP CATEGORIES (GLOBAL)
  // =====================================================

  @Get('crop-categories')
  @ApiOperation({ summary: 'Get all crop categories (global)' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Crop categories retrieved successfully' })
  async getCropCategories(@Query('locale') locale?: string) {
    return this.referenceDataService.getCropCategories(locale);
  }

  @Get('crop-categories/:id')
  @ApiOperation({ summary: 'Get a single crop category' })
  @ApiParam({ name: 'id', description: 'Crop category ID' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Crop category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Crop category not found' })
  async getCropCategory(@Param('id') id: string, @Query('locale') locale?: string) {
    return this.referenceDataService.getCropCategory(id, locale);
  }

  // =====================================================
  // CROP TYPES
  // =====================================================

  @Get('crop-types')
  @ApiOperation({ summary: 'Get all crop types' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category ID' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Crop types retrieved successfully' })
  async getCropTypes(@Query('category_id') categoryId?: string, @Query('locale') locale?: string) {
    return this.referenceDataService.getCropTypes(categoryId, locale);
  }

  // =====================================================
  // VARIETIES
  // =====================================================

  @Get('varieties')
  @ApiOperation({ summary: 'Get all varieties' })
  @ApiQuery({ name: 'crop_type_id', required: false, description: 'Filter by crop type ID' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Varieties retrieved successfully' })
  async getVarieties(@Query('crop_type_id') cropTypeId?: string, @Query('locale') locale?: string) {
    return this.referenceDataService.getVarieties(cropTypeId, locale);
  }

  @Get('units-of-measure')
  @ApiOperation({ summary: 'Get all units of measure' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Units of measure retrieved successfully' })
  async getUnitsOfMeasure(@Query('locale') locale?: string) {
    return this.referenceDataService.getUnitsOfMeasure(locale);
  }

  @Get('quality-grades')
  @ApiOperation({ summary: 'Get all quality grades' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Quality grades retrieved successfully' })
  async getQualityGrades(@Query('locale') locale?: string) {
    return this.referenceDataService.getQualityGrades(locale);
  }

  @Get('harvest-statuses')
  @ApiOperation({ summary: 'Get all harvest statuses' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Harvest statuses retrieved successfully' })
  async getHarvestStatuses(@Query('locale') locale?: string) {
    return this.referenceDataService.getHarvestStatuses(locale);
  }

  @Get('intended-uses')
  @ApiOperation({ summary: 'Get all intended uses for harvests' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Intended uses retrieved successfully' })
  async getIntendedUses(@Query('locale') locale?: string) {
    return this.referenceDataService.getIntendedUses(locale);
  }

  @Get('utility-types')
  @ApiOperation({ summary: 'Get all utility types' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Utility types retrieved successfully' })
  async getUtilityTypes(@Query('locale') locale?: string) {
    return this.referenceDataService.getUtilityTypes(locale);
  }

  @Get('infrastructure-types')
  @ApiOperation({ summary: 'Get all infrastructure types' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Infrastructure types retrieved successfully' })
  async getInfrastructureTypes(@Query('locale') locale?: string) {
    return this.referenceDataService.getInfrastructureTypes(locale);
  }

  @Get('basin-shapes')
  @ApiOperation({ summary: 'Get all basin shapes' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Basin shapes retrieved successfully' })
  async getBasinShapes(@Query('locale') locale?: string) {
    return this.referenceDataService.getBasinShapes(locale);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get all payment methods' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  async getPaymentMethods(@Query('locale') locale?: string) {
    return this.referenceDataService.getPaymentMethods(locale);
  }

  @Get('payment-statuses')
  @ApiOperation({ summary: 'Get all payment statuses' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Payment statuses retrieved successfully' })
  async getPaymentStatuses(@Query('locale') locale?: string) {
    return this.referenceDataService.getPaymentStatuses(locale);
  }

  @Get('task-priorities')
  @ApiOperation({ summary: 'Get all task priorities' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Task priorities retrieved successfully' })
  async getTaskPriorities(@Query('locale') locale?: string) {
    return this.referenceDataService.getTaskPriorities(locale);
  }

  @Get('worker-types')
  @ApiOperation({ summary: 'Get all worker types' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Worker types retrieved successfully' })
  async getWorkerTypes(@Query('locale') locale?: string) {
    return this.referenceDataService.getWorkerTypes(locale);
  }

  @Get('metayage-types')
  @ApiOperation({ summary: 'Get all metayage (sharecropping) types' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Metayage types retrieved successfully' })
  async getMetayageTypes(@Query('locale') locale?: string) {
    return this.referenceDataService.getMetayageTypes(locale);
  }

  @Get('document-types')
  @ApiOperation({ summary: 'Get all document types' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Document types retrieved successfully' })
  async getDocumentTypes(@Query('locale') locale?: string) {
    return this.referenceDataService.getDocumentTypes(locale);
  }

  @Get('currencies')
  @ApiOperation({ summary: 'Get all currencies' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Currencies retrieved successfully' })
  async getCurrencies(@Query('locale') locale?: string) {
    return this.referenceDataService.getCurrencies(locale);
  }

  @Get('timezones')
  @ApiOperation({ summary: 'Get all timezones' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Timezones retrieved successfully' })
  async getTimezones(@Query('locale') locale?: string) {
    return this.referenceDataService.getTimezones(locale);
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get all languages' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Languages retrieved successfully' })
  async getLanguages(@Query('locale') locale?: string) {
    return this.referenceDataService.getLanguages(locale);
  }

  @Get('lab-service-categories')
  @ApiOperation({ summary: 'Get all lab service categories' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Lab service categories retrieved successfully' })
  async getLabServiceCategories(@Query('locale') locale?: string) {
    return this.referenceDataService.getLabServiceCategories(locale);
  }

  @Get('soil-textures')
  @ApiOperation({ summary: 'Get all soil textures' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Soil textures retrieved successfully' })
  async getSoilTextures(@Query('locale') locale?: string) {
    return this.referenceDataService.getSoilTextures(locale);
  }

  @Get('cost-categories')
  @ApiOperation({ summary: 'Get all cost categories' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Cost categories retrieved successfully' })
  async getCostCategories(@Query('locale') locale?: string) {
    return this.referenceDataService.getCostCategories(locale);
  }

  @Get('revenue-categories')
  @ApiOperation({ summary: 'Get all revenue categories' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Revenue categories retrieved successfully' })
  async getRevenueCategories(@Query('locale') locale?: string) {
    return this.referenceDataService.getRevenueCategories(locale);
  }

  @Get('sale-types')
  @ApiOperation({ summary: 'Get all sale types' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Sale types retrieved successfully' })
  async getSaleTypes(@Query('locale') locale?: string) {
    return this.referenceDataService.getSaleTypes(locale);
  }

  @Get('experience-levels')
  @ApiOperation({ summary: 'Get all experience levels' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Experience levels retrieved successfully' })
  async getExperienceLevels(@Query('locale') locale?: string) {
    return this.referenceDataService.getExperienceLevels(locale);
  }

  @Get('seasonalities')
  @ApiOperation({ summary: 'Get all seasonalities' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Seasonalities retrieved successfully' })
  async getSeasonalities(@Query('locale') locale?: string) {
    return this.referenceDataService.getSeasonalities(locale);
  }

  @Get('delivery-types')
  @ApiOperation({ summary: 'Get all delivery types' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Delivery types retrieved successfully' })
  async getDeliveryTypes(@Query('locale') locale?: string) {
    return this.referenceDataService.getDeliveryTypes(locale);
  }

  @Get('delivery-statuses')
  @ApiOperation({ summary: 'Get all delivery statuses' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Delivery statuses retrieved successfully' })
  async getDeliveryStatuses(@Query('locale') locale?: string) {
    return this.referenceDataService.getDeliveryStatuses(locale);
  }

  // =====================================================
  // AGRONOMIC REFERENCE TABLES (DB-backed)
  // =====================================================

  @Get('crop-index-thresholds')
  @ApiOperation({ summary: 'Get crop vegetation index thresholds' })
  @ApiQuery({ name: 'crop_type', required: false, description: 'Filter by crop type (e.g. olive, avocado)' })
  @ApiQuery({ name: 'system', required: false, description: 'Filter by plantation system (e.g. traditional, intensive)' })
  @ApiQuery({ name: 'index', required: false, description: 'Filter by index name (e.g. NDVI, NDMI, EVI)' })
  @ApiResponse({ status: 200, description: 'Crop index thresholds retrieved successfully' })
  async getCropIndexThresholds(
    @Query('crop_type') cropType?: string,
    @Query('system') system?: string,
    @Query('index') indexName?: string,
  ) {
    return this.referenceDataService.getCropIndexThresholds(cropType, system, indexName);
  }

  @Get('crop-kc-coefficients')
  @ApiOperation({ summary: 'Get crop Kc (crop coefficient) values for irrigation' })
  @ApiQuery({ name: 'crop_type', required: false, description: 'Filter by crop type (e.g. olive, avocado)' })
  @ApiResponse({ status: 200, description: 'Crop Kc coefficients retrieved successfully' })
  async getCropKcCoefficients(@Query('crop_type') cropType?: string) {
    return this.referenceDataService.getCropKcCoefficients(cropType);
  }

  @Get('crop-mineral-exports')
  @ApiOperation({ summary: 'Get crop mineral export rates for fertilizer planning' })
  @ApiQuery({ name: 'crop_type', required: false, description: 'Filter by crop type (e.g. olive, avocado)' })
  @ApiQuery({ name: 'product_type', required: false, description: 'Filter by product type (e.g. fruit, oil)' })
  @ApiResponse({ status: 200, description: 'Crop mineral exports retrieved successfully' })
  async getCropMineralExports(
    @Query('crop_type') cropType?: string,
    @Query('product_type') productType?: string,
  ) {
    return this.referenceDataService.getCropMineralExports(cropType, productType);
  }

  @Get('crop-diseases')
  @ApiOperation({ summary: 'Get crop disease reference data with treatment info' })
  @ApiQuery({ name: 'crop_type', required: false, description: 'Filter by crop type (e.g. olive, avocado)' })
  @ApiResponse({ status: 200, description: 'Crop diseases retrieved successfully' })
  async getCropDiseases(@Query('crop_type') cropType?: string) {
    return this.referenceDataService.getCropDiseases(cropType);
  }
}
