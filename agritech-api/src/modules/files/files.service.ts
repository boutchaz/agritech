import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { RegisterFileDto, UpdateFileDto } from './dto/file-registry.dto';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
  ) {}

  /**
   * Reject storage bucket/path values that could escape the intended bucket
   * key namespace. Supabase Storage treats keys as opaque strings — there is
   * no real filesystem traversal — but a `..` segment, leading slash, or
   * backslash in caller-supplied input is a strong signal of an attempted
   * path-walk and probably points at a bug or abuse. Bucket name is
   * additionally restricted to the safe Supabase character set.
   */
  private assertSafeStoragePath(bucket: string, filePath: string): void {
    if (!bucket || typeof bucket !== 'string' || !/^[a-z0-9._-]+$/.test(bucket)) {
      throw new BadRequestException('Invalid bucket name');
    }
    if (!filePath || typeof filePath !== 'string') {
      throw new BadRequestException('Invalid file path');
    }
    if (filePath.length > 1024) {
      throw new BadRequestException('File path too long');
    }
    if (filePath.startsWith('/') || filePath.startsWith('\\')) {
      throw new BadRequestException('File path must be relative');
    }
    if (filePath.includes('\0')) {
      throw new BadRequestException('File path contains null byte');
    }
    const segments = filePath.split(/[\/\\]/);
    if (segments.some((seg) => seg === '..' || seg === '.' || seg.trim() === '')) {
      throw new BadRequestException('File path contains traversal segment');
    }
  }

  /**
   * Insert or update a file_registry row (unique on bucket_name + file_path).
   */
  async upsertFileRegistryEntry(
    organizationId: string,
    dto: RegisterFileDto,
    userId?: string,
  ) {
    const client = this.databaseService.getAdminClient();

    const row = {
      organization_id: organizationId,
      bucket_name: dto.bucket_name,
      file_path: dto.file_path,
      file_name: dto.file_name,
      file_size: dto.file_size ?? null,
      mime_type: dto.mime_type ?? null,
      entity_type: dto.entity_type ?? null,
      entity_id: dto.entity_id ?? null,
      field_name: dto.field_name ?? null,
      uploaded_by: userId ?? null,
      is_orphan: false,
      marked_for_deletion: false,
      deleted_at: null as string | null,
    };

    const { data, error } = await client
      .from('file_registry')
      .upsert(row, { onConflict: 'bucket_name,file_path' })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to upsert file registry: ${error.message}`);
      throw new Error(`Failed to upsert file registry: ${error.message}`);
    }

    return data;
  }

  /**
   * Remove registry row for a storage object (e.g. when avatar is deleted).
   */
  async deleteRegistryEntryByBucketPath(
    organizationId: string,
    bucketName: string,
    filePath: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('file_registry')
      .delete()
      .eq('organization_id', organizationId)
      .eq('bucket_name', bucketName)
      .eq('file_path', filePath);

    if (error) {
      this.logger.warn(
        `deleteRegistryEntryByBucketPath: ${error.message} (${bucketName}/${filePath})`,
      );
    }
  }

  private buildStoragePublicUrl(bucketName: string, filePath: string): string | null {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL')?.replace(/\/$/, '');
    if (!supabaseUrl || !bucketName || !filePath) {
      return null;
    }
    const encodedPath = filePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${encodedPath}`;
  }

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
  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
    organizationId?: string,
    contentSha256?: string,
  ) {
    const client = this.databaseService.getAdminClient();

    // Idempotent dedupe by content hash, scoped per org.
    if (organizationId && contentSha256) {
      const { data: existing } = await client
        .from('file_registry')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('content_sha256', contentSha256)
        .maybeSingle();
      if (existing) {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        const encodedPath = (existing.file_path as string)
          .split('/')
          .map((seg) => encodeURIComponent(seg))
          .join('/');
        return {
          url: `${supabaseUrl}/storage/v1/object/public/${existing.bucket_name}/${encodedPath}`,
          path: existing.file_path,
          deduplicated: true,
        };
      }
    }

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

  async uploadToStorage(
    file: Express.Multer.File,
    bucket: string,
    filePath: string,
    options?: { upsert?: boolean; cacheControl?: string },
  ): Promise<{ path: string; publicUrl: string }> {
    this.assertSafeStoragePath(bucket, filePath);
    const client = this.databaseService.getAdminClient();

    const { error } = await client.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: options?.upsert ?? false,
        cacheControl: options?.cacheControl,
      });

    if (error) {
      this.logger.error(`Failed to upload file to storage: ${error.message}`);
      throw new BadRequestException(`Failed to upload file to storage: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = client.storage.from(bucket).getPublicUrl(filePath);

    return {
      path: filePath,
      publicUrl,
    };
  }

  async removeFromStorage(bucket: string, filePaths: string[]): Promise<void> {
    for (const p of filePaths) this.assertSafeStoragePath(bucket, p);
    const client = this.databaseService.getAdminClient();

    const { error } = await client.storage.from(bucket).remove(filePaths);

    if (error) {
      this.logger.error(`Failed to remove files from storage: ${error.message}`);
      throw new BadRequestException(`Failed to remove files from storage: ${error.message}`);
    }
  }

  async downloadFromStorage(bucket: string, filePath: string): Promise<Buffer> {
    this.assertSafeStoragePath(bucket, filePath);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client.storage.from(bucket).download(filePath);

    if (error || !data) {
      this.logger.error(`Failed to download file from storage: ${error?.message ?? 'Unknown error'}`);
      throw new NotFoundException(`Failed to download file from storage: ${error?.message ?? 'File not found'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
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

    type RegistryRow = {
      id: string;
      file_name: string;
      bucket_name: string;
      file_path: string;
      [key: string]: unknown;
    };

    const rows = (data ?? []) as RegistryRow[];
    return rows.map((row) => ({
      ...row,
      public_url: this.buildStoragePublicUrl(row.bucket_name, row.file_path),
    }));
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

     const { data: filesWithEntities, error: fetchError } = await client
       .from('file_registry')
       .select('*')
       .eq('organization_id', organizationId)
       .is('deleted_at', null)
       .not('entity_id', 'is', null);

     if (fetchError) {
       this.logger.error(`Failed to fetch files: ${fetchError.message}`);
       throw new Error(`Failed to fetch files: ${fetchError.message}`);
     }

     if (!filesWithEntities || filesWithEntities.length === 0) {
       return [];
     }

     const orphanedFiles = [];

     for (const file of filesWithEntities) {
       let entityExists = false;

       if (file.entity_type && file.entity_id) {
         const { data: entity, error: entityError } = await client
           .from(file.entity_type)
           .select('id')
           .eq('id', file.entity_id)
           .maybeSingle();

         if (!entityError && entity) {
           entityExists = true;
         }
       }

       if (!entityExists) {
         orphanedFiles.push(file);
       }
     }

     return orphanedFiles;
   }

   /**
    * Mark orphaned files for deletion
    */
   async markOrphanedFiles(organizationId: string) {
     const orphanedFiles = await this.detectOrphanedFiles(organizationId);

     if (orphanedFiles.length === 0) {
       return { marked_count: 0 };
     }

     const client = this.databaseService.getAdminClient();
     const orphanedFileIds = orphanedFiles.map((file) => file.id);

     const { error } = await client
       .from('file_registry')
       .update({
         is_orphan: true,
         marked_for_deletion: true,
       })
       .in('id', orphanedFileIds)
       .eq('organization_id', organizationId);

     if (error) {
       this.logger.error(`Failed to mark orphaned files: ${error.message}`);
       throw new Error(`Failed to mark orphaned files: ${error.message}`);
     }

     return { marked_count: orphanedFiles.length };
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

    const { data: fileRecord, error: fetchError } = await client
      .from('file_registry')
      .select('access_count')
      .eq('id', fileId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (fetchError) {
      this.logger.warn(`Failed to fetch file access count: ${fetchError.message}`);
      return;
    }

    if (!fileRecord) {
      return;
    }

    const nextCount = (fileRecord.access_count ?? 0) + 1;
    const { error: updateError } = await client
      .from('file_registry')
      .update({
        access_count: nextCount,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .eq('organization_id', organizationId);

    if (updateError) {
      this.logger.warn(`Failed to track file access: ${updateError.message}`);
    }
  }

  /**
   * Sync existing files from storage to registry
   */
  async syncExistingFiles(organizationId: string): Promise<{ synced: number; skipped: number }> {
    const buckets = ['products', 'invoices', 'files', 'compliance-documents', 'agritech-documents', 'reports'];
    let synced = 0;
    let skipped = 0;

    for (const bucket of buckets) {
      try {
        const { data: files, error } = await this.databaseService.getAdminClient()
          .storage
          .from(bucket)
          .list(organizationId, {
            limit: 1000,
          });

        if (error) {
          this.logger.error(`Failed to list files in bucket ${bucket}:`, error);
          continue;
        }

        for (const file of files || []) {
          const filePath = `${organizationId}/${file.name}`;
          
          const { data: existing } = await this.databaseService.getAdminClient()
            .from('file_registry')
            .select('id')
            .eq('file_path', filePath)
            .eq('organization_id', organizationId)
            .single();

          if (existing) {
            skipped++;
            continue;
          }

          await this.databaseService.getAdminClient()
            .from('file_registry')
            .insert({
              organization_id: organizationId,
              bucket_name: bucket,
              file_path: filePath,
              file_name: file.name.split('/').pop() || file.name,
              file_size: file.metadata?.size || 0,
              mime_type: file.metadata?.mimetype || 'application/octet-stream',
              is_orphan: true,
              uploaded_at: file.created_at || new Date().toISOString(),
            });

          synced++;
        }
      } catch (error) {
        this.logger.error(`Error syncing bucket ${bucket}:`, error);
      }
    }

    return { synced, skipped };
  }
}
