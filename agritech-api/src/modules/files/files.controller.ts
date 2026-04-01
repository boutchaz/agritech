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
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { FilesService } from './files.service';
import { RegisterFileDto, UpdateFileDto } from './dto/file-registry.dto';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  private getContentTypeFromPath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();

    const contentTypeByExtension: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      zip: 'application/zip',
    };

    if (!extension) {
      return 'application/octet-stream';
    }

    return contentTypeByExtension[extension] ?? 'application/octet-stream';
  }

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

  @Post('storage/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to any Supabase storage bucket' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'bucket', required: true, description: 'Target storage bucket name' })
  @ApiQuery({ name: 'path', required: true, description: 'Target file path in the bucket' })
  @ApiQuery({ name: 'upsert', required: false, type: Boolean, description: 'Overwrite existing file if true' })
  @ApiQuery({ name: 'cacheControl', required: false, description: 'Cache-Control max-age in seconds' })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: { example: { path: 'avatars/user-1.png', publicUrl: 'https://...' } },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async uploadToStorage(
    @UploadedFile() file: Express.Multer.File,
    @Query('bucket') bucket: string,
    @Query('path') filePath: string,
    @Query('upsert') upsert?: string,
    @Query('cacheControl') cacheControl?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!bucket || !filePath) {
      throw new BadRequestException('bucket and path query parameters are required');
    }

    return this.filesService.uploadToStorage(file, bucket, filePath, {
      upsert: upsert === 'true',
      cacheControl,
    });
  }

  @Post('storage/remove')
  @ApiOperation({ summary: 'Remove files from any Supabase storage bucket' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bucket', 'paths'],
      properties: {
        bucket: { type: 'string', example: 'files' },
        paths: { type: 'array', items: { type: 'string' }, example: ['avatars/user-1.png'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Files removed successfully', schema: { example: { success: true } } })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async removeFromStorage(
    @Body() body: { bucket: string; paths: string[] },
  ) {
    const { bucket, paths } = body;

    if (!bucket || !Array.isArray(paths) || paths.length === 0) {
      throw new BadRequestException('bucket and non-empty paths are required');
    }

    await this.filesService.removeFromStorage(bucket, paths);
    return { success: true };
  }

  @Get('storage/download')
  @ApiOperation({ summary: 'Download a file from any Supabase storage bucket (proxy)' })
  @ApiQuery({ name: 'bucket', required: true, description: 'Storage bucket name' })
  @ApiQuery({ name: 'path', required: true, description: 'File path in the bucket' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFromStorage(
    @Query('bucket') bucket: string,
    @Query('path') filePath: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!bucket || !filePath) {
      throw new BadRequestException('bucket and path query parameters are required');
    }

    const fileBuffer = await this.filesService.downloadFromStorage(bucket, filePath);
    const contentType = this.getContentTypeFromPath(filePath);
    const fileName = filePath.split('/').pop() || 'download';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    return new StreamableFile(fileBuffer);
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
