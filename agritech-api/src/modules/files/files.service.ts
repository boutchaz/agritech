import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RegisterFileDto, UpdateFileDto } from './dto/file-registry.dto';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * Register a new file in the tracking system
   */
  async registerFile(organizationId: string, dto: RegisterFileDto, userId?: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('file_registry')
      .insert({
        organization_id: organizationId,
        bucket_name: dto.bucket_name,
        file_path: dto.file_path,
        file_name: dto.file_name,
        file_size: dto.file_size,
        mime_type: dto.mime_type,
        entity_type: dto.entity_type,
        entity_id: dto.entity_id,
        field_name: dto.field_name,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to register file: ${error.message}`);
      throw new Error(`Failed to register file: ${error.message}`);
    }

    return data;
  }

  /**
   * Upload a file to Supabase storage and return the public URL
   */
  async uploadFile(file: Express.Multer.File, folder?: string, organizationId?: string) {
    const client = this.databaseService.getAdminClient();

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folderPath = folder || 'general';
    const fileName = `${folderPath}/${timestamp}-${sanitizedName}`;

    // Upload to Supabase storage
    const { data, error } = await client.storage
      .from('files')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = client.storage
      .from('files')
      .getPublicUrl(fileName);

    // Optionally register the file in the tracking system if organizationId is provided
    if (organizationId) {
      try {
        await this.registerFile(organizationId, {
          bucket_name: 'files',
          file_path: fileName,
          file_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          entity_type: folderPath,
          entity_id: null,
          field_name: null,
        });
      } catch (error) {
        // Log error but don't fail the upload
        this.logger.warn(`Failed to register uploaded file: ${error.message}`);
      }
    }

    return { url: publicUrl };
  }

  /**
   * Get all files for an organization
   */
  async getFiles(
    organizationId: string,
    options: {
      bucket?: string;
      entityType?: string;
      entityId?: string;
      orphansOnly?: boolean;
      markedForDeletion?: boolean;
    } = {},
  ) {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('file_registry')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });

    if (options.bucket) {
      query = query.eq('bucket_name', options.bucket);
    }

    if (options.entityType) {
      query = query.eq('entity_type', options.entityType);
    }

    if (options.entityId) {
      query = query.eq('entity_id', options.entityId);
    }

    if (options.orphansOnly) {
      query = query.eq('is_orphan', true);
    }

    if (options.markedForDeletion !== undefined) {
      query = query.eq('marked_for_deletion', options.markedForDeletion);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch files: ${error.message}`);
      throw new Error(`Failed to fetch files: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a single file by ID
   */
  async getFile(fileId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('file_registry')
      .select('*')
      .eq('id', fileId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`File not found: ${fileId}`);
    }

    return data;
  }

  /**
   * Update file metadata
   */
  async updateFile(fileId: string, organizationId: string, dto: UpdateFileDto) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('file_registry')
      .update({
        entity_type: dto.entity_type,
        entity_id: dto.entity_id,
        field_name: dto.field_name,
        is_orphan: dto.is_orphan,
        marked_for_deletion: dto.marked_for_deletion,
      })
      .eq('id', fileId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update file: ${error.message}`);
      throw new Error(`Failed to update file: ${error.message}`);
    }

    return data;
  }

  /**
   * Soft delete a file (marks as deleted but doesn't remove from storage)
   */
  async deleteFile(fileId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('file_registry')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    return data;
  }

  /**
   * Permanently delete a file from storage and registry
   */
  async permanentlyDeleteFile(fileId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Get file info first
    const file = await this.getFile(fileId, organizationId);

    // Delete from storage
    const { error: storageError } = await client.storage
      .from(file.bucket_name)
      .remove([file.file_path]);

    if (storageError) {
      this.logger.error(`Failed to delete file from storage: ${storageError.message}`);
      // Continue anyway to clean up the registry entry
    }

    // Delete from registry
    const { error } = await client
      .from('file_registry')
      .delete()
      .eq('id', fileId)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete file from registry: ${error.message}`);
      throw new Error(`Failed to delete file from registry: ${error.message}`);
    }

    return { success: true, file };
  }

  /**
   * Get storage statistics for an organization
   */
  async getStorageStats(organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('file_storage_stats')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to fetch storage stats: ${error.message}`);
      throw new Error(`Failed to fetch storage stats: ${error.message}`);
    }

    return data;
  }

  /**
   * Detect orphaned files
   */
  async detectOrphanedFiles(organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client.rpc('detect_orphaned_files', {
      p_organization_id: organizationId,
    });

    if (error) {
      this.logger.error(`Failed to detect orphaned files: ${error.message}`);
      throw new Error(`Failed to detect orphaned files: ${error.message}`);
    }

    return data;
  }

  /**
   * Mark orphaned files for deletion
   */
  async markOrphanedFiles(organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client.rpc('mark_orphaned_files', {
      p_organization_id: organizationId,
    });

    if (error) {
      this.logger.error(`Failed to mark orphaned files: ${error.message}`);
      throw new Error(`Failed to mark orphaned files: ${error.message}`);
    }

    return { marked_count: data };
  }

  /**
   * Bulk delete orphaned files
   */
  async deleteOrphanedFiles(organizationId: string) {
    const orphanedFiles = await this.getFiles(organizationId, {
      orphansOnly: true,
      markedForDeletion: true,
    });

    const results = {
      total: orphanedFiles.length,
      deleted: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const file of orphanedFiles) {
      try {
        await this.permanentlyDeleteFile(file.id, organizationId);
        results.deleted++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${file.file_name}: ${error.message}`);
        this.logger.error(`Failed to delete orphaned file ${file.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Track file access (increment access count and update last_accessed_at)
   */
  async trackFileAccess(fileId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { error } = await client.rpc('increment', {
      row_id: fileId,
      x: 1,
    }).eq('organization_id', organizationId);

    if (error) {
      this.logger.warn(`Failed to track file access: ${error.message}`);
      // Don't throw - this is non-critical
    }

    // Update last_accessed_at
    await client
      .from('file_registry')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', fileId)
      .eq('organization_id', organizationId);
  }
}
