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
import { DocumentTemplatesService } from './document-templates.service';
import { CreateDocumentTemplateDto, UpdateDocumentTemplateDto, DocumentType } from './dto';

@ApiTags('Document Templates')
@ApiBearerAuth()
@Controller('organizations/:organizationId/document-templates')
@UseGuards(JwtAuthGuard)
export class DocumentTemplatesController {
  constructor(private readonly documentTemplatesService: DocumentTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all document templates' })
  @ApiQuery({ name: 'document_type', required: false, enum: DocumentType })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async findAll(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('document_type') documentType?: DocumentType,
  ) {
    return this.documentTemplatesService.findAll(
      req.user.userId,
      organizationId,
      documentType,
    );
  }

  @Get('default/:documentType')
  @ApiOperation({ summary: 'Get default template for a document type' })
  @ApiResponse({ status: 200, description: 'Default template retrieved successfully' })
  async findDefault(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('documentType') documentType: DocumentType,
  ) {
    return this.documentTemplatesService.findDefault(
      req.user.userId,
      organizationId,
      documentType,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single document template' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async findOne(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') templateId: string,
  ) {
    return this.documentTemplatesService.findOne(
      req.user.userId,
      organizationId,
      templateId,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new document template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async create(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateDocumentTemplateDto,
  ) {
    return this.documentTemplatesService.create(
      req.user.userId,
      organizationId,
      createDto,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async update(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') templateId: string,
    @Body() updateDto: UpdateDocumentTemplateDto,
  ) {
    return this.documentTemplatesService.update(
      req.user.userId,
      organizationId,
      templateId,
      updateDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async delete(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') templateId: string,
  ) {
    await this.documentTemplatesService.delete(
      req.user.userId,
      organizationId,
      templateId,
    );
    return { message: 'Template deleted successfully' };
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set template as default for its document type' })
  @ApiResponse({ status: 200, description: 'Template set as default' })
  async setDefault(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') templateId: string,
  ) {
    return this.documentTemplatesService.setDefault(
      req.user.userId,
      organizationId,
      templateId,
    );
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a document template' })
  @ApiResponse({ status: 201, description: 'Template duplicated successfully' })
  async duplicate(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') templateId: string,
    @Body() body: { name?: string },
  ) {
    return this.documentTemplatesService.duplicate(
      req.user.userId,
      organizationId,
      templateId,
      body.name,
    );
  }
}
