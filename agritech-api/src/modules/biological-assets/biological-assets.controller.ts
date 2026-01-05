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
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { BiologicalAssetsService } from './biological-assets.service';
import { CreateBiologicalAssetDto } from './dto/create-biological-asset.dto';
import { BiologicalAssetFiltersDto } from './dto/biological-asset-filters.dto';
import { BiologicalAssetStatus } from './dto/create-biological-asset.dto';

@ApiTags('Biological Assets')
@ApiBearerAuth()
@Controller('biological-assets')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class BiologicalAssetsController {
  constructor(private readonly biologicalAssetsService: BiologicalAssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all biological assets' })
  @ApiResponse({ status: 200, description: 'Biological assets retrieved successfully' })
  @ApiQuery({ type: BiologicalAssetFiltersDto, required: false })
  findAll(@Request() req, @Query() filters: BiologicalAssetFiltersDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.biologicalAssetsService.findAll(organizationId, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get biological assets statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.biologicalAssetsService.getStatistics(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get biological asset by ID' })
  @ApiResponse({ status: 200, description: 'Biological asset retrieved successfully' })
  findOne(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.biologicalAssetsService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create biological asset' })
  @ApiResponse({ status: 201, description: 'Biological asset created successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  create(@Request() req, @Body() createDto: CreateBiologicalAssetDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.biologicalAssetsService.create(organizationId, req.user.id, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update biological asset' })
  @ApiResponse({ status: 200, description: 'Biological asset updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: Partial<CreateBiologicalAssetDto>,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.biologicalAssetsService.update(id, organizationId, req.user.id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete biological asset' })
  @ApiResponse({ status: 200, description: 'Biological asset deleted successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  remove(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.biologicalAssetsService.remove(id, organizationId);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update biological asset status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: BiologicalAssetStatus,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.biologicalAssetsService.updateStatus(id, organizationId, req.user.id, status);
  }
}
