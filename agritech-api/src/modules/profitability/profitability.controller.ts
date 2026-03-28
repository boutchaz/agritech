import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProfitabilityService } from './profitability.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { AppAbility } from '../casl/casl-ability.factory';
import {
  CreateCostDto,
  CreateRevenueDto,
  ProfitabilityFiltersDto,
  ProfitabilityDataDto,
  ProfitabilityAnalysisFiltersDto,
} from './dto';

@ApiTags('profitability')
@Controller('profitability')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class ProfitabilityController {
  constructor(private profitabilityService: ProfitabilityService) {}

  @Get('parcels')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get parcels for profitability analysis' })
  @ApiResponse({ status: 200, description: 'Parcels retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Parcel'))
  async getParcels(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.profitabilityService.getParcels(organizationId);
  }

  @Get('costs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get costs with filters' })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiQuery({ name: 'parcel_id', required: false })
  @ApiResponse({ status: 200, description: 'Costs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Cost'))
  async getCosts(
    @Request() req,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('parcel_id') parcelId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.profitabilityService.getCosts(organizationId, {
      start_date: startDate,
      end_date: endDate,
      parcel_id: parcelId,
    });
  }

  @Get('revenues')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenues with filters' })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiQuery({ name: 'parcel_id', required: false })
  @ApiResponse({ status: 200, description: 'Revenues retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Revenue'))
  async getRevenues(
    @Request() req,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('parcel_id') parcelId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.profitabilityService.getRevenues(organizationId, {
      start_date: startDate,
      end_date: endDate,
      parcel_id: parcelId,
    });
  }

  @Get('analytics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profitability analytics' })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiQuery({ name: 'parcel_id', required: false })
  @ApiResponse({
    status: 200,
    description: 'Profitability analytics retrieved successfully',
    type: ProfitabilityDataDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Parcel'))
  async getProfitability(
    @Request() req,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('parcel_id') parcelId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.profitabilityService.getProfitability(organizationId, {
      start_date: startDate,
      end_date: endDate,
      parcel_id: parcelId,
    });
  }

  @Post('costs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new cost' })
  @ApiResponse({ status: 201, description: 'Cost created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Cost'))
  async createCost(@Request() req, @Body() createCostDto: CreateCostDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.profitabilityService.createCost(req.user.id, organizationId, createCostDto);
  }

  @Post('revenues')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new revenue' })
  @ApiResponse({ status: 201, description: 'Revenue created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Revenue'))
  async createRevenue(@Request() req, @Body() createRevenueDto: CreateRevenueDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.profitabilityService.createRevenue(req.user.id, organizationId, createRevenueDto);
  }

  @Get('parcel/:parcelId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comprehensive profitability data for a parcel' })
  @ApiParam({ name: 'parcelId', description: 'Parcel ID' })
  @ApiQuery({ name: 'start_date', required: true })
  @ApiQuery({ name: 'end_date', required: true })
  @ApiResponse({ status: 200, description: 'Parcel profitability data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Parcel'))
  async getParcelProfitability(
    @Request() req,
    @Param('parcelId') parcelId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.profitabilityService.getParcelProfitability(
      organizationId,
      parcelId,
      startDate,
      endDate,
    );
  }

  @Get('parcel/:parcelId/journal-entries')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get journal entries for a parcel' })
  @ApiParam({ name: 'parcelId', description: 'Parcel ID' })
  @ApiQuery({ name: 'start_date', required: true })
  @ApiQuery({ name: 'end_date', required: true })
  @ApiResponse({ status: 200, description: 'Journal entries retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'JournalEntry'))
  async getJournalEntriesForParcel(
    @Request() req,
    @Param('parcelId') parcelId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.profitabilityService.getJournalEntriesForParcel(
      organizationId,
      parcelId,
      startDate,
      endDate,
    );
  }

  @Get('analysis')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Multi-filter financial analysis: aggregate costs & revenues by org/farm/parcel/crop/variety' })
  @ApiQuery({ name: 'filter_type', required: false, enum: ['organization', 'farm', 'parcel', 'crop_type', 'variety'] })
  @ApiQuery({ name: 'filter_value', required: false })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiResponse({ status: 200, description: 'Analysis data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Parcel'))
  async getAnalysis(
    @Request() req,
    @Query('filter_type') filterType?: string,
    @Query('filter_value') filterValue?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    const filters: ProfitabilityAnalysisFiltersDto = {
      filter_type: filterType as any,
      filter_value: filterValue,
      start_date: startDate,
      end_date: endDate,
    };
    return this.profitabilityService.getAnalysis(organizationId, filters);
  }

  @Get('account-mappings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get account mappings for profitability journal entries' })
  @ApiResponse({ status: 200, description: 'Account mappings retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Account'))
  async getAccountMappings(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.profitabilityService.getAccountMappings(organizationId);
  }
}
