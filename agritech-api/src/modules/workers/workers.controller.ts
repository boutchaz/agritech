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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';

@ApiTags('workers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all workers for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({ name: 'farmId', required: false, description: 'Filter by farm ID' })
  async getWorkers(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('farmId') farmId?: string,
  ) {
    return this.workersService.findAll(req.user.id, organizationId, farmId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active workers for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  async getActiveWorkers(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.workersService.findActive(req.user.id, organizationId);
  }

  @Get(':workerId')
  @ApiOperation({ summary: 'Get a worker by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  async getWorker(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
  ) {
    return this.workersService.findOne(req.user.id, organizationId, workerId);
  }

  @Get(':workerId/stats')
  @ApiOperation({ summary: 'Get worker statistics' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  async getWorkerStats(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
  ) {
    return this.workersService.getStats(req.user.id, organizationId, workerId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  async createWorker(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createWorkerDto: CreateWorkerDto,
  ) {
    return this.workersService.create(req.user.id, organizationId, createWorkerDto);
  }

  @Patch(':workerId')
  @ApiOperation({ summary: 'Update a worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  async updateWorker(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
    @Body() updateWorkerDto: UpdateWorkerDto,
  ) {
    return this.workersService.update(req.user.id, organizationId, workerId, updateWorkerDto);
  }

  @Patch(':workerId/deactivate')
  @ApiOperation({ summary: 'Deactivate a worker (soft delete)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  async deactivateWorker(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.workersService.deactivate(req.user.id, organizationId, workerId, endDate);
  }

  @Delete(':workerId')
  @ApiOperation({ summary: 'Delete a worker (hard delete)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
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
}
