import { Controller, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskTemplatesService, CreateTaskFromTemplateDto, UpdateTaskStatusDto } from './task-templates.service';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('task-templates')
@ApiBearerAuth('JWT-auth')
@Controller('organizations/:organizationId')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class TaskTemplatesController {
  constructor(private readonly taskTemplatesService: TaskTemplatesService) {}

  @Post('task-templates/create-from-template')
  @ApiOperation({ summary: 'Create a new task from a template' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async createFromTemplate(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateTaskFromTemplateDto,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.taskTemplatesService.createFromTemplate(userId, organizationId, dto);
  }

  @Post('tasks/update-status')
  @ApiOperation({ summary: 'Update task status with optional notes' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async updateStatus(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;
    return this.taskTemplatesService.updateStatus(userId, organizationId, dto);
  }
}
