import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TaskAssignmentsService } from './task-assignments.service';
import {
  CreateTaskAssignmentDto,
  BulkCreateTaskAssignmentsDto,
  UpdateTaskAssignmentDto,
} from './dto/create-task-assignment.dto';

@ApiTags('Task Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/organizations/:organizationId/tasks/:taskId/assignments')
export class TaskAssignmentsController {
  constructor(private readonly taskAssignmentsService: TaskAssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all workers assigned to a task' })
  @ApiResponse({ status: 200, description: 'List of task assignments' })
  async getTaskAssignments(
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
    @Req() req: any,
  ) {
    return this.taskAssignmentsService.getTaskAssignments(
      organizationId,
      taskId,
      req.user.id,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Assign a worker to a task' })
  @ApiResponse({ status: 201, description: 'Worker assigned successfully' })
  async createAssignment(
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskAssignmentDto,
    @Req() req: any,
  ) {
    return this.taskAssignmentsService.createAssignment(
      organizationId,
      taskId,
      dto,
      req.user.id,
    );
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Assign multiple workers to a task' })
  @ApiResponse({ status: 201, description: 'Workers assigned successfully' })
  async bulkCreateAssignments(
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
    @Body() dto: BulkCreateTaskAssignmentsDto,
    @Req() req: any,
  ) {
    return this.taskAssignmentsService.bulkCreateAssignments(
      organizationId,
      taskId,
      dto,
      req.user.id,
    );
  }

  @Patch(':assignmentId')
  @ApiOperation({ summary: 'Update a task assignment' })
  @ApiResponse({ status: 200, description: 'Assignment updated successfully' })
  async updateAssignment(
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateTaskAssignmentDto,
    @Req() req: any,
  ) {
    return this.taskAssignmentsService.updateAssignment(
      organizationId,
      taskId,
      assignmentId,
      dto,
      req.user.id,
    );
  }

  @Delete(':assignmentId')
  @ApiOperation({ summary: 'Remove a worker from a task' })
  @ApiResponse({ status: 204, description: 'Worker removed successfully' })
  async removeAssignment(
    @Param('organizationId') organizationId: string,
    @Param('taskId') taskId: string,
    @Param('assignmentId') assignmentId: string,
    @Req() req: any,
  ) {
    await this.taskAssignmentsService.removeAssignment(
      organizationId,
      taskId,
      assignmentId,
      req.user.id,
    );
    return { success: true };
  }
}
