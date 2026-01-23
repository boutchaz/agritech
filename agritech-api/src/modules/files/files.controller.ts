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
  Headers,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesService } from './files.service';
import { RegisterFileDto, UpdateFileDto } from './dto/file-registry.dto';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to Supabase storage' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'folder', required: false, description: 'Folder path in storage bucket (e.g., tasks, harvests)' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully', schema: { example: { url: 'https://...' } } })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.filesService.uploadFile(file, folder, organizationId);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new file in the tracking system' })
  @ApiResponse({ status: 201, description: 'File registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async registerFile(
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: RegisterFileDto,
    @Request() req,
  ) {
    return this.filesService.registerFile(organizationId, dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all files for an organization with optional filters' })
  @ApiQuery({ name: 'bucket', required: false, description: 'Filter by bucket name' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity ID' })
  @ApiQuery({ name: 'orphansOnly', required: false, type: Boolean, description: 'Show only orphaned files' })
  @ApiQuery({ name: 'markedForDeletion', required: false, type: Boolean, description: 'Filter by marked for deletion status' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async getFiles(
    @Headers('x-organization-id') organizationId: string,
    @Query('bucket') bucket?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('orphansOnly') orphansOnly?: string,
    @Query('markedForDeletion') markedForDeletion?: string,
  ) {
    return this.filesService.getFiles(organizationId, {
      bucket,
      entityType,
      entityId,
      orphansOnly: orphansOnly === 'true',
      markedForDeletion: markedForDeletion === 'true',
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get storage statistics for an organization' })
  @ApiResponse({ status: 200, description: 'Storage statistics retrieved successfully' })
  async getStorageStats(@Headers('x-organization-id') organizationId: string) {
    return this.filesService.getStorageStats(organizationId);
  }

  @Get('orphaned')
  @ApiOperation({ summary: 'Detect orphaned files (files not linked to any entity)' })
  @ApiResponse({ status: 200, description: 'Orphaned files detected successfully' })
  async detectOrphanedFiles(@Headers('x-organization-id') organizationId: string) {
    return this.filesService.detectOrphanedFiles(organizationId);
  }

  @Post('orphaned/mark')
  @ApiOperation({ summary: 'Mark orphaned files for deletion' })
  @ApiResponse({ status: 200, description: 'Orphaned files marked successfully' })
  async markOrphanedFiles(@Headers('x-organization-id') organizationId: string) {
    return this.filesService.markOrphanedFiles(organizationId);
  }

  @Delete('orphaned')
  @ApiOperation({ summary: 'Bulk delete orphaned files that are marked for deletion' })
  @ApiResponse({ status: 200, description: 'Orphaned files deleted successfully' })
  async deleteOrphanedFiles(@Headers('x-organization-id') organizationId: string) {
    return this.filesService.deleteOrphanedFiles(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single file by ID' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('id') fileId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.filesService.getFile(fileId, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiResponse({ status: 200, description: 'File updated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async updateFile(
    @Param('id') fileId: string,
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: UpdateFileDto,
  ) {
    return this.filesService.updateFile(fileId, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a file (marks as deleted but keeps in storage)' })
  @ApiResponse({ status: 200, description: 'File soft deleted successfully' })
  async deleteFile(
    @Param('id') fileId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.filesService.deleteFile(fileId, organizationId);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete a file from storage and registry' })
  @ApiResponse({ status: 200, description: 'File permanently deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async permanentlyDeleteFile(
    @Param('id') fileId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.filesService.permanentlyDeleteFile(fileId, organizationId);
  }

  @Post(':id/access')
  @ApiOperation({ summary: 'Track file access (increment access count)' })
  @ApiResponse({ status: 200, description: 'File access tracked successfully' })
  async trackFileAccess(
    @Param('id') fileId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    await this.filesService.trackFileAccess(fileId, organizationId);
    return { success: true };
  }
}
