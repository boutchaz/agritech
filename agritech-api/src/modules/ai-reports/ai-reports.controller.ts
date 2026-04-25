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
import { GenerateAIReportDto, CalibrateRequestDto, FetchDataRequestDto, AIReportJobResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@ApiTags('ai-reports')
@ApiBearerAuth()
@Controller('ai-reports')
@RequireModule('agromind_advisor')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
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
    summary: 'Start async AI report generation',
    description:
      'Starts background AI report generation. Returns job ID immediately for polling.',
  })
  @ApiResponse({
    status: 202,
    description: 'Job created successfully',
    type: AIReportJobResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or AI provider not configured',
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

    return this.aiReportsService.createReportJob(organizationId, userId, dto);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get AI report job status' })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved',
    type: AIReportJobResponseDto,
  })
  async getJobStatus(
    @Headers('x-organization-id') organizationId: string,
    @Param('jobId') jobId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.aiReportsService.getJobStatus(organizationId, jobId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List recent AI report jobs' })
  @ApiResponse({
    status: 200,
    description: 'Jobs retrieved',
  })
  async listJobs(
    @Headers('x-organization-id') organizationId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.aiReportsService.listJobs(organizationId, status, limit || 10);
  }
}
