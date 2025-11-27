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
import { StockEntriesService } from './stock-entries.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('stock-entries')
@Controller('stock-entries')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class StockEntriesController {
  constructor(private readonly stockEntriesService: StockEntriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all stock entries with optional filters' })
  @ApiQuery({ name: 'entry_type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiQuery({ name: 'warehouse_id', required: false })
  @ApiQuery({ name: 'reference_type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Stock entries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Req() req: any,
    @Query('entry_type') entryType?: string,
    @Query('status') status?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('reference_type') referenceType?: string,
    @Query('search') search?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.findAll(organizationId, {
      entry_type: entryType,
      status,
      from_date: fromDate,
      to_date: toDate,
      warehouse_id: warehouseId,
      reference_type: referenceType,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single stock entry with items' })
  @ApiParam({ name: 'id', description: 'Stock entry ID' })
  @ApiResponse({ status: 200, description: 'Stock entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Stock entry not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new stock entry' })
  @ApiResponse({ status: 201, description: 'Stock entry created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createStockEntryDto: CreateStockEntryDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    createStockEntryDto.organization_id = organizationId;
    createStockEntryDto.created_by = req.user.sub;
    return this.stockEntriesService.createStockEntry(createStockEntryDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft stock entry' })
  @ApiParam({ name: 'id', description: 'Stock entry ID' })
  @ApiResponse({ status: 200, description: 'Stock entry updated successfully' })
  @ApiResponse({ status: 400, description: 'Only draft entries can be updated' })
  @ApiResponse({ status: 404, description: 'Stock entry not found' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateStockEntryDto: UpdateStockEntryDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.stockEntriesService.updateStockEntry(id, organizationId, userId, updateStockEntryDto);
  }

  @Patch(':id/post')
  @ApiOperation({ summary: 'Post/finalize a stock entry' })
  @ApiParam({ name: 'id', description: 'Stock entry ID' })
  @ApiResponse({ status: 200, description: 'Stock entry posted successfully' })
  @ApiResponse({ status: 400, description: 'Stock entry cannot be posted' })
  async post(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.postStockEntry(id, organizationId, req.user.sub);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a stock entry' })
  @ApiParam({ name: 'id', description: 'Stock entry ID' })
  @ApiResponse({ status: 200, description: 'Stock entry cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Stock entry cannot be cancelled' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.stockEntriesService.cancelStockEntry(id, organizationId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft stock entry' })
  @ApiParam({ name: 'id', description: 'Stock entry ID' })
  @ApiResponse({ status: 200, description: 'Stock entry deleted successfully' })
  @ApiResponse({ status: 400, description: 'Only draft entries can be deleted' })
  @ApiResponse({ status: 404, description: 'Stock entry not found' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.deleteStockEntry(id, organizationId);
  }

  @Get('movements/list')
  @ApiOperation({ summary: 'Get stock movements with filters' })
  @ApiQuery({ name: 'item_id', required: false })
  @ApiQuery({ name: 'warehouse_id', required: false })
  @ApiQuery({ name: 'movement_type', required: false })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiQuery({ name: 'stock_entry_id', required: false })
  @ApiResponse({ status: 200, description: 'Stock movements retrieved successfully' })
  async getMovements(
    @Req() req: any,
    @Query('item_id') itemId?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('movement_type') movementType?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('stock_entry_id') stockEntryId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.getStockMovements(organizationId, {
      item_id: itemId,
      warehouse_id: warehouseId,
      movement_type: movementType,
      from_date: fromDate,
      to_date: toDate,
      stock_entry_id: stockEntryId,
    });
  }
}
