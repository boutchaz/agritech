import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateItemGroupDto, UpdateItemGroupDto } from './dto/create-item-group.dto';
import { CreateProductVariantDto, UpdateProductVariantDto } from './dto/product-variant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@ApiTags('items')
@Controller('items')
@RequireModule('stock')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
@ApiBearerAuth()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) { }

  // =====================================================
  // ITEM GROUPS ENDPOINTS
  // =====================================================

  @Get('groups')
  @ApiOperation({ summary: 'Get all item groups with optional filters' })
  @ApiQuery({ name: 'parent_group_id', required: false })
  @ApiQuery({ name: 'is_active', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Item groups retrieved successfully' })
  async findAllItemGroups(
    @Req() req: any,
    @Query('parent_group_id') parentGroupId?: string,
    @Query('is_active') isActive?: string,
    @Query('search') search?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.findAllItemGroups(organizationId, {
      parent_group_id: parentGroupId,
      is_active: isActive === 'true',
      search,
    });
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get a single item group' })
  @ApiParam({ name: 'id', description: 'Item group ID' })
  @ApiResponse({ status: 200, description: 'Item group retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Item group not found' })
  async findOneItemGroup(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.findOneItemGroup(id, organizationId);
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create a new item group' })
  @ApiResponse({ status: 201, description: 'Item group created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createItemGroup(@Body() createItemGroupDto: CreateItemGroupDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    createItemGroupDto.organization_id = organizationId;
    createItemGroupDto.created_by = req.user.sub;
    return this.itemsService.createItemGroup(createItemGroupDto);
  }

  @Patch('groups/:id')
  @ApiOperation({ summary: 'Update an item group' })
  @ApiParam({ name: 'id', description: 'Item group ID' })
  @ApiResponse({ status: 200, description: 'Item group updated successfully' })
  @ApiResponse({ status: 404, description: 'Item group not found' })
  async updateItemGroup(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateItemGroupDto: UpdateItemGroupDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.itemsService.updateItemGroup(id, organizationId, userId, updateItemGroupDto);
  }

  @Post('groups/seed-predefined')
  @ApiOperation({ summary: 'Seed predefined item groups and subcategories (idempotent)' })
  @ApiResponse({ status: 201, description: 'Seeding completed' })
  async seedPredefinedItemGroups(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.itemsService.seedPredefinedItemGroups(organizationId, userId);
  }

  @Delete('groups/:id')
  @ApiOperation({ summary: 'Delete an item group' })
  @ApiParam({ name: 'id', description: 'Item group ID' })
  @ApiResponse({ status: 200, description: 'Item group deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete item group with items or children' })
  async deleteItemGroup(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.deleteItemGroup(id, organizationId);
  }

  // =====================================================
  // ITEMS ENDPOINTS
  // =====================================================

  @Get('selection')
  @ApiOperation({ summary: 'Get items for selection (lightweight for dropdowns)' })
  @ApiQuery({ name: 'is_sales_item', required: false })
  @ApiQuery({ name: 'is_purchase_item', required: false })
  @ApiQuery({ name: 'is_stock_item', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Items retrieved successfully' })
  async getItemsForSelection(
    @Req() req: any,
    @Query('is_sales_item') isSalesItem?: string,
    @Query('is_purchase_item') isPurchaseItem?: string,
    @Query('is_stock_item') isStockItem?: string,
    @Query('search') search?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.getItemsForSelection(organizationId, {
      is_sales_item: isSalesItem === 'true',
      is_purchase_item: isPurchaseItem === 'true',
      is_stock_item: isStockItem === 'true',
      search,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all items with optional filters' })
  @ApiQuery({ name: 'item_group_id', required: false })
  @ApiQuery({ name: 'is_active', required: false })
  @ApiQuery({ name: 'is_sales_item', required: false })
  @ApiQuery({ name: 'is_purchase_item', required: false })
  @ApiQuery({ name: 'is_stock_item', required: false })
  @ApiQuery({ name: 'crop_type', required: false })
  @ApiQuery({ name: 'variety', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Items retrieved successfully' })
  async findAllItems(
    @Req() req: any,
    @Query('item_group_id') itemGroupId?: string,
    @Query('is_active') isActive?: string,
    @Query('is_sales_item') isSalesItem?: string,
    @Query('is_purchase_item') isPurchaseItem?: string,
    @Query('is_stock_item') isStockItem?: string,
    @Query('crop_type') cropType?: string,
    @Query('variety') variety?: string,
    @Query('search') search?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.findAllItems(organizationId, {
      item_group_id: itemGroupId,
      is_active: isActive !== undefined ? isActive === 'true' : undefined,
      is_sales_item: isSalesItem !== undefined ? isSalesItem === 'true' : undefined,
      is_purchase_item: isPurchaseItem !== undefined ? isPurchaseItem === 'true' : undefined,
      is_stock_item: isStockItem !== undefined ? isStockItem === 'true' : undefined,
      crop_type: cropType,
      variety,
      search,
    });
  }

  @Get('deleted')
  @ApiOperation({ summary: 'Get soft-deleted items with optional filters' })
  @ApiResponse({ status: 200, description: 'Deleted items retrieved successfully' })
  async findDeletedItems(@Req() req: any, @Query() filters: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.findDeletedItems(organizationId, filters);
  }

  @Get('by-barcode/:barcode')
  @ApiOperation({ summary: 'Find an item or variant by barcode' })
  @ApiParam({ name: 'barcode', description: 'Item or variant barcode' })
  @ApiResponse({ status: 200, description: 'Barcode match retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No item found with barcode' })
  async findByBarcode(@Req() req: any, @Param('barcode') barcode: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.findByBarcode(barcode, organizationId);
  }

  // =====================================================
  // STOCK LEVELS & FARM INTEGRATION ENDPOINTS
  // =====================================================
  // NOTE: These routes must come BEFORE :id routes to avoid conflicts

  @Get('stock-levels/farm')
  @ApiOperation({ summary: 'Get stock levels grouped by farm with warehouse relationships' })
  @ApiQuery({ name: 'farm_id', required: false, description: 'Filter by farm ID' })
  @ApiQuery({ name: 'item_id', required: false, description: 'Filter by item ID' })
  @ApiQuery({ name: 'low_stock_only', required: false, description: 'Show only low stock items' })
  @ApiResponse({ status: 200, description: 'Farm stock levels retrieved successfully' })
  async getFarmStockLevels(
    @Req() req: any,
    @Query('farm_id') farmId?: string,
    @Query('item_id') itemId?: string,
    @Query('low_stock_only') lowStockOnly?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.getFarmStockLevels(organizationId, {
      farm_id: farmId,
      item_id: itemId,
      low_stock_only: lowStockOnly === 'true',
    });
  }

  @Get('stock-levels')
  @ApiOperation({ summary: 'Get stock levels for items with farm context' })
  @ApiQuery({ name: 'farm_id', required: false, description: 'Filter by farm ID' })
  @ApiQuery({ name: 'item_id', required: false, description: 'Filter by item ID' })
  @ApiResponse({ status: 200, description: 'Stock levels retrieved successfully' })
  async getStockLevels(
    @Req() req: any,
    @Query('farm_id') farmId?: string,
    @Query('item_id') itemId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.getStockLevels(organizationId, {
      farm_id: farmId,
      item_id: itemId,
    });
  }

  // =====================================================
  // PRODUCT VARIANTS ENDPOINTS
  // =====================================================

  @Get(':id/variants')
  @ApiOperation({ summary: 'Get product variants for an item' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Product variants retrieved successfully' })
  async getItemVariants(@Req() req: any, @Param('id') itemId: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.findItemVariants(organizationId, itemId);
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Create a product variant for an item' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 201, description: 'Product variant created successfully' })
  async createItemVariant(
    @Req() req: any,
    @Param('id') itemId: string,
    @Body() createVariantDto: CreateProductVariantDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    createVariantDto.organization_id = organizationId;
    createVariantDto.item_id = itemId;
    return this.itemsService.createItemVariant(createVariantDto);
  }

  @Patch('variants/:variantId')
  @ApiOperation({ summary: 'Update a product variant' })
  @ApiParam({ name: 'variantId', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'Product variant updated successfully' })
  async updateItemVariant(
    @Req() req: any,
    @Param('variantId') variantId: string,
    @Body() updateVariantDto: UpdateProductVariantDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.itemsService.updateItemVariant(variantId, organizationId, userId, updateVariantDto);
  }

  @Delete('variants/:variantId')
  @ApiOperation({ summary: 'Delete a product variant' })
  @ApiParam({ name: 'variantId', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'Product variant deleted successfully' })
  async deleteItemVariant(@Req() req: any, @Param('variantId') variantId: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.deleteItemVariant(variantId, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single item with details' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async findOneItem(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.findOneItem(id, organizationId);
  }

  @Get(':id/farm-usage')
  @ApiOperation({ summary: 'Get item usage by farm/parcel' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item farm usage retrieved successfully' })
  async getItemFarmUsage(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.getItemFarmUsage(organizationId, id);
  }

  @Get(':id/consumption')
  @ApiOperation({ summary: 'Get item consumption in base unit across all variants' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiQuery({ name: 'warehouse_id', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Filter by start date (ISO 8601)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'Filter by end date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Item consumption retrieved successfully' })
  async getItemConsumption(
    @Param('id') id: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Req() req?: any,
  ) {
    const organizationId = req.headers['x-organization-id'];

    const filters: any = {};
    if (warehouseId) {
      filters.warehouse_id = warehouseId;
    }
    if (startDate) {
      filters.start_date = new Date(startDate);
    }
    if (endDate) {
      filters.end_date = new Date(endDate);
    }

    return this.itemsService.getItemConsumptionInBaseUnit(organizationId, id, filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new item' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createItem(@Body() createItemDto: CreateItemDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    createItemDto.organization_id = organizationId;
    createItemDto.created_by = req.user.sub;
    return this.itemsService.createItem(createItemDto);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted item' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item restored successfully' })
  async restoreItem(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.restoreItem(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an item' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async updateItem(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.itemsService.updateItem(id, organizationId, userId, updateItemDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an item' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete item used in transactions' })
  async deleteItem(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.deleteItem(id, organizationId);
  }

  // =====================================================
  // ITEM PRICES ENDPOINTS
  // =====================================================

  @Get(':id/prices')
  @ApiOperation({ summary: 'Get all prices for a specific item' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item prices retrieved successfully' })
  async getItemPrices(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.itemsService.getItemPrices(id, organizationId);
  }
}
