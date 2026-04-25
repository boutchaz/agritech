import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { HarvestsService } from './harvests.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { HarvestFiltersDto } from './dto/harvest-filters.dto';
import { SellHarvestDto } from './dto/sell-harvest.dto';

@ApiTags('Production - Harvests')
@ApiBearerAuth('JWT-auth')
@RequireModule('production')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
@Controller('organizations/:organizationId/harvests')
export class HarvestsController {
  constructor(private readonly harvestsService: HarvestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all harvests for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date_from', required: false, description: 'Filter from date (YYYY-MM-DD) - legacy format' })
  @ApiQuery({ name: 'date_to', required: false, description: 'Filter to date (YYYY-MM-DD) - legacy format' })
  @ApiQuery({ name: 'farmId', required: false, description: 'Filter by farm ID (camelCase; same as farm_id)' })
  @ApiQuery({ name: 'parcelId', required: false, description: 'Filter by parcel ID (camelCase; same as parcel_id)' })
  @ApiResponse({
    status: 200,
    description: 'Harvests retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        pageSize: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  async getHarvests(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: HarvestFiltersDto,
    @Query('date_from') legacyDateFrom?: string,
    @Query('date_to') legacyDateTo?: string,
  ) {
    // Support both camelCase and snake_case (dates, farm, parcel)
    const finalFilters = {
      ...filters,
      dateFrom: filters.dateFrom || legacyDateFrom,
      dateTo: filters.dateTo || legacyDateTo,
      farm_id: filters.farm_id ?? filters.farmId,
      parcel_id: filters.parcel_id ?? filters.parcelId,
    };
    return this.harvestsService.findAll(req.user.id, organizationId, finalFilters);
  }

  @Get(':harvestId')
  @ApiOperation({ summary: 'Get a harvest by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'harvestId', description: 'Harvest ID' })
  @ApiResponse({ status: 200, description: 'Harvest retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  async getHarvest(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('harvestId') harvestId: string,
  ) {
    return this.harvestsService.findOne(req.user.id, organizationId, harvestId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new harvest' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Harvest created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createHarvest(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createHarvestDto: CreateHarvestDto,
  ) {
    return this.harvestsService.create(req.user.id, organizationId, createHarvestDto);
  }

  @Patch(':harvestId')
  @ApiOperation({ summary: 'Update a harvest' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'harvestId', description: 'Harvest ID' })
  @ApiResponse({ status: 200, description: 'Harvest updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  async updateHarvest(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('harvestId') harvestId: string,
    @Body() updateHarvestDto: UpdateHarvestDto,
  ) {
    return this.harvestsService.update(req.user.id, organizationId, harvestId, updateHarvestDto);
  }

  @Post(':harvestId/sell')
  @ApiOperation({
    summary: 'Sell a harvest and create journal entry',
    description: 'Marks harvest as sold and creates a double-entry journal entry for the revenue. Payment terms determine if Cash (debit) or Accounts Receivable (debit) is used.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'harvestId', description: 'Harvest ID to sell' })
  @ApiResponse({ status: 200, description: 'Harvest sold successfully with journal entry created' })
  @ApiResponse({ status: 400, description: 'Bad request - harvest already sold or invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  async sellHarvest(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('harvestId') harvestId: string,
    @Body() sellHarvestDto: SellHarvestDto,
  ) {
    return this.harvestsService.sellHarvest(req.user.id, organizationId, harvestId, sellHarvestDto);
  }

  @Delete(':harvestId')
  @ApiOperation({ summary: 'Delete a harvest' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'harvestId', description: 'Harvest ID' })
  @ApiResponse({ status: 200, description: 'Harvest deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - harvest has linked records' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Harvest not found' })
  async deleteHarvest(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('harvestId') harvestId: string,
  ) {
    return this.harvestsService.remove(req.user.id, organizationId, harvestId);
  }
}
