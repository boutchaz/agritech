import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { CampaignsService } from './campaigns.service';

@ApiTags('Campaign Summary')
@ApiBearerAuth()
@Controller('campaign-summary')
@RequireModule('production')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
export class CampaignSummaryController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Get campaign summaries with aggregated crop cycle data' })
  @ApiResponse({ status: 200, description: 'Campaign summaries retrieved successfully' })
  getSummary(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.campaignsService.getSummary(organizationId);
  }
}
