import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { OrgSetupService } from './org-setup.service';

@ApiTags('org-setup')
@ApiBearerAuth('JWT-auth')
@Controller('org-setup')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class OrgSetupController {
  constructor(private readonly orgSetupService: OrgSetupService) {}

  @Post(':organizationId/seed-work-units')
  @ApiOperation({ summary: 'Seed default work units for an organization' })
  @ApiResponse({ status: 200, description: 'Work units seeded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async seedWorkUnits(@Param('organizationId') organizationId: string) {
    return this.orgSetupService.seedDefaultWorkUnits(organizationId);
  }

  @Post(':organizationId/fiscal-year')
  @ApiOperation({ summary: 'Create default fiscal year for an organization' })
  @ApiResponse({ status: 200, description: 'Fiscal year created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createFiscalYear(
    @Param('organizationId') organizationId: string,
    @Body() body: { year?: number },
  ) {
    return this.orgSetupService.createDefaultFiscalYear(organizationId, body?.year);
  }

  @Post(':organizationId/morocco-campaign')
  @ApiOperation({ summary: 'Create Morocco campaign for an organization' })
  @ApiResponse({ status: 200, description: 'Campaign created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createMoroccoCampaign(
    @Param('organizationId') organizationId: string,
    @Body() body: { year?: number },
  ) {
    return this.orgSetupService.createMoroccoCampaign(organizationId, body?.year);
  }

  @Post(':organizationId/initialize')
  @ApiOperation({ summary: 'Initialize organization with default setup (work units, fiscal year, campaign)' })
  @ApiResponse({ status: 200, description: 'Organization initialized successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initializeOrganization(
    @Param('organizationId') organizationId: string,
    @Body() options: {
      skipWorkUnits?: boolean;
      skipFiscalYear?: boolean;
      skipCampaign?: boolean;
      fiscalYear?: number;
      campaignYear?: number;
    },
  ) {
    return this.orgSetupService.initializeOrganization(organizationId, options);
  }
}
