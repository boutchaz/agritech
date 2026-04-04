import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/files';

export interface FileRegistry {
  id: string;
  organization_id: string;
  bucket_name: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  entity_type?: string;
  entity_id?: string;
  field_name?: string;
  uploaded_by?: string;
  uploaded_at: string;
  last_accessed_at?: string;
  access_count: number;
  is_orphan: boolean;
  marked_for_deletion: boolean;
  deleted_at?: string;
}

export interface StorageStats {
  organization_id: string;
  bucket_name: string;
  file_count: number;
  total_size_bytes: number;
  total_size_mb: number;
  orphan_count: number;
  orphan_size_bytes: number;
  orphan_size_mb: number;
}

export interface OrphanedFile {
  file_id: string;
  bucket_name: string;
  file_path: string;
  entity_type: string;
  entity_id: string;
  reason: string;
}

export interface RegisterFileDto {
  bucket_name: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  entity_type?: string;
  entity_id?: string;
  field_name?: string;
}

export interface UpdateFileDto {
  entity_type?: string;
  entity_id?: string;
  field_name?: string;
  is_orphan?: boolean;
  marked_for_deletion?: boolean;
}

export interface DeleteOrphanedResult {
  total: number;
  deleted: number;
  failed: number;
  errors: string[];
}

export const filesApi = {
  /**
   * Register a new file in the tracking system
   */
  async register(dto: RegisterFileDto, organizationId?: string): Promise<FileRegistry> {
    return apiClient.post(`${BASE_URL}/register`, dto, {}, organizationId);
  },

  /**
   * Get all files with optional filters
   */
  async getAll(
    filters?: {
      bucket?: string;
      entityType?: string;
      entityId?: string;
      orphansOnly?: boolean;
      markedForDeletion?: boolean;
    },
    organizationId?: string,
  ): Promise<FileRegistry[]> {
    const params = new URLSearchParams();
    if (filters?.bucket) params.append('bucket', filters.bucket);
    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.entityId) params.append('entityId', filters.entityId);
    if (filters?.orphansOnly !== undefined) params.append('orphansOnly', String(filters.orphansOnly));
    if (filters?.markedForDeletion !== undefined) params.append('markedForDeletion', String(filters.markedForDeletion));

    const queryString = params.toString();
    return apiClient.get(`${BASE_URL}${queryString ? `?${queryString}` : ''}`, {}, organizationId);
  },

  /**
   * Get storage statistics
   */
  async getStats(organizationId?: string): Promise<StorageStats[]> {
    return apiClient.get(`${BASE_URL}/stats`, {}, organizationId);
  },

  /**
   * Detect orphaned files
   */
  async detectOrphaned(organizationId?: string): Promise<OrphanedFile[]> {
    return apiClient.get(`${BASE_URL}/orphaned`, {}, organizationId);
  },

  /**
   * Mark orphaned files for deletion
   */
  async markOrphaned(organizationId?: string): Promise<{ marked_count: number }> {
    return apiClient.post(`${BASE_URL}/orphaned/mark`, {}, {}, organizationId);
  },

  /**
   * Delete all orphaned files that are marked for deletion
   */
  async deleteOrphaned(organizationId?: string): Promise<DeleteOrphanedResult> {
    return apiClient.delete(`${BASE_URL}/orphaned`, {}, organizationId);
  },

  /**
   * Get a single file by ID
   */
  async getById(fileId: string, organizationId?: string): Promise<FileRegistry> {
    return apiClient.get(`${BASE_URL}/${fileId}`, {}, organizationId);
  },

  /**
   * Update file metadata
   */
  async update(fileId: string, dto: UpdateFileDto, organizationId?: string): Promise<FileRegistry> {
    return apiClient.patch(`${BASE_URL}/${fileId}`, dto, {}, organizationId);
  },

  /**
   * Soft delete a file (marks as deleted)
   */
  async delete(fileId: string, organizationId?: string): Promise<FileRegistry> {
    return apiClient.delete(`${BASE_URL}/${fileId}`, {}, organizationId);
  },

  /**
   * Permanently delete a file from storage and registry
   */
  async deletePermanently(fileId: string, organizationId?: string): Promise<{ success: boolean; file: FileRegistry }> {
    return apiClient.delete(`${BASE_URL}/${fileId}/permanent`, {}, organizationId);
  },

  /**
   * Track file access (increment access count)
   */
  async trackAccess(fileId: string, organizationId?: string): Promise<{ success: boolean }> {
    return apiClient.post(`${BASE_URL}/${fileId}/access`, {}, {}, organizationId);
  },

  /**
   * Sync existing files from storage to registry
   */
  async syncExisting(organizationId?: string): Promise<{ synced: number; skipped: number }> {
    return apiClient.post(`${BASE_URL}/sync`, {}, {}, organizationId);
  },
};
