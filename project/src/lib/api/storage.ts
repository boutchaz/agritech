import { supabase } from '../supabase';

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
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: options?.cacheControl || '3600',
        upsert: options?.upsert || false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { path: filePath, publicUrl };
  },

  getPublicUrl(bucket: string, filePath: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    return publicUrl;
  },

  async download(bucket: string, filePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) throw error;
    if (!data) throw new Error('No data returned from download');
    return data;
  },

  async remove(bucket: string, filePaths: string[]): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(filePaths);

    if (error) throw error;
  },

  async list(bucket: string, folder?: string): Promise<Array<{
    name: string;
    id: string;
    created_at: string;
  }>> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder);

    if (error) throw error;
    return data || [];
  },
};
