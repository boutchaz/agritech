import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { AiQuotaService } from './ai-quota.service';

@ApiTags('ai-quota')
@Controller('ai-quota')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class AiQuotaController {
  constructor(private readonly aiQuotaService: AiQuotaService) {}

  @Get()
  @ApiOperation({ summary: 'Get current AI quota status for the organization' })
  @ApiResponse({
    status: 200,
    description: 'Current AI quota status including usage, limits, and BYOK status',
  })
  async getQuotaStatus(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.aiQuotaService.getQuotaStatus(organizationId);
  }

  @Get('usage-log')
  @ApiOperation({ summary: 'Get detailed AI usage log with token aggregates' })
  @ApiResponse({
    status: 200,
    description: 'Daily token aggregates and recent usage entries for current billing period',
  })
  async getUsageLog(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.aiQuotaService.getUsageLog(organizationId);
  }
}
