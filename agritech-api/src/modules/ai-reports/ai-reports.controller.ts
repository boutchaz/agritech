import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AIReportsService } from './ai-reports.service';
import { GenerateAIReportDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('ai-reports')
@ApiBearerAuth()
@Controller('ai-reports')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class AIReportsController {
  constructor(private readonly aiReportsService: AIReportsService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Get available AI providers' })
  @ApiResponse({
    status: 200,
    description: 'List of AI providers and their availability status',
  })
  async getProviders(
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.aiReportsService.getAvailableProviders(organizationId);
  }

  @Get('data-availability/:parcelId')
  @ApiOperation({ summary: 'Get data availability for AI report generation' })
  @ApiResponse({
    status: 200,
    description: 'Data availability summary for the parcel',
  })
  async getDataAvailability(
    @Req() req,
    @Headers('x-organization-id') organizationId: string,
    @Param('parcelId') parcelId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.aiReportsService.getDataAvailability(
      organizationId,
      parcelId,
      startDate,
      endDate,
    );
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate an AI-powered parcel report',
    description:
      'Aggregates soil, water, satellite, and weather data to generate comprehensive AI analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Report generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or AI provider not configured',
  })
  @ApiResponse({
    status: 500,
    description: 'AI generation failed',
  })
  async generateReport(
    @Req() req,
    @Body() dto: GenerateAIReportDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    return this.aiReportsService.generateReport(organizationId, userId, dto);
  }
}
