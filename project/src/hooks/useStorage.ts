import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storageApi, type UploadOptions } from '@/lib/api/storage';
import { toast } from 'sonner';

export function useStorageUpload(bucket: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      filePath,
      file,
      options,
    }: {
      filePath: string;
      file: File;
      options?: UploadOptions;
    }) => {
      return storageApi.upload(bucket, filePath, file, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage', bucket] });
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

export function useStorageDownload(bucket: string) {
  return useMutation({
    mutationFn: (filePath: string) => storageApi.download(bucket, filePath),
    onError: (error: Error) => {
      toast.error(`Download failed: ${error.message}`);
    },
  });
}

export function useStorageRemove(bucket: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filePaths: string[]) => storageApi.remove(bucket, filePaths),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage', bucket] });
      toast.success('File(s) deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}

export function useStorageList(bucket: string, folder?: string) {
  return useQuery({
    queryKey: ['storage', bucket, folder],
    queryFn: () => storageApi.list(bucket, folder),
    staleTime: 2 * 60 * 1000,
  });
}

export function getPublicUrl(bucket: string, filePath: string): string {
  return storageApi.getPublicUrl(bucket, filePath);
}
