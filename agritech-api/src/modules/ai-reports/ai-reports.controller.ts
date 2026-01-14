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
import { GenerateAIReportDto, CalibrateRequestDto, FetchDataRequestDto } from './dto';
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

  @Get('parcels/:parcelId/calibration-status')
  @ApiOperation({ summary: 'Get calibration status for a parcel' })
  @ApiResponse({
    status: 200,
    description: 'Calibration status retrieved successfully',
  })
  async getCalibrationStatus(
    @Headers('x-organization-id') organizationId: string,
    @Param('parcelId') parcelId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.aiReportsService.validateAnalysis(organizationId, parcelId, startDate, endDate);
  }

  @Post('parcels/:parcelId/calibrate')
  @ApiOperation({ summary: 'Trigger calibration and validation for a parcel' })
  @ApiResponse({
    status: 200,
    description: 'Calibration completed successfully',
  })
  async calibrate(
    @Headers('x-organization-id') organizationId: string,
    @Param('parcelId') parcelId: string,
    @Body() dto: CalibrateRequestDto,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.aiReportsService.recalibrate(organizationId, parcelId, dto);
  }

  @Post('parcels/:parcelId/fetch-data')
  @ApiOperation({ summary: 'Manually trigger data fetching for specified sources' })
  @ApiResponse({
    status: 200,
    description: 'Data fetch completed',
  })
  async fetchData(
    @Headers('x-organization-id') organizationId: string,
    @Param('parcelId') parcelId: string,
    @Body() dto: FetchDataRequestDto,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.aiReportsService.fetchData(organizationId, parcelId, dto);
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

    // Validate data before generating report
    const calibrationStatus = await this.aiReportsService.validateAnalysis(
      organizationId,
      dto.parcel_id,
      dto.data_start_date,
      dto.data_end_date,
    );

    if (calibrationStatus.status === 'blocked') {
      throw new BadRequestException(
        `Analysis cannot proceed: Missing critical data (${calibrationStatus.missingData.join(', ')}). Please recalibrate and fetch missing data.`,
      );
    }

    return this.aiReportsService.generateReport(organizationId, userId, dto);
  }
}
