import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AiAlertRecord,
  AiAlertsService,
} from './ai-alerts.service';

@ApiTags('ai-alerts')
@ApiBearerAuth()
@Controller()
@RequireModule('agromind_advisor')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
export class AiAlertsController {
  constructor(private readonly aiAlertsService: AiAlertsService) {}

  @Get('parcels/:parcelId/ai/alerts')
  @ApiOperation({ summary: 'Get all AI alerts for a parcel' })
  @ApiResponse({ status: 200, description: 'AI alerts retrieved successfully' })
  async getAlerts(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<AiAlertRecord[]> {
    const organizationId = this.getOrganizationId(req);

    return this.aiAlertsService.getAlerts(parcelId, organizationId);
  }

  @Get('parcels/:parcelId/ai/alerts/active')
  @ApiOperation({ summary: 'Get active AI alerts for a parcel' })
  @ApiResponse({ status: 200, description: 'Active AI alerts retrieved successfully' })
  async getActiveAlerts(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<AiAlertRecord[]> {
    const organizationId = this.getOrganizationId(req);

    return this.aiAlertsService.getActiveAlerts(parcelId, organizationId);
  }

  @Patch('ai/alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an AI alert' })
  @ApiResponse({ status: 200, description: 'AI alert acknowledged successfully' })
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Req() req: Request,
  ): Promise<AiAlertRecord> {
    const organizationId = this.getOrganizationId(req);

    return this.aiAlertsService.acknowledgeAlert(alertId, organizationId);
  }

  @Patch('ai/alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve an AI alert' })
  @ApiResponse({ status: 200, description: 'AI alert resolved successfully' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Req() req: Request,
  ): Promise<AiAlertRecord> {
    const organizationId = this.getOrganizationId(req);

    return this.aiAlertsService.resolveAlert(alertId, organizationId);
  }

  private getOrganizationId(req: Request): string {
    const headerValue = req.headers['x-organization-id'];
    const organizationId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    return organizationId;
  }
}
