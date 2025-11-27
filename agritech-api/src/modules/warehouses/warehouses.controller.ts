import {
  Controller,
  Get,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('warehouses')
@Controller('api/v1/warehouses')
@UseGuards(JwtAuthGuard, OrganizationGuard)
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
}
