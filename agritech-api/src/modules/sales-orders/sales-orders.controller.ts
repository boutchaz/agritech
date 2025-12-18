import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { SalesOrdersService } from './sales-orders.service';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  SalesOrderFiltersDto,
  UpdateStatusDto,
  ConvertToInvoiceDto,
} from './dto';

@ApiTags('sales-orders')
@ApiBearerAuth()
@Controller('sales-orders')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sales order' })
  @ApiResponse({
    status: 201,
    description: 'Sales order created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or business rule violation',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createSalesOrderDto: CreateSalesOrderDto,
    @Request() req,
  ) {
    const organizationId = req.organizationId || req.user?.organizationId;
    const userId = req.user?.userId || req.user?.id;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return this.salesOrdersService.create(
      createSalesOrderDto,
      organizationId,
      userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all sales orders with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of sales orders retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query() filters: SalesOrderFiltersDto,
    @Request() req,
  ) {
    // Get organizationId from req.organizationId (set by OrganizationGuard) or fallback to req.user.organizationId
    const organizationId = req.organizationId || req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.salesOrdersService.findAll(filters, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single sales order by ID' })
  @ApiParam({ name: 'id', description: 'Sales order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Sales order retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string, @Request() req) {
    const organizationId = req.organizationId || req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.salesOrdersService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sales order' })
  @ApiParam({ name: 'id', description: 'Sales order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Sales order updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() updateSalesOrderDto: UpdateSalesOrderDto,
    @Request() req,
  ) {
    const organizationId = req.organizationId || req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.salesOrdersService.update(
      id,
      updateSalesOrderDto,
      organizationId,
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update sales order status' })
  @ApiParam({ name: 'id', description: 'Sales order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Sales order status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or business rule violation',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req,
  ) {
    const organizationId = req.organizationId || req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.salesOrdersService.updateStatus(
      id,
      updateStatusDto,
      organizationId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a sales order (only drafts)' })
  @ApiParam({ name: 'id', description: 'Sales order UUID' })
  @ApiResponse({
    status: 204,
    description: 'Sales order deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete non-draft order',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string, @Request() req) {
    const organizationId = req.organizationId || req.user?.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.salesOrdersService.remove(id, organizationId);
  }

  @Post(':id/convert-to-invoice')
  @ApiOperation({ summary: 'Convert sales order to invoice' })
  @ApiParam({ name: 'id', description: 'Sales order UUID' })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully from sales order',
  })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot convert order to invoice (invalid status)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async convertToInvoice(
    @Param('id') id: string,
    @Body() convertDto: ConvertToInvoiceDto,
    @Request() req,
  ) {
    const organizationId = req.organizationId || req.user?.organizationId;
    const userId = req.user?.userId || req.user?.id;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return this.salesOrdersService.convertToInvoice(
      id,
      convertDto,
      organizationId,
      userId,
    );
  }

  @Post(':id/issue-stock')
  @ApiOperation({
    summary: 'Issue stock for a sales order',
    description: 'Creates a Material Issue stock entry to deduct inventory and records COGS journal entry',
  })
  @ApiParam({ name: 'id', description: 'Sales order UUID' })
  @ApiQuery({
    name: 'warehouse_id',
    required: true,
    description: 'Warehouse UUID to issue stock from',
  })
  @ApiResponse({
    status: 201,
    description: 'Stock issued successfully',
  })
  @ApiResponse({ status: 404, description: 'Sales order not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot issue stock (invalid status, stock already issued, or insufficient stock)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async issueStock(
    @Param('id') id: string,
    @Query('warehouse_id') warehouseId: string,
    @Request() req,
  ) {
    const organizationId = req.organizationId || req.user?.organizationId;
    const userId = req.user?.userId || req.user?.id;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    if (!warehouseId) {
      throw new BadRequestException('Warehouse ID is required');
    }
    return this.salesOrdersService.issueStock(
      id,
      organizationId,
      userId,
      warehouseId,
    );
  }
}
