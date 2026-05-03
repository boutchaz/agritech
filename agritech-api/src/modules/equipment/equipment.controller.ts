import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { AppAbility } from '../casl/casl-ability.factory';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@ApiTags('Equipment')
@ApiBearerAuth()
@Controller('organizations/:organizationId/equipment')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
export class EquipmentController {
  private readonly logger = new Logger(EquipmentController.name);

  constructor(private readonly equipmentService: EquipmentService) {}

  // ── Equipment CRUD ──

  @Get()
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Equipment'))
  @ApiOperation({ summary: 'Get all equipment for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({ name: 'farm_id', required: false, description: 'Filter by farm' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Returns all equipment' })
  @ApiResponse({ status: 403, description: 'Access denied to this organization' })
  async findAll(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('farm_id') farmId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    this.logger.log(`User ${req.user.id} fetching equipment for organization ${organizationId}`);
    return this.equipmentService.findAll(req.user.id, organizationId, {
      farm_id: farmId,
      category,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Equipment'))
  @ApiOperation({ summary: 'Get equipment by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({ status: 200, description: 'Returns the equipment' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async findOne(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`User ${req.user.id} fetching equipment ${id}`);
    return this.equipmentService.findOne(req.user.id, organizationId, id);
  }

  @Post()
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Equipment'))
  @ApiOperation({ summary: 'Create new equipment' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Equipment created successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async create(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateEquipmentDto,
  ) {
    this.logger.log(`User ${req.user.id} creating equipment for organization ${organizationId}`);
    return this.equipmentService.create(req.user.id, organizationId, createDto);
  }

  @Patch(':id')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Equipment'))
  @ApiOperation({ summary: 'Update equipment' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({ status: 200, description: 'Equipment updated successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async update(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateEquipmentDto,
  ) {
    this.logger.log(`User ${req.user.id} updating equipment ${id}`);
    return this.equipmentService.update(req.user.id, organizationId, id, updateDto);
  }

  @Delete(':id')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Equipment'))
  @ApiOperation({ summary: 'Delete equipment (soft delete)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({ status: 200, description: 'Equipment deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async remove(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`User ${req.user.id} deleting equipment ${id}`);
    return this.equipmentService.remove(req.user.id, organizationId, id);
  }

  // ── Maintenance CRUD ──

  @Get(':id/maintenance')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Equipment'))
  @ApiOperation({ summary: 'Get maintenance records for equipment' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({ status: 200, description: 'Returns maintenance records' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async findAllMaintenance(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') equipmentId: string,
  ) {
    this.logger.log(`User ${req.user.id} fetching maintenance for equipment ${equipmentId}`);
    return this.equipmentService.findAllMaintenance(req.user.id, organizationId, equipmentId);
  }

  @Post(':id/maintenance')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Equipment'))
  @ApiOperation({ summary: 'Log a maintenance event for equipment' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  @ApiResponse({ status: 201, description: 'Maintenance record created' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async createMaintenance(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') equipmentId: string,
    @Body() createDto: CreateMaintenanceDto,
  ) {
    this.logger.log(`User ${req.user.id} logging maintenance for equipment ${equipmentId}`);
    return this.equipmentService.createMaintenance(req.user.id, organizationId, equipmentId, createDto);
  }

  @Patch('maintenance/:maintenanceId')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Equipment'))
  @ApiOperation({ summary: 'Update a maintenance record' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'maintenanceId', description: 'Maintenance record ID' })
  @ApiResponse({ status: 200, description: 'Maintenance record updated' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Maintenance record not found' })
  async updateMaintenance(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('maintenanceId') maintenanceId: string,
    @Body() updateDto: UpdateMaintenanceDto,
  ) {
    this.logger.log(`User ${req.user.id} updating maintenance ${maintenanceId}`);
    return this.equipmentService.updateMaintenance(req.user.id, organizationId, maintenanceId, updateDto);
  }

  @Delete('maintenance/:maintenanceId')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Equipment'))
  @ApiOperation({ summary: 'Delete a maintenance record (soft delete)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'maintenanceId', description: 'Maintenance record ID' })
  @ApiResponse({ status: 200, description: 'Maintenance record deleted' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Maintenance record not found' })
  async removeMaintenance(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('maintenanceId') maintenanceId: string,
  ) {
    this.logger.log(`User ${req.user.id} deleting maintenance ${maintenanceId}`);
    return this.equipmentService.removeMaintenance(req.user.id, organizationId, maintenanceId);
  }
}
