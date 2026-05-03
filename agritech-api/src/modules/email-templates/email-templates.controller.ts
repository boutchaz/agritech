import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto, EmailTemplateCategory } from './dto';

@ApiTags('Email Templates')
@ApiBearerAuth()
@Controller('organizations/:organizationId/email-templates')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all email templates for an organization' })
  @ApiQuery({ name: 'category', required: false, enum: EmailTemplateCategory })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async findAll(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('category') category?: EmailTemplateCategory,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.emailTemplatesService.findAll(
      req.user.userId,
      organizationId,
      category,
      {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single email template' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async findOne(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') templateId: string,
  ) {
    return this.emailTemplatesService.findOne(
      req.user.userId,
      organizationId,
      templateId,
    );
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get email template by type identifier' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async findByType(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('type') type: string,
  ) {
    return this.emailTemplatesService.findByType(
      req.user.userId,
      organizationId,
      type,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new email template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async create(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.create(
      req.user.userId,
      organizationId,
      createDto,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an email template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async update(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') templateId: string,
    @Body() updateDto: UpdateEmailTemplateDto,
  ) {
    return this.emailTemplatesService.update(
      req.user.userId,
      organizationId,
      templateId,
      updateDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an email template (system templates are deactivated)' })
  @ApiResponse({ status: 200, description: 'Template deleted or deactivated' })
  async delete(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') templateId: string,
  ) {
    return this.emailTemplatesService.delete(
      req.user.userId,
      organizationId,
      templateId,
    );
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an email template' })
  @ApiResponse({ status: 201, description: 'Template duplicated successfully' })
  async duplicate(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') templateId: string,
    @Body() body: { name?: string },
  ) {
    return this.emailTemplatesService.duplicate(
      req.user.userId,
      organizationId,
      templateId,
      body.name,
    );
  }
}
