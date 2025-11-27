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
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateItemGroupDto, UpdateItemGroupDto } from './dto/create-item-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('items')
@Controller('api/v1/items')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

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
      is_active: isActive === 'true',
      is_sales_item: isSalesItem === 'true',
      is_purchase_item: isPurchaseItem === 'true',
      is_stock_item: isStockItem === 'true',
      crop_type: cropType,
      variety,
      search,
    });
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
}
