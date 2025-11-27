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
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
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
}
