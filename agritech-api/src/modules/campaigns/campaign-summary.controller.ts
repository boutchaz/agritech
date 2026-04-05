import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { CampaignsService } from './campaigns.service';

@ApiTags('Campaign Summary')
@ApiBearerAuth()
@Controller('campaign-summary')
@UseGuards(JwtAuthGuard, OrganizationGuard)
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
