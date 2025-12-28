import { Controller, Delete, Get, Post, Query, Body, UseGuards, Request, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FarmsService } from './farms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { AppAbility } from '../casl/casl-ability.factory';
import {
  DeleteFarmDto,
  DeleteFarmResponseDto,
} from './dto/delete-farm.dto';
import {
  ImportFarmDto,
  ImportFarmResponseDto,
} from './dto/import-farm.dto';
import { ListFarmsResponseDto } from './dto/list-farms.dto';
import {
  BatchDeleteFarmsDto,
  BatchDeleteResponseDto,
} from './dto/batch-delete-farms.dto';
import {
  ExportFarmDto,
  ExportFarmResponseDto,
} from './dto/export-farm.dto';
import { ApiParam } from '@nestjs/swagger';

@ApiTags('farms')
@Controller('farms')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class FarmsController {
  constructor(private farmsService: FarmsService) { }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List farms for an organization',
    description: 'Get all farms for an organization with parcel counts',
  })
  @ApiQuery({
    name: 'organization_id',
    required: true,
    description: 'Organization ID to fetch farms for',
  })
  @ApiResponse({
    status: 200,
    description: 'Farms retrieved successfully',
    type: ListFarmsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  async listFarms(
    @Request() req,
    @Query('organization_id') organizationId: string,
  ) {
    return this.farmsService.listFarms(req.user.id, organizationId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get farm details by ID',
    description: 'Get detailed information about a specific farm',
  })
  @ApiParam({
    name: 'id',
    description: 'Farm ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Farm retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to farm' })
  @ApiResponse({ status: 404, description: 'Farm not found' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  async getFarm(
    @Request() req,
    @Param('id') farmId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.farmsService.getFarm(req.user.id, organizationId, farmId);
  }

  @Get(':id/related-data-counts')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get related data counts for a farm',
    description: 'Get counts of related data (parcels, workers, tasks, etc.) for a specific farm',
  })
  @ApiParam({
    name: 'id',
    description: 'Farm ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Related data counts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to farm' })
  @ApiResponse({ status: 404, description: 'Farm not found' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  async getFarmRelatedDataCounts(
    @Request() req,
    @Param('id') farmId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.farmsService.getFarmRelatedDataCounts(req.user.id, organizationId, farmId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new farm' })
  @ApiResponse({ status: 201, description: 'Farm created successfully' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Farm'))
  async create(@Request() req, @Body() createFarmDto: any) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.farmsService.createFarm(req.user.id, organizationId, createFarmDto);
  }

  @Delete()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a farm',
    description:
      'Delete a farm with role-based authorization. Requires system_admin or organization_admin role. Checks for sub-farms and active subscription.',
  })
  @ApiResponse({
    status: 200,
    description: 'Farm deleted successfully',
    type: DeleteFarmResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - farm has sub-farms' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions or invalid subscription' })
  @ApiResponse({ status: 404, description: 'Farm not found' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Farm'))
  async deleteFarm(@Request() req, @Body() deleteFarmDto: DeleteFarmDto) {
    return this.farmsService.deleteFarm(req.user.id, deleteFarmDto);
  }

  @Post('import')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Import farms, parcels, and satellite AOIs',
    description:
      'Import farm data from export format. Supports farms (with hierarchy), parcels, and satellite AOIs. Can skip duplicates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Import completed successfully (may have warnings)',
    type: ImportFarmResponseDto,
  })
  @ApiResponse({
    status: 207,
    description: 'Import partially successful (some errors occurred)',
    type: ImportFarmResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid export data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Farm'))
  async importFarm(@Request() req, @Body() importFarmDto: ImportFarmDto) {
    return this.farmsService.importFarm(req.user.id, importFarmDto);
  }

  @Post('batch-delete')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Batch delete multiple farms',
    description:
      'Delete multiple farms in a single request. Each farm is validated individually. Requires system_admin or organization_admin role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch delete completed (may have partial failures)',
    type: BatchDeleteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid farm IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Farm'))
  async batchDeleteFarms(
    @Request() req,
    @Body() batchDeleteDto: BatchDeleteFarmsDto,
  ) {
    return this.farmsService.batchDeleteFarms(
      req.user.id,
      batchDeleteDto.farm_ids,
    );
  }

  @Post('export')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Export farm data',
    description:
      'Export farms, parcels, and satellite AOIs in structured JSON format. Supports single farm export (with optional sub-farms) or organization-wide export.',
  })
  @ApiResponse({
    status: 200,
    description: 'Export completed successfully',
    type: ExportFarmResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - missing farm_id or organization_id' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to farm or organization' })
  @ApiResponse({ status: 404, description: 'Farm or organization not found' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  async exportFarm(@Request() req, @Body() exportFarmDto: ExportFarmDto) {
    return this.farmsService.exportFarm(req.user.id, exportFarmDto);
  }
}
