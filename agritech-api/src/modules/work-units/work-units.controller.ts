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
import { WorkUnitsService } from './work-units.service';
import { WorkUnitFiltersDto, CreateWorkUnitDto, UpdateWorkUnitDto, UnitCategory } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('work-units')
@ApiBearerAuth()
@Controller('work-units')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class WorkUnitsController {
  constructor(private readonly workUnitsService: WorkUnitsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all work units' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'unit_category', required: false, enum: UnitCategory })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Work units retrieved successfully',
  })
  async findAll(@Req() req, @Query() filters: WorkUnitFiltersDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.workUnitsService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single work unit by ID' })
  @ApiParam({ name: 'id', description: 'Work Unit ID' })
  @ApiResponse({
    status: 200,
    description: 'Work unit retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Work unit not found' })
  async findOne(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.workUnitsService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new work unit' })
  @ApiResponse({
    status: 201,
    description: 'Work unit created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or duplicate code' })
  async create(@Req() req, @Body() dto: CreateWorkUnitDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.workUnitsService.create(dto, organizationId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a work unit' })
  @ApiParam({ name: 'id', description: 'Work Unit ID' })
  @ApiResponse({
    status: 200,
    description: 'Work unit updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Work unit not found' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateWorkUnitDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.workUnitsService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a work unit' })
  @ApiParam({ name: 'id', description: 'Work Unit ID' })
  @ApiResponse({
    status: 200,
    description: 'Work unit deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot delete work unit that is being used' })
  @ApiResponse({ status: 404, description: 'Work unit not found' })
  async delete(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.workUnitsService.delete(id, organizationId);
  }
}
