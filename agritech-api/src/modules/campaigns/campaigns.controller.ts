import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CampaignFiltersDto } from './dto/campaign-filters.dto';
import { CampaignStatus } from './dto/create-campaign.dto';

@ApiTags('Campaigns')
@ApiBearerAuth()
@Controller('campaigns')
@RequireModule('production')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  @ApiQuery({ type: CampaignFiltersDto, required: false })
  findAll(@Request() req, @Query() filters: CampaignFiltersDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.campaignsService.findAll(organizationId, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get campaigns statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.campaignsService.getStatistics(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  findOne(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.campaignsService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  create(@Request() req, @Body() createDto: CreateCampaignDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.campaignsService.create(organizationId, req.user.id, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: Partial<CreateCampaignDto>,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.campaignsService.update(id, organizationId, req.user.id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  remove(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.campaignsService.remove(id, organizationId);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update campaign status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: CampaignStatus,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.campaignsService.updateStatus(id, organizationId, req.user.id, status);
  }
}
