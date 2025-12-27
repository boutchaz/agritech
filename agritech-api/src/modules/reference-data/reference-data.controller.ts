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
}
