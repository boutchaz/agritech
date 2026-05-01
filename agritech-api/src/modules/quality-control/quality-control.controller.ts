import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { QualityControlService } from './quality-control.service';
import { CreateQualityInspectionDto } from './dto/create-quality-inspection.dto';
import { QualityInspectionFiltersDto } from './dto/quality-inspection-filters.dto';
import { InspectionStatus } from './dto/create-quality-inspection.dto';

@ApiTags('Quality Control')
@ApiBearerAuth()
@Controller('quality-control')
@RequireModule('production')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
export class QualityControlController {
  constructor(private readonly qualityControlService: QualityControlService) {}

  @Get()
  @ApiOperation({ summary: 'Get all quality inspections' })
  @ApiResponse({ status: 200, description: 'Quality inspections retrieved successfully' })
  @ApiQuery({ type: QualityInspectionFiltersDto, required: false })
  findAll(@Request() req, @Query() filters: QualityInspectionFiltersDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.qualityControlService.findAll(organizationId, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get quality control statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.qualityControlService.getStatistics(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quality inspection by ID' })
  @ApiResponse({ status: 200, description: 'Quality inspection retrieved successfully' })
  findOne(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.qualityControlService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create quality inspection' })
  @ApiResponse({ status: 201, description: 'Quality inspection created successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  create(@Request() req, @Body() createDto: CreateQualityInspectionDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.qualityControlService.create(organizationId, req.user.id, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update quality inspection' })
  @ApiResponse({ status: 200, description: 'Quality inspection updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: Partial<CreateQualityInspectionDto>,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.qualityControlService.update(id, organizationId, req.user.id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete quality inspection' })
  @ApiResponse({ status: 200, description: 'Quality inspection deleted successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  remove(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.qualityControlService.remove(id, organizationId);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update quality inspection status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: InspectionStatus,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.qualityControlService.updateStatus(id, organizationId, req.user.id, status);
  }
}
