import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiQuotaService } from './ai-quota.service';

@ApiTags('ai-quota')
@Controller('ai-quota')
@UseGuards(JwtAuthGuard)
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
}
