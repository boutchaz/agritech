import {
  Controller,
  Get,
  Post,
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
import { SatelliteIndicesService } from './satellite-indices.service';
import { SatelliteIndexFiltersDto, CreateSatelliteIndexDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@ApiTags('satellite-indices')
@ApiBearerAuth()
@Controller('satellite-indices')
@RequireModule('satellite')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
export class SatelliteIndicesController {
  constructor(private readonly satelliteIndicesService: SatelliteIndicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all satellite indices data' })
  @ApiQuery({ name: 'parcel_id', required: false, type: String })
  @ApiQuery({ name: 'farm_id', required: false, type: String })
  @ApiQuery({ name: 'index_name', required: false, type: String })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiQuery({ name: 'created_at_from', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Satellite indices retrieved successfully',
  })
  async findAll(@Req() req, @Query() filters: SatelliteIndexFiltersDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.satelliteIndicesService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single satellite index by ID' })
  @ApiParam({ name: 'id', description: 'Satellite Index ID' })
  @ApiResponse({
    status: 200,
    description: 'Satellite index retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Satellite index not found' })
  async findOne(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.satelliteIndicesService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new satellite index entry' })
  @ApiResponse({
    status: 201,
    description: 'Satellite index created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Req() req, @Body() dto: CreateSatelliteIndexDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.satelliteIndicesService.create(dto, organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a satellite index entry' })
  @ApiParam({ name: 'id', description: 'Satellite Index ID' })
  @ApiResponse({
    status: 200,
    description: 'Satellite index deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Satellite index not found' })
  async delete(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.satelliteIndicesService.delete(id, organizationId);
  }
}
