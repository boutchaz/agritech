import { apiClient, getApiHeaders } from '../api-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const BASE_URL = '/api/v1/files/storage';

export interface UploadOptions {
  cacheControl?: string;
  upsert?: boolean;
}

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export const storageApi = {
  async upload(
    bucket: string,
    filePath: string,
    file: File,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const headers = await getApiHeaders();
    const formData = new FormData();
    formData.append('file', file);

    const { 'Content-Type': _, ...headersWithoutContentType } = headers as Record<string, string>;

    const params = new URLSearchParams({ bucket, path: filePath });
    if (options?.upsert) params.append('upsert', 'true');
    if (options?.cacheControl) params.append('cacheControl', options.cacheControl);

    const response = await fetch(`${API_URL}${BASE_URL}/upload?${params}`, {
      method: 'POST',
      headers: headersWithoutContentType,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Failed to upload file');
    }

    return response.json();
  },

  getPublicUrl(bucket: string, filePath: string): string {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_AUTH_SUPABASE_URL;
    if (supabaseUrl) {
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
    }
    return `${API_URL}${BASE_URL}/download?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(filePath)}`;
  },

  async download(bucket: string, filePath: string): Promise<Blob> {
    const headers = await getApiHeaders();

    const params = new URLSearchParams({ bucket, path: filePath });
    const response = await fetch(`${API_URL}${BASE_URL}/download?${params}`, {
      method: 'GET',
      headers: headers as Record<string, string>,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(error.message || 'Failed to download file');
    }

    return response.blob();
  },

  async remove(bucket: string, filePaths: string[]): Promise<void> {
    await apiClient.post(`${BASE_URL}/remove`, { bucket, paths: filePaths });
  },

  async list(bucket: string, folder?: string): Promise<Array<{
    name: string;
    id: string;
    created_at: string;
  }>> {
    const params = new URLSearchParams();
    if (bucket) params.append('bucket', bucket);
    if (folder) params.append('entityType', folder);
    const queryString = params.toString();
    return apiClient.get(`/api/v1/files${queryString ? `?${queryString}` : ''}`);
  },
};
