import { Controller, Delete, Get, Post, Patch, Body, UseGuards, Request, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FarmsService } from './farms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
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
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class FarmsController {
  constructor(private farmsService: FarmsService) { }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List farms for an organization',
    description: 'Get all farms for an organization with parcel counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Farms retrieved successfully',
    type: ListFarmsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  // Note: No PoliciesGuard here - the service validates organization membership internally
  // This allows new users to list farms during trial setup flow
  async listFarms(
    @Request() req,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    console.log('========== [FarmsController] GET /farms ENTERED ==========');
    console.log('[FarmsController] GET /farms called', {
      userId: req.user?.id,
      organizationId,
    });
    return this.farmsService.listFarms(req.user.id, organizationId);
  }

  @Get('roles/available')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List available farm roles',
    description: 'Get predefined farm role templates with permissions',
  })
  @ApiResponse({ status: 200, description: 'Farm roles retrieved successfully' })
  async getAvailableRoles() {
    return this.farmsService.getAvailableFarmRoles();
  }

  @Get('user-roles/:userId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get farm roles assigned to a user',
    description: 'List farm roles for a user within the current organization',
  })
  @ApiResponse({ status: 200, description: 'User farm roles retrieved successfully' })
  async getUserFarmRoles(
    @Request() req,
    @Param('userId') userId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.farmsService.getUserFarmRoles(organizationId, userId);
  }

  @Get(':farmId/roles')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List role assignments for a farm' })
  @ApiResponse({ status: 200, description: 'Farm roles retrieved successfully' })
  async getFarmRoles(
    @Request() req,
    @Param('farmId') farmId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.farmsService.getFarmRoles(req.user.id, organizationId, farmId);
  }

  @Post(':farmId/roles')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a role to a farm user' })
  @ApiResponse({ status: 201, description: 'Farm role assigned successfully' })
  async assignFarmRole(
    @Request() req,
    @Param('farmId') farmId: string,
    @Body() body: { user_id: string; role: string },
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.farmsService.assignFarmRole(req.user.id, organizationId, farmId, body);
  }

  @Delete(':farmId/roles/:roleId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a farm role assignment' })
  @ApiResponse({ status: 200, description: 'Farm role removed successfully' })
  async removeFarmRole(
    @Request() req,
    @Param('farmId') farmId: string,
    @Param('roleId') roleId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.farmsService.removeFarmRole(req.user.id, organizationId, farmId, roleId);
  }

  @Get(':farmId/organization-users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List organization users for a farm' })
  @ApiResponse({ status: 200, description: 'Organization users retrieved successfully' })
  async getOrganizationUsersForFarm(
    @Request() req,
    @Param('farmId') farmId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.farmsService.getOrganizationUsersForFarm(req.user.id, organizationId, farmId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(PoliciesGuard)
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
  @UseGuards(PoliciesGuard)
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
  @UseGuards(PoliciesGuard)
  @ApiOperation({ summary: 'Create a new farm' })
  @ApiResponse({ status: 201, description: 'Farm created successfully' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Farm'))
  async create(@Request() req, @Body() createFarmDto: any) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.farmsService.createFarm(req.user.id, organizationId, createFarmDto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(PoliciesGuard)
  @ApiOperation({ summary: 'Update a farm' })
  @ApiResponse({ status: 200, description: 'Farm updated successfully' })
  @ApiResponse({ status: 404, description: 'Farm not found' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Farm'))
  async update(@Request() req, @Param('id') farmId: string, @Body() updateFarmDto: any) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.farmsService.updateFarm(req.user.id, organizationId, farmId, updateFarmDto);
  }

  @Delete()
  @ApiBearerAuth()
  @UseGuards(PoliciesGuard)
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
  @UseGuards(PoliciesGuard)
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
  @UseGuards(PoliciesGuard)
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
  @UseGuards(PoliciesGuard)
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
