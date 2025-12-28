import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalysesService } from './analyses.service';
import {
  CreateAnalysisDto,
  UpdateAnalysisDto,
  AnalysisFiltersDto,
  CreateRecommendationDto,
  UpdateRecommendationDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('analyses')
@ApiBearerAuth()
@Controller('analyses')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all analyses' })
  @ApiQuery({ name: 'parcel_id', required: false, type: String, description: 'Single parcel ID filter' })
  @ApiQuery({ name: 'parcel_ids', required: false, type: String, description: 'Comma-separated parcel IDs' })
  @ApiQuery({ name: 'farm_id', required: false, type: String, description: 'Farm ID (fetches all parcels for this farm)' })
  @ApiQuery({ name: 'analysis_type', required: false, enum: ['soil', 'plant', 'water'] })
  @ApiQuery({ name: 'date_from', required: false, type: String, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date_to', required: false, type: String, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Analyses retrieved successfully',
  })
  async findAll(@Req() req, @Query() filters: AnalysisFiltersDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.analysesService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single analysis by ID' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'Analysis retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async findOne(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.analysesService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new analysis' })
  @ApiResponse({
    status: 201,
    description: 'Analysis created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Req() req, @Body() dto: CreateAnalysisDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.analysesService.create(dto, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an analysis' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'Analysis updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateAnalysisDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.analysesService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an analysis' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'Analysis deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Analysis not found' })
  async delete(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.analysesService.delete(id, organizationId);
  }

  @Get(':analysisId/recommendations')
  @ApiOperation({ summary: 'Get recommendations for an analysis' })
  @ApiParam({ name: 'analysisId', description: 'Analysis ID' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  async getRecommendations(@Req() req, @Param('analysisId') analysisId: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.analysesService.getRecommendations(analysisId, organizationId);
  }

  @Post(':analysisId/recommendations')
  @ApiOperation({ summary: 'Create a recommendation for an analysis' })
  @ApiParam({ name: 'analysisId', description: 'Analysis ID' })
  @ApiResponse({ status: 201, description: 'Recommendation created successfully' })
  async createRecommendation(
    @Req() req,
    @Param('analysisId') analysisId: string,
    @Body() dto: CreateRecommendationDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.analysesService.createRecommendation(
      { ...dto, analysis_id: analysisId },
      organizationId,
    );
  }

  @Patch('recommendations/:recommendationId')
  @ApiOperation({ summary: 'Update a recommendation' })
  @ApiParam({ name: 'recommendationId', description: 'Recommendation ID' })
  @ApiResponse({ status: 200, description: 'Recommendation updated successfully' })
  async updateRecommendation(
    @Req() req,
    @Param('recommendationId') recommendationId: string,
    @Body() dto: UpdateRecommendationDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.analysesService.updateRecommendation(recommendationId, organizationId, dto);
  }

  @Delete('recommendations/:recommendationId')
  @ApiOperation({ summary: 'Delete a recommendation' })
  @ApiParam({ name: 'recommendationId', description: 'Recommendation ID' })
  @ApiResponse({ status: 200, description: 'Recommendation deleted successfully' })
  async deleteRecommendation(
    @Req() req,
    @Param('recommendationId') recommendationId: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.analysesService.deleteRecommendation(recommendationId, organizationId);
  }
}
