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
import { CropCyclesService } from './crop-cycles.service';
import { CreateCropCycleDto } from './dto/create-crop-cycle.dto';
import { CropCycleFiltersDto } from './dto/crop-cycle-filters.dto';
import { CropCyclePnLFiltersDto } from './dto/crop-cycle-pnl-filters.dto';
import { CropCycleStatus } from './dto/create-crop-cycle.dto';

@ApiTags('Crop Cycles')
@ApiBearerAuth()
@Controller('crop-cycles')
@RequireModule('production')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
export class CropCyclesController {
  constructor(private readonly cropCyclesService: CropCyclesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all crop cycles' })
  @ApiResponse({ status: 200, description: 'Crop cycles retrieved successfully' })
  @ApiQuery({ type: CropCycleFiltersDto, required: false })
  findAll(@Request() req, @Query() filters: CropCycleFiltersDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropCyclesService.findAll(organizationId, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get crop cycles statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropCyclesService.getStatistics(organizationId);
  }

  @Get('pnl')
  @ApiOperation({ summary: 'Get crop cycle profit & loss (reporting view)' })
  @ApiResponse({ status: 200, description: 'PnL rows retrieved successfully' })
  @ApiQuery({ type: CropCyclePnLFiltersDto, required: false })
  getPnL(@Request() req, @Query() filters: CropCyclePnLFiltersDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropCyclesService.getPnL(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get crop cycle by ID' })
  @ApiResponse({ status: 200, description: 'Crop cycle retrieved successfully' })
  findOne(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropCyclesService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create crop cycle' })
  @ApiResponse({ status: 201, description: 'Crop cycle created successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  create(@Request() req, @Body() createDto: CreateCropCycleDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropCyclesService.create(organizationId, req.user.id, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update crop cycle' })
  @ApiResponse({ status: 200, description: 'Crop cycle updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: Partial<CreateCropCycleDto>,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropCyclesService.update(id, organizationId, req.user.id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete crop cycle' })
  @ApiResponse({ status: 200, description: 'Crop cycle deleted successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  remove(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropCyclesService.remove(id, organizationId);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update crop cycle status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: CropCycleStatus,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropCyclesService.updateStatus(id, organizationId, req.user.id, status);
  }
}
