import {
  BadRequestException,
  Controller,
  Get,
  Param,
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
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AiDiagnosticsResponse,
  AiDiagnosticsService,
  AiPhenologyResponse,
  AiTrendsResponse,
  AiWaterBalanceResponse,
} from './ai-diagnostics.service';

@ApiTags('ai-diagnostics')
@ApiBearerAuth()
@Controller('parcels/:parcelId/ai')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class AiDiagnosticsController {
  constructor(private readonly aiDiagnosticsService: AiDiagnosticsService) {}

  @Get('diagnostics')
  @ApiOperation({ summary: 'Get current AI diagnostics scenario for a parcel' })
  @ApiResponse({ status: 200, description: 'AI diagnostics retrieved successfully' })
  async getDiagnostics(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<{ data: AiDiagnosticsResponse }> {
    const organizationId = this.getOrganizationId(req);
    return {
      data: await this.aiDiagnosticsService.getDiagnostics(parcelId, organizationId),
    };
  }

  @Get('phenology')
  @ApiOperation({ summary: 'Get the current phenology stage for a parcel' })
  @ApiResponse({ status: 200, description: 'Phenology stage retrieved successfully' })
  async getPhenology(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<{ data: AiPhenologyResponse }> {
    const organizationId = this.getOrganizationId(req);
    return {
      data: await this.aiDiagnosticsService.getPhenology(parcelId, organizationId),
    };
  }

  @Get('water-balance')
  @ApiOperation({ summary: 'Get the parcel water balance assessment' })
  @ApiResponse({ status: 200, description: 'Water balance retrieved successfully' })
  async getWaterBalance(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<{ data: AiWaterBalanceResponse }> {
    const organizationId = this.getOrganizationId(req);
    return {
      data: await this.aiDiagnosticsService.getWaterBalance(parcelId, organizationId),
    };
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get NDVI trend analysis for a parcel' })
  @ApiResponse({ status: 200, description: 'Trend analysis retrieved successfully' })
  async getTrends(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<{ data: AiTrendsResponse }> {
    const organizationId = this.getOrganizationId(req);
    return {
      data: await this.aiDiagnosticsService.getTrends(parcelId, organizationId),
    };
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
