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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFiltersDto } from './dto/task-filters.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CompleteHarvestTaskDto } from './dto/complete-harvest-task.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('my-tasks')
  @ApiOperation({ summary: 'Get all tasks assigned to the current user across all organizations' })
  async getMyTasks(@Request() req) {
    return this.tasksService.findMyTasks(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks for an organization' })
  @ApiQuery({ name: 'organization_id', required: true, description: 'Organization ID' })
  async getTasks(
    @Request() req,
    @Query('organization_id') organizationId: string,
    @Query() filters: TaskFiltersDto,
  ) {
    return this.tasksService.findAll(req.user.id, organizationId, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get task statistics for an organization' })
  async getTaskStatistics(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.getStatistics(req.user.id, organizationId);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async getTask(
    @Request() req,
    @Param('taskId') taskId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.findOne(req.user.id, organizationId, taskId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async createTask(
    @Request() req,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.create(req.user.id, organizationId, createTaskDto);
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async updateTask(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.update(req.user.id, organizationId, taskId, updateTaskDto);
  }

  @Patch(':taskId/assign')
  @ApiOperation({ summary: 'Assign a task to a worker' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async assignTask(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() assignTaskDto: AssignTaskDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.assign(req.user.id, organizationId, taskId, assignTaskDto);
  }

  @Patch(':taskId/complete')
  @ApiOperation({ summary: 'Complete a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async completeTask(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() completeTaskDto: CompleteTaskDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.complete(req.user.id, organizationId, taskId, completeTaskDto);
  }

  @Post(':taskId/complete-with-harvest')
  @ApiOperation({ summary: 'Complete a harvest task and create harvest record' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async completeHarvestTask(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() completeDto: CompleteHarvestTaskDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.completeWithHarvest(req.user.id, organizationId, taskId, completeDto);
  }

  @Delete(':taskId')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async deleteTask(
    @Request() req,
    @Param('taskId') taskId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.remove(req.user.id, organizationId, taskId);
  }

  // =====================================================
  // TASK CATEGORIES
  // =====================================================

  @Get('categories/all')
  @ApiOperation({ summary: 'Get all task categories for an organization' })
  async getTaskCategories(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.getCategories(organizationId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new task category' })
  async createTaskCategory(
    @Request() req,
    @Body() createCategoryDto: any,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.createCategory(req.user.id, organizationId, createCategoryDto);
  }

  // =====================================================
  // TASK COMMENTS
  // =====================================================

  @Get(':taskId/comments')
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async getTaskComments(
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.getComments(taskId);
  }

  @Post(':taskId/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async addTaskComment(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() createCommentDto: any,
  ) {
    return this.tasksService.addComment(req.user.id, taskId, createCommentDto);
  }

  // =====================================================
  // TASK TIME LOGS
  // =====================================================

  @Get(':taskId/time-logs')
  @ApiOperation({ summary: 'Get all time logs for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async getTaskTimeLogs(
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.getTimeLogs(taskId);
  }

  @Post(':taskId/clock-in')
  @ApiOperation({ summary: 'Clock in to a task (start time tracking)' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async clockIn(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() clockInDto: any,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.clockIn(req.user.id, organizationId, taskId, clockInDto);
  }

  @Patch('time-logs/:timeLogId/clock-out')
  @ApiOperation({ summary: 'Clock out from a task (end time tracking)' })
  @ApiParam({ name: 'timeLogId', description: 'Time Log ID' })
  async clockOut(
    @Request() req,
    @Param('timeLogId') timeLogId: string,
    @Body() clockOutDto: any,
  ) {
    return this.tasksService.clockOut(req.user.id, timeLogId, clockOutDto);
  }
}
