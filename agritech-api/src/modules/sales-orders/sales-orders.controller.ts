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
    return this.salesOrdersService.create(
      createSalesOrderDto,
      req.user.organizationId,
      req.user.userId,
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
    return this.salesOrdersService.findAll(filters, req.user.organizationId);
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
    return this.salesOrdersService.findOne(id, req.user.organizationId);
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
    return this.salesOrdersService.update(
      id,
      updateSalesOrderDto,
      req.user.organizationId,
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
    return this.salesOrdersService.updateStatus(
      id,
      updateStatusDto,
      req.user.organizationId,
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
    return this.salesOrdersService.remove(id, req.user.organizationId);
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
    return this.salesOrdersService.convertToInvoice(
      id,
      convertDto,
      req.user.organizationId,
      req.user.userId,
    );
  }
}
