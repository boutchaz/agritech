import { Controller, Delete, Body, UseGuards, Request, Get, Query, Post, Put, Param } from '@nestjs/common';
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
import { ListParcelsResponseDto } from './dto/list-parcels.dto';

@ApiTags('parcels')
@Controller('parcels')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ParcelsController {
  constructor(private parcelsService: ParcelsService) { }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List parcels for an organization or farm',
    description: 'Get all parcels for an organization, optionally filtered by farm_id',
  })
  @ApiQuery({
    name: 'organization_id',
    required: true,
    description: 'Organization ID to fetch parcels for',
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
    @Query('organization_id') organizationId: string,
    @Query('farm_id') farmId?: string,
  ) {
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

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a parcel',
    description:
      'Delete a parcel with subscription validation. Checks for active subscription before deletion.',
  })
  @ApiResponse({
    status: 200,
    description: 'Parcel deleted successfully',
    type: DeleteParcelResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - invalid subscription' })
  @ApiResponse({ status: 404, description: 'Parcel or farm not found' })
  async deleteParcel(@Request() req, @Body() deleteParcelDto: DeleteParcelDto) {
    return this.parcelsService.deleteParcel(req.user.id, deleteParcelDto);
  }
}
