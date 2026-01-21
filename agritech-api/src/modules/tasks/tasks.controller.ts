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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import {
    CanManageTasks,
    CanReadTasks,
    CanCreateTask,
    CanUpdateTask,
    CanDeleteTask,
} from '../casl/permissions.decorator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFiltersDto } from './dto/task-filters.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CompleteHarvestTaskDto } from './dto/complete-harvest-task.dto';

@ApiTags('Workforce - Tasks')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: true,
})
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('my-tasks')
  @CanReadTasks()
  @ApiOperation({ summary: 'Get all tasks assigned to the current user across all organizations' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyTasks(@Request() req) {
    return this.tasksService.findMyTasks(req.user.id);
  }

  @Get()
  @CanReadTasks()
  @ApiOperation({ summary: 'Get all tasks for an organization' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  async getTasks(
    @Request() req,
    @Query() filters: TaskFiltersDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.findAll(req.user.id, organizationId, filters);
  }

  @Get('statistics')
  @CanReadTasks()
  @ApiOperation({ summary: 'Get task statistics for an organization' })
  @ApiResponse({ status: 200, description: 'Task statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTaskStatistics(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.getStatistics(req.user.id, organizationId);
  }

  @Get(':taskId')
  @CanReadTasks()
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTask(
    @Request() req,
    @Param('taskId') taskId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.findOne(req.user.id, organizationId, taskId);
  }

  @Post()
  @CanCreateTask()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createTask(
    @Request() req,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.create(req.user.id, organizationId, createTaskDto);
  }

  @Patch(':taskId')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async updateTask(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.update(req.user.id, organizationId, taskId, updateTaskDto);
  }

  @Patch(':taskId/assign')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Assign a task to a worker' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - worker not available' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task or worker not found' })
  async assignTask(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() assignTaskDto: AssignTaskDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.assign(req.user.id, organizationId, taskId, assignTaskDto);
  }

  @Patch(':taskId/complete')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Complete a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - task cannot be completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async completeTask(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() completeTaskDto: CompleteTaskDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.complete(req.user.id, organizationId, taskId, completeTaskDto);
  }

  @Post(':taskId/complete-with-harvest')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Complete a harvest task and create harvest record' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Harvest task completed and harvest record created' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid harvest data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async completeHarvestTask(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() completeDto: CompleteHarvestTaskDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.completeWithHarvest(req.user.id, organizationId, taskId, completeDto);
  }

  @Delete(':taskId')
  @CanDeleteTask()
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
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
  @CanReadTasks()
  @ApiOperation({ summary: 'Get all task categories for an organization' })
  @ApiResponse({ status: 200, description: 'Task categories retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTaskCategories(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.getCategories(organizationId);
  }

  @Post('categories')
  @CanCreateTask()
  @ApiOperation({ summary: 'Create a new task category' })
  @ApiResponse({ status: 201, description: 'Task category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @CanReadTasks()
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task comments retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskComments(
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.getComments(taskId);
  }

  @Post(':taskId/comments')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
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
  @CanReadTasks()
  @ApiOperation({ summary: 'Get all time logs for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Time logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskTimeLogs(
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.getTimeLogs(taskId);
  }

  @Post(':taskId/clock-in')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Clock in to a task (start time tracking)' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 201, description: 'Clock-in recorded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - already clocked in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async clockIn(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() clockInDto: any,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.clockIn(req.user.id, organizationId, taskId, clockInDto);
  }

  @Patch('time-logs/:timeLogId/clock-out')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Clock out from a task (end time tracking)' })
  @ApiParam({ name: 'timeLogId', description: 'Time Log ID' })
  @ApiResponse({ status: 200, description: 'Clock-out recorded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - not clocked in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Time log not found' })
  async clockOut(
    @Request() req,
    @Param('timeLogId') timeLogId: string,
    @Body() clockOutDto: any,
  ) {
    return this.tasksService.clockOut(req.user.id, timeLogId, clockOutDto);
  }
}
