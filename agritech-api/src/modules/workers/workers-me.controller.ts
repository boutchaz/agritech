import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkersService } from './workers.service';

@ApiTags('Workforce - Worker Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('workers/me')
export class WorkersMeController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  @ApiOperation({ summary: 'Get current worker profile' })
  @ApiResponse({ status: 200, description: 'Worker profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Worker profile not found' })
  async getMyProfile(@Request() req) {
    return this.workersService.findMyProfile(req.user.id);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get tasks assigned to current worker' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by task status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of tasks to return' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyTasks(
    @Request() req,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workersService.findMyTasks(
      req.user.id,
      status,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('time-logs')
  @ApiOperation({ summary: 'Get time logs for current worker' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO format)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of logs to return' })
  @ApiResponse({ status: 200, description: 'Time logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyTimeLogs(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workersService.findMyTimeLogs(
      req.user.id,
      startDate,
      endDate,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get performance statistics for current worker' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyStatistics(@Request() req) {
    return this.workersService.findMyStatistics(req.user.id);
  }
}
