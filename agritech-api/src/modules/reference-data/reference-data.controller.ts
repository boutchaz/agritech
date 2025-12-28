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
  @ApiResponse({ status: 200, description: 'All reference data retrieved successfully' })
  async getAllReferenceData(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.referenceDataService.getAllReferenceData(organizationId);
  }

  // =====================================================
  // TREE CATEGORIES & TREES
  // =====================================================

  @Get('tree-categories')
  @ApiOperation({ summary: 'Get all tree categories for an organization' })
  @ApiResponse({ status: 200, description: 'Tree categories retrieved successfully' })
  async getTreeCategories(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.referenceDataService.getTreeCategories(organizationId);
  }

  @Get('tree-categories/:id')
  @ApiOperation({ summary: 'Get a single tree category' })
  @ApiParam({ name: 'id', description: 'Tree category ID' })
  @ApiResponse({ status: 200, description: 'Tree category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tree category not found' })
  async getTreeCategory(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.referenceDataService.getTreeCategory(id, organizationId);
  }

  @Get('trees')
  @ApiOperation({ summary: 'Get all trees' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category ID' })
  @ApiResponse({ status: 200, description: 'Trees retrieved successfully' })
  async getTrees(@Query('category_id') categoryId?: string) {
    return this.referenceDataService.getTrees(categoryId);
  }

  // =====================================================
  // PLANTATION TYPES
  // =====================================================

  @Get('plantation-types')
  @ApiOperation({ summary: 'Get all plantation types for an organization' })
  @ApiResponse({ status: 200, description: 'Plantation types retrieved successfully' })
  async getPlantationTypes(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.referenceDataService.getPlantationTypes(organizationId);
  }

  @Get('plantation-types/:id')
  @ApiOperation({ summary: 'Get a single plantation type' })
  @ApiParam({ name: 'id', description: 'Plantation type ID' })
  @ApiResponse({ status: 200, description: 'Plantation type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Plantation type not found' })
  async getPlantationType(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.referenceDataService.getPlantationType(id, organizationId);
  }

  // =====================================================
  // TEST TYPES (GLOBAL)
  // =====================================================

  @Get('test-types')
  @ApiOperation({ summary: 'Get all test types (global)' })
  @ApiResponse({ status: 200, description: 'Test types retrieved successfully' })
  async getTestTypes() {
    return this.referenceDataService.getTestTypes();
  }

  @Get('test-types/:id')
  @ApiOperation({ summary: 'Get a single test type' })
  @ApiParam({ name: 'id', description: 'Test type ID' })
  @ApiResponse({ status: 200, description: 'Test type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Test type not found' })
  async getTestType(@Param('id') id: string) {
    return this.referenceDataService.getTestType(id);
  }

  // =====================================================
  // PRODUCT CATEGORIES (GLOBAL)
  // =====================================================

  @Get('product-categories')
  @ApiOperation({ summary: 'Get all product categories (global)' })
  @ApiResponse({ status: 200, description: 'Product categories retrieved successfully' })
  async getProductCategories() {
    return this.referenceDataService.getProductCategories();
  }

  @Get('product-categories/:id')
  @ApiOperation({ summary: 'Get a single product category' })
  @ApiParam({ name: 'id', description: 'Product category ID' })
  @ApiResponse({ status: 200, description: 'Product category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product category not found' })
  async getProductCategory(@Param('id') id: string) {
    return this.referenceDataService.getProductCategory(id);
  }

  @Get('product-subcategories')
  @ApiOperation({ summary: 'Get all product subcategories' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category ID' })
  @ApiResponse({ status: 200, description: 'Product subcategories retrieved successfully' })
  async getProductSubcategories(@Query('category_id') categoryId?: string) {
    return this.referenceDataService.getProductSubcategories(categoryId);
  }

  // =====================================================
  // SOIL TYPES (GLOBAL)
  // =====================================================

  @Get('soil-types')
  @ApiOperation({ summary: 'Get all soil types (global)' })
  @ApiResponse({ status: 200, description: 'Soil types retrieved successfully' })
  async getSoilTypes() {
    return this.referenceDataService.getSoilTypes();
  }

  // =====================================================
  // IRRIGATION TYPES (GLOBAL)
  // =====================================================

  @Get('irrigation-types')
  @ApiOperation({ summary: 'Get all irrigation types (global)' })
  @ApiResponse({ status: 200, description: 'Irrigation types retrieved successfully' })
  async getIrrigationTypes() {
    return this.referenceDataService.getIrrigationTypes();
  }

  // =====================================================
  // CROP CATEGORIES (GLOBAL)
  // =====================================================

  @Get('crop-categories')
  @ApiOperation({ summary: 'Get all crop categories (global)' })
  @ApiResponse({ status: 200, description: 'Crop categories retrieved successfully' })
  async getCropCategories() {
    return this.referenceDataService.getCropCategories();
  }

  @Get('crop-categories/:id')
  @ApiOperation({ summary: 'Get a single crop category' })
  @ApiParam({ name: 'id', description: 'Crop category ID' })
  @ApiResponse({ status: 200, description: 'Crop category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Crop category not found' })
  async getCropCategory(@Param('id') id: string) {
    return this.referenceDataService.getCropCategory(id);
  }

  // =====================================================
  // CROP TYPES
  // =====================================================

  @Get('crop-types')
  @ApiOperation({ summary: 'Get all crop types' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter by category ID' })
  @ApiResponse({ status: 200, description: 'Crop types retrieved successfully' })
  async getCropTypes(@Query('category_id') categoryId?: string) {
    return this.referenceDataService.getCropTypes(categoryId);
  }

  // =====================================================
  // VARIETIES
  // =====================================================

  @Get('varieties')
  @ApiOperation({ summary: 'Get all varieties' })
  @ApiQuery({ name: 'crop_type_id', required: false, description: 'Filter by crop type ID' })
  @ApiResponse({ status: 200, description: 'Varieties retrieved successfully' })
  async getVarieties(@Query('crop_type_id') cropTypeId?: string) {
    return this.referenceDataService.getVarieties(cropTypeId);
  }

  @Get('units-of-measure')
  @ApiOperation({ summary: 'Get all units of measure' })
  @ApiResponse({ status: 200, description: 'Units of measure retrieved successfully' })
  async getUnitsOfMeasure() {
    return this.referenceDataService.getUnitsOfMeasure();
  }

  @Get('quality-grades')
  @ApiOperation({ summary: 'Get all quality grades' })
  @ApiResponse({ status: 200, description: 'Quality grades retrieved successfully' })
  async getQualityGrades() {
    return this.referenceDataService.getQualityGrades();
  }

  @Get('harvest-statuses')
  @ApiOperation({ summary: 'Get all harvest statuses' })
  @ApiResponse({ status: 200, description: 'Harvest statuses retrieved successfully' })
  async getHarvestStatuses() {
    return this.referenceDataService.getHarvestStatuses();
  }

  @Get('intended-uses')
  @ApiOperation({ summary: 'Get all intended uses for harvests' })
  @ApiResponse({ status: 200, description: 'Intended uses retrieved successfully' })
  async getIntendedUses() {
    return this.referenceDataService.getIntendedUses();
  }

  @Get('utility-types')
  @ApiOperation({ summary: 'Get all utility types' })
  @ApiResponse({ status: 200, description: 'Utility types retrieved successfully' })
  async getUtilityTypes() {
    return this.referenceDataService.getUtilityTypes();
  }

  @Get('infrastructure-types')
  @ApiOperation({ summary: 'Get all infrastructure types' })
  @ApiResponse({ status: 200, description: 'Infrastructure types retrieved successfully' })
  async getInfrastructureTypes() {
    return this.referenceDataService.getInfrastructureTypes();
  }

  @Get('basin-shapes')
  @ApiOperation({ summary: 'Get all basin shapes' })
  @ApiResponse({ status: 200, description: 'Basin shapes retrieved successfully' })
  async getBasinShapes() {
    return this.referenceDataService.getBasinShapes();
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get all payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  async getPaymentMethods() {
    return this.referenceDataService.getPaymentMethods();
  }

  @Get('payment-statuses')
  @ApiOperation({ summary: 'Get all payment statuses' })
  @ApiResponse({ status: 200, description: 'Payment statuses retrieved successfully' })
  async getPaymentStatuses() {
    return this.referenceDataService.getPaymentStatuses();
  }

  @Get('task-priorities')
  @ApiOperation({ summary: 'Get all task priorities' })
  @ApiResponse({ status: 200, description: 'Task priorities retrieved successfully' })
  async getTaskPriorities() {
    return this.referenceDataService.getTaskPriorities();
  }

  @Get('worker-types')
  @ApiOperation({ summary: 'Get all worker types' })
  @ApiResponse({ status: 200, description: 'Worker types retrieved successfully' })
  async getWorkerTypes() {
    return this.referenceDataService.getWorkerTypes();
  }

  @Get('metayage-types')
  @ApiOperation({ summary: 'Get all metayage (sharecropping) types' })
  @ApiResponse({ status: 200, description: 'Metayage types retrieved successfully' })
  async getMetayageTypes() {
    return this.referenceDataService.getMetayageTypes();
  }

  @Get('document-types')
  @ApiOperation({ summary: 'Get all document types' })
  @ApiResponse({ status: 200, description: 'Document types retrieved successfully' })
  async getDocumentTypes() {
    return this.referenceDataService.getDocumentTypes();
  }

  @Get('currencies')
  @ApiOperation({ summary: 'Get all currencies' })
  @ApiResponse({ status: 200, description: 'Currencies retrieved successfully' })
  async getCurrencies() {
    return this.referenceDataService.getCurrencies();
  }

  @Get('timezones')
  @ApiOperation({ summary: 'Get all timezones' })
  @ApiResponse({ status: 200, description: 'Timezones retrieved successfully' })
  async getTimezones() {
    return this.referenceDataService.getTimezones();
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get all languages' })
  @ApiResponse({ status: 200, description: 'Languages retrieved successfully' })
  async getLanguages() {
    return this.referenceDataService.getLanguages();
  }

  @Get('lab-service-categories')
  @ApiOperation({ summary: 'Get all lab service categories' })
  @ApiResponse({ status: 200, description: 'Lab service categories retrieved successfully' })
  async getLabServiceCategories() {
    return this.referenceDataService.getLabServiceCategories();
  }

  @Get('soil-textures')
  @ApiOperation({ summary: 'Get all soil textures' })
  @ApiResponse({ status: 200, description: 'Soil textures retrieved successfully' })
  async getSoilTextures() {
    return this.referenceDataService.getSoilTextures();
  }

  @Get('cost-categories')
  @ApiOperation({ summary: 'Get all cost categories' })
  @ApiResponse({ status: 200, description: 'Cost categories retrieved successfully' })
  async getCostCategories() {
    return this.referenceDataService.getCostCategories();
  }

  @Get('revenue-categories')
  @ApiOperation({ summary: 'Get all revenue categories' })
  @ApiResponse({ status: 200, description: 'Revenue categories retrieved successfully' })
  async getRevenueCategories() {
    return this.referenceDataService.getRevenueCategories();
  }

  @Get('sale-types')
  @ApiOperation({ summary: 'Get all sale types' })
  @ApiResponse({ status: 200, description: 'Sale types retrieved successfully' })
  async getSaleTypes() {
    return this.referenceDataService.getSaleTypes();
  }

  @Get('experience-levels')
  @ApiOperation({ summary: 'Get all experience levels' })
  @ApiResponse({ status: 200, description: 'Experience levels retrieved successfully' })
  async getExperienceLevels() {
    return this.referenceDataService.getExperienceLevels();
  }

  @Get('seasonalities')
  @ApiOperation({ summary: 'Get all seasonalities' })
  @ApiResponse({ status: 200, description: 'Seasonalities retrieved successfully' })
  async getSeasonalities() {
    return this.referenceDataService.getSeasonalities();
  }

  @Get('delivery-types')
  @ApiOperation({ summary: 'Get all delivery types' })
  @ApiResponse({ status: 200, description: 'Delivery types retrieved successfully' })
  async getDeliveryTypes() {
    return this.referenceDataService.getDeliveryTypes();
  }

  @Get('delivery-statuses')
  @ApiOperation({ summary: 'Get all delivery statuses' })
  @ApiResponse({ status: 200, description: 'Delivery statuses retrieved successfully' })
  async getDeliveryStatuses() {
    return this.referenceDataService.getDeliveryStatuses();
  }
}
