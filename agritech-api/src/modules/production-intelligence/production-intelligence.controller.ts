import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductionIntelligenceService } from './production-intelligence.service';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import {
  YieldHistoryFiltersDto,
  CreateYieldHistoryDto,
  ForecastFiltersDto,
  CreateForecastDto,
  UpdateForecastDto,
  BenchmarkFiltersDto,
  CreateBenchmarkDto,
  AlertFiltersDto,
  ParcelPerformanceFiltersDto,
} from './dto';

@ApiTags('Production Intelligence')
@ApiBearerAuth()
@Controller('organizations/:organizationId/production-intelligence')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class ProductionIntelligenceController {
  constructor(
    private readonly productionIntelligenceService: ProductionIntelligenceService,
  ) {}

  @Get('yield-history')
  @ApiOperation({ summary: 'Get yield history records' })
  @ApiResponse({ status: 200, description: 'Yield history retrieved successfully' })
  async getYieldHistory(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: YieldHistoryFiltersDto,
  ) {
    return this.productionIntelligenceService.getYieldHistory(
      req.user.userId,
      organizationId,
      filters,
    );
  }

  @Post('yield-history')
  @ApiOperation({ summary: 'Create yield history record' })
  @ApiResponse({ status: 201, description: 'Yield history created successfully' })
  async createYieldHistory(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateYieldHistoryDto,
  ) {
    return this.productionIntelligenceService.createYieldHistory(
      req.user.userId,
      organizationId,
      createDto,
    );
  }

  @Get('forecasts')
  @ApiOperation({ summary: 'Get harvest forecasts' })
  @ApiResponse({ status: 200, description: 'Forecasts retrieved successfully' })
  async getForecasts(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: ForecastFiltersDto,
  ) {
    return this.productionIntelligenceService.getForecasts(
      req.user.userId,
      organizationId,
      filters,
    );
  }

  @Post('forecasts')
  @ApiOperation({ summary: 'Create harvest forecast' })
  @ApiResponse({ status: 201, description: 'Forecast created successfully' })
  async createForecast(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateForecastDto,
  ) {
    return this.productionIntelligenceService.createForecast(
      req.user.userId,
      organizationId,
      createDto,
    );
  }

  @Patch('forecasts/:id')
  @ApiOperation({ summary: 'Update harvest forecast' })
  @ApiResponse({ status: 200, description: 'Forecast updated successfully' })
  async updateForecast(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') forecastId: string,
    @Body() updateDto: UpdateForecastDto,
  ) {
    return this.productionIntelligenceService.updateForecast(
      req.user.userId,
      organizationId,
      forecastId,
      updateDto,
    );
  }

  @Get('benchmarks')
  @ApiOperation({ summary: 'Get yield benchmarks' })
  @ApiResponse({ status: 200, description: 'Benchmarks retrieved successfully' })
  async getBenchmarks(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: BenchmarkFiltersDto,
  ) {
    return this.productionIntelligenceService.getBenchmarks(
      req.user.userId,
      organizationId,
      filters,
    );
  }

  @Post('benchmarks')
  @ApiOperation({ summary: 'Create yield benchmark' })
  @ApiResponse({ status: 201, description: 'Benchmark created successfully' })
  async createBenchmark(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateBenchmarkDto,
  ) {
    return this.productionIntelligenceService.createBenchmark(
      req.user.userId,
      organizationId,
      createDto,
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get performance alerts' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  async getAlerts(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: AlertFiltersDto,
  ) {
    return this.productionIntelligenceService.getAlerts(
      req.user.userId,
      organizationId,
      filters,
    );
  }

  @Patch('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge performance alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged successfully' })
  async acknowledgeAlert(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') alertId: string,
  ) {
    return this.productionIntelligenceService.acknowledgeAlert(
      req.user.userId,
      organizationId,
      alertId,
    );
  }

  @Patch('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve performance alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  async resolveAlert(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') alertId: string,
    @Body() body: { resolution_notes: string },
  ) {
    return this.productionIntelligenceService.resolveAlert(
      req.user.userId,
      organizationId,
      alertId,
      body.resolution_notes,
    );
  }

  @Get('parcel-performance')
  @ApiOperation({ summary: 'Get parcel performance summary' })
  @ApiResponse({ status: 200, description: 'Performance summary retrieved successfully' })
  async getParcelPerformance(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: ParcelPerformanceFiltersDto,
  ) {
    return this.productionIntelligenceService.getParcelPerformance(
      req.user.userId,
      organizationId,
      filters,
    );
  }
}
