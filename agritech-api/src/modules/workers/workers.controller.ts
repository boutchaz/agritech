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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import {
    CanManageWorkers,
    CanReadWorkers,
    CanCreateWorker,
    CanUpdateWorker,
    CanDeleteWorker,
} from '../casl/permissions.decorator';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';

@ApiTags('Workforce - Workers')
@ApiBearerAuth('JWT-auth')
@RequireModule('personnel')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard, PoliciesGuard)
@Controller('organizations/:organizationId/workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  @CanReadWorkers()
  @ApiOperation({ summary: 'Get all workers for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({ name: 'farmId', required: false, description: 'Filter by farm ID' })
  @ApiResponse({ status: 200, description: 'Workers retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  async getWorkers(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('farmId') farmId?: string,
  ) {
    return this.workersService.findAll(req.user.id, organizationId, farmId);
  }

  @Get('active')
  @CanReadWorkers()
  @ApiOperation({ summary: 'Get all active workers for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Active workers retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActiveWorkers(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.workersService.findActive(req.user.id, organizationId);
  }

  @Get(':workerId')
  @CanReadWorkers()
  @ApiOperation({ summary: 'Get a worker by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiResponse({ status: 200, description: 'Worker retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async getWorker(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
  ) {
    return this.workersService.findOne(req.user.id, organizationId, workerId);
  }

  @Get(':workerId/stats')
  @CanReadWorkers()
  @ApiOperation({ summary: 'Get worker statistics' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiResponse({ status: 200, description: 'Worker statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async getWorkerStats(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
  ) {
    return this.workersService.getStats(req.user.id, organizationId, workerId);
  }

  @Post()
  @CanCreateWorker()
  @ApiOperation({ summary: 'Create a new worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Worker created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createWorker(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createWorkerDto: CreateWorkerDto,
  ) {
    return this.workersService.create(req.user.id, organizationId, createWorkerDto);
  }

  @Patch(':workerId')
  @CanUpdateWorker()
  @ApiOperation({ summary: 'Update a worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiResponse({ status: 200, description: 'Worker updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async updateWorker(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
    @Body() updateWorkerDto: UpdateWorkerDto,
  ) {
    return this.workersService.update(req.user.id, organizationId, workerId, updateWorkerDto);
  }

  @Patch(':workerId/deactivate')
  @CanUpdateWorker()
  @ApiOperation({ summary: 'Deactivate a worker (soft delete)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiResponse({ status: 200, description: 'Worker deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - worker has pending tasks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async deactivateWorker(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.workersService.deactivate(req.user.id, organizationId, workerId, endDate);
  }

  @Delete(':workerId')
  @CanDeleteWorker()
  @ApiOperation({ summary: 'Delete a worker (hard delete)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiResponse({ status: 200, description: 'Worker deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - worker has linked records' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async deleteWorker(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
  ) {
    return this.workersService.remove(req.user.id, organizationId, workerId);
  }

  // Work Records Endpoints

  @Get(':workerId/work-records')
  @ApiOperation({ summary: 'Get work records for a worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO format)' })
  @ApiResponse({ status: 200, description: 'Work records retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async getWorkRecords(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.workersService.getWorkRecords(req.user.id, organizationId, workerId, startDate, endDate);
  }

  @Post(':workerId/work-records')
  @ApiOperation({ summary: 'Create a work record for a worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiResponse({ status: 201, description: 'Work record created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async createWorkRecord(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
    @Body() data: any,
  ) {
    return this.workersService.createWorkRecord(req.user.id, organizationId, workerId, data);
  }

  @Patch(':workerId/work-records/:recordId')
  @ApiOperation({ summary: 'Update a work record' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiParam({ name: 'recordId', description: 'Work Record ID' })
  @ApiResponse({ status: 200, description: 'Work record updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Work record not found' })
  async updateWorkRecord(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
    @Param('recordId') recordId: string,
    @Body() data: any,
  ) {
    return this.workersService.updateWorkRecord(req.user.id, organizationId, workerId, recordId, data);
  }

  // Métayage Settlements Endpoints

  @Get(':workerId/metayage-settlements')
  @ApiOperation({ summary: 'Get métayage settlements for a worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiResponse({ status: 200, description: 'Métayage settlements retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async getMetayageSettlements(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
  ) {
    return this.workersService.getMetayageSettlements(req.user.id, organizationId, workerId);
  }

  @Post(':workerId/metayage-settlements')
  @ApiOperation({ summary: 'Create a métayage settlement for a worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiResponse({ status: 201, description: 'Métayage settlement created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async createMetayageSettlement(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
    @Body() data: any,
  ) {
    return this.workersService.createMetayageSettlement(req.user.id, organizationId, workerId, data);
  }

  @Post(':workerId/calculate-metayage-share')
  @ApiOperation({ summary: 'Calculate métayage share for a worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiResponse({ status: 200, description: 'Métayage share calculated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found or no métayage contract' })
  async calculateMetayageShare(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
    @Body() data: { grossRevenue: number; totalCharges?: number },
  ) {
    return this.workersService.calculateMetayageShare(
      req.user.id,
      organizationId,
      workerId,
      data.grossRevenue,
      data.totalCharges,
    );
  }

  @Post(':workerId/grant-platform-access')
  @CanUpdateWorker()
  @ApiOperation({ summary: 'Grant platform access to a worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiResponse({ status: 200, description: 'Platform access granted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - worker already has access or invalid email' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async grantPlatformAccess(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
    @Body() data: { email: string; first_name: string; last_name: string },
  ) {
    return this.workersService.grantPlatformAccess(
      req.user.id,
      organizationId,
      workerId,
      data.email,
      data.first_name,
      data.last_name,
    );
  }

  // Work Record Backfill Endpoint

  @Post('backfill-work-records')
  @ApiOperation({ summary: 'Backfill work records for completed tasks (admin only)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Work records backfilled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid task ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async backfillWorkRecord(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() data: { taskId: string },
  ) {
    return this.workersService.backfillWorkRecordFromTask(
      req.user.id,
      organizationId,
      data.taskId,
    );
  }
}
