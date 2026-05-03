import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
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
import { Idempotent, OptimisticLock } from '../../common/decorators/offline.decorators';
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
  @ApiQuery({ name: 'includeCompleted', required: false, description: 'Include completed tasks in results', type: Boolean })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', type: Number })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Number of items per page', type: Number })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyTasks(
    @Request() req,
    @Query('includeCompleted') includeCompleted?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : undefined;
    return this.tasksService.findMyTasks(req.user.id, includeCompleted === 'true', pageNum, pageSizeNum);
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

  @Post('bulk')
  @CanCreateTask()
  @ApiOperation({ summary: 'Bulk create tasks' })
  @ApiResponse({ status: 201, description: 'Tasks created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bulkCreateTasks(
    @Request() req,
    @Body() createTaskDtos: CreateTaskDto[],
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.bulkCreate(req.user.id, organizationId, createTaskDtos);
  }

  @Patch('bulk-status')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Bulk update task statuses' })
  @ApiResponse({ status: 200, description: 'Task statuses updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bulkUpdateTaskStatus(
    @Request() req,
    @Body() body: { taskIds: string[]; status: string },
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.bulkUpdateStatus(req.user.id, organizationId, body.taskIds, body.status);
  }

  @Delete('bulk')
  @CanDeleteTask()
  @ApiOperation({ summary: 'Bulk delete tasks' })
  @ApiResponse({ status: 200, description: 'Tasks deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bulkDeleteTasks(
    @Request() req,
    @Body() body: { taskIds: string[] },
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.bulkDelete(req.user.id, organizationId, body.taskIds);
  }

  @Delete('dependencies/:dependencyId')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Remove a dependency' })
  async removeDependency(@Request() req: any, @Param('dependencyId') dependencyId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.removeDependency(req.user.id, organizationId, dependencyId);
  }

  // =====================================================
  // TASK CHECKLIST
  // =====================================================

  @Get(':taskId/checklist')
  @CanReadTasks()
  @ApiOperation({ summary: 'Get checklist for a task' })
  async getChecklist(@Request() req, @Param('taskId') taskId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.getChecklist(req.user.id, organizationId, taskId);
  }

  @Put(':taskId/checklist')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Update entire checklist' })
  async updateChecklist(@Request() req, @Param('taskId') taskId: string, @Body() body: { checklist: any[] }) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.updateChecklist(req.user.id, organizationId, taskId, body.checklist);
  }

  @Post(':taskId/checklist/items')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Add checklist item' })
  async addChecklistItem(@Request() req, @Param('taskId') taskId: string, @Body() body: { title: string }) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.addChecklistItem(req.user.id, organizationId, taskId, body.title);
  }

  @Patch(':taskId/checklist/items/:itemId/toggle')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Toggle checklist item' })
  async toggleChecklistItem(@Request() req, @Param('taskId') taskId: string, @Param('itemId') itemId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.toggleChecklistItem(req.user.id, organizationId, taskId, itemId);
  }

  @Delete(':taskId/checklist/items/:itemId')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Remove checklist item' })
  async removeChecklistItem(@Request() req, @Param('taskId') taskId: string, @Param('itemId') itemId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.removeChecklistItem(req.user.id, organizationId, taskId, itemId);
  }

  // =====================================================
  // TASK DEPENDENCIES
  // =====================================================

  @Get(':taskId/dependencies')
  @CanReadTasks()
  @ApiOperation({ summary: 'Get task dependencies' })
  async getDependencies(@Request() req: any, @Param('taskId') taskId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.getDependencies(req.user.id, organizationId, taskId);
  }

  @Post(':taskId/dependencies')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Add a dependency' })
  async addDependency(
    @Request() req: any,
    @Param('taskId') taskId: string,
    @Body() body: { depends_on_task_id: string; dependency_type?: string; lag_days?: number },
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.addDependency(
      req.user.id, organizationId, taskId,
      body.depends_on_task_id, body.dependency_type, body.lag_days,
    );
  }

  @Get(':taskId/blocked')
  @CanReadTasks()
  @ApiOperation({ summary: 'Check if task is blocked by dependencies' })
  async isTaskBlocked(@Request() req: any, @Param('taskId') taskId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.isTaskBlocked(req.user.id, organizationId, taskId);
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
  @Idempotent({ table: 'tasks' })
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
  @OptimisticLock({ table: 'tasks' })
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

  @Post(':taskId/reprocess-stock')
  @CanManageTasks()
  @ApiOperation({ summary: 'Reprocess stock deduction for a task (admin fix)' })
  async reprocessStock(@Request() req, @Param('taskId') taskId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.reprocessStockForTask(req.user.id, organizationId, taskId);
  }

  @Post(':taskId/start')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Start a task and deduct planned stock from inventory' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async startTask(@Request() req, @Param('taskId') taskId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.startTask(req.user.id, organizationId, taskId);
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
    @Request() req,
    @Param('taskId') taskId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.getComments(organizationId, taskId);
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
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.addComment(req.user.id, organizationId, taskId, createCommentDto);
  }

  @Patch(':taskId/comments/:commentId')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Edit a comment (author only)' })
  async updateTaskComment(
    @Request() req,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() body: { comment?: string },
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.updateComment(req.user.id, organizationId, taskId, commentId, body);
  }

  @Delete(':taskId/comments/:commentId')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Delete a comment (author or admin)' })
  async deleteTaskComment(
    @Request() req,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.deleteComment(req.user.id, organizationId, taskId, commentId);
  }

  @Patch(':taskId/comments/:commentId/resolve')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Mark a comment (typically an issue) as resolved or reopen it' })
  async resolveTaskComment(
    @Request() req,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() body: { resolved?: boolean },
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.resolveComment(req.user.id, organizationId, taskId, commentId, body.resolved ?? true);
  }

  // =====================================================
  // TASK WATCHERS
  // =====================================================

  @Get(':taskId/watchers')
  @CanReadTasks()
  @ApiOperation({ summary: 'Get all watchers for a task' })
  async getTaskWatchers(@Request() req, @Param('taskId') taskId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.getWatchers(organizationId, taskId);
  }

  @Post(':taskId/watchers')
  @CanReadTasks()
  @ApiOperation({ summary: 'Follow a task — any org member can watch' })
  async followTask(@Request() req, @Param('taskId') taskId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.addWatcher(req.user.id, organizationId, taskId);
  }

  @Delete(':taskId/watchers')
  @CanReadTasks()
  @ApiOperation({ summary: 'Unfollow a task' })
  async unfollowTask(@Request() req, @Param('taskId') taskId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.removeWatcher(req.user.id, organizationId, taskId);
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
    @Request() req,
    @Param('taskId') taskId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.getTimeLogs(organizationId, taskId);
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
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.clockOut(req.user.id, organizationId, timeLogId, clockOutDto);
  }

  @Get('time-logs/active-session')
  @CanReadTasks()
  @ApiOperation({ summary: "Get current user's active time session" })
  @ApiResponse({ status: 200, description: 'Active session retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No active session found' })
  async getActiveSession(@Request() req) {
    return this.tasksService.getMyActiveSession(req.user.id);
  }

  @Post(':taskId/clock-in-with-validation')
  @CanUpdateTask()
  @ApiOperation({ summary: 'Clock in with location validation' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 201, description: 'Clock-in recorded with location validation' })
  @ApiResponse({ status: 400, description: 'Bad request - location validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async clockInWithValidation(
    @Request() req,
    @Param('taskId') taskId: string,
    @Body() clockInDto: any,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.tasksService.clockInWithValidation(
      req.user.id,
      organizationId,
      taskId,
      clockInDto,
    );
  }

  @Post('time-logs/auto-clock-out')
  @CanManageTasks()
  @ApiOperation({ summary: 'Auto-clock-out stale sessions (admin function)' })
  @ApiResponse({ status: 200, description: 'Stale sessions processed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async autoClockOutStaleSessions(
    @Request() req,
    @Query('maxHours') maxHours?: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    const maxHoursNum = maxHours ? parseInt(maxHours, 10) : 12;
    return this.tasksService.autoClockOutStaleSessions(organizationId, maxHoursNum);
  }
}
