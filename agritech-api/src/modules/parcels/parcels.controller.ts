import { Controller, Delete, Body, UseGuards, Request, Get, Query, Post, Put, Patch, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ParcelsService } from './parcels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { AppAbility } from '../casl/casl-ability.factory';
import {
  DeleteParcelDto,
  DeleteParcelResponseDto,
} from './dto/delete-parcel.dto';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelDto } from './dto/update-parcel.dto';
import {
  GetParcelResponseDto,
  ListParcelsResponseDto,
} from './dto/list-parcels.dto';
import { ListParcelApplicationsResponseDto } from './dto/list-parcel-applications.dto';

@ApiTags('parcels')
@Controller('parcels')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
export class ParcelsController {
  constructor(private parcelsService: ParcelsService) { }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List parcels for an organization or farm',
    description: 'Get all parcels for an organization, optionally filtered by farm_id',
  })
  @ApiQuery({
    name: 'farm_id',
    required: false,
    description: 'Optional farm ID to filter parcels',
  })
  @ApiResponse({
    status: 200,
    description: 'Parcels retrieved successfully',
    type: ListParcelsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Parcel'))
  async listParcels(
    @Request() req,
    @Query('farm_id') farmId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.parcelsService.listParcels(req.user.id, organizationId, farmId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new parcel' })
  @ApiResponse({ status: 201, description: 'Parcel created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  @ApiResponse({ status: 404, description: 'Farm not found' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Parcel'))
  async createParcel(
    @Request() req,
    @Body() createParcelDto: CreateParcelDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.parcelsService.createParcel(req.user.id, organizationId, createParcelDto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing parcel' })
  @ApiParam({
    name: 'id',
    description: 'Parcel ID to update',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Parcel updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  @ApiResponse({ status: 404, description: 'Parcel not found' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Parcel'))
  async updateParcel(
    @Request() req,
    @Param('id') parcelId: string,
    @Body() updateParcelDto: UpdateParcelDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.parcelsService.updateParcel(req.user.id, organizationId, parcelId, updateParcelDto);
  }

  @Get('performance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get parcel performance summary' })
  @ApiQuery({ name: 'farmId', required: false })
  @ApiQuery({ name: 'parcelId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Parcel'))
  async getPerformanceSummary(
    @Request() req,
    @Query('farmId') farmId?: string,
    @Query('parcelId') parcelId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.parcelsService.getPerformanceSummary(
      req.user.id,
      organizationId,
      {
        farmId,
        parcelId,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      },
    );
  }

  @Get(':id/applications')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get product applications for a parcel',
    description: 'Get all product applications for a specific parcel',
  })
  @ApiParam({
    name: 'id',
    description: 'Parcel ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Applications retrieved successfully',
    type: ListParcelApplicationsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  @ApiResponse({ status: 404, description: 'Parcel not found' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Parcel'))
  async getParcelApplications(
    @Request() req,
    @Param('id') parcelId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.parcelsService.getParcelApplications(
      req.user.id,
      organizationId,
      parcelId,
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a single parcel',
    description:
      'Returns one parcel by ID when it belongs to the current organization.',
  })
  @ApiParam({
    name: 'id',
    description: 'Parcel ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Parcel retrieved successfully',
    type: GetParcelResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  @ApiResponse({ status: 404, description: 'Parcel not found' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Parcel'))
  async getParcel(@Request() req, @Param('id') parcelId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.parcelsService.getParcel(req.user.id, organizationId, parcelId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Archive a parcel (soft delete)',
    description:
      'Archives a parcel by setting is_active=false. All related historical data (harvests, costs, tasks) is preserved.',
  })
  @ApiResponse({
    status: 200,
    description: 'Parcel archived successfully',
    type: DeleteParcelResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - invalid subscription' })
  @ApiResponse({ status: 404, description: 'Parcel or farm not found' })
  async deleteParcel(@Request() req, @Body() deleteParcelDto: DeleteParcelDto) {
    return this.parcelsService.archiveParcel(req.user.id, deleteParcelDto);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Restore an archived parcel',
    description: 'Restores a previously archived parcel by setting is_active=true.',
  })
  @ApiParam({ name: 'id', description: 'Parcel ID to restore', type: String })
  @ApiResponse({ status: 200, description: 'Parcel restored successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - subscription limit reached' })
  @ApiResponse({ status: 404, description: 'Parcel not found' })
  async restoreParcel(@Request() req, @Param('id') parcelId: string) {
    return this.parcelsService.restoreParcel(req.user.id, parcelId);
  }
}
