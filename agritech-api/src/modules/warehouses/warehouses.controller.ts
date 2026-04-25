import {
  Controller,
  Get,
  Post,
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
  ApiQuery
} from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@ApiTags('warehouses')
@Controller('warehouses')
@RequireModule('stock')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
@ApiBearerAuth()
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active warehouses' })
  @ApiResponse({ status: 200, description: 'Warehouses retrieved successfully' })
  async findAll(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.warehousesService.findAll(organizationId);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory with optional filters' })
  @ApiQuery({ name: 'warehouse_id', required: false })
  @ApiQuery({ name: 'item_id', required: false })
  @ApiResponse({ status: 200, description: 'Inventory retrieved successfully' })
  async getInventory(
    @Req() req: any,
    @Query('warehouse_id') warehouseId?: string,
    @Query('item_id') itemId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.warehousesService.getInventory(organizationId, {
      warehouse_id: warehouseId,
      item_id: itemId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse retrieved successfully' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.warehousesService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully' })
  async create(@Req() req: any, @Body() dto: CreateWarehouseDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.warehousesService.create(dto, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated successfully' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.warehousesService.update(id, dto, organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a warehouse (soft delete)' })
  @ApiResponse({ status: 200, description: 'Warehouse deleted successfully' })
  async delete(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.warehousesService.delete(id, organizationId);
  }
}
