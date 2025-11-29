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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  PurchaseOrderFiltersDto,
  UpdateStatusDto,
  ConvertToBillDto,
} from './dto';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new purchase order' })
  @ApiResponse({
    status: 201,
    description: 'Purchase order created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or business rule violation',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
    @Request() req,
  ) {
    return this.purchaseOrdersService.create(
      createPurchaseOrderDto,
      req.user.organizationId,
      req.user.userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all purchase orders with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of purchase orders retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query() filters: PurchaseOrderFiltersDto,
    @Request() req,
  ) {
    return this.purchaseOrdersService.findAll(filters, req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single purchase order by ID' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.purchaseOrdersService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a purchase order' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
    @Request() req,
  ) {
    return this.purchaseOrdersService.update(
      id,
      updatePurchaseOrderDto,
      req.user.organizationId,
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update purchase order status' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Purchase order status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
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
    return this.purchaseOrdersService.updateStatus(
      id,
      updateStatusDto,
      req.user.organizationId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a purchase order (only drafts)' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({
    status: 204,
    description: 'Purchase order deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete non-draft order',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.purchaseOrdersService.remove(id, req.user.organizationId);
  }

  @Post(':id/convert-to-bill')
  @ApiOperation({ summary: 'Convert purchase order to purchase invoice (bill)' })
  @ApiParam({ name: 'id', description: 'Purchase order UUID' })
  @ApiResponse({
    status: 201,
    description: 'Bill created successfully from purchase order',
  })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot convert order to bill (invalid status)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async convertToBill(
    @Param('id') id: string,
    @Body() convertDto: ConvertToBillDto,
    @Request() req,
  ) {
    return this.purchaseOrdersService.convertToBill(
      id,
      convertDto,
      req.user.organizationId,
      req.user.userId,
    );
  }
}
