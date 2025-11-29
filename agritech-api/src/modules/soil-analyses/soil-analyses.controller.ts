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
import { SoilAnalysesService } from './soil-analyses.service';
import { SoilAnalysisFiltersDto, CreateSoilAnalysisDto, UpdateSoilAnalysisDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('soil-analyses')
@ApiBearerAuth()
@Controller('soil-analyses')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class SoilAnalysesController {
  constructor(private readonly soilAnalysesService: SoilAnalysesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all soil analyses' })
  @ApiQuery({ name: 'parcel_id', required: false, type: String })
  @ApiQuery({ name: 'parcel_ids', required: false, type: String, description: 'Comma-separated parcel IDs' })
  @ApiQuery({ name: 'test_type_id', required: false, type: String })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Soil analyses retrieved successfully',
  })
  async findAll(@Req() req, @Query() filters: SoilAnalysisFiltersDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.soilAnalysesService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single soil analysis by ID' })
  @ApiParam({ name: 'id', description: 'Soil Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'Soil analysis retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Soil analysis not found' })
  async findOne(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.soilAnalysesService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new soil analysis' })
  @ApiResponse({
    status: 201,
    description: 'Soil analysis created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Req() req, @Body() dto: CreateSoilAnalysisDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.soilAnalysesService.create(dto, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a soil analysis' })
  @ApiParam({ name: 'id', description: 'Soil Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'Soil analysis updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Soil analysis not found' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateSoilAnalysisDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.soilAnalysesService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a soil analysis' })
  @ApiParam({ name: 'id', description: 'Soil Analysis ID' })
  @ApiResponse({
    status: 200,
    description: 'Soil analysis deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Soil analysis not found' })
  async delete(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.soilAnalysesService.delete(id, organizationId);
  }
}
