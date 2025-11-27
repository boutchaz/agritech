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

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  async getTasks(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: TaskFiltersDto,
  ) {
    return this.tasksService.findAll(req.user.id, organizationId, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get task statistics for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  async getTaskStatistics(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.tasksService.getStatistics(req.user.id, organizationId);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async getTask(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.findOne(req.user.id, organizationId, taskId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  async createTask(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(req.user.id, organizationId, createTaskDto);
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async updateTask(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(req.user.id, organizationId, taskId, updateTaskDto);
  }

  @Patch(':taskId/assign')
  @ApiOperation({ summary: 'Assign a task to a worker' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async assignTask(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
    @Body() assignTaskDto: AssignTaskDto,
  ) {
    return this.tasksService.assign(req.user.id, organizationId, taskId, assignTaskDto);
  }

  @Patch(':taskId/complete')
  @ApiOperation({ summary: 'Complete a task' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async completeTask(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
    @Body() completeTaskDto: CompleteTaskDto,
  ) {
    return this.tasksService.complete(req.user.id, organizationId, taskId, completeTaskDto);
  }

  @Delete(':taskId')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async deleteTask(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.remove(req.user.id, organizationId, taskId);
  }
}
