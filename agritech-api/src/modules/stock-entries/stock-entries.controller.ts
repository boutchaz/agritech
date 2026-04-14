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
import { OpeningStockFiltersDto } from './dto/opening-stock-filters.dto';
import { CreateOpeningStockDto } from './dto/create-opening-stock.dto';
import { UpdateOpeningStockDto } from './dto/update-opening-stock.dto';
import { CreateStockAccountMappingDto, UpdateStockAccountMappingDto } from './dto/stock-account-mapping.dto';
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

  @Get('opening-balances')
  @ApiOperation({ summary: 'Get all opening stock balances with optional filters' })
  @ApiResponse({ status: 200, description: 'Opening stock balances retrieved successfully' })
  async getOpeningBalances(
    @Req() req: any,
    @Query() filters: OpeningStockFiltersDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.getOpeningStockBalances(organizationId, filters);
  }

  @Get('opening-balances/:id')
  @ApiOperation({ summary: 'Get single opening stock balance by ID' })
  @ApiParam({ name: 'id', description: 'Opening stock balance ID' })
  @ApiResponse({ status: 200, description: 'Opening stock balance retrieved successfully' })
  async getOpeningBalance(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.getOpeningStockBalance(id, organizationId);
  }

  @Post('opening-balances')
  @ApiOperation({ summary: 'Create a new opening stock balance' })
  @ApiResponse({ status: 201, description: 'Opening stock balance created successfully' })
  async createOpeningBalance(
    @Req() req: any,
    @Body() createDto: CreateOpeningStockDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.stockEntriesService.createOpeningStockBalance(organizationId, userId, createDto);
  }

  @Patch('opening-balances/:id')
  @ApiOperation({ summary: 'Update a draft opening stock balance' })
  @ApiParam({ name: 'id', description: 'Opening stock balance ID' })
  @ApiResponse({ status: 200, description: 'Opening stock balance updated successfully' })
  async updateOpeningBalance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateOpeningStockDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.updateOpeningStockBalance(id, organizationId, updateDto);
  }

  @Post('opening-balances/:id/post')
  @ApiOperation({ summary: 'Post opening stock balance (creates journal entry and updates inventory)' })
  @ApiParam({ name: 'id', description: 'Opening stock balance ID' })
  @ApiResponse({ status: 200, description: 'Opening stock balance posted successfully' })
  async postOpeningBalance(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.postOpeningStockBalance(id, organizationId);
  }

  @Patch('opening-balances/:id/cancel')
  @ApiOperation({ summary: 'Cancel an opening stock balance' })
  @ApiParam({ name: 'id', description: 'Opening stock balance ID' })
  @ApiResponse({ status: 200, description: 'Opening stock balance cancelled successfully' })
  async cancelOpeningBalance(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.cancelOpeningStockBalance(id, organizationId);
  }

  @Delete('opening-balances/:id')
  @ApiOperation({ summary: 'Delete a draft opening stock balance' })
  @ApiParam({ name: 'id', description: 'Opening stock balance ID' })
  @ApiResponse({ status: 200, description: 'Opening stock balance deleted successfully' })
  async deleteOpeningBalance(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.deleteOpeningStockBalance(id, organizationId);
  }

  @Get('account-mappings')
  @ApiOperation({ summary: 'Get all stock account mappings' })
  @ApiResponse({ status: 200, description: 'Stock account mappings retrieved successfully' })
  async getAccountMappings(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.getStockAccountMappings(organizationId);
  }

  @Post('account-mappings')
  @ApiOperation({ summary: 'Create a new stock account mapping' })
  @ApiResponse({ status: 201, description: 'Stock account mapping created successfully' })
  async createAccountMapping(
    @Req() req: any,
    @Body() createDto: CreateStockAccountMappingDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.createStockAccountMapping(organizationId, createDto);
  }

  @Patch('account-mappings/:id')
  @ApiOperation({ summary: 'Update a stock account mapping' })
  @ApiParam({ name: 'id', description: 'Stock account mapping ID' })
  @ApiResponse({ status: 200, description: 'Stock account mapping updated successfully' })
  async updateAccountMapping(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateStockAccountMappingDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.updateStockAccountMapping(id, organizationId, updateDto);
  }

  @Delete('account-mappings/:id')
  @ApiOperation({ summary: 'Delete a stock account mapping' })
  @ApiParam({ name: 'id', description: 'Stock account mapping ID' })
  @ApiResponse({ status: 200, description: 'Stock account mapping deleted successfully' })
  async deleteAccountMapping(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.stockEntriesService.deleteStockAccountMapping(id, organizationId);
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

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a posted stock entry' })
  @ApiParam({ name: 'id', description: 'Stock entry ID' })
  @ApiResponse({ status: 200, description: 'Stock entry reversed successfully' })
  @ApiResponse({ status: 400, description: 'Stock entry cannot be reversed' })
  @ApiResponse({ status: 404, description: 'Stock entry not found' })
  async reverse(@Param('id') id: string, @Req() req: any, @Body() body: { reason: string }) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.stockEntriesService.reverseStockEntry(id, organizationId, userId, body.reason);
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
}
