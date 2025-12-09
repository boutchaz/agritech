import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportFiltersDto, ReportType } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('available')
  @ApiOperation({ summary: 'Get available report types for organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Available report types retrieved successfully',
  })
  async getAvailableReports(@Param('organizationId') organizationId: string) {
    return this.reportsService.getAvailableReports(organizationId);
  }

  @Get('generate')
  @ApiOperation({ summary: 'Generate a report' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({ name: 'report_type', enum: ReportType, description: 'Type of report to generate' })
  @ApiQuery({ name: 'start_date', required: false, type: String, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, type: String, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'parcel_id', required: false, type: String, description: 'Parcel ID filter' })
  @ApiQuery({ name: 'farm_id', required: false, type: String, description: 'Farm ID filter' })
  @ApiResponse({
    status: 200,
    description: 'Report generated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid report type or filters' })
  async generateReport(
    @Param('organizationId') organizationId: string,
    @Query() filters: ReportFiltersDto
  ) {
    return this.reportsService.generateReport(organizationId, filters);
  }
}
